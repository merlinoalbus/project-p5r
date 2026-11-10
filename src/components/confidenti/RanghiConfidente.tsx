// ============================================================
// RanghiConfidente — come si sale di rango (modo e soglia in punti), con «Modifica» (R9-07/1, R11-15/2)
// ============================================================
//
// Un rango alla volta: la riga mostra il passaggio («Dal rango 2 al rango 3»), il modo e la soglia; la matita apre la `FinestraModifica` comune
// con il modo e, solo per «a punti», la soglia. Le regole sono quelle del server (G-020: a punti = soglia maggiore di zero, gli altri modi soglia zero),
// che le ricontrolla. Il dato è di gioco e vale per tutte le partite; un rango cambiato porta il chip «Modificato».
// Rotte: GET/PUT `/api/compendio/confidenti/:chiave/ranghi[/:rango]`.
// ============================================================

import { useState } from 'react';
import { MODI_RANGO, type ModoRango, type RangoConfidenteDto } from '../../../shared/confidentiScritture';
import { getRanghiConfidente, salvaRangoConfidente } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import { formattaPunti } from '../../utils/punti';
import { FinestraModifica } from '../shared/FinestraModifica';
import { CampoTesto } from '../shared/Campo';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { TitoloSezione } from '../shared/TitoloSezione';
import { RANGO_MASSIMO_CONFIDENTE } from '../../../shared/puntiConfidenti';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

const NOME_MODO: Record<ModoRango, string> = {
  punti: 'A punti legame',
  evento: 'Con un evento',
  automatico: 'Automatico, con la trama',
  richieste: 'Con le Richieste dei Memento',
  velluto: 'Con la fusione alla Stanza di Velluto',
};

const passaggio = (rango: number): string => (rango >= RANGO_MASSIMO_CONFIDENTE ? `Rango ${RANGO_MASSIMO_CONFIDENTE}` : `Dal rango ${rango} al rango ${rango + 1}`);
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
  const [errore, setErrore] = useState<string | null>(null);
  const punti = modo === 'punti' ? Number(soglia) : 0;
  const valido = modo !== 'punti' || (soglia.trim() !== '' && Number.isInteger(punti) && punti > 0 && punti <= 9999);
  const modificato = modo !== rango.modo || (valido && punti !== rango.puntiNecessari);
  // una soglia scritta a metà non è salvabile, ma è comunque una modifica che chiudendo si perde
  const sporca = modificato || (!valido && soglia !== String(rango.puntiNecessari));
  useBozzaSporca(`rango:${chiave}:${rango.rango}`, `il rango di ${nome}`, sporca);
  const esegui = async (azione: () => Promise<unknown>, esito: string) => {
    setOccupato(true); setErrore(null);
    try { await azione(); notifica('success', esito); await onSalvato(); onChiudi(); }
    catch (err) { setErrore(err instanceof Error ? err.message : 'Operazione non riuscita.'); }
    finally { setOccupato(false); }
  };
  const salva = () => esegui(() => salvaRangoConfidente(chiave, rango.rango, { modo, puntiNecessari: punti }), 'Rango salvato: vale per tutte le partite.');
  return (
    <FinestraModifica stretta titolo={`${passaggio(rango.rango)}: ${nome}`} onChiudi={onChiudi} onSalva={salva} salvabile={modificato && valido} occupato={occupato} sporca={sporca} errore={errore}>
      <div className="flex flex-col gap-3 min-w-0">
        <Selettore etichettaSopra etichetta="Come si sale" valore={modo} opzioni={MODI_RANGO.map((m) => ({ chiave: m, nome: NOME_MODO[m] }))} onCambia={(v) => { setModo(v as ModoRango); setErrore(null); }} disabilitato={occupato} ricerca="mai" />
        {modo === 'punti' && <CampoTesto tipo="numero" etichetta="Punti necessari per salire" valore={soglia} disabilitato={occupato} errore={valido ? undefined : 'Scrivi un numero intero di punti da 1 a 9999.'} onCambia={(v) => { setSoglia(v); setErrore(null); }} />}
      </div>
    </FinestraModifica>
  );
}
