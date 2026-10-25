// ============================================================
// OggiHome — «Oggi» della Home: la scheda della partita compatta sopra la guida del giorno e la mappa navigabile (R10-24)
// ============================================================
//
// Compone gli stessi pezzi della scheda «Oggi» della Partita (`OggiPartita`): `useOggi`, `OggiGuida` e `OggiMappa`, quindi la stessa
// guida, la stessa mappa e lo stesso centro. La **pagina Partita non cambia** (decisione dell'utente, 2026-10-23: «Partita non deve
// essere toccato»): il layout che segue vale solo per la Home.
//
// Disposizione, in `.home-griglia*` (src/tailwind.css): a sinistra la guida del giorno e a destra il visore incorporato, che parte da
// Tokyo e si sposta sulla mappa dell'azione scelta con «Sulla mappa». La mappa è a scomparsa (preferenza `mappaHomeChiusa`, con la
// linguetta sul bordo destro); su telefono e tablet verticale guida e mappa sono due schede «Guida | Mappa» (R10-24/4).
// ============================================================

import { useMemo, useState, type ReactNode } from 'react';
import { useOggi } from '../../hooks/useOggi';
import { useMedia } from '../../hooks/useMedia';
import { useNomeDelPosto } from '../../hooks/useNomeDelPosto';
import { usePreferenzeStore } from '../../stores/preferenzeStore';
import { PageState } from '../shared/PageState';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { OggiGuida } from './OggiGuida';
import { OggiMappa } from './OggiMappa';
import type { PartitaDto } from '../../types';

interface Props {
  partita: PartitaDto;
  /** Lo spazio sopra la guida e la mappa, a tutta larghezza: la scheda della partita della Home. */
  testa: ReactNode;
}

/** Crea lo stato `useOggi` della partita e affianca la guida e la mappa del giorno sotto la `testa` (schede sugli schermi stretti,
 * mappa a scomparsa dove le colonne ci sono). */
export function OggiHome({ partita, testa }: Props) {
  const oggi = useOggi(partita.id);

  // La mappa a scomparsa (richiesta dell'utente, 2026-09-30): chiusa, resta una linguetta sul bordo destro e la guida prende la sua
  // parte di pagina; il tocco sulla linguetta la riapre, col mouse il passaggio la fa uscire sopra il contenuto. «Sulla mappa» di
  // un'azione la riapre da sé (e porta sulla scheda «Mappa» dove guida e mappa sono schede): l'azione vuole mostrarla.
  const mappaChiusa = usePreferenzeStore((s) => s.mappaHomeChiusa);
  const impostaMappaChiusa = usePreferenzeStore((s) => s.impostaMappaHomeChiusa);
  const [schedaMappa, impostaSchedaMappa] = useState(false);
  const oggiHome = useMemo(() => ({
    ...oggi,
    sullaMappa: (m: Parameters<typeof oggi.sullaMappa>[0], voce: string | null) => { impostaMappaChiusa(false); impostaSchedaMappa(true); oggi.sullaMappa(m, voce); },
  }), [oggi, impostaMappaChiusa]);

  const guidaPronta = Boolean(oggi.indice && oggi.giorno);
  // L5 §4.4b (M1): la linguetta porta il nome del posto mostrato, mai «Mappa»
  const nomePosto = useNomeDelPosto(oggi.mappa.chiave);
  // R10-24/4: telefono e tablet verticale non hanno posto per due colonne: guida e mappa sono due schede «Guida | Mappa»
  // (stessa soglia di `.home-griglia--a-schede` in `tailwind.css`)
  const aSchede = useMedia('(max-width: 767px), (max-width: 1023px) and (orientation: portrait)');
  // L5 (LAY5-1): la stessa soglia della regola `@media` della Home in `tailwind.css`
  const riempi = useMedia('(min-width: 1024px) and (min-height: 1150px)') && !aSchede;
  const chiusa = mappaChiusa && guidaPronta && !aSchede;

  const classi = ['home-griglia', chiusa ? 'home-griglia--mappa-chiusa' : '', aSchede ? 'home-griglia--a-schede' : '', riempi ? 'home-griglia--riempi' : ''].filter(Boolean).join(' ');
  return (
    <div className={classi}>
      {testa}

      {aSchede && guidaPronta && (
        <div className="home-schede" role="tablist" aria-label="Guida o mappa">
          <button type="button" role="tab" aria-selected={!schedaMappa} className={`chip touch ${!schedaMappa ? 'chip--attivo' : ''}`} onClick={() => impostaSchedaMappa(false)}>Guida</button>
          <button type="button" role="tab" aria-selected={schedaMappa} className={`chip touch ${schedaMappa ? 'chip--attivo' : ''}`} onClick={() => impostaSchedaMappa(true)}>{nomePosto ? `Mappa · ${nomePosto}` : 'Mappa'}</button>
        </div>
      )}

      {!(aSchede && schedaMappa && guidaPronta) && (
        <section className="home-oggi flex flex-col gap-1.5" aria-label="Oggi nella partita">
          <h2 className="m-0 font-display testo-20 uppercase shrink-0">Oggi</h2>
          {/* L5 (LAY5-1): l'area interna della guida solo dove c'è altezza; altrove la guida cresce con la pagina */}
          <div className={riempi ? 'flex-1 min-h-0 riempi-figli' : undefined}>
            <PageState isLoading={oggi.caricamento} error={oggi.errore} onRetry={() => void oggi.ricarica()}>
              {/* R10-27: nella Home la scheda di un oggetto citato dalla voce si apre in un pannello sopra il diario */}
              {guidaPronta && <OggiGuida oggi={oggiHome} riempi={riempi} pannello />}
            </PageState>
          </div>
        </section>
      )}

      {guidaPronta && mappaChiusa && !aSchede && (
        <button type="button" className="home-linguetta touch" onClick={() => impostaMappaChiusa(false)} aria-label={nomePosto ? `Mostra ${nomePosto}` : 'Mostra la mappa'} title={`Mostra ${nomePosto ?? 'la mappa'} (col mouse basta passarci sopra)`}>
          <IconaAzione chiave="mappa" dimensione={20} /><span className="home-linguetta__testo">{nomePosto ?? '…'}</span>
        </button>
      )}
      {guidaPronta && (!aSchede || schedaMappa) && (
        <div className={`home-mappa ${chiusa ? 'home-mappa--a-scomparsa' : ''}`}>
          {!aSchede && (
            <div className="home-mappa__barra">
              {mappaChiusa
                ? <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Tieni aperta" onClick={() => impostaMappaChiusa(false)} />
                : <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Nascondi la mappa" onClick={() => impostaMappaChiusa(true)} />}
            </div>
          )}
          <OggiMappa oggi={oggiHome} riempi />
        </div>
      )}
    </div>
  );
}
