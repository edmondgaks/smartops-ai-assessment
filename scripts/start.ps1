# start.ps1 — Starts Ollama + backend + frontend in separate windows
# Run from project root:  .\scripts\start.ps1

$root = Split-Path $PSScriptRoot -Parent
$model = if ($env:OLLAMA_MODEL) { $env:OLLAMA_MODEL } else { "llama3.2" }

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  LLM Assessment — Starting Services" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Ensure Ollama is running ────────────────────
$ollamaRunning = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
if (-not $ollamaRunning) {
    Write-Host "Starting Ollama..." -ForegroundColor Yellow
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3
}
Write-Host "  Ollama running  (model: $model)" -ForegroundColor Green

# ── 2. Create data dir ─────────────────────────────
New-Item -ItemType Directory -Force -Path "$root\backend\data" | Out-Null

# ── 3. Start backend in a new window ──────────────
Write-Host "Starting backend  (http://localhost:3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "Set-Location '$root\backend'; `$env:OLLAMA_MODEL='$model'; npm run dev" `
    -WindowStyle Normal

Start-Sleep -Seconds 2

# ── 4. Start frontend in a new window ─────────────
Write-Host "Starting frontend (http://localhost:3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "Set-Location '$root\frontend'; npm run dev" `
    -WindowStyle Normal

Start-Sleep -Seconds 2

# ── 5. Open browser ───────────────────────────────
Write-Host ""
Write-Host "Opening browser in 4 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 4
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend : http://localhost:3000" -ForegroundColor White
Write-Host "  Backend  : http://localhost:3001" -ForegroundColor White
Write-Host "  Ollama   : http://localhost:11434" -ForegroundColor White
Write-Host ""
Write-Host "  Close the two PowerShell windows to stop." -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Cyan
