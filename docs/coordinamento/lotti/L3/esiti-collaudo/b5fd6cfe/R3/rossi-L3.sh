#!/usr/bin/env bash
# R3 del giro 1 di L3: per ogni correzione, il test del commit nella forma committata lanciato prima sul codice del commit (controllo
# verde), poi sul codice del commit precedente (rosso atteso). Worktree staccato nello scratchpad, node_modules della linea collegato in
# sola lettura (junction), mai `git clean`. La linea di rilascio non si tocca.
set -u
LINEA="C:/Repository/project-p5r/.claude/worktrees/p5s-sviluppo-l2"
W="C:/Users/rober/AppData/Local/Temp/claude/C--Repository-project-p5r--claude-worktrees-p5s-sviluppo-l2/a4ff2e39-92e9-416b-be66-a66bc1f16e27/scratchpad/rossi-L3"
O="C:/Users/rober/.claude/p5s-coordinamento/lotti/L3/esiti-collaudo/b5fd6cfe/R3"
mkdir -p "$O"
cd "$W" || exit 9
RIEP="$O/0-riepilogo.txt"
echo "### $(date -u +%FT%TZ) rossi grezzi di L3 — worktree $W (staccato), linea newreview-l3 = $(git -C "$LINEA" rev-parse HEAD)" > "$RIEP"
printf '%s\n' \
 "UX3-9 7b5e8f07" "UX3-10 c5a0ccd3" "UX3-11 765fb2a1" "LAY3-3 9e8baea3" "LAY3-4 48d7a958" "LAY3-5 7562f6ac" "LAY3-6 8535c16b" \
 "LAY3-7a 5bedd907" "LAY3-7b db7d0423" "LAY3-8 08da0557" "UX3-12 d3c97ac9" "UX3-13 2df44d30" \
 "NR3-4 d73e7027" "AP3-1 1b29352b" "AP3-2 235b1216" "AP3-4 e8324898" "UX3-7 7efd19e0" "UX3-8 d446e4ab" "LAY3-2+R3-41 f444645d" \
 "E2-BE1 0cfbe028" "E2-BE2 bc08e3ec" "E2-FE c8338fd0" | while read -r ID C; do
  F="$O/$ID-$C.txt"
  git checkout -q -f --detach "$C" || { echo "$ID $C: checkout fallito" >> "$RIEP"; continue; }
  TEST=$(git diff --name-only "$C^" "$C" | grep -E '\.test\.tsx?$' | tr '\n' ' ')
  SRC=$(git diff --name-only --diff-filter=M "$C^" "$C" | grep -v '^docs/' | grep -vE '\.test\.tsx?$' | tr '\n' ' ')
  NUOVI=$(git diff --name-only --diff-filter=A "$C^" "$C" | grep -v '^docs/' | grep -vE '\.test\.tsx?$' | tr '\n' ' ')
  {
    echo "### $(date -u +%FT%TZ) $ID — commit $C ($(git log -1 --format=%s "$C"))"
    echo "### worktree staccato su $(git rev-parse HEAD); commit precedente $(git rev-parse --short "$C^")"
    echo "### test del commit (forma committata): ${TEST:-NESSUNO}"
    echo "### sorgenti del commit da riportare a $C^: ${SRC:-nessuno}; sorgenti nuovi da togliere: ${NUOVI:-nessuno}"
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
  ROSSI=$(grep -E '^ +(×|FAIL) ' "$F" | grep -E '×' | sed 's/^ *× *//; s/ [0-9]*ms$//' | sort -u | head -8 | tr '\n' ';')
  echo "$ID $C | controllo ${E1:-—} | prima ${E2:-—} | test rossi prima: ${ROSSI:-nessuno}" >> "$RIEP"
done
echo "### $(date -u +%FT%TZ) fine" >> "$RIEP"
