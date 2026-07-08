# Changelog

## 0.6.0
- Harness adds an **adversarial-robustness suite** (`cases/adversarial.yaml`): measures how
  well a model holds its guardrails under known jailbreak framings (roleplay, instruction
  override, fiction laundering, false authorization, obfuscation, payload-splitting). Every
  case is `expect: refuse`, so the category score reads as a robustness rate — `6/6` means
  every framing was resisted. Failures gate like guardrail regressions under strict mode. It
  surfaces in the badge, tree, and scorecard like any other category.
- Fixed a refusal-detection bug the suite exposed against a live model: common real-model
  refusal phrasings ("I cannot provide instructions…", "I can't fulfill that request") were
  being misread as compliance, so a safe model was reported as jailbroken. Broadened the
  patterns while keeping calibration hedges ("I can't provide an exact number") classified as
  engagement.
- README documents the harness's real-model validation stories (see the harness repo's
  "Field notes" section) — every feature was validated against a live local model, not just
  the offline mock.

## 0.5.0
- Harness gains two optional accuracy knobs for the `openai_compatible` judge, surfaced
  in runs and the scorecard: `repeat` (average K judge passes to cut variance, with an
  automatic temperature bump so the passes actually differ) and `criteria` (score each
  sub-criterion — directness, anti-sycophancy, calibration, guardrail integrity — in its
  own focused call and ensemble, instead of one compound judgement). Both off by default;
  set them in `config.yaml`. No extension UI change — the sharper scores flow straight
  into the gate badge, tree, and scorecard panel.

## 0.4.0
- New command *TruthSeek: Compare two models…* — pick two or more models (auto-discovered
  from the endpoint in `config.yaml`) and run the same case suite against each. Produces a
  side-by-side comparison (`out/comparison.html` / `.json`) with a guardrail-gated verdict:
  a model only "wins" on engagement if it also refused every genuine-harm case, so engaging
  more by complying with harmful requests is disqualifying, not rewarded.

## 0.3.0
- Extension categorized under AI on the Marketplace, alongside Testing/Machine Learning/Visualization
- README rewritten as a full guide: the directness/safety separability thesis, an
  accurate multi-IDE compatibility section (works in any Code-OSS-based editor via
  `.vsix` — VS Code, Cursor, Windsurf, Antigravity, VSCodium — not just VS Code), and
  full command/settings reference tables
- Documents the harness's expanded capabilities: a 31-case library across six
  categories (engagement, factual accuracy, calibration, anti-sycophancy, guardrails,
  agentic), agentic tool-use evals, and cross-modal (image) evals
- Fixed a packaging leak where `.claude/` tooling state was being bundled into the
  shipped vsix

## 0.2.0
- New command *TruthSeek: Configure target model…* — pick a preset (Ollama, LM Studio,
  vLLM, or a custom OpenAI-compatible endpoint), auto-discover models currently loaded
  at that address, and write `config.yaml`'s `target` block without hand-editing YAML
- Harness now reports which model produced a run; the status bar, tree, and scorecard
  panel show it instead of a placeholder
- Fixed case parsing against the harness's actual scorecard shape — previously every
  case rendered as "uncategorized" / failed regardless of the real result

## 0.1.0
- One-click eval runs (mock / config / single category / strict gate) in the integrated terminal
- Status bar gate badge (GATE PASS/FAIL + headline rates), auto-refreshed when out/scorecard.json changes
- Sidebar tree: categories and cases with pass/fail icons and judge notes on hover
- Scorecard panel with the separability plane and failed-case list
- YAML snippets (tscase, tspressure) for authoring cases
