// ============================================================
// PersonaDelPersonaggio — Persona iniziale ed evoluzioni di un personaggio giocabile: striscia di miniature, click per vedere la versione scelta, tocco sull'immagine per ingrandirla (Fase 12.7 / 15)
// ============================================================
//
// Immagini: asset del compendio `persona/<slug>` (Arsène, Satanael…), altrimenti `persona-gruppo/<slug>` (prompt §15), altrimenti le iniziali.
// Le Persona presenti nel compendio hanno il collegamento alla scheda.
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AssetImg } from '../shared/AssetImg';
import { Modal } from '../shared/Modal';
import { slug } from '../../../shared/slug';

interface Props {
  personaggio: string;
  /** Nomi (italiani) della Persona iniziale e delle evoluzioni, in ordine. */
  persone: string[];
  /** Id nel compendio per nome, se la Persona è fondibile (collegamento alla scheda). */
  idCompendio?: Map<string, number>;
}

const FASI = ['iniziale', 'risveglio', 'terza forma'];

function Iniziali({ nome, classe }: { nome: string; classe: string }) {
  return <span className={`${classe} flex items-center justify-center font-black text-text-muted bg-bg-tertiary`} aria-hidden="true">{nome.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('')}</span>;
}

/** Immagine di una Persona del personaggio con la catena di riserve (compendio → asset dedicato → iniziali). */
function ImmaginePersona({ nome, alt, classe }: { nome: string; alt: string; classe: string }) {
  const s = slug(nome);
  return (
    <AssetImg nome={`persona/${s}`} alt={alt} className={`${classe} object-contain`} fallback={
      <AssetImg nome={`persona-gruppo/${s}`} alt={alt} className={`${classe} object-contain`} fallback={<Iniziali nome={nome} classe={classe} />} />
    } />
  );
}

/** Striscia delle Persona del personaggio; la scelta mostra la versione in grande con la fase. */
export function PersonaDelPersonaggio({ personaggio, persone, idCompendio }: Props) {
  const [scelta, setScelta] = useState(0);
  const [ingrandita, setIngrandita] = useState(false);
  if (persone.length === 0) return null;
  const nome = persone[Math.min(scelta, persone.length - 1)];
  const id = idCompendio?.get(nome) ?? idCompendio?.get(nome.toLowerCase());
  return (
    <div className="flex flex-col gap-2" role="group" aria-label={`Persona di ${personaggio}`}>
      <div className="flex items-center gap-3">
        {/* tocco sull'immagine: la Persona a tutto schermo nella finestra (le figure dei Ladri Fantasma meritano di essere guardate) */}
        <button type="button" className="p-0 border-0 bg-transparent cursor-zoom-in shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-primary" onClick={() => setIngrandita(true)} aria-label={`Ingrandisci ${nome}`}>
          <ImmaginePersona nome={nome} alt={`${nome}, Persona di ${personaggio}`} classe="w-[120px] h-[120px] rounded-lg shrink-0" />
        </button>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-display uppercase text-[20px] leading-none truncate">{nome}</span>
          <span className="text-[12px] text-text-muted">{FASI[scelta] ?? `evoluzione ${scelta + 1}`} · {scelta + 1} di {persone.length}</span>
          {id !== undefined && <Link to={`/compendio/persona/${id}`} className="text-[12px] text-primary">Scheda nel compendio</Link>}
        </div>
      </div>
      <Modal titolo={`${nome} · Persona di ${personaggio}`} aperta={ingrandita} onChiudi={() => setIngrandita(false)} larga>
        <div className="flex flex-col items-center gap-2">
          <ImmaginePersona nome={nome} alt={`${nome}, Persona di ${personaggio}`} classe="w-full max-w-[560px] max-h-[70vh] rounded-lg" />
          <span className="text-[12px] text-text-muted">{FASI[scelta] ?? `evoluzione ${scelta + 1}`} · {scelta + 1} di {persone.length}</span>
        </div>
      </Modal>
      {persone.length > 1 && (
        <ul className="m-0 p-0 list-none flex flex-wrap gap-1.5" aria-label={`Evoluzioni della Persona di ${personaggio}`}>
          {persone.map((p, i) => (
            <li key={p}>
              <button type="button" className={`flex items-center gap-1.5 p-1 pr-2 rounded-md border bg-transparent cursor-pointer touch ${i === scelta ? 'border-primary text-primary' : 'border-border text-text-secondary'}`} onClick={() => setScelta(i)} aria-pressed={i === scelta} aria-label={`${p} (${FASI[i] ?? `evoluzione ${i + 1}`})`}>
                <ImmaginePersona nome={p} alt="" classe="w-9 h-9 rounded" />
                <span className="text-[12px] font-semibold">{p}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
