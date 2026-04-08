# Documento do Projeto — InfraObserver

## 1. Nome do Projeto
**InfraObserver**

---

## 2. Descrição Resumida
O InfraObserver é um sistema de monitoramento de infraestrutura de endpoints, desenvolvido para coletar, centralizar e visualizar informações sobre o desempenho e o estado de computadores em rede. A proposta do projeto é permitir que administradores de rede e técnicos de suporte acompanhem métricas como uso de CPU, memória, disco, rede e status das máquinas em um painel centralizado, além de registrar eventos relevantes de atividades em diretórios monitorados.

---

## 3. Problema / Oportunidade
Em ambientes corporativos, educacionais e em pequenas empresas, é comum a ausência de ferramentas simples, centralizadas e acessíveis para monitoramento de computadores em rede. Muitas vezes, a identificação de máquinas com alto consumo de recursos, falhas de disponibilidade ou comportamento anômalo depende de verificações manuais, o que torna o processo lento, reativo e pouco eficiente.

Além disso, em muitos cenários não há visibilidade sobre atividades relevantes nos computadores monitorados, como alterações em arquivos dentro de diretórios específicos da rede, dificultando a auditoria básica e o acompanhamento operacional.

A oportunidade identificada é o desenvolvimento de uma solução própria de monitoramento de endpoints, com foco em centralização, clareza visual, escalabilidade inicial e aplicação prática em cenários reais de suporte e infraestrutura.

---

## 4. Objetivo Geral
Desenvolver uma aplicação para monitoramento centralizado de endpoints em rede, capaz de coletar métricas de desempenho e registrar eventos relevantes de atividades em diretórios monitorados, apresentando essas informações em um dashboard web para apoio à análise e gestão da infraestrutura.

---

## 5. Objetivos Específicos
- Desenvolver um agente instalável para coleta de métricas dos computadores monitorados;
- Implementar um serviço central para recebimento e armazenamento das métricas;
- Registrar informações como uso de CPU, memória, disco, rede e status das máquinas;
- Permitir o registro de eventos de arquivos em diretórios previamente monitorados;
- Criar um dashboard web para visualização centralizada das máquinas e suas métricas;
- Exibir histórico e estado atual dos recursos monitorados;
- Facilitar a identificação de máquinas sobrecarregadas, indisponíveis ou com comportamento relevante;
- Organizar a documentação técnica e estrutural do projeto para evolução futura.

---

## 6. Público-Alvo
- Técnicos de suporte;
- Administradores de rede;
- Pequenas empresas;
- Laboratórios de informática;
- Instituições de ensino;
- Ambientes com múltiplos computadores conectados em rede local.

---

## 7. Justificativa
O projeto é relevante por abordar um problema real e recorrente em ambientes de infraestrutura de TI: a dificuldade de monitorar endpoints de forma centralizada e acessível. Muitas soluções profissionais existentes são robustas, porém podem ser excessivamente complexas para cenários menores, ou pouco adequadas para projetos acadêmicos com foco em compreensão arquitetural e aplicação prática.

O InfraObserver permite aplicar conceitos de monitoramento de sistemas, arquitetura cliente-servidor, coleta de métricas, observabilidade, persistência de dados e visualização de informações em um contexto diretamente relacionado à área de suporte técnico e infraestrutura.

---

## 8. Escopo Inicial
Nesta primeira fase, o escopo inicial do projeto contempla:

- definição documental do problema e da proposta;
- estruturação do repositório;
- organização da documentação inicial;
- definição da arquitetura conceitual;
- planejamento dos principais módulos da solução.

Em etapas posteriores, o projeto deverá evoluir para incluir:

- agente de monitoramento;
- API central;
- banco de dados;
- dashboard web;
- registro de eventos de arquivos;
- documentação técnica e evidência de deploy.

---

## 9. Tecnologias Pretendidas
As tecnologias previstas para o desenvolvimento do projeto são:

- **Backend:** Python
- **Framework de API:** FastAPI
- **Frontend:** Vue.js com TypeScript
- **Banco de Dados:** PostgreSQL / TimescaleDB
- **Cache (opcional):** Redis
- **Containerização:** Docker
- **CI/CD:** GitHub Actions
- **Documentação:** Markdown + GitHub Wiki
- **Versionamento:** Git + GitHub

---

## 10. Entregáveis Esperados
Ao final do projeto, espera-se entregar:

- Repositório GitHub organizado;
- Documentação técnica do projeto;
- Agente de monitoramento funcional;
- Serviço central de recebimento de métricas;
- Banco de dados estruturado;
- Dashboard web para visualização;
- Registro de eventos de arquivos em diretórios monitorados;
- Evidência de execução e/ou deploy da solução.

---

## 11. Viabilidade
O projeto é viável dentro do contexto da disciplina, pois pode ser desenvolvido de forma incremental, iniciando pela definição e planejamento da solução e evoluindo para uma implementação modular. A proposta permite priorizar um núcleo funcional mínimo e expandir gradualmente para recursos adicionais, mantendo coerência entre escopo, complexidade e prazo.

---

## 12. Considerações Finais
O InfraObserver é uma proposta coerente com a área de infraestrutura, suporte técnico e desenvolvimento de software, apresentando um problema real, objetivos claros e potencial de evolução técnica. A solução pretende unir aplicabilidade prática, organização arquitetural e valor acadêmico, tornando-se adequada tanto para a disciplina quanto para composição de portfólio profissional.