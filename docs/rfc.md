# RFC — InfraObserver

## Identificação

- **Nome do aluno:** Bryann Locatelli
- **Curso:** Engenharia de Software
- **Disciplina:** PAC VII
- **Projeto:** InfraObserver
- **Categoria do Projeto:** Web App / Ferramenta de Apoio à Infraestrutura e Monitoramento
- **Repositório GitHub:** https://github.com/LocatelliBryann/InfraObserver

---

## Bloco 1 — Problema / Oportunidade / Proposta Inicial

### 1. Problema identificado
Em ambientes com múltiplos computadores conectados em rede, especialmente em pequenas empresas, laboratórios e instituições de ensino, é comum a ausência de uma ferramenta centralizada, simples e acessível para monitoramento dos endpoints.

A identificação de máquinas com alto consumo de CPU, memória, problemas de disco, indisponibilidade ou comportamento anômalo costuma depender de verificações manuais ou de ferramentas complexas, tornando o processo lento, reativo e pouco eficiente.

Além disso, em muitos cenários há pouca visibilidade sobre atividades relevantes nos endpoints, como alterações em arquivos em diretórios monitorados, dificultando a análise operacional e a auditoria básica.

---

### 2. Oportunidade identificada
Existe a oportunidade de desenvolver uma solução própria de monitoramento de infraestrutura, voltada ao acompanhamento centralizado de endpoints, com foco em simplicidade, organização e aplicação prática.

Essa proposta permite criar uma ferramenta útil para cenários reais de suporte técnico e administração de rede, além de possibilitar a aplicação de conhecimentos de desenvolvimento de software, arquitetura cliente-servidor, coleta de métricas e visualização de dados.

---

### 3. Proposta inicial de solução
Desenvolver o **InfraObserver**, um sistema composto por:

- um agente instalado nos computadores monitorados;
- um serviço central para recebimento e armazenamento das métricas;
- um dashboard web para visualização das informações.

O sistema deverá permitir a coleta e centralização de dados como:

- uso de CPU;
- uso de memória;
- uso de disco;
- uso de rede;
- status da máquina;
- eventos relevantes em diretórios monitorados.

Essas informações serão apresentadas em uma interface centralizada para facilitar a análise e a gestão da infraestrutura.

---

### 4. Justificativa
A proposta é relevante por resolver um problema real e recorrente em ambientes de TI, principalmente onde não há uma solução personalizada e acessível para monitoramento de endpoints.

O projeto também se destaca por sua aderência à área técnica do aluno e por permitir a aplicação prática de conceitos como:

- monitoramento de sistemas;
- redes de computadores;
- arquitetura cliente-servidor;
- coleta e persistência de dados;
- observabilidade;
- desenvolvimento web.

---

### 5. Resultado esperado
Ao final do projeto, espera-se entregar uma solução funcional capaz de:

- monitorar endpoints em rede de forma centralizada;
- coletar métricas de desempenho dos computadores;
- exibir informações em um dashboard web;
- permitir a identificação de máquinas com sobrecarga ou indisponibilidade;
- registrar eventos relevantes de atividades em diretórios monitorados;
- demonstrar organização arquitetural e documentação compatível com a proposta acadêmica.

---

## Observação
Este documento contempla a etapa inicial de definição do projeto, com foco em identificação, clareza do problema, oportunidade e proposta inicial, conforme solicitado na primeira atividade.