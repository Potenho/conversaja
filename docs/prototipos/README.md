# Protótipos de interface — ConversaJá

Protótipos navegáveis de **média fidelidade** (HTML/CSS) das telas principais do sistema. Eles
mostram os fluxos de interação do usuário e servem de referência para a implementação em Angular,
que deve manter coerência com o que está aqui (adaptações são possíveis, desde que justificadas
em [../IMPLEMENTACAO.md](../IMPLEMENTACAO.md)).

## Como visualizar

Abra `index.html` em qualquer navegador moderno (basta duplo clique) e navegue entre as telas.
Não há dependências — é HTML e CSS estático.

## Telas

| Arquivo            | Tela          | Requisitos cobertos                          |
|--------------------|---------------|----------------------------------------------|
| `01-entrada.html`  | Entrada       | RF01 (apelido), RN01, UC01 (estado de erro)  |
| `02-lobby.html`    | Lobby         | RF02 (listar salas), RF04 (criar sala), RN03 |
| `03-sala.html`     | Sala (chat)   | RF03, RF05–RF10, RF12, RF13 (moderação), RN02|
| `04-admin.html`    | Painel admin  | RF14 (salas oficiais), RF15 (monitoramento)  |

## Fluxos representados

- **Principal**: Entrada → Lobby → Sala (entrar com apelido, escolher/criar sala, conversar).
- **Moderação**: na Sala, o moderador vê ações de "remover mensagem" (ao passar o mouse na
  mensagem) e "expulsar" (na lista de online) — visíveis apenas a quem é moderador.
- **Administrativo**: Painel admin com indicadores de uso e gestão de salas oficiais.

A anotação fixa no canto inferior de cada tela (fundo escuro) indica quais requisitos aquela
tela representa, facilitando a rastreabilidade.
