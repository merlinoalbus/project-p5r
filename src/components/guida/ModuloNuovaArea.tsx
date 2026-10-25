// ============================================================
// ModuloNuovaArea — una sezione nuova della guida del Palazzo: nome, descrizione e posto nell'ordine (2026-10-01)
// ============================================================
//
// «come faccio ad aggiungere una nuova sezione di guida ad una planimetria che non ha sezioni di guida autonome?» Lo stesso
// modulo serve nella scheda della planimetria (l'area nasce dentro di lei, col nome della stanza proposto) e nella colonna
// del Palazzo (l'area nasce senza planimetria, e la si collega dopo).
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { CampoCorrezione } from './CorrezioneGuida';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

const IN_FONDO = '__in-fondo';
const IN_CIMA = '__in-cima';

/** `areePalazzo` (L3, R3-22): gli slug delle Aree del Palazzo che l'infiltrazione nuova tocca, in ordine. */
export interface DatiNuovaArea { nome: string; descrizione: string; dopo?: string | null; areePalazzo?: string[] }

interface Props {
  /** Le aree del Palazzo in ordine di guida: «dopo quale» va la nuova. */
  aree: Array<{ chiave: string; nome: string; ordine: number }>;
  /** L3: le Aree del Palazzo, per scegliere quelle che l'infiltrazione tocca («Aree toccate»). */
  areePalazzo?: Array<{ slug: string; nome: string }>;
  nomeIniziale?: string;
  /** Dopo quale area propone di metterla (assente = in fondo). */
  dopoIniziale?: string;
  occupato?: boolean;
  /** Perché per ora non si può creare (nella scheda: modifiche non salvate, conferma d'eliminazione aperta): lo si dice, e l'invio aspetta. */
  bloccato?: string;
  onCrea: (dati: DatiNuovaArea) => Promise<void>;
  onAnnulla: () => void;
}

/**
 * Il modulo dell'area nuova: nome (proposto da `nomeIniziale`), descrizione e posto nella guida (in fondo, in cima o
 * dopo un'area; di partenza `dopoIniziale` se esiste, altrimenti in fondo). All'apertura si porta in vista e mette il
 * fuoco sul nome. Con `bloccato` mostra il motivo e non invia.
 */
export function ModuloNuovaArea({ aree, areePalazzo, nomeIniziale = '', dopoIniziale, occupato, bloccato, onCrea, onAnnulla }: Props) {
  const [nome, setNome] = useState(nomeIniziale);
  const [toccate, setToccate] = useState<string[]>([]);
  const [descrizione, setDescrizione] = useState('');
  const [posto, setPosto] = useState(dopoIniziale && aree.some((a) => a.chiave === dopoIniziale) ? dopoIniziale : IN_FONDO);
  // Nella scheda della planimetria il modulo si apre in fondo alla finestra, sotto la piega (verifica nel browser, 2026-10-01):
  // lo si porta in vista e si comincia dal nome.
  const modulo = useRef<HTMLFormElement | null>(null);
  useEffect(() => {
    modulo.current?.scrollIntoView?.({ block: 'nearest' });
    modulo.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
  }, []);
  const opzioni = [
    { chiave: IN_FONDO, nome: 'In fondo al Palazzo' },
    { chiave: IN_CIMA, nome: 'All’inizio del Palazzo' },
    ...aree.map((a) => ({ chiave: a.chiave, nome: `Dopo «${a.ordine + 1}. ${a.nome}»` })),
  ];
  /** Invia i dati ripuliti se c'è un nome e nulla blocca: «in fondo» non manda `dopo`, «in cima» lo manda nullo. */
  const invia = () => {
    const n = nome.trim();
    if (!n || occupato || bloccato) return;
    // le aree toccate nell'ordine del Palazzo (si riordinano poi con «Modifica aree»)
    const aree = areePalazzo ? areePalazzo.filter((a) => toccate.includes(a.slug)).map((a) => a.slug) : [];
    void onCrea({ nome: n, descrizione: descrizione.trim(), ...(posto === IN_FONDO ? {} : { dopo: posto === IN_CIMA ? null : posto }), ...(aree.length ? { areePalazzo: aree } : {}) });
  };
  return (
    <form ref={modulo} className="flex flex-col gap-2 rounded-md border border-border-light bg-white/[0.03] p-2" aria-label="Nuova infiltrazione"
      onSubmit={(e) => { e.preventDefault(); invia(); }}>
      <CampoCorrezione etichetta="Nome dell’infiltrazione" valore={nome} massimo={LIMITI_GUIDA.area.nome} onCambia={setNome} />
      <CampoCorrezione etichetta="Descrizione" valore={descrizione} multilinea massimo={LIMITI_GUIDA.area.descrizione} onCambia={setDescrizione} />
      <Selettore etichetta="Dove va nella guida" valore={posto} opzioni={opzioni} onCambia={setPosto} />
      {areePalazzo && areePalazzo.length > 0 && (
        <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
          <legend className="mb-1 testo-12 font-semibold text-text-secondary">Aree toccate</legend>
          {areePalazzo.map((a) => (
            <label key={a.slug} className="touch flex items-center gap-2 testo-13">
              <input type="checkbox" className="h-5 w-5 shrink-0" checked={toccate.includes(a.slug)}
                onChange={(e) => setToccate((x) => (e.target.checked ? [...x, a.slug] : x.filter((s) => s !== a.slug)))} />
              <span>{a.nome}</span>
            </label>
          ))}
        </fieldset>
      )}
      <span className="testo-12 text-text-muted">È un’infiltrazione della guida, per tutte le partite: dopo ci aggiungi le voci e colleghi i pin.</span>
      {bloccato && <span className="testo-12 text-text-muted" role="status">{bloccato}</span>}
      <div className="flex flex-wrap justify-end gap-1.5">
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={onAnnulla} />
        <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Crea l’infiltrazione" disabled={occupato || !!bloccato || !nome.trim()} />
      </div>
    </form>
  );
}
