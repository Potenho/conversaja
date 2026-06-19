import { Visibilidade } from '@conversaja/shared';

/** Dados duráveis de uma sala (sem a presença online, que é efêmera). */
export interface SalaRecord {
  id: string;
  nome: string;
  tema: string;
  visibilidade: Visibilidade;
  capacidadeMax: number;
  criadorApelido: string;
  criadaEm: Date;
}

export interface NovaSala {
  nome: string;
  tema: string;
  criadorApelido: string;
  visibilidade: Visibilidade;
  capacidadeMax: number;
}

/** Campos editáveis de uma sala (usado pela administração — RF14). */
export interface AtualizacaoSala {
  nome?: string;
  tema?: string;
}

/**
 * Abstração de persistência das salas. Serve como token de injeção: em produção
 * é ligada à implementação TypeORM; nos testes, à implementação em memória.
 */
export abstract class SalaStore {
  abstract criar(dados: NovaSala): Promise<SalaRecord>;
  abstract buscarPorId(id: string): Promise<SalaRecord | null>;
  abstract existeNome(nome: string): Promise<boolean>;
  abstract listarTodas(): Promise<SalaRecord[]>;
  abstract atualizar(
    id: string,
    dados: AtualizacaoSala,
  ): Promise<SalaRecord | null>;
  abstract remover(id: string): Promise<void>;
}
