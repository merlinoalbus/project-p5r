// ============================================================
// HomePage — cruscotto: la scheda della partita compatta sopra `OggiHome` (guida del giorno e mappa navigabile); accessi rapidi solo senza partita
// ============================================================
//
// Guida e mappa non sono più composte qui: la Home incorpora lo stesso componente della scheda «Oggi» della Partita (R10-24). La scheda
// della partita (stella, Doti, Scorta, Arcani) è la `testa` che gli passa.
// ============================================================

import { useMemo, useState } from 'react';
import { OggiHome } from '../components/partita/OggiHome';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { getDoti, getPossedute } from '../services/api';
import { usePartitaStore } from '../stores/partitaStore';
import { IconBolt, IconBook, IconFusion, IconMask, IconStar } from '../components/shared/icons';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { StellaCinque } from '../components/shared/StellaCinque';
import { AssetImg } from '../components/shared/AssetImg';
import { IconMaschera } from '../components/shared/iconeGuida';
import { slug } from '../../shared/slug';
import { avanzamentoDote } from '../utils/doti';
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
            fallback={<span className="text-primary-testo">{s.riserva}</span>} />
          <span><strong>{s.titolo}</strong><br /><span className="testo-12 text-text-secondary">{s.dettaglio}</span></span>
        </Link>
      ))}
    </nav>
  );
}

/** Cruscotto della partita attiva: la scheda della partita (stella, Doti, Scorta, Arcani) sopra `OggiHome`, che compone gli stessi pezzi della
 * scheda «Oggi» della Partita, con la stessa guida, la stessa mappa e lo stesso centro. */
function HomeConPartita({ partita }: { partita: PartitaDto }) {
  const doti = useCarica(() => getDoti(partita.id), [partita.id]);
  const scorta = useCarica(() => getPossedute(partita.id), [partita.id]);
  // Arcani con almeno una Persona in scorta: i Confidenti di quell'arcano ricevono il bonus ×1,5 sui punti.
  const arcaniInScorta = useMemo(() => {
    const visti = new Map<string, string>();
    for (const p of scorta.dati ?? []) if (!visti.has(p.arcana)) visti.set(p.arcana, p.arcanaNome);
    return [...visti.entries()].map(([chiave, nome]) => ({ chiave, nome }));
  }, [scorta.dati]);

  // R10-24/3: sul telefono le Doti sono una fila di tessere e la stella si apre con un tocco
  const telefono = useMedia('(max-width: 767px)');
  const [stellaAperta, impostaStellaAperta] = useState(false);
  const mostraStella = Boolean(doti.dati && doti.dati.length > 0) && (!telefono || stellaAperta);

  const testa = (
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
              <span className="hidden sm:inline testo-12 uppercase tracking-wide text-text-muted shrink-0">Partita attiva</span>
              <span className="font-semibold testo-15 truncate min-w-0">{partita.nome}</span>
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
              <FilaScorrevole className="home-fila" role="group" aria-label="Arcani potenziati dalla scorta">
                <span className="testo-12 font-semibold uppercase tracking-[.06em] text-text-muted">Arcani potenziati</span>
                {arcaniInScorta.length === 0 && <span className="testo-12 text-text-muted">nessuna Persona in scorta</span>}
                {arcaniInScorta.map((a) => (
                  <Link key={a.chiave} to="/partita?scheda=confidenti" className="chip chip--icona chip--attivo no-underline" title={`Persona ${a.nome} in scorta: i Confidenti ${a.nome} guadagnano punti ×1,5`}>
                    <AssetImg nome={`arcani/icona/${slug(a.chiave)}`} alt="" decorativa className="h-4 w-4 object-contain" fallback={<IconMaschera size={14} />} />
                    {a.nome}
                  </Link>
                ))}
              </FilaScorrevole>
            )}
          </div>
        </div>
      </div>
  );

  // R10-24: la Home compone gli stessi pezzi della scheda «Oggi» della Partita (stessa guida, stessa mappa, stesso centro) con la scheda della partita come testa
  return <OggiHome partita={partita} testa={testa} />;
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
          <div className="card testo-13 text-text-secondary">
            Nessuna partita attiva: <Link to="/partita" className="text-primary-testo">creane una</Link> per iniziare a tracciare Doti sociali, Confidenti e Persona.
          </div>
          <AccessiRapidi />
        </>
      )}
    </div>
  );
}
