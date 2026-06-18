import { Injectable, computed, signal } from '@angular/core';

/** Guarda o apelido do usuário durante a sessão (RF01). */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly _apelido = signal<string | null>(null);

  readonly apelido = this._apelido.asReadonly();
  readonly autenticado = computed(() => this._apelido() !== null);

  definir(apelido: string): void {
    this._apelido.set(apelido);
  }

  limpar(): void {
    this._apelido.set(null);
  }
}
