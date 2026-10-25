// ============================================================
// InfiltrazioniVoce — il campo «Infiltrazioni» di una voce di Palazzo del diario e il segnale «Da rivedere» (L3, §4.4 e §1.4)
// ============================================================
//
// Ogni voce che ha un Palazzo (`palazzoDellaVoce`: riferimento `dungeon`, oppure infiltrazioni già scelte, oppure una proposta) mostra
// l'insieme delle infiltrazioni **in ordine**, come chip (la stessa infiltrazione può tornare, mai di seguito; dal 2026-10-25 senza
// l'etichetta «Infiltrazioni:», sotto il cartellino del Palazzo e sopra «Il gioco dà»). Si cambia in una finestra (foglio
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
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione, IconaSegno } from '../shared/IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

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
  // UX3-9: senza collegamento (né il Palazzo né «Sulla mappa») la finestra non nomina un collegamento che non c'è
  const etichetta = collegamentoAzione(a)?.etichetta ?? null;
  const collegamento = etichetta ? `il collegamento «${etichetta}»` : null;
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
  // nel rilascio un insieme vuoto non dice niente a chi gioca (non c'è niente da scegliere né da confermare): la riga non c'è
  if (IN_RILASCIO && insieme.length === 0) return null;
  return (
    // 2026-10-25 («le etichette di testo devono essere visibili solo se hanno senso»): niente «Infiltrazioni:» davanti ai chip, che stanno
    // subito sotto il cartellino del Palazzo e si chiamano come l'infiltrazione («Tutorial Palazzo 11/04»): il nome dell'elenco lo
    // dicono `aria-label` e il suggerimento. Il numero d'ordine serve solo con più infiltrazioni; la matita sta da sola (44 px, nome
    // accessibile e suggerimento), senza la parola «Modifica». Con l'insieme vuoto la riga è il pulsante che dice che cosa manca.
    <div className="flex flex-wrap items-center gap-1 testo-12">
      {insieme.length > 0 && (
        <ol className="m-0 flex list-none flex-wrap items-center gap-1 p-0" aria-label="Infiltrazioni della voce, in ordine" title="Infiltrazioni della voce, in ordine">
          {insieme.map((x, i) => <li key={`${x.chiave}:${i}`} className="chip testo-12">{insieme.length > 1 ? `${i + 1}. ` : ''}{x.nome}{chiavi.indexOf(x.chiave) < i ? ' (di nuovo)' : ''}</li>)}
        </ol>
      )}
      {/* L12 (passo 8): nel rilascio (sola lettura) l'insieme delle infiltrazioni si legge ma non si cambia e la proposta non si conferma */}
      {!IN_RILASCIO && (insieme.length > 0
        ? <button type="button" className="btn btn-sm btn-ghost touch shrink-0" aria-label="Modifica le infiltrazioni" title="Modifica le infiltrazioni" disabled={occupato} onClick={() => setAperta(true)}>
            <IconaAzione chiave="modifica" dimensione={20} />
          </button>
        : <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Scegli le infiltrazioni" disabled={occupato} onClick={() => setAperta(true)} />)}
      {!IN_RILASCIO && proposta && (
        <span className="flex basis-full flex-wrap items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1" role="status">
          <span>Proposta: {proposta.infiltrazioni.map((x) => x.nome).join(', ')} — {proposta.motivo} <span className="text-text-muted">({CERTEZZA[proposta.certezza]})</span></span>
          <PulsanteVisivo compatto icona={<IconaAzione chiave="raggiunto" dimensione={20} />} titolo="Conferma" disabled={occupato} onClick={() => void salva(proposta.infiltrazioni.map((x) => x.chiave), 'Proposta confermata.')} />
        </span>
      )}
      {!IN_RILASCIO && aperta && (
        <Modal titolo="Infiltrazioni della voce" aperta onChiudi={() => setAperta(false)}
          azioni={<PulsanteVisivo tono="primario" icona={<IconaAzione chiave="raggiunto" dimensione={22} />} titolo="Fatto" onClick={() => setAperta(false)} />}>
          <div className="flex flex-col gap-3 testo-13">
            {/* il collegamento della voce si chiama come il Palazzo («Palazzo di Madarame»): il testo lo nomina così (UX3-2) */}
            <p className="m-0 text-text-secondary">In ordine, come le percorri: {collegamento ? `${collegamento} apre la prima non completata` : 'dicono in quali infiltrazioni avviene la voce, che non apre il Palazzo'}. Ogni cambio si salva subito e non tocca il resto della voce.</p>
            {/* con un atterraggio il collegamento porta alla planimetria d'atterraggio del giorno (§4.1, prima della proposta: FUN3-3, strada (a)
                del PM), e confermata la proposta alla prima non completata fra quelle scelte; con una proposta la sua prima infiltrazione (UX3-1);
                senza, la prima non completata del Palazzo; senza collegamento (UX3-9) si dice solo che l'infiltrazione non è ancora indicata */}
            {insieme.length === 0 && <p className="m-0 text-text-muted">{!collegamento
              ? 'Nessuna: la voce non dice ancora in quale infiltrazione avviene.'
              : a.atterraggio
                ? `Nessuna: ${collegamento} apre la planimetria d’arrivo del giorno, quella dell’atterraggio del Palazzo.${proposta ? ' Confermata la proposta, aprirà la prima non completata fra quelle scelte.' : ''}`
                : `Nessuna: ${collegamento} apre ${a.propostaInfiltrazioni?.infiltrazioni.length ? `«${a.propostaInfiltrazioni.infiltrazioni[0].nome}», la prima della proposta` : 'la prima infiltrazione non completata del Palazzo'}.`}</p>}
            <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
              {insieme.map((x, i) => (
                <li key={`${x.chiave}:${i}`} className="card flex flex-wrap items-center gap-1 p-1.5">
                  <span className="min-w-0 flex-1 font-semibold">{i + 1}. {x.nome}{chiavi.indexOf(x.chiave) < i ? ' (di nuovo)' : ''}</span>
                  <span className="flex flex-wrap items-center gap-1">
                    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="su" dimensione={20} />} titolo="Sposta su" aria-label={`Sposta su ${x.nome}`} disabled={occupato || i === 0} onClick={() => sposta(i, -1)} />
                    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="giu" dimensione={20} />} titolo="Sposta giù" aria-label={`Sposta giù ${x.nome}`} disabled={occupato || i === insieme.length - 1} onClick={() => sposta(i, 1)} />
                    <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="elimina" dimensione={22} />} titolo="Togli" className="whitespace-nowrap" aria-label={`Togli ${x.nome}`} disabled={occupato} onClick={() => void salva(chiavi.filter((_, j) => j !== i), `${x.nome}: tolta dalla voce.`)} />
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
// L12 (passo 8): «Da rivedere» è un segnale del team di redazione con i gesti per risolverlo: nel rilascio non esiste (costante di build).
export const DaRivedereVoce: StrumentoDiModifica<typeof DaRivedereVoceReale> = IN_RILASCIO ? NienteInRilascio : DaRivedereVoceReale;
function DaRivedereVoceReale({ a, partitaId, onCambiata }: Props) {
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
      <PulsanteVisivo compatto icona={<IconaSegno chiave="da-verificare" dimensione={20} />} titolo="Da rivedere" onClick={() => setAperta(true)} />
      {aperta && (
        <Modal titolo={tipo} aperta onChiudi={() => setAperta(false)}
          azioni={precedente
            ? <>
                <PulsanteVisivo icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Rimetti il precedente" disabled={occupato} onClick={() => void rivedi('rimetti')} />
                <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="raggiunto" dimensione={22} />} titolo="Tieni il nuovo" disabled={occupato} onClick={() => void rivedi('tieni')} />
              </>
            : <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="raggiunto" dimensione={22} />} titolo={a.aggiuntaDa === 'team' ? 'Tieni la voce' : 'Fatto'} disabled={occupato} onClick={() => void rivedi(a.aggiuntaDa === 'team' ? 'tieni' : 'fatto')} />}>
          <div className="flex flex-col gap-2 testo-13">
            {a.motivoRevisione && <p className="m-0">{a.motivoRevisione}</p>}
            <p className="m-0"><span className="text-text-muted">Adesso:</span> {a.azione}{a.note ? ` — ${a.note}` : ''}</p>
            {precedente && (
              <div className="rounded-md bg-white/[0.04] px-2 py-1.5 text-text-muted">
                <span className="block testo-12 uppercase tracking-wide">Testo precedente</span>
                {precedente.azione}{precedente.note ? ` — ${precedente.note}` : ''}{precedente.riferimentoTesto ? ` (${precedente.riferimentoTesto})` : ''}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
