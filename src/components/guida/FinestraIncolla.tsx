// ============================================================
// FinestraIncolla — i rilievi prima di incollare voci del Diario, e il riquadro d'incolla quando il browser non legge gli appunti (2026-10-26)
// ============================================================
//
// Si apre solo se il piano del server ha qualcosa da confermare: diario validato, effetti con una data propria (cruciverba, domanda,
// invito) o la Fortuna in un altro giorno, un Confidente non disponibile lì, effetti o collegamenti che non esistono più, ciò che una copia
// non eredita. Niente si scarta in silenzio: «Incolla comunque» tiene tutto; «Incolla senza gli effetti segnalati» (solo per la copia, mai
// predefinito) lascia fuori proprio quelli elencati; «Annulla» non scrive niente. Le voci di un taglio già spostate o eliminate si dicono.
// Se un gesto incolla meno voci del titolo (una voce si incolla solo senza gli elementi segnalati), il suo pulsante porta il numero.
//
// `FinestraIncollaManuale`: il riquadro in cui incollare col gesto del sistema (tasto lungo → Incolla) quando il browser non permette di
// leggere gli appunti dal menu (iOS, permesso negato). L'evento d'incolla del riquadro porta testo e HTML.
// ============================================================

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { dataGiocoTesto } from '../../utils/dateGioco';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';
import type { PianoIncollaDto, RilievoIncolla } from '../../../shared/appuntiDiario';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** I rilievi che «Incolla senza gli effetti segnalati» lascia fuori. */
const SEGNALABILI = new Set<RilievoIncolla['codice']>(['data-fissa', 'fortuna', 'effetto-non-valido', 'riferimento-non-valido']);

interface Props {
  piano: PianoIncollaDto;
  occupato: boolean;
  onConferma: (senzaSegnalati: boolean) => void;
  onChiudi: () => void;
}

export const FinestraIncolla: StrumentoDiModifica<typeof FinestraIncollaReale> = IN_RILASCIO ? NienteInRilascio : FinestraIncollaReale;
function FinestraIncollaReale({ piano, occupato, onConferma, onChiudi }: Props) {
  const taglio = piano.modo === 'taglia';
  const daVedere = piano.rilievi.filter((r) => r.gravita === 'conferma');
  const daSapere = piano.rilievi.filter((r) => r.gravita === 'info');
  const segnalabili = !taglio && daVedere.some((r) => SEGNALABILI.has(r.codice));
  const n = piano.daIncollare;
  const voci = (k: number) => (k === 1 ? '1 voce' : `${k} voci`);
  const dove = piano.fascia ? `${piano.fascia === 'sera' ? 'di sera' : 'di giorno'}, dopo la voce selezionata` : 'ognuna nella sua fascia, in fondo';
  // i due gesti possono incollarne meno del titolo (una voce si incolla solo senza gli elementi segnalati, o solo con): il numero compare
  // sul pulsante solo quando è diverso, e un gesto che non incollerebbe niente non c'è
  const conto = (k: number) => (k < n ? ` (${k})` : '');
  const nomeConto = (k: number) => (k < n ? `: ${voci(k)} su ${n}` : '');
  const comunque = taglio ? 'Sposta comunque' : 'Incolla comunque';
  return (
    <Modal aperta titolo={`${taglio ? 'Spostare' : 'Incollare'} ${voci(n)} nel giorno ${dataGiocoTesto(piano.giorno)}?`} onChiudi={onChiudi} azioni={(
      <div className="flex w-full flex-wrap justify-end gap-1.5">
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={onChiudi} />
        {segnalabili && piano.conSenza > 0 && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="scarta" dimensione={20} />} titolo={`Incolla senza gli effetti segnalati${conto(piano.conSenza)}`}
          aria-label={`Incolla senza gli effetti segnalati${nomeConto(piano.conSenza)}`} disabled={occupato} onClick={() => onConferma(true)} />}
        {piano.conComunque > 0 && <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave={taglio ? 'taglia' : 'incolla'} dimensione={20} />} titolo={`${comunque}${conto(piano.conComunque)}`}
          aria-label={`${comunque}${nomeConto(piano.conComunque)}`} disabled={occupato} onClick={() => onConferma(false)} />}
      </div>
    )}>
      <div className="flex flex-col gap-3 testo-13">
        <p className="m-0 text-text-secondary">{taglio ? 'Le stesse voci, con spunte e ricevute delle partite' : 'Voci nuove, senza spunte'}: {dove}. Prima di {taglio ? 'spostarle' : 'incollarle'}:</p>
        {daVedere.length > 0 && <ElencoRilievi titolo="Da sapere prima" rilievi={daVedere} />}
        {daSapere.length > 0 && <ElencoRilievi titolo="Inoltre" rilievi={daSapere} />}
      </div>
    </Modal>
  );
}

/** Un gruppo di rilievi, uno per riga. */
function ElencoRilievi({ titolo, rilievi }: { titolo: string; rilievi: RilievoIncolla[] }) {
  return (
    <section className="flex flex-col gap-1" aria-label={titolo}>
      <h3 className="m-0 testo-13 font-semibold">{titolo}</h3>
      <ul className="m-0 flex list-disc flex-col gap-1 pl-5 [text-wrap:pretty]">
        {rilievi.map((r, i) => <li key={`${r.codice}-${r.voceIndice}-${r.effettoUid ?? i}`}>{r.testo}</li>)}
      </ul>
    </section>
  );
}

interface PropsManuale {
  /** Prova a incollare il contenuto: falso se non sono voci del Diario. */
  onIncolla: (contenuto: { testo: string; html: string }) => boolean;
  onChiudi: () => void;
}

export const FinestraIncollaManuale: StrumentoDiModifica<typeof FinestraIncollaManualeReale> = IN_RILASCIO ? NienteInRilascio : FinestraIncollaManualeReale;
function FinestraIncollaManualeReale({ onIncolla, onChiudi }: PropsManuale) {
  const [errore, setErrore] = useState(false);
  return (
    <Modal aperta titolo="Incolla le voci" onChiudi={onChiudi} azioni={(
      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={onChiudi} />
    )}>
      <div className="flex flex-col gap-2 testo-13">
        <p className="m-0 text-text-secondary" id="incolla-manuale-aiuto">Tieni premuto nel riquadro e scegli «Incolla».</p>
        <div className="form-input min-h-24 touch" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Riquadro in cui incollare le voci"
          aria-describedby="incolla-manuale-aiuto" tabIndex={0}
          onPaste={(e) => {
            e.preventDefault();
            const ok = onIncolla({ testo: e.clipboardData.getData('text/plain'), html: e.clipboardData.getData('text/html') });
            setErrore(!ok);
          }}
          onInput={(e) => { (e.currentTarget as HTMLDivElement).textContent = ''; }} />
        {errore && <p className="m-0 text-error-testo" role="alert">Negli appunti non ci sono voci del Diario: copiale o tagliale prima.</p>}
      </div>
    </Modal>
  );
}
