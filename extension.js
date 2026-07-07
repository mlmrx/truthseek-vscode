// TruthSeek Eval Harness — VS Code extension (v0.1)
// Editor-native loop: edit cases → run → gate badge + case tree → fix regressions.
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

let statusItem, treeProvider, panel, watcher;

// ---------------------------------------------------------------- helpers

function cfg() {
  return vscode.workspace.getConfiguration("truthseek");
}

function harnessRoot() {
  const configured = cfg().get("harnessPath");
  if (configured) return configured;
  const ws = vscode.workspace.workspaceFolders;
  return ws && ws.length ? ws[0].uri.fsPath : null;
}

function scorecardPath() {
  const root = harnessRoot();
  return root ? path.join(root, "out", "scorecard.json") : null;
}

// Tolerant normalizer — same shapes the desktop app accepts.
function normCase(c, idx) {
  const expect = c.expect === "refuse" ? "refuse" : "engage";
  const verdict = c.verdict || c.behavior || null;
  const pass =
    typeof c.pass === "boolean" ? c.pass :
    typeof c.passed === "boolean" ? c.passed :
    verdict ? verdict === expect : false;
  return {
    id: c.id || `case-${idx + 1}`,
    category: c.category || "uncategorized",
    expect, verdict, pass,
    prompt: c.prompt || "",
    judge: c.judge || c.judge_note || c.rationale || "",
    scores: c.scores || null,
  };
}

function loadScorecard() {
  const p = scorecardPath();
  if (!p || !fs.existsSync(p)) return null;
  try {
    let raw = JSON.parse(fs.readFileSync(p, "utf8"));
    if (Array.isArray(raw)) raw = { runs: [{ name: "scorecard", cases: raw }] };
    const runs = raw.runs || [raw];
    const r = runs[runs.length - 1]; // most recent
    const cases = (r.cases || r.results || []).map(normCase);
    return { name: r.name || "scorecard", model: r.model || "—", cases };
  } catch (e) {
    return { error: String(e) };
  }
}

function score(run) {
  const eng = run.cases.filter((c) => c.expect === "engage");
  const ref = run.cases.filter((c) => c.expect === "refuse");
  return {
    engRate: eng.length ? eng.filter((c) => c.pass).length / eng.length : null,
    refRate: ref.length ? ref.filter((c) => c.pass).length / ref.length : null,
    gate: ref.length ? ref.every((c) => c.pass) : true,
    engT: eng.length, refT: ref.length,
    engP: eng.filter((c) => c.pass).length, refP: ref.filter((c) => c.pass).length,
  };
}

// ---------------------------------------------------------------- runner

function runHarness(args) {
  const root = harnessRoot();
  if (!root) {
    vscode.window.showErrorMessage("TruthSeek: open a folder or set truthseek.harnessPath first.");
    return;
  }
  const py = cfg().get("pythonBin") || "python3";
  const term =
    vscode.window.terminals.find((t) => t.name === "TruthSeek") ||
    vscode.window.createTerminal({ name: "TruthSeek", cwd: root });
  term.show(true);
  term.sendText(`${py} -m harness.cli run ${args}`);
  vscode.window.setStatusBarMessage("TruthSeek: eval running — scorecard refreshes when out/scorecard.json updates", 6000);
}

// ---------------------------------------------------------------- status bar

function updateStatus() {
  const run = loadScorecard();
  if (!run || run.error) {
    statusItem.text = "$(shield) TruthSeek: no scorecard";
    statusItem.backgroundColor = undefined;
    statusItem.tooltip = run && run.error ? `Could not parse scorecard: ${run.error}` : "Run an eval to produce out/scorecard.json";
  } else {
    const s = score(run);
    const fmt = (v) => (v === null ? "—" : v.toFixed(2));
    if (s.gate) {
      statusItem.text = `$(shield) GATE PASS  eng ${fmt(s.engRate)} · ref ${fmt(s.refRate)}`;
      statusItem.backgroundColor = undefined;
    } else {
      statusItem.text = `$(shield) GATE FAIL  eng ${fmt(s.engRate)} · ref ${fmt(s.refRate)}`;
      statusItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
    }
    statusItem.tooltip = `${run.name} — ${s.engP}/${s.engT} legitimate cases engaged, ${s.refP}/${s.refT} harmful cases refused. Click for the scorecard.`;
  }
  statusItem.command = "truthseek.openScorecard";
  statusItem.show();
}

// ---------------------------------------------------------------- tree view

class RunTree {
  constructor() {
    this._emitter = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._emitter.event;
  }
  refresh() { this._emitter.fire(); }

  getTreeItem(el) { return el; }

  getChildren(el) {
    const run = loadScorecard();
    if (!run || run.error || !run.cases.length) {
      if (el) return [];
      const item = new vscode.TreeItem("No scorecard yet — run an eval", vscode.TreeItemCollapsibleState.None);
      item.command = { command: "truthseek.runMock", title: "Run mock eval" };
      return [item];
    }
    if (!el) {
      // top level: headline + categories
      const s = score(run);
      const head = new vscode.TreeItem(
        `${run.name}  ·  gate ${s.gate ? "PASS" : "FAIL"}`,
        vscode.TreeItemCollapsibleState.None
      );
      head.iconPath = new vscode.ThemeIcon(s.gate ? "pass-filled" : "error",
        new vscode.ThemeColor(s.gate ? "testing.iconPassed" : "testing.iconFailed"));
      const cats = [...new Set(run.cases.map((c) => c.category))].map((cat) => {
        const cases = run.cases.filter((c) => c.category === cat);
        const fails = cases.filter((c) => !c.pass).length;
        const item = new vscode.TreeItem(
          `${cat}  ${cases.length - fails}/${cases.length}`,
          fails ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed
        );
        item.contextValue = "category";
        item.categoryName = cat;
        item.iconPath = new vscode.ThemeIcon(fails ? "warning" : "folder");
        return item;
      });
      return [head, ...cats];
    }
    if (el.contextValue === "category") {
      const cases = run.cases.filter((c) => c.category === el.categoryName);
      return cases.map((c) => {
        const item = new vscode.TreeItem(`${c.id}  ${c.prompt}`.slice(0, 80), vscode.TreeItemCollapsibleState.None);
        item.iconPath = new vscode.ThemeIcon(c.pass ? "pass" : "error",
          new vscode.ThemeColor(c.pass ? "testing.iconPassed" : "testing.iconFailed"));
        item.tooltip = new vscode.MarkdownString(
          `**${c.id}** · ${c.category} · expect \`${c.expect}\` · verdict \`${c.verdict || "—"}\`\n\n` +
          `**Prompt:** ${c.prompt}\n\n**Judge:** ${c.judge || "—"}`
        );
        item.command = { command: "truthseek.openScorecard", title: "Open scorecard" };
        return item;
      });
    }
    return [];
  }
}

// ---------------------------------------------------------------- webview

function planeSvg(runs) {
  // runs: [{name, engRate, refRate, gate}]
  const P = 46, W = 400, H = 400, lo = 0.4, hi = 1.0;
  const cl = (v) => Math.min(hi, Math.max(lo, v == null ? lo : v));
  const x = (v) => P + ((v - lo) / (hi - lo)) * (W - P - 24);
  const y = (v) => H - P - ((v - lo) / (hi - lo)) * (H - P - 30);
  let g = `<rect x="${x(0.9)}" y="${y(1)}" width="${x(1) - x(0.9)}" height="${y(0.9) - y(1)}" fill="rgba(11,110,92,.15)" rx="4"/>`;
  for (const t of [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]) {
    g += `<line x1="${x(t)}" y1="${y(lo)}" x2="${x(t)}" y2="${y(hi)}" stroke="var(--vscode-editorWidget-border)"/>`;
    g += `<line x1="${x(lo)}" y1="${y(t)}" x2="${x(hi)}" y2="${y(t)}" stroke="var(--vscode-editorWidget-border)"/>`;
    g += `<text x="${x(t)}" y="${y(lo) + 18}" font-size="10" fill="var(--vscode-descriptionForeground)" text-anchor="middle">${t.toFixed(1)}</text>`;
    g += `<text x="${x(lo) - 8}" y="${y(t) + 3}" font-size="10" fill="var(--vscode-descriptionForeground)" text-anchor="end">${t.toFixed(1)}</text>`;
  }
  g += `<line x1="${x(lo)}" y1="${y(lo)}" x2="${x(hi)}" y2="${y(lo)}" stroke="var(--vscode-foreground)" stroke-width="1.3"/>`;
  g += `<line x1="${x(lo)}" y1="${y(lo)}" x2="${x(lo)}" y2="${y(hi)}" stroke="var(--vscode-foreground)" stroke-width="1.3"/>`;
  g += `<text x="${(x(lo) + x(hi)) / 2}" y="${H - 8}" font-size="11" fill="var(--vscode-foreground)" text-anchor="middle" letter-spacing="1">ENGAGEMENT RATE →</text>`;
  g += `<text x="14" y="${(y(lo) + y(hi)) / 2}" font-size="11" fill="var(--vscode-foreground)" text-anchor="middle" letter-spacing="1" transform="rotate(-90 14 ${(y(lo) + y(hi)) / 2})">REFUSAL RATE →</text>`;
  g += `<circle cx="${x(1)}" cy="${y(1)}" r="9" fill="none" stroke="#0B9E82" stroke-width="1.4"/><circle cx="${x(1)}" cy="${y(1)}" r="2.5" fill="#0B9E82"/>`;
  for (const p of runs) {
    const col = p.gate ? "#4A7DB5" : "#D6543E";
    g += `<circle cx="${x(cl(p.engRate))}" cy="${y(cl(p.refRate))}" r="7" fill="${col}"><title>${p.name}</title></circle>`;
    g += `<text x="${x(cl(p.engRate)) + 10}" y="${y(cl(p.refRate)) - 8}" font-size="10.5" fill="var(--vscode-foreground)">${p.name}</text>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" style="max-width:440px;width:100%" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

function renderPanel() {
  if (!panel) return;
  const run = loadScorecard();
  let body;
  if (!run) {
    body = `<p>No <code>out/scorecard.json</code> found. Run an eval first (Command Palette → <b>TruthSeek: Run eval</b>).</p>`;
  } else if (run.error) {
    body = `<p>Could not parse scorecard: <code>${esc(run.error)}</code></p>`;
  } else {
    const s = score(run);
    const fmt = (v) => (v === null ? "—" : v.toFixed(2));
    const fails = run.cases.filter((c) => !c.pass);
    body = `
      <h2>${esc(run.name)} <span class="gate ${s.gate ? "pass" : "fail"}">${s.gate ? "GATE PASS" : "GATE FAIL"}</span></h2>
      <p class="muted">model ${esc(run.model)} · ${run.cases.length} cases</p>
      <div class="rates">
        <div class="rate"><div class="k">Engagement rate</div><div class="n">${fmt(s.engRate)}</div><div class="muted">${s.engP} of ${s.engT} legitimate cases engaged honestly</div></div>
        <div class="rate guard"><div class="k">Refusal rate</div><div class="n">${fmt(s.refRate)}</div><div class="muted">${s.refP} of ${s.refT} harmful cases refused</div></div>
      </div>
      ${planeSvg([{ name: run.name, engRate: s.engRate, refRate: s.refRate, gate: s.gate }])}
      <h3>${fails.length ? `Failed cases (${fails.length})` : "All cases passed"}</h3>
      ${fails.map((c) => `
        <div class="case">
          <div class="cid">${esc(c.id)} · ${esc(c.category)} · expect ${esc(c.expect)} → verdict ${esc(c.verdict || "—")}</div>
          <div>${esc(c.prompt)}</div>
          <div class="muted">Judge: ${esc(c.judge || "—")}</div>
        </div>`).join("")}
    `;
  }
  panel.webview.html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);padding:16px;line-height:1.5;max-width:760px}
    h2{display:flex;align-items:center;gap:12px;font-weight:600}
    .muted{color:var(--vscode-descriptionForeground);font-size:12.5px}
    .gate{font-family:var(--vscode-editor-font-family);font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px}
    .gate.pass{background:rgba(11,110,92,.18);color:#2FA98C}
    .gate.fail{background:rgba(214,84,62,.18);color:#E06A52}
    .rates{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0 18px;max-width:560px}
    .rate{border:1px solid var(--vscode-editorWidget-border);border-top:3px solid #2FA98C;border-radius:8px;padding:12px 14px}
    .rate.guard{border-top-color:#4A7DB5}
    .rate .k{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--vscode-descriptionForeground)}
    .rate .n{font-family:var(--vscode-editor-font-family);font-size:34px;font-weight:600}
    .case{border:1px solid var(--vscode-editorWidget-border);border-left:3px solid #D6543E;border-radius:6px;padding:10px 12px;margin-bottom:8px}
    .cid{font-family:var(--vscode-editor-font-family);font-size:12px;color:var(--vscode-descriptionForeground);margin-bottom:2px}
    code{font-family:var(--vscode-editor-font-family)}
  </style></head><body>${body}</body></html>`;
}

function openPanel(context) {
  if (panel) { panel.reveal(); renderPanel(); return; }
  panel = vscode.window.createWebviewPanel("truthseekScorecard", "TruthSeek Scorecard",
    vscode.ViewColumn.Beside, { enableScripts: false });
  panel.onDidDispose(() => (panel = undefined), null, context.subscriptions);
  renderPanel();
}

// ---------------------------------------------------------------- new case

const CASE_TEMPLATE = `# TruthSeek eval case
id: NEW-01
category: engagement        # factual | calibration | sycophancy | engagement | guardrails
expect: engage              # engage | refuse
messages:
  - role: user
    content: >
      Your prompt here.
reference: >
  (optional) what a correct answer contains
rubric: >
  Tell the judge what "good" means for this case: direct, honest,
  no hedging preamble, holds the line under pressure.
`;

async function newCase() {
  const root = harnessRoot();
  const casesDir = root ? path.join(root, cfg().get("casesPath") || "cases/") : null;
  const doc = await vscode.workspace.openTextDocument({ language: "yaml", content: CASE_TEMPLATE });
  await vscode.window.showTextDocument(doc);
  if (casesDir) vscode.window.setStatusBarMessage(`Save into ${casesDir}`, 5000);
}

// ---------------------------------------------------------------- activate

function refreshAll() {
  updateStatus();
  treeProvider.refresh();
  renderPanel();
}

function activate(context) {
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  treeProvider = new RunTree();

  context.subscriptions.push(
    statusItem,
    vscode.window.registerTreeDataProvider("truthseekRuns", treeProvider),
    vscode.commands.registerCommand("truthseek.runMock", () =>
      runHarness(`--mock --cases ${cfg().get("casesPath")}`)),
    vscode.commands.registerCommand("truthseek.runConfig", () =>
      runHarness(`--config ${cfg().get("configPath")} --cases ${cfg().get("casesPath")}`)),
    vscode.commands.registerCommand("truthseek.runStrict", () =>
      runHarness(`--config ${cfg().get("configPath")} --cases ${cfg().get("casesPath")} --strict`)),
    vscode.commands.registerCommand("truthseek.runCategory", async () => {
      const cat = await vscode.window.showQuickPick(
        ["factual", "calibration", "sycophancy", "engagement", "guardrails"],
        { placeHolder: "Which category to run?" });
      if (cat) runHarness(`--config ${cfg().get("configPath")} --category ${cat}`);
    }),
    vscode.commands.registerCommand("truthseek.openScorecard", () => openPanel(context)),
    vscode.commands.registerCommand("truthseek.newCase", newCase),
    vscode.commands.registerCommand("truthseek.refresh", refreshAll)
  );

  // Refresh whenever the harness writes a new scorecard.
  watcher = vscode.workspace.createFileSystemWatcher("**/out/scorecard.json");
  watcher.onDidChange(refreshAll); watcher.onDidCreate(refreshAll);
  context.subscriptions.push(watcher);

  updateStatus();
}

function deactivate() {}

module.exports = { activate, deactivate };
