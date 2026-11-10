// ============================================================
// SceltaQuale — «Quale» scelto guardando: ritratti dei Confidenti, emblemi dei Palazzi, icone di libri, film, attività, negozi e Doti
// ============================================================
//
// Il tipo della voce decide a che cosa si collega (`RIFERIMENTO_DI_TIPO`); qui si sceglie l'elemento con una griglia di tessere
// (immagine sopra, nome sotto) e un campo di ricerca per gli elenchi lunghi. Il valore è sempre un elemento dell'elenco, mai testo
// digitato. Toccando di nuovo la tessera scelta, o con «Nessun collegamento», il collegamento si toglie.
// ============================================================

import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
}

/** La griglia di tessere con ricerca; al posto di una tendina senza immagini. */
export function SceltaQuale({ tipo, elenchi, valore, soloTurni = false, onCambia }: Props) {
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
  // L6-06: a scelta fatta la griglia si richiude: resta la tessera scelta con «Cambia» (la griglia da 23 tessere occupava ~900 px anche
  // con il Confidente già scelto). Senza scelta, o con una scelta che l'elenco non contiene (collegamento di altro genere), la griglia è aperta.
  // la griglia riaperta con «Cambia» vale per quel tipo e quella scelta: un tipo o una scelta nuovi (anche da fuori: «Collega», cambio di
  // tipo) ripartono richiusi, senza effetti (lo stato non si azzera, semplicemente non corrisponde più)
  const [riapertaPer, setRiapertaPer] = useState<string | null>(null);
  const chiaveScelta = `${tipo}:${valore}`;
  const riaperta = riapertaPer === chiaveScelta;
  const setRiaperta = (aperta: boolean) => setRiapertaPer(aperta ? chiaveScelta : null);
  const sceltaFatta = tutte.find((v) => v.chiave === valore) ?? null;
  const richiusa = !!sceltaFatta && !riaperta;
  if (richiusa) {
    return (
      <div className="flex flex-col gap-2 min-w-0">
        <span className="testo-13 text-text-secondary">Quale — {nome.toLowerCase()}</span>
        <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border border-primary bg-bg-tertiary p-1.5" role="group" aria-label={`Scelto: ${sceltaFatta.nome}`}>
          <span className="quale-scelta__figura" aria-hidden="true">{figura(tipo, sceltaFatta)}</span>
          <span className="flex min-w-0 flex-1 basis-32 flex-col testo-13 font-semibold break-words">
            {sceltaFatta.nome}
            {sceltaFatta.dettaglio && <span className="testo-12 font-normal text-text-muted">{sceltaFatta.dettaglio}</span>}
          </span>
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Cambia" aria-label={`Cambia ${nome.toLowerCase()}: ora ${sceltaFatta.nome}`} onClick={() => setRiaperta(true)} />
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Nessun collegamento" onClick={() => onCambia('')} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <span className="testo-13 text-text-secondary">Quale — {nome.toLowerCase()}</span>
      {ricerca && (
        <input type="search" className="form-input" value={testo} onChange={(e) => setTesto(e.target.value)} placeholder={`Cerca: ${nome.toLowerCase()}…`} aria-label={`Cerca: ${nome.toLowerCase()}`} />
      )}
      <div role="radiogroup" aria-label={`Quale: ${nome.toLowerCase()}`} className="quale-griglia">
        {filtrate.mostrate.map((v) => {
          const attiva = v.chiave === valore;
          return (
            <button key={v.chiave} type="button" role="radio" aria-checked={attiva} className={`quale-tessera touch ${attiva ? 'quale-tessera--attiva' : ''}`}
              title={v.dettaglio ? `${v.nome} · ${v.dettaglio}` : v.nome} onClick={() => { setRiaperta(false); setTesto(''); onCambia(attiva ? '' : v.chiave); }}>
              <span className="quale-tessera__figura" aria-hidden="true">{figura(tipo, v)}</span>
              <span>{v.nome}</span>
              {v.dettaglio && <span className="quale-tessera__dettaglio">{v.dettaglio}</span>}
            </button>
          );
        })}
      </div>
      {filtrate.totale === 0 && <span className="testo-12 text-text-muted" role="status">Nessun risultato.</span>}
      {filtrate.totale > TETTO && <span className="testo-12 text-text-muted" role="status">Mostrati {Math.min(TETTO, filtrate.totale)} di {filtrate.totale}: scrivi per restringere.</span>}
      {valore && (
        <div className="flex flex-wrap gap-2">
          {sceltaFatta && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Tieni la scelta" aria-label={`Tieni ${sceltaFatta.nome} e richiudi l’elenco`} onClick={() => { setRiaperta(false); setTesto(''); }} />}
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Nessun collegamento" onClick={() => onCambia('')} />
        </div>
      )}
    </div>
  );
}
