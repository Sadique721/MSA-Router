/**
 * MSA AI Unified Router — v2.3 (High Performance & Multi-Cloud Bridge)
 *
 * Features:
 * 1. Fast Smart Routing: Code & General Chat → Qwen 2.5 Coder 7B (<2s on CPU)
 *                        Deep Logic & Proofs   → DeepSeek-R1 7B
 * 2. CPU Multi-threading: Automatically sets num_thread = 10 for max CPU speed.
 * 3. Gemini Cloud Bridge: Converts OpenAI requests to Google Gemini REST API
 *                         and streams OpenAI SSE chunks back (Zero "fetch failed").
 * 4. Model Catalog: Lists all local & cloud models for IDE dropdowns.
 */

'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT          = parseInt(process.env.PORT || '20130', 10);
const OLLAMA_URL    = (process.env.OLLAMA_URL || 'http://ollama:11434').trim();
const OMNIROUTE_URL = (process.env.OMNIROUTE_URL || 'http://omniroute:20129/v1/chat/completions').trim();
const GEMINI_KEY    = (process.env.GEMINI_API_KEY || '').trim();

console.log(`[MSA AI] ══════════════════════════════════════════════════════`);
console.log(`[MSA AI] 🚀 MSA AI High-Performance Router v2.3 Initialized`);
console.log(`[MSA AI] Ollama Backend : ${OLLAMA_URL}`);
console.log(`[MSA AI] OmniRoute      : ${OMNIROUTE_URL}`);
console.log(`[MSA AI] Port           : ${PORT}`);
console.log(`[MSA AI] ══════════════════════════════════════════════════════`);

// ─── Classification Engine ──────────────────────────────────────────────────
// Only route to DeepSeek-R1 if the prompt explicitly asks for complex chain-of-thought
const DEEP_REASONING_KEYWORDS = [
  'deepseek', 'r1', 'chain of thought', 'step by step proof',
  'mathematical proof', 'solve the equation', 'deductive logic proof',
  'complex algorithm proof', 'theorem proof', 'deep reasoning'
];

function classifyPrompt(messages) {
  if (!messages || messages.length === 0) return 'coding';
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || !lastMsg.content) return 'coding';

  const text = (typeof lastMsg.content === 'string'
    ? lastMsg.content
    : JSON.stringify(lastMsg.content)
  ).toLowerCase();

  const isDeepReasoning = DEEP_REASONING_KEYWORDS.some(kw => text.includes(kw));
  return isDeepReasoning ? 'deepseek-r1:7b' : 'qwen2.5:7b-instruct';
}

// ─── Gemini Cloud Proxy (Converts OpenAI -> Gemini API -> OpenAI Stream) ─────
function handleGeminiProxy(payload, res) {
  const model = (payload.model || '').toLowerCase().includes('lite')
    ? 'gemini-3.1-flash-lite'
    : 'gemini-3.1-flash-lite';

  const contents = (payload.messages || []).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
  }));

  const geminiPayload = JSON.stringify({ contents });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`;
  const parsed = new URL(url);

  const req = https.request({
    hostname: parsed.hostname,
    port: 443,
    path: parsed.pathname + parsed.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(geminiPayload)
    }
  }, (geminiRes) => {
    if (geminiRes.statusCode !== 200) {
      let errBody = '';
      geminiRes.on('data', chunk => errBody += chunk);
      geminiRes.on('end', () => {
        console.error(`[MSA AI] ❌ Gemini Error (${geminiRes.statusCode}): ${errBody}`);
        res.writeHead(geminiRes.statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: `Gemini API error: ${errBody}`, type: 'gemini_error' } }));
      });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    let buffer = '';
    geminiRes.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
              const text = data.candidates[0].content.parts[0].text || '';
              const openAiChunk = {
                id: 'chatcmpl-' + Date.now(),
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: model,
                choices: [{
                  index: 0,
                  delta: { content: text },
                  finish_reason: null
                }]
              };
              res.write(`data: ${JSON.stringify(openAiChunk)}\n\n`);
            }
          } catch (e) {}
        }
      }
    });

    geminiRes.on('end', () => {
      res.write('data: [DONE]\n\n');
      res.end();
    });
  });

  req.on('error', (err) => {
    console.error('[MSA AI] ❌ Gemini request failed:', err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: err.message, type: 'gemini_proxy_error' } }));
    }
  });

  req.write(geminiPayload);
  req.end();
}

// ─── Ollama Forwarder (With 10-Thread CPU Optimization) ──────────────────────
function forwardToOllama(payload, res) {
  // Inject CPU multi-threading performance options
  if (!payload.options) payload.options = {};
  payload.options.num_thread = 10;
  payload.options.temperature = payload.temperature || 0.6;

  const body = JSON.stringify(payload);
  const targetUrl = `${OLLAMA_URL}/v1/chat/completions`;
  const parsed = new URL(targetUrl);

  const options = {
    hostname : parsed.hostname,
    port     : parsed.port || 11434,
    path     : parsed.pathname + (parsed.search || ''),
    method   : 'POST',
    headers  : {
      'Content-Type'   : 'application/json',
      'Content-Length' : Buffer.byteLength(body),
      'Authorization'  : 'Bearer ollama-local'
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    const safeHeaders = {};
    ['content-type', 'transfer-encoding', 'content-encoding'].forEach(h => {
      if (proxyRes.headers[h]) safeHeaders[h] = proxyRes.headers[h];
    });
    res.writeHead(proxyRes.statusCode, safeHeaders);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[MSA AI] ❌ Ollama Forward Error: ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: `Ollama unavailable: ${err.message}`, type: 'ollama_error' } }));
    }
  });

  proxyReq.write(body);
  proxyReq.end();
}

// ─── Static Models List ─────────────────────────────────────────────────────
function getModelList() {
  const now = Math.floor(Date.now() / 1000);
  return {
    object: 'list',
    data: [
      { id: 'msa-ai',                object: 'model', created: now, owned_by: 'msa-local' },
      { id: 'qwen2.5:7b-instruct',   object: 'model', created: now, owned_by: 'msa-local' },
      { id: 'deepseek-r1:7b',        object: 'model', created: now, owned_by: 'msa-local' },
      { id: 'qwen2.5:0.5b',          object: 'model', created: now, owned_by: 'msa-local' },
      { id: 'gemini-3.1-flash-lite', object: 'model', created: now, owned_by: 'google' }
    ]
  };
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /health
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'msa-ai-router', version: '2.3', port: PORT }));
    return;
  }

  // GET /v1/models
  if (req.method === 'GET' && (req.url === '/v1/models' || req.url === '/v1/models/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getModelList()));
    return;
  }

  // POST /v1/chat/completions
  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const reqModel = (payload.model || '').toLowerCase();

        // 1. If user explicitly requested Gemini
        if (reqModel.includes('gemini') || reqModel.includes('google')) {
          console.log('[MSA AI] ☁️ Routing to Google Gemini API (Streamed)');
          handleGeminiProxy(payload, res);
          return;
        }

        // 2. Local Model Routing
        if (reqModel === 'msa-ai' || reqModel === 'default' || !reqModel) {
          const selectedModel = classifyPrompt(payload.messages);
          payload.model = selectedModel;
          console.log(`[MSA AI] ⚡ Smart Routing -> ${selectedModel}`);
        }

        forwardToOllama(payload, res);

      } catch (err) {
        console.error('[MSA AI] ❌ Parse Error:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Invalid JSON payload.', type: 'parse_error' } }));
      }
    });
    return;
  }

  // 404 Fallback
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { message: `Endpoint not found: ${req.method} ${req.url}` } }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[MSA AI] ✅ Listening on http://0.0.0.0:${PORT}`);
});
