import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import type { ErroPayload } from '@conversaja/shared';

/** Resposta padrão (ack) das operações que retornam confirmação ao cliente. */
export type Ack<T = unknown> = { sucesso: true; dados?: T } | { sucesso: false; erro: ErroPayload };

/** URL do backend WebSocket. Em produção (mesma origem) usa caminho relativo. */
const BACKEND_URL =
  typeof window !== 'undefined' && window.location.port === '4200'
    ? 'http://localhost:3000'
    : '';

/**
 * Encapsula a conexão Socket.IO. Componentes não falam diretamente com o socket:
 * usam `emit` (com ack) e `on` (stream tipado pelos contratos de @conversaja/shared).
 */
@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly socket: Socket = io(BACKEND_URL, { autoConnect: true });

  /** Emite um evento e aguarda o ack do servidor. */
  emit<T = unknown>(evento: string, payload?: unknown): Promise<Ack<T>> {
    return this.socket.emitWithAck(evento, payload ?? {}) as Promise<Ack<T>>;
  }

  /** Observa um evento do servidor; cancela o listener ao desinscrever. */
  on<T>(evento: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const handler = (data: T) => subscriber.next(data);
      this.socket.on(evento, handler);
      return () => this.socket.off(evento, handler);
    });
  }
}
