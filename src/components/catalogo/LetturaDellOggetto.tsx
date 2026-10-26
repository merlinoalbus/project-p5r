import type { FilmDto, LibroDto, OggettoDettaglioDto, VideogiocoDto } from '../../types';
import { useCodaProgresso } from '../../hooks/useCodaProgresso';
import { impostaProgressoFilm, impostaProgressoLibro } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { avvisaDotiDaSegnare } from '../../utils/dotiDaSegnare';
import { ChipDisponibilita } from '../guida/ChipDisponibilita';
import { ComandiProgressoLettura } from '../guida/ComandiProgressoLettura';
import { NotaPuntiDote } from '../shared/NotaPuntiDote';
import { Link } from 'react-router-dom';
import { ComandiVideogioco } from '../guida/ComandiVideogioco';
import { TestoNote } from '../shared/TestoNote';

type Lettura = NonNullable<OggettoDettaglioDto['lettura']>;
type Voce = LibroDto | FilmDto | VideogiocoDto;

/** Riuso della coda esistente, non una seconda implementazione del progresso delle letture. */
function Avanzamento<T extends Voce>({ voce, titolo, tipo, totale, passo, partitaId, invia, onSalvata }: {
  voce: T; titolo: string; tipo: 'libro' | 'cinema' | 'dvd' | 'videogioco'; totale: number; passo?: number;
  partitaId: number | null; invia: (partita: number, chiave: string, progresso: number) => Promise<T>;
  onSalvata: (voce: T) => void;
}) {
  const coda = useCodaProgresso<T>(partitaId, {
    invia, applica: onSalvata,
    dopoOgniInvio: (v) => avvisaDotiDaSegnare(v.daSegnare, titolo),
    messaggioErrore: 'Aggiornamento dell’avanzamento fallito.', segnalaErrore: (m) => notifica('error', m),
  });
  return <>
    <ChipDisponibilita disponibilita={voce.disponibilita ?? undefined} />
    <ComandiProgressoLettura titolo={titolo} tipo={tipo} progresso={coda.valore(voce)} totale={totale}
      passo={passo} partita={partitaId !== null} occupato={coda.occupato(voce)} disponibilita={voce.disponibilita}
      onCambia={(valore) => coda.accoda(voce, valore)} />
    {!!voce.effettiTesto.length && <ul className="m-0 pl-5 testo-13">{voce.effettiTesto.map((e, i) => <li key={i}><TestoNote testo={e} /></li>)}</ul>}
    {voce.dettagli && <p className="m-0 whitespace-pre-line testo-13 text-text-secondary"><TestoNote testo={voce.dettagli} daParole="conteggi" /></p>}
    {partitaId !== null ? <NotaPuntiDote cosa={tipo === 'videogioco' ? 'i round giocati' : tipo === 'cinema' ? 'le visioni' : 'le sessioni completate'} /> : <p className="m-0 testo-13 text-text-muted">Attiva una partita per registrare l’avanzamento.</p>}
  </>;
}

/** Il genitore usa come key oggetto e partita: nessuna risposta della scheda precedente va alla successiva. */
export function LetturaDellOggetto({ lettura, partitaId, onSalvata }: { lettura: Lettura; partitaId: number | null; onSalvata: (lettura: Lettura) => void }) {
  if (lettura.tipo === 'libro') {
    const libro = lettura.voce;
    const passo = lettura.letturaRapida && libro.chiave !== 'lettura-rapida' ? 2 : 1;
    return <>
      <Avanzamento voce={libro} titolo={libro.nome} tipo="libro" totale={libro.totaleSessioni} passo={passo} partitaId={partitaId}
        invia={impostaProgressoLibro} onSalvata={(voce) => onSalvata({ ...lettura, voce })} />
      {passo === 2 && <p className="m-0 testo-13 text-text-secondary">Lettura rapida: ogni sessione avanza di due; le letture già registrate non cambiano.</p>}
      {!!libro.apre?.length && <div className="flex flex-wrap items-center gap-2 testo-13"><strong>Apre, a lettura finita:</strong>{libro.apre.map((p) => p.casa
        ? <Link key={`${p.tipo}:${p.chiave}`} to={p.casa} className="touch inline-flex items-center">{p.nome}</Link>
        : <span key={`${p.tipo}:${p.chiave}`}>{p.nome}</span>)}</div>}
    </>;
  }
  if (lettura.tipo === 'film') {
    const film = lettura.voce;
    return <Avanzamento voce={film} titolo={film.nome} tipo={film.dove === 'cinema' ? 'cinema' : 'dvd'} totale={film.totaleSessioni}
      partitaId={partitaId} invia={impostaProgressoFilm} onSalvata={(voce) => onSalvata({ ...lettura, voce })} />;
  }
  return <>
    <ChipDisponibilita disponibilita={lettura.voce.disponibilita ?? undefined} />
    {lettura.voce.orariSedeTesto && <p className="m-0 text-xs text-text-secondary">Orari della sede: {lettura.voce.orariSedeTesto}</p>}
    <ComandiVideogioco key={`${partitaId}:${lettura.voce.chiave}`} gioco={lettura.voce} partitaId={partitaId} onSalvata={(voce) => onSalvata({ ...lettura, voce })} />
    {!!lettura.voce.effettiTesto.length && <ul className="m-0 pl-5 testo-13">{lettura.voce.effettiTesto.map((e, i) => <li key={i}><TestoNote testo={e} /></li>)}</ul>}
    {lettura.voce.dettagli && <p className="m-0 whitespace-pre-line testo-13 text-text-secondary"><TestoNote testo={lettura.voce.dettagli} daParole="conteggi" /></p>}
    {partitaId !== null ? <NotaPuntiDote cosa="i round completati" /> : <p className="m-0 testo-13 text-text-muted">Attiva una partita per registrare sessioni e round.</p>}
  </>;
}
