# RFC-001 — InfraObserver

| Campo             | Valor                                                              |
|-------------------|--------------------------------------------------------------------|
| **RFC**           | RFC-001                                                            |
| **Status**        | Rascunho                                                           |
| **Versão**        | 0.1.0                                                              |
| **Data**          | Abril / 2026                                                       |
| **Autor**         | Bryann Lucas Locatelli                                             |
| **Curso**         | Engenharia de Software                                             |
| **Disciplina**    | PAC VII                                                            |
| **Categoria**     | Web App / Ferramenta de Apoio à Infraestrutura e Monitoramento     |
| **Repositório**   | https://github.com/LocatelliBryann/InfraObserver                   |

---

## Sumário

1. [Problema Identificado](#1-problema-identificado)
2. [Oportunidade](#2-oportunidade)
3. [Proposta de Solução](#3-proposta-de-solução)
4. [Justificativa](#4-justificativa)
5. [Alternativas Consideradas](#5-alternativas-consideradas)
6. [Resultados Esperados](#6-resultados-esperados)
7. [Questões em Aberto](#7-questões-em-aberto)

---

## 1. Problema Identificado

Em ambientes com múltiplos computadores conectados em rede — especialmente em pequenas empresas, laboratórios e instituições de ensino — é comum a ausência de uma ferramenta centralizada, simples e acessível para monitoramento dos endpoints.

A identificação de máquinas com alto consumo de CPU, memória, problemas de disco, indisponibilidade ou comportamento anômalo costuma depender de verificações manuais ou de ferramentas complexas, tornando o processo **lento, reativo e pouco eficiente**.

Além disso, há pouca visibilidade sobre atividades relevantes nos endpoints, como alterações em arquivos de diretórios monitorados, dificultando a análise operacional e a auditoria básica.

---

## 2. Oportunidade

Existe a oportunidade de desenvolver uma solução própria de monitoramento de infraestrutura, voltada ao acompanhamento centralizado de endpoints, com foco em:

- **Simplicidade** — instalação e operação acessíveis, sem exigir infraestrutura complexa;
- **Centralização** — visão unificada de todos os endpoints em um único painel;
- **Custo zero** — executável em hardware modesto, sem licenças pagas;
- **Aplicação prática** — desenvolvida do zero, permitindo exercitar conceitos de arquitetura, redes e desenvolvimento web.

---

## 3. Proposta de Solução

Desenvolver o **InfraObserver**, um sistema composto por três partes:

```
[ Agente (endpoint) ]  ──HTTP/JSON──►  [ Servidor Central ]  ──API──►  [ Dashboard Web ]
```

### 3.1 Agente

Processo leve instalado em cada máquina monitorada. Responsável por:

- Coletar métricas do sistema (CPU, memória, disco, rede) em intervalos regulares;
- Detectar eventos em diretórios monitorados (criação, modificação e exclusão de arquivos);
- Enviar os dados ao servidor central via HTTP.

### 3.2 Servidor Central

Serviço backend que atua como ponto central de coleta. Responsável por:

- Receber e validar os dados enviados pelos agentes;
- Persistir métricas e eventos em banco de dados;
- Expor uma API REST para consulta pelo dashboard;
- Detectar endpoints inativos com base na ausência de sinal.

### 3.3 Dashboard Web

Interface web para o administrador. Responsável por:

- Listar todos os endpoints e seus status (online / offline / alerta);
- Exibir métricas em tempo quase-real;
- Apresentar histórico em gráficos de série temporal;
- Registrar e exibir eventos detectados nos diretórios monitorados.

---

## 4. Justificativa

A proposta é relevante por resolver um problema real e recorrente em ambientes de TI onde soluções como Prometheus, Zabbix ou Datadog são excessivamente complexas ou economicamente inviáveis.

O projeto também permite a aplicação prática de conceitos centrais do curso:

- Arquitetura cliente-servidor
- Redes de computadores
- Coleta e persistência de dados
- Observabilidade e monitoramento de sistemas
- Desenvolvimento web (frontend e backend)

---

## 5. Alternativas Consideradas

| Alternativa              | Motivo do descarte                                                                      |
|--------------------------|-----------------------------------------------------------------------------------------|
| **Prometheus + Grafana** | Configuração complexa, curva de aprendizado elevada, não permite aplicação própria de conceitos |
| **Zabbix**               | Peso excessivo para ambientes pequenos, difícil instalação                              |
| **SNMP puro**            | Conjunto limitado de métricas, não captura eventos de sistema de arquivos               |
| **Datadog / New Relic**  | Soluções pagas com foco em escala enterprise                                            |

**Escolha adotada:** agente leve com envio ativo (push) via HTTP, por ser simples de instalar, independente de configurações de rede complexas e adequado ao escopo do projeto.

---

## 6. Resultados Esperados

Ao final do projeto, espera-se entregar uma solução funcional capaz de:

- Monitorar endpoints em rede de forma centralizada;
- Coletar e exibir métricas de desempenho em um dashboard web;
- Identificar máquinas com sobrecarga ou indisponibilidade;
- Registrar eventos relevantes em diretórios monitorados;
- Demonstrar organização arquitetural e documentação compatível com a proposta acadêmica.

---

## 7. Questões em Aberto

- Definição do intervalo de coleta padrão (candidato: 60 segundos);
- Estratégia de autenticação entre agente e servidor;
- Suporte a sistemas operacionais (Windows obrigatório; Linux desejável);
- Política de retenção de dados históricos;
- Forma de notificação quando um threshold é atingido (e-mail, webhook ou apenas no dashboard).

---

*Este documento cobre a etapa inicial de definição do projeto (Bloco 1), conforme exigido na NP1 da disciplina PAC VII.*
