# TruthSeek Eval Harness

**Stop shipping "feels more direct" as a vibe.** TruthSeek turns it into two numbers —
engagement rate and refusal rate, tracked separately — that update live in your editor
as you tune a model or a prompt, so a gain on one axis that quietly costs the other
never survives to a commit.

Works in VS Code and in any other editor built on the same extension platform —
Cursor, Windsurf, Antigravity, VSCodium, and more. See [Compatibility](#compatibility).

---

## Table of contents

- [Why TruthSeek exists](#why-truthseek-exists)
- [What this extension does](#what-this-extension-does)
- [What the full system can do](#what-the-full-system-can-do-extension--harness)
- [Compatibility](#compatibility)
- [Quick start](#quick-start)
- [Commands](#commands)
- [Settings](#settings)
- [Case authoring](#case-authoring)
- [Privacy](#privacy)

---

## Why TruthSeek exists

Two different failure modes get conflated constantly:

1. **Neutered** — the model hedges, refuses a legitimate question, dodges with canned
   sensitivity language, or caves to social pressure instead of giving a direct, honest
   answer.
2. **Unsafe** — the model helps with something that causes serious harm.

These are not the same axis, and improving one at the expense of the other is not
progress — it's a trade you made without measuring it. TruthSeek's core thesis:
**directness and safety are separable.** A strong system pushes both toward 1.0 —
engage every legitimate question honestly, refuse every genuinely harmful one — and
this extension keeps both numbers in your peripheral vision while you work, instead of
buried in a CI log you check after the fact.

## What this extension does

This is the editor-native front door to that measurement loop:

- **One-click runs** — Command Palette: *Run eval (mock)*, *Run eval (config.yaml)*,
  *Run one category…*, or *Run strict gate*. Output streams in the integrated terminal.
- **Point it at any model, in seconds** — *TruthSeek: Configure target model…* offers
  presets for Ollama, LM Studio, and vLLM, auto-discovers the models currently loaded
  at that address, and writes `config.yaml` for you. Any OpenAI-compatible endpoint
  (local or hosted) works, including a custom one you type in.
- **A gate badge that's always visible** — the status bar shows `GATE PASS` / `GATE
  FAIL` with both headline rates (engagement · refusal) and the model under test,
  refreshed the moment the harness writes `out/scorecard.json`. A failed guardrail
  turns it red.
- **A case tree in the sidebar** — every category and case with pass/fail icons; hover
  any case for the prompt, verdict, and judge rationale.
- **A scorecard panel** — the separability plane (engagement rate × refusal rate,
  target in the top-right corner) plus a focused list of failed cases.
- **Case authoring snippets** — type `tscase` or `tspressure` in any YAML file to
  scaffold a well-formed eval case with the rubric structure the judge expects.

## What the full system can do (extension + harness)

This extension is the editor UI. The actual model-calling, judging, and scoring logic
lives in a separate **TruthSeek harness** — a small local Python project (CLI, case
library, judges, targets) that the extension shells out to and reads results from. The
extension never talks to a model directly; it only runs the harness and displays what
it produces. Together, the full system currently ships with:

| Capability | Detail |
|---|---|
| Any model, local or hosted | Ollama, LM Studio, vLLM, llama.cpp server, or a hosted OpenAI-compatible endpoint — one config block, auto-discovered model list |
| 31 pre-built eval cases | Across six categories: engagement, factual accuracy, calibration, anti-sycophancy, guardrails, agentic |
| Agentic tool-use evals | Cases can give the model real tools (web search, code execution) and score whether it actually used them and reported the result faithfully — not just whether the final answer sounds plausible |
| Cross-modal (image) evals | Attach an image to a case and verify a vision-capable model genuinely engages with it, rather than giving a generic non-answer |
| Two judge modes | A fast offline heuristic judge for iteration, or point at a strong hosted/local model as judge for real grading |
| Scalable LLM judging | Optional `repeat` (average K judge passes to cut variance) and `criteria` (score each sub-criterion in its own focused call and ensemble) knobs sharpen the model judge, adapted from the LLM-as-a-Verifier scaling axes |

Case categories and judge behavior are documented in the harness's own README —
open your harness repo (or set `truthseek.harnessPath`) to see the full case format
and configuration reference.

## Compatibility

TruthSeek packages as a standard **`.vsix`** — the same universal extension format
every VS Code-derived editor uses. It's published on the official VS Code
Marketplace, and it's built entirely on long-stable, non-proprietary extension APIs
(commands, status bar items, tree views, a webview panel, snippets, configuration) —
nothing that depends on a VS Code–exclusive feature.

That means it installs the same way in:

- **VS Code**
- **Cursor**
- **Windsurf**
- **Google Antigravity**
- **VSCodium**
- any other editor built on the Code – OSS extension host

Two ways to install, depending on the editor:

- **From the Marketplace** — if your editor's Extensions panel points at the official
  VS Code Marketplace, search "TruthSeek" and install normally.
- **From the `.vsix` file** — every VS Code-derived editor supports *Extensions:
  Install from VSIX…* regardless of which extension registry it defaults to (several
  forks point at Open VSX or their own registry instead of the official Marketplace).
  Download the `.vsix` and use that command if a Marketplace search comes up empty.

Requires a VS Code–compatible engine version ≥ 1.85 (or the equivalent in your fork).

## Quick start

1. Open your TruthSeek harness repo as the workspace (or set `truthseek.harnessPath`
   if it lives elsewhere).
2. Run **TruthSeek: Run eval (mock, offline)** — no keys, no model, no network calls
   needed. This proves the plumbing works end to end.
3. The status bar badge, sidebar tree, and scorecard panel populate automatically from
   `out/scorecard.json`.
4. When you're ready to evaluate a real model, run **TruthSeek: Configure target
   model…** and either pick a running local server or point it at a hosted
   OpenAI-compatible endpoint.
5. Run **TruthSeek: Run eval (config.yaml)** to evaluate that model for real.
6. Add **TruthSeek: Run strict gate (CI check)** to your pre-commit or CI pipeline
   once you're happy with the thresholds — it exits non-zero on a guardrail
   regression or a threshold miss.

## Commands

| Command | What it does |
|---|---|
| `TruthSeek: Run eval (mock, offline)` | Runs the full case suite against the offline mock target — no model or network required |
| `TruthSeek: Run eval (config.yaml)` | Runs the full case suite against whatever target is configured in `config.yaml` |
| `TruthSeek: Run one category…` | Prompts for a single category (engagement, calibration, anti-sycophancy, guardrails, agentic, …) and runs just that |
| `TruthSeek: Run strict gate (CI check)` | Same as a config run, but exits non-zero on a threshold miss or guardrail regression — wire this into CI |
| `TruthSeek: Configure target model…` | Picks a preset (Ollama / LM Studio / vLLM / custom), auto-discovers loaded models, and writes `config.yaml` for you |
| `TruthSeek: Compare two models…` | Runs the same cases against two or more models and writes a side-by-side `comparison.html` with a guardrail-gated verdict — which model is least neutered *without* becoming reckless |
| `TruthSeek: Open scorecard panel` | Opens the webview panel with the separability plane and failed-case list |
| `TruthSeek: New eval case file` | Scaffolds a new case in a fresh YAML buffer |
| `TruthSeek: Refresh` | Re-reads `out/scorecard.json` and refreshes the badge, tree, and panel |

## Settings

| Setting | Default | Purpose |
|---|---|---|
| `truthseek.harnessPath` | workspace root | Path to the harness repo |
| `truthseek.pythonBin` | `python3` | Python executable used to run the harness |
| `truthseek.casesPath` | `cases/` | Cases directory, relative to the harness repo |
| `truthseek.configPath` | `config.yaml` | Harness config file, relative to the harness repo |

## Case authoring

Type `tscase` in any YAML file to scaffold a standard case (id, category, expect,
messages, rubric). Type `tspressure` to scaffold a sycophancy-resistance case —
a prompt that asserts something confidently and pressures the model to agree,
with a rubric that rewards holding the honest line.

## Privacy

The extension itself reads and writes only inside your workspace, and makes no
network calls and collects no telemetry. Model calls happen inside the harness you
configure and run yourself, under your own `config.yaml` — TruthSeek doesn't proxy,
log, or forward anything on your behalf.
