# Changelog

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
