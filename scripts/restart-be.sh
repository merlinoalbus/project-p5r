#!/usr/bin/env bash
# Riavvia solo il Backend con verifica.
DIR="$(dirname "${BASH_SOURCE[0]}")"
bash "$DIR/stop-be.sh"
sleep 1
bash "$DIR/start-be.sh"
