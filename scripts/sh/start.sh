#!/usr/bin/env bash
# start.sh — Start all services on macOS and Linux
# Usage: ./scripts/start.sh

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODEL="${OLLAMA_MODEL:-llama3.2}"

echo ""
echo -e "${CYAN}${BOLD}============================================${RESET}"
echo -e "${CYAN}${BOLD}  LLM Assessment — Starting Services${RESET}"
echo -e "${CYAN}${BOLD}============================================${RESET}"
echo ""

# ── 1. Ensure Ollama is running ────────────────────
if ! pgrep -f "ollama serve" &>/dev/null; then
  echo -e "${YELLOW}Starting Ollama...${RESET}"
  ollama serve &>/dev/null &
  sleep 3
fi
echo -e "${GREEN}  Ollama running  (model: ${MODEL})${RESET}"

# ── 2. Create data dir ─────────────────────────────
mkdir -p "$ROOT/backend/data"

# ── 3. Start backend ──────────────────────────────
echo -e "${YELLOW}Starting backend  (http://localhost:3001)...${RESET}"
cd "$ROOT/backend"
OLLAMA_MODEL="$MODEL" npm run dev &
BACKEND_PID=$!

sleep 2

# ── 4. Start frontend ─────────────────────────────
echo -e "${YELLOW}Starting frontend (http://localhost:3000)...${RESET}"
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

sleep 2

# ── 5. Open browser ───────────────────────────────
echo -e "${YELLOW}Opening browser...${RESET}"
if command -v open &>/dev/null; then
  open "http://localhost:3000"          # macOS
elif command -v xdg-open &>/dev/null; then
  xdg-open "http://localhost:3000"      # Linux
fi

echo ""
echo -e "${CYAN}${BOLD}============================================${RESET}"
echo -e "${GREEN}${BOLD}  All services started!${RESET}"
echo ""
echo -e "  Frontend : ${YELLOW}http://localhost:3000${RESET}"
echo -e "  Backend  : ${YELLOW}http://localhost:3001${RESET}"
echo -e "  Ollama   : ${YELLOW}http://localhost:11434${RESET}"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${RESET} to stop all services."
echo -e "${CYAN}${BOLD}============================================${RESET}"
echo ""

# ── Graceful shutdown ──────────────────────────────
cleanup() {
  echo ""
  echo -e "${YELLOW}Stopping services...${RESET}"
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  echo -e "${GREEN}Done.${RESET}"
  exit 0
}

trap cleanup SIGINT SIGTERM
wait