import { useLayoutEffect, useRef, useState } from 'react';
import type { AnteprimaDecisioneProposteDto, DecisioneProposte, PropostaPartitaDto } from '../../../shared/propostePartita';
import { normalizzaEffettoVoce } from '../../../shared/effettiVoce';
import { nomeDote } from '../../../shared/doti';
import { anteprimaDecisioneProposte, getDaApplicare, getDoti } from '../../services/api';
import { dataLeggibile } from '../../../shared/condizioniSpillo';
import { useCarica } from '../../hooks/useCarica';
import { usePartitaStore } from '../../stores/partitaStore';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { PreparazioneAcquistoAojiru, RiepilogoConsumoPreparato } from '../catalogo/ConsumiAojiru';
import { Modal } from '../shared/Modal';
import { decidiProposteConRegistro, gestoPendenteNelloScope, useGestiPartita } from '../../services/gestiPartita';
import { GestiPartita } from './GestiPartita';
import { PreparazioneSessionePesca, RiepilogoSessionePreparata } from '../pesca/PreparazioneSessionePesca';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

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

/**
 * I punti di una voce spuntata che non sono ancora nella partita, con il pulsante «Applica» sulla voce (BON-01): nessun pannello a
 * parte. Nessun saldo cambia senza una decisione esplicita (D6). Senza proposte aperte né decise per la voce non mostra niente.
 */
export function DaApplicare(props: { partitaId: number; voceUid: string; onCambiato?: () => void | Promise<void> }) {
  return <DaApplicareNelContesto key={`${props.partitaId}:${props.voceUid}`} {...props} />;
}
function DaApplicareNelContesto({ partitaId, voceUid, onCambiato }: { partitaId: number; voceUid: string; onCambiato?: () => void | Promise<void> }) {
  const gesti = useGestiPartita();
  const elenco = useCarica(() => getDaApplicare(partitaId), [partitaId, gesti.versionePerPartita[partitaId] ?? 0, gesti.versioneGuida]);
  // i punti attuali delle Doti, per dire «Fascino 50 → 52» (R10-10/4); si rileggono quando la partita cambia
  const doti = useCarica(() => getDoti(partitaId), [partitaId, gesti.versionePerPartita[partitaId] ?? 0, gesti.versioneGuida]);
  const puntiDote = (chiave: string | null): number | null => (chiave ? doti.dati?.find((d) => d.chiave === chiave)?.punti ?? null : null);
  const [anteprima, setAnteprima] = useState<AnteprimaDecisioneProposteDto | null>(null);
  const [consumo, setConsumo] = useState<PropostaPartitaDto | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [incerto, setIncerto] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [ricevuta, setRicevuta] = useState<string | null>(null);
  const blocco = useRef(false);
  const vivo = useRef(true);
  useLayoutEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const dellaVoce = (elenco.dati ?? []).filter((p) => p.voceUid === voceUid || p.dati.voceUid === voceUid);
  const aperte = dellaVoce.filter((p) => p.stato === 'aperta');
  /** Annulla il non ancora contato e applica: chi preme «Applica» dice implicitamente che i punti non sono ancora nel saldo. */
  const applica = async (p: PropostaPartitaDto) => {
    if (blocco.current) return;
    if (p.verifica !== 'non-conteggiata') {
      blocco.current = true; setOccupato(true); setErrore(null); setRicevuta(null);
      try {
        const a = await anteprimaDecisioneProposte(partitaId, { operazioneId: crypto.randomUUID().replaceAll('-', ''), decisione: { tipo: 'non-conteggiata', proposte: [riferimento(p)] } });
        await decidiProposteConRegistro(partitaId, { ...a.richiesta, revisioneProposteAttesa: a.revisioneProposteAttesa }, { etichetta: 'Punti non ancora contati' });
        await elenco.ricarica();
      } catch (e) { if (vivo.current) setErrore(testoErrore(e)); return; }
      finally { blocco.current = false; if (vivo.current) setOccupato(false); }
    }
    chiedi({ tipo: 'applica', proposte: [riferimento(p)] });
  };
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
      if (vivo.current) { setAnteprima(a); setConsumo(null); }
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
        setAnteprima(null); setIncerto(false);
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
  if (elenco.dati && !dellaVoce.length && !anteprima && !consumo && !ricevuta) return null;
  return <section className="flex min-w-0 flex-col gap-2 rounded border border-border p-2" aria-label="Punti da applicare per questa voce">
    <GestiPartita partitaId={partitaId} onCambiato={async () => { if (vivo.current) { setAnteprima(null); setIncerto(false); await elenco.ricarica(); await onCambiato?.(); } }} />
    {elenco.caricamento && !elenco.dati && <p role="status" className="m-0 testo-13">Un attimo…</p>}
    {elenco.errore && <p role="alert" className="m-0 text-error-testo">{elenco.errore}</p>}
    {!!aperte.length && <>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">{aperte.map((p) => {
        const e = normalizzaEffettoVoce(p.dati.effetto);
        return <li key={p.uid} className="flex min-w-0 flex-col gap-1 testo-13">
          {(() => {
            // «Fascino 50 → 52»: cosa cambia, con i punti di adesso quando si conoscono (R10-10/4)
            const prima = p.tipo === 'dote' ? puntiDote(p.dote) : null;
            return <span className="testo-14"><strong>{nome(p)}</strong>{p.tipo !== 'effetto-voce' && <>: {prima !== null ? <>{prima} → <strong>{prima + p.delta}</strong> punti</> : <strong>{valore(p)}</strong>}</>}</span>;
          })()}
          <span>{p.motivo}</span>
          {!!p.promemoriaYen && <span className="rounded border border-border p-2 testo-12">Promemoria: questo consumo è costato ¥{p.promemoriaYen.toLocaleString('it-IT')}. L’app non tocca i tuoi yen: cambiali tu a mano.</span>}
          {p.orfana && <span className="text-warning">La voce o il consumo da cui nasce non c’è più.</span>}
          {(() => {
            // «Applica» non chiede più «già nel saldo?»: premerlo dice che i punti non sono ancora contati; chi li ha già contati lo dice a parte
            const soloVerifica = p.impedimenti.every((i) => i.startsWith('Prima indica'));
            const altri = p.impedimenti.filter((i) => !i.startsWith('Prima indica'));
            const inverso = p.delta < 0;
            const etichetta = `${inverso ? 'Annulla' : 'Applica'} ${nome(p)}${p.tipo === 'effetto-voce' ? '' : ` ${p.delta > 0 ? '+' : ''}${p.delta}`}`;
            return <>
              {!!altri.length && <ul className="m-0 pl-4 text-warning">{altri.map((i) => <li key={i}>{i}</li>)}</ul>}
              <div className="flex flex-wrap gap-1.5">
                {p.tipo === 'effetto-voce' ? <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="raggiunto" dimensione={20} />} titolo={e?.tipo === 'acquisto' && e.variante ? `Applica ${nomeDote(e.variante)}` : 'Completa l’effetto'} disabled={occupato || !p.applicabile || !!gestoPendenteNelloScope(partitaId, { proposte: [riferimento(p)] })} onClick={() => {
                  if (e?.tipo === 'acquisto' || e?.tipo === 'pesca') setConsumo(p);
                  else chiedi({ tipo: 'applica-effetto', proposta: riferimento(p) });
                }} /> : <>
                  <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave={inverso ? 'annulla-ultimo' : 'raggiunto'} dimensione={20} />} titolo={etichetta} disabled={occupato || !(p.applicabile || (soloVerifica && !p.orfana))} onClick={() => void applica(p)} />
                  {!inverso && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="raggiunto" dimensione={20} />} titolo="L’ho già segnato a mano" disabled={occupato} onClick={() => chiedi({ tipo: 'gia-conteggiata', proposta: riferimento(p), quantita: Math.abs(p.delta) })} />}
                </>}
                {p.tipo === 'effetto-voce' && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="raggiunto" dimensione={20} />} titolo="L’ho già segnato a mano" disabled={occupato} onClick={() => chiedi({ tipo: 'scarta', proposte: [riferimento(p)] })} />}
              </div>
            </>;
          })()}
        </li>;
      })}</ul>
    </>}
    {dellaVoce.some((p) => p.stato !== 'aperta') && <details><summary className="touch testo-13">Già deciso</summary><ul className="m-0 flex flex-col gap-2 pl-4 testo-12">{dellaVoce.filter((p) => p.stato !== 'aperta').map((p) => <li key={p.uid}>{nome(p)} ·{p.stato === 'applicata' ? (p.deltaApplicato !== 0 ? `aggiunti ${p.deltaApplicato > 0 ? '+' : ''}${p.deltaApplicato}` : 'applicata') : p.motivoChiusura === 'gia-nel-saldo' ? 'già nel tuo saldo' : p.chiusaDa === 'causa' ? 'non più dovuta' : 'scartata'}{p.deltaRiconosciuto !== 0 && p.motivoChiusura !== 'beneficio-riallocato' ? ` · già contati ${p.deltaRiconosciuto}` : ''}</li>)}</ul></details>}
    {ricevuta && <p role="status" className="m-0 testo-13 text-success">{ricevuta}</p>}
    {errore && <p role="alert" className="m-0 testo-13 text-error-testo">{errore}</p>}
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
      <PulsanteVisivo tono="primario" icona={<IconaAzione chiave={incerto ? 'riprova' : 'raggiunto'} dimensione={22} />} titolo={incerto ? 'Riprova' : 'Conferma'} disabled={occupato} onClick={() => void conferma()} />
    </>}>
      {anteprima && <div className="flex flex-col gap-2 testo-13">
        <strong>{dicituraDecisione[anteprima.richiesta.decisione.tipo]}</strong>
        <ul className="m-0 pl-4">{anteprima.proposte.map((p) => <li key={p.uid}>{titolo(p)} · {nome(p)} {valore(p)}</li>)}</ul>
        {anteprima.richiesta.decisione.tipo === 'applica-effetto' && anteprima.richiesta.decisione.acquisto && <RiepilogoConsumoPreparato consumo={anteprima.richiesta.decisione.acquisto} />}
        {anteprima.richiesta.decisione.tipo === 'applica-effetto' && anteprima.richiesta.decisione.pesca && <RiepilogoSessionePreparata richiesta={anteprima.richiesta.decisione.pesca} sessioneFotografata={anteprima.fotografiaSessionePesca} />}
        {anteprima.movimenti.length ? <ul className="m-0 pl-4">{anteprima.movimenti.map((m, i) => <li key={`${m.tipo}:${m.chiave}:${i}`}><strong>{m.tipo === 'yen' ? 'Denaro' : m.tipo === 'punti-pesca' ? 'Punti pesca' : nomeDote(m.chiave)}: {m.prima.toLocaleString('it-IT')} → {m.dopo.toLocaleString('it-IT')}</strong> ({m.delta > 0 ? '+' : ''}{m.delta} {m.tipo === 'yen' ? 'yen' : m.tipo === 'punti-pesca' ? 'punti pesca' : 'punti'})</li>)}</ul> : <p className="m-0">Non cambia nessun punteggio.</p>}
        {anteprima.richiesta.decisione.tipo === 'gia-conteggiata' && <p className="m-0">Segno che {anteprima.richiesta.decisione.quantita} punti sono già nel tuo saldo: non ne aggiungo altri.</p>}
        {errore && <p role="alert" className="m-0 text-error-testo">{errore}</p>}
        {incerto && <p role="alert" className="m-0 text-warning">Non è sicuro che sia andata a buon fine. «Riprova» ripete la stessa operazione una volta sola: se era già riuscita, non si duplica.</p>}
        {incerto && <GestiPartita partitaId={partitaId} onCambiato={async () => { if (vivo.current) { setAnteprima(null); setIncerto(false); await elenco.ricarica(); await onCambiato?.(); } }} />}
      </div>}
    </Modal>
  </section>;
}
