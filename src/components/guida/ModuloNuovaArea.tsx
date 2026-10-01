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

export interface DatiNuovaArea { nome: string; descrizione: string; dopo?: string | null }

interface Props {
  /** Le aree del Palazzo in ordine di guida: «dopo quale» va la nuova. */
  aree: Array<{ chiave: string; nome: string; ordine: number }>;
  nomeIniziale?: string;
  /** Dopo quale area propone di metterla (assente = in fondo). */
  dopoIniziale?: string;
  occupato?: boolean;
  /** Perché per ora non si può creare (nella scheda: modifiche non salvate, conferma d'eliminazione aperta): lo si dice, e l'invio aspetta. */
  bloccato?: string;
  onCrea: (dati: DatiNuovaArea) => Promise<void>;
  onAnnulla: () => void;
}

export function ModuloNuovaArea({ aree, nomeIniziale = '', dopoIniziale, occupato, bloccato, onCrea, onAnnulla }: Props) {
  const [nome, setNome] = useState(nomeIniziale);
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
  const invia = () => {
    const n = nome.trim();
    if (!n || occupato || bloccato) return;
    void onCrea({ nome: n, descrizione: descrizione.trim(), ...(posto === IN_FONDO ? {} : { dopo: posto === IN_CIMA ? null : posto }) });
  };
  return (
    <form ref={modulo} className="flex flex-col gap-2 rounded-md border border-border-light bg-white/[0.03] p-2" aria-label="Nuova area della guida"
      onSubmit={(e) => { e.preventDefault(); invia(); }}>
      <CampoCorrezione etichetta="Nome dell’area" valore={nome} massimo={LIMITI_GUIDA.area.nome} onCambia={setNome} />
      <CampoCorrezione etichetta="Descrizione" valore={descrizione} multilinea massimo={LIMITI_GUIDA.area.descrizione} onCambia={setDescrizione} />
      <Selettore etichetta="Dove va nella guida" valore={posto} opzioni={opzioni} onCambia={setPosto} />
      <span className="text-[11px] text-text-muted">È una sezione della guida, per tutte le partite: dopo ci aggiungi le voci e colleghi i pin.</span>
      {bloccato && <span className="text-[11px] text-text-muted" role="status">{bloccato}</span>}
      <div className="flex flex-wrap justify-end gap-1.5">
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={onAnnulla} />
        <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Crea l’area" disabled={occupato || !!bloccato || !nome.trim()} />
      </div>
    </form>
  );
}
