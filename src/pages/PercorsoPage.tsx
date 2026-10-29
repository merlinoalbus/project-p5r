// ============================================================
// PercorsoPage — guida giorno per giorno: cosa fare oggi (giorno e sera), dove, con chi, avvisi; azioni spuntabili e giorno corrente della partita (Fase 7.5b)
// ============================================================

import { useEffect, useId, useMemo, useState } from 'react';
import { Selettore } from '../components/shared/Selettore';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BarraRicercaDiario, BarraRitornoRisultati, RisultatiRicercaDiario } from '../components/guida/RicercaDiario';
import { useRicercaDiario } from '../hooks/useRicercaDiario';
import { leggiRitornoRicerca, parametriRicerca, testoSufficiente, tipoDaIndirizzo, type RitornoRicercaDiario } from '../utils/ricercaDiario';
import type { TipoAzione } from '../../shared/effettiAzione';
import { profonditaDaStato } from '../utils/pannelloScheda';
import { getPercorsoGiorno, getPercorsoIndice, impostaGiornoCorrente } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { useSuggerimentiStore } from '../stores/suggerimentiStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { IconChevronLeft, IconChevronRight } from '../components/shared/icons';
import { dataGiocoTesto, meseGioco } from '../utils/dateGioco';
import type { AzionePercorsoDto } from '../types';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { GiornoGuida } from '../components/guida/GiornoGuida';
import { EditorGiorno } from '../components/guida/EditorGiorno';
import { GestiPartita } from '../components/partita/GestiPartita';
import { ProviderPannelloScheda } from '../components/scheda/PannelloScheda';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';
/** Quanto aspetta la ricerca nel Diario dopo l'ultima lettera scritta, prima di partire. */
const RITARDO_RICERCA_MS = 300;
/** Nello stato della voce di cronologia: questa voce l'ha aggiunta la pagina entrando nella ricerca (vedi `scriviRicerca`). */
const RICERCA_AGGIUNTA = 'ricercaAggiunta';

/**
 * Guida giorno per giorno: carica l'indice dei giorni per la partita attiva e il giorno preso
 * dall'URL (altrimenti il giorno corrente della partita, altrimenti il primo dell'indice). Offre
 * la navigazione al giorno precedente e successivo, i selettori di mese e giorno (con le azioni
 * fatte sul totale), il ritorno a oggi e il comando per fissare il giorno come corrente; sotto, la
 * giornata con le azioni da spuntare. Una spunta sostituisce la riga nei dati correnti e
 * ricarica l'indice.
 */
export function PercorsoPage() {
  const { data: dataParam } = useParams();
  const [parametri] = useSearchParams();
  const posizione = useLocation();
  // la voce da mostrare: `?voce=<uid>` o l'ancora `#voce-<uid>` (ritorno da un Palazzo, voce aperta dalla ricerca)
  const voceDaMostrare = parametri.get('voce') ?? (posizione.hash.startsWith('#voce-') ? posizione.hash.slice('#voce-'.length) : undefined);
  const navigate = useNavigate();
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  // ---- ricerca nel Diario (2026-10-29): testo e tipo nell'indirizzo (`?q=&tipo=`); con uno dei due la pagina mostra i risultati al posto del giorno
  const qIndirizzo = parametri.get('q') ?? '';
  const tipoRicerca = tipoDaIndirizzo(parametri.get('tipo'));
  // con una lettera sola (e nessun tipo) il giorno resta: sul telefono una pausa fra due lettere non deve farlo sparire
  const ricercaAttiva = testoSufficiente(qIndirizzo) || tipoRicerca !== null;
  const idCampoRicerca = useId();
  // il campo segue ciò che si scrive; l'indirizzo lo segue con un piccolo ritardo (`RITARDO_RICERCA_MS`). Se l'indirizzo cambia da fuori
  // (indietro, «Torna ai risultati») il campo lo riprende, salvo che sia il testo appena scritto da qui
  const [testoRicerca, setTestoRicerca] = useState(qIndirizzo);
  const [qVisto, setQVisto] = useState(qIndirizzo);
  const [qInviato, setQInviato] = useState(qIndirizzo);
  if (qIndirizzo !== qVisto) {
    setQVisto(qIndirizzo);
    if (qIndirizzo !== qInviato) { setTestoRicerca(qIndirizzo); setQInviato(qIndirizzo); }
  }
  // la voce di cronologia aggiunta entrando nella ricerca (`RICERCA_AGGIUNTA` nel suo stato): «indietro» da lì torna al giorno di prima
  const ricercaAggiunta = (posizione.state as Record<string, unknown> | null)?.[RICERCA_AGGIUNTA] === true;
  /**
   * Scrive testo e tipo nell'indirizzo, togliendo la voce da mostrare. Entrando nella ricerca (l'indirizzo non ne aveva) aggiunge UNA voce di
   * cronologia, così «indietro» del sistema dai risultati torna al giorno da cui si è partiti invece di uscire dalla Guida; scrivendo e
   * cambiando tipo poi la sostituisce (le lettere non riempiono «indietro»). Uscendo dalla ricerca (campo vuoto e nessun tipo) da quella voce si
   * torna indietro di un passo, al giorno com'era; se la voce non l'ha aggiunta la pagina (indirizzo aperto già con `?q=`, ritorno ricostruito
   * da «Torna ai risultati») si sostituisce, come prima.
   */
  const scriviRicerca = (q: string, tipo: TipoAzione | null) => {
    setQInviato(q);
    const conRicerca = q.trim() !== '' || tipo !== null;
    const idx = (window.history.state as { idx?: unknown } | null)?.idx;
    if (!conRicerca && ricercaAggiunta && typeof idx === 'number' && idx >= 1) { void navigate(-1); return; }
    const n = new URLSearchParams(parametri);
    if (q.trim()) n.set('q', q); else n.delete('q');
    if (tipo) n.set('tipo', tipo); else n.delete('tipo');
    n.delete('voce');
    const s = n.toString();
    const verso = { pathname: posizione.pathname, search: s ? `?${s}` : '' };
    const entra = conRicerca && !ricercaAggiunta && !qIndirizzo.trim() && tipoRicerca === null;
    void navigate(verso, { replace: !entra, state: entra || ricercaAggiunta ? { [RICERCA_AGGIUNTA]: true } : undefined });
  };
  useEffect(() => {
    if (testoRicerca === qInviato) return;
    // svuotare il campo vale subito (si torna al giorno senza aspettare)
    const t = setTimeout(() => scriviRicerca(testoRicerca, tipoRicerca), testoRicerca.trim() ? RITARDO_RICERCA_MS : 0);
    return () => clearTimeout(t);
  });
  const ricerca = useRicercaDiario(qIndirizzo, tipoRicerca, partitaId);
  const ritornoRicerca = leggiRitornoRicerca(posizione.state);
  const voceDiRitorno = (posizione.state as { voceDiRitorno?: unknown } | null)?.voceDiRitorno;
  /** «Cancella ricerca»: torna al giorno (un passo indietro se la ricerca aveva aggiunto la sua voce di cronologia) e rimette il fuoco nel campo. */
  const cancellaRicerca = () => {
    setTestoRicerca('');
    scriviRicerca('', null);
    setTimeout(() => document.getElementById(idCampoRicerca)?.focus());
  };
  /**
   * «Torna ai risultati»: la ricerca da cui si è aperta la voce, nello stesso punto (la riga della voce riprende il fuoco). Si torna indietro
   * nella cronologia di tanti passi quanti ne sono stati fatti dai risultati (la loro voce ricorda già la riga, `RigaRisultato`): la
   * cronologia non si allunga e un «indietro» dopo non ripassa dal giorno. Se quei passi non ci sono (stato senza conteggio, cronologia più
   * corta), si sostituisce la pagina con la ricerca.
   */
  const tornaAiRisultati = (r: RitornoRicercaDiario) => {
    const idx = (window.history.state as { idx?: unknown } | null)?.idx;
    // con una scheda aperta nel pannello sopra il diario, anche le sue voci di cronologia (che portano con sé `ritornoRicerca`)
    const passi = r.passi >= 1 ? r.passi + profonditaDaStato(posizione.state) : 0;
    if (passi >= 1 && typeof idx === 'number' && idx >= passi) { void navigate(-passi); return; }
    void navigate({ pathname: posizione.pathname, search: parametriRicerca(r.q, r.tipo) }, { replace: true, state: { voceDiRitorno: r.voce } });
  };
  const indice = useCarica(() => getPercorsoIndice(partitaId ?? undefined), [partitaId]);
  const data = dataParam ?? indice.dati?.dataCorrente ?? indice.dati?.giorni[0]?.giorno ?? null;
  const giorno = useCarica(() => (data ? getPercorsoGiorno(data, partitaId ?? undefined) : Promise.resolve(null)), [data, partitaId]);
  const g = giorno.dati;
  const giornoCaricato = g?.giorno;
  useEffect(() => {
    if (!giornoCaricato || !voceDaMostrare) return;
    const riga = document.getElementById(`voce-${voceDaMostrare}`);
    if (!riga) return;
    riga.scrollIntoView({ block: 'center' });
    // la voce aperta (dalla ricerca, dall'«Esci» di un Palazzo) prende anche il fuoco, così il Tab riparte da lì: solo se il fuoco non è su
    // un comando della pagina (è sul documento, perché il collegamento toccato è sparito, o sul titolo messo dal cambio di pagina)
    const ora = document.activeElement;
    if (ora && ora !== document.body && ora.tagName !== 'H1' && ora.tagName !== 'MAIN') return;
    if (!riga.hasAttribute('tabindex')) {
      riga.setAttribute('tabindex', '-1');
      riga.addEventListener('blur', () => riga.removeAttribute('tabindex'), { once: true });
    }
    riga.focus({ preventScroll: true });
  }, [giornoCaricato, voceDaMostrare]);
  useDocumentTitle(ricercaAttiva ? `Ricerca nel Diario${qIndirizzo.trim() ? ` «${qIndirizzo.trim()}»` : ''} — Guida giorno per giorno` : g ? `${dataGiocoTesto(g.giorno)} — Guida giorno per giorno` : 'Guida giorno per giorno');
  const [occupatoGiorno, setOccupatoGiorno] = useState(false);
  const [editorGiornoAperto, setEditorGiornoAperto] = useState(false);
  const mesi = useMemo(() => [...new Set((indice.dati?.giorni ?? []).map((x) => x.giorno.slice(0, 2)))], [indice.dati]);
  const giorniDelMese = useMemo(() => (indice.dati?.giorni ?? []).filter((x) => data && x.giorno.slice(0, 2) === data.slice(0, 2)), [indice.dati, data]);
  // la riga spuntata si sostituisce subito; l'indice si ricarica perché il selettore del giorno mostra «fatte/azioni»
  // dai dati correnti (forma funzionale): la risposta arriva dopo un `await`, e partire dalla `g` di questo render annullerebbe
  // una seconda spunta fatta nel frattempo
  const aggiorna = (a: AzionePercorsoDto) => {
    giorno.imposta((attuale) => { const azioni = attuale.azioni.map((x) => (x.uid === a.uid ? a : x)); return { ...attuale, azioni, fatte: azioni.filter((x) => x.fatta).length }; });
    void indice.ricarica();
  };
  /** Fissa il giorno mostrato come giorno corrente della partita: aggiorna giorno e indice locali, allinea la partita nello store, invalida i suggerimenti del giorno e notifica l'esito. */
  const segnaCorrente = async () => {
    if (!partitaId || !g) return;
    setOccupatoGiorno(true);
    try {
      const esito = await impostaGiornoCorrente(partitaId, g.giorno);
      giorno.imposta((attuale) => ({ ...attuale, dataCorrente: g.giorno }));
      indice.imposta((attuale) => ({ ...attuale, dataCorrente: g.giorno }));
      // la data di gioco vive in `partitaStore.attiva`: si allinea alla partita restituita dal server e i suggerimenti del giorno vengono ricaricati
      usePartitaStore.getState().aggiornaLocale(esito.partita);
      useSuggerimentiStore.getState().invalida();
      notifica('success', `Giorno corrente: ${dataGiocoTesto(g.giorno)}.`);
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupatoGiorno(false); }
  };
  /** Apre la pagina di un altro giorno; con null non fa niente. Aperta una voce dalla ricerca, «Torna ai risultati» resta anche negli altri
   *  giorni e conta un passo in più (più quelli del pannello aperto) per tornare indietro fino ai risultati. */
  const vai = (d: string | null) => { if (d) navigate(`/guida/percorso/${d}`, { state: ritornoRicerca ? { ritornoRicerca: { ...ritornoRicerca, passi: ritornoRicerca.passi >= 1 ? ritornoRicerca.passi + profonditaDaStato(posizione.state) + 1 : 0 } } : undefined }); };
  return (
    <PageState isLoading={(indice.caricamento && !indice.dati) || (giorno.caricamento && !g)} error={indice.errore ?? giorno.errore} onRetry={() => { void indice.ricarica(); void giorno.ricarica(); }}>
      {indice.dati && g && (
        // R10-27: nella Guida › Giorno per giorno la scheda di un oggetto citato da una voce si apre in un pannello sopra il diario
        <ProviderPannelloScheda>
        <div className="flex flex-col gap-3">
          {/* con la ricerca attiva l'intestazione resta il solo titolo: lo spazio in alto va alla barra e ai risultati */}
          <IntestazionePagina titolo="Guida giorno per giorno" compatta={ricercaAttiva} sottotitolo={ricercaAttiva ? undefined : <>Percorso al 100% dalla soluzione allgamestaff: trama del giorno, cosa fare di giorno e di sera, con chi e dove, avvisi sulle scadenze. {indice.dati.giorniCoperti} giorni con azioni su {indice.dati.totaleGiorni}.{partitaId ? (indice.dati.dataCorrente ? ` Giorno corrente della partita «${attiva?.nome}»: ${dataGiocoTesto(indice.dati.dataCorrente)}.` : ' Imposta il giorno corrente per ritrovare subito il punto in cui sei.') : ' Attiva una partita per spuntare le azioni e fissare il giorno corrente.'}</>} />
          {/* la barra sta nello stesso punto con e senza ricerca: scrivendo, il campo non perde il fuoco quando il giorno lascia il posto ai risultati */}
          <BarraRicercaDiario testo={testoRicerca} onTesto={setTestoRicerca} tipo={tipoRicerca} onTipo={(t) => scriviRicerca(testoRicerca, t)} attiva={ricercaAttiva} onCancella={cancellaRicerca} perTipo={ricerca.dati?.perTipo} idCampo={idCampoRicerca} />
          {ricercaAttiva ? (
            <RisultatiRicercaDiario q={qIndirizzo} tipo={tipoRicerca} ricerca={ricerca} conPartita={partitaId !== null} voceDiRitorno={typeof voceDiRitorno === 'string' ? voceDiRitorno : null} onTogliTipo={() => scriviRicerca(testoRicerca, null)} />
          ) : (<>
          {ritornoRicerca && <BarraRitornoRisultati ritorno={ritornoRicerca} onTorna={() => tornaAiRisultati(ritornoRicerca)} />}
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" className="btn btn-secondary btn-sm touch" disabled={!g.precedente} onClick={() => vai(g.precedente)} aria-label="Giorno precedente"><IconChevronLeft size={16} /></button>
            <Selettore compatto ricerca="mai" etichetta="Mese" valore={g.giorno.slice(0, 2)} opzioni={mesi.map((m) => ({ chiave: m, nome: meseGioco(`${m}-01`) }))} onCambia={(k) => { const primo = indice.dati?.giorni.find((x) => x.giorno.slice(0, 2) === k); vai(primo?.giorno ?? null); }} />
            <Selettore compatto etichetta="Giorno" valore={g.giorno} opzioni={giorniDelMese.map((x) => ({ chiave: x.giorno, nome: `${dataGiocoTesto(x.giorno)} (${x.giornoSettimana})`, dettaglio: x.azioni ? `${x.fatte}/${x.azioni}` : undefined }))} onCambia={(k) => vai(k)} />
            <button type="button" className="btn btn-secondary btn-sm touch" disabled={!g.successivo} onClick={() => vai(g.successivo)} aria-label="Giorno successivo"><IconChevronRight size={16} /></button>
            {indice.dati.dataCorrente && indice.dati.dataCorrente !== g.giorno && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="calendario" dimensione={20} />} titolo="Vai a oggi" onClick={() => vai(indice.dati?.dataCorrente ?? null)} />}
            {!IN_RILASCIO && <PulsanteVisivo compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica il giorno" onClick={() => setEditorGiornoAperto(true)} />}
            {partitaId && g.dataCorrente !== g.giorno && <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="calendario" dimensione={20} />} titolo="Segna come giorno corrente" className="ml-auto" disabled={occupatoGiorno} onClick={() => void segnaCorrente()} />}
            {partitaId && g.dataCorrente === g.giorno && <span className="chip chip--attivo ml-auto">Oggi nella partita</span>}
          </div>
          {!IN_RILASCIO && editorGiornoAperto && <EditorGiorno key={g.giorno} data={g.giorno} onChiudi={() => setEditorGiornoAperto(false)} onSalvato={async () => { await Promise.all([giorno.ricarica(), indice.ricarica()]); }} />}
          <GestiPartita contestoChiave={`${partitaId}:${data}`} onCambiato={async () => { await Promise.all([giorno.ricarica(), indice.ricarica()]); }} />
          <GiornoGuida onGiornataModificata={async () => { await Promise.all([giorno.ricarica(), indice.ricarica()]); }} onAllerteModificate={async () => { await giorno.ricarica(); }} g={g} partitaId={partitaId} onAggiorna={aggiorna} azioneEvidenziata={voceDaMostrare} onSullaMappa={(m) => navigate(`/guida/mappe/${encodeURIComponent(m.chiave)}${m.spilloId ? `?spillo=${m.spilloId}` : ''}`)} fasciaCorrente={partitaId && g.dataCorrente === g.giorno ? attiva?.fasciaGioco ?? 'giorno' : null} />
          </>)}
        </div>
        </ProviderPannelloScheda>
      )}
    </PageState>
  );
}
