import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LIMITES } from '@conversaja/shared';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('ConversaJá');
  /** Limite compartilhado com o backend (RN04) — prova de contrato único. */
  protected readonly maxMensagem = LIMITES.MENSAGEM_MAX;
}
