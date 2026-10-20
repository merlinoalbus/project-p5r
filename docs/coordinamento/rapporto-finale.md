# Rapporto finale per l'utente (bozza viva del PM, aggiornata lotto per lotto)

## Stato dei lotti
| Lotto | Stato | Su p5s |
|---|---|---|
| L0 Vocabolario e testi | approvato e consegnato | sì |
| L1 Immagini | approvato al quinto giro e consegnato (9634bbb5) | sì, user_version 108 |
| L2 Mondo: aree e planimetrie | giro 1 rigettato; correzioni del giro 2 sul rilascio f19a117f, riprove in corso | no, dopo l'APPROVATO |
| L3 Palazzi: aree e infiltrazioni | BE committato in parte, FE in corso, test sull'anteprima | no |
| L4 Avanzamento unico | BE fatto con difetti aperti (AP4-1, AP4-2), FE in corso | no |
| L5–L11 | progetti pronti sulla base p5s; L5 con i casi di prova pronti | no |

## Dati
- La produzione persona5royal è ferma alla copia del 2026-10-20 04:40Z (decisione dell'utente). Non è mai stata toccata.
- La fonte è p5s: copia di riferimento `dati-produzione/p5s-2026-10-20-0503Z/`, con Kamoshida chiusa al 100% dall'utente.
- p5s non si sovrascrive mai. I rilasci migrano i suoi dati, dopo un backup del volume.
- A fine progetto, dopo la validazione dell'utente, i dati di p5s sostituiscono quelli di persona5royal.

## Decisioni dell'utente (oggi)
Elenco completo in `decisioni-pm.md`. Le principali:
- **L1:** illustrazione anche nelle schede; G1 solo lo stemma.
- **L4:**
  - «1 B»: le 15 voci di Kamoshida non si segnano in migrazione;
  - le voci descrittive tengono il segno;
  - regola delle copie: stesso testo, stessi pin, stessa infiltrazione;
  - «Oltrepassa le sbarre» resta due voci;
  - gli 8 pin divergenti sono «da verificare»;
  - due livelli «concluso» e «completato».
- **L10:** le Doti si confermano con «Applica».
- **Luoghi:** Odaiba, Asakusa e la Clinica; i quartieri hanno sempre uno sblocco strutturato; gli inviti dei Confidenti sono eventi; il luogo chiuso è nascosto dal menu; l'area dello staff va a Tokyo «da verificare».
- **Diario:** il collegamento voce → infiltrazione si sceglie fra quelle del Palazzo; le voci dopo il 1° giugno si aggiungono, il diario validato non si tocca.
- **Dati:** si lavora sempre su dati attuali; poi p5s diventa la fonte.

## Decisioni del PM da approvare
Sono tutte in `decisioni-pm.md`, contrassegnate «Decisione del PM»:
- **L3:** UX3-1, UX3-4, UX3-5, R3-41, AP3-1…4;
- **L4:** NR4-1 (a);
- **L7:** la regola dei forzieri;
- **L11:** R11-10c;
- **flusso:** l'istanza di anteprima;
- l'invito di Makoto (a).

## Dati di prova dell'utente su p5s
- Planimetria di prova (2026-10-20), inserita dall'utente per sbaglio sotto il Palazzo di Kamoshida (`palazzo-di-kamoshida-prova`) invece che sotto Madarame; non è un difetto. **L'ha tolta l'utente stesso** da p5s («sì l'ho tolta io»): non c'è più niente da chiedergli. Resta come caso di test; a fine lavoro si può togliere, ma **solo con il suo via**: prima del passaggio dei dati di p5s in produzione gli si chiede se toglierla.

## Elenco «da rivedere» per l'utente
- Sakura Residence: luogo senza uno sblocco proprio, «visitabile solo negli eventi di Futaba».
- Negozio delle «Pagine ammuffite»: la guida si contraddice.
- Pin 811 di Madarame: proposta di nota «il dipinto preso qui è un'esca».
- Invito di Makoto del 30/7: alternativa (b) dell'Esperto, cioè un evento senza voce.
- Voci boss di Madarame con «Gelo» e «respinge».
- Listino di Tanaka: oggi 20 articoli in inglese; va rifatto sulla guida con i 18 articoli di Royal (G-034, R7-13b), solo con il tuo sì.
- 3 voci del diario da passare da Igor a Lavenza/Gemelle, più 4 voci di Lavenza e delle Gemelle da approvare (G-036, G-037/G-038).
- Hagoromo: orario dubbio (G-033, L5 §10.7).
- Distributori 1584 e 1769: forse puntano al listino sbagliato (G-014).
- 8 voci di invito e 4 voci di infiltrazione «da rivedere», controllate in G-028.
- N1 (Tokyo = La città) e la nota sulla filigrana.
- LAY-2: Fandom rifiuta i download (403); onesto User-Agent, avviso nel FE.
- Rigenerazione di `pacchetto/gioco.db`: decisione dell'utente in L11.
- Scheda del Palazzo a 375 px: l'intestazione è alta 526–740 px su 812 (Kamoshida 622, Madarame 661, Maruki 740, Iweleth 526), quindi per arrivare al visore si scorre. Non c'è una soglia per il telefono (Test layout, `lotti/L3/esiti-layout/48d7a958/esito.md`). Va deciso se compattarla senza svilire la grafica.
- E9 dell'indice dei Palazzi, rinviato a L11 da FE.

## Violazioni di regola da dichiarare
- BE: script node su `server/routes/aree.ts` e `server/openapi/descrizioni/aree.ts` in L2 (d66cf5f5).
- BE: `sed` su sorgenti di L3 (L3/be.md §3/§5); un `sed -i` verso /dev/null fallito, che non ha scritto nulla.
- FE: `sed -i` in L2 (L2/fe.md «Dichiarazione»).
- Test no-reg: heredoc su L3/difetti.md, poi riscritto con Write.
- Test UX: ha cambiato il localStorage della produzione, solo nel browser.
- BE: una richiesta di scrittura respinta (404) sul 3201.
- Collaudo: un fast-forward per nome del ramo, che ha applicato brevemente la 110 (dati ripristinati dalla foto).
- BE: si è validato da solo su L4 e ha messo L4 prima delle modifiche bloccanti di L2. Cartellino giallo dall'utente.
- PM: ha bloccato il team con una domanda; ha lasciato lavorare su dati vecchi; ha rischiato la sovrascrittura di p5s (fermata in tempo); ha accusato ricevuta dei messaggi senza tradurli in azioni. Bocciatura e cartellino giallo dall'utente.
