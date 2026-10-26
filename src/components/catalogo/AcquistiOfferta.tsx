import type { ArticoloDto } from '../../types';
import { eOffertaAojiru, type StatoAcquistiArticoloDto } from '../../../shared/acquisti';
import { eRifornibile } from '../../../shared/rifornimento';
import { dataLeggibile } from '../../../shared/condizioniSpillo';
import { ConsumiAojiru } from './ConsumiAojiru';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

/**
 * La spunta è della singola offerta; lo stato condiviso conserva tutte le registrazioni originarie.
 *
 * Ondata 5 (decisione 21): un'offerta che si rifornisce (regola diversa dal pezzo unico) non ha una spunta ma «Compra», che aggiunge un
 * acquisto al ciclo in corso, e l'elenco degli acquisti del ciclo, ognuno con il suo «Annulla» (quelli di una voce del Diario si tolgono
 * togliendo la spunta della voce). I pezzi rimasti («2/3») si vedono solo se il ciclo ne ha più di uno; quando la scorta finisce lo dice la
 * disponibilità («Esaurito: torna lunedì 25 aprile»), che blocca «Compra».
 */
export function AcquistiOfferta({ articolo, nome, registrati, acquistato, bloccato, occupato, onCambia, partitaId, acquisti, onRileggi, rifornimento, scorta, onAnnullaRiga }: {
  articolo: string; nome: string; registrati: NonNullable<ArticoloDto['acquistiRegistrati']>;
  acquistato: boolean; bloccato: boolean; occupato: boolean;
  onCambia: (articolo: string, fatto: boolean) => void;
  partitaId?: number; acquisti?: StatoAcquistiArticoloDto; onRileggi?: () => void | Promise<void>;
  rifornimento?: ArticoloDto['rifornimento']; scorta?: ArticoloDto['scorta']; onAnnullaRiga?: (rigaId: number) => void;
}) {
  if (partitaId !== undefined && eOffertaAojiru({ chiave: articolo })) return <ConsumiAojiru key={`${partitaId}:${articolo}`} partitaId={partitaId} stato={acquisti} onCambiato={onRileggi ?? (() => undefined)} />;
  const qui = registrati.some((r) => r.articolo === articolo);
  const altri = registrati.filter((r) => r.articolo !== articolo);
  const conCiclo = eRifornibile(rifornimento?.regola ?? null);
  return <div className="flex flex-col gap-1">
    {conCiclo && scorta ? <>
      <div className="flex flex-wrap items-center gap-2">
        <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Compra" disabled={occupato || bloccato}
          onClick={() => onCambia(articolo, true)} aria-label={`Compra ${nome}`} />
        {scorta.quantita !== null && scorta.quantita > 1 && scorta.rimasti !== null && <span className="testo-12 tabular-nums" aria-label={`Rimasti ${scorta.rimasti} di ${scorta.quantita}`}>{scorta.rimasti}/{scorta.quantita}</span>}
      </div>
      {scorta.righe.length > 0 && <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {scorta.righe.map((r) => <li key={r.id} className="flex flex-wrap items-center gap-1 testo-12">
          <span className="text-pretty">Comprato il {dataLeggibile(r.giorno)}{r.fascia === 'sera' ? ' sera' : ''}{r.quantita > 1 ? <span className="tabular-nums"> ×{r.quantita}</span> : null}{r.fonte === 'voce' ? ' · dal Diario' : ''}</span>
          {r.fonte === 'negozio' && onAnnullaRiga && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato}
            onClick={() => onAnnullaRiga(r.id)} aria-label={`Annulla l'acquisto di ${nome} del ${dataLeggibile(r.giorno)}`} />}
        </li>)}
      </ul>}
    </> : <label className="touch flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={qui}
      disabled={occupato || (!qui && bloccato)} onChange={(e) => onCambia(articolo, e.target.checked)}
      aria-label={`${nome}: acquisto su questa offerta`} />Acquistato qui</label>}
    {acquistato && altri.length > 0 && <span className="testo-12">Già acquistato nel listino condiviso</span>}
    {altri.map((r) => <div className="flex flex-wrap items-center gap-1 testo-12" key={r.articolo}>
      <span>Registrazione: {r.negozioNome}</span>
      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={() => onCambia(r.articolo, false)} aria-label={`Annulla solo l'acquisto di ${nome} da ${r.negozioNome}`} />
    </div>)}
  </div>;
}
