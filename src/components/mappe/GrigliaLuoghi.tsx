// ============================================================
// GrigliaLuoghi — i luoghi della guida come griglia di carte (ridisegno di L11 B5: «Schede e griglia»)
// ============================================================
//
// Ogni nodo (quartiere, area, Palazzo, dedalo…) è una carta `.card` con lo sfondo suo: l'immagine in alto in 16:9 (l'emblema grande per
// Palazzi, Memento e dedali), il nome, i segni, i conteggi come chip leggibili e **due gesti separati**: «Apri» porta alla casa del nodo
// (`nodo.casa`, calcolata dal server) ed è il principale; se il nodo ha figli, un secondo pulsante («Aree (n)», «Planimetrie (n)»,
// «Dedali (n)») scende di livello. Casa e conteggi li calcola il server (`GET /api/mappe/gerarchia`): qui non si ricostruisce un indirizzo né
// si somma un numero. Scorre solo la pagina: nessuna area scorrevole annidata. Le colonne le decide `.griglia-luoghi` (tailwind.css).
//
// Miniature dei Palazzi, dei Dedali e delle aree dei Dedali (O9-5, 2026-10-31: «l'area Memento riporta le voci senza immagini. Ma io ho
// generato delle immagini da inserire. vorrei poterle inserire e/o modificare», «stessa funzione … anche per i palazzi»): con la miniatura
// caricata la carta la mostra in 16:9 (miniature del server con `srcset`); senza, Palazzo e Dedalo restano col loro emblema (la lettera
// grande del Dedalo) e l'area del Dedalo senza immagine. Il
// comando «Miniatura» (solo nella preparazione: costante di build qui sotto) apre `FinestraCaricaImmagine` e dopo un cambio la pagina rilegge
// la gerarchia (`RicaricaLuoghi`).
// ============================================================

import { Fragment, useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnteprimaMappa } from './AnteprimaMappa';
import { EmblemaDungeon } from '../guida/EmblemaDungeon';
import { CollegamentoVisivo, PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { FinestraCaricaImmagine } from '../shared/FinestraCaricaImmagine';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';
import { RicaricaLuoghi } from './ricaricaLuoghi';
import { etichettaScendi, partiConteggi } from './paroleLuoghi';
import { testoConteggiPin } from '../../utils/presentazioneMappa';
import type { NodoGerarchiaDto } from '../../types';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** Quanto è larga una carta della griglia (`.griglia-luoghi`): l'attributo `sizes` delle sue immagini. */
const SIZES_CARTA = '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw';

/** Il suggerimento dei conteggi: i passaggi e le note che stanno accanto ai pin; per l'Area anche la regola del conteggio. */
function suggerimentoConteggi(n: NodoGerarchiaDto): string | undefined {
  if (n.tipo === 'da-collocare' || n.tipo === 'infiltrazione' || n.tipo === 'area-dedalo') return undefined;
  const base = testoConteggiPin(n.conteggi.pin);
  return n.tipo === 'area' ? `${base} — ogni oggetto una volta, anche se sta su più versioni` : base;
}

/** I segni del nodo: «Da verificare», «Non ancora aperto». */
export function SegniNodo({ nodo }: { nodo: NodoGerarchiaDto }) {
  if (!nodo.daVerificare && nodo.disponibile !== false) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {nodo.daVerificare && <span className="chip chip--attivo" title="Nessuna fonte colloca questa area: decidi se tenerla o rimuoverla">Da verificare</span>}
      {nodo.disponibile === false && <span className="chip" title={nodo.bloccoMotivo ?? undefined}>Non ancora aperto</span>}
    </div>
  );
}

/** I conteggi del nodo, ciascuno un chip (12 px, colore secondario). */
export function ChipConteggi({ nodo }: { nodo: NodoGerarchiaDto }) {
  const parti = partiConteggi(nodo);
  if (parti.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5" title={suggerimentoConteggi(nodo)}>
      {parti.map((p) => <span key={p} className="chip">{p}</span>)}
    </div>
  );
}

/** Le infiltrazioni, ciascuna un collegamento alla sua casa, in una riga che va a capo. */
export function Infiltrazioni({ titolo, elenco }: { titolo: string; elenco: NodoGerarchiaDto[] }) {
  return (
    <p className="m-0 flex flex-wrap items-center gap-x-2 testo-12 text-text-secondary">
      <span>{titolo}</span>
      {elenco.map((i, k) => <Fragment key={i.chiave}>
        {k > 0 && <span aria-hidden>·</span>}
        {i.casa ? <Link to={i.casa} className="touch inline-flex min-w-0 items-center break-words">{i.nome}</Link> : <span>{i.nome}</span>}
      </Fragment>)}
    </p>
  );
}

/** L'immagine in alto della carta, sempre 16:9 a tutta larghezza: la miniatura caricata di un Palazzo, dei Memento, di un Dedalo o di
 *  un'area di un Dedalo; senza, l'emblema grande per Palazzi, Memento e dedali (niente per l'area del Dedalo), altrimenti l'immagine del server. */
function ImmagineCarta({ nodo }: { nodo: NodoGerarchiaDto }) {
  if ((nodo.tipo === 'palazzo' || nodo.tipo === 'memento' || nodo.tipo === 'dedalo' || nodo.tipo === 'area-dedalo') && nodo.immagine?.immagineUrl) {
    return <AnteprimaMappa mappa={{ immagineUrl: nodo.immagine.immagineUrl, asset: null, nome: nodo.nome }} className="aspect-video w-full rounded-none border-0" sizes={SIZES_CARTA} />;
  }
  if (nodo.tipo === 'palazzo' || nodo.tipo === 'memento' || nodo.tipo === 'dedalo') {
    return <div className="flex aspect-video w-full items-center justify-center bg-bg-tertiary"><EmblemaDungeon chiave={nodo.chiave} nome={nodo.nome} dimensione={96} /></div>;
  }
  if (nodo.tipo === 'da-collocare' || nodo.tipo === 'infiltrazione' || nodo.tipo === 'area-dedalo') return null;
  // la chiave serve solo allo stemma di riserva di Tokyo e del Covo (`AnteprimaMappa`)
  const chiave = nodo.tipo === 'citta' ? 'tokyo' : nodo.tipo === 'area' ? nodo.slug : nodo.tipo === 'planimetria' ? nodo.chiave : undefined;
  return <AnteprimaMappa mappa={{ immagineUrl: nodo.immagine?.immagineUrl ?? null, asset: nodo.immagine?.asset ?? null, nome: nodo.nome, chiave }}
    className="aspect-video w-full rounded-none border-0" sizes={SIZES_CARTA} />;
}

/** «Miniatura» sulla carta di un Palazzo, dei Memento, di un Dedalo o di un'area di un Dedalo: apre la finestra per inserire, cambiare o togliere l'immagine. */
function ComandoMiniaturaReale({ nodo }: { nodo: NodoGerarchiaDto }) {
  const [aperta, setAperta] = useState(false);
  const ricarica = useContext(RicaricaLuoghi);
  const dove = nodo.miniatura;
  if (!dove) return null;
  const attuale = nodo.immagine?.immagineUrl ?? null;
  return <>
    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Miniatura"
      aria-label={`${attuale ? 'Cambia' : 'Inserisci'} la miniatura di ${nodo.nome}`} aria-haspopup="dialog" onClick={() => setAperta(true)} />
    {aperta && <FinestraCaricaImmagine titolo={`Miniatura di ${nodo.nome}`} ambito={dove.ambito} chiave={dove.chiave} urlAttuale={attuale}
      onChiudi={() => setAperta(false)} onCambiata={ricarica ?? undefined} />}
  </>;
}

/** Il comando della miniatura (solo nella preparazione). */
const ComandoMiniatura: StrumentoDiModifica<typeof ComandoMiniaturaReale> = IN_RILASCIO ? NienteInRilascio : ComandoMiniaturaReale;

/** Una carta: immagine, nome (con il percorso in piccolo nei risultati di ricerca), segni, conteggi, infiltrazioni e i due gesti. */
export function CartaLuogo({ nodo, percorso, onScendi }: { nodo: NodoGerarchiaDto; percorso?: string; onScendi?: () => void }) {
  const scendi = onScendi ? etichettaScendi(nodo) : null;
  return (
    <li>
      <article className="card flex w-full flex-col overflow-hidden p-0" aria-label={nodo.nome}>
        <ImmagineCarta nodo={nodo} />
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="m-0 break-words font-display testo-18 leading-tight text-text">{nodo.nome}</h3>
            {percorso && <p className="m-0 testo-12 text-text-secondary">{percorso}</p>}
          </div>
          <SegniNodo nodo={nodo} />
          <ChipConteggi nodo={nodo} />
          {nodo.tipo === 'area' && (nodo.accanto?.length ?? 0) > 0 && <Infiltrazioni titolo="Infiltrazioni:" elenco={nodo.accanto ?? []} />}
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            {nodo.casa && <CollegamentoVisivo to={nodo.casa} tono="primario" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Apri" aria-label={`Apri ${nodo.nome}`} />}
            {scendi && onScendi && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="albero" dimensione={20} />} titolo={scendi} aria-label={`${scendi} di ${nodo.nome}`} onClick={onScendi} />}
            {nodo.miniatura && <ComandoMiniatura nodo={nodo} />}
          </div>
        </div>
      </article>
    </li>
  );
}

/** Una voce della griglia: il nodo, il suo percorso (solo nei risultati di ricerca) e, se scende, cosa fa il secondo gesto. */
export interface VoceLuogo { nodo: NodoGerarchiaDto; percorso?: string; onScendi?: () => void }

/** La griglia di carte; scorre la pagina, non la griglia. */
export function GrigliaLuoghi({ voci, etichetta }: { voci: VoceLuogo[]; etichetta: string }) {
  return (
    <ul className="griglia-luoghi" aria-label={etichetta}>
      {voci.map((v) => <CartaLuogo key={`${v.nodo.tipo}:${v.nodo.chiave}:${v.percorso ?? ''}`} nodo={v.nodo} percorso={v.percorso} onScendi={v.onScendi} />)}
    </ul>
  );
}
