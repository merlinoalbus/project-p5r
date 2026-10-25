// ============================================================
// ModuloRichiesta — modificare, aggiungere ed eliminare una Richiesta dei Mementos (richiesta dell'utente, 2026-10-11)
// ============================================================
//
// «come faccio a modificare i dettagli relativi alle richieste? non ho un pulsante modifica.» Scelte dell'utente: «Modifica,
// aggiungi, elimina» e «In entrambi i posti»: lo stesso modulo si apre dalla pagina delle Richieste e dalla colonna del dedalo.
// Ha tutti i campi della carta: nome, committente, date, dedalo e area del dedalo (099), piano, bersaglio con forma demoniaca,
// livello, debolezze e resistenze (una per riga) e confusione utile, ricompense (una per riga), Confidente e rango, note.
// «Elimina» prima dice chi cita la Richiesta (scelta «Si elimina e si avvisa»): partite, pin, condizioni, requisiti, azioni.
// Il modulo legge da sé l'elenco delle Richieste (poche decine): la Richiesta da correggere e dove la si può mettere.
// ============================================================

import { useState } from 'react';
import { aggiornaRichiesta, creaRichiesta, eliminaRichiesta, getCitazioniRichiesta, getConfidenti, getRichieste } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { Modal } from '../shared/Modal';
import { PageState } from '../shared/PageState';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { CampoCorrezione } from './CorrezioneGuida';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import type { CitazioniRichiestaDto, RichiestaDto, RichiesteDto } from '../../types';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

const R = LIMITI_GUIDA.richiesta;
/** Nel selettore del dedalo e dell'area, la voce «nessuno». */
const NESSUNO = '';

/** I campi del modulo, tutti come li si scrive (testo); diventano dati solo al salvataggio. */
interface Bozza {
  nome: string; committente: string; disponibileDal: string; scadenza: string; dedalo: string; areaDedalo: string; piano: string;
  bersaglio: string; formaDemoniaca: string; livello: string; debolezze: string; resistenze: string; confusione: boolean;
  ricompense: string; confidente: string; rango: string; note: string;
}

/** La bozza di partenza: i campi della Richiesta, o vuoti (con dedalo e area dati) per una nuova. */
function bozzaDa(r: RichiestaDto | null, iniziale: { dedalo?: string | null; areaDedalo?: string | null }): Bozza {
  return {
    nome: r?.nome ?? '', committente: r?.committente ?? '', disponibileDal: r?.disponibileDal ?? '', scadenza: r?.scadenza ?? '',
    dedalo: r ? r.areaChiave ?? NESSUNO : iniziale.dedalo ?? NESSUNO, areaDedalo: r ? r.areaDedalo ?? NESSUNO : iniziale.areaDedalo ?? NESSUNO, piano: r?.piano ?? '',
    bersaglio: r?.bersaglio.nome ?? '', formaDemoniaca: r?.bersaglio.formaDemoniaca ?? '', livello: r?.bersaglio.livello ? String(r.bersaglio.livello) : '',
    debolezze: (r?.bersaglio.debolezze ?? []).join('\n'), resistenze: (r?.bersaglio.resistenze ?? []).join('\n'), confusione: r?.bersaglio.vulnerabileConfusione ?? false,
    ricompense: (r?.ricompense ?? []).join('\n'), confidente: r?.confidente?.chiave ?? NESSUNO, rango: r?.confidente?.rango ? String(r.confidente.rango) : '', note: r?.note ?? '',
  };
}

/** Le righe non vuote di un testo (una voce per riga). */
const righe = (testo: string): string[] => testo.split('\n').map((x) => x.trim()).filter((x) => x.length > 0);

/** Un intero fra `min` e `max`, o null se vuoto; un valore fuori misura è un errore detto con il nome del campo. */
function intero(testo: string, min: number, max: number, campo: string): number | null {
  const t = testo.trim();
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${campo}: un numero intero da ${min} a ${max} (vuoto = nessuno).`);
  return n;
}

interface Props {
  /** La Richiesta da correggere, o null per aggiungerne una. */
  chiave: string | null;
  /** Per una nuova: il dedalo e l'area in cui nasce (dalla colonna del dedalo). */
  iniziale?: { dedalo?: string | null; areaDedalo?: string | null };
  onChiudi: () => void;
  /** Salvata (creata o corretta) o eliminata: chi apre il modulo rilegge i suoi dati. */
  onCambiata: () => void | Promise<void>;
}

/** Il modulo di una Richiesta in una finestra: carica l'elenco (Richiesta e collocazioni) e i Confidenti, poi i campi. */
// L12 (passo 8): nel rilascio (sola lettura) il modulo non esiste; la condizione è costante di build, `ModuloRichiestaReale` esce dal bundle
export const ModuloRichiesta: StrumentoDiModifica<typeof ModuloRichiestaReale> = IN_RILASCIO ? NienteInRilascio : ModuloRichiestaReale;
function ModuloRichiestaReale({ chiave, iniziale = {}, onChiudi, onCambiata }: Props) {
  const dati = useCarica(() => getRichieste(), []);
  const confidenti = useCarica(() => getConfidenti(), []);
  const richiesta = chiave ? dati.dati?.richieste.find((r) => r.chiave === chiave) ?? null : null;
  const titolo = chiave ? `Modifica: ${richiesta?.nome ?? 'Richiesta'}` : 'Aggiungi una Richiesta';
  return (
    <Modal titolo={titolo} aperta onChiudi={onChiudi} larga>
      <PageState isLoading={(dati.caricamento && !dati.dati) || (confidenti.caricamento && !confidenti.dati)} error={dati.errore ?? confidenti.errore} onRetry={() => { void dati.ricarica(); void confidenti.ricarica(); }}>
        {dati.dati && confidenti.dati && (chiave && !richiesta
          ? <p className="m-0 testo-13 text-text-muted" role="status">Questa Richiesta non c’è più.</p>
          : <Campi key={chiave ?? 'nuova'} richiesta={richiesta} iniziale={iniziale} collocazioni={dati.dati.collocazioni} confidenti={confidenti.dati.map((c) => ({ chiave: c.chiave, nome: c.nome, dettaglio: c.arcanaNome }))}
              onChiudi={onChiudi} onCambiata={onCambiata} />)}
      </PageState>
    </Modal>
  );
}

/** I campi del modulo, i comandi «Salva» e «Annulla» e, per una Richiesta che c'è, «Elimina» con l'avviso di chi la cita. */
function Campi({ richiesta, iniziale, collocazioni, confidenti, onChiudi, onCambiata }: {
  richiesta: RichiestaDto | null; iniziale: { dedalo?: string | null; areaDedalo?: string | null }; collocazioni: RichiesteDto['collocazioni'];
  confidenti: Array<{ chiave: string; nome: string; dettaglio: string }>; onChiudi: () => void; onCambiata: () => void | Promise<void>;
}) {
  // la bozza di partenza è anche il metro per capire se c'è qualcosa di non salvato (per «Aggiorna» e la chiusura della scheda del browser)
  const [partenza] = useState<Bozza>(() => bozzaDa(richiesta, iniziale));
  const [b, setB] = useState<Bozza>(partenza);
  useBozzaSporca('modulo-richiesta', richiesta ? `modifica della Richiesta «${richiesta.nome}»` : 'nuova Richiesta', JSON.stringify(b) !== JSON.stringify(partenza));
  const [occupato, setOccupato] = useState(false);
  const [citazioni, setCitazioni] = useState<CitazioniRichiestaDto | null>(null);
  /** Cambia alcuni campi della bozza. */
  const cambia = (patch: Partial<Bozza>) => setB((x) => ({ ...x, ...patch }));
  const aree = collocazioni.find((d) => d.chiave === b.dedalo)?.aree ?? [];

  /** I dati da mandare, controllati: nome e bersaglio obbligatori, numeri nei loro limiti. */
  const datiDaMandare = () => {
    if (!b.nome.trim()) throw new Error('Il nome della Richiesta è obbligatorio.');
    if (!b.bersaglio.trim()) throw new Error('Il nome del bersaglio è obbligatorio.');
    return {
      nome: b.nome.trim(), committente: b.committente.trim(), disponibileDal: b.disponibileDal.trim(), scadenza: b.scadenza.trim(),
      dedalo: b.dedalo || null, areaDedalo: b.dedalo && b.areaDedalo ? b.areaDedalo : null, piano: b.piano.trim(),
      bersaglio: { nome: b.bersaglio.trim(), formaDemoniaca: b.formaDemoniaca.trim(), livello: intero(b.livello, 1, 99, 'Livello del bersaglio'),
        debolezze: righe(b.debolezze), resistenze: righe(b.resistenze), vulnerabileConfusione: b.confusione },
      ricompense: righe(b.ricompense), confidente: b.confidente || null, confidenteRango: b.confidente ? intero(b.rango, 1, R.rango, 'Rango del Confidente') : null, note: b.note.trim(),
    };
  };
  /** Salva (crea o corregge): a buon fine notifica, avvisa chi ha aperto il modulo e lo chiude; un errore resta in notifica. */
  const salva = async () => {
    setOccupato(true);
    try {
      const d = datiDaMandare();
      const r = richiesta ? await aggiornaRichiesta(richiesta.chiave, d) : await creaRichiesta(d);
      notifica('success', richiesta ? `Richiesta «${r.nome}» salvata.` : `Richiesta «${r.nome}» aggiunta.`);
      await onCambiata();
      onChiudi();
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Richiesta non salvata.'); }
    finally { setOccupato(false); }
  };
  /** Primo passo dell'eliminazione: legge chi cita la Richiesta e lo mostra. */
  const chiediConferma = async () => {
    if (!richiesta) return;
    setOccupato(true);
    try { setCitazioni(await getCitazioniRichiesta(richiesta.chiave)); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Non riesco a leggere chi la cita.'); }
    finally { setOccupato(false); }
  };
  /** Elimina davvero, dopo la conferma. */
  const elimina = async () => {
    if (!richiesta) return;
    setOccupato(true);
    try { await eliminaRichiesta(richiesta.chiave); notifica('success', `Richiesta «${richiesta.nome}» eliminata.`); await onCambiata(); onChiudi(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Eliminazione non riuscita.'); }
    finally { setOccupato(false); }
  };

  return (
    <form className="flex flex-col gap-3" aria-label={richiesta ? `Correggi la Richiesta «${richiesta.nome}»` : 'Nuova Richiesta'} onSubmit={(e) => { e.preventDefault(); void salva(); }}>
      <fieldset className="m-0 flex flex-wrap items-end gap-2 border-0 p-0">
        <legend className="mb-1 testo-12 uppercase tracking-[0.08em] text-text-muted">La Richiesta</legend>
        <CampoCorrezione etichetta="Nome" valore={b.nome} massimo={R.nome} onCambia={(v) => cambia({ nome: v })} />
        <CampoCorrezione etichetta="Committente" valore={b.committente} massimo={R.breve} onCambia={(v) => cambia({ committente: v })} />
        <CampoCorrezione etichetta="Disponibile dal" valore={b.disponibileDal} massimo={R.breve} onCambia={(v) => cambia({ disponibileDal: v })} />
        <CampoCorrezione etichetta="Scadenza" valore={b.scadenza} massimo={R.breve} onCambia={(v) => cambia({ scadenza: v })} />
      </fieldset>
      <fieldset className="m-0 flex flex-wrap items-end gap-2 border-0 p-0">
        <legend className="mb-1 testo-12 uppercase tracking-[0.08em] text-text-muted">Dove</legend>
        <span className="min-w-[180px] flex-1">
          <Selettore etichetta="Dedalo" valore={b.dedalo} opzioni={[{ chiave: NESSUNO, nome: '— nessun dedalo —' }, ...collocazioni.map((d) => ({ chiave: d.chiave, nome: d.nome }))]}
            onCambia={(v) => cambia({ dedalo: v, areaDedalo: v === b.dedalo ? b.areaDedalo : NESSUNO })} />
        </span>
        {b.dedalo && <span className="min-w-[180px] flex-1">
          <Selettore etichetta="Area del dedalo" valore={b.areaDedalo} opzioni={[{ chiave: NESSUNO, nome: '— da collocare —', dettaglio: 'non conta' }, ...aree.map((a) => ({ chiave: a.chiave, nome: a.nome }))]}
            onCambia={(v) => cambia({ areaDedalo: v })} />
        </span>}
        <CampoCorrezione etichetta="Piano" valore={b.piano} massimo={R.breve} onCambia={(v) => cambia({ piano: v })} />
      </fieldset>
      <fieldset className="m-0 flex flex-wrap items-end gap-2 border-0 p-0">
        <legend className="mb-1 testo-12 uppercase tracking-[0.08em] text-text-muted">Il bersaglio</legend>
        <CampoCorrezione etichetta="Bersaglio" valore={b.bersaglio} massimo={R.nome} onCambia={(v) => cambia({ bersaglio: v })} />
        <CampoCorrezione etichetta="Forma demoniaca" valore={b.formaDemoniaca} massimo={R.voce} onCambia={(v) => cambia({ formaDemoniaca: v })} />
        <label className="flex min-w-[110px] flex-col gap-1 testo-12">
          Livello
          <input className="form-input" inputMode="numeric" maxLength={2} value={b.livello} onChange={(e) => cambia({ livello: e.target.value })} />
        </label>
        <CampoCorrezione etichetta="Debolezze (una per riga)" valore={b.debolezze} multilinea massimo={R.voce * R.voci} onCambia={(v) => cambia({ debolezze: v })} />
        <CampoCorrezione etichetta="Resistenze (una per riga)" valore={b.resistenze} multilinea massimo={R.voce * R.voci} onCambia={(v) => cambia({ resistenze: v })} />
        <label className="touch flex items-center gap-1.5 testo-12">
          <input type="checkbox" className="h-5 w-5" checked={b.confusione} onChange={(e) => cambia({ confusione: e.target.checked })} />Confusione utile (confondendolo dà yen)
        </label>
      </fieldset>
      <fieldset className="m-0 flex flex-wrap items-end gap-2 border-0 p-0">
        <legend className="mb-1 testo-12 uppercase tracking-[0.08em] text-text-muted">Ricompense e Confidente</legend>
        <CampoCorrezione etichetta="Ricompense (una per riga)" valore={b.ricompense} multilinea massimo={R.voce * R.voci} onCambia={(v) => cambia({ ricompense: v })} />
        <span className="min-w-[180px] flex-1">
          <Selettore etichetta="Confidente" valore={b.confidente} opzioni={[{ chiave: NESSUNO, nome: '— nessuno —' }, ...confidenti]} onCambia={(v) => cambia({ confidente: v, rango: v ? b.rango : '' })} />
        </span>
        {b.confidente && <label className="flex min-w-[110px] flex-col gap-1 testo-12">
          Rango
          <input className="form-input" inputMode="numeric" maxLength={2} value={b.rango} onChange={(e) => cambia({ rango: e.target.value })} />
        </label>}
        <CampoCorrezione etichetta="Note" valore={b.note} multilinea massimo={R.note} onCambia={(v) => cambia({ note: v })} />
      </fieldset>
      <div className="flex flex-wrap items-center gap-1.5">
        <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo={richiesta ? 'Salva' : 'Aggiungi'} disabled={occupato} />
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={onChiudi} />
        <span className="flex-1" />
        {richiesta && !citazioni && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" disabled={occupato} onClick={() => void chiediConferma()} />}
      </div>
      {richiesta && citazioni && (
        <section className="flex flex-col gap-1.5 rounded-md border border-primary/40 px-2.5 py-2 testo-12" aria-label="Conferma dell’eliminazione">
          <strong className="testo-13">Eliminare «{richiesta.nome}» per tutte le partite?</strong>
          <ul className="m-0 flex list-disc flex-col gap-0.5 pl-4">
            <li>{citazioni.partite === 0 ? 'Nessuna partita ne ha segnato lo stato.' : `Lo stato segnato in ${citazioni.partite === 1 ? '1 partita' : `${citazioni.partite} partite`} se ne va con lei.`}</li>
            {citazioni.pin.length > 0 && <li>Perdono il collegamento {citazioni.pin.length === 1 ? 'il pin' : `${citazioni.pin.length} pin`}: {citazioni.pin.join(', ')} (restano sulla mappa).</li>}
            {citazioni.azioni > 0 && <li>Perdono il collegamento {citazioni.azioni === 1 ? '1 azione' : `${citazioni.azioni} azioni`} della giornata (restano, col loro testo).</li>}
            {citazioni.condizioni.length > 0 && <li>Restano, da correggere, le condizioni di: {citazioni.condizioni.join('; ')}.</li>}
            {citazioni.requisiti.length > 0 && <li>Restano, da correggere, i requisiti dei Confidenti: {citazioni.requisiti.join('; ')}.</li>}
            {citazioni.pin.length === 0 && citazioni.azioni === 0 && citazioni.condizioni.length === 0 && citazioni.requisiti.length === 0 && <li>Nessun pin, condizione, requisito o azione la cita.</li>}
          </ul>
          <div className="flex flex-wrap gap-1.5">
            <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Confermo" disabled={occupato} onClick={() => void elimina()} />
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="No" disabled={occupato} onClick={() => setCitazioni(null)} />
          </div>
        </section>
      )}
    </form>
  );
}
