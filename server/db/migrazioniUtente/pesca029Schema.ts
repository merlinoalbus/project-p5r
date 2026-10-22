/** DDL condivisa della famiglia pesca. Non inizializza visite, catture, saldi o eventi. */
const uuid = (campo: string) => `length(${campo})=32 AND ${campo} NOT GLOB '*[^0-9a-f]*'`;
const naturale = (campo: string, minimo = 0) => `typeof(${campo})='integer' AND ${campo} BETWEEN ${minimo} AND 9007199254740991`;

export const STRUTTURE_PESCA_029 = [
  ['table', 'pesca_sessione', `CREATE TABLE IF NOT EXISTS utente.pesca_sessione (
    id TEXT PRIMARY KEY NOT NULL CHECK(${uuid('id')}),
    partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
    attivita_chiave TEXT NOT NULL,
    giorno TEXT NOT NULL, fascia TEXT NOT NULL CHECK(fascia IN ('giorno','sera')),
    ordine_visita INTEGER NOT NULL CHECK(${naturale('ordine_visita')}),
    turno_uid TEXT UNIQUE REFERENCES turno_partita(uid) ON DELETE SET NULL CHECK(turno_uid IS NULL OR (${uuid('turno_uid')})),
    turno_ordine INTEGER NOT NULL CHECK(${naturale('turno_ordine', 1)}),
    origine_turno TEXT NOT NULL CHECK(origine_turno IN ('creato','raccordato','quota-storica')),
    turno_revocato_il TEXT,
    identita_json TEXT NOT NULL CHECK(json_valid(identita_json)), creata_il TEXT NOT NULL,
    UNIQUE(partita_id,id)
  )`],
  ['index', 'pesca_sessioni_partita', 'CREATE INDEX IF NOT EXISTS utente.pesca_sessioni_partita ON pesca_sessione(partita_id,giorno,fascia,ordine_visita,id)'],
  ['table', 'pesca_osservazione', `CREATE TABLE IF NOT EXISTS utente.pesca_osservazione (
    id TEXT PRIMARY KEY NOT NULL CHECK(${uuid('id')}),
    sessione_id TEXT NOT NULL REFERENCES pesca_sessione(id) ON DELETE CASCADE,
    versione INTEGER NOT NULL CHECK(${naturale('versione', 1)}),
    corrente INTEGER NOT NULL CHECK(corrente IN (0,1)),
    dati_json TEXT NOT NULL CHECK(json_valid(dati_json)),
    precedente_id TEXT CHECK(precedente_id IS NULL OR (${uuid('precedente_id')})),
    creata_il TEXT NOT NULL, UNIQUE(sessione_id,versione)
  )`],
  ['index', 'pesca_osservazione_corrente', 'CREATE UNIQUE INDEX IF NOT EXISTS utente.pesca_osservazione_corrente ON pesca_osservazione(sessione_id) WHERE corrente=1'],
  ['table', 'pesca_cattura', `CREATE TABLE IF NOT EXISTS utente.pesca_cattura (
    id TEXT PRIMARY KEY NOT NULL CHECK(${uuid('id')}),
    sessione_id TEXT NOT NULL REFERENCES pesca_sessione(id) ON DELETE CASCADE,
    osservazione_id TEXT NOT NULL REFERENCES pesca_osservazione(id) ON DELETE CASCADE,
    specie TEXT NOT NULL CHECK(specie IN ('guardiano','boss','altro')),
    tentativo INTEGER CHECK(tentativo IS NULL OR (${naturale('tentativo', 1)})),
    posizione INTEGER CHECK(posizione IS NULL OR (${naturale('posizione')}))
  )`],
  ['index', 'pesca_catture_sessione', 'CREATE INDEX IF NOT EXISTS utente.pesca_catture_sessione ON pesca_cattura(sessione_id,osservazione_id,id)'],
  ['table', 'pesca_provenienza', `CREATE TABLE IF NOT EXISTS utente.pesca_provenienza (
    id TEXT PRIMARY KEY NOT NULL CHECK(${uuid('id')}),
    partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
    sessione_id TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('manuale','diario')),
    voce_uid TEXT, effetto_uid TEXT, generazione TEXT,
    operazione_id TEXT NOT NULL CHECK(${uuid('operazione_id')}),
    fonte_json TEXT NOT NULL CHECK(json_valid(fonte_json)), creata_il TEXT NOT NULL,
    FOREIGN KEY(partita_id,sessione_id) REFERENCES pesca_sessione(partita_id,id) ON DELETE RESTRICT,
    CHECK((tipo='manuale' AND voce_uid IS NULL AND effetto_uid IS NULL AND generazione IS NULL) OR
      (tipo='diario' AND voce_uid IS NOT NULL AND (${uuid('voce_uid')}) AND effetto_uid IS NOT NULL AND (${uuid('effetto_uid')}) AND generazione IS NOT NULL AND length(generazione)>0))
  )`],
  ['index', 'pesca_fonte_diario', "CREATE UNIQUE INDEX IF NOT EXISTS utente.pesca_fonte_diario ON pesca_provenienza(partita_id,voce_uid,effetto_uid) WHERE tipo='diario'"],
  ['index', 'pesca_fonti_sessione', 'CREATE INDEX IF NOT EXISTS utente.pesca_fonti_sessione ON pesca_provenienza(partita_id,sessione_id,id)'],
  ['table', 'pesca_quota_storica', `CREATE TABLE IF NOT EXISTS utente.pesca_quota_storica (
    partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
    firma_contatore TEXT NOT NULL CHECK(length(firma_contatore)=64 AND firma_contatore NOT GLOB '*[^0-9a-f]*'),
    quota INTEGER NOT NULL CHECK(${naturale('quota', 1)}),
    sessione_id TEXT NOT NULL UNIQUE CHECK(${uuid('sessione_id')}),
    turno_uid TEXT NOT NULL CHECK(${uuid('turno_uid')}), creata_il TEXT NOT NULL,
    PRIMARY KEY(partita_id,firma_contatore,quota)
  )`],
  ['table', 'pesca_fatto_fonte', `CREATE TABLE IF NOT EXISTS utente.pesca_fatto_fonte (
    id TEXT PRIMARY KEY NOT NULL CHECK(${uuid('id')}),
    partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
    evento_chiave TEXT NOT NULL CHECK(evento_chiave IN ('guardiano-ichigaya-catturato','boss-ichigaya-catturato','terzo-semestre-avviato')),
    valore TEXT NOT NULL CHECK(valore IN ('avvenuto','non-avvenuto','ignoto')),
    momento_json TEXT CHECK(momento_json IS NULL OR json_valid(momento_json)),
    sessione_id TEXT REFERENCES pesca_sessione(id) ON DELETE CASCADE,
    cattura_id TEXT REFERENCES pesca_cattura(id) ON DELETE CASCADE,
    provenienza_id TEXT REFERENCES pesca_provenienza(id) ON DELETE CASCADE,
    fonte_json TEXT NOT NULL CHECK(json_valid(fonte_json)), nota TEXT NOT NULL,
    operazione_id TEXT NOT NULL CHECK(${uuid('operazione_id')}), creata_il TEXT NOT NULL,
    CHECK((sessione_id IS NULL AND cattura_id IS NULL AND provenienza_id IS NULL) OR (sessione_id IS NOT NULL AND provenienza_id IS NOT NULL))
  )`],
  ['index', 'pesca_fatti_partita', 'CREATE INDEX IF NOT EXISTS utente.pesca_fatti_partita ON pesca_fatto_fonte(partita_id,evento_chiave,id)'],
  ['index', 'pesca_fatti_sessione', 'CREATE INDEX IF NOT EXISTS utente.pesca_fatti_sessione ON pesca_fatto_fonte(sessione_id,provenienza_id,id)'],
  ['table', 'pesca_acquisto_esca', `CREATE TABLE IF NOT EXISTS utente.pesca_acquisto_esca (
    id TEXT PRIMARY KEY NOT NULL CHECK(${uuid('id')}),
    partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
    momento_json TEXT NOT NULL CHECK(json_valid(momento_json)),
    quantita INTEGER NOT NULL CHECK(${naturale('quantita', 1)}),
    costo_punti INTEGER NOT NULL CHECK(${naturale('costo_punti')}),
    attivo INTEGER NOT NULL CHECK(attivo IN (0,1)),
    identita_json TEXT NOT NULL CHECK(json_valid(identita_json)), creato_il TEXT NOT NULL
  )`],
  ['index', 'pesca_esche_partita', 'CREATE INDEX IF NOT EXISTS utente.pesca_esche_partita ON pesca_acquisto_esca(partita_id,id)'],
  ['table', 'punti_pesca_partita', `CREATE TABLE IF NOT EXISTS utente.punti_pesca_partita (
    partita_id INTEGER PRIMARY KEY NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
    saldo INTEGER CHECK(saldo IS NULL OR (${naturale('saldo')})), updated_at TEXT NOT NULL
  )`],
  ['table', 'movimento_punti_pesca', `CREATE TABLE IF NOT EXISTS utente.movimento_punti_pesca (
    id TEXT PRIMARY KEY NOT NULL CHECK(${uuid('id')}),
    partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
    proposta_uid TEXT UNIQUE CHECK(proposta_uid IS NULL OR (${uuid('proposta_uid')})),
    operazione_id TEXT NOT NULL CHECK(${uuid('operazione_id')}),
    tipo TEXT NOT NULL CHECK(tipo IN ('rettifica','proposta')),
    causa_tipo TEXT, causa_chiave TEXT,
    prima INTEGER CHECK(prima IS NULL OR (${naturale('prima')})),
    delta INTEGER CHECK(delta IS NULL OR (typeof(delta)='integer' AND delta BETWEEN -9007199254740991 AND 9007199254740991)),
    dopo INTEGER NOT NULL CHECK(${naturale('dopo')}), creato_il TEXT NOT NULL,
    CHECK((tipo='rettifica' AND proposta_uid IS NULL AND causa_tipo IS NULL AND causa_chiave IS NULL) OR
      (tipo='proposta' AND proposta_uid IS NOT NULL AND causa_tipo IS NOT NULL AND causa_tipo='pesca' AND causa_chiave IS NOT NULL AND (${uuid('causa_chiave')}))),
    CHECK((tipo='rettifica' AND prima IS NULL AND delta IS NULL) OR
      (prima IS NOT NULL AND delta IS NOT NULL AND dopo=prima+delta))
  )`],
  ['index', 'pesca_movimenti_partita', 'CREATE INDEX IF NOT EXISTS utente.pesca_movimenti_partita ON movimento_punti_pesca(partita_id,creato_il,id)'],
  ['table', 'pesca_operazione', `CREATE TABLE IF NOT EXISTS utente.pesca_operazione (
    partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
    operazione_id TEXT NOT NULL CHECK(${uuid('operazione_id')}),
    azione TEXT NOT NULL,
    payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
    ricevuta_json TEXT NOT NULL CHECK(json_valid(ricevuta_json)), creata_il TEXT NOT NULL,
    PRIMARY KEY(partita_id,operazione_id)
  )`],
] as const;

export const DDL_PESCA_029: readonly string[] = STRUTTURE_PESCA_029.map(([, , ddl]) => ddl);
export const TABELLE_PESCA_029 = STRUTTURE_PESCA_029.filter(([tipo]) => tipo === 'table').map(([, nome]) => nome);

/** La sola differenza dalla028 sono i tre vocabolari chiusi; colonne/default rimangono identici. */
export const ddlPropostePesca029 = (nome: string, esteso: boolean): string => `CREATE TABLE ${nome} (
  id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL UNIQUE CHECK(length(uid)=32),
  partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  voce_uid TEXT, causa_tipo TEXT NOT NULL CHECK(causa_tipo IN ('acquisto','voce'${esteso ? ",'pesca'" : ''})), causa_chiave TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('dote','yen','effetto-voce'${esteso ? ",'punti-pesca'" : ''})), chiave TEXT NOT NULL DEFAULT '',
  unita TEXT NOT NULL CHECK(unita IN ('punti-interni','yen','azione'${esteso ? ",'punti-pesca'" : ''})),
  ciclo INTEGER NOT NULL CHECK(ciclo>=1), revisione_causa TEXT NOT NULL,
  delta INTEGER NOT NULL, dati_json TEXT NOT NULL CHECK(json_valid(dati_json)), motivo TEXT NOT NULL,
  stato TEXT NOT NULL DEFAULT 'aperta' CHECK(stato IN ('aperta','applicata','scartata')),
  verifica TEXT NOT NULL DEFAULT 'da-dichiarare' CHECK(verifica IN ('da-dichiarare','non-conteggiata','ignota')),
  chiusa_da TEXT CHECK(chiusa_da IN ('utente','causa')), motivo_chiusura TEXT,
  delta_applicato INTEGER NOT NULL DEFAULT 0, delta_riconosciuto INTEGER NOT NULL DEFAULT 0,
  applicazione_json TEXT, proposte_origine_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(proposte_origine_json)),
  creata_il TEXT NOT NULL, decisa_il TEXT
)`;

export const INDICI_PROPOSTE_029 = [
  ['proposta_aperta_unica', "CREATE UNIQUE INDEX proposta_aperta_unica ON da_applicare(partita_id,causa_tipo,causa_chiave,tipo,chiave) WHERE stato='aperta'"],
  ['proposte_partita_stato', 'CREATE INDEX proposte_partita_stato ON da_applicare(partita_id,stato,id)'],
] as const;
