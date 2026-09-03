#!/usr/bin/env bash
# Ferma solo il Backend (albero di processi avviato da start-be.sh).
source "$(dirname "${BASH_SOURCE[0]}")/_comuni.sh"
termina_server "$PID_DIR/be.pid" "$BE_PORT"
echo "[BE] fermato"
