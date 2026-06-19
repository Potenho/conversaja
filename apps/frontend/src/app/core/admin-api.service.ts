import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  AtualizarSalaPayload,
  CriarSalaOficialPayload,
  MetricasAdmin,
  SalaResumo,
} from '@conversaja/shared';

/** Base do backend: em dev (porta 4200) aponta para :3000; em produção, mesma origem. */
const BASE =
  typeof window !== 'undefined' && window.location.port === '4200' ? 'http://localhost:3000' : '';

/** Cliente REST do painel administrativo (RF14/RF15), autenticado por token. */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly token = signal<string | null>(null);

  readonly autenticado = computed(() => this.token() !== null);

  private get headers(): HttpHeaders {
    return new HttpHeaders({ 'x-admin-token': this.token() ?? '' });
  }

  /** Valida o token chamando as métricas; em caso de falha, limpa o token. */
  async autenticar(token: string): Promise<boolean> {
    this.token.set(token);
    try {
      await this.metricas();
      return true;
    } catch {
      this.token.set(null);
      return false;
    }
  }

  sair(): void {
    this.token.set(null);
  }

  metricas(): Promise<MetricasAdmin> {
    return firstValueFrom(
      this.http.get<MetricasAdmin>(`${BASE}/admin/metricas`, { headers: this.headers }),
    );
  }

  listar(): Promise<SalaResumo[]> {
    return firstValueFrom(
      this.http.get<SalaResumo[]>(`${BASE}/admin/salas`, { headers: this.headers }),
    );
  }

  criar(body: CriarSalaOficialPayload): Promise<SalaResumo> {
    return firstValueFrom(
      this.http.post<SalaResumo>(`${BASE}/admin/salas`, body, { headers: this.headers }),
    );
  }

  atualizar(id: string, body: AtualizarSalaPayload): Promise<SalaResumo> {
    return firstValueFrom(
      this.http.patch<SalaResumo>(`${BASE}/admin/salas/${id}`, body, { headers: this.headers }),
    );
  }

  remover(id: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${BASE}/admin/salas/${id}`, { headers: this.headers }),
    );
  }
}
