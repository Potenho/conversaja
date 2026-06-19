import { randomUUID } from 'node:crypto';
import { Mensagem } from '@conversaja/shared';
import { AtualizacaoSala, NovaSala, SalaRecord, SalaStore } from './sala-store';
import { MensagemStore } from './mensagem-store';

/** Implementação em memória das salas — usada nos testes (sem banco). */
export class InMemorySalaStore extends SalaStore {
  private readonly salas = new Map<string, SalaRecord>();

  criar(dados: NovaSala): Promise<SalaRecord> {
    const rec: SalaRecord = {
      id: randomUUID(),
      criadaEm: new Date(),
      ...dados,
    };
    this.salas.set(rec.id, rec);
    return Promise.resolve(rec);
  }

  buscarPorId(id: string): Promise<SalaRecord | null> {
    return Promise.resolve(this.salas.get(id) ?? null);
  }

  existeNome(nome: string): Promise<boolean> {
    const existe = [...this.salas.values()].some(
      (s) => s.nome.toLowerCase() === nome.toLowerCase(),
    );
    return Promise.resolve(existe);
  }

  listarTodas(): Promise<SalaRecord[]> {
    return Promise.resolve([...this.salas.values()]);
  }

  atualizar(id: string, dados: AtualizacaoSala): Promise<SalaRecord | null> {
    const rec = this.salas.get(id);
    if (!rec) return Promise.resolve(null);
    if (dados.nome !== undefined) rec.nome = dados.nome;
    if (dados.tema !== undefined) rec.tema = dados.tema;
    return Promise.resolve(rec);
  }

  remover(id: string): Promise<void> {
    this.salas.delete(id);
    return Promise.resolve();
  }
}

/** Implementação em memória das mensagens — usada nos testes (sem banco). */
export class InMemoryMensagemStore extends MensagemStore {
  private readonly porSala = new Map<string, Mensagem[]>();

  inserir(mensagem: Mensagem): Promise<void> {
    this.lista(mensagem.salaId).push(mensagem);
    return Promise.resolve();
  }

  listarRecentes(salaId: string, limite: number): Promise<Mensagem[]> {
    return Promise.resolve(this.lista(salaId).slice(-limite));
  }

  existe(salaId: string, id: string): Promise<boolean> {
    return Promise.resolve(this.lista(salaId).some((m) => m.id === id));
  }

  remover(salaId: string, id: string): Promise<void> {
    const lista = this.lista(salaId);
    const indice = lista.findIndex((m) => m.id === id);
    if (indice !== -1) lista.splice(indice, 1);
    return Promise.resolve();
  }

  removerPorSala(salaId: string): Promise<void> {
    this.porSala.delete(salaId);
    return Promise.resolve();
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
