// ============================================================
// 173 — personalità delle Ombre secondo Royal: le varianti fra Palazzo e Memento, i doppioni di nome (L8, B4: domande aperte)
// ============================================================
//
// La migrazione 166 aveva tenuto separate (e segnalato) le Ombre con la stessa Persona e personalità diverse fra Palazzo e Memento, e tre
// coppie con lo stesso Persona e nome scritto in due modi. Le fonti Royal decidono (vince Royal):
//  - i dati del gioco (aqiu384, `roy-enemy-data.json`) danno **una sola personalità per ogni Ombra** (una per Persona fra queste): la variante
//    «di Memento» era la personalità scritta dalla guida italiana, in contrasto; Samurai Gamers conferma lo stesso umore nei Memento
//    (Percorso di Kaitul: Amante geloso, Demone della battaglia, Equino saggio, Maestra degli scherzi, Vendicatore sconfitto, Demone
//    dell'acqua furioso; Percorso di Akzeriyyuth: Ladro delle tavole, Signora del passaggio);
//  - quindi le 10 «varianti» sono un errore dei dati: stessa Persona, stesso nome, stessa Ombra. Si fondono nella prima, con la personalità Royal;
//  - le 3 coppie di nome (Amul./Amuleto dell'Imperatore, Custode del rogo sacrificale/Custode rogo sacrificale, Demone Acque Furibondo/Demone
//    dell'acqua furioso) sono la stessa Ombra scritta in due modi (stessa Persona, stessa personalità, posti diversi): si fondono e il secondo
//    nome resta fra i nomi alternativi; il Custode (Moloch, «Sacrificial Pyrekeeper») per Royal è Cupa, non Giocosa;
//  - Koh-i-Noor: Royal «Koh-i-Noor D» è Giocosa; le due righe (Memento Cupa, Okumura Giocosa) sono la stessa Ombra e si fondono;
//  - Okumura: Belphegor, Decarabia, Girimehkala, Kumbhanda hanno il nome della Persona (la guida non dice quello dell'Ombra). Il nome inglese di
//    Royal si aggiunge ai nomi alternativi (Ambassador of Filth, Vicious Pentagram, Rebellious Elephant, Life-Draining Spirit); la personalità
//    delle quattro righe dei Memento (Palindromo di turpitudine, Subdolo pentacolo, Elefante ribelle, Spirito divoravita: stessa Persona) è
//    portata a quella di Royal. NON si fondono con Okumura: nessuna fonte consultata mostra che sia lo stesso nemico (resta nell'elenco).
//
// Conservativa: tocca solo righe `origine = 'seed'` rimaste come il seed le ha scritte e solo se la coppia ha la stessa Persona; ciò che non torna
// si salta e finisce nel rapporto. Nessuna riga di luogo o di voce si perde (si spostano sulla Ombra rimasta). Non tocca il compendio, la
// guida alla Battaglia né `partite.db`. Il rapporto sta in `dati_guida` («ombre-correzioni-173»). Se `ombra` non esiste non fa nulla.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { PERSONALITA_OMBRA } from '../../../shared/elementi.js';

interface Fusione {
  tieni: string;
  assorbi: string;
  personalita: string;
  /** Il dato Royal da cui viene la personalità. */
  royal: string;
}

const FUSIONI: ReadonlyArray<Fusione> = [
  { tieni: 'amante-geloso', assorbi: 'amante-geloso-timida', personalita: 'irritabile', royal: 'Jealous Lover (Leanan Sidhe): Irritable' },
  { tieni: 'demone-della-battaglia', assorbi: 'demone-della-battaglia-irritabile', personalita: 'irritabile', royal: 'Battle Fiend (Rakshasa): Irritable' },
  { tieni: 'dio-uccello-furente', assorbi: 'dio-uccello-furente-irritabile', personalita: 'irritabile', royal: 'Raging Bird God (Garuda): Irritable' },
  { tieni: 'equino-saggio', assorbi: 'equino-saggio-timida', personalita: 'timida', royal: 'Equine Sage (Orobas): Timid' },
  { tieni: 'ladro-delle-tavole', assorbi: 'ladro-delle-tavole-timida', personalita: 'irritabile', royal: 'Thief of Tablets (Anzu): Irritable' },
  { tieni: 'maestra-degli-scherzi', assorbi: 'maestra-degli-scherzi-irritabile', personalita: 'irritabile', royal: 'Prankster Leader (High Pixie): Irritable' },
  { tieni: 'sacrificio-lamentoso', assorbi: 'sacrificio-lamentoso-giocosa', personalita: 'cupa', royal: 'Lamenting Sacrifice (Kushinada): Gloomy' },
  { tieni: 'signora-del-passaggio', assorbi: 'signora-del-passaggio-timida', personalita: 'timida', royal: 'She of Life and Death (Isis): Timid' },
  { tieni: 'suonatrice-di-vina', assorbi: 'suonatrice-di-vina-timida', personalita: 'timida', royal: 'Strumming Veena Player (Sarasvati): Timid' },
  { tieni: 'vendicatore-sconfitto', assorbi: 'vendicatore-sconfitto-irritabile', personalita: 'cupa', royal: 'Defeated Avenger (Take-Minakata): Gloomy' },
  // le tre coppie di nome
  { tieni: 'amuleto-dellimperatore', assorbi: 'amul-dellimperatore', personalita: 'giocosa', royal: 'Emperor\'s Amulet D (Emperor\'s Amulet): Upbeat' },
  { tieni: 'custode-del-rogo-sacrificale', assorbi: 'custode-rogo-sacrificale', personalita: 'cupa', royal: 'Sacrificial Pyrekeeper (Moloch): Gloomy' },
  { tieni: 'demone-acque-furibondo', assorbi: 'demone-dellacqua-furioso', personalita: 'cupa', royal: 'Raging Water Demon (Sui-Ki): Gloomy' },
  // Koh-i-Noor: una Ombra sola
  { tieni: 'koh-i-noor', assorbi: 'koh-i-noor-giocosa', personalita: 'giocosa', royal: 'Koh-i-Noor D (Koh-i-Noor): Upbeat' },
];

/** I Memento che portano la personalità sbagliata e le Okumura che prendono il nome inglese di Royal (nomi alternativi). */
const OKUMURA: ReadonlyArray<{ okumura: string; memento: string; nomeInglese: string; personalita: string; royal: string }> = [
  { okumura: 'belphegor', memento: 'palindromo-di-turpitudine', nomeInglese: 'Ambassador of Filth', personalita: 'irritabile', royal: 'Ambassador of Filth (Belphegor): Irritable' },
  { okumura: 'decarabia', memento: 'subdolo-pentacolo', nomeInglese: 'Vicious Pentagram', personalita: 'cupa', royal: 'Vicious Pentagram (Decarabia): Gloomy' },
  { okumura: 'girimehkala', memento: 'elefante-ribelle', nomeInglese: 'Rebellious Elephant', personalita: 'cupa', royal: 'Rebellious Elephant (Girimehkala): Gloomy' },
  { okumura: 'kumbhanda', memento: 'spirito-divoravita', nomeInglese: 'Life-Draining Spirit', personalita: 'irritabile', royal: 'Life-Draining Spirit (Kumbhanda): Irritable' },
];

interface RigaOmbra { chiave: string; nome: string; nomi_altri_json: string; persona_id: number | null; personalita: string; negoziabile: number | null; livello: number | null; note: string; origine: string; seed_json: string | null }

const COLONNE = 'chiave, nome, nomi_altri_json, persona_id, personalita, negoziabile, livello, note, origine, seed_json';

const nomiAltri = (json: string): string[] => { try { const v = JSON.parse(json) as unknown; return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; } catch { return []; } };
const seedJson = (json: string | null): Record<string, unknown> | null => { try { return json ? (JSON.parse(json) as Record<string, unknown>) : null; } catch { return null; } };

/** Vero se la riga è ancora quella che la 166 ha scritto (nessuna modifica dell'utente). */
function comeIlSeed(r: RigaOmbra): boolean {
  const s = seedJson(r.seed_json);
  return r.origine === 'seed' && s !== null && s.personalita === r.personalita && s.nome === r.nome;
}

const aggiungiNota = (note: string, testo: string): string => (note.includes(testo) ? note : note ? `${note} ${testo}` : testo);

export const migration173: Migration = {
  id: 173,
  name: 'ombre_personalita_royal',
  up(db: AppDatabase) {
    const esiste = (t: string): boolean => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t);
    if (!esiste('ombra') || !esiste('ombra_luogo') || !esiste('ombra_voce')) return;
    const leggi = db.prepare(`SELECT ${COLONNE} FROM main.ombra WHERE chiave = ?`);
    const adesso = new Date().toISOString();
    const aggiorna = db.prepare('UPDATE main.ombra SET nome = ?, nomi_altri_json = ?, personalita = ?, negoziabile = ?, livello = ?, note = ?, seed_json = ?, updated_at = ? WHERE chiave = ?');
    const rapporto: { fuse: unknown[]; personalitaCorrette: unknown[]; nomiInglesi: unknown[]; saltate: Array<{ voce: string; motivo: string }> } = { fuse: [], personalitaCorrette: [], nomiInglesi: [], saltate: [] };
    const valida = (p: string): boolean => (PERSONALITA_OMBRA as readonly string[]).includes(p) && p !== 'sconosciuta';

    for (const f of FUSIONI) {
      const tieni = leggi.get(f.tieni) as RigaOmbra | undefined;
      const assorbi = leggi.get(f.assorbi) as RigaOmbra | undefined;
      if (!valida(f.personalita)) { rapporto.saltate.push({ voce: f.tieni, motivo: 'personalità del rapporto non valida' }); continue; }
      if (!tieni || !assorbi) { rapporto.saltate.push({ voce: `${f.tieni} / ${f.assorbi}`, motivo: 'una delle due righe non esiste più (già fusa o eliminata)' }); continue; }
      if (tieni.persona_id === null || tieni.persona_id !== assorbi.persona_id) { rapporto.saltate.push({ voce: `${f.tieni} / ${f.assorbi}`, motivo: 'Persona diversa o assente: non è dimostrato che sia la stessa Ombra' }); continue; }
      if (!comeIlSeed(tieni) || !comeIlSeed(assorbi)) { rapporto.saltate.push({ voce: `${f.tieni} / ${f.assorbi}`, motivo: 'una delle due righe è stata modificata dopo il seed: non si tocca' }); continue; }
      const prima = { tieni: { nome: tieni.nome, personalita: tieni.personalita }, assorbi: { nome: assorbi.nome, personalita: assorbi.personalita } };

      // i luoghi e le voci dell'assorbita passano alla rimasta: nessuna riga si perde
      db.prepare(`INSERT OR IGNORE INTO main.ombra_luogo (ombra_chiave, dungeon_chiave, infiltrazione_chiave, fonte)
        SELECT ?, dungeon_chiave, infiltrazione_chiave, fonte FROM main.ombra_luogo WHERE ombra_chiave = ?`).run(f.tieni, f.assorbi);
      db.prepare('UPDATE main.ombra_voce SET ombra_chiave = ? WHERE ombra_chiave = ?').run(f.tieni, f.assorbi);

      const alt = new Set(nomiAltri(tieni.nomi_altri_json));
      for (const n of [assorbi.nome, ...nomiAltri(assorbi.nomi_altri_json)]) if (n !== tieni.nome) alt.add(n);
      const negoziabile = tieni.negoziabile ?? assorbi.negoziabile;
      const livello = tieni.livello ?? assorbi.livello;
      const corretta = tieni.personalita !== f.personalita || assorbi.personalita !== f.personalita;
      let note = tieni.note;
      if (corretta) note = aggiungiNota(note, `Personalità ${f.personalita} secondo Royal (${f.royal}); la guida italiana aveva ${[tieni.personalita, assorbi.personalita].filter((p) => p !== f.personalita).join('/')} (migrazione 173).`);
      if (assorbi.nome !== tieni.nome) note = aggiungiNota(note, `Stessa Ombra di «${assorbi.nome}» (stessa Persona, stessa personalità): il nome è scritto in due modi.`);
      const seed = seedJson(tieni.seed_json) ?? {};
      const seedNuovo = { ...seed, personalita: f.personalita, nomiAltri: [...alt], negoziabile, livello, note };
      aggiorna.run(tieni.nome, JSON.stringify([...alt]), f.personalita, negoziabile, livello, note, JSON.stringify(seedNuovo), adesso, f.tieni);
      // Le chiavi esterne sono spente durante la migrazione: la cascata non scatta, i luoghi dell'assorbita (già copiati sopra) si tolgono a mano.
      db.prepare('DELETE FROM main.ombra_luogo WHERE ombra_chiave = ?').run(f.assorbi);
      db.prepare('DELETE FROM main.ombra WHERE chiave = ?').run(f.assorbi);
      rapporto.fuse.push({ tieni: f.tieni, assorbita: f.assorbi, personalita: f.personalita, royal: f.royal, prima });
    }

    for (const o of OKUMURA) {
      if (!valida(o.personalita)) continue;
      const m = leggi.get(o.memento) as RigaOmbra | undefined;
      const k = leggi.get(o.okumura) as RigaOmbra | undefined;
      if (m && comeIlSeed(m) && m.persona_id !== null && m.persona_id === k?.persona_id) {
        if (m.personalita !== o.personalita) {
          const note = aggiungiNota(m.note, `Personalità ${o.personalita} secondo Royal (${o.royal}); la guida italiana aveva ${m.personalita} (migrazione 173).`);
          const seedNuovo = { ...(seedJson(m.seed_json) ?? {}), personalita: o.personalita, note };
          aggiorna.run(m.nome, m.nomi_altri_json, o.personalita, m.negoziabile, m.livello, note, JSON.stringify(seedNuovo), adesso, m.chiave);
          rapporto.personalitaCorrette.push({ ombra: m.chiave, prima: m.personalita, dopo: o.personalita, royal: o.royal });
        }
      } else rapporto.saltate.push({ voce: o.memento, motivo: 'riga dei Memento assente, modificata o con Persona diversa' });
      if (k && comeIlSeed(k)) {
        const alt = new Set(nomiAltri(k.nomi_altri_json));
        if (!alt.has(o.nomeInglese)) {
          alt.add(o.nomeInglese);
          const seedNuovo = { ...(seedJson(k.seed_json) ?? {}), nomiAltri: [...alt] };
          aggiorna.run(k.nome, JSON.stringify([...alt]), k.personalita, k.negoziabile, k.livello, k.note, JSON.stringify(seedNuovo), adesso, k.chiave);
          rapporto.nomiInglesi.push({ ombra: k.chiave, nomeInglese: o.nomeInglese });
        }
      } else rapporto.saltate.push({ voce: o.okumura, motivo: 'riga di Okumura assente o modificata' });
    }

    db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run('ombre-correzioni-173', JSON.stringify({
      versione: 1,
      fonti: 'aqiu384 roy-enemy-data.json (personalità del gioco Royal, una per Ombra); Samurai Gamers, Percorso di Kaitul e di Akzeriyyuth (stesso umore nei Memento)',
      ...rapporto,
      nonFuse: 'Le quattro Ombre dei Memento di Adyeshach (Palindromo di turpitudine, Subdolo pentacolo, Elefante ribelle, Spirito divoravita) restano separate da quelle di Okumura (Belphegor, Decarabia, Girimehkala, Kumbhanda): stessa Persona, nome inglese di Royal unico, ma nessuna fonte consultata mostra che sia lo stesso nemico nei due posti.',
      kamoshida: 'La tabella di Kamoshida (14 Ombre) è una voce del pacchetto pubblico assente da questa istanza; le 14 Ombre ci sono già, con la stessa personalità della tabella. Nulla da raccordare.',
    }));
    logger.info({ fuse: rapporto.fuse.length, personalitaCorrette: rapporto.personalitaCorrette.length, nomiInglesi: rapporto.nomiInglesi.length, saltate: rapporto.saltate.length }, 'migrazione 173: personalità delle Ombre secondo Royal');
  },
};
