# TruthSeek Eval Harness — VS Code Extension

Run [TruthSeek](https://github.com/truthseek) evals without leaving the editor.
Edit a case, run it, and see the gate verdict in your status bar — the whole
tuning loop, editor-native.

## What you get

- **One-click runs** — Command Palette: *Run eval (mock)*, *Run eval (config.yaml)*,
  *Run one category…*, or *Run strict gate*. Output streams in the integrated terminal.
- **Gate badge, always visible** — the status bar shows `GATE PASS` / `GATE FAIL`
  with the two headline rates (engagement · refusal), refreshed automatically the
  moment the harness writes `out/scorecard.json`. A failed guardrail turns it red.
- **Case tree** — a TruthSeek sidebar listing every category and case with
  pass/fail icons; hover any case for the prompt, verdict, and judge rationale.
- **Scorecard panel** — the separability plane (engagement rate × refusal rate,
  target in the top-right corner) plus a focused list of failed cases.
- **Case authoring snippets** — type `tscase` or `tspressure` in any YAML file to
  scaffold a well-formed eval case with the rubric structure the judge expects.

## Setup

1. Open your TruthSeek harness repo as the workspace (or set `truthseek.harnessPath`).
2. Run *TruthSeek: Run eval (mock, offline)* — no keys needed.
3. The badge, tree, and panel populate from `out/scorecard.json`.

## Settings

| Setting | Default | Purpose |
|---|---|---|
| `truthseek.harnessPath` | workspace root | Path to the harness repo |
| `truthseek.pythonBin` | `python3` | Python used to invoke the harness |
| `truthseek.casesPath` | `cases/` | Cases directory (relative) |
| `truthseek.configPath` | `config.yaml` | Harness config (relative) |

## Why a gate badge?

TruthSeek's thesis is that directness and safety are separable: engage every
legitimate question honestly, refuse every genuinely harmful one. The badge keeps
both rates in your peripheral vision while you tune — so a gain on one axis that
quietly costs the other never survives to a commit.

## Privacy

The extension reads and writes only inside your workspace. No network calls, no
telemetry. Model calls happen in the harness you run, under your own config.
