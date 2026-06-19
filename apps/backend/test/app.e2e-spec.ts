import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AddressInfo } from 'node:net';
import { io, Socket } from 'socket.io-client';
import {
  ClientEvents,
  Mensagem,
  Participante,
  ServerEvents,
} from '@conversaja/shared';
import { ChatGateway } from '../src/chat/chat.gateway';
import { SessionService } from '../src/chat/session.service';
import { RoomsService } from '../src/chat/rooms.service';
import { MessagesService } from '../src/chat/messages.service';
import { SalaStore } from '../src/chat/stores/sala-store';
import { MensagemStore } from '../src/chat/stores/mensagem-store';
import {
  InMemoryMensagemStore,
  InMemorySalaStore,
} from '../src/chat/stores/in-memory.store';

/**
 * Teste de fluxo completo (RF01–RF07): dois usuários entram, um cria a sala, o
 * outro entra, uma mensagem é enviada e recebida em tempo real, e a lista de
 * participantes reflete os dois. Usa stores em memória — não exige banco.
 */
describe('Fluxo de chat em tempo real (e2e)', () => {
  let app: INestApplication;
  let url: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        SessionService,
        RoomsService,
        MessagesService,
        { provide: SalaStore, useClass: InMemorySalaStore },
        { provide: MensagemStore, useClass: InMemoryMensagemStore },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);
    const port = (app.getHttpServer().address() as AddressInfo).port;
    url = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  const conectar = (): Socket =>
    io(url, { transports: ['websocket'], forceNew: true });
  const esperar = <T>(socket: Socket, evento: string): Promise<T> =>
    new Promise((resolve) => socket.once(evento, resolve));

  it('dois usuários trocam mensagem em tempo real', async () => {
    const ana = conectar();
    const bruno = conectar();

    const entrouAna = await ana.emitWithAck(ClientEvents.ENTRAR_SISTEMA, {
      apelido: 'ana',
    });
    expect(entrouAna.sucesso).toBe(true);

    const salaAck = await ana.emitWithAck(ClientEvents.CRIAR_SALA, {
      nome: 'Geral',
      tema: 'assuntos diversos',
    });
    expect(salaAck.sucesso).toBe(true);
    const salaId: string = salaAck.dados.sala.id;

    await bruno.emitWithAck(ClientEvents.ENTRAR_SISTEMA, { apelido: 'bruno' });
    const participantes = esperar<Participante[]>(
      bruno,
      ServerEvents.PARTICIPANTES,
    );
    await bruno.emitWithAck(ClientEvents.ENTRAR_SALA, { salaId });
    expect((await participantes).map((p) => p.apelido)).toEqual(
      expect.arrayContaining(['ana', 'bruno']),
    );

    // Bruno aguarda a mensagem que Ana envia (RF05 -> RF06).
    const recebida = esperar<Mensagem>(bruno, ServerEvents.NOVA_MENSAGEM);
    await ana.emitWithAck(ClientEvents.ENVIAR_MENSAGEM, {
      salaId,
      conteudo: 'Olá, pessoal!',
    });
    const msg = await recebida;
    expect(msg.autor).toBe('ana');
    expect(msg.conteudo).toBe('Olá, pessoal!');

    ana.disconnect();
    bruno.disconnect();
  });
});
