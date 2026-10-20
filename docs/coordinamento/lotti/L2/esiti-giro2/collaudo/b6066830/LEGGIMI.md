# Prove sul commit da validare b6066830 (Collaudo, 2026-10-20 ~07:20Z)

`newreview-l2` è su b6066830, che dopo 292a122e porta solo documenti: 217e726a e b6066830. Il checkout è pulito. Niente commit, push né scritture sui dati.

| File | Contenuto | Esito |
|---|---|---|
| `1-git.txt` | `rev-parse`, `diff --stat 292a122e HEAD`, `diff --name-only … -- server shared src`, `ls-tree`, `status`, grep 2026-10-21 | solo `docs/` (ARCHITETTURA, DECISIONI, ROADMAP); name-only vuoto; alberi `ccdf7f0f…`, `99c6fb85…`, `f6616819…` come attesi; status vuoto; nessuna data 2026-10-21 |
| `4-rosso-E4.txt` | test E4 di `MappaPage.test.tsx`, forma committata, su `MappaPage.tsx` di 115581b4 | verde su b6066830 (EXIT=0), ROSSO prima (EXIT=1) |
| `4-rosso-E7.txt` | sole asserzioni di E7, isolate in una copia del test (diff nel file) su `AlberoLuoghi.tsx` di 115581b4 | verde su b6066830 (EXIT=0), ROSSO prima (EXIT=1): «Unable to find … role "list" and name "Da verificare"» |
| `4-rosso-E7-primo-tentativo-con-asserzione-pin.txt` | primo tentativo: per un errore del sed era rimasta l'asserzione di E5 sull'assenza di «pin» | stesso esito; tenuto per trasparenza, non vale come prova di E7 isolato |
| `5-pulizia.txt` | rimozione della copia temporanea | worktree tolto, checkout di rilascio pulito |

## E7 isolato: cosa si è lanciato
`OrganizzazioneMappe.E7.test.tsx` è una copia temporanea di `OrganizzazioneMappe.test.tsx` nella forma committata, creata solo nella copia dello scratchpad e poi tolta. Il test «E5 ed E7» cambia così:
- diventa «E7 isolato»;
- perde le asserzioni di E5: le quattro `expect(riga(…))`, l'assenza di «pin», il commento e la costante `riga`;
- l'ultima asserzione controlla che il collegamento dello staff stia nella lista «Da verificare», senza più il testo «2 versioni · 0 spilli».

Restano tre controlli:
- lo staff non è in «Quartieri di Tokyo»;
- la lista «Da verificare» esiste;
- lo staff è in quella lista.

Comando: `npx vitest run --reporter=verbose src/components/mappe/OrganizzazioneMappe.E7.test.tsx -t "E7 isolato"`.

## Copia temporanea
`git worktree add --detach` su b6066830 nello scratchpad del Collaudo, con `node_modules` della release collegato in sola lettura. Per ogni caso:
1. controllo verde;
2. `git checkout 115581b4 -- <file di codice>`;
3. test;
4. ripristino.

Alla fine la copia è stata tolta.
