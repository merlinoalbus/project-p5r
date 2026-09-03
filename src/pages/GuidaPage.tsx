// ============================================================
// GuidaPage — ingresso della sezione Guida: domande in classe, calendario (e i moduli delle fasi successive)
// ============================================================

import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { IconBook, IconMask, IconStar } from '../components/shared/icons';

export function GuidaPage() {
  useDocumentTitle('Guida');
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="m-0 text-2xl font-bold">Guida</h1>
        <p className="m-0 mt-1 text-[13px] text-text-secondary">La guida italiana allgamestaff resa consultabile in gioco, con lo stato della tua partita.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link to="/guida/domande" className="card card--cliccabile no-underline text-text flex items-center gap-3"><IconBook size={22} className="text-primary" /><span><strong>Domande in classe ed esami</strong><br /><span className="text-[12px] text-text-secondary">Risposte corrette per data, prossime domande, spunta «fatta»</span></span></Link>
        <Link to="/guida/calendario" className="card card--cliccabile no-underline text-text flex items-center gap-3"><IconStar size={22} className="text-primary" /><span><strong>Calendario di gioco</strong><br /><span className="text-[12px] text-text-secondary">Meteo, eventi, scadenze dei Palazzi, consigli per settimana</span></span></Link>
        <Link to="/guida/dungeon" className="card card--cliccabile no-underline text-text flex items-center gap-3"><IconMask size={22} className="text-primary" /><span><strong>Palazzi e Dedali</strong><br /><span className="text-[12px] text-text-secondary">Aree, punti di interesse, boss e mappe interattive con avanzamento</span></span></Link>
        <Link to="/partita?scheda=confidenti" className="card card--cliccabile no-underline text-text flex items-center gap-3"><IconStar size={22} className="text-primary" /><span><strong>Confidenti</strong><br /><span className="text-[12px] text-text-secondary">Risposte migliori, abilità e regali per ogni Confidente</span></span></Link>
      </div>
    </div>
  );
}
