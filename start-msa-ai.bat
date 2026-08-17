@echo off
setlocal enabledelayedexpansion
title MSA AI Stack — Startup

echo.
echo  ╔════════════════════════════════════════════════════╗
echo  ║          MSA AI — Offline AI Assistant Stack       ║
echo  ║                      v2.0                          ║
echo  ╚════════════════════════════════════════════════════╝
echo.

cd /d "D:\current using file\8-17-2026"

:: ── Check Docker is running ─────────────────────────────────────────────────
docker info >nul 2>&1
if errorlevel 1 (
  echo  ❌ ERROR: Docker Desktop is not running.
  echo     Please start Docker Desktop and try again.
  pause
  exit /b 1
)
echo  ✅ Docker Desktop is running.
echo.

:: ── Build images and start all containers ───────────────────────────────────
echo  Building images and starting all MSA AI containers...
echo  (First run will download models — this may take 10-30 minutes)
echo.
docker compose -f docker-compose-msa.yml up -d --build

if errorlevel 1 (
  echo.
  echo  ❌ ERROR: docker compose failed. Check output above.
  pause
  exit /b 1
)

echo.
echo  ⏳ Waiting for services to initialize (30 seconds)...
timeout /t 30 /nobreak > nul

:: ── Container status ─────────────────────────────────────────────────────────
echo.
echo  ═══════════════════════════════════════════════════════
echo   MSA AI — Container Status
echo  ═══════════════════════════════════════════════════════
docker ps --filter "name=msa-" --format "  {{.Names}}: {{.Status}}"
echo.

:: ── Health checks ────────────────────────────────────────────────────────────
echo  ═══════════════════════════════════════════════════════
echo   MSA AI — Service Health Checks
echo  ═══════════════════════════════════════════════════════

echo.
echo  [1/3] Checking MSA AI Router  (http://localhost:20131/health) ...
curl -sf --max-time 5 http://localhost:20131/health
if errorlevel 1 (
  echo  ⚠️  MSA Router not yet ready — may still be starting.
) else (
  echo.
  echo  ✅ MSA Router OK
)

echo.
echo  [2/3] Checking OmniRoute      (http://localhost:20129/v1/models) ...
curl -sf --max-time 5 http://localhost:20129/v1/models >nul
if errorlevel 1 (
  echo  ⚠️  OmniRoute not yet ready — may still be starting.
) else (
  echo.
  echo  ✅ OmniRoute OK
)

echo.
echo  [3/3] Checking Ollama Models  (http://localhost:11435/api/tags) ...
curl -sf --max-time 5 http://localhost:11435/api/tags
if errorlevel 1 (
  echo  ⚠️  Ollama not yet ready — models may still be downloading.
) else (
  echo.
  echo  ✅ Ollama OK
)

:: ── Summary ──────────────────────────────────────────────────────────────────
echo.
echo  ╔════════════════════════════════════════════════════╗
echo  ║   MSA AI Ready! Use these endpoints in your IDE:  ║
echo  ║                                                    ║
echo  ║   Primary (Smart Router): http://localhost:20131/v1║
echo  ║   Ollama  (Direct):       http://localhost:11435   ║
echo  ║   OmniRoute (Dashboard):  http://localhost:20129   ║
echo  ╚════════════════════════════════════════════════════╝
echo.
echo  Models being pulled in background (check provisioner logs):
echo    docker logs msa-ollama-provisioner -f
echo.
pause
