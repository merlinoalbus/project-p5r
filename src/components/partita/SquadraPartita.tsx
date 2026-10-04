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
// **differenza** con due pulsanti rapidi, e il livello con un tocco. Il valore assoluto resta
// possibile col terzo pulsante, «Imposta»: la prima volta che apri la scheda, o quando i conti non
// tornano più, il saldo si copia dal gioco (richiesta dell'utente, 2026-09-30).
//
// **Il non segnato si vede.** Un Ladro che non hai ancora toccato non mostra «livello 1» come se
// glielo avessi confermato tu: lo dice, ed è un'informazione diversa.
// ============================================================

import { useState } from 'react';
import { getSquadra, impostaMembroSquadra, impostaYen } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { PageState } from '../shared/PageState';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione, IconaSegno } from '../shared/IconaAzione';
import { usePartitaStore } from '../../stores/partitaStore';
import { ImmagineEntita } from '../shared/ImmagineEntita';
import type { MembroSquadraDto, SquadraPartitaDto } from '../../types';
import { formattaYen } from '../../utils/punti';

/** Lo stesso tetto di `bodyYen` sul server: oltre, la richiesta verrebbe rifiutata. */
const YEN_MASSIMI = 9_999_999;

/**
 * Il campo dell'esperienza di un Ladro, controllato: mentre si scrive mostra la bozza, a fine modifica (uscita dal campo) mostra
 * sempre un numero vero — quello normalizzato, o quello salvato se il salvataggio fallisce. Prima era un campo libero
 * (`defaultValue`): dopo un errore, o scrivendo «5.7» con 5 già salvato, restava il testo scritto invece del dato (rilievo A9
 * della verifica completa, 2026-10-03).
 */
function CampoEsperienza({ valore, nome, disabilitato, onSalva }: { valore: number; nome: string; disabilitato: boolean; onSalva: (v: number) => Promise<unknown> }) {
  const [bozza, setBozza] = useState<string | null>(null);
  /** All'uscita dal campo: normalizza la bozza a intero non negativo (testo non numerico vale 0),
   * la salva solo se diversa dal valore attuale e poi torna a mostrare il valore della scheda. */
  const conferma = async () => {
    if (bozza === null) return;
    const v = Math.max(0, Math.trunc(Number(bozza) || 0));
    if (v !== valore) await onSalva(v);
    // finita la modifica il campo torna a mostrare il valore della scheda: quello nuovo se salvato, quello di prima se no
    setBozza(null);
  };
  return (
    <input className="form-input tabular-nums" type="number" min={0} inputMode="numeric" value={bozza ?? String(valore)}
      aria-label={`Esperienza di ${nome}`} disabled={disabilitato}
      onChange={(e) => setBozza(e.target.value)} onBlur={() => void conferma()} />
  );
}

/** La scheda «Denaro e squadra»: il saldo del gruppo con un campo importo e i pulsanti Incassa,
 * Spendi e Imposta, poi una scheda per Ladro con l'interruttore «In squadra» (Joker sempre dentro),
 * l'esperienza e il livello con −1/+1. Ogni risposta del server sostituisce l'intera squadra; un
 * cambio del livello di Joker fa ricaricare anche l'elenco delle partite nello store. */
export function SquadraPartita({ partitaId }: { partitaId: number }) {
  const { dati, caricamento, errore, ricarica, imposta } = useCarica(() => getSquadra(partitaId), [partitaId]);
  const [movimento, setMovimento] = useState('');
  const [occupato, setOccupato] = useState<string | null>(null);

  /** Esegue l'azione tenendo occupato `chi` (un Ladro o il denaro), mette la squadra restituita al
   * posto di quella mostrata e trasforma un errore in notifica (senza rilanciarlo). */
  const conEsito = async (chi: string, azione: () => Promise<SquadraPartitaDto>) => {
    setOccupato(chi);
    try { imposta(await azione()); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupato(null); }
  };

  /** L'importo scritto nel campo, intero e dentro i limiti che il server accetta (`bodyYen`).
   *  Contano solo le cifre: «123.450», «123450» e «¥123.450» sono lo stesso numero, come nel gioco,
   *  che di decimali non ne ha. */
  const importo = () => Math.min(YEN_MASSIMI, Number(movimento.replace(/\D/g, '')) || 0);
  /** Nel campo c'è un numero: senza cifre i tre pulsanti restano spenti, e «Imposta» non azzera il saldo per una lettera. */
  const conCifre = /\d/.test(movimento);

  /** Un movimento di cassa: il numero scritto una volta, speso o incassato con due pulsanti. */
  const muovi = (segno: 1 | -1) => {
    const n = importo();
    if (n === 0) return;
    void conEsito('yen', async () => { const s = await impostaYen(partitaId, { delta: segno * n }); setMovimento(''); return s; });
  };

  /** Il saldo riscritto da capo, quando la cifra dell'app e quella del gioco non tornano più:
   *  si copia quella del gioco invece di calcolare a mano la differenza. Zero è un valore valido. */
  const impostaSaldo = () => {
    if (!conCifre) return;
    const n = importo();
    void conEsito('yen', async () => {
      const s = await impostaYen(partitaId, { yen: n });
      setMovimento('');
      notifica('success', `Denaro impostato a ${formattaYen(s.yen)}.`);
      return s;
    });
  };

  /** Il livello di Joker è `partita.livello_protagonista` (fonte unica dal 2026-10-03: la scheda e la fusione leggono quello).
   *  Ma l'elenco delle partite sta in uno store caricato all'avvio: cambiato il livello, il database era giusto e **lo schermo
   *  no**, con la barra in alto e le impostazioni ferme al numero di prima. Qui glielo si dice. */
  const riallineaPartite = (chiave: string) => { if (chiave === 'joker') void usePartitaStore.getState().carica(); };

  /**
   * La scheda di un Ladro, in due fasce.
   *
   * Prima era una riga sola con sei cose in fila e `flex-wrap`: chi la guarda, e con quanto spazio,
   * non era una domanda che qualcuno si era posto. Sul tablet si vedeva mezza riga vuota fra il
   * nome e i comandi, «LIVELLO» scritto due volte, il livello in un riquadro grigio senza etichetta;
   * sotto i 640 px il nome riceveva larghezza zero e andava a capo **una lettera per riga**, con la
   * scheda alta quattrocento pixel (segnalazione dell'utente, 2026-09-13).
   *
   * Ora chi è (avatar, nome, se è in squadra) sta sopra e i due numeri che si toccano stanno sotto,
   * ciascuno col suo titolo scritto una volta sola: l'impaginazione non cambia con la larghezza,
   * cambia solo se i due numeri stanno affiancati o incolonnati. Nessun bersaglio sotto i 44 px.
   */
  const riga = (m: MembroSquadraDto) => {
    const fermo = occupato === m.chiave;
    return (
      <li key={m.chiave} className="card flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {/* Il protagonista **non e' un Confidente**, e il suo ritratto non sta fra i Confidenti: si
              chiama `personaggi/joker`. Chiedendolo come Confidente non lo trovava e restava il vuoto. */}
          <ImmagineEntita ambito={m.chiave === 'joker' ? 'personaggio' : 'confidente'} chiave={m.chiave} etichetta={m.nome} dimensione={44} />
          <span className="min-w-0 flex-1">
            <span className="block break-words font-semibold text-[15px] leading-tight" title={m.nome}>{m.nome}</span>
            <span className="block text-[12px] text-text-muted">
              {m.segnato ? `Livello ${m.livello} · ${m.esperienza.toLocaleString('it-IT')} punti esperienza` : 'Non ancora segnato'}
            </span>
          </span>
          {/* **L'interruttore che mancava.** «Ladro in squadra» e' una condizione che i negozi usano, e
              fino a ieri diventava vera **di rimbalzo** — bastava toccare un livello — e non si poteva
              piu' rendere falsa, perche' l'interfaccia non offriva modo di togliere quella riga.
              L'avviso «Da segnare» mandava qui, e qui il gesto non c'era.
              Per Joker l'interruttore non esiste: il protagonista nel gruppo c'e' sempre, e offrire un
              comando per toglierlo vorrebbe dire offrire uno stato che il gioco non ha.
              Era una casella di 20 px: sul tablet non si centra col dito, ed è il gesto più frequente
              della scheda. Ora è l'interruttore a tassello, alto 44 px come tutti gli altri. */}
          {m.chiave === 'joker'
            ? <span className="chip shrink-0 text-[11px]" title="Il protagonista è sempre nel gruppo">Sempre in squadra</span>
            : <PulsanteVisivo compatto className="shrink-0" attivo={m.inSquadra}
                icona={<IconaAzione chiave={m.inSquadra ? 'accettata' : 'deseleziona'} dimensione={20} />}
                titolo="In squadra" disabled={fermo}
                aria-pressed={m.inSquadra} aria-label={`${m.nome} in squadra`}
                onClick={() => void conEsito(m.chiave, () => impostaMembroSquadra(partitaId, m.chiave, { inSquadra: !m.inSquadra }))} />}
        </div>
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          <label className="editor-mappa__campo min-w-[150px] flex-1">
            <span className="text-[10px] uppercase tracking-[0.06em] text-text-muted">Esperienza</span>
            <CampoEsperienza valore={m.esperienza} nome={m.nome} disabilitato={fermo}
              onSalva={(v) => conEsito(m.chiave, () => impostaMembroSquadra(partitaId, m.chiave, { esperienza: v }))} />
          </label>
          <span className="editor-mappa__campo shrink-0">
            <span className="text-[10px] uppercase tracking-[0.06em] text-text-muted">Livello</span>
            <span className="flex items-center gap-1.5">
              <PulsanteVisivo compatto icona={<IconaAzione chiave="meno" dimensione={20} />} titolo="−1"
                disabled={fermo || m.livello <= 1} aria-label={`Togli un livello a ${m.nome}`}
                onClick={() => void conEsito(m.chiave, () => impostaMembroSquadra(partitaId, m.chiave, { deltaLivello: -1 })).then(() => riallineaPartite(m.chiave))} />
              <span className={`h-11 min-w-[52px] rounded-md flex items-center justify-center px-2 font-display text-[20px] tabular-nums bg-bg-tertiary ${m.segnato ? 'text-primary' : 'text-text-muted'}`}
                title={m.segnato ? `Livello ${m.livello}` : 'Livello non ancora segnato'}>{m.livello}</span>
              <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="+1"
                disabled={fermo || m.livello >= 99} aria-label={`Sali di livello: ${m.nome} al livello ${m.livello + 1}`}
                onClick={() => void conEsito(m.chiave, () => impostaMembroSquadra(partitaId, m.chiave, { deltaLivello: 1 })).then(() => riallineaPartite(m.chiave))} />
            </span>
          </span>
        </div>
      </li>
    );
  };

  return (
    <PageState isLoading={caricamento && !dati} error={errore} onRetry={() => void ricarica()}>
      {dati && (
        <div className="flex flex-col gap-4">
          {/* Quanto c'è sopra, come si cambia sotto. Prima erano sulla stessa riga con uno spaziatore
              elastico in mezzo, e su ogni schermo più stretto di un monitor restava una voragine fra
              la cifra e i comandi. */}
          <section className="card flex flex-col gap-3" aria-label="Denaro del gruppo">
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-text-muted"><IconaSegno chiave="medaglie" dimensione={14} />Denaro del gruppo</span>
              <span className="font-display text-[28px] leading-none tabular-nums">{formattaYen(dati.yen)}</span>
            </span>
            {/* Il numero si scrive una volta e poi si dice che cosa è: entrato, uscito, oppure il
                saldo intero da copiare dal gioco («Imposta»), quando i conti non tornano più. */}
            <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
              <label className="editor-mappa__campo min-w-[150px] flex-1">
                <span className="text-[10px] uppercase tracking-[0.06em] text-text-muted">Importo</span>
                {/* Testo con tastiera numerica, non `type="number"`: quello legge «123.450» come
                    decimale e ne faceva 12.345 ¥, proprio col punto delle migliaia che si copia dal gioco. */}
                <input className="form-input tabular-nums" type="text" inputMode="numeric" autoComplete="off" value={movimento} placeholder="0"
                  aria-label="Importo in yen" disabled={occupato === 'yen'}
                  onChange={(e) => setMovimento(e.target.value)} />
              </label>
              <span className="flex shrink-0 flex-wrap gap-2">
                <PulsanteVisivo tono="primario" compatto className="shrink-0" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Incassa"
                  disabled={occupato === 'yen' || !conCifre} onClick={() => muovi(1)} aria-label="Aggiungi questi yen al gruppo" />
                <PulsanteVisivo tono="secondario" compatto className="shrink-0" icona={<IconaAzione chiave="meno" dimensione={20} />} titolo="Spendi"
                  disabled={occupato === 'yen' || !conCifre} onClick={() => muovi(-1)} aria-label="Togli questi yen al gruppo" />
                <PulsanteVisivo tono="secondario" compatto className="shrink-0" icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Imposta"
                  disabled={occupato === 'yen' || !conCifre} onClick={impostaSaldo} aria-label="Imposta il denaro del gruppo a questo importo" />
              </span>
            </div>
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
