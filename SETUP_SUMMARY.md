# MSA AI Stack â€” GA Production Setup Summary
Repository: https://github.com/Sadique721/MSA-Router (main code)
Backup/Storage: https://github.com/Sadique721/storage (this repo)
Date: 2026-08-31 19:01

## Active Services
- Ollama: 127.0.0.1:11435 (qwen2.5:7b-instruct, deepseek-r1:7b, qwen2.5:0.5b)
- MSA Router: 127.0.0.1:20130 (7 models, Gemini key rotation)
- OmniRoute: 127.0.0.1:20128 (NVIDIA Nemotron, online routing)

## Key Files
- local_unified_router.js â€” Main router (port 20130)
- Start-All-Services.ps1 â€” Hourly watchdog + autostart
- preflight_test.js â€” 12-gate verification suite
- smart_router.js â€” Auto task classifier (saves Antigravity tokens)
- fix_mcp_config.js â€” MCP config BOM fixer

## MCP Servers (Antigravity)
- filesystem: Local file R/W (saves 30-60% tokens)
- memory: Persistent knowledge graph (saves 40-70% tokens)
- fetch: URL fetcher (saves browser subagent calls)
- omniroute: Gemini 4-key rotation gateway

## Continue IDE Config
Path: C:\Users\MD SADIQUE AMIN\.continue\config.json
All endpoints use 127.0.0.1 (IPv4, fixes IntelliJ loopback bug)
11 models configured across VS Code, IntelliJ, Antigravity

## Autostart
Startup folder: Start-MSA-AI-Stack.bat -> Start-All-Services.ps1
Runs hidden (-WindowStyle Hidden) on every Windows login
Self-heals every 1 hour automatically

## Last Verified
Preflight Test: 12/12 PASS, 0 FAIL
## OmniRoute DB Issue — Rule & Fix Procedure

### Trigger Symptoms:
`
[DB] Changing cache_size from 65536KB to 16384KB
[DB] cache_size changed to 16384KB
[DB] SQLite database ready: C:\Users\MD SADIQUE AMIN\.omniroute\storage.sqlite
[MCP] OmniRoute MCP Server starting (stdio transport)...
context canceled
`

### Root Cause:
OmniRoute's SQLite database gets bloated over time causing memory pressure.
cache_size forced down from 65536KB -> 16384KB = DB needs cleaning.
DEP0190 (shell:true args) = non-critical Node.js deprecation, no action needed.

### MANDATORY Fix Procedure (in this exact order):
1. FIRST — Push ALL details to BOTH GitHub repos:
   git push origin main
   git push storage main

2. ONLY AFTER push succeeds — delete/reset the SQLite DB:
   Stop-Process -Name node -Force  (stop OmniRoute)
   Remove-Item 'C:\Users\MD SADIQUE AMIN\.omniroute\storage.sqlite' -Force

3. Restart OmniRoute — it auto-recreates a fresh DB:
   node 'C:\Users\MD SADIQUE AMIN\AppData\Roaming\npm\node_modules\omniroute\bin\omniroute.mjs' serve --port 20128 --no-open

### DB File Location:
- SQLite: C:\Users\MD SADIQUE AMIN\.omniroute\storage.sqlite
- Data Dir: C:\Users\MD SADIQUE AMIN\.omniroute

### RULE: NEVER delete DB before GitHub push — data loss risk!