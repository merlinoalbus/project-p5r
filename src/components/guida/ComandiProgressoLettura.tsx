import type { DisponibilitaDto } from '../../types';
import { bloccata, motivoBlocco } from '../../utils/letture';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

interface Props {
  titolo: string;
  tipo: 'libro' | 'cinema' | 'dvd' | 'videogioco';
  progresso: number;
  totale: number;
  partita: boolean;
  occupato: boolean;
  disponibilita: DisponibilitaDto | null | undefined;
  passo?: number;
  onCambia: (progresso: number) => void;
}

/** La stessa barra e gli stessi gesti nelle pagine delle letture e nella scheda dell'oggetto.
 * La coda e il salvataggio restano del chiamante; al cinema le rivisioni non hanno un tetto. */
export function ComandiProgressoLettura({ titolo, tipo, progresso, totale, partita, occupato, disponibilita, passo = 1, onCambia }: Props) {
  const cinema = tipo === 'cinema';
  const gioco = tipo === 'videogioco';
  const unita = gioco ? 'un round' : cinema ? 'una visione' : 'una sessione';
  const percentuale = cinema ? Number(progresso > 0) * 100 : totale > 0 ? Math.round(progresso / totale * 100) : 0;
  const nonAncora = bloccata(disponibilita);
  const limita = (valore: number) => cinema ? Math.max(0, valore) : Math.min(totale, Math.max(0, valore));
  return <>
    <div>
      <div className="mb-1 flex justify-between text-xs text-text-secondary">
        <span>{cinema ? `${progresso} ${progresso === 1 ? 'visione' : 'visioni'}` : `${progresso} di ${totale} ${gioco ? 'round' : 'sessioni'}`}</span>
        {!cinema && <span className="tabular-nums">{percentuale}%</span>}
      </div>
      <div className="visore-mappa__progresso" role="progressbar" aria-label={`Progresso ${titolo}`} aria-valuemin={0} aria-valuemax={cinema ? Math.max(1, progresso) : totale} aria-valuenow={progresso}>
        <span className="visore-mappa__progresso-barra" style={{ width: `${percentuale}%` }} />
      </div>
    </div>
    {partita && <div className="grid grid-cols-2 gap-2" role="group" aria-label={`Avanzamento ${titolo}`}>
      <PulsanteVisivo tono="secondario" icona={<IconaAzione chiave="meno" dimensione={20} />} titolo="Togli"
        disabled={progresso === 0} onClick={() => onCambia(limita(progresso - passo))} aria-label={`Togli ${unita} a ${titolo}`} />
      <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo={gioco ? 'Round' : cinema ? 'Visione' : 'Sessione'}
        disabled={(!cinema && progresso >= totale) || (nonAncora && progresso === 0)} onClick={() => onCambia(limita(progresso + passo))} aria-label={`Aggiungi ${unita} a ${titolo}`} />
      {nonAncora && progresso === 0 && <p className="col-span-2 m-0 text-xs text-text-secondary" role="note">
        Non ancora {tipo === 'libro' ? 'leggibile' : gioco ? 'giocabile' : cinema ? 'in programmazione' : 'disponibile'}: {motivoBlocco(disponibilita)}
      </p>}
      {occupato && <span className="col-span-2 text-center text-xs text-text-muted" role="status">Salvataggio…</span>}
    </div>}
  </>;
}
