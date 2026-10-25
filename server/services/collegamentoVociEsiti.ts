// ============================================================
// collegamentoVociEsiti — il PIANO per collegare una voce del Diario agli esiti della sua attività (L13, ondata 2; NON applicato ai dati)
// ============================================================
//
// Istruzione dell'ondata 2 (2026-10-25): le voci già validate dall'utente (fino al 05-31) non si convertono; per le altre voci di Big Bang
// Burger, centro battute e bagno pubblico si prepara SOLO la funzione di collegamento: la conversione arriva dopo l'approvazione
// dell'utente, voce per voce. Qui niente scrive: `pianoCollegamentoVoceEsiti` legge la voce, i suoi effetti e gli esiti dell'attività e
// restituisce che cosa cambierebbe — il collegamento della voce all'attività e la lista completa degli effetti nella forma che
// `salvaEffettiVoce` accetta (stessa revisione, stessi uid per gli effetti che restano) — più l'elenco di ciò che toglie, da mostrare.
// La regola: gli effetti `dote` sulle Doti che gli esiti dell'attività dichiarano escono (le darà l'esito scelto alla spunta: un solo
// punto); restano gli altri (la Coraggio della pioggia al bagno, per esempio); si aggiunge un effetto `turno` con l'esito atteso
// (solo nel modo «scelta»; nel modo automatico l'esito si ricava dal giorno). Chi applica dopo il sì dell'utente passa il piano a
// `salvaEffettiVoce` e a `aggiornaVoceGiornata` (tipo e collegamento): le partite già spuntate ricevono le loro proposte storiche dal
// motore, come per ogni correzione di una voce.
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { leggiEffettiVoce } from './motoreDiario.js';
import { esitiDellAttivita } from './esitiAttivitaService.js';
import type { EffettoVoce, RichiestaSalvaEffettiVoce } from '../../shared/effettiVoce.js';

/** Le voci dopo il 05-31 da proporre all'utente, con l'esito atteso letto dal testo della voce (da confermare voce per voce). */
export const CANDIDATI_COLLEGAMENTO_ESITI: ReadonlyArray<{ voce: string; giorno: string; attivita: string; esitoAtteso: string | null; nota: string }> = [
  { voce: '0f629a255e9feeca0d339f8f92f9e9b0', giorno: '06-04', attivita: 'sfida-big-bang-burger', esitoAtteso: 'gravity-vinta', nota: '«affrontare la sfida del Gravity Burger»: oggi Coraggio ♪♪ fisso, che per i dati è la Gravity persa' },
  { voce: '3e5106dec8bfe998093d39a88dbc301b', giorno: '06-07', attivita: 'sfida-big-bang-burger', esitoAtteso: null, nota: '«accettare la sfida (500 yen)», sfida non indicata: oggi Coraggio ♪♪ fisso' },
  { voce: 'fb0ac49af6e48c2172f4250626e1c521', giorno: '08-14', attivita: 'sfida-big-bang-burger', esitoAtteso: 'gravity-vinta', nota: '«completarla con 2.000 yen»: oggi ♪♪ alle quattro Doti fisse (la vittoria della Gravity)' },
  { voce: '3c0edc3d0692f34375c5db5c718248d0', giorno: '08-15', attivita: 'sfida-big-bang-burger', esitoAtteso: 'cosmo-tower-vinta', nota: '«consumare il panino (2.500 yen)», «Distintivo del capitano»: oggi nessun effetto' },
  { voce: '29c27bf247246474df1dfca749d0daad', giorno: '06-09', attivita: 'bagno-pubblico-yongen-jaya', esitoAtteso: null, nota: 'Fascino ♪♪ fisso; l’esito si ricava dal giorno' },
  { voce: '2bfee883c4f851300607c11ac6ba07c4', giorno: '06-13', attivita: 'bagno-pubblico-yongen-jaya', esitoAtteso: null, nota: 'Fascino ♪♪ e Coraggio ♪ (la pioggia: resta come effetto proprio)' },
  { voce: 'b33c622e3fa9d0bd032837a040dcd2bb', giorno: '06-16', attivita: 'bagno-pubblico-yongen-jaya', esitoAtteso: null, nota: 'Fascino ♪♪ e Coraggio ♪ (la pioggia: resta come effetto proprio)' },
  { voce: '995d18392fe29fc99f144b22dbde8708', giorno: '06-21', attivita: 'bagno-pubblico-yongen-jaya', esitoAtteso: null, nota: 'Fascino ♪♪ e Coraggio ♪ (la pioggia: resta come effetto proprio)' },
  { voce: '817e560d8cb82f8b861a01329b11aa9c', giorno: '07-06', attivita: 'bagno-pubblico-yongen-jaya', esitoAtteso: null, nota: 'Fascino ♪♪ e Coraggio ♪ (la pioggia: resta come effetto proprio)' },
];

export interface PianoCollegamentoVoce {
  voceUid: string;
  /** Il collegamento che la voce avrebbe: tipo «attività», riferimento all'attività. */
  voce: { tipo: 'attivita'; riferimento: { tipo: 'attivita'; chiave: string } };
  /** La lista completa degli effetti per `salvaEffettiVoce` (revisione della fonte letta qui). */
  effetti: RichiestaSalvaEffettiVoce;
  /** Gli effetti che uscirebbero (le Doti che l'esito darà), per mostrarli all'utente prima del sì. */
  tolti: EffettoVoce[];
}

/** Il piano per una voce: legge e basta. Rifiuta (409) una voce oltre il limite delle validate, un'attività senza esiti o un esito che non dichiara. */
export function pianoCollegamentoVoceEsiti(voceUid: string, attivita: string, esitoAtteso: string | null): PianoCollegamentoVoce {
  const v = prepared('SELECT data FROM voce_giornata WHERE uid = ?').get(voceUid) as { data: string } | undefined;
  if (!v) throw httpErrors.notFound('voce-non-trovata', 'La voce del Diario non è più presente.');
  if (v.data <= '05-31') throw httpErrors.conflict('voce-validata', 'Le voci fino al 31 maggio sono validate dall’utente: non si convertono.');
  const a = esitiDellAttivita(attivita);
  if (!a?.esiti) throw httpErrors.conflict('attivita-senza-esiti', 'L’attività non dichiara esiti: non c’è niente a cui collegare la voce.');
  if (esitoAtteso !== null && (a.esiti.modo !== 'scelta' || !a.esiti.esiti.some((e) => e.chiave === esitoAtteso))) throw httpErrors.badRequest('esito-sconosciuto', 'L’esito atteso non è fra quelli che l’attività lascia scegliere.');
  const fonte = leggiEffettiVoce(voceUid);
  if (fonte.stato !== 'convertita') throw httpErrors.conflict('effetti-da-correggere', 'La voce ha effetti da correggere prima di qualunque collegamento.');
  const doteDegliEsiti = new Set(a.esiti.esiti.flatMap((e) => e.doti.map((d) => d.dote)));
  const tolti = fonte.effetti.filter((e) => e.effetto.tipo === 'dote' && doteDegliEsiti.has(e.effetto.dote));
  const restano = fonte.effetti.filter((e) => !tolti.includes(e) && !(e.effetto.tipo === 'turno' && e.effetto.attivita === attivita));
  const turno: EffettoVoce = { tipo: 'turno', attivita, ...(esitoAtteso ? { esito: esitoAtteso } : {}) };
  return {
    voceUid,
    voce: { tipo: 'attivita', riferimento: { tipo: 'attivita', chiave: attivita } },
    effetti: { revisioneEffettiAttesa: fonte.revisione, effetti: [...restano.map((e) => ({ uid: e.uid, effetto: e.effetto })), { uid: null, effetto: turno }] },
    tolti: tolti.map((e) => e.effetto),
  };
}
