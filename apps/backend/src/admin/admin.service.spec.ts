import { Visibilidade } from '@conversaja/shared';
import { AdminService } from './admin.service';
import { ChatGateway } from '../chat/chat.gateway';
import { RoomsService } from '../chat/rooms.service';
import { SessionService } from '../chat/session.service';
import {
  InMemoryMensagemStore,
  InMemorySalaStore,
} from '../chat/stores/in-memory.store';
import { DomainError } from '../chat/domain-error';

describe('AdminService (RF14, RF15)', () => {
  let salas: InMemorySalaStore;
  let mensagens: InMemoryMensagemStore;
  let session: SessionService;
  let rooms: RoomsService;
  let gateway: { notificarSalas: jest.Mock; encerrarSala: jest.Mock };
  let admin: AdminService;

  beforeEach(() => {
    salas = new InMemorySalaStore();
    mensagens = new InMemoryMensagemStore();
    session = new SessionService();
    rooms = new RoomsService(salas, mensagens);
    gateway = {
      notificarSalas: jest.fn().mockResolvedValue(undefined),
      encerrarSala: jest.fn().mockResolvedValue(undefined),
    };
    admin = new AdminService(
      salas,
      mensagens,
      session,
      rooms,
      gateway as unknown as ChatGateway,
    );
  });

  it('cria sala oficial e notifica o lobby (RF14)', async () => {
    const sala = await admin.criarOficial({
      nome: 'Avisos',
      tema: 'Comunicados',
    });
    expect(sala.visibilidade).toBe(Visibilidade.OFICIAL);
    expect(gateway.notificarSalas).toHaveBeenCalled();
    expect(await salas.listarTodas()).toHaveLength(1);
  });

  it('rejeita sala oficial com nome duplicado', async () => {
    await admin.criarOficial({ nome: 'Avisos', tema: 'x' });
    await expect(
      admin.criarOficial({ nome: 'avisos', tema: 'y' }),
    ).rejects.toThrow(DomainError);
  });

  it('edita o nome/tema de uma sala (RF14)', async () => {
    const sala = await admin.criarOficial({ nome: 'Antigo', tema: 'x' });
    const editada = await admin.atualizar(sala.id, { nome: 'Novo', tema: 'y' });
    expect(editada.nome).toBe('Novo');
    expect(editada.tema).toBe('y');
  });

  it('remove a sala, limpa mensagens e encerra para os participantes (RF14)', async () => {
    const sala = await admin.criarOficial({ nome: 'Temp', tema: 'x' });
    await admin.remover(sala.id);
    expect(await salas.buscarPorId(sala.id)).toBeNull();
    expect(gateway.encerrarSala).toHaveBeenCalledWith(sala.id);
  });

  it('reporta métricas de uso (RF15)', async () => {
    await admin.criarOficial({ nome: 'Sala 1', tema: 'x' });
    session.registrar('socket-1', 'maria');
    const metricas = await admin.metricas();
    expect(metricas.salasAtivas).toBe(1);
    expect(metricas.usuariosOnline).toBe(1);
  });
});
