import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ClientEvents } from '@conversaja/shared';
import { SocketService } from '../../core/socket.service';
import { SessionService } from '../../core/session.service';

/** Tela de entrada: identificação por apelido (RF01 / UC01). */
@Component({
  selector: 'app-entrada',
  imports: [FormsModule],
  templateUrl: './entrada.html',
  styleUrl: './entrada.scss',
})
export class Entrada {
  private readonly socket = inject(SocketService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  apelido = '';
  readonly erro = signal<string | null>(null);
  readonly enviando = signal(false);

  async entrar(): Promise<void> {
    this.erro.set(null);
    this.enviando.set(true);
    try {
      const ack = await this.socket.emit<{ apelido: string }>(ClientEvents.ENTRAR_SISTEMA, {
        apelido: this.apelido,
      });
      if (ack.sucesso) {
        this.session.definir(ack.dados!.apelido);
        await this.router.navigate(['/lobby']);
      } else {
        this.erro.set(ack.erro.mensagem);
      }
    } finally {
      this.enviando.set(false);
    }
  }
}
