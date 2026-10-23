// ============================================================
// 163 — disponibilità dei Confidenti strutturata come fonte (R9-01, R9-02, G-016b/d, G-036)
// ============================================================
//
// `confidente_disponibilita` aveva solo testo libero. Aggiunge le colonne strutturate (la fonte di ciò che l'app valuta), e il testo di oggi
// resta nelle note e nelle colonne di prima:
//   `modo`                 'settimanale' (giorni e fasce fissi), 'su-messaggio' (Kasumi), 'stanza-velluto' (Gemelle), 'trama' (Igor, Morgana, Sae);
//   `giorni_settimana_json` ["lun", …, "dom", "festivi"] (vuoto per chi non ha giorni fissi);
//   `fasce_orarie_json`    ["giorno", "sera"];
//   `eccezioni_json`       [{ "tipo": "pioggia", "effetto": "non-disponibile" | "richiesta", "ranghi"?: [..] },
//                           { "tipo": "dopo-rango", "giorni": 2, "effetto": "non-disponibile" },
//                           { "tipo": "fascia-rango", "rango": 7, "fasce": ["sera"] }];
//   `dal`                  'MM-GG' da cui è disponibile, se diverso dallo sblocco (Gemelle 05-18);
//   `motivo_senza_luogo`   perché non ha un luogo (Igor, Morgana, Sae, Gemelle: G-016d);
//   `fonte`                'G-036'.
// Correzioni al testo, ognuna solo se la riga è ancora come la guida di oggi la dava (nessuna riscrittura di un testo cambiato dall'utente):
// Ann (sera con la pioggia e Aula 2-D non sono nella guida), Kawakami (luogo = telefono del Leblanc), Yusuke (date d'itinerario al posto dei
// giorni), Gemelle (dal 18 maggio, non «dopo» Madarame), Haru e Futaba (date d'itinerario al posto dei giorni), Ryuji, Yoshida (+ festivi).
// I valori sono quelli di G-036; i Confidenti già coerenti con la guida (G-013/015/033) ricevono solo la struttura. Idempotente: una riga con
// `fonte` già scritta non si tocca.
// ============================================================

import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';

const FONTE = 'G-036';
type Giorno = 'lun' | 'mar' | 'mer' | 'gio' | 'ven' | 'sab' | 'dom' | 'festivi';
const TUTTI: Giorno[] = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
const NOME_GIORNO: Record<Giorno, string> = { lun: 'Lunedì', mar: 'Martedì', mer: 'Mercoledì', gio: 'Giovedì', ven: 'Venerdì', sab: 'Sabato', dom: 'Domenica', festivi: 'festivi' };
type Eccezione = { tipo: 'pioggia'; effetto: 'non-disponibile' | 'richiesta'; ranghi?: number[] }
  | { tipo: 'dopo-rango'; giorni: number; effetto: 'non-disponibile' }
  | { tipo: 'fascia-rango'; rango: number; fasce: string[] };
interface Struttura {
  modo: 'settimanale' | 'su-messaggio' | 'stanza-velluto' | 'trama';
  giorni: Giorno[]; fasce: Array<'giorno' | 'sera'>; eccezioni: Eccezione[]; dal?: string; senzaLuogo?: string;
}
const pioggia = (ranghi?: number[]): Eccezione => ({ tipo: 'pioggia', effetto: 'non-disponibile', ...(ranghi ? { ranghi } : {}) });

/** La disponibilità strutturata di ogni Confidente (G-036 e coerenza con la guida). */
const STRUTTURE: Record<string, Struttura> = {
  ryuji: { modo: 'settimanale', giorni: TUTTI, fasce: ['giorno'], eccezioni: [pioggia([2, 3, 6, 8]), { tipo: 'fascia-rango', rango: 7, fasce: ['sera'] }] },
  ann: { modo: 'settimanale', giorni: ['lun', 'mar', 'mer', 'ven', 'dom'], fasce: ['giorno'], eccezioni: [pioggia([3, 4, 5, 7, 9, 10])] },
  haru: { modo: 'settimanale', giorni: ['lun', 'mar', 'mer', 'gio', 'ven', 'sab'], fasce: ['giorno'], eccezioni: [pioggia()] },
  makoto: { modo: 'settimanale', giorni: ['mar', 'gio', 'sab', 'dom'], fasce: ['giorno'], eccezioni: [pioggia([2, 9])] },
  yusuke: { modo: 'settimanale', giorni: TUTTI, fasce: ['giorno'], eccezioni: [pioggia([4, 6, 9]), { tipo: 'pioggia', effetto: 'richiesta', ranghi: [8] }] },
  futaba: { modo: 'settimanale', giorni: ['mer', 'gio', 'sab', 'dom'], fasce: ['giorno'], eccezioni: [pioggia()] },
  kasumi: { modo: 'su-messaggio', giorni: [], fasce: [], eccezioni: [] },
  gemelle: { modo: 'stanza-velluto', giorni: [], fasce: [], eccezioni: [], dal: '05-18', senzaLuogo: 'Si incontrano alla Stanza di Velluto, senza luogo nel mondo: si arriva dal cancello vicino al Negozio Softair (G-016d).' },
  kawakami: { modo: 'settimanale', giorni: ['ven', 'sab'], fasce: ['sera'], eccezioni: [] },
  yoshida: { modo: 'settimanale', giorni: ['dom', 'festivi'], fasce: ['sera'], eccezioni: [pioggia()] },
  mishima: { modo: 'settimanale', giorni: TUTTI, fasce: ['sera'], eccezioni: [pioggia([3, 6, 7, 8, 10]), { tipo: 'dopo-rango', giorni: 2, effetto: 'non-disponibile' }] },
  akechi: { modo: 'settimanale', giorni: ['lun', 'mar', 'mer', 'gio', 'ven', 'sab'], fasce: ['sera'], eccezioni: [pioggia([4])] },
  igor: { modo: 'trama', giorni: [], fasce: [], eccezioni: [], senzaLuogo: 'Si incontra nella Stanza di Velluto, in sogno, con la trama: non ha un luogo nel mondo (G-016d).' },
  morgana: { modo: 'trama', giorni: [], fasce: [], eccezioni: [], senzaLuogo: 'Il legame avanza da solo con la trama, al Leblanc o nel Metaverso: non ha un luogo da visitare (G-016d).' },
  sae: { modo: 'trama', giorni: [], fasce: [], eccezioni: [], senzaLuogo: 'Il legame avanza da solo con la trama, negli interrogatori: non ha un luogo da visitare (G-016d).' },
  chihaya: { modo: 'settimanale', giorni: ['mar', 'gio', 'sab', 'dom'], fasce: ['sera'], eccezioni: [] },
  hifumi: { modo: 'settimanale', giorni: ['lun', 'mer', 'sab', 'dom'], fasce: ['sera'], eccezioni: [] },
  iwai: { modo: 'settimanale', giorni: ['gio', 'sab', 'dom'], fasce: ['sera'], eccezioni: [] },
  maruki: { modo: 'settimanale', giorni: ['lun', 'mar', 'mer', 'ven'], fasce: ['giorno'], eccezioni: [] },
  ohya: { modo: 'settimanale', giorni: TUTTI, fasce: ['sera'], eccezioni: [] },
  shinya: { modo: 'settimanale', giorni: ['lun', 'mar', 'gio', 'sab'], fasce: ['giorno'], eccezioni: [] },
  sojiro: { modo: 'settimanale', giorni: ['lun', 'mar', 'gio', 'ven', 'sab', 'dom'], fasce: ['sera'], eccezioni: [] },
  takemi: { modo: 'settimanale', giorni: TUTTI, fasce: ['giorno'], eccezioni: [] },
};

/** Correzioni del testo di oggi: colonna, valore atteso (la guida di prima) e valore nuovo. Si applica solo se il valore è ancora quello atteso. */
const TESTO: ReadonlyArray<{ confidente: string; colonna: 'giorni_json' | 'fasce_json' | 'luogo'; atteso: string; nuovo: string }> = [
  { confidente: 'ann', colonna: 'fasce_json', atteso: '["giorno; anche sera nei giorni di pioggia (secondo fonti inglesi)"]', nuovo: '["giorno"]' },
  { confidente: 'ann', colonna: 'luogo', atteso: 'Aula 2-D (a scuola) oppure Centro Commerciale Sotterraneo della Stazione di Shibuya', nuovo: "Centro Commerciale Sotterraneo della Stazione di Shibuya (l'Aula 2-D solo il 6 maggio)" },
  { confidente: 'kawakami', colonna: 'luogo', atteso: 'Leblanc (telefono a pagamento) e, più avanti, appartamento/vari luoghi', nuovo: 'Telefono a pagamento del Leblanc (il corridoio del 2° piano della Shujin solo per il primo incontro del 4 giugno)' },
  { confidente: 'yusuke', colonna: 'fasce_json', atteso: '["giorno (Yusuke è disponibile in genere di giorno); rango 8 richiede esplicitamente un giorno di pioggia"]', nuovo: '["giorno"]' },
  { confidente: 'gemelle', colonna: 'luogo', atteso: 'Stanza di Velluto (accessibile dopo il completamento del Palazzo di Madarame)', nuovo: 'Stanza di Velluto (accessibile dal 18 maggio, durante il Palazzo di Madarame)' },
  { confidente: 'haru', colonna: 'fasce_json', atteso: '["giorno, in genere sul tetto della scuola durante l\'orario scolastico"]', nuovo: '["giorno"]' },
  { confidente: 'futaba', colonna: 'fasce_json', atteso: '["variabile per evento; rango 4 disponibile solo con scuola aperta"]', nuovo: '["giorno"]' },
];

const titolo = (g: Giorno[]): string => JSON.stringify(g.map((x) => NOME_GIORNO[x]));
const ETICHETTA: Record<string, string> = { giorni_json: 'giorni', fasce_json: 'fasce', luogo: 'luogo', sblocco_data: 'data di sblocco' };

/** Il testo sostituito non si butta: resta in coda alle note, con la dicitura di quando è stato superato. */
function conservaNelleNote(db: AppDatabase, chiave: string, colonna: string, vecchio: string): void {
  const riga = `Prima di G-036 (${ETICHETTA[colonna] ?? colonna}): ${vecchio}`;
  db.prepare("UPDATE main.confidente_disponibilita SET note = CASE WHEN note = '' THEN ? ELSE note || char(10) || char(10) || ? END WHERE confidente_chiave = ?").run(riga, riga, chiave);
}

function correggiGiorni(db: AppDatabase, chiave: string, giorni: Giorno[]): void {
  // I giorni erano un elenco di date d'itinerario o una frase: la guida dà giorni della settimana. Si sostituiscono solo se erano date o frasi.
  const r = db.prepare('SELECT giorni_json FROM main.confidente_disponibilita WHERE confidente_chiave = ?').get(chiave) as { giorni_json: string } | undefined;
  if (!r) return;
  let valore: unknown;
  try { valore = JSON.parse(r.giorni_json) as unknown; } catch { return; }
  const giaGiorni = Array.isArray(valore) && valore.length > 0 && valore.every((v) => typeof v === 'string' && Object.values(NOME_GIORNO).some((n) => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') === v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')));
  if (!giaGiorni && Array.isArray(valore) && valore.length > 0
    && db.prepare('UPDATE main.confidente_disponibilita SET giorni_json = ? WHERE confidente_chiave = ? AND giorni_json = ?').run(titolo(giorni), chiave, r.giorni_json).changes === 1) {
    conservaNelleNote(db, chiave, 'giorni_json', r.giorni_json);
  }
}

export const migration163: Migration = {
  id: 163, name: 'disponibilita_strutturata',
  up(db) {
    const colonne = new Set((db.prepare('PRAGMA main.table_info(confidente_disponibilita)').all() as Array<{ name: string }>).map((c) => c.name));
    const aggiungi = (nome: string, ddl: string) => { if (!colonne.has(nome)) db.exec(`ALTER TABLE main.confidente_disponibilita ADD COLUMN ${nome} ${ddl}`); };
    aggiungi('modo', "TEXT NOT NULL DEFAULT 'settimanale' CHECK (modo IN ('settimanale', 'su-messaggio', 'stanza-velluto', 'trama'))");
    aggiungi('giorni_settimana_json', "TEXT NOT NULL DEFAULT '[]'");
    aggiungi('fasce_orarie_json', "TEXT NOT NULL DEFAULT '[]'");
    aggiungi('eccezioni_json', "TEXT NOT NULL DEFAULT '[]'");
    aggiungi('dal', 'TEXT');
    aggiungi('motivo_senza_luogo', "TEXT NOT NULL DEFAULT ''");
    aggiungi('fonte', 'TEXT');
    const scrivi = db.prepare(`UPDATE main.confidente_disponibilita SET modo = ?, giorni_settimana_json = ?, fasce_orarie_json = ?, eccezioni_json = ?, dal = ?,
      motivo_senza_luogo = ?, fonte = ? WHERE confidente_chiave = ? AND fonte IS NULL`);
    for (const [chiave, s] of Object.entries(STRUTTURE)) {
      const riga = db.prepare('SELECT fonte FROM main.confidente_disponibilita WHERE confidente_chiave = ?').get(chiave) as { fonte: string | null } | undefined;
      if (!riga || riga.fonte !== null) continue;
      scrivi.run(s.modo, JSON.stringify(s.giorni), JSON.stringify(s.fasce), JSON.stringify(s.eccezioni), s.dal ?? null, s.senzaLuogo ?? '', FONTE, chiave);
      for (const t of TESTO.filter((x) => x.confidente === chiave)) {
        if (db.prepare(`UPDATE main.confidente_disponibilita SET ${t.colonna} = ? WHERE confidente_chiave = ? AND ${t.colonna} = ?`).run(t.nuovo, chiave, t.atteso).changes === 1) {
          conservaNelleNote(db, chiave, t.colonna, t.atteso);
        }
      }
      if (['haru', 'futaba', 'yusuke', 'ryuji'].includes(chiave)) correggiGiorni(db, chiave, s.giorni);
    }
    // Yoshida: la domenica sera e i festivi (G-036).
    if (db.prepare('UPDATE main.confidente_disponibilita SET giorni_json = ? WHERE confidente_chiave = ? AND giorni_json = ?').run('["Domenica","festivi"]', 'yoshida', '["Domenica"]').changes === 1) {
      conservaNelleNote(db, 'yoshida', 'giorni_json', '["Domenica"]');
    }
    // Gemelle: l'accesso comincia il 18 maggio, durante Madarame (G-016b): il testo dello sblocco non lo dice dopo.
    const gem = db.prepare("SELECT sblocco_data FROM main.confidente_disponibilita WHERE confidente_chiave = 'gemelle'").get() as { sblocco_data: string } | undefined;
    if (gem && gem.sblocco_data.includes('(fine Palazzo Madarame)')
      && db.prepare("UPDATE main.confidente_disponibilita SET sblocco_data = replace(sblocco_data, '(fine Palazzo Madarame)', '(dal 18 maggio, durante il Palazzo di Madarame)') WHERE confidente_chiave = 'gemelle' AND sblocco_data = ?").run(gem.sblocco_data).changes === 1) {
      conservaNelleNote(db, 'gemelle', 'sblocco_data', gem.sblocco_data);
    }
  },
};
