#!/usr/bin/env node
/**
 * MSA Smart Task Router — Intelligently routes tasks to the cheapest capable model
 * 
 * Logic:
 * - SIMPLE code tasks (< 200 chars, single file) → Local Ollama (ZERO tokens)
 * - MEDIUM tasks (explanation, debug, refactor) → Gemini via MSA Router (own keys)
 * - HEAVY reasoning (architecture, multi-file, complex logic) → Nemotron via MSA Router
 * - CRITICAL/PLANNING → Antigravity (tokens used only here)
 * 
 * Usage: node smart_router.js --prompt "your task" [--mode auto|local|gemini|nemotron]
 */

const http = require('http');
const https = require('https');

const PORTS = {
  ollama: 11435,
  msaRouter: 20130,
  omniRoute: 20128,
};

const MODELS = {
  local: 'qwen2.5:7b-instruct',
  gemini: 'gemini-3.6-flash',
  nemotron: 'nvidia/nemotron-3.5-lightning-30b-a3b',
};

// Task complexity classifier — keywords WIN over length
function classifyTask(prompt) {
  const lower = prompt.toLowerCase();
  const len = prompt.length;

  // Simple/trivial keywords → always local regardless of length
  const simpleKeywords = ['fix typo', 'rename', 'format', 'indent', 'add comment', 'print', 'console.log', 'variable name'];
  // Medium complexity keywords → gemini (own keys, zero Antigravity tokens)
  const mediumKeywords = ['explain', 'debug', 'refactor', 'optimize', 'why', 'what does', 'how does', 'error', 'bug', 'what is', 'difference'];
  // Heavy complexity keywords → nemotron
  const heavyKeywords = ['architecture', 'design', 'implement', 'create system', 'build', 'plan', 'multi', 'complex', 'full stack'];

  // KEYWORDS FIRST — they always win over length
  if (simpleKeywords.some(k => lower.includes(k))) return 'local';
  if (mediumKeywords.some(k => lower.includes(k))) return 'gemini';
  if (heavyKeywords.some(k => lower.includes(k))) return 'nemotron';

  // Length as tiebreaker when no keyword matches
  if (len < 80) return 'local';
  if (len < 500) return 'gemini';
  return 'nemotron';
}

async function queryModel(mode, prompt) {
  return new Promise((resolve, reject) => {
    let host = '127.0.0.1';
    let port, path, model;

    if (mode === 'local') {
      port = PORTS.ollama;
      path = '/api/generate';
      model = MODELS.local;
      
      const body = JSON.stringify({ model, prompt, stream: false });
      const req = http.request({ host, port, path, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve({ mode: 'LOCAL (Zero tokens)', response: JSON.parse(data).response }); }
          catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    } else {
      port = PORTS.msaRouter;
      path = '/v1/chat/completions';
      model = mode === 'gemini' ? MODELS.gemini : MODELS.nemotron;
      
      const body = JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false
      });
      const req = http.request({ host, port, path, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body),
          'Authorization': 'Bearer sk-msa-local' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { 
            const parsed = JSON.parse(data);
            resolve({ 
              mode: mode === 'gemini' ? 'GEMINI (Own key, Zero tokens)' : 'NEMOTRON (NIM, Zero tokens)', 
              response: parsed.choices?.[0]?.message?.content || data 
            });
          } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    }
  });
}

async function main() {
  const args = process.argv.slice(2);
  const promptIdx = args.indexOf('--prompt');
  const modeIdx = args.indexOf('--mode');
  
  const prompt = promptIdx >= 0 ? args[promptIdx + 1] : args[0];
  let mode = modeIdx >= 0 ? args[modeIdx + 1] : 'auto';

  if (!prompt) {
    console.log('Usage: node smart_router.js --prompt "your task" [--mode auto|local|gemini|nemotron]');
    process.exit(1);
  }

  if (mode === 'auto') {
    mode = classifyTask(prompt);
    console.log(`\n🧠 Auto-classified task as: ${mode.toUpperCase()}`);
  }

  if (mode === 'antigravity') {
    console.log('\n⚠️  Task complexity requires Antigravity (tokens will be used).');
    console.log('Consider breaking this task into smaller parts for token savings.');
    process.exit(0);
  }

  try {
    console.log(`\n⏳ Routing to: ${mode}...`);
    const result = await queryModel(mode, prompt);
    console.log(`\n✅ Response via ${result.mode}:\n`);
    console.log(result.response);
  } catch (err) {
    console.error(`\n❌ ${mode} failed: ${err.message}`);
    // Auto-fallback
    if (mode === 'local') {
      console.log('🔄 Falling back to Gemini...');
      try {
        const result = await queryModel('gemini', prompt);
        console.log(`\n✅ Response via ${result.mode}:\n`);
        console.log(result.response);
      } catch (err2) {
        console.error('❌ All local routes failed. Use Antigravity directly.');
      }
    }
  }
}

main();
