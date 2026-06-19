import { Mensagem } from '@conversaja/shared';

/**
 * Abstração de persistência das mensagens. Token de injeção para a implementação
 * TypeORM (produção) ou em memória (testes).
 */
export abstract class MensagemStore {
  abstract inserir(mensagem: Mensagem): Promise<void>;
  abstract listarRecentes(salaId: string, limite: number): Promise<Mensagem[]>;
  abstract existe(salaId: string, id: string): Promise<boolean>;
  abstract remover(salaId: string, id: string): Promise<void>;
}
