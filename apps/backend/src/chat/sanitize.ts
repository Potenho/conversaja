/**
 * Escapa caracteres HTML do conteúdo enviado pelos usuários para evitar injeção
 * de scripts (XSS) — RNF06. Aplicado antes de persistir/retransmitir mensagens.
 */
export function sanitize(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
