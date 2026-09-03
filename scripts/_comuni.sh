#!/usr/bin/env bash
# ============================================================
# Funzioni comuni agli script di gestione server (bash, Windows/Git Bash e Linux)
# ============================================================
# Porte: BE 3101, FE 5273 (dev). Log: BE.log / FE.log nella root.
# I PID vengono salvati in .pids/ per uno stop pulito.

set -u
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.pids"
BE_PORT=3101
FE_PORT=5273
BE_LOG="$ROOT_DIR/BE.log"
FE_LOG="$ROOT_DIR/FE.log"
mkdir -p "$PID_DIR"

# porta_in_ascolto <porta> → 0 se qualcosa è in ascolto sulla porta
porta_in_ascolto() {
  local porta="$1"
  if command -v netstat >/dev/null 2>&1; then
    netstat -an 2>/dev/null | grep -E "[:.]${porta} .*LISTEN" >/dev/null 2>&1 && return 0
  fi
  if command -v ss >/dev/null 2>&1; then
    ss -ltn 2>/dev/null | grep -E ":${porta} " >/dev/null 2>&1 && return 0
  fi
  return 1
}

# attendi_porta <porta> <etichetta> [secondi] → attende che la porta risponda
attendi_porta() {
  local porta="$1" etichetta="$2" max="${3:-60}" i=0
  while [ "$i" -lt "$max" ]; do
    if porta_in_ascolto "$porta"; then
      echo "[$etichetta] in ascolto sulla porta $porta (dopo ${i}s)"
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  echo "[$etichetta] NON avviato entro ${max}s (porta $porta)" >&2
  return 1
}

# termina_porta <porta> → uccide i processi in ascolto sulla porta (Windows e Linux)
termina_porta() {
  local porta="$1"
  if command -v netstat >/dev/null 2>&1 && command -v taskkill >/dev/null 2>&1; then
    # Windows (Git Bash): netstat -ano → PID in ultima colonna
    for pid in $(netstat -ano 2>/dev/null | grep -E "[:.]${porta} .*LISTENING" | awk '{print $NF}' | sort -u); do
      [ -n "$pid" ] && taskkill //PID "$pid" //F //T >/dev/null 2>&1 && echo "terminato PID $pid (porta $porta)"
    done
  elif command -v lsof >/dev/null 2>&1; then
    for pid in $(lsof -ti tcp:"$porta" 2>/dev/null); do
      kill -9 "$pid" 2>/dev/null && echo "terminato PID $pid (porta $porta)"
    done
  elif command -v fuser >/dev/null 2>&1; then
    fuser -k "${porta}/tcp" >/dev/null 2>&1 || true
  fi
}

# termina_pidfile <file> → uccide il processo salvato nel pidfile, se esiste
termina_pidfile() {
  local file="$1"
  if [ -f "$file" ]; then
    local pid
    pid="$(cat "$file")"
    if [ -n "$pid" ]; then
      if command -v taskkill >/dev/null 2>&1; then
        taskkill //PID "$pid" //F //T >/dev/null 2>&1 || true
      else
        kill "$pid" 2>/dev/null || true
      fi
    fi
    rm -f "$file"
  fi
}
