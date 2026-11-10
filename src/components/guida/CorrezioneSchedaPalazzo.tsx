// ============================================================
// CorrezioneSchedaPalazzo — «Correggi la scheda» di un Palazzo o dei Memento: nome, sovrano, date, livello consigliato e note
// ============================================================
//
// Nei Memento è il pulsante ✎ dell'intestazione, in «Modifica la guida»; nei Palazzi (lotto B) si apre dal menu «Modifica ⋯» (`onChiudi`).
// L9-05: è una finestra (`FinestraModifica`, come le altre), col piè fisso: in linea sotto l'intestazione «Salva» finiva a y=1610 sul telefono.
// Le date seguono la regola del server (`shared/datePalazzo`), detta prima di salvare; le quattro date stanno ognuna sotto il suo nome.
// ============================================================

import { useState } from 'react';
import { aggiornaDungeon } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { erroreDatePalazzo, type DatePalazzo } from '../../../shared/datePalazzo';
import { Campo, CampoTesto, SezioneCampi } from '../shared/Campo';
import { FinestraModifica } from '../shared/FinestraModifica';
import { SelettoreData } from '../shared/SelettoreData';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';
import type { DungeonDettaglioDto } from '../../types';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** La bozza della finestra: tutto come testo; le date MM-GG, '' = nessuna (per la scadenza: senza fine), come vuole `SelettoreData`. */
interface BozzaDate { dal: string; al: string; furto: string; lettera: string }
interface Bozza extends BozzaDate { nome: string; sovrano: string; livelloMin: string; livelloMax: string; note: string }
// L9-08: la lettera calcolata (la scadenza meno un giorno) non è un dato scritto: nel campo resta vuota, e il termine lo dice la linea del tempo
const bozzaDate = (date: DungeonDettaglioDto['date']): BozzaDate => ({ dal: date.dal ?? '', al: date.al ?? '', furto: date.furtoConsigliato ?? '', lettera: date.letteraCalcolata ? '' : date.letteraEntro ?? '' });
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

interface Props { d: DungeonDettaglioDto; memento: boolean; onChiudi?: () => void; onSalvato: () => Promise<unknown> }

/** La correzione della scheda (nome, sovrano, date, livello, note): con `onChiudi` è la finestra già aperta da fuori (il menu del Palazzo),
 *  senza è il pulsante ✎ che la apre (i Memento). `onSalvato` rilegge la scheda dopo il salvataggio. */
// nel rilascio (sola lettura) la correzione non esiste; la condizione è costante di build, `CorrezioneSchedaReale` esce dal bundle
export const CorrezioneSchedaPalazzo: StrumentoDiModifica<typeof CorrezioneSchedaReale> = IN_RILASCIO ? NienteInRilascio : CorrezioneSchedaReale;
function CorrezioneSchedaReale({ d, memento, onChiudi, onSalvato }: Props) {
  const [aperta, setAperta] = useState(false);
  if (onChiudi) return <FinestraScheda d={d} memento={memento} onChiudi={onChiudi} onSalvato={onSalvato} />;
  return (
    <>
      <button type="button" className="touch shrink-0 rounded px-1.5 testo-12 text-text-muted hover:text-text" aria-haspopup="dialog" aria-label="Correggi la scheda: i Memento" title="Correggi i Memento" onClick={() => setAperta(true)}>
        ✎<span className="ml-1">Correggi la scheda</span>
      </button>
      {aperta && <FinestraScheda d={d} memento={memento} onChiudi={() => setAperta(false)} onSalvato={onSalvato} />}
    </>
  );
}

/** La finestra: si monta all'apertura, così la bozza riparte ogni volta dai dati della pagina. */
function FinestraScheda({ d, memento, onChiudi, onSalvato }: Props & { onChiudi: () => void }) {
  const cosa = memento ? 'i Memento' : `il Palazzo «${d.nome}»`;
  const [partenza] = useState<Bozza>(() => ({ nome: d.nome, sovrano: d.sovrano, livelloMin: numeroInBozza(d.livelloConsigliato.min), livelloMax: numeroInBozza(d.livelloConsigliato.max), note: d.note, ...bozzaDate(d.date) }));
  const [b, setB] = useState(partenza);
  const [occupato, setOccupato] = useState(false);
  const cambia = (patch: Partial<Bozza>) => setB((x) => ({ ...x, ...patch }));
  const modificata = JSON.stringify(b) !== JSON.stringify(partenza);
  useBozzaSporca('correzione-scheda-palazzo', `correzione «${cosa}»`, modificata);
  // L13 O6-3: «senza fine» solo dove il gioco non fissa una scadenza, come vuole il server: i Memento e i Palazzi col boss dei Memento (Iweleth)
  const senzaFinePossibile = memento || d.regolaBoss === 'memento';
  // la regola del server, detta prima di salvare; solo se le date sono state toccate (una scheda senza finestra resta salvabile)
  const errore = dateCambiate(b, d.date) ? erroreDatePalazzo(dateDellaBozza(b), senzaFinePossibile)?.messaggio : null;

  /** Salva e chiude; se il server (o il livello) non va, la finestra resta aperta con la bozza e l'errore si legge nella notifica. */
  const salva = async () => {
    setOccupato(true);
    try {
      const testi = { nome: b.nome, sovrano: b.sovrano, livelloConsigliato: livelloDellaBozza(b.livelloMin, b.livelloMax), note: b.note };
      // le date si mandano solo se sono cambiate: senza, la scheda di un posto senza finestra si salverebbe con una data vuota. Una data
      // rovesciata o mancante non parte: il messaggio è quello del server (la stessa regola, `shared/datePalazzo`)
      const date = dateDellaBozza(b);
      if (dateCambiate(b, d.date)) {
        const erroreDate = erroreDatePalazzo(date, senzaFinePossibile);
        if (erroreDate || !date.dal) throw new Error(erroreDate?.messaggio ?? 'Manca il giorno in cui si apre.');
        await aggiornaDungeon(d.chiave, { ...testi, date: { ...date, dal: date.dal } });
      } else await aggiornaDungeon(d.chiave, testi);
      await onSalvato();
      notifica('success', `Correzione salvata: ${cosa}.`);
      onChiudi();
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Correzione non salvata.'); }
    finally { setOccupato(false); }
  };

  return (
    <FinestraModifica titolo={`Correggi la scheda — ${d.nome}`} nomeModulo={`Correggi ${cosa}`} onChiudi={onChiudi} onSalva={salva} salvabile={modificata && !errore} occupato={occupato} sporca={modificata}>
      <SezioneCampi titolo="Scheda">
        <CampoTesto etichetta="Nome" valore={b.nome} massimo={LIMITI_GUIDA.dungeon.nome} onCambia={(v) => cambia({ nome: v })} />
        <CampoTesto etichetta="Sovrano" valore={b.sovrano} massimo={LIMITI_GUIDA.dungeon.sovrano} onCambia={(v) => cambia({ sovrano: v })} />
        {/* L8-04 (D5): il livello consigliato minimo e massimo (vuoto = la fonte non lo dice); il confronto delle fonti è la nota storica */}
        <CampoTesto tipo="numero" etichetta="Livello consigliato minimo" valore={b.livelloMin} massimo={2} onCambia={(v) => cambia({ livelloMin: v })} />
        <CampoTesto tipo="numero" etichetta="Livello consigliato massimo" valore={b.livelloMax} massimo={2} onCambia={(v) => cambia({ livelloMax: v })} />
      </SezioneCampi>
      {/* L13 O6-3: un solo editor delle date del Palazzo, giorni del calendario di gioco. La finestra è anche quella della mappa di Tokyo e
          dell'arco della storia. Ogni data ha il suo nome sopra e il proprio posto, nell'ordine in cui avvengono (L9-05). */}
      <SezioneCampi titolo={memento ? 'Date dei Memento' : 'Date del Palazzo'}>
        <Campo etichetta="Si apre" senzaGruppo><SelettoreData etichetta="Si apre" valore={b.dal} onCambia={(v) => cambia({ dal: v })} /></Campo>
        {!memento && <Campo etichetta="Furto consigliato" senzaGruppo><SelettoreData etichetta="Furto consigliato" facoltativa valore={b.furto} onCambia={(v) => cambia({ furto: v })} /></Campo>}
        {!memento && <Campo etichetta="Lettera entro" senzaGruppo><SelettoreData etichetta="Lettera entro" facoltativa valore={b.lettera} onCambia={(v) => cambia({ lettera: v })} /></Campo>}
        <Campo etichetta="Scade" senzaGruppo>
          <span className="flex flex-col gap-1">
            {(!senzaFinePossibile || b.al !== '') && <SelettoreData etichetta="Scade" valore={b.al} onCambia={(v) => cambia({ al: v })} />}
            {senzaFinePossibile && (
              <label className="touch flex items-center gap-1.5 testo-12">
                <input type="checkbox" className="h-5 w-5" checked={b.al === ''} onChange={(e) => cambia({ al: e.target.checked ? '' : b.dal })} />Senza fine
              </label>
            )}
          </span>
        </Campo>
        {errore && <p className="campo--largo m-0 testo-12 text-error-testo" role="alert">{errore}</p>}
      </SezioneCampi>
      <CampoTesto tipo="lungo" righe={3} etichetta="Note della guida" valore={b.note} massimo={LIMITI_GUIDA.dungeon.note} onCambia={(v) => cambia({ note: v })} />
    </FinestraModifica>
  );
}
