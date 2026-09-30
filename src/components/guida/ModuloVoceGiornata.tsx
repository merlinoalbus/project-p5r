// ============================================================
// ModuloVoceGiornata — finestra per aggiungere una voce alla giornata o modificarne una (azione della guida, cosa da fare, evento)
// ============================================================
//
// Una finestra sola per le quattro situazioni, così i campi restano gli stessi ovunque:
//   nuova   dal pulsante «Aggiungi» di «Di giorno» / «Di sera»: cosa da fare, evento, scadenza o promemoria
//   guida   correzione di un'azione della guida: testo, note, fascia; vale per tutte le partite (decisione dell'utente)
//   mia     una cosa da fare dell'utente
//   evento  un evento dell'utente (evento, scadenza, promemoria)
// Le voci dell'utente scelgono se valere solo nella partita in corso o in tutte, come prima nel riquadro «Le mie note».
// ============================================================

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Segmenti } from '../shared/Segmenti';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import {
  aggiornaAzioneAgenda, aggiornaEventoAgenda, correggiAzioneGuida, creaAzioneAgenda, creaEventoAgenda, ripristinaAzioneGuida,
} from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { NOME_TIPO_AZIONE, NOME_TIPO_EVENTO } from '../../utils/percorso';
import { EditorAzioneStrutturata } from './EditorAzioneStrutturata';
import { STRUTTURA_VUOTA, campiCompleti, strutturaDi } from '../../utils/azioneStrutturata';
import type { AzionePercorsoDto, AzioneUtenteDto, EventoUtenteDto, FasciaGioco } from '../../types';

export type SoggettoVoce =
  | { tipo: 'nuova'; fascia: FasciaGioco }
  | { tipo: 'guida'; azione: AzionePercorsoDto }
  | { tipo: 'mia'; azione: AzioneUtenteDto }
  | { tipo: 'evento'; evento: EventoUtenteDto };

type Genere = 'cosa' | EventoUtenteDto['tipo'];

const GENERI: ReadonlyArray<{ chiave: Genere; nome: string }> = [{ chiave: 'cosa', nome: 'Cosa da fare' }, { chiave: 'evento', nome: 'Evento' }, { chiave: 'scadenza', nome: 'Scadenza' }, { chiave: 'promemoria', nome: 'Promemoria' }];
const TIPI_EVENTO = GENERI.filter((g) => g.chiave !== 'cosa') as ReadonlyArray<{ chiave: EventoUtenteDto['tipo']; nome: string }>;
const FASCE: ReadonlyArray<{ chiave: FasciaGioco; nome: string }> = [{ chiave: 'giorno', nome: 'Di giorno' }, { chiave: 'sera', nome: 'Di sera' }];

/** Valori iniziali dei campi per il soggetto. */
function iniziali(s: SoggettoVoce, partitaId: number | null) {
  switch (s.tipo) {
    case 'nuova': return { genere: 'cosa' as Genere, testo: '', note: '', fascia: s.fascia, soloQuesta: partitaId !== null, struttura: STRUTTURA_VUOTA };
    case 'guida': return { genere: 'cosa' as Genere, testo: s.azione.azione, note: s.azione.note ?? '', fascia: s.azione.fascia, soloQuesta: false, struttura: strutturaDi(s.azione) };
    case 'mia': return { genere: 'cosa' as Genere, testo: s.azione.azione, note: s.azione.note ?? '', fascia: s.azione.fascia, soloQuesta: s.azione.partitaId !== null, struttura: strutturaDi(s.azione) };
    case 'evento': return { genere: s.evento.tipo as Genere, testo: s.evento.titolo, note: s.evento.dettaglio, fascia: s.evento.fascia, soloQuesta: s.evento.partitaId !== null, struttura: STRUTTURA_VUOTA };
  }
}

const TITOLO: Record<SoggettoVoce['tipo'], string> = { nuova: 'Aggiungi alla giornata', guida: 'Modifica l\'azione della guida', mia: 'Modifica la cosa da fare', evento: 'Modifica l\'evento' };

interface Props {
  soggetto: SoggettoVoce;
  giorno: string;
  partitaId: number | null;
  onChiudi: () => void;
  /** Dopo un salvataggio riuscito: la giornata va ricaricata. */
  onSalvato: () => void | Promise<void>;
}

export function ModuloVoceGiornata({ soggetto, giorno, partitaId, onChiudi, onSalvato }: Props) {
  const [campi, setCampi] = useState(() => iniziali(soggetto, partitaId));
  const [occupato, setOccupato] = useState(false);
  const imposta = (p: Partial<typeof campi>) => setCampi((c) => ({ ...c, ...p }));
  const evento = soggetto.tipo === 'evento' || (soggetto.tipo === 'nuova' && campi.genere !== 'cosa');
  const guida = soggetto.tipo === 'guida' ? soggetto.azione : null;
  // tipo, collegamento, rango ed effetti: per le azioni della guida e per le cose da fare dell'utente (gli eventi non si spuntano)
  const conStruttura = soggetto.tipo === 'guida' || soggetto.tipo === 'mia' || (soggetto.tipo === 'nuova' && campi.genere === 'cosa');
  // i limiti del server: le azioni della guida sono lunghe (fino a ~800 caratteri), le voci dell'utente brevi
  const maxTesto = guida ? 2000 : evento ? 200 : 400;
  const maxNote = guida || evento ? 2000 : 600;
  const partitaScelta = partitaId !== null && campi.soloQuesta ? partitaId : null;

  const esegui = async (azione: () => Promise<unknown>, ok: string) => {
    setOccupato(true);
    try {
      await azione();
      await onSalvato();
      notifica('success', ok);
      onChiudi();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.');
    } finally {
      setOccupato(false);
    }
  };

  const salva = () => {
    const testo = campi.testo.trim();
    if (!testo) return;
    const note = campi.note.trim();
    // tipo, collegamento, rango ed effetti scelti nella finestra (una cosa da fare li ha come un'azione della guida)
    const struttura = () => ({ tipo: campi.struttura.tipo, riferimento: campi.struttura.riferimento, rangoAtteso: campi.struttura.rangoAtteso, produce: campi.struttura.produce });
    switch (soggetto.tipo) {
      case 'nuova':
        return campi.genere === 'cosa'
          ? esegui(() => creaAzioneAgenda({ data: giorno, fascia: campi.fascia, azione: testo, ...(note ? { note } : {}), partitaId: partitaScelta, ...struttura() }), 'Cosa da fare aggiunta alla giornata.')
          : esegui(() => creaEventoAgenda({ data: giorno, tipo: campi.genere as EventoUtenteDto['tipo'], fascia: campi.fascia, titolo: testo, ...(note ? { dettaglio: note } : {}), partitaId: partitaScelta }), `${NOME_TIPO_EVENTO[campi.genere as EventoUtenteDto['tipo']]} aggiunto alla giornata.`);
      case 'guida': {
        const s = campi.struttura;
        return esegui(() => correggiAzioneGuida(giorno, soggetto.azione.indice, {
          azione: testo, note: note || null, fascia: campi.fascia, tipo: s.tipo, riferimento: s.riferimento, rangoAtteso: s.rangoAtteso, produce: s.produce,
        }), 'Azione della guida corretta per tutte le partite.');
      }
      case 'mia':
        return esegui(() => aggiornaAzioneAgenda(soggetto.azione.id, { azione: testo, note: note || null, fascia: campi.fascia, partitaId: partitaScelta, ...struttura() }), 'Cosa da fare aggiornata.');
      case 'evento':
        return esegui(() => aggiornaEventoAgenda(soggetto.evento.id, { tipo: campi.genere as EventoUtenteDto['tipo'], titolo: testo, dettaglio: note, fascia: campi.fascia, partitaId: partitaScelta }), 'Evento aggiornato.');
    }
  };

  return (
    <Modal
      aperta
      larga={conStruttura}
      titolo={TITOLO[soggetto.tipo]}
      onChiudi={onChiudi}
      azioni={(
        <div className="flex flex-wrap justify-end gap-1.5 w-full">
          {guida?.correzione && (
            <PulsanteVisivo tono="fantasma" compatto className="mr-auto" icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Ripristina originale" disabled={occupato}
              onClick={() => void esegui(() => ripristinaAzioneGuida(giorno, guida.indice), 'Azione riportata com\'è nella guida.')} />
          )}
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={onChiudi} />
          <PulsanteVisivo type="submit" form="modulo-voce-giornata" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo={soggetto.tipo === 'nuova' ? 'Aggiungi' : 'Salva'}
            disabled={occupato || !campi.testo.trim() || (conStruttura && !campiCompleti(campi.struttura))} />
        </div>
      )}
    >
      <form id="modulo-voce-giornata" className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void salva(); }}>
        {soggetto.tipo === 'nuova' && <Segmenti etichetta="Che cosa aggiungi" valore={campi.genere} opzioni={GENERI} onCambia={(g) => imposta({ genere: g })} />}
        {soggetto.tipo === 'evento' && <Segmenti etichetta="Tipo di evento" valore={campi.genere as EventoUtenteDto['tipo']} opzioni={TIPI_EVENTO} onCambia={(g) => imposta({ genere: g })} />}
        <label className="flex flex-col gap-1 text-[13px] text-text-secondary">{evento ? 'Che cosa succede' : 'Che cosa fare'}
          <textarea className="form-input" rows={guida ? 5 : 3} maxLength={maxTesto} value={campi.testo} autoFocus onChange={(e) => imposta({ testo: e.target.value })}
            placeholder={evento ? 'es. Quiz televisivo al Leblanc' : 'es. Comprare il Set per retrogaming'} />
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-text-secondary">{evento ? 'Dettagli' : 'Note'}
          <textarea className="form-input" rows={guida ? 3 : 2} maxLength={maxNote} value={campi.note} onChange={(e) => imposta({ note: e.target.value })} />
        </label>
        <Segmenti etichetta="Momento della giornata" valore={campi.fascia} opzioni={FASCE} onCambia={(f) => imposta({ fascia: f })} />
        {soggetto.tipo !== 'guida' && partitaId !== null && (
          <label className="flex items-center gap-2 text-[13px] touch">
            <input type="checkbox" className="w-5 h-5" checked={campi.soloQuesta} onChange={(e) => imposta({ soloQuesta: e.target.checked })} /> Solo in questa partita
          </label>
        )}
        {soggetto.tipo !== 'guida' && partitaId === null && <p className="m-0 text-[12px] text-text-muted">Senza una partita attiva la voce vale per tutte le partite.</p>}
        {conStruttura && <EditorAzioneStrutturata valore={campi.struttura} onCambia={(s) => imposta({ struttura: s })} />}
        {soggetto.tipo === 'mia' && soggetto.azione.fatta && <p className="m-0 text-[12px] text-text-muted">Questa cosa da fare è già spuntata: gli effetti nuovi valgono dalla prossima spunta, i punti già dati restano finché non la togli.</p>}
        {guida && <p className="m-0 text-[12px] text-text-muted">La correzione vale per tutte le partite; le spunte restano dove sono.{guida.fatta ? ' Questa azione è già spuntata: gli effetti nuovi valgono dalla prossima spunta, i punti già dati restano finché non la togli.' : ''}</p>}
        {guida?.correzione && (
          <div className="flex flex-col gap-1 text-[12px] text-text-secondary border-l-2 border-border pl-2">
            <span className="text-text-muted">Com'è nella guida ({guida.correzione.fascia === 'sera' ? 'di sera' : 'di giorno'}):</span>
            <span>{guida.correzione.azione}</span>
            {guida.correzione.note && <span className="text-text-muted">{guida.correzione.note}</span>}
            <span className="text-text-muted">
              {NOME_TIPO_AZIONE[guida.correzione.tipo] ?? guida.correzione.tipo}
              {guida.correzione.riferimentoTesto ? ` · ${guida.correzione.riferimentoTesto}` : ''}
              {guida.correzione.rangoAtteso !== null ? ` · rango atteso ${guida.correzione.rangoAtteso}` : ''}
            </span>
            <span className="text-text-muted">Alla spunta: {guida.correzione.produceTesto?.length ? guida.correzione.produceTesto.join(' · ') : 'nessun effetto'}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}
