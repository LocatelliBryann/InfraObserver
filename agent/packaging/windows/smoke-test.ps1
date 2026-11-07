<#
.SYNOPSIS
  Testa o instalador numa máquina Windows de verdade (usado no CI).

.DESCRIPTION
  Instala sem perguntas, confere o serviço, a configuração, os logs, a
  permissão da pasta e o reinício automático; depois atualiza, desinstala e
  confere o que fica e o que sai. Precisa rodar como administrador.

  O servidor apontado (127.0.0.1:9) não existe de propósito: o agente fica
  tentando se registrar, que é o que acontece com o servidor fora do ar.
#>
param(
    [Parameter(Mandatory = $true)][string]$Setup,
    [Parameter(Mandatory = $true)][string]$Version
)

$ErrorActionPreference = "Stop"

$ServiceName = "InfraObserverAgent"
$ProcessName = "infraobserver-agent"
$DataDir = Join-Path $env:ProgramData "InfraObserver"
$ConfigFile = Join-Path $DataDir "agent.env"
$IdFile = Join-Path $DataDir "agent-id"
$LogDir = Join-Path $DataDir "logs"
$Uninstaller = Join-Path $env:ProgramFiles "InfraObserver Agent\unins000.exe"
$SetupLog = Join-Path $env:RUNNER_TEMP "infraobserver-setup.log"

function Assert-True([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw "FALHOU: $Message" }
    Write-Host "ok - $Message"
}

function Wait-Until([scriptblock]$Condition, [int]$Seconds) {
    $deadline = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $deadline) {
        if (& $Condition) { return $true }
        Start-Sleep -Seconds 2
    }
    return [bool](& $Condition)
}

function Invoke-Setup([string[]]$Arguments) {
    $all = @("/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART", "/LOG=$SetupLog") + $Arguments
    return (Start-Process -FilePath $Setup -ArgumentList $all -Wait -PassThru).ExitCode
}

function Test-AgentRunning {
    (Get-Service $ServiceName -ErrorAction SilentlyContinue).Status -eq "Running" -and
        [bool](Get-Process $ProcessName -ErrorAction SilentlyContinue)
}

try {
    # 1. Instalação silenciosa sem servidor e token é recusada
    $code = Invoke-Setup @()
    Assert-True ($code -ne 0) "instalação silenciosa sem /SERVER e /TOKEN é recusada (código $code)"
    Assert-True (-not (Get-Service $ServiceName -ErrorAction SilentlyContinue)) "nenhum serviço criado"

    # 2. Instalação
    $code = Invoke-Setup @("/SERVER=http://127.0.0.1:9/", "/TOKEN=token-do-smoke-test")
    Assert-True ($code -eq 0) "instalação silenciosa termina sem erro"

    $service = Get-Service $ServiceName
    Assert-True ($service.StartType -eq "Automatic") "serviço com início automático"
    Assert-True (Wait-Until { Test-AgentRunning } 30) "serviço e agente rodando"

    $config = Get-Content $ConfigFile -Raw
    Assert-True ($config.Contains('INFRAOBSERVER_SERVER_URL="http://127.0.0.1:9"')) "endereço gravado sem a barra final"
    Assert-True ($config.Contains('INFRAOBSERVER_AGENT_TOKEN="token-do-smoke-test"')) "token gravado"

    $sids = (Get-Acl $DataDir).Access | ForEach-Object {
        $_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value
    }
    Assert-True (-not ($sids | Where-Object { $_ -in @("S-1-5-32-545", "S-1-5-11", "S-1-1-0") })) `
        "pasta da configuração sem acesso de usuários comuns"

    Assert-True (Wait-Until { Test-Path $IdFile } 30) "identificador do computador gerado"
    $agentId = (Get-Content $IdFile -Raw).Trim()

    Assert-True (Wait-Until {
        # O Python escreve o log no stderr: o WinSW grava em .err.log.
        Get-ChildItem $LogDir -Filter "*.log" -ErrorAction SilentlyContinue |
            Select-String -SimpleMatch "InfraObserver Agent $Version starting" -Quiet
    } 30) "log do serviço mostra a versão $Version"

    # 3. Reinício automático se o agente cair
    Stop-Process -Name $ProcessName -Force
    Start-Sleep -Seconds 3
    Assert-True (Wait-Until { Test-AgentRunning } 60) "agente volta sozinho depois de cair"

    # 4. Atualização silenciosa sem parâmetros mantém a configuração
    $code = Invoke-Setup @()
    Assert-True ($code -eq 0) "reinstalação silenciosa sem parâmetros"
    Assert-True ((Get-Content $ConfigFile -Raw).Contains("token-do-smoke-test")) "configuração mantida"
    Assert-True ((Get-Content $IdFile -Raw).Trim() -eq $agentId) "mesmo identificador depois de atualizar"
    Assert-True (Wait-Until { Test-AgentRunning } 30) "serviço rodando depois de atualizar"

    # 5. Desinstalação
    Start-Process -FilePath $Uninstaller -ArgumentList "/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART" -Wait
    Assert-True (Wait-Until { -not (Get-Service $ServiceName -ErrorAction SilentlyContinue) } 60) "serviço removido"
    Assert-True (-not (Get-Process $ProcessName -ErrorAction SilentlyContinue)) "agente parado"
    Assert-True (Wait-Until { -not (Test-Path $LogDir) } 30) "logs removidos"
    Assert-True ((Test-Path $ConfigFile) -and (Test-Path $IdFile)) "configuração e identificador mantidos para reinstalar"

    Write-Host "Todos os testes do instalador passaram."
}
catch {
    Write-Host "::group::Log do instalador"
    Get-Content $SetupLog -ErrorAction SilentlyContinue
    Write-Host "::endgroup::"
    Write-Host "::group::Logs do serviço"
    Get-ChildItem $LogDir -Filter "*.log" -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "--- $($_.Name)"
        Get-Content $_.FullName -Tail 80
    }
    Write-Host "::endgroup::"
    throw
}
