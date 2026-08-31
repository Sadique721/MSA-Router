@echo off
cd /d "C:\Users\MD SADIQUE AMIN\.gemini\antigravity-ide\scratch\MSA-Router"
start /b node "C:\Users\MD SADIQUE AMIN\AppData\Roaming\npm\node_modules\omniroute\bin\omniroute.mjs" serve --port 20128 --no-open
start /b node local_unified_router.js
