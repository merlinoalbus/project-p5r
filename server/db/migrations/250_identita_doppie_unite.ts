// ============================================================
// Migrazione 250 — le identità doppie del catalogo diventano una (ondata 5, lotto C: O5-03, O5-14, RG-01; decisione 21)
// ============================================================
//
// Decisione 21 (c) dell'utente (26/10/2026, risposta: «Gli effetti degli oggetti ai fini di questa app non è necessario gestirli se non come
// informazione testuale. Non sono d'accordo nel rimandare attività a fasi successive»; raccomandazione approvata: «unioni delle identità
// doppie su elenco scritto con cestino reversibile»). Lo stesso oggetto aveva due o tre schede nel catalogo: una con l'offerta del negozio,
// l'altra con i regali, le ricompense o la fonte della guida. Così un regalo «senza listino» non aveva prezzo né «Segna anche comprato», la
// ricerca mostrava nomi doppi e alcune offerte (Cesta di vestiti di Akihabara, 8.000 ¥) stavano su una scheda che nessun'altra pagina leggeva.
//
// Ogni riga dell'elenco qui sotto è un'unione con il gesto della fusione del catalogo (`unisciIdentita` → `fondiOggetti144`), reversibile dal
// Cestino: l'identità tolta va nel Cestino, offerte, regali, ricompense, proposte e fonti passano all'identità che resta, i nomi alternativi
// sono quelli scritti qui. L'identità tolta, con tutte le sue colonne (statistiche comprese), resta anche nell'audit.
//
// La categoria che resta. Le pagine dei listini della guida italiana («Elenco dei negozi», «Negozi speciali») non danno categorie: dicono
// negozio, prezzo e periodo. Le categorie delle schede tolte («regalo» della Crostatina angelo, del Natto rugiadoso, dell'Olio del recupero e
// dell'Aroma rinfrescante; «arma» della Catena di perline e della Tessera puntate alte; «materiale» della Razione militare; «accessorio» della
// Corona della salvezza) venivano dalle righe di partenza dei listini dell'app, spesso da fonti non italiane, non da una pagina della guida:
// la «Guida ai regali dei Confidenti» non cita nessuno di quei quattro regali, mentre la pagina Oggetti li descrive come consumabili. Qui
// non c'è discordanza fra pagine della guida (decisione 21: «vale il listino dei negozi con nota storica»), e resta la categoria della
// pagina Oggetti / Oggetti chiave. L'unica discordanza vera fra pagine è quella della Kogatana nera e della Veste nera: «Oggetti chiave e
// materiali» le mette fra i materiali per la Trasmutazione, «Armi da mischia» e «Protezioni» fra l'equipaggiamento, con le statistiche e
// «Può essere usata per la Trasmutazione», e gli stessi luoghi. È un solo oggetto: resta la scheda «materiale» (a cui sono già legati i
// contenuti dei forzieri della 144 e le offerte di Jose e di Tanaka, e che la pagina «Oggetti chiave e materiali» dell'app mostra fra i
// materiali: con la categoria «arma» o «protezione» la mostrerebbe fra gli oggetti chiave), con le statistiche dell'equipaggiamento
// conservate (scritte qui dalle pagine Armi da mischia e Protezioni: Joker, Attacco 50; solo uomini, Difesa 20, Elusione 2; la Veste nera
// tolta diceva «tutti», dalla riga di Untouchable, che la pagina Protezioni smentisce) e una nota storica sulla discordanza, legata alla
// scheda e all'offerta di Untouchable. Prima dell'unione il negozio mostrava «Joker / Attacco 50» dalla scheda «arma»; dopo lo mostra
// dalla scheda che resta. Le proposte «da completare» che dicevano «il catalogo ha due oggetti» si sostituiscono con il motivo corretto.
//
// Fuori dall'elenco, con il motivo (scritto anche nell'audit):
//   - Stilografica (regalo della cartoleria) e Stilografica (Yoshida) (dono di Yoshida al rango massimo, «Sblocca tecniche oratorie»): due
//     oggetti diversi, non un doppione;
//   - Distintivo dell'angelo ×2: le due righe dell'equipaggiamento restano finché l'abbinamento non è verificato in gioco (progetto, punto 18).
// Il Braccialetto d'argento (252) e le Gemme elementali (253) hanno le loro migrazioni; le righe che nominano più regali insieme la 251.
//
// Nessuna partita e nessuna voce del Diario cambia (le guardie di `unisciIdentita` lo verificano a ogni unione). Idempotente: un'identità
// già tolta non si tocca. Audit in `dati_guida.audit-250-identita-doppie`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { scriviAudit, unisciIdentita, type UnioneIdentita } from './identitaDoppie250.js';

const AUDIT = 'audit-250-identita-doppie';

/** L'elenco delle unioni (scritto e approvato con la decisione 21): `da` si toglie, `a` resta. */
export const UNIONI_250: readonly UnioneIdentita[] = [
  // ---- regali (RG-01, O5-03): la scheda della guida dei regali si unisce a quella con l'offerta del negozio
  { da: 'regalo/tartufi-al-cioccolato', a: 'regalo/tartufi', alias: ['Tartufi al cioccolato'], perche: 'stesso regalo del Taisho Store' },
  { da: 'regalo/pesi-da-polso-caviglia', a: 'regalo/pesi-da-polso', alias: ['Pesi da polso/caviglia'], perche: 'stesso regalo del Prossimo Asso' },
  { da: 'regalo/copertina-fodera-per-libro', a: 'regalo/copertina', alias: ['Fodera per libro'], perche: 'stessa Copertina di High Sense' },
  { da: 'regalo/copertina-per-libri', a: 'regalo/copertina', alias: ['Copertina per libri'], perche: 'stessa Copertina di High Sense' },
  { da: 'regalo/set-mascotte-locali', a: 'regalo/set-di-mascotte-locali', alias: ['Set mascotte locali'], perche: 'stesso regalo di Tokobushiya' },
  { da: 'regalo/bagno-di-rose-traduzione-non-ufficiale-en-bath-of-roses', a: 'regalo/bagno-di-rose', alias: ['Bath of Roses'], perche: 'stesso regalo del Fioraio Sukebe' },
  { da: 'regalo/profumo-di-design-en-designer-perfume', a: 'regalo/profumo-di-design', alias: ['Designer Perfume'], perche: 'stesso regalo del Body Chop' },
  { da: 'regalo/profumo-design', a: 'regalo/profumo-di-design', alias: ['Profumo design'], perche: 'stesso regalo del Body Chop' },
  { da: 'regalo/puzzle-3d-48-lati', a: 'regalo/puzzle-3d-a-48-lati', alias: ['Puzzle 3D 48 lati'], perche: 'stesso regalo di Mran Mran' },
  { da: 'regalo/set-di-aromi-pregiati', a: 'regalo/set-aromi-pregiati', alias: ['Set di aromi pregiati'], perche: 'stesso regalo del Body Chop' },
  { da: 'regalo/set-di-noodle-istantanei', a: 'regalo/set-noodle-istantanei', alias: ['Set di noodle istantanei'], perche: 'stesso regalo del Discount Rocinante' },
  { da: 'regalo/zuppa-di-noodle-istantanea-traduzione-non-ufficiale-en-cup-noodle-set', a: 'regalo/set-noodle-istantanei', alias: ['Zuppa di noodle istantanea', 'Cup Noodle Set'], perche: 'stesso Set noodle istantanei del Discount Rocinante' },
  { da: 'regalo/snack-confezione', a: 'regalo/snack', alias: [], perche: 'stesso regalo del Discount Rocinante' },
  { da: 'regalo/tazza-nera-traduzione-non-ufficiale-allgamestaff', a: 'regalo/tazza-nera', alias: [], perche: 'stesso regalo di Mran Mran' },
  { da: 'regalo/sveglia-rumorosa-traduzione-non-ufficiale-en-blaring-alarm-clock', a: 'regalo/sveglia-chiassosa', alias: ['Sveglia rumorosa', 'Blaring Alarm Clock'], perche: 'stesso regalo di Akindo (12.000 ¥)' },
  { da: 'regalo/puzzle-ring-anello-puzzle', a: 'regalo/anelli-intrecciati', alias: ['Puzzle Ring', 'Anello puzzle'], perche: 'stesso regalo di Mran Mran' },
  { da: 'regalo/spilla-da-idol-idol-pins', a: 'regalo/spille-idol', alias: ['Spilla da idol', 'Idol Pins'], perche: 'stesso regalo di Tokobushiya' },
  { da: 'regalo/diffusore-macchina-per-aromi-aroma-machine', a: 'regalo/diffusore-di-aromi', alias: ['Macchina per aromi', 'Aroma Machine'], perche: 'stesso regalo di Akindo (18.000 ¥)' },
  { da: 'regalo/cuscino-mochi-mochi-cushion', a: 'regalo/cuscino-mochi', alias: ['Mochi Cushion'], perche: 'stesso regalo di Mran Mran (6.500 ¥)' },
  // ---- altre identità doppie (O5-14): resta la scheda con la categoria della guida italiana
  { da: 'consumabile/homunculus-2', a: 'consumabile/homunculus', alias: [], perche: 'stesso Homunculus di Tanaka (la scheda tolta non aveva offerte)' },
  { da: 'accessorio/corona-della-salvezza', a: 'consumabile/corona-della-salvezza', alias: ['Crown of Salvation'], perche: 'la guida (Oggetti, Negozi speciali) la descrive come consumabile che cura le alterazioni e ripristina tutti gli HP degli alleati, 990.000 ¥ da Tanaka' },
  { da: 'accessorio/corona-della-salvezza-2', a: 'consumabile/corona-della-salvezza', alias: [], perche: 'stessa Corona della salvezza di Tanaka (990.000 ¥, grado Caos)' },
  { da: 'materiale/lente-condensante-2', a: 'materiale/lente-condensante', alias: [], perche: 'stessa Lente condensante (offerta nascosta di Tanaka)' },
  { da: 'regalo/crostatina-angelo', a: 'consumabile/crostatina-angelo', alias: [], perche: 'consumabile di cura nella pagina Oggetti',
    // lo scambio con il Mercante Sakai del 12-11 diceva che il catalogo aveva due Crostatine: dopo l'unione non è più vero
    motivi: [
      [' o «Crostatina angelo» (regalo/crostatina-angelo)', ''],
      ['; per la Crostatina angelo ceduta il catalogo ha due oggetti (consumabile/crostatina-angelo e regalo/crostatina-angelo)',
        '; la Crostatina angelo ceduta è un solo oggetto del catalogo (consumabile/crostatina-angelo), dopo l’unione delle identità doppie (ondata 5, decisione 21)'],
    ] },
  { da: 'regalo/natto-rugiadoso', a: 'consumabile/natto-rugiadoso', alias: [], perche: 'consumabile di cura nella pagina Oggetti' },
  { da: 'regalo/olio-del-recupero', a: 'consumabile/olio-del-recupero', alias: [], perche: 'consumabile per le alterazioni nella pagina Oggetti' },
  { da: 'regalo/aroma-rinfrescante', a: 'consumabile/aroma-rinfrescante', alias: [], perche: 'consumabile per le alterazioni nella pagina Oggetti' },
  { da: 'materiale/razione-militare', a: 'consumabile/razione-militare', alias: [], perche: 'consumabile di battaglia nella pagina Oggetti' },
  { da: 'arma/kogatana-nera', a: 'materiale/kogatana-nera', alias: [], statistiche: { per: 'Joker', testo: 'Attacco 50' },
    perche: 'stesso oggetto: materiale per la Trasmutazione (Oggetti chiave e materiali) e arma del protagonista (Armi da mischia), con gli stessi luoghi; le statistiche dell’arma restano sulla scheda (nota storica)',
    motivi: [
      ['il catalogo ha due oggetti con lo stesso nome, materiale/kogatana-nera (materiale, anche scambio con il Mercante Sakai) e arma/kogatana-nera (arma): quale dei due si riceve va scelto, e finché non è scelto la quantità non si scrive.',
        'si riceve la Kogatana nera (materiale/kogatana-nera): le due schede del catalogo con lo stesso nome sono state unite (ondata 5, decisione 21) e resta da scrivere solo la quantità.'],
    ] },
  { da: 'protezione/veste-nera', a: 'materiale/veste-nera', alias: [], statistiche: { per: 'Solo uomini', testo: 'Difesa 20, Elusione 2' },
    perche: 'stesso oggetto: materiale per la Trasmutazione (Oggetti chiave e materiali) e protezione maschile (Protezioni), con gli stessi luoghi; le statistiche della protezione restano sulla scheda (nota storica)' },
  { da: 'arma/catena-di-perline', a: 'consumabile/catena-di-perline', alias: [], perche: 'consumabile che ripristina tutti gli HP degli alleati (pagina Oggetti)',
    motivi: [
      ['il catalogo ha due «Catena di perline» (consumabile/catena-di-perline e arma/catena-di-perline): quale si riceve va scelto, e finché non è scelto la quantità non si scrive.',
        'si riceve la Catena di perline (consumabile/catena-di-perline): le due schede del catalogo con lo stesso nome sono state unite (ondata 5, decisione 21) e resta da scrivere solo la quantità.'],
    ] },
  { da: 'arma/tessera-puntate-alte', a: 'chiave/tessera-puntate-alte', alias: [], perche: 'oggetto chiave del Palazzo di Niijima' },
  { da: 'altro/esperto-a-biliardo', a: 'libro/esperto-a-biliardo', alias: [], perche: 'stesso libro del Prossimo Asso' },
  { da: 'altro/la-fattorizzazione', a: 'libro/la-fattorizzazione', alias: [], perche: 'stesso libro del Mercante Sakai' },
  { da: 'altro/cesta-di-vestiti', a: 'chiave/cesta-di-vestiti', alias: [], perche: 'stessa Cesta di vestiti (Oggetti chiave): l’offerta di Akihabara a 8.000 ¥ passa alla scheda della guida' },
  { da: 'regalo/cesta-di-vestiti', a: 'chiave/cesta-di-vestiti', alias: [], perche: 'stessa Cesta di vestiti (Oggetti chiave): l’offerta a punti di Vestiti usati passa alla scheda della guida' },
];

/** Restano separate, con il motivo. */
export const FUORI_ELENCO_250 = [
  { chiavi: ['regalo/stilografica', 'chiave/stilografica-yoshida'], perche: 'due oggetti diversi: il regalo della cartoleria Mitsubachi e il dono di Yoshida al rango massimo («Sblocca tecniche oratorie»)' },
  { chiavi: ['accessorio/distintivo-dellangelo', 'accessorio/distintivo-dellangelo-2'], perche: 'due righe dell’equipaggiamento: restano finché l’abbinamento non è verificato in gioco' },
] as const;

/** Le note storiche delle discordanze fra pagine della guida (decisione 21), legate alla scheda che resta e alle offerte indicate. */
const NOTE_250 = [
  {
    chiave: 'kogatana-nera-materiale-arma-fonte',
    scheda: 'materiale/kogatana-nera',
    offerte: ['untouchable/kogatana-nera'],
    testo: 'La guida descrive la Kogatana nera in due pagine: «Oggetti chiave e materiali» la mette fra i materiali per la Trasmutazione, «Armi da mischia» fra le armi del protagonista (Attacco 50, Precisione 95, «Può essere usata per la Trasmutazione»), con gli stessi luoghi (Jose, Yumenoshima, Affari loschi, forzieri dei Palazzi di Niijima e di Shido). È un solo oggetto: nel catalogo resta un materiale e conserva le statistiche dell’arma (Joker, Attacco 50). È una nota sulla fonte: non cambia prezzi, condizioni né acquisti.',
    fonte: 'Guida italiana: «Oggetti chiave e materiali» e «Armi da mischia»',
  },
  {
    chiave: 'veste-nera-materiale-protezione-fonte',
    scheda: 'materiale/veste-nera',
    offerte: ['untouchable/veste-nera'],
    testo: 'La guida descrive la Veste nera in due pagine: «Oggetti chiave e materiali» la mette fra i materiali per la Trasmutazione, «Protezioni» fra le protezioni maschili (Difesa 20, Elusione 2, «Può essere usata per la trasmutazione»), con gli stessi luoghi (Jose, Affari loschi, forziere del Palazzo di Futaba, scambio con il Mercante Sakai). È un solo oggetto: nel catalogo resta un materiale e conserva le statistiche della protezione (solo uomini, Difesa 20, Elusione 2). È una nota sulla fonte: non cambia prezzi, condizioni né acquisti.',
    fonte: 'Guida italiana: «Oggetti chiave e materiali» e «Protezioni»',
  },
] as const;

/** Scrive le note (idempotente: una nota già scritta non si cambia) e i legami a ciò che esiste. */
function scriviNote250(db: Parameters<Migration['up']>[0], adesso: string, unite: ReadonlySet<string>): { note: number; legami: number; saltate: string[] } {
  if (!esisteTabella(db, 'nota_storica') || !esisteTabella(db, 'nota_storica_legame')) return { note: 0, legami: 0, saltate: NOTE_250.map((n) => `${n.chiave}: tabelle assenti`) };
  let note = 0, legami = 0; const saltate: string[] = [];
  const lega = db.prepare('INSERT OR IGNORE INTO main.nota_storica_legame (nota_chiave, tipo, chiave) VALUES (?, ?, ?)');
  for (const n of NOTE_250) {
    // la nota racconta un'unione: se l'unione è ferma, non si scrive
    if (!unite.has(n.scheda)) { saltate.push(`${n.chiave}: unione in ${n.scheda} non applicata`); continue; }
    if (!db.prepare('SELECT 1 FROM main.catalogo_oggetto WHERE chiave = ?').get(n.scheda)) { saltate.push(`${n.chiave}: scheda ${n.scheda} assente`); continue; }
    note += db.prepare('INSERT OR IGNORE INTO main.nota_storica (chiave, testo, fonte, versione, seed_json, updated_at) VALUES (?, ?, ?, 1, ?, ?)')
      .run(n.chiave, n.testo, n.fonte, JSON.stringify({ versione: 1, testo: n.testo, fonte: n.fonte }), adesso).changes;
    legami += lega.run(n.chiave, 'catalogo', n.scheda).changes;
    for (const o of n.offerte) {
      if (db.prepare('SELECT 1 FROM main.articolo WHERE chiave = ? AND catalogo_chiave = ?').get(o, n.scheda)) legami += lega.run(n.chiave, 'articolo', o).changes;
      else saltate.push(`${n.chiave}: offerta ${o} assente o legata ad altro`);
    }
  }
  return { note, legami, saltate };
}

export const migration250: Migration = {
  id: 250,
  name: 'identita_doppie_unite',
  up(db) {
    if (!db.inTransaction) throw new Error('250: manca la transazione della migrazione; nessuna modifica applicata.');
    for (const t of ['catalogo_oggetto', 'articolo', 'confidente_regalo', 'proposta_abbinamento', 'cestino', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 250, tabella: t }, 'tabella assente: identità doppie non unite'); return; }
    }
    const esiti = UNIONI_250.map((u) => ({ ...unisciIdentita(db, u), perche: u.perche }));
    for (const e of esiti.filter((x) => x.esito === 'ferma')) logger.warn({ migrazione: 250, da: e.da, a: e.a, motivo: e.motivo }, 'unione non applicata, lasciata com’è');
    // le discordanze fra pagine della guida (Kogatana nera, Veste nera): nota storica, solo se l'unione c'è stata (o c'era già)
    const unite = new Set(esiti.filter((e) => e.esito !== 'ferma').map((e) => e.a));
    const note = scriviNote250(db, new Date().toISOString(), unite);
    // la Cesta di vestiti di Akihabara: l'offerta c'era già, su una scheda doppia; dopo l'unione si legge dalla scheda della guida
    const cesta = db.prepare("SELECT chiave, prezzo, nascosto, catalogo_chiave FROM main.articolo WHERE chiave = 'akiba/cesta-di-vestiti'").get() ?? null;
    const conteggi = {
      unite: esiti.filter((e) => e.esito === 'unita').length,
      giaUnite: esiti.filter((e) => e.esito === 'gia-unita').length,
      ferme: esiti.filter((e) => e.esito === 'ferma').length,
      proposteAggiornate: esiti.reduce((n, e) => n + (e.proposteAggiornate?.length ?? 0), 0),
      statisticheConservate: esiti.filter((e) => e.statisticheScritte).length,
      noteStoriche: note.note,
      legamiNote: note.legami,
    };
    scriviAudit(db, AUDIT, 250, { conteggi, esiti, note, fuoriElenco: FUORI_ELENCO_250, cestaAkihabara: cesta });
    logger.info({ migrazione: 250, ...conteggi }, 'Identità doppie del catalogo unite');
  },
};
