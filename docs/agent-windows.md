# Agente no Windows

O agente é distribuído como um instalador (`InfraObserverAgentSetup-<versão>.exe`) que coloca o agente para rodar como **serviço do Windows**: inicia junto com o computador, mesmo sem ninguém logado, e o Windows o reinicia sozinho se ele cair.

## Requisitos

- Windows 10, Windows 11 ou Windows Server 2016 ou mais novo, 64 bits
- Permissão de administrador para instalar
- Acesso de rede ao servidor InfraObserver (HTTPS de saída; o computador não precisa abrir nenhuma porta)
- Um token de agente aceito pelo servidor (variável `AGENT_TOKENS` do backend)

## Instalação

1. Baixe o instalador na [última release](https://github.com/LocatelliBryann/InfraObserver/releases/latest).
2. Rode o arquivo. O Windows pode mostrar "O Windows protegeu o computador", porque o instalador não tem assinatura digital paga (veja [Assinatura](#assinatura)). Clique em **Mais informações** e depois em **Executar assim mesmo**.
3. Informe o endereço do servidor (ex.: `https://infraobserver.com.br`) e o token do agente.
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
| `/TOKEN=` | Na primeira instalação | Token do agente |
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

A pasta `C:\ProgramData\InfraObserver` só pode ser lida por administradores e pelo sistema, porque o `agent.env` guarda o token.

O `agent.env` aceita todas as variáveis do agente (ver o [README](../README.md#4-agente)), por exemplo `INFRAOBSERVER_MONITORED_DIRECTORIES` e `INFRAOBSERVER_IGNORED_PATTERNS`. Depois de editar, reinicie o serviço.

O identificador é gerado na primeira execução e não muda em atualizações nem reinstalações, para o computador continuar sendo o mesmo endpoint no dashboard.

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

## Desinstalação

Em **Configurações > Aplicativos**, remova "InfraObserver Agent". O serviço é parado e removido e os logs são apagados. O instalador pergunta se deve apagar também a configuração e o identificador; se ficarem, uma reinstalação volta como o mesmo endpoint.

Sem janelas: `"C:\Program Files\InfraObserver Agent\unins000.exe" /VERYSILENT` (mantém a configuração).

## Como o instalador é gerado

O workflow [`agent-windows.yml`](../.github/workflows/agent-windows.yml) roda numa máquina Windows do GitHub Actions:

1. roda os testes do agente no Windows;
2. gera o executável com o PyInstaller (versão gravada em `src/_build_info.py`);
3. baixa o WinSW e confere o SHA-256;
4. compila o instalador com o Inno Setup;
5. testa o instalador de verdade ([`smoke-test.ps1`](../agent/packaging/windows/smoke-test.ps1)): instalação silenciosa, serviço rodando, permissão da pasta, reinício depois de matar o processo, atualização mantendo a configuração e o identificador, e desinstalação.

Em PRs que mexem no agente e em execuções manuais (**Actions > Agent Windows Installer > Run workflow**), o instalador fica disponível como artefato da execução, com versão `0.0.0-dev.<número>`. Quando uma release é publicada, ele é gerado com a versão da tag e anexado à release junto com o `.sha256`.

Para gerar no próprio PC (Python 3.12 e [Inno Setup 6.3+](https://jrsoftware.org/isdl.php)):

```powershell
cd agent
powershell -ExecutionPolicy Bypass -File packaging\windows\build.ps1 -Version 1.5.0
```

O resultado fica em `agent\build\windows\output`.

## Assinatura

O instalador não tem assinatura de código (Authenticode), que exige um certificado pago. Por isso o SmartScreen mostra o aviso na primeira execução. A integridade pode ser conferida pelo SHA-256 publicado na release, e a atualização automática (próxima etapa) vai conferir esse valor antes de instalar.
