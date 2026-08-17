const fs = require('fs');

const originalConfig = `# ════════════════════════════════════════════════════════════════════
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
  # ── PRIMARY: Docker MSA AI (auto-routing, survives reboot) ──────────
  - name: "🚀 MSA AI (Docker — Recommended)"
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

fs.writeFileSync('C:\\Users\\MD SADIQUE AMIN\\.continue\\config.yaml', originalConfig, { encoding: 'utf8' });
fs.writeFileSync('D:\\current using file\\8-17-2026\\config.yaml.final', originalConfig, { encoding: 'utf8' });

console.log('✅ Exact original config.yaml restored with emojis in front of names!');
