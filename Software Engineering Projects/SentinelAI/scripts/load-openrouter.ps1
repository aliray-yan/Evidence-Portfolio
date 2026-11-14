# Dot-source from project launchers. Never print the decrypted credential.
. (Join-Path $PSScriptRoot 'secret-storage.ps1')
if (-not $env:OPENROUTER_API_KEY) {
    $sentinelSecretPath = Join-Path (Split-Path $PSScriptRoot -Parent) '.local\secrets\openrouter.dpapi'
    if (Test-Path -LiteralPath $sentinelSecretPath) {
        try {
            $env:OPENROUTER_API_KEY = Unprotect-SentinelSecret ([System.IO.File]::ReadAllText($sentinelSecretPath))
        } catch {
            throw 'The local OpenRouter key could not be decrypted. Run setup-openrouter.ps1 as this Windows user.'
        }
    }
}
