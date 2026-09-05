// ============================================================
// AgendaGiorno — eventi e cose da fare che l'utente aggiunge a una giornata (Fase 16.1)
// ============================================================
//
// Sta sotto la guida del giorno, nella scheda «Oggi» della Partita e nella pagina del percorso. Le voci senza partita
// valgono per tutte le partite (una conoscenza da tenere), quelle con partita solo per quella in corso (un promemoria).
// Le cose da fare si spuntano come le azioni della guida.
// ============================================================

import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { useState } from 'react';
import {
  aggiornaAzioneAgenda, creaAzioneAgenda, creaEventoAgenda, eliminaAzioneAgenda, eliminaEventoAgenda,
  getAgenda, impostaAzioneAgendaFatta,
} from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { FasciaGiornata } from './FasciaGiornata';
import type { AzioneUtenteDto, EventoUtenteDto } from '../../types';

interface Props {
  giorno: string;
  partitaId: number | null;
  /** Nella scheda «Oggi» il riquadro è più compatto. */
  compatto?: boolean;
  onAggiorna?: () => void;
}

const NOME_TIPO_EVENTO: Record<EventoUtenteDto['tipo'], string> = { evento: 'Evento', scadenza: 'Scadenza', promemoria: 'Promemoria' };

export function AgendaGiorno({ giorno, partitaId, compatto, onAggiorna }: Props) {
  const agenda = useCarica(() => getAgenda(giorno, partitaId ?? undefined), [giorno, partitaId]);
  const [nuovo, setNuovo] = useState<'evento' | 'azione' | null>(null);
  const [testo, setTesto] = useState('');
  const [tipoEvento, setTipoEvento] = useState<EventoUtenteDto['tipo']>('promemoria');
  const [fascia, setFascia] = useState<'giorno' | 'sera'>('giorno');
  const [soloQuesta, setSoloQuesta] = useState(true);
  const [occupato, setOccupato] = useState(false);
  const d = agenda.dati;

  const esegui = async (azione: () => Promise<unknown>, ok: string) => {
    setOccupato(true);
    try {
      await azione();
      await agenda.ricarica();
      useSuggerimentiStore.getState().invalida();
      onAggiorna?.();
      notifica('success', ok);
      return true;
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Operazione fallita.');
      return false;
    } finally {
      setOccupato(false);
    }
  };

  const aggiungi = async () => {
    const valore = testo.trim();
    if (!valore) return;
    const partita = partitaId && soloQuesta ? partitaId : null;
    const salvata = await esegui(
      () => (nuovo === 'evento'
        ? creaEventoAgenda({ data: giorno, tipo: tipoEvento, titolo: valore, partitaId: partita })
        : creaAzioneAgenda({ data: giorno, fascia, azione: valore, partitaId: partita })),
      nuovo === 'evento' ? 'Evento aggiunto al giorno.' : 'Cosa da fare aggiunta al giorno.',
    );
    if (salvata) {
      setTesto('');
      setNuovo(null);
    }
  };

  const spunta = (a: AzioneUtenteDto, fatta: boolean) => {
    if (!partitaId) return;
    void esegui(() => impostaAzioneAgendaFatta(a.id, partitaId, fatta), fatta ? 'Segnata come fatta.' : 'Riaperta.');
  };

  const vuota = !d || (d.eventi.length === 0 && d.azioni.length === 0);

  return (
    <section className={`card flex flex-col gap-2 ${compatto ? 'py-3' : ''}`} aria-label="Le mie note del giorno">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="m-0 font-display uppercase tracking-wide text-[18px] leading-none">Le mie note</h2>
        <div className="flex flex-wrap gap-1.5">
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="calendario" dimensione={20} />} titolo="Aggiungi evento" disabled={occupato} onClick={() => { setNuovo(nuovo === 'evento' ? null : 'evento'); setTesto(''); }} />
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="carica-altri" dimensione={20} />} titolo="Aggiungi cosa da fare" disabled={occupato} onClick={() => { setNuovo(nuovo === 'azione' ? null : 'azione'); setTesto(''); }} />
        </div>
      </div>

      {nuovo && (
        <form className="flex flex-col gap-1.5" onSubmit={(e) => { e.preventDefault(); void aggiungi(); }}>
          <label className="editor-mappa__campo">{nuovo === 'evento' ? 'Che cosa succede questo giorno' : 'Che cosa devi fare'}
            <input className="form-input" value={testo} onChange={(e) => setTesto(e.target.value)} maxLength={nuovo === 'evento' ? 200 : 400} autoFocus placeholder={nuovo === 'evento' ? 'es. Quiz televisivo al Leblanc' : 'es. Comprare il Set per retrogaming'} />
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {nuovo === 'evento' ? (
              <select className="form-input w-auto" value={tipoEvento} onChange={(e) => setTipoEvento(e.target.value as EventoUtenteDto['tipo'])} aria-label="Tipo di evento">
                {(Object.keys(NOME_TIPO_EVENTO) as EventoUtenteDto['tipo'][]).map((t) => <option key={t} value={t}>{NOME_TIPO_EVENTO[t]}</option>)}
              </select>
            ) : (
              <select className="form-input w-auto" value={fascia} onChange={(e) => setFascia(e.target.value as 'giorno' | 'sera')} aria-label="Momento della giornata">
                <option value="giorno">Di giorno</option>
                <option value="sera">Di sera</option>
              </select>
            )}
            {partitaId && (
              <label className="flex items-center gap-1.5 text-[13px] touch">
                <input type="checkbox" className="w-5 h-5" checked={soloQuesta} onChange={(e) => setSoloQuesta(e.target.checked)} /> Solo in questa partita
              </label>
            )}
            <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Aggiungi" disabled={occupato || !testo.trim()} />
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={() => { setNuovo(null); setTesto(''); }} />
          </div>
          {!partitaId && <p className="m-0 text-[12px] text-text-muted">Senza una partita attiva la voce vale per tutte le partite.</p>}
        </form>
      )}

      {agenda.errore && <p className="m-0 text-[13px] text-error">{agenda.errore}</p>}
      {vuota && !nuovo && <p className="m-0 text-[13px] text-text-muted">Nessuna nota per questo giorno: aggiungi un evento della tua partita o una cosa da fare.</p>}

      {d && d.eventi.length > 0 && (
        <ul className="m-0 p-0 list-none flex flex-col gap-1" aria-label="Eventi del giorno">
          {d.eventi.map((e) => (
            <li key={e.id} className="flex items-start gap-2 text-[13px] py-1 border-b border-border-light last:border-0">
              <span className="chip text-[11px] shrink-0">{NOME_TIPO_EVENTO[e.tipo]}</span>
              <span className="flex-1 min-w-0">
                {e.titolo}
                {e.dettaglio && <span className="block text-[12px] text-text-secondary">{e.dettaglio}</span>}
                {e.partitaId === null && <span className="text-[11px] text-text-muted"> · tutte le partite</span>}
              </span>
              <button type="button" className="visore-mappa__azione-testo touch" disabled={occupato} onClick={() => void esegui(() => eliminaEventoAgenda(e.id), 'Evento eliminato.')} aria-label={`Elimina evento: ${e.titolo}`}>Elimina</button>
            </li>
          ))}
        </ul>
      )}

      {d && d.azioni.length > 0 && (['giorno', 'sera'] as const).map((f) => {
        const azioni = d.azioni.filter((a) => a.fascia === f);
        if (!azioni.length) return null;
        return (
          <div key={f} className="flex flex-col gap-1">
            <FasciaGiornata fascia={f} dettaglio={partitaId ? `${azioni.filter((a) => a.fatta).length} su ${azioni.length}` : undefined} />
            <ul className="m-0 p-0 list-none flex flex-col gap-1" aria-label={`Cose da fare: ${f === 'giorno' ? 'di giorno' : 'di sera'}`}>
              {azioni.map((a) => (
                <li key={a.id} className={`flex items-start gap-2 text-[13px] py-1 border-b border-border-light last:border-0 ${a.fatta ? 'opacity-60' : ''}`}>
                  {partitaId && <input type="checkbox" className="w-5 h-5 mt-0.5 shrink-0" checked={a.fatta} disabled={occupato} onChange={(e) => spunta(a, e.target.checked)} aria-label={`Fatto: ${a.azione}`} />}
                  <span className={`flex-1 min-w-0 ${a.fatta ? 'line-through' : ''}`}>
                    {a.azione}
                    {a.note && <span className="block text-[12px] text-text-secondary">{a.note}</span>}
                    {a.partitaId === null && <span className="text-[11px] text-text-muted"> · tutte le partite</span>}
                  </span>
                  <button type="button" className="visore-mappa__azione-testo touch" disabled={occupato} onClick={() => void esegui(() => aggiornaAzioneAgenda(a.id, { fascia: a.fascia === 'giorno' ? 'sera' : 'giorno' }), 'Spostata.')} aria-label={`Sposta ${a.azione} ${a.fascia === 'giorno' ? 'di sera' : 'di giorno'}`}>{a.fascia === 'giorno' ? 'Di sera' : 'Di giorno'}</button>
                  <button type="button" className="visore-mappa__azione-testo touch" disabled={occupato} onClick={() => void esegui(() => eliminaAzioneAgenda(a.id), 'Cosa da fare eliminata.')} aria-label={`Elimina: ${a.azione}`}>Elimina</button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
