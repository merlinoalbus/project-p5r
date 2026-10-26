import { useLayoutEffect, useRef, useState } from 'react';
import { delPassato, type AnteprimaDecisioneProposteDto, type DecisioneProposte, type PropostaPartitaDto } from '../../../shared/propostePartita';
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
const nome = (p: PropostaPartitaDto) => p.dote ? nomeDote(p.dote) : p.tipo === 'yen' ? 'Denaro' : p.tipo === 'punti-pesca' ? 'Punti pesca'
  : delPassato(p) && typeof p.dati.descrizione === 'string' ? p.dati.descrizione : 'Effetto della voce';
/** Il movimento sul saldo che l'approvazione di un effetto del passato farà (negativo: il prezzo di un articolo; positivo: la ricompensa di una
 *  Richiesta; 0: nessuno); null se l'effetto non muove yen. */
const yenPrevisti = (p: PropostaPartitaDto): number | null => delPassato(p) && typeof p.dati.yenPrevisti === 'number' ? p.dati.yenPrevisti : null;
/** Il movimento previsto a parole («Approvandolo si scalano ¥500…»); con 0 solo che non cambiano (i motivi sono più d'uno: già nel saldo, sfida
 *  pagata dal turno, già comprato, già completata). */
const testoYenPrevisti = (y: number, inizio: string): string => y < 0 ? `${inizio}si scalano ¥${(-y).toLocaleString('it-IT')} dal saldo (mai sotto zero).`
  : y > 0 ? `${inizio}entrano ¥${y.toLocaleString('it-IT')} nel saldo.` : 'Gli yen non cambiano.';
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
/** Le proposte di una voce del Diario (`voceUid`) o, L13 (decisione 3), gli yen di una Richiesta completata (`richiesta`, sulla sua carta), o,
 *  L13 (decisione 19), l'elenco del passato della partita (`passati`: gli effetti di stato mai applicati di tutte le voci spuntate, per giorno). */
type PropsDaApplicare = { partitaId: number; onCambiato?: () => void | Promise<void> } & ({ voceUid: string; richiesta?: undefined; passati?: undefined } | { richiesta: string; voceUid?: undefined; passati?: undefined } | { passati: true; voceUid?: undefined; richiesta?: undefined });
export function DaApplicare(props: PropsDaApplicare) {
  return <DaApplicareNelContesto key={`${props.partitaId}:${props.passati ? 'passati' : props.voceUid ?? `richiesta:${props.richiesta}`}`} {...props} />;
}
function DaApplicareNelContesto({ partitaId, voceUid, richiesta, passati, onCambiato }: PropsDaApplicare) {
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
  // l'elenco del passato: solo le proposte aperte (quelle decise escono dall'elenco), in ordine di giorno e di voce
  const dellaVoce = passati
    ? (elenco.dati ?? []).filter((p) => delPassato(p) && p.stato === 'aperta').sort((a, b) => String(a.dati.giorno ?? '').localeCompare(String(b.dati.giorno ?? '')) || (a.voceTesto ?? '').localeCompare(b.voceTesto ?? '') || a.id - b.id)
    : (elenco.dati ?? []).filter((p) => (richiesta !== undefined ? p.causa.tipo === 'richiesta' && p.causa.chiave === richiesta : p.voceUid === voceUid || p.dati.voceUid === voceUid));
  const aperte = dellaVoce.filter((p) => p.stato === 'aperta');
  // L13 (revisione R2, WCAG 2.4.3): decisa una proposta, la sua riga esce dall'elenco con il pulsante che aveva aperto «Confermi?», e il fuoco
  // finiva su <body> (fuori anche dalla finestra «Da approvare nella partita»). Quando l'elenco cambia dopo una decisione e il fuoco è andato
  // perso, va subito alla finestra che contiene l'elenco (o all'elenco stesso), e appena i pulsanti tornano attivi (finita la rilettura) al primo
  // pulsante della prima voce rimasta: si continua con la tastiera da dove si era
  const sezione = useRef<HTMLElement | null>(null);
  const fuoco = useRef<{ fase: 'decisa'; elenco: string } | { fase: 'ripiego'; dove: HTMLElement } | null>(null);
  const chiaveAperte = aperte.map((p) => p.uid).join(',');
  useLayoutEffect(() => {
    const f = fuoco.current, s = sezione.current;
    if (!f || !s) return;
    if (f.fase === 'decisa') {
      if (f.elenco === chiaveAperte) return;
      const attivo = document.activeElement, dove = s.closest<HTMLElement>('.modal-content') ?? s;
      // la finestra stessa conta come fuoco perso: è dove lo mette `Modal` quando il pulsante che aveva aperto «Confermi?» non c'è più
      if (attivo && attivo !== document.body && attivo !== dove && attivo.isConnected) { fuoco.current = null; return; }
      if (attivo !== dove) dove.focus();
      fuoco.current = { fase: 'ripiego', dove };
    }
    const r = fuoco.current;
    if (r?.fase !== 'ripiego' || occupato) return;
    fuoco.current = null;
    // solo i pulsanti delle proposte (non quelli del registro dei gesti, che sta nella stessa sezione)
    const primo = s.querySelector<HTMLElement>('[data-elenco-proposte] > li button:not([disabled])');
    if (primo && document.activeElement === r.dove) primo.focus();
  }, [chiaveAperte, occupato]);
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
      fuoco.current = { fase: 'decisa', elenco: aperte.map((p) => p.uid).join(',') };
      // l'eventuale avanzamento della partita (chiusa l'ultima decisione aperta di una fascia/giornata già spuntata) lo applica già il registro dei gesti
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
  return <section ref={sezione} tabIndex={-1} className="flex min-w-0 flex-col gap-2 rounded border border-border p-2" aria-label={passati ? 'Effetti delle voci già spuntate da approvare' : richiesta !== undefined ? 'Yen da applicare per questa Richiesta' : 'Punti da applicare per questa voce'}>
    <GestiPartita partitaId={partitaId} onCambiato={async () => { if (vivo.current) { setAnteprima(null); setIncerto(false); await elenco.ricarica(); await onCambiato?.(); } }} />
    {elenco.caricamento && !elenco.dati && <p role="status" className="m-0 testo-13">Un attimo…</p>}
    {elenco.errore && <p role="alert" className="m-0 text-error-testo">{elenco.errore}</p>}
    {!!aperte.length && <>
      <ul className="m-0 flex list-none flex-col gap-2 p-0" data-elenco-proposte="">{aperte.map((p, i) => {
        const e = normalizzaEffettoVoce(p.dati.effetto);
        // nell'elenco del passato il giorno e la voce fanno da intestazione del gruppo (una volta per voce)
        const gruppo = passati && (i === 0 || titolo(aperte[i - 1]!) !== titolo(p)) ? titolo(p) : null;
        const giornoGruppo = typeof p.dati.giorno === 'string' ? dataLeggibile(p.dati.giorno) : null;
        const previsti = yenPrevisti(p);
        return <li key={p.uid} className={`flex min-w-0 flex-col gap-1 testo-13 ${gruppo && i > 0 ? 'mt-2 border-t border-border pt-2' : ''}`}>
          {/* un'intestazione vera (i lettori di schermo ci saltano), in maiuscolo solo il giorno: il testo intero della voce resta leggibile */}
          {gruppo && <h3 className="m-0 testo-13 font-semibold break-words text-pretty">{giornoGruppo ? <><span className="font-display uppercase tracking-wide text-primary-testo">{giornoGruppo}</span>{p.voceTesto ? ` · ${p.voceTesto}` : ''}</> : gruppo}</h3>}
          {(() => {
            // «Fascino 50 → 52»: cosa cambia, con i punti di adesso quando si conoscono (R10-10/4)
            const prima = p.tipo === 'dote' ? puntiDote(p.dote) : null;
            return <span className="testo-14"><strong>{nome(p)}</strong>{p.tipo !== 'effetto-voce' && <>: {prima !== null ? <>{prima} → <strong>{prima + p.delta}</strong> punti</> : <strong>{valore(p)}</strong>}</>}</span>;
          })()}
          {/* il motivo del censimento non vale più se lo stato è stato segnato dopo (revisione R7): lo dice il server, letto adesso */}
          <span className="text-pretty">{delPassato(p) && p.dati.oraGiaVero === true ? 'Ora risulta già vero in questa partita (segnato dopo): applicandolo lo stato non cambia, la voce lo ricorda fra i suoi effetti.' : p.motivo}</span>
          {previsti !== null && <span className="testo-12 text-text-secondary tabular-nums">{testoYenPrevisti(previsti, 'Approvandolo ')}</span>}
          {/* 2026-10-26: la Persona «anche nella scorta» con la scorta piena entra lo stesso; lo si dice prima di approvare (solo se è così) */}
          {delPassato(p) && typeof p.dati.avvisoScorta === 'string' && <span className="testo-12 text-warning text-pretty tabular-nums">{p.dati.avvisoScorta}</span>}
          {!!p.promemoriaYen && <span className="rounded border border-border p-2 testo-12">Costo del consumo: ¥{p.promemoriaYen.toLocaleString('it-IT')}</span>}
          {p.orfana && <span className="text-warning">{p.causa.tipo === 'richiesta' ? 'La Richiesta da cui nasce non c’è più.' : 'La voce o il consumo da cui nasce non c’è più.'}</span>}
          {(() => {
            // «Applica» non chiede più «già nel saldo?»: premerlo dice che i punti non sono ancora contati; chi li ha già contati lo dice a parte
            const soloVerifica = p.impedimenti.every((i) => i.startsWith('Prima indica'));
            const altri = p.impedimenti.filter((i) => !i.startsWith('Prima indica'));
            const inverso = p.delta < 0;
            const etichetta = `${inverso ? 'Annulla' : 'Applica'} ${nome(p)}${p.tipo === 'effetto-voce' ? '' : ` ${p.delta > 0 ? '+' : ''}${p.delta}`}`;
            return <>
              {!!altri.length && <ul className="m-0 pl-4 text-warning">{altri.map((i) => <li key={i}>{i}</li>)}</ul>}
              <div className="flex flex-wrap gap-1.5">
                {p.tipo === 'effetto-voce' ? <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="raggiunto" dimensione={20} />} titolo={e?.tipo === 'acquisto' && e.variante ? `Applica ${nomeDote(e.variante)}` : delPassato(p) ? 'Applica alla partita' : 'Completa l’effetto'} disabled={occupato || !p.applicabile || !!gestoPendenteNelloScope(partitaId, { proposte: [riferimento(p)] })} onClick={() => {
                  if (e?.tipo === 'acquisto' || e?.tipo === 'pesca') setConsumo(p);
                  else chiedi({ tipo: 'applica-effetto', proposta: riferimento(p) });
                }} /> : <>
                  <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave={inverso ? 'annulla-ultimo' : 'raggiunto'} dimensione={20} />} titolo={etichetta} disabled={occupato || !(p.applicabile || (soloVerifica && !p.orfana))} onClick={() => void applica(p)} />
                  {!inverso && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="raggiunto" dimensione={20} />} titolo="L’ho già segnato a mano" disabled={occupato} onClick={() => chiedi({ tipo: 'gia-conteggiata', proposta: riferimento(p), quantita: Math.abs(p.delta) })} />}
                </>}
                {/* L13 (revisione R3): per l'elenco del passato il rifiuto ha un nome vero in ogni caso (già segnato a mano, o mai fatto in partita) */}
                {p.tipo === 'effetto-voce' && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave={delPassato(p) ? 'scarta' : 'raggiunto'} dimensione={20} />} titolo={delPassato(p) ? 'Non applicare' : 'L’ho già segnato a mano'} disabled={occupato} onClick={() => chiedi({ tipo: 'scarta', proposte: [riferimento(p)] })} />}
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
        <strong>{anteprima.richiesta.decisione.tipo === 'scarta' && anteprima.proposte.length > 0 && anteprima.proposte.every(delPassato) ? 'Non applicare: esce dall’elenco, la partita non cambia' : dicituraDecisione[anteprima.richiesta.decisione.tipo]}</strong>
        <ul className="m-0 pl-4">{anteprima.proposte.map((p) => <li key={p.uid}>{titolo(p)} · {nome(p)}{p.tipo === 'effetto-voce' ? '' : ` ${valore(p)}`}</li>)}</ul>
        {anteprima.richiesta.decisione.tipo === 'applica-effetto' && anteprima.richiesta.decisione.acquisto && <RiepilogoConsumoPreparato consumo={anteprima.richiesta.decisione.acquisto} />}
        {anteprima.richiesta.decisione.tipo === 'applica-effetto' && anteprima.richiesta.decisione.pesca && <RiepilogoSessionePreparata richiesta={anteprima.richiesta.decisione.pesca} sessioneFotografata={anteprima.fotografiaSessionePesca} />}
        {anteprima.richiesta.decisione.tipo === 'applica-effetto' && anteprima.proposte.some((p) => yenPrevisti(p) !== null) ? <p className="m-0 tabular-nums">{testoYenPrevisti(anteprima.proposte.reduce((s, p) => s + (yenPrevisti(p) ?? 0), 0), 'Denaro: ')}</p>
          : anteprima.movimenti.length ? <ul className="m-0 pl-4">{anteprima.movimenti.map((m, i) => <li key={`${m.tipo}:${m.chiave}:${i}`}><strong>{m.tipo === 'yen' ? 'Denaro' : m.tipo === 'punti-pesca' ? 'Punti pesca' : nomeDote(m.chiave)}: {m.prima.toLocaleString('it-IT')} → {m.dopo.toLocaleString('it-IT')}</strong> ({m.delta > 0 ? '+' : ''}{m.delta} {m.tipo === 'yen' ? 'yen' : m.tipo === 'punti-pesca' ? 'punti pesca' : 'punti'})</li>)}</ul> : <p className="m-0">Non cambia nessun punteggio.</p>}
        {anteprima.richiesta.decisione.tipo === 'gia-conteggiata' && <p className="m-0">Segno che {anteprima.richiesta.decisione.quantita} punti sono già nel tuo saldo: non ne aggiungo altri.</p>}
        {errore && <p role="alert" className="m-0 text-error-testo">{errore}</p>}
        {incerto && <p role="alert" className="m-0 text-warning">Non è sicuro che sia andata a buon fine. «Riprova» ripete la stessa operazione una volta sola: se era già riuscita, non si duplica.</p>}
        {incerto && <GestiPartita partitaId={partitaId} onCambiato={async () => { if (vivo.current) { setAnteprima(null); setIncerto(false); await elenco.ricarica(); await onCambiato?.(); } }} />}
      </div>}
    </Modal>
  </section>;
}
