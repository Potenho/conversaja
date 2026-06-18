import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  LIMITES,
  Papel,
  Participante,
  SalaResumo,
  Visibilidade,
} from '@conversaja/shared';
import { DomainError } from './domain-error';

interface RoomEntity {
  id: string;
  nome: string;
  tema: string;
  visibilidade: Visibilidade;
  capacidadeMax: number;
  criadaEm: Date;
  participantes: Map<string, Papel>; // apelido -> papel
}

/**
 * Gerencia as salas e a participação dos usuários (em memória).
 * Cobre RN03 (criador vira moderador), RN08 (capacidade máxima) e a listagem (RF02).
 */
@Injectable()
export class RoomsService {
  private readonly salas = new Map<string, RoomEntity>();

  /** RF04 — cria uma sala pública; o criador entra como moderador (RN03). */
  criar(nome: string, tema: string, criador: string): SalaResumo {
    const nomeLimpo = nome.trim();
    if (nomeLimpo.length < 1 || nomeLimpo.length > 60) {
      throw new DomainError(
        'NOME_SALA_INVALIDO',
        'O nome da sala deve ter de 1 a 60 caracteres.',
      );
    }
    const duplicada = [...this.salas.values()].some(
      (s) => s.nome.toLowerCase() === nomeLimpo.toLowerCase(),
    );
    if (duplicada) {
      throw new DomainError(
        'NOME_SALA_DUPLICADO',
        'Já existe uma sala com esse nome.',
      );
    }
    const sala: RoomEntity = {
      id: randomUUID(),
      nome: nomeLimpo,
      tema: tema.trim(),
      visibilidade: Visibilidade.PUBLICA,
      capacidadeMax: LIMITES.SALA_CAPACIDADE_PADRAO,
      criadaEm: new Date(),
      participantes: new Map([[criador, Papel.MODERADOR]]),
    };
    this.salas.set(sala.id, sala);
    return this.resumo(sala);
  }

  /** RF02 — lista todas as salas com a contagem de participantes online. */
  listar(): SalaResumo[] {
    return [...this.salas.values()].map((s) => this.resumo(s));
  }

  /** RF03 — adiciona o usuário à sala como participante, respeitando RN08. */
  entrar(salaId: string, apelido: string): SalaResumo {
    const sala = this.exigirSala(salaId);
    if (
      !sala.participantes.has(apelido) &&
      sala.participantes.size >= sala.capacidadeMax
    ) {
      throw new DomainError(
        'SALA_CHEIA',
        'Esta sala atingiu a capacidade máxima.',
      );
    }
    if (!sala.participantes.has(apelido)) {
      sala.participantes.set(apelido, Papel.PARTICIPANTE);
    }
    return this.resumo(sala);
  }

  /** RF11 — remove o usuário da sala. */
  sair(salaId: string, apelido: string): void {
    this.salas.get(salaId)?.participantes.delete(apelido);
  }

  participantes(salaId: string): Participante[] {
    const sala = this.exigirSala(salaId);
    return [...sala.participantes.entries()].map(([apelido, papel]) => ({
      apelido,
      papel,
    }));
  }

  ehModerador(salaId: string, apelido: string): boolean {
    return (
      this.salas.get(salaId)?.participantes.get(apelido) === Papel.MODERADOR
    );
  }

  estaNaSala(salaId: string, apelido: string): boolean {
    return this.salas.get(salaId)?.participantes.has(apelido) ?? false;
  }

  private exigirSala(salaId: string): RoomEntity {
    const sala = this.salas.get(salaId);
    if (!sala) {
      throw new DomainError('SALA_NAO_ENCONTRADA', 'Sala não encontrada.');
    }
    return sala;
  }

  private resumo(sala: RoomEntity): SalaResumo {
    return {
      id: sala.id,
      nome: sala.nome,
      tema: sala.tema,
      visibilidade: sala.visibilidade,
      participantesOnline: sala.participantes.size,
      capacidadeMax: sala.capacidadeMax,
    };
  }
}
