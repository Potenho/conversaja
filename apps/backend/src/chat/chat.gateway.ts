import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ClientEvents, ServerEvents } from '@conversaja/shared';
import type {
  CriarSalaPayload,
  DigitandoPayload,
  EnviarMensagemPayload,
  EntrarSalaPayload,
  EntrarSistemaPayload,
  ErroPayload,
  ExpulsarUsuarioPayload,
  RemoverMensagemPayload,
  SalaResumo,
} from '@conversaja/shared';
import { DomainError } from './domain-error';
import { MessagesService } from './messages.service';
import { RoomsService } from './rooms.service';
import { SessionService } from './session.service';

type Ack<T = unknown> =
  | { sucesso: true; dados?: T }
  | { sucesso: false; erro: ErroPayload };

/**
 * Gateway WebSocket do ConversaJá. Traduz os eventos de `@conversaja/shared` em
 * operações de domínio e faz o broadcast em tempo real para os participantes.
 */
@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayDisconnect {
  @WebSocketServer() private server!: Server;

  /** Salas das quais cada conexão participa, para limpeza na desconexão. */
  private readonly salasPorSocket = new Map<string, Set<string>>();

  constructor(
    private readonly session: SessionService,
    private readonly rooms: RoomsService,
    private readonly messages: MessagesService,
  ) {}

  // --- Ciclo de vida -------------------------------------------------------

  handleDisconnect(socket: Socket): void {
    const apelido = this.session.remover(socket.id);
    const salas = this.salasPorSocket.get(socket.id);
    if (apelido && salas) {
      for (const salaId of salas) {
        this.rooms.sair(salaId, apelido);
        this.emitirAviso(salaId, `${apelido} saiu da sala`);
        this.emitirParticipantes(salaId);
      }
    }
    this.salasPorSocket.delete(socket.id);
    this.emitirListaSalas();
  }

  // --- Autenticação / lobby ------------------------------------------------

  @SubscribeMessage(ClientEvents.ENTRAR_SISTEMA) // RF01
  entrarSistema(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: EntrarSistemaPayload,
  ): Ack<{ apelido: string; salas: SalaResumo[] }> {
    return this.comAck(socket, () => {
      const apelido = this.session.registrar(socket.id, payload?.apelido ?? '');
      return { apelido, salas: this.rooms.listar() };
    });
  }

  @SubscribeMessage(ClientEvents.LISTAR_SALAS) // RF02
  listarSalas(@ConnectedSocket() socket: Socket): Ack<{ salas: SalaResumo[] }> {
    return this.comAck(socket, () => ({ salas: this.rooms.listar() }));
  }

  @SubscribeMessage(ClientEvents.CRIAR_SALA) // RF04
  criarSala(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: CriarSalaPayload,
  ): Ack<{ sala: SalaResumo }> {
    return this.comAck(socket, () => {
      const apelido = this.session.exigirApelido(socket.id);
      const sala = this.rooms.criar(
        payload?.nome ?? '',
        payload?.tema ?? '',
        apelido,
      );
      this.ingressar(socket, sala.id);
      this.emitirHistoricoEParticipantes(socket, sala.id);
      this.emitirListaSalas();
      return { sala };
    });
  }

  @SubscribeMessage(ClientEvents.ENTRAR_SALA) // RF03
  entrarSala(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: EntrarSalaPayload,
  ): Ack<{ sala: SalaResumo }> {
    return this.comAck(socket, () => {
      const apelido = this.session.exigirApelido(socket.id);
      const sala = this.rooms.entrar(payload?.salaId ?? '', apelido);
      this.ingressar(socket, sala.id);
      this.emitirHistoricoEParticipantes(socket, sala.id);
      this.emitirAviso(sala.id, `${apelido} entrou na sala`); // RF10
      this.emitirParticipantes(sala.id);
      this.emitirListaSalas();
      return { sala };
    });
  }

  @SubscribeMessage(ClientEvents.SAIR_SALA) // RF11
  sairSala(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: EntrarSalaPayload,
  ): Ack {
    return this.comAck(socket, () => {
      const apelido = this.session.exigirApelido(socket.id);
      this.deixarSala(socket, payload?.salaId ?? '', apelido);
      return undefined;
    });
  }

  // --- Mensagens -----------------------------------------------------------

  @SubscribeMessage(ClientEvents.ENVIAR_MENSAGEM) // RF05
  enviarMensagem(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: EnviarMensagemPayload,
  ): Ack {
    return this.comAck(socket, () => {
      const apelido = this.session.exigirApelido(socket.id);
      if (!this.rooms.estaNaSala(payload?.salaId ?? '', apelido)) {
        throw new DomainError('FORA_DA_SALA', 'Você não está nesta sala.');
      }
      const mensagem = this.messages.adicionar(
        payload.salaId,
        apelido,
        payload.conteudo ?? '',
      );
      this.server.to(payload.salaId).emit(ServerEvents.NOVA_MENSAGEM, mensagem); // RF06
      return undefined;
    });
  }

  @SubscribeMessage(ClientEvents.DIGITANDO) // RF09
  digitando(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: DigitandoPayload,
  ): void {
    const apelido = this.session.apelidoDe(socket.id);
    if (!apelido || !payload?.salaId) return;
    socket.to(payload.salaId).emit(ServerEvents.USUARIO_DIGITANDO, {
      salaId: payload.salaId,
      apelido,
      digitando: !!payload.digitando,
    });
  }

  // --- Moderação -----------------------------------------------------------

  @SubscribeMessage(ClientEvents.REMOVER_MENSAGEM) // RF12
  removerMensagem(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: RemoverMensagemPayload,
  ): Ack {
    return this.comAck(socket, () => {
      const apelido = this.session.exigirApelido(socket.id);
      this.exigirModerador(payload?.salaId ?? '', apelido);
      this.messages.remover(payload.salaId, payload.mensagemId);
      this.server.to(payload.salaId).emit(ServerEvents.MENSAGEM_REMOVIDA, {
        salaId: payload.salaId,
        mensagemId: payload.mensagemId,
      });
      return undefined;
    });
  }

  @SubscribeMessage(ClientEvents.EXPULSAR_USUARIO) // RF13
  expulsarUsuario(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: ExpulsarUsuarioPayload,
  ): Ack {
    return this.comAck(socket, () => {
      const moderador = this.session.exigirApelido(socket.id);
      this.exigirModerador(payload?.salaId ?? '', moderador);
      const alvo = payload.apelido;
      this.rooms.sair(payload.salaId, alvo);
      const alvoSocketId = this.session.socketDe(alvo);
      if (alvoSocketId) {
        const alvoSocket = this.server.sockets.sockets.get(alvoSocketId);
        void alvoSocket?.leave(payload.salaId);
        this.salasPorSocket.get(alvoSocketId)?.delete(payload.salaId);
        this.server.to(alvoSocketId).emit(ServerEvents.EXPULSO, {
          salaId: payload.salaId,
          texto: 'Você foi removido da sala.',
        });
      }
      this.emitirAviso(payload.salaId, `${alvo} foi removido por ${moderador}`);
      this.emitirParticipantes(payload.salaId);
      this.emitirListaSalas();
      return undefined;
    });
  }

  // --- Auxiliares ----------------------------------------------------------

  private ingressar(socket: Socket, salaId: string): void {
    void socket.join(salaId);
    let salas = this.salasPorSocket.get(socket.id);
    if (!salas) {
      salas = new Set();
      this.salasPorSocket.set(socket.id, salas);
    }
    salas.add(salaId);
  }

  private deixarSala(socket: Socket, salaId: string, apelido: string): void {
    this.rooms.sair(salaId, apelido);
    void socket.leave(salaId);
    this.salasPorSocket.get(socket.id)?.delete(salaId);
    this.emitirAviso(salaId, `${apelido} saiu da sala`);
    this.emitirParticipantes(salaId);
    this.emitirListaSalas();
  }

  private exigirModerador(salaId: string, apelido: string): void {
    if (!this.rooms.ehModerador(salaId, apelido)) {
      throw new DomainError(
        'SEM_PERMISSAO',
        'Apenas o moderador da sala pode executar esta ação.',
      );
    }
  }

  private emitirHistoricoEParticipantes(socket: Socket, salaId: string): void {
    socket.emit(ServerEvents.HISTORICO, this.messages.recentes(salaId)); // RF08
    socket.emit(ServerEvents.PARTICIPANTES, this.rooms.participantes(salaId)); // RF07
  }

  private emitirParticipantes(salaId: string): void {
    this.server
      .to(salaId)
      .emit(ServerEvents.PARTICIPANTES, this.rooms.participantes(salaId));
  }

  private emitirAviso(salaId: string, texto: string): void {
    this.server.to(salaId).emit(ServerEvents.AVISO, { salaId, texto });
  }

  private emitirListaSalas(): void {
    this.server.emit(ServerEvents.SALAS_ATUALIZADAS, this.rooms.listar()); // RF02
  }

  /** Executa a operação e converte DomainError em ack de erro (+ evento ERRO). */
  private comAck<T>(socket: Socket, fn: () => T): Ack<T> {
    try {
      return { sucesso: true, dados: fn() };
    } catch (erro) {
      if (erro instanceof DomainError) {
        const payload: ErroPayload = {
          codigo: erro.codigo,
          mensagem: erro.message,
        };
        socket.emit(ServerEvents.ERRO, payload);
        return { sucesso: false, erro: payload };
      }
      throw erro;
    }
  }
}
