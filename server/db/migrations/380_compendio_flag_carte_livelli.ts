// ============================================================
// Migrazione 380 — Confidente al massimo, carte di Apsaras e livelli delle Persona del gruppo (L11, «Compendio e fusioni»)
// ============================================================
//
// Correzioni al compendio dal confronto con la guida italiana:
//   - «Richiede Confidente al massimo»: Chi You (Carro) e Metatron (Giustizia) non avevano il segno, le altre 21 Persona di questo genere sì
//     (una per Arcano); la guida «Come ottenere tutte le Personae» lo dice di entrambe. Da 21 a 23.
//   - Apsaras: la tabella «Carte abilità» (colonne «Esecuzione Sedia Elettrica» e «… allarme fusione») dà Diarama sulla Sedia normale e Media con
//     l'allarme; il dato era invertito. Si scambiano `oggetto` e `oggetto_allarme` (`oggetto_e_carta` resta 1) e si allinea
//     `skill_fonte_esecuzione`, che contiene esattamente le coppie «skill = oggetto_allarme della Persona»: via Diarama←Apsaras, dentro
//     Media←Apsaras. Le coppie restano 114 e la regola resta vera.
//   - Livelli delle Persona del gruppo: Zorro è al 1 e Necronomicon al 31 (la guida lo dice nelle due tabelle). Le forme successive ripetono il
//     livello della prima (migrazione 170; per la guida «Eredita»), quindi la correzione vale per tutta la catena `forma_di`. Le statistiche non
//     cambiano: nessuna fonte ne dà altre. Sandman non si tocca: la guida dà 24 e 23.
//
// Due rilievi dell'analisi sono risultati falsi e NON si applicano; l'audit ne conserva il motivo (`rilieviNonApplicati`): il nome italiano di
// Sharp Student e le carte di Rangda.
//
// COSA (conservativa, idempotente): un dato si scrive solo se è ancora il valore atteso e della guida (`origine = 'seed'`, `seed_json IS NULL`).
// Una catena del gruppo si corregge solo se la sua prima forma è ancora della guida; le carte di Apsaras e la coppia si scrivono insieme o per
// niente. Il resto di `persona` e `skill_fonte_esecuzione`, le altre tabelle del compendio e tutte quelle delle partite restano identici (impronte
// prima e dopo). Il prima e il dopo di ogni dato nell'audit `dati_guida.audit-380-compendio-flag-carte-livelli`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { conta, esisteTabella, improntaTabella } from './pulizieL11.js';
import { diverseFuori, improntaPartite, righePerChiave } from './decisioniDati0111.js';
import { dellaGuida, scriviAuditCompendio, type EsitoDato, type RigaCorreggibile } from './auditCompendioL11.js';

const AUDIT = 'audit-380-compendio-flag-carte-livelli';
const DECISIONI = 'confronto del compendio con la guida italiana (L11-04): pagine «Come ottenere tutte le Personae» e «Carte abilità»';
const errore = (motivo: string): never => { throw new Error(`380: ${motivo}; nessuna modifica applicata.`); };

/** Le Persona che richiedono il Confidente al massimo e non avevano il segno. */
const SEGNI: ReadonlyArray<{ id: number; nome: string; perche: string }> = [
  { id: 45, nome: 'Chi You', perche: 'guida: «Richiede Rango Confidente Carro al massimo»' },
  { id: 131, nome: 'Metatron', perche: 'guida: «Richiede Rango Confidente Giustizia al massimo»' },
];

/** Le carte di Apsaras e la coppia di `skill_fonte_esecuzione` che le segue. */
const APSARAS = {
  id: 11, nome: 'Apsaras', normale: { prima: 'Media', dopo: 'Diarama' }, allarme: { prima: 'Diarama', dopo: 'Media' },
  fonteTolta: { id: 98, nome: 'Diarama' }, fonteMessa: { id: 304, nome: 'Media' },
  perche: 'guida «Carte abilità»: Diarama sulla Sedia Elettrica normale, Media con l\'allarme fusione',
} as const;

/** La prima forma delle catene del gruppo da correggere: la correzione vale anche per ogni forma con `forma_di` su questo id. */
const CATENE: ReadonlyArray<{ id: number; nome: string; prima: number; dopo: number; perche: string }> = [
  { id: 239, nome: 'Zorro', prima: 2, dopo: 1, perche: 'guida: Zorro al livello 1; le forme successive ripetono il livello della prima' },
  { id: 248, nome: 'Necronomicon', prima: 30, dopo: 31, perche: 'guida: Necronomicon al livello 31; le forme successive ripetono il livello della prima' },
];

/** Le tabelle del compendio che questa migrazione non deve cambiare. */
const INTATTE = ['skill', 'persona_skill', 'persona_affinita', 'traduzione', 'tesoro_modificatore', 'fusione_speciale', 'fusione_speciale_ingrediente', 'oggetto'] as const;

/** Le coppie che smentiscono «`skill_fonte_esecuzione` = skill che è l'`oggetto_allarme` della Persona», nei due versi. */
function fuoriDallaRegola(db: AppDatabase): number {
  return conta(db, `SELECT COUNT(*) FROM main.skill_fonte_esecuzione f JOIN main.persona p ON p.id = f.persona_id JOIN main.skill s ON s.id = f.skill_id WHERE p.oggetto_allarme IS NOT s.nome`)
    + conta(db, `SELECT COUNT(*) FROM main.persona p JOIN main.skill s ON s.nome = p.oggetto_allarme
      WHERE NOT EXISTS (SELECT 1 FROM main.skill_fonte_esecuzione f WHERE f.persona_id = p.id AND f.skill_id = s.id)`);
}

/** I due rilievi falsi, con i valori che restano: non si applicano e l'audit ne conserva il motivo. */
function rilieviNonApplicati(db: AppDatabase): unknown[] {
  const resa = (chiave: string) => db.prepare("SELECT testo FROM main.traduzione WHERE ambito = 'skill' AND chiave = ?").pluck().get(chiave) ?? null;
  const rangda = db.prepare("SELECT oggetto, oggetto_allarme FROM main.persona WHERE nome = 'Rangda'").get() ?? null;
  const fonteEigaon = conta(db, "SELECT COUNT(*) FROM main.skill_fonte_esecuzione f JOIN main.skill s ON s.id = f.skill_id JOIN main.persona p ON p.id = f.persona_id WHERE s.nome = 'Eigaon' AND p.nome = 'Rangda'");
  return [
    { rilievo: 'rinominare Sharp Student, reso «Studente in gamba»', esito: 'non applicato',
      motivo: 'la guida «Elenco delle abilità» chiama «Studente in gamba» l\'abilità che riduce i critici subiti, cioè l\'effetto di Sharp Student, e «Discepolo sagace» quella che aumenta i critici, cioè Apt Pupil: sono due abilità, entrambe già rese bene',
      resta: { 'Sharp Student': resa('Sharp Student'), 'Apt Pupil': resa('Apt Pupil') } },
    { rilievo: 'carte di Rangda: Eigaon sulla Sedia normale', esito: 'non applicato',
      motivo: 'la guida «Carte abilità» mette Rangda nella colonna normale sia per Eigaon sia per Maeiga, ma una Persona ha un solo esito normale: la fonte si contraddice e non corregge il dato, che resta con Maeiga normale, Eigaon con l\'allarme e la coppia Eigaon←Rangda',
      resta: { rangda, coppieEigaonRangda: fonteEigaon } },
  ];
}

export const migration380: Migration = {
  id: 380,
  name: 'compendio_flag_carte_livelli',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'persona') || !esisteTabella(db, 'skill_fonte_esecuzione')) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');

    const personePrima = righePerChiave(db, 'persona', ['id']);
    const fontiPrima = righePerChiave(db, 'skill_fonte_esecuzione', ['skill_id', 'persona_id']);
    const intattePrima = new Map(INTATTE.filter((t) => esisteTabella(db, t)).map((t) => [t, improntaTabella(db, t)] as const));
    const partitePrima = improntaPartite(db);
    const regolaPrima = fuoriDallaRegola(db);

    const esiti: EsitoDato[] = [];
    const personeToccate = new Set<string>(), fontiToccate = new Set<string>();

    // (1) il segno «richiede il Confidente al massimo»
    for (const s of SEGNI) {
      const chiave = `persona:${s.id}:richiede_confidente_max`;
      const r = db.prepare('SELECT nome, richiede_confidente_max AS valore, origine, seed_json FROM main.persona WHERE id = ?').get(s.id) as
        (RigaCorreggibile & { nome: string; valore: number }) | undefined;
      if (!r || r.nome !== s.nome) { esiti.push({ chiave, esito: 'Persona assente o diversa da quella attesa: non toccata' }); continue; }
      if (r.valore === 1) { esiti.push({ chiave, esito: 'già corretto' }); continue; }
      if (r.valore !== 0 || !dellaGuida(r)) { esiti.push({ chiave, esito: 'valore diverso da quello atteso o corretto dall\'utente: non toccato' }); continue; }
      if (db.prepare('UPDATE main.persona SET richiede_confidente_max = 1 WHERE id = ? AND richiede_confidente_max = 0').run(s.id).changes !== 1) errore(`il segno di ${s.nome} non si aggiorna`);
      personeToccate.add(String(s.id));
      esiti.push({ chiave, esito: 'corretto', prima: 0, dopo: 1, perche: s.perche });
    }

    // (2) le carte di Apsaras e la coppia che le segue: insieme o per niente
    {
      const a = APSARAS, chiave = `persona:${a.id}:carte`;
      const r = db.prepare('SELECT nome, oggetto, oggetto_allarme, oggetto_e_carta, origine, seed_json FROM main.persona WHERE id = ?').get(a.id) as
        (RigaCorreggibile & { nome: string; oggetto: string | null; oggetto_allarme: string | null; oggetto_e_carta: number }) | undefined;
      const coppia = (skill: number) => !!db.prepare('SELECT 1 FROM main.skill_fonte_esecuzione WHERE skill_id = ? AND persona_id = ?').get(skill, a.id);
      const skillDellaGuida = (s: { id: number; nome: string }) => {
        const x = db.prepare('SELECT nome, origine, seed_json FROM main.skill WHERE id = ?').get(s.id) as (RigaCorreggibile & { nome: string }) | undefined;
        return !!x && x.nome === s.nome && dellaGuida(x);
      };
      const haTolta = coppia(a.fonteTolta.id), haMessa = coppia(a.fonteMessa.id);
      const cartePrima = r?.oggetto === a.normale.prima && r?.oggetto_allarme === a.allarme.prima;
      const carteDopo = r?.oggetto === a.normale.dopo && r?.oggetto_allarme === a.allarme.dopo;
      if (!r || r.nome !== a.nome) esiti.push({ chiave, esito: 'Persona assente o diversa da quella attesa: non toccata' });
      else if (carteDopo && !haTolta && haMessa) esiti.push({ chiave, esito: 'già corrette' });
      else if (!cartePrima || r.oggetto_e_carta !== 1 || !dellaGuida(r)) esiti.push({ chiave, esito: 'carte diverse da quelle attese o corrette dall\'utente: non toccate' });
      else if (!haTolta || haMessa || !skillDellaGuida(a.fonteTolta) || !skillDellaGuida(a.fonteMessa)) esiti.push({ chiave, esito: 'fonti dell\'esecuzione diverse da quelle attese o corrette dall\'utente: carte non toccate' });
      else {
        if (db.prepare('UPDATE main.persona SET oggetto = ?, oggetto_allarme = ? WHERE id = ? AND oggetto = ? AND oggetto_allarme = ?').run(a.normale.dopo, a.allarme.dopo, a.id, a.normale.prima, a.allarme.prima).changes !== 1) errore('le carte di Apsaras non si aggiornano');
        if (db.prepare('DELETE FROM main.skill_fonte_esecuzione WHERE skill_id = ? AND persona_id = ?').run(a.fonteTolta.id, a.id).changes !== 1) errore('la coppia Diarama←Apsaras non si toglie');
        db.prepare('INSERT INTO main.skill_fonte_esecuzione (skill_id, persona_id) VALUES (?, ?)').run(a.fonteMessa.id, a.id);
        personeToccate.add(String(a.id));
        fontiToccate.add(`${a.fonteTolta.id}|${a.id}`); fontiToccate.add(`${a.fonteMessa.id}|${a.id}`);
        esiti.push({ chiave, esito: 'corrette',
          prima: { oggetto: a.normale.prima, oggetto_allarme: a.allarme.prima, fonteEsecuzione: a.fonteTolta.nome },
          dopo: { oggetto: a.normale.dopo, oggetto_allarme: a.allarme.dopo, fonteEsecuzione: a.fonteMessa.nome }, perche: a.perche });
      }
    }

    // (3) i livelli delle catene del gruppo: tutta la catena segue la prima forma
    for (const c of CATENE) {
      const prima = db.prepare('SELECT nome, livello, origine, seed_json FROM main.persona WHERE id = ?').get(c.id) as
        (RigaCorreggibile & { nome: string; livello: number }) | undefined;
      if (!prima || prima.nome !== c.nome) { esiti.push({ chiave: `persona:${c.id}:livello`, esito: 'Persona assente o diversa da quella attesa: catena non toccata' }); continue; }
      if (!dellaGuida(prima) || (prima.livello !== c.prima && prima.livello !== c.dopo)) { esiti.push({ chiave: `persona:${c.id}:livello`, esito: 'prima forma diversa da quella attesa o corretta dall\'utente: catena non toccata' }); continue; }
      const forme = db.prepare('SELECT id, nome, livello, origine, seed_json FROM main.persona WHERE forma_di = ? ORDER BY forma, id').all(c.id) as
        Array<RigaCorreggibile & { id: number; nome: string; livello: number }>;
      for (const f of [{ ...prima, id: c.id }, ...forme]) {
        const chiave = `persona:${f.id}:livello`;
        if (f.livello === c.dopo) { esiti.push({ chiave, esito: 'già corretto' }); continue; }
        if (f.livello !== c.prima || !dellaGuida(f)) { esiti.push({ chiave, esito: 'livello diverso da quello atteso o corretto dall\'utente: non toccato' }); continue; }
        if (db.prepare('UPDATE main.persona SET livello = ? WHERE id = ? AND livello = ?').run(c.dopo, f.id, c.prima).changes !== 1) errore(`il livello di ${f.nome} non si aggiorna`);
        personeToccate.add(String(f.id));
        esiti.push({ chiave, esito: 'corretto', prima: { nome: f.nome, livello: c.prima }, dopo: { nome: f.nome, livello: c.dopo }, perche: c.perche });
      }
    }

    // le verifiche: solo le righe dell'elenco sono cambiate
    const fuori = [
      ...diverseFuori(personePrima, righePerChiave(db, 'persona', ['id']), personeToccate).map((k) => `persona ${k}`),
      ...diverseFuori(fontiPrima, righePerChiave(db, 'skill_fonte_esecuzione', ['skill_id', 'persona_id']), fontiToccate).map((k) => `skill_fonte_esecuzione ${k}`),
    ];
    if (fuori.length) errore(`righe cambiate fuori dall'elenco: ${fuori.slice(0, 5).join(', ')}`);
    for (const [t, h] of intattePrima) if (improntaTabella(db, t) !== h) errore(`la tabella ${t} è cambiata`);
    if (improntaPartite(db) !== partitePrima) errore('le tabelle delle partite sono cambiate');
    const regolaDopo = fuoriDallaRegola(db);
    if (regolaDopo > regolaPrima) errore(`skill_fonte_esecuzione non segue più oggetto_allarme: ${regolaPrima} coppie fuori dalla regola prima, ${regolaDopo} dopo`);

    scriviAuditCompendio(db, AUDIT, 380, DECISIONI, {
      esiti, rilieviNonApplicati: rilieviNonApplicati(db),
      fontiEsecuzione: { coppie: conta(db, 'SELECT COUNT(*) FROM main.skill_fonte_esecuzione'), fuoriDallaRegola: regolaDopo },
      personeConSegno: conta(db, 'SELECT COUNT(*) FROM main.persona WHERE richiede_confidente_max = 1'),
    }, personeToccate.size + fontiToccate.size > 0);
    logger.info({ migrazione: 380, esiti: esiti.map((e) => `${e.chiave}: ${e.esito}`) }, 'compendio: Confidente al massimo, carte di Apsaras, livelli del gruppo');
  },
};
