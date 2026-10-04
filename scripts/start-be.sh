#!/usr/bin/env bash
# Avvia solo il Backend (porta BE_PORT di .env, 3101 di base) con verifica di avvio.
source "$(dirname "${BASH_SOURCE[0]}")/_comuni.sh"
cd "$ROOT_DIR"
if porta_in_ascolto "$BE_PORT"; then
  # «già in ascolto» vale solo se ad ascoltare è node (il nostro server): un altro programma sulla porta è un errore
  gia_avviato_o_esci "$BE_PORT" "BE" || exit 1
  exit 0
fi
: > "$BE_LOG"
# il comando sta in package.json (`dev:server`), come per `npm run dev`: scritto una volta sola (rilievo S8)
nohup npm run dev:server >> "$BE_LOG" 2>&1 &
echo $! > "$PID_DIR/be.pid"
attendi_porta "$BE_PORT" "BE" 60
