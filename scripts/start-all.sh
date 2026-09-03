#!/usr/bin/env bash
# Avvia Backend e poi Frontend, con verifica.
DIR="$(dirname "${BASH_SOURCE[0]}")"
bash "$DIR/start-be.sh" && bash "$DIR/start-fe.sh"
