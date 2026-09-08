// ============================================================
// SquadraPartita — i yen del gruppo e i livelli dei Ladri Fantasma
// ============================================================
//
// Chiesto dall'utente: tenere traccia, durante la partita, del denaro e di livello ed esperienza
// del protagonista e della squadra. Della partita si sapeva una cosa sola, `livelloProtagonista`, e
// per un altro motivo — serve alla fusione per sapere quali Persona si possono evocare.
//
// **I gesti veri, non i moduli.** Col tablet in mano durante il gioco quello che si fa è «ho preso
// 15.000 ¥», «ho speso 12.000», «Ryuji è salito di un livello»: quindi i yen si cambiano per
// **differenza** con due campi rapidi, e il livello con un tocco. Il valore assoluto resta
// possibile, perché la prima volta che apri la scheda i numeri li copi dal gioco.
//
// **Il non segnato si vede.** Un Ladro che non hai ancora toccato non mostra «livello 1» come se
// glielo avessi confermato tu: lo dice, ed è un'informazione diversa.
// ============================================================

import { useState } from 'react';
import { getSquadra, impostaMembroSquadra, impostaYen } from '../../services/api/partite';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { PageState } from '../shared/PageState';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione, IconaSegno } from '../shared/IconaAzione';
import { usePartitaStore } from '../../stores/partitaStore';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import type { MembroSquadraDto, SquadraPartitaDto } from '../../types';

const yen = (n: number) => `${n.toLocaleString('it-IT')} ¥`;

export function SquadraPartita({ partitaId }: { partitaId: number }) {
  const { dati, caricamento, errore, ricarica, imposta } = useCarica(() => getSquadra(partitaId), [partitaId]);
  const [movimento, setMovimento] = useState('');
  const [occupato, setOccupato] = useState<string | null>(null);

  const conEsito = async (chi: string, azione: () => Promise<SquadraPartitaDto>) => {
    setOccupato(chi);
    try { imposta(await azione()); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupato(null); }
  };

  /** Un movimento di cassa: il numero scritto una volta, speso o incassato con due pulsanti. */
  const muovi = (segno: 1 | -1) => {
    const n = Math.abs(Math.trunc(Number(movimento.replace(/[^\d-]/g, '')) || 0));
    if (n === 0) return;
    void conEsito('yen', async () => { const s = await impostaYen(partitaId, { delta: segno * n }); setMovimento(''); return s; });
  };

  /** Il livello di Joker vive in due case — qui e `partita.livello_protagonista`, che la fusione
   *  legge — e il server le tiene allineate. Ma l'elenco delle partite sta in uno store caricato
   *  all'avvio: cambiato il livello, il database era giusto e **lo schermo no**, con la barra in
   *  alto e le impostazioni ferme al numero di prima. Qui glielo si dice. */
  const riallineaPartite = (chiave: string) => { if (chiave === 'joker') void usePartitaStore.getState().carica(); };

  const riga = (m: MembroSquadraDto) => (
    <li key={m.chiave} className="card flex flex-wrap items-center gap-2">
      {/* Il protagonista **non e' un Confidente**, e il suo ritratto non sta fra i Confidenti: si
          chiama `personaggi/joker`. Chiedendolo come Confidente non lo trovava e restava il vuoto. */}
      <ImmagineEntita ambito={m.chiave === 'joker' ? 'personaggio' : 'confidente'} chiave={m.chiave} etichetta={m.nome} dimensione={44} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-[15px] leading-tight">{m.nome}</span>
        <span className="block text-[12px] text-text-muted">
          {m.segnato ? `${m.esperienza.toLocaleString('it-IT')} punti esperienza` : 'Non ancora segnato'}
        </span>
      </span>
      {/* **L'interruttore che mancava.** «Ladro in squadra» e' una condizione che i negozi usano, e
          fino a ieri diventava vera **di rimbalzo** — bastava toccare un livello — e non si poteva
          piu' rendere falsa, perche' l'interfaccia non offriva modo di togliere quella riga.
          L'avviso «Da segnare» mandava qui, e qui il gesto non c'era. */}
      {/* Per Joker l'interruttore non esiste: il protagonista nel gruppo c'e' sempre, e offrire un
          comando per toglierlo vorrebbe dire offrire uno stato che il gioco non ha. */}
      {m.chiave === 'joker'
        ? <span className="text-[12px] text-text-muted" title="Il protagonista e' sempre nel gruppo">Sempre nel gruppo</span>
        : <label className="flex items-center gap-1.5 text-[12px] touch" title={`Segna se ${m.nome} e' nel gruppo`}>
            <input type="checkbox" className="w-5 h-5" checked={m.inSquadra} disabled={occupato === m.chiave}
              aria-label={`${m.nome} nel gruppo`}
              onChange={(e) => void conEsito(m.chiave, () => impostaMembroSquadra(partitaId, m.chiave, { inSquadra: e.target.checked }))} />
            Nel gruppo
          </label>}
      <label className="editor-mappa__campo w-[104px]">
        <span className="text-[10px] uppercase tracking-[0.06em] text-text-muted">Esperienza</span>
        <input className="form-input" type="number" min={0} inputMode="numeric" defaultValue={m.esperienza}
          aria-label={`Esperienza di ${m.nome}`} disabled={occupato === m.chiave}
          onBlur={(e) => { const v = Math.max(0, Math.trunc(Number(e.target.value) || 0)); if (v !== m.esperienza) void conEsito(m.chiave, () => impostaMembroSquadra(partitaId, m.chiave, { esperienza: v })); }} />
      </label>
      <span className={`w-11 h-11 rounded-md flex items-center justify-center font-bold ${m.segnato ? 'bg-bg-tertiary text-primary' : 'bg-bg-tertiary text-text-muted'}`}
        title={m.segnato ? `Livello ${m.livello}` : 'Livello non ancora segnato'}>{m.livello}</span>
      <PulsanteVisivo compatto icona={<IconaAzione chiave="meno" dimensione={20} />} titolo="Livello"
        disabled={occupato === m.chiave || m.livello <= 1} aria-label={`Togli un livello a ${m.nome}`}
        onClick={() => void conEsito(m.chiave, () => impostaMembroSquadra(partitaId, m.chiave, { deltaLivello: -1 })).then(() => riallineaPartite(m.chiave))} />
      <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Livello"
        disabled={occupato === m.chiave || m.livello >= 99} aria-label={`Sali di livello: ${m.nome} al livello ${m.livello + 1}`}
        onClick={() => void conEsito(m.chiave, () => impostaMembroSquadra(partitaId, m.chiave, { deltaLivello: 1 })).then(() => riallineaPartite(m.chiave))} />
    </li>
  );

  return (
    <PageState isLoading={caricamento && !dati} error={errore} onRetry={() => void ricarica()}>
      {dati && (
        <div className="flex flex-col gap-4">
          <section className="card flex flex-wrap items-end gap-3" aria-label="Denaro del gruppo">
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-text-muted"><IconaSegno chiave="medaglie" dimensione={14} />Denaro del gruppo</span>
              <span className="font-display text-[28px] leading-none tabular-nums">{yen(dati.yen)}</span>
            </span>
            <span className="flex-1" />
            {/* Il numero si scrive una volta e poi si dice se è entrato o uscito: durante il gioco
                si sa quanto si è speso, non quanto resta. */}
            <label className="editor-mappa__campo w-[132px]">
              <span className="text-[10px] uppercase tracking-[0.06em] text-text-muted">Movimento</span>
              <input className="form-input" type="number" min={0} inputMode="numeric" value={movimento} placeholder="0"
                aria-label="Quanti yen sono entrati o usciti" disabled={occupato === 'yen'}
                onChange={(e) => setMovimento(e.target.value)} />
            </label>
            <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Incassa"
              disabled={occupato === 'yen' || !movimento} onClick={() => muovi(1)} aria-label="Aggiungi questi yen al gruppo" />
            <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="meno" dimensione={20} />} titolo="Spendi"
              disabled={occupato === 'yen' || !movimento} onClick={() => muovi(-1)} aria-label="Togli questi yen al gruppo" />
          </section>

          <ul className="m-0 p-0 list-none grid gap-2 grid-cols-1 xl:grid-cols-2" aria-label="Ladri Fantasma">
            {dati.membri.map(riga)}
          </ul>

          <p className="m-0 text-[12px] text-text-muted">
            Il livello del Protagonista è lo stesso che il calcolatore di fusione usa per sapere quali Persona puoi evocare:
            cambiarlo qui lo aggiorna anche lì.
          </p>
        </div>
      )}
    </PageState>
  );
}
