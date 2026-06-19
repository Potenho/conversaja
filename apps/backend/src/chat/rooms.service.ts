import { Injectable } from '@nestjs/common';
import {
  Papel,
  Participante,
  SalaResumo,
  Visibilidade,
  LIMITES,
} from '@conversaja/shared';
import { DomainError } from './domain-error';
import { SalaRecord, SalaStore } from './stores/sala-store';
import { MensagemStore } from './stores/mensagem-store';

/**
 * Gerencia as salas. Os dados das salas são persistidos via {@link SalaStore};
 * a **presença online** (quem está conectado em cada sala) é efêmera e vive em
 * memória, pois está atrelada às conexões WebSocket ativas.
 *
 * Cobre RN03 (criador é moderador), RN08 (capacidade), RN06 (bloqueio de
 * reingresso após expulsão) e RN07 (remoção de salas públicas ociosas).
 */
@Injectable()
export class RoomsService {
  private readonly presenca = new Map<string, Set<string>>(); // salaId -> apelidos online
  private readonly bloqueios = new Map<string, Map<string, number>>(); // salaId -> apelido -> expiraEm(ms)
  private readonly vaziaDesde = new Map<string, number>(); // salaId -> desde quando está vazia (ms)

  constructor(
    private readonly store: SalaStore,
    private readonly mensagens: MensagemStore,
  ) {}

  /** RF04 — cria uma sala pública; o criador entra e é o moderador (RN03). */
  async criar(
    nome: string,
    tema: string,
    criador: string,
  ): Promise<SalaResumo> {
    const nomeLimpo = nome.trim();
    if (nomeLimpo.length < 1 || nomeLimpo.length > 60) {
      throw new DomainError(
        'NOME_SALA_INVALIDO',
        'O nome da sala deve ter de 1 a 60 caracteres.',
      );
    }
    if (await this.store.existeNome(nomeLimpo)) {
      throw new DomainError(
        'NOME_SALA_DUPLICADO',
        'Já existe uma sala com esse nome.',
      );
    }
    const rec = await this.store.criar({
      nome: nomeLimpo,
      tema: tema.trim(),
      criadorApelido: criador,
      visibilidade: Visibilidade.PUBLICA,
      capacidadeMax: LIMITES.SALA_CAPACIDADE_PADRAO,
    });
    this.presencaDe(rec.id).add(criador);
    this.vaziaDesde.delete(rec.id);
    return this.resumo(rec);
  }

  /** RF02 — lista todas as salas com a contagem de participantes online. */
  async listar(): Promise<SalaResumo[]> {
    const recs = await this.store.listarTodas();
    return recs.map((r) => this.resumo(r));
  }

  /** RF03 — adiciona o usuário à sala, respeitando RN06 (bloqueio) e RN08 (capacidade). */
  async entrar(salaId: string, apelido: string): Promise<SalaResumo> {
    const rec = await this.exigirSala(salaId);
    if (this.estaBloqueado(rec.id, apelido)) {
      throw new DomainError(
        'EXPULSO_BLOQUEADO',
        'Você foi removido desta sala e não pode reingressar por alguns minutos.',
      );
    }
    const online = this.presencaDe(rec.id);
    if (!online.has(apelido) && online.size >= rec.capacidadeMax) {
      throw new DomainError(
        'SALA_CHEIA',
        'Esta sala atingiu a capacidade máxima.',
      );
    }
    online.add(apelido);
    this.vaziaDesde.delete(rec.id);
    return this.resumo(rec);
  }

  /** RF11 — remove o usuário da presença da sala. */
  sair(salaId: string, apelido: string): void {
    const online = this.presenca.get(salaId);
    if (!online) return;
    online.delete(apelido);
    if (online.size === 0 && !this.vaziaDesde.has(salaId)) {
      this.vaziaDesde.set(salaId, Date.now());
    }
  }

  /** RN06 — bloqueia o reingresso de um apelido na sala por alguns minutos. */
  bloquearReingresso(salaId: string, apelido: string): void {
    const expiraEm = Date.now() + LIMITES.BLOQUEIO_EXPULSAO_MIN * 60_000;
    let porApelido = this.bloqueios.get(salaId);
    if (!porApelido) {
      porApelido = new Map();
      this.bloqueios.set(salaId, porApelido);
    }
    porApelido.set(apelido.toLowerCase(), expiraEm);
  }

  /** RN06 — informa se o apelido ainda está bloqueado para reingresso na sala. */
  estaBloqueado(
    salaId: string,
    apelido: string,
    agora: number = Date.now(),
  ): boolean {
    const expiraEm = this.bloqueios.get(salaId)?.get(apelido.toLowerCase());
    if (expiraEm === undefined) return false;
    if (expiraEm <= agora) {
      this.bloqueios.get(salaId)?.delete(apelido.toLowerCase());
      return false;
    }
    return true;
  }

  /**
   * RN07 — remove salas públicas (não oficiais) sem participantes há mais do que
   * o limite de ociosidade. Retorna os ids removidos. Recebe `agora` para teste.
   */
  async removerSalasOciosas(agora: number = Date.now()): Promise<string[]> {
    const limiteMs = LIMITES.SALA_OCIOSA_MIN * 60_000;
    const salas = await this.store.listarTodas();
    const removidas: string[] = [];
    for (const sala of salas) {
      if (sala.visibilidade === Visibilidade.OFICIAL) continue;
      const online = this.presenca.get(sala.id)?.size ?? 0;
      if (online > 0) {
        this.vaziaDesde.delete(sala.id);
        continue;
      }
      const desde = this.vaziaDesde.get(sala.id);
      if (desde === undefined) {
        this.vaziaDesde.set(sala.id, agora); // começa a contar a ociosidade agora
        continue;
      }
      if (agora - desde >= limiteMs) {
        await this.store.remover(sala.id);
        await this.mensagens.removerPorSala(sala.id);
        this.encerrarPresenca(sala.id);
        removidas.push(sala.id);
      }
    }
    return removidas;
  }

  /** Limpa toda a presença/estado de uma sala (ex.: sala encerrada — RF14). */
  encerrarPresenca(salaId: string): void {
    this.presenca.delete(salaId);
    this.vaziaDesde.delete(salaId);
    this.bloqueios.delete(salaId);
  }

  async participantes(salaId: string): Promise<Participante[]> {
    const rec = await this.exigirSala(salaId);
    return [...this.presencaDe(rec.id)].map((apelido) => ({
      apelido,
      papel: this.papel(rec, apelido),
    }));
  }

  async ehModerador(salaId: string, apelido: string): Promise<boolean> {
    const rec = await this.store.buscarPorId(salaId);
    return rec?.criadorApelido === apelido;
  }

  estaNaSala(salaId: string, apelido: string): boolean {
    return this.presenca.get(salaId)?.has(apelido) ?? false;
  }

  private papel(rec: SalaRecord, apelido: string): Papel {
    return rec.criadorApelido === apelido
      ? Papel.MODERADOR
      : Papel.PARTICIPANTE;
  }

  private presencaDe(salaId: string): Set<string> {
    let online = this.presenca.get(salaId);
    if (!online) {
      online = new Set();
      this.presenca.set(salaId, online);
    }
    return online;
  }

  private async exigirSala(salaId: string): Promise<SalaRecord> {
    const rec = await this.store.buscarPorId(salaId);
    if (!rec) {
      throw new DomainError('SALA_NAO_ENCONTRADA', 'Sala não encontrada.');
    }
    return rec;
  }

  private resumo(rec: SalaRecord): SalaResumo {
    return {
      id: rec.id,
      nome: rec.nome,
      tema: rec.tema,
      visibilidade: rec.visibilidade,
      participantesOnline: this.presenca.get(rec.id)?.size ?? 0,
      capacidadeMax: rec.capacidadeMax,
    };
  }
}
