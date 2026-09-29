// ============================================================
// SchedaPlanimetria — tutto quel che si sistema di una planimetria, in una finestra sola
// ============================================================
//
// Richiesta dell'utente (2026-09-30): la colonna del Palazzo «è fatta molto male ed è poco usabile… deve
// permettere di riordinare le planimetrie, associare Aree della Guida e soprattutto cambiare i nomi in
// che cosa mostra (etichetta). Devo poter rimuovere un'area/planimetria». Prima ogni riga portava matita,
// frecce, Editor, cestino e selettore delle aree: la matita apriva il modulo dentro la colonna stretta,
// che sforava, e la conferma del cestino compariva in fondo all'elenco, fuori vista.
//
// Scelta dell'utente: **l'elenco serve a scegliere, la scheda a sistemare**. Qui stanno il nome della
// stanza (vale per tutte le sue planimetrie), «Che cosa mostra» (l'etichetta della versione), il nome
// della planimetria, le aree della guida, l'editor dell'immagine e l'eliminazione — con la conferma
// nel piè della finestra, sempre in vista.
// ============================================================

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { CollegamentoVisivo, PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { CampoCorrezione } from './CorrezioneGuida';
import { SceltaAreePlanimetria } from './SceltaAreePlanimetria';
import { notifica } from '../../stores/notificationStore';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { perOrdineDiGuida, type Planimetria } from '../../utils/gruppiPlanimetrie';

export interface ModificheScheda {
  stanza?: string;
  /** `null`: torna all'etichetta dedotta dall'estrazione. */
  etichetta?: string | null;
  nome?: string;
  aree?: string[];
}

interface Props {
  planimetria: Planimetria;
  /** Nome della stanza a cui appartiene. */
  stanza: string;
  /** Quante planimetrie ha la stanza: il nome vale per tutte. */
  versioni: number;
  /** L'etichetta scritta a mano, se c'è; altrimenti vuota. */
  etichetta: string;
  /** Come la si chiamerebbe senza etichetta: il suggerimento del campo. */
  etichettaDedotta: string;
  /** Il nome della planimetria, senza il Palazzo davanti. */
  nome: string;
  /** Tutte le aree del Palazzo, in ordine di guida. */
  aree: Array<{ chiave: string; nome: string; ordine: number }>;
  altrove: ReadonlyMap<string, string>;
  onSalva: (m: ModificheScheda) => Promise<void>;
  onElimina: () => Promise<void>;
  onChiudi: () => void;
}

export function SchedaPlanimetria({ planimetria: p, stanza, versioni, etichetta, etichettaDedotta, nome, aree, altrove, onSalva, onElimina, onChiudi }: Props) {
  const [valori, setValori] = useState({ stanza, etichetta, nome });
  // le aree all'apertura: il metro per capire se l'insieme è cambiato
  const [iniziali] = useState(() => new Set(p.aree.map((a) => a.chiave)));
  const [spuntate, setSpuntate] = useState<Set<string>>(() => new Set(iniziali));
  const [conferma, setConferma] = useState(false);
  const [occupato, setOccupato] = useState(false);

  const modifiche: ModificheScheda = {};
  if (valori.stanza.trim() && valori.stanza.trim() !== stanza) modifiche.stanza = valori.stanza.trim();
  if (valori.etichetta.trim() !== etichetta) modifiche.etichetta = valori.etichetta.trim() || null;
  if (valori.nome.trim() && valori.nome.trim() !== nome) modifiche.nome = valori.nome.trim();
  const areeCambiate = spuntate.size !== iniziali.size || [...spuntate].some((k) => !iniziali.has(k));
  if (areeCambiate) modifiche.aree = aree.filter((a) => spuntate.has(a.chiave)).map((a) => a.chiave);
  const daSalvare = Object.keys(modifiche).length > 0;

  const esegui = async (azione: () => Promise<void>) => {
    setOccupato(true);
    try { await azione(); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Operazione non riuscita.'); } finally { setOccupato(false); }
  };

  return (
    // La conferma dell'eliminazione sta nel piè della finestra, che resta sempre in vista: in fondo al
    // corpo, sotto le aree del Palazzo, andava cercata scorrendo (verifica nel browser, 2026-09-30).
    <Modal titolo={`${stanza} · ${etichetta || etichettaDedotta}`} aperta onChiudi={onChiudi}
      azioni={conferma
        ? <div role="alertdialog" aria-label="Conferma eliminazione" className="flex w-full flex-col gap-2 rounded-md border border-primary bg-primary-bg p-2.5">
            <p className="m-0 text-[13px]">
              Elimino «{etichetta || etichettaDedotta}» di {stanza}? Se ne vanno anche i suoi spilli{p.n > 0 ? `, compresi ${p.n} da raccogliere` : ''}.
              {p.aree.length > 0 ? ` ${p.aree.length === 1 ? 'L’area della guida' : 'Le aree della guida'} ${[...p.aree].sort(perOrdineDiGuida).map((a) => `«${a.nome}»`).join(', ')} ${p.aree.length === 1 ? 'resta' : 'restano'} senza planimetria.` : ''}
              {' '}L’immagine di base resta fra le immagini caricate.
            </p>
            <div className="flex flex-wrap justify-end gap-1.5">
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Non eliminare" onClick={() => setConferma(false)} />
              <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina la planimetria" disabled={occupato} onClick={() => void esegui(onElimina)} />
            </div>
          </div>
        : <>
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={onChiudi} />
            <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva" disabled={occupato || !daSalvare}
              onClick={() => void esegui(() => onSalva(modifiche))} />
          </>}>
      <form className="flex flex-col gap-3" aria-label={`Scheda della planimetria «${etichetta || etichettaDedotta}» di ${stanza}`}
        onSubmit={(e) => { e.preventDefault(); if (daSalvare && !occupato) void esegui(() => onSalva(modifiche)); }}>
        <div className="flex flex-col gap-1">
          <CampoCorrezione etichetta="Nome della stanza" valore={valori.stanza} massimo={LIMITI_GUIDA.mappa.gruppoNome} onCambia={(v) => setValori((x) => ({ ...x, stanza: v }))} />
          {versioni > 1 && <span className="text-[11px] text-text-muted">Vale per tutte e {versioni} le planimetrie della stanza.</span>}
        </div>
        <div className="flex flex-col gap-1">
          <CampoCorrezione etichetta="Che cosa mostra" valore={valori.etichetta} massimo={LIMITI_GUIDA.mappa.etichetta} onCambia={(v) => setValori((x) => ({ ...x, etichetta: v }))} />
          {/* senza etichetta la versione prende il suo numero nella stanza («Immagine 2»): lo si dice com'è,
              e svuotare un'etichetta che c'era la perde (rilievo della revisione) */}
          <span className="text-[11px] text-text-muted">
            {valori.etichetta.trim()
              ? 'Distingue questa planimetria dalle altre della stanza.'
              : `Vuoto: si chiama col suo numero nella stanza, «${etichettaDedotta}»${etichetta ? `; l’etichetta «${etichetta}» si perde` : ''}.`}
          </span>
        </div>
        <CampoCorrezione etichetta="Nome della planimetria" valore={valori.nome} massimo={LIMITI_GUIDA.mappa.nome} onCambia={(v) => setValori((x) => ({ ...x, nome: v }))} />
        <SceltaAreePlanimetria aree={aree} spuntate={spuntate} onCambia={setSpuntate} altrove={altrove} />
        {/* invio da tastiera nei campi di testo */}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>

      <div className="flex flex-col gap-2 border-t border-border-light pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] text-text-muted">Immagine e spilli si modificano nell’editor.</span>
          <CollegamentoVisivo to={`/guida/mappe/${encodeURIComponent(p.chiave)}/modifica`} tono="secondario" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Apri nell’editor" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] text-text-muted">Toglie la planimetria dal Palazzo, con i suoi spilli.</span>
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina…" disabled={occupato || conferma} onClick={() => setConferma(true)} />
        </div>
      </div>
    </Modal>
  );
}
