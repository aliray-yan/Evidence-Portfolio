param([string]$Directory = '.local/mobile-test-20261102')
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
. (Join-Path $PSScriptRoot 'scripts/secret-storage.ps1')
$directoryPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot $Directory))
$credentialJson = Unprotect-SentinelSecret ([IO.File]::ReadAllText((Join-Path $directoryPath 'test-access.dpapi')))
try {
    $credentialJson | & (Join-Path $PSScriptRoot '.local/runtime/Scripts/python.exe') -m backend.verify_mobile $directoryPath
    if ($LASTEXITCODE -ne 0) { throw 'HTTPS workflow verification failed. No credentials were printed.' }
} finally { $credentialJson = $null }
