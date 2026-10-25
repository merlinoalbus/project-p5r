import { useState } from 'react';
import type { Condizione } from '../../../shared/condizioniSpillo';
import type { RequisitiConfidenteDto } from '../../types';
import { getRequisitiConfidente, ripristinaRequisitiRango, salvaRequisitiRango } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { CondizioniEditor } from '../guida/CondizioniEditor';
import { Modal } from '../shared/Modal';
import { PageState } from '../shared/PageState';
import { conferma, CHIUDI_SENZA_SALVARE } from '../../stores/confermaStore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

type Rango = RequisitiConfidenteDto['ranghi'][number];

/** Un rango alla volta, con lo stesso editor usato per gli altri dati di gioco. */
function RequisitiRango({ confidente, rango, condizioni, onCambia, occupato, onOccupato, onSalvato }: {
  confidente: string; rango: Rango; condizioni: Condizione[]; onCambia: (c: Condizione[]) => void;
  occupato: boolean; onOccupato: (v: boolean) => void; onSalvato: (d: RequisitiConfidenteDto) => Promise<void>;
}) {
  const [errore, setErrore] = useState<string | null>(null);
  const cambia = async (ripristina: boolean) => {
    if (occupato) return;
    onOccupato(true); setErrore(null);
    try {
      const nuovi = ripristina
        ? await ripristinaRequisitiRango(confidente, rango.rango)
        : await salvaRequisitiRango(confidente, rango.rango, condizioni.map((condizione) => {
          // Le note delle condizioni non toccate restano identiche, anche se una riga precedente è stata tolta.
          const prima = rango.requisiti.find((r) => r.condizione === condizione);
          return { condizione, ...(prima ? { testo: prima.testo } : {}) };
        }));
      await onSalvato(nuovi);
    } catch (e) { setErrore(e instanceof Error ? e.message : 'Aggiornamento dei requisiti non riuscito.'); }
    finally { onOccupato(false); }
  };
  return <div className="flex flex-col gap-3 p-3">
    <CondizioniEditor condizioni={condizioni} onCambia={onCambia} disabilitato={occupato} massimo={10} />
    {errore && <p role="alert" className="m-0 text-error">{errore}</p>}
    <div className="flex flex-wrap gap-2">
      <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo={occupato ? 'Salvataggio…' : `Salva rango ${rango.rango}`} disabled={occupato || condizioni.length > 10} onClick={() => void cambia(false)} />
      {rango.modificato && <PulsanteVisivo icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Ripristina dalla guida" disabled={occupato} onClick={() => void cambia(true)} />}
    </div>
  </div>;
}

/** L'unico punto di modifica dei requisiti è la pagina del Confidente. */
// L12 (passo 8): nel rilascio (sola lettura) l'editor non esiste; la condizione è costante di build, `EditorRequisitiReale` esce dal bundle
export const EditorRequisiti: StrumentoDiModifica<typeof EditorRequisitiReale> = IN_RILASCIO ? NienteInRilascio : EditorRequisitiReale;
function EditorRequisitiReale({ confidente, rangoIniziale, onChiudi, onSalvato }: { confidente: { chiave: string; nome: string }; rangoIniziale?: number; onChiudi: () => void; onSalvato: () => Promise<void> }) {
  const dati = useCarica(() => getRequisitiConfidente(confidente.chiave), [confidente.chiave]);
  const [rangoAperto, setRangoAperto] = useState<number | null>(rangoIniziale ?? 1);
  const [occupato, setOccupato] = useState(false);
  // Le bozze stanno sopra le righe: cambiare rango non le smonta e non perde le note originali.
  const [bozze, setBozze] = useState<Record<number, { originale: Rango; condizioni: Condizione[] }>>({});
  const modificata = (rango: number) => {
    const b = bozze[rango];
    return !!b && JSON.stringify(b.condizioni) !== JSON.stringify(b.originale.requisiti.map((r) => r.condizione));
  };
  const chiudi = async () => {
    if (occupato) return;
    if (Object.keys(bozze).some((r) => modificata(Number(r))) && !(await conferma({ ...CHIUDI_SENZA_SALVARE, testo: 'Ci sono requisiti non salvati: chiudendo si perdono.' }))) return;
    onChiudi();
  };
  return <Modal titolo={`Requisiti di ${confidente.nome}`} aperta onChiudi={chiudi} larga>
    <p className="mt-0 testo-13 text-text-secondary">Le modifiche valgono per tutte le partite. Salva un rango alla volta; «Ripristina» recupera le condizioni della guida.</p>
    <PageState isLoading={dati.inPrimoCaricamento} error={dati.errore} onRetry={() => void dati.ricarica()}>
      <div className="flex flex-col gap-2">{dati.dati?.ranghi.map((r) => <section key={r.rango} className="rounded border border-border">
        <button type="button" className="touch flex w-full flex-wrap items-center gap-2 p-3 text-left" disabled={occupato} aria-expanded={rangoAperto === r.rango} onClick={() => setRangoAperto((aperto) => aperto === r.rango ? null : r.rango)}>
          <strong>Rango {r.rango}</strong><span className="min-w-0 testo-13 text-text-secondary">{r.requisiti.map((c) => c.descrizione).join(' · ') || 'Nessuna condizione'}</span>{modificata(r.rango) ? <span className="chip">Non salvato</span> : r.modificato && <span className="chip">Modificato</span>}
        </button>
        {rangoAperto === r.rango && <RequisitiRango key={JSON.stringify(r)} confidente={confidente.chiave} rango={bozze[r.rango]?.originale ?? r}
          condizioni={bozze[r.rango]?.condizioni ?? r.requisiti.map((c) => c.condizione)}
          onCambia={(condizioni) => setBozze((prima) => ({ ...prima, [r.rango]: { originale: prima[r.rango]?.originale ?? r, condizioni } }))}
          occupato={occupato} onOccupato={setOccupato} onSalvato={async (nuovi) => {
            dati.imposta(nuovi);
            setBozze((prima) => { const altre = { ...prima }; delete altre[r.rango]; return altre; });
            await onSalvato();
          }} />}
      </section>)}</div>
    </PageState>
  </Modal>;
}
