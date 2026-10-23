// ============================================================
// SceltaRegalo — la finestra unica «Regala» (R10-18): si sceglie l'oggetto del catalogo, l'azione fa il resto
// ============================================================
//
// Una sola azione: dà i punti al Confidente (50 di base con i moltiplicatori, dove il rango li conta), registra la consegna per chiave
// del catalogo e, se l'oggetto non risulta comprato e c'è un'offerta disponibile, può segnare anche l'acquisto. Sostituisce «Regalo» di
// Partita › Confidenti (+50 senza dire quale oggetto) e «Regalo consegnato» della scheda (consegna senza punti). I yen non si muovono:
// il prezzo è un promemoria (BON-12). La logica è nel server (`POST /partite/:id/regali`): qui si scelgono solo i dati.
// ============================================================

import { useMemo, useState } from 'react';
import type { CatalogoOggettoDto, ConfidentePartitaDto, EsitoRegaloDto, OffertaOggettoDto, RegaloConfidenteDto } from '../../types';
import { getConfidenteDettaglio, getConfidentiPartita } from '../../services/api';
import { regalaOggetto } from '../../services/api/partite';
import { getOggettoCatalogo } from '../../services/api/catalogoOggetti';
import { useCarica } from '../../hooks/useCarica';
import { anteprimaPunti, formattaPunti, formattaYen } from '../../utils/punti';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { SceltaCatalogoOggetto } from './SceltaCatalogoOggetto';

interface Props {
  partita: number;
  confidente: string;
  nomeConfidente: string;
  /** I regali graditi del Confidente (dalla sua scheda); se assenti li legge la finestra. */
  regali?: RegaloConfidenteDto[];
  /** Le sole chiavi ammesse, se chi apre già le conosce (la scheda dell'oggetto); ha la precedenza su `regali`. */
  ammessi?: readonly string[];
  /** Lo stato del Confidente nella partita; se assente (undefined) lo legge la finestra. */
  stato?: ConfidentePartitaDto | null;
  /** I moltiplicatori dei punti scelti da chi apre; senza, il bonus dell'arcano segue la scorta. */
  bonusArcano?: boolean;
  invito?: boolean;
  /** L'oggetto già scelto (un regalo toccato in elenco, la scheda dell'oggetto). */
  oggettoIniziale?: string;
  onChiudi: () => void;
  onFatto: (esito: EsitoRegaloDto) => void;
}

/** Identifica un'offerta (articolo e sede) nel selettore. */
const chiaveOfferta = (o: OffertaOggettoDto) => `${o.articolo}|${o.sedeChiave ?? ''}`;

/** Dove si compra un'offerta, in una riga. */
function etichettaOfferta(o: OffertaOggettoDto): string {
  const dove = o.sedeNome && o.sedeNome !== o.negozioNome ? `${o.negozioNome} (${o.sedeNome})` : o.negozioNome;
  return `${dove}${o.prezzo !== null ? ` · ${o.prezzo === 0 ? 'Gratis' : formattaYen(o.prezzo)}` : ''}`;
}

/** «Regala a …»: scelta dell'oggetto fra i regali graditi, punti previsti, eventuale acquisto da segnare insieme. */
export function SceltaRegalo({ partita, confidente, nomeConfidente, regali, ammessi: ammessiDati, stato, bonusArcano, invito = false, oggettoIniziale = '', onChiudi, onFatto }: Props) {
  const dettaglio = useCarica(() => (regali || ammessiDati ? Promise.resolve(null) : getConfidenteDettaglio(confidente)), [confidente, !!regali, !!ammessiDati]);
  const lettoStato = useCarica(() => (stato !== undefined ? Promise.resolve(null) : getConfidentiPartita(partita).then((l) => l.find((c) => c.chiave === confidente) ?? null)), [partita, confidente, stato !== undefined]);
  const sc = stato !== undefined ? stato : lettoStato.dati;
  const ammessi = useMemo(() => ammessiDati
    ? [...ammessiDati]
    : [...new Set((regali ?? dettaglio.dati?.regali ?? []).flatMap((r) => r.catalogo ? [r.catalogo.chiave] : []))], [ammessiDati, regali, dettaglio.dati]);
  const consegnati = sc?.regaliFattiCatalogo ?? [];

  const [chiave, setChiave] = useState(oggettoIniziale);
  const [vuoleAcquisto, setVuoleAcquisto] = useState<boolean | null>(null);
  const [offertaScelta, setOffertaScelta] = useState('');
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState('');
  const oggetto = useCarica(() => (chiave ? getOggettoCatalogo(chiave, partita) : Promise.resolve(null)), [chiave, partita]);

  const giaConsegnato = chiave !== '' && consegnati.includes(chiave);
  const offerte = oggetto.dati?.inVendita ?? [];
  const comprato = offerte.some((o) => o.acquistato);
  // si propone di segnare comprata solo un'offerta che c'è adesso: una non disponibile farebbe fallire l'azione (409)
  const acquistabili = comprato ? [] : offerte.filter((o) => o.disponibileOggi !== false);
  const offerta = acquistabili.find((o) => chiaveOfferta(o) === offertaScelta) ?? acquistabili[0];
  const segna = (vuoleAcquisto ?? true) && !!offerta;

  const conPunti = !!sc && sc.rango > 0 && sc.rango < 10 && (sc.puntiNecessari ?? 0) > 0;
  const bonus = bonusArcano ?? sc?.personaArcanoInScorta ?? false;
  // il piazzamento agli esami lo dà la partita (stesso calcolo del server), non una scelta di questa finestra
  const piazzamento = sc?.piazzamentoEsame?.piazzamento ?? null;
  const punti = anteprimaPunti({ confidente, regalo: true, bonusArcano: bonus, invito, piazzamento });
  const valido = chiave !== '' && ammessi.includes(chiave) && !giaConsegnato && !oggetto.caricamento;

  const scegli = (o: CatalogoOggettoDto) => { setChiave(o.chiave); setVuoleAcquisto(null); setOffertaScelta(''); setErrore(''); };
  const regala = async () => {
    if (!valido || occupato) return;
    setOccupato(true); setErrore('');
    try {
      const esito = await regalaOggetto(partita, {
        confidente, catalogo: chiave, bonusArcano: bonus, ...(invito ? { invito } : {}),
        ...(segna && offerta ? { acquisto: { articolo: offerta.articolo, ...(offerta.sedeChiave ? { sede: offerta.sedeChiave } : {}) } } : {}),
      });
      onFatto(esito);
    } catch (e) { setErrore(e instanceof Error ? e.message : 'Regalo non registrato.'); }
    finally { setOccupato(false); }
  };

  return <Modal aperta titolo={`Regala a ${nomeConfidente}`} onChiudi={() => { if (!occupato) onChiudi(); }}
    azioni={<><button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={onChiudi}>Annulla</button>
      <button type="button" className="btn btn-primary touch" disabled={occupato || !valido} onClick={() => void regala()}>{occupato ? 'Registrazione…' : 'Regala'}</button></>}>
    <div className="flex min-w-0 flex-col gap-3">
      <SceltaCatalogoOggetto valore={chiave} onScegli={scegli} includi={ammessi} disabilitato={occupato} etichetta="Regalo gradito" />
      {dettaglio.errore && <p role="alert" className="m-0 text-[13px]">{dettaglio.errore}</p>}
      {chiave !== '' && !ammessi.includes(chiave) && !dettaglio.caricamento && <p role="alert" className="m-0 text-[13px]">Questo oggetto non è fra i regali graditi di {nomeConfidente}.</p>}
      {giaConsegnato && <p role="status" className="m-0 text-[13px]">Questo oggetto risulta già consegnato a {nomeConfidente}. Toglilo dall’elenco dei regali per regalarlo di nuovo.</p>}
      {chiave !== '' && !giaConsegnato && (
        <p className="m-0 text-[13px] text-text-secondary" role="status">
          {conPunti
            ? <>Dà <strong className="text-text">+{formattaPunti(punti)} punti</strong> a {nomeConfidente} (50 di base{bonus || (piazzamento && piazzamento !== 'altro') || invito ?' con i moltiplicatori attivi' : ''}).</>
            : <>Nessun punto: al rango attuale di {nomeConfidente} i punti non contano. Si registra solo la consegna.</>}
        </p>
      )}
      {chiave !== '' && oggetto.errore && <p role="alert" className="m-0 text-[13px]">{oggetto.errore}</p>}
      {valido && comprato && <p className="m-0 text-[12px] text-text-muted">L’oggetto risulta già comprato nella partita.</p>}
      {valido && !comprato && offerte.length > 0 && acquistabili.length === 0 && (
        <p className="m-0 text-[12px] text-text-muted">Non risulta comprato, ma adesso non è disponibile in nessun negozio: potrai segnarlo dai Negozi.</p>
      )}
      {valido && acquistabili.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="touch flex items-center gap-2 text-[13px]">
            <input type="checkbox" className="h-5 w-5" checked={segna} disabled={occupato} onChange={(e) => setVuoleAcquisto(e.target.checked)} />
            <span>Segna anche comprato</span>
          </label>
          {segna && acquistabili.length > 1 && (
            <Selettore etichetta="Dove l’hai comprato" valore={chiaveOfferta(offerta!)} disabilitato={occupato} ricerca="mai"
              opzioni={acquistabili.map((o) => ({ chiave: chiaveOfferta(o), nome: etichettaOfferta(o) }))} onCambia={setOffertaScelta} />
          )}
          {segna && acquistabili.length === 1 && <span className="text-[12px] text-text-muted">{etichettaOfferta(offerta!)}</span>}
          {segna && offerta?.prezzo ? <span className="text-[12px] text-text-muted">I yen non si muovono da soli: ricordati di scalare {formattaYen(offerta.prezzo)} dalla squadra.</span> : null}
        </div>
      )}
      {errore && <p role="alert" className="m-0 text-[13px]">{errore}</p>}
    </div>
  </Modal>;
}
