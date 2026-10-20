# L3 · piano del Collaudo (preparato il 2026-10-20 04:47, a L2 in validazione su 5ae62692)

Preparato senza toccare il checkout né i dati di 3301/5473: letture da git (`newreview`) e dai documenti di `lotti/L3/`.

## 1. Come arriva il codice di L3 sull'istanza
- Stato a oggi: `newreview-l2` = 5ae62692 (L2 + cherry-pick 600af81c ← e9860334, 2222d51f ← 227937b7 + ROADMAP).
  `newreview` = fd4bda38 (… caf7b511 L3 BE, e9860334, 227937b7, ae764470, fd4bda38).
- **I due branch si sono separati**: i cherry-pick hanno hash diversi dagli originali, quindi `git merge --ff-only <commit di L3>` su
  `newreview-l2` **non è possibile**.
- Strada consigliata (come per L1 con 75894664): dopo l'APPROVATO di L2 il PM fa il merge di `newreview-l2` in `newreview`. Il
  contenuto dei file cherry-picked è identico agli originali (stesso sha256 del diff), quindi il merge non dà conflitti di contenuto. Il
  Collaudo poi fa `git merge --ff-only <hash>` sul commit di L3 indicato dal PM, **sempre sull'hash e mai sul nome del branch**
  (incidente del 04:18).
- Alternativa, solo su indicazione del PM: `git reset --hard <hash>` del branch locale `newreview-l2` sul commit di L3 di `newreview`. Il
  branch è solo del Collaudo, ma i commit 600af81c/2222d51f/5ae62692 resterebbero solo nel reflog se non sono già stati integrati.
- Dipendenze: nessun cambio a `package.json`/`package-lock.json` fra 2222d51f e `newreview`, quindi `npm ci` non serve (da ricontrollare
  sull'hash finale).

## 2. Dati
- Migrazione nuova: **110 «Aree dei Palazzi»** (`server/db/migrations/110_aree_dei_palazzi.ts`, con il file `dati/110-nomi-aree-palazzi.json`).
  Crea `infiltrazione_area`, `voce_infiltrazione`, `proposta_infiltrazione_voce` e le colonne «da rivedere» di `voce_giornata`; un'Area per
  ogni gruppo d'immagini e planimetria sciolta dei Palazzi (Memento esclusi); legami dalle planimetrie; proposte G-022; correzioni del team
  dopo il 06-01. Il diario validato 04-01..06-01 non si tocca (un uid di quei giorni ferma la migrazione). Si può rieseguire.
- Effetto atteso (dal giro errato delle 02:19Z su caf7b511, log `L2/esiti-collaudo/de67b349/BE-avvio-errato-caf7b511.log`): aree 117,
  planimetrie 245, etichette 203, legami 105, da regola 1, proposte 102, corrette 6, segnalate 1, nuove 1, diario curato, senza area 0.
- Base di partenza: i dati attuali di 3301 sono `L2-base-8e75abbb` (impronta verificata alle 04:41:24). Prima del cambio di commit:
  server fermi, copia del BE.log, **foto `L3-prima-migr110`**, poi l'avvio applica la 110. Dopo: **foto `L3-base-<hash>`**, impronta completa
  contro la foto di prima (cosa ha scritto la 110) e `impronta.cjs` contro la base di produzione. È atteso solo l'effetto sulle 4 colonne
  nuove del diario, come in `L3/noreg.md` §2-bis.

## 3. Cicli dei dati attesi (da `L3/funzionali.md` §112-115, `noreg.md` §3)
In ordine, uno alla volta, con foto prima e ripristino dopo:
1. **Test funzionali — scritture sui Palazzi**: F3-10 e F3-19…F3-26 su Madarame/Kamoshida. Fra questi: eliminazione di area, planimetria e
   infiltrazione con ripristino dal cestino, `POST /api/mappe` sotto `dungeon-<k>` (409), rinomina e «Ripristina» di un'area seed. Tocca
   il lavoro da preservare (Kamoshida, Madarame): dopo il ripristino `impronta.cjs` deve tornare identica alla base, oltre all'impronta completa.
2. **Test no-reg — pacchetto mappe** esporta → importa con «sovrascrivi» dalla rotta dell'app su Kamoshida e Madarame, ed eventuale
   esportazione completa (103 MB). Scrive molto (immagini, pin): ciclo a sé, con ripristino.
3. **Test UX / layout**: se chiedono scritture (pagina del Palazzo, editor), ciclo a sé; le sole letture si fanno dopo i ripristini, sulla base.
- Promemoria per i tester: l'apertura dei quartieri senza pianta (Kichijoji, Santuario Meiji) fa partire una POST di scarico (400, LAY-2);
  nell'istanza non c'è nginx, quindi O3-1 (512 MB) si prova solo con il limite del server.

## 4. Prove sul commit (come per L2)
`git rev-parse HEAD`, `git status --porcelain`, `git diff --stat 5ae62692 HEAD` (o rispetto al merge), `npm run typecheck` + `--force`,
`npm run lint`, impronta `git diff 9634bbb5 HEAD -- server/ shared/ src/` e delle sole modifiche di L3, health e migrazioni all'avvio.
Esiti in `lotti/L3/esiti-collaudo/<hash>/`.

## Decisione del PM (2026-10-20, dopo le 04:49)
Approvata la strada consigliata. Dopo l'APPROVATO di L2 e la pubblicazione, il PM fa il merge di `newreview-l2` in `newreview`. Quando L3 è
committato, il PM dà l'hash e il Collaudo esegue `git merge --ff-only <hash>`, solo per hash. Piano dei cicli e cifre attese della 110
confermati. Fino ad allora il Collaudo resta fermo sul checkout 5ae62692.
