// ============================================================
// 185 — sedi, sblocchi ed effetti delle attività sulle fonti Royal (L9 R9-10/1, R9-10/2; ricerca Royal del 24/10, §2)
// ============================================================
//
// Per «Royal prevale» e le indicazioni del PM del 24/10 (prove sufficienti soltanto):
//   - Jazz Jin (`jazz-club-kichijoji`): condizione strutturata «Akechi rango 4 e dal 26/6» (oggi solo la frase di sblocco);
//   - lettura in metropolitana: nessuna sede (si legge sul treno nel tragitto del mattino, nessuna stazione né piattaforma): il motivo si scrive nei dettagli;
//   - effetti: studio in biblioteca Conoscenza +1; caffè al Leblanc Fascino +1 dopo il rango 2 di Sojiro («Coffee Basics»); esperimenti clinici di Takemi Coraggio +1;
//     sfida Big Bang Burger: si aggiunge il Fascino alle Doti dichiarate (le tre sfide danno +1, +2, +3 a Coraggio, Conoscenza, Fascino e Perizia);
//   - NON si migrano palestra Protein Lovers (lo sblocco «rango 5 di Ryuji o rango 8 di Ann» non ha prova per Ann), bagno pubblico (fonti discordi sul Fascino)
//     e centro battute (valore a risultato, non fisso): ognuna riceve una nota nei dettagli che dice perché non è strutturata.
// Conservativa: ogni riga si scrive solo se è ancora come l'ha scritta il seed (origine «seed», mai modificata dall'utente, campo ancora vuoto o uguale al
// valore atteso); le Doti scritte in prosa (`doti_json`) non si riscrivono, tranne l'aggiunta del Fascino alla Big Bang Burger. Solo `main`. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

type Dote = 'coraggio' | 'conoscenza' | 'fascino' | 'perizia' | 'gentilezza';
const effettoDote = (dote: Dote, note: number, condizioni: unknown[] = []) => ({ effetto: { famiglia: 'dote', dote, note }, condizioni });

const EFFETTI: ReadonlyArray<{ attivita: string; effetti: unknown[] }> = [
  { attivita: 'studio-biblioteca-scuola', effetti: [effettoDote('conoscenza', 1)] },
  { attivita: 'caffe-leblanc', effetti: [effettoDote('fascino', 1, [{ tipo: 'confidente', confidente: 'sojiro', rango: 2 }])] },
  { attivita: 'esperimenti-clinici-takemi', effetti: [effettoDote('coraggio', 1)] },
];
const NOTE_NON_STRUTTURATE: ReadonlyArray<{ attivita: string; nota: string }> = [
  { attivita: 'allenamento-palestra-protein-lovers', nota: 'Condizione di sblocco non confermata dalle fonti Royal lette: il rango 5 di Ryuji è citato da una sola fonte, il rango 8 di Ann non ha alcuna prova. Resta la frase di sblocco, senza condizione strutturata.' },
  { attivita: 'bagno-pubblico-yongen-jaya', nota: 'Effetti sul Fascino non strutturati: le fonti Royal discordano (+2 con +1 il lunedì e il giovedì; «+2 o +3»; +1 Coraggio con la pioggia).' },
  { attivita: 'centro-battute-yongen-jaya', nota: 'Effetti sulla Perizia non strutturati: il valore dipende dal risultato della sessione (+1 per colpo riuscito), non è un valore fisso.' },
];

export const migration185: Migration = {
  id: 185, name: 'attivita_royal',
  up(db) {
    const rapporto: Record<string, unknown> = {};
    // righe dal seed, mai toccate dall'utente
    const integra = (chiave: string): boolean => !!db.prepare("SELECT 1 FROM main.attivita WHERE chiave = ? AND origine = 'seed' AND seed_json IS NULL").get(chiave);
    // Jazz Jin
    rapporto.jazzJin = integra('jazz-club-kichijoji') ? db.prepare("UPDATE main.attivita SET condizioni_json = ? WHERE chiave = 'jazz-club-kichijoji' AND (condizioni_json IS NULL OR condizioni_json IN ('', '[]'))")
      .run(JSON.stringify([{ tipo: 'confidente', confidente: 'akechi', rango: 4 }, { tipo: 'data', dal: '06-26' }])).changes : 0;
    // lettura in metropolitana: nessuna sede, il motivo nei dettagli
    const MOTIVO = 'Sede: nessuna. Si legge sul treno nel tragitto del mattino, a sedere: le fonti Royal non nominano una stazione né una piattaforma.';
    rapporto.letturaSede = integra('lettura-metropolitana') ? db.prepare("UPDATE main.attivita SET dettagli = CASE WHEN dettagli IS NULL OR dettagli = '' THEN ? ELSE dettagli || char(10) || char(10) || ? END WHERE chiave = 'lettura-metropolitana' AND sede_chiave IS NULL AND instr(COALESCE(dettagli, ''), 'Sede: nessuna.') = 0")
      .run(MOTIVO, MOTIVO).changes : 0;
    // effetti strutturati
    rapporto.effetti = EFFETTI.map((e) => (integra(e.attivita)
      ? db.prepare("UPDATE main.attivita SET effetti_json = ? WHERE chiave = ? AND (effetti_json IS NULL OR effetti_json IN ('', '[]'))").run(JSON.stringify(e.effetti), e.attivita).changes : 0));
    // Big Bang Burger: il Fascino accanto a Coraggio, Conoscenza e Perizia
    const bbb = db.prepare("SELECT doti_json FROM main.attivita WHERE chiave = 'sfida-big-bang-burger'").get() as { doti_json: string } | undefined;
    let fascino = 0;
    if (bbb && integra('sfida-big-bang-burger')) {
      try {
        const doti = JSON.parse(bbb.doti_json) as Array<{ dote: string; note: number | null; condizione: string }>;
        if (Array.isArray(doti) && !doti.some((d) => d.dote === 'fascino')) {
          doti.push({ dote: 'fascino', note: null, condizione: 'Stesso schema del Coraggio, vedi sopra (+1, +2, +3 se la sfida riesce)' });
          fascino = db.prepare("UPDATE main.attivita SET doti_json = ? WHERE chiave = 'sfida-big-bang-burger' AND doti_json = ?").run(JSON.stringify(doti), bbb.doti_json).changes;
        }
      } catch { /* doti illeggibili: non si tocca */ }
    }
    rapporto.bigBangBurgerFascino = fascino;
    // le tre non migrate: la nota sul perché
    rapporto.note = NOTE_NON_STRUTTURATE.map((n) => (integra(n.attivita)
      ? db.prepare("UPDATE main.attivita SET dettagli = CASE WHEN dettagli IS NULL OR dettagli = '' THEN ? ELSE dettagli || char(10) || char(10) || ? END WHERE chiave = ? AND instr(COALESCE(dettagli, ''), ?) = 0")
        .run(n.nota, n.nota, n.attivita, n.nota.slice(0, 40)).changes : 0));
    db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run('audit-185-attivita-royal', JSON.stringify({ data: '2026-10-24', ...rapporto }));
    logger.info(rapporto, '[migration185] attività sulle fonti Royal');
  },
};
