# Convenções de código — ConversaJá

Objetivo: código modular, documentado e consistente, de forma que uma funcionalidade nova
possa ser adicionada sem alterar módulos não relacionados (RNF09 — manutenibilidade).

## Princípios gerais

- **TypeScript em modo estrito** (`strict: true`) no front e no back. Sem `any` implícito.
- **Nomes descritivos em inglês** para identificadores de código; **textos de UI e mensagens
  ao usuário em pt-BR**.
- Funções pequenas e com responsabilidade única. Evite efeitos colaterais escondidos.
- Trate erros explicitamente; nunca silencie exceções sem log ou tratamento.
- **Sem segredos no código** — use variáveis de ambiente (`.env`, com `.env.example` versionado).
- Formatação automática com **Prettier**; análise estática com **ESLint**. O CI falha se houver
  violação. Não desabilite regras sem justificativa em comentário.

## Estrutura do monorepo

```
apps/frontend   # Angular: UI e cliente WebSocket
apps/backend    # NestJS: módulos REST + gateway WebSocket + persistência
packages/shared # tipos e contratos compartilhados (eventos WS, DTOs, enums)
```

Contratos trocados entre front e back (nomes de eventos WebSocket, formato de payload, enums
de papel/visibilidade) ficam em `packages/shared` e são importados pelos dois lados — uma única
fonte de verdade evita divergência de contrato.

## Backend (NestJS)

- Organize por **módulo de domínio**: `auth`, `rooms`, `messages`, `moderation`, `admin`.
  Cada módulo agrupa seu `*.module.ts`, `*.service.ts`, `*.controller.ts`/`*.gateway.ts`, `dto/`.
- **Controllers/Gateways** finos: só recebem, validam e delegam. Regra de negócio vai no **service**.
- **DTOs + `class-validator`** em toda entrada (REST e WebSocket). Validação de formato/limites
  (RN01, RN04, RN05) é feita aqui, não na UI apenas.
- Tempo real via `@WebSocketGateway`. Padronize nomes de evento (ex.: `message:send`,
  `message:new`, `room:join`, `user:typing`) e mantenha-os em `packages/shared`.
- **Sanitize** o conteúdo de mensagens antes de persistir/retransmitir para evitar XSS (RNF06).
- Acesso a dados isolado em repositórios/ORM; services não montam SQL cru espalhado.

## Frontend (Angular)

- **Componentes standalone**, organizados por feature (`features/lobby`, `features/room`, etc.).
- Lógica de estado e comunicação em **services injetáveis**; componentes cuidam da apresentação.
- Um `SocketService` central encapsula a conexão WebSocket e expõe streams (RxJS) tipados com os
  contratos de `packages/shared`. Componentes não falam com o socket diretamente.
- **Reconexão automática** e restauração da sessão na mesma sala (RNF08).
- Sempre renderize conteúdo de usuário de forma segura (binding do Angular já escapa; não use
  `innerHTML` com dado de usuário).
- Responsivo a partir de 360px; testado nas versões recentes de Chrome, Firefox e Edge (RNF05).
- Interface inteiramente em pt-BR (RNF04).

## Testes (resumo — detalhes em docs/IMPLEMENTACAO.md)

- Todo código novo entra com teste. Mínimo: **unitário** para regra de negócio.
- Padrão **AAA** (Arrange–Act–Assert); um comportamento por teste; nomes descritivos.
- Backend: Jest (unit + e2e). Frontend: Vitest + jsdom (runner nativo do Angular 22, sem navegador).
- Priorize testar regras de negócio (RN01–RN08) e o fluxo crítico de envio de mensagem (RF05/UC04).

## Documentação no código

- Comente o **porquê** de decisões não óbvias, não o óbvio do código.
- Use JSDoc/TSDoc em serviços e funções públicas de domínio.
- Mantenha [docs/IMPLEMENTACAO.md](../../docs/IMPLEMENTACAO.md) atualizado conforme o sistema evolui.
