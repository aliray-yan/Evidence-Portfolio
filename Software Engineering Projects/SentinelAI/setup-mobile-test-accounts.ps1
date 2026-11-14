param([string]$Directory = '.local/mobile-test-20261102')
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
. (Join-Path $PSScriptRoot 'scripts/secret-storage.ps1')
$directoryPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot $Directory))
$protectedPath = Join-Path $directoryPath 'test-access.dpapi'
if (Test-Path -LiteralPath $protectedPath) { throw 'Encrypted test credentials already exist. Use show-mobile-test-access.ps1.' }
# Verify Windows-user protection works before creating accounts. Never print credentials.
$null = Protect-SentinelSecret 'local-test-storage-check'
$python = Join-Path $PSScriptRoot '.local/runtime/Scripts/python.exe'
$credentialJson = & $python -m backend.mobile_accounts --directory $directoryPath
if ($LASTEXITCODE -ne 0) { throw 'Test-account setup failed; inspect the error above.' }
try {
    $null = $credentialJson | ConvertFrom-Json
    [IO.File]::WriteAllText($protectedPath, (Protect-SentinelSecret ($credentialJson -join "`n")))
    Write-Host 'Two random local test accounts created. Credentials are encrypted for your Windows user. Run show-mobile-test-access.ps1 to view them privately.'
} finally { $credentialJson = $null }
