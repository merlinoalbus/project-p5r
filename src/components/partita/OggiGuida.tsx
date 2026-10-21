// ============================================================
// OggiGuida — colonna della guida del giorno: navigazione fra i giorni, «Segna come giorno corrente» e le azioni (Fase 12.4 / 13.5)
// ============================================================

import { GiornoGuida } from '../guida/GiornoGuida';
import { PulsanteVisivo, CollegamentoVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { IconChevronLeft, IconChevronRight } from '../shared/icons';
import { MeteoGiornata } from './MeteoGiornata';
import { dataGiocoTesto } from '../../utils/dateGioco';
import type { Oggi } from '../../hooks/useOggi';
import { DaApplicare } from './DaApplicare';

interface Props {
  oggi: Oggi;
  /** Scorre nel proprio riquadro invece di allungare la pagina (schermate senza scorrimento). */
  riempi?: boolean;
}

/** La colonna della guida del giorno, sullo stato condiviso `oggi`: frecce fra i giorni, «Segna
 * come giorno corrente» (o la targa «Oggi nella partita»), «Vai a oggi», collegamento alla guida
 * completa, la riga fascia + meteo della fascia attiva, e la `GiornoGuida` compatta (con i tag delle allerte del giorno)
 * (con `riempi` scorre nel proprio riquadro). Senza giorno o indice caricati non mostra nulla. */
export function OggiGuida({ oggi, riempi }: Props) {
  const { giorno: g, indice } = oggi;
  if (!g || !indice) return null;
  return (
    <div className={`flex flex-col gap-2 min-w-0 ${riempi ? 'md:min-h-0' : ''}`}>
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        <button type="button" className="btn btn-secondary btn-sm touch" disabled={!g.precedente} onClick={() => oggi.vaiAlGiorno(g.precedente)} aria-label="Giorno precedente"><IconChevronLeft size={16} /></button>
        <span className="font-display text-[19px] uppercase">{dataGiocoTesto(g.giorno)}</span>
        <button type="button" className="btn btn-secondary btn-sm touch" disabled={!g.successivo} onClick={() => oggi.vaiAlGiorno(g.successivo)} aria-label="Giorno successivo"><IconChevronRight size={16} /></button>
        {g.dataCorrente === g.giorno
          ? <span className="chip chip--attivo">Oggi nella partita</span>
          : <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="calendario" dimensione={20} />} titolo="Segna come giorno corrente" disabled={oggi.occupato} onClick={() => void oggi.segnaCorrente()} />}
        {indice.dataCorrente && indice.dataCorrente !== g.giorno && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="calendario" dimensione={20} />} titolo="Vai a oggi" onClick={() => oggi.vaiAlGiorno(indice.dataCorrente)} />}
        <CollegamentoVisivo to={`/guida/percorso/${g.giorno}`} tono="fantasma" compatto className="ml-auto" icona={<IconaAzione chiave="libro" dimensione={20} />} titolo="Guida completa" />
      </div>
      {!indice.dataCorrente && <p className="m-0 text-[12px] text-text-muted shrink-0">Nessun giorno corrente impostato: scegli il giorno e premi «Segna come giorno corrente».</p>}
      {/* Una riga sola (richiesta dell'utente, 2026-09-30): «Giorno», «Sera» e le quattro icone del meteo della fascia
          attiva — passando a «Sera» le icone dicono e segnano il meteo della sera; un tocco salva. Niente etichetta sopra e
          niente spiegazione sotto: in una schermata senza scorrimento ogni riga tolta è guida che si vede. «Giorno» e
          «Sera» sono solo testo (13 px), perché con l'icona la riga non starebbe nella colonna della guida a 1024 px.
          Le allerte del gioco (polline, ondata di calore…) sono tag col nome nella scheda del giorno qui sotto (2026-10-12):
          il bollino senza nome che stava sull'angolo di questi pulsanti se n'è andato. */}
      <div className="momento-meteo shrink-0" role="group" aria-label="Momento della giornata e meteo nella partita">
        {(['giorno', 'sera'] as const).map((fascia) => {
          const nome = fascia === 'giorno' ? 'Giorno' : 'Sera';
          const spiega = fascia === 'giorno' ? 'mattina, pranzo, pomeriggio, dopo scuola' : 'dopo il tramonto';
          return (
            <button key={fascia} type="button" className={`chip touch momento-meteo__fascia ${oggi.fascia === fascia ? 'chip--attivo' : ''}`}
              aria-pressed={oggi.fascia === fascia} disabled={oggi.occupato} onClick={() => void oggi.impostaFascia(fascia)}
              aria-label={`${nome} (${spiega})`} title={`${nome}: ${spiega}`}>
              {nome}
            </button>
          );
        })}
        {g.meteoPartita && (
          <>
            <span className="momento-meteo__separatore" aria-hidden="true" />
            <MeteoGiornata fascia={oggi.fascia} meteo={g.meteoPartita[oggi.fascia]} occupato={oggi.occupato} onCambia={(f, valore) => void oggi.impostaMeteo(f, valore)} />
          </>
        )}
      </div>
      <div className={riempi ? 'md:min-h-0 md:area-scorrevole md:p-1' : ''}>
        {oggi.partitaId !== null && <div className="mb-2"><DaApplicare key={oggi.partitaId} partitaId={oggi.partitaId} onCambiato={() => oggi.ricarica()} /></div>}
        <GiornoGuida onGiornataModificata={() => oggi.ricarica()} g={g} partitaId={oggi.partitaId} onAggiorna={oggi.aggiornaAzione} onSullaMappa={oggi.sullaMappa} azioneEvidenziata={oggi.mappa.azione} compatto fasciaCorrente={g.dataCorrente === g.giorno ? oggi.fascia : null} />
      </div>
    </div>
  );
}
