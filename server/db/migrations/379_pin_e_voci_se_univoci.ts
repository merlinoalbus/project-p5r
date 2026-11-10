// ============================================================
// 379 — pin e voci della guida collegati, solo se l'abbinamento è univoco nei due versi (L9-03, Palazzi non validati)
// ============================================================
//
// Nei sei Palazzi non validati (Kaneshiro, Futaba, Okumura, Niijima, Shido, Maruki) nessuna voce ha un pin: i pin delle planimetrie vengono dalle
// tabelle del gioco e hanno nomi generici («Forziere», «Seme di bramosia», «Stanza sicura»), le voci sono testo della guida. Non esistono due nomi
// uguali da confrontare. Il solo abbinamento dimostrabile è strutturale: in un'Area c'è UN pin di una famiglia di tipi, e l'infiltrazione legata a
// quell'Area (`infiltrazione_area`, legame unico nei due versi) ha UNA voce della stessa famiglia. Le coppie collegate sono SOLO quelle dell'elenco
// `COPPIE`, ciascuna riscontrata sul testo della guida (pagina e riga in `prova`): la regola da sola non basta, l'elenco da solo nemmeno.
//
// Scrive soltanto in `spillo_voce`. Nessuna scrittura su `partite.db`: l'effetto è in lettura (una voce fatta segna i pin che la citano,
// `services/mappe/voceDelPin.ts`), quindi una coppia su cui una partita ha già uno stato (riga in `spillo_partita`, `spillo_partita_infiltrazione` o
// `punto_partita`) NON si collega: cambierebbe lo stato calcolato. Finisce nell'audit con il motivo, come ogni gruppo non univoco, ogni tesoro senza voce
// e ogni voce di un'infiltrazione senza Area. Kamoshida, Madarame, Iweleth e i Memento sono fuori perimetro.
//
// Il verbale è in `dati_guida.audit-l9-03-pin-e-voci`. Idempotente: una seconda esecuzione trova le coppie già scritte e non cambia nulla.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';
import { registraAudit } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`379: ${motivo}; nessuna modifica applicata.`); };

const PALAZZI = ['kaneshiro', 'futaba', 'okumura', 'niijima', 'shido', 'maruki'] as const;

/** La famiglia di una voce e quella di un pin: si abbinano solo tipi della stessa famiglia (le corrispondenze di `PIN_DEL_PUNTO`, `shared/spilli.ts`). */
const FAMIGLIA_VOCE: Record<string, string> = { forziere: 'forziere', 'forziere-chiuso': 'forziere', volonta: 'seme', sicura: 'sicura' };
const FAMIGLIA_PIN: Record<string, string> = { forziere: 'forziere', 'forziere-raro': 'forziere', 'seme-bramosia': 'seme', sicura: 'sicura', 'tesoro-palazzo': 'tesoro' };

/** Le coppie riscontrate sulla guida (riga del testo di https://www.allgamestaff.it/persona-5-royal/<pagina>/). */
const COPPIE: ReadonlyArray<{ voce: string; uid: string; prova: string }> = [
  { voce: 'kaneshiro-03-ufficio-riciclaggio/1', uid: '483feb9b43d81aa6d297e39d32a25b06', prova: 'palazzo-di-kaneshiro r.701-707: secondo Seme, unico pin seme dell’Area Ufficio riciclaggio – Parte I' },
  { voce: 'kaneshiro-04-caveau-sotterraneo/0', uid: '4deb76215f5629d6bac1f1cc0b43130f', prova: 'palazzo-di-kaneshiro r.795 e r.803: Safe Room del Caveau sotterraneo' },
  { voce: 'kaneshiro-04-caveau-sotterraneo/10', uid: '55a60c7b7d0e86b2ec6a444a3623b89e', prova: 'palazzo-di-kaneshiro r.1042: terzo Seme, Caveau sotterraneo' },
  { voce: 'okumura-02-corridoi-del-complesso/4', uid: 'd897ffc07fac272d76b2effd2f0643ab', prova: 'palazzo-di-okumura r.311: Seme avarizia rosso, Corridoi del complesso' },
  { voce: 'okumura-03-caserma/0', uid: 'a14e7a53efe37cd2566df896ce1eb112', prova: 'palazzo-di-okumura r.375: Safe Room della Caserma' },
  { voce: 'okumura-04-dintorni-del-complesso/0', uid: 'e640829ec786d98971c6fbf3d9ca898a', prova: 'palazzo-di-okumura r.473: Safe Room dei Dintorni del complesso' },
  { voce: 'okumura-05-linea-esportazioni/2', uid: '9236a19c397d4c499c1d6996b666e99b', prova: 'palazzo-di-okumura r.571 e r.619: Seme avarizia verde, Linea Esportazioni' },
  { voce: 'okumura-06-linea-di-produzione/1', uid: '8582581aac5d75985643fb851d69da00', prova: 'palazzo-di-okumura r.691: unico forziere della Linea di produzione (Polvere d’anima)' },
  { voce: 'okumura-07-linea-di-smaltimento/0', uid: 'fb4e1ec696d0e6d664d0681237f0803b', prova: 'palazzo-di-okumura r.739: Safe Room della Linea di smaltimento' },
  { voce: 'okumura-08-fabbrica-centrale/0', uid: '717caf5b2d5f678e9578a2b914ced2bf', prova: 'palazzo-di-okumura r.833: Safe Room della Fabbrica centrale' },
  { voce: 'okumura-09-interscambio/0', uid: 'cf3eced9daa4a1367307ee0891008f65', prova: 'palazzo-di-okumura r.959-965: settima Safe Room, Interscambio' },
  { voce: 'okumura-09-interscambio/3', uid: 'df3003862ab2ab4205f2bcd4d4fbd0be', prova: 'palazzo-di-okumura r.895-915: Seme avarizia blu, Interscambio' },
  { voce: 'okumura-09-interscambio/5', uid: '0e4cb35b45eb9968b14135f83a48ee09', prova: 'palazzo-di-okumura r.1049: unico forziere dell’Interscambio (Balsamo vitale)' },
  { voce: 'niijima-02-piano-terra/2', uid: '5f772a0175d06ea88a529d26eab807f9', prova: 'palazzo-di-sae r.221: forziere nell’angolo sud-est del Piano terra' },
  { voce: 'niijima-03-area-riservata-allo-staff-parte-i/0', uid: '2dfc376e0f43f2149821ac52a6106d4f', prova: 'palazzo-di-sae r.382: Safe Room dell’Area riservata allo staff – Parte I' },
  { voce: 'niijima-03-area-riservata-allo-staff-parte-i/3', uid: 'ea7aad7c05a74d087787a7e8ee79680f', prova: 'palazzo-di-sae r.440: Seme invidia rosso, Area riservata allo staff – Parte I' },
  { voce: 'niijima-06-lobby-piano-riservato-ai-soci/0', uid: '359b91855729cb334b42f6ee67cb8340', prova: 'palazzo-di-sae r.550: Safe Room della Lobby del piano riservato ai soci' },
  { voce: 'niijima-09-stanza-slot-machine-1/6', uid: '5bcd28d12554f86b70efd615fa75fb09', prova: 'palazzo-di-sae r.870: Seme invidia verde, Stanza slot machine 1' },
  { voce: 'niijima-11-lobby-piano-puntate-alte/0', uid: 'd66bf489744b6e04df7873c71af7ab19', prova: 'palazzo-di-sae r.1163: forziere chiuso (Pugnale reale), Lobby del piano delle puntate alte' },
  { voce: 'shido-04-corridoio-mezzavia-tribordo/3', uid: '5b676454c3d7bb86e0fba7b34dd71e4d', prova: 'palazzo-di-shido r.489: Seme superbia rosso, Corridoio mezzavia tribordo' },
  { voce: 'shido-05-ponte-piscina/0', uid: '4a7a2d80520ca8900f0cbb7a0d74d0a5', prova: 'palazzo-di-shido r.541: Safe Room del Ponte piscina' },
  { voce: 'shido-06-corridoio-superiore-tribordo/0', uid: '1382045bf8d1ac0784afe91d2557a45a', prova: 'palazzo-di-shido r.617: Safe Room del Corridoio superiore tribordo' },
  { voce: 'shido-08-sala-intrattenimento/4', uid: '01fe39456a1d726cf9b2a59924b8f3ae', prova: 'palazzo-di-shido r.863: Safe Room della Sala intrattenimento' },
  { voce: 'shido-09-corridoio-inferiore-babordo/2', uid: 'efee243c764097e80333e6fb764fcac3', prova: 'palazzo-di-shido r.1045: Seme superbia verde, Corridoio inferiore babordo' },
  { voce: 'maruki-03-percorso-di-prova/3', uid: 'b424bc9a4069d2750e060e4765aae642', prova: 'palazzo-di-maruki r.475: unico forziere chiuso del Percorso di prova (Spray detergente)' },
  { voce: 'maruki-07-sala-di-controllo/0', uid: '7604c8dfceef373c54d1256d3843b4dc', prova: 'palazzo-di-maruki r.701: Safe Room della Sala di controllo' },
  { voce: 'maruki-07-sala-di-controllo/6', uid: '791ae986e1ac6ec16d40ea1084fac813', prova: 'palazzo-di-maruki r.856: Seme tristezza rosso, Sala di controllo' },
  { voce: 'maruki-08-ala-ricerca/6', uid: '064b22103f2003ad335051cce43b55d4', prova: 'palazzo-di-maruki r.1026: Seme tristezza verde, Ala ricerca' },
  { voce: 'maruki-11-corridoio-del-crepuscolo/1', uid: '53e20829cf943fe3967e46df18b5ff0a', prova: 'palazzo-di-maruki r.1620: Safe Room del Corridoio del Crepuscolo' },
];

interface Pin { id: number; uid: string | null; tipo: string; area: string | null; palazzo: string }
interface Voce { chiave: string; tipo: string; nome: string; infiltrazione: string; palazzo: string }
interface Gruppo { palazzo: string; area: string; famiglia: string; pin: Pin[]; voci: Voce[] }
interface Scartata { voce?: string; uid?: string; pin?: number[]; area?: string; famiglia?: string; motivo: string }

const esisteUtente = (db: AppDatabase): boolean => !!db.prepare("SELECT 1 FROM pragma_database_list WHERE name = 'utente'").get();

/** Le tabelle del file delle partite (vuoto se il file non è attaccato, come sul pacchetto iniziale). */
function tabellePartite(db: AppDatabase): Set<string> {
  if (!esisteUtente(db)) return new Set();
  return new Set((db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((r) => r.name));
}

/** Impronta di una tabella delle partite, o null se non c'è. */
function improntaPartite(db: AppDatabase, tabella: string): string | null {
  if (!tabellePartite(db).has(tabella)) return null;
  const h = createHash('sha256');
  let n = 0;
  for (const r of db.prepare(`SELECT * FROM utente.${tabella} ORDER BY 1, 2`).iterate()) { h.update(JSON.stringify(r) + '\n'); n++; }
  return `${n}:${h.digest('hex')}`;
}

/** Perché una partita ha già uno stato sul pin o sulla voce (il collegamento cambierebbe ciò che calcola la lettura), o null. */
function statoNellePartite(db: AppDatabase, uid: string, voce: string): string | null {
  const tabelle = tabellePartite(db);
  if (tabelle.has('spillo_partita') && db.prepare('SELECT 1 FROM utente.spillo_partita WHERE spillo_uid = ?').get(uid)) return 'il pin ha una riga in spillo_partita';
  if (tabelle.has('spillo_partita_infiltrazione') && db.prepare('SELECT 1 FROM utente.spillo_partita_infiltrazione WHERE spillo_uid = ?').get(uid)) return 'il pin ha una riga in spillo_partita_infiltrazione';
  if (tabelle.has('punto_partita') && db.prepare('SELECT 1 FROM utente.punto_partita WHERE punto_chiave = ?').get(voce)) return 'la voce ha una riga in punto_partita';
  return null;
}

/** I gruppi (Area, famiglia) dei sei Palazzi con i loro pin e voci, e le voci la cui infiltrazione non ha un'Area univoca. */
function raccogliGruppi(db: AppDatabase): { gruppi: Map<string, Gruppo>; senzaArea: Voce[] } {
  const gruppi = new Map<string, Gruppo>();
  const senzaArea: Voce[] = [];
  const gruppo = (palazzo: string, area: string, famiglia: string): Gruppo => {
    const k = `${area}#${famiglia}`;
    const g = gruppi.get(k) ?? { palazzo, area, famiglia, pin: [], voci: [] };
    gruppi.set(k, g);
    return g;
  };
  const leggiPin = db.prepare(`WITH RECURSIVE albero(chiave) AS (
      SELECT chiave FROM main.mappa WHERE chiave = ? AND genitore_chiave IS NULL
      UNION SELECT m.chiave FROM main.mappa m JOIN albero a ON m.genitore_chiave = a.chiave
    ) SELECT s.id, s.uid, s.tipo, m.area_chiave AS area FROM main.spillo s JOIN main.mappa m ON m.chiave = s.mappa_chiave WHERE s.mappa_chiave IN (SELECT chiave FROM albero) ORDER BY s.id`);
  const leggiVoci = db.prepare('SELECT p.chiave, p.tipo, p.nome, p.area_chiave AS infiltrazione FROM main.punto_interesse p JOIN main.dungeon_area a ON a.chiave = p.area_chiave WHERE a.dungeon_chiave = ? ORDER BY p.area_chiave, p.ordine');
  const areeDi = db.prepare('SELECT area_chiave FROM main.infiltrazione_area WHERE infiltrazione_chiave = ?').pluck();
  const infiltrazioniDi = db.prepare('SELECT COUNT(*) FROM main.infiltrazione_area WHERE area_chiave = ?').pluck();
  for (const palazzo of PALAZZI) {
    for (const p of leggiPin.all(`dungeon-${palazzo}`) as Array<Omit<Pin, 'palazzo'>>) {
      const famiglia = FAMIGLIA_PIN[p.tipo];
      if (famiglia && p.area) gruppo(palazzo, p.area, famiglia).pin.push({ ...p, palazzo });
    }
    for (const v of leggiVoci.all(palazzo) as Array<Omit<Voce, 'palazzo'>>) {
      const famiglia = FAMIGLIA_VOCE[v.tipo];
      if (!famiglia) continue;
      const aree = areeDi.all(v.infiltrazione) as string[];
      if (aree.length === 1 && infiltrazioniDi.get(aree[0]) === 1) gruppo(palazzo, aree[0], famiglia).voci.push({ ...v, palazzo });
      else senzaArea.push({ ...v, palazzo });
    }
  }
  return { gruppi, senzaArea };
}

/** Il motivo per cui un gruppo non si collega, o null se è uno di quelli dell'elenco. */
function motivoNonUnivoco(g: Gruppo, elenco: ReadonlySet<string>): string | null {
  if (g.famiglia === 'tesoro') return g.pin.length > 0 ? 'nessuna voce del Tesoro in questo Palazzo: il pin si collega a mano' : null;
  if (g.pin.length === 1 && g.voci.length === 1) return elenco.has(g.voci[0].chiave) ? null : 'univoco nei dati ma non riscontrato sulla guida';
  if (g.pin.length === 0 && g.voci.length === 0) return null;
  if (g.pin.length === 0) return 'nessun pin di questa famiglia nell’Area';
  if (g.voci.length === 0) return 'nessuna voce di questa famiglia nell’infiltrazione legata all’Area';
  return `non univoco: ${g.pin.length} pin (anche inquadrature della stessa stanza) e ${g.voci.length} voci nella stessa Area`;
}

export const migration379: Migration = {
  id: 379,
  name: 'pin_e_voci_se_univoci',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['spillo', 'spillo_voce', 'punto_interesse', 'dungeon_area', 'infiltrazione_area', 'mappa', 'dati_guida']) if (!esisteTabella(db, t)) return;

    const { gruppi, senzaArea } = raccogliGruppi(db);
    const elenco = new Set(COPPIE.map((c) => c.voce));
    const giaCollegata = db.prepare('SELECT 1 FROM main.spillo_voce WHERE spillo_id = ? AND voce_chiave = ?');
    // i pin delle planimetrie, come `pinDelPuntoGuida`: le schede della guida senza mappa (`mappa_chiave` nullo, riferimento «punto») sono la voce stessa, non un pin
    const pinDellaVoce = db.prepare('SELECT COUNT(*) FROM main.spillo_voce sv JOIN main.spillo s ON s.id = sv.spillo_id WHERE sv.voce_chiave = @voce AND s.mappa_chiave IS NOT NULL').pluck();
    const vociDelPin = db.prepare("SELECT COUNT(*) FROM (SELECT voce_chiave FROM main.spillo_voce WHERE spillo_id = @id UNION SELECT riferimento_chiave FROM main.spillo WHERE id = @id AND riferimento_tipo = 'punto' AND riferimento_chiave IS NOT NULL)").pluck();
    const inserisci = db.prepare('INSERT INTO main.spillo_voce (spillo_id, voce_chiave) VALUES (?, ?)');
    const trovaPin = db.prepare('SELECT id FROM main.spillo WHERE uid = ?').pluck();

    // le impronte di prima: si scrive solo in `spillo_voce`
    const righePrima = db.prepare('SELECT COUNT(*) FROM main.spillo_voce').pluck().get() as number;
    const giocoPrima = new Map([['punto_interesse', improntaTabella(db, 'punto_interesse')], ['spillo', improntaTabella(db, 'spillo')]]);
    const partitePrima = new Map([['spillo_partita', improntaPartite(db, 'spillo_partita')], ['punto_partita', improntaPartite(db, 'punto_partita')]]);

    const scartate: Scartata[] = [];
    const collegate: Array<{ voce: string; pin: number; uid: string; prova: string }> = [];
    for (const c of COPPIE) {
      const id = trovaPin.get(c.uid) as number | undefined;
      if (id === undefined) { scartate.push({ voce: c.voce, uid: c.uid, motivo: 'il pin non c’è (uid sconosciuto)' }); continue; }
      if (giaCollegata.get(id, c.voce)) continue;
      const g = [...gruppi.values()].find((x) => x.voci.some((v) => v.chiave === c.voce));
      if (!g) { scartate.push({ voce: c.voce, uid: c.uid, motivo: 'la voce non c’è o la sua infiltrazione non ha un’Area univoca' }); continue; }
      if (g.pin.length !== 1 || g.voci.length !== 1) { scartate.push({ voce: c.voce, uid: c.uid, area: g.area, famiglia: g.famiglia, motivo: `il gruppo non è più univoco (${g.pin.length} pin, ${g.voci.length} voci)` }); continue; }
      if (g.pin[0].uid !== c.uid) { scartate.push({ voce: c.voce, uid: c.uid, area: g.area, famiglia: g.famiglia, motivo: 'l’unico pin del gruppo non è quello riscontrato sulla guida' }); continue; }
      if ((pinDellaVoce.get({ voce: c.voce }) as number) > 0 || (vociDelPin.get({ id }) as number) > 0) { scartate.push({ voce: c.voce, uid: c.uid, area: g.area, motivo: 'la voce o il pin hanno già un altro collegamento' }); continue; }
      const stato = statoNellePartite(db, c.uid, c.voce);
      if (stato) { scartate.push({ voce: c.voce, uid: c.uid, area: g.area, motivo: `lo stato calcolato cambierebbe: ${stato}` }); continue; }
      inserisci.run(id, c.voce);
      collegate.push({ voce: c.voce, pin: id, uid: c.uid, prova: c.prova });
    }

    if (db.prepare('SELECT COUNT(*) FROM main.spillo_voce').pluck().get() !== righePrima + collegate.length) errore('il numero delle righe di spillo_voce non è quello atteso');
    for (const [t, impronta] of giocoPrima) if (improntaTabella(db, t) !== impronta) errore(`la tabella ${t} è cambiata`);
    for (const [t, impronta] of partitePrima) if (improntaPartite(db, t) !== impronta) errore(`la tabella delle partite ${t} è cambiata`);

    if (collegate.length === 0 && scartate.length === 0) return;

    // i casi lasciati, col motivo: nel dubbio non si collega
    const nonCollegati: Scartata[] = [];
    for (const g of gruppi.values()) {
      const motivo = motivoNonUnivoco(g, elenco);
      if (motivo) nonCollegati.push({ voce: g.voci.map((v) => v.chiave).join(' ; ') || undefined, pin: g.pin.map((p) => p.id), area: g.area, famiglia: g.famiglia, motivo });
    }
    for (const v of senzaArea) nonCollegati.push({ voce: v.chiave, famiglia: FAMIGLIA_VOCE[v.tipo], motivo: 'l’infiltrazione non ha un legame unico con un’Area (infiltrazione_area): nessun confronto dimostrabile' });

    registraAudit(db, 'audit-l9-03-pin-e-voci', {
      migrazione: 'L9-03 · 379',
      regola: 'un solo pin della famiglia nell’Area, una sola voce della famiglia nell’infiltrazione legata, riscontro sulla guida',
      collegate,
      scartate,
      nonCollegati,
      partite: Object.fromEntries(partitePrima),
    });
    logger.info({ migrazione: 'L9-03-379', collegate: collegate.length, scartate: scartate.length, nonCollegati: nonCollegati.length }, 'pin e voci collegati dove l’abbinamento è univoco');
  },
};
