import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AnteprimaDecisioneProposteDto, DecisioneProposte, PropostaPartitaDto } from '../../../shared/propostePartita';
import { descriviEffettoVoce, normalizzaEffettoVoce } from '../../../shared/effettiVoce';
import { nomeDote } from '../../../shared/doti';
import { anteprimaDecisioneProposte, getDaApplicare, leggiAcquistiRegistrati } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { usePartitaStore } from '../../stores/partitaStore';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { PreparazioneAcquistoAojiru, RiepilogoConsumoPreparato } from '../catalogo/ConsumiAojiru';
import { Modal } from '../shared/Modal';
import { decidiProposteConRegistro, gestoPendenteNelloScope, useGestiPartita } from '../../services/gestiPartita';
import { GestiPartita } from './GestiPartita';
import { IdentitaProposta } from './IdentitaProposta';

const riferimento = (p: PropostaPartitaDto) => ({ id: p.id, uid: p.uid });
const testoErrore = (e: unknown) => e instanceof Error ? e.message : 'Operazione non riuscita.';
const valore = (p: PropostaPartitaDto) => `${p.delta > 0 ? '+' : ''}${p.delta.toLocaleString('it-IT')} ${p.unita === 'punti-interni' ? 'punti interni' : p.unita === 'yen' ? 'yen' : 'azione'}`;
const nome = (p: PropostaPartitaDto) => p.dote ? nomeDote(p.dote) : p.tipo === 'yen' ? 'Denaro' : 'Effetto della voce';

/** Coda durevole unica per Oggi, Home e Progressi: nessun saldo cambia senza una decisione esplicita. */
export function DaApplicare({ partitaId, onCambiato }: { partitaId: number; onCambiato?: () => void | Promise<void> }) {
  const gesti = useGestiPartita();
  const elenco = useCarica(() => getDaApplicare(partitaId), [partitaId, gesti.versionePerPartita[partitaId] ?? 0, gesti.versioneGuida]);
  const registro = useCarica(() => leggiAcquistiRegistrati(partitaId), [partitaId, gesti.versionePerPartita[partitaId] ?? 0, gesti.versioneGuida]);
  const identita = (p: PropostaPartitaDto) => <IdentitaProposta proposta={p} registrazioni={registro.dati?.registrazioni ?? null} erroreRegistro={registro.errore} caricamentoRegistro={registro.caricamento} />;
  const [selezionate, setSelezionate] = useState<Set<string>>(new Set());
  const [anteprima, setAnteprima] = useState<AnteprimaDecisioneProposteDto | null>(null);
  const [daDichiarare, setDaDichiarare] = useState<PropostaPartitaDto | null>(null);
  const [quantita, setQuantita] = useState('');
  const [consumo, setConsumo] = useState<PropostaPartitaDto | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [incerto, setIncerto] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [ricevuta, setRicevuta] = useState<string | null>(null);
  const blocco = useRef(false);
  const vivo = useRef(true);
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const aperte = (elenco.dati ?? []).filter((p) => p.stato === 'aperta');
  const scelte = aperte.filter((p) => selezionate.has(p.uid));
  const prepara = async (decisione: DecisioneProposte) => {
    if (blocco.current) return;
    blocco.current = true; setOccupato(true); setErrore(null); setRicevuta(null);
    try {
      const a = await anteprimaDecisioneProposte(partitaId, { operazioneId: crypto.randomUUID().replaceAll('-', ''), decisione });
      if (vivo.current) { setAnteprima(a); setDaDichiarare(null); setConsumo(null); }
    } catch (e) { if (vivo.current) setErrore(testoErrore(e)); throw e; }
    finally { blocco.current = false; if (vivo.current) setOccupato(false); }
  };
  const chiedi = (decisione: DecisioneProposte) => { void prepara(decisione).catch(() => undefined); };
  const conferma = async () => {
    if (!anteprima || blocco.current) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    let registrata = false;
    try {
      const r = await decidiProposteConRegistro(partitaId, { ...anteprima.richiesta, revisioneProposteAttesa: anteprima.revisioneProposteAttesa }, { etichetta: `Decisione su ${anteprima.proposte.length} proposte` });
      registrata = true;
      if (vivo.current) {
        setRicevuta(`Decisione registrata per ${r.proposte.length} ${r.proposte.length === 1 ? 'proposta' : 'proposte'} · operazione ${r.operazioneId}.`);
        setAnteprima(null); setIncerto(false); setSelezionate(new Set());
      }
      useSuggerimentiStore.getState().invalida();
      if (!vivo.current) return;
      await elenco.ricarica();
      await usePartitaStore.getState().carica();
      await onCambiato?.();
    } catch (e) {
      if (vivo.current) {
        setErrore(registrata ? `Decisione registrata; aggiornamento della pagina non riuscito: ${testoErrore(e)}` : testoErrore(e));
        if (!registrata) {
          const dubbio = !!gestoPendenteNelloScope(partitaId, { proposte: anteprima.proposte.map(riferimento) });
          setIncerto(dubbio);
          if (!dubbio) { setAnteprima(null); await elenco.ricarica(); }
        }
      }
    } finally { blocco.current = false; if (vivo.current) setOccupato(false); }
  };
  const effettoConsumo = consumo ? normalizzaEffettoVoce(consumo.dati.effetto) : null;
  const uidVoce = consumo && typeof consumo.dati.voceUid === 'string' ? consumo.dati.voceUid : null;
  const uidEffetto = consumo && typeof consumo.dati.effettoUid === 'string' ? consumo.dati.effettoUid : null;
  return <section className="card flex min-w-0 flex-col gap-2" aria-label="Da applicare alla partita">
    <GestiPartita partitaId={partitaId} onCambiato={async () => { if (vivo.current) { setAnteprima(null); setIncerto(false); await elenco.ricarica(); await onCambiato?.(); } }} />
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="m-0 font-display text-[17px] uppercase">Da applicare{aperte.length > 0 ? ` · ${aperte.length}` : ''}</h2><button type="button" className="btn btn-ghost btn-sm touch" disabled={occupato} onClick={() => void elenco.ricarica()}>Aggiorna</button></div>
    <p className="m-0 text-[12px] text-text-secondary">Doti, yen ed effetti di voci già fatte: rivedi e decidi. Le dichiarazioni «già conteggiato», «non conteggiato» e «ignoto» restano distinte dalle modifiche eseguite dall’app.</p>
    {elenco.caricamento && !elenco.dati && <p role="status" className="m-0 text-[13px]">Caricamento…</p>}
    {elenco.errore && <p role="alert" className="m-0 text-error">{elenco.errore}</p>}
    {elenco.dati && !aperte.length && <p className="m-0 text-[13px]">Nessuna proposta aperta.</p>}
    {!!aperte.length && <>
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <button type="button" className="btn btn-ghost btn-sm touch" disabled={occupato} onClick={() => setSelezionate(new Set(aperte.slice(0, 100).map((p) => p.uid)))}>Seleziona fino a 100 proposte</button>
        <button type="button" className="btn btn-ghost btn-sm touch" disabled={occupato || !scelte.length} onClick={() => setSelezionate(new Set())}>Togli la selezione</button>
        <button type="button" className="btn btn-secondary btn-sm touch" disabled={occupato || !scelte.length || scelte.some((p) => !p.applicabile || p.tipo === 'effetto-voce')} onClick={() => chiedi({ tipo: 'applica', proposte: scelte.map(riferimento) })}>Rivedi e applica la selezione</button>
        <button type="button" className="btn btn-ghost btn-sm touch" disabled={occupato || !scelte.length} onClick={() => chiedi({ tipo: 'scarta', proposte: scelte.map(riferimento) })}>Rivedi e scarta la selezione</button>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">{aperte.map((p) => {
        const e = normalizzaEffettoVoce(p.dati.effetto);
        return <li key={p.uid} className="flex min-w-0 flex-col gap-1 border-t border-border pt-2 text-[13px]">
          <label className="touch flex items-center gap-2"><input type="checkbox" className="h-5 w-5" disabled={occupato || (!selezionate.has(p.uid) && scelte.length >= 100)} checked={selezionate.has(p.uid)} onChange={(ev) => setSelezionate((s) => { const n = new Set(s); if (ev.target.checked) n.add(p.uid); else n.delete(p.uid); return n; })} /><strong>{nome(p)} · {valore(p)}</strong></label>
          <span>{p.motivo}</span>
          {identita(p)}
          {e && <span>{descriviEffettoVoce(e)}</span>}
          {p.dati.sostituzione === true && <div className="flex flex-col gap-1"><strong>Sostituzione di una versione precedente</strong><span>Prima: {normalizzaEffettoVoce(p.dati.versionePrecedente) ? descriviEffettoVoce(normalizzaEffettoVoce(p.dati.versionePrecedente)!) : 'Versione precedente non riconciliata.'}</span><span>Dopo: {e ? descriviEffettoVoce(e) : 'Configurazione non leggibile.'}</span><span>Viene ritirata soltanto la porzione precedente provata dalla sua ricevuta; gli altri effetti della spunta restano invariati.</span></div>}
          {p.saldo && <span>Da attribuire: {p.saldo.dovuto}; già attribuito o riconosciuto: {p.saldo.attribuito}; differenza: {p.saldo.differenza} {p.unita === 'yen' ? 'yen' : 'punti interni'}.</span>}
          <span>Conteggio precedente: {p.verifica === 'da-dichiarare' ? 'da dichiarare' : p.verifica === 'non-conteggiata' ? 'non conteggiato' : 'ignoto'}{p.orfana ? ' · riferimento non più disponibile' : ''}.</span>
          {!!p.impedimenti.length && <ul className="m-0 pl-4 text-warning">{p.impedimenti.map((i) => <li key={i}>{i}</li>)}</ul>}
          {typeof p.dati.giorno === 'string' && typeof p.dati.voceUid === 'string' && <Link className="touch self-start" to={`/guida/percorso/${p.dati.giorno}?voce=${encodeURIComponent(p.dati.voceUid)}`}>Apri la voce del Diario</Link>}
          <div className="flex flex-wrap gap-1.5">
            {p.tipo === 'effetto-voce' ? <button type="button" className="btn btn-secondary btn-sm touch" disabled={occupato || !p.applicabile || !!gestoPendenteNelloScope(partitaId, { proposte: [riferimento(p)] })} onClick={() => {
              if (e?.tipo === 'acquisto') setConsumo(p);
              else chiedi({ tipo: 'applica-effetto', proposta: riferimento(p) });
            }}>Rivedi l’effetto</button> : <>
              <button type="button" className="btn btn-secondary btn-sm touch" disabled={occupato || !p.applicabile} onClick={() => chiedi({ tipo: 'applica', proposte: [riferimento(p)] })}>Rivedi e applica</button>
              <button type="button" className="btn btn-ghost btn-sm touch" disabled={occupato} onClick={() => { setDaDichiarare(p); setQuantita(''); }}>Già conteggiato…</button>
              <button type="button" className="btn btn-ghost btn-sm touch" disabled={occupato} onClick={() => chiedi({ tipo: 'non-conteggiata', proposte: [riferimento(p)] })}>Non conteggiato</button>
              <button type="button" className="btn btn-ghost btn-sm touch" disabled={occupato} onClick={() => chiedi({ tipo: 'ignota', proposte: [riferimento(p)] })}>Non lo so</button>
            </>}
            <button type="button" className="btn btn-ghost btn-sm touch" disabled={occupato} onClick={() => chiedi({ tipo: 'scarta', proposte: [riferimento(p)] })}>Rivedi e scarta</button>
          </div>
        </li>;
      })}</ul>
    </>}
    {!!elenco.dati?.some((p) => p.stato !== 'aperta') && <details><summary className="touch text-[13px]">Decisioni già registrate</summary><ul className="m-0 flex flex-col gap-2 pl-4 text-[12px]">{elenco.dati.filter((p) => p.stato !== 'aperta').map((p) => <li key={p.uid}>{nome(p)} · {p.stato === 'applicata' ? 'applicata' : p.chiusaDa === 'causa' ? 'non più dovuta' : 'scartata'} · {p.motivo}{p.deltaApplicato !== 0 ? ` · movimento dell’app ${p.deltaApplicato > 0 ? '+' : ''}${p.deltaApplicato}` : ''}{p.deltaRiconosciuto !== 0 ? p.motivoChiusura === 'beneficio-riallocato' ? ` · riallocazione dell’attribuzione ${p.deltaRiconosciuto > 0 ? '+' : ''}${p.deltaRiconosciuto}, saldo invariato` : ` · quantità dichiarata già conteggiata ${p.deltaRiconosciuto}` : ''}{p.motivoChiusura ? ` · ${p.motivoChiusura}` : ''}{identita(p)}</li>)}</ul></details>}
    {ricevuta && <p role="status" className="m-0 text-[13px] text-success">{ricevuta}</p>}
    {errore && <p role="alert" className="m-0 text-[13px] text-error">{errore}</p>}
    <Modal aperta={daDichiarare !== null} titolo="Quantità già conteggiata personalmente" onChiudi={() => { if (!occupato) setDaDichiarare(null); }} azioni={<>
      <button type="button" className="btn btn-ghost touch" disabled={occupato} onClick={() => setDaDichiarare(null)}>Annulla</button>
      <button type="button" className="btn btn-primary touch" disabled={occupato || !Number.isInteger(Number(quantita)) || Number(quantita) <= 0 || Number(quantita) > 9_999_999} onClick={() => { if (daDichiarare) chiedi({ tipo: 'gia-conteggiata', proposta: riferimento(daDichiarare), quantita: Number(quantita) }); }}>Rivedi la dichiarazione</button>
    </>}>
      <p>Indica la quantità esatta già inclusa nel saldo di {daDichiarare ? nome(daDichiarare) : ''}. Questa dichiarazione non aggiunge punti o denaro. Se non conosci la quantità, scegli «Non lo so».</p>
      {daDichiarare && identita(daDichiarare)}
      <label className="flex flex-col gap-1">Quantità ({daDichiarare?.unita === 'yen' ? 'yen' : 'punti interni'})<input type="number" className="form-input" min={1} max={9_999_999} step={1} value={quantita} onChange={(e) => setQuantita(e.target.value)} /></label>
      {errore && <p role="alert" className="text-error">{errore}</p>}
    </Modal>
    <Modal aperta={consumo !== null} titolo="Completa l’acquisto della voce già fatta" onChiudi={() => { if (!occupato) setConsumo(null); }} larga>
      {consumo && effettoConsumo?.tipo === 'acquisto' && uidVoce && uidEffetto ? <PreparazioneAcquistoAojiru key={consumo.uid} partitaId={partitaId} fonte={{ tipo: 'diario', voceUid: uidVoce, effettoUid: uidEffetto }} articolo={effettoConsumo.articolo}
        onRecuperato={async () => { if (vivo.current) { setConsumo(null); await elenco.ricarica(); await onCambiato?.(); } }}
        giorno={typeof consumo.dati.giorno === 'string' ? consumo.dati.giorno : null} fascia={consumo.dati.fascia === 'sera' ? 'sera' : 'giorno'} titoloConferma="Rivedi la proposta completa" esitoConferma="Dati preparati: rivedi il riepilogo della proposta." confermaScrive={false}
        onConferma={async (r) => {
          const { revisioneAcquistiAttesa, ...acquisto } = r;
          await prepara({ tipo: 'applica-effetto', proposta: riferimento(consumo), acquisto, revisioneAcquistiAttesa });
        }} /> : <p role="alert">La proposta non contiene una fonte d’acquisto leggibile. Rileggi la coda; nessun dato viene ricostruito per somiglianza.</p>}
    </Modal>
    <Modal aperta={anteprima !== null} titolo="Riepilogo della decisione" onChiudi={() => { if (!occupato && !incerto) setAnteprima(null); }} azioni={<>
      <button type="button" className="btn btn-ghost touch" disabled={occupato || incerto} onClick={() => setAnteprima(null)}>Annulla</button>
      <button type="button" className="btn btn-primary touch" disabled={occupato} onClick={() => void conferma()}>{incerto ? 'Verifica la stessa operazione' : 'Conferma questa decisione'}</button>
    </>}>
      {anteprima && <div className="flex flex-col gap-2 text-[13px]">
        <strong>Decisione: {({ applica: 'Applica', scarta: 'Scarta', 'non-conteggiata': 'Dichiara non conteggiato', ignota: 'Dichiara ignoto', 'gia-conteggiata': 'Dichiara già conteggiato', 'applica-effetto': 'Applica soltanto l’effetto indicato' } as const)[anteprima.richiesta.decisione.tipo]}</strong>
        <ul className="m-0 pl-4">{anteprima.proposte.map((p) => <li key={p.uid}>{nome(p)} · {valore(p)} · {p.motivo}{identita(p)}</li>)}</ul>
        {anteprima.richiesta.decisione.tipo === 'applica-effetto' && anteprima.richiesta.decisione.acquisto && <RiepilogoConsumoPreparato consumo={anteprima.richiesta.decisione.acquisto} />}
        {anteprima.proposte.filter((p) => p.dati.sostituzione === true).map((p) => {
          const prima = normalizzaEffettoVoce(p.dati.versionePrecedente), dopo = normalizzaEffettoVoce(p.dati.effetto);
          return <p key={p.uid} className="m-0">Sostituzione — prima: {prima ? descriviEffettoVoce(prima) : 'non riconciliato'}; dopo: {dopo ? descriviEffettoVoce(dopo) : 'non leggibile'}. Si applica soltanto la differenza riconciliata.</p>;
        })}
        {anteprima.movimenti.length ? <ul className="m-0 pl-4">{anteprima.movimenti.map((m, i) => <li key={`${m.tipo}:${m.chiave}:${i}`}>{m.tipo === 'yen' ? 'Denaro' : nomeDote(m.chiave)}: {m.prima.toLocaleString('it-IT')} → {m.dopo.toLocaleString('it-IT')} ({m.delta > 0 ? '+' : ''}{m.delta} {m.tipo === 'yen' ? 'yen' : 'punti interni'})</li>)}</ul> : <p className="m-0">Nessuna modifica immediata ai saldi Doti e yen.</p>}
        {anteprima.richiesta.decisione.tipo === 'gia-conteggiata' && <p className="m-0">Quantità riconosciuta: {anteprima.richiesta.decisione.quantita}. È una dichiarazione personale, distinta dai movimenti eseguiti dall’app.</p>}
        {errore && <p role="alert" className="m-0 text-error">{errore}</p>}
        {incerto && <p role="alert" className="m-0 text-warning">Esito incerto: la verifica ripresenta la medesima decisione con il medesimo identificativo. Non viene creata una seconda operazione.</p>}
        {incerto && <GestiPartita partitaId={partitaId} onCambiato={async () => { if (vivo.current) { setAnteprima(null); setIncerto(false); await elenco.ricarica(); await onCambiato?.(); } }} />}
      </div>}
    </Modal>
  </section>;
}
