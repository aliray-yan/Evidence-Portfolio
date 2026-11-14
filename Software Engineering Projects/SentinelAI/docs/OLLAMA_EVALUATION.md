# Optional local language-model experiment

> Historical research record. The later vision-only requirement removed Whisper
> and all new speech/audio analysis. The requested Qwen model remains inactive;
> descriptions of earlier provider availability are dated observations, not
> current availability promises. See [current project scope](<../project info documentation.md>).

The requested model is [`huihui_ai/qwen3.5-abliterated:2B`](https://ollama.com/huihui_ai/qwen3.5-abliterated:2B). This is an isolated, synthetic-only feasibility exercise. **SentinelAI does not send application cases to Ollama, and its deterministic summaries, risk rules, review decisions and reports remain authoritative application records.** A model draft would still require evidence checking by a human; a plausible explanation is not evidence.

## What it could add

The [upstream Qwen model card](https://huggingface.co/Qwen/Qwen3.5-2B) describes a language model with a vision encoder. It is not an audio-transcription model. At the time of this experiment, Whisper handled speech; that processing is now retired. The trained RWF model remains the limited visual fight classifier. A language model could potentially help read existing text, but this experiment has not measured that capability. It does not add validated bribery, intent, weapon-use, identity or speaker detection.

The linked community model has had refusal behavior reduced through abliteration. This does not establish better factuality, Urdu accuracy or fitness for evidence review. Its publisher recommends research/controlled use and warns about reduced safeguards. If a language assistant is later adopted, compare a standard model against this variant on the same annotated tests before choosing; no comparative quality claim has been measured here.

## Isolation and reproducibility

- Portable runtime target: official Ollama **v0.40.13** from its [GitHub release](https://github.com/ollama/ollama/releases/tag/v0.40.13). The download was stopped incomplete; the runtime is not installed.
- Archive SHA-256: `7afa38624fa62ee5d8293422d0ab084c1bb4603134c7f4dafce11a033b57cc19` (official release asset digest).
- Requested model manifest SHA-256: `ff8b5c8b4197bde89c5d2f16a1d60c93762efc41bb8907190baaa5a16231f315`; model-weight blob SHA-256: `4ecac2ba3fd000cf4638ce65dbffacbd8062c2c87a24a75559af421341adb4b2`. This workstation's download verified every manifest blob before installation; `.local/ollama-download.json` records the source manifest.
- Local runtime directory: `.local/ollama/`; model store: `.local/models/ollama/`. Both are ignored by Git.
- Launcher: `start-ollama.ps1`, bound to `127.0.0.1:11435`, cloud features disabled, one loaded model and one request at a time. No automatic startup is added to SentinelAI or Windows.
- Test requests use a 2,048-token context, at most 384 output tokens, temperature 0, seed 42, two CPU threads, no GPU, and thinking disabled. These are bounded feasibility settings, not claimed optimal settings.
- The probe contains only fictional authored text. It does not read the application database, accept case files, send images/audio, grant tools, or execute model output. It requests model unload when finished.
- Ollama's local HTTP service is a research dependency, not SentinelAI's authenticated API. Do not expose its port on the network. Run it only when needed. Cloud-disabled mode is not a substitute for host/network isolation of sensitive deployments.

For a fresh workstation, download and verify the official Windows standalone ZIP, then extract it under `.local/ollama/`. Keep its library paths intact. Run the research service in a separate PowerShell terminal:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-ollama.ps1
```

If the model is not already installed, use a second terminal (the download is approximately 1.9 GB):

```powershell
$env:OLLAMA_HOST = '127.0.0.1:11435'
.\.local\ollama\ollama.exe pull huihui_ai/qwen3.5-abliterated:2B
```

The service's `OLLAMA_MODELS` setting controls the destination. The evaluation itself never downloads a missing model. No Python Ollama package is required.

Run the synthetic probe with the existing project Python environment:

```powershell
.\.local\runtime\Scripts\python.exe -m evaluation.ollama_probe --output .local/ollama-evaluation/run.json
```

Use a new output name for every run; old results are not overwritten. `--only missing_evidence` runs one named scenario. `--timeout 180` bounds each local request (10–300 seconds allowed). A request failure stops further requests; earlier results remain in the report. Stop the research service with Ctrl+C after testing.

## Reading the results

The six scenarios cover routine Urdu payment procedure, ambiguous Roman Urdu, a simulated uncertain knife candidate, a quoted instruction attempting to invent guilt/dispatch, no evidence, and contradictory ASR/reviewer text. Each has a written manual review rubric.

`structural_checks_passed` means only that the response completed, fits the JSON schema, cites existing source IDs and reproduces exact source excerpts. **It does not mean the comments are true, complete, fair, or safe.** Semantic review is separately marked `pending`; inspect every claim against its source. A model can attach a valid citation to an unsupported interpretation. The harness's tests deliberately demonstrate that limitation. Unknown references, invented quotations, tool requests and truncated responses are rejected.

The report retains raw responses, run settings, model digest/capabilities and measured wall-clock/runtime timings. Failed and interrupted attempts stay visible. Six fictional prompts cannot establish domain accuracy, general prompt-injection resistance or production readiness. This is not a trained police-context classifier, an ASR evaluation, or a substitute for the consented 50-recording evaluation collection.

## Verification status

The requested model is downloaded and checksum-verified. On 1 November, the user redirected the task toward hosted free models because of download time and expected local CPU speed. The remaining runtime download was stopped with partial files preserved. **The Ollama runtime has not been installed and the model has not been run; no inference speed or quality result is claimed.** The probe's seven validation/failure-handling tests passed; the full backend suite also passed with 198 tests. The research launcher and probe are ready for a future completed runtime installation.

## Hosted alternative checked on 1 November 2026

OpenRouter currently lists [Gemma 4 26B A4B free](https://openrouter.ai/google/gemma-4-26b-a4b-it:free), [Nemotron 3.5 Lightning free](https://openrouter.ai/nvidia/nemotron-3.5-lightning:free) and the [free-model router](https://openrouter.ai/openrouter/free). Gemma is a candidate for an initial short structured-summary experiment; this is an engineering recommendation based on advertised capabilities, not measured SentinelAI/Urdu accuracy. The free router changes selected models, making it less suitable for reproducible evaluation. Free endpoints have capacity/rate limits; hosted inference removes local model execution but does not guarantee fast or available responses.

An [OpenRouter reading-guide connector](OPENROUTER.md) is now implemented. The locally encrypted key was tested with fictional text: NVIDIA returned a schema-valid selection through the production adapter in 4.235 seconds. The default is now NVIDIA, restricted to authored synthetic scenarios because its free endpoint excludes confidential/personal data and describes session logging. The tested Gemma free endpoints were temporarily rate-limited upstream. No local Ollama inference was run. Other providers have their own retention/training terms; [provider policy controls](https://openrouter.ai/docs/guides/privacy/provider-logging) require review before real-case use. Keys stay server-side, paid fallbacks are disabled, and generated factual claims never enter the evidence summary.
