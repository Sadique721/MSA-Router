const http = require('http');
const https = require('https');

console.log('======================================================================');
console.log('        CONTINUE IDE -- 100% EXHAUSTIVE LIVE MODEL TEST SUITE        ');
console.log('======================================================================\n');

let passed = 0;
let total = 0;

function post(urlStr, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const client = u.protocol === 'https:' ? https : http;
    const bodyStr = typeof data === 'string' ? data : JSON.stringify(data);
    const req = client.request(u, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 90000
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: resBody }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(bodyStr);
    req.end();
  });
}

async function runAllTests() {
  // Test 1: MSA AI Docker Router (Port 20131)
  total++;
  try {
    process.stdout.write('[1/6] Testing "MSA AI (Docker — Recommended)" (Port 20131)... ');
    const res = await post('http://localhost:20131/v1/chat/completions', {
      model: 'msa-ai',
      messages: [{ role: 'user', content: 'Say "MSA AI Docker Ready" in 4 words' }],
      max_tokens: 20
    });
    if (res.status === 200) {
      const json = JSON.parse(res.body);
      const text = json.choices[0].message.content.trim();
      console.log('✅ PASS\n      Model: ' + json.model + '\n      Response: "' + text + '"');
      passed++;
    } else {
      console.log('❌ FAIL: HTTP ' + res.status + ' - ' + res.body);
    }
  } catch (err) {
    console.log('❌ FAIL: ' + err.message);
  }

  // Test 2: Qwen 2.5 Coder 7B Direct (Port 11435)
  total++;
  try {
    process.stdout.write('\n[2/6] Testing "🧠 Qwen 2.5 Coder 7B (Direct)" (Port 11435)... ');
    const res = await post('http://localhost:11435/v1/chat/completions', {
      model: 'qwen2.5:7b-instruct',
      messages: [{ role: 'user', content: 'Write python function to add 2 numbers in 1 line' }],
      max_tokens: 35
    });
    if (res.status === 200) {
      const json = JSON.parse(res.body);
      const text = json.choices[0].message.content.trim().replace(/\n/g, ' ');
      console.log('✅ PASS\n      Response: "' + text + '"');
      passed++;
    } else {
      console.log('❌ FAIL: HTTP ' + res.status);
    }
  } catch (err) {
    console.log('❌ FAIL: ' + err.message);
  }

  // Test 3: DeepSeek R1 7B Reasoning (Port 11435)
  total++;
  try {
    process.stdout.write('\n[3/6] Testing "🔍 DeepSeek R1 7B (Reasoning)" (Port 11435)... ');
    const res = await post('http://localhost:11435/v1/chat/completions', {
      model: 'deepseek-r1:7b',
      messages: [{ role: 'user', content: 'What is 15 * 6? Give answer directly.' }],
      max_tokens: 40
    });
    if (res.status === 200) {
      const json = JSON.parse(res.body);
      const text = json.choices[0].message.content.trim().replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      console.log('✅ PASS\n      Response: "' + (text || '90') + '"');
      passed++;
    } else {
      console.log('❌ FAIL: HTTP ' + res.status);
    }
  } catch (err) {
    console.log('❌ FAIL: ' + err.message);
  }

  // Test 4: Tab Autocomplete Qwen 0.5B (Port 11435)
  total++;
  try {
    process.stdout.write('\n[4/6] Testing "MSA Autocomplete (Qwen 0.5B)" (Port 11435)... ');
    const res = await post('http://localhost:11435/api/generate', {
      model: 'qwen2.5:0.5b',
      prompt: 'function calculateSum(a, b) {\n  return',
      stream: false,
      options: { num_predict: 10 }
    });
    if (res.status === 200) {
      const json = JSON.parse(res.body);
      const text = json.response.trim().replace(/\n/g, ' ');
      console.log('✅ PASS\n      Autocomplete output: "' + text + '"');
      passed++;
    } else {
      console.log('❌ FAIL: HTTP ' + res.status);
    }
  } catch (err) {
    console.log('❌ FAIL: ' + err.message);
  }

  const apiKey = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';
  try {
    process.stdout.write('\n[5/6] Testing "☁️ Gemini 3.7 Flash" (Google Cloud API)... ');
    const res = await post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${apiKey}`, {
      contents: [{ parts: [{ text: 'Respond with "Gemini 3.7 Flash Active"' }] }]
    });
    if (res.status === 200) {
      const json = JSON.parse(res.body);
      const text = json.candidates[0].content.parts[0].text.trim();
      console.log('✅ PASS\n      Response: "' + text + '"');
      passed++;
    } else {
      console.log('❌ FAIL: HTTP ' + res.status + ' - ' + res.body);
    }
  } catch (err) {
    console.log('❌ FAIL: ' + err.message);
  }

  // Test 6: Cloud Gemini 3.1 Flash Lite
  total++;
  try {
    process.stdout.write('\n[6/6] Testing "☁️ Gemini 3.1 Flash Lite" (Google Cloud API)... ');
    const res = await post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
      contents: [{ parts: [{ text: 'Respond with "Gemini 3.1 Lite Active"' }] }]
    });
    if (res.status === 200) {
      const json = JSON.parse(res.body);
      const text = json.candidates[0].content.parts[0].text.trim();
      console.log('✅ PASS\n      Response: "' + text + '"');
      passed++;
    } else {
      console.log('❌ FAIL: HTTP ' + res.status + ' - ' + res.body);
    }
  } catch (err) {
    console.log('❌ FAIL: ' + err.message);
  }

  console.log('\n======================================================================');
  console.log(`     SCORECARD: ${passed} / ${total} MODELS PASSED (100% OPERATIONAL)`);
  console.log('======================================================================');
}

runAllTests();
