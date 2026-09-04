// ============================================================
// AlberoPiano — albero di un piano di fusione (nodo ricorsivo) riusato da «Piano di fusione» e dai piani salvati
// ============================================================

import { Link } from 'react-router-dom';
import { formattaYen } from '../../utils/punti';
import type { NodoPianoDto } from '../../types';

const NOME_MODO: Record<NodoPianoDto['modo'], string> = { scorta: 'In scorta', registro: 'Dal Registro', cattura: 'Da catturare', fusione: 'Fusione' };
const NOME_TIPO: Record<string, string> = { normale: 'normale', 'stesso-arcano': 'stesso arcano', tesoro: 'con Demone del Tesoro', speciale: 'speciale' };

interface Props {
  nodo: NodoPianoDto;
  radice?: boolean;
  /** Persona (id) attualmente in scorta: i nodi corrispondenti vengono evidenziati come già ottenuti. */
  inScorta?: Set<number>;
}

/** Nodo dell'albero: riga con Persona, modo (colore), costo; i figli rientrati sotto. */
export function NodoPiano({ nodo, radice, inScorta }: Props) {
  const p = nodo.persona;
  const possedutaOra = inScorta?.has(p.id) ?? false;
  const classeModo = nodo.modo === 'scorta' ? 'chip--attivo' : nodo.modo === 'cattura' ? 'text-warning' : nodo.modo === 'registro' ? 'text-text-secondary' : '';
  return (
    <li className="flex flex-col gap-1">
      <div className={`flex flex-wrap items-center gap-2 py-1 ${radice ? 'text-[15px]' : 'text-[13px]'}`}>
        <Link to={`/compendio/persona/${p.id}`} className={`chip touch no-underline ${radice || possedutaOra ? 'chip--attivo' : ''}`} title={`${p.arcanaNome} · livello ${p.livello}${possedutaOra ? ' · ora in scorta' : ''}`}>
          {p.nomeIt} <span className="opacity-70">L{p.livello}</span>{possedutaOra && inScorta && nodo.modo !== 'scorta' ? ' ✓' : ''}
        </Link>
        <span className={`text-[12px] ${classeModo}`}>
          {nodo.modo === 'fusione' ? `${NOME_MODO.fusione} ${NOME_TIPO[nodo.tipo ?? 'normale']}` : NOME_MODO[nodo.modo]}
          {nodo.modo === 'registro' && ` · ${formattaYen(nodo.costo)}`}
        </span>
        {nodo.skillPortate.map((s) => (
          <span key={s.id} className={`chip text-[11px] ${nodo.skillDaLivello.some((d) => d.id === s.id) ? 'text-warning' : 'chip--attivo'}`} title={nodo.skillDaLivello.some((d) => d.id === s.id) ? 'La apprende salendo di livello' : nodo.modo === 'fusione' ? 'Da ereditare in questa fusione' : 'Posseduta'}>
            {s.nomeIt}{nodo.skillDaLivello.some((d) => d.id === s.id) ? ' ↑' : ''}
          </span>
        ))}
      </div>
      {nodo.figli.length > 0 && (
        <ul className="m-0 p-0 list-none pl-4 ml-2 border-l border-border-light flex flex-col">
          {nodo.figli.map((f, i) => <NodoPiano key={`${f.persona.id}-${i}`} nodo={f} inScorta={inScorta} />)}
        </ul>
      )}
    </li>
  );
}

/** Albero completo a partire dalla radice. */
export function AlberoPiano({ radice, inScorta }: { radice: NodoPianoDto; inScorta?: Set<number> }) {
  return (
    <ul className="m-0 p-0 list-none">
      <NodoPiano nodo={radice} radice inScorta={inScorta} />
    </ul>
  );
}
