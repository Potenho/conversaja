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

/**
 * Gerencia as salas. Os dados das salas são persistidos via {@link SalaStore};
 * a **presença online** (quem está conectado em cada sala) é efêmera e vive em
 * memória, pois está atrelada às conexões WebSocket ativas.
 *
 * Cobre RN03 (criador é moderador), RN08 (capacidade máxima) e a listagem (RF02).
 */
@Injectable()
export class RoomsService {
  private readonly presenca = new Map<string, Set<string>>(); // salaId -> apelidos online

  constructor(private readonly store: SalaStore) {}

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
    return this.resumo(rec);
  }

  /** RF02 — lista todas as salas com a contagem de participantes online. */
  async listar(): Promise<SalaResumo[]> {
    const recs = await this.store.listarTodas();
    return recs.map((r) => this.resumo(r));
  }

  /** RF03 — adiciona o usuário à sala como participante, respeitando RN08. */
  async entrar(salaId: string, apelido: string): Promise<SalaResumo> {
    const rec = await this.exigirSala(salaId);
    const online = this.presencaDe(rec.id);
    if (!online.has(apelido) && online.size >= rec.capacidadeMax) {
      throw new DomainError(
        'SALA_CHEIA',
        'Esta sala atingiu a capacidade máxima.',
      );
    }
    online.add(apelido);
    return this.resumo(rec);
  }

  /** RF11 — remove o usuário da presença da sala. */
  sair(salaId: string, apelido: string): void {
    this.presenca.get(salaId)?.delete(apelido);
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
