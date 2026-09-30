// ============================================================
// GiornoGuida — la guida di un giorno: scheda del giorno (data, fase, meteo, trama, vincoli, avvisi) e azioni di giorno e di sera
// con spunta per partita, stato «consigliata» (oro) / «bloccata» (grigio, con motivo) e collegamenti al punto esatto (Fase 7.5b, 12.4/13.5)
// ============================================================
//
// Usato dalla pagina «Guida giorno per giorno» e dalla scheda «Oggi» della Partita (dove un'azione con un luogo collegato centra la mappa).
//
// La giornata è modificabile (richiesta dell'utente, 2026-09-29): «Di giorno» e «Di sera» mettono insieme gli eventi, le azioni
// della guida e le cose da fare dell'utente, e ogni voce ha i suoi gesti (Modifica, Sposta, Rimuovi, Ripristina). Le correzioni
// alle azioni della guida valgono per tutte le partite; le azioni rimosse restano in fondo alla sezione, pronte da rimettere.
// Le due sezioni ci sono sempre, anche vuote, perché è lì che si aggiunge.
// ============================================================

import { useState, type ReactNode } from 'react';
import {
  correggiAzioneGuida, eliminaAzioneAgenda, eliminaEventoAgenda, aggiornaAzioneAgenda, aggiornaEventoAgenda, impostaAzioneAgendaFatta,
  impostaAzionePercorso, riapplicaCorrezioneGuida, rimuoviAzioneGuida, ripristinaAzioneGuida,
} from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { avvisoSpunta, descriviEffetti } from '../../utils/percorso';
import { dotiDaSegnareDaEffetti } from '../../utils/dotiDaSegnare';
import type { AzionePercorsoDto, AzioneUtenteDto, CorrezioneSuperataDto, EventoUtenteDto, FasciaGioco, PercorsoGiornoDto } from '../../types';
import { DataP5 } from '../shared/DataP5';
import { MeteoIcona } from './MeteoIcona';
import { FasciaGiornata, IconaFascia } from './FasciaGiornata';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { Modal } from '../shared/Modal';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { GestiVoce, PulsanteMenuVoce, type GestoVoce } from './MenuVoce';
import { ModuloVoceGiornata, type SoggettoVoce } from './ModuloVoceGiornata';
import { VoceEvento, VoceMia } from './VociAgenda';
import { CartelliniAzione, ImmagineAzione, SceltaNote } from './PartiAzione';
import { chiedeNote } from '../../utils/azioneStrutturata';
import { seGiornoAvanzato } from '../../utils/giornoAvanzato';

const altraFascia = (f: FasciaGioco): FasciaGioco => (f === 'giorno' ? 'sera' : 'giorno');
const nomeFascia = (f: FasciaGioco) => (f === 'giorno' ? 'di giorno' : 'di sera');

/** «Sulla mappa» di una voce: la mappa (e lo spillo) e, per un'azione della guida, il suo indice (da evidenziare); null per le voci dell'utente. */
export type SullaMappa = (mappa: { chiave: string; spilloId: number | null }, indiceGuida: number | null) => void;

interface PropsAzione {
  a: AzionePercorsoDto;
  data: string;
  partitaId: number | null;
  onCambiata: (a: AzionePercorsoDto) => void;
  /** Azione con un luogo sulla mappa: il pulsante «Sulla mappa» la centra (scheda «Oggi») o apre la mappa (pagina della guida). */
  onSullaMappa?: SullaMappa;
  evidenziata?: boolean;
  /** Gesti della voce (Modifica, Sposta, Rimuovi, Ripristina): assenti = riga di sola lettura. */
  gesti?: GestoVoce[];
  menuAperto?: boolean;
  onMenu?: (aperto: boolean) => void;
  /** Un'operazione della giornata è in corso: i gesti aspettano. */
  bloccata?: boolean;
  /** A questo posto c'è una correzione superata da un pacchetto nuovo: la riga lo dice e rimanda a «Correzioni da rivedere». */
  daRivedere?: boolean;
}

/** Una riga della guida: spunta, immagine dell'entità, testo, tipo, collegamento, stato nella partita, note, gesti. */
export function Azione({ a, data, partitaId, onCambiata, onSullaMappa, evidenziata, gesti, menuAperto = false, onMenu, bloccata, daRivedere }: PropsAzione) {
  const [occupato, setOccupato] = useState(false);
  // Azione «tempo con un Confidente»: alla spunta l'app chiede quante note (1–3) si sono ottenute (scelta A, 2 preselezionato).
  const [chiediNote, setChiediNote] = useState(false);
  const cambia = async (fatta: boolean, noteRisposta?: 1 | 2 | 3, senzaPunti = false) => {
    if (!partitaId) return;
    if (fatta && chiedeNote(a) && noteRisposta === undefined && !senzaPunti) { setChiediNote(true); return; }
    setChiediNote(false);
    setOccupato(true);
    try {
      const agg = await impostaAzionePercorso(partitaId, data, a.indice, fatta, noteRisposta);
      onCambiata(agg);
      // spuntando (o riaprendo) un'azione cambia cosa il giorno suggerisce: l'alone dorato si aggiorna da solo
      useSuggerimentiStore.getState().invalida();
      // che cosa è successo e, a parte, le Doti da segnare a mano (la spunta non le tocca)
      if (fatta && agg.effetti) notifica('success', avvisoSpunta(agg.effetti), dotiDaSegnareDaEffetti(agg.effetti).length ? 7000 : undefined);
      // era l'ultima attività del giorno: la partita è passata al giorno dopo
      seGiornoAvanzato(agg);
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupato(false); }
  };
  const stato = a.fatta ? null : a.stato;
  const classeStato = stato?.tipo === 'consigliata' ? 'azione--consigliata' : stato?.tipo === 'bloccata' ? 'azione--bloccata' : '';
  return (
    <li className={`azione flex flex-wrap items-start gap-2 py-1.5 ${a.fatta ? 'opacity-60' : ''} ${classeStato} ${evidenziata ? 'azione--evidenziata' : ''}`} aria-current={evidenziata ? 'true' : undefined}>
      {/* idem: il bersaglio è l'etichetta, non il quadratino */}
      {partitaId && <label className="touch flex items-start justify-center shrink-0 -my-1 pr-1 cursor-pointer"><input type="checkbox" className="w-5 h-5 mt-2 shrink-0" checked={a.fatta} disabled={occupato || bloccata} onChange={(e) => void cambia(e.target.checked)} aria-label={`Fatto: ${a.azione.slice(0, 60)}`} /></label>}
      <ImmagineAzione a={a} />
      <div className="flex flex-col gap-0.5 text-[13px] min-w-0 flex-1">
        <span className={a.fatta ? 'line-through' : ''}>{a.azione}</span>
        <CartelliniAzione a={a} onSullaMappa={onSullaMappa && a.mappa ? () => onSullaMappa(a.mappa!, a.indice) : undefined} propri={(
          <>
            {a.correzione && <span className="chip text-[11px]" title="L'hai corretta tu: vale per tutte le partite. «Ripristina originale» la riporta com'è nella guida.">Corretta</span>}
            {daRivedere && <span className="chip chip--oro text-[11px]" title="La guida è cambiata a questo posto: riapplica o scarta la tua correzione in «Correzioni da rivedere», in cima al giorno.">Correzione da rivedere</span>}
          </>
        )} />
        {chiediNote && <SceltaNote occupato={occupato} onScegli={(n) => void cambia(true, n ?? undefined, n === null)} onAnnulla={() => setChiediNote(false)} />}
      </div>
      {gesti && onMenu && <PulsanteMenuVoce voce={a.azione} aperto={menuAperto} onCambia={onMenu} disabled={occupato || bloccata} />}
      {gesti && menuAperto && <GestiVoce gesti={gesti} disabled={occupato || bloccata} etichetta={`Gesti per: ${a.azione.slice(0, 60)}`} />}
    </li>
  );
}

interface Props {
  g: PercorsoGiornoDto;
  partitaId: number | null;
  onAggiorna: (a: AzionePercorsoDto) => void;
  /** Dopo una modifica della giornata (correzione, rimozione, voce aggiunta o spuntata): va ricaricata. */
  onGiornataModificata?: () => void | Promise<void>;
  onSullaMappa?: SullaMappa;
  azioneEvidenziata?: number | null;
  /** Nella scheda «Oggi»: intestazione più compatta. */
  compatto?: boolean;
  /** Momento della giornata della partita per QUESTO giorno (solo se è il giorno corrente): la sezione «Di giorno» o «Di sera» viene evidenziata con «Adesso» (15.27). */
  fasciaCorrente?: 'giorno' | 'sera' | null;
}

/** Richiesta di conferma prima di un gesto che non si disfa (eliminare una voce) o che lascia qualcosa dietro (punti di un'azione spuntata). */
interface Conferma { titolo: string; testo: ReactNode; scelte: Array<{ titolo: string; tono: 'primario' | 'pericolo'; icona: 'elimina' | 'annulla-ultimo'; esegui: () => Promise<unknown>; ok: string }> }

/** Scheda del giorno e azioni di giorno e di sera, modificabili. */
export function GiornoGuida({ g, partitaId, onAggiorna, onGiornataModificata, onSullaMappa, azioneEvidenziata, compatto, fasciaCorrente }: Props) {
  const [occupato, setOccupato] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [soggetto, setSoggetto] = useState<SoggettoVoce | null>(null);
  const [conferma, setConferma] = useState<Conferma | null>(null);
  const agenda = g.agenda;
  // la chiave del menu porta il giorno: cambiando giorno nessun menu resta aperto su una voce che non c'è più
  const chiaveMenu = (k: string) => `${g.giorno}/${k}`;
  const menuDi = (k: string) => ({ menuAperto: menu === chiaveMenu(k), onMenu: (aperto: boolean) => setMenu(aperto ? chiaveMenu(k) : null) });

  // aprire la finestra o la conferma chiude il menu della voce: tornando alla lista la riga è di nuovo com'era
  const apri = (s: SoggettoVoce) => { setMenu(null); setSoggetto(s); };
  const chiedi = (c: Conferma) => { setMenu(null); setConferma(c); };

  const aggiornata = async () => {
    await onGiornataModificata?.();
    // testo, fascia o presenza di un'azione cambiano cosa il giorno suggerisce
    useSuggerimentiStore.getState().invalida();
  };
  /** `ok`: il messaggio, oppure una funzione che lo ricava dall'esito (la spunta dice che cosa ha dato). */
  const esegui = async <T,>(op: () => Promise<T>, ok: string | ((esito: T) => string)) => {
    setOccupato(true);
    try {
      const esito = await op();
      await aggiornata();
      setMenu(null);
      notifica('success', typeof ok === 'string' ? ok : ok(esito));
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Operazione non riuscita.');
    } finally {
      setOccupato(false);
    }
  };

  const gestiGuida = (a: AzionePercorsoDto): GestoVoce[] => [
    { chiave: 'modifica', titolo: 'Modifica', icona: <IconaAzione chiave="modifica" dimensione={20} />, onClick: () => apri({ tipo: 'guida', azione: a }) },
    { chiave: 'sposta', titolo: `Sposta ${nomeFascia(altraFascia(a.fascia))}`, icona: <IconaFascia fascia={altraFascia(a.fascia)} />, onClick: () => void esegui(() => correggiAzioneGuida(g.giorno, a.indice, { fascia: altraFascia(a.fascia) }), `Spostata ${nomeFascia(altraFascia(a.fascia))} per tutte le partite.`) },
    ...(a.correzione ? [{ chiave: 'ripristina', titolo: 'Ripristina originale', icona: <IconaAzione chiave="riapri" dimensione={20} />, onClick: () => void esegui(() => ripristinaAzioneGuida(g.giorno, a.indice), 'Azione riportata com\'è nella guida.') }] : []),
    { chiave: 'rimuovi', titolo: 'Rimuovi', tono: 'pericolo', icona: <IconaAzione chiave="elimina" dimensione={20} />, onClick: () => rimuoviGuida(a) },
  ];

  const rimuoviGuida = (a: AzionePercorsoDto) => {
    const rimuovi = () => rimuoviAzioneGuida(g.giorno, a.indice, true);
    // un'azione spuntata che ha dato punti: rimuovendola i punti resterebbero senza la riga che li spiega
    if (partitaId && a.fatta && a.effetti) {
      chiedi({
        titolo: 'Rimuovere un\'azione già spuntata?',
        testo: <>Nella partita questa azione è spuntata (<strong>{descriviEffetti(a.effetti)}</strong>). Puoi togliere prima la spunta (punti del Confidente e turni vengono annullati; le Doti restano come le hai segnate tu, letture e visioni restano) oppure rimuoverla lasciando tutto com'è. La rimozione vale per tutte le partite e si può annullare con «Rimetti».</>,
        scelte: [
          { titolo: 'Togli la spunta e rimuovi', tono: 'primario', icona: 'annulla-ultimo', esegui: async () => { await impostaAzionePercorso(partitaId, g.giorno, a.indice, false); await rimuovi(); }, ok: 'Spunta tolta, punti annullati e azione rimossa dalla giornata.' },
          { titolo: 'Rimuovi lasciando i punti', tono: 'pericolo', icona: 'elimina', esegui: rimuovi, ok: 'Azione rimossa dalla giornata.' },
        ],
      });
      return;
    }
    void esegui(rimuovi, 'Azione rimossa dalla giornata per tutte le partite: la trovi in fondo alla sezione per rimetterla.');
  };

  /** Riapplica una correzione superata; se era una rimozione e l'azione di oggi è spuntata con punti, chiede come «Rimuovi». */
  const riapplica = (c: CorrezioneSuperataDto) => {
    const riapplicaLa = () => riapplicaCorrezioneGuida(g.giorno, c.indice);
    const attuale = g.azioni.find((a) => a.indice === c.indice);
    if (c.nascosta && partitaId && attuale?.fatta && attuale.effetti) {
      chiedi({
        titolo: 'Riapplicare la rimozione a un\'azione spuntata?',
        testo: <>La correzione toglie dalla giornata «{attuale.azione}», che nella partita è spuntata (<strong>{descriviEffetti(attuale.effetti)}</strong>). Puoi togliere prima la spunta (punti del Confidente e turni vengono annullati; le Doti restano come le hai segnate tu, letture e visioni restano) oppure riapplicarla lasciando tutto com'è.</>,
        scelte: [
          { titolo: 'Togli la spunta e riapplica', tono: 'primario', icona: 'annulla-ultimo', esegui: async () => { await impostaAzionePercorso(partitaId, g.giorno, c.indice, false); await riapplicaLa(); }, ok: 'Spunta tolta, punti annullati e correzione riapplicata.' },
          { titolo: 'Riapplica lasciando i punti', tono: 'pericolo', icona: 'elimina', esegui: riapplicaLa, ok: 'Correzione riapplicata.' },
        ],
      });
      return;
    }
    void esegui(riapplicaLa, 'Correzione riapplicata.');
  };

  /** Che cosa aveva fatto l'utente, in una frase: corretto, rimosso, o tutte e due. */
  const descriviSuperata = (c: CorrezioneSuperataDto) => {
    if (c.nascosta && c.azioneCorretta) return <>Avevi corretto «{c.azioneAllora}» in «{c.azioneCorretta}» e poi l'avevi rimossa.</>;
    if (c.nascosta) return <>Avevi rimosso «{c.azioneAllora}».</>;
    if (c.azioneCorretta) return <>Avevi corretto «{c.azioneAllora}» in «{c.azioneCorretta}».</>;
    return <>Avevi corretto note o momento della giornata di «{c.azioneAllora}».</>;
  };

  const gestiMia = (a: AzioneUtenteDto): GestoVoce[] => [
    { chiave: 'modifica', titolo: 'Modifica', icona: <IconaAzione chiave="modifica" dimensione={20} />, onClick: () => apri({ tipo: 'mia', azione: a }) },
    { chiave: 'sposta', titolo: `Sposta ${nomeFascia(altraFascia(a.fascia))}`, icona: <IconaFascia fascia={altraFascia(a.fascia)} />, onClick: () => void esegui(() => aggiornaAzioneAgenda(a.id, { fascia: altraFascia(a.fascia) }), `Spostata ${nomeFascia(altraFascia(a.fascia))}.`) },
    { chiave: 'elimina', titolo: 'Elimina', tono: 'pericolo', icona: <IconaAzione chiave="elimina" dimensione={20} />, onClick: () => chiedi(
      // spuntata con effetti: prima si toglie la spunta (punti del Confidente e turni tornano indietro; le Doti le segna l'utente),
      // altrimenti resterebbero senza la riga che li spiega
      partitaId && a.fatta && a.effetti ? {
        titolo: 'Eliminare una cosa da fare già spuntata?',
        testo: <>Nella partita «{a.azione}» è spuntata (<strong>{descriviEffetti(a.effetti)}</strong>). Eliminandola si toglie prima la spunta (punti del Confidente e turni vengono annullati; le Doti restano come le hai segnate tu, letture e visioni restano); poi viene cancellata{a.partitaId === null ? ' da tutte le partite' : ''} e non si può recuperare.</>,
        scelte: [{ titolo: 'Togli la spunta ed elimina', tono: 'pericolo', icona: 'elimina', esegui: async () => { await impostaAzioneAgendaFatta(a.id, partitaId, false); await eliminaAzioneAgenda(a.id); }, ok: 'Spunta tolta, punti annullati e cosa da fare eliminata.' }],
      } : {
        titolo: 'Eliminare la cosa da fare?', testo: <>«{a.azione}» viene cancellata{a.partitaId === null ? ' da tutte le partite' : ''}: non si può recuperare.</>,
        scelte: [{ titolo: 'Elimina', tono: 'pericolo', icona: 'elimina', esegui: () => eliminaAzioneAgenda(a.id), ok: 'Cosa da fare eliminata.' }],
      },
    ) },
  ];
  const gestiEvento = (e: EventoUtenteDto): GestoVoce[] => [
    { chiave: 'modifica', titolo: 'Modifica', icona: <IconaAzione chiave="modifica" dimensione={20} />, onClick: () => apri({ tipo: 'evento', evento: e }) },
    { chiave: 'sposta', titolo: `Sposta ${nomeFascia(altraFascia(e.fascia))}`, icona: <IconaFascia fascia={altraFascia(e.fascia)} />, onClick: () => void esegui(() => aggiornaEventoAgenda(e.id, { fascia: altraFascia(e.fascia) }), `Spostato ${nomeFascia(altraFascia(e.fascia))}.`) },
    { chiave: 'elimina', titolo: 'Elimina', tono: 'pericolo', icona: <IconaAzione chiave="elimina" dimensione={20} />, onClick: () => chiedi({
      titolo: 'Eliminare l\'evento?', testo: <>«{e.titolo}» viene cancellato{e.partitaId === null ? ' da tutte le partite' : ''}: non si può recuperare.</>,
      scelte: [{ titolo: 'Elimina', tono: 'pericolo', icona: 'elimina', esegui: () => eliminaEventoAgenda(e.id), ok: 'Evento eliminato.' }],
    }) },
  ];

  const spuntaMia = (a: AzioneUtenteDto, fatta: boolean, noteRisposta?: 1 | 2 | 3) => {
    if (!partitaId) return;
    void esegui(async () => { const agg = await impostaAzioneAgendaFatta(a.id, partitaId, fatta, noteRisposta); seGiornoAvanzato(agg); return agg; },
      (agg) => (fatta && agg.effetti ? avvisoSpunta(agg.effetti) : fatta ? 'Segnata come fatta.' : 'Riaperta.'));
  };

  const perFascia = (f: FasciaGioco) => ({
    eventi: agenda.eventi.filter((e) => e.fascia === f),
    guida: g.azioni.filter((a) => a.fascia === f),
    mie: agenda.azioni.filter((a) => a.fascia === f),
    rimosse: g.rimosse.filter((r) => r.fascia === f),
  });
  const totali = { fatte: g.azioni.filter((a) => a.fatta).length + agenda.azioni.filter((a) => a.fatta).length, tutte: g.azioni.length + agenda.azioni.length };
  const daRivedere = new Set(g.correzioniSuperate.map((c) => c.indice));
  const consigliate = g.azioni.filter((a) => !a.fatta && a.stato?.tipo === 'consigliata').length;
  const bloccate = g.azioni.filter((a) => !a.fatta && a.stato?.tipo === 'bloccata').length;

  const sezione = (f: FasciaGioco) => {
    const v = perFascia(f);
    const daFare = v.guida.length + v.mie.length;
    const fatte = v.guida.filter((a) => a.fatta).length + v.mie.filter((a) => a.fatta).length;
    const vuota = daFare + v.eventi.length === 0;
    return (
      <section key={f} className={`card flex flex-col gap-1 ${fasciaCorrente === f ? 'card--adesso' : ''}`} aria-current={fasciaCorrente === f ? 'true' : undefined} aria-label={f === 'giorno' ? 'Di giorno' : 'Di sera'}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <FasciaGiornata fascia={f} attiva={fasciaCorrente === f} dettaglio={partitaId && daFare > 0 ? `${fatte} su ${daFare}` : undefined} />
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi" disabled={occupato} onClick={() => apri({ tipo: 'nuova', fascia: f })} aria-label={`Aggiungi ${nomeFascia(f)}`} />
        </div>
        {vuota
          ? <p className="m-0 text-[13px] text-text-muted py-1">Niente {nomeFascia(f)} per questo giorno: con «Aggiungi» metti una cosa da fare o un evento.</p>
          : (
            <ul className="m-0 p-0 list-none divide-y divide-border-light" aria-label={f === 'giorno' ? 'Azioni di giorno' : 'Azioni di sera'}>
              {v.eventi.map((e) => <VoceEvento key={`e${e.id}`} e={e} gesti={gestiEvento(e)} occupato={occupato} {...menuDi(`e${e.id}`)} />)}
              {v.guida.map((a) => <Azione key={`g${a.indice}`} a={a} data={g.giorno} partitaId={partitaId} onCambiata={onAggiorna} onSullaMappa={onSullaMappa} evidenziata={azioneEvidenziata === a.indice}
                // una correzione superata a questo posto si rivede prima (Riapplica o Scarta): i gesti la sovrascriverebbero in silenzio
                gesti={daRivedere.has(a.indice) ? undefined : gestiGuida(a)} daRivedere={daRivedere.has(a.indice)} bloccata={occupato} {...menuDi(`g${a.indice}`)} />)}
              {v.mie.map((a) => <VoceMia key={`m${a.id}`} a={a} partitaId={partitaId} onSpunta={(fatta, note) => spuntaMia(a, fatta, note)} onSullaMappa={onSullaMappa && a.mappa ? () => onSullaMappa(a.mappa!, null) : undefined} gesti={gestiMia(a)} occupato={occupato} {...menuDi(`m${a.id}`)} />)}
            </ul>
          )}
        {v.rimosse.length > 0 && (
          <details className="text-[12px] text-text-muted border-t border-border-light pt-1">
            <summary className="touch cursor-pointer py-3">{v.rimosse.length === 1 ? '1 azione della guida rimossa' : `${v.rimosse.length} azioni della guida rimosse`}</summary>
            <ul className="m-0 p-0 list-none flex flex-col gap-1" aria-label={`Azioni rimosse ${nomeFascia(f)}`}>
              {v.rimosse.map((r) => (
                <li key={r.indice} className="flex items-start gap-2">
                  <span className="flex-1 min-w-0 line-through pt-3">{r.azione}</span>
                  <PulsanteVisivo compatto tono="secondario" icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Rimetti" disabled={occupato} aria-label={`Rimetti: ${r.azione.slice(0, 60)}`}
                    onClick={() => void esegui(() => rimuoviAzioneGuida(g.giorno, r.indice, false), 'Azione rimessa nella giornata.')} />
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    );
  };

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
        {g.fonte && <a href={g.fonte} target="_blank" rel="noreferrer" className="credito touch inline-flex items-center self-start">fonte</a>}
        {g.correzioniSuperate.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border-light pt-2" role="group" aria-label="Correzioni da rivedere">
            <p className="m-0 text-warning"><strong>La guida di questo giorno è cambiata</strong> (pacchetto nuovo): queste tue correzioni non si applicano più da sole.</p>
            {g.correzioniSuperate.map((c) => (
              <div key={c.indice} className="flex flex-col gap-1">
                <span className="text-text-secondary">
                  {descriviSuperata(c)}{' '}
                  {c.azioneAttuale ? <>Ora a quel posto c'è «{c.azioneAttuale}».</> : 'Ora a quel posto non c\'è più nessuna azione.'}
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {c.azioneAttuale && <PulsanteVisivo compatto tono="secondario" icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Riapplica" dettaglio="all'azione attuale" disabled={occupato} onClick={() => riapplica(c)} />}
                  <PulsanteVisivo compatto tono="fantasma" icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Scarta" disabled={occupato} onClick={() => void esegui(() => ripristinaAzioneGuida(g.giorno, c.indice), 'Correzione scartata.')} />
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
      {sezione('giorno')}
      {sezione('sera')}
      {partitaId && totali.tutte > 0 && <p className="m-0 text-[12px] text-text-muted">{totali.fatte} azioni fatte su {totali.tutte}.</p>}
      {soggetto && <ModuloVoceGiornata soggetto={soggetto} giorno={g.giorno} partitaId={partitaId} onChiudi={() => setSoggetto(null)} onSalvato={aggiornata} />}
      {conferma && (
        <Modal aperta titolo={conferma.titolo} onChiudi={() => setConferma(null)} azioni={(
          <div className="flex flex-wrap justify-end gap-1.5 w-full">
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={() => setConferma(null)} />
            {conferma.scelte.map((s) => (
              <PulsanteVisivo key={s.titolo} tono={s.tono} compatto icona={<IconaAzione chiave={s.icona} dimensione={20} />} titolo={s.titolo} disabled={occupato}
                onClick={() => { const c = s; setConferma(null); void esegui(c.esegui, c.ok); }} />
            ))}
          </div>
        )}>
          <p className="m-0 text-[14px]">{conferma.testo}</p>
        </Modal>
      )}
    </div>
  );
}
