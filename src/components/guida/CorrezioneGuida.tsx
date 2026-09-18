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

interface Props {
  /** Che cosa si sta correggendo, per il pulsante e per chi legge con lo schermo («l’area», «il punto «Sicura»»). */
  cosa: string;
  /** I campi del modulo: li disegna chi chiama, perché cambiano da caso a caso. */
  children: (chiudi: () => void) => ReactNode;
  /** Salvataggio: torna la promessa del server. Se fallisce il modulo resta aperto con quel che avevi scritto. */
  onSalva: () => Promise<unknown>;
  /** Vero quando c'è qualcosa da salvare. */
  modificato: boolean;
  /** Se c'è, compare «Elimina» con conferma; il testo è quello che si legge prima di cancellare. */
  elimina?: { avviso: string; onElimina: () => Promise<unknown> };
  compatto?: boolean;
}

export function CorrezioneGuida({ cosa, children, onSalva, modificato, elimina, compatto }: Props) {
  const [aperto, setAperto] = useState(false);
  const [occupato, setOccupato] = useState(false);
  const [conferma, setConferma] = useState(false);

  const salva = async () => {
    setOccupato(true);
    try { await onSalva(); setAperto(false); notifica('success', `Correzione salvata: ${cosa}.`); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Correzione non salvata.'); }
    finally { setOccupato(false); }
  };

  if (!aperto) {
    return (
      <button type="button" className={`touch shrink-0 rounded px-1.5 text-text-muted hover:text-text ${compatto ? 'text-[11px]' : 'text-[12px]'}`}
        aria-label={`Correggi ${cosa}`} title={`Correggi ${cosa}`} onClick={() => setAperto(true)}>
        ✎
      </button>
    );
  }
  return (
    <form className="flex w-full flex-col gap-2 rounded-md border border-border-light bg-white/[0.04] px-2 py-2"
      aria-label={`Correggi ${cosa}`} onSubmit={(e) => { e.preventDefault(); void salva(); }}>
      <div className="flex flex-wrap items-end gap-2">{children(() => setAperto(false))}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva" disabled={occupato || !modificato} />
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={() => { setAperto(false); setConferma(false); }} />
        <span className="flex-1" />
        {elimina && !conferma && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" disabled={occupato} onClick={() => setConferma(true)} />}
        {elimina && conferma && (
          <span className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {elimina.avviso}
            <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Confermo" disabled={occupato}
              onClick={() => { setOccupato(true); void elimina.onElimina().then(() => notifica('success', `Eliminato: ${cosa}.`)).catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Eliminazione non riuscita.')).finally(() => { setOccupato(false); setAperto(false); setConferma(false); }); }} />
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="No" onClick={() => setConferma(false)} />
          </span>
        )}
      </div>
    </form>
  );
}
