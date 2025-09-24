[CmdletBinding()]
param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path '.'
$outDir = Join-Path $repoRoot 'out'
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$transcript = Join-Path $outDir "mute-$timestamp.log"
$arguments = @('--')
if ($DryRun) {
    $arguments += '--dry-run'
}
if ($args.Count -gt 0) {
    $arguments += $args
}

Start-Transcript -Path $transcript -Append | Out-Null
try {
    Write-Host "Executing npm run mute:videos $($arguments -join ' ')"
    npm run mute:videos @arguments
    if ($LASTEXITCODE -ne 0) {
        throw "npm run mute:videos failed with exit code $LASTEXITCODE"
    }
}
finally {
    Stop-Transcript | Out-Null
}
