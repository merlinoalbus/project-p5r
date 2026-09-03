#!/usr/bin/env bash
# Ferma solo il Backend.
source "$(dirname "${BASH_SOURCE[0]}")/_comuni.sh"
termina_pidfile "$PID_DIR/be.pid"
termina_porta "$BE_PORT"
echo "[BE] fermato"
