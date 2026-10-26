// ============================================================
// Migrazione 285 — le identità doppie rimaste nel catalogo diventano una (chiusura dell'ondata 5, decisione 21 c)
// ============================================================
//
// Revisione finale dell'ondata 5, rilievo 1 (alto): «Restano anche i doppioni … Il lotto C ha esteso da solo l'elenco delle unioni oltre O5-14
// (19 doppioni dei regali nella UNIONI_250). La decisione 21 (c) ammette le unioni "su elenco scritto con cestino reversibile". Lo stesso metodo
// andava applicato qui». Ogni riga dell'elenco qui sotto è un'unione con il gesto congelato della fusione (`unisciIdentita` → `fondiOggetti144`,
// come la 250): l'identità tolta va nel Cestino (si rimette da lì), offerte, ricompense, regali, proposte e fonti passano all'identità che resta.
// L'identità tolta, con tutte le sue colonne, resta anche nell'audit.
//
// Censimento completo dei nomi doppi del catalogo visibile (nome, nomi alternativi, nome originale; dopo la 284, che ha ridato il nome della
// guida alle schede dell'equipaggiamento con il nome di un altro accessorio): restano come identità doppie vere:
//   - quattro oggetti della pagina Oggetti [O] con l'offerta su una scheda del listino e il «Prezzo citato» su quella della guida (rilievo 1 della
//     revisione finale, O5-02): Capsula d'allerta (Clinica di Takemi), Proteine d'importazione (Prossimo Asso), Carne in scatola spec. (MealPort,
//     «Carne in scatola speciale»), Pacco di frutta primav. (Super Muramasa, «Confezione di frutta primaverile»: la «Confezione» senza pagina
//     italiana era questo stesso oggetto, nome per esteso del listino); resta la scheda della guida (categoria di [O]) e il «Prezzo citato» esce
//     dalla sua descrizione, perché il prezzo ora lo dice l'offerta che vi arriva;
//   - Spec. senso spirit. ×3: la scheda «accessorio» (rinominata dalla 284 con il nome di [A]: Alito mefitico, Tanaka 5.000 ¥) riceve le due
//     schede «consumabile» (la riga del vecchio elenco con il «Prezzo citato», e quella del listino di Tanaka con l'offerta);
//   - Sacra Sindone e Tavola Ouija: le schede «accessorio» del listino di Tanaka con il nome inglese (Holy Cloth, Ouija Board) si uniscono alle
//     schede di [O], che hanno le offerte;
//   - Cristallo della boria: la scheda «altro» (dal forziere del Palazzo di Shido) si unisce a quella «accessorio» ([A]);
//   - Specchio di rappresaglia: la scheda del listino di Tanaka «Retribution Mirror» (offerta nascosta: la guida non la mette da Tanaka) si unisce
//     a quella del Venditore ambulante, con «Spec. rappresaglia» di [A] fra i nomi alternativi;
//   - Palla peli appiccicosa: la scheda «materiale» (ricompensa della Richiesta) si unisce a quella «chiave» della pagina Oggetti chiave (che dice
//     l'effetto: «Permette di fondere la Persona Babau»);
//   - Black Kogatana: la scheda «materiale» del listino di Tanaka (senza offerte: l'offerta è già sulla Kogatana nera, con «Black Kogatana» fra
//     i nomi alternativi) si unisce alla Kogatana nera.
// Non sono identità doppie, e restano (motivo anche nell'audit): Anello del vento ×2 (Wind Ring dell'equipaggiamento e l'accessorio del
// Venditore ambulante: la descrizione scritta dall'utente dice che sono due oggetti con lo stesso nome); Shock rosa ×2 (Pink Buster, la riga
// della pagina Armi a distanza, e Brain Shot, Attacco 140 / Precisione 84, che la pagina non elenca: il suo nome italiano si verifica in gioco);
// Stilografica ×2 (motivo della 250).
//
// Nessuna partita e nessuna voce del Diario cambia (le guardie di `unisciIdentita` lo verificano a ogni unione). Idempotente: un'identità già
// tolta non si tocca. Audit in `dati_guida.audit-285-identita-doppie`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { unisciIdentita, type UnioneIdentita } from './identitaDoppie250.js';
import { improntaDiario, scriviAuditChiusura, scriviColonnaCatalogo, type EsitoColonna } from './chiusuraOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-285-identita-doppie';

/** L'elenco delle unioni (decisione 21 c): `da` si toglie, `a` resta. */
export const UNIONI_285: readonly UnioneIdentita[] = [
  { da: 'consumabile/capsula-d-allerta', a: 'consumabile/capsula-dallerta', alias: [], perche: 'stessa Capsula d’allerta: l’offerta della Clinica di Takemi passa alla scheda della pagina Oggetti' },
  { da: 'regalo/proteine-d-importazione', a: 'consumabile/proteine-dimportazione', alias: [], perche: 'stesse Proteine d’importazione: l’offerta del Prossimo Asso passa alla scheda della pagina Oggetti (consumabile)',
    // la proposta del 12 giugno (Sakai) diceva che il catalogo ha due oggetti per le proteine: dopo l'unione è falso
    motivi: [[' o «Proteine d importazione» (regalo/proteine-d-importazione)', ''],
      [', e per le proteine il catalogo ha due oggetti (consumabile/proteine-dimportazione e regalo/proteine-d-importazione)', '']] },
  { da: 'cibo/carne-in-scatola-speciale', a: 'consumabile/carne-in-scatola-spec', alias: ['Carne in scatola speciale'], perche: 'stessa Carne in scatola spec.: l’offerta di MealPort passa alla scheda della pagina Oggetti' },
  { da: 'cibo/confezione-di-frutta-primaverile', a: 'consumabile/pacco-di-frutta-primav', alias: ['Confezione di frutta primaverile'], perche: 'stesso Pacco di frutta primav.: l’offerta del Super Muramasa passa alla scheda della pagina Oggetti',
    // la proposta del 18 aprile (periodo validato: resta una proposta da approvare riga per riga) diceva che il nome non bastava a scegliere fra
    // due oggetti: dopo l'unione l'oggetto è uno
    motivi: [['; nel catalogo ci sono due oggetti (cibo/confezione-di-frutta-primaverile, venduto dal Super Muramasa, e consumabile/pacco-di-frutta-primav «Pacco di frutta primav.», contenuto del set delle televendite): il nome non basta a scegliere',
      ': è lo stesso oggetto, «Pacco di frutta primav.» (consumabile/pacco-di-frutta-primav, con l’offerta del Super Muramasa e il contenuto del set delle televendite), le cui due schede sono state unite (ondata 5, decisione 21)']] },
  { da: 'consumabile/spec-senso-spirit', a: 'accessorio/inspired-hand-mirror', alias: [], perche: 'stesso Spec. senso spirit. (pagina Accessori: Alito mefitico, Tanaka)' },
  { da: 'consumabile/spec-senso-spirit-2', a: 'accessorio/inspired-hand-mirror', alias: [], perche: 'stesso Spec. senso spirit.: l’offerta di Tanaka passa alla scheda dell’accessorio' },
  { da: 'accessorio/holy-cloth', a: 'consumabile/sacra-sindone', alias: ['Holy Cloth'], perche: 'stessa Sacra Sindone del listino di Tanaka (pagina Oggetti: consumabile)' },
  { da: 'accessorio/ouija-board', a: 'consumabile/tavola-ouija', alias: [], perche: 'stessa Tavola Ouija del listino di Tanaka (pagina Oggetti: consumabile)' },
  { da: 'altro/cristallo-della-boria', a: 'accessorio/cristallo-della-boria', alias: [], perche: 'stesso Cristallo della boria (pagina Accessori: Signore della difesa)' },
  { da: 'accessorio/retribution-mirror', a: 'accessorio/specchio-di-rappresaglia', alias: ['Retribution Mirror', 'Spec. rappresaglia'], perche: 'stesso Spec. rappresaglia della pagina Accessori (20%, non cumulabile, 24.000 ¥)' },
  { da: 'materiale/palla-peli-appiccicosa', a: 'chiave/palla-peli-appiccicosa', alias: [], perche: 'stessa Palla peli appiccicosa: la ricompensa della Richiesta passa alla scheda della pagina Oggetti chiave' },
  { da: 'materiale/black-kogatana', a: 'materiale/kogatana-nera', alias: [], perche: 'stessa Kogatana nera («Black Kogatana» è già fra i suoi nomi alternativi)' },
];

/** Fuori dall'elenco, con il motivo. */
const FUORI_ELENCO_285 = [
  { chiavi: ['accessorio/anello-del-vento', 'accessorio/anello-del-vento-2'], motivo: 'due oggetti con lo stesso nome (Wind Ring e l’accessorio del Venditore ambulante): lo dice la descrizione scritta dall’utente' },
  { chiavi: ['arma-da-fuoco/shock-rosa', 'arma-da-fuoco/shock-rosa-2'], motivo: 'Pink Buster è lo «Shock rosa» della pagina Armi a distanza; Brain Shot (Attacco 140, Precisione 84) non vi compare: il suo nome italiano si verifica in gioco' },
] as const;

/** Dopo l'unione, il «Prezzo citato» esce dalla descrizione della scheda che resta, se l'offerta arrivata ha quel prezzo. */
const PREZZI_CITATI: ReadonlyArray<{ chiave: string; prezzo: number; prima: string; dopo: string }> = [
  { chiave: 'consumabile/capsula-dallerta', prezzo: 800, prima: 'Clinica Takemi (da 16 aprile); Forzieri (vari); Televendite; Negoziazioni\nPrezzo citato nella pagina Oggetti: 800 ¥.', dopo: 'Clinica Takemi (da 16 aprile); Forzieri (vari); Televendite; Negoziazioni' },
  { chiave: 'consumabile/proteine-dimportazione', prezzo: 8000, prima: 'Prossimo Asso (da 5 giugno); Televendite\nPrezzo citato nella pagina Oggetti: 8000 ¥.', dopo: 'Prossimo Asso (da 5 giugno); Televendite' },
  { chiave: 'consumabile/carne-in-scatola-spec', prezzo: 1600, prima: 'Verdura MealPort, Kichijoji (da 5 giugno)\nPrezzo citato nella pagina Oggetti: 1600 ¥.', dopo: 'Verdura MealPort, Kichijoji (da 5 giugno)' },
  { chiave: 'consumabile/pacco-di-frutta-primav', prezzo: 1200, prima: 'Super Muramasa (da 18 aprile); Televendite\nPrezzo citato nella pagina Oggetti: 1200 ¥.', dopo: 'Super Muramasa (da 18 aprile); Televendite' },
];

export const migration285: Migration = {
  id: 285,
  name: 'identita_doppie_della_chiusura',
  up(db) {
    if (!db.inTransaction) throw new Error('285: manca la transazione della migrazione; nessuna modifica applicata.');
    for (const t of ['catalogo_oggetto', 'articolo', 'confidente_regalo', 'proposta_abbinamento', 'cestino', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 285, tabella: t }, 'tabella assente: identità doppie non unite'); return; }
    }
    const diarioPrima = improntaDiario(db);
    const esiti = UNIONI_285.map((u) => ({ ...unisciIdentita(db, u), perche: u.perche }));
    for (const e of esiti.filter((x) => x.esito === 'ferma')) logger.warn({ migrazione: 285, da: e.da, a: e.a, motivo: e.motivo }, 'unione non applicata, lasciata com’è');
    const prezzi: Array<EsitoColonna & { offerta?: string }> = PREZZI_CITATI.map((p) => {
      const offerta = db.prepare('SELECT chiave FROM main.articolo WHERE catalogo_chiave = ? AND nascosto = 0 AND prezzo = ? ORDER BY chiave LIMIT 1').pluck().get(p.chiave, p.prezzo) as string | undefined;
      if (!offerta) return { chiave: p.chiave, colonna: 'descrizione', esito: `nessuna offerta visibile a ${p.prezzo} ¥ sulla scheda: «Prezzo citato» lasciato` };
      return { ...scriviColonnaCatalogo(db, p.chiave, 'descrizione', p.prima, p.dopo), offerta };
    });
    if (improntaDiario(db) !== diarioPrima) throw new Error('285: le voci del Diario sono cambiate; nessuna modifica applicata.');
    const unite = esiti.filter((e) => e.esito === 'unita').length;
    const descrizioni = prezzi.filter((p) => p.esito === 'scritto').length;
    if (unite || descrizioni) invalidaCacheDiGioco();
    const prezziCitati = db.prepare("SELECT chiave, descrizione FROM main.catalogo_oggetto WHERE nascosto = 0 AND descrizione LIKE '%Prezzo citato%' ORDER BY chiave").all();
    const conteggi = {
      unite, giaUnite: esiti.filter((e) => e.esito === 'gia-unita').length, ferme: esiti.filter((e) => e.esito === 'ferma').length,
      proposteAggiornate: esiti.reduce((n, e) => n + (e.proposteAggiornate?.length ?? 0), 0), prezziCitatiTolti: descrizioni, prezziCitatiRimasti: prezziCitati.length,
    };
    scriviAuditChiusura(db, AUDIT, 285, { conteggi, esiti, prezzi, prezziCitatiRimasti: prezziCitati, fuoriElenco: FUORI_ELENCO_285 }, unite + descrizioni);
    logger.info({ migrazione: 285, ...conteggi }, 'Identità doppie rimaste unite (chiusura dell’ondata 5)');
  },
};
