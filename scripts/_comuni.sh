#!/usr/bin/env bash
# ============================================================
# Funzioni comuni agli script di gestione server (Git Bash su Windows e Linux)
# ============================================================
# Porte: BE 3101, FE 5273 (dev). Log: BE.log / FE.log nella root.
# I PID vengono salvati in .pids/ per uno stop pulito dell'intero
# albero di processi (bash → npx → tsx watch → node server).
#
# NOTA Windows: `$!` in Git Bash è il PID MSYS del wrapper, NON il PID
# Windows. `winpid_da_msys` lo traduce leggendo la colonna WINPID di
# `ps`, e prima di ogni `taskkill` si verifica che il processo sia
# davvero nostro (bash/node/npm) per non colpire processi estranei.

set -u
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.pids"
BE_PORT=3101
FE_PORT=5273
BE_LOG="$ROOT_DIR/BE.log"
FE_LOG="$ROOT_DIR/FE.log"
mkdir -p "$PID_DIR"

# su_windows → 0 se siamo in Git Bash/MSYS su Windows
su_windows() {
  case "$(uname -s 2>/dev/null)" in
    MINGW*|MSYS*|CYGWIN*) return 0 ;;
    *) return 1 ;;
  esac
}

# porta_in_ascolto <porta> → 0 se qualcosa è in ascolto sulla porta
porta_in_ascolto() {
  local porta="$1"
  if su_windows; then
    netstat -ano 2>/dev/null | grep -E "TCP +[^ ]+:${porta} .*LISTENING" >/dev/null 2>&1 && return 0
    return 1
  fi
  if command -v ss >/dev/null 2>&1; then
    ss -ltn 2>/dev/null | grep -E ":${porta} " >/dev/null 2>&1 && return 0
  elif command -v netstat >/dev/null 2>&1; then
    netstat -ltn 2>/dev/null | grep -E ":${porta} " >/dev/null 2>&1 && return 0
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

# winpid_da_msys <pid-msys> → stampa il WINPID corrispondente (vuoto se non esiste)
winpid_da_msys() {
  ps -p "$1" 2>/dev/null | awk -v p="$1" 'NR > 1 && $1 == p { print $4 }'
}

# comando_msys <pid-msys> → stampa il comando del processo MSYS (vuoto se non esiste)
comando_msys() {
  ps -p "$1" 2>/dev/null | awk -v p="$1" 'NR > 1 && $1 == p { print $NF }'
}

# processo_nostro <comando> → 0 se il comando è uno dei nostri wrapper/runtime
processo_nostro() {
  case "$1" in
    */bash|*/node|*/node.exe|*/npm|*/npx|*/npm.cmd|*/npx.cmd|*/cmd|*/cmd.exe) return 0 ;;
    *) return 1 ;;
  esac
}

# termina_albero_windows <winpid> → taskkill dell'albero, solo se il PID esiste davvero
termina_albero_windows() {
  local winpid="$1"
  [ -z "$winpid" ] && return 1
  if tasklist //FI "PID eq $winpid" 2>/dev/null | grep -E "^[^ ]+ +${winpid} " >/dev/null 2>&1; then
    taskkill //PID "$winpid" //F //T >/dev/null 2>&1 && echo "terminato albero WINPID $winpid"
    return 0
  fi
  return 1
}

# termina_albero_linux <pid> → uccide ricorsivamente i figli, poi il processo
termina_albero_linux() {
  local pid="$1" figlio
  for figlio in $(pgrep -P "$pid" 2>/dev/null); do
    termina_albero_linux "$figlio"
  done
  kill -9 "$pid" 2>/dev/null && echo "terminato PID $pid"
}

# termina_pidfile <file> → uccide l'albero del processo salvato nel pidfile, se è nostro
termina_pidfile() {
  local file="$1" pid cmd winpid
  [ -f "$file" ] || return 0
  pid="$(cat "$file")"
  rm -f "$file"
  [ -z "$pid" ] && return 0
  if su_windows; then
    cmd="$(comando_msys "$pid")"
    if [ -n "$cmd" ] && processo_nostro "$cmd"; then
      winpid="$(winpid_da_msys "$pid")"
      termina_albero_windows "$winpid" || true
    fi
  else
    if [ -d "/proc/$pid" ]; then
      cmd="$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null | awk '{print $1}')"
      if [ -n "$cmd" ] && processo_nostro "$cmd"; then
        termina_albero_linux "$pid"
      fi
    fi
  fi
}

# termina_porta <porta> → uccide i listener sulla porta (fallback, solo processi node)
termina_porta() {
  local porta="$1" pid
  if su_windows; then
    for pid in $(netstat -ano 2>/dev/null | grep -E "TCP +[^ ]+:${porta} .*LISTENING" | awk '{print $NF}' | sort -u); do
      # Si termina solo se il listener è un processo node (mai un processo estraneo).
      if tasklist //FI "PID eq $pid" 2>/dev/null | grep -Ei "^node(\.exe)? +${pid} " >/dev/null 2>&1; then
        taskkill //PID "$pid" //F //T >/dev/null 2>&1 && echo "terminato listener PID $pid (porta $porta)"
      fi
    done
  else
    if command -v lsof >/dev/null 2>&1; then
      for pid in $(lsof -ti tcp:"$porta" -sTCP:LISTEN 2>/dev/null); do
        if [ "$(ps -o comm= -p "$pid" 2>/dev/null)" = "node" ]; then
          termina_albero_linux "$pid"
        fi
      done
    elif command -v fuser >/dev/null 2>&1; then
      fuser -k "${porta}/tcp" >/dev/null 2>&1 || true
    fi
  fi
}
