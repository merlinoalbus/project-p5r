// ============================================================
// BarraSelezioneVoci — la barra delle voci selezionate del Diario: conteggio, Copia, Taglia, Fissa… (appunti fissi, C7), In un altro giorno…, Fine (2026-10-26)
// ============================================================
//
// Compare solo con voci selezionate (o nella scelta a caselle di «Copia o sposta voci»), ferma in fondo alla vista sopra la barra di
// navigazione del telefono: in fondo e non in cima, così comparendo non sposta le righe sotto il puntatore durante Maiusc+clic. Le
// scorciatoie stanno nel suggerimento e in `aria-keyshortcuts` dei pulsanti, non in un testo sempre a schermo: su tablet e telefono la
// tastiera non c'è. Sul telefono resta di due righe: il conteggio con «Fine», poi i quattro comandi (vanno a capo da soli). La coda delle notifiche le sta sopra
// (`utils/postoCoda`, classe `barra-selezione-voci`).
// ============================================================

import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

interface Props {
  /** Quante voci sono selezionate. */
  quante: number;
  /** Nella scelta a caselle la barra c'è anche senza voci: il conteggio invita a sceglierle. */
  caselle: boolean;
  occupato: boolean;
  /** Da 768 px la giornata scorre in un'area interna (scheda «Oggi»): lì la barra di navigazione sta fuori dall'area e non va scavalcata. */
  scorreDentro?: boolean;
  onCopia: () => void;
  onTaglia: () => void;
  /** C7: le voci selezionate negli appunti fissi (lo stesso testo di Copia, con un titolo proposto). */
  onFisso: () => void;
  onAltroGiorno: () => void;
  onFine: () => void;
}

export const BarraSelezioneVoci: StrumentoDiModifica<typeof BarraSelezioneVociReale> = IN_RILASCIO ? NienteInRilascio : BarraSelezioneVociReale;
function BarraSelezioneVociReale({ quante, caselle, occupato, scorreDentro = false, onCopia, onTaglia, onFisso, onAltroGiorno, onFine }: Props) {
  const nessuna = quante === 0;
  return (
    // sotto i 1024 px la barra di navigazione (64 px) copre il fondo della vista: la barra si ferma appena sopra. Se da 768 px la giornata
    // scorre in un'area interna (scheda «Oggi»), lo `sticky` vale per quell'area, che finisce già sopra la navigazione: lì sta sul fondo
    <section className={`barra-selezione-voci card sticky bottom-[4.5rem] z-10 flex flex-wrap items-center gap-2 py-2 lg:bottom-2 ${scorreDentro ? 'md:bottom-2' : ''}`} aria-label="Voci selezionate">
      {/* il conteggio lo annuncia la regione sempre presente di `GiornoGuida` (una regione che nasce col testo spesso non si legge) */}
      <span className="min-w-0 flex-1 testo-13 tabular-nums">
        <strong>{nessuna ? 'Scegli le voci' : quante === 1 ? '1 voce selezionata' : `${quante} voci selezionate`}</strong>
      </span>
      {/* i nomi accessibili cominciano col testo che si vede (WCAG 2.5.3: «clic Fine» col controllo vocale) */}
      <PulsanteVisivo tono="fantasma" compatto className="shrink-0 sm:order-last" icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Fine"
        aria-label={caselle ? 'Fine: esci dalla scelta delle voci' : 'Fine: annulla la selezione'} aria-keyshortcuts={caselle ? undefined : 'Escape'}
        title={caselle ? undefined : 'Annulla la selezione (Esc)'} onClick={onFine} />
      <div className="flex basis-full flex-wrap gap-2 sm:basis-auto">
        <PulsanteVisivo tono="primario" compatto className="shrink-0" icona={<IconaAzione chiave="copia" dimensione={20} />} titolo="Copia" title="Copia negli appunti (Ctrl+C)"
          aria-label="Copia negli appunti le voci selezionate" aria-keyshortcuts="Control+C" disabled={nessuna || occupato} onClick={onCopia} />
        <PulsanteVisivo tono="secondario" compatto className="shrink-0" icona={<IconaAzione chiave="taglia" dimensione={20} />} titolo="Taglia" title="Taglia negli appunti (Ctrl+X)"
          aria-label="Taglia negli appunti le voci selezionate" aria-keyshortcuts="Control+X" disabled={nessuna || occupato} onClick={onTaglia} />
        {/* C7: negli appunti fissi, per incollarle di nuovo in altri giorni (lo stesso testo di Copia, con un titolo da scegliere) */}
        <PulsanteVisivo tono="secondario" compatto className="shrink-0" icona={<IconaAzione chiave="piano" dimensione={20} />} titolo="Fissa…" title="Salva negli appunti fissi"
          aria-label="Fissa…: salva negli appunti fissi le voci selezionate" disabled={nessuna || occupato} onClick={onFisso} />
        <PulsanteVisivo tono="secondario" compatto className="shrink-0" icona={<IconaAzione chiave="calendario" dimensione={20} />} titolo="Altro giorno…"
          aria-label="Copia o sposta le voci selezionate in un altro giorno" disabled={nessuna || occupato} onClick={onAltroGiorno} />
      </div>
    </section>
  );
}
