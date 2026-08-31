// fix_mcp_config.js — Writes MCP config as clean UTF-8 without BOM
const fs = require('fs');
const path = require('path');

const mcpConfig = {
  mcpServers: {
    omniroute: {
      command: "node",
      args: ["C:\\Users\\MD SADIQUE AMIN\\AppData\\Roaming\\npm\\node_modules\\omniroute\\dist\\open-sse\\mcp-server\\server.js"],
      env: { OMNIROUTE_BASE_URL: "http://127.0.0.1:20128" }
    },
    fetch: {
      command: "C:\\Users\\MD SADIQUE AMIN\\AppData\\Roaming\\Python\\Python314\\Scripts\\uv.exe",
      args: ["tool", "run", "mcp-server-fetch"],
      env: { PYTHONIOENCODING: "utf-8" }
    },
    filesystem: {
      command: "node",
      args: [
        "C:\\Users\\MD SADIQUE AMIN\\AppData\\Roaming\\npm\\node_modules\\@modelcontextprotocol\\server-filesystem\\dist\\index.js",
        "C:\\Users\\MD SADIQUE AMIN"
      ]
    },
    memory: {
      command: "node",
      args: ["C:\\Users\\MD SADIQUE AMIN\\AppData\\Roaming\\npm\\node_modules\\@modelcontextprotocol\\server-memory\\dist\\index.js"]
    }
  }
};

const targetPath = 'C:\\Users\\MD SADIQUE AMIN\\.gemini\\config\\mcp_config.json';

// Write as clean UTF-8 Buffer (no BOM)
const jsonStr = JSON.stringify(mcpConfig, null, 2);
const buf = Buffer.from(jsonStr, 'utf8'); // pure UTF-8, no BOM
fs.writeFileSync(targetPath, buf);

// Verify: re-read and parse
const readBack = fs.readFileSync(targetPath, 'utf8');
const firstCharCode = readBack.charCodeAt(0);
const hasBOM = firstCharCode === 0xFEFF;

try {
  const parsed = JSON.parse(readBack);
  const serverNames = Object.keys(parsed.mcpServers).join(', ');
  console.log(`✅ MCP config written successfully`);
  console.log(`   BOM present: ${hasBOM} (should be false)`);
  console.log(`   Servers: ${serverNames}`);
  console.log(`   File size: ${buf.length} bytes`);
} catch (e) {
  console.error(`❌ Parse failed after write: ${e.message}`);
  process.exit(1);
}
