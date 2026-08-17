const fs = require('fs');
const path = require('path');

// 1. Update config.yaml with clean name for Docker MSA AI and exact original emojis for all others
const yamlPath = 'C:\\Users\\MD SADIQUE AMIN\\.continue\\config.yaml';
const finalYamlPath = 'D:\\current using file\\8-17-2026\\config.yaml.final';

const configYaml = `# ════════════════════════════════════════════════════════════════════
#  MSA AI — Continue IDE Config
#  Primary endpoint: http://localhost:20131/v1  (Docker MSA Router)
#  Fallback endpoint: http://localhost:20130/v1 (Host MSA Router)
#
#  How to start: Run start-msa-ai.bat in D:\\current using file\\8-17-2026\\
#  Works in: VS Code, IntelliJ, JetBrains, any editor with Continue
# ════════════════════════════════════════════════════════════════════
name: MSA AI
version: 1.0.0
schema: v1

models:
  # ── PRIMARY: Docker MSA AI (Image Icon attached directly in UI) ────
  - name: "MSA AI (Docker — Recommended)"
    provider: openai
    model: msa-ai
    apiBase: http://localhost:20131/v1
    apiKey: sk-msa-local

  # ── FALLBACK: Host MSA AI (when Docker is not running) ─────────────
  - name: "💻 MSA AI (Host Fallback)"
    provider: openai
    model: msa-ai
    apiBase: http://localhost:20130/v1
    apiKey: sk-msa-local

  # ── DIRECT OLLAMA MODELS (via Docker Ollama port 11435) ────────────
  - name: "🧠 Qwen 2.5 Coder 7B (Direct)"
    provider: ollama
    model: qwen2.5:7b-instruct
    apiBase: http://localhost:11435

  - name: "🔍 DeepSeek R1 7B (Reasoning)"
    provider: ollama
    model: deepseek-r1:7b
    apiBase: http://localhost:11435

  # ── CLOUD MODELS (online only) ──────────────────────────────────────
  - name: "☁️ Gemini 2.5 Flash"
    provider: gemini
    model: gemini-2.5-flash
    apiKey: YOUR_GEMINI_API_KEY
    roles: [chat, edit, apply]
    defaultCompletionOptions:
      contextLength: 1048576
      maxTokens: 65536
    capabilities: [tool_use, image_input]

  - name: "☁️ Gemini 2.5 Pro"
    provider: gemini
    model: gemini-2.5-pro
    apiKey: YOUR_GEMINI_API_KEY
    roles: [chat, edit, apply]
    defaultCompletionOptions:
      contextLength: 1048576
      maxTokens: 65536
    capabilities: [tool_use, image_input]

# ── AUTOCOMPLETE: Fast inline code completions (Docker Ollama) ─────
tabAutocompleteModel:
  name: "MSA Autocomplete (Qwen 0.5B)"
  provider: ollama
  model: qwen2.5:0.5b
  apiBase: http://localhost:11435
`;

fs.writeFileSync(yamlPath, configYaml, { encoding: 'utf8' });
fs.writeFileSync(finalYamlPath, configYaml, { encoding: 'utf8' });
console.log('✅ Config YAML updated.');

// 2. Patch index.js in Continue GUI
const indexPath = 'C:\\Users\\MD SADIQUE AMIN\\.antigravity-ide\\extensions\\continue.continue-2.0.0-win32-x64\\gui\\assets\\index.js';
const bakPath = indexPath + '.original';

if (!fs.existsSync(bakPath)) {
  fs.copyFileSync(indexPath, bakPath);
}

let code = fs.readFileSync(bakPath, 'utf8');

// Target 1: at match 3289070
const target1 = 'b.jsx(bm,{className:"h-3 w-3 flex-shrink-0"}),b.jsxs("span",{className:"line-clamp-1",children:[e.title';
const replace1 = '(e.title&&e.title.includes("MSA AI (Docker")?b.jsx("img",{src:window.vscMediaUrl+"/logos/msa-ai.png",className:"h-4 w-4 rounded-full object-contain flex-shrink-0"}):b.jsx(bm,{className:"h-3 w-3 flex-shrink-0"})),b.jsxs("span",{className:"line-clamp-1",children:[e.title';

// Target 2: at match 3730345
const target2 = 'b.jsx(bm,{className:"h-3 w-3 flex-shrink-0"}),b.jsxs("span",{className:"line-clamp-1 truncate",style:{fontSize:Do(-1)},children:[d.title';
const replace2 = '(d.title&&d.title.includes("MSA AI (Docker")?b.jsx("img",{src:window.vscMediaUrl+"/logos/msa-ai.png",className:"h-4 w-4 rounded-full object-contain flex-shrink-0"}):b.jsx(bm,{className:"h-3 w-3 flex-shrink-0"})),b.jsxs("span",{className:"line-clamp-1 truncate",style:{fontSize:Do(-1)},children:[d.title';

if (code.includes(target1) && code.includes(target2)) {
  code = code.replace(target1, replace1).replace(target2, replace2);
  fs.writeFileSync(indexPath, code, 'utf8');
  console.log('✅ index.js successfully patched to render MSA AI neural brain image icon directly in place of cube!');
} else {
  console.log('⚠️ Could not find exact injection points in index.js');
}
