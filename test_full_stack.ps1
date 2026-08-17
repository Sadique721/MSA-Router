# MSA AI Full Stack Comprehensive Verification Script
$ErrorActionPreference = "Continue"

Write-Host "================================================================="
Write-Host "           MSA AI STACK -- FULL SYSTEM VERIFICATION SUITE        "
Write-Host "================================================================="
Write-Host ""

$testsPassed = 0
$totalTests = 6

# -------------------------------------------------------------
# 1. DOCKER ENGINE & CONTAINERS CHECK
# -------------------------------------------------------------
Write-Host ">>> [1/6] Auditing Docker Infrastructure..."
$containers = docker ps --filter "name=msa-" --format "{{.Names}}:{{.Status}}"
$containerList = $containers -split "`n" | Where-Object { $_.Trim() -ne "" }

foreach ($c in $containerList) {
    Write-Host "  Container: $c"
}
$routerUp = $containerList | Where-Object { $_ -match "msa-router" -and $_ -match "Up" }
$omniUp = $containerList | Where-Object { $_ -match "msa-omniroute" -and $_ -match "Up" }
$ollamaUp = $containerList | Where-Object { $_ -match "msa-ollama" -and $_ -match "Up" }

if ($routerUp -and $omniUp -and $ollamaUp) {
    Write-Host "  RESULT: [PASS] All 3 containers are Running"
    $testsPassed++
} else {
    Write-Host "  RESULT: [FAIL] One or more containers down"
}

# -------------------------------------------------------------
# 2. VOLUMES & PERSISTENCE CHECK
# -------------------------------------------------------------
Write-Host "`n>>> [2/6] Auditing Named Volumes and Disk Storage..."
$vol = docker volume ls --filter "name=msa-ollama-models" --format "{{.Name}}"
if ($vol -match "msa-ollama-models") {
    Write-Host "  Volume 'msa-ollama-models' found"
    Write-Host "  RESULT: [PASS] Named volume persisted"
    $testsPassed++
} else {
    Write-Host "  RESULT: [FAIL] Volume Missing"
}

# -------------------------------------------------------------
# 3. OLLAMA ENGINE & MODELS AUDIT (Port 11435)
# -------------------------------------------------------------
Write-Host "`n>>> [3/6] Auditing Ollama LLM Service (Port 11435)..."
try {
    $tagsResp = Invoke-WebRequest -Uri "http://localhost:11435/api/tags" -UseBasicParsing -TimeoutSec 10
    $tagsJson = $tagsResp.Content | ConvertFrom-Json
    $modelNames = $tagsJson.models | ForEach-Object { $_.name }
    Write-Host "  Registered Models: $($modelNames -join ', ')"
    
    if ($modelNames.Count -ge 3) {
        Write-Host "  RESULT: [PASS] All 3 required LLMs downloaded ($($modelNames.Count) ready)"
        $testsPassed++
    } else {
        Write-Host "  RESULT: [WARN] $($modelNames.Count) models ready"
    }
} catch {
    Write-Host "  Ollama request failed: $($_.Exception.Message)"
    Write-Host "  RESULT: [FAIL]"
}

# -------------------------------------------------------------
# 4. OMNIROUTE AI PROXY AUDIT (Port 20129)
# -------------------------------------------------------------
Write-Host "`n>>> [4/6] Auditing OmniRoute Gateway (Port 20129)..."
try {
    $omniModels = Invoke-WebRequest -Uri "http://localhost:20129/v1/models" -UseBasicParsing -TimeoutSec 10
    $omniHtml = Invoke-WebRequest -Uri "http://localhost:20129/" -UseBasicParsing -TimeoutSec 10
    Write-Host "  OmniRoute API: $($omniModels.StatusCode) OK"
    Write-Host "  OmniRoute Dashboard: $($omniHtml.StatusCode) OK"
    if ($omniModels.StatusCode -eq 200 -and $omniHtml.StatusCode -eq 200) {
        Write-Host "  RESULT: [PASS] OmniRoute API and Dashboard Online"
        $testsPassed++
    } else {
        Write-Host "  RESULT: [FAIL]"
    }
} catch {
    Write-Host "  OmniRoute request failed: $($_.Exception.Message)"
    Write-Host "  RESULT: [FAIL]"
}

# -------------------------------------------------------------
# 5. MSA SMART ROUTER AUDIT (Port 20131)
# -------------------------------------------------------------
Write-Host "`n>>> [5/6] Auditing MSA Smart Router (Port 20131)..."
try {
    $routerHealth = Invoke-WebRequest -Uri "http://localhost:20131/health" -UseBasicParsing -TimeoutSec 5
    $routerModels = Invoke-WebRequest -Uri "http://localhost:20131/v1/models" -UseBasicParsing -TimeoutSec 5
    Write-Host "  Router Health: $($routerHealth.StatusCode) OK"
    Write-Host "  Router Models: $($routerModels.StatusCode) OK"
    if ($routerHealth.StatusCode -eq 200 -and $routerModels.StatusCode -eq 200) {
        Write-Host "  RESULT: [PASS] Router Active and Healthy"
        $testsPassed++
    } else {
        Write-Host "  RESULT: [FAIL]"
    }
} catch {
    Write-Host "  Router request failed: $($_.Exception.Message)"
    Write-Host "  RESULT: [FAIL]"
}

# -------------------------------------------------------------
# 6. LIVE INFERENCE TEST VIA MSA ROUTER
# -------------------------------------------------------------
Write-Host "`n>>> [6/6] Executing Live AI Inference (Coding Prompt)..."
try {
    $codeBody = '{"model":"msa-ai","messages":[{"role":"user","content":"write 1+1 in python"}],"max_tokens":30,"stream":false}'
    $codeResp = Invoke-WebRequest -Uri "http://localhost:20131/v1/chat/completions" -Method POST -Body $codeBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 30
    $codeJson = $codeResp.Content | ConvertFrom-Json
    $codeText = $codeJson.choices[0].message.content.Trim() -replace "`r`n"," " -replace "`n"," "
    Write-Host "  Model Used: $($codeJson.model)"
    Write-Host "  LLM Output: $codeText"
    Write-Host "  RESULT: [PASS] Real-time inference successful"
    $testsPassed++
} catch {
    Write-Host "  Inference failed: $($_.Exception.Message)"
    Write-Host "  RESULT: [FAIL]"
}

# -------------------------------------------------------------
# FINAL SCORECARD
# -------------------------------------------------------------
Write-Host "`n================================================================="
Write-Host "      FINAL SCORECARD: $testsPassed / $totalTests TESTS PASSED"
Write-Host "================================================================="
if ($testsPassed -eq $totalTests) {
    Write-Host "STATUS: 100% OPERATIONAL - MSA AI IS PRODUCTION READY!"
} else {
    Write-Host "STATUS: PARTIAL - Check individual results above"
}
Write-Host "================================================================="
