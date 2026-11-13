<#
.SYNOPSIS
  Mede o consumo de CPU e memória do agente do InfraObserver num PC Windows.

.DESCRIPTION
  RFC v1.1, seção 7.1: o agente deve usar, em média, menos de 2% de CPU.

  A cada amostra, soma o tempo de CPU dos processos do agente
  (infraobserver-agent.exe e o serviço InfraObserverAgent.exe, do WinSW) e
  divide pelo tempo passado vezes o número de processadores lógicos, como o
  Gerenciador de Tarefas. Não usa contadores de desempenho, que mudam de nome
  no Windows em português.

  Grava cada amostra em CSV e, no fim (ou ao interromper com Ctrl+C), um
  resumo em Markdown com média, p95 e máximo.

.PARAMETER Hours
  Duração da medição, em horas. Padrão: 24.

.PARAMETER IntervalSeconds
  Intervalo entre as amostras, em segundos. Padrão: 60.

.PARAMETER OutputDir
  Pasta dos resultados. Padrão: InfraObserver-cpu na Área de Trabalho.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\measure-agent-cpu.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\measure-agent-cpu.ps1 -Hours 1 -IntervalSeconds 10
#>
[CmdletBinding()]
param(
    [ValidateRange(0.01, 168)]
    [double]$Hours = 24,

    [ValidateRange(1, 3600)]
    [int]$IntervalSeconds = 60,

    [string]$OutputDir = (Join-Path ([Environment]::GetFolderPath("Desktop")) "InfraObserver-cpu")
)

$ErrorActionPreference = "Stop"

$ProcessNames = @("infraobserver-agent", "InfraObserverAgent")
$CpuLimitPercent = 2
$LogicalProcessors = [Environment]::ProcessorCount

function Get-AgentProcesses {
    Get-Process -Name $ProcessNames -ErrorAction SilentlyContinue
}

# Tempo de CPU e memória de cada processo do agente, por PID.
function Get-Snapshot {
    $snapshot = @{}

    foreach ($process in Get-AgentProcesses) {
        try {
            $snapshot[$process.Id] = [pscustomobject]@{
                Cpu    = $process.TotalProcessorTime.TotalMilliseconds
                Memory = $process.WorkingSet64
            }
        }
        catch {
            # Sem permissão para ler o processo: rode o PowerShell como administrador.
        }
    }

    return $snapshot
}

function Get-Percentile([double[]]$Values, [double]$Percentile) {
    if ($Values.Count -eq 0) { return 0 }

    $sorted = $Values | Sort-Object
    $index = [Math]::Ceiling(($Percentile / 100) * $sorted.Count) - 1
    return $sorted[[Math]::Max(0, $index)]
}

function Write-Summary {
    param($Samples, [datetime]$Start, [string]$Path)

    $cpu = [double[]]@($Samples | ForEach-Object { $_.CpuPercent })
    $memory = [double[]]@($Samples | ForEach-Object { $_.MemoryMB })

    if ($cpu.Count -eq 0) {
        Write-Warning "Nenhuma amostra coletada."
        return
    }

    $cpuAverage = ($cpu | Measure-Object -Average).Average
    $cpuMax = ($cpu | Measure-Object -Maximum).Maximum
    $memoryAverage = ($memory | Measure-Object -Average).Average
    $memoryMax = ($memory | Measure-Object -Maximum).Maximum
    $cpuP95 = Get-Percentile $cpu 95
    $passed = $cpuAverage -lt $CpuLimitPercent
    $culture = [Globalization.CultureInfo]::GetCultureInfo("pt-BR")
    $os = (Get-CimInstance Win32_OperatingSystem).Caption
    $cpuModel = (Get-CimInstance Win32_Processor | Select-Object -First 1).Name.Trim()
    $version = $null
    $agentExe = Get-AgentProcesses | Where-Object { $_.ProcessName -eq "infraobserver-agent" } | Select-Object -First 1
    if ($agentExe) {
        try { $version = $agentExe.MainModule.FileVersionInfo.ProductVersion } catch { $version = $null }
    }

    $result = if ($passed) { "APROVADO" } else { "REPROVADO" }
    $lines = @(
        "# Consumo do agente do InfraObserver",
        "",
        "- Computador: $env:COMPUTERNAME ($os)",
        "- Processador: $cpuModel, $LogicalProcessors processadores lógicos",
        "- Versão do agente: $(if ($version) { $version } else { 'não identificada' })",
        "- Início: $($Start.ToString('dd/MM/yyyy HH:mm', $culture))",
        "- Fim: $((Get-Date).ToString('dd/MM/yyyy HH:mm', $culture))",
        "- Amostras: $($cpu.Count), a cada $IntervalSeconds s",
        "- Resultado: $result (critério: média de CPU abaixo de $CpuLimitPercent%)",
        "",
        "| Medida | CPU | Memória |",
        "|---|---|---|",
        "| Média | $($cpuAverage.ToString('0.00', $culture))% | $($memoryAverage.ToString('0.0', $culture)) MB |",
        "| p95 | $($cpuP95.ToString('0.00', $culture))% | - |",
        "| Máximo | $($cpuMax.ToString('0.00', $culture))% | $($memoryMax.ToString('0.0', $culture)) MB |",
        ""
    )

    $lines | Set-Content -Path $Path -Encoding UTF8
    Write-Host ""
    $lines | ForEach-Object { Write-Host $_ }
    Write-Host "Resumo salvo em $Path"
}

if (-not (Get-AgentProcesses)) {
    throw "O agente do InfraObserver não está rodando neste computador (processos: $($ProcessNames -join ', '))."
}

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$csvPath = Join-Path $OutputDir "agent-cpu-$stamp.csv"
$summaryPath = Join-Path $OutputDir "agent-cpu-$stamp.md"

$start = Get-Date
$end = $start.AddHours($Hours)
$samples = New-Object System.Collections.Generic.List[object]

Write-Host "Medindo o agente até $($end.ToString('dd/MM HH:mm')) (Ctrl+C encerra e gera o resumo)."
Write-Host "Amostras em $csvPath"

$previous = Get-Snapshot
$previousTime = Get-Date

try {
    while ((Get-Date) -lt $end) {
        Start-Sleep -Seconds $IntervalSeconds

        $current = Get-Snapshot
        $now = Get-Date
        $elapsedMs = ($now - $previousTime).TotalMilliseconds

        # Só soma processos que existiam nas duas leituras: se o serviço
        # reiniciar, o novo processo entra a partir da próxima amostra.
        $cpuMs = 0
        foreach ($processId in $current.Keys) {
            if ($previous.ContainsKey($processId)) {
                $cpuMs += [Math]::Max(0, $current[$processId].Cpu - $previous[$processId].Cpu)
            }
        }

        $memoryBytes = 0
        foreach ($entry in $current.Values) { $memoryBytes += $entry.Memory }

        $sample = [pscustomobject]@{
            Timestamp  = $now.ToString("s")
            CpuPercent = [Math]::Round(($cpuMs / ($elapsedMs * $LogicalProcessors)) * 100, 3)
            MemoryMB   = [Math]::Round($memoryBytes / 1MB, 1)
            Processes  = $current.Count
        }

        $samples.Add($sample)
        $sample | Export-Csv -Path $csvPath -Append -NoTypeInformation -Encoding UTF8

        if ($current.Count -eq 0) {
            Write-Warning "$($sample.Timestamp): o agente não está rodando."
        }

        $previous = $current
        $previousTime = $now
    }
}
finally {
    Write-Summary -Samples $samples -Start $start -Path $summaryPath
}
