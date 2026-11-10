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
// Perciò qui non c'è un modulo a parte: c'è la matita accanto al testo. Chiusa non si vede quasi; aperta
// è la finestra di modifica comune (`FinestraModifica`) con i campi di quel pezzo e basta, e il piè fisso
// con Elimina / Annulla / Salva. Le correzioni sono dati di gioco, valgono per tutte le partite.
//
// **La bozza vive dentro questo componente**, e non nella pagina (rilievo della revisione,
// 2026-09-18). Tenuta fuori era una sola per tutta la schermata: bastava scrivere in un'area e poi
// aprire un altro punto perché il secondo modulo mostrasse il testo del primo e lo salvasse sulla
// chiave sbagliata. Qui ogni matita ha la sua, e si azzera da sé quando il modulo si chiude.
// ============================================================

import { useState, type ReactNode } from 'react';
import { notifica } from '../../stores/notificationStore';
import { conferma } from '../../stores/confermaStore';
import { FinestraModifica } from '../shared/FinestraModifica';
import { CampoTesto } from '../shared/Campo';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import { NienteInRilascio } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

interface PropsCampo {
  etichetta: string;
  valore: string;
  onCambia: (v: string) => void;
  multilinea?: boolean;
  massimo?: number;
}

/** Un campo del modulo di correzione: la stessa forma per titoli, date e prose. Dal L13 è il `CampoTesto` condiviso (etichetta sopra, 44 px,
 *  il testo lungo si allunga da sé); in una riga di campi (`flex-wrap`) occupa almeno 180 px e si divide lo spazio con gli altri. */
export function CampoCorrezione({ etichetta, valore, onCambia, multilinea, massimo = 400 }: PropsCampo) {
  return <CampoTesto className="min-w-[180px] flex-1" etichetta={etichetta} valore={valore} onCambia={onCambia} tipo={multilinea ? 'lungo' : 'testo'} righe={3} massimo={massimo} />;
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
  /** Finestra larga (860 px) invece che stretta (520 px): per i moduli con molti campi (la voce, la scheda del Palazzo). */
  larga?: boolean;
  /** Testo accanto alla matita. Serve dove il comando finisce da solo su una riga: un glifo
      isolato sembra un refuso, due parole dicono che cosa fa. */
  etichetta?: string;
  /** Aperta da fuori (per esempio da un menu, scheda del Palazzo da 1024 px, R3-41): con `aperta` il modulo si apre senza il pulsante,
   *  chiuso non si disegna niente, e `onChiudi` dice che il modulo si è chiuso (salvato, annullato o eliminato). */
  aperta?: boolean;
  onChiudi?: () => void;
  /** Classe della scritta accanto alla matita: per esempio `lg:sr-only`, solo icona da 1024 px (intestazione del Palazzo, R3-41); il
   *  nome accessibile resta «<etichetta>: <cosa>». */
  classeEtichetta?: string;
}

/**
 * La matita di correzione di un pezzo della guida. Chiusa è un pulsante «✎» (con `etichetta` accanto, se c'è); al
 * clic legge i valori di partenza con `iniziale()` e apre un modulo con i campi disegnati da `children`, che riceve la
 * bozza e la funzione per aggiornarla. «Salva» è attivo solo se la bozza differisce dalla partenza; con `elimina` c'è
 * anche «Elimina», che chiede conferma mostrando l'avviso. Chiudere il modulo scarta la bozza.
 */
// L12 (passo 8): nel rilascio (sola lettura) la matita di correzione non esiste; la condizione è costante di build, `CorrezioneGuidaReale` esce dal bundle.
// Il componente è generico: l'asserzione di tipo conserva `T` (con `StrumentoDiModifica` si perderebbe).
export const CorrezioneGuida = (IN_RILASCIO ? NienteInRilascio : CorrezioneGuidaReale) as typeof CorrezioneGuidaReale;
function CorrezioneGuidaReale<T extends Record<string, string>>({ cosa, iniziale, children, onSalva, elimina, etichetta, aperta, onChiudi, classeEtichetta, larga }: Props<T>) {
  const controllata = aperta !== undefined;
  // aperta da fuori: la bozza parte dai valori del momento dell'apertura, come col pulsante
  const [bozza, setBozza] = useState<{ partenza: T; corrente: T } | null>(() => {
    if (!aperta) return null;
    const v = iniziale();
    return { partenza: v, corrente: v };
  });
  const [occupato, setOccupato] = useState(false);
  // modulo aperto con un testo cambiato e non ancora salvato: «Aggiorna» e la chiusura della scheda lo nominano e chiedono conferma
  const modificato = bozza !== null && JSON.stringify(bozza.corrente) !== JSON.stringify(bozza.partenza);
  useBozzaSporca('correzione-guida', `correzione «${cosa}»`, modificato);
  /** Chiude il modulo: scarta la bozza. */
  const chiudi = () => { setBozza(null); onChiudi?.(); };

  /** Salva la bozza con `onSalva`; a buon fine chiude il modulo e notifica, altrimenti lascia la bozza aperta e notifica l'errore. */
  const salva = async () => {
    if (!bozza) return;
    setOccupato(true);
    try { await onSalva(bozza.corrente); chiudi(); notifica('success', `Correzione salvata: ${cosa}.`); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Correzione non salvata.'); }
    finally { setOccupato(false); }
  };
  /** «Elimina» del piè: la domanda dice che cosa si perde (`avviso`); al sì elimina, notifica e chiude. */
  const eliminaConConferma = async () => {
    if (!elimina) return;
    if (!(await conferma({ titolo: `Eliminare ${cosa}?`, testo: elimina.avviso, etichetta: 'Elimina' }))) return;
    setOccupato(true);
    try { await elimina.onElimina(); notifica('success', `Eliminato: ${cosa}.`); chiudi(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Eliminazione non riuscita.'); }
    finally { setOccupato(false); }
  };

  // Il modulo aperto è la `FinestraModifica` comune (AD10): titolo e «Chiudi» in testa, campi nel corpo che scorre, piè fisso con
  // Elimina / Annulla / Salva sempre in vista a ogni formato (prima il modulo si apriva in linea e «Salva» stava dopo i campi: a 375 px
  // fuori dallo schermo). Il fuoco entra nella finestra e alla chiusura torna a chi l'ha aperta (`Modal`).
  const finestra = bozza && (
    <FinestraModifica titolo={etichetta ? `${etichetta}: ${cosa}` : `Correggi ${cosa}`} nomeModulo={`Correggi ${cosa}`} stretta={!larga}
      onChiudi={chiudi} onSalva={salva} salvabile={modificato} occupato={occupato} sporca={modificato}
      onElimina={elimina ? () => void eliminaConConferma() : undefined}>
      <div className="flex flex-wrap items-end gap-2">
        {children(bozza.corrente, (patch) => setBozza((b) => (b ? { ...b, corrente: { ...b.corrente, ...patch } } : b)))}
      </div>
    </FinestraModifica>
  );
  if (controllata) return finestra || null;
  return (
    <>
      <button type="button" className="touch shrink-0 rounded px-1.5 text-text-muted hover:text-text testo-12"
        // Con una scritta accanto alla matita il nome accessibile comincia da quella (WCAG 2.5.3): chi dà comandi a
        // voce dice quello che legge, «Modifica testo», e deve trovarlo nel nome del pulsante.
        aria-label={etichetta ? `${etichetta}: ${cosa}` : `Correggi ${cosa}`} title={`Correggi ${cosa}`}
        onClick={() => { const v = iniziale(); setBozza({ partenza: v, corrente: v }); }}>
        ✎{etichetta ? <span className={`ml-1 ${classeEtichetta ?? ''}`}>{etichetta}</span> : null}
      </button>
      {finestra}
    </>
  );
}
