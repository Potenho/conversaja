import { SessionService } from './session.service';
import { DomainError } from './domain-error';

describe('SessionService (RN01 — apelido)', () => {
  let service: SessionService;

  beforeEach(() => {
    service = new SessionService();
  });

  it('registra um apelido válido e o associa à conexão', () => {
    const apelido = service.registrar('socket-1', 'maria_dev');
    expect(apelido).toBe('maria_dev');
    expect(service.apelidoDe('socket-1')).toBe('maria_dev');
  });

  it('rejeita apelido fora do formato (curto ou com símbolos)', () => {
    expect(() => service.registrar('s', 'ab')).toThrow(DomainError);
    expect(() => service.registrar('s', 'maria!')).toThrow(DomainError);
  });

  it('rejeita apelido já em uso (case-insensitive)', () => {
    service.registrar('socket-1', 'maria');
    expect(() => service.registrar('socket-2', 'MARIA')).toThrow(
      'já está em uso',
    );
  });

  it('libera o apelido ao remover a sessão', () => {
    service.registrar('socket-1', 'maria');
    service.remover('socket-1');
    expect(() => service.registrar('socket-2', 'maria')).not.toThrow();
  });

  it('exigirApelido lança quando a conexão não está autenticada', () => {
    expect(() => service.exigirApelido('desconhecido')).toThrow(DomainError);
  });
});
