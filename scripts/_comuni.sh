#!/usr/bin/env bash
# ============================================================
# Funzioni comuni agli script di gestione server (Git Bash su Windows e Linux)
# ============================================================
# Porte: BE 3101, FE 5273 (dev). Log: BE.log / FE.log nella root.
# I PID vengono salvati in .pids/ per uno stop pulito dell'intero
# albero di processi (bash/npx → tsx watch → node server).
#
# Politica di arresto (`termina_server <pidfile> <porta>`):
#   1. si individua il processo in ascolto sulla porta: deve essere `node`,
#      altrimenti non si tocca nulla (mai terminare processi estranei);
#   2. si risale la catena dei padri finché si incontra il processo del
#      pidfile (radice dell'albero avviato da noi) oppure finché i padri
#      sono runtime nostri (node/cmd/npm/npx); ci si ferma PRIMA di
#      qualsiasi altro processo (es. il terminale interattivo dell'utente);
#   3. si termina l'albero dalla radice trovata: su Linux SIGTERM a tutti,
#      attesa fino a 5 s, poi SIGKILL ai superstiti; su Windows
#      `taskkill //T` (non esiste un segnale graceful per node.exe).
#   Se non c'è nessun listener ma il pidfile indica un processo nostro
#   (avvio ancora in corso), si termina quell'albero.
#
# NOTA Windows: `$!` in Git Bash è il PID MSYS del wrapper, NON il PID
# Windows: `winpid_da_msys` lo traduce leggendo la colonna WINPID di `ps`.

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

# ---------------------------------------------------------------
# Porte
# ---------------------------------------------------------------

# pid_in_ascolto <porta> → stampa il PID (nativo) in ascolto sulla porta, vuoto se nessuno
pid_in_ascolto() {
  local porta="$1"
  if su_windows; then
    netstat -ano 2>/dev/null | awk -v p=":${porta}" '$1 == "TCP" && index($2, p) == length($2) - length(p) + 1 && $4 == "LISTENING" { print $5; exit }'
  elif command -v ss >/dev/null 2>&1; then
    ss -ltnp 2>/dev/null | awk -v p=":${porta}" 'index($4, p) == length($4) - length(p) + 1 { if (match($0, /pid=[0-9]+/)) { print substr($0, RSTART + 4, RLENGTH - 4); exit } }'
  elif command -v lsof >/dev/null 2>&1; then
    lsof -ti tcp:"$porta" -sTCP:LISTEN 2>/dev/null | head -n 1
  fi
}

# porta_in_ascolto <porta> → 0 se qualcosa è in ascolto sulla porta
porta_in_ascolto() {
  [ -n "$(pid_in_ascolto "$1")" ]
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

# ---------------------------------------------------------------
# Tabella processi (caricata una volta per invocazione: "pid|ppid|nome")
# ---------------------------------------------------------------

TABELLA_PROCESSI=""

carica_tabella_processi() {
  if su_windows; then
    TABELLA_PROCESSI="$(powershell -NoProfile -NonInteractive -Command \
      "Get-CimInstance Win32_Process | ForEach-Object { \"\$(\$_.ProcessId)|\$(\$_.ParentProcessId)|\$(\$_.Name)\" }" 2>/dev/null | tr -d '\r')"
  else
    TABELLA_PROCESSI="$(ps -eo pid=,ppid=,comm= 2>/dev/null | awk '{ print $1 "|" $2 "|" $3 }')"
  fi
}

# nome_processo <pid> → nome corto (es. node.exe, bash, cmd.exe), vuoto se non esiste
nome_processo() {
  printf '%s\n' "$TABELLA_PROCESSI" | awk -F'|' -v p="$1" '$1 == p { print $3; exit }'
}

# padre_processo <pid> → PID del padre, vuoto se non esiste
padre_processo() {
  printf '%s\n' "$TABELLA_PROCESSI" | awk -F'|' -v p="$1" '$1 == p { print $2; exit }'
}

# figli_processo <pid> → PID dei figli diretti
figli_processo() {
  printf '%s\n' "$TABELLA_PROCESSI" | awk -F'|' -v p="$1" '$2 == p { print $1 }'
}

# e_node <nome> → 0 se il nome è il runtime node
e_node() {
  case "$1" in
    node|node.exe) return 0 ;;
    *) return 1 ;;
  esac
}

# e_runtime_nostro <nome> → 0 se è un anello intermedio dei nostri avvii (mai bash: potrebbe
# essere il terminale dell'utente; la radice bash è ammessa SOLO se coincide col pidfile)
e_runtime_nostro() {
  case "$1" in
    node|node.exe|cmd.exe|npm|npx|npm.cmd|npx.cmd|sh) return 0 ;;
    *) return 1 ;;
  esac
}

# e_radice_ammessa <nome> → 0 se il processo del pidfile può essere considerato nostro
e_radice_ammessa() {
  case "$1" in
    bash|bash.exe|sh|node|node.exe|cmd.exe|npm|npx|nohup) return 0 ;;
    *) return 1 ;;
  esac
}

# winpid_da_msys <pid-msys> → WINPID corrispondente (vuoto se non esiste)
winpid_da_msys() {
  ps -p "$1" 2>/dev/null | awk -v p="$1" 'NR > 1 && $1 == p { print $4 }'
}

# ---------------------------------------------------------------
# Terminazione
# ---------------------------------------------------------------

# albero_processi <pid> → stampa il PID e tutti i discendenti (profondità prima)
albero_processi() {
  local pid="$1" figlio
  echo "$pid"
  for figlio in $(figli_processo "$pid"); do
    albero_processi "$figlio"
  done
}

# termina_albero <pid> → termina il processo e tutti i discendenti
termina_albero() {
  local radice="$1"
  if su_windows; then
    taskkill //PID "$radice" //F //T >/dev/null 2>&1 && echo "terminato albero WINPID $radice"
    return 0
  fi
  local pids i vivi p
  pids="$(albero_processi "$radice")"
  # SIGTERM a tutti (il server chiude HTTP e SQLite in modo ordinato)…
  for p in $pids; do kill -TERM "$p" 2>/dev/null || true; done
  # …attesa fino a 5 s…
  for i in 1 2 3 4 5 6 7 8 9 10; do
    vivi=""
    for p in $pids; do kill -0 "$p" 2>/dev/null && vivi="$vivi $p"; done
    [ -z "$vivi" ] && break
    sleep 0.5
  done
  # …poi SIGKILL ai superstiti.
  for p in $vivi; do kill -KILL "$p" 2>/dev/null || true; done
  echo "terminato albero PID $radice"
}

# radice_da_terminare <pid-radice-pidfile> <porta> → stampa il PID da cui terminare l'albero, vuoto se nulla da fare
radice_da_terminare() {
  local radice="$1" porta="$2" listener corrente padre nome hop
  listener="$(pid_in_ascolto "$porta")"
  if [ -z "$listener" ]; then
    # Nessun listener: si termina solo se il pidfile indica un processo nostro ancora vivo.
    if [ -n "$radice" ] && e_radice_ammessa "$(nome_processo "$radice")"; then
      echo "$radice"
    fi
    return 0
  fi
  # Il listener deve essere node: in caso contrario la porta è occupata da altro.
  if ! e_node "$(nome_processo "$listener")"; then
    echo "[avviso] la porta $porta è occupata da '$(nome_processo "$listener")' (PID $listener), non è un nostro server: nessuna azione" >&2
    return 0
  fi
  if [ -n "$radice" ] && [ "$listener" = "$radice" ]; then
    echo "$radice"
    return 0
  fi
  corrente="$listener"
  for hop in 1 2 3 4 5 6 7 8 9 10 11 12; do
    padre="$(padre_processo "$corrente")"
    [ -z "$padre" ] || [ "$padre" = "0" ] && break
    if [ -n "$radice" ] && [ "$padre" = "$radice" ]; then
      corrente="$radice"
      break
    fi
    nome="$(nome_processo "$padre")"
    e_runtime_nostro "$nome" || break
    corrente="$padre"
  done
  echo "$corrente"
}

# termina_server <pidfile> <porta> → arresta l'albero del server avviato dai nostri script
termina_server() {
  local file="$1" porta="$2" radice="" pid_file radice_effettiva
  carica_tabella_processi
  if [ -f "$file" ]; then
    pid_file="$(cat "$file")"
    rm -f "$file"
    if [ -n "$pid_file" ]; then
      if su_windows; then
        radice="$(winpid_da_msys "$pid_file")"
      else
        radice="$pid_file"
      fi
      # Un pidfile obsoleto (PID inesistente o riusato da altro) non è una radice valida.
      if [ -n "$radice" ] && ! e_radice_ammessa "$(nome_processo "$radice")"; then
        radice=""
      fi
    fi
  fi
  radice_effettiva="$(radice_da_terminare "$radice" "$porta")"
  if [ -z "$radice_effettiva" ]; then
    echo "nessun server nostro da terminare (porta $porta)"
    return 0
  fi
  termina_albero "$radice_effettiva"
}
