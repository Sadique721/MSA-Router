/**
 * MSA AI Unified Router — v2.2
 *
 * Intelligent local AI proxy that classifies prompts and routes them
 * to the best available model. Supports two modes:
 *
 * MODE 1 — DIRECT OLLAMA (default inside Docker, OLLAMA_URL is set)
 *   Routes directly to the Ollama container at OLLAMA_URL.
 *   Used by msa-router container → talks to msa-ollama container.
 *
 * MODE 2 — OMNI-ROUTE PROXY (OLLAMA_URL is NOT set)
 *   Routes to OmniRoute at OMNIROUTE_URL with ollama-local/ prefix.
 *   Used on host machine where OmniRoute manages local + cloud models.
 *
 * ENDPOINTS:
 *   GET  /health              → health check JSON
 *   GET  /v1/models           → model list (static or passthrough)
 *   POST /v1/chat/completions → smart-routed completions
 */

'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT          = parseInt(process.env.PORT || '20130', 10);
const OLLAMA_URL    = (process.env.OLLAMA_URL || '').trim();
const OMNIROUTE_URL = (process.env.OMNIROUTE_URL || 'http://omniroute:20129/v1/chat/completions').trim();

// ─── Routing Mode Detection ─────────────────────────────────────────────────
const DIRECT_MODE = !!OLLAMA_URL;

const CODING_MODEL    = DIRECT_MODE ? 'qwen2.5:7b-instruct'  : 'ollama-local/qwen2.5:7b-instruct';
const REASONING_MODEL = DIRECT_MODE ? 'deepseek-r1:7b'       : 'ollama-local/deepseek-r1:7b';

console.log(`[MSA AI] ──────────────────────────────────────────`);
console.log(`[MSA AI] 🚀 Starting MSA AI Unified Router v2.2`);
console.log(`[MSA AI] Mode    : ${DIRECT_MODE ? 'DIRECT → Ollama' : 'PROXY  → OmniRoute'}`);
if (DIRECT_MODE) {
  console.log(`[MSA AI] Ollama  : ${OLLAMA_URL}`);
} else {
  console.log(`[MSA AI] OmniRoute: ${OMNIROUTE_URL}`);
}
console.log(`[MSA AI] ──────────────────────────────────────────`);

// ─── Prompt Classifier ──────────────────────────────────────────────────────
const REASONING_KEYWORDS = [
  'think', 'reason', 'explain', 'why', 'logic', 'math', 'algorithm',
  'solve', 'complex', 'troubleshoot', 'how does', 'step by step',
  'deepseek', 'r1', 'philosophy', 'compare', 'analysis', 'conceptual',
  'prove', 'deduce', 'infer', 'hypothesis', 'theorem', 'debug', 'trace',
  'what is', 'when should', 'difference between'
];

function classifyPrompt(messages) {
  if (!messages || messages.length === 0) return 'coding';

  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || !lastMsg.content) return 'coding';

  const text = (typeof lastMsg.content === 'string'
    ? lastMsg.content
    : JSON.stringify(lastMsg.content)
  ).toLowerCase();

  const isReasoning = REASONING_KEYWORDS.some(kw => text.includes(kw));
  return isReasoning ? 'reasoning' : 'coding';
}

// ─── HTTP/HTTPS Proxy Helper ─────────────────────────────────────────────────
function forwardRequest(targetUrl, payload, res) {
  const parsed = new URL(targetUrl);
  const body   = JSON.stringify(payload);
  const lib    = parsed.protocol === 'https:' ? https : http;

  const options = {
    hostname : parsed.hostname,
    port     : parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path     : parsed.pathname + (parsed.search || ''),
    method   : 'POST',
    headers  : {
      'Content-Type'   : 'application/json',
      'Content-Length' : Buffer.byteLength(body),
      'Authorization'  : 'Bearer ollama-no-key'
    }
  };

  const proxyReq = lib.request(options, (proxyRes) => {
    const safeHeaders = {};
    ['content-type', 'transfer-encoding', 'content-encoding'].forEach(h => {
      if (proxyRes.headers[h]) safeHeaders[h] = proxyRes.headers[h];
    });
    res.writeHead(proxyRes.statusCode, safeHeaders);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[MSA AI] ❌ Forward error → ${targetUrl} : ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: {
          message: `MSA AI router could not reach backend: ${err.message}`,
          type: 'proxy_error',
          backend: targetUrl
        }
      }));
    }
  });

  proxyReq.write(body);
  proxyReq.end();
}

// ─── Static model list ───────────────────────────────────────────────────────
function staticModelList() {
  const now = Math.floor(Date.now() / 1000);
  return {
    object: 'list',
    data: [
      { id: 'msa-ai',              object: 'model', created: now, owned_by: 'msa-local' },
      { id: 'qwen2.5:7b-instruct', object: 'model', created: now, owned_by: 'msa-local' },
      { id: 'deepseek-r1:7b',      object: 'model', created: now, owned_by: 'msa-local' },
      { id: 'qwen2.5:0.5b',        object: 'model', created: now, owned_by: 'msa-local' }
    ]
  };
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // CORS — allow all origins (local-only service)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── GET /health ─────────────────────────────────────────────────────────
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status  : 'ok',
      service : 'msa-ai-router',
      version : '2.2',
      mode    : DIRECT_MODE ? 'direct-ollama' : 'omni-route',
      port    : PORT,
      backend : DIRECT_MODE ? OLLAMA_URL : OMNIROUTE_URL
    }));
    return;
  }

  // ── GET /v1/models ──────────────────────────────────────────────────────
  if (req.method === 'GET' && (req.url === '/v1/models' || req.url === '/v1/models/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(staticModelList()));
    return;
  }

  // ── POST /v1/chat/completions ────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const type    = classifyPrompt(payload.messages);
        const model   = type === 'reasoning' ? REASONING_MODEL : CODING_MODEL;

        // Override model (router always picks the best one)
        payload.model = model;

        console.log(`[MSA AI] 📨 ${type.toUpperCase().padEnd(9)} → ${model}`);

        const targetUrl = DIRECT_MODE
          ? `${OLLAMA_URL}/v1/chat/completions`
          : OMNIROUTE_URL;

        forwardRequest(targetUrl, payload, res);

      } catch (err) {
        console.error('[MSA AI] ❌ Payload parse error:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Invalid JSON payload.', type: 'parse_error' } }));
      }
    });
    return;
  }

  // ── 404 ──────────────────────────────────────────────────────────────────
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { message: `Route not found: ${req.method} ${req.url}` } }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[MSA AI] ✅ Listening on  http://0.0.0.0:${PORT}`);
  console.log(`[MSA AI] IDE endpoint:    http://localhost:${PORT}/v1`);
  console.log(`[MSA AI] Health check:    http://localhost:${PORT}/health`);
});
