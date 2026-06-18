import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  AvisoPayload,
  ClientEvents,
  DigitandoBroadcast,
  ErroPayload,
  LIMITES,
  Mensagem,
  Papel,
  Participante,
  ServerEvents,
  TipoMensagem,
} from '@conversaja/shared';
import { SocketService } from '../../core/socket.service';
import { SessionService } from '../../core/session.service';

/** Sala de chat em tempo real (RF03, RF05–RF10) com moderação (RF12, RF13). */
@Component({
  selector: 'app-sala',
  imports: [FormsModule],
  templateUrl: './sala.html',
  styleUrl: './sala.scss',
})
export class Sala implements OnInit, OnDestroy {
  private readonly socket = inject(SocketService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly subs: Subscription[] = [];
  private digitandoTimer?: ReturnType<typeof setTimeout>;

  readonly salaId = this.route.snapshot.paramMap.get('id')!;
  readonly apelido = this.session.apelido;
  readonly maxMensagem = LIMITES.MENSAGEM_MAX;
  readonly TipoMensagem = TipoMensagem;

  readonly mensagens = signal<Mensagem[]>([]);
  readonly participantes = signal<Participante[]>([]);
  readonly digitando = signal<string | null>(null);
  readonly erro = signal<string | null>(null);
  texto = '';

  readonly souModerador = computed(() =>
    this.participantes().some(
      (p) => p.apelido === this.apelido() && p.papel === Papel.MODERADOR,
    ),
  );

  ngOnInit(): void {
    this.subs.push(
      this.socket.on<Mensagem[]>(ServerEvents.HISTORICO).subscribe((m) => this.mensagens.set(m)),
      this.socket
        .on<Mensagem>(ServerEvents.NOVA_MENSAGEM)
        .subscribe((m) => this.mensagens.update((lista) => [...lista, m])),
      this.socket
        .on<Participante[]>(ServerEvents.PARTICIPANTES)
        .subscribe((p) => this.participantes.set(p)),
      this.socket.on<AvisoPayload>(ServerEvents.AVISO).subscribe((a) => this.adicionarAviso(a.texto)),
      this.socket
        .on<{ mensagemId: string }>(ServerEvents.MENSAGEM_REMOVIDA)
        .subscribe(({ mensagemId }) =>
          this.mensagens.update((lista) => lista.filter((m) => m.id !== mensagemId)),
        ),
      this.socket
        .on<DigitandoBroadcast>(ServerEvents.USUARIO_DIGITANDO)
        .subscribe((d) => this.digitando.set(d.digitando ? d.apelido : null)),
      this.socket.on<AvisoPayload>(ServerEvents.EXPULSO).subscribe(() => {
        this.erro.set('Você foi removido desta sala.');
        setTimeout(() => this.router.navigate(['/lobby']), 1500);
      }),
      this.socket.on<ErroPayload>(ServerEvents.ERRO).subscribe((e) => this.erro.set(e.mensagem)),
    );

    void this.socket.emit(ClientEvents.ENTRAR_SALA, { salaId: this.salaId }).then((ack) => {
      if (!ack.sucesso) this.erro.set(ack.erro.mensagem);
    });
  }

  ngOnDestroy(): void {
    void this.socket.emit(ClientEvents.SAIR_SALA, { salaId: this.salaId });
    this.subs.forEach((s) => s.unsubscribe());
    clearTimeout(this.digitandoTimer);
  }

  enviar(): void {
    if (this.texto.trim().length === 0) return; // RN05
    void this.socket.emit(ClientEvents.ENVIAR_MENSAGEM, {
      salaId: this.salaId,
      conteudo: this.texto,
    });
    this.texto = '';
    this.sinalizarDigitando(false);
  }

  aoDigitar(): void {
    this.sinalizarDigitando(true);
    clearTimeout(this.digitandoTimer);
    this.digitandoTimer = setTimeout(() => this.sinalizarDigitando(false), 1500);
  }

  remover(mensagemId: string): void {
    void this.socket.emit(ClientEvents.REMOVER_MENSAGEM, { salaId: this.salaId, mensagemId });
  }

  expulsar(apelido: string): void {
    void this.socket.emit(ClientEvents.EXPULSAR_USUARIO, { salaId: this.salaId, apelido });
  }

  voltar(): void {
    void this.router.navigate(['/lobby']);
  }

  private sinalizarDigitando(digitando: boolean): void {
    void this.socket.emit(ClientEvents.DIGITANDO, { salaId: this.salaId, digitando });
  }

  private adicionarAviso(texto: string): void {
    const aviso: Mensagem = {
      id: crypto.randomUUID(),
      salaId: this.salaId,
      autor: '',
      conteudo: texto,
      tipo: TipoMensagem.SISTEMA,
      enviadaEm: new Date().toISOString(),
    };
    this.mensagens.update((lista) => [...lista, aviso]);
  }
}
