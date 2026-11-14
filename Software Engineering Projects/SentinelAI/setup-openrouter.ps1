$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'scripts/secret-storage.ps1')
if ($env:OS -ne 'Windows_NT') { throw 'On other systems, configure OPENROUTER_API_KEY with your secret manager.' }
$secretDirectory = Join-Path $PSScriptRoot '.local\secrets'
$secretPath = Join-Path $secretDirectory 'openrouter.dpapi'
Write-Host 'Paste your OpenRouter API key below. Input is hidden and is not sent to this chat.'
$keyValue = Read-Host 'OpenRouter API key' -AsSecureString
$plainKey = [System.Net.NetworkCredential]::new('', $keyValue).Password
try {
    if ($plainKey -notmatch '^sk-or-[A-Za-z0-9_-]{16,240}$') { throw 'This does not look like an OpenRouter key. Nothing was saved.' }
    New-Item -ItemType Directory -Force -Path $secretDirectory | Out-Null
    # Windows DPAPI binds this ciphertext to the current Windows user/account.
    $protectedKey = Protect-SentinelSecret $plainKey
    [System.IO.File]::WriteAllText($secretPath, $protectedKey)
    Write-Host 'Key saved with Windows user encryption in ignored local storage. No network request was made.'
    Write-Host 'The SentinelAI launcher will load it when the server next starts.'
} finally {
    $plainKey = $null
    $keyValue.Dispose()
}
