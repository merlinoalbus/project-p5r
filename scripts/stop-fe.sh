#!/usr/bin/env bash
# Ferma solo il Frontend.
source "$(dirname "${BASH_SOURCE[0]}")/_comuni.sh"
termina_pidfile "$PID_DIR/fe.pid"
termina_porta "$FE_PORT"
echo "[FE] fermato"
