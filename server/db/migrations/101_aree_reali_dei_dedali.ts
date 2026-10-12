// ============================================================
// 101 — Le aree reali dei dedali, e le Persona collegate alle aree in cui si incontrano
// ============================================================
//
// Richiesta dell'utente (2026-10-12): «in ogni memento ci sono diverse aree... e per ogni area ci sono 4 elementi: Timbri
// raccolti..., Persone che puoi incontrare... Richieste e eventi di trama». Fino alla 099 ogni dedalo aveva una sola «Area 1»
// con dentro tutto. Progetto approvato dall'utente: le aree diventano quelle del gioco, ricavate dalla guida, e lui le corregge.
//   - Aree: il numero e i nomi vengono dalle descrizioni dei dedali della guida (Aiyatsbus «7 Aree (Area 1-7)», Akzeriyyuth
//     «Almeno 12 Aree», Iweleth le sue zone con nome, Da'at «Almeno 15 Piani» e oltre il 15 la «Sala di controllo cognitivo»).
//     La chiave dell'area N è `<dedalo>-area-N` (la 1 resta quella della 099). Si applica solo a un dedalo che ha ancora la
//     sola Area 1 della 099: un dedalo già organizzato dall'utente non si tocca.
//   - Timbri: la guida dà solo il totale del dedalo, non quello di ogni area; l'utente: «li conterò io man mano e li setterò».
//     Il totale delle aree nuove è vuoto, e quello dell'Area 1 (che era il totale del dedalo) si svuota: resta scritto nella
//     descrizione del dedalo. I timbri che una partita aveva segnato nell'Area 1 erano del dedalo intero e non hanno un'area:
//     la migrazione «utente» 020 li toglie con la stessa regola dell'app (un totale svuotato toglie i raccolti dell'area,
//     `allineaTimbriDelleAree`), e ne scrive il numero nel registro. Sui dati dell'utente, al 2026-10-12, erano 0 righe.
//   - Richieste: nell'area del loro campo «piano» («Area 5»; «Area 7 (Aiyatsbus) / Area 1 (Da'at)» vale per il suo dedalo);
//     senza un'area riconoscibile restano nel dedalo, da collocare.
//   - Trama: nell'area che il nome indica («Sala d'attesa - Area 4», «Banchina GIÙ - Area 2») o di cui porta il nome, altrimenti
//     in quella che la descrizione nomina, se ne nomina una sola («Compare nella Sala di controllo cognitivo», «Dopo l'Area 14»);
//     le altre (dette per tutto il dedalo, come «Nuovi scambi», o senza indizi) nella prima area (`areaDellaTrama`).
//   - Persona: una Persona si incontra in più aree. La voce diventa del dedalo (`area_dedalo_chiave` vuota) e le sue aree stanno
//     in `persona_area_dedalo`, dai piani del compendio (`persona.piani_mementos`, uno per dedalo di `aree_mementos_json`:
//     «piano 1-3, 5 e 6»; per Sheriruth le due fasi «prima / dopo il Palazzo 7» si uniscono). Senza indicazione precisa
//     («qualsiasi piano», «sconosciuto», o il compendio non la mette in quel dedalo) va in tutte le aree del dedalo. Tolta
//     un'area, le Persona perdono solo quel collegamento.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { chiaveAreaIniziale } from './099_aree_dei_dedali.js';

/** «Area 1» … «Area n». */
const numerate = (n: number, nome = 'Area'): string[] => Array.from({ length: n }, (_, i) => `${nome} ${i + 1}`);

/** Le aree di ogni dedalo come le dice la guida, in ordine. */
export const AREE_DEI_DEDALI: Readonly<Record<string, readonly string[]>> = {
  'mementos-01-qimranut': numerate(2),
  'mementos-02-aiyatsbus': numerate(7),
  'mementos-03-chemdah': numerate(8),
  'mementos-04-kaitul': numerate(10),
  'mementos-05-akzeriyyuth': numerate(12),
  'mementos-06-adyeshach': numerate(13),
  'mementos-07-sheriruth': numerate(14),
  'mementos-08-iweleth': ['Entrata', 'Corridoio della prigione I', 'Corridoio della prigione II', 'Corridoio della prigione III', 'Vuoto cavernoso I', 'Vuoto cavernoso II',
    'Santuario', '???', 'Piazza stazione Shibuya', 'Cammino per il Santo Graal I', 'Cammino per il Santo Graal II', 'Cammino per il Santo Graal III', 'Cammino per il Santo Graal IV'],
  'mementos-09-daat': [...numerate(15, 'Piano'), 'Sala di controllo cognitivo'],
};

/** Il nome del dedalo come lo scrivono la guida (nel campo «piano» delle Richieste) e il compendio (`aree_mementos_json`). */
const NOME_BREVE: Readonly<Record<string, string>> = {
  'mementos-01-qimranut': 'Qimranut', 'mementos-02-aiyatsbus': 'Aiyatsbus', 'mementos-03-chemdah': 'Chemdah', 'mementos-04-kaitul': 'Kaitul',
  'mementos-05-akzeriyyuth': 'Akzeriyyuth', 'mementos-06-adyeshach': 'Adyeshach', 'mementos-07-sheriruth': 'Sheriruth', 'mementos-08-iweleth': 'Iweleth', 'mementos-09-daat': "Da'at",
};

/** Forma di confronto di un nome (come `server/services/maschere.ts`). */
const normalizza = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** La maschera scritta nei dettagli di una voce (vuota se non c'è o se i dettagli non si leggono). */
export function mascheraDi(dettagliJson: string): string {
  try { return String((JSON.parse(dettagliJson) as Record<string, unknown>).maschera ?? ''); } catch { return ''; }
}

/** I dedali in cui il compendio mette una Persona (`aree_mementos_json`); vuoto se mancano o non si leggono. */
function dedaliDi(json: string | null): string[] {
  try { return json ? (JSON.parse(json) as string[]) : []; } catch { return []; }
}

/** La chiave dell'area n (da 1) di un dedalo: la 1 è quella della 099. */
export const chiaveAreaDedalo = (dedalo: string, n: number): string => (n === 1 ? chiaveAreaIniziale(dedalo) : `${dedalo}-area-${n}`);

/**
 * Il numero dell'area («Area N» o «Piano N») scritto in un testo per il dedalo dato: se il testo nomina dei dedali fra
 * parentesi («Area 7 (Aiyatsbus) / Area 1 (Da'at)») vale il numero accanto al suo, e nessuno se il suo non c'è; altrimenti il
 * primo numero d'area del testo. null se non ce n'è.
 */
export function numeroArea(testo: string, nomeDedalo: string): number | null {
  return numeriDelleAree(testo, nomeDedalo)[0] ?? null;
}

/** Le forme normalizzate dei nomi dei dedali: una parentesi dopo «Area N» che ne nomina uno dice di che dedalo è quel numero. */
const DEDALI_NORMALIZZATI = new Set(Object.values(NOME_BREVE).map(normalizza));

/**
 * I numeri d'area («Area N» o «Piano N») di un testo per il dedalo dato, in ordine: se il testo ne attribuisce qualcuno a un
 * dedalo fra parentesi («Area 7 (Aiyatsbus) / Area 1 (Da'at)») valgono solo quelli del suo; altrimenti tutti. Una parentesi
 * che non nomina un dedalo («Area 14 (richiesta 'Il capoccia…')») non attribuisce niente.
 */
function numeriDelleAree(testo: string, nomeDedalo: string): number[] {
  const tutti = [...testo.matchAll(/(?:Area|Piano)\s+(\d+)(?:\s*\(([^)]+)\))?/gi)];
  const attribuiti = tutti.filter((m) => m[2] !== undefined && DEDALI_NORMALIZZATI.has(normalizza(m[2])));
  return (attribuiti.length > 0 ? attribuiti.filter((m) => normalizza(m[2]) === normalizza(nomeDedalo)) : tutti).map((m) => Number(m[1]));
}

/** Forma di confronto del nome di un'area: la guida scrive «Corridoio della prigione - Parte I» per l'area «Corridoio della
 *  prigione I». */
const formaArea = (s: string): string => normalizza(s).split(' ').filter((w) => w !== 'parte').join(' ');

/**
 * L'area (indice da 0 in `nomi`) in cui va una voce di Trama di un dedalo riorganizzato, e da dove lo si è capito; null se né il
 * nome né la descrizione la indicano.
 *   - Dal nome: comincia col nome di un'area («Sala di controllo cognitivo (oltre Piano 15)»), altrimenti il suo numero d'area
 *     («Sala d'attesa - Area 4»).
 *   - Dalla descrizione (rilievo F2 del validatore, 2026-10-12), solo se è univoca: le aree che nomina, per nome («Compare nella
 *     Sala di controllo cognitivo», «nel 'Corridoio della prigione - Parte I'») e per numero («Dopo l'Area 14»), sono una sola.
 * I nomi «Area N» / «Piano N» si riconoscono dal numero; un nome che normalizzato resta vuoto, come «???», non riconosce niente
 * (altrimenti ogni testo «comincerebbe» o «conterrebbe» lui).
 */
export function areaDellaTrama(nome: string, descrizione: string, nomi: readonly string[], nomeDedalo: string): { indice: number; da: 'nome' | 'descrizione' } | null {
  const conNome = nomi.map((n, i) => ({ i, forma: /^(Area|Piano) \d+$/.test(n) ? '' : formaArea(n) })).filter((n) => n.forma !== '');
  const dentro = (n: number | null): number | null => (n !== null && n >= 1 && n <= nomi.length ? n - 1 : null);
  // a parola intera: «Corridoio della prigione II» non comincia con «Corridoio della prigione I»
  const perNome = conNome.find((n) => `${formaArea(nome)} `.startsWith(`${n.forma} `));
  if (perNome) return { indice: perNome.i, da: 'nome' };
  const perNumero = dentro(numeroArea(nome, nomeDedalo));
  if (perNumero !== null) return { indice: perNumero, da: 'nome' };
  const testo = ` ${formaArea(descrizione)} `;
  const citate = new Set(conNome.filter((n) => testo.includes(` ${n.forma} `)).map((n) => n.i));
  for (const n of numeriDelleAree(descrizione, nomeDedalo)) { const i = dentro(n); if (i !== null) citate.add(i); }
  return citate.size === 1 ? { indice: [...citate][0], da: 'descrizione' } : null;
}

/** I numeri dei piani di un testo del compendio («piano 1-3, 5 e 6» → 1,2,3,5,6); null se non dice piani precisi. */
export function pianiDelTesto(testo: string): number[] | null {
  const t = testo.replace(/\(.*?\)/g, '').trim();
  if (!/^piano\s/i.test(t)) return null;
  const numeri = new Set<number>();
  for (const pezzo of t.replace(/^piano\s+/i, '').split(/,|\se\s/)) {
    const r = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(pezzo);
    if (!r) return null;
    const da = Number(r[1]);
    const a = r[2] ? Number(r[2]) : da;
    for (let n = da; n <= a; n++) numeri.add(n);
  }
  return [...numeri].sort((x, y) => x - y);
}

export const migration101: Migration = {
  id: 101,
  name: 'aree_reali_dei_dedali',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS persona_area_dedalo (
      voce_chiave        TEXT NOT NULL REFERENCES punto_interesse(chiave) ON DELETE CASCADE,
      area_dedalo_chiave TEXT NOT NULL REFERENCES area_dedalo(chiave) ON DELETE CASCADE,
      PRIMARY KEY (voce_chiave, area_dedalo_chiave)
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_persona_area_dedalo_area ON persona_area_dedalo(area_dedalo_chiave)');

    const areeDi = db.prepare('SELECT chiave, nome FROM area_dedalo WHERE dedalo_chiave = ? ORDER BY ordine, chiave');
    const inserisciArea = db.prepare("INSERT OR IGNORE INTO area_dedalo (chiave, dedalo_chiave, ordine, nome, descrizione, timbri_totale) VALUES (?, ?, ?, ?, '', NULL)");
    const conto = { dedali: 0, aree: 0, richieste: 0, trama: 0, tramaDalNome: 0, tramaDallaDescrizione: 0, tramaSenzaIndizi: 0, persone: 0, collegamenti: 0 };

    // ---- aree, Richieste e Trama, nei dedali che hanno ancora la sola Area 1 della 099 ----
    for (const [dedalo, nomi] of Object.entries(AREE_DEI_DEDALI)) {
      const attuali = areeDi.all(dedalo) as Array<{ chiave: string; nome: string }>;
      if (attuali.length !== 1 || attuali[0].chiave !== chiaveAreaIniziale(dedalo)) continue;
      conto.dedali++;
      db.prepare('UPDATE area_dedalo SET nome = ?, timbri_totale = NULL WHERE chiave = ?').run(nomi[0], chiaveAreaIniziale(dedalo));
      nomi.forEach((nome, i) => { if (i > 0 && inserisciArea.run(chiaveAreaDedalo(dedalo, i + 1), dedalo, i, nome).changes) conto.aree++; });
      const area = (n: number | null): string | null => (n !== null && n >= 1 && n <= nomi.length ? chiaveAreaDedalo(dedalo, n) : null);
      for (const r of db.prepare('SELECT chiave, piano FROM richiesta WHERE area_chiave = ?').all(dedalo) as Array<{ chiave: string; piano: string }>) {
        db.prepare('UPDATE richiesta SET area_dedalo_chiave = ? WHERE chiave = ?').run(area(numeroArea(r.piano ?? '', NOME_BREVE[dedalo])), r.chiave);
        conto.richieste++;
      }
      for (const v of db.prepare("SELECT chiave, nome, descrizione FROM punto_interesse WHERE area_chiave = ? AND tipo <> 'persona' AND contenitore_chiave IS NULL").all(dedalo) as Array<{ chiave: string; nome: string; descrizione: string | null }>) {
        // dal nome, poi dalla descrizione se univoca; senza indizi resta nella prima area (l'utente la sposta)
        const dove = areaDellaTrama(v.nome, v.descrizione ?? '', nomi, NOME_BREVE[dedalo]);
        if (dove) conto[dove.da === 'nome' ? 'tramaDalNome' : 'tramaDallaDescrizione']++; else conto.tramaSenzaIndizi++;
        if (dove && dove.indice > 0) { db.prepare('UPDATE punto_interesse SET area_dedalo_chiave = ? WHERE chiave = ?').run(chiaveAreaDedalo(dedalo, dove.indice + 1), v.chiave); conto.trama++; }
      }
    }

    // ---- Persona: voci del dedalo, collegate alle aree in cui si incontrano ----
    const persone = db.prepare('SELECT id, nome, aree_mementos_json AS aree, piani_mementos AS piani FROM persona').all() as Array<{ id: number; nome: string; aree: string | null; piani: string | null }>;
    const perNome = new Map(persone.map((p) => [normalizza(p.nome), p]));
    const traduzioni = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'traduzione'").get()
      ? new Map((db.prepare("SELECT chiave, testo FROM traduzione WHERE ambito = 'persona'").all() as Array<{ chiave: string; testo: string }>).map((t) => [normalizza(t.testo), t.chiave]))
      : new Map<string, string>();
    /** La Persona del compendio di una maschera scritta dalla guida (anche in italiano; «Norna» è Norn). */
    const personaDi = (maschera: string) => perNome.get(normalizza(maschera)) ?? perNome.get(normalizza(traduzioni.get(normalizza(maschera)) ?? '')) ?? (normalizza(maschera) === 'norna' ? perNome.get('norn') : undefined);
    const collega = db.prepare('INSERT OR IGNORE INTO persona_area_dedalo (voce_chiave, area_dedalo_chiave) VALUES (?, ?)');
    const voci = db.prepare("SELECT p.chiave, p.area_chiave, p.area_dedalo_chiave, p.dettagli_json FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave JOIN dungeon d ON d.chiave = a.dungeon_chiave WHERE d.tipo = 'mementos' AND p.tipo = 'persona' AND p.area_dedalo_chiave IS NOT NULL").all() as Array<{ chiave: string; area_chiave: string; area_dedalo_chiave: string; dettagli_json: string }>;
    for (const v of voci) {
      const aree = (areeDi.all(v.area_chiave) as Array<{ chiave: string }>).map((a) => a.chiave);
      // un dedalo con le aree della guida (le chiavi che crea questa migrazione), non uno organizzato dall'utente
      const attese = (AREE_DEI_DEDALI[v.area_chiave] ?? []).map((_, i) => chiaveAreaDedalo(v.area_chiave, i + 1));
      const riorganizzato = attese.length > 0 && aree.join('|') === attese.join('|');
      let dove: string[];
      if (!riorganizzato) dove = [v.area_dedalo_chiave]; // un dedalo organizzato dall'utente: resta nell'area dove l'aveva messa
      else {
        const p = personaDi(mascheraDi(v.dettagli_json));
        const elencoDedali = dedaliDi(p?.aree ?? null);
        const i = elencoDedali.indexOf(NOME_BREVE[v.area_chiave]);
        const fasi = (p?.piani ?? '').split(' / ');
        // un testo per dedalo; Sheriruth ne ha due (prima / dopo il Palazzo 7) per un solo dedalo: si uniscono
        const testi = i < 0 ? [] : fasi.length === elencoDedali.length ? [fasi[i]] : elencoDedali.length === 1 ? fasi : [];
        const piani = testi.map(pianiDelTesto);
        const numeri = piani.length > 0 && piani.every((x) => x !== null) ? [...new Set(piani.flatMap((x) => x ?? []))].filter((n) => n >= 1 && n <= aree.length) : [];
        dove = numeri.length > 0 ? numeri.map((n) => chiaveAreaDedalo(v.area_chiave, n)) : aree;
      }
      for (const a of dove) conto.collegamenti += collega.run(v.chiave, a).changes;
      db.prepare('UPDATE punto_interesse SET area_dedalo_chiave = NULL WHERE chiave = ?').run(v.chiave);
      conto.persone++;
    }
    logger.info(conto, 'migrazione 101: aree reali dei dedali e Persona collegate alle loro aree');
  },
};
