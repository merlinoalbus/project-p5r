// ============================================================
// 072 — negozi e attività hanno una sede: un luogo della città, non una frase
// ============================================================
//
// Un negozio diceva dove sta con `luogo` («Shibuya, Central Street») e `luogo_chiave` (il
// quartiere); il legame con la riga di `luogo` esisteva solo al contrario (`luogo.negozio`, per
// trentanove luoghi, due dei quali verso un negozio «distributori-automatici» inesistente), e le
// attività non ne avevano nessuno. Qui nascono `negozio.sede_chiave` e `attivita.sede_chiave`
// (riferimento a `luogo`): i negozi prendono l'inverso di `luogo.negozio` e, per il resto, un
// dizionario letto riga per riga; le attività un dizionario (dove si svolgono: i videogiochi al
// Leblanc, lo studio in biblioteca alla Shujin, che prima stava erroneamente su Shibuya). I posti
// che mancavano in `luogo` — Taisho Store, il venditore ambulante, il negozio scolastico, il
// gachapon di Akihabara, il mercante Sakai, due distributori — vengono creati come righe della
// guida. Tre negozi restano senza sede perché non ce l'hanno (Tanaka online, la TV, il negozio
// dentro il Palazzo di Niijima), e una attività (la lettura in metropolitana). Invariante:
// quando la sede c'è, `luogo_chiave` è il quartiere della sede.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { aggiungiColonna } from '../colonne.js';

interface NuovoLuogo { chiave: string; quartiere: string; tipo: string; nome: string; cosaOffre: string; quando: 'giorno' | 'sera' | 'entrambe' | null; negozio: string | null }

/** I posti che la guida nomina ma che `luogo` non aveva. */
export const LUOGHI_NUOVI: readonly NuovoLuogo[] = [
  // `cosaOffre` resta vuoto: la scheda del luogo mostra il negozio collegato, e una frase inventata qui non sarebbe un dato
  { chiave: 'shibuya/taisho-store', quartiere: 'shibuya', tipo: 'negozio', nome: 'Taisho Store', cosaOffre: '', quando: null, negozio: 'taisho-store' },
  { chiave: 'shibuya/venditore-ambulante', quartiere: 'shibuya', tipo: 'negozio', nome: 'Venditore ambulante', cosaOffre: '', quando: null, negozio: 'venditore-ambulante' },
  { chiave: 'shibuya/distributore-sottopasso', quartiere: 'shibuya', tipo: 'distributore', nome: 'Distributore del sottopasso', cosaOffre: '', quando: null, negozio: null },
  { chiave: 'shujin-academy/negozio-scolastico', quartiere: 'shujin-academy', tipo: 'negozio', nome: 'Negozio scolastico', cosaOffre: '', quando: null, negozio: 'negozio-scolastico' },
  { chiave: 'akihabara/gachapon-akihabara', quartiere: 'akihabara', tipo: 'negozio', nome: 'Gachapon di Akihabara', cosaOffre: '', quando: null, negozio: 'gachapon-akihabara' },
  { chiave: 'kichijoji/mercante-sakai', quartiere: 'kichijoji', tipo: 'negozio', nome: 'Mercante Sakai', cosaOffre: '', quando: null, negozio: 'mercante-sakai' },
  { chiave: 'yongen-jaya/distributore-bagno-pubblico', quartiere: 'yongen-jaya', tipo: 'distributore', nome: 'Distributore del bagno pubblico', cosaOffre: '', quando: null, negozio: null },
];

/** Le sedi dei negozi che `luogo.negozio` non dava; `null` = il negozio non ha una sede in città. */
export const SEDI_NEGOZI: Readonly<Record<string, string | null>> = {
  'taisho-store': 'shibuya/taisho-store',
  'venditore-ambulante': 'shibuya/venditore-ambulante',
  'negozio-scolastico': 'shujin-academy/negozio-scolastico',
  'gachapon-akihabara': 'akihabara/gachapon-akihabara',
  'tempio-kichijoji': 'kichijoji/vecchio-tempio-kichijoji',
  'mercante-sakai': 'kichijoji/mercante-sakai',
  'distributore-shujin-edificio': 'shujin-academy/distributori-shujin',
  'distributore-shujin-cortile': 'shujin-academy/distributori-shujin',
  'distributore-shujin-cancello-1': 'shujin-academy/distributori-shujin',
  'distributore-shujin-cancello-2': 'shujin-academy/distributori-shujin',
  'distributore-shibuya-sottopasso': 'shibuya/distributore-sottopasso',
  'distributore-shibuya-sala-giochi': 'shibuya/sala-giochi-shibuya',
  'distributore-yongen-bagno': 'yongen-jaya/distributore-bagno-pubblico',
  'distributore-yongen-tabaccaio': 'yongen-jaya/distributore-tabaccaio',
  'distributore-akihabara-1': 'akihabara/distributori-akihabara',
  'distributore-akihabara-2': 'akihabara/distributori-akihabara',
  'distributore-akihabara-3': 'akihabara/distributori-akihabara',
  'distributore-akihabara-4': 'akihabara/distributori-akihabara',
  'distributore-akihabara-5': 'akihabara/distributori-akihabara',
  'distributore-akihabara-6': 'akihabara/distributori-akihabara',
  'negozio-palazzo-niijima': null,
  'tanaka-affari-loschi': null,
  'home-shopping-tv': null,
};

/** Dove si svolge ogni attività della guida; `null` = non in un posto della città. */
export const SEDI_ATTIVITA: Readonly<Record<string, string | null>> = {
  'freccette': 'kichijoji/penguin-sniper',
  'biliardo': 'kichijoji/penguin-sniper',
  'pesca-ichigaya': 'ichigaya/laghetto-ichigaya',
  'sfida-pesca-guardiano-ichigaya': 'ichigaya/laghetto-ichigaya',
  'jazz-club-kichijoji': 'kichijoji/jazz-jin',
  'bagno-pubblico-yongen-jaya': 'yongen-jaya/bagno-pubblico',
  'centro-battute-yongen-jaya': 'yongen-jaya/batting-cage-yongen',
  'sala-giochi-gun-about-akihabara': 'akihabara/sala-giochi-akihabara',
  'allenamento-camera-leblanc': 'yongen-jaya/leblanc',
  'allenamento-palestra-protein-lovers': 'shibuya/protein-lovers',
  'studio-leblanc': 'yongen-jaya/leblanc',
  'studio-biblioteca-scuola': 'shujin-academy/biblioteca-shujin',
  'studio-diner-shibuya': 'shibuya/diner',
  'lettura-metropolitana': null,
  'caffe-leblanc': 'yongen-jaya/leblanc',
  'curry-leblanc': 'yongen-jaya/leblanc',
  'tempio-vecchio-kichijoji': 'kichijoji/vecchio-tempio-kichijoji',
  'sfida-big-bang-burger': 'shibuya/big-bang-burger',
  'esperimenti-clinici-takemi': 'yongen-jaya/clinica-takemi',
  'videogioco-star-forneus': 'yongen-jaya/leblanc',
  'videogioco-gambla-goemon': 'yongen-jaya/leblanc',
  'videogioco-punch-ouch': 'yongen-jaya/leblanc',
  'videogioco-train-of-life': 'yongen-jaya/leblanc',
  'videogioco-power-intuition': 'yongen-jaya/leblanc',
  'videogioco-golfer-sarutahiko': 'yongen-jaya/leblanc',
  'videogioco-featherman-seeker': 'yongen-jaya/leblanc',
  'lavoro-triple-seven': 'shibuya/triple-seven',
  'lavoro-rafflesia': 'shibuya/rafflesia',
  'lavoro-ore-no-beko': 'shibuya/ore-no-beko',
  'lavoro-crossroads': 'shinjuku/crossroads',
};

export const migration072: Migration = {
  id: 72,
  name: 'sedi_negozi_attivita',
  up(db) {
    aggiungiColonna(db, 'negozio', 'sede_chiave', 'TEXT REFERENCES luogo(chiave) ON DELETE SET NULL');
    aggiungiColonna(db, 'attivita', 'sede_chiave', 'TEXT REFERENCES luogo(chiave) ON DELETE SET NULL');

    // i posti che mancavano
    const adesso = new Date().toISOString();
    const colonne = (db.prepare('PRAGMA table_info(luogo)').all() as Array<{ name: string }>).map((c) => c.name);
    const quartieri = new Set((db.prepare('SELECT chiave FROM quartiere').all() as Array<{ chiave: string }>).map((r) => r.chiave));
    const esisteLuogo = db.prepare('SELECT 1 FROM luogo WHERE chiave = ?');
    const ordineMassimo = db.prepare('SELECT COALESCE(MAX(ordine), 0) AS n FROM luogo WHERE quartiere_chiave = ?');
    const inserisci = db.prepare(`INSERT INTO luogo (chiave, quartiere_chiave, ordine, tipo, nome, cosa_offre, quando, giorni, sblocco, confidenti_json, attivita_json, negozio, piatti_json, note, fonte, verificato${colonne.includes('origine') ? ', origine, seed_json, updated_at, condizioni_json' : ''})
      VALUES (@chiave, @quartiere, @ordine, @tipo, @nome, @cosaOffre, @quando, NULL, NULL, '[]', '[]', @negozio, NULL, NULL, '', 0${colonne.includes('origine') ? ", 'seed', @seed, @adesso, '[]'" : ''})`);
    let creati = 0;
    for (const l of LUOGHI_NUOVI) {
      if (!quartieri.has(l.quartiere) || esisteLuogo.get(l.chiave)) continue;
      const ordine = (ordineMassimo.get(l.quartiere) as { n: number }).n + 1;
      const riga = { chiave: l.chiave, quartiere: l.quartiere, ordine, tipo: l.tipo, nome: l.nome, cosaOffre: l.cosaOffre, quando: l.quando, negozio: l.negozio, adesso, seed: '' };
      riga.seed = JSON.stringify({ chiave: l.chiave, quartiere_chiave: l.quartiere, ordine, tipo: l.tipo, nome: l.nome, cosa_offre: l.cosaOffre, quando: l.quando, giorni: null, sblocco: null, confidenti_json: '[]', attivita_json: '[]', negozio: l.negozio, piatti_json: null, note: null, fonte: '', verificato: 0, condizioni_json: '[]' });
      inserisci.run(riga);
      creati++;
    }
    // «distributori-automatici» non è un negozio: quei due luoghi restano, senza il rimando
    db.prepare("UPDATE luogo SET negozio = NULL WHERE negozio = 'distributori-automatici'").run();

    // sedi dei negozi: l'inverso di luogo.negozio, poi il dizionario
    const scriviNegozio = db.prepare('UPDATE negozio SET sede_chiave = ? WHERE chiave = ? AND sede_chiave IS NULL');
    const negozi = db.prepare('SELECT chiave FROM negozio').all() as Array<{ chiave: string }>;
    const inverso = new Map<string, string>();
    for (const r of db.prepare('SELECT chiave, negozio FROM luogo WHERE negozio IS NOT NULL ORDER BY ordine').all() as Array<{ chiave: string; negozio: string }>) if (!inverso.has(r.negozio)) inverso.set(r.negozio, r.chiave);
    const mancanti: string[] = [];
    let negoziConSede = 0;
    for (const n of negozi) {
      const sede = inverso.get(n.chiave) ?? SEDI_NEGOZI[n.chiave] ?? null;
      if (!sede) continue;
      if (!esisteLuogo.get(sede)) { mancanti.push(`negozio ${n.chiave} → ${sede}`); continue; }
      negoziConSede += scriviNegozio.run(sede, n.chiave).changes;
    }
    // sedi delle attività
    const scriviAttivita = db.prepare('UPDATE attivita SET sede_chiave = ? WHERE chiave = ? AND sede_chiave IS NULL');
    let attivitaConSede = 0;
    for (const [chiave, sede] of Object.entries(SEDI_ATTIVITA)) {
      if (!sede) continue;
      if (!esisteLuogo.get(sede)) { mancanti.push(`attività ${chiave} → ${sede}`); continue; }
      attivitaConSede += scriviAttivita.run(sede, chiave).changes;
    }
    // invariante: il quartiere è quello della sede
    db.exec(`UPDATE negozio SET luogo_chiave = (SELECT quartiere_chiave FROM luogo WHERE luogo.chiave = negozio.sede_chiave) WHERE sede_chiave IS NOT NULL;
      UPDATE attivita SET luogo_chiave = (SELECT quartiere_chiave FROM luogo WHERE luogo.chiave = attivita.sede_chiave) WHERE sede_chiave IS NOT NULL;`);

    logger.info({ luoghiCreati: creati, negoziConSede, attivitaConSede, mancanti: mancanti.length }, 'migrazione 072: sedi di negozi e attività');
    if (mancanti.length) logger.warn({ mancanti }, 'migrazione 072: sedi verso luoghi inesistenti, lasciate vuote');
  },
};
