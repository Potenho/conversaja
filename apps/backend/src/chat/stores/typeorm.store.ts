import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Mensagem, TipoMensagem, Visibilidade } from '@conversaja/shared';
import { SalaEntity } from '../../database/entities/sala.entity';
import { MensagemEntity } from '../../database/entities/mensagem.entity';
import { AtualizacaoSala, NovaSala, SalaRecord, SalaStore } from './sala-store';
import { MensagemStore } from './mensagem-store';

/** Persistência das salas via TypeORM/PostgreSQL. */
@Injectable()
export class TypeOrmSalaStore extends SalaStore {
  constructor(
    @InjectRepository(SalaEntity) private readonly repo: Repository<SalaEntity>,
  ) {
    super();
  }

  async criar(dados: NovaSala): Promise<SalaRecord> {
    const entidade = this.repo.create({
      nome: dados.nome,
      tema: dados.tema,
      visibilidade: dados.visibilidade,
      capacidadeMax: dados.capacidadeMax,
      criadorApelido: dados.criadorApelido,
    });
    return this.toRecord(await this.repo.save(entidade));
  }

  async buscarPorId(id: string): Promise<SalaRecord | null> {
    const entidade = await this.repo.findOne({ where: { id } });
    return entidade ? this.toRecord(entidade) : null;
  }

  async existeNome(nome: string): Promise<boolean> {
    return (await this.repo.countBy({ nome: ILike(nome) })) > 0;
  }

  async listarTodas(): Promise<SalaRecord[]> {
    const entidades = await this.repo.find({ order: { criadaEm: 'ASC' } });
    return entidades.map((e) => this.toRecord(e));
  }

  async atualizar(
    id: string,
    dados: AtualizacaoSala,
  ): Promise<SalaRecord | null> {
    const entidade = await this.repo.findOne({ where: { id } });
    if (!entidade) return null;
    if (dados.nome !== undefined) entidade.nome = dados.nome;
    if (dados.tema !== undefined) entidade.tema = dados.tema;
    return this.toRecord(await this.repo.save(entidade));
  }

  async remover(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  private toRecord(e: SalaEntity): SalaRecord {
    return {
      id: e.id,
      nome: e.nome,
      tema: e.tema,
      visibilidade: e.visibilidade as Visibilidade,
      capacidadeMax: e.capacidadeMax,
      criadorApelido: e.criadorApelido,
      criadaEm: e.criadaEm,
    };
  }
}

/** Persistência das mensagens via TypeORM/PostgreSQL. */
@Injectable()
export class TypeOrmMensagemStore extends MensagemStore {
  constructor(
    @InjectRepository(MensagemEntity)
    private readonly repo: Repository<MensagemEntity>,
  ) {
    super();
  }

  async inserir(mensagem: Mensagem): Promise<void> {
    await this.repo.insert({
      id: mensagem.id,
      salaId: mensagem.salaId,
      autor: mensagem.autor,
      conteudo: mensagem.conteudo,
      tipo: mensagem.tipo,
      enviadaEm: new Date(mensagem.enviadaEm),
    });
  }

  async listarRecentes(salaId: string, limite: number): Promise<Mensagem[]> {
    const entidades = await this.repo.find({
      where: { salaId },
      order: { enviadaEm: 'DESC' },
      take: limite,
    });
    return entidades.reverse().map((e) => this.toMensagem(e));
  }

  async existe(salaId: string, id: string): Promise<boolean> {
    return (await this.repo.countBy({ id, salaId })) > 0;
  }

  async remover(salaId: string, id: string): Promise<void> {
    await this.repo.delete({ id, salaId });
  }

  async removerPorSala(salaId: string): Promise<void> {
    await this.repo.delete({ salaId });
  }

  private toMensagem(e: MensagemEntity): Mensagem {
    return {
      id: e.id,
      salaId: e.salaId,
      autor: e.autor,
      conteudo: e.conteudo,
      tipo: e.tipo as TipoMensagem,
      enviadaEm: e.enviadaEm.toISOString(),
    };
  }
}
