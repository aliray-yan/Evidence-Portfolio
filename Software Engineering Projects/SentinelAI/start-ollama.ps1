# Optional research runtime. The SentinelAI application does not call this service.
$ErrorActionPreference = 'Stop'
$sentinelRoot = $PSScriptRoot
$ollamaBinary = Join-Path $sentinelRoot '.local\ollama\ollama.exe'
if (-not (Test-Path -LiteralPath $ollamaBinary)) {
    throw 'Portable Ollama is unavailable. See docs/OLLAMA_EVALUATION.md for installation.'
}
$env:OLLAMA_HOST = '127.0.0.1:11435'
$env:OLLAMA_MODELS = Join-Path $sentinelRoot '.local\models\ollama'
$env:OLLAMA_NO_CLOUD = '1'
$env:OLLAMA_NOHISTORY = '1'
$env:OLLAMA_DEBUG_LOG_REQUESTS = '0'
$env:OLLAMA_NOPRUNE = '1'
$env:OLLAMA_VULKAN = '0'
$env:OLLAMA_IGPU_ENABLE = '0'
$env:OLLAMA_CONTEXT_LENGTH = '2048'
$env:OLLAMA_NUM_PARALLEL = '1'
$env:OLLAMA_MAX_LOADED_MODELS = '1'
$env:OLLAMA_MAX_QUEUE = '1'
$env:OLLAMA_KEEP_ALIVE = '2m'
$env:OLLAMA_LOAD_TIMEOUT = '3m'
Write-Host 'Starting optional local research model service on 127.0.0.1:11435. Press Ctrl+C to stop.'
& $ollamaBinary serve
if ($LASTEXITCODE -ne 0) { throw "Ollama stopped with exit code $LASTEXITCODE." }
