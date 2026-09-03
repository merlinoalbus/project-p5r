#!/usr/bin/env bash
# Ferma solo il Frontend (albero di processi avviato da start-fe.sh).
source "$(dirname "${BASH_SOURCE[0]}")/_comuni.sh"
termina_server "$PID_DIR/fe.pid" "$FE_PORT"
echo "[FE] fermato"
