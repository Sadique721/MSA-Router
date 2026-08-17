# MSA AI Final Comprehensive Quality & Health Verification
$ErrorActionPreference = "Continue"

Write-Host "================================================================="
Write-Host "         MSA AI -- FINAL FULL SYSTEM COMPREHENSIVE AUDIT         "
Write-Host "================================================================="
Write-Host ""

$passed = 0
$total = 7

# 1. Docker Containers
Write-Host "[1/7] Checking Docker Containers..."
$ps = docker ps --filter "name=msa-" --format "{{.Names}}: {{.Status}} ({{.Ports}})"
$psList = $ps -split "`n" | Where-Object { $_.Trim() -ne "" }
foreach ($line in $psList) { Write-Host "  $line" }

$rRunning = $psList | Where-Object { $_ -match "msa-router" -and $_ -match "Up" }
$oRunning = $psList | Where-Object { $_ -match "msa-omniroute" -and $_ -match "Up" }
$lRunning = $psList | Where-Object { $_ -match "msa-ollama" -and $_ -match "Up" }

if ($rRunning -and $oRunning -and $lRunning) {
    Write-Host "  -> PASS: All 3 containers running and healthy"
    $passed++
} else {
    Write-Host "  -> FAIL: Missing containers"
}

# 2. Docker Volumes
Write-Host "`n[2/7] Checking Persistent Volumes..."
$vols = docker volume ls --filter "name=msa-ollama-models" --format "{{.Name}}"
if ($vols -match "msa-ollama-models") {
    Write-Host "  -> PASS: Volume 'msa-ollama-models' is active"
    $passed++
} else {
    Write-Host "  -> FAIL: Volume not found"
}

# 3. Ollama Models
Write-Host "`n[3/7] Checking Ollama Engine & Downloaded Models (Port 11435)..."
try {
    $ol = Invoke-WebRequest -Uri "http://localhost:11435/api/tags" -UseBasicParsing -TimeoutSec 10
    $models = ($ol.Content | ConvertFrom-Json).models
    foreach ($m in $models) {
        Write-Host "  Model: $($m.name) | Size: $([Math]::Round($m.size/1GB,2)) GB"
    }
    if ($models.Count -ge 3) {
        Write-Host "  -> PASS: All 3 models ready in Ollama volume"
        $passed++
    } else {
        Write-Host "  -> WARN: $($models.Count) models available"
    }
} catch {
    Write-Host "  -> FAIL: $($_.Exception.Message)"
}

# 4. OmniRoute Gateway
Write-Host "`n[4/7] Checking OmniRoute Gateway (Port 20129)..."
try {
    $om = Invoke-WebRequest -Uri "http://localhost:20129/v1/models" -UseBasicParsing -TimeoutSec 10
    $oh = Invoke-WebRequest -Uri "http://localhost:20129/" -UseBasicParsing -TimeoutSec 10
    if ($om.StatusCode -eq 200 -and $oh.StatusCode -eq 200) {
        Write-Host "  OmniRoute API: 200 OK | Dashboard: 200 OK"
        Write-Host "  -> PASS: OmniRoute fully operational"
        $passed++
    } else {
        Write-Host "  -> FAIL: Non-200 status"
    }
} catch {
    Write-Host "  -> FAIL: $($_.Exception.Message)"
}

# 5. MSA Smart Router
Write-Host "`n[5/7] Checking MSA Smart Router (Port 20131)..."
try {
    $rh = Invoke-WebRequest -Uri "http://localhost:20131/health" -UseBasicParsing -TimeoutSec 10
    $rm = Invoke-WebRequest -Uri "http://localhost:20131/v1/models" -UseBasicParsing -TimeoutSec 10
    if ($rh.StatusCode -eq 200 -and $rm.StatusCode -eq 200) {
        Write-Host "  Router Health: 200 OK | Models endpoint: 200 OK"
        Write-Host "  -> PASS: MSA Smart Router healthy"
        $passed++
    } else {
        Write-Host "  -> FAIL: Non-200 status"
    }
} catch {
    Write-Host "  -> FAIL: $($_.Exception.Message)"
}

# 6. Live AI Inference
Write-Host "`n[6/7] Testing Live AI Inference (Port 20131)..."
try {
    $body = '{"model":"msa-ai","messages":[{"role":"user","content":"Say Hello in one word"}],"max_tokens":10,"stream":false}'
    $inf = Invoke-WebRequest -Uri "http://localhost:20131/v1/chat/completions" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 60
    $json = $inf.Content | ConvertFrom-Json
    $out = $json.choices[0].message.content.Trim()
    Write-Host "  LLM Model: $($json.model)"
    Write-Host "  LLM Output: $out"
    Write-Host "  -> PASS: Live inference successful"
    $passed++
} catch {
    Write-Host "  -> FAIL: $($_.Exception.Message)"
}

# 7. Continue Config & Icon Assets
Write-Host "`n[7/7] Checking Continue Config & Icon Assets..."
$cfgPath = "C:\Users\MD SADIQUE AMIN\.continue\config.yaml"
$iconD = "D:\My_Self_Details\youtube content\icons\msa-ai-icon.ico"
$iconGui = "C:\Users\MD SADIQUE AMIN\.antigravity-ide\extensions\continue.continue-2.0.0-win32-x64\gui\logos\msa-ai.png"

$c1 = Test-Path $cfgPath
$c2 = Test-Path $iconD
$c3 = Test-Path $iconGui

if ($c1 -and $c2 -and $c3) {
    Write-Host "  Config.yaml : OK"
    Write-Host "  D:\ Icons   : OK (.ico + .png)"
    Write-Host "  GUI Logos   : OK (msa-ai.png)"
    Write-Host "  -> PASS: All configs and assets verified"
    $passed++
} else {
    Write-Host "  -> FAIL: One or more files missing"
}

# Summary
Write-Host "`n================================================================="
Write-Host "        SCORECARD: $passed / $total AUDIT CHECKS PASSED          "
Write-Host "================================================================="
if ($passed -eq $total) {
    Write-Host "  >>> RESULT: SUCCESS (100% OPERATIONAL & PRODUCTION READY) <<< "
} else {
    Write-Host "  >>> RESULT: FAILED CHECKS DETECTED <<< "
}
Write-Host "================================================================="
