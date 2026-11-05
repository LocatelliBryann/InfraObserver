# InfraObserver

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=LocatelliBryann_InfraObserver&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=LocatelliBryann_InfraObserver)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=LocatelliBryann_InfraObserver&metric=coverage)](https://sonarcloud.io/summary/new_code?id=LocatelliBryann_InfraObserver)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=LocatelliBryann_InfraObserver&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=LocatelliBryann_InfraObserver)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=LocatelliBryann_InfraObserver&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=LocatelliBryann_InfraObserver)

## Descrição
InfraObserver é um projeto de sistema de monitoramento de infraestrutura de endpoints, desenvolvido com o objetivo de centralizar a coleta e visualização de métricas de desempenho de computadores em rede, além de registrar eventos relevantes de atividades em diretórios monitorados.

## Objetivo
O projeto busca resolver a dificuldade de monitorar computadores em rede de forma centralizada, permitindo identificar máquinas com sobrecarga de recursos, indisponibilidade e atividades relevantes no sistema de arquivos, principalmente para quesitos de auditorias.

## Proposta
A solução será composta por:
- um agente instalado nos computadores monitorados;
- um servidor central para recebimento e armazenamento das informações;
- um dashboard web para visualização dos dados.

## Status do Projeto
Projeto em fase inicial de definição e planejamento documental, conforme a primeira etapa da disciplina de Portfólio/TCC.

## Documentação
A documentação inicial do projeto está organizada na pasta `docs/`:

- `docs/projeto.md` → Documento do projeto
- `docs/rfc.md` → RFC com Identificação + Bloco 1
- `docs/roteiro-video.md` → Roteiro do vídeo de apresentação
- `docs/checklist-entrega.md` → Checklist da primeira entrega
- `docs/evidencias-colaboracao/` → Prints de colaboração em projetos de colegas

## Qualidade de Código
A análise estática e a cobertura de testes dos três módulos (backend, frontend e agente) são feitas pelo [SonarQube Cloud](https://sonarcloud.io/project/overview?id=LocatelliBryann_InfraObserver) a cada push e pull request, através do workflow de CI.

## Repositório
https://github.com/LocatelliBryann/InfraObserver