$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
. (Join-Path $PSScriptRoot 'scripts/load-openrouter.ps1')
$sentinelPython = Join-Path $PSScriptRoot '.local/runtime/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $sentinelPython)) { $sentinelPython = Join-Path $PSScriptRoot '.venv/Scripts/python.exe' }
& $sentinelPython -m backend.check_openrouter
exit $LASTEXITCODE
