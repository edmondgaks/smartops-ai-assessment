@echo off
REM start.bat — Alternative to start.ps1 for Command Prompt users
REM Double-click this file or run from project root: scripts\start.bat

setlocal

set ROOT=%~dp0..
if "%OLLAMA_MODEL%"=="" set OLLAMA_MODEL=llama3.2

echo.
echo ============================================
echo   LLM Assessment - Starting Services
echo ============================================
echo.

REM Check Ollama
where ollama >nul 2>&1
if errorlevel 1 (
    echo [ERROR] ollama not found in PATH.
    echo Download from: https://ollama.com/download
    pause
    exit /b 1
)

REM Start Ollama in background
tasklist /FI "IMAGENAME eq ollama.exe" 2>nul | find /I "ollama.exe" >nul
if errorlevel 1 (
    echo Starting Ollama...
    start /B ollama serve
    timeout /t 3 /nobreak >nul
)
echo   Ollama running  [model: %OLLAMA_MODEL%]

REM Create data dir
if not exist "%ROOT%\backend\data" mkdir "%ROOT%\backend\data"

REM Start backend
echo Starting backend  [http://localhost:3001]...
start "LLM Backend" cmd /k "cd /d %ROOT%\backend && set OLLAMA_MODEL=%OLLAMA_MODEL% && npm run dev"

timeout /t 2 /nobreak >nul

REM Start frontend
echo Starting frontend [http://localhost:3000]...
start "LLM Frontend" cmd /k "cd /d %ROOT%\frontend && npm run dev"

timeout /t 5 /nobreak >nul

REM Open browser
echo Opening browser...
start http://localhost:3000

echo.
echo ============================================
echo   All services started!
echo.
echo   Frontend : http://localhost:3000
echo   Backend  : http://localhost:3001
echo   Ollama   : http://localhost:11434
echo.
echo   Close the two cmd windows to stop.
echo ============================================
echo.
pause
