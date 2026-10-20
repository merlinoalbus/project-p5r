# 04 — server/services/mappe/mappeService.ts (FUN2-8, R2-28)

Usa funzioni già presenti in 90137ce2: `conAree` (import da `./casaMappa.js`, riga 38), `nelMondo` (riga 57), `idMappa` (import da
`./percorsiMappe.js`, riga 18). Nessun import da aggiungere.

## Modifica 1 di 2 — `aggiornaMappa`: 409 `usa-aggiungi-area` (FUN2-8)

TESTO VECCHIO (riga 943 e la prima riga del commento che segue)
~~~~
  if (dati.tipo && !(TIPI_MAPPA as readonly string[]).includes(dati.tipo)) throw httpErrors.badRequest('tipo-non-valido', 'Tipo di mappa non ammesso.');
  // Il nome rivisto lo dichiara questo salvataggio, che è il modulo dell'editor e porta sempre il
~~~~

TESTO NUOVO
~~~~
  if (dati.tipo && !(TIPI_MAPPA as readonly string[]).includes(dati.tipo)) throw httpErrors.badRequest('tipo-non-valido', 'Tipo di mappa non ammesso.');
  // FUN2-8 (giro 2 di L2, R2-27): dall'editor una mappa senza Area non entra nel mondo come planimetria — spostarla sotto Tokyo o un
  // quartiere (o una sua discendente), o renderla `luogo`/`area` lì, la lascerebbe una zona sciolta fra le «da collocare»: la stessa
  // regola di `creaMappa`. Le generiche del mondo restano ammesse; Palazzi e Memento non cambiano.
  const tipoDopo = dati.tipo ?? r.tipo;
  const genitoreNuovo = dati.genitore === undefined ? r.genitore_chiave : dati.genitore;
  if (conAree() && !r.area_chiave && (tipoDopo === 'luogo' || tipoDopo === 'area') && (genitoreNuovo !== r.genitore_chiave || tipoDopo !== r.tipo)
    && genitoreNuovo && nelMondo(genitoreNuovo)) {
    throw httpErrors.conflict('usa-aggiungi-area', 'Nel mondo una planimetria sta in un’area: aggiungila con «Aggiungi area» nel quartiere (o «Aggiungi planimetria» in un’area), o collocala dall’elenco «Da collocare».');
  }
  // Il nome rivisto lo dichiara questo salvataggio, che è il modulo dell'editor e porta sempre il
~~~~

## Modifica 2 di 2 — `importaAree`: un'Area della guida corretta dall'utente non si sovrascrive col seed (R2-28)

TESTO VECCHIO (righe 1724-1729)
~~~~
    const esistente = prepared('SELECT origine FROM area WHERE chiave = ?').get(a.chiave) as { origine: string } | undefined;
    const origineArea = a.origine ?? origine;
    if (!contenitoreEsiste || (esistente && !sovrascrivi && !(origine === 'seed' && esistente.origine === 'seed')) || (esistente && origine === 'seed' && esistente.origine === 'utente')) {
      esito.saltate.push(a.chiave);
      continue;
    }
~~~~

TESTO NUOVO
~~~~
    const esistente = prepared('SELECT origine, seed_json FROM area WHERE chiave = ?').get(a.chiave) as { origine: string; seed_json: string | null } | undefined;
    const origineArea = a.origine ?? origine;
    if (!contenitoreEsiste || (esistente && !sovrascrivi && !(origine === 'seed' && esistente.origine === 'seed')) || (esistente && origine === 'seed' && esistente.origine === 'utente')) {
      esito.saltate.push(a.chiave);
      continue;
    }
    // R2-28 (difetto R3 del giro 1 di L2): un'Area della guida corretta dall'utente (i valori della guida conservati in `seed_json`) resta
    // com'è anche sotto il seed; del seed si aggiornano solo i valori della guida conservati, così «Ripristina» riporta quelli nuovi
    if (esistente && origine === 'seed' && !sovrascrivi && esistente.seed_json !== null) {
      prepared('UPDATE area SET seed_json = ? WHERE chiave = ?')
        .run(JSON.stringify({ nome: a.nome, nome_rivisto: a.nomeRivisto ? 1 : 0, planimetria_predefinita: a.predefinita ? idMappa(a.predefinita) : null }), a.chiave);
      continue;
    }
~~~~
