// ============================================================
// CorrezioneSchedaPalazzo — «Correggi la scheda» di un Palazzo o dei Memento: nome, sovrano, date, livello consigliato e note
// ============================================================
//
// Nei Memento è il pulsante ✎ dell'intestazione, in «Modifica la guida»; nei Palazzi (lotto B) si apre dal menu «Modifica ⋯» e il modulo
// sta sotto l'intestazione (`onChiudi`). Le date seguono la regola del server (`shared/datePalazzo`), detta prima di salvare.
// ============================================================

import { aggiornaDungeon } from '../../services/api';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { erroreDatePalazzo, type DatePalazzo } from '../../../shared/datePalazzo';
import { CampoCorrezione, CorrezioneGuida } from './CorrezioneGuida';
import { CampoTesto } from '../shared/Campo';
import { SelettoreData } from '../shared/SelettoreData';
import type { DungeonDettaglioDto } from '../../types';

/** Le date nella bozza di «Correggi la scheda»: MM-GG, '' = nessuna (per la scadenza: senza fine), come vuole `SelettoreData`. */
interface BozzaDate { dal: string; al: string; furto: string; lettera: string }
const bozzaDate = (date: DungeonDettaglioDto['date']): BozzaDate => ({ dal: date.dal ?? '', al: date.al ?? '', furto: date.furtoConsigliato ?? '', lettera: date.letteraEntro ?? '' });
/** Le date della bozza come le vuole la regola (e il server): '' diventa null. */
const dateDellaBozza = (b: BozzaDate): DatePalazzo => ({ dal: b.dal || null, al: b.al || null, furtoConsigliato: b.furto || null, letteraEntro: b.lettera || null });
/** Le date della bozza sono diverse da quelle salvate? */
const dateCambiate = (b: BozzaDate, date: DungeonDettaglioDto['date']): boolean => { const s = bozzaDate(date); return b.dal !== s.dal || b.al !== s.al || b.furto !== s.furto || b.lettera !== s.lettera; };

/** L8-04: un livello nella bozza come testo ('' = la fonte non lo dice). */
const numeroInBozza = (n: number | null): string => (n === null ? '' : String(n));
/** Il livello consigliato della bozza come lo vuole il server: interi da 1 a `livelloMassimo`, '' = null, il minimo non sopra il massimo. */
function livelloDellaBozza(min: string, max: string): { min: number | null; max: number | null } {
  const leggi = (v: string, quale: string): number | null => {
    if (!v.trim()) return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > LIMITI_GUIDA.dungeon.livelloMassimo) throw new Error(`Il livello consigliato ${quale} va da 1 a ${LIMITI_GUIDA.dungeon.livelloMassimo}.`);
    return n;
  };
  const l = { min: leggi(min, 'minimo'), max: leggi(max, 'massimo') };
  if (l.min !== null && l.max !== null && l.min > l.max) throw new Error('Il livello consigliato minimo non può superare il massimo.');
  return l;
}

/** La correzione della scheda (nome, sovrano, date, livello, note); con `onChiudi` è aperta e si chiude da sé. `onSalvato` rilegge la
 *  scheda dopo il salvataggio. */
export function CorrezioneSchedaPalazzo({ d, memento, onChiudi, onSalvato }: { d: DungeonDettaglioDto; memento: boolean; onChiudi?: () => void; onSalvato: () => Promise<unknown> }) {
  // L13 O6-3: «senza fine» solo dove il gioco non fissa una scadenza, come vuole il server: i Memento e i Palazzi col boss dei Memento (Iweleth)
  const senzaFinePossibile = memento || d.regolaBoss === 'memento';
  return (
    <CorrezioneGuida cosa={memento ? 'i Memento' : `il Palazzo «${d.nome}»`} larga etichetta="Correggi la scheda"
      {...(onChiudi ? { aperta: true, onChiudi } : {})}
      iniziale={() => ({ nome: d.nome, sovrano: d.sovrano, livelloMin: numeroInBozza(d.livelloConsigliato.min), livelloMax: numeroInBozza(d.livelloConsigliato.max), note: d.note, ...bozzaDate(d.date) })}
      onSalva={async (b) => {
        const testi = { nome: b.nome, sovrano: b.sovrano, livelloConsigliato: livelloDellaBozza(b.livelloMin, b.livelloMax), note: b.note };
        // le date si mandano solo se sono cambiate: senza, la scheda di un posto senza finestra si salverebbe con una data vuota. Una data
        // rovesciata o mancante non parte: il messaggio è quello del server (la stessa regola, `shared/datePalazzo`)
        const date = dateDellaBozza(b);
        if (dateCambiate(b, d.date)) {
          const errore = erroreDatePalazzo(date, senzaFinePossibile);
          if (errore || !date.dal) throw new Error(errore?.messaggio ?? 'Manca il giorno in cui si apre.');
          await aggiornaDungeon(d.chiave, { ...testi, date: { ...date, dal: date.dal } });
        } else await aggiornaDungeon(d.chiave, testi);
        await onSalvato();
      }}>
      {(b, cambia) => {
        /** Un campo del modulo di correzione legato alla chiave della bozza, con etichetta, limite di lunghezza ed eventuale testo su più righe. */
        const campo = (k: keyof typeof b & string, etichetta: string, massimo: number, multilinea?: boolean) => <CampoCorrezione key={k} etichetta={etichetta} valore={b[k]} multilinea={multilinea} massimo={massimo} onCambia={(v) => cambia({ [k]: v } as Partial<typeof b>)} />;
        // la regola del server, detta prima di salvare; solo se le date sono state toccate (una scheda senza finestra resta salvabile)
        const errore = dateCambiate(b, d.date) ? erroreDatePalazzo(dateDellaBozza(b), senzaFinePossibile)?.messaggio : null;
        return <>
          {campo('nome', 'Nome', LIMITI_GUIDA.dungeon.nome)}{campo('sovrano', 'Sovrano', LIMITI_GUIDA.dungeon.sovrano)}
          {/* L13 O6-3: un solo editor delle date del Palazzo, giorni del calendario di gioco (prima tre testi qui e la finestra in «Sulla
              mappa di Tokyo»). La finestra è anche quella della mappa di Tokyo e dell'arco della storia. */}
          <fieldset className="m-0 flex w-full basis-full flex-col gap-2 border-0 p-0">
            <legend className="mb-1 p-0 testo-12 uppercase tracking-[0.08em] text-text-secondary">{memento ? 'Date dei Memento' : 'Date del Palazzo'}</legend>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <SelettoreData etichetta="Si apre" valore={b.dal} onCambia={(v) => cambia({ dal: v })} />
              {!memento && <SelettoreData etichetta="Furto consigliato" facoltativa valore={b.furto} onCambia={(v) => cambia({ furto: v })} />}
              {!memento && <SelettoreData etichetta="Lettera entro" facoltativa valore={b.lettera} onCambia={(v) => cambia({ lettera: v })} />}
              {senzaFinePossibile && (
                <label className="touch flex items-center gap-1.5 testo-12">
                  <input type="checkbox" className="h-5 w-5" checked={b.al === ''} onChange={(e) => cambia({ al: e.target.checked ? '' : b.dal })} />Senza fine
                </label>
              )}
              {(!senzaFinePossibile || b.al !== '') && <SelettoreData etichetta="Scade" valore={b.al} onCambia={(v) => cambia({ al: v })} />}
            </div>
            {errore && <p className="m-0 testo-12 text-error-testo" role="alert">{errore}</p>}
          </fieldset>
          {/* L8-04 (D5): il livello consigliato minimo e massimo (vuoto = la fonte non lo dice); il confronto delle fonti è la nota storica */}
          <CampoTesto className="min-w-[140px] flex-1" tipo="numero" etichetta="Livello consigliato minimo" valore={b.livelloMin} massimo={2} onCambia={(v) => cambia({ livelloMin: v })} />
          <CampoTesto className="min-w-[140px] flex-1" tipo="numero" etichetta="Livello consigliato massimo" valore={b.livelloMax} massimo={2} onCambia={(v) => cambia({ livelloMax: v })} />
          {campo('note', 'Note della guida', LIMITI_GUIDA.dungeon.note, true)}
        </>; }}
    </CorrezioneGuida>
  );
}
