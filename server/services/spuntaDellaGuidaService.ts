// ============================================================
// spuntaDellaGuidaService — la domanda in classe e il cruciverba segnati dalla Guida passano dalla voce del Diario (R12-01/5)
// ============================================================
//
// La stessa domanda (o lo stesso cruciverba) si segna in due punti: la pagina della Guida e la voce del Diario che la cita con un effetto
// di stato (migrazioni 157 e 158). La verità è una sola (`domanda_partita`, `cruciverba_partita`); per non avere due stati che si
// contraddicono, quando la voce c'è (`vociDiStato`: una sola voce, senza ambiguità) la spunta dalla Guida è LA spunta della voce:
//   - la voce risulta fatta nel Diario e nella Home, e l'alone dei suggerimenti non la propone più;
//   - la Conoscenza non è più un avviso che sparisce: è l'«Applica» della voce, mai applicata da sola (D6);
//   - se era l'ultima attività del giorno corrente, la partita passa al giorno dopo, come per ogni spunta;
//   - togliere la spunta dalla Guida toglie quella della voce (che riporta lo stato com'era prima) e poi, se lo stato era già segnato
//     a mano prima della voce e quindi resta, lo toglie: il gesto dell'utente vince sempre sul risultato finale.
// Senza voce collegata (domande dei quiz in TV, date con due domande, voci con altre scelte da fare) valgono i gesti di prima: lo stato
// si scrive da solo e la Conoscenza si ricorda con l'avviso `daSegnare`. Tutto in una transazione: o si muovono voce e stato, o niente.
// ============================================================

import { getDb, prepared } from '../db/dbService.js';
import type { CruciverbaDto, DomandeDto, GiornoAvanzatoDto } from '../../shared/types.js';
import { verificaPartita } from './verificaPartita.js';
import { spuntaEAvanza } from './percorsoService.js';
import { domande, impostaDomandaFatta, scriviDomandaFatta } from './domandeService.js';
import { impostaCruciverba, scriviCruciverba } from './cruciverbaService.js';
import { voceCollegata } from './vociDiStato.js';

/** Porta la voce allo stato voluto con il suo gesto (spunta o toglie la spunta); se è già così non fa niente. Dice se la giornata è avanzata. */
function portaLaVoce(partitaId: number, voceUid: string, fatta: boolean): GiornoAvanzatoDto | undefined {
  const spuntata = !!prepared('SELECT 1 FROM spunta_voce_partita WHERE partita_id = ? AND voce_uid = ?').get(partitaId, voceUid);
  if (spuntata === fatta) return undefined;
  return spuntaEAvanza(partitaId, voceUid, fatta).giornoAvanzato;
}

/**
 * Segna (o toglie) una domanda dalla Guida. Con la voce del Diario che la segna passa dal gesto della voce (la Conoscenza è il suo
 * «Applica»); altrimenti, o se la domanda dà Conoscenza e la voce non la porta, vale il gesto di prima con l'avviso `daSegnare`.
 */
export function segnaDomandaDallaGuida(partitaId: number, domandaId: number, fatta: boolean, conoscenza: boolean): DomandeDto {
  verificaPartita(partitaId);
  const legame = voceCollegata('domanda', String(domandaId));
  if (!legame || (fatta && conoscenza && !legame.conoscenza)) return impostaDomandaFatta(partitaId, domandaId, fatta, conoscenza);
  const giornoAvanzato = getDb().transaction(() => {
    const avanzato = portaLaVoce(partitaId, legame.voceUid, fatta);
    // lo stato finale è quello chiesto: se la voce non l'ha mosso (già segnato a mano prima, o voce già a posto) si scrive qui, senza altra Conoscenza
    scriviDomandaFatta(partitaId, domandaId, fatta, false);
    return avanzato;
  })();
  const esito = domande(partitaId);
  return giornoAvanzato ? { ...esito, giornoAvanzato } : esito;
}

/** Segna (o toglie) un cruciverba dalla Guida: stessa regola della domanda (`segnaDomandaDallaGuida`). La Conoscenza del cruciverba è sempre una per risposta esatta. */
export function segnaCruciverbaDallaGuida(partitaId: number, data: string, fatto: boolean): CruciverbaDto {
  verificaPartita(partitaId);
  const legame = voceCollegata('cruciverba', data);
  // il cruciverba vale sempre una nota di Conoscenza: se la voce non la porta, la ricorda l'avviso del gesto di prima
  if (!legame || (fatto && !legame.conoscenza)) return impostaCruciverba(partitaId, data, fatto);
  return getDb().transaction(() => {
    const giornoAvanzato = portaLaVoce(partitaId, legame.voceUid, fatto);
    const { riga } = scriviCruciverba(partitaId, data, fatto);
    return giornoAvanzato ? { ...riga, giornoAvanzato } : riga;
  })();
}
