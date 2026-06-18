import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ClientEvents, SalaResumo, ServerEvents } from '@conversaja/shared';
import { SocketService } from '../../core/socket.service';
import { SessionService } from '../../core/session.service';

/** Lobby: lista de salas públicas (RF02) e criação de sala (RF04). */
@Component({
  selector: 'app-lobby',
  imports: [FormsModule],
  templateUrl: './lobby.html',
  styleUrl: './lobby.scss',
})
export class Lobby implements OnInit, OnDestroy {
  private readonly socket = inject(SocketService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private sub?: Subscription;

  readonly apelido = this.session.apelido;
  readonly salas = signal<SalaResumo[]>([]);
  readonly mostrarCriar = signal(false);
  readonly erro = signal<string | null>(null);
  nome = '';
  tema = '';

  ngOnInit(): void {
    void this.socket
      .emit<{ salas: SalaResumo[] }>(ClientEvents.LISTAR_SALAS)
      .then((ack) => ack.sucesso && this.salas.set(ack.dados!.salas));
    // RF02 — a lista se atualiza quando salas são criadas/removidas.
    this.sub = this.socket
      .on<SalaResumo[]>(ServerEvents.SALAS_ATUALIZADAS)
      .subscribe((salas) => this.salas.set(salas));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  async criar(): Promise<void> {
    this.erro.set(null);
    const ack = await this.socket.emit<{ sala: SalaResumo }>(ClientEvents.CRIAR_SALA, {
      nome: this.nome,
      tema: this.tema,
    });
    if (ack.sucesso) {
      await this.router.navigate(['/sala', ack.dados!.sala.id]);
    } else {
      this.erro.set(ack.erro.mensagem);
    }
  }

  entrar(salaId: string): void {
    void this.router.navigate(['/sala', salaId]);
  }

  sair(): void {
    this.session.limpar();
    void this.router.navigate(['/']);
  }
}
