// ============================================================
// HomePage — cruscotto: partita attiva, Doti, scorciatoie
// ============================================================

import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { getDoti, getPossedute } from '../services/api';
import { usePartitaStore } from '../stores/partitaStore';
import { IconBolt, IconBook, IconFusion, IconMask, IconStar } from '../components/shared/icons';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';

/** Pagina iniziale con lo stato della partita attiva e gli accessi rapidi. */
export function HomePage() {
  useDocumentTitle('Home');
  const attiva = usePartitaStore((s) => s.attiva);
  const doti = useCarica(() => (attiva ? getDoti(attiva.id) : Promise.resolve(null)), [attiva?.id]);
  const scorta = useCarica(() => (attiva ? getPossedute(attiva.id) : Promise.resolve(null)), [attiva?.id]);

  return (
    <div className="flex flex-col gap-4">
      <IntestazionePagina titolo="Compagno di gioco" sottotitolo="Persona 5 Royal: Doti, Confidenti, Persona possedute e guida giorno per giorno, con lo stato della tua partita." illustrazione="identita/logo-senza-testo" />
      {attiva ? (
        <div className="card flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] uppercase tracking-wide text-text-muted">Partita attiva</span>
            <span className="font-semibold text-[16px]">{attiva.nome}</span>
            <span className="chip">Liv. {attiva.livelloProtagonista}</span>
            {attiva.allarmeAttivo && <span className="chip chip--attivo">ALLARME</span>}
          </div>
          <div className="flex gap-2 flex-wrap">
            {doti.dati?.map((d) => (
              <Link key={d.chiave} to="/partita?scheda=doti" className="kpi-tile no-underline text-text min-w-[110px]">
                <span className="kpi-label">{d.nome}</span>
                <span className="kpi-value">{d.punti}</span>
              </Link>
            ))}
            <Link to="/partita?scheda=scorta" className="kpi-tile no-underline text-text min-w-[110px]">
              <span className="kpi-label">Scorta</span>
              <span className="kpi-value">{scorta.dati?.length ?? '…'}</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="card text-[13px] text-text-secondary">
          Nessuna partita attiva: <Link to="/partita" className="text-primary">creane una</Link> per iniziare a tracciare Doti sociali, Confidenti e Persona.
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link to="/compendio" className="card card--cliccabile no-underline text-text flex items-center gap-3"><IconBook size={22} className="text-primary" /><span><strong>Compendio</strong><br /><span className="text-[12px] text-text-secondary">232 Persona</span></span></Link>
        <Link to="/skill" className="card card--cliccabile no-underline text-text flex items-center gap-3"><IconBolt size={22} className="text-primary" /><span><strong>Skill</strong><br /><span className="text-[12px] text-text-secondary">525 skill in italiano</span></span></Link>
        <Link to="/fusione" className="card card--cliccabile no-underline text-text flex items-center gap-3"><IconFusion size={22} className="text-primary" /><span><strong>Fusione</strong><br /><span className="text-[12px] text-text-secondary">Regole degli Arcani</span></span></Link>
        <Link to="/partita" className="card card--cliccabile no-underline text-text flex items-center gap-3"><IconMask size={22} className="text-primary" /><span><strong>Partita</strong><br /><span className="text-[12px] text-text-secondary">Doti, Confidenti, scorta</span></span></Link>
        <Link to="/guida" className="card card--cliccabile no-underline text-text flex items-center gap-3"><IconStar size={22} className="text-primary" /><span><strong>Guida</strong><br /><span className="text-[12px] text-text-secondary">Domande in classe, calendario, Confidenti</span></span></Link>
      </div>
    </div>
  );
}
