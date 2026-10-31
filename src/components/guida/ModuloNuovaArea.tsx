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
import { FinestraModifica } from '../shared/FinestraModifica';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

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
// L12 (passo 8): nel rilascio (sola lettura) il modulo non esiste; la condizione è costante di build, `ModuloNuovaAreaReale` esce dal bundle
export const ModuloNuovaArea: StrumentoDiModifica<typeof ModuloNuovaAreaReale> = IN_RILASCIO ? NienteInRilascio : ModuloNuovaAreaReale;
function ModuloNuovaAreaReale({ aree, areePalazzo, nomeIniziale = '', dopoIniziale, occupato, bloccato, onCrea, onAnnulla }: Props) {
  const [nome, setNome] = useState(nomeIniziale);
  const [toccate, setToccate] = useState<string[]>([]);
  const [descrizione, setDescrizione] = useState('');
  const [posto, setPosto] = useState(dopoIniziale && aree.some((a) => a.chiave === dopoIniziale) ? dopoIniziale : IN_FONDO);
  // il posto di partenza, per sapere se è stato cambiato (modifiche da confermare alla chiusura)
  const [postoIniziale] = useState(posto);
  // si comincia dal nome
  const modulo = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    modulo.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
  }, []);
  const sporca = nome !== nomeIniziale || descrizione !== '' || toccate.length > 0 || posto !== postoIniziale;
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
  // L13 (O7-5, censimento del 25/10: «azioni nel corpo che scorre»): è la `FinestraModifica` comune — Annulla e «Crea l'infiltrazione»
  // nel piè fisso (prima in fondo al corpo, sotto la piega sul telefono), Invio in un campo crea, conferma prima di chiudere con modifiche
  return (
    <FinestraModifica titolo="Nuova infiltrazione" stretta onChiudi={onAnnulla} onSalva={invia} titoloSalva="Crea l’infiltrazione"
      salvabile={!!nome.trim() && !bloccato} occupato={occupato} sporca={sporca}>
      <div ref={modulo} className="flex flex-col gap-3">
        <CampoCorrezione etichetta="Nome dell’infiltrazione" valore={nome} massimo={LIMITI_GUIDA.area.nome} onCambia={setNome} />
        <CampoCorrezione etichetta="Descrizione" valore={descrizione} multilinea massimo={LIMITI_GUIDA.area.descrizione} onCambia={setDescrizione} />
        <Selettore etichetta="Dove va nella guida" valore={posto} opzioni={opzioni} onCambia={setPosto} />
        {areePalazzo && areePalazzo.length > 0 && (
          <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
            <legend className="campo__etichetta mb-1">Aree toccate</legend>
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
      </div>
    </FinestraModifica>
  );
}
