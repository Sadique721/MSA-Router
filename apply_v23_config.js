const fs = require('fs');

const configYaml = `# ════════════════════════════════════════════════════════════════════
#  MSA AI — Continue IDE Config (High Performance v2.3)
#  Primary endpoint: http://localhost:20131/v1  (Docker MSA Router)
#  OmniRoute Gateway: http://localhost:20129/v1 (Docker OmniRoute)
#  Direct Ollama:    http://localhost:11435     (Docker Ollama)
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

  # ── OMNIROUTE GATEWAY: Multi-combo fallback endpoint ──────────────
  - name: "🌐 OmniRoute Gateway"
    provider: openai
    model: msa-ai
    apiBase: http://localhost:20129/v1
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

  # ── CLOUD MODELS (Proxied through Router - 100% Stable OpenAI Format) 
  - name: "☁️ Gemini 3.1 Flash (Cloud)"
    provider: openai
    model: gemini-3.1-flash-lite
    apiBase: http://localhost:20131/v1
    apiKey: sk-msa-local

# ── AUTOCOMPLETE: Fast inline code completions (Docker Ollama) ─────
tabAutocompleteModel:
  name: "MSA Autocomplete (Qwen 0.5B)"
  provider: ollama
  model: qwen2.5:0.5b
  apiBase: http://localhost:11435
`;

fs.writeFileSync('C:\\Users\\MD SADIQUE AMIN\\.continue\\config.yaml', configYaml, { encoding: 'utf8' });
fs.writeFileSync('D:\\current using file\\8-17-2026\\config.yaml.final', configYaml, { encoding: 'utf8' });

console.log('✅ Continue config.yaml upgraded to v2.3 with 100% stable OpenAI proxy endpoints!');
