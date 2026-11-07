<div align="center">

<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/logo-horizontal-branco.svg" />
    <img src="docs/brand/logo-horizontal.svg" alt="InfraObserver" width="360" />
  </picture>
</h1>

**Monitoramento centralizado de endpoints em rede.**
Métricas de desempenho, alertas e eventos de sistema de arquivos de vários computadores em um único painel.

**[🌐 Acessar a aplicação: infraobserver.com.br](https://infraobserver.com.br)**

[![CI](https://github.com/LocatelliBryann/InfraObserver/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/LocatelliBryann/InfraObserver/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=LocatelliBryann_InfraObserver&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=LocatelliBryann_InfraObserver)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=LocatelliBryann_InfraObserver&metric=coverage)](https://sonarcloud.io/summary/new_code?id=LocatelliBryann_InfraObserver)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=LocatelliBryann_InfraObserver&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=LocatelliBryann_InfraObserver)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=LocatelliBryann_InfraObserver&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=LocatelliBryann_InfraObserver)

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-5FA04E?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)

[Funcionalidades](#funcionalidades) ·
[Arquitetura](#arquitetura) ·
[Como executar](#como-executar) ·
[API](#api) ·
[Observabilidade](#observabilidade) ·
[Qualidade](#qualidade-e-testes) ·
[Documentação](#documentação)

</div>

![Dashboard do InfraObserver](docs/assets/dashboard.png)

## Sobre o projeto

Laboratórios de informática, instituições de ensino e pequenas empresas costumam descobrir problemas nos computadores só quando alguém reclama: a máquina lenta, o disco cheio, o computador que parou de responder. Ferramentas como Zabbix, Prometheus ou Datadog resolvem isso, mas exigem infraestrutura dedicada, conhecimento especializado ou licenças pagas.

O **InfraObserver** é uma alternativa leve e sem custo: um **agente** instalado em cada computador envia métricas e eventos para um **servidor central**, e um **dashboard web** mostra em tempo quase real o estado de todo o parque de máquinas.

> Projeto de Portfólio (TCC) do curso de Engenharia de Software da **Católica SC**.
> A proposta completa, com requisitos, casos de uso e decisões técnicas, está na [RFC](docs/RFC-InfraObserver.pdf).

## Funcionalidades

| Recurso | Descrição |
|---|---|
| 📊 **Métricas de desempenho** | CPU, memória, disco e rede de cada endpoint, coletadas em intervalo configurável |
| 📁 **Eventos de arquivos** | Criação, modificação, exclusão, renomeação e movimentação de arquivos e pastas, com caminho anterior, usuário e filtros por tipo e busca no dashboard. Temporários do Office e do Windows são ignorados |
| 🚨 **Alertas automáticos** | CPU ou memória acima de 80% e disco acima de 90%; o alerta é resolvido após duas coletas normais seguidas |
| 📴 **Detecção de indisponibilidade** | Endpoint sem dados por 3 ciclos de coleta vira **offline** e gera alerta; ao voltar, é reativado sozinho |
| 🟢 **Status por endpoint** | Online, Alerta ou Offline, com a quantidade de alertas ativos |
| 📈 **Histórico** | Gráficos em tempo real ou dos últimos 1 h, 6 h e 24 h; histórico de alertas resolvidos com duração |
| 🔑 **Login de administrador** | Dashboard e consultas da API protegidos por login, com sessão em cookie `httpOnly`, bloqueio após 5 tentativas erradas e proteção contra CSRF |
| 🔐 **Autenticação dos agentes** | Token Bearer por agente, validado em tempo constante |
| 🔁 **Agente resiliente** | Continua funcionando e tenta de novo se o servidor ficar fora do ar |

<details>
<summary><b>Mais telas</b></summary>

<br />

**Status dos endpoints e recursos do endpoint selecionado**

![Status dos endpoints](docs/assets/endpoint-status.png)

**Eventos de sistema de arquivos**

![Eventos de arquivos](docs/assets/file-events.png)

</details>

## Arquitetura

O sistema segue uma arquitetura **cliente-servidor com agentes em modelo push**: cada agente envia os dados ativamente ao servidor via HTTP/JSON, sem precisar abrir portas ou configurar firewall nos endpoints.

```mermaid
flowchart LR
    subgraph EP["Endpoints monitorados"]
        A1["Agente Python<br/>psutil · watchdog"]
        A2["Agente Python"]
    end

    subgraph SV["Servidor central"]
        API["API REST<br/>Node.js · Express · Zod"]
        JOB["Job de detecção<br/>de offline"]
        DB[("PostgreSQL<br/>Prisma ORM")]
    end

    UI["Dashboard web<br/>React · Vite · Tailwind"]
    ADM(("Administrador"))

    A1 -- "POST métricas e eventos<br/>Bearer token" --> API
    A2 -- "HTTP/JSON" --> API
    API --> DB
    JOB --> DB
    UI -- "GET a cada 30 s" --> API
    ADM --> UI
```

| Componente | Responsabilidade |
|---|---|
| **Agente** (`agent/`) | Coleta métricas com `psutil`, observa diretórios com `watchdog`, registra o endpoint e envia os dados ao servidor |
| **Backend** (`backend/`) | Valida e persiste os dados, avalia limites de alerta, detecta endpoints inativos e expõe a API REST. Organizado em camadas: *routes → controllers → services → repositories* |
| **Frontend** (`frontend/`) | Dashboard com indicadores, status por endpoint, gráficos de série temporal, alertas e eventos de arquivos |
| **Banco de dados** | PostgreSQL com quatro entidades: `Endpoint`, `Metric`, `FileEvent` e `Alert` |

Os diagramas C4 (contexto, containers e componentes) e o modelo de dados completos estão na seção 5 da [RFC](docs/RFC-InfraObserver.pdf).

### Stack

| Camada | Tecnologias |
|---|---|
| Agente | Python 3.12, psutil, watchdog, requests, pytest |
| Backend | Node.js 20, TypeScript, Express 5, Prisma 7, Zod, Vitest, Supertest |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, Recharts, Vitest, Testing Library |
| Banco de dados | PostgreSQL 16 |
| Qualidade e CI | GitHub Actions, SonarQube Cloud |
| Infraestrutura | Docker, Docker Compose, Caddy (HTTPS), Microsoft Azure |
| Observabilidade | Prometheus, Grafana, node-exporter, pino (logs em JSON) |

## Como executar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20+
- [Python](https://www.python.org/) 3.12+
- [Docker](https://www.docker.com/) (para o PostgreSQL) ou um PostgreSQL 16 local

### 1. Banco de dados

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # ajuste AGENT_TOKENS
npm install
npx prisma migrate deploy
npm run create-admin -- --email voce@exemplo.com --name "Seu Nome"   # pede a senha
npm run dev                   # http://localhost:3000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

Por padrão o dashboard consome a API em `http://localhost:3000`. Para outro endereço, defina `VITE_API_URL`.

### 4. Agente

**No Windows (recomendado):** baixe o `InfraObserverAgentSetup-<versão>.exe` na [última release](https://github.com/LocatelliBryann/InfraObserver/releases/latest), rode como administrador e informe o endereço do servidor e o token do agente. O agente vira um serviço do Windows que inicia com o computador e volta sozinho se cair. Instalação silenciosa, logs e desinstalação em [docs/agent-windows.md](docs/agent-windows.md).

**Pelo código-fonte** (desenvolvimento, Windows ou Linux):

```bash
cd agent
python -m venv .venv
.venv\Scripts\activate        # Windows  (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
cp .env.example .env          # configure servidor, token e diretórios
python -m src.main
```

<details>
<summary><b>Variáveis de ambiente</b></summary>

<br />

**Backend** (`backend/.env`)

| Variável | Descrição | Padrão |
|---|---|---|
| `DATABASE_URL` | Conexão com o PostgreSQL | — |
| `AGENT_TOKENS` | Tokens aceitos dos agentes, separados por vírgula | — |
| `AGENT_COLLECTION_INTERVAL_SECONDS` | Intervalo de coleta dos agentes | `60` |
| `OFFLINE_CHECK_INTERVAL_SECONDS` | Frequência da verificação de endpoints inativos | `60` |
| `PORT` | Porta da API | `3000` |
| `JWT_SECRET` | Segredo que assina a sessão do login (obrigatório em produção, mínimo 32 caracteres) | segredo de desenvolvimento |
| `SESSION_HOURS` | Duração da sessão do administrador, em horas | `8` |
| `CORS_ORIGINS` | Origens do dashboard liberadas para chamar a API com o cookie | `http://localhost:5173` |

**Agente** (`agent/.env`)

| Variável | Descrição | Padrão |
|---|---|---|
| `INFRAOBSERVER_SERVER_URL` | Endereço do servidor central | — |
| `INFRAOBSERVER_AGENT_TOKEN` | Token do agente (deve estar em `AGENT_TOKENS`) | — |
| `INFRAOBSERVER_AGENT_ID` | UUID único do endpoint. Sem ele, o agente gera um e salva em `agent-id` ao lado do `agent.env` (no instalador do Windows é sempre assim) | — |
| `INFRAOBSERVER_COLLECTION_INTERVAL` | Intervalo de coleta, em segundos | `60` |
| `INFRAOBSERVER_MONITORED_DIRECTORIES` | Diretórios monitorados, separados por vírgula. Pastas de rede pelo caminho UNC (`\\servidor\pasta`) | Área de Trabalho, Documentos, Downloads e Imagens de cada usuário |
| `INFRAOBSERVER_IGNORED_PATTERNS` | Padrões extras de arquivos a ignorar (ex.: `*.bak,*.log`) | — |

Para gerar um UUID: `python -c "import uuid; print(uuid.uuid4())"`

No agente instalado pelo `setup.exe`, essas variáveis ficam em `C:\ProgramData\InfraObserver\agent.env`.

</details>

## API

| Método | Rota | Descrição | Autenticação |
|---|---|---|---|
| `POST` | `/api/v1/endpoints/register` | Registra ou atualiza um endpoint | Token do agente |
| `POST` | `/api/v1/metrics` | Envia uma coleta de métricas | Token do agente |
| `POST` | `/api/v1/file-events` | Envia um evento de sistema de arquivos | Token do agente |
| `POST` | `/api/v1/auth/login` | Login do administrador (grava o cookie de sessão) | — |
| `POST` | `/api/v1/auth/logout` | Encerra a sessão | — |
| `GET` | `/api/v1/auth/me` | Usuário da sessão atual | Sessão |
| `GET` | `/api/v1/endpoints` | Lista os endpoints registrados | Sessão |
| `GET` | `/api/v1/endpoints/health` | Status (online, alerta, offline) e última coleta de cada endpoint | Sessão |
| `GET` | `/api/v1/metrics` | Histórico de métricas · `endpointId`, `from`, `to`, `limit` | Sessão |
| `GET` | `/api/v1/file-events` | Eventos de arquivos · `endpointId`, `eventType` (ex.: `DELETE,MOVE`), `search`, `from`, `to`, `limit` | Sessão |
| `GET` | `/api/v1/alerts` | Alertas · `status=active\|resolved\|all`, `endpointId`, `limit` | Sessão |
| `GET` | `/health` | Verificação de saúde da API | — |

## Observabilidade

A própria aplicação é monitorada em produção. O backend expõe métricas no formato do Prometheus (requisições, tempo de resposta, endpoints por status, alertas abertos e o processo Node.js), o node-exporter mede a VM, e o Grafana junta tudo num dashboard com regras de alerta para API fora do ar, erros 5xx, lentidão e falta de dados dos agentes. Os logs do backend saem em JSON, uma linha por requisição.

![Dashboard do Grafana](docs/assets/grafana-dashboard.png)

Detalhes, métricas e alertas em [docs/observability.md](docs/observability.md).

## Qualidade e testes

Todo push e pull request passa pelo pipeline de CI: testes dos três módulos com cobertura, build e análise estática no **SonarQube Cloud**, que comenta o resultado do Quality Gate em cada pull request.

| Módulo | Testes | Cobertura de linhas |
|---|---|---|
| Backend | 109 (unitários, de rota e de integração com PostgreSQL) | ~90% |
| Frontend | 61 (componentes, hooks e serviços) | ~85% |
| Agente | 59 | ~97% |

```bash
cd backend  && npm run test:coverage
cd frontend && npm run test:coverage
cd agent    && python -m pytest --cov=src
```

## Estrutura do repositório

```text
InfraObserver/
├── agent/                 # Agente Python (coletores, watchers, serviços HTTP)
├── backend/               # API REST (Express + Prisma)
│   ├── prisma/            # Schema e migrations
│   └── src/               # routes, controllers, services, repositories, jobs
├── frontend/              # Dashboard (React + Vite)
├── infrastructure/        # Docker Compose (dev e produção), Prometheus/Grafana, cloud-init da Azure e Terraform
├── docs/                  # RFC, documento do projeto e imagens
└── .github/workflows/     # Pipelines de CI e de CD
```

## Roadmap

- [x] Agente com coleta de métricas, eventos de arquivos e resiliência a falhas de rede
- [x] API com autenticação dos agentes, alertas e detecção de endpoints offline
- [x] Dashboard com status por endpoint, histórico por período e histórico de alertas
- [x] CI com testes, cobertura e análise estática (SonarQube Cloud)
- [x] Deploy em nuvem (Microsoft Azure) com entrega contínua e domínio próprio
- [x] Observabilidade da aplicação com Prometheus, Grafana e logs estruturados
- [ ] Configuração remota dos agentes pelo dashboard
- [x] Instalador do agente para Windows, rodando como serviço
- [ ] Atualização automática dos agentes
- [ ] Telas de gerenciamento de endpoints e configurações

## Documentação

- [Wiki](https://github.com/LocatelliBryann/InfraObserver/wiki): instalação do agente, regras de alerta, decisões técnicas e problemas comuns
- [RFC do projeto (PDF)](docs/RFC-InfraObserver.pdf): visão do produto, requisitos, casos de uso, fluxos, arquitetura C4 e modelo de dados
- [RFC em Markdown](docs/rfc.md)
- [Agente no Windows](docs/agent-windows.md): instalador, serviço, instalação silenciosa, logs e build do instalador
- [Guia de deploy em produção (Azure)](docs/deploy.md): arquitetura de produção, CD, rollback e operação
- [Observabilidade](docs/observability.md): métricas, logs, alertas e acesso ao Grafana
- [Segurança](docs/security.md): login do administrador, sessão, proteção contra força bruta, CSRF e XSS
- [Documento do projeto](docs/Project.md)
- [Identidade visual](docs/brand/README.md): logo, cores, tipografia e regras de uso
- [Como contribuir](CONTRIBUTING.md)

## Autor

**Bryann Locatelli** · Engenharia de Software · Católica SC

[![GitHub](https://img.shields.io/badge/GitHub-LocatelliBryann-181717?logo=github)](https://github.com/LocatelliBryann)
<!-- Adicione o seu LinkedIn: [![LinkedIn](https://img.shields.io/badge/LinkedIn-seu--perfil-0A66C2?logo=linkedin)](https://www.linkedin.com/in/seu-perfil) -->

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).
