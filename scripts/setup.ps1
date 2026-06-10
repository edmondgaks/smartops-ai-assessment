# setup.ps1 — Run this ONCE to install everything
# Open PowerShell as Administrator, then run:
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
#   .\scripts\setup.ps1

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  LLM Assessment — Windows Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Check Node.js ────────────────────────────────
Write-Host "Checking Node.js..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js not found!" -ForegroundColor Red
    Write-Host "Download and install from: https://nodejs.org (LTS version)" -ForegroundColor White
    Write-Host "Then re-run this script." -ForegroundColor White
    exit 1
}
$nodeVersion = node --version
Write-Host "  Node.js found: $nodeVersion" -ForegroundColor Green

# ── 2. Check / Install Ollama ──────────────────────
Write-Host ""
Write-Host "Checking Ollama..." -ForegroundColor Yellow
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Host "  Ollama not found. Downloading installer..." -ForegroundColor Yellow
    $ollamaInstaller = "$env:TEMP\OllamaSetup.exe"
    Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $ollamaInstaller
    Write-Host "  Running Ollama installer (follow the prompts)..." -ForegroundColor Yellow
    Start-Process -FilePath $ollamaInstaller -Wait
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "  Ollama installed." -ForegroundColor Green
} else {
    Write-Host "  Ollama already installed." -ForegroundColor Green
}

# ── 3. Start Ollama service ────────────────────────
Write-Host ""
Write-Host "Starting Ollama service..." -ForegroundColor Yellow
$ollamaRunning = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
if (-not $ollamaRunning) {
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    Write-Host "  Ollama service started." -ForegroundColor Green
} else {
    Write-Host "  Ollama already running." -ForegroundColor Green
}

# ── 4. Pull model ──────────────────────────────────
$model = if ($env:OLLAMA_MODEL) { $env:OLLAMA_MODEL } else { "llama3.2" }
Write-Host ""
Write-Host "Pulling model: $model (~2GB download, only needed once)..." -ForegroundColor Yellow
ollama pull $model
Write-Host "  Model ready: $model" -ForegroundColor Green

# ── 5. Install backend deps ────────────────────────
Write-Host ""
Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
Push-Location "$PSScriptRoot\..\backend"
npm install
Pop-Location
Write-Host "  Backend dependencies installed." -ForegroundColor Green

# ── 6. Install frontend deps ───────────────────────
Write-Host ""
Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location "$PSScriptRoot\..\frontend"
npm install
Pop-Location
Write-Host "  Frontend dependencies installed." -ForegroundColor Green

# ── 7. Create data directory ───────────────────────
New-Item -ItemType Directory -Force -Path "$PSScriptRoot\..\backend\data" | Out-Null

# ── Done ───────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  To start the app, run:" -ForegroundColor White
Write-Host "    .\scripts\start.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Or start services manually in 2 terminals:" -ForegroundColor White
Write-Host "    Terminal 1:  cd backend  && npm run dev" -ForegroundColor Yellow
Write-Host "    Terminal 2:  cd frontend && npm run dev" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
