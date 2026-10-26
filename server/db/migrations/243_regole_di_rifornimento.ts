// ============================================================
// Migrazione 243 — la regola di rifornimento di ogni articolo, dalla guida o, dove tace, dall'utente (Ondata 5, Lotto B; decisione 21)
// ============================================================
//
// Decisione 21 dell'utente (26 ottobre): «rigenerazione per tutte le categorie, distributori a 2 pezzi da verificare; in caso di discordanza
// fra pagine della guida vale il listino dei negozi con nota storica»; la regola dell'utente dove la guida tace: il segno «comprato» vale fino
// al cambio di giornata. Le regole e le fonti sono in `rifornimentoOndata5.ts`; qui si scrivono sulla colonna della 242:
//   - articolo per articolo (`REGOLE_ARTICOLI`), poi per negozio (`REGOLE_NEGOZI`), poi i distributori (tipo `distributore`: 2 pezzi,
//     lunedì, da verificare in gioco); ogni altro articolo visibile riceve la regola dell'utente (`fallback-utente`, nessun limite);
//   - i servizi (Penguin Sniper, Tempio di Kichijoji) e l'Aojiru (che ha il suo registro delle consumazioni) restano senza regola;
//   - `quantita` (i pezzi per ciclo) si scrive solo se è vuota; se c'è già un valore diverso resta quello e l'audit lo dice.
// Conservativa: un articolo che ha già una regola non si tocca (idempotente: la seconda volta non cambia niente; un dato salvato
// dall'utente resta). Solo gli articoli visibili di negozi visibili. Nessuna voce del Diario e nessun dato delle partite cambia (controllo).
// Audit in `dati_guida.audit-243-regole-rifornimento`: per ogni articolo la regola scritta, saltata o la quantità tenuta.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { eOffertaAojiru } from '../../../shared/acquisti.js';
import { normalizzaRifornimento } from '../../../shared/rifornimento.js';
import { DISTRIBUTORE, FALLBACK_UTENTE, NEGOZI_SENZA_REGOLA, REGOLE_ARTICOLI, REGOLE_NEGOZI, improntaDiario, scriviAudit, type RegolaArticolo } from './rifornimentoOndata5.js';

const AUDIT = 'audit-243-regole-rifornimento';
const errore = (motivo: string): never => { throw new Error(`243: ${motivo}; nessuna modifica applicata.`); };

export const migration243: Migration = {
  id: 243,
  name: 'regole_di_rifornimento',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'articolo') || !esisteTabella(db, 'negozio') || !haColonna(db, 'articolo', 'rifornimento_json')) {
      logger.warn({ migrazione: 243 }, 'articoli o colonna del rifornimento assenti: nessuna regola scritta'); return;
    }
    const diarioPrima = improntaDiario(db);
    const righe = db.prepare(`SELECT a.chiave, a.negozio_chiave, a.catalogo_chiave, a.quantita, a.rifornimento_json, n.tipo AS negozio_tipo
      FROM main.articolo a JOIN main.negozio n ON n.chiave = a.negozio_chiave WHERE a.nascosto = 0 AND n.nascosto = 0 ORDER BY n.ordine, a.ordine, a.chiave`).all() as
      Array<{ chiave: string; negozio_chiave: string; catalogo_chiave: string | null; quantita: number | null; rifornimento_json: string | null; negozio_tipo: string }>;
    const presenti = new Set(righe.map((r) => r.chiave));
    const scrivi = db.prepare('UPDATE main.articolo SET rifornimento_json = ?, quantita = ? WHERE chiave = ? AND rifornimento_json IS NULL');
    const esiti: Array<{ articolo: string; esito: string }> = [];
    const conteggi = { guida: 0, fallbackUtente: 0, distributori: 0, giaConRegola: 0, senzaRegola: 0, quantitaTenute: 0 };
    for (const r of righe) {
      if (NEGOZI_SENZA_REGOLA.has(r.negozio_chiave)) { conteggi.senzaRegola++; esiti.push({ articolo: r.chiave, esito: 'servizio: nessuna regola' }); continue; }
      if (eOffertaAojiru({ chiave: r.chiave, catalogoChiave: r.catalogo_chiave })) { conteggi.senzaRegola++; esiti.push({ articolo: r.chiave, esito: 'Aojiru: ha il registro delle consumazioni, nessuna regola' }); continue; }
      if (r.rifornimento_json !== null) { conteggi.giaConRegola++; esiti.push({ articolo: r.chiave, esito: 'regola già presente: non toccata' }); continue; }
      const regola: RegolaArticolo = REGOLE_ARTICOLI[r.chiave] ?? REGOLE_NEGOZI[r.negozio_chiave] ?? (r.negozio_tipo === 'distributore' ? DISTRIBUTORE : FALLBACK_UTENTE);
      if (normalizzaRifornimento(regola.r) === null) errore(`la regola di ${r.chiave} non è valida`);
      // i pezzi per ciclo: la guida, se la quantità è vuota; un valore già scritto diverso resta (e si dice)
      let quantita = r.quantita;
      let nota = '';
      if (regola.q !== null) {
        if (r.quantita === null) quantita = regola.q;
        else if (r.quantita !== regola.q) { conteggi.quantitaTenute++; nota = `, quantità salvata ${r.quantita} tenuta (la guida dice ${regola.q})`; }
      }
      if (scrivi.run(JSON.stringify(regola.r), quantita, r.chiave).changes !== 1) errore(`l'articolo ${r.chiave} non si aggiorna`);
      if (regola === DISTRIBUTORE) conteggi.distributori++;
      else if (regola.r.origine === 'fallback-utente') conteggi.fallbackUtente++;
      else conteggi.guida++;
      esiti.push({ articolo: r.chiave, esito: `${regola.r.origine === 'guida' ? 'guida' : 'regola dell’utente'}: ${JSON.stringify(regola.r)}, pezzi ${quantita ?? 'senza limite'}${nota}` });
    }
    const assenti = Object.keys(REGOLE_ARTICOLI).filter((k) => !presenti.has(k));
    // ---- controlli: il Diario non cambia, ogni regola scritta si rilegge
    if (improntaDiario(db) !== diarioPrima) errore('le voci del Diario sono cambiate');
    const illeggibili = (db.prepare('SELECT chiave, rifornimento_json FROM main.articolo WHERE rifornimento_json IS NOT NULL').all() as Array<{ chiave: string; rifornimento_json: string }>)
      .filter((x) => normalizzaRifornimento(x.rifornimento_json) === null).map((x) => x.chiave);
    if (illeggibili.length) errore(`regole illeggibili: ${illeggibili.join(', ')}`);
    scriviAudit(db, AUDIT, 243, { conteggi: { articoliVisibili: righe.length, ...conteggi, chiaviDellaGuidaAssenti: assenti.length }, chiaviDellaGuidaAssenti: assenti, esiti });
    logger.info({ migrazione: 243, ...conteggi, assenti: assenti.length }, 'Articoli: regole di rifornimento');
  },
};
