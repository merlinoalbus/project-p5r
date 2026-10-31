// ============================================================
// doniConfidenti — i doni dei Confidenti che la partita ha già meritato, letti dalla regola del dono con il valutatore unico (Ondata 5, lotto
// F-bis; decisione 21; L13, ondata 11, O11-1)
// ============================================================
//
// Decisione 21, precisazione dell'utente: gli oggetti ricevuti sono fra le cose che l'app gestisce. I doni dei Confidenti stanno nel catalogo
// come ricompense (`ricompensa_oggetto`, fonte «confidente», una riga per dono con la nota della guida) ma nessuna partita li riceveva. La
// migrazione 295 scrive per ciascun dono la REGOLA che lo fa ricevere, quando la guida la dà in termini che l'app conosce
// (`ricompensa_oggetto.condizioni_json`): il rango del Confidente (10, «al Rango massimo») e il giorno («19 marzo», «15 febbraio»). Il dono
// vale come oggetto ricevuto finché la regola vale: nessuna copia in un'altra tabella, nessuna riga da tenere allineata quando il rango scende.
// L13 (ondata 11, O11-1; risposta dell'utente del 2026-10-31 «Sì, in automatico» alla domanda «I doni "se fidanzata" arrivano da soli in base
// alla relazione registrata nella partita?»): la regola si valuta con il valutatore unico (`condizioni/valutatore.ts`, `valutaInsieme`) sullo
// stato leggero della partita (`statoPartitaSemafori`: ranghi, Doti, giorno, relazioni romantiche con il giorno d'inizio), non più con un
// valutatore proprio che conosceva solo rango e giorno. Così una regola può dire anche «relazione romantica con Ann, iniziata entro il 24
// dicembre» o «nessuna relazione romantica» (le condizioni `relazione-romantica` e `relazioni-romantiche`): i doni «se fidanzata» le
// riceveranno con la loro migrazione (O11-2). Un dono vale solo se ogni condizione della regola è verde; una regola vuota non vale. Sola lettura.
// Revisione di O11-1 (prestazioni: le copie di un oggetto si leggono per ogni oggetto di un elenco): chi legge le copie di un oggetto chiede
// solo i suoi doni (`catalogo`), e le regole fatte solo di ranghi, Doti, giorno e relazioni si valutano sullo stato essenziale
// (`statoPartitaEssenziale`), non su quello completo con Palazzi, scorta, pesca e meteo; il valutatore resta quello unico.
// ============================================================

import { prepared } from '../db/dbService.js';
import { condizioneConTesto, leggiCondizioniSalvate, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';
import { valutaInsieme } from './condizioni/valutatore.js';
import { bastaLoStatoEssenziale, statoPartitaEssenziale, statoPartitaSemafori } from './semaforiService.js';
import { dotiSociali, ranghiConfidenti } from './partiteService.js';
import { statoDisponibilitaPartita } from './disponibilitaService.js';

export interface DonoConfidenteOttenuto { catalogo: string; quantita: number; confidente: string; nota: string | null }

const haColonnaCondizioni = (): boolean => !!prepared("SELECT 1 FROM pragma_table_info('ricompensa_oggetto') WHERE name = 'condizioni_json'").get();

/** Vero se una condizione (anche dentro `gruppo` e `non`) legge le Doti: solo allora lo stato essenziale le legge (sono la lettura più costosa). */
function usaLeDoti(condizioni: readonly RequisitoSpillo[]): boolean {
  return condizioni.some((c) => c.tipo === 'dote' || (c.tipo === 'gruppo' && usaLeDoti(c.condizioni)) || (c.tipo === 'non' && usaLeDoti([c.condizione])));
}

/** Vero se una condizione (anche dentro `gruppo` e `non`) cita una voce della guida di un Palazzo (`voce-guida`). */
function usaLeVociDellaGuida(condizioni: readonly RequisitoSpillo[]): boolean {
  return condizioni.some((c) => c.tipo === 'voce-guida' || (c.tipo === 'gruppo' && usaLeVociDellaGuida(c.condizioni)) || (c.tipo === 'non' && usaLeVociDellaGuida([c.condizione])));
}

type RigaDono = { fonte_chiave: string; catalogo_chiave: string; quantita: number; nota: string | null; condizioni_json: string };

/** I doni dei Confidenti che la partita ha meritato adesso, in ordine di catalogo; con `catalogo`, solo quelli di quell'oggetto (chi legge le
 *  copie di un oggetto non paga la valutazione degli altri doni, e un oggetto senza doni non legge la partita). Vuoto se la colonna della regola
 *  non c'è ancora. */
export function doniConfidentiOttenuti(partitaId: number, catalogo?: string): DonoConfidenteOttenuto[] {
  if (!haColonnaCondizioni()) return [];
  const base = "SELECT fonte_chiave, catalogo_chiave, COALESCE(quantita, 1) AS quantita, nota, condizioni_json FROM ricompensa_oggetto WHERE fonte_tipo = 'confidente' AND condizioni_json IS NOT NULL";
  const righe = (catalogo === undefined
    ? prepared(`${base} ORDER BY ordine, catalogo_chiave`).all()
    : prepared(`${base} AND catalogo_chiave = ? ORDER BY ordine, catalogo_chiave`).all(catalogo)) as RigaDono[];
  const regole = righe.map((r) => ({ riga: r, regola: leggiCondizioniSalvate(r.condizioni_json) })).filter((x) => x.regola.length > 0);
  // una partita che non c'è non ha meritato niente (come prima: nessun errore da chi legge le copie di un oggetto)
  if (!regole.length || !prepared('SELECT 1 FROM utente.partita WHERE id = ?').get(partitaId)) return [];
  // lo stato della partita, letto una volta per tutti i doni. Revisione di O11-1 (prestazioni): se le regole usano solo ranghi, Doti, giorno e
  // relazioni romantiche basta lo stato essenziale (stesso esito del valutatore unico, senza Palazzi, scorta, pesca e meteo); una regola con un
  // altro tipo di condizione si valuta sullo stato completo dei semafori, mai su uno stato che non la sa dire
  const essenziale = regole.every((x) => bastaLoStatoEssenziale(x.regola));
  const usaDoti = regole.some((x) => usaLeDoti(x.regola));
  const doti = !essenziale || usaDoti ? new Map(dotiSociali(partitaId).map((d) => [d.chiave, d.rango])) : new Map<string, number>();
  // una regola che cita una voce della guida (il rampino che Morgana dà nel Palazzo di Kamoshida, migrazione 332) vuole le voci segnate della
  // partita, che stanno solo nello stato completo della disponibilità
  const st = essenziale ? statoPartitaEssenziale(partitaId, ranghiConfidenti(partitaId), doti)
    : regole.some((x) => usaLeVociDellaGuida(x.regola)) ? statoDisponibilitaPartita(partitaId) : statoPartitaSemafori(partitaId, ranghiConfidenti(partitaId), doti);
  const nomi = nomiCondizioniMemo();
  return regole
    .filter(({ regola }) => valutaInsieme(regola.map((c) => condizioneConTesto(c, nomi)), st, { nomi }).requisiti.every((q) => q.stato === 'verde'))
    .map(({ riga: r }) => ({ catalogo: r.catalogo_chiave, quantita: r.quantita, confidente: r.fonte_chiave, nota: r.nota }));
}
