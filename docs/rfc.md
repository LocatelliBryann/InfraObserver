

REQUEST FOR COMMENTS
RFC — Proposta de Projeto de Portfólio
Engenharia de Software — Católica SC

InfraObserver
Sistema de Monitoramento Centralizado de Endpoints em Rede




# 1. Visão do Produto e Impacto

## 1.1 Contexto e Problema
Ambientes com múltiplos computadores conectados em rede — laboratórios de ensino, pequenas empresas de TI e instituições acadêmicas — enfrentam um desafio recorrente: a ausência de uma ferramenta centralizada, acessível e sem custo de licença para monitoramento contínuo dos seus endpoints.
Esse problema afeta diretamente dois grupos distintos:
O administrador de rede ou de TI, que precisa identificar manualmente máquinas com alto consumo de CPU, memória insuficiente, espaço em disco crítico, comportamento anômalo ou simplesmente indisponíveis. Sem uma ferramenta centralizada, esse processo depende de acesso físico ou remoto individual a cada máquina, tornando-o lento, reativo e propenso a falhas não detectadas a tempo.
O gestor ou responsável técnico da instituição, que não possui visibilidade operacional do parque de máquinas sob sua responsabilidade, dificultando decisões relacionadas à manutenção preventiva, substituição de hardware ou investigação de incidentes.
A solução atual mais comum nesse contexto é a verificação manual direta — acessar cada máquina individualmente para verificar métricas — ou o uso de ferramentas corporativas como Prometheus, Zabbix ou Datadog, que exigem infraestrutura dedicada, conhecimento técnico elevado e, em alguns casos, custos de licença incompatíveis com o orçamento de pequenas organizações ou ambientes acadêmicos.
Além disso, há pouca visibilidade sobre eventos relevantes nos sistemas de arquivos dos endpoints, como criação, modificação ou exclusão de arquivos em diretórios sensíveis — informação útil para auditoria básica e controle operacional.

## 1.2 Origem da Demanda e Evidências
Contexto Acadêmico e Prático
A demanda surgiu da observação direta do funcionamento de laboratórios de informática em instituições de ensino, onde a administração dos endpoints é realizada de forma reativa — problemas são identificados apenas quando afetam a experiência do usuário final, como lentidão perceptível, travamentos ou indisponibilidade completa da máquina.

Pesquisa com Usuários
Foram realizadas conversas informais com administradores de laboratório e analistas de suporte de TI de pequenas organizações, identificando as seguintes dores principais:
100% relataram depender de verificação manual para identificar máquinas com problemas de desempenho
85% afirmaram que problemas de disco cheio ou CPU sobrecarregada só eram descobertos após reclamação de usuário
90% demonstraram interesse em uma ferramenta leve, sem instalação complexa, que centralizasse a visão dos endpoints
70% relataram que a curva de aprendizado e a complexidade de ferramentas como Zabbix ou Prometheus é o principal motivo pelo qual não as adotam

## 1.3 Análise de Soluções Existentes (Benchmark)
Foram analisadas as principais soluções existentes no mercado:


Diferencial do Projeto InfraObserver
Nenhuma das soluções analisadas atende ao conjunto de necessidades específicas de ambientes pequenos sem custo e sem complexidade de configuração. O InfraObserver se diferencia em três pontos centrais:
Arquitetura push simples e autodescritiva — o agente envia ativamente os dados ao servidor via HTTP/JSON, sem necessidade de configuração de rede complexa (abertura de portas, firewall rules, pull scraping).
Custo zero e hardware modesto — desenvolvido do zero, sem dependência de serviços pagos, executável em servidores simples ou até em uma máquina local.
Monitoramento de eventos em sistema de arquivos — além de métricas de desempenho, detecta e registra criação, modificação e exclusão de arquivos em diretórios monitorados, funcionalidade ausente na maioria das soluções listadas.

## 1.4 Público-Alvo


## 1.5 Objetivos do Projeto
Objetivo Geral
Desenvolver o InfraObserver, um sistema de monitoramento de endpoints em rede composto por um agente leve, um servidor central e um dashboard web, capaz de coletar e centralizar métricas de desempenho e eventos de sistema de arquivos de múltiplos computadores em um único painel acessível.

Objetivos Específicos
Implementar um agente leve e multiplataforma (Windows e Linux) que coleta métricas de CPU, memória, disco e rede em intervalos configuráveis e envia os dados ao servidor central via HTTP/JSON.
Desenvolver o servidor central com API REST que recebe, valida e persiste os dados enviados pelos agentes, detecta endpoints inativos e expõe os dados ao dashboard.
Criar um dashboard web que exibe em tempo quase-real o status de todos os endpoints, suas métricas, gráficos históricos de série temporal e registros de eventos de sistema de arquivos.
Implementar detecção de eventos em diretórios monitorados (criação, modificação e exclusão de arquivos) e registro no servidor central.
Demonstrar a aplicação prática de conceitos de arquitetura cliente-servidor, redes, persistência de dados e desenvolvimento web full-stack dentro do escopo da disciplina PAC VII.

## 1.6 Métricas de Sucesso (KPIs)



# 2. Engenharia de Requisitos

## 2.1 Personas

Persona 1 — Administrador de Laboratório
Carlos, 42 anos, técnico de TI responsável por um laboratório de 30 computadores em uma faculdade particular. Gerencia os endpoints de forma reativa: só descobre problemas quando alunos ou professores reclamam de lentidão ou indisponibilidade. Não tem familiaridade com Prometheus ou Zabbix — já tentou instalar o Zabbix uma vez e desistiu por conta da complexidade. Quer uma solução que seja instalada uma vez em cada máquina e que concentre tudo em um painel simples. Acessa o computador da secretaria da TI para verificar o parque durante o expediente.

Persona 2 — Analista de Suporte em Pequena Empresa
Marina, 29 anos, analista de suporte em uma empresa de contabilidade com 15 computadores. Presta suporte remoto e presencial. Tem conhecimento técnico intermediário e já usa ferramentas de acesso remoto. Sente falta de visibilidade sobre o estado das máquinas antes de receber chamado: quer saber quais computadores estão sobrecarregados ou com disco cheio antes que o usuário reclame. Prefere soluções sem dependência de serviços em nuvem pagos, pois o orçamento de TI é restrito.

## 2.2 Requisitos Funcionais (RF)


## 2.3 Requisitos Não Funcionais (RNF)


## 2.4 Casos de Uso Principais




## 2.5 Regras de Negócio


## 2.6 Fora do Escopo
O sistema não contempla, nesta versão, as seguintes funcionalidades:
Envio de notificações externas ao dashboard (e-mail, SMS, webhook) — alertas são exibidos apenas na interface web.
Controle de acesso por usuário — o dashboard não possui sistema de login ou perfis de acesso na versão inicial.
Monitoramento de processos individuais em execução nos endpoints.
Gerenciamento remoto dos endpoints a partir do dashboard (reinicialização, execução de comandos).
Suporte a macOS como sistema operacional do agente.
Integração com provedores de nuvem ou sistemas SNMP existentes.


# 3. Fluxos e Comportamento do Sistema

## 3.1 Fluxo de Coleta e Envio de Métricas
Descrição
O agente é inicializado no endpoint, lê o arquivo de configuração local (intervalo de coleta, endereço do servidor, token de autenticação e diretórios monitorados), registra o endpoint no servidor e inicia o ciclo contínuo de coleta e envio de dados.
Passo a passo
Agente é iniciado no endpoint (manualmente ou como serviço do sistema operacional)
Agente lê o arquivo de configuração local (config.json / config.ini)
Agente envia requisição de registro ao servidor central com hostname, IP e metadados do sistema
Servidor valida o token de autenticação e registra ou atualiza o endpoint no banco de dados
Agente inicia o loop de coleta: aguarda o intervalo configurado (padrão: 60 segundos)
Agente coleta métricas: percentual de CPU, memória usada/total, espaço em disco usado/total por partição, bytes enviados/recebidos por interface de rede
Agente serializa as métricas em JSON e envia ao servidor via HTTP POST
Servidor recebe, valida e persiste os dados. Retorna 200 OK ou código de erro
Agente registra o resultado e aguarda o próximo ciclo



## 3.2 Fluxo de Detecção de Eventos em Sistema de Arquivos
Descrição
Em paralelo ao ciclo de coleta de métricas, o agente mantém um processo de observação contínua dos diretórios configurados. Ao detectar qualquer alteração (criação, modificação ou exclusão de arquivo), o agente imediatamente envia o evento ao servidor, independente do ciclo de coleta.
Passo a passo
Agente inicializa o módulo de observação de diretórios com a lista de caminhos configurados
Sistema operacional notifica o agente sobre alteração no sistema de arquivos (via watchdog / inotify / ReadDirectoryChangesW)
Agente captura o tipo de evento (criação / modificação / exclusão), caminho do arquivo e timestamp
Agente envia o evento ao servidor central via HTTP POST com autenticação
Servidor valida e persiste o evento, associando-o ao endpoint de origem
Evento fica disponível para consulta no dashboard via API REST


## 3.3 Fluxo de Detecção de Endpoint Inativo
Descrição
O servidor central mantém o registro do timestamp da última coleta recebida de cada endpoint. Um job periódico verifica se algum endpoint não enviou dados dentro do tempo esperado, alterando seu status para offline no banco de dados.
Passo a passo
Job periódico no servidor executa a cada intervalo de verificação (ex.: a cada 2 minutos)
Para cada endpoint registrado, verifica o timestamp da última coleta recebida
Se o tempo decorrido desde a última coleta for superior a 3x o intervalo de coleta configurado, o endpoint é marcado como offline
Dashboard consulta o status atualizado via API e exibe o indicador visual correspondente (offline / alerta)
Quando o agente voltar a enviar dados, o servidor atualiza automaticamente o status para online




## 3.4 Fluxo de Visualização no Dashboard
Descrição
O administrador acessa o dashboard web pelo navegador. A interface consulta periodicamente a API REST do servidor central e atualiza a exibição com os dados mais recentes dos endpoints.
Passo a passo
Administrador acessa o dashboard via navegador (ex.: http://servidor:3000)
Dashboard realiza requisição GET à API REST para obter a lista de endpoints e seus status
Administrador visualiza o painel com cards de cada endpoint indicando: nome, status, última atualização e métricas resumidas
Ao selecionar um endpoint, o dashboard realiza nova requisição para obter as métricas detalhadas e o histórico
Dashboard renderiza gráficos de série temporal (CPU, memória, disco) com os dados históricos retornados
Administrador pode navegar para a aba de Eventos para visualizar os registros de sistema de arquivos do endpoint selecionado
Dashboard atualiza automaticamente os dados a cada 30 segundos sem necessidade de recarregar a página

## 4.1 Fluxo de Navegação
O fluxo principal de navegação do administrador no dashboard segue a estrutura:


## 4.2 Wireframes e Mockups das Telas
Tela 1 — Dashboard Geral (Lista de Endpoints)


Tela 2 — Detalhe do Endpoint (Métricas e Gráficos)



Tela 3 — Registro de Eventos de Sistema de Arquivos


Tela 4 — Página de Alertas









Tela 5 — Lista de Endpoints (Gerenciamento)


Tela 6 — Configurações do Sistema







Tela 7 — Agente: Tela de Status (instalado no endpoint)

# 5. Arquitetura do Sistema

## 5.1 Diagrama C4

Nível 1 — Diagrama de Contexto
O InfraObserver é composto por três elementos principais no contexto do sistema: os endpoints monitorados (com o agente instalado), o servidor central (backend da aplicação) e o administrador que acessa o dashboard. Os endpoints se comunicam com o servidor via HTTP. O administrador acessa o dashboard via navegador web.




Nível 2 — Diagrama de Containers
O sistema é dividido em três containers principais: o Agente (processo Python instalado nos endpoints), o Servidor Central (API REST + banco de dados) e o Dashboard Web (interface frontend). A comunicação entre Agente e Servidor é feita via HTTP/JSON. O Dashboard consome a API REST do Servidor.









Nível 3 — Diagrama de Componentes (Servidor Central)
O Servidor Central é organizado em camadas, seguindo a separação de responsabilidades. As requisições dos agentes e do dashboard passam pelo Router, são processadas pelos Controllers, que delegam à camada de Services para a lógica de negócio, e à camada de Repositories para persistência.


## 5.2 Modelo de Dados
O banco de dados é composto por quatro entidades principais. O diagrama Entidade-Relacionamento conceitual é apresentado abaixo:









## 5.3 Principais Componentes


## 5.4 Stack Tecnológica


InfraObserver — RFC v1.0  |  Engenharia de Software  |  Católica SC  |  2026