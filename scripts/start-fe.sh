#!/usr/bin/env bash
# Avvia solo il Frontend (porta 5273) con verifica di avvio.
source "$(dirname "${BASH_SOURCE[0]}")/_comuni.sh"
cd "$ROOT_DIR"
if porta_in_ascolto "$FE_PORT"; then
  # «già in ascolto» vale solo se ad ascoltare è node (Vite): un altro programma sulla porta è un errore
  gia_avviato_o_esci "$FE_PORT" "FE" || exit 1
  exit 0
fi
: > "$FE_LOG"
nohup npx vite --host >> "$FE_LOG" 2>&1 &
echo $! > "$PID_DIR/fe.pid"
attendi_porta "$FE_PORT" "FE" 60
