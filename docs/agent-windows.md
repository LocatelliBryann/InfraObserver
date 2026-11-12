# Agente no Windows

O agente é distribuído como um instalador (`InfraObserverAgentSetup-<versão>.exe`) que coloca o agente para rodar como **serviço do Windows**: inicia junto com o computador, mesmo sem ninguém logado, e o Windows o reinicia sozinho se ele cair.

## Requisitos

- Windows 10, Windows 11 ou Windows Server 2016 ou mais novo, 64 bits
- Permissão de administrador para instalar
- Acesso de rede ao servidor InfraObserver (HTTPS de saída; o computador não precisa abrir nenhuma porta)
- Um token de instalação do cliente, gerado no dashboard em **Clientes → Gerar token** (começa com `ioe_`)

## Instalação

1. Baixe o instalador na [última release](https://github.com/LocatelliBryann/InfraObserver/releases/latest).
2. Rode o arquivo. O Windows pode mostrar "O Windows protegeu o computador", porque o instalador não tem assinatura digital paga (veja [Assinatura](#assinatura)). Clique em **Mais informações** e depois em **Executar assim mesmo**.
3. Informe o endereço do servidor (ex.: `https://infraobserver.com.br`) e o token de instalação.
4. Conclua. Em até um minuto o computador aparece no dashboard.

Para conferir o arquivo baixado, compare o SHA-256 com o `.sha256` publicado na mesma release:

```powershell
Get-FileHash .\InfraObserverAgentSetup-1.5.0.exe -Algorithm SHA256
```

### Instalação silenciosa

Para instalar em vários computadores (script, GPO ou ferramenta de gestão), sem nenhuma janela:

```powershell
.\InfraObserverAgentSetup-1.5.0.exe /VERYSILENT /SUPPRESSMSGBOXES /SERVER=https://infraobserver.com.br /TOKEN=<token>
```

| Parâmetro | Obrigatório | Descrição |
|---|---|---|
| `/SERVER=` | Na primeira instalação | Endereço do servidor, com `http://` ou `https://` |
| `/TOKEN=` | Na primeira instalação | Token de instalação do cliente (`ioe_...`). O mesmo token serve para todos os PCs do cliente |
| `/DIRS=` | Não | Pastas monitoradas, separadas por vírgula (ex.: `/DIRS="D:\Compartilhado,\\servidor\financeiro"`) |
| `/LOG=` | Não | Grava o log do instalador no caminho informado |

Numa atualização silenciosa sem `/SERVER` e `/TOKEN`, a configuração atual é mantida.

## Onde fica cada coisa

| O quê | Onde |
|---|---|
| Programa e serviço | `C:\Program Files\InfraObserver Agent` |
| Configuração | `C:\ProgramData\InfraObserver\agent.env` |
| Identificador do computador | `C:\ProgramData\InfraObserver\agent-id` |
| Logs | `C:\ProgramData\InfraObserver\logs` (o agente escreve em `InfraObserverAgent.err.log`; até 5 arquivos de 10 MB) |
| Fila de envios | `C:\ProgramData\InfraObserver\outbox.db` (eventos e métricas esperando o servidor) |

A pasta `C:\ProgramData\InfraObserver` só pode ser lida por administradores e pelo sistema, porque o `agent.env` guarda o token.

## Token de instalação e credencial

Na primeira conexão, o agente envia o token de instalação para o servidor e recebe uma **credencial só deste computador** (começa com `ioa_`). Ele grava a credencial no `agent.env`, no lugar do token de instalação, e a usa daí em diante. No log aparece `Agent enrolled; credential saved to the configuration`.

- Revogar o token de instalação no dashboard impede novas instalações com ele, mas não derruba os PCs que já entraram.
- Para cortar só este computador, use **Revogar acesso** na saúde do endpoint. O agente passa a receber 401 e tenta de novo a cada coleta, sem enviar nada; o log mostra `401 Client Error`.
- Para voltar a ligar um PC revogado, reinstale com um token de instalação válido: ele recebe uma credencial nova.
- PCs instalados antes da versão 1.7.0 continuam com o token antigo da lista `AGENT_TOKENS`. Para passar um deles para um cliente, reinstale com o token de instalação do cliente.

O `agent.env` aceita todas as variáveis do agente (ver o [README](../README.md#4-agente)), por exemplo `INFRAOBSERVER_MONITORED_DIRECTORIES` e `INFRAOBSERVER_IGNORED_PATTERNS`. Depois de editar, reinicie o serviço.

O identificador é gerado na primeira execução e não muda em atualizações nem reinstalações, para o computador continuar sendo o mesmo endpoint no dashboard.

## Sem conexão com o servidor

Eventos de arquivo e métricas não são enviados direto: entram primeiro numa fila no disco (`outbox.db`) e só saem dela depois que o servidor confirma o recebimento. Se a rede cair, ou o servidor estiver fora do ar, o agente continua observando as pastas e guardando tudo. Quando a conexão volta, a fila é enviada na ordem em que as coisas aconteceram, com o horário original de cada evento, e o histórico de métricas não fica com buraco.

- O agente tenta de novo depois de 5 s, 10 s, 20 s... até no máximo 5 minutos entre as tentativas.
- A fila sobrevive a reinicializações: um evento feito sem rede, com o computador desligado em seguida, chega quando ele voltar a ter conexão.
- Para não lotar o disco, a fila guarda no máximo 50 mil itens ou 7 dias; acima disso, os mais antigos saem primeiro (com aviso no log).
- Mesmo iniciando sem rede, o agente já observa as pastas; o registro no servidor e o envio da fila acontecem quando a conexão aparecer.

No log aparecem "Server unreachable, keeping N items queued" quando a conexão cai e "Connection restored, sent N queued items" quando volta.

## O serviço

| Item | Valor |
|---|---|
| Nome | `InfraObserverAgent` ("InfraObserver Agent" em `services.msc`) |
| Conta | LocalSystem |
| Início | Automático (atrasado, para não pesar na inicialização do Windows) |
| Se cair | Reinicia depois de 10 s, 30 s e depois a cada 60 s |

Comandos úteis, no PowerShell como administrador:

```powershell
Get-Service InfraObserverAgent
Restart-Service InfraObserverAgent
Get-Content C:\ProgramData\InfraObserver\logs\InfraObserverAgent.err.log -Tail 50 -Wait
```

O serviço é executado pelo [WinSW](https://github.com/winsw/winsw) 2.12: o `InfraObserverAgent.exe` é o WinSW, que inicia o `agent\infraobserver-agent.exe`, guarda a saída nos logs e, ao parar, envia Ctrl+C para o agente encerrar os observadores de arquivos antes de sair.

### Pastas de rede

O serviço roda como LocalSystem, que não enxerga as unidades mapeadas dos usuários (`Z:` etc.). Para monitorar uma pasta de rede, use o caminho UNC (`\\servidor\pasta`); o acesso é feito pela conta do computador (`DOMINIO\COMPUTADOR$`), que precisa de permissão de leitura no compartilhamento. Para auditar um servidor de arquivos, o melhor é instalar o agente no próprio servidor e monitorar as pastas locais dele.

## Quem fez a ação (auditoria do Windows)

O watchdog avisa que um arquivo mudou, mas não diz quem mudou: sem auditoria, o evento leva o usuário com sessão aberta no computador. Para registrar quem fez de verdade (inclusive pela rede), o agente usa a auditoria do próprio Windows:

1. **Liga a política de auditoria** das subcategorias "Sistema de Arquivos" e "Compartilhamento de Arquivos Detalhado" (`auditpol`, pelo GUID, que não muda com o idioma do Windows). Só o "Êxito"; o que já estava ligado continua como estava.
2. **Coloca uma regra de auditoria (SACL)** em cada pasta monitorada, herdada pelos arquivos e subpastas: para qualquer usuário, registrar quem cria, altera ou apaga. Leitura não é auditada, para não encher o log.
3. **Lê o log de Segurança** a cada segundo, pela API do Windows (`wevtapi`, via pywin32), só os eventos novos:

| Evento | O que traz | Usado para |
|---|---|---|
| 4663 | Caminho, usuário, programa e tipo de acesso | Quem criou, alterou, renomeou ou apagou |
| 4660 | Confirmação de exclusão (pelo handle do 4663) | Confirmar exclusões |
| 5145 | Caminho e IP de quem acessou pelo compartilhamento | O IP de origem (`Origem 192.168.0.50` no dashboard) |

4. **Completa o evento de arquivo**: cada evento espera 3 segundos antes de ir para a fila, tempo para o Windows gravar a auditoria. Se encontrar a ação no mesmo arquivo (ou, em arquivos novos, na pasta pai), troca o usuário pelo auditado e acrescenta o programa e o IP. No dashboard o evento aparece com o selo **Auditado**; sem auditoria, com "Usuário da sessão".

Tudo isso roda em segundo plano: se a auditoria não puder ser ligada (sem permissão, log de Segurança desligado por política do domínio), os eventos continuam saindo como antes. O log do serviço mostra `Windows file auditing enabled on N folder(s)` ou o motivo da falha.

O que o agente mudou fica guardado em `C:\ProgramData\InfraObserver\audit-state.json`. A desinstalação roda `infraobserver-agent.exe --remove-audit`, que tira as regras das pastas e volta a política ao que era antes (só o que o agente ligou).

Para desligar num computador: `INFRAOBSERVER_WINDOWS_AUDIT=false` no `agent.env` e reiniciar o serviço. A política e as regras continuam até a desinstalação.

Volume: o Windows registra uma linha no log de Segurança para cada alteração nas pastas monitoradas. Em servidores de arquivos muito movimentados, vale aumentar o tamanho do log de Segurança (o padrão é 20 MB; ele sobrescreve os mais antigos quando enche).

## Atualização automática

O agente instalado se atualiza sozinho. Ao iniciar e depois a cada 6 horas, ele pergunta ao servidor qual versão deve estar instalada (`GET /api/v1/agent/update`):

1. O servidor consulta as [releases do GitHub](https://github.com/LocatelliBryann/InfraObserver/releases) e responde com a versão, o endereço do instalador e o SHA-256 dele. A resposta fica guardada por uma hora, para não consultar o GitHub a cada agente.
2. Se a versão for mais nova que a instalada, o agente baixa o instalador para `C:\ProgramData\InfraObserver\updates` e confere o SHA-256. Se não conferir, descarta o arquivo e não instala nada.
3. O agente roda o instalador em modo silencioso, fora do processo do serviço. O instalador para o serviço, troca os arquivos, mantém a configuração e o identificador e inicia a versão nova. O log da instalação fica em `updates\install.log`.

A versão de cada agente aparece no dashboard, no detalhe do endpoint.

No servidor (`.env` da VM):

| Variável | Para quê |
|---|---|
| `AGENT_UPDATE_VERSION=1.5.0` | Fixa a versão que os agentes devem instalar. Para voltar a uma versão anterior, coloque a anterior: o agente só instala versões mais novas que a dele, então a volta vale para quem ainda não atualizou e para instalações novas pelo instalador antigo |
| `AGENT_UPDATES_ENABLED=false` | Desliga a atualização automática para todos os agentes |

Num computador específico, `INFRAOBSERVER_UPDATE_INTERVAL_HOURS=0` no `agent.env` desliga a atualização só nele.

Só o agente instalado pelo `setup.exe` se atualiza; rodando pelo código-fonte, a atualização fica desligada.

## Desinstalação

Em **Configurações > Aplicativos**, remova "InfraObserver Agent". O serviço é parado e removido, a auditoria do Windows que o agente ligou é desfeita e os logs, os instaladores baixados e a fila de envios são apagados. O instalador pergunta se deve apagar também a configuração e o identificador; se ficarem, uma reinstalação volta como o mesmo endpoint.

Sem janelas: `"C:\Program Files\InfraObserver Agent\unins000.exe" /VERYSILENT` (mantém a configuração).

## Como o instalador é gerado

O workflow [`agent-windows.yml`](../.github/workflows/agent-windows.yml) roda numa máquina Windows do GitHub Actions:

1. roda os testes do agente no Windows;
2. gera o executável com o PyInstaller (versão gravada em `src/_build_info.py`);
3. baixa o WinSW e confere o SHA-256;
4. compila o instalador com o Inno Setup;
5. testa o instalador de verdade ([`smoke-test.ps1`](../agent/packaging/windows/smoke-test.ps1)): instalação silenciosa, serviço rodando, permissão da pasta, auditoria ligada (regra na pasta, política e evento 4663 no log ao apagar um arquivo), reinício depois de matar o processo, atualização mantendo a configuração e o identificador, e desinstalação desfazendo a auditoria.

Em PRs que mexem no agente e em execuções manuais (**Actions > Agent Windows Installer > Run workflow**), o instalador fica disponível como artefato da execução, com versão `0.0.0-dev.<número>`. Quando uma release é publicada, ele é gerado com a versão da tag e anexado à release junto com o `.sha256`.

Para gerar no próprio PC (Python 3.12 e [Inno Setup 6.3+](https://jrsoftware.org/isdl.php)):

```powershell
cd agent
powershell -ExecutionPolicy Bypass -File packaging\windows\build.ps1 -Version 1.5.0
```

O resultado fica em `agent\build\windows\output`.

## Assinatura

O instalador não tem assinatura de código (Authenticode), que exige um certificado pago. Por isso o SmartScreen mostra o aviso na primeira execução. A integridade pode ser conferida pelo SHA-256 publicado na release, e a atualização automática confere esse valor antes de instalar.
