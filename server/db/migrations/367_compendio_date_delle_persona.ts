// ============================================================
// Migrazione 367 — le date da cui si ottengono quattro Persona (L11, «Compendio e fusioni»)
// ============================================================
//
// La guida «Come ottenere tutte le Personae» dice da quale giorno si possono fondere Metatron, Yoshitsune, Satan e Vohu Manah; la scheda non lo
// diceva. `persona.nota` è un codice, reso in italiano dalla tabella `traduzione` (ambito `notaPersona`): le quattro Persona ricevono un codice
// nello stesso formato di quelli che ci sono (mese/giorno, «Only available after 1/12») e la sua resa. Chimera e Alilat tengono la nota che hanno.
//
// Le 20 celle di `tesoro_modificatore` segnalate dall'analisi NON si toccano finché non sono verificate in gioco: nessuna riga cambia, e l'audit lo
// conserva con l'impronta delle 216 righe prima e dopo.
//
// COSA (conservativa, idempotente): la nota si scrive solo se è ancora vuota e la Persona è della guida (`origine = 'seed'`, `seed_json IS NULL`);
// la resa si aggiunge solo se manca, e non si sovrascrive mai. Il resto di `persona` e di `traduzione`, le altre tabelle del compendio e tutte quelle
// delle partite restano identici (impronte prima e dopo). Il prima e il dopo di ogni dato nell'audit `dati_guida.audit-367-compendio-date-persona`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';
import { diverseFuori, improntaPartite, righePerChiave } from './decisioniDati0111.js';
import { dellaGuida, scriviAuditCompendio, type EsitoDato, type RigaCorreggibile } from './auditCompendioL11.js';

const AUDIT = 'audit-367-compendio-date-persona';
const DECISIONI = 'risposta dell\'utente alla domanda sulle date delle Persona (L11-05): codice in persona.nota e resa in traduzione, tesoro_modificatore fermo';
const AMBITO = 'notaPersona';
const errore = (motivo: string): never => { throw new Error(`367: ${motivo}; nessuna modifica applicata.`); };

/** Le Persona con la data scritta dalla guida: il codice in `persona.nota` e la sua resa italiana. */
const DATE: ReadonlyArray<{ id: number; nome: string; nota: string; resa: string; perche: string }> = [
  { id: 131, nome: 'Metatron', nota: 'Only available from 11/25', resa: 'Disponibile solo dal 25/11', perche: 'guida: realizzabile a partire dal 25 novembre' },
  { id: 229, nome: 'Yoshitsune', nota: 'Only available from 12/23', resa: 'Disponibile solo dal 23/12', perche: 'guida: realizzabile solo a partire dal 23 dicembre' },
  { id: 187, nome: 'Satan', nota: 'Only available from 11/20', resa: 'Disponibile solo dal 20/11', perche: 'guida: realizzabile solo a partire dal 20 novembre' },
  { id: 224, nome: 'Vohu Manah', nota: 'Only available from 11/18', resa: 'Disponibile solo dal 18/11', perche: 'guida: realizzabile solo a partire dal 18 novembre' },
];

/** Le tabelle del compendio che questa migrazione non deve cambiare. */
const INTATTE = ['skill', 'persona_skill', 'persona_affinita', 'skill_fonte_esecuzione'] as const;

export const migration367: Migration = {
  id: 367,
  name: 'compendio_date_delle_persona',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'persona') || !esisteTabella(db, 'traduzione')) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');

    const personePrima = righePerChiave(db, 'persona', ['id']);
    const traduzioniPrima = righePerChiave(db, 'traduzione', ['ambito', 'chiave']);
    const intattePrima = new Map(INTATTE.filter((t) => esisteTabella(db, t)).map((t) => [t, improntaTabella(db, t)] as const));
    const tesoroPrima = esisteTabella(db, 'tesoro_modificatore') ? improntaTabella(db, 'tesoro_modificatore') : null;
    const partitePrima = improntaPartite(db);

    const esiti: EsitoDato[] = [];
    const personeToccate = new Set<string>(), traduzioniToccate = new Set<string>();

    for (const d of DATE) {
      const chiave = `persona:${d.id}:nota`;
      const r = db.prepare('SELECT nome, nota, origine, seed_json FROM main.persona WHERE id = ?').get(d.id) as (RigaCorreggibile & { nome: string; nota: string | null }) | undefined;
      if (!r || r.nome !== d.nome) { esiti.push({ chiave, esito: 'Persona assente o diversa da quella attesa: non toccata' }); continue; }
      if (r.nota !== null && r.nota !== d.nota) { esiti.push({ chiave, esito: 'ha già un\'altra nota: non toccata', prima: r.nota }); continue; }
      if (r.nota === null && !dellaGuida(r)) { esiti.push({ chiave, esito: 'corretta dall\'utente: non toccata' }); continue; }
      if (r.nota === null) {
        if (db.prepare('UPDATE main.persona SET nota = ? WHERE id = ? AND nota IS NULL').run(d.nota, d.id).changes !== 1) errore(`la nota di ${d.nome} non si aggiorna`);
        personeToccate.add(String(d.id));
        esiti.push({ chiave, esito: 'scritta', prima: null, dopo: d.nota, perche: d.perche });
      } else esiti.push({ chiave, esito: 'già scritta' });

      // la resa del codice: si aggiunge solo se manca, una resa già presente non si sovrascrive
      const chiaveResa = `traduzione:${AMBITO}:${d.nota}`;
      const resa = db.prepare('SELECT testo, fonte FROM main.traduzione WHERE ambito = ? AND chiave = ?').get(AMBITO, d.nota) as { testo: string; fonte: string } | undefined;
      if (!resa) {
        db.prepare("INSERT INTO main.traduzione (ambito, chiave, testo, extra_json, fonte, updated_at) VALUES (?, ?, ?, NULL, 'seed', ?)").run(AMBITO, d.nota, d.resa, new Date().toISOString());
        traduzioniToccate.add(`${AMBITO}|${d.nota}`);
        esiti.push({ chiave: chiaveResa, esito: 'aggiunta', prima: null, dopo: d.resa, perche: d.perche });
      } else if (resa.testo === d.resa) esiti.push({ chiave: chiaveResa, esito: 'già presente' });
      else esiti.push({ chiave: chiaveResa, esito: `resa diversa già presente (fonte ${resa.fonte}): non toccata`, prima: resa.testo });
    }

    // le verifiche: solo le righe dell'elenco sono cambiate
    const fuori = [
      ...diverseFuori(personePrima, righePerChiave(db, 'persona', ['id']), personeToccate).map((k) => `persona ${k}`),
      ...diverseFuori(traduzioniPrima, righePerChiave(db, 'traduzione', ['ambito', 'chiave']), traduzioniToccate).map((k) => `traduzione ${k}`),
    ];
    if (fuori.length) errore(`righe cambiate fuori dall'elenco: ${fuori.slice(0, 5).join(', ')}`);
    for (const [t, h] of intattePrima) if (improntaTabella(db, t) !== h) errore(`la tabella ${t} è cambiata`);
    const tesoroDopo = tesoroPrima === null ? null : improntaTabella(db, 'tesoro_modificatore');
    if (tesoroDopo !== tesoroPrima) errore('la tabella tesoro_modificatore è cambiata');
    if (improntaPartite(db) !== partitePrima) errore('le tabelle delle partite sono cambiate');

    scriviAuditCompendio(db, AUDIT, 367, DECISIONI, {
      esiti,
      tesoroModificatore: { righeCambiate: 0, improntaPrima: tesoroPrima, improntaDopo: tesoroDopo, motivo: 'le 20 celle segnalate dall\'analisi non si toccano finché non sono verificate in gioco' },
    }, personeToccate.size + traduzioniToccate.size > 0);
    logger.info({ migrazione: 367, esiti: esiti.map((e) => `${e.chiave}: ${e.esito}`) }, 'compendio: date delle Persona');
  },
};
