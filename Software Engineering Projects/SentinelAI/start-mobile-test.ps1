$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:HF_HUB_DISABLE_TELEMETRY = '1'
$env:HF_HUB_OFFLINE = '1'
& (Join-Path $PSScriptRoot '.local/runtime/Scripts/python.exe') -m backend.mobile --directory .local/mobile-test-20261102 serve
exit $LASTEXITCODE
