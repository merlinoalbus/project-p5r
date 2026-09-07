// ============================================================
// LettureEGiochi — libri, film e videogiochi da segnare senza uscire dalla partita
// ============================================================
//
// Richiesta dell'utente: «dentro Partita vorrei vedere i pulsanti per gestire tutti gli oggetti
// tipo libri, film, giochi». Le tre pagine della Guida ci sono già e restano il posto dove si
// consultano — con le schede, i luoghi, le fonti — ma **segnare** una sessione mentre si sta
// guardando il giorno è un gesto della partita, non della guida: uscire, cercare il titolo,
// segnarlo e tornare indietro fa perdere il filo.
//
// Qui c'è solo il gesto: quanto manca, e i pulsanti per muoverlo. Niente schede, niente ricerca
// per luogo, niente pannelli di posizione — per quelli c'è la Guida, e il collegamento è in cima.
//
// **Da fare e completati stanno separati**, con i completati chiusi: è la stessa scelta delle
// pagine della Guida, e qui conta ancora di più, perché in partita si guarda «cosa mi manca».
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getFilm, getLibri, getVideogiochi } from '../../services/api/compendio';
import { impostaProgressoFilm, impostaProgressoLibro, impostaProgressoVideogioco } from '../../services/api/partite';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { PageState } from '../shared/PageState';
import { IconaCategoria } from '../guida/IconaCategoria';
import type { FilmDto, LibroDto, VideogiocoDto } from '../../types';

type Gruppo = 'libri' | 'film' | 'videogiochi';

/** Quel che serve per disegnare una riga, uguale per tutti e tre: il resto e' differenza di nome. */
interface Voce {
  chiave: string;
  nome: string;
  progresso: number;
  totale: number;
  fatto: boolean;
  dove: string;
}

const ETICHETTA: Record<Gruppo, { titolo: string; categoria: 'libri' | 'film' | 'minigiochi'; unita: string; percorso: string }> = {
  libri: { titolo: 'Libri', categoria: 'libri', unita: 'sessioni', percorso: '/guida/libri' },
  film: { titolo: 'Film e DVD', categoria: 'film', unita: 'visioni', percorso: '/guida/film' },
  videogiochi: { titolo: 'Videogiochi', categoria: 'minigiochi', unita: 'round', percorso: '/guida/videogiochi' },
};

function Riga({ v, unita, occupato, onCambia }: { v: Voce; unita: string; occupato: boolean; onCambia: (v: Voce, n: number) => void }) {
  const percentuale = v.totale > 0 ? Math.round((v.progresso / v.totale) * 100) : 0;
  return (
    <li className="flex items-center gap-2 py-1.5">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] font-semibold" title={v.nome}>{v.nome}</span>
        <span className="flex items-center gap-2">
          <span className="visore-mappa__progresso h-1.5 flex-1" role="progressbar" aria-label={`Progresso ${v.nome}`} aria-valuemin={0} aria-valuemax={v.totale} aria-valuenow={v.progresso}>
            <span className="visore-mappa__progresso-barra" style={{ width: `${percentuale}%` }} />
          </span>
          <span className="shrink-0 text-[11px] tabular-nums text-text-muted">{v.progresso}/{v.totale} {unita}</span>
        </span>
      </span>
      <span className="flex shrink-0 gap-1">
        <button type="button" className="btn btn-ghost touch !px-2" disabled={occupato || v.progresso === 0} onClick={() => onCambia(v, v.progresso - 1)} aria-label={`Togli a ${v.nome}`}>−</button>
        <button type="button" className="btn btn-ghost touch !px-2" disabled={occupato || v.progresso >= v.totale} onClick={() => onCambia(v, v.progresso + 1)} aria-label={`Aggiungi a ${v.nome}`}>+</button>
      </span>
    </li>
  );
}

function Sezione({ gruppo, voci, occupati, onCambia }: { gruppo: Gruppo; voci: Voce[]; occupati: Record<string, boolean>; onCambia: (g: Gruppo, v: Voce, n: number) => void }) {
  const [mostraFatti, setMostraFatti] = useState(false);
  const e = ETICHETTA[gruppo];
  const daFare = voci.filter((v) => !v.fatto);
  const fatti = voci.filter((v) => v.fatto);
  return (
    <section className="card flex flex-col gap-2" aria-label={e.titolo}>
      <div className="flex flex-wrap items-center gap-2">
        <IconaCategoria categoria={e.categoria} dimensione={28} />
        <h3 className="m-0 flex-1 font-display text-[15px] uppercase leading-none">{e.titolo}</h3>
        <span className="chip text-[11px]">{fatti.length} di {voci.length}</span>
        <Link to={e.percorso} className="btn btn-ghost btn-sm touch">Apri</Link>
      </div>
      {daFare.length === 0
        ? <p className="m-0 text-[12px] text-text-muted" role="status">{voci.length === 0 ? 'Niente in catalogo.' : 'Finiti tutti.'}</p>
        : <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0" aria-label={`${e.titolo} da fare`}>
            {daFare.map((v) => <Riga key={v.chiave} v={v} unita={e.unita} occupato={!!occupati[v.chiave]} onCambia={(x, n) => onCambia(gruppo, x, n)} />)}
          </ul>}
      {fatti.length > 0 && (
        <>
          <button type="button" className="btn btn-ghost btn-sm touch self-start" aria-expanded={mostraFatti} onClick={() => setMostraFatti((x) => !x)}>
            {mostraFatti ? 'Nascondi' : 'Mostra'} i completati · {fatti.length}
          </button>
          {mostraFatti && (
            <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0 opacity-70" aria-label={`${e.titolo} completati`}>
              {fatti.map((v) => <Riga key={v.chiave} v={v} unita={e.unita} occupato={!!occupati[v.chiave]} onCambia={(x, n) => onCambia(gruppo, x, n)} />)}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

export function LettureEGiochi({ partitaId }: { partitaId: number }) {
  const libri = useCarica(() => getLibri(partitaId), [partitaId]);
  const film = useCarica(() => getFilm(partitaId), [partitaId]);
  const giochi = useCarica(() => getVideogiochi(partitaId), [partitaId]);
  // Lo stato locale e' una **toppa**, non una copia: `{chiave: Voce}` con le sole righe toccate qui
  // dentro. Copiare gli elenchi in uno stato e risincronizzarli con un effetto significa scrivere
  // stato dentro un effetto — cascata di render, e la regola `react-hooks/set-state-in-effect` lo
  // dice — e soprattutto significa avere due verita' che possono divergere.
  const [toccate, setToccate] = useState<Record<string, Voce>>({});
  const [occupati, setOccupati] = useState<Record<string, boolean>>({});

  const daLibro = (l: LibroDto): Voce => ({ chiave: l.chiave, nome: l.nomeIt ?? l.nome, progresso: l.progresso, totale: l.totaleSessioni, fatto: l.fatto, dove: l.dove });
  const daFilm = (f: FilmDto): Voce => ({ chiave: f.chiave, nome: f.nomeIt ?? f.nome, progresso: f.progresso, totale: f.totaleSessioni, fatto: f.fatto, dove: f.dove });
  const daGioco = (g: VideogiocoDto): Voce => ({ chiave: g.chiave, nome: g.nome, progresso: g.progresso, totale: g.totaleRound, fatto: g.fatto, dove: g.luogo });

  const conToppa = (v: Voce): Voce => toccate[v.chiave] ?? v;
  const locali: Record<Gruppo, Voce[]> = {
    libri: (libri.dati?.libri ?? []).map(daLibro).map(conToppa),
    film: (film.dati?.film ?? []).map(daFilm).map(conToppa),
    videogiochi: (giochi.dati?.videogiochi ?? []).map(daGioco).map(conToppa),
  };

  const caricamento = (libri.caricamento && !libri.dati) || (film.caricamento && !film.dati) || (giochi.caricamento && !giochi.dati);
  const errore = libri.errore ?? film.errore ?? giochi.errore;

  const cambia = async (gruppo: Gruppo, v: Voce, avanzamento: number) => {
    setOccupati((o) => ({ ...o, [v.chiave]: true }));
    try {
      const agg = gruppo === 'libri' ? daLibro(await impostaProgressoLibro(partitaId, v.chiave, avanzamento))
        : gruppo === 'film' ? daFilm(await impostaProgressoFilm(partitaId, v.chiave, avanzamento))
          : daGioco(await impostaProgressoVideogioco(partitaId, v.chiave, avanzamento));
      setToccate((t) => ({ ...t, [agg.chiave]: agg }));
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    } finally {
      setOccupati((o) => ({ ...o, [v.chiave]: false }));
    }
  };

  const tutte = [...locali.libri, ...locali.film, ...locali.videogiochi];
  const totali = { fatti: tutte.filter((v) => v.fatto).length, tutti: tutte.length };

  return (
    <PageState isLoading={caricamento} error={errore} onRetry={() => { void libri.ricarica(); void film.ricarica(); void giochi.ricarica(); }}>
      <div className="flex flex-col gap-3">
        <p className="m-0 text-[12px] text-text-secondary">
          Segna qui le sessioni senza uscire dalla partita: {totali.fatti} completati su {totali.tutti}. Le schede complete, con luoghi e fonti, restano nella Guida.
        </p>
        <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-3">
          <Sezione gruppo="libri" voci={locali.libri} occupati={occupati} onCambia={(g, v, n) => void cambia(g, v, n)} />
          <Sezione gruppo="film" voci={locali.film} occupati={occupati} onCambia={(g, v, n) => void cambia(g, v, n)} />
          <Sezione gruppo="videogiochi" voci={locali.videogiochi} occupati={occupati} onCambia={(g, v, n) => void cambia(g, v, n)} />
        </div>
      </div>
    </PageState>
  );
}
