#!/usr/bin/env bash
# Avvia solo il Frontend (porta FE_PORT di .env, 5273 di base) con verifica di avvio.
source "$(dirname "${BASH_SOURCE[0]}")/_comuni.sh"
cd "$ROOT_DIR"
if porta_in_ascolto "$FE_PORT"; then
  # «già in ascolto» vale solo se ad ascoltare è node (Vite): un altro programma sulla porta è un errore
  gia_avviato_o_esci "$FE_PORT" "FE" || exit 1
  exit 0
fi
: > "$FE_LOG"
# il comando sta in package.json (`dev:client`), come per `npm run dev`: scritto una volta sola (rilievo S8)
nohup npm run dev:client >> "$FE_LOG" 2>&1 &
echo $! > "$PID_DIR/fe.pid"
attendi_porta "$FE_PORT" "FE" 60
