#!/usr/bin/env bash
# Riavvia entrambi i server con verifica.
DIR="$(dirname "${BASH_SOURCE[0]}")"
bash "$DIR/stop-all.sh"
sleep 1
bash "$DIR/start-all.sh"
