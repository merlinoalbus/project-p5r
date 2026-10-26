import type { ArticoloDto, ScortaArticoloDto } from '../../types';
import { eOffertaAojiru, type StatoAcquistiArticoloDto } from '../../../shared/acquisti';
import { eRifornibile } from '../../../shared/rifornimento';
import { dataLeggibile } from '../../../shared/condizioniSpillo';
import { ConsumiAojiru } from './ConsumiAojiru';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

type RigaScorta = ScortaArticoloDto['righe'][number];

/**
 * Un acquisto del registro: giorno, fascia e pezzi, e il negozio o la sede solo quando sono diversi da quelli che si guardano (una vecchia
 * chiave del listino condiviso, un altro distributore dello stesso listino); «Annulla» solo per quelli della pagina del negozio (quelli di
 * una voce si tolgono dal Diario). Il libro della biblioteca si prende in prestito, non si compra.
 */
function RigaAcquisto({ r, nome, prestito, occupato, onAnnullaRiga }: { r: RigaScorta; nome: string; prestito: boolean; occupato: boolean; onAnnullaRiga?: (rigaId: number) => void }) {
  const quando = `${dataLeggibile(r.giorno)}${r.fascia === 'sera' ? ' sera' : ''}`;
  const dove = [r.negozioNome, r.altraSede].filter(Boolean).join(' · ');
  return <li className="flex flex-wrap items-center gap-1 testo-12">
    <span className="text-pretty">{prestito ? 'Preso in prestito' : 'Comprato'} il {quando}{r.quantita > 1 ? <span className="tabular-nums"> ×{r.quantita}</span> : null}{dove ? ` · ${dove}` : ''}{r.fonte === 'voce' ? ' · dal Diario' : ''}</span>
    {r.fonte === 'negozio' && onAnnullaRiga && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato}
      onClick={() => onAnnullaRiga(r.id)} aria-label={`Annulla ${prestito ? 'il prestito' : "l'acquisto"} di ${nome} del ${quando}${dove ? ` (${dove})` : ''}`} />}
  </li>;
}

/** Un gruppo di acquisti che non contano nel ciclo in corso, chiuso finché non serve: titolo e quanti sono. */
function GruppoChiuso({ titolo, righe, ...riga }: { titolo: string; righe: RigaScorta[]; nome: string; prestito: boolean; occupato: boolean; onAnnullaRiga?: (rigaId: number) => void }) {
  if (!righe.length) return null;
  return <details className="testo-12">
    <summary className="touch inline-flex cursor-pointer items-center">{titolo} <span className="tabular-nums">&nbsp;({righe.length})</span></summary>
    <ul className="m-0 flex list-none flex-col gap-1 p-0 pt-1">
      {righe.map((r) => <RigaAcquisto key={r.id} r={r} {...riga} />)}
    </ul>
  </details>;
}

/**
 * La spunta è della singola offerta; lo stato condiviso conserva tutte le registrazioni originarie.
 *
 * Ondata 5 (decisione 21): un'offerta che si rifornisce (regola diversa dal pezzo unico) non ha una spunta ma «Compra», che aggiunge un
 * acquisto al ciclo in corso, e l'elenco degli acquisti del ciclo, ognuno con il suo «Annulla» (quelli di una voce del Diario si tolgono
 * togliendo la spunta della voce). Gli acquisti dei cicli passati restano visibili e annullabili («Acquisti precedenti», chiuso finché non
 * serve), e il segno «ottenuto» che nessun acquisto porta (segnato prima del registro, o in una partita senza data di gioco) ha la sua riga
 * con «Annulla»: nessun dato salvato diventa invisibile o intoccabile. I pezzi rimasti («2/3») si vedono solo se il ciclo ne ha più di uno;
 * quando la scorta finisce lo dice la disponibilità («Esaurito: torna lunedì 25 aprile»), che blocca «Compra». La scorta è della sede che si
 * guarda: gli acquisti delle altre sedi dello stesso listino stanno in «In altre sedi», quelli con un giorno dopo la data della partita in
 * «Dopo la data di gioco», entrambi annullabili. Lo stesso componente serve la pagina del negozio, il luogo, l'oggetto e la mappa.
 */
export function AcquistiOfferta({ articolo, nome, registrati, acquistato, bloccato, occupato, onCambia, partitaId, acquisti, onRileggi, rifornimento, scorta, onAnnullaRiga, onTogliSegno }: {
  articolo: string; nome: string; registrati: NonNullable<ArticoloDto['acquistiRegistrati']>;
  acquistato: boolean; bloccato: boolean; occupato: boolean;
  onCambia: (articolo: string, fatto: boolean) => void;
  partitaId?: number; acquisti?: StatoAcquistiArticoloDto; onRileggi?: () => void | Promise<void>;
  rifornimento?: ArticoloDto['rifornimento']; scorta?: ArticoloDto['scorta']; onAnnullaRiga?: (rigaId: number) => void;
  /** Toglie il segno «ottenuto» senza un giorno registrato della chiave indicata (l'offerta o una vecchia chiave del listino condiviso). */
  onTogliSegno?: (articolo: string) => void;
}) {
  if (partitaId !== undefined && eOffertaAojiru({ chiave: articolo })) return <ConsumiAojiru key={`${partitaId}:${articolo}`} partitaId={partitaId} stato={acquisti} onCambiato={onRileggi ?? (() => undefined)} />;
  const qui = registrati.some((r) => r.articolo === articolo);
  const altri = registrati.filter((r) => r.articolo !== articolo);
  const conCiclo = eRifornibile(rifornimento?.regola ?? null);
  if (conCiclo && scorta) {
    // i gruppi: il ciclo in corso (aperto), poi chiusi i cicli passati di questa sede, gli acquisti delle altre sedi dello stesso listino
    // (ognuna ha la sua scorta) e quelli con un giorno dopo la data della partita (la data è tornata indietro: non contano finché non arriva)
    const delCiclo = scorta.righe.filter((r) => r.nelCiclo);
    const dopo = scorta.righe.filter((r) => !r.nelCiclo && r.dopoLaData);
    const altreSedi = scorta.righe.filter((r) => !r.nelCiclo && !r.dopoLaData && r.altraSede).reverse();
    const precedenti = scorta.righe.filter((r) => !r.nelCiclo && !r.dopoLaData && !r.altraSede).reverse();
    const negozioDi = (k: string) => registrati.find((r) => r.articolo === k)?.negozioNome;
    const prestito = rifornimento?.regola.tipo === 'restituzione';
    const riga = { nome, prestito, occupato, onAnnullaRiga };
    return <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo={prestito ? 'Prendi in prestito' : 'Compra'} disabled={occupato || bloccato}
          onClick={() => onCambia(articolo, true)} aria-label={`${prestito ? 'Prendi in prestito' : 'Compra'} ${nome}`} />
        {scorta.quantita !== null && scorta.quantita > 1 && scorta.rimasti !== null && <span className="testo-12 tabular-nums">
          <span aria-hidden="true">{scorta.rimasti}/{scorta.quantita}</span><span className="sr-only">Rimasti {scorta.rimasti} di {scorta.quantita}</span>
        </span>}
      </div>
      {delCiclo.length > 0 && <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {delCiclo.map((r) => <RigaAcquisto key={r.id} r={r} {...riga} />)}
      </ul>}
      {scorta.senzaGiorno.length > 0 && <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {scorta.senzaGiorno.map((k) => <li key={k} className="flex flex-wrap items-center gap-1 testo-12">
          <span className="text-pretty">Ottenuto senza un giorno registrato{k !== articolo && negozioDi(k) ? ` · ${negozioDi(k)}` : ''}</span>
          {onTogliSegno && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato}
            onClick={() => onTogliSegno(k)} aria-label={`Togli il segno «ottenuto» senza giorno di ${nome}${k !== articolo && negozioDi(k) ? ` da ${negozioDi(k)}` : ''}`} />}
        </li>)}
      </ul>}
      <GruppoChiuso titolo={prestito ? 'Prestiti precedenti' : 'Acquisti precedenti'} righe={precedenti} {...riga} />
      <GruppoChiuso titolo="In altre sedi" righe={altreSedi} {...riga} />
      <GruppoChiuso titolo="Dopo la data di gioco" righe={dopo} {...riga} />
    </div>;
  }
  return <div className="flex flex-col gap-1">
    <label className="touch flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={qui}
      disabled={occupato || (!qui && bloccato)} onChange={(e) => onCambia(articolo, e.target.checked)}
      aria-label={`${nome}: acquisto su questa offerta`} />Acquistato qui</label>
    {acquistato && altri.length > 0 && <span className="testo-12">Già acquistato nel listino condiviso</span>}
    {altri.map((r) => <div className="flex flex-wrap items-center gap-1 testo-12" key={r.articolo}>
      <span>Registrazione: {r.negozioNome}</span>
      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={() => onCambia(r.articolo, false)} aria-label={`Annulla solo l'acquisto di ${nome} da ${r.negozioNome}`} />
    </div>)}
  </div>;
}
