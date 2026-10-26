// ============================================================
// Migrazione 297 — l'Aojiru delle voci dopo il 05-31 assorbe la sua Dote: niente doppio promemoria (Ondata 5, lotto F-bis)
// ============================================================
//
// Censimento F-bis, punto 1: 12 voci (06-05, 07-03, 07-17, 07-31, 08-14, 08-28, 09-04, 11-06, 11-13, 11-27, 12-04, 01-15) hanno sia la Dote
// della bevanda («Fascino +1») sia l'acquisto dell'Aojiru (`acquisto`, chiosco del sottopasso) con `sostituisceDoti` vuoto. Verificato nel
// motore (`motoreDiario.preparaAssorbimentiDote`, `acquistiService.anteprimaRegistrazioneAcquisto`): la consumazione dell'Aojiru dà già la sua
// Dote (2 punti, 3 con la Fortuna) e la Dote fissa della voce è un SECONDO promemoria della stessa bevanda: il doppio promemoria c'è. Le voci
// del periodo validato lo risolvono già con `sostituisceDoti` (scelte dell'utente, origine «utente»: 04-24, 05-01, 05-08, 05-29).
//
// Che cosa fa: in ognuna delle 12 voci l'acquisto dichiara di assorbire la Dote della voce (`sostituisceDoti` = l'uid della Dote), come le
// voci validate. La variante resta quella scritta (l'01-15, «Aojiru speciale», ha la variante da osservare alla spunta: resta tale). Nessun
// altro effetto cambia; nessuna partita cita queste voci (verificato voce per voce). Conservativa (vedi `fbisOndata5.ts`). Idempotente.
// Audit in `dati_guida.audit-297-aojiru`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import type { DoteChiave } from '../../../shared/doti.js';
import type { EffettoVoce } from '../../../shared/effettiVoce.js';
import { convertiVoce, scriviAuditFbis, tabellePartiteConVoce, type Esito } from './fbisOndata5.js';

const AUDIT = 'audit-297-aojiru';
const errore = (motivo: string): never => { throw new Error(`297: ${motivo}; nessuna modifica applicata.`); };
const AOJIRU = 'chiosco-kiyasuku/succo-aojiru';

const VOCI: ReadonlyArray<{ uid: string; data: string; azione: string; doteUid: string; dote: DoteChiave; note: 1 | 2; acquistoUid: string; variante: DoteChiave | null }> = [
  { uid: '20246dde0c8f49f22421db208e2925ad', data: '06-05', azione: 'Aojiru domenicale: Aojiru Bellezza', doteUid: 'f094a923408c832903d998ee66df547e', dote: 'fascino', note: 1, acquistoUid: 'c496844eace4b46b944e928927a47f92', variante: 'fascino' },
  { uid: 'c861bc1435d233d327375b18b9e024c6', data: '07-03', azione: 'Sottopasso: succo Aojiru termale (5.000 yen)', doteUid: 'dae0f94137d5f29049c89fbc1471b720', dote: 'gentilezza', note: 1, acquistoUid: 'af494c8f240f74858e0c927db51e737b', variante: 'gentilezza' },
  { uid: 'e3ed56b878d1ef83c80aca791a6e723b', data: '07-17', azione: 'Sottopasso, chiosco bevande: Aojiru alle alghe', doteUid: '6ae17ae9c4a59eb210035cbc2a3444db', dote: 'conoscenza', note: 1, acquistoUid: '13b34de3bfbd0cf6ef7c98f418348ad1', variante: 'conoscenza' },
  { uid: 'c4042ce24939b67d5c8784ab6915adaf', data: '07-31', azione: 'Aojiru Bellezza', doteUid: '8f17cd17d1a33a00be2e033a09f9dc82', dote: 'fascino', note: 2, acquistoUid: '1eb4794cf877c8073784ae65d8c4cf21', variante: 'fascino' },
  { uid: '7394f3349fb90ee5290818b7726ac7d3', data: '08-14', azione: 'Aojiru disgustoso al sottopasso', doteUid: '03d5e2b2ff0972016e924e6be0c65b99', dote: 'coraggio', note: 2, acquistoUid: '04642496a9eef48e0731fe994af031f3', variante: 'coraggio' },
  { uid: '5023f13297589e23295ff6926c227bf2', data: '08-28', azione: 'Aojiru termale al sottopasso di Shibuya', doteUid: 'c5676a4d486d410a78afbe41a1406eaf', dote: 'gentilezza', note: 2, acquistoUid: '86df9b8535cd0d0fe1e1347d48676996', variante: 'gentilezza' },
  { uid: 'aaf95e802f2b2afc69bb2b7e3a2b6089', data: '09-04', azione: 'Sottopasso: Aojiru alle alghe', doteUid: '689e08f64d3988a16ea992d6c0ab8405', dote: 'conoscenza', note: 2, acquistoUid: 'b9e270aec030a7b20e8f25a4aefbdf27', variante: 'conoscenza' },
  { uid: '21524690dcce4aa57eb1420599fd0a4d', data: '11-06', azione: 'Sottopasso di Shibuya: Aojiru-Bellezza', doteUid: '7b0e98b97d5640c8d9d71ecb86e7465e', dote: 'fascino', note: 1, acquistoUid: '722ab4805616a63b5cee96b3cfe420e1', variante: 'fascino' },
  { uid: '7280c6656b7f25e58e4e5e3169541c5e', data: '11-13', azione: 'Sottopasso: comprare Aojiru Vitalità', doteUid: '95c9cf8b177b7789e6d68165e2bb407f', dote: 'perizia', note: 1, acquistoUid: '969d1e8d8dc7004493cda01eb392882e', variante: 'perizia' },
  { uid: '9a496739deb425b226584d1254cdc889', data: '11-27', azione: 'Sottopasso: Aojiru disgustoso', doteUid: 'bf885a43ed9ebe38ab4432b973316b6a', dote: 'coraggio', note: 1, acquistoUid: 'df055e26c11a50e86cbb7e01016b26ef', variante: 'coraggio' },
  { uid: '1287d120a2113d455a4169d7807d04bf', data: '12-04', azione: 'Sottopasso: Aojiru termale', doteUid: 'a275d3455db126f3909a97411fb6abe7', dote: 'gentilezza', note: 1, acquistoUid: '65e6273bd07abc0b345fc95a4101e553', variante: 'gentilezza' },
  { uid: '55db1572529593d23134ee40c7504b2d', data: '01-15', azione: 'Aojiru speciale', doteUid: 'ee119a31e33a483c2e0d239e4a762525', dote: 'conoscenza', note: 1, acquistoUid: 'ab2b55bbdd89f394cad2942dd8e7e5ea', variante: null },
];

const acquisto = (variante: DoteChiave | null, sostituisceDoti: string[]): EffettoVoce => ({ tipo: 'acquisto', articolo: AOJIRU, variante, sostituisceDoti });

export const migration297: Migration = {
  id: 297,
  name: 'aojiru_dote_assorbita',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['voce_giornata', 'voce_effetto', 'voce_effetto_transizione']) if (!esisteTabella(db, t)) { logger.warn({ migrazione: 297, tabella: t }, 'tabella assente: niente da fare'); return; }
    const adesso = new Date().toISOString();
    const partite = tabellePartiteConVoce(db);
    const esiti: Esito[] = VOCI.map((v) => convertiVoce(db, { uid: v.uid, data: v.data, azione: v.azione,
      attesi: [{ uid: v.doteUid, effetto: { tipo: 'dote', dote: v.dote, note: v.note } }, { uid: v.acquistoUid, effetto: acquisto(v.variante, []) }],
      togli: [], aggiungi: [], modifica: [{ uid: v.acquistoUid, effetto: acquisto(v.variante, [v.doteUid]) }],
      motivo: 'l’acquisto dell’Aojiru assorbe la Dote della voce: la consumazione la dà già (un solo promemoria)' }, partite, adesso));
    const conteggi = { vociCorrette: esiti.filter((e) => e.esito.startsWith('convertita')).length, gia: esiti.filter((e) => e.esito === 'già convertita').length, saltate: esiti.filter((e) => e.esito.startsWith('saltata')).length };
    scriviAuditFbis(db, AUDIT, 297, { conteggi, esiti, verifica: 'doppio promemoria confermato: la consumazione dell’Aojiru dà la sua Dote (motoreDiario.preparaAssorbimentiDote); la Dote fissa della voce senza «sostituisceDoti» era un secondo promemoria' }, conteggi.vociCorrette > 0);
    logger.info({ migrazione: 297, ...conteggi }, 'Aojiru: la Dote della voce assorbita dall’acquisto (niente doppio promemoria)');
  },
};
