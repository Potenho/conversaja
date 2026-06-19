import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { LIMITES, Mensagem, TipoMensagem } from '@conversaja/shared';
import { DomainError } from './domain-error';
import { sanitize } from './sanitize';
import { MensagemStore } from './stores/mensagem-store';

/**
 * Regras de conteúdo e persistência das mensagens: RN05 (sem mensagem vazia),
 * RN04 (máx. 500 caracteres) e sanitização XSS (RNF06). Os dados são guardados
 * via {@link MensagemStore}.
 */
@Injectable()
export class MessagesService {
  constructor(private readonly store: MensagemStore) {}

  /** RF05 — valida, sanitiza e persiste uma mensagem de texto. */
  async adicionar(
    salaId: string,
    autor: string,
    conteudo: string,
  ): Promise<Mensagem> {
    const texto = conteudo.trim();
    if (texto.length === 0) {
      throw new DomainError(
        'MENSAGEM_VAZIA',
        'A mensagem não pode estar vazia.',
      );
    }
    if (texto.length > LIMITES.MENSAGEM_MAX) {
      throw new DomainError(
        'MENSAGEM_LONGA',
        `A mensagem excede o limite de ${LIMITES.MENSAGEM_MAX} caracteres.`,
      );
    }
    const mensagem: Mensagem = {
      id: randomUUID(),
      salaId,
      autor,
      conteudo: sanitize(texto),
      tipo: TipoMensagem.TEXTO,
      enviadaEm: new Date().toISOString(),
    };
    await this.store.inserir(mensagem);
    return mensagem;
  }

  /** RF08 — últimas N mensagens da sala, em ordem cronológica. */
  async recentes(salaId: string): Promise<Mensagem[]> {
    return this.store.listarRecentes(salaId, LIMITES.HISTORICO_RECENTE);
  }

  /** RF12 — remove uma mensagem da sala (moderação). */
  async remover(salaId: string, mensagemId: string): Promise<void> {
    if (!(await this.store.existe(salaId, mensagemId))) {
      throw new DomainError('MENSAGEM_INEXISTENTE', 'Mensagem não encontrada.');
    }
    await this.store.remover(salaId, mensagemId);
  }
}
