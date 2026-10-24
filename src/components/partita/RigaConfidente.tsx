// ============================================================
// RigaConfidente — la riga di sintesi di un Confidente nell'elenco della partita: ritratto, nome, arcano, rango e UN solo stato
// ============================================================
//
// Selezionabile (tutta la riga, almeno 44 px): sceglie il Confidente di cui il pannello di dettaglio mostra i comandi. Il pulsante di
// scelta copre la riga intera (`.riga-confidente__scelta::after`), così anche un tocco sul ritratto sceglie invece di aprire
// l'ingrandimento (che resta nel pannello, dove il ritratto è modificabile). Lo stato sintetico è uno solo, nell'ordine:
// MAX → Bloccato → Soglia raggiunta → avanzamento a punti → Solo trama → Senza punti → Da avviare.
// ============================================================

import { ImmagineEntita } from '../shared/ImmagineEntita';
import { TargaSuggerito } from '../shared/Suggerito';
import { IconaAzione } from '../shared/IconaAzione';
import { formattaPunti } from '../../utils/punti';
import { classiSuggerito } from '../../utils/suggerimenti';
import type { ConfidentePartitaDto } from '../../types';
import { aPuntiDi } from './regoleConfidente';

interface Props {
  c: ConfidentePartitaDto;
  selezionata: boolean;
  oggi: boolean;
  motivoOggi?: string | null;
  /** Sceglie questo Confidente (il pannello, o il foglio sotto i 1024 px, ne mostra i comandi). */
  onScegli: () => void;
}

/** Lo stato sintetico della riga: una sola indicazione per Confidente, nell'ordine di priorità della disposizione. */
function StatoSintetico({ c }: { c: ConfidentePartitaDto }) {
  const aPunti = aPuntiDi(c);
  if (c.rango === 10) return <span className="riga-confidente__stato text-primary font-semibold">MAX</span>;
  if (c.bloccato) {
    return (
      <span className="riga-confidente__stato" title={c.bloccato.motivi.join(' · ')}>
        <span className="inline-flex items-center gap-1 text-text-secondary font-semibold"><IconaAzione chiave="bloccato" dimensione={14} />Bloccato · rango {c.bloccato.rango}</span>
        {c.bloccato.motivi[0] && <span className="block truncate text-text-muted">{c.bloccato.motivi[0]}</span>}
      </span>
    );
  }
  if (aPunti && c.mancanti === 0) return <span className="riga-confidente__stato text-primary font-semibold">Soglia raggiunta</span>;
  if (aPunti) {
    const quota = Math.min(1, c.punti / (c.puntiNecessari ?? 1));
    return (
      <span className="riga-confidente__stato">
        <span className="riga-confidente__barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(quota * 100)} aria-label={`Punti verso il rango ${c.rango + 1}`}>
          <span style={{ width: `${Math.round(quota * 100)}%` }} />
        </span>
        <span className="tabular-nums text-text-secondary">{formattaPunti(c.punti)} / {c.puntiNecessari} punti</span>
      </span>
    );
  }
  if (c.rango === 0) return <span className="riga-confidente__stato text-text-muted">Da avviare</span>;
  if (c.puntiNecessari === null) return <span className="riga-confidente__stato text-text-muted">Solo trama</span>;
  return <span className="riga-confidente__stato text-text-muted">Senza punti</span>;
}

/** Una riga dell'elenco: `li` con il ritratto e un pulsante di scelta che copre tutta la riga. */
export function RigaConfidente({ c, selezionata, oggi, motivoOggi, onScegli }: Props) {
  return (
    <li className={`riga-confidente ${selezionata ? 'riga-confidente--scelta' : ''} ${c.sbloccato || c.rango > 0 ? '' : 'opacity-80'} ${classiSuggerito(oggi, 'riga')}`}>
      <ImmagineEntita ambito="confidente" chiave={c.chiave} etichetta={c.nome} dimensione={32} forma="carta" adatta="copri" />
      {/* il nome accessibile è il contenuto stesso (nome, Oggi, arcano, stato, rango): niente aria-label che lo nasconda */}
      <button type="button" className="riga-confidente__scelta touch" onClick={onScegli} aria-current={selezionata ? 'true' : undefined}>
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="font-display uppercase text-[17px] leading-none tracking-wide truncate">{c.nome}</span>
          {oggi && <TargaSuggerito motivo={motivoOggi} compatta />}
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-text-muted min-w-0">
          <span className="truncate">{c.arcanaNome}</span>
        </span>
        <StatoSintetico c={c} />
        <span className="riga-confidente__rango"><span className="sr-only">Rango </span>{c.rango === 10 ? 'MAX' : c.rango}</span>
      </button>
    </li>
  );
}
