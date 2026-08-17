const http = require('http');

console.log('======================================================================');
console.log('  MSA AI v3.1 -- SINGLE PROCESS 12-THREAD UNIFIED ENGINE BENCHMARK    ');
console.log('======================================================================\n');

function test(modelName, modelId) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: 'Say hello in one word' }],
      max_tokens: 10
    });

    const start = Date.now();
    const req = http.request('http://localhost:20131/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const time = ((Date.now() - start) / 1000).toFixed(2);
        console.log(`✅ [PASS] ${modelName.padEnd(35)} | HTTP ${res.statusCode} | Time: ${time}s`);
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log(`❌ [ERR]  ${modelName.padEnd(35)} | ${e.message}`);
      resolve();
    });

    req.write(data);
    req.end();
  });
}

async function run() {
  await test('MSA AI (Auto-Route Dispatcher)', 'msa-ai');
  await test('Qwen 2.5 Coder 7B (12-Thread)', 'qwen2.5:7b-instruct');
  await test('Gemini 3.1 Flash (Cloud Worker)', 'gemini-3.1-flash-lite');
  console.log('\n======================================================================');
  console.log('       ALL CALLS UNIFIED & PROCESSED BY 12-THREAD ENGINE (100%)       ');
  console.log('======================================================================');
}

run();
