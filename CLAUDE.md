# ConversaJá

Sistema Web de chat em tempo real: salas temáticas, identificação por apelido e baixa
fricção (acesso direto pelo navegador, sem cadastro complexo).

A especificação de requisitos (RF/RNF/RN), casos de uso e modelos UML estão em
[docs/requisitos/](docs/requisitos/). Toda funcionalidade implementada deve rastrear até um
requisito (RFxx).

## Stack e arquitetura

- **Monorepo** com dois apps independentes: `apps/frontend` (Angular) e `apps/backend` (NestJS).
- **Comunicação em tempo real**: WebSocket (Socket.IO via `@nestjs/websockets`).
- **Persistência**: PostgreSQL (Prisma ou TypeORM); SQLite aceitável em desenvolvimento.
- **Código compartilhado** (tipos de eventos, DTOs de contrato): `packages/shared`.
- **Linguagem**: TypeScript em todo o repositório. Interface em pt-BR.

```
conversaja/
├── apps/
│   ├── frontend/   # Angular — UI, cliente WebSocket
│   └── backend/    # NestJS  — REST + gateway WebSocket + persistência
├── packages/
│   └── shared/     # tipos e contratos compartilhados
├── docs/           # arquitetura, requisitos, implementação
└── .claude/        # convenções deste repositório
```

## Convenções (LEIA antes de contribuir)

- **Commits**: [.claude/guidelines/commits.md](.claude/guidelines/commits.md) — Conventional Commits, em português, atômicos.
- **Código**: [.claude/guidelines/code.md](.claude/guidelines/code.md) — estilo TS/Angular/NestJS, testes, organização.

## Regras rápidas

- Nunca commite na `main` diretamente: trabalhe em branch `feat/…`, `fix/…`, etc. e abra PR.
- Todo código novo entra com teste (unitário no mínimo). Ver estratégia em [docs/IMPLEMENTACAO.md](docs/IMPLEMENTACAO.md).
- Rode `lint` e `test` antes de commitar; o CI repete essas verificações.
- Mensagens de usuário, sanitização (XSS) e limites (RN01–RN08) são requisitos, não opcionais.

## Comandos (preencher conforme o scaffold for criado)

```bash
# instalar dependências (raiz do monorepo)
npm install

# desenvolvimento
npm run dev:backend      # NestJS em watch
npm run dev:frontend     # Angular dev server

# qualidade
npm run lint
npm run test             # unitários (todos os workspaces)
npm run test:e2e         # fluxo completo (backend)
```
