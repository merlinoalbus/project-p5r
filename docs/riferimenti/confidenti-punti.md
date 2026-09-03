# Punti dei Confidenti e note delle Doti sociali — Persona 5 Royal

Riferimento di gioco usato dal tracker della partita (scheda Doti e scheda Confidenti).
Le fonti sono comunitarie e non ufficiali: dove due fonti indipendenti concordano il dato è
considerato affidabile; le discrepanze sono segnalate.

## 1. Doti sociali (Conoscenza, Fascino, Coraggio, Gentilezza, Perizia)

Ogni azione mostra da 1 a 3 note (♪). Le note corrispondono a punti interni:

| Note | Punti | Note |
|---|---|---|
| ♪ | 2 | |
| ♪♪ | 3 | |
| ♪♪♪ | 5 | 7 con i libri a resa maggiorata |

- Lettura della fortuna di Chihaya (o film al cinema con effetto analogo): punti ×1,5 arrotondati per difetto.
- Soglie dei 5 ranghi (punti cumulativi) e titoli italiani:

| Dote | R1 | R2 | R3 | R4 | R5 |
|---|---|---|---|---|---|
| Conoscenza | Ignorante 0 | Diligente 34 | Studioso 82 | Dotto 126 | Erudito 192 |
| Fascino | Indifferente 0 | Interessante 6 | Affascinante 52 | Carismatico 92 | Irresistibile 132 |
| Coraggio | Pavido 0 | Audace 11 | Coraggioso 38 | Temerario 68 | Cuor di leone 113 |
| Gentilezza | Inoffensivo 0 | Gentile 14 | Empatico 47 | Altruista 92 | Angelico 136 |
| Perizia | Incapace 0 | Decente 12 | Bravo 34 | Asso 60 | Migliore 87 |

Fonti: https://www.allgamestaff.it/persona-5-royal/ (guida alle doti sociali) e Megami Tensei Wiki, pagina
"Social Stats" (tabella P5R). Dati nel seed: `scripts/seed/glossario.ts` (`DOTI_SOCIALI`, `PUNTI_PER_NOTE`,
`PUNTI_TRE_NOTE_LIBRO`, `MOLTIPLICATORE_FORTUNA`) → `data/seed/doti.json` → tabella `dote_sociale_rango`.

## 2. Confidenti: meccanica dei punti

- Le note sono una visualizzazione di un punteggio interno: ogni risposta vale 0, 5, 10 o 15 punti base
  (0/1/2/3 note "innate"). Visualizzazione: ♪ = 5 punti, ♪♪ = 6–10, ♪♪♪ = 11 o più.
- Persona dello stesso arcano in scorta (anche non equipaggiata, livello irrilevante, non cumulabile): ×1,5.
  È il motivo per cui "compare una nota in più": 5→7,5 (♪♪), 10→15 (♪♪♪), 15→22,5 (resta ♪♪♪ ma i punti salgono).
- Altri moltiplicatori cumulabili: 1º agli esami ×1,5 / top 10 ×1,2 (fino all'esame successivo; solo Ryuji, Ann,
  Makoto, Haru, Sojiro, Kawakami, Kasumi); invito accettato subito via SMS la sera prima ×1,2.
- Regali consigliati: 50 punti base (×1,5 con la Persona dell'arcano). Si regalano solo in eventi senza salto di rango.
- Uscita generica senza salto di rango: 10 punti base (Sojiro prima del 22/8: 5).
- Al salto di rango il contatore torna a 0; i punti guadagnati durante l'evento di salto contano per il rango
  successivo; l'eccedenza non si riporta. L'evento di salto, una volta avviato, porta sempre al rango successivo.
- Sblocco (0→1) e 1→2 non richiedono punti per nessun Confidente.
- Il gioco segnala il raggiungimento della soglia con stelle multicolori attorno alle note e un jingle aggiuntivo.
- Frazioni: le fonti divergono (7,5 conservato vs troncato a 7); l'app conserva i decimali e li mostra in formato italiano (7,5).

Nell'app la scheda Confidenti replica il gioco: pulsanti ♪/♪♪/♪♪♪ (5/10/15 punti base), "Regalo" (50) e "Uscita" (10);
il bonus ×1,5 della Persona dello stesso arcano è proposto automaticamente se la scorta della partita la contiene
(forzabile per Confidente); moltiplicatori globali per esami (1º ×1,5, top 10 ×1,2) e invito via SMS (×1,2);
"Annulla ultimo" toglie l'ultimo incremento. I decimali sono conservati (7,5) e mostrati in formato italiano.
Barra verso il rango successivo e "mancano N"; al cambio di rango i punti ripartono da zero (salvo valore esplicito).

## 3. Punti necessari per il passaggio di rango (P5R)

Valore = punti da accumulare, una volta raggiunto il rango N, per innescare l'evento N→N+1.
Fonte A = guida Steam "Complete Confidants Guide - Persona 5 Royal" (colonna "Next Pts");
fonte B = walkthrough datamined megaten-database (aqiu384, "x/y to rank up").
121 celle su 122 coincidono; unica discrepanza Akechi 6→7 (A: 0, B: 55): adottato 55, da verificare.

| Confidente (arcano) | 1→2 | 2→3 | 3→4 | 4→5 | 5→6 | 6→7 | 7→8 | 8→9 | 9→10 |
|---|---|---|---|---|---|---|---|---|---|
| Ryuji (Carro) | 0 | 20 | 30 | 20 | 30 | 45 | 45 | 60 | 60 |
| Ann (Amanti) | 0 | 35 | 25 | 20 | 35 | 45 | 30 | 67 | 35 |
| Yusuke (Imperatore) | 0 | 0 | 25 | 15 | 25 | 20 | 26 | 22 | 35 |
| Makoto (Papessa) | 0 | 0 | 15 | 20 | 20 | 20 | 30 | 20 | 55 |
| Futaba (Eremita) | 0 | 0 | 10 | 15 | 26 | 21 | 0 | 30 | 35 |
| Haru (Imperatrice) | 0 | 0 | 14 | 28 | 15 | 20 | 40 | 22 | 20 |
| Akechi (Giustizia) | 0 | 0 | 23 | 40 | 0 | 55* | 0 | 0 | 0 (automatico) |
| Kasumi (Fede) | 0 | 15 | 51 | 20 | 0 | 0 (bloccato fino al 13/1) | 55 | 40 | 80 |
| Sojiro (Ierofante) | 0 | 30 | 40 | 43 | 20 | 20 | 14 | 0 | 40 |
| Takemi (Morte) | 0 | 0 | 11 | 20 | 11 | 11 | 0 | 42 | 36 |
| Kawakami (Temperanza) | 0 | 20 | 37 | 0 | 11 | 37 | 0 | 0 | 0 |
| Yoshida (Sole) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Ohya (Diavolo) | 0 | 0 | 12 | 15 | 25 | 22 | 0 | 21 | 38 |
| Hifumi (Stella) | 0 | 0 | 10 | 14 | 14 | 22 | 0 | 30 | 30 |
| Chihaya (Fortuna) | 0 | 0 | 15 | 15 | 15 | 30 | 20 | 46 | 21 |
| Iwai (Appeso) | 0 | 5 | 15 | 25 | 40 | 40 | 0 | 25 | 40 |
| Shinya (Torre) | 0 | 0 | 11 | 14 | 20 | 25 | 0 | 0 | 30 |
| Maruki (Consigliere) | 0 | 0 | 28 | 42 | 32 | 28 | 60 | 30 | 0 (automatico 18/11) |

\* Akechi 6→7: discrepanza fra le fonti (vedi sopra).

Uno "0" intermedio indica un passaggio legato a storia, richiesta di Mementos o dote sociale, non ai punti.

Confidenti senza progressione a punti (nessuna soglia nel seed):

| Confidente | Progressione |
|---|---|
| Igor (Matto), Morgana (Mago), Sae (Giudizio) | storia |
| Mishima (Luna) | richieste di Mementos completate: r3=1, r4=2, r5=3, r6=4, r7=5, r8=7, r9=8, r10=10 |
| Gemelle Custodi (Forza) | fusioni di Persona con le skill richieste |

Dati nel seed: `scripts/seed/glossario.ts` (`CONFIDENTI[].puntiPerRango`, indice 0 = 1→2) → `data/seed/confidenti.json`
→ tabella `confidente_rango` (rango N, punti necessari per N→N+1; 0 = non legato ai punti).

## 4. Fonti

- Megami Tensei Wiki, "Confidant" (sezione Confidant Points): https://megamitensei.fandom.com/wiki/Confidant
- Wiki giapponese P5R "好感度": https://wikiwiki.jp/persona5r/好感度
- Guida Steam "Complete Confidants Guide - Persona 5 Royal": https://steamcommunity.com/sharedfiles/filedetails/?id=2877810456
- Walkthrough datamined megaten-database (aqiu384): https://aqiu384.github.io/megaten-database/p5r/ace-walkthrough.html
- allgamestaff.it, guide ai ranghi dei Confidenti (solo note, senza soglie numeriche): https://www.allgamestaff.it/persona-5-royal/indice/

## 5. Evoluzioni previste

Le "risposte migliori" per evento (testo, punti base, telefonata, prerequisiti) verranno modellate nella Fase 3
(modulo Confidenti) con struttura `evento{confidente, rango, risposte[{testo, puntiBase}], telefonata}` e calcolo
`punti = base × (Persona arcano 1,5) × (esame 1,5|1,2) × (invito 1,2)`.
