// ============================================================
// MappaMemento — il pozzo, montato con i pezzi del gioco
// ============================================================
//
// I Memento sono un imbuto che sprofonda sotto Tokyo, e il gioco lo disegna come una pila di
// grappoli di città divelta che si stringono scendendo, dentro un cratere rosso solcato da venature
// e attraversato da catene, con il profilo della città sopra.
//
// **Ogni pezzo è originale.** Stanno in `IT/FIELD/PANEL/MEMENTOS/MEMENTOS.SPD` e hanno i loro nomi:
// gli otto `第N層` — «strato N» — sono i grappoli, l'ultimo con la punta a trivella del fondo;
// `街並み` è il profilo della città; `鎖` sono le catene; i `血管`, «vasi sanguigni», sono le
// venature rosse. Estratti da `lmap_sprites.py` in `public/asset/mappe/lmap/memento/`.
//
// C'era il rischio di disegnarli a mano, ed è stato corso: la prima versione aveva un cratere fatto
// di gradienti e targhe col nome, e per i grappoli era già stato scritto un prompt da mandare a
// Codex. Erano lì da sempre. La regola che ne resta è in `docs/grafica/fabbisogno.md`: prima di
// chiedere un disegno, si guarda se il gioco ce l'ha.
//
// **Il pezzo compare quando il dedalo si sblocca**: finché non lo si è aperto il suo posto è vuoto
// e il pozzo prosegue lo stesso, perché il pozzo c'è tutto dal principio — è la discesa che si
// guadagna. Le date dei dedali restano prosa: nel catalogo la maggior parte non è una data ma una
// condizione di storia — «Palazzo di Madarame completato» — e ricavarne un giorno con
// un'espressione regolare vuol dire sbagliarne qualcuna in silenzio. Finché la partita non tiene
// quel conto si mostrano tutti, e lo si dice.
// ============================================================

import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import type { AreaDungeonDto } from '../../types';

const BASE = '/asset/mappe/lmap/memento';

/** Gli otto strati del gioco, più il decimo del terzo semestre per il dedalo che viene dopo.
 *
 * I dedali sono nove e gli strati otto: l'ultimo, Da'at, appartiene al terzo semestre, e il gioco
 * per quello disegna un pozzo diverso — `３学期メメントス`. Si usa il suo pezzo più grande. */
const STRATI = ['strato-1', 'strato-2', 'strato-3', 'strato-4', 'strato-5', 'strato-6',
  'strato-7', 'strato-8', 'terzo-semestre-10'];

interface Props {
  aree: AreaDungeonDto[];
  /** Chiavi dei dedali già raggiunti. Vuoto o assente: si mostrano tutti, e lo si dice. */
  sbloccati?: Set<string>;
  className?: string;
}

/** La prima frase della descrizione: è lì che il catalogo scrive quando il dedalo si apre. */
function primaFrase(testo: string | null | undefined): string {
  const t = (testo ?? '').trim();
  if (!t) return '';
  const punto = t.indexOf('. ');
  return punto > 0 ? t.slice(0, punto + 1) : t.length > 110 ? `${t.slice(0, 107)}…` : t;
}

/** Dove cade uno strato nella discesa.
 *
 * Si stringe e si scosta alternando i lati, come nel disegno del gioco, dove i grappoli non
 * cadono in colonna. Gli strati si sovrappongono di proposito: è la sovrapposizione a farne una
 * figura sola invece di nove disegni impilati. */
function posaDelloStrato(i: number, quanti: number) {
  const t = quanti > 1 ? i / (quanti - 1) : 0;
  return {
    x: 50 + Math.sin(i * 1.9) * 21 * (1 - t * 0.7),
    y: 9 + t * 80,
    larghezza: 34 - 19 * t,
  };
}

export function MappaMemento({ aree, sbloccati, className = '' }: Props) {
  const tappe = useMemo(() => aree.map((a, i) => ({
    area: a,
    strato: STRATI[Math.min(i, STRATI.length - 1)],
    posa: posaDelloStrato(i, aree.length),
    aperto: !sbloccati || sbloccati.size === 0 || sbloccati.has(a.chiave),
  })), [aree, sbloccati]);

  return <div className={`flex flex-col gap-2 ${className}`}>
    <div className="relative w-full overflow-hidden rounded-lg bg-[#8d0012]" style={{ aspectRatio: '4 / 5' }}>
      {/* Il cratere: il rosso si accende verso il fondo, dove il pozzo va più giù. */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 80% 55% at 50% 97%, #ff4a22 0%, #c40016 22%, #8d0012 55%, #5c000c 100%)',
      }} />

      {/* Le venature del gioco, che nel cratere corrono come vasi. Sono i `血管` del foglio. */}
      <img src={`${BASE}/vena-lunga-elemento.png`} alt="" aria-hidden
        className="pointer-events-none absolute left-[16%] top-0 h-full w-auto opacity-70" />
      <img src={`${BASE}/vena-lunga-riflessa-elemento.png`} alt="" aria-hidden
        className="pointer-events-none absolute right-[15%] top-0 h-full w-auto opacity-70" />
      <img src={`${BASE}/vena-alto-destra-0-elemento.png`} alt="" aria-hidden
        className="pointer-events-none absolute right-[4%] top-[6%] w-[26%] opacity-60" />
      <img src={`${BASE}/vena-basso-destra-elemento.png`} alt="" aria-hidden
        className="pointer-events-none absolute bottom-[10%] right-0 w-[52%] opacity-55" />

      {/* Le catene, ai due lati del pozzo. */}
      <img src={`${BASE}/catena-elemento.png`} alt="" aria-hidden
        className="pointer-events-none absolute left-[3%] top-[8%] h-[72%] w-auto opacity-85" />
      <img src={`${BASE}/catena-corta-elemento.png`} alt="" aria-hidden
        className="pointer-events-none absolute right-[6%] top-[30%] h-[26%] w-auto opacity-85" />

      {/* Il profilo della città sopra il pozzo: dal fondo si vede solo quello. */}
      <img src={`${BASE}/citta-sopra-elemento.png`} alt="" aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 w-full" />

      {/* Gli strati, dal primo in giù. Quelli non ancora raggiunti lasciano il posto vuoto. */}
      {tappe.map((t) => t.aperto && <Link
        key={t.area.chiave}
        to={`/guida/mondo/area/${encodeURIComponent(t.area.chiave)}`}
        className="group absolute -translate-x-1/2 -translate-y-1/2 no-underline"
        style={{ left: `${t.posa.x}%`, top: `${t.posa.y}%`, width: `${t.posa.larghezza}%` }}
        title={primaFrase(t.area.descrizione) || t.area.nome}
      >
        <img src={`${BASE}/${t.strato}-elemento.png`} alt="" aria-hidden
          className="w-full drop-shadow-[0_3px_8px_rgba(0,0,0,0.6)] transition-transform duration-150 group-hover:scale-[1.08]" />
        <span className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 -translate-y-2 whitespace-nowrap rounded-[2px] border-2 border-white bg-black px-[0.5em] py-[0.12em] font-display text-[11px] uppercase leading-none tracking-[0.05em] text-white shadow-[0_2px_8px_rgba(0,0,0,0.8)] transition-colors group-hover:border-[#ffd23f] group-hover:text-[#ffd23f] sm:text-[14px]">
          {t.area.nome.replace(/^Dedalo di /, '')}
        </span>
      </Link>)}
    </div>

    <p className="m-0 text-[12px] text-text-muted">
      I Memento si aprono il 9 maggio e restano aperti. Ogni dedalo però si guadagna con la storia
      — «Palazzo di Madarame completato», non una data — e finché la partita non tiene quel conto
      la mappa li mostra tutti.
    </p>
    <ol className="m-0 grid list-none gap-1 p-0 sm:grid-cols-2" aria-label="I dedali dei Memento, dall’alto verso il basso">
      {aree.map((a, i) => <li key={a.chiave}>
        <Link to={`/guida/mondo/area/${encodeURIComponent(a.chiave)}`}
          className="flex items-baseline gap-2 rounded px-1 py-0.5 no-underline hover:bg-bg-tertiary">
          <span className="w-[1.7em] shrink-0 text-right font-display text-[14px] tabular-nums text-primary">
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="min-w-0">
            <span className="text-[13px] text-text">{a.nome}</span>
            <span className="block truncate text-[11px] text-text-muted">{primaFrase(a.descrizione)}</span>
          </span>
        </Link>
      </li>)}
    </ol>
  </div>;
}
