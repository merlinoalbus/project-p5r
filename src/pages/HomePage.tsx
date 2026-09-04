// ============================================================
// HomePage — cruscotto in una schermata: a sinistra Doti e guida del giorno, a destra accessi rapidi e mappa navigabile
// ============================================================
//
// Su desktop e tablet la pagina riempie l'area di lettura senza scorrimento (`.home`): scorrono solo l'elenco delle azioni del giorno
// e il pannello della mappa. Su mobile le colonne si impilano e la pagina scorre normalmente.
// ============================================================

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { useOggi } from '../hooks/useOggi';
import { getDoti, getPossedute } from '../services/api';
import { usePartitaStore } from '../stores/partitaStore';
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
import type { PartitaDto } from '../types';

/** Scorciatoie alle sezioni dell'app: colonna stretta a destra su desktop e tablet, griglia su mobile. */
function AccessiRapidi() {
  return (
    <nav className="accessi-rapidi grid grid-cols-2 sm:grid-cols-3 md:grid-cols-1 gap-1.5 content-start shrink-0" aria-label="Accessi rapidi">
      <Link to="/compendio" className="card card--cliccabile no-underline text-text flex items-center gap-3 py-2"><IconBook size={22} className="text-primary" /><span><strong>Compendio</strong><br /><span className="text-[12px] text-text-secondary">232 Persona</span></span></Link>
      <Link to="/skill" className="card card--cliccabile no-underline text-text flex items-center gap-3 py-2"><IconBolt size={22} className="text-primary" /><span><strong>Skill</strong><br /><span className="text-[12px] text-text-secondary">525 skill in italiano</span></span></Link>
      <Link to="/fusione" className="card card--cliccabile no-underline text-text flex items-center gap-3 py-2"><IconFusion size={22} className="text-primary" /><span><strong>Fusione</strong><br /><span className="text-[12px] text-text-secondary">Regole degli Arcani</span></span></Link>
      <Link to="/partita" className="card card--cliccabile no-underline text-text flex items-center gap-3 py-2"><IconMask size={22} className="text-primary" /><span><strong>Partita</strong><br /><span className="text-[12px] text-text-secondary">Doti, Confidenti, scorta</span></span></Link>
      <Link to="/guida" className="card card--cliccabile no-underline text-text flex items-center gap-3 py-2"><IconStar size={22} className="text-primary" /><span><strong>Guida</strong><br /><span className="text-[12px] text-text-secondary">Domande in classe, calendario, Confidenti</span></span></Link>
    </nav>
  );
}

/** Cruscotto della partita attiva: Doti e guida del giorno a sinistra, accessi rapidi e mappa a destra. */
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

  const guidaPronta = Boolean(oggi.indice && oggi.giorno);
  const statoOggi = oggi.errore
    ? <p className="m-0 text-[13px] text-text-secondary" role="alert">Guida del giorno non disponibile: {oggi.errore}</p>
    : <div className="flex items-center justify-center py-6" aria-busy="true"><Spinner /></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px] gap-3 md:flex-1 md:min-h-0">
      <div className="flex flex-col gap-3 md:min-h-0">
        <div className="card flex flex-col gap-2 py-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] uppercase tracking-wide text-text-muted">Partita attiva</span>
            <span className="font-semibold text-[16px]">{partita.nome}</span>
            <span className="chip">Liv. {partita.livelloProtagonista}</span>
            {partita.allarmeAttivo && <span className="chip chip--attivo">ALLARME</span>}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5">
            {doti.dati && doti.dati.length > 0 && (
              <Link to="/partita?scheda=doti" className="no-underline text-text shrink-0 px-7 pt-3 pb-1" aria-label="Apri le Doti sociali" style={{ width: 'clamp(150px, 20vh, 240px)' }}>
                <StellaCinque assi={doti.dati.map((d) => ({ chiave: d.chiave, etichetta: d.nome, valore: avanzamentoDote(d), badge: `doti/${d.chiave}`, badgeSotto: `ui/rango-${d.rango}`, testo: `Rango ${d.rango}` }))} dimensione={200} badgeAltezza={30} etichettaAria="Stella delle Doti sociali" />
              </Link>
            )}
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              <div className="kpi-griglia">
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
                <div className="flex flex-wrap items-center gap-1.5" aria-label="Arcani potenziati dalla scorta">
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
        <section className="flex flex-col gap-1.5 md:flex-1 md:min-h-0" aria-label="Oggi nella partita">
          <h2 className="m-0 font-display text-[19px] uppercase shrink-0">Oggi</h2>
          <div className="md:flex-1 md:min-h-0 riempi-figli">{guidaPronta ? <OggiGuida oggi={oggi} riempi /> : statoOggi}</div>
        </section>
      </div>

      <div className="flex flex-col gap-3 md:min-h-0">
        <AccessiRapidi />
        {guidaPronta && <div className="md:flex-1 md:min-h-0 riempi-figli"><OggiMappa oggi={oggi} riempi /></div>}
      </div>
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
