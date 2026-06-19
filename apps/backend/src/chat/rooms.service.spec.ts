import { Papel, TipoMensagem, Visibilidade } from '@conversaja/shared';
import { RoomsService } from './rooms.service';
import { DomainError } from './domain-error';
import {
  InMemoryMensagemStore,
  InMemorySalaStore,
} from './stores/in-memory.store';

describe('RoomsService (RN03, RN06, RN07, RN08 — salas)', () => {
  let salas: InMemorySalaStore;
  let mensagens: InMemoryMensagemStore;
  let service: RoomsService;

  beforeEach(() => {
    salas = new InMemorySalaStore();
    mensagens = new InMemoryMensagemStore();
    service = new RoomsService(salas, mensagens);
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

  it('bloqueia reingresso de usuário expulso por alguns minutos (RN06)', async () => {
    const sala = await service.criar('Sala A', 'tema', 'maria');
    await service.entrar(sala.id, 'joao');
    service.sair(sala.id, 'joao');
    service.bloquearReingresso(sala.id, 'joao');

    await expect(service.entrar(sala.id, 'joao')).rejects.toThrow(
      'reingressar',
    );
    // O bloqueio é case-insensitive (mesmo apelido).
    expect(service.estaBloqueado(sala.id, 'JOAO')).toBe(true);
    // Após o prazo (11 min depois), o bloqueio expira.
    const onzeMinDepois = Date.now() + 11 * 60_000;
    expect(service.estaBloqueado(sala.id, 'joao', onzeMinDepois)).toBe(false);
  });

  it('remove sala pública ociosa após o limite e mantém oficiais (RN07)', async () => {
    const publica = await service.criar('Pública', 'tema', 'maria');
    const oficial = await salas.criar({
      nome: 'Oficial',
      tema: 'x',
      criadorApelido: 'admin',
      visibilidade: Visibilidade.OFICIAL,
      capacidadeMax: 50,
    });

    // Esvazia a sala pública (criador sai) e registra mensagem para checar limpeza.
    await mensagens.inserir({
      id: 'm1',
      salaId: publica.id,
      autor: 'maria',
      conteudo: 'oi',
      tipo: TipoMensagem.TEXTO,
      enviadaEm: new Date().toISOString(),
    });
    service.sair(publica.id, 'maria');

    // Primeira varredura: começa a contar a ociosidade, nada é removido.
    expect(await service.removerSalasOciosas()).toEqual([]);

    // 31 minutos depois: a sala pública vazia é removida; a oficial permanece.
    const futuro = Date.now() + 31 * 60_000;
    const removidas = await service.removerSalasOciosas(futuro);
    expect(removidas).toEqual([publica.id]);
    expect(await salas.buscarPorId(publica.id)).toBeNull();
    expect(await salas.buscarPorId(oficial.id)).not.toBeNull();
    expect(await mensagens.listarRecentes(publica.id, 50)).toHaveLength(0);
  });
});
