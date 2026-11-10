// ============================================================
// EditorRequisiti — le condizioni di ogni rango del Confidente, con un solo «Salva» per tutti i ranghi modificati
// ============================================================
//
// È la `FinestraModifica` comune: corpo che scorre, piè fisso, conferma prima di chiudere con modifiche non salvate. Si apre un rango alla
// volta, ma le bozze stanno a livello di finestra: cambiare rango non le perde e «Salva» scrive in una transazione tutti i ranghi modificati
// (`PUT /api/compendio/confidenti/:chiave/requisiti`). Un rango diverso dalla guida porta il segno «Modificato».
// ============================================================

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Condizione } from '../../../shared/condizioniSpillo';
import type { RequisitiConfidenteDto } from '../../types';
import { getRequisitiConfidente, salvaRequisitiConfidente } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { CondizioniEditor } from '../guida/CondizioniEditor';
import { FinestraModifica } from '../shared/FinestraModifica';
import { notifica } from '../../stores/notificationStore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import { FrecciaApertura, PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

type Rango = RequisitiConfidenteDto['ranghi'][number];

/** I requisiti di un rango sono al massimo dieci (il contratto del server). */
const MASSIMO_CONDIZIONI = 10;

/**
 * Le righe da salvare di un rango. Una condizione uguale a una di quelle salvate ne conserva la nota, anche se le righe si sono spostate o
 * una precedente è stata tolta; ogni riga salvata si usa una volta sola, così due condizioni identiche tengono ognuna la propria.
 */
function righeDaSalvare(rango: Rango, condizioni: Condizione[]) {
  const libere = [...rango.requisiti];
  return condizioni.map((condizione) => {
    const impronta = JSON.stringify(condizione);
    const i = libere.findIndex((r) => JSON.stringify(r.condizione) === impronta);
    if (i < 0) return { condizione };
    const [prima] = libere.splice(i, 1);
    return prima.nota ? { condizione, nota: prima.nota } : { condizione };
  });
}

/** Le note del rango e, se la condizione è cambiata nella bozza, che salvando la nota si toglie (`righeDaSalvare`). */
function NoteDelRango({ rango, condizioni }: { rango: Rango; condizioni: Condizione[] }) {
  const libere = condizioni.map((c) => JSON.stringify(c));
  const righe = rango.requisiti.map((q) => {
    const i = libere.indexOf(JSON.stringify(q.condizione));
    if (i >= 0) libere.splice(i, 1);
    return { q, resta: i >= 0 };
  }).filter(({ q }) => q.nota);
  if (righe.length === 0) return null;
  return <ul className="m-0 pl-5 testo-13 text-text-secondary">{righe.map(({ q, resta }) => (
    <li key={q.indice}><strong>{q.descrizione}:</strong> {q.nota}{!resta && <span className="text-warning"> Condizione cambiata: salvando, questa nota si toglie.</span>}</li>
  ))}</ul>;
}

/** L'unico punto di modifica dei requisiti è la pagina del Confidente. */
// L12 (passo 8): nel rilascio (sola lettura) l'editor non esiste; la condizione è costante di build, `EditorRequisitiReale` esce dal bundle
export const EditorRequisiti: StrumentoDiModifica<typeof EditorRequisitiReale> = IN_RILASCIO ? NienteInRilascio : EditorRequisitiReale;
function EditorRequisitiReale({ confidente, rangoIniziale, onChiudi, onSalvato }: { confidente: { chiave: string; nome: string }; rangoIniziale?: number; onChiudi: () => void; onSalvato: () => Promise<void> }) {
  const dati = useCarica(() => getRequisitiConfidente(confidente.chiave), [confidente.chiave]);
  const [rangoAperto, setRangoAperto] = useState<number | null>(rangoIniziale ?? 1);
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  // le bozze stanno sopra le righe: cambiare rango non le smonta
  const [bozze, setBozze] = useState<Record<number, Condizione[]>>({});
  const idPannello = useId();
  const rigaIniziale = useRef<HTMLElement | null>(null);

  const ranghi = useMemo(() => dati.dati?.ranghi ?? [], [dati.dati]);
  // l'elenco salvato di ogni rango, con identità stabile: l'editor delle condizioni rivaluta l'anteprima quando l'elenco cambia
  const salvate = useMemo(() => new Map(ranghi.map((r) => [r.rango, r.requisiti.map((c) => c.condizione)])), [ranghi]);
  const modificata = (r: Rango) => r.rango in bozze && JSON.stringify(bozze[r.rango]) !== JSON.stringify(salvate.get(r.rango));
  const modificati = ranghi.filter(modificata);
  const troppe = modificati.find((r) => bozze[r.rango].length > MASSIMO_CONDIZIONI);
  const sporca = modificati.length > 0;
  useBozzaSporca(`requisiti:${confidente.chiave}`, `i requisiti di ${confidente.nome}`, sporca);

  // aperta su un rango in fondo all'elenco, la finestra parte da quel rango
  const pronti = dati.dati !== null;
  useEffect(() => { if (pronti) rigaIniziale.current?.scrollIntoView({ block: 'start' }); }, [pronti]);

  const salva = async () => {
    if (occupato) return;
    setOccupato(true); setErrore(null);
    try {
      dati.imposta(await salvaRequisitiConfidente(confidente.chiave, modificati.map((r) => ({ rango: r.rango, requisiti: righeDaSalvare(r, bozze[r.rango]) }))));
      setBozze({});
      notifica('success', `${modificati.length === 1 ? `Requisiti del rango ${modificati[0].rango} salvati` : `Requisiti di ${modificati.length} ranghi salvati`}: valgono per tutte le partite.`);
      await onSalvato();
      onChiudi();
    } catch (e) { setErrore(e instanceof Error ? e.message : 'Aggiornamento dei requisiti non riuscito.'); }
    finally { setOccupato(false); }
  };

  return (
    <FinestraModifica titolo={`Requisiti di ${confidente.nome}`} onChiudi={onChiudi} onSalva={salva} salvabile={sporca && !troppe} occupato={occupato} sporca={sporca}
      caricamento={dati.inPrimoCaricamento} errore={errore ?? (troppe ? `Il rango ${troppe.rango} ha più di ${MASSIMO_CONDIZIONI} condizioni: togline qualcuna.` : null)}>
      {dati.errore
        ? <p role="alert" className="m-0 testo-13">{dati.errore} <PulsanteVisivo compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={() => void dati.ricarica()} /></p>
        : <div className="flex flex-col gap-2 min-w-0">{ranghi.map((r) => {
          const aperto = rangoAperto === r.rango;
          const idRiga = `${idPannello}-${r.rango}`;
          return (
            <section key={r.rango} ref={r.rango === rangoIniziale ? rigaIniziale : undefined} className="rounded border border-border min-w-0">
              <h3 className="m-0 font-normal testo-14">
                <button type="button" className="touch flex w-full flex-wrap items-center gap-2 p-3 text-left" aria-disabled={occupato || undefined} aria-expanded={aperto} aria-controls={aperto ? idRiga : undefined}
                  onClick={() => { if (!occupato) setRangoAperto(aperto ? null : r.rango); }}>
                  <strong>Rango {r.rango}<FrecciaApertura aperto={aperto} /></strong>
                  <span className="min-w-0 testo-13 text-text-secondary">{r.requisiti.map((c) => c.descrizione).join(' · ') || 'Nessuna condizione'}</span>
                  {modificata(r) ? <span className="chip">Non salvato</span> : r.modificato && <span className="chip">Modificato</span>}
                </button>
              </h3>
              {aperto && (
                <div id={idRiga} className="flex flex-col gap-3 p-3 pt-0 min-w-0">
                  {/* si rimonta quando il server cambia il rango (salvataggio): le righe tengono uno stato loro */}
                  <CondizioniEditor key={JSON.stringify(r)} condizioni={bozze[r.rango] ?? salvate.get(r.rango) ?? []} disabilitato={occupato} massimo={MASSIMO_CONDIZIONI}
                    onCambia={(condizioni) => { setBozze((prima) => ({ ...prima, [r.rango]: condizioni })); setErrore(null); }} />
                  <NoteDelRango rango={r} condizioni={bozze[r.rango] ?? salvate.get(r.rango) ?? []} />
                </div>
              )}
            </section>
          );
        })}</div>}
    </FinestraModifica>
  );
}
