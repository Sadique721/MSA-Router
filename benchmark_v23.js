const http = require('http');

console.log('======================================================================');
console.log('     MSA AI v2.3 -- COMPREHENSIVE MULTI-MODEL LIVE BENCHMARK         ');
console.log('======================================================================\n');

function testEndpoint(name, urlStr, payload) {
  return new Promise((resolve) => {
    const u = new URL(urlStr);
    const bodyStr = JSON.stringify(payload);
    const start = Date.now();

    const req = http.request(u, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        const time = ((Date.now() - start) / 1000).toFixed(2);
        if (res.statusCode === 200) {
          console.log(`✅ [PASS] ${name.padEnd(35)} | HTTP 200 | Time: ${time}s`);
        } else {
          console.log(`❌ [FAIL] ${name.padEnd(35)} | HTTP ${res.statusCode} | Time: ${time}s`);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log(`❌ [ERR]  ${name.padEnd(35)} | ${e.message}`);
      resolve();
    });

    req.write(bodyStr);
    req.end();
  });
}

async function run() {
  await testEndpoint('MSA AI (Docker Auto-Route)', 'http://localhost:20131/v1/chat/completions', {
    model: 'msa-ai',
    messages: [{ role: 'user', content: 'Say hello in one word' }],
    max_tokens: 10
  });

  await testEndpoint('OmniRoute AI Gateway', 'http://localhost:20129/v1/chat/completions', {
    model: 'msa-ai',
    messages: [{ role: 'user', content: 'Say hello in one word' }],
    max_tokens: 10
  });

  await testEndpoint('Qwen 2.5 Coder 7B (Direct)', 'http://localhost:11435/v1/chat/completions', {
    model: 'qwen2.5:7b-instruct',
    messages: [{ role: 'user', content: 'Say hello in one word' }],
    max_tokens: 10
  });

  await testEndpoint('Gemini 3.1 Flash (Cloud Bridge)', 'http://localhost:20131/v1/chat/completions', {
    model: 'gemini-3.1-flash-lite',
    messages: [{ role: 'user', content: 'Say hello in one word' }],
    max_tokens: 10
  });

  await testEndpoint('MSA Autocomplete (Qwen 0.5B)', 'http://localhost:11435/api/generate', {
    model: 'qwen2.5:0.5b',
    prompt: 'function add(',
    stream: false,
    options: { num_predict: 10 }
  });

  console.log('\n======================================================================');
  console.log('                 ALL BENCHMARK CHECKS COMPLETED                       ');
  console.log('======================================================================');
}

run();
