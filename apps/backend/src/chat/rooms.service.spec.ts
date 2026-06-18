import { Papel } from '@conversaja/shared';
import { RoomsService } from './rooms.service';
import { DomainError } from './domain-error';

describe('RoomsService (RN03, RN08 — salas)', () => {
  let service: RoomsService;

  beforeEach(() => {
    service = new RoomsService();
  });

  it('cria sala e torna o criador moderador (RN03)', () => {
    const sala = service.criar('Projetos Web', 'Angular e Nest', 'maria');
    expect(sala.nome).toBe('Projetos Web');
    expect(sala.participantesOnline).toBe(1);
    expect(service.ehModerador(sala.id, 'maria')).toBe(true);
  });

  it('rejeita nome de sala vazio', () => {
    expect(() => service.criar('   ', 'tema', 'maria')).toThrow(DomainError);
  });

  it('rejeita nome de sala duplicado', () => {
    service.criar('Aleatório', 'tema', 'maria');
    expect(() => service.criar('aleatório', 'outro', 'joao')).toThrow(DomainError);
  });

  it('lista a sala criada para todos (RF02)', () => {
    service.criar('Sala A', 'tema', 'maria');
    expect(service.listar()).toHaveLength(1);
  });

  it('adiciona participante e atualiza a contagem', () => {
    const sala = service.criar('Sala A', 'tema', 'maria');
    service.entrar(sala.id, 'joao');
    expect(service.participantes(sala.id)).toEqual(
      expect.arrayContaining([
        { apelido: 'maria', papel: Papel.MODERADOR },
        { apelido: 'joao', papel: Papel.PARTICIPANTE },
      ]),
    );
  });

  it('recusa entrada quando a sala está cheia (RN08)', () => {
    const sala = service.criar('Sala A', 'tema', 'maria');
    // força capacidade preenchendo até o limite padrão (50)
    for (let i = 0; i < 49; i++) {
      service.entrar(sala.id, `user${i}`);
    }
    expect(service.participantes(sala.id)).toHaveLength(50);
    expect(() => service.entrar(sala.id, 'excedente')).toThrow('capacidade');
  });

  it('lança ao entrar em sala inexistente', () => {
    expect(() => service.entrar('inexistente', 'maria')).toThrow(DomainError);
  });
});
