// ============================================================
// SceltaQuale — «Quale» scelto guardando: ritratti dei Confidenti, emblemi dei Palazzi, icone di libri, film, attività, negozi e Doti
// ============================================================
//
// Il tipo della voce decide a che cosa si collega (`RIFERIMENTO_DI_TIPO`); qui si sceglie l'elemento con una griglia di tessere
// (immagine sopra, nome sotto) e un campo di ricerca per gli elenchi lunghi. Il valore è sempre un elemento dell'elenco, mai testo
// digitato. Toccando di nuovo la tessera scelta, o con «Nessun collegamento», il collegamento si toglie.
// L6-06 (residuo): la griglia sta in una finestra sua, larga quanto la finestra della voce, e non più nella colonna di destra. Le tessere
// sono fino a 36 (`TETTO`): in una colonna da 396 px occupavano fino a mille px e portavano il corpo della voce a 1335 px a 1280 di
// larghezza. Nella voce resta una riga: la tessera scelta con «Cambia» e «Nessun collegamento», o «Scegli» se non c'è ancora una scelta.
// Toccare una tessera sceglie e chiude la finestra; la finestra si apre da sé quando si sceglie un tipo che si collega (vedi
// `SceltaTipoQuale`), così prima si sceglie il tipo e poi l'elemento dell'elenco filtrato, con lo stesso numero di tocchi di prima.
// Un collegamento facoltativo (`facoltativo`, la Trama) ha titolo e sottotitolo propri e «Nessuno» sempre in vista: nella riga, accanto al
// personaggio scelto, e come prima tessera della finestra; la finestra non si apre da sola.
// ============================================================

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Modal } from '../shared/Modal';
import { useMedia } from '../../hooks/useMedia';
import { AssetImg } from '../shared/AssetImg';
import { chiaviPresenti, urlImmagineVersionata } from '../shared/immaginiCache';
import { useAsset } from '../../stores/assetStore';
import { attributiMiniatura } from '../../../shared/miniature';
import { IconaCategoria } from './IconaCategoria';
import { EmblemaDungeon } from './EmblemaDungeon';
import { slug } from '../../../shared/slug';
import { filtroRicerca } from '../../utils/testo';
import { NOME_QUALE, elencoQuale } from '../../utils/elencoQuale';
import type { TipoRiferimentoAzione } from '../../../shared/effettiAzione';
import type { ElenchiAzioneDto, VoceElencoAzione } from '../../types';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

/** Quante tessere si mostrano insieme: oltre, si invita a restringere con la ricerca. */
const TETTO = 36;

const CATEGORIA: Record<Exclude<TipoRiferimentoAzione, 'confidente' | 'dungeon'>, string> = {
  richiesta: 'richiesta', libro: 'libro', film: 'dvd', attivita: 'attivita', negozio: 'acquisto', dote: 'dote',
};

/** La larghezza del ritratto nelle tessere (`.quale-ritratto`): le immagini si chiedono in miniatura a questa misura. */
const LARGHEZZA_RITRATTO = 44;

/**
 * Ritratto del Confidente non interattivo (dentro un pulsante non può stare il riquadro che si ingrandisce): immagine caricata, poi il ritratto
 * fedele, poi quello stilizzato, in miniatura. Le iniziali stanno sotto finché un'immagine non è arrivata davvero, e restano se nessuna arriva:
 * il riquadro non è mai vuoto. Prima i ritratti si chiedevano a piena misura (PNG da 1–1,5 MB ciascuno, 23 nella griglia) e senza nulla
 * sotto: gli ultimi della griglia restavano riquadri vuoti finché non finivano di scaricarsi.
 */
function RitrattoConfidente({ chiave, nome }: { chiave: string; nome: string }) {
  const [caricata, setCaricata] = useState(false);
  useEffect(() => {
    let annullato = false;
    void chiaviPresenti('confidente').then((set) => { if (!annullato) setCaricata(set.has(chiave)); });
    return () => { annullato = true; };
  }, [chiave]);
  const fedele = useAsset(`confidenti/${slug(chiave)}-fedele`);
  const stilizzato = useAsset(`confidenti/${slug(chiave)}`);
  const candidati = [caricata ? urlImmagineVersionata('confidente', chiave) : null, fedele, stilizzato].filter((u): u is string => !!u);
  // gli URL che non si sono caricati (prima in miniatura, poi a piena misura): si passa al candidato seguente
  const [falliti, setFalliti] = useState<ReadonlySet<string>>(() => new Set());
  const [pronta, setPronta] = useState<string | null>(null);
  const tentativi = candidati.flatMap((u) => {
    const m = attributiMiniatura(u, LARGHEZZA_RITRATTO);
    return m.srcSet ? [{ chiave: `${u}#mini`, attr: m }, { chiave: u, attr: { src: u } as typeof m }] : [{ chiave: u, attr: { src: u } as typeof m }];
  });
  const tentativo = tentativi.find((t) => !falliti.has(t.chiave)) ?? null;
  const iniziali = nome.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  return (
    <span className="quale-ritratto" aria-hidden="true">
      {pronta !== tentativo?.chiave && <span className="quale-ritratto__iniziali">{iniziali}</span>}
      {tentativo && (
        <img key={tentativo.chiave} src={tentativo.attr.src} srcSet={tentativo.attr.srcSet} sizes={tentativo.attr.sizes} alt="" draggable={false} decoding="async"
          className={`quale-ritratto__immagine ${pronta === tentativo.chiave ? 'quale-ritratto__immagine--pronta' : ''}`}
          onLoad={() => setPronta(tentativo.chiave)} onError={() => setFalliti((f) => new Set(f).add(tentativo.chiave))} />
      )}
    </span>
  );
}

function figura(tipo: TipoRiferimentoAzione, v: VoceElencoAzione): ReactNode {
  if (tipo === 'confidente') return <RitrattoConfidente chiave={v.chiave} nome={v.nome} />;
  if (tipo === 'dungeon') return <EmblemaDungeon chiave={v.chiave} nome={v.nome} dimensione={44} />;
  const generica = <IconaCategoria categoria={CATEGORIA[tipo]} dimensione={40} />;
  // la Dote ha la sua icona (la stessa della pagina Doti sociali); se manca, quella di categoria
  if (tipo === 'dote') return <AssetImg nome={`doti/${v.chiave}`} alt="" decorativa className="h-10 w-10 object-contain" fallback={generica} />;
  return generica;
}

interface Props {
  tipo: TipoRiferimentoAzione;
  elenchi: ElenchiAzioneDto;
  /** Chiave scelta, '' = nessuno. */
  valore: string;
  /** Per un lavoro: solo attività con i turni. */
  soloTurni?: boolean;
  onCambia: (chiave: string) => void;
  /** La finestra della griglia è aperta: la tiene chi usa il componente, perché si apre anche dalla scelta del tipo. */
  finestraAperta: boolean;
  onFinestra: (aperta: boolean) => void;
  /**
   * Un collegamento facoltativo (la Trama: il personaggio coinvolto in un evento di storia, che non porta incontro né rango): titolo e
   * sottotitolo propri al posto di «Quale — …», e «Nessuno» sempre in vista come scelta, nella riga e come prima tessera della finestra.
   */
  facoltativo?: { titolo: string; sottotitolo: string };
}

/** La riga di «Quale» nella voce e la finestra con la griglia di tessere e la ricerca; al posto di una tendina senza immagini. */
export function SceltaQuale({ tipo, elenchi, valore, soloTurni = false, onCambia, finestraAperta, onFinestra, facoltativo }: Props) {
  // come nella finestra della voce: il campo di ricerca prende il fuoco solo da desktop (su tablet e telefono aprirebbe la tastiera)
  const largo = useMedia('(min-width: 1024px)');
  const [testo, setTesto] = useState('');
  const tutte = useMemo(() => elencoQuale(tipo, elenchi, soloTurni), [tipo, elenchi, soloTurni]);
  const ricerca = tutte.length > 8;
  const filtrate = useMemo(() => {
    const trova = filtroRicerca(testo);
    const f = tutte.filter((v) => trova(v.nome, v.dettaglio));
    // la voce già scelta resta sempre in vista, anche se la ricerca non la trova
    const scelta = tutte.find((v) => v.chiave === valore);
    const mostrate = f.slice(0, TETTO);
    return { mostrate: scelta && !mostrate.includes(scelta) ? [scelta, ...mostrate.slice(0, TETTO - 1)] : mostrate, totale: f.length };
  }, [tutte, testo, valore]);
  const nome = NOME_QUALE[tipo];
  const sceltaFatta = tutte.find((v) => v.chiave === valore) ?? null;
  /** Chiude la finestra della griglia e dimentica la ricerca: alla prossima apertura l'elenco riparte intero. */
  const chiudi = () => { setTesto(''); onFinestra(false); };
  /** Una tessera: sceglie e chiude la finestra. Toccando la scelta: senza «Nessuno» fra le tessere toglie il collegamento, con «Nessuno» la conferma. */
  const scegli = (chiave: string) => { onCambia(!facoltativo && chiave === valore ? '' : chiave); chiudi(); };
  const titoloFinestra = facoltativo ? facoltativo.titolo : `Quale — ${nome.toLowerCase()}`;
  const finestra = (
    <Modal titolo={titoloFinestra} aperta={finestraAperta} larga onChiudi={chiudi} azioni={(
      <div className="flex w-full flex-wrap items-center justify-end gap-2">
        {valore && !facoltativo && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Nessun collegamento" onClick={() => { onCambia(''); chiudi(); }} />}
        <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={chiudi} />
      </div>
    )}>
      <div className="flex flex-col gap-2 min-w-0">
        {ricerca && (
          // eslint-disable-next-line jsx-a11y/no-autofocus -- sullo schermo largo la finestra si apre per cercare; su tablet e telefono no (tastiera)
          <input type="search" className="form-input" value={testo} autoFocus={largo} onChange={(e) => setTesto(e.target.value)} placeholder={`Cerca: ${nome.toLowerCase()}…`} aria-label={`Cerca: ${nome.toLowerCase()}`} />
        )}
        <GrigliaQuale tipo={tipo} nome={nome} valore={valore} mostrate={filtrate.mostrate} facoltativo={!!facoltativo} onScegli={scegli} />
        {filtrate.totale === 0 && <span className="testo-12 text-text-muted" role="status">Nessun risultato.</span>}
        {filtrate.totale > TETTO && <span className="testo-12 text-text-muted" role="status">Mostrati {Math.min(TETTO, filtrate.totale)} di {filtrate.totale}: scrivi per restringere.</span>}
      </div>
    </Modal>
  );
  if (facoltativo) {
    // la Trama: «Nessuno» e il personaggio scelto sono le due scelte in vista (un gruppo radio); «Scegli» / «Cambia» apre la griglia
    return (
      <div className="flex flex-col gap-2 min-w-0" role="group" aria-labelledby="quale-facoltativo-titolo">
        <div className="flex flex-col gap-0.5">
          <span id="quale-facoltativo-titolo" className="testo-13 text-text-secondary">{facoltativo.titolo}</span>
          <span className="testo-12 text-text-muted text-pretty">{facoltativo.sottotitolo}</span>
        </div>
        <div className="quale-facoltativo">
          <div role="radiogroup" aria-label={facoltativo.titolo} className="quale-facoltativo__scelte">
            <button type="button" role="radio" aria-checked={!sceltaFatta} className={`quale-opzione touch ${!sceltaFatta ? 'quale-opzione--attiva' : ''}`} onClick={() => onCambia('')}>
              <span className="quale-opzione__figura" aria-hidden="true"><IconaAzione chiave="chiudi" dimensione={20} /></span>
              <span>Nessuno</span>
            </button>
            {sceltaFatta && (
              <button type="button" role="radio" aria-checked className="quale-opzione quale-opzione--attiva touch" title={sceltaFatta.dettaglio ? `${sceltaFatta.nome} · ${sceltaFatta.dettaglio}` : sceltaFatta.nome}>
                <span className="quale-opzione__figura quale-opzione__figura--ritratto" aria-hidden="true">{figura(tipo, sceltaFatta)}</span>
                <span className="min-w-0 break-words">{sceltaFatta.nome}</span>
              </button>
            )}
          </div>
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave={sceltaFatta ? 'modifica' : 'seleziona'} dimensione={20} />} titolo={sceltaFatta ? 'Cambia' : 'Scegli'}
            aria-label={sceltaFatta ? `Cambia il personaggio coinvolto: ora ${sceltaFatta.nome}` : 'Scegli il personaggio coinvolto'} aria-haspopup="dialog" onClick={() => onFinestra(true)} />
        </div>
        {finestra}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <span className="testo-13 text-text-secondary">Quale — {nome.toLowerCase()}</span>
      {sceltaFatta ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border border-primary bg-bg-tertiary p-1.5" role="group" aria-label={`Scelto: ${sceltaFatta.nome}`}>
          <span className="quale-scelta__figura" aria-hidden="true">{figura(tipo, sceltaFatta)}</span>
          <span className="flex min-w-0 flex-1 basis-32 flex-col testo-13 font-semibold break-words">
            {sceltaFatta.nome}
            {sceltaFatta.dettaglio && <span className="testo-12 font-normal text-text-muted">{sceltaFatta.dettaglio}</span>}
          </span>
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Cambia" aria-label={`Cambia ${nome.toLowerCase()}: ora ${sceltaFatta.nome}`} aria-haspopup="dialog" onClick={() => onFinestra(true)} />
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Nessun collegamento" onClick={() => onCambia('')} />
        </div>
      ) : (
        <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="seleziona" dimensione={20} />} titolo="Scegli" aria-label={`Scegli: ${nome.toLowerCase()}`} aria-haspopup="dialog" onClick={() => onFinestra(true)} />
      )}
      {finestra}
    </div>
  );
}

/** Le tessere della finestra: con un collegamento facoltativo «Nessuno» è la prima, e toccare la scelta la conferma invece di toglierla. */
function GrigliaQuale({ tipo, nome, valore, mostrate, facoltativo, onScegli }: {
  tipo: TipoRiferimentoAzione; nome: string; valore: string; mostrate: VoceElencoAzione[]; facoltativo: boolean; onScegli: (chiave: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={facoltativo ? 'Personaggio coinvolto' : `Quale: ${nome.toLowerCase()}`} className="quale-griglia">
      {facoltativo && (
        <button type="button" role="radio" aria-checked={!valore} className={`quale-tessera touch ${!valore ? 'quale-tessera--attiva' : ''}`} onClick={() => onScegli('')}>
          <span className="quale-tessera__figura" aria-hidden="true"><span className="quale-ritratto quale-ritratto--nessuno"><IconaAzione chiave="chiudi" dimensione={24} /></span></span>
          <span>Nessuno</span>
        </button>
      )}
      {mostrate.map((v) => {
        const attiva = v.chiave === valore;
        return (
          <button key={v.chiave} type="button" role="radio" aria-checked={attiva} className={`quale-tessera touch ${attiva ? 'quale-tessera--attiva' : ''}`}
            title={v.dettaglio ? `${v.nome} · ${v.dettaglio}` : v.nome} onClick={() => onScegli(v.chiave)}>
            <span className="quale-tessera__figura" aria-hidden="true">{figura(tipo, v)}</span>
            <span>{v.nome}</span>
            {v.dettaglio && <span className="quale-tessera__dettaglio">{v.dettaglio}</span>}
          </button>
        );
      })}
    </div>
  );
}
