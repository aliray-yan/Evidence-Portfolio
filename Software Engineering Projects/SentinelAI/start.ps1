param([int]$Port = 8000)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$sentinelPython = Join-Path $PSScriptRoot '.local/runtime/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $sentinelPython)) {
    $sentinelPython = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
}
if (-not (Test-Path -LiteralPath $sentinelPython)) {
    throw 'Create the Python environment using README.md before starting SentinelAI.'
}
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'dist/index.html'))) {
    throw 'Build the frontend with npm run build before starting SentinelAI.'
}
$env:HF_HUB_DISABLE_TELEMETRY = '1'
$env:HF_HUB_OFFLINE = '1'
. (Join-Path $PSScriptRoot 'scripts/load-openrouter.ps1')
& $sentinelPython -m uvicorn backend.main:app --host 127.0.0.1 --port $Port
exit $LASTEXITCODE
