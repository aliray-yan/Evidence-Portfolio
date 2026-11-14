# Use Windows DPAPI directly; older PowerShell module paths can be incompatible
# when Windows PowerShell is launched from PowerShell 7.
Add-Type -AssemblyName System.Security
function Protect-SentinelSecret([string]$Plaintext) {
    $secretBytes = [System.Text.Encoding]::UTF8.GetBytes($Plaintext)
    try {
        $cipherBytes = [System.Security.Cryptography.ProtectedData]::Protect($secretBytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
        return [Convert]::ToBase64String($cipherBytes)
    } finally { [Array]::Clear($secretBytes, 0, $secretBytes.Length) }
}
function Unprotect-SentinelSecret([string]$Ciphertext) {
    $cipherBytes = [Convert]::FromBase64String($Ciphertext)
    $secretBytes = [System.Security.Cryptography.ProtectedData]::Unprotect($cipherBytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
    try { return [System.Text.Encoding]::UTF8.GetString($secretBytes) }
    finally { [Array]::Clear($secretBytes, 0, $secretBytes.Length) }
}
