/**
 * Contratos compartilhados entre frontend (Angular) e backend (NestJS).
 *
 * Fonte única de verdade para nomes de eventos WebSocket, formatos de payload,
 * enums de domínio e limites das regras de negócio (RN01–RN08). Importado pelos
 * dois lados como `@conversaja/shared` para evitar divergência de contrato.
 */

// ---------------------------------------------------------------------------
// Enums de domínio
// ---------------------------------------------------------------------------

/** Papel de um participante dentro de uma sala. */
export enum Papel {
  PARTICIPANTE = 'PARTICIPANTE',
  MODERADOR = 'MODERADOR',
}

/** Visibilidade/origem de uma sala. */
export enum Visibilidade {
  PUBLICA = 'PUBLICA',
  OFICIAL = 'OFICIAL',
}

/** Tipo de mensagem exibida no chat. */
export enum TipoMensagem {
  /** Mensagem enviada por um usuário. */
  TEXTO = 'TEXTO',
  /** Aviso do sistema (entrada/saída, etc.). */
  SISTEMA = 'SISTEMA',
}

// ---------------------------------------------------------------------------
// Limites das regras de negócio (RN01–RN08)
// ---------------------------------------------------------------------------

export const LIMITES = {
  /** RN01 — apelido de 3 a 20 caracteres alfanuméricos. */
  APELIDO_MIN: 3,
  APELIDO_MAX: 20,
  /** RN04 — cada mensagem é limitada a 500 caracteres. */
  MENSAGEM_MAX: 500,
  /** RN08 — capacidade máxima padrão por sala. */
  SALA_CAPACIDADE_PADRAO: 50,
  /** RN06 — minutos de bloqueio de reingresso após expulsão. */
  BLOQUEIO_EXPULSAO_MIN: 10,
  /** RN07 — minutos de ociosidade para remoção automática de sala pública. */
  SALA_OCIOSA_MIN: 30,
  /** RF08 — quantidade de mensagens recentes carregadas ao entrar na sala. */
  HISTORICO_RECENTE: 50,
} as const;

/** RN01 — valida o formato do apelido (3–20 alfanuméricos). */
export const APELIDO_REGEX = /^[A-Za-z0-9_]{3,20}$/;

// ---------------------------------------------------------------------------
// Modelos de dados (DTOs de leitura)
// ---------------------------------------------------------------------------

export interface SalaResumo {
  id: string;
  nome: string;
  tema: string;
  visibilidade: Visibilidade;
  participantesOnline: number;
  capacidadeMax: number;
}

export interface Mensagem {
  id: string;
  salaId: string;
  autor: string;
  conteudo: string;
  tipo: TipoMensagem;
  enviadaEm: string; // ISO-8601
}

export interface Participante {
  apelido: string;
  papel: Papel;
}

// ---------------------------------------------------------------------------
// Eventos WebSocket
// ---------------------------------------------------------------------------

/** Eventos emitidos pelo cliente para o servidor. */
export const ClientEvents = {
  ENTRAR_SISTEMA: 'auth:entrar', // RF01
  LISTAR_SALAS: 'sala:listar', // RF02
  CRIAR_SALA: 'sala:criar', // RF04
  ENTRAR_SALA: 'sala:entrar', // RF03
  SAIR_SALA: 'sala:sair', // RF11
  ENVIAR_MENSAGEM: 'mensagem:enviar', // RF05
  DIGITANDO: 'mensagem:digitando', // RF09
  REMOVER_MENSAGEM: 'moderacao:remover', // RF12
  EXPULSAR_USUARIO: 'moderacao:expulsar', // RF13
} as const;

/** Eventos emitidos pelo servidor para os clientes. */
export const ServerEvents = {
  SALAS_ATUALIZADAS: 'sala:lista', // RF02
  HISTORICO: 'sala:historico', // RF08
  PARTICIPANTES: 'sala:participantes', // RF07
  NOVA_MENSAGEM: 'mensagem:nova', // RF06
  MENSAGEM_REMOVIDA: 'mensagem:removida', // RF12
  USUARIO_DIGITANDO: 'mensagem:digitando:status', // RF09
  AVISO: 'sala:aviso', // RF10 (entrada/saída)
  EXPULSO: 'moderacao:expulso', // RF13
  ERRO: 'erro', // mensagem de erro destinada a um cliente
} as const;

// ---------------------------------------------------------------------------
// Payloads (cliente -> servidor)
// ---------------------------------------------------------------------------

export interface EntrarSistemaPayload {
  apelido: string;
}

export interface CriarSalaPayload {
  nome: string;
  tema: string;
}

export interface EntrarSalaPayload {
  salaId: string;
}

export interface EnviarMensagemPayload {
  salaId: string;
  conteudo: string;
}

export interface DigitandoPayload {
  salaId: string;
  digitando: boolean;
}

export interface RemoverMensagemPayload {
  salaId: string;
  mensagemId: string;
}

export interface ExpulsarUsuarioPayload {
  salaId: string;
  apelido: string;
}

// ---------------------------------------------------------------------------
// Payloads (servidor -> cliente)
// ---------------------------------------------------------------------------

export interface AvisoPayload {
  salaId: string;
  texto: string;
}

export interface DigitandoBroadcast {
  salaId: string;
  apelido: string;
  digitando: boolean;
}

export interface ErroPayload {
  codigo: string;
  mensagem: string;
}
