#!/usr/bin/env bash
# Avvia solo il Backend (porta 3101) con verifica di avvio.
source "$(dirname "${BASH_SOURCE[0]}")/_comuni.sh"
cd "$ROOT_DIR"
if porta_in_ascolto "$BE_PORT"; then
  # «già in ascolto» vale solo se ad ascoltare è node (il nostro server): un altro programma sulla porta è un errore
  gia_avviato_o_esci "$BE_PORT" "BE" || exit 1
  exit 0
fi
: > "$BE_LOG"
nohup npx tsx watch --env-file=.env server/index.ts >> "$BE_LOG" 2>&1 &
echo $! > "$PID_DIR/be.pid"
attendi_porta "$BE_PORT" "BE" 60
