param([string]$Directory = '.local/mobile-test-20261102')
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'scripts/secret-storage.ps1')
$path = Join-Path (Join-Path $PSScriptRoot $Directory) 'test-access.dpapi'
$credentials = (Unprotect-SentinelSecret ([IO.File]::ReadAllText($path))) | ConvertFrom-Json
try {
    Write-Host $credentials.scope
    Write-Host ('Open on both phone and desktop: ' + $credentials.url)
    foreach ($account in $credentials.accounts) {
        Write-Host ("`n" + $account.role + ': ' + $account.email)
        Write-Host ('Password: ' + $account.password)
    }
    Write-Host "`nDo not paste these passwords into chat or share them. Remove the temporary CA from your phone after testing."
    Read-Host 'Press Enter to close this window' | Out-Null
} finally { $credentials = $null }
