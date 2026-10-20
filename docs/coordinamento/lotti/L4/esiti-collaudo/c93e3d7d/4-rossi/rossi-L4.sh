#!/usr/bin/env bash
# Rossi grezzi dei 7 commit FE di L4 sulla linea newreview-l4: per ogni commit C il suo test (forma committata) prima sul codice di C
# (controllo verde), poi coi sorgenti riportati a C^ (rosso atteso). Worktree staccato nello scratchpad, node_modules della linea
# collegato in sola lettura (junction), mai `git clean`. La linea di rilascio non si tocca.
set -u
LINEA="C:/Repository/project-p5r/.claude/worktrees/p5s-sviluppo-l2"
W="C:/Users/rober/AppData/Local/Temp/claude/C--Repository-project-p5r--claude-worktrees-p5s-sviluppo-l2/a4ff2e39-92e9-416b-be66-a66bc1f16e27/scratchpad/rossi-L4"
O="$1"
mkdir -p "$O"
cd "$W" || exit 9
RIEP="$O/0-riepilogo.txt"
echo "### $(date -u +%FT%TZ) rossi grezzi di L4 — worktree $W (staccato), linea newreview-l4 = $(git -C "$LINEA" rev-parse HEAD)" > "$RIEP"
printf '%s\n' \
 "§8.11 c438ff27 c4e9f74e" "§8.6 5cb98018 d60bf046" "§4.2 672b184d 9edb1dc3" "§4.3 c2c6d0d2 0219db62" \
 "§4.1-carattere f6a6d13e 51c5f1a9" "§4.1-esaurito c0bbce1c 43303bc5" "§4.1-anche-nella e058918c-sulla-linea-24bf025a" | while read -r ID C ORIG; do
  [ "$ID" = "§4.1-anche-nella" ] && { C=24bf025a; ORIG=e058918c; }
  N=$(echo "$ID" | tr -d '§')
  F="$O/$N-$C.txt"
  git checkout -q -f --detach "$C" || { echo "$ID $C: checkout fallito" >> "$RIEP"; continue; }
  TEST=$(git diff --name-only "$C^" "$C" | grep -E '\.test\.tsx?$' | tr '\n' ' ')
  SRC=$(git diff --name-only --diff-filter=M "$C^" "$C" | grep -v '^docs/' | grep -vE '\.test\.tsx?$' | tr '\n' ' ')
  NUOVI=$(git diff --name-only --diff-filter=A "$C^" "$C" | grep -v '^docs/' | grep -vE '\.test\.tsx?$' | tr '\n' ' ')
  {
    echo "### $(date -u +%FT%TZ) $ID — commit sulla linea $C (originale $ORIG): $(git log -1 --format=%s "$C")"
    echo "### worktree staccato su $(git rev-parse HEAD); commit precedente $(git rev-parse --short "$C^")"
    echo "### test del commit (forma committata): ${TEST:-NESSUNO}"
    echo "### sorgenti da riportare a $C^: ${SRC:-nessuno}; sorgenti nuovi da togliere: ${NUOVI:-nessuno}"
    if [ -z "$TEST" ]; then echo "### il commit non tocca test: nessun rosso da riprodurre"; else
      echo "### 1) controllo sul codice di $C: npx vitest run --reporter=verbose $TEST"; npx vitest run --reporter=verbose $TEST; echo "EXIT=$?"
      [ -n "$SRC" ] && git checkout "$C^" -- $SRC
      for n in $NUOVI; do rm -f "$n"; done
      echo "### stato della copia dopo il ritorno ai sorgenti di $C^ (git status --porcelain)"; git status --porcelain
      echo "### test invariati rispetto a $C:"; git diff --quiet "$C" -- $TEST && echo "sì, identici al commit"
      echo "### 2) sul codice di $C^: npx vitest run --reporter=verbose $TEST"; npx vitest run --reporter=verbose $TEST; echo "EXIT=$?"
    fi
    git checkout -q -f --detach "$C"; echo "### ripristino della copia a $C: $(git status --porcelain | wc -l) righe in status"
  } > "$F" 2>&1
  E1=$(grep -E '^EXIT=' "$F" | sed -n 1p); E2=$(grep -E '^EXIT=' "$F" | sed -n 2p)
  ROSSI=$(grep -E '^ +× ' "$F" | sed 's/^ *× *//; s/ [0-9]*ms$//' | sort -u | head -10 | tr '\n' ';')
  ERR=$(grep -m1 -E 'FAIL .*\[ ' "$F" | head -1)
  echo "$ID $C ($ORIG) | controllo ${E1:-—} | prima ${E2:-—} | test rossi prima: ${ROSSI:-nessuno} ${ERR:+| errore del file: $ERR}" >> "$RIEP"
done
echo "### $(date -u +%FT%TZ) fine" >> "$RIEP"
