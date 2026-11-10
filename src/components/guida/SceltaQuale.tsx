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
// ============================================================

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Modal } from '../shared/Modal';
import { useMedia } from '../../hooks/useMedia';
import { AssetImg } from '../shared/AssetImg';
import { chiaviPresenti, urlImmagineVersionata } from '../shared/immaginiCache';
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

/** Ritratto del Confidente non interattivo (dentro un pulsante non può stare il riquadro che si ingrandisce): immagine caricata, poi grafica predefinita, poi iniziali. */
function RitrattoConfidente({ chiave, nome }: { chiave: string; nome: string }) {
  const [caricata, setCaricata] = useState(false);
  useEffect(() => {
    let annullato = false;
    void chiaviPresenti('confidente').then((set) => { if (!annullato) setCaricata(set.has(chiave)); });
    return () => { annullato = true; };
  }, [chiave]);
  const iniziali = nome.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  const riserva = <AssetImg nome={`confidenti/${slug(chiave)}`} alt="" decorativa className="h-full w-full object-cover object-top" fallback={<span className="font-black text-text-muted">{iniziali}</span>} />;
  return (
    <span className="quale-ritratto" aria-hidden="true">
      {caricata
        ? <img src={urlImmagineVersionata('confidente', chiave)} alt="" draggable={false} className="h-full w-full object-cover object-top" />
        : <AssetImg nome={`confidenti/${slug(chiave)}-fedele`} alt="" decorativa className="h-full w-full object-cover object-top" fallback={riserva} />}
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
}

/** La riga di «Quale» nella voce e la finestra con la griglia di tessere e la ricerca; al posto di una tendina senza immagini. */
export function SceltaQuale({ tipo, elenchi, valore, soloTurni = false, onCambia, finestraAperta, onFinestra }: Props) {
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
  /** Una tessera: sceglie (o, se è già la scelta, toglie il collegamento) e chiude la finestra. */
  const scegli = (chiave: string) => { onCambia(chiave === valore ? '' : chiave); chiudi(); };
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
      <Modal titolo={`Quale — ${nome.toLowerCase()}`} aperta={finestraAperta} larga onChiudi={chiudi} azioni={(
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          {valore && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Nessun collegamento" onClick={() => { onCambia(''); chiudi(); }} />}
          <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={chiudi} />
        </div>
      )}>
        <div className="flex flex-col gap-2 min-w-0">
          {ricerca && (
            // eslint-disable-next-line jsx-a11y/no-autofocus -- sullo schermo largo la finestra si apre per cercare; su tablet e telefono no (tastiera)
            <input type="search" className="form-input" value={testo} autoFocus={largo} onChange={(e) => setTesto(e.target.value)} placeholder={`Cerca: ${nome.toLowerCase()}…`} aria-label={`Cerca: ${nome.toLowerCase()}`} />
          )}
          <div role="radiogroup" aria-label={`Quale: ${nome.toLowerCase()}`} className="quale-griglia">
            {filtrate.mostrate.map((v) => {
              const attiva = v.chiave === valore;
              return (
                <button key={v.chiave} type="button" role="radio" aria-checked={attiva} className={`quale-tessera touch ${attiva ? 'quale-tessera--attiva' : ''}`}
                  title={v.dettaglio ? `${v.nome} · ${v.dettaglio}` : v.nome} onClick={() => scegli(v.chiave)}>
                  <span className="quale-tessera__figura" aria-hidden="true">{figura(tipo, v)}</span>
                  <span>{v.nome}</span>
                  {v.dettaglio && <span className="quale-tessera__dettaglio">{v.dettaglio}</span>}
                </button>
              );
            })}
          </div>
          {filtrate.totale === 0 && <span className="testo-12 text-text-muted" role="status">Nessun risultato.</span>}
          {filtrate.totale > TETTO && <span className="testo-12 text-text-muted" role="status">Mostrati {Math.min(TETTO, filtrate.totale)} di {filtrate.totale}: scrivi per restringere.</span>}
        </div>
      </Modal>
    </div>
  );
}
