#!/usr/bin/env bash
# Uso (da WSL/Linux, con python3): bash scripts/verifiche/prova-stop-linux.sh — esce con 0 se tutti i casi passano.
# Non gira in CI: simula `node` con python3 rinominato per verificare la politica di arresto di _comuni.sh.
# Prova del ramo Linux di termina_server con un finto `node` (python3 rinominato) in ascolto.
set -u
source "$(dirname "${BASH_SOURCE[0]}")/../_comuni.sh"
PID_DIR=/tmp/p5r-test-pids; mkdir -p "$PID_DIR" /tmp/nodebin; cp /usr/bin/python3 /tmp/nodebin/node; export PATH=/tmp/nodebin:$PATH
esito() { [ "$1" = "$2" ] && echo "  OK   $3" || { echo "  FAIL $3 (atteso '$2', ottenuto '$1')"; RC=1; }; }
RC=0
echo "--- caso A: pidfile = radice (nohup node ... &), listener = nodo figlio nella catena"
nohup bash -c 'exec -a node bash -c "exec node -m http.server 3199"' >/dev/null 2>&1 & echo $! > $PID_DIR/a.pid
sleep 1.5; esito "$(porta_in_ascolto 3199 && echo si || echo no)" "si" "listener attivo prima dello stop"
termina_server $PID_DIR/a.pid 3199; sleep 0.5
esito "$(porta_in_ascolto 3199 && echo si || echo no)" "no" "porta libera dopo lo stop"
esito "$(pgrep -f 'http.server 3199' | wc -l)" "0" "nessun orfano"
echo "--- caso B: pidfile obsoleto (PID di uno sleep estraneo), listener node presente → si termina solo la catena node, non lo sleep"
sleep 300 & SLEEP_PID=$!; echo $SLEEP_PID > $PID_DIR/b.pid
nohup node -m http.server 3199 >/dev/null 2>&1 & 
sleep 1.5; termina_server $PID_DIR/b.pid 3199; sleep 0.5
esito "$(porta_in_ascolto 3199 && echo si || echo no)" "no" "porta libera"
esito "$(kill -0 $SLEEP_PID 2>/dev/null && echo vivo || echo morto)" "vivo" "processo estraneo (sleep) NON toccato"
kill $SLEEP_PID 2>/dev/null
echo "--- caso C: porta occupata da un processo NON node (python3 vero) → nessuna azione"
nohup python3 -m http.server 3199 >/dev/null 2>&1 & PY_PID=$!
sleep 1.5; termina_server /tmp/inesistente.pid 3199 2>&1 | sed 's/^/  /'
esito "$(kill -0 $PY_PID 2>/dev/null && echo vivo || echo morto)" "vivo" "processo non-node lasciato vivo"
kill $PY_PID 2>/dev/null; sleep 0.3
echo "--- caso D: nessun listener, pidfile di un nostro node ancora in avvio → si termina"
nohup node -c 'import time; time.sleep(300)' >/dev/null 2>&1 & echo $! > $PID_DIR/d.pid; D_PID=$!
sleep 0.5; termina_server $PID_DIR/d.pid 3199 | sed 's/^/  /'
esito "$(kill -0 $D_PID 2>/dev/null && echo vivo || echo morto)" "morto" "processo nostro senza listener terminato"
echo "--- caso E: pidfile inesistente e porta libera → no-op"
termina_server /tmp/inesistente.pid 3199 | sed 's/^/  /'
echo "--- caso F: SIGTERM prima di SIGKILL (processo che intercetta TERM e esce con codice 0)"
nohup node -c 'import signal,sys,time,http.server,socketserver
signal.signal(signal.SIGTERM, lambda *a: (open("/tmp/p5r-term.txt","w").write("TERM"), sys.exit(0)))
socketserver.TCPServer(("",3199), http.server.SimpleHTTPRequestHandler).serve_forever()' >/dev/null 2>&1 & echo $! > $PID_DIR/f.pid
rm -f /tmp/p5r-term.txt; sleep 1.5; termina_server $PID_DIR/f.pid 3199 | sed 's/^/  /'
esito "$(cat /tmp/p5r-term.txt 2>/dev/null)" "TERM" "il server ha ricevuto SIGTERM (arresto ordinato)"
rm -rf $PID_DIR /tmp/nodebin; exit $RC
