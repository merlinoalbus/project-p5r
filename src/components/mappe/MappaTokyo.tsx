// ============================================================
// MappaTokyo — la città disegnata con gli elementi del gioco, viva col calendario
// ============================================================
//
// Non è un'illustrazione: è costruita. Ogni quartiere è il proprio disegno originale, lo sprite
// `_lm` di `P5_MAPDATA.SPD` — il 105 di Shibuya, il Kabukichō di Shinjuku, la ruota di Odaiba, il
// Kaminarimon di Asakusa — ritagliato con l'alfa vera. Sopra ci vanno i Palazzi, il Covo dei Ladri
// e le altre radici.
//
// La cosa che la rende una guida e non un poster è il **tempo**. L'11 aprile Shinjuku non c'è: si
// sblocca il 18 giugno, e mostrarla manderebbe qualcuno a cercare un quartiere che non esiste
// ancora. Il Palazzo di Kamoshida c'è dal 12 aprile al 2 maggio e poi sparisce. Le condizioni non
// sono state inventate qui: la data di sblocco di ogni quartiere sta in `quartiere.sblocco_data` e
// la finestra di ogni Palazzo in `finestre-dungeon.json`, tutte e due dalla Fase 2.
//
// Senza partita si mostra tutto, e si dice che si sta mostrando tutto: chi consulta la guida senza
// aver aperto una partita vuole vedere il mondo intero, non un mondo vuoto all'11 aprile.
//
// **Le posizioni sono autorate**, e sta scritto in `collocazioneTokyo.ts`: i disegni vengono dal
// gioco, la disposizione no. Segue la geografia vera di Tokyo, che è anche quella che il gioco
// segue, ma nessuna distanza qui è in scala.
// ============================================================

import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { ordineGioco } from '../../../shared/condizioniSpillo';
import type { DungeonRiassuntoDto, QuartiereRiassuntoDto } from '../../types';
import { COVO_TOKYO, QUARTIERI_TOKYO, RADICI_TOKYO, type Collocazione } from './collocazioneTokyo';

const BASE = '/asset/mappe/lmap/tokyo';

interface Props {
  quartieri: QuartiereRiassuntoDto[];
  dungeon?: DungeonRiassuntoDto[];
  /** Data della partita in MM-GG. Senza, si mostra il mondo intero. */
  dataGioco?: string | null;
  className?: string;
}

/** Una data cade dentro la finestra? Il calendario di gioco va da aprile a marzo, e `ordineGioco`
 *  è la stessa funzione che usa il valutatore delle condizioni: qui non si riscrive. */
function dentro(oggi: string, dal: string, al: string | null): boolean {
  const g = ordineGioco(oggi);
  return g >= ordineGioco(dal) && (!al || g <= ordineGioco(al));
}

interface Segno {
  chiave: string;
  nome: string;
  png: string;
  dove: Collocazione;
  href: string;
  presente: boolean;
  quando: string | null;
  /** Immagine da usare se il disegno originale non esiste per questo luogo. */
  ripiego: string;
  /** Il disegno è tratto nero del gioco e va invertito per vedersi sul fondo scuro. */
  invertito: boolean;
}

function Disegno({ s }: { s: Segno }) {
  const stile = {
    left: `${s.dove.x}%`, top: `${s.dove.y}%`, width: `${s.dove.scala}%`,
    transform: 'translate(-50%, -50%)',
  };
  return <Link
    to={s.href}
    className="group absolute flex flex-col items-center gap-0.5 no-underline"
    style={stile}
    title={s.quando ? `${s.nome} — ${s.quando}` : s.nome}
  >
    {/* Non tutti i quartieri hanno il proprio disegno nel foglio della mappa di viaggio: Shujin
        Academy non è una destinazione del treno, e nel gioco lì non compare. Invece di lasciare
        un riquadro rotto si passa all'illustrazione del quartiere, che c'è per tutti. */}
    <img src={`${BASE}/${s.png}`} alt="" aria-hidden
      onError={(e) => {
        const im = e.currentTarget;
        if (im.dataset.ripiego) { im.style.display = 'none'; return; }
        im.dataset.ripiego = '1';
        im.classList.remove('invert');
        im.src = s.ripiego;
      }}
      className={`w-full transition-transform group-hover:scale-110 ${
        // Gli sprite del gioco sono tratti **neri**: il gioco li disegna su fondo chiaro, l'app ha
        // il fondo scuro, e lasciati come sono sparirebbero. Invertirli li rende bianchi — che è
        // poi il contrasto forte in cui P5R disegna tutto. Il ripiego è una fotografia e non va
        // invertito: diventerebbe un negativo.
        s.invertito ? 'invert drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]' : 'rounded drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]'
      }`} />
    <span className="rounded bg-bg/80 px-1 text-[10px] leading-tight text-text sm:text-[11px]">{s.nome}</span>
  </Link>;
}

export function MappaTokyo({ quartieri, dungeon = [], dataGioco, className = '' }: Props) {
  const { presenti, assenti } = useMemo(() => {
    const segni: Segno[] = [];

    for (const q of quartieri) {
      const dove = QUARTIERI_TOKYO[q.chiave];
      if (!dove) continue;
      const presente = !dataGioco || !q.sbloccoData || dentro(dataGioco, q.sbloccoData, null);
      segni.push({
        chiave: q.chiave, nome: q.nome, png: `${q.chiave}.png`, dove,
        href: `/guida/mondo/quartiere/${encodeURIComponent(q.chiave)}`,
        presente, quando: q.sbloccoData ? `dal ${q.sbloccoData}` : null,
        ripiego: `/asset/mappe/citta-${q.chiave}.png`, invertito: true,
      });
    }

    for (const d of dungeon) {
      const dove = RADICI_TOKYO[`dungeon-${d.chiave}`];
      if (!dove) continue;
      const f = d.finestra;
      const presente = !dataGioco || !f || dentro(dataGioco, f.dal, f.al);
      segni.push({
        chiave: `dungeon-${d.chiave}`, nome: d.nome,
        // I Palazzi non hanno uno sprite nel foglio della mappa di viaggio — nel gioco non
        // compaiono lì — e tengono la loro illustrazione, che l'utente ha chiesto di lasciare.
        png: `../../../palazzi/${d.chiave}.png`, dove,
        href: `/guida/mondo/dungeon/${encodeURIComponent(d.chiave)}`,
        presente, quando: f ? (f.al ? `dal ${f.dal} al ${f.al}` : `dal ${f.dal}`) : null,
        ripiego: `/asset/palazzi/${d.chiave}.png`, invertito: false,
      });
    }

    return {
      presenti: segni.filter((s) => s.presente),
      assenti: segni.filter((s) => !s.presente),
    };
  }, [quartieri, dungeon, dataGioco]);

  return <div className={`flex flex-col gap-2 ${className}`}>
    <div
      className="relative w-full overflow-hidden rounded-lg border border-border bg-bg-secondary"
      style={{ aspectRatio: '16 / 11' }}
      role="img"
      aria-label={`Mappa di Tokyo con ${presenti.length} luoghi raggiungibili`}
    >
      {presenti.map((s) => <Disegno key={s.chiave} s={s} />)}
      {/* Il Covo dei Ladri: la soffitta del Leblanc, sempre lì dal primo giorno. */}
      <Link to="/guida/completamento" className="absolute flex flex-col items-center no-underline"
        style={{ left: `${COVO_TOKYO.x}%`, top: `${COVO_TOKYO.y}%`, width: `${COVO_TOKYO.scala}%`, transform: 'translate(-50%,-50%)' }}
        title="Covo dei Ladri — la soffitta del Leblanc">
        <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">Covo</span>
      </Link>
    </div>
    {dataGioco && assenti.length > 0 && <p className="m-0 text-[12px] text-text-muted">
      {/* Non spariscono e basta: si dice quali e da quando, altrimenti la mappa sembra incompleta
          invece che aggiornata al giorno della partita. */}
      Non ancora nel mondo il {dataGioco}: {assenti.map((s) => `${s.nome} (${s.quando ?? '—'})`).join(' · ')}
    </p>}
    {!dataGioco && <p className="m-0 text-[12px] text-text-muted">
      Nessuna partita attiva: la mappa mostra il mondo intero, quartieri e Palazzi compresi.
    </p>}
  </div>;
}
