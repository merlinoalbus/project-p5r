// ============================================================
// InfiltrazioniVoce — il campo «Infiltrazioni» di una voce di Palazzo del diario e il segnale «Da rivedere» (L3, §4.4 e §1.4)
// ============================================================
//
// Ogni voce che ha un Palazzo (`palazzoDellaVoce`: riferimento `dungeon`, oppure infiltrazioni già scelte, oppure una proposta) mostra
// «Infiltrazioni:» con l'insieme **in ordine** (la stessa infiltrazione può tornare, mai di seguito). Si cambia in una finestra (foglio
// dal basso sul telefono): ↑/↓ da 44 px, «Togli», «Aggiungi infiltrazione» fra quelle già esistenti del Palazzo (esclusa solo l'ultima
// dell'insieme). Ogni cambio salva subito e non tocca nient'altro della voce. Con l'insieme vuoto e una proposta: «Proposta: …» con la
// certezza e «Conferma», che scrive l'insieme proposto nell'ordine.
//
// «Da rivedere» (lo stesso meccanismo che userà L10): un chip accanto alla voce aggiunta, corretta o segnalata dal team; aperto dice
// che cosa è successo (col testo di prima, se c'è) e offre «Tieni il nuovo» / «Rimetti il precedente», oppure «Fatto».
// ============================================================

import { useState } from 'react';
import { impostaInfiltrazioniVoce, rivediVoceGiornata } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { collegamentoAzione } from '../../utils/percorso';
import type { AzionePercorsoDto, EsitoRevisioneVoce } from '../../types';

/** La certezza della proposta, a parole. */
const CERTEZZA: Record<'certa' | 'multipla' | 'probabile', string> = { certa: 'certa', multipla: 'più infiltrazioni', probabile: 'probabile' };

interface Props {
  a: AzionePercorsoDto;
  partitaId: number | null;
  /** La voce aggiornata dal server (dopo ogni salvataggio). */
  onCambiata: (a: AzionePercorsoDto) => void;
}

/** Il campo «Infiltrazioni» della voce (solo per le voci di Palazzo: senza `infiltrazioniDelPalazzo` non si mostra). */
export function InfiltrazioniVoce({ a, partitaId, onCambiata }: Props) {
  const [aperta, setAperta] = useState(false);
  const [occupato, setOccupato] = useState(false);
  const opzioni = a.infiltrazioniDelPalazzo;
  if (!opzioni) return null;
  const insieme = a.infiltrazioni ?? [];
  const etichetta = collegamentoAzione(a)?.etichetta;
  const collegamento = etichetta ? `il collegamento «${etichetta}»` : 'il collegamento della voce';
  const proposta = insieme.length === 0 ? a.propostaInfiltrazioni ?? null : null;
  /** Salva l'insieme nuovo (le chiavi, in ordine) e passa al giorno la voce riletta. */
  const salva = async (chiavi: string[], messaggio: string) => {
    setOccupato(true);
    try { onCambiata(await impostaInfiltrazioniVoce(a.uid, chiavi, partitaId ?? undefined)); notifica('success', messaggio); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Infiltrazioni non salvate.'); }
    finally { setOccupato(false); }
  };
  const chiavi = insieme.map((x) => x.chiave);
  const sposta = (i: number, verso: -1 | 1) => { const n = [...chiavi]; [n[i], n[i + verso]] = [n[i + verso], n[i]]; void salva(n, 'Ordine delle infiltrazioni salvato.'); };
  // una ripetuta non va di seguito: chi sposta o toglie la rifarebbe consecutiva, il server la rifiuta (400) e lo dice
  const ultima = chiavi[chiavi.length - 1];
  const daAggiungere = opzioni.filter((o) => o.chiave !== ultima);
  return (
    <div className="flex flex-wrap items-center gap-1 text-[12px]">
      <span className="text-text-muted">Infiltrazioni:</span>
      {insieme.length === 0
        ? <span className="text-text-muted">nessuna</span>
        : <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0" aria-label="Infiltrazioni della voce, in ordine">
            {insieme.map((x, i) => <li key={`${x.chiave}:${i}`} className="chip text-[11px]">{i + 1}. {x.nome}{chiavi.indexOf(x.chiave) < i ? ' (di nuovo)' : ''}</li>)}
          </ol>}
      <button type="button" className="chip touch text-[11px]" disabled={occupato} onClick={() => setAperta(true)}>Modifica</button>
      {proposta && (
        <span className="flex basis-full flex-wrap items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1" role="status">
          <span>Proposta: {proposta.infiltrazioni.map((x) => x.nome).join(', ')} — {proposta.motivo} <span className="text-text-muted">({CERTEZZA[proposta.certezza]})</span></span>
          <button type="button" className="btn btn-secondary btn-sm touch" disabled={occupato}
            onClick={() => void salva(proposta.infiltrazioni.map((x) => x.chiave), 'Proposta confermata.')}>Conferma</button>
        </span>
      )}
      {aperta && (
        <Modal titolo="Infiltrazioni della voce" aperta onChiudi={() => setAperta(false)}
          azioni={<button type="button" className="btn btn-primary touch" onClick={() => setAperta(false)}>Fatto</button>}>
          <div className="flex flex-col gap-3 text-[13px]">
            {/* il collegamento della voce si chiama come il Palazzo («Palazzo di Madarame»): il testo lo nomina così (UX3-2) */}
            <p className="m-0 text-text-secondary">In ordine, come le percorri: {collegamento} apre la prima non completata. Ogni cambio si salva subito e non tocca il resto della voce.</p>
            {/* con una proposta il collegamento apre la sua prima infiltrazione (UX3-1); senza, la prima non completata del Palazzo */}
            {insieme.length === 0 && <p className="m-0 text-text-muted">Nessuna: {collegamento} apre {a.propostaInfiltrazioni?.infiltrazioni.length ? `«${a.propostaInfiltrazioni.infiltrazioni[0].nome}», la prima della proposta` : 'la prima infiltrazione non completata del Palazzo'}.</p>}
            <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
              {insieme.map((x, i) => (
                <li key={`${x.chiave}:${i}`} className="card flex flex-wrap items-center gap-1 p-1.5">
                  <span className="min-w-0 flex-1 font-semibold">{i + 1}. {x.nome}{chiavi.indexOf(x.chiave) < i ? ' (di nuovo)' : ''}</span>
                  <span className="flex flex-wrap items-center gap-1">
                    <button type="button" className="btn btn-ghost touch" aria-label={`Sposta su ${x.nome}`} disabled={occupato || i === 0} onClick={() => sposta(i, -1)}>↑</button>
                    <button type="button" className="btn btn-ghost touch" aria-label={`Sposta giù ${x.nome}`} disabled={occupato || i === insieme.length - 1} onClick={() => sposta(i, 1)}>↓</button>
                    <button type="button" className="btn btn-ghost touch whitespace-nowrap" aria-label={`Togli ${x.nome}`} disabled={occupato}
                      onClick={() => void salva(chiavi.filter((_, j) => j !== i), `${x.nome}: tolta dalla voce.`)}>Togli</button>
                  </span>
                </li>
              ))}
            </ol>
            {daAggiungere.length > 0 && (
              <Selettore etichetta="Aggiungi infiltrazione" valore="" vuoto="— scegli —"
                opzioni={daAggiungere.map((o) => ({ chiave: o.chiave, nome: `${o.ordine + 1}. ${o.nome}`, dettaglio: chiavi.includes(o.chiave) ? 'di nuovo' : undefined }))}
                onCambia={(k) => { if (k) void salva([...chiavi, k], 'Infiltrazione aggiunta alla voce.'); }} disabilitato={occupato} />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Il chip «Da rivedere» di una voce aggiunta, corretta o segnalata dal team, con la sua finestra (§1.4). */
export function DaRivedereVoce({ a, partitaId, onCambiata }: Props) {
  const [aperta, setAperta] = useState(false);
  const [occupato, setOccupato] = useState(false);
  if (!a.daRivedere) return null;
  const precedente = a.testoPrecedente ?? null;
  const tipo = a.aggiuntaDa === 'team' ? 'Aggiunta dal team, da rivedere' : precedente ? 'Corretta dal team' : 'Segnalata dal team';
  const rivedi = async (esito: EsitoRevisioneVoce) => {
    setOccupato(true);
    try {
      onCambiata(await rivediVoceGiornata(a.uid, esito, partitaId ?? undefined));
      notifica('success', esito === 'rimetti' ? 'Rimesso il testo di prima.' : 'Voce rivista.');
      setAperta(false);
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Voce non aggiornata.'); }
    finally { setOccupato(false); }
  };
  return (
    <>
      <button type="button" className="chip chip--oro touch text-[11px]" onClick={() => setAperta(true)}>Da rivedere</button>
      {aperta && (
        <Modal titolo={tipo} aperta onChiudi={() => setAperta(false)}
          azioni={precedente
            ? <>
                <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={() => void rivedi('rimetti')}>Rimetti il precedente</button>
                <button type="button" className="btn btn-primary touch" disabled={occupato} onClick={() => void rivedi('tieni')}>Tieni il nuovo</button>
              </>
            : <button type="button" className="btn btn-primary touch" disabled={occupato} onClick={() => void rivedi(a.aggiuntaDa === 'team' ? 'tieni' : 'fatto')}>{a.aggiuntaDa === 'team' ? 'Tieni la voce' : 'Fatto'}</button>}>
          <div className="flex flex-col gap-2 text-[13px]">
            {a.motivoRevisione && <p className="m-0">{a.motivoRevisione}</p>}
            <p className="m-0"><span className="text-text-muted">Adesso:</span> {a.azione}{a.note ? ` — ${a.note}` : ''}</p>
            {precedente && (
              <div className="rounded-md bg-white/[0.04] px-2 py-1.5 text-text-muted">
                <span className="block text-[11px] uppercase tracking-wide">Testo precedente</span>
                {precedente.azione}{precedente.note ? ` — ${precedente.note}` : ''}{precedente.riferimentoTesto ? ` (${precedente.riferimentoTesto})` : ''}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
