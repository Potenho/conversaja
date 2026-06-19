# ConversaJá

Sistema Web de **chat em tempo real**: salas temáticas, identificação por apelido e acesso
imediato pelo navegador, sem cadastro complexo.

Monorepo com **Angular** (frontend), **NestJS + Socket.IO** (backend) e um pacote de
**contratos compartilhados**. Documentação de requisitos em [docs/](docs/) e detalhes de
implementação/testes em [docs/IMPLEMENTACAO.md](docs/IMPLEMENTACAO.md).

## Pré-requisitos

- **Node.js ≥ 24.15** (veja `.nvmrc`; com nvm: `nvm use`)
- npm 11+
- Opcional: **Docker** + Docker Compose para subir tudo em containers

## Executar em desenvolvimento

```bash
npm install              # instala o monorepo (compila o pacote shared no postinstall)

docker compose up db     # sobe um PostgreSQL local (ou use seu próprio)
npm run dev:backend      # NestJS em http://localhost:3000 (WebSocket)
npm run dev:frontend     # Angular em http://localhost:4200
```

Abra `http://localhost:4200`, escolha um apelido e entre. Em desenvolvimento, o frontend
conecta no backend em `localhost:3000`. O backend usa `DATABASE_URL` (veja `.env.example`);
por padrão aponta para o Postgres local em `localhost:5432`.

## Executar com Docker (implantável por terceiros)

Sobe banco (PostgreSQL), backend e frontend juntos, sem configurar ambiente manualmente:

```bash
docker compose up --build
```

Acesse `http://localhost:8080`. O nginx serve o Angular e encaminha o WebSocket (`/socket.io`)
para o backend na mesma origem; o backend persiste salas e mensagens no Postgres.

## Scripts (raiz)

| Script                  | O que faz                                            |
|-------------------------|------------------------------------------------------|
| `npm run build`         | Compila shared + backend + frontend                  |
| `npm test`              | Testes do backend (Jest) e do frontend (Vitest)      |
| `npm run test:backend`  | Apenas backend (unitários)                           |
| `npm run test:frontend` | Apenas frontend (Vitest + jsdom, sem navegador)      |
| `npm run test:e2e`      | Teste end-to-end do backend                          |
| `npm run lint`          | Análise estática                                     |
| `npm run format`        | Formata o código com Prettier                        |

## Estrutura

```
apps/backend    # NestJS: gateway WebSocket + serviços de domínio (sessão, salas, mensagens)
apps/frontend   # Angular: telas entrada, lobby e sala
packages/shared # contratos (eventos WebSocket, enums, limites de negócio)
docs/           # requisitos, protótipos e documento de implementação
.github/        # pipeline de CI
```

## Qualidade e CI

A cada push/PR, o GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) executa
instalação, lint, testes e build. As convenções de commit e código estão em
[.claude/guidelines/](.claude/guidelines/).
