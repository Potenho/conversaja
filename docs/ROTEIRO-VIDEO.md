# Roteiro do vídeo — ConversaJá

Roteiro para o vídeo de **5 a 10 minutos** exigido na entrega. Cobre os quatro pontos pedidos:
**demonstração das funcionalidades**, **explicação da arquitetura**, **testes** e **reflexão
sobre o processo de desenvolvimento**. Duração-alvo: **~8–9 min**.

> Dica: grave a tela com áudio. Fale com naturalidade — os trechos em _itálico_ abaixo são
> sugestões de fala, não precisam ser lidos ao pé da letra.

## Antes de gravar (checklist)

- [ ] `npm run docker:up` rodando, ou `npm run dev:backend` + `npm run dev:frontend` (e um Postgres).
- [ ] **Duas janelas/abas** do navegador lado a lado (ex.: `localhost:8080` ou `:4200`), uma
      normal e outra anônima, para simular dois usuários.
- [ ] Uma aba extra em `/admin` com o token (`admin`) à mão.
- [ ] Editor aberto no projeto, com `docs/ARQUITETURA.md` e a pasta `apps/` visíveis.
- [ ] Um terminal limpo para rodar os testes.
- [ ] Fechar notificações e abas irrelevantes.

---

## Bloco 1 — Abertura e contexto (0:00–0:40)

**Tela:** página de entrada do ConversaJá.

_"Olá! Este é o ConversaJá, um sistema Web de chat em tempo real. A ideia é comunicação de baixa
fricção: a pessoa entra pelo navegador, escolhe um apelido — sem cadastro — e já conversa em
salas temáticas. Vou demonstrar as funcionalidades, explicar a arquitetura, mostrar os testes e,
no final, refletir sobre o processo."_

---

## Bloco 2 — Demonstração das funcionalidades (0:40–4:00)

Mostre o fluxo com **dois usuários** lado a lado.

1. **Entrar com apelido (RF01).** Numa janela, entre como `maria`. Tente um apelido inválido
   (ex.: `ab`) para mostrar a validação (RN01). _"O apelido é validado: 3 a 20 caracteres."_
2. **Lobby e criar sala (RF02, RF04).** Crie a sala "Projetos Web". _"Quem cria a sala vira
   moderador automaticamente."_ (RN03)
3. **Segundo usuário entra (RF03).** Na outra janela, entre como `joao` e entre na mesma sala.
   Mostre o **aviso de entrada** e a **lista de online** atualizando (RF07, RF10).
4. **Mensagem em tempo real (RF05/RF06).** `maria` envia uma mensagem e ela aparece
   **instantaneamente** para `joao`. Mostre o **"digitando…"** (RF09) e o **histórico** ao entrar
   (RF08).
5. **Sanitização/XSS (RNF06).** Envie algo como `<b>teste</b>` ou `<script>` e mostre que aparece
   como texto, sem executar.
6. **Moderação (RF12/RF13 + RN06).** Como `maria` (moderadora): remova uma mensagem (some para
   todos) e **expulse** `joao`. Tente reentrar com `joao` na mesma sala e mostre o **bloqueio de
   reingresso** (RN06).
7. **Painel administrativo (RF14/RF15).** Vá em `/admin`, informe o token. Mostre as **métricas**
   (salas ativas, usuários online) e **crie uma sala oficial** — destaque que ela **aparece no
   lobby de todos em tempo real**. Edite e remova uma sala.

_"Tudo o que mostrei rastreia até um requisito do documento do Trabalho 1."_

---

## Bloco 3 — Arquitetura (4:00–6:00)

**Tela:** `docs/ARQUITETURA.md` (diagramas) e a estrutura de pastas.

- _"É um **monorepo** com três peças: o frontend Angular, o backend NestJS e um pacote de
  **contratos compartilhados** — os mesmos tipos de eventos e limites de negócio usados nos dois
  lados, evitando divergência."_
- _"Escolhi uma **arquitetura monolítica modular**, não microsserviços: o escopo é uma
  funcionalidade central, a equipe é pequena e o prazo é curto — microsserviços só adicionariam
  complexidade."_
- _"A comunicação em tempo real é via **WebSocket (Socket.IO)**; o **gateway** no backend traduz
  os eventos em operações de domínio e faz o broadcast para a sala. A administração é via **REST**."_
- _"Os dados duráveis — salas e mensagens — ficam no **PostgreSQL via TypeORM**. Já a **presença
  online** e as sessões são **efêmeras**, em memória, porque só fazem sentido enquanto há conexão."_
- _"Uso um **padrão de repositório**: a persistência é abstraída, com uma implementação TypeORM em
  produção e uma em memória nos testes."_

Mostre rapidamente o diagrama de componentes e o de sequência do envio de mensagem.

---

## Bloco 4 — Testes e qualidade (6:00–7:30)

**Tela:** terminal.

- Rode `npm test` — _"testes unitários do backend cobrindo as regras de negócio (RN01–RN08) e os
  testes de componente do frontend com Vitest, sem precisar de navegador."_
- Rode `npm run test:e2e` — _"um teste de **fluxo completo**: dois clientes WebSocket reais, um
  cria a sala, o outro entra, uma mensagem é enviada e recebida em tempo real."_
- _"Graças ao padrão de repositório, os testes rodam **sem banco**."_
- Mostre `.github/workflows/ci.yml` — _"a cada push ou PR, o **CI** roda lint, testes, e2e e
  build automaticamente."_
- _"A estratégia de testes priorizou corretude das regras, o caminho crítico de tempo real,
  segurança (XSS) e confiabilidade."_

---

## Bloco 5 — Implantação (7:30–8:00)

**Tela:** `docker-compose.yml` e terminal.

_"O sistema é **implantável por terceiros** com um comando: `npm run docker:up` sobe três
containers — banco, backend e frontend. O nginx serve a aplicação e encaminha o WebSocket para o
backend na mesma origem."_

---

## Bloco 6 — Reflexão sobre o processo (8:00–9:00)

Fale olhando para a câmera ou para o histórico de commits/PRs.

- **Processo:** _"Parti dos requisitos do Trabalho 1, fiz **protótipos** das telas e implementei de
  forma incremental, cada funcionalidade em sua **branch** com **Pull Request** e CI verde antes do
  merge."_
- **Uma decisão concreta:** _"Comecei com Prisma, mas o ambiente não baixava os binários de engine;
  troquei para **TypeORM**, que é puro JavaScript — a abstração de repositório tornou essa troca
  barata."_
- **O que deu certo:** contratos compartilhados evitando bugs de integração; testes sem banco;
  separar o efêmero do durável.
- **O que faria a seguir:** migrações versionadas no lugar de `synchronize`, mais testes de
  componente no frontend e métricas de desempenho sob carga (RNF01/RNF02).
- **Encerramento:** _"No total, todas as 15 funcionalidades e as 8 regras de negócio do escopo
  foram implementadas, testadas e estão implantáveis. Obrigado!"_

---

## Mapa rápido (o que mostrar × requisito)

| Momento | Requisitos |
|---------|------------|
| Entrar com apelido + validação | RF01, RN01 |
| Lobby, criar sala, moderador | RF02, RF04, RN03 |
| Entrar, avisos, online | RF03, RF07, RF10 |
| Mensagem em tempo real, digitando, histórico | RF05, RF06, RF09, RF08 |
| XSS | RNF06 |
| Remover, expulsar, bloqueio de reingresso | RF12, RF13, RN06 |
| Admin: métricas e salas oficiais | RF14, RF15 |
| Testes e CI | estratégia de qualidade |
| Docker | implantação por terceiros |
