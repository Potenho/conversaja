# Convenções de commit e versionamento — ConversaJá

Branches por funcionalidade e mensagens de commit claras e padronizadas mantêm o histórico
legível e rastreável até os requisitos do sistema.

## Conventional Commits

Toda mensagem segue o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo opcional>): <descrição no imperativo, minúscula, sem ponto final>

<corpo opcional explicando o "porquê", não o "o quê">

<rodapé opcional: BREAKING CHANGE, refs RFxx>
```

### Tipos permitidos

| Tipo       | Quando usar                                                       |
|------------|------------------------------------------------------------------|
| `feat`     | Nova funcionalidade visível ao usuário (geralmente atende um RF) |
| `fix`      | Correção de bug                                                  |
| `refactor` | Mudança de código que não altera comportamento externo          |
| `test`     | Adição ou ajuste de testes                                       |
| `docs`     | Documentação (README, docs/, comentários)                       |
| `chore`    | Configuração, dependências, scripts, CI                          |
| `style`    | Formatação, lint, sem mudança de lógica                          |
| `perf`     | Melhoria de desempenho                                           |
| `build`    | Build, Docker, empacotamento                                     |

### Escopos sugeridos

`backend`, `frontend`, `shared`, `ws` (websocket/tempo real), `auth` (apelido/sessão),
`sala`, `mensagem`, `moderacao`, `admin`, `ci`, `deps`.

### Exemplos

```
feat(sala): permitir criação de sala pública com nome e tema

Atende RF04. O criador entra automaticamente como moderador (RN03).

feat(ws): broadcast de mensagem em tempo real para participantes da sala
fix(auth): rejeitar apelido já em uso entre usuários conectados (RN01)
test(mensagem): cobrir limite de 500 caracteres e mensagem vazia (RN04, RN05)
chore(ci): adicionar pipeline de lint e testes no GitHub Actions
docs: descrever estratégia de testes em docs/IMPLEMENTACAO.md
```

### Regras

- Descrição em **português**, no **imperativo** ("adiciona", "corrige" — não "adicionado").
- Máximo ~72 caracteres na primeira linha. Sem ponto final.
- Um commit = uma mudança lógica e coesa. Nada de "wip" ou "ajustes gerais".
- Referencie o requisito atendido (`RFxx`, `RNxx`) no corpo quando aplicável — isso alimenta a
  matriz de rastreabilidade dos requisitos.
- O rodapé de co-autoria gerado pela ferramenta pode permanecer.

## Branches

- `main`: sempre estável e implantável. **Nunca** commitar direto nela.
- Branches de trabalho, nomeadas por tipo:
  - `feat/rf04-criar-sala`
  - `fix/apelido-duplicado`
  - `test/limite-mensagem`
  - `chore/ci-pipeline`
- Inclua o RF no nome quando a branch implementa um requisito (`feat/rf05-...`).

## Pull Requests

- PR pequeno e focado; título no mesmo padrão dos commits.
- Descrição responde: **o que** muda, **qual requisito** atende, **como testar**.
- CI verde (lint + testes) é pré-condição para merge.
- Prefira *squash merge* para manter o histórico da `main` limpo e legível.

## Fluxo resumido

```bash
git switch -c feat/rf05-enviar-mensagem
# ... implementa + testa ...
npm run lint && npm run test
git add -A
git commit -m "feat(ws): enviar e persistir mensagem em tempo real (RF05)"
git push -u origin feat/rf05-enviar-mensagem
# abre PR -> CI passa -> revisão -> squash merge
```
