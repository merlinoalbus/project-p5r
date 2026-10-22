import type { DefinizioneRegolaPesca } from '../../../shared/pesca.js';

/** Fonte: pacchetto/gioco.db pubblico93, blob a598803601eb03f2feb77f1ce0b447b339c3a602.
 * I 28 campi sono RAW pubblici. Nessuna fotografia dell'istanza entra nel manifest. */
export const ATTIVITA_PESCA_PUBBLICHE_93 = [
  {
    chiave: 'pesca-ichigaya', ordine: 2, nome: 'Pesca al laghetto di Ichigaya', tipo: 'mini-gioco',
    luogo: 'Ichigaya, laghetto', luogo_chiave: 'ichigaya', fascia: 'entrambe', costo: 3000,
    sblocco: "6 luglio (evento con Ryuji), oppure leggendo il libro 'Vedetta lacustre'",
    doti_json: '[{"dote":"perizia","note":null,"condizione":"1 punto Perizia per sessione in cui si cattura almeno un pesce (fonte non specifica se equivale a 1 nota)"}]',
    altri_effetti: 'Numero di tentativi = Rango Perizia + 2. I pesci catturati fruttano da 20 a 5.500 punti (Covo dei Ladri) a seconda di specie/dimensione.',
    regole: 'Costo 3.000 yen di giorno, 1.000 yen di sera. Prima sessione: 7 Boilie piccole gratis + 3 Boilie medie a fine sessione. Si regola direzione/potenza/distanza del lancio, poi si mantiene l\'icona del galleggiante nella zona rossa durante il recupero.',
    premi: "Libro 'Lo zen della pesca' aggiunge mirino e Terzo Occhio per identificare pesci speciali.", paga: null,
    fonte: 'https://www.allgamestaff.it/persona-5-royal/pesca-laghetto-ichigaya/', verificato: 1, sessioni: 1,
    origine: 'seed', nascosto: 0, seed_json: null, updated_at: null,
    condizioni_json: '[{"tipo":"gruppo","modo":"almeno-una","condizioni":[{"tipo":"data","dal":"07-06"},{"tipo":"lettura","categoria":"libro","chiave":"vedetta-lacustre"}]}]',
    sede_chiave: 'ichigaya/laghetto-ichigaya', effetti_json: '[]', paga_yen: null, paga_massima: null,
    dettagli: 'Come funziona: Costo 3.000 yen di giorno, 1.000 yen di sera. Prima sessione: 7 Boilie piccole gratis + 3 Boilie medie a fine sessione. Si regola direzione/potenza/distanza del lancio, poi si mantiene l\'icona del galleggiante nella zona rossa durante il recupero.\n\nPremi: Libro \'Lo zen della pesca\' aggiunge mirino e Terzo Occhio per identificare pesci speciali.\n\nAltri effetti: Numero di tentativi = Rango Perizia + 2. I pesci catturati fruttano da 20 a 5.500 punti (Covo dei Ladri) a seconda di specie/dimensione.\n\nNote sulle Doti: Perizia: 1 punto Perizia per sessione in cui si cattura almeno un pesce (fonte non specifica se equivale a 1 nota)',
    tracciamento: 'svolta',
  },
  {
    chiave: 'sfida-pesca-guardiano-ichigaya', ordine: 3, nome: 'Sfida: Guardiano e Boss di Ichigaya', tipo: 'sfida',
    luogo: 'Ichigaya, laghetto', luogo_chiave: 'ichigaya', fascia: 'entrambe', costo: 1200,
    sblocco: 'Guardiano: Perizia Rango 4; Boss: dopo cattura del Guardiano, Perizia Rango 5', doti_json: '[]', altri_effetti: null,
    regole: "Richiede l'esca speciale 'Boilie sospetto' (1.200 punti). Il Guardiano compare al 7 tentativo in condizioni normali, ma gia al 1 tentativo con pioggia o neve di sera.",
    premi: null, paga: null, fonte: 'https://www.allgamestaff.it/persona-5-royal/pesca-laghetto-ichigaya/', verificato: 1, sessioni: 1,
    origine: 'seed', nascosto: 0, seed_json: null, updated_at: null,
    condizioni_json: '[{"tipo":"dote","dote":"perizia","rango":4}]', sede_chiave: 'ichigaya/laghetto-ichigaya',
    effetti_json: '[]', paga_yen: null, paga_massima: null,
    dettagli: "Come funziona: Richiede l'esca speciale 'Boilie sospetto' (1.200 punti). Il Guardiano compare al 7 tentativo in condizioni normali, ma gia al 1 tentativo con pioggia o neve di sera.",
    tracciamento: 'svolta',
  },
] as const;

/** Append105/121/135: tre SQL NULL. La124 ha tolto soltanto la copia dello sblocco A02. */
export const ATTIVITA_PESCA_PRIMA_138 = [
  { ...ATTIVITA_PESCA_PUBBLICHE_93[0], condizioni_json: '[]', quiz_json: null, catalogo_chiave: null, confidente_chiave: null, pesca_regola_chiave: null, pesca_ruolo: null },
  { ...ATTIVITA_PESCA_PUBBLICHE_93[1], quiz_json: null, catalogo_chiave: null, confidente_chiave: null, pesca_regola_chiave: null, pesca_ruolo: null },
] as const;

export const ATTIVITA_PESCA_DOPO_138 = [
  {
    ...ATTIVITA_PESCA_PRIMA_138[0], costo: null, sblocco: null, doti_json: '[]', altri_effetti: null,
    regole: "Tentativi della visita: rango Perizia osservato + 2. Quote d'ingresso: 3.000 yen di giorno, 1.000 yen di sera; un ingresso, una quota. Catture, punti pesca riscossi e beneficio finale sono osservazioni distinte. Il Boilie sospetto costa 1.200 punti pesca solo quando viene acquistato.",
    dettagli: 'La visita si registra una volta sola. Una cattura non prova il riconoscimento finale: riscossione seguita da ripresa e uscita senza nuova riscossione può non dare Perizia. Il beneficio osservato è 1 nota (2 punti interni base); Fortuna confermata per la data della visita porta a 3. Con Fortuna ignota l\'intervallo è 2–3, senza restituzioni presunte.',
    pesca_regola_chiave: 'ichigaya-royal-v1', pesca_ruolo: 'visita',
  },
  {
    ...ATTIVITA_PESCA_PRIMA_138[1], costo: null, sblocco: null, condizioni_json: '[]',
    regole: 'Guardiano e Boss sono obiettivi della stessa visita. Esche, comparsa, possibilità di cattura e cattura osservata sono distinti. Il Boilie sospetto costa 1.200 punti pesca se acquistato; possesso e uso non registrano un acquisto. Le vie documentate e i casi non coperti si consultano nei profili per specie.',
    dettagli: "L'ingresso dipende dal laghetto. I profili distinguono comparsa, catturabilità e tentativo residuo e indicano la fonte di ogni via. I ranghi 4 e 5 descrivono vie sufficienti documentate, non soglie necessarie universali. Il Boss non prova una precedente cattura del Guardiano. I turni storici rimangono tali e non diventano catture.",
    tracciamento: 'nessuno', pesca_regola_chiave: 'ichigaya-royal-v1', pesca_ruolo: 'obiettivi',
  },
] as const;

export const FONTI_PESCA_138 = [
  'https://omoteura.com/persona5/the-royal/spot-ichigaya.html',
  'https://wikiwiki.jp/persona5r/%E9%87%A3%E3%82%8A',
  'https://www.allgamestaff.it/persona-5-royal/pesca-laghetto-ichigaya/',
] as const;

/** Vie sufficienti, non negazioni universali. Il conflitto sei catture/sei tentativi resta nelle note. */
export const DEFINIZIONE_PESCA_138: DefinizioneRegolaPesca = {
  versione: 1, quote: { giorno: 3000, sera: 1000 }, costoEscaPunti: 1200,
  beneficioPerizia: { note: 1, puntiBase: 2, bonusFortuna: 1 }, fonti: [...FONTI_PESCA_138],
  vie: [
    { id: 'guardiano-prima-semestre-notte-normale', specie: 'guardiano', faseTerzoSemestre: false, fascia: 'sera', meteo: 'normale', guardianoPrecedente: 'indifferente', rangoComparsa: 5, rangoCattura: 5, tentativo: 'settimo', seiCatture: true, fonti: [FONTI_PESCA_138[0], FONTI_PESCA_138[1]], nota: 'Via documentata con sei catture precedenti e settimo tentativo disponibile. Wiki segnala anche tentativi falliti: il conflitto non diventa una regola universale.' },
    { id: 'guardiano-prima-semestre-notte-maltempo', specie: 'guardiano', faseTerzoSemestre: false, fascia: 'sera', meteo: 'pioggia-neve', guardianoPrecedente: 'indifferente', rangoComparsa: null, rangoCattura: 4, tentativo: 'primo', seiCatture: false, fonti: [FONTI_PESCA_138[0], FONTI_PESCA_138[1]], nota: 'Comparsa iniziale con pioggia o neve. Rango4/5 è una via sufficiente per tentare; un rango inferiore non prova impossibilità universale.' },
    { id: 'guardiano-terzo-semestre-giorno-normale', specie: 'guardiano', faseTerzoSemestre: true, fascia: 'giorno', meteo: 'normale', guardianoPrecedente: 'si', rangoComparsa: 5, rangoCattura: 5, tentativo: 'settimo', seiCatture: true, fonti: [FONTI_PESCA_138[0], FONTI_PESCA_138[1]], nota: 'Via diurna documentata con Guardiano precedentemente catturato. Senza antecedente il caso resta da verificare; sei soli fallimenti non sono equiparati a sei catture.' },
    { id: 'guardiano-terzo-semestre-giorno-maltempo', specie: 'guardiano', faseTerzoSemestre: true, fascia: 'giorno', meteo: 'pioggia-neve', guardianoPrecedente: 'si', rangoComparsa: null, rangoCattura: 4, tentativo: 'primo', seiCatture: false, fonti: [FONTI_PESCA_138[0], FONTI_PESCA_138[1]], nota: 'Via diurna di maltempo con antecedente provato. Gelo senza neve osservata non è equiparato a neve.' },
    { id: 'guardiano-terzo-semestre-notte-normale', specie: 'guardiano', faseTerzoSemestre: true, fascia: 'sera', meteo: 'normale', guardianoPrecedente: 'no', rangoComparsa: 5, rangoCattura: 5, tentativo: 'settimo', seiCatture: true, fonti: [FONTI_PESCA_138[0]], nota: 'Sostituisce il Boss quando il Guardiano non è stato catturato in precedenza; una cattura nella medesima visita non prova una via Boss.' },
    { id: 'guardiano-terzo-semestre-notte-maltempo', specie: 'guardiano', faseTerzoSemestre: true, fascia: 'sera', meteo: 'pioggia-neve', guardianoPrecedente: 'no', rangoComparsa: null, rangoCattura: 4, tentativo: 'primo', seiCatture: false, fonti: [FONTI_PESCA_138[0], FONTI_PESCA_138[1]], nota: 'Via di maltempo come sostituto Boss, senza promuovere condizioni sufficienti a necessarie.' },
    { id: 'boss-terzo-semestre-notte-normale', specie: 'boss', faseTerzoSemestre: true, fascia: 'sera', meteo: 'normale', guardianoPrecedente: 'si', rangoComparsa: 5, rangoCattura: 5, tentativo: 'settimo', seiCatture: true, fonti: [FONTI_PESCA_138[0]], nota: 'Antecedente Guardian temporalmente provato, sei catture precedenti e tentativo residuo. Non basta un contatore di attività svolte.' },
    { id: 'boss-terzo-semestre-notte-maltempo', specie: 'boss', faseTerzoSemestre: true, fascia: 'sera', meteo: 'pioggia-neve', guardianoPrecedente: 'si', rangoComparsa: null, rangoCattura: 5, tentativo: 'primo', seiCatture: false, fonti: [FONTI_PESCA_138[0], FONTI_PESCA_138[1]], nota: 'Comparsa iniziale e via sufficiente con rango5; i ranghi inferiori nelle vie anticipate restano da verificare.' },
  ],
};

export const REGOLA_PESCA_138 = {
  chiave: 'ichigaya-royal-v1', versione: 1, nome: 'Pesca a Ichigaya — profili Royal e osservazioni',
  dati_json: JSON.stringify(DEFINIZIONE_PESCA_138), fonti_json: JSON.stringify(FONTI_PESCA_138), origine: 'seed', seed_json: null,
} as const;
