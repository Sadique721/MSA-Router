const fs = require('fs');
const path = require('path');

const continueDir = 'C:\\Users\\MD SADIQUE AMIN\\.continue';
const yamlPath = path.join(continueDir, 'config.yaml');
const jsonPath = path.join(continueDir, 'config.json');
const finalYamlPath = 'D:\\current using file\\8-17-2026\\config.yaml.final';

// High quality pure UTF-8 YAML config with direct logo image mappings
const configYaml = `name: MSA AI
version: 1.0.0
schema: v1

models:
  # ── PRIMARY: Docker MSA AI Router ──────────────────────────────────
  - name: "MSA AI Router (Docker — Auto)"
    provider: openai
    model: msa-ai
    apiBase: http://localhost:20131/v1
    apiKey: sk-msa-local
    icon: msa-ai.png
    roles: [chat, edit, apply]

  # ── FALLBACK: Host MSA AI ──────────────────────────────────────────
  - name: "MSA AI (Host Fallback)"
    provider: openai
    model: msa-ai
    apiBase: http://localhost:20130/v1
    apiKey: sk-msa-local
    icon: msa-ai.png
    roles: [chat, edit, apply]

  # ── OMNI-ROUTE GATEWAY ─────────────────────────────────────────────
  - name: "OmniRoute Gateway"
    provider: openai
    model: msa-ai
    apiBase: http://localhost:20129/v1
    apiKey: sk-omniroute-local
    icon: msa-ai.png
    roles: [chat]

  # ── DIRECT OLLAMA MODELS ───────────────────────────────────────────
  - name: "Qwen 2.5 Coder 7B (Direct)"
    provider: ollama
    model: qwen2.5:7b-instruct
    apiBase: http://localhost:11435
    icon: qwen.png

  - name: "DeepSeek R1 7B (Reasoning)"
    provider: ollama
    model: deepseek-r1:7b
    apiBase: http://localhost:11435
    icon: deepseek.png

  # ── CLOUD MODELS ───────────────────────────────────────────────────
  - name: "Google Gemini 2.5 Flash"
    provider: gemini
    model: gemini-2.5-flash
    apiKey: YOUR_GEMINI_API_KEY
    icon: gemini.png
    roles: [chat, edit, apply]
    defaultCompletionOptions:
      contextLength: 1048576
      maxTokens: 65536
    capabilities: [tool_use, image_input]

  - name: "Google Gemini 2.5 Pro"
    provider: gemini
    model: gemini-2.5-pro
    apiKey: YOUR_GEMINI_API_KEY
    icon: gemini.png
    roles: [chat, edit, apply]
    defaultCompletionOptions:
      contextLength: 1048576
      maxTokens: 65536
    capabilities: [tool_use, image_input]

# ── AUTOCOMPLETE: Fast inline completions ──────────────────────────
tabAutocompleteModel:
  name: "MSA Autocomplete (Qwen 0.5B)"
  provider: ollama
  model: qwen2.5:0.5b
  apiBase: http://localhost:11435
  icon: qwen.png
`;

// JSON config
const configJson = {
  models: [
    {
      title: "MSA AI Router (Docker — Auto)",
      provider: "openai",
      model: "msa-ai",
      apiBase: "http://localhost:20131/v1",
      apiKey: "sk-msa-local",
      icon: "msa-ai.png",
      roles: ["chat", "edit", "apply"]
    },
    {
      title: "MSA AI (Host Fallback)",
      provider: "openai",
      model: "msa-ai",
      apiBase: "http://localhost:20130/v1",
      apiKey: "sk-msa-local",
      icon: "msa-ai.png",
      roles: ["chat", "edit", "apply"]
    },
    {
      title: "OmniRoute Gateway",
      provider: "openai",
      model: "msa-ai",
      apiBase: "http://localhost:20129/v1",
      apiKey: "sk-omniroute-local",
      icon: "msa-ai.png",
      roles: ["chat"]
    },
    {
      title: "Qwen 2.5 Coder 7B (Direct)",
      provider: "ollama",
      model: "qwen2.5:7b-instruct",
      apiBase: "http://localhost:11435",
      icon: "qwen.png"
    },
    {
      title: "DeepSeek R1 7B (Reasoning)",
      provider: "ollama",
      model: "deepseek-r1:7b",
      apiBase: "http://localhost:11435",
      icon: "deepseek.png"
    },
    {
      title: "Google Gemini 2.5 Flash",
      provider: "gemini",
      model: "gemini-2.5-flash",
      apiKey: "YOUR_GEMINI_API_KEY",
      icon: "gemini.png",
      roles: ["chat", "edit", "apply"]
    },
    {
      title: "Google Gemini 2.5 Pro",
      provider: "gemini",
      model: "gemini-2.5-pro",
      apiKey: "YOUR_GEMINI_API_KEY",
      icon: "gemini.png",
      roles: ["chat", "edit", "apply"]
    }
  ],
  tabAutocompleteModel: {
    title: "MSA Autocomplete (Qwen 0.5B)",
    provider: "ollama",
    model: "qwen2.5:0.5b",
    apiBase: "http://localhost:11435",
    icon: "qwen.png"
  }
};

// Write UTF-8 files
fs.writeFileSync(yamlPath, configYaml, { encoding: 'utf8' });
fs.writeFileSync(jsonPath, JSON.stringify(configJson, null, 2), { encoding: 'utf8' });
fs.writeFileSync(finalYamlPath, configYaml, { encoding: 'utf8' });

console.log('✅ Final clean config synchronized!');
