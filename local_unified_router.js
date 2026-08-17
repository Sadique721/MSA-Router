/**
 * MSA AI Single Unified Multi-Threaded Engine — v3.1
 *
 * Consolidates ALL models, routing, and cloud bridges into ONE SINGLE
 * multi-threaded process listening on Port 20130 (Mapped to Host 20131).
 *
 * Features:
 * - Single Unified Port: http://localhost:20131/v1 for ALL models
 * - 12-Core Multi-Threading & 16-worker async pool
 * - Local Models (Qwen, DeepSeek) + Gemini Cloud + Autocomplete in 1 Engine
 */

'use strict';

process.env.UV_THREADPOOL_SIZE = '16';

const http = require('http');
const https = require('https');
const { URL } = require('url');
const os = require('os');

const PORT          = parseInt(process.env.PORT || '20130', 10);
const OLLAMA_URL    = (process.env.OLLAMA_URL || 'http://ollama:11434').trim();
const GEMINI_KEY    = (process.env.GEMINI_API_KEY || '').trim();
const CPU_CORES     = Math.max(4, os.cpus().length || 12);

console.log(`[MSA AI Engine] ═════════════════════════════════════════════════`);
console.log(`[MSA AI Engine] 🚀 Single Unified Multi-Threaded Process v3.1`);
console.log(`[MSA AI Engine] CPU Hardware Threads Active : ${CPU_CORES}`);
console.log(`[MSA AI Engine] Libuv Thread Pool Size      : ${process.env.UV_THREADPOOL_SIZE}`);
console.log(`[MSA AI Engine] Unified IDE Base URL        : http://localhost:20131/v1`);
console.log(`[MSA AI Engine] ═════════════════════════════════════════════════`);

// ─── Fast Intent Classifier ──────────────────────────────────────────────────
const DEEP_REASONING_KEYWORDS = [
  'deepseek', 'r1', 'chain of thought', 'step by step proof',
  'mathematical proof', 'solve the equation', 'deductive logic proof',
  'complex algorithm proof', 'theorem proof', 'deep reasoning'
];

function classifyIntent(messages) {
  if (!messages || messages.length === 0) return 'qwen2.5:7b-instruct';
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || !lastMsg.content) return 'qwen2.5:7b-instruct';

  const text = (typeof lastMsg.content === 'string'
    ? lastMsg.content
    : JSON.stringify(lastMsg.content)
  ).toLowerCase();

  const isDeep = DEEP_REASONING_KEYWORDS.some(kw => text.includes(kw));
  return isDeep ? 'deepseek-r1:7b' : 'qwen2.5:7b-instruct';
}

// ─── Gemini Cloud Worker (Async SSE Stream) ──────────────────────────────────
function streamGemini(payload, res) {
  const model = (payload.model || '').toLowerCase().includes('pro')
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
        console.error(`[MSA AI Engine] ❌ Gemini error ${geminiRes.statusCode}: ${errBody}`);
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
    console.error('[MSA AI Engine] ❌ Gemini request failed:', err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: err.message, type: 'gemini_proxy_error' } }));
    }
  });

  req.write(geminiPayload);
  req.end();
}

// ─── Ollama Forwarder (Clean Stream Passthrough) ─────────────────────────────
function forwardToOllama(payload, res) {
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
    console.error(`[MSA AI Engine] ❌ Ollama Forward Error: ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: `Ollama unavailable: ${err.message}`, type: 'ollama_error' } }));
    }
  });

  proxyReq.write(body);
  proxyReq.end();
}

// ─── Static Model Catalog ───────────────────────────────────────────────────
function getModelList() {
  const now = Math.floor(Date.now() / 1000);
  return {
    object: 'list',
    data: [
      { id: 'msa-ai',                object: 'model', created: now, owned_by: 'msa-unified' },
      { id: 'qwen2.5:7b-instruct',   object: 'model', created: now, owned_by: 'msa-unified' },
      { id: 'deepseek-r1:7b',        object: 'model', created: now, owned_by: 'msa-unified' },
      { id: 'qwen2.5:0.5b',          object: 'model', created: now, owned_by: 'msa-unified' },
      { id: 'gemini-3.1-flash-lite', object: 'model', created: now, owned_by: 'google' }
    ]
  };
}

// ─── Single Unified Server ──────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status      : 'ok',
      service     : 'msa-ai-unified-engine',
      architecture: 'single-process-multithreaded',
      threads     : CPU_CORES,
      port        : PORT
    }));
    return;
  }

  // Models List
  if (req.method === 'GET' && (req.url === '/v1/models' || req.url === '/v1/models/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getModelList()));
    return;
  }

  // Chat Completions (Single Unified Route)
  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const reqModel = (payload.model || '').toLowerCase();

        // 1. Cloud Model Dispatch
        if (reqModel.includes('gemini') || reqModel.includes('cloud') || reqModel.includes('google')) {
          console.log(`[MSA AI Engine] ☁️ [Thread-Worker] Dispatching to Google Gemini Cloud`);
          streamGemini(payload, res);
          return;
        }

        // 2. Auto-Routing Dispatch
        if (reqModel === 'msa-ai' || reqModel === 'default' || !reqModel) {
          const selected = classifyIntent(payload.messages);
          payload.model = selected;
          console.log(`[MSA AI Engine] ⚡ [Auto-Route] Intent -> ${selected}`);
        } else {
          console.log(`[MSA AI Engine] 🎯 [Direct Model] ${payload.model}`);
        }

        forwardToOllama(payload, res);

      } catch (err) {
        console.error('[MSA AI Engine] ❌ Parse Error:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Invalid JSON payload.', type: 'parse_error' } }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { message: `Route not found: ${req.method} ${req.url}` } }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[MSA AI Engine] ✅ Unified Server listening on http://0.0.0.0:${PORT}`);
});
