// ============================================================
// LineaDelTempo — la finestra di un Palazzo (o dei Memento) in tappe, nell'intestazione della sua scheda (`DungeonDettaglioPage`)
// ============================================================

import { IconaSegno, type ChiaveSegno } from '../shared/IconaAzione';
import { dataGiocoBreve, dataGiocoTesto } from '../../utils/dateGioco';
import type { DungeonDettaglioDto } from '../../types';

/** Le date di un Palazzo come una linea: si apre, conviene rubare, la lettera di sfida entro, scade (L13 O6-3: da una fonte sola, le date
 *  MM-GG della scheda; quel che la guida diceva in più sta nelle note). Mostrate «22 apr»; la data per esteso nel `title`. */
const TAPPE = [
  { chiave: 'dal', etichetta: 'Si apre', tono: 'bg-white/10 text-text', segno: 'si-apre' },
  { chiave: 'furtoConsigliato', etichetta: 'Furto consigliato', tono: 'bg-oro/15 text-oro', segno: 'furto' },
  // il termine della lettera è un limite come la scadenza: lo stesso segno, col tono del consiglio (l'oro) perché viene prima
  { chiave: 'letteraEntro', etichetta: 'Lettera entro', tono: 'bg-oro/15 text-oro', segno: 'scade' },
  { chiave: 'al', etichetta: 'Scade', tono: 'bg-primary/20 text-primary-testo', segno: 'scade' },
] as const satisfies ReadonlyArray<{ chiave: keyof DungeonDettaglioDto['date']; etichetta: string; tono: string; segno: ChiaveSegno }>;

/** La finestra del Palazzo (o dei Memento) in tappe. Nei Palazzi (LAY3-5, regola dell'utente «intestazione al massimo il 30% della
 *  schermata») la tappa è compatta a ogni larghezza, come era da 1024 px (R3-41): segno e data su una riga, l'etichetta per chi non vede e
 *  nel suggerimento, niente frecce; nei Memento resta com'era (compatta da 1024 px). */
export function LineaDelTempo({ date, memento = false }: { date: DungeonDettaglioDto['date']; memento?: boolean }) {
  const tappe = TAPPE.flatMap((t) => { const valore = date[t.chiave]; return valore ? [{ ...t, valore }] : []; });
  if (tappe.length === 0) return null;
  return (
    <ol className={`m-0 flex list-none flex-wrap items-stretch p-0 ${memento ? 'gap-1.5' : 'gap-1 lg:gap-1.5'}`} aria-label={memento ? 'Finestra dei Memento' : 'Finestra del Palazzo'}>
      {tappe.map((t, i) => (
        <li key={t.chiave} className="flex items-stretch gap-1.5">
          {/* Le tappe vanno a capo sugli schermi stretti, e una freccia a inizio riga non collega
              più niente: da lì in giù l'ordine lo dicono già le etichette. */}
          {/* da 1024 px niente frecce: l'ordine lo dicono i segni delle tappe, e la riga sotto il titolo deve stare su una riga (R3-41) */}
          {i > 0 && memento && <span aria-hidden className="hidden self-center text-text-muted sm:inline lg:hidden">→</span>}
          {/* Da 1024 px (R3-41; nei Palazzi a ogni larghezza, LAY3-5) la tappa sta su una riga: segno e data, l'etichetta per chi non vede
              e nel suggerimento */}
          <span className={`${memento ? 'flex flex-col gap-0.5 rounded-md px-2.5 py-1.5 lg:flex-row lg:items-center lg:gap-1 lg:px-1.5 lg:py-1' : 'flex flex-row items-center gap-1 rounded-md px-1 py-1 lg:px-1.5'} ${t.tono}`} title={`${t.etichetta}: ${dataGiocoTesto(t.valore)}`}>
            {/* segno ed etichetta all'opacità piena (regola dell'utente «opacità al 100%», UX3-11): erano a 0,80 */}
            <span className="flex items-center gap-1.5 testo-12 uppercase tracking-[0.08em]"><IconaSegno chiave={t.segno} dimensione={14} /><span className={memento ? 'lg:sr-only' : 'sr-only'}>{t.etichetta}</span></span>
            {/* L13 O6-3: ogni tappa è una data di gioco, «22 apr» (le frasi di Shido e Maruki che a 1024×690 alzavano l'intestazione, LAY3-4,
                non ci sono più: stanno nelle note). Corta a ogni larghezza: l'intestazione resta entro il 30% (LAY3-5, R3-41). */}
            <span className={`whitespace-nowrap font-display leading-none ${memento ? 'testo-17 lg:testo-14' : 'testo-14'}`}>{dataGiocoBreve(t.valore)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
