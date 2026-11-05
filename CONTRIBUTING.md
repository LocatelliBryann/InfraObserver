# Como contribuir

Obrigado pelo interesse no InfraObserver! Este guia explica como preparar o ambiente, o fluxo de trabalho e os padrões usados no projeto.

## Ambiente de desenvolvimento

Siga a seção [Como executar](README.md#como-executar) do README para subir o banco, o backend, o frontend e um agente localmente.

## Fluxo de branches

| Branch | Uso |
|---|---|
| `main` | Versões estáveis, prontas para entrega |
| `develop` | Integração contínua do desenvolvimento; toda feature nasce e volta para cá |
| `feature/<nome>` | Novas funcionalidades |
| `fix/<nome>` | Correções de bugs |
| `chore/<nome>`, `docs/<nome>`, `ci/<nome>` | Manutenção, documentação e pipeline |

```bash
git checkout develop
git pull origin develop
git checkout -b feature/minha-funcionalidade
```

Abra o pull request sempre com base em **`develop`**.

## Mensagens de commit

O projeto segue o padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/), em inglês:

```text
tipo(escopo): descrição curta no imperativo
```

- **Tipos:** `feat`, `fix`, `refactor`, `test`, `docs`, `ci`, `chore`
- **Escopos:** `agent`, `backend`, `frontend`, ou nenhum quando a mudança atravessa o projeto

Exemplos do histórico:

```text
feat(backend): detect offline endpoints
fix(agent): keep agent running when server is unavailable
test(backend): cover history routes
ci: add SonarQube Cloud analysis
```

Prefira commits pequenos, um por assunto, que compilem e passem nos testes sozinhos.

## Testes

Toda mudança de comportamento vem acompanhada de testes. Antes de abrir o PR, rode:

```bash
cd backend  && npm test              # precisa do PostgreSQL rodando
cd frontend && npm run test:run && npm run build
cd agent    && python -m pytest
```

Metas mínimas de cobertura de linhas: **75% no backend** e **25% no frontend**.

## Pull requests

1. Preencha o template do PR: contexto, o que mudou, requisitos da RFC atendidos e como testar.
2. O CI precisa passar: testes, build e Quality Gate do SonarQube Cloud.
3. Peça revisão de pelo menos uma pessoa antes do merge.

## Reportando problemas

Use as [issues](../../issues/new/choose) com o template de **bug** ou de **funcionalidade**. Para bugs, inclua os passos para reproduzir, o comportamento esperado e o observado.
