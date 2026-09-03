#!/usr/bin/env bash
# Ferma Backend e Frontend.
DIR="$(dirname "${BASH_SOURCE[0]}")"
bash "$DIR/stop-fe.sh"
bash "$DIR/stop-be.sh"
