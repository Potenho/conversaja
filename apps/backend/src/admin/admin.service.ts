import { Injectable } from '@nestjs/common';
import {
  AtualizarSalaPayload,
  CriarSalaOficialPayload,
  LIMITES,
  MetricasAdmin,
  SalaResumo,
  Visibilidade,
} from '@conversaja/shared';
import { DomainError } from '../chat/domain-error';
import { ChatGateway } from '../chat/chat.gateway';
import { RoomsService } from '../chat/rooms.service';
import { SessionService } from '../chat/session.service';
import {
  AtualizacaoSala,
  SalaRecord,
  SalaStore,
} from '../chat/stores/sala-store';
import { MensagemStore } from '../chat/stores/mensagem-store';

/**
 * Regras do administrador: indicadores de uso (RF15) e gestão de salas
 * oficiais (RF14). Toda mudança é refletida no lobby de todos via WebSocket.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly salas: SalaStore,
    private readonly mensagens: MensagemStore,
    private readonly session: SessionService,
    private readonly rooms: RoomsService,
    private readonly gateway: ChatGateway,
  ) {}

  /** RF15 — salas ativas e usuários online. */
  async metricas(): Promise<MetricasAdmin> {
    const salas = await this.salas.listarTodas();
    return {
      salasAtivas: salas.length,
      usuariosOnline: this.session.totalConectados(),
    };
  }

  /** Lista as salas com a contagem de participantes online. */
  listarSalas(): Promise<SalaResumo[]> {
    return this.rooms.listar();
  }

  /** RF14 — cria uma sala oficial. */
  async criarOficial(payload: CriarSalaOficialPayload): Promise<SalaResumo> {
    const nome = (payload?.nome ?? '').trim();
    const tema = (payload?.tema ?? '').trim();
    if (nome.length < 1 || nome.length > 60) {
      throw new DomainError(
        'NOME_SALA_INVALIDO',
        'O nome da sala deve ter de 1 a 60 caracteres.',
      );
    }
    if (await this.salas.existeNome(nome)) {
      throw new DomainError(
        'NOME_SALA_DUPLICADO',
        'Já existe uma sala com esse nome.',
      );
    }
    const capacidade =
      payload.capacidadeMax && payload.capacidadeMax > 0
        ? payload.capacidadeMax
        : LIMITES.SALA_CAPACIDADE_PADRAO;
    const rec = await this.salas.criar({
      nome,
      tema,
      criadorApelido: 'admin',
      visibilidade: Visibilidade.OFICIAL,
      capacidadeMax: capacidade,
    });
    await this.gateway.notificarSalas();
    return this.toResumo(rec);
  }

  /** RF14 — edita nome/tema de uma sala. */
  async atualizar(
    id: string,
    payload: AtualizarSalaPayload,
  ): Promise<SalaResumo> {
    const dados: AtualizacaoSala = {};
    if (payload?.nome !== undefined) {
      const nome = payload.nome.trim();
      if (nome.length < 1 || nome.length > 60) {
        throw new DomainError(
          'NOME_SALA_INVALIDO',
          'O nome da sala deve ter de 1 a 60 caracteres.',
        );
      }
      dados.nome = nome;
    }
    if (payload?.tema !== undefined) {
      dados.tema = payload.tema.trim();
    }
    const rec = await this.salas.atualizar(id, dados);
    if (!rec) {
      throw new DomainError('SALA_NAO_ENCONTRADA', 'Sala não encontrada.');
    }
    await this.gateway.notificarSalas();
    return this.toResumo(rec);
  }

  /** RF14 — remove uma sala, encerrando-a para quem estiver dentro. */
  async remover(id: string): Promise<void> {
    const rec = await this.salas.buscarPorId(id);
    if (!rec) {
      throw new DomainError('SALA_NAO_ENCONTRADA', 'Sala não encontrada.');
    }
    await this.salas.remover(id);
    await this.mensagens.removerPorSala(id);
    await this.gateway.encerrarSala(id);
  }

  private toResumo(rec: SalaRecord): SalaResumo {
    return {
      id: rec.id,
      nome: rec.nome,
      tema: rec.tema,
      visibilidade: rec.visibilidade,
      participantesOnline: 0,
      capacidadeMax: rec.capacidadeMax,
    };
  }
}
