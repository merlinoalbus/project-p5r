// ============================================================
// CorrezioneGuida — correggere i testi della guida dove si leggono
// ============================================================
//
// La sezione dei Palazzi era l'unica parte della guida in sola lettura: negozi, luoghi, libri e
// film hanno il loro modulo da un pezzo, mentre il nome di un'area, la descrizione di un punto o
// le date di un Palazzo si potevano solo guardare. Sono trascrizioni fatte a mano da un sito:
// hanno refusi, frasi tagliate a metà e titoli discutibili, e vanno corretti **dove si leggono**,
// non in una schermata a parte — altrimenti bisogna ricordarsi che cosa non andava.
//
// Perciò qui non c'è un modulo: c'è la matita accanto al testo. Chiusa non si vede quasi; aperta
// mostra i campi di quel pezzo e basta. Le correzioni sono dati di gioco, valgono per tutte le
// partite ed entrano nel pacchetto quando lo si rigenera.
//
// **La bozza vive dentro questo componente**, e non nella pagina (rilievo della revisione,
// 2026-09-18). Tenuta fuori era una sola per tutta la schermata: bastava scrivere in un'area e poi
// aprire un altro punto perché il secondo modulo mostrasse il testo del primo e lo salvasse sulla
// chiave sbagliata. Qui ogni matita ha la sua, e si azzera da sé quando il modulo si chiude.
// ============================================================

import { useState, type ReactNode } from 'react';
import { notifica } from '../../stores/notificationStore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

interface PropsCampo {
  etichetta: string;
  valore: string;
  onCambia: (v: string) => void;
  multilinea?: boolean;
  massimo?: number;
}

/** Un campo del modulo di correzione: la stessa forma per titoli, date e prose. */
export function CampoCorrezione({ etichetta, valore, onCambia, multilinea, massimo = 400 }: PropsCampo) {
  return (
    <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[12px]">
      {etichetta}
      {multilinea
        ? <textarea className="form-input min-h-[70px]" value={valore} maxLength={massimo} onChange={(e) => onCambia(e.target.value)} />
        : <input className="form-input" value={valore} maxLength={massimo} onChange={(e) => onCambia(e.target.value)} />}
    </label>
  );
}

interface Props<T extends Record<string, string>> {
  /** Che cosa si sta correggendo, per il pulsante e per chi legge con lo schermo («l’area «Tetto»»). */
  cosa: string;
  /** I valori di partenza, letti all'apertura: è anche il metro per capire se c'è qualcosa da salvare. */
  iniziale: () => T;
  /** I campi del modulo: li disegna chi chiama, perché cambiano da caso a caso. */
  children: (bozza: T, cambia: (patch: Partial<T>) => void) => ReactNode;
  onSalva: (bozza: T) => Promise<unknown>;
  /** Se c'è, compare «Elimina» con conferma; il testo è quello che si legge prima di cancellare. */
  elimina?: { avviso: string; onElimina: () => Promise<unknown> };
  compatto?: boolean;
  /** Testo accanto alla matita. Serve dove il comando finisce da solo su una riga: un glifo
      isolato sembra un refuso, due parole dicono che cosa fa. */
  etichetta?: string;
}

export function CorrezioneGuida<T extends Record<string, string>>({ cosa, iniziale, children, onSalva, elimina, compatto, etichetta }: Props<T>) {
  const [bozza, setBozza] = useState<{ partenza: T; corrente: T } | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [conferma, setConferma] = useState(false);
  const chiudi = () => { setBozza(null); setConferma(false); };

  const salva = async () => {
    if (!bozza) return;
    setOccupato(true);
    try { await onSalva(bozza.corrente); chiudi(); notifica('success', `Correzione salvata: ${cosa}.`); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Correzione non salvata.'); }
    finally { setOccupato(false); }
  };

  if (!bozza) {
    return (
      <button type="button" className={`touch shrink-0 rounded px-1.5 text-text-muted hover:text-text ${compatto ? 'text-[11px]' : 'text-[12px]'}`}
        aria-label={`Correggi ${cosa}`} title={`Correggi ${cosa}`}
        onClick={() => { const v = iniziale(); setBozza({ partenza: v, corrente: v }); }}>
        ✎{etichetta ? <span className="ml-1">{etichetta}</span> : null}
      </button>
    );
  }
  const modificato = JSON.stringify(bozza.corrente) !== JSON.stringify(bozza.partenza);
  return (
    <form className="flex w-full flex-col gap-2 rounded-md border border-border-light bg-white/[0.04] px-2 py-2"
      aria-label={`Correggi ${cosa}`} onSubmit={(e) => { e.preventDefault(); void salva(); }}>
      <div className="flex flex-wrap items-end gap-2">
        {children(bozza.corrente, (patch) => setBozza((b) => (b ? { ...b, corrente: { ...b.corrente, ...patch } } : b)))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva" disabled={occupato || !modificato} />
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={chiudi} />
        <span className="flex-1" />
        {elimina && !conferma && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" disabled={occupato} onClick={() => setConferma(true)} />}
        {elimina && conferma && (
          <span className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {elimina.avviso}
            <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Confermo" disabled={occupato}
              onClick={() => { setOccupato(true); void elimina.onElimina().then(() => { notifica('success', `Eliminato: ${cosa}.`); chiudi(); }).catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Eliminazione non riuscita.')).finally(() => setOccupato(false)); }} />
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="No" onClick={() => setConferma(false)} />
          </span>
        )}
      </div>
    </form>
  );
}
