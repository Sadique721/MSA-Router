# Start-All-Services.ps1
# MSA AI Stack — Master Startup & Self-Healing Watchdog
# Runs on: Windows Login (via Startup folder), and loops every hour.
# Covers: Laptop shutdown/restart/sleep/location change — fully automatic.

$LogFile = "C:\Users\MD SADIQUE AMIN\.gemini\antigravity-ide\scratch\MSA-Router\watchdog.log"
$RouterScript = "C:\Users\MD SADIQUE AMIN\.gemini\antigravity-ide\scratch\MSA-Router\local_unified_router.js"
$OmniScript = "$env:APPDATA\npm\node_modules\omniroute\bin\omniroute.mjs"
$OllamaAppPath = "$env:LOCALAPPDATA\Programs\Ollama\ollama app.exe"
$PreflightScript = "C:\Users\MD SADIQUE AMIN\.gemini\antigravity-ide\scratch\MSA-Router\preflight_test.js"
$McpFixScript = "C:\Users\MD SADIQUE AMIN\.gemini\antigravity-ide\scratch\MSA-Router\fix_mcp_config.js"

function Write-Log {
    param([string]$Message)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] $Message"
    Add-Content -Path $LogFile -Value $line -ErrorAction SilentlyContinue
    Write-Host $line
}

function Ensure-ServiceOnPort {
    param([int]$Port, [string]$Name, [scriptblock]$StartAction)
    $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
    if ($conn) {
        Write-Log "✅ $Name already listening on port $Port."
    } else {
        Write-Log "⏳ Starting $Name on port $Port..."
        & $StartAction
        $retries = 15
        while ($retries -gt 0) {
            Start-Sleep 1
            $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
            if ($conn) { break }
            $retries--
        }
        if ($conn) { Write-Log "✅ $Name started successfully." }
        else { Write-Log "⚠️ $Name startup timed out (will retry next cycle)." }
    }
}

function Run-PreflightTest {
    if (Test-Path $PreflightScript) {
        Write-Log "🧪 Running preflight test suite..."
        try {
            $out = node $PreflightScript 2>&1 | Out-String
            if ($out -match "ALL CHECKS PASSED") {
                Write-Log "✅ Preflight: ALL CHECKS PASSED"
            } else {
                Write-Log "⚠️ Preflight: Some checks need attention (see log)"
                # Extract failed lines
                $out -split "`n" | Where-Object { $_ -match '\[FAIL\]' } | ForEach-Object {
                    Write-Log "   ❌ $_"
                }
            }
        } catch {
            Write-Log "⚠️ Preflight test error: $_"
        }
    }
}

function Fix-McpConfig {
    if (Test-Path $McpFixScript) {
        $mcpPath = "C:\Users\MD SADIQUE AMIN\.gemini\config\mcp_config.json"
        if (Test-Path $mcpPath) {
            $raw = [System.IO.File]::ReadAllBytes($mcpPath)
            # Check for UTF-8 BOM (EF BB BF)
            if ($raw.Length -ge 3 -and $raw[0] -eq 0xEF -and $raw[1] -eq 0xBB -and $raw[2] -eq 0xBF) {
                Write-Log "🔧 MCP config has BOM — fixing..."
                node $McpFixScript 2>&1 | Out-Null
                Write-Log "✅ MCP config BOM fixed."
            }
        }
    }
}

function Ensure-VsCodeExtension {
    if (Get-Command code -ErrorAction SilentlyContinue) {
        try {
            $extensions = code --list-extensions 2>$null
            if ($extensions -and ($extensions -notcontains "continue.continue")) {
                Write-Log "⏳ Installing Continue extension for VS Code..."
                Start-Process "code" -ArgumentList "--install-extension continue.continue" -WindowStyle Hidden -Wait
                Write-Log "✅ Continue extension installed."
            }
        } catch { }
    }
}

# ════════════════════════════════════════════
# STARTUP SEQUENCE (runs once on login)
# ════════════════════════════════════════════
Write-Log "════ MSA AI Stack Starting (Login) ════"

# Fix MCP config if BOM present
Fix-McpConfig

# 1. Start Ollama (port 11435)
Ensure-ServiceOnPort -Port 11435 -Name "Ollama" -StartAction {
    [System.Environment]::SetEnvironmentVariable("OLLAMA_HOST", "127.0.0.1:11435", "Process")
    if (Test-Path $OllamaAppPath) {
        Start-Process $OllamaAppPath -WindowStyle Hidden
    } else {
        Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
    }
}

# 2. Start OmniRoute (port 20128)
Ensure-ServiceOnPort -Port 20128 -Name "OmniRoute" -StartAction {
    Start-Process "node" -ArgumentList "`"$OmniScript`" serve --port 20128 --no-open" -WindowStyle Hidden
}

# 3. Start MSA Router (port 20130)
Ensure-ServiceOnPort -Port 20130 -Name "MSA Router" -StartAction {
    Start-Process "node" -ArgumentList "`"$RouterScript`"" -WindowStyle Hidden
}

# 4. Ensure VS Code Continue extension
Ensure-VsCodeExtension

# 5. Run preflight verification
Start-Sleep 3
Run-PreflightTest

Write-Log "🎉 Startup complete. Watchdog now active (hourly health checks)."

# ════════════════════════════════════════════
# HOURLY WATCHDOG LOOP (self-healing)
# ════════════════════════════════════════════
while ($true) {
    Start-Sleep -Seconds 3600

    Write-Log "════ Watchdog Hourly Health Check ════"

    # Self-heal all services
    Ensure-ServiceOnPort -Port 11435 -Name "Ollama" -StartAction {
        [System.Environment]::SetEnvironmentVariable("OLLAMA_HOST", "127.0.0.1:11435", "Process")
        if (Test-Path $OllamaAppPath) {
            Start-Process $OllamaAppPath -WindowStyle Hidden
        } else {
            Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
        }
    }

    Ensure-ServiceOnPort -Port 20128 -Name "OmniRoute" -StartAction {
        Start-Process "node" -ArgumentList "`"$OmniScript`" serve --port 20128 --no-open" -WindowStyle Hidden
    }

    Ensure-ServiceOnPort -Port 20130 -Name "MSA Router" -StartAction {
        Start-Process "node" -ArgumentList "`"$RouterScript`"" -WindowStyle Hidden
    }

    # Fix BOM drift (if system updates reset config)
    Fix-McpConfig

    # Ensure VS Code extension still installed
    Ensure-VsCodeExtension

    # Run preflight verification every hour
    Run-PreflightTest

    Write-Log "✅ Hourly watchdog cycle complete."
}
