# ConversaJá — Implementação de Código e Testes

Documento vivo que descreve **como** o sistema está sendo construído: decisões de arquitetura,
estratégia de testes, qualidade e implantação. Deve ser atualizado conforme o desenvolvimento
avança. Os requisitos referenciados (RFxx, RNFxx, RNxx, UCxx) estão em
[requisitos/](requisitos/).

---

## 1. Visão da implementação

O ConversaJá é implementado como **aplicação Web completa**: interface de usuário (Angular),
backend (NestJS) e persistência (PostgreSQL). Tudo em **TypeScript**, organizado em um
**monorepo** para compartilhar contratos entre cliente e servidor.

| Camada        | Tecnologia                          | Responsabilidade                                  |
|---------------|-------------------------------------|---------------------------------------------------|
| Frontend      | Angular + RxJS                      | UI em pt-BR, cliente WebSocket, estado de tela     |
| Backend       | NestJS + Socket.IO                  | REST, gateway WebSocket, regras de negócio         |
| Persistência  | PostgreSQL (Prisma/TypeORM)         | Salas, mensagens, participações                    |
| Compartilhado | `packages/shared`                   | Tipos de eventos, DTOs, enums (papel, visibilidade)|

### Justificativa da arquitetura (monolito modular)

Optou-se por uma **arquitetura monolítica modular** no backend (módulos NestJS por domínio:
`auth`, `rooms`, `messages`, `moderation`, `admin`) em vez de microserviços. Motivos:

- O escopo é uma funcionalidade central bem delimitada (chat em tempo real), não um conjunto de
  domínios independentes que justifiquem deploys separados.
- Equipe pequena: um único artefato é mais simples de desenvolver, testar e implantar.
- Microserviços trariam custo de orquestração e comunicação entre serviços sem benefício real
  para este porte — coerente com o estudo de viabilidade.

A modularização interna preserva a manutenibilidade (RNF09): cada domínio é isolado e pode
evoluir sem afetar os demais.

### Estrutura de pastas

```
conversaja/
├── apps/
│   ├── frontend/         # Angular
│   │   └── src/app/features/  # lobby, room, admin...
│   └── backend/          # NestJS
│       └── src/modules/       # auth, rooms, messages, moderation, admin
├── packages/
│   └── shared/           # contratos compartilhados
├── docs/                 # este documento, arquitetura, requisitos
└── .claude/              # convenções de commit e código
```

---

## 2. Protótipos de interface

Antes/durante a implementação são produzidos protótipos (baixa/média fidelidade) das telas
principais, mantendo coerência com a implementação final:

1. **Entrada (apelido)** — campo único de apelido e botão entrar (UC01 / RF01).
2. **Lobby (lista de salas)** — salas públicas com nome, tema e nº de participantes; criar sala
   (RF02, RF04).
3. **Sala (chat)** — histórico recente, lista de online, campo de mensagem, indicador
   "digitando...", avisos de entrada/saída (RF03, RF05–RF10).
4. **Moderação** — ações de remover mensagem e expulsar participante para o moderador (RF12, RF13).
5. **Painel admin** — salas oficiais e indicadores de uso (RF14, RF15).

> Local dos protótipos: `docs/prototipos/` (ou link para a ferramenta de design). Divergências
> entre protótipo e implementação devem ser justificadas neste documento.

---

## 3. Implementação por requisito (rastreabilidade)

Cada funcionalidade rastreia até um RF do documento de requisitos. Estado: ☐ pendente ·
◐ em andamento · ☑ concluído.

| RF    | Funcionalidade                       | Onde (módulo/feature)            | Estado |
|-------|--------------------------------------|----------------------------------|--------|
| RF01  | Entrar com apelido                   | backend `chat/session` · front `entrada` | ☑  |
| RF02  | Listar salas públicas                | backend `chat/rooms` · front `lobby`     | ☑  |
| RF03  | Entrar em uma sala                   | backend `chat/rooms` · front `sala`      | ☑  |
| RF04  | Criar sala pública                   | backend `chat/rooms` · front `lobby`     | ☑  |
| RF05  | Enviar mensagem em tempo real        | backend `chat/messages` (gateway)        | ☑  |
| RF06  | Receber mensagens em tempo real      | front `SocketService` · `sala`           | ☑  |
| RF07  | Visualizar usuários online           | backend `chat/rooms` · front `sala`      | ☑  |
| RF08  | Histórico recente                    | backend `chat/messages`                  | ☑  |
| RF09  | Indicador "digitando..."             | backend gateway · front `sala`           | ☑  |
| RF10  | Notificar entrada/saída              | backend gateway                          | ☑  |
| RF11  | Sair da sala / sistema               | backend gateway · front `sala`           | ☑  |
| RF12  | Remover mensagem (moderação)         | backend `chat/messages` (gateway)        | ☑  |
| RF13  | Expulsar usuário (moderação)         | backend gateway                          | ☑  |
| RF14  | Gerenciar salas oficiais (admin)     | backend `admin`                          | ☐  |
| RF15  | Monitorar o sistema (admin)          | backend `admin` · front `admin`          | ☐  |

Regras de negócio já implementadas como validações/serviços: RN01 (apelido único, 3–20 alfanum.),
RN02 (só moderador modera), RN03 (criador vira moderador), RN04 (≤500 caracteres),
RN05 (sem mensagem vazia), RN08 (capacidade máx. da sala).

Pendentes (próximas etapas): RN06 (bloqueio de reingresso por 10 min após expulsão),
RN07 (remoção automática de salas públicas ociosas) e persistência em banco (hoje em memória).

---

## 4. Estratégia de testes

A estratégia cobre **diferentes níveis**, do unitário ao fluxo completo, priorizando as regras
de negócio e o caminho crítico de tempo real.

### 4.1. Níveis

| Nível          | Ferramenta              | O que cobre                                                |
|----------------|-------------------------|------------------------------------------------------------|
| Unitário       | Jest                    | Serviços e regras de negócio isoladas (RN01–RN08)          |
| Integração     | Jest + Nest TestingModule | Service ↔ repositório/banco; validação de DTOs           |
| End-to-end     | Jest + Socket.IO client | Fluxo completo de envio/recebimento via WebSocket (UC04)   |
| Componente UI  | Vitest + jsdom          | Componentes Angular (lobby, sala, entrada); sem navegador  |
| Fluxo manual   | Roteiro documentado     | Validação ponta a ponta de um cenário real (ver 4.4)       |

### 4.2. Prioridades (atributos de qualidade)

Priorizam-se os atributos mais críticos ao produto:

- **Corretude das regras de negócio** — limites e permissões (RN01–RN08) têm cobertura unitária.
- **Tempo real / desempenho** — o fluxo de envio→broadcast→recebimento (RF05/RF06, RNF01) é
  validado em teste e2e com múltiplos clientes simulados.
- **Segurança** — sanitização de conteúdo contra XSS (RNF06) é testada com payloads maliciosos.
- **Confiabilidade** — reconexão automática e restauração de sessão (RNF08).

### 4.3. Casos de teste prioritários

- `auth`: apelido válido entra; apelido fora do formato é rejeitado; apelido em uso é rejeitado
  (RN01, UC01 FA1/FA2).
- `rooms`: criar sala adiciona à lista e torna criador moderador (RN03); nome duplicado é
  rejeitado (UC03 FA2); sala cheia recusa entrada (RN08).
- `messages`: mensagem vazia ou >500 caracteres é rejeitada sem broadcast (RN04, RN05, UC04 FA1);
  mensagem válida é persistida e retransmitida.
- `moderation`: não-moderador é negado ao remover/expulsar (RN02); expulso fica bloqueado por
  10 min (RN06).

### 4.4. Teste de fluxo completo (manual ou automatizado)

Cenário ponta a ponta: dois clientes entram com apelidos distintos → ambos entram na mesma sala
→ cliente A envia mensagem → cliente B a recebe em tempo real → moderador remove a mensagem →
ambos deixam de vê-la. Roteiro detalhado em `docs/testes/fluxo-completo.md`.

### 4.5. Execução

```bash
npm run test          # unitários e integração (todos os workspaces)
npm run test:e2e      # fluxo WebSocket (backend)
npm run test:cov      # relatório de cobertura
```

---

## 5. Qualidade contínua e implantação

### 5.1. CI (integração contínua)

Pipeline em `.github/workflows/ci.yml`, disparado a cada push e pull request, executando
automaticamente:

1. `install` — instala dependências do monorepo.
2. `lint` — ESLint + verificação de formatação (Prettier).
3. `test` — testes unitários e de integração.
4. `build` — compila frontend e backend para garantir que o projeto é construível.

Merge na `main` só com pipeline verde.

### 5.2. Implantação por terceiros

O sistema é implantável por qualquer pessoa via **Docker Compose**, sem configuração manual de
ambiente:

```bash
cp .env.example .env      # ajustar variáveis se necessário
docker compose up --build
# frontend e backend sobem juntos com o banco PostgreSQL
```

`docker-compose.yml` define três serviços: `frontend`, `backend` e `db` (PostgreSQL). As
instruções completas de execução ficam no `README.md` da raiz. Todo tráfego em produção deve
ocorrer sobre HTTPS/WSS (RNF06).

---

## 6. Registro de progresso

Atualize esta seção a cada avanço relevante (ordem cronológica inversa).

| Data       | Mudança                                                        |
|------------|---------------------------------------------------------------|
| 2026-06-18 | Implantação e CI/CD: pipeline GitHub Actions (lint + testes + build), Dockerfiles de backend e frontend (nginx com proxy WebSocket), `docker-compose.yml` e instruções no `README.md`. |
| 2026-06-18 | Núcleo de chat em tempo real: gateway WebSocket + serviços de sessão/salas/mensagens (RN01–RN08, sanitização XSS) e telas entrada/lobby/sala. Frontend migrado para Angular 22 (Vitest, sem Karma); Node ≥24.15 (`.nvmrc`). |
| 2026-06-17 | Scaffold do monorepo: `apps/backend` (NestJS 11), `apps/frontend` (Angular), `packages/shared` (contratos). npm workspaces; builds e testes verdes. |
| 2026-06-17 | Protótipos de média fidelidade em `docs/prototipos/`.         |
| 2026-06-17 | Criação das convenções (`.claude/`) e deste documento.        |
