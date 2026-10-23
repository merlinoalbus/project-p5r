import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { storiaGenericaAttivita135 } from './storiaAttivita135.js';
import { ATTIVITA_TAKEMI_PRIMA_135, ATTIVITA_TAKEMI_DOPO_135, IDENTITA_TAKEMI_93, BENEFICI_TAKEMI_93, BENEFICIO_TAKEMI_RAW_93, FONTI_TAKEMI_135 } from './takemiManifest135.js';

type Riga = Record<string, unknown>;
const AUDIT = 'rettifica-attivita-takemi-135';
const oggetto = (x: unknown): x is Riga => x !== null && typeof x === 'object' && !Array.isArray(x);
const identica = (r: Riga | undefined, firma: Riga): boolean => !!r && Object.keys(r).length === Object.keys(firma).length && Object.entries(firma).every(([c, v]) => r[c] === v);

/** Le fotografie precedenti non si riscrivono. Anche un registro non riconoscibile esclude la bonifica,
 * senza impedire l'append dello schema o l'avvio. Nessun registro delle partite è copiato nell'audit. */
function fotografie(db: AppDatabase): { leggibile: boolean; attivita: boolean; benefici: boolean } {
  const esito = { leggibile: true, attivita: false, benefici: false };
  if (!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type='table' AND name='cestino'").get()) return { ...esito, leggibile: false };
  const colonne = db.prepare("SELECT name FROM pragma_table_info('cestino','main')").all() as Array<{ name: string }>;
  if (!colonne.some(c => c.name === 'registro_json')) return { ...esito, leggibile: false };
  for (const r of db.prepare('SELECT registro_json FROM main.cestino').iterate() as Iterable<{ registro_json: unknown }>) {
    let passi: unknown;
    try { passi = typeof r.registro_json === 'string' ? JSON.parse(r.registro_json) as unknown : null; } catch { passi = null; }
    if (!Array.isArray(passi)) { esito.leggibile = false; continue; }
    const sequenze = new Set<number>();
    for (const p of passi) {
      if (!oggetto(p) || !Number.isSafeInteger(p.seq) || Number(p.seq) < 0 || sequenze.has(Number(p.seq)) || typeof p.tabella !== 'string'
        || (p.op !== 'D' && p.op !== 'I' && p.op !== 'U') || Object.keys(p).some(k => !['seq','tabella','op','prima','dopo'].includes(k))
        || (p.op === 'D' && Object.hasOwn(p, 'dopo')) || (p.op === 'I' && Object.hasOwn(p, 'prima'))) { esito.leggibile = false; continue; }
      sequenze.add(Number(p.seq));
      const t = db.prepare("SELECT sql FROM main.sqlite_master WHERE type='table' AND name=?").get(p.tabella) as { sql: string } | undefined;
      const struttura = db.prepare('SELECT name,pk,type,"notnull" AS obbligatorio FROM pragma_table_info(?, ?)').all(p.tabella, 'main') as Array<{ name: string; pk: number; type: string; obbligatorio: number }>;
      if (!t || !struttura.length) { esito.leggibile = false; continue; }
      const pk = struttura.filter(c => c.pk > 0);
      const identita = pk.length ? pk.map(c => ({ nome: c.name, nullable: c.obbligatorio === 0 && !/\bWITHOUT\s+ROWID\b|\bSTRICT\b/i.test(t.sql) && !(pk.length === 1 && c.type.trim().toUpperCase() === 'INTEGER') })) : [{ nome: 'rowid', nullable: false }];
      for (const lato of p.op === 'D' ? ['prima'] : p.op === 'I' ? ['dopo'] : ['prima','dopo']) {
        const x = p[lato];
        if (!oggetto(x) || identita.some(c => !Object.hasOwn(x, c.nome) || (x[c.nome] === null ? !c.nullable : typeof x[c.nome] !== 'string' && !(typeof x[c.nome] === 'number' && Number.isSafeInteger(x[c.nome]))))) { esito.leggibile = false; continue; }
        if (Object.values(x).some(v => !(v === null || typeof v === 'string' || typeof v === 'number' && Number.isFinite(v)
          || oggetto(v) && Object.keys(v).length === 1 && typeof v.$blob === 'string' && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(v.$blob)))) esito.leggibile = false;
        if (p.tabella === 'attivita' && (x.chiave === ATTIVITA_TAKEMI_PRIMA_135.chiave || x.confidente_chiave === 'takemi')) esito.attivita = true;
        if (p.tabella === 'confidente_dote_incontro' && x.confidente_chiave === 'takemi') esito.benefici = true;
        if (p.tabella === 'confidente' && x.chiave === 'takemi') { esito.attivita = true; esito.benefici = true; }
      }
    }
  }
  return esito;
}

/** A12: collegamento documentale alla fonte canonica e beneficio del solo passaggio8.
 * Nessun giorno d'itinerario, requisito, Dote personale, incontro o progresso viene riscritto. */
export const migration135: Migration = {
  id: 135, name: 'attivita_confidente',
  up(db) {
    db.transaction(() => {
      const colonne = db.prepare("SELECT name FROM pragma_table_info('attivita','main')").all() as Array<{ name: string }>;
      if (!colonne.some(c => c.name === 'confidente_chiave')) db.exec('ALTER TABLE main.attivita ADD COLUMN confidente_chiave TEXT REFERENCES confidente(chiave) ON DELETE RESTRICT');
      db.exec('CREATE INDEX IF NOT EXISTS idx_attivita_confidente ON attivita(confidente_chiave)');
      if (db.prepare('SELECT 1 FROM main.dati_guida WHERE chiave=?').get(AUDIT)) return;
      const copia = fotografie(db);
      const identita = db.prepare('SELECT * FROM main.confidente WHERE chiave=?').get('takemi') as Riga | undefined;
      const identitaValida = identica(identita, IDENTITA_TAKEMI_93);
      const attivita = db.prepare('SELECT * FROM main.attivita WHERE chiave=?').get(ATTIVITA_TAKEMI_PRIMA_135.chiave) as Riga | undefined;
      const storia = storiaGenericaAttivita135(db, ATTIVITA_TAKEMI_PRIMA_135.chiave);
      let esitoAttivita = 'esclusa';
      let motivoAttivita = 'Firma completa, identità, fotografie o storia non conformi: conservata senza modifiche.';
      if (identitaValida && identica(attivita, ATTIVITA_TAKEMI_DOPO_135)) { esitoAttivita = 'gia-corretta'; motivoAttivita = 'Record interamente conforme alla baseline135.'; }
      else if (identitaValida && identica(attivita, ATTIVITA_TAKEMI_PRIMA_135) && copia.leggibile && !copia.attivita && storia.leggibile && !storia.presente) {
        const cambiati = db.prepare('UPDATE main.attivita SET confidente_chiave=?,fascia=NULL,condizioni_json=?,sblocco=NULL,dettagli=? WHERE chiave=?')
          .run('takemi', ATTIVITA_TAKEMI_DOPO_135.condizioni_json, ATTIVITA_TAKEMI_DOPO_135.dettagli, ATTIVITA_TAKEMI_PRIMA_135.chiave).changes;
        if (cambiati !== 1) throw new Error('135: attività non rettificata atomicamente.');
        esitoAttivita = 'rettificata'; motivoAttivita = 'Firma pubblica completa e assenza di storia/fotografie pertinenti; baseline guida corretta senza seed_json errato.';
      } else if (!attivita) { esitoAttivita = 'assente'; motivoAttivita = 'Attività assente: nessuna ricreazione.'; }
      const benefici = db.prepare('SELECT * FROM main.confidente_dote_incontro WHERE confidente_chiave=? ORDER BY verso_rango').all('takemi') as Riga[];
      const r8 = benefici.find(r => r.verso_rango === 8);
      let esitoBeneficio = 'escluso';
      let motivoBeneficio = 'Set completo, identità o fotografie divergenti: nessun beneficio sovrascritto.';
      const setteConformi = BENEFICI_TAKEMI_93.every(f => identica(benefici.find(r => r.verso_rango === f.verso_rango), f));
      if (identitaValida && setteConformi && benefici.length === 8 && identica(r8, { confidente_chiave: 'takemi', verso_rango: 8, effetti_json: BENEFICIO_TAKEMI_RAW_93 })) {
        esitoBeneficio = 'gia-corretto'; motivoBeneficio = 'Passaggio8 già identico alla fonte confermata.';
      } else if (identitaValida && setteConformi && benefici.length === 7 && !r8 && copia.leggibile && !copia.benefici) {
        db.prepare('INSERT INTO main.confidente_dote_incontro(confidente_chiave,verso_rango,effetti_json) VALUES (?,?,?)').run('takemi', 8, BENEFICIO_TAKEMI_RAW_93);
        esitoBeneficio = 'aggiunto'; motivoBeneficio = 'Set pubblico1–7 identico; aggiunta sola metainformazione del passaggio8, senza retrocalcoli.';
      }
      const audit = { versione: 1, fonti: FONTI_TAKEMI_135,
        attivita: { chiave: ATTIVITA_TAKEMI_PRIMA_135.chiave, esito: esitoAttivita, motivo: motivoAttivita,
          precedente: esitoAttivita === 'rettificata' ? ATTIVITA_TAKEMI_PRIMA_135 : null, risultante: esitoAttivita === 'rettificata' ? ATTIVITA_TAKEMI_DOPO_135 : null,
          storiaLeggibile: storia.leggibile, storiaPresente: storia.presente, tabelleStoricheAssenti: storia.tabelleAssenti },
        beneficio: { confidente: 'takemi', rango: 8, esito: esitoBeneficio, motivo: motivoBeneficio, precedente: null, risultante: esitoBeneficio === 'aggiunto' ? BENEFICIO_TAKEMI_RAW_93 : null },
        fotografie: copia, ambito: 'Sola guida canonica; fotografie preesistenti, requisiti e dati di tutte le partite conservati.' };
      if (db.prepare('INSERT INTO main.dati_guida(chiave,json) VALUES (?,?)').run(AUDIT, JSON.stringify(audit)).changes !== 1) throw new Error('135: audit non registrato, rettifica annullata.');
    })();
  },
};
