#!/usr/bin/env bash
# Riavvia solo il Frontend con verifica.
DIR="$(dirname "${BASH_SOURCE[0]}")"
bash "$DIR/stop-fe.sh"
sleep 1
bash "$DIR/start-fe.sh"
