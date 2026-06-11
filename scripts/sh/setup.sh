#!/usr/bin/env bash
# setup.sh — One-time install for macOS and Linux
# Usage: chmod +x scripts/setup.sh && ./scripts/setup.sh

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
RESET='\033[0m'

echo ""
echo -e "${CYAN}${BOLD}============================================${RESET}"
echo -e "${CYAN}${BOLD}  LLM Assessment — Setup (macOS / Linux)${RESET}"
echo -e "${CYAN}${BOLD}============================================${RESET}"
echo ""

# ── 1. Check Node.js ────────────────────────────────
echo -e "${YELLOW}Checking Node.js...${RESET}"
if ! command -v node &>/dev/null; then
  echo -e "${RED}  Node.js not found.${RESET}"
  echo "  Install from: https://nodejs.org (LTS version)"
  echo "  Or via nvm:   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
  exit 1
fi
echo -e "${GREEN}  Node.js found: $(node --version)${RESET}"

# ── 2. Check / Install Ollama ──────────────────────
echo ""
echo -e "${YELLOW}Checking Ollama...${RESET}"
if ! command -v ollama &>/dev/null; then
  echo -e "${YELLOW}  Ollama not found. Installing...${RESET}"
  curl -fsSL https://ollama.com/install.sh | sh
  echo -e "${GREEN}  Ollama installed.${RESET}"
else
  echo -e "${GREEN}  Ollama already installed: $(ollama --version)${RESET}"
fi

# ── 3. Start Ollama service ────────────────────────
echo ""
echo -e "${YELLOW}Starting Ollama service...${RESET}"
if ! pgrep -f "ollama serve" &>/dev/null; then
  ollama serve &>/dev/null &
  sleep 3
  echo -e "${GREEN}  Ollama service started.${RESET}"
else
  echo -e "${GREEN}  Ollama already running.${RESET}"
fi

# ── 4. Pull the model ──────────────────────────────
MODEL="${OLLAMA_MODEL:-llama3.2}"
echo ""
echo -e "${YELLOW}Pulling model: ${MODEL} (~2GB, one-time download)...${RESET}"
ollama pull "$MODEL"
echo -e "${GREEN}  Model ready: ${MODEL}${RESET}"

# ── 5. Install backend dependencies ───────────────
echo ""
echo -e "${YELLOW}Installing backend dependencies...${RESET}"
cd "$(dirname "$0")/../backend"
npm install
echo -e "${GREEN}  Backend dependencies installed.${RESET}"

# ── 6. Install frontend dependencies ──────────────
echo ""
echo -e "${YELLOW}Installing frontend dependencies...${RESET}"
cd "../frontend"
npm install
echo -e "${GREEN}  Frontend dependencies installed.${RESET}"

# ── 7. Create data directory ───────────────────────
mkdir -p "../backend/data"

# ── Done ───────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}============================================${RESET}"
echo -e "${GREEN}${BOLD}  Setup complete!${RESET}"
echo ""
echo -e "  To start the app, run:"
echo -e "  ${YELLOW}  ./scripts/start.sh${RESET}"
echo ""
echo -e "  Or start manually in two terminals:"
echo -e "  ${YELLOW}  Terminal 1: cd backend  && npm run dev${RESET}"
echo -e "  ${YELLOW}  Terminal 2: cd frontend && npm run dev${RESET}"
echo -e "${CYAN}${BOLD}============================================${RESET}"
echo ""