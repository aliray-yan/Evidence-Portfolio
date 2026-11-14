$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$fixtureRoot = Join-Path (Split-Path $PSScriptRoot -Parent) '.local/ai-verification/dialogue'
[IO.Directory]::CreateDirectory($fixtureRoot) | Out-Null
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $names = @($voice.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name })
    if ($names.Count -lt 2) { throw 'This fixture needs two installed Windows synthetic voices.' }
    $format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
    $lines = @(
        'Please keep the official receipt for your traffic fine. You can check the printed amount before paying.',
        'Thank you. I will read the receipt carefully. Please explain where I can make the official payment.',
        'The receipt includes the payment instructions. You may contact the office if you need more information.',
        'I understand the instructions now. I will keep the receipt and ask the office if I have any questions.'
    )
    $items = @()
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $voice.SelectVoice($names[$i % 2])
        $voice.SetOutputToWaveFile((Join-Path $fixtureRoot ("turn-$i.wav")), $format)
        $voice.Speak($lines[$i])
        $voice.SetOutputToNull()
        $items += @{ file = "turn-$i.wav"; voice = $names[$i % 2]; text = $lines[$i] }
    }
    $items | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $fixtureRoot 'authored-lines.json') -Encoding UTF8
    Write-Output 'Created four fictional speech blocks using two Windows synthetic voices. No real speaker recording was used.'
} finally { $voice.Dispose() }
