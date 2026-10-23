// ============================================================
// HomePage — cruscotto in una schermata: Doti e guida del giorno a sinistra, mappa navigabile a destra (accessi rapidi solo senza partita)
// ============================================================
//
// Su desktop e tablet la pagina riempie l'area di lettura senza scorrimento (`.home`): scorrono solo l'elenco delle azioni del giorno
// e il pannello della mappa. Su mobile le colonne si impilano e la pagina scorre normalmente.
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { useOggi } from '../hooks/useOggi';
import { getDoti, getPossedute } from '../services/api';
import { usePartitaStore } from '../stores/partitaStore';
import { usePreferenzeStore } from '../stores/preferenzeStore';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { IconBolt, IconBook, IconFusion, IconMask, IconStar } from '../components/shared/icons';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { StellaCinque } from '../components/shared/StellaCinque';
import { AssetImg } from '../components/shared/AssetImg';
import { IconMaschera } from '../components/shared/iconeGuida';
import { Spinner } from '../components/shared/PageState';
import { OggiGuida } from '../components/partita/OggiGuida';
import { OggiMappa } from '../components/partita/OggiMappa';
import { slug } from '../../shared/slug';
import { avanzamentoDote } from '../utils/doti';
import { useNomeDelPosto } from '../hooks/useNomeDelPosto';
import { useMedia } from '../hooks/useMedia';
import type { PartitaDto } from '../types';

/** Le cinque scorciatoie, con **la stessa figura della barra di navigazione**.
 *
 * Qui c'erano cinque SVG disegnati in codice, e nessuno cercava l'asset: le stesse cinque sezioni
 * nella colonna a sinistra mostrano la grafica vera (`ui/nav-<chiave>`), e in Home no — due icone
 * diverse per la stessa cosa, nella stessa schermata. Ora si guarda l'asset e l'SVG resta la
 * riserva, come dappertutto. */
const SCORCIATOIE = [
  { to: '/compendio', asset: 'ui/nav-compendio', titolo: 'Compendio', dettaglio: '232 Persona', riserva: <IconBook size={22} /> },
  { to: '/skill', asset: 'ui/nav-skill', titolo: 'Skill', dettaglio: '525 skill in italiano', riserva: <IconBolt size={22} /> },
  { to: '/fusione', asset: 'ui/nav-fusione', titolo: 'Fusione', dettaglio: 'Regole degli Arcani', riserva: <IconFusion size={22} /> },
  { to: '/partita', asset: 'ui/nav-partita', titolo: 'Partita', dettaglio: 'Doti, Confidenti, scorta', riserva: <IconMask size={22} /> },
  { to: '/guida', asset: 'ui/nav-guida', titolo: 'Guida', dettaglio: 'Domande in classe, calendario, Confidenti', riserva: <IconStar size={22} /> },
];

/** Scorciatoie alle sezioni dell'app: colonna stretta a destra su desktop e tablet, griglia su mobile. */
function AccessiRapidi() {
  return (
    <nav className="accessi-rapidi grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1.5 content-start" aria-label="Accessi rapidi">
      {SCORCIATOIE.map((s) => (
        <Link key={s.to} to={s.to} className="card card--cliccabile no-underline text-text flex items-center gap-3 py-2">
          <AssetImg nome={s.asset} alt="" decorativa className="h-[26px] w-[26px] shrink-0 object-contain"
            fallback={<span className="text-primary">{s.riserva}</span>} />
          <span><strong>{s.titolo}</strong><br /><span className="text-[12px] text-text-secondary">{s.dettaglio}</span></span>
        </Link>
      ))}
    </nav>
  );
}

/** Cruscotto della partita attiva: Doti e guida del giorno a sinistra, mappa a tutta altezza a destra. */
function HomeConPartita({ partita }: { partita: PartitaDto }) {
  const doti = useCarica(() => getDoti(partita.id), [partita.id]);
  const scorta = useCarica(() => getPossedute(partita.id), [partita.id]);
  const oggi = useOggi(partita.id);
  // Arcani con almeno una Persona in scorta: i Confidenti di quell'arcano ricevono il bonus ×1,5 sui punti.
  const arcaniInScorta = useMemo(() => {
    const visti = new Map<string, string>();
    for (const p of scorta.dati ?? []) if (!visti.has(p.arcana)) visti.set(p.arcana, p.arcanaNome);
    return [...visti.entries()].map(([chiave, nome]) => ({ chiave, nome }));
  }, [scorta.dati]);

  // La mappa a scomparsa (richiesta dell'utente, 2026-09-30): chiusa, resta una linguetta sul bordo destro e carta e
  // guida prendono la sua parte di pagina; il tocco sulla linguetta la riapre, col mouse il passaggio la fa uscire sopra
  // il contenuto. «Sulla mappa» di un'azione la riapre da sé: l'azione vuole mostrarla.
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
  // L5 (LAY5-1): la stessa soglia della regola `@media` della Home in `tailwind.css`
  const riempi = useMedia('(min-width: 1024px) and (min-height: 1150px)');
  // R10-24/4: telefono e tablet verticale non hanno posto per due colonne: guida e mappa sono due schede «Guida | Mappa»
  // (stessa soglia di `.home-griglia--a-schede` in `tailwind.css`); la mappa a scomparsa e la linguetta restano dove le colonne ci sono.
  const aSchede = useMedia('(max-width: 767px), (max-width: 1023px) and (orientation: portrait)');
  // R10-24/3: sul telefono le Doti sono una fila di tessere e la stella si apre con un tocco
  const telefono = useMedia('(max-width: 767px)');
  const [stellaAperta, impostaStellaAperta] = useState(false);
  const mostraStella = Boolean(doti.dati && doti.dati.length > 0) && (!telefono || stellaAperta);
  const chiusa = mappaChiusa && guidaPronta && !aSchede;
  const statoOggi = oggi.errore
    ? <p className="m-0 text-[13px] text-text-secondary" role="alert">Guida del giorno non disponibile: {oggi.errore}</p>
    : <div className="flex items-center justify-center py-6" aria-busy="true"><Spinner /></div>;

  return (
    <div className={`home-griglia ${chiusa ? 'home-griglia--mappa-chiusa' : ''} ${aSchede ? 'home-griglia--a-schede' : ''}`}>
      <div className="home-carta card">
        <div className="home-carta__riga">
          {mostraStella && doti.dati && (
            // R10-24/3: la stella è quadrata quanto la riga (misure e disposizione in `.home-carta__stella`, src/tailwind.css); il
            // rientro percentuale interno lascia dentro il riquadro le targhette dei vertici (R10-24/5), che scalano con la stella.
            <Link to="/partita?scheda=doti" className="home-carta__stella no-underline text-text" aria-label="Apri le Doti sociali">
              <div className="home-carta__stella-interno">
                <StellaCinque assi={doti.dati.map((d) => ({ chiave: d.chiave, etichetta: d.nome, valore: avanzamentoDote(d), badge: `doti/${d.chiave}`, badgeSotto: `ui/rango-${d.rango}`, testo: `Rango ${d.rango}` }))} dimensione={420} badgeAltezza={62} etichettaAria="Stella delle Doti sociali" />
              </div>
            </Link>
          )}
          <div className="home-carta__corpo">
            <div className="home-carta__testa">
              <span className="hidden sm:inline text-[11px] uppercase tracking-wide text-text-muted shrink-0">Partita attiva</span>
              <span className="font-semibold text-[15px] truncate min-w-0">{partita.nome}</span>
              <span className="chip shrink-0">Liv. {partita.livelloProtagonista}</span>
              {partita.allarmeAttivo && <span className="chip chip--attivo shrink-0">ALLARME</span>}
              {telefono && doti.dati && doti.dati.length > 0 && (
                <button type="button" className="chip chip--icona touch ml-auto shrink-0" aria-expanded={stellaAperta} onClick={() => impostaStellaAperta((v) => !v)} title="Mostra o nascondi la stella delle Doti">
                  <IconStar size={14} />Stella
                </button>
              )}
            </div>
            <div className="home-doti">
              {doti.dati?.map((d) => (
                <Link key={d.chiave} to="/partita?scheda=doti" className="kpi-tile kpi-tile--compatto no-underline text-text">
                  <span className="kpi-label">{d.nome}</span>
                  <span className="kpi-value">{d.punti}</span>
                </Link>
              ))}
              <Link to="/partita?scheda=scorta" className="kpi-tile kpi-tile--compatto no-underline text-text">
                <span className="kpi-label">Scorta</span>
                <span className="kpi-value">{scorta.dati?.length ?? '…'}</span>
              </Link>
            </div>
            {scorta.dati && (
              <div className="home-fila" role="group" aria-label="Arcani potenziati dalla scorta">
                <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-text-muted">Arcani potenziati</span>
                {arcaniInScorta.length === 0 && <span className="text-[12px] text-text-muted">nessuna Persona in scorta</span>}
                {arcaniInScorta.map((a) => (
                  <Link key={a.chiave} to="/partita?scheda=confidenti" className="chip chip--icona chip--attivo no-underline" title={`Persona ${a.nome} in scorta: i Confidenti ${a.nome} guadagnano punti ×1,5`}>
                    <AssetImg nome={`arcani/icona/${slug(a.chiave)}`} alt="" decorativa className="h-4 w-4 object-contain" fallback={<IconMaschera size={14} />} />
                    {a.nome}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {aSchede && guidaPronta && (
        <div className="home-schede" role="tablist" aria-label="Guida o mappa">
          <button type="button" role="tab" aria-selected={!schedaMappa} className={`chip touch ${!schedaMappa ? 'chip--attivo' : ''}`} onClick={() => impostaSchedaMappa(false)}>Guida</button>
          <button type="button" role="tab" aria-selected={schedaMappa} className={`chip touch ${schedaMappa ? 'chip--attivo' : ''}`} onClick={() => impostaSchedaMappa(true)}>{nomePosto ? `Mappa · ${nomePosto}` : 'Mappa'}</button>
        </div>
      )}

      {!(aSchede && schedaMappa && guidaPronta) && (
      <section className="home-oggi flex flex-col gap-1.5" aria-label="Oggi nella partita">
        <h2 className="m-0 font-display text-[19px] uppercase shrink-0">Oggi</h2>
        {/* L5 (LAY5-1): l'area interna della guida solo dove c'è altezza (da 1024 × 1150); altrove la guida cresce con la pagina */}
        <div className={riempi ? 'flex-1 min-h-0 riempi-figli' : undefined}>{guidaPronta ? <OggiGuida oggi={oggiHome} riempi={riempi} senzaDaApplicare /> : statoOggi}</div>
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

/** Pagina iniziale con lo stato della partita attiva e gli accessi rapidi. */
export function HomePage() {
  useDocumentTitle('Home');
  const attiva = usePartitaStore((s) => s.attiva);
  return (
    <div className="home flex flex-col gap-3">
      <IntestazionePagina titolo="Compagno di gioco" sottotitolo="Persona 5 Royal: Doti, Confidenti, Persona possedute e guida giorno per giorno, con lo stato della tua partita." illustrazione="identita/logo-senza-testo" compatta />
      {attiva ? (
        <HomeConPartita key={attiva.id} partita={attiva} />
      ) : (
        <>
          <div className="card text-[13px] text-text-secondary">
            Nessuna partita attiva: <Link to="/partita" className="text-primary">creane una</Link> per iniziare a tracciare Doti sociali, Confidenti e Persona.
          </div>
          <AccessiRapidi />
        </>
      )}
    </div>
  );
}
