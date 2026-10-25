// ============================================================
// RanghiConfidente — come si sale di rango (modo e soglia in punti), con «Modifica» e «Ripristina» (R9-07/1, R11-15/2)
// ============================================================
//
// Un rango alla volta: la riga mostra il passaggio («Dal rango 2 al rango 3»), il modo e la soglia; la matita apre una finestra con il modo
// e, solo per «a punti», la soglia. Le regole sono quelle del server (G-020: a punti = soglia maggiore di zero, gli altri modi soglia zero), che le
// ricontrolla. Il dato è di gioco e vale per tutte le partite; un rango cambiato porta il chip «Modificato» e «Ripristina» lo rimette alla guida.
// Rotte: GET/PUT `/api/compendio/confidenti/:chiave/ranghi[/:rango]`, POST `…/ranghi/:rango/ripristina`.
// ============================================================

import { useState } from 'react';
import { MODI_RANGO, type ModoRango, type RangoConfidenteDto } from '../../../shared/confidentiScritture';
import { getRanghiConfidente, ripristinaRangoConfidente, salvaRangoConfidente } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import { formattaPunti } from '../../utils/punti';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { TitoloSezione } from '../shared/TitoloSezione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

const NOME_MODO: Record<ModoRango, string> = {
  punti: 'A punti legame',
  evento: 'Con un evento',
  automatico: 'Automatico, con la trama',
  richieste: 'Con le Richieste dei Memento',
  velluto: 'Con la fusione alla Stanza di Velluto',
};

const passaggio = (rango: number): string => (rango >= 10 ? 'Rango 10' : `Dal rango ${rango} al rango ${rango + 1}`);
const descrizione = (r: RangoConfidenteDto): string => (r.modo === 'punti' ? `${NOME_MODO.punti}: ${formattaPunti(r.puntiNecessari)} punti` : NOME_MODO[r.modo]);

/** La scheda: i ranghi con il loro modo; la matita di ogni riga apre l'editor di quel rango. */
export function RanghiConfidente({ chiave, nome, onSalvato }: { chiave: string; nome: string; onSalvato: () => void | Promise<void> }) {
  const dati = useCarica(() => getRanghiConfidente(chiave), [chiave]);
  const [aperto, setAperto] = useState<number | null>(null);
  const ranghi = dati.dati ?? [];
  const inModifica = ranghi.find((r) => r.rango === aperto) ?? null;
  const dopo = async () => { await Promise.all([dati.ricarica(), onSalvato()]); };
  return (
    <section className="card flex flex-col gap-2" aria-label="Come si sale di rango">
      <TitoloSezione>Come si sale di rango</TitoloSezione>
      {dati.errore ? <p className="m-0 testo-13" role="alert">{dati.errore} <PulsanteVisivo compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={() => void dati.ricarica()} /></p>
        : dati.caricamento && !dati.dati ? <p className="m-0 testo-13" role="status">Caricamento dei ranghi…</p>
          : ranghi.length === 0 ? <p className="m-0 testo-13 text-text-muted">Nessun rango documentato.</p>
            : <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0">{ranghi.map((r) => (
              <li key={r.rango} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1 testo-13">
                <span className="min-w-0 flex-1"><strong className="text-text">{passaggio(r.rango)}</strong>: <span className="text-text-secondary">{descrizione(r)}</span></span>
                {!IN_RILASCIO && r.modificato && <span className="chip" title="Cambiato rispetto alla guida">Modificato</span>}
                {!IN_RILASCIO && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" aria-label={`Modifica: ${passaggio(r.rango).toLowerCase()} di ${nome}`} onClick={() => setAperto(r.rango)} />}
              </li>))}</ul>}
      {!IN_RILASCIO && inModifica && <EditorRango key={`${chiave}:${inModifica.rango}`} chiave={chiave} nome={nome} rango={inModifica} onChiudi={() => setAperto(null)} onSalvato={dopo} />}
    </section>
  );
}

function EditorRango({ chiave, nome, rango, onChiudi, onSalvato }: { chiave: string; nome: string; rango: RangoConfidenteDto; onChiudi: () => void; onSalvato: () => void | Promise<void> }) {
  const [modo, setModo] = useState<ModoRango>(rango.modo);
  const [soglia, setSoglia] = useState(String(rango.puntiNecessari));
  const [occupato, setOccupato] = useState(false);
  const punti = modo === 'punti' ? Number(soglia) : 0;
  const valido = modo !== 'punti' || (soglia.trim() !== '' && Number.isInteger(punti) && punti > 0 && punti <= 9999);
  const sporca = modo !== rango.modo || (valido && punti !== rango.puntiNecessari);
  useBozzaSporca(`rango:${chiave}:${rango.rango}`, `il rango di ${nome}`, sporca);
  const esegui = async (azione: () => Promise<unknown>, esito: string) => {
    setOccupato(true);
    try { await azione(); notifica('success', esito); await onSalvato(); onChiudi(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Operazione non riuscita.'); }
    finally { setOccupato(false); }
  };
  return (
    <Modal titolo={`${passaggio(rango.rango)}: ${nome}`} aperta onChiudi={() => { if (!occupato) onChiudi(); }} azioni={(
      <div className="flex w-full flex-wrap justify-end gap-2">
        {rango.modificato && <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Ripristina" disabled={occupato} onClick={() => void esegui(() => ripristinaRangoConfidente(chiave, rango.rango), 'Rango ripristinato come nella guida.')} />}
        <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={onChiudi}>Annulla</button>
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo="Salva" disabled={occupato || !sporca || !valido} onClick={() => void esegui(() => salvaRangoConfidente(chiave, rango.rango, { modo, puntiNecessari: punti }), 'Rango salvato: vale per tutte le partite.')} />
      </div>
    )}>
      <div className="flex flex-col gap-3 testo-13">
        <p className="m-0 text-text-muted">Le modifiche valgono per tutte le partite. «Ripristina» rimette il rango come nella guida.</p>
        <Selettore etichetta="Come si sale" valore={modo} opzioni={MODI_RANGO.map((m) => ({ chiave: m, nome: NOME_MODO[m] }))} onCambia={(v) => setModo(v as ModoRango)} disabilitato={occupato} ricerca="mai" />
        {modo === 'punti' ? (
          <label className="flex flex-col gap-1">Punti necessari per salire
            <input className="form-input" type="number" inputMode="numeric" min={1} max={9999} step={1} value={soglia} disabled={occupato} onChange={(e) => setSoglia(e.target.value)} aria-invalid={!valido} />
            {!valido && <span className="text-error-testo">Scrivi un numero intero di punti maggiore di zero.</span>}
          </label>
        ) : <p className="m-0 text-text-secondary">Questo rango non sale a punti: non ha una soglia.</p>}
      </div>
    </Modal>
  );
}
