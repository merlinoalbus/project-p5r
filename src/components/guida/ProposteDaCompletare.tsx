// ============================================================
// ProposteDaCompletare — le proposte «da completare» sulle voci del Diario: segno sulla voce, schede con Applica / Modifica / Scarta (L13, ondata 4a)
// ============================================================
//
// Una proposta dice come convertire una voce scritta a parole in dati (modello: `shared/proposteConversione.ts`). Nel Diario della
// preparazione la voce che ne ha mostra un segno discreto «da completare · N»; toccandolo si apre la finestra con le sue proposte. Ogni scheda
// dice che cosa cambia (tipo, collegamento, effetti aggiunti e tolti, con le frasi di sempre), quanto è certa e perché, e ha tre gesti:
//   - «Applica»: scrive la voce dal server con la stessa funzione dell'editor; se la proposta chiede di completare un dato (l'elemento fra
//     quelli indicati, le copie, le note), la scheda lo chiede prima e «Applica» resta spento finché non c'è; su una voce già spuntata dice
//     anche che cosa è successo nelle partite (L13, decisione 19: `notificaApplicazioni`, come la finestra della voce);
//   - «Modifica»: apre la finestra della voce con la proposta già applicata, da rivedere; salvando la proposta risulta applicata;
//   - «Scarta»: chiede conferma e chiude la proposta, la voce non cambia.
// Lo stesso componente serve all'elenco «Da completare» (`DaCompletarePage`). Nel rilascio il meccanismo non esiste: la costante di build
// toglie dal bundle schede, chiamate e segno (`useProposteDelGiorno` vi restituisce sempre nessuna proposta).
// ============================================================

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { FilaScelta } from './FilaScelta';
import { CampiEffettoVoce } from './CampiEffettoVoce';
import { IconaCategoria } from './IconaCategoria';
import { CATEGORIA_EFFETTO } from '../../utils/effettiDellaVoce';
import { useElenchiProposte } from '../../hooks/useProposteDaCompletare';
import { applicaPropostaConversione, scartaPropostaConversione } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { notificaApplicazioni } from '../../utils/applicazioniEffetti';
import { conferma } from '../../stores/confermaStore';
import { segnalaMutazioneEffetti } from '../../services/gestiPartita';
import { dataGiocoTesto } from '../../utils/dateGioco';
import { effettoCompleto } from '../../utils/azioneStrutturata';
import { NOME_FAMIGLIA_EFFETTO, fraseEffetto, type NomiEffetti } from '../../utils/effettoAutomatico';
import type { ElenchiVoce } from '../../utils/opzioniEffetti';
import { TIPI_AZIONE, TIPI_RIFERIMENTO_AZIONE } from '../../../shared/effettiAzione';
import { QUANTITA_MASSIMA_EFFETTO, type EffettoVoce } from '../../../shared/effettiVoce';
import { conElemento, elementoDi, type CampoDaCompletare, type PropostaConversioneDto } from '../../../shared/proposteConversione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

const NOME_CERTEZZA: Record<PropostaConversioneDto['certezza'], string> = { certa: 'Certa', probabile: 'Probabile', 'da-verificare': 'Da verificare in gioco' };
const NOME_STATO: Record<PropostaConversioneDto['stato'], string> = { aperta: 'Da completare', applicata: 'Applicata', scartata: 'Scartata' };
const NOTE = [{ chiave: '1', nome: '♪' }, { chiave: '2', nome: '♪♪' }, { chiave: '3', nome: '♪♪♪' }];

/** Il segno discreto sulla voce: «da completare · N», un pulsante che apre le sue proposte. */
export function SegnoDaCompletare({ n, voce, onApri }: { n: number; voce: string; onApri: () => void }) {
  if (IN_RILASCIO || n === 0) return null;
  return (
    <button type="button" className="chip chip--icona touch testo-12 text-primary-testo" onClick={onApri} aria-label={`${n === 1 ? 'Una proposta' : `${n} proposte`} da completare per: ${voce.slice(0, 60)}`}>
      <IconaAzione chiave="note" dimensione={12} />da completare · {n}
    </button>
  );
}

/** Il nome dell'elemento che un effetto cita, dagli elenchi (per le scelte della proposta). */
function nomeElemento(e: EffettoVoce, chiave: string, n: NomiEffetti): string {
  switch (e.tipo) {
    case 'articolo': return n.articoli.get(chiave)?.nome ?? chiave;
    case 'oggetto': return n.oggetti?.get(chiave) ?? chiave;
    case 'lettura': return (e.categoria === 'libro' ? n.libri : e.categoria === 'film' ? n.film : n.videogiochi).get(chiave) ?? chiave;
    case 'turno': return n.attivita.get(chiave) ?? chiave;
    case 'sblocco': return (e.bersaglio === 'richiesta' ? n.richieste : n.attivita).get(chiave) ?? chiave;
    case 'richiesta': return n.richieste.get(chiave) ?? chiave;
    case 'trofeo': return n.trofei?.get(chiave) ?? chiave;
    default: return chiave;
  }
}

const nomeRiferimento = (r: { tipo: string; chiave: string }, el: ElenchiVoce): string => {
  const a = el.azione;
  const lista = r.tipo === 'confidente' ? a.confidenti : r.tipo === 'dungeon' ? a.dungeon : r.tipo === 'richiesta' ? a.richieste : r.tipo === 'libro' ? a.libri : r.tipo === 'film' ? a.film : r.tipo === 'attivita' ? a.attivita : r.tipo === 'negozio' ? a.negozi : a.doti;
  const genere = TIPI_RIFERIMENTO_AZIONE.find((g) => g.chiave === r.tipo)?.nome.toLowerCase() ?? r.tipo;
  return `${lista.find((x) => x.chiave === r.chiave)?.nome ?? r.chiave} (${genere})`;
};
const nomeTipo = (t: string): string => TIPI_AZIONE.find((x) => x.chiave === t)?.nome ?? t;

interface PropsScheda {
  proposta: PropostaConversioneDto;
  elenchi: ElenchiVoce;
  nomi: NomiEffetti;
  partitaId: number | null;
  /** Mostra il giorno e il testo della voce (nell'elenco «Da completare»; nella finestra della voce no, la voce è già il titolo). */
  conVoce?: boolean;
  /** «Modifica»: apre la finestra della voce con la proposta già applicata. */
  onModifica?: (p: PropostaConversioneDto) => void;
  /** Dopo «Applica» o «Scarta» riusciti: chi mostra la scheda rilegge. */
  onDecisa: () => void | Promise<void>;
}

/** Una proposta: che cosa cambia, certezza e motivo, i dati da completare e i gesti. Vedi l'intestazione del file. */
export function SchedaProposta({ proposta: p, elenchi, nomi, partitaId, conVoce, onModifica, onDecisa }: PropsScheda) {
  const [bozze, setBozze] = useState<EffettoVoce[]>(() => p.effetti.map((e) => e.effetto));
  // i dati che chi applica deve ancora dare, per effetto: si spengono man mano che li sceglie
  const [mancanti, setMancanti] = useState<Array<CampoDaCompletare[]>>(() => p.effetti.map((e) => [...e.completa]));
  const [occupato, setOccupato] = useState(false);
  const aperta = p.stato === 'aperta';
  const superata = p.togli.some((t) => t.effetto === null);
  const completa = mancanti.every((m) => m.length === 0) && bozze.every(effettoCompleto) && p.effetti.every((e, i) => !e.scelte || e.scelte.includes(elementoDi(bozze[i]!)));
  const daCompletare = p.effetti.some((e) => e.completa.length > 0);
  const cambia = (i: number, e: EffettoVoce, campo?: CampoDaCompletare) => {
    setBozze((b) => b.map((x, j) => (j === i ? e : x)));
    if (campo) setMancanti((m) => m.map((x, j) => (j === i ? x.filter((c) => c !== campo) : x)));
  };

  // `op` restituisce l'esito del salvataggio nelle partite che hanno già spuntato la voce (L13, decisione 19: gli effetti di stato valgono
  // subito, e gli yen di un articolo si muovono): detto come nella finestra della voce, anche se la rilettura dell'elenco non riesce
  const esegui = async (op: () => Promise<ReturnType<typeof notificaApplicazioni>>, ok: string) => {
    setOccupato(true);
    let registrata = false;
    try {
      const esito = await op(); registrata = true;
      segnalaMutazioneEffetti(null); notifica('success', ok);
      if (esito) notifica(esito.tipo, esito.testo, esito.durata);
      await onDecisa();
    }
    catch (err) {
      notifica('error', `${registrata ? 'Proposta registrata; aggiornamento della pagina non riuscito: ' : ''}${err instanceof Error ? err.message : 'Operazione non riuscita.'}`);
    }
    finally { setOccupato(false); }
  };
  const applica = () => void esegui(async () => notificaApplicazioni((await applicaPropostaConversione(p.id, { revisionePropostaAttesa: p.revisione, ...(daCompletare ? { effetti: bozze } : {}) }, partitaId ?? undefined)).voce.applicazioniEffetti),
    'Proposta applicata: voce modificata nella guida, per tutte le partite.');
  const scarta = async () => {
    if (!(await conferma({ titolo: 'Scartare la proposta?', testo: 'La voce resta com’è; la proposta resta registrata come scartata e non torna fra quelle da completare.', etichetta: 'Scarta', icona: 'scarta' }))) return;
    await esegui(async () => { await scartaPropostaConversione(p.id, { revisionePropostaAttesa: p.revisione }); return null; }, 'Proposta scartata: la voce non cambia.');
  };

  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-bg-tertiary p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`chip testo-12 ${p.certezza === 'certa' ? 'chip--attivo' : ''}`}>{NOME_CERTEZZA[p.certezza]}</span>
        {!aperta && <span className="chip testo-12">{NOME_STATO[p.stato]}{p.decisaIl ? ` il ${new Date(p.decisaIl).toLocaleDateString('it-IT')}` : ''}</span>}
        {p.lotto && <span className="testo-12 text-text-muted">{p.lotto}</span>}
      </div>
      {conVoce && <p className="m-0 testo-13 break-words"><strong>{dataGiocoTesto(p.giorno)} · {p.fascia === 'sera' ? 'di sera' : 'di giorno'}:</strong> {p.testo}</p>}
      <p className="m-0 testo-13 text-text-secondary break-words">{p.motivo}</p>
      {p.tipo && <p className="m-0 testo-13 break-words">Tipo: {nomeTipo(p.tipoAttuale)} → <strong>{nomeTipo(p.tipo)}</strong></p>}
      {p.riferimento && <p className="m-0 testo-13 break-words">Collegata a: {p.riferimentoAttuale ? nomeRiferimento(p.riferimentoAttuale, elenchi) : 'nessun collegamento'} → <strong>{nomeRiferimento(p.riferimento, elenchi)}</strong></p>}
      {p.effetti.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="testo-13 text-text-secondary">Aggiunge</span>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {p.effetti.map((pe, i) => {
              const b = bozze[i]!;
              const manca = mancanti[i] ?? [];
              return (
                <li key={i} className="flex min-w-0 flex-col gap-1.5">
                  <span className="flex min-w-0 items-start gap-2">
                    <IconaCategoria categoria={CATEGORIA_EFFETTO[b.tipo]} dimensione={24} />
                    <span className="min-w-0 flex-1 testo-13 break-words">
                      {effettoCompleto(b) && !manca.length ? fraseEffetto(b, nomi) : `${NOME_FAMIGLIA_EFFETTO[b.tipo]}: da completare`}
                      {pe.giaPresente && <span className="text-text-muted"> (c’è già sulla voce: non si aggiunge due volte)</span>}
                    </span>
                  </span>
                  {aperta && manca.includes('elemento') && pe.scelte && (
                    <Selettore etichettaSopra etichetta={`Quale ${NOME_FAMIGLIA_EFFETTO[b.tipo].toLowerCase()}`} valore={elementoDi(b)} vuoto="Scegli"
                      opzioni={pe.scelte.map((k) => ({ chiave: k, nome: nomeElemento(b, k, nomi) }))} onCambia={(v) => { if (v) cambia(i, conElemento(b, v), 'elemento'); }} />
                  )}
                  {aperta && manca.includes('elemento') && !pe.scelte && <CampiEffettoVoce effetto={b} elenchi={elenchi} righe={[]} onCambia={(e) => cambia(i, e, elementoDi(e) ? 'elemento' : undefined)} />}
                  {aperta && pe.completa.includes('quantita') && (b.tipo === 'articolo' || b.tipo === 'oggetto') && (
                    <label className="flex flex-col gap-1 testo-13">Copie (la guida non le dice)
                      <input className="form-input min-h-11 w-24" type="number" inputMode="numeric" min={1} max={QUANTITA_MASSIMA_EFFETTO} step={1}
                        value={manca.includes('quantita') ? '' : (b.tipo === 'oggetto' ? b.quantita : b.quantita ?? 1)}
                        onChange={(ev) => {
                          const n = Math.trunc(Number(ev.target.value));
                          if (!Number.isFinite(n) || n < 1) return;
                          const q = Math.min(QUANTITA_MASSIMA_EFFETTO, n);
                          cambia(i, b.tipo === 'oggetto' ? { ...b, quantita: q } : q > 1 ? { tipo: 'articolo', articolo: b.articolo, quantita: q } : { tipo: 'articolo', articolo: b.articolo }, 'quantita');
                        }} />
                    </label>
                  )}
                  {aperta && pe.completa.includes('note') && b.tipo === 'dote' && (
                    <>
                      <span className="testo-13 text-text-secondary">Note che dà il gioco</span>
                      <FilaScelta etichetta="Note della Dote" valore={manca.includes('note') ? '' : String(b.note)} opzioni={NOTE} onCambia={(v) => cambia(i, { ...b, note: Number(v) as 1 | 2 | 3, ...(b.possibili ? { possibili: b.possibili } : {}) }, 'note')} />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {p.togli.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="testo-13 text-text-secondary">Toglie</span>
          <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5 testo-13">
            {p.togli.map((t) => <li key={t.uid} className="break-words">{t.effetto ? fraseEffetto(t.effetto, nomi) : 'Un effetto che non è più sulla voce'}</li>)}
          </ul>
        </div>
      )}
      {!p.leggibile && <p role="alert" className="m-0 testo-13 text-warning">Proposta non leggibile per intero ({p.problema}): si può solo scartare.</p>}
      {aperta && superata && <p role="alert" className="m-0 testo-13 text-warning">Un effetto che la proposta toglie non è più sulla voce: è superata, scartala (o usa «Modifica»).</p>}
      {aperta && (
        <div className="flex flex-wrap gap-2">
          <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="accettata" dimensione={20} />} titolo="Applica" disabled={occupato || !p.leggibile || superata || !completa} onClick={applica} />
          {onModifica && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" disabled={occupato || !p.leggibile} onClick={() => onModifica(p)} />}
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="scarta" dimensione={20} />} titolo="Scarta" disabled={occupato} onClick={() => void scarta()} />
        </div>
      )}
      {aperta && p.leggibile && !superata && !completa && <p className="m-0 testo-12 text-text-muted">Completa i dati che la proposta chiede: poi «Applica» si accende.</p>}
    </li>
  );
}

/** La finestra delle proposte di una voce, aperta dal segno «da completare» del Diario. */
export function FinestraProposteVoce({ testo, giorno, proposte, partitaId, onChiudi, onModifica, onDecisa }: {
  testo: string; giorno: string; proposte: PropostaConversioneDto[]; partitaId: number | null;
  onChiudi: () => void; onModifica: (p: PropostaConversioneDto) => void; onDecisa: () => void | Promise<void>;
}) {
  const { elenchi, nomi, errore } = useElenchiProposte(giorno);
  if (IN_RILASCIO) return null;
  return (
    <Modal aperta larga titolo="Proposte da completare" onChiudi={onChiudi}>
      <div className="flex flex-col gap-3">
        <p className="m-0 testo-13 break-words"><strong>Voce:</strong> {testo}</p>
        {!elenchi && !errore && <p role="status" className="m-0">Un attimo…</p>}
        {errore && <p role="alert" className="m-0 text-error-testo">Elenchi non disponibili: {errore}</p>}
        {elenchi && nomi && proposte.length === 0 && <p className="m-0 testo-13 text-text-muted">Nessuna proposta da completare su questa voce.</p>}
        {elenchi && nomi && proposte.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-label="Proposte della voce">
            {proposte.map((p) => <SchedaProposta key={`${p.id}:${p.revisione}`} proposta={p} elenchi={elenchi} nomi={nomi} partitaId={partitaId} onModifica={onModifica} onDecisa={onDecisa} />)}
          </ul>
        )}
      </div>
    </Modal>
  );
}
