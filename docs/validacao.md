# Validação do produto

Este documento registra como o InfraObserver é validado e os resultados de cada teste. Os critérios vêm da seção 7.1 da [RFC v1.1](RFC-InfraObserver.pdf). Os scripts ficam na pasta [`validation/`](../validation).

## Resumo

| O que validar | Como | Critério de aceite | Resultado |
|---|---|---|---|
| Desempenho da API | Teste de carga com k6 | 95% das requisições em menos de 300 ms, sem erros | A preencher (seção 1) |
| Consumo do agente | Medição de CPU por 24 horas num PC do piloto | Média de CPU abaixo de 2% | A preencher (seção 2) |
| Usabilidade do dashboard | Questionário SUS após tarefas guiadas | Média de pelo menos 68 | A preencher (seção 3) |
| Fluxos principais no navegador | Testes E2E com Playwright no CI | Todos passando | ✅ Em todo PR (seção 4) |
| Utilidade em ambiente real | Piloto no cartório | Agentes online, eventos com usuário do domínio, sem impacto | ✅ Em andamento (seção 5) |
| Detecção de inativos e de eventos | Teste manual | OFFLINE após 3 ciclos; evento em até 10 s | A preencher (seção 6) |
| Instalação, auditoria e remoção | Smoke test no Windows do CI | Serviço ativo, auditoria ligada e desfeita | ✅ A cada PR do agente (seção 7) |
| Segurança e retenção | Testes automatizados e log de produção | Credenciais revogadas recusadas; dados com mais de 60 dias removidos | ✅ (seção 8) |

## 1. Teste de carga (k6)

**O que simula** (`validation/load/infraobserver.js`):

- **PCs:** 50 PCs com o agente. Cada um entra no sistema como um PC de verdade: troca o token de instalação pela credencial própria e depois envia uma métrica a cada 60 segundos. Em média, a cada três métricas vai também um evento de arquivo.
- **Dashboard:** 3 administradores com o dashboard aberto, fazendo as mesmas consultas da tela a cada 30 segundos (endpoints, saúde, alertas, eventos e o gráfico de um PC).
- **Critério:** p95 abaixo de 300 ms, menos de 1% de falhas e 99% das verificações certas. Se não atingir, o k6 termina com erro.

**Como rodar:**

- **No GitHub (recomendado):** em **Actions > Load Test > Run workflow**. O workflow monta a API em modo produção com um PostgreSQL limpo, cria um administrador com senha aleatória e roda o k6. O resumo aparece na página da execução e os arquivos ficam em **Artifacts**.
  - O runner do GitHub tem 2 vCPUs, porte parecido com o da VM de produção (Standard_B2als_v2).
  - O teste não roda contra a produção para não deixar 50 PCs falsos no dashboard real.
  - O botão só aparece depois que o workflow chega na `main`.
- **Localmente**, com a API rodando:

  ```bash
  k6 run -e BASE_URL=http://localhost:3000 \
         -e ADMIN_EMAIL=admin@exemplo.com -e ADMIN_PASSWORD='<senha>' \
         validation/load/infraobserver.js
  ```

  As variáveis `AGENTS`, `INTERVAL_SECONDS` e `DURATION` mudam o cenário. Os PCs simulados ficam num cliente chamado "Teste de carga ...". Para apagá-los de um banco de desenvolvimento:

  ```sql
  DELETE FROM endpoint WHERE hostname LIKE 'K6-PC-%';
  ```

**Resultado:**

| Execução | Cenário | p95 agentes | p95 dashboard | Falhas | Resultado |
|---|---|---|---|---|---|
| A preencher (link da execução no Actions) | 50 PCs a cada 60 s, 10 min | | | | |

**Achado do teste:** num teste de estresse local (200 PCs enviando a cada 1 segundo, cerca de 250 requisições por segundo), 30% das requisições falharam com `429`.

- **Causa:** o limite contra adivinhação de token de instalação (20 erros por IP a cada 15 minutos) usava o `express-rate-limit`. Mesmo ignorando os acertos, ele conta cada requisição na chegada e só desconta o acerto quando a resposta sai. Com mais de 20 PCs se registrando ao mesmo tempo atrás do mesmo IP (o caso de um escritório instalando por GPO), PCs legítimos eram bloqueados.
- **Correção:** o limite agora conta só as respostas com erro, depois que elas saem (`backend/src/middlewares/enrollment-rate-limit.middleware.ts`, com teste de 20 registros simultâneos).
- **Depois da correção:** o mesmo estresse passou com 0% de falhas e p95 de 61,5 ms nos agentes e 110 ms no dashboard (API local, 13/11/2026). Esse é um teste de capacidade, não o critério da RFC: o critério oficial é a execução da tabela acima.

## 2. Consumo de CPU do agente

O script `validation/measure-agent-cpu.ps1` soma o tempo de CPU dos processos do agente e divide pelo tempo passado e pelo número de processadores lógicos, como o Gerenciador de Tarefas. Os processos medidos são o `infraobserver-agent.exe` e o serviço `InfraObserverAgent.exe`. A cada amostra, ele grava CPU e memória num CSV e, no fim, um resumo com média, p95 e máximo.

No PC do piloto, abra o PowerShell **como administrador** e rode:

```powershell
powershell -ExecutionPolicy Bypass -File .\validation\measure-agent-cpu.ps1
```

O padrão é 24 horas, com uma amostra por minuto. Os arquivos vão para `InfraObserver-cpu` na Área de Trabalho. Ctrl+C encerra antes e gera o resumo do que foi medido. Para um teste rápido: `-Hours 1 -IntervalSeconds 10`.

**Resultado:**

| PC | Período | CPU média | CPU p95 | CPU máxima | Memória média | Resultado |
|---|---|---|---|---|---|---|
| A preencher | | | | | | |

## 3. Usabilidade (SUS)

O roteiro, as tarefas, o questionário e o cálculo estão em [`validation/sus/README.md`](../validation/sus/README.md).

- Respostas: anote em `validation/sus/respostas.csv`, com os participantes identificados como P1, P2...
- Cálculo: `python validation/sus/sus.py validation/sus/respostas.csv` gera as tabelas para colar aqui.

**Resultado:** a preencher.

## 4. Testes ponta a ponta (E2E)

A pasta [`e2e/`](../e2e) tem testes com Playwright que abrem o dashboard num navegador de verdade, ligado à API e a um PostgreSQL limpo. Eles rodam no job **E2E - Dashboard no navegador** do CI, em todo PR.

| Teste | O que confere |
|---|---|
| Login | Senha errada mostra o erro e não entra. Login certo entra, a sessão continua ao recarregar e, depois de sair, a página protegida volta para o login. |
| Dashboard | Um PC registrado pela API, do mesmo jeito que o agente faz (token de instalação, credencial, métrica e evento de arquivo), aparece no dashboard filtrado pelo cliente. O evento aparece com o selo "Auditado" e o usuário do domínio. |
| Clientes | Cadastrar um cliente, gerar um token de instalação e revogá-lo pela tela. |

Localmente, com a API e o dashboard rodando (`vite preview` na porta 4173 e a API com `CORS_ORIGINS=http://localhost:4173`):

```bash
cd e2e
npm ci
npx playwright install chromium
E2E_ADMIN_EMAIL=admin@exemplo.com E2E_ADMIN_PASSWORD='<senha>' npx playwright test
```

O teste de senha errada conta para o limite de login (5 erros por IP a cada 15 minutos). Rodando muitas vezes seguidas na mesma API, reinicie a API ou espere.

## 5. Piloto no cartório

| Item | Situação |
|---|---|
| Ambiente | 1º Registro de Imóveis de Joinville: 45 estações Windows no domínio 1RIJOINVILLE |
| PCs com o agente | A preencher (por enquanto, o Dell-C4J46Q3, instalado com token de instalação desde a v1.7.0) |
| Atualização automática | O Dell-C4J46Q3 atualizou sozinho para a 1.9.0 em 13/11/2026 |
| Auditoria do Windows | Criar, alterar (Bloco de Notas), renomear e apagar (Lixeira e Shift+Delete) aparecem como "Auditado", com o usuário do domínio |
| Impacto percebido pelos usuários | A preencher |

Antes de ligar a auditoria em outros PCs do cartório, os colaboradores precisam ser informados, conforme a seção 6.2 da RFC (LGPD).

## 6. Detecção de inativos e de eventos

| Teste | Como | Esperado | Resultado |
|---|---|---|---|
| PC desligado | Desligar um PC monitorado e acompanhar o dashboard | OFFLINE e alerta "Endpoint offline" em até 3 minutos (3 ciclos de 60 s) | A preencher |
| Evento de arquivo | Criar, alterar e apagar um arquivo numa pasta monitorada, cronometrando até aparecer em "Atividade recente" | Até 10 segundos | A preencher |

## 7. Instalador, auditoria e remoção

O workflow **Agent Windows Installer** testa o instalador num Windows de verdade a cada PR que mexe no agente:

- instalação silenciosa e serviço ativo;
- permissões da pasta de configuração;
- auditoria ligada (política, regra na pasta e evento 4663 no log);
- reinício depois de cair;
- atualização;
- desinstalação, que desfaz a auditoria.

## 8. Segurança e retenção

- **Testes automatizados:** login, sessão, revogação de credenciais e tokens, limite de tentativas e retenção, no backend (309 testes, cerca de 92% de cobertura de linhas).
- **Retenção em produção:** depois do deploy da v1.10.0, o log da API registrou `Data retention enabled` (`retentionDays: 60`) e a primeira limpeza, em 13/11/2026 às 20:38 UTC. A data de corte foi 14/09/2026, com 0 registros removidos, porque a produção tem dados desde 06/11/2026. A limpeza se repete a cada 24 horas.
