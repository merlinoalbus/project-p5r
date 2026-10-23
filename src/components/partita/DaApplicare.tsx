import { useLayoutEffect, useRef, useState } from 'react';
import type { AnteprimaDecisioneProposteDto, DecisioneProposte, PropostaPartitaDto } from '../../../shared/propostePartita';
import { normalizzaEffettoVoce } from '../../../shared/effettiVoce';
import { nomeDote } from '../../../shared/doti';
import { anteprimaDecisioneProposte, getDaApplicare, getDoti, leggiAcquistiRegistrati } from '../../services/api';
import { dataLeggibile } from '../../../shared/condizioniSpillo';
import { useCarica } from '../../hooks/useCarica';
import { usePartitaStore } from '../../stores/partitaStore';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { PreparazioneAcquistoAojiru, RiepilogoConsumoPreparato } from '../catalogo/ConsumiAojiru';
import { Modal } from '../shared/Modal';
import { decidiProposteConRegistro, gestoPendenteNelloScope, useGestiPartita } from '../../services/gestiPartita';
import { GestiPartita } from './GestiPartita';
import { IdentitaProposta } from './IdentitaProposta';
import { PreparazioneSessionePesca, RiepilogoSessionePreparata } from '../pesca/PreparazioneSessionePesca';

const riferimento = (p: PropostaPartitaDto) => ({ id: p.id, uid: p.uid });
const testoErrore = (e: unknown) => e instanceof Error ? e.message : 'Operazione non riuscita.';
const unita = (u: PropostaPartitaDto['unita']) => u === 'punti-interni' ? 'punti interni' : u === 'yen' ? 'yen' : u === 'punti-pesca' ? 'punti pesca' : 'azione';
const valore = (p: PropostaPartitaDto) => `${p.delta > 0 ? '+' : ''}${p.delta.toLocaleString('it-IT')} ${unita(p.unita)}`;
const nome = (p: PropostaPartitaDto) => p.dote ? nomeDote(p.dote) : p.tipo === 'yen' ? 'Denaro' : p.tipo === 'punti-pesca' ? 'Punti pesca' : 'Effetto della voce';
/** Il titolo della proposta: il giorno e il testo della voce da cui nasce («18 aprile · Hai bevuto un Aojiru»). */
const titolo = (p: PropostaPartitaDto) => [typeof p.dati.giorno === 'string' ? dataLeggibile(p.dati.giorno) : null, p.voceTesto ?? null].filter(Boolean).join(' · ') || 'Voce del Diario';
const dicituraDecisione: Record<DecisioneProposte['tipo'], string> = {
  applica: 'Aggiungi i punti', scarta: 'Scarta', 'non-conteggiata': 'Segna come non ancora contati', ignota: 'Segna come «non so»',
  'gia-conteggiata': 'Segna come già contati', 'applica-effetto': 'Applica l’effetto',
};
const canonico = (v: unknown): unknown => Array.isArray(v) ? v.map(canonico) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canonico(x)])) : v;

/** Coda durevole unica per Oggi, Home e Progressi: nessun saldo cambia senza una decisione esplicita. */
export function DaApplicare(props: { partitaId: number; onCambiato?: () => void | Promise<void> }) {
  return <DaApplicareNelContesto key={props.partitaId} {...props} />;
}
function DaApplicareNelContesto({ partitaId, onCambiato }: { partitaId: number; onCambiato?: () => void | Promise<void> }) {
  const gesti = useGestiPartita();
  const elenco = useCarica(() => getDaApplicare(partitaId), [partitaId, gesti.versionePerPartita[partitaId] ?? 0, gesti.versioneGuida]);
  const registro = useCarica(() => leggiAcquistiRegistrati(partitaId), [partitaId, gesti.versionePerPartita[partitaId] ?? 0, gesti.versioneGuida]);
  // i punti attuali delle Doti, per dire «Fascino 50 → 52» (R10-10/4); si rileggono quando la partita cambia
  const doti = useCarica(() => getDoti(partitaId), [partitaId, gesti.versionePerPartita[partitaId] ?? 0, gesti.versioneGuida]);
  const puntiDote = (chiave: string | null): number | null => (chiave ? doti.dati?.find((d) => d.chiave === chiave)?.punti ?? null : null);
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
  useLayoutEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const aperte = (elenco.dati ?? []).filter((p) => p.stato === 'aperta');
  const scelte = aperte.filter((p) => selezionate.has(p.uid));
  const prepara = async (decisione: DecisioneProposte) => {
    if (blocco.current) return;
    blocco.current = true; setOccupato(true); setErrore(null); setRicevuta(null);
    try {
      const refs = 'proposte' in decisione ? decisione.proposte : [decisione.proposta];
      const riguardaPesca = (elenco.dati ?? []).some(p => refs.some(r => r.id === p.id && r.uid === p.uid) && (p.causa.tipo === 'pesca' || normalizzaEffettoVoce(p.dati.effetto)?.tipo === 'pesca'));
      if (gestoPendenteNelloScope(partitaId, { proposte: refs, ...(riguardaPesca ? { pesca: true } : {}) })) throw new Error('Esiste un gesto da verificare per queste proposte o per la pesca: recupera prima la sua ricevuta.');
      const a = await anteprimaDecisioneProposte(partitaId, { operazioneId: crypto.randomUUID().replaceAll('-', ''), decisione });
      if (a.richiesta.decisione.tipo === 'applica-effetto' && a.richiesta.decisione.pesca?.scelta.tipo === 'collega') {
        const p = a.richiesta.decisione.pesca, f = a.fotografiaSessionePesca;
        if (p.scelta.tipo !== 'collega' || !f || f.id !== p.scelta.sessioneId || f.partitaId !== partitaId || JSON.stringify(canonico(f.momento)) !== JSON.stringify(canonico(p.momento)) || JSON.stringify(canonico(f.osservazione.dati)) !== JSON.stringify(canonico(p.osservazione))) throw new Error('La fotografia firmata della visita da collegare non coincide con la richiesta. Nessuna decisione viene inviata.');
      }
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
      const riguardaPesca = anteprima.proposte.some(p => p.causa.tipo === 'pesca' || normalizzaEffettoVoce(p.dati.effetto)?.tipo === 'pesca');
      const r = await decidiProposteConRegistro(partitaId, { ...anteprima.richiesta, revisioneProposteAttesa: anteprima.revisioneProposteAttesa }, { etichetta: `Decisione su ${anteprima.proposte.length} proposte`, ...(riguardaPesca ? { pesca: true } : {}) });
      registrata = true;
      if (vivo.current) {
        setRicevuta(r.proposte.length === 1 ? 'Fatto.' : `Fatto: ${r.proposte.length} voci decise.`);
        setAnteprima(null); setIncerto(false); setSelezionate(new Set());
      }
      useSuggerimentiStore.getState().invalida();
      if (!vivo.current) return;
      await elenco.ricarica();
      if (!vivo.current) return;
      if (usePartitaStore.getState().attiva?.id === partitaId) await usePartitaStore.getState().carica();
      if (vivo.current) await onCambiato?.();
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
    <p className="m-0 text-[12px] text-text-secondary">Voci che hai spuntato e i cui punti non sono ancora nella partita. Decidi tu cosa aggiungere: niente cambia da solo.</p>
    {elenco.caricamento && !elenco.dati && <p role="status" className="m-0 text-[13px]">Caricamento…</p>}
    {elenco.errore && <p role="alert" className="m-0 text-error">{elenco.errore}</p>}
    {elenco.dati && !aperte.length && <p className="m-0 text-[13px]">Niente da applicare: i punti delle voci spuntate sono tutti a posto.</p>}
    {!!aperte.length && <>
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <button type="button" className="btn btn-ghost btn-sm touch" disabled={occupato} onClick={() => setSelezionate(new Set(aperte.slice(0, 100).map((p) => p.uid)))}>Seleziona tutte</button>
        <button type="button" className="btn btn-ghost btn-sm touch" disabled={occupato || !scelte.length} onClick={() => setSelezionate(new Set())}>Togli la selezione</button>
        <button type="button" className="btn btn-secondary btn-sm touch" disabled={occupato || !scelte.length || scelte.some((p) => !p.applicabile || p.tipo === 'effetto-voce')} onClick={() => chiedi({ tipo: 'applica', proposte: scelte.map(riferimento) })}>Aggiungi i punti selezionati</button>
        <button type="button" className="btn btn-ghost btn-sm touch" disabled={occupato || !scelte.length} onClick={() => chiedi({ tipo: 'scarta', proposte: scelte.map(riferimento) })}>Scarta quelli selezionati</button>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">{aperte.map((p) => {
        const e = normalizzaEffettoVoce(p.dati.effetto);
        return <li key={p.uid} className="flex min-w-0 flex-col gap-1 border-t border-border pt-2 text-[13px]">
          <label className="touch flex items-center gap-2"><input type="checkbox" className="h-5 w-5" disabled={occupato || (!selezionate.has(p.uid) && scelte.length >= 100)} checked={selezionate.has(p.uid)} onChange={(ev) => setSelezionate((s) => { const n = new Set(s); if (ev.target.checked) n.add(p.uid); else n.delete(p.uid); return n; })} /><strong>{titolo(p)}</strong></label>
          {(() => {
            // «Fascino 50 → 52»: cosa cambia, con i punti di adesso quando si conoscono (R10-10/4)
            const prima = p.tipo === 'dote' ? puntiDote(p.dote) : null;
            return <span className="text-[14px]"><strong>{nome(p)}</strong>{p.tipo !== 'effetto-voce' && <>: {prima !== null ? <>{prima} → <strong>{prima + p.delta}</strong> punti</> : <strong>{valore(p)}</strong>}</>}</span>;
          })()}
          <span>{p.motivo}</span>
          {!!p.promemoriaYen && <span className="rounded border border-border p-2 text-[12px]">Promemoria: questo consumo è costato ¥{p.promemoriaYen.toLocaleString('it-IT')}. L’app non tocca i tuoi yen: cambiali tu a mano.</span>}
          {identita(p)}
          {p.orfana && <span className="text-warning">La voce o il consumo da cui nasce non c’è più.</span>}
          {p.tipo !== 'effetto-voce' && p.verifica !== 'non-conteggiata' && <div className="flex flex-col gap-1 rounded border border-border p-2">
            <strong>{p.verifica === 'ignota' ? 'Hai detto che non sai se questi punti sono già nel saldo.' : 'Questi punti sono già nel tuo saldo?'}</strong>
            <span className="text-[12px] text-text-secondary">{p.verifica === 'ignota' ? 'Per aggiungerli serve saperlo: controlla nel gioco e rispondi.' : 'Serve per non contarli due volte.'}</span>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className="btn btn-secondary btn-sm touch" disabled={occupato} onClick={() => chiedi({ tipo: 'non-conteggiata', proposte: [riferimento(p)] })}>No, non ancora</button>
              <button type="button" className="btn btn-ghost btn-sm touch" disabled={occupato} onClick={() => { setDaDichiarare(p); setQuantita(''); }}>Sì, già contati…</button>
              {p.verifica !== 'ignota' && <button type="button" className="btn btn-ghost btn-sm touch" disabled={occupato} onClick={() => chiedi({ tipo: 'ignota', proposte: [riferimento(p)] })}>Non lo so</button>}
            </div>
          </div>}
          {!!p.impedimenti.filter((i) => p.verifica === 'non-conteggiata' || !i.startsWith('Prima indica')).length && <ul className="m-0 pl-4 text-warning">{p.impedimenti.filter((i) => p.verifica === 'non-conteggiata' || !i.startsWith('Prima indica')).map((i) => <li key={i}>{i}</li>)}</ul>}
          <div className="flex flex-wrap gap-1.5">
            {p.tipo === 'effetto-voce' ? <button type="button" className="btn btn-secondary btn-sm touch" disabled={occupato || !p.applicabile || !!gestoPendenteNelloScope(partitaId, { proposte: [riferimento(p)] })} onClick={() => {
              if (e?.tipo === 'acquisto' || e?.tipo === 'pesca') setConsumo(p);
              else chiedi({ tipo: 'applica-effetto', proposta: riferimento(p) });
            }}>Completa l’effetto</button> : <>
              <button type="button" className="btn btn-primary btn-sm touch" disabled={occupato || !p.applicabile} onClick={() => chiedi({ tipo: 'applica', proposte: [riferimento(p)] })}>Aggiungi i punti</button>
            </>}
            <button type="button" className="btn btn-ghost btn-sm touch" disabled={occupato} onClick={() => chiedi({ tipo: 'scarta', proposte: [riferimento(p)] })}>Scarta</button>
          </div>
        </li>;
      })}</ul>
    </>}
    {!!elenco.dati?.some((p) => p.stato !== 'aperta') && <details><summary className="touch text-[13px]">Già decise</summary><ul className="m-0 flex flex-col gap-2 pl-4 text-[12px]">{elenco.dati.filter((p) => p.stato !== 'aperta').map((p) => <li key={p.uid}><strong>{titolo(p)}</strong> · {nome(p)} · {p.stato === 'applicata' ? (p.deltaApplicato !== 0 ? `aggiunti ${p.deltaApplicato > 0 ? '+' : ''}${p.deltaApplicato}` : 'applicata') : p.motivoChiusura === 'gia-nel-saldo' ? 'già nel tuo saldo' : p.chiusaDa === 'causa' ? 'non più dovuta' : 'scartata'}{p.deltaRiconosciuto !== 0 && p.motivoChiusura !== 'beneficio-riallocato' ? ` · già contati ${p.deltaRiconosciuto}` : ''}</li>)}</ul></details>}
    {ricevuta && <p role="status" className="m-0 text-[13px] text-success">{ricevuta}</p>}
    {errore && <p role="alert" className="m-0 text-[13px] text-error">{errore}</p>}
    <Modal aperta={daDichiarare !== null} titolo="Quanti punti hai già contato?" onChiudi={() => { if (!occupato) setDaDichiarare(null); }} azioni={<>
      <button type="button" className="btn btn-ghost touch" disabled={occupato} onClick={() => setDaDichiarare(null)}>Annulla</button>
      <button type="button" className="btn btn-primary touch" disabled={occupato || !Number.isInteger(Number(quantita)) || Number(quantita) <= 0 || Number(quantita) > 9_999_999} onClick={() => { if (daDichiarare) chiedi({ tipo: 'gia-conteggiata', proposta: riferimento(daDichiarare), quantita: Number(quantita) }); }}>Avanti</button>
    </>}>
      <p>Scrivi quanti punti di {daDichiarare ? nome(daDichiarare) : ''} sono già nel tuo saldo per questa voce. Non aggiungo niente: serve solo a non contarli due volte. Se non lo sai, scegli «Non lo so».</p>
      {daDichiarare && identita(daDichiarare)}
      <label className="flex flex-col gap-1">Punti già contati ({daDichiarare ? unita(daDichiarare.unita) : ''})<input type="number" className="form-input" min={1} max={9_999_999} step={1} value={quantita} onChange={(e) => setQuantita(e.target.value)} /></label>
      {errore && <p role="alert" className="text-error">{errore}</p>}
    </Modal>
    <Modal aperta={consumo !== null} titolo={effettoConsumo?.tipo === 'pesca' ? 'Completa la pesca della voce già fatta' : 'Completa l’acquisto della voce già fatta'} onChiudi={() => { if (!occupato) setConsumo(null); }} larga>
      {consumo && effettoConsumo?.tipo === 'pesca' && uidVoce && uidEffetto ? <PreparazioneSessionePesca key={consumo.uid} partitaId={partitaId} fonte={{ tipo: 'diario', voceUid: uidVoce, effettoUid: uidEffetto }} giorno={typeof consumo.dati.giorno === 'string' ? consumo.dati.giorno : undefined} fascia={consumo.dati.fascia === 'sera' || consumo.dati.fascia === 'giorno' ? consumo.dati.fascia : undefined} confermaScrive={false}
        onConferma={async r => {
          const { revisionePescaAttesa, ...pesca } = r;
          await prepara({ tipo: 'applica-effetto', proposta: riferimento(consumo), pesca, revisionePescaAttesa });
        }} /> : consumo && effettoConsumo?.tipo === 'acquisto' && uidVoce && uidEffetto ? <PreparazioneAcquistoAojiru key={consumo.uid} partitaId={partitaId} fonte={{ tipo: 'diario', voceUid: uidVoce, effettoUid: uidEffetto }} articolo={effettoConsumo.articolo}
        onRecuperato={async () => { if (vivo.current) { setConsumo(null); await elenco.ricarica(); await onCambiato?.(); } }}
        giorno={typeof consumo.dati.giorno === 'string' ? consumo.dati.giorno : null} fascia={consumo.dati.fascia === 'sera' ? 'sera' : 'giorno'} titoloConferma="Rivedi la proposta completa" esitoConferma="Dati preparati: rivedi il riepilogo della proposta." confermaScrive={false}
        onConferma={async (r) => {
          const { revisioneAcquistiAttesa, ...acquisto } = r;
          await prepara({ tipo: 'applica-effetto', proposta: riferimento(consumo), acquisto, revisioneAcquistiAttesa });
        }} /> : <p role="alert">La proposta non contiene una fonte osservabile leggibile. Rileggi la coda; nessun dato viene ricostruito per somiglianza.</p>}
    </Modal>
    <Modal aperta={anteprima !== null} titolo="Confermi?" onChiudi={() => { if (!occupato && !incerto) setAnteprima(null); }} azioni={<>
      <button type="button" className="btn btn-ghost touch" disabled={occupato || incerto} onClick={() => setAnteprima(null)}>Annulla</button>
      <button type="button" className="btn btn-primary touch" disabled={occupato} onClick={() => void conferma()}>{incerto ? 'Riprova' : 'Conferma'}</button>
    </>}>
      {anteprima && <div className="flex flex-col gap-2 text-[13px]">
        <strong>{dicituraDecisione[anteprima.richiesta.decisione.tipo]}</strong>
        <ul className="m-0 pl-4">{anteprima.proposte.map((p) => <li key={p.uid}>{titolo(p)} · {nome(p)} {valore(p)}</li>)}</ul>
        {anteprima.richiesta.decisione.tipo === 'applica-effetto' && anteprima.richiesta.decisione.acquisto && <RiepilogoConsumoPreparato consumo={anteprima.richiesta.decisione.acquisto} />}
        {anteprima.richiesta.decisione.tipo === 'applica-effetto' && anteprima.richiesta.decisione.pesca && <RiepilogoSessionePreparata richiesta={anteprima.richiesta.decisione.pesca} sessioneFotografata={anteprima.fotografiaSessionePesca} />}
        {anteprima.movimenti.length ? <ul className="m-0 pl-4">{anteprima.movimenti.map((m, i) => <li key={`${m.tipo}:${m.chiave}:${i}`}><strong>{m.tipo === 'yen' ? 'Denaro' : m.tipo === 'punti-pesca' ? 'Punti pesca' : nomeDote(m.chiave)}: {m.prima.toLocaleString('it-IT')} → {m.dopo.toLocaleString('it-IT')}</strong> ({m.delta > 0 ? '+' : ''}{m.delta} {m.tipo === 'yen' ? 'yen' : m.tipo === 'punti-pesca' ? 'punti pesca' : 'punti'})</li>)}</ul> : <p className="m-0">Non cambia nessun punteggio.</p>}
        {anteprima.richiesta.decisione.tipo === 'gia-conteggiata' && <p className="m-0">Segno che {anteprima.richiesta.decisione.quantita} punti sono già nel tuo saldo: non ne aggiungo altri.</p>}
        {errore && <p role="alert" className="m-0 text-error">{errore}</p>}
        {incerto && <p role="alert" className="m-0 text-warning">Non è sicuro che sia andata a buon fine. «Riprova» ripete la stessa operazione una volta sola: se era già riuscita, non si duplica.</p>}
        {incerto && <GestiPartita partitaId={partitaId} onCambiato={async () => { if (vivo.current) { setAnteprima(null); setIncerto(false); await elenco.ricarica(); await onCambiato?.(); } }} />}
      </div>}
    </Modal>
  </section>;
}
