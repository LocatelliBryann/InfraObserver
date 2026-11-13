# Teste de usabilidade (SUS)

RFC v1.1, seção 7.1: pontuação SUS média de pelo menos 68, com profissionais de TI que nunca usaram o InfraObserver.

O SUS (System Usability Scale, Brooke, 1996) é um questionário de 10 afirmações respondidas de 1 (discordo totalmente) a 5 (concordo totalmente). A nota vai de 0 a 100; 68 é a média de mercado.

## Como aplicar

1. **Participantes:** de 3 a 5 pessoas de TI (ou que cuidam de computadores no trabalho) que não conhecem o sistema.
2. **Ambiente:** o dashboard de produção, logado com uma conta de administrador. Use um navegador de computador.
3. **Antes de começar**, leia para o participante: "Vou pedir algumas tarefas no sistema. Estou avaliando o sistema, não você. Pense em voz alta enquanto faz. Se travar, me avise e passamos para a próxima."
4. Entregue as tarefas abaixo, uma por vez, sem ajudar. Anote em `respostas.csv` se a pessoa concluiu e quanto tempo levou.
5. No fim, peça para responder o questionário logo em seguida, sem pensar muito em cada item.
6. Rode `python validation/sus/sus.py validation/sus/respostas.csv` para calcular as notas.

## Tarefas

| # | Tarefa | Concluída quando |
|---|---|---|
| 1 | Descubra quantos computadores estão online agora. | Fala o número do indicador "Endpoints online". |
| 2 | Encontre um computador com alerta e diga qual é o problema. | Aponta o alerta e o tipo (CPU, memória, disco ou offline). |
| 3 | Veja como o uso de CPU de um computador variou nas últimas 24 horas. | Seleciona o computador e o período de 24 horas no gráfico. |
| 4 | Descubra quem apagou um arquivo hoje e com qual programa. | Filtra os eventos por "Excluído" e lê o usuário e o programa. |
| 5 | Mostre só os computadores de um cliente. | Usa o filtro de cliente no dashboard. |
| 6 | Gere um token de instalação para um cliente e copie o comando de instalação. | Clica em "Gerar token" e copia o comando. |

## Questionário

Para cada frase, marque de 1 (discordo totalmente) a 5 (concordo totalmente).

1. Eu usaria este sistema com frequência.
2. Achei o sistema mais complicado do que precisava ser.
3. Achei o sistema fácil de usar.
4. Acho que eu precisaria de ajuda de alguém técnico para usar este sistema.
5. As funções do sistema estão bem integradas.
6. Achei o sistema inconsistente em muitos pontos.
7. Imagino que a maioria das pessoas aprenderia a usar este sistema rapidamente.
8. Achei o sistema muito trabalhoso de usar.
9. Eu me senti confiante usando o sistema.
10. Precisei aprender muitas coisas antes de conseguir usar o sistema.

## Cálculo

- Itens ímpares (1, 3, 5, 7, 9): resposta − 1.
- Itens pares (2, 4, 6, 8, 10): 5 − resposta.
- Soma dos 10 valores × 2,5 = nota de 0 a 100.

O script `sus.py` faz a conta para cada participante, a média, as tarefas concluídas e o tempo médio de cada tarefa.

## Cuidados (LGPD)

Não anote nomes em `respostas.csv`: use P1, P2, P3... Peça a concordância verbal do participante antes de começar e não grave a tela sem autorização.
