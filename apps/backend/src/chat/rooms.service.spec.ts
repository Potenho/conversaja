import { Papel } from '@conversaja/shared';
import { RoomsService } from './rooms.service';
import { DomainError } from './domain-error';
import { InMemorySalaStore } from './stores/in-memory.store';

describe('RoomsService (RN03, RN08 — salas)', () => {
  let service: RoomsService;

  beforeEach(() => {
    service = new RoomsService(new InMemorySalaStore());
  });

  it('cria sala e torna o criador moderador (RN03)', async () => {
    const sala = await service.criar('Projetos Web', 'Angular e Nest', 'maria');
    expect(sala.nome).toBe('Projetos Web');
    expect(sala.participantesOnline).toBe(1);
    expect(await service.ehModerador(sala.id, 'maria')).toBe(true);
  });

  it('rejeita nome de sala vazio', async () => {
    await expect(service.criar('   ', 'tema', 'maria')).rejects.toThrow(
      DomainError,
    );
  });

  it('rejeita nome de sala duplicado', async () => {
    await service.criar('Aleatório', 'tema', 'maria');
    await expect(service.criar('aleatório', 'outro', 'joao')).rejects.toThrow(
      DomainError,
    );
  });

  it('lista a sala criada para todos (RF02)', async () => {
    await service.criar('Sala A', 'tema', 'maria');
    expect(await service.listar()).toHaveLength(1);
  });

  it('adiciona participante e atualiza os papéis', async () => {
    const sala = await service.criar('Sala A', 'tema', 'maria');
    await service.entrar(sala.id, 'joao');
    expect(await service.participantes(sala.id)).toEqual(
      expect.arrayContaining([
        { apelido: 'maria', papel: Papel.MODERADOR },
        { apelido: 'joao', papel: Papel.PARTICIPANTE },
      ]),
    );
  });

  it('recusa entrada quando a sala está cheia (RN08)', async () => {
    const sala = await service.criar('Sala A', 'tema', 'maria');
    for (let i = 0; i < 49; i++) {
      await service.entrar(sala.id, `user${i}`);
    }
    expect(await service.participantes(sala.id)).toHaveLength(50);
    await expect(service.entrar(sala.id, 'excedente')).rejects.toThrow(
      'capacidade',
    );
  });

  it('lança ao entrar em sala inexistente', async () => {
    await expect(service.entrar('inexistente', 'maria')).rejects.toThrow(
      DomainError,
    );
  });
});
