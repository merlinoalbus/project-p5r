# Righe di `difetti.md` «corretto da FE/BE, da verificare»: hash e test (Collaudo, 2026-10-20 ~10:00Z)

Fonte: `docs/coordinamento/lotti/L3/difetti.md` nella forma di fd988a3e, uguale a newreview (copia in `difetti-fd988a3e.md`). La copia in `~/.claude/p5s-coordinamento/lotti/L3/difetti.md` è più vecchia (07:40): non ha le parti «Corretto da FE» della ripresa, quindi non è quella da allineare.

Il controllo automatico è in `5-difetti-controllo.txt`. Una correzione alla lettura: alla riga 31 il «nessun test» è un falso positivo, nasce da «nessun testo troncato». In quella riga i test ci sono.

## Esito: nessuna riga della ripresa di L3 cita il suo hash
Il commit si ricava senza ambiguità dall'oggetto del commit. Va scritto nella riga.

| Riga | Difetto | Commit (da scrivere) | Test citati nella riga |
|---|---|---|---|
| 29 | NR3-4 | d73e7027 | sì: «dalla casa di un'area (senza parametri) si apre la sua predefinita…», rosso poi verde, 66/66 |
| 23 | AP3-1 | 1b29352b | sì: due test rosso poi verde, 68/68 nel file |
| 24 | AP3-2 | 235b1216 | sì: 2 nel `describe` «AP3-2», 70/70 |
| 26 | AP3-4 | e8324898 | sì: 5 test in 4 file, 168/168 nei sei file |
| 32 | UX3-8 | d446e4ab | sì: 27/27 in `MappaPage.test.tsx` |
| 30 | UX3-7 | 7efd19e0 | sì: «UX3-7: l'elenco sotto la griglia si chiama come quel che contiene» |
| 31 | E3, parola «pin», residui di L2 | 7efd19e0 | sì, ma per il solo cambio di parola la riga dichiara che il rosso non è stato visto |
| 31 | E2 | BE 0cfbe028 + bc08e3ec (citati), **FE c8338fd0 non citato** | sì: «E2: intestazione…», 89/89 |
| 28 | LAY3-2 | f444645d | nessuno, dichiarato («è solo disposizione, che jsdom non misura») |

## Righe più vecchie, nel codice già pubblicato su p5s (prima di b28bade7)
| Riga | Difetto | Commit | Test |
|---|---|---|---|
| 19 | UX3-3 | non citato; il codice sta nel commit cumulativo 01e7ae12 | da vedere nella riga (misure; nessun file di test nominato) |
| 22 | UX3-6 | non citato (01e7ae12) | sì: `DungeonDettaglioPage.test.tsx` |
| 27 | LAY3-1 | non citato (01e7ae12) | **nessun test e nessuna dichiarazione «nessun test»**: solo misure |
| 18 | UX3-2 | non citato | test in `InfiltrazioniVoce.test.tsx`; già **verificato** da UX |

## Altro
- **R3-41** («visore entro metà altezza», corretto in f444645d insieme a LAY3-2) **non ha una riga in `difetti.md`**. Se ne parla solo in `ux.md`, `layout.md`, `layout-casi.md`, `fe.md`, `modifiche.md` e `STATO-ATTUALE.md` («resta lo sforamento a 1024×690»).
- I Vitest mirati sul commit esatto sono verdi: `3-vitest.txt`, 12 file, 267/267. Comprendono i test nominati qui sopra per `MappaPage`, `OrganizzazioneMappe`, `DungeonDettaglioPage`, `EditorMappaPage`, `navigazioneMappa`, `presentazioneMappa`, `RaccoltaPlanimetrie` e `mappe-conteggi-pin`.
