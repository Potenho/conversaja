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

  async handleDisconnect(socket: Socket): Promise<void> {
    const apelido = this.session.remover(socket.id);
    const salas = this.salasPorSocket.get(socket.id);
    if (apelido && salas) {
      for (const salaId of salas) {
        this.rooms.sair(salaId, apelido);
        this.emitirAviso(salaId, `${apelido} saiu da sala`);
        await this.emitirParticipantes(salaId);
      }
    }
    this.salasPorSocket.delete(socket.id);
    await this.emitirListaSalas();
  }

  // --- Autenticação / lobby ------------------------------------------------

  @SubscribeMessage(ClientEvents.ENTRAR_SISTEMA) // RF01
  entrarSistema(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: EntrarSistemaPayload,
  ): Promise<Ack<{ apelido: string; salas: SalaResumo[] }>> {
    return this.comAck(socket, async () => {
      const apelido = this.session.registrar(socket.id, payload?.apelido ?? '');
      return { apelido, salas: await this.rooms.listar() };
    });
  }

  @SubscribeMessage(ClientEvents.LISTAR_SALAS) // RF02
  listarSalas(
    @ConnectedSocket() socket: Socket,
  ): Promise<Ack<{ salas: SalaResumo[] }>> {
    return this.comAck(socket, async () => ({
      salas: await this.rooms.listar(),
    }));
  }

  @SubscribeMessage(ClientEvents.CRIAR_SALA) // RF04
  criarSala(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: CriarSalaPayload,
  ): Promise<Ack<{ sala: SalaResumo }>> {
    return this.comAck(socket, async () => {
      const apelido = this.session.exigirApelido(socket.id);
      const sala = await this.rooms.criar(
        payload?.nome ?? '',
        payload?.tema ?? '',
        apelido,
      );
      this.ingressar(socket, sala.id);
      await this.emitirHistoricoEParticipantes(socket, sala.id);
      await this.emitirListaSalas();
      return { sala };
    });
  }

  @SubscribeMessage(ClientEvents.ENTRAR_SALA) // RF03
  entrarSala(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: EntrarSalaPayload,
  ): Promise<Ack<{ sala: SalaResumo }>> {
    return this.comAck(socket, async () => {
      const apelido = this.session.exigirApelido(socket.id);
      const sala = await this.rooms.entrar(payload?.salaId ?? '', apelido);
      this.ingressar(socket, sala.id);
      await this.emitirHistoricoEParticipantes(socket, sala.id);
      this.emitirAviso(sala.id, `${apelido} entrou na sala`); // RF10
      await this.emitirParticipantes(sala.id);
      await this.emitirListaSalas();
      return { sala };
    });
  }

  @SubscribeMessage(ClientEvents.SAIR_SALA) // RF11
  sairSala(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: EntrarSalaPayload,
  ): Promise<Ack> {
    return this.comAck(socket, async () => {
      const apelido = this.session.exigirApelido(socket.id);
      await this.deixarSala(socket, payload?.salaId ?? '', apelido);
      return undefined;
    });
  }

  // --- Mensagens -----------------------------------------------------------

  @SubscribeMessage(ClientEvents.ENVIAR_MENSAGEM) // RF05
  enviarMensagem(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: EnviarMensagemPayload,
  ): Promise<Ack> {
    return this.comAck(socket, async () => {
      const apelido = this.session.exigirApelido(socket.id);
      if (!this.rooms.estaNaSala(payload?.salaId ?? '', apelido)) {
        throw new DomainError('FORA_DA_SALA', 'Você não está nesta sala.');
      }
      const mensagem = await this.messages.adicionar(
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
  ): Promise<Ack> {
    return this.comAck(socket, async () => {
      const apelido = this.session.exigirApelido(socket.id);
      await this.exigirModerador(payload?.salaId ?? '', apelido);
      await this.messages.remover(payload.salaId, payload.mensagemId);
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
  ): Promise<Ack> {
    return this.comAck(socket, async () => {
      const moderador = this.session.exigirApelido(socket.id);
      await this.exigirModerador(payload?.salaId ?? '', moderador);
      const alvo = payload.apelido;
      this.rooms.sair(payload.salaId, alvo);
      this.rooms.bloquearReingresso(payload.salaId, alvo); // RN06
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
      await this.emitirParticipantes(payload.salaId);
      await this.emitirListaSalas();
      return undefined;
    });
  }

  // --- API para a administração (RF14) -------------------------------------

  /** Retransmite a lista de salas a todos (após mudanças feitas pelo admin). */
  async notificarSalas(): Promise<void> {
    await this.emitirListaSalas();
  }

  /** Encerra uma sala: notifica e remove os participantes, e atualiza a lista. */
  async encerrarSala(salaId: string): Promise<void> {
    this.server.to(salaId).emit(ServerEvents.EXPULSO, {
      salaId,
      texto: 'A sala foi encerrada por um administrador.',
    });
    const sockets = await this.server.in(salaId).fetchSockets();
    for (const s of sockets) {
      void s.leave(salaId);
      this.salasPorSocket.get(s.id)?.delete(salaId);
    }
    this.rooms.encerrarPresenca(salaId);
    await this.emitirListaSalas();
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

  private async deixarSala(
    socket: Socket,
    salaId: string,
    apelido: string,
  ): Promise<void> {
    this.rooms.sair(salaId, apelido);
    void socket.leave(salaId);
    this.salasPorSocket.get(socket.id)?.delete(salaId);
    this.emitirAviso(salaId, `${apelido} saiu da sala`);
    await this.emitirParticipantes(salaId);
    await this.emitirListaSalas();
  }

  private async exigirModerador(
    salaId: string,
    apelido: string,
  ): Promise<void> {
    if (!(await this.rooms.ehModerador(salaId, apelido))) {
      throw new DomainError(
        'SEM_PERMISSAO',
        'Apenas o moderador da sala pode executar esta ação.',
      );
    }
  }

  private async emitirHistoricoEParticipantes(
    socket: Socket,
    salaId: string,
  ): Promise<void> {
    socket.emit(ServerEvents.HISTORICO, await this.messages.recentes(salaId)); // RF08
    socket.emit(
      ServerEvents.PARTICIPANTES,
      await this.rooms.participantes(salaId),
    ); // RF07
  }

  private async emitirParticipantes(salaId: string): Promise<void> {
    this.server
      .to(salaId)
      .emit(ServerEvents.PARTICIPANTES, await this.rooms.participantes(salaId));
  }

  private emitirAviso(salaId: string, texto: string): void {
    this.server.to(salaId).emit(ServerEvents.AVISO, { salaId, texto });
  }

  private async emitirListaSalas(): Promise<void> {
    this.server.emit(ServerEvents.SALAS_ATUALIZADAS, await this.rooms.listar()); // RF02
  }

  /** Executa a operação e converte DomainError em ack de erro (+ evento ERRO). */
  private async comAck<T>(
    socket: Socket,
    fn: () => Promise<T>,
  ): Promise<Ack<T>> {
    try {
      return { sucesso: true, dados: await fn() };
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
