import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { LIMITES, Mensagem, TipoMensagem } from '@conversaja/shared';
import { DomainError } from './domain-error';
import { sanitize } from './sanitize';

/**
 * Armazena as mensagens por sala (em memória) e aplica as regras de conteúdo:
 * RN05 (sem mensagem vazia), RN04 (máx. 500 caracteres) e sanitização XSS (RNF06).
 */
@Injectable()
export class MessagesService {
  private readonly porSala = new Map<string, Mensagem[]>();

  /** RF05 — valida, sanitiza e armazena uma mensagem de texto. */
  adicionar(salaId: string, autor: string, conteudo: string): Mensagem {
    const texto = conteudo.trim();
    if (texto.length === 0) {
      throw new DomainError('MENSAGEM_VAZIA', 'A mensagem não pode estar vazia.');
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
    this.lista(salaId).push(mensagem);
    return mensagem;
  }

  /** RF08 — últimas N mensagens da sala, em ordem cronológica. */
  recentes(salaId: string): Mensagem[] {
    return this.lista(salaId).slice(-LIMITES.HISTORICO_RECENTE);
  }

  /** RF12 — remove uma mensagem da sala (moderação). */
  remover(salaId: string, mensagemId: string): Mensagem {
    const lista = this.lista(salaId);
    const indice = lista.findIndex((m) => m.id === mensagemId);
    if (indice === -1) {
      throw new DomainError('MENSAGEM_INEXISTENTE', 'Mensagem não encontrada.');
    }
    return lista.splice(indice, 1)[0];
  }

  private lista(salaId: string): Mensagem[] {
    let lista = this.porSala.get(salaId);
    if (!lista) {
      lista = [];
      this.porSala.set(salaId, lista);
    }
    return lista;
  }
}
