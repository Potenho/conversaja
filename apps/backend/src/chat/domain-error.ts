/**
 * Erro de regra de negócio do domínio. O gateway captura e converte em um
 * evento `ERRO` para o cliente, sem derrubar a conexão.
 */
export class DomainError extends Error {
  constructor(
    public readonly codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'DomainError';
  }
}
