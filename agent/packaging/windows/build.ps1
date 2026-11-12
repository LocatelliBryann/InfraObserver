<#
.SYNOPSIS
  Gera o instalador do InfraObserver Agent para Windows.

.DESCRIPTION
  1. Grava a versão em src/_build_info.py
  2. Gera o executável com o PyInstaller (pasta, não arquivo único: inicia mais
     rápido e gera menos falso positivo em antivírus)
  3. Baixa o WinSW (serviço do Windows) e confere o SHA-256
  4. Compila o instalador com o Inno Setup 6.3 ou mais novo
  5. Grava o SHA-256 do instalador ao lado dele

  Usado pelo workflow agent-windows.yml e também pode rodar no PC:
    cd agent
    powershell -ExecutionPolicy Bypass -File packaging\windows\build.ps1 -Version 1.5.0

  Saída: agent\build\windows\output\InfraObserverAgentSetup-<versão>.exe
#>
param(
    [string]$Version = "0.0.0-dev"
)

$ErrorActionPreference = "Stop"

$WinSWVersion = "2.12.0"
$WinSWSha256 = "05b82d46ad331cc16bdc00de5c6332c1ef818df8ceefcd49c726553209b3a0da"
$PyInstallerVersion = "6.22.3"

$PackagingDir = $PSScriptRoot
$AgentDir = (Resolve-Path (Join-Path $PackagingDir "..\..")).Path
$BuildDir = Join-Path $AgentDir "build\windows"
$StageDir = Join-Path $BuildDir "stage"
$OutputDir = Join-Path $BuildDir "output"

if ($Version -notmatch '^\d+\.\d+\.\d+([-+][0-9A-Za-z.\-+]+)?$') {
    throw "Versão inválida: '$Version' (use 1.5.0 ou 1.5.0-dev)"
}
$NumericVersion = ($Version -replace '^(\d+\.\d+\.\d+).*$', '$1') + ".0"

Write-Host "==> InfraObserver Agent $Version"
Remove-Item $BuildDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item $StageDir, $OutputDir -ItemType Directory -Force | Out-Null

Push-Location $AgentDir
try {
    # 1. Versão gravada no executável
    Set-Content -Path "src\_build_info.py" -Encoding ascii `
        -Value "# Gerado pelo build.ps1. Não versionar.`nVERSION = `"$Version`""

    # 2. Dependências de execução (sem pytest) e PyInstaller
    $runtime = Get-Content requirements.txt | Where-Object { $_ -notmatch '^pytest' }
    $runtimeFile = Join-Path $BuildDir "requirements-runtime.txt"
    Set-Content -Path $runtimeFile -Value $runtime -Encoding ascii
    python -m pip install --disable-pip-version-check -r $runtimeFile "pyinstaller==$PyInstallerVersion"
    if ($LASTEXITCODE -ne 0) { throw "pip install falhou" }

    # Caminhos absolutos: o PyInstaller resolve os relativos a partir do --specpath.
    python -m PyInstaller (Join-Path $PackagingDir "agent_entry.py") `
        --name infraobserver-agent `
        --onedir --console --noconfirm --clean `
        --paths . `
        --collect-submodules watchdog.observers `
        --hidden-import win32evtlog `
        --icon (Join-Path $PackagingDir "infraobserver.ico") `
        --distpath (Join-Path $BuildDir "dist") `
        --workpath (Join-Path $BuildDir "work") `
        --specpath (Join-Path $BuildDir "work")
    if ($LASTEXITCODE -ne 0) { throw "PyInstaller falhou" }

    $agentExe = Join-Path $BuildDir "dist\infraobserver-agent\infraobserver-agent.exe"
    $reported = & $agentExe --version
    Write-Host "    $reported"
    if ($reported -ne "InfraObserver Agent $Version") {
        throw "O executável informou '$reported', esperado '$Version'"
    }
    Copy-Item (Join-Path $BuildDir "dist\infraobserver-agent") (Join-Path $StageDir "agent") -Recurse

    # 3. WinSW, conferido pelo SHA-256 antes de entrar no instalador
    $winsw = Join-Path $StageDir "InfraObserverAgent.exe"
    Invoke-WebRequest -UseBasicParsing -OutFile $winsw `
        -Uri "https://github.com/winsw/winsw/releases/download/v$WinSWVersion/WinSW-x64.exe"
    $hash = (Get-FileHash $winsw -Algorithm SHA256).Hash.ToLower()
    if ($hash -ne $WinSWSha256) { throw "SHA-256 do WinSW não confere: $hash" }
    Copy-Item packaging\windows\InfraObserverAgent.xml $StageDir

    # 4. Instalador
    $iscc = (Get-Command ISCC.exe -ErrorAction SilentlyContinue).Source
    if (-not $iscc) { $iscc = Join-Path ${env:ProgramFiles(x86)} "Inno Setup 6\ISCC.exe" }
    if (-not (Test-Path $iscc)) { throw "Inno Setup 6 não encontrado (instale com: winget install JRSoftware.InnoSetup)" }

    & $iscc /Q "/DAppVersion=$Version" "/DNumericVersion=$NumericVersion" `
        "/DSourceDir=$StageDir" "/O$OutputDir" packaging\windows\infraobserver-agent.iss
    if ($LASTEXITCODE -ne 0) { throw "Inno Setup falhou" }

    # 5. SHA-256 do instalador (a atualização automática confere esse valor)
    $setup = Join-Path $OutputDir "InfraObserverAgentSetup-$Version.exe"
    $setupHash = (Get-FileHash $setup -Algorithm SHA256).Hash.ToLower()
    Set-Content -Path "$setup.sha256" -Encoding ascii `
        -Value "$setupHash  InfraObserverAgentSetup-$Version.exe"

    Write-Host "==> $setup"
    Write-Host "    SHA-256 $setupHash"
}
finally {
    Remove-Item "src\_build_info.py" -ErrorAction SilentlyContinue
    Pop-Location
}