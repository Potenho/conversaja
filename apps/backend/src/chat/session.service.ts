import { Injectable } from '@nestjs/common';
import { APELIDO_REGEX } from '@conversaja/shared';
import { DomainError } from './domain-error';

/**
 * Controla as sessões conectadas: associa cada conexão (socketId) a um apelido
 * e garante a unicidade do apelido entre os usuários online (RN01).
 */
@Injectable()
export class SessionService {
  private readonly porSocket = new Map<string, string>(); // socketId -> apelido
  private readonly porApelido = new Map<string, string>(); // apelido(lower) -> socketId

  /** Registra um apelido para a conexão. Lança DomainError se inválido ou em uso. */
  registrar(socketId: string, apelido: string): string {
    const limpo = apelido.trim();
    if (!APELIDO_REGEX.test(limpo)) {
      throw new DomainError(
        'APELIDO_INVALIDO',
        'O apelido deve ter de 3 a 20 caracteres alfanuméricos.',
      );
    }
    if (this.porApelido.has(limpo.toLowerCase())) {
      throw new DomainError('APELIDO_EM_USO', 'Esse apelido já está em uso.');
    }
    this.porSocket.set(socketId, limpo);
    this.porApelido.set(limpo.toLowerCase(), socketId);
    return limpo;
  }

  /** Remove a sessão da conexão e devolve o apelido que estava associado. */
  remover(socketId: string): string | undefined {
    const apelido = this.porSocket.get(socketId);
    if (apelido) {
      this.porSocket.delete(socketId);
      this.porApelido.delete(apelido.toLowerCase());
    }
    return apelido;
  }

  apelidoDe(socketId: string): string | undefined {
    return this.porSocket.get(socketId);
  }

  socketDe(apelido: string): string | undefined {
    return this.porApelido.get(apelido.toLowerCase());
  }

  /** Apelido exigido: lança se a conexão não estiver autenticada. */
  exigirApelido(socketId: string): string {
    const apelido = this.porSocket.get(socketId);
    if (!apelido) {
      throw new DomainError(
        'NAO_AUTENTICADO',
        'Entre com um apelido antes de continuar.',
      );
    }
    return apelido;
  }
}
