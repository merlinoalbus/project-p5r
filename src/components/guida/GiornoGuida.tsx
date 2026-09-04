// ============================================================
// GiornoGuida — la guida di un giorno: scheda del giorno (data, fase, meteo, trama, vincoli, avvisi) e azioni di giorno e di sera
// con spunta per partita, stato «consigliata» (oro) / «bloccata» (grigio, con motivo) e collegamenti al punto esatto (Fase 7.5b, 12.4/13.5)
// ============================================================
//
// Usato dalla pagina «Guida giorno per giorno» e dalla scheda «Oggi» della Partita (dove un'azione con un luogo collegato centra la mappa).
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { impostaAzionePercorso } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { NOME_TIPO_AZIONE, collegamentoAzione, descriviEffetti } from '../../utils/percorso';
import type { AzionePercorsoDto, PercorsoGiornoDto } from '../../types';
import { DataP5 } from '../shared/DataP5';
import { MeteoIcona } from './MeteoIcona';
import { FasciaGiornata } from './FasciaGiornata';
import { IconaCategoria } from './IconaCategoria';
import { EmblemaDungeon } from './EmblemaDungeon';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { IconaSpillo } from '../mappe/IconaSpillo';

interface PropsAzione {
  a: AzionePercorsoDto;
  data: string;
  partitaId: number | null;
  onCambiata: (a: AzionePercorsoDto) => void;
  /** Azione con un luogo sulla mappa: il pulsante «Sulla mappa» la centra (scheda «Oggi») o apre la mappa (pagina della guida). */
  onSullaMappa?: (a: AzionePercorsoDto) => void;
  evidenziata?: boolean;
}

/** Una riga della guida: spunta, immagine dell'entità, testo, tipo, collegamento, stato nella partita, note. */
export function Azione({ a, data, partitaId, onCambiata, onSullaMappa, evidenziata }: PropsAzione) {
  const [occupato, setOccupato] = useState(false);
  // Azione «tempo con un Confidente»: alla spunta l'app chiede quante note (1–3) si sono ottenute (scelta A, 2 preselezionato).
  const [chiediNote, setChiediNote] = useState(false);
  const chiedeNote = a.tipo === 'confidente' && a.riferimento?.tipo === 'confidente';
  const cambia = async (fatta: boolean, noteRisposta?: 1 | 2 | 3, senzaPunti = false) => {
    if (!partitaId) return;
    if (fatta && chiedeNote && noteRisposta === undefined && !senzaPunti) { setChiediNote(true); return; }
    setChiediNote(false);
    setOccupato(true);
    try {
      const agg = await impostaAzionePercorso(partitaId, data, a.indice, fatta, noteRisposta);
      onCambiata(agg);
      if (fatta && agg.effetti) notifica('success', descriviEffetti(agg.effetti));
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupato(false); }
  };
  const link = collegamentoAzione(a);
  const stato = a.fatta ? null : a.stato;
  const classeStato = stato?.tipo === 'consigliata' ? 'azione--consigliata' : stato?.tipo === 'bloccata' ? 'azione--bloccata' : '';
  return (
    <li className={`azione flex items-start gap-2 py-1.5 ${a.fatta ? 'opacity-60' : ''} ${classeStato} ${evidenziata ? 'azione--evidenziata' : ''}`} aria-current={evidenziata ? 'true' : undefined}>
      {partitaId && <input type="checkbox" className="w-5 h-5 mt-0.5 shrink-0" checked={a.fatta} disabled={occupato} onChange={(e) => void cambia(e.target.checked)} aria-label={`Fatto: ${a.azione.slice(0, 60)}`} />}
      {a.riferimento?.tipo === 'confidente' ? (
        <ImmagineEntita ambito="confidente" chiave={a.riferimento.chiave} etichetta={a.riferimentoTesto ?? a.riferimento.chiave} dimensione={40} adatta="copri" />
      ) : a.riferimento?.tipo === 'dungeon' ? (
        <EmblemaDungeon chiave={a.riferimento.chiave} nome={a.riferimentoTesto ?? a.riferimento.chiave} dimensione={40} />
      ) : (
        <IconaCategoria categoria={a.tipo} dimensione={40} />
      )}
      <div className="flex flex-col gap-0.5 text-[13px] min-w-0">
        <span className={a.fatta ? 'line-through' : ''}>{a.azione}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="chip text-[11px]">{NOME_TIPO_AZIONE[a.tipo] ?? a.tipo}</span>
          {link ? <Link to={link.href} className="chip chip--attivo no-underline text-[11px]">{link.etichetta}</Link> : a.riferimentoTesto && <span className="chip text-[11px]">{a.riferimentoTesto}</span>}
          {a.mappa && onSullaMappa && (
            <button type="button" className="chip chip--icona touch text-[11px]" onClick={() => onSullaMappa(a)} aria-label={`Sulla mappa: ${a.azione.slice(0, 60)}`}>
              <IconaSpillo tipo="passaggio" dimensione={14} />Sulla mappa
            </button>
          )}
          {stato?.tipo === 'consigliata' && <span className="chip chip--oro text-[11px]" title={stato.motivo ?? undefined}>Consigliata{stato.motivo ? ` · ${stato.motivo}` : ''}</span>}
          {stato?.tipo === 'bloccata' && <span className="chip chip--bloccata text-[11px]" title={stato.motivo ?? undefined}>Bloccata{stato.motivo ? `: ${stato.motivo}` : ''}</span>}
          {stato?.tipo === 'neutra' && stato.motivo && <span className="text-[12px] text-text-muted">{stato.motivo}</span>}
          {a.rangoAtteso !== null && <span className="text-[12px] text-text-muted">rango atteso {a.rangoAtteso}</span>}
          {a.note && <span className="text-[12px] text-text-secondary">{a.note}</span>}
          {a.fatta && a.effetti && <span className="chip chip--attivo text-[11px]" title="Punti applicati alla spunta: si annullano togliendola">{descriviEffetti(a.effetti)}</span>}
        </span>
        {chiediNote && (
          <span className="flex flex-wrap items-center gap-1.5 text-[12px]" role="group" aria-label="Note ottenute con il Confidente">
            <span className="text-text-secondary">Quante note hai ottenuto?</span>
            {([1, 2, 3] as const).map((n) => (
              <button key={n} type="button" className={`chip touch ${n === 2 ? 'chip--attivo' : ''}`} disabled={occupato} onClick={() => void cambia(true, n)} aria-label={`${n} ${n === 1 ? 'nota' : 'note'}`}>{'♪'.repeat(n)}</button>
            ))}
            <button type="button" className="chip touch" disabled={occupato} onClick={() => void cambia(true, undefined, true)}>Nessun punto</button>
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={() => setChiediNote(false)} />
          </span>
        )}
      </div>
    </li>
  );
}

interface Props {
  g: PercorsoGiornoDto;
  partitaId: number | null;
  onAggiorna: (a: AzionePercorsoDto) => void;
  onSullaMappa?: (a: AzionePercorsoDto) => void;
  azioneEvidenziata?: number | null;
  /** Nella scheda «Oggi»: intestazione più compatta. */
  compatto?: boolean;
}

/** Scheda del giorno e azioni di giorno e di sera. */
export function GiornoGuida({ g, partitaId, onAggiorna, onSullaMappa, azioneEvidenziata, compatto }: Props) {
  const azioniGiorno = g.azioni.filter((a) => a.fascia === 'giorno');
  const azioniSera = g.azioni.filter((a) => a.fascia === 'sera');
  const consigliate = g.azioni.filter((a) => !a.fatta && a.stato?.tipo === 'consigliata').length;
  const bloccate = g.azioni.filter((a) => !a.fatta && a.stato?.tipo === 'bloccata').length;
  return (
    <div className="flex flex-col gap-3">
      <section className={`card flex flex-col gap-1 text-[13px] ${compatto ? 'py-3' : ''}`}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 flex items-center gap-3 flex-wrap"><DataP5 data={g.giorno} giornoSettimana={g.giornoSettimana} evidenzia={g.dataCorrente === g.giorno} /></h2>
          <span className="chip">{g.fase}</span>
          {g.meteo && <MeteoIcona meteo={g.meteo} dimensione={26} conTesto />}
          {partitaId && (consigliate > 0 || bloccate > 0) && (
            <span className="text-[12px] text-text-muted">{consigliate > 0 ? `${consigliate} consigliate` : ''}{consigliate > 0 && bloccate > 0 ? ' · ' : ''}{bloccate > 0 ? `${bloccate} bloccate` : ''}</span>
          )}
        </div>
        {g.trama ? <p className="m-0">{g.trama}</p> : <p className="m-0 text-text-muted">Nessun evento di trama annotato.</p>}
        {g.vincoli.length > 0 && <p className="m-0 text-text-secondary"><strong className="text-text">Vincoli:</strong> {g.vincoli.join(' · ')}</p>}
        {g.avvisi.length > 0 && <ul className="m-0 pl-4 text-primary">{g.avvisi.map((v) => <li key={v}>{v}</li>)}</ul>}
        {!g.coperto && <p className="m-0 text-text-muted">Giorno non coperto dalle fonti: nessuna azione consigliata.</p>}
        {g.fonte && <a href={g.fonte} target="_blank" rel="noreferrer" className="credito self-start">fonte</a>}
      </section>
      {azioniGiorno.length > 0 && (
        <section className="card flex flex-col gap-1">
          <FasciaGiornata fascia="giorno" dettaglio={partitaId ? `${azioniGiorno.filter((a) => a.fatta).length} su ${azioniGiorno.length}` : undefined} />
          <ul className="m-0 p-0 list-none divide-y divide-border-light" aria-label="Azioni di giorno">{azioniGiorno.map((a) => <Azione key={a.indice} a={a} data={g.giorno} partitaId={partitaId} onCambiata={onAggiorna} onSullaMappa={onSullaMappa} evidenziata={azioneEvidenziata === a.indice} />)}</ul>
        </section>
      )}
      {azioniSera.length > 0 && (
        <section className="card flex flex-col gap-1">
          <FasciaGiornata fascia="sera" dettaglio={partitaId ? `${azioniSera.filter((a) => a.fatta).length} su ${azioniSera.length}` : undefined} />
          <ul className="m-0 p-0 list-none divide-y divide-border-light" aria-label="Azioni di sera">{azioniSera.map((a) => <Azione key={a.indice} a={a} data={g.giorno} partitaId={partitaId} onCambiata={onAggiorna} onSullaMappa={onSullaMappa} evidenziata={azioneEvidenziata === a.indice} />)}</ul>
        </section>
      )}
      {partitaId && g.azioni.length > 0 && <p className="m-0 text-[12px] text-text-muted">{g.fatte} azioni fatte su {g.azioni.length}.</p>}
    </div>
  );
}
