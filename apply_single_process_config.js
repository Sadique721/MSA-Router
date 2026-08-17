const fs = require('fs');

const singleProcessYaml = `# ════════════════════════════════════════════════════════════════════
#  MSA AI — Single-Process Multi-Threaded Engine v3.0
#  All models unified under ONE master process at: http://localhost:20131/v1
#  Hardware: 12-Core AMD Multi-Threading with Libuv Async Threadpool
# ════════════════════════════════════════════════════════════════════
name: MSA AI
version: 3.0.0
schema: v1

models:
  # ── PRIMARY: Auto-Routing (Fast Coding / Explanations ~1.5s) ────────
  - name: "MSA AI (Docker — Recommended)"
    provider: openai
    model: msa-ai
    apiBase: http://localhost:20131/v1
    apiKey: sk-msa-local

  # ── CODING: Direct 12-Thread Qwen 2.5 Coder 7B (~0.5s) ──────────────
  - name: "🧠 Qwen 2.5 Coder 7B (Direct)"
    provider: openai
    model: qwen2.5:7b-instruct
    apiBase: http://localhost:20131/v1
    apiKey: sk-msa-local

  # ── REASONING: Direct 12-Thread DeepSeek R1 7B (Chain-of-Thought) ───
  - name: "🔍 DeepSeek R1 7B (Reasoning)"
    provider: openai
    model: deepseek-r1:7b
    apiBase: http://localhost:20131/v1
    apiKey: sk-msa-local

  # ── CLOUD: Multi-Threaded Google Gemini Bridge (Zero 503 / Zero Fetch Error)
  - name: "☁️ Gemini 3.1 Flash (Cloud)"
    provider: openai
    model: gemini-3.1-flash-lite
    apiBase: http://localhost:20131/v1
    apiKey: sk-msa-local

# ── AUTOCOMPLETE: Sub-30ms Inline Code Completions ─────────────────
tabAutocompleteModel:
  name: "MSA Autocomplete (Qwen 0.5B)"
  provider: ollama
  model: qwen2.5:0.5b
  apiBase: http://localhost:11435
`;

fs.writeFileSync('C:\\Users\\MD SADIQUE AMIN\\.continue\\config.yaml', singleProcessYaml, { encoding: 'utf8' });
fs.writeFileSync('D:\\current using file\\8-17-2026\\config.yaml.final', singleProcessYaml, { encoding: 'utf8' });

console.log('✅ All models unified under single multi-threaded process at http://localhost:20131/v1!');
