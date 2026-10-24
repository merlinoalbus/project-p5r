// ============================================================
// RigaConfidente — la scheda compatta di un Confidente nella griglia della partita: ritratto, nome, arcano, rango e UN solo stato
// ============================================================
//
// Progetto approvato dall'utente (2026-10-24, tavola 2 del canvas): il disegno fissa posizioni e spazi, la grafica resta quella dei
// poster (filigrana dell'arcano, cifra del rango in immagine `ui/rango-N` dentro l'anello d'avanzamento, scala di grigi per i bloccati).
// Tutta la scheda è il pulsante che apre il cassetto (`.riga-confidente__scelta::after`). Lo stato sintetico è uno solo, nell'ordine:
// MAX → Bloccato → Pronto per il rango N (soglia raggiunta) → punti e quanto manca → Da avviare → Solo trama → Senza punti.
// ============================================================

import { ImmagineEntita } from '../shared/ImmagineEntita';
import { AssetImg } from '../shared/AssetImg';
import { AnelloAvanzamento } from '../shared/AnelloAvanzamento';
import { TargaSuggerito } from '../shared/Suggerito';
import { IconaAzione } from '../shared/IconaAzione';
import { formattaPunti } from '../../utils/punti';
import { classiSuggerito } from '../../utils/suggerimenti';
import { slug } from '../../../shared/slug';
import type { ConfidentePartitaDto } from '../../types';
import { aPuntiDi, sogliaRaggiunta } from './regoleConfidente';

interface Props {
  c: ConfidentePartitaDto;
  selezionata: boolean;
  oggi: boolean;
  motivoOggi?: string | null;
  /** Apre il cassetto di questo Confidente. */
  onScegli: () => void;
}

/** Lo stato sintetico della scheda: una sola indicazione per Confidente, nell'ordine di priorità del progetto. */
function StatoSintetico({ c }: { c: ConfidentePartitaDto }) {
  if (c.rango === 10) return <span className="riga-confidente__stato text-primary font-semibold">Rango massimo</span>;
  if (c.bloccato) {
    return (
      <span className="riga-confidente__stato truncate" title={c.bloccato.motivi.join(' · ')}>
        <span className="inline-flex items-center gap-1 align-middle"><IconaAzione chiave="bloccato" dimensione={13} /></span>
        {' '}Bloccato · rango {c.bloccato.rango}{c.bloccato.motivi[0] ? ` · ${c.bloccato.motivi[0]}` : ''}
      </span>
    );
  }
  if (sogliaRaggiunta(c)) return <span className="riga-confidente__stato text-primary font-semibold">Pronto per il rango {c.rango + 1}</span>;
  if (aPuntiDi(c)) {
    return (
      <span className="riga-confidente__stato tabular-nums text-text-secondary">
        {formattaPunti(c.punti)} / {c.puntiNecessari} · mancano {formattaPunti(c.mancanti ?? 0)}
      </span>
    );
  }
  if (c.rango === 0) return <span className="riga-confidente__stato text-text-muted">Da avviare: incontralo in gioco</span>;
  if (c.puntiNecessari === null) return <span className="riga-confidente__stato text-text-muted">Solo trama</span>;
  return <span className="riga-confidente__stato text-text-muted">Il rango {c.rango + 1} non dipende dai punti</span>;
}

/** Una scheda della griglia: `li` con filigrana, ritratto, testi e il rango nell'anello; il pulsante di scelta copre tutta la scheda. */
export function RigaConfidente({ c, selezionata, oggi, motivoOggi, onScegli }: Props) {
  const aPunti = aPuntiDi(c);
  const quota = aPunti ? Math.min(1, c.punti / (c.puntiNecessari ?? 1)) : c.rango === 10 ? 1 : 0;
  const pronto = sogliaRaggiunta(c) && !c.bloccato;
  return (
    <li className={`riga-confidente ${pronto ? 'riga-confidente--pronta' : ''} ${selezionata ? 'riga-confidente--scelta' : ''} ${c.bloccato && c.rango === 0 ? 'poster--bloccato' : ''} ${classiSuggerito(oggi, 'riga')}`}>
      <AssetImg nome={`arcani/${slug(c.arcana)}-senza-testo`} alt="" decorativa className="poster__filigrana" fallback={null} />
      <ImmagineEntita ambito="confidente" chiave={c.chiave} etichetta={c.nome} dimensione={44} forma="carta" adatta="copri" />
      {/* il nome accessibile è il contenuto stesso (nome, Oggi, arcano, stato, rango): niente aria-label che lo nasconda */}
      <button type="button" className="riga-confidente__scelta touch" onClick={onScegli} aria-current={selezionata ? 'true' : undefined}>
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="font-display uppercase text-[18px] leading-none tracking-wide truncate">{c.nome}</span>
          {oggi && <TargaSuggerito motivo={motivoOggi} compatta />}
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-text-muted min-w-0">
          <AssetImg nome={`arcani/icona/${slug(c.arcana)}`} alt="" decorativa className="h-4 w-4 shrink-0 object-contain" fallback={null} />
          <span className="truncate">{c.arcanaNome}</span>
        </span>
        <StatoSintetico c={c} />
        <span className="riga-confidente__rango">
          <AnelloAvanzamento quota={quota} dimensione={54} spessore={4} etichetta={aPunti ? `Progresso di ${c.nome} verso il rango ${c.rango + 1}` : undefined}>
            <AssetImg
              nome={c.rango === 0 ? null : c.rango === 10 ? 'ui/rango-max' : `ui/rango-${c.rango}`}
              alt={c.rango === 10 ? 'Rango MAX' : `Rango ${c.rango}`}
              className="h-9 w-9 object-contain"
              fallback={<span className={`font-display text-[22px] leading-none tabular-nums ${c.rango === 10 ? 'text-primary' : ''}`}>{c.rango === 10 ? 'MAX' : c.rango}</span>}
            />
          </AnelloAvanzamento>
        </span>
      </button>
    </li>
  );
}
