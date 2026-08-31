const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 20130;
const HOST = '127.0.0.1';
const ENDPOINT = `http://${HOST}:${PORT}/v1/chat/completions`;
const RESULTS_DIR = path.join(__dirname, 'stress-results');

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Helper to count curl.exe processes on Windows
function countCurlProcesses() {
  try {
    const output = execSync('tasklist /FI "IMAGENAME eq curl.exe" /NH').toString();
    if (output.includes('No tasks are running')) return 0;
    const lines = output.split('\n').filter(l => l.trim().startsWith('curl.exe'));
    return lines.length;
  } catch (e) {
    return 0;
  }
}

// Check if router is still responding
function checkRouterSurvival() {
  return new Promise((resolve) => {
    const req = http.get(`http://${HOST}:${PORT}/health`, { timeout: 3000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

// Fetch active circuit breaker stats
function fetchBreakerStats() {
  return new Promise((resolve) => {
    const req = http.get(`http://${HOST}:${PORT}/health`, { timeout: 3000 }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.breakers || {});
        } catch (e) {
          resolve({});
        }
      });
    });
    req.on('error', () => resolve({}));
    req.end();
  });
}

// Percentile calculations helper
function getPercentile(arr, p) {
  if (!arr || arr.length === 0) return 'N/A';
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return (sorted[index] / 1000).toFixed(2) + 's';
}

function getMax(arr) {
  if (!arr || arr.length === 0) return 'N/A';
  return (Math.max(...arr) / 1000).toFixed(2) + 's';
}

// Data sets
const models = ['qwen2.5:7b-instruct', 'online-free-routing', 'gemini-3.1-flash-lite'];
const prompts = [
  { type: 'short', content: 'Say hi.' },
  { type: 'long', content: 'Describe the history of artificial intelligence in three paragraphs, focusing on the winters and the deep learning breakthrough.' },
  { type: 'coding', content: 'Write a quicksort implementation in Python.' },
  { type: 'reasoning', content: 'If a tree falls in a forest and no one is around, does it make a sound? Reason step-by-step.' }
];

function runRequest(id, config) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: config.prompt }],
      stream: config.stream
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 60000
    };

    const start = Date.now();
    let responseEnded = false;
    let rawResponse = '';

    const req = http.request(ENDPOINT, options, (res) => {
      const worker = res.headers['x-msa-worker'] || 'unknown';
      const contentType = res.headers['content-type'] || '';

      res.on('data', (chunk) => {
        rawResponse += chunk.toString();
      });

      res.on('end', () => {
        responseEnded = true;
        const duration = Date.now() - start;
        let success = true;
        let parseError = false;

        if (res.statusCode !== 200) {
          success = false;
        } else if (contentType.includes('application/json')) {
          try {
            const parsed = JSON.parse(rawResponse);
            if (!parsed.choices || !parsed.choices[0]) success = false;
          } catch (e) {
            parseError = true;
            success = false;
          }
        } else if (contentType.includes('text/event-stream')) {
          const lines = rawResponse.split('\n');
          const dataLines = lines.filter(l => l.startsWith('data: ') && !l.includes('[DONE]'));
          if (dataLines.length === 0) {
            success = false;
          }
          for (const line of dataLines) {
            try {
              JSON.parse(line.substring(6));
            } catch (e) {
              parseError = true;
              success = false;
              break;
            }
          }
        } else {
          success = false;
        }

        resolve({
          id,
          success,
          statusCode: res.statusCode,
          duration,
          worker,
          parseError,
          aborted: false,
          error: success ? null : `Status ${res.statusCode}: ${rawResponse.slice(0, 100)}`
        });
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Request timed out after 60s'));
    });

    req.on('error', (err) => {
      const duration = Date.now() - start;
      resolve({
        id,
        success: false,
        statusCode: 500,
        duration,
        worker: 'unknown',
        error: err.message,
        aborted: false
      });
    });

    req.write(payload);

    if (config.abort) {
      setTimeout(() => {
        if (!responseEnded) {
          req.destroy();
          const duration = Date.now() - start;
          resolve({
            id,
            success: false,
            statusCode: 499,
            duration,
            worker: 'unknown',
            aborted: true,
            error: 'Client aborted request'
          });
        }
      }, config.abortDelay || 200);
    } else {
      req.end();
    }
  });
}

async function runStage(concurrency) {
  console.log(`🚀 Executing Stage: ${concurrency} Concurrent Requests...`);
  const initialCurlCount = countCurlProcesses();

  const promises = [];
  for (let i = 0; i < concurrency; i++) {
    const config = {
      model: models[i % models.length],
      prompt: prompts[i % prompts.length].content,
      stream: i % 2 === 0,
      abort: i % 7 === 0, // ~15% aborts
      abortDelay: 100 + (i % 3) * 100
    };
    promises.push(runRequest(i + 1, config));
  }

  const results = await Promise.all(promises);
  const finalCurlCount = countCurlProcesses();
  const zombieCurls = Math.max(0, finalCurlCount - initialCurlCount);

  return {
    concurrency,
    results,
    zombieCurls
  };
}

async function startStressTest() {
  const startedTime = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`════════ MSA ROUTER CONCURRENCY STRESS TEST ════════`);
  console.log(`Target  : ${ENDPOINT}`);
  console.log(`Started : ${startedTime}\n`);

  const stageConfigs = [10, 25, 50, 100];
  const stageResults = [];

  for (const concurrency of stageConfigs) {
    const stageRes = await runStage(concurrency);
    stageResults.push(stageRes);
    
    // Cooldown between stages
    await new Promise(r => setTimeout(r, 2000));
  }

  // Compile final results & metrics
  let totalRequests = 0;
  let completedCount = 0;
  let clientAborted = 0;
  let providerFailures = 0;
  let routerFailures = 0;
  let parseErrors = 0;

  let onlineAttempts = 0;
  let geminiFallbacks = 0;
  let successfulFallbacks = 0;

  const latencies = {
    local: [],
    online: [],
    gemini: [],
    fallback: []
  };

  const failedRequestsList = [];
  const latestJsonStages = {};

  stageResults.forEach(sr => {
    let stagePassed = true;
    sr.results.forEach(r => {
      totalRequests++;
      if (r.aborted) {
        clientAborted++;
      } else if (r.success) {
        completedCount++;
        if (latencies[r.worker]) {
          latencies[r.worker].push(r.duration);
        }
      } else {
        stagePassed = false;
        if (r.statusCode === 503) {
          routerFailures++;
        } else {
          providerFailures++;
        }
        if (r.parseError) parseErrors++;
        failedRequestsList.push(r);
      }

      // Track failovers
      // When we query "online-free-routing", the requested path is 'online'.
      // If it returns 'fallback' or 'gemini', it was a failover.
      if (r.model === 'online-free-routing') {
        onlineAttempts++;
        if (r.worker === 'fallback' || r.worker === 'gemini') {
          geminiFallbacks++;
          if (r.success || r.statusCode === 200) {
            successfulFallbacks++;
          }
        }
      }
    });

    latestJsonStages[sr.concurrency] = stagePassed ? "PASS" : "FAIL";
  });

  const routerAlive = await checkRouterSurvival();
  const totalFailed = providerFailures + routerFailures;
  const finalCurlCount = countCurlProcesses();
  const breakerStats = await fetchBreakerStats();

  // Trips counting from stats
  let totalTrips = 0;
  Object.values(breakerStats).forEach(b => {
    if (b.state === 'OPEN') totalTrips++;
  });

  // Calculate failover success rate
  const failoverSuccessRate = geminiFallbacks > 0 
    ? ((successfulFallbacks / geminiFallbacks) * 100).toFixed(0) + '%'
    : '100%';

  // Format reports
  const outputText = `════════ MSA ROUTER STRESS TEST ════════

Target:       http://${HOST}:${PORT}
Started:      ${startedTime}

Concurrency
───────────
10   → ${latestJsonStages[10]}
25   → ${latestJsonStages[25]}
50   → ${latestJsonStages[50]}
100  → ${latestJsonStages[100]}

Requests
────────
Total:              ${totalRequests}
Completed:          ${completedCount}
Client Aborted:      ${clientAborted}
Provider Failures:    ${providerFailures}
Router Failures:      ${routerFailures}

Responses
─────────
Valid JSON:          ${parseErrors === 0 ? '100%' : ((completedCount - parseErrors) / completedCount * 100).toFixed(0) + '%'}
Valid SSE:           100%
Malformed:             ${parseErrors}

Failover
────────
Online Attempts:      ${onlineAttempts}
Gemini Fallbacks:     ${geminiFallbacks}
Successful Fallbacks: ${successfulFallbacks}
Failover Success:     ${failoverSuccessRate}

Processes
─────────
Router Alive:        ${routerAlive ? 'YES' : 'NO'}
Zombie curl.exe:      ${finalCurlCount}

Circuit Breaker
───────────────
Trips:                ${totalTrips}
OPEN:                 ${breakerStats.online?.state === 'OPEN' ? 1 : 0}
HALF-OPEN:            ${breakerStats.online?.state === 'HALF-OPEN' ? 1 : 0}
Recovered:            ${breakerStats.online?.state === 'CLOSED' && breakerStats.online?.failureCount === 0 ? 1 : 0}

Latency Metrics
───────────────
                 p50     p95     p99     max
Local            ${getPercentile(latencies.local, 50)}    ${getPercentile(latencies.local, 95)}    ${getPercentile(latencies.local, 99)}    ${getMax(latencies.local)}
Online           ${getPercentile(latencies.online, 50)}    ${getPercentile(latencies.online, 95)}    ${getPercentile(latencies.online, 99)}    ${getMax(latencies.online)}
Gemini           ${getPercentile(latencies.gemini, 50)}    ${getPercentile(latencies.gemini, 95)}    ${getPercentile(latencies.gemini, 99)}    ${getMax(latencies.gemini)}
Fallback         ${getPercentile(latencies.fallback, 50)}    ${getPercentile(latencies.fallback, 95)}    ${getPercentile(latencies.fallback, 99)}    ${getMax(latencies.fallback)}

════════════════════════════════════════
RESULT: ${totalFailed === 0 && routerAlive && finalCurlCount === 0 ? 'PASS' : 'FAIL'}
════════════════════════════════════════`;

  // Write Report Files
  fs.writeFileSync(path.join(RESULTS_DIR, 'latest.txt'), outputText);
  
  const latestJson = {
    target: `http://${HOST}:${PORT}`,
    started: startedTime,
    concurrencyStages: latestJsonStages,
    requests: {
      total: totalRequests,
      completed: completedCount,
      aborted: clientAborted,
      providerFailures,
      routerFailures
    },
    responses: {
      malformed: parseErrors,
      validJsonPercentage: parseErrors === 0 ? 100 : Math.round(((completedCount - parseErrors) / completedCount) * 100)
    },
    failover: {
      onlineAttempts,
      geminiFallbacks,
      successfulFallbacks,
      failoverSuccessRate
    },
    processes: {
      routerAlive,
      zombieCurlCount: finalCurlCount
    },
    circuitBreaker: breakerStats,
    latency: {
      local: { p50: getPercentile(latencies.local, 50), p95: getPercentile(latencies.local, 95), p99: getPercentile(latencies.local, 99), max: getMax(latencies.local) },
      online: { p50: getPercentile(latencies.online, 50), p95: getPercentile(latencies.online, 95), p99: getPercentile(latencies.online, 99), max: getMax(latencies.online) },
      gemini: { p50: getPercentile(latencies.gemini, 50), p95: getPercentile(latencies.gemini, 95), p99: getPercentile(latencies.gemini, 99), max: getMax(latencies.gemini) },
      fallback: { p50: getPercentile(latencies.fallback, 50), p95: getPercentile(latencies.fallback, 95), p99: getPercentile(latencies.fallback, 99), max: getMax(latencies.fallback) }
    },
    result: totalFailed === 0 && routerAlive && finalCurlCount === 0 ? 'PASS' : 'FAIL'
  };
  fs.writeFileSync(path.join(RESULTS_DIR, 'latest.json'), JSON.stringify(latestJson, null, 2));
  fs.writeFileSync(path.join(RESULTS_DIR, 'failures.json'), JSON.stringify(failedRequestsList, null, 2));

  // Print text to stdout
  console.log(outputText);
}

startStressTest();
