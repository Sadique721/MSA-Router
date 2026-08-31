# MSA AI Stack — GA Production Setup Summary
Repository: https://github.com/Sadique721/MSA-Router (main code)
Backup/Storage: https://github.com/Sadique721/storage (this repo)
Date: 2026-08-31 19:01

## Active Services
- Ollama: 127.0.0.1:11435 (qwen2.5:7b-instruct, deepseek-r1:7b, qwen2.5:0.5b)
- MSA Router: 127.0.0.1:20130 (7 models, Gemini key rotation)
- OmniRoute: 127.0.0.1:20128 (NVIDIA Nemotron, online routing)

## Key Files
- local_unified_router.js — Main router (port 20130)
- Start-All-Services.ps1 — Hourly watchdog + autostart
- preflight_test.js — 12-gate verification suite
- smart_router.js — Auto task classifier (saves Antigravity tokens)
- fix_mcp_config.js — MCP config BOM fixer

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