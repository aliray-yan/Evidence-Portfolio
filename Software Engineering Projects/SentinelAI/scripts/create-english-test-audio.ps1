$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$projectRoot = Split-Path $PSScriptRoot -Parent
$fixtureRoot = Join-Path $projectRoot '.local/english-test-audio'
[IO.Directory]::CreateDirectory($fixtureRoot) | Out-Null
$examples = Get-Content -LiteralPath (Join-Path $projectRoot 'evaluation/english_examples.json') -Raw | ConvertFrom-Json
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $names = @($voice.GetInstalledVoices() | Where-Object Enabled | ForEach-Object { $_.VoiceInfo.Name })
    if ($names.Count -lt 2) { throw 'Two enabled Windows synthetic voices are needed for these fixtures.' }
    $format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
    foreach ($clip in $examples.clips) {
        for ($i = 0; $i -lt $clip.lines.Count; $i++) {
            $voice.SelectVoice($names[$i % 2])
            $voice.Rate = 0
            $voice.SetOutputToWaveFile((Join-Path $fixtureRoot ($clip.id + '-' + $i + '.wav')), $format)
            $voice.Speak($clip.lines[$i])
            $voice.SetOutputToNull()
        }
    }
    Write-Output 'Created fresh fictional English dialogue audio for ten test videos.'
} finally { $voice.Dispose() }
