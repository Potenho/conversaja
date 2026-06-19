import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { MetricasAdmin, SalaResumo } from '@conversaja/shared';
import { AdminApiService } from '../../core/admin-api.service';

/** Painel administrativo: métricas (RF15) e gestão de salas oficiais (RF14). */
@Component({
  selector: 'app-admin',
  imports: [FormsModule, RouterLink],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin {
  protected readonly api = inject(AdminApiService);

  // Login
  token = '';
  readonly erroLogin = signal<string | null>(null);
  readonly entrando = signal(false);

  // Painel
  readonly metricas = signal<MetricasAdmin | null>(null);
  readonly salas = signal<SalaResumo[]>([]);
  readonly erro = signal<string | null>(null);

  // Criação
  nome = '';
  tema = '';

  // Edição inline
  readonly editandoId = signal<string | null>(null);
  editNome = '';
  editTema = '';

  async entrar(): Promise<void> {
    this.erroLogin.set(null);
    this.entrando.set(true);
    const ok = await this.api.autenticar(this.token.trim());
    this.entrando.set(false);
    if (ok) {
      await this.carregar();
    } else {
      this.erroLogin.set('Token de administrador inválido.');
    }
  }

  sair(): void {
    this.api.sair();
  }

  async carregar(): Promise<void> {
    this.erro.set(null);
    try {
      const [metricas, salas] = await Promise.all([this.api.metricas(), this.api.listar()]);
      this.metricas.set(metricas);
      this.salas.set(salas);
    } catch {
      this.erro.set('Falha ao carregar os dados.');
    }
  }

  async criar(): Promise<void> {
    this.erro.set(null);
    try {
      await this.api.criar({ nome: this.nome, tema: this.tema });
      this.nome = '';
      this.tema = '';
      await this.carregar();
    } catch (e) {
      this.erro.set(this.mensagem(e));
    }
  }

  iniciarEdicao(sala: SalaResumo): void {
    this.editandoId.set(sala.id);
    this.editNome = sala.nome;
    this.editTema = sala.tema;
  }

  cancelarEdicao(): void {
    this.editandoId.set(null);
  }

  async salvarEdicao(id: string): Promise<void> {
    this.erro.set(null);
    try {
      await this.api.atualizar(id, { nome: this.editNome, tema: this.editTema });
      this.editandoId.set(null);
      await this.carregar();
    } catch (e) {
      this.erro.set(this.mensagem(e));
    }
  }

  async remover(sala: SalaResumo): Promise<void> {
    this.erro.set(null);
    try {
      await this.api.remover(sala.id);
      await this.carregar();
    } catch (e) {
      this.erro.set(this.mensagem(e));
    }
  }

  private mensagem(erro: unknown): string {
    const e = erro as { error?: { mensagem?: string } };
    return e?.error?.mensagem ?? 'Não foi possível concluir a operação.';
  }
}
