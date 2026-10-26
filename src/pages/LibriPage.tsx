// ============================================================
// LibriPage — catalogo Royal e avanzamento per sessioni
// ============================================================
//
// La scheda dice dove si compra (i negozi collegati, con il prezzo, e i luoghi), che cosa fa
// leggerlo (gli effetti dichiarati) e se in questa partita si può già leggere: con il libro non
// ancora disponibile il «+» resta spento e il motivo sta scritto sotto.
// ============================================================

import { Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Selettore } from '../components/shared/Selettore';
import { Segmenti } from '../components/shared/Segmenti';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { opzioniDaNomi } from '../utils/selettore';
import { getLibri, impostaProgressoLibro } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useCodaProgresso } from '../hooks/useCodaProgresso';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { avvisaDotiDaSegnare } from '../utils/dotiDaSegnare';
import { PageState } from '../components/shared/PageState';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { TesseraKpi } from '../components/shared/TesseraKpi';
import { CatalogoDaCompletare, PannelloPosizione } from '../components/guida/CatalogoDaCompletare';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { NotaPuntiDote } from '../components/shared/NotaPuntiDote';
import { AggiungiAlCatalogo, CorreggiElemento } from '../components/guida/AzioniCatalogo';
import { ModificaGuida } from '../components/guida/ModificaGuida';
import { IconaCategoria } from '../components/guida/IconaCategoria';
import { ChipDisponibilita } from '../components/guida/ChipDisponibilita';
import { ComandiProgressoLettura } from '../components/guida/ComandiProgressoLettura';
import { NOME_DOTE } from '../utils/citta';
import { STATI_LETTURA, formattaYen, haDote, passaStato, prezzoChip, type StatoLettura } from '../utils/letture';
import type { LibroDto } from '../types';
import { TestoNote } from '../components/shared/TestoNote';

/**
 * Pagina dei libri: carica il catalogo per la partita attiva, mostra i conteggi di lettura,
 * l'avviso di «Lettura rapida» quando vale (allora «+» e «−» avanzano di due) e i filtri (testo
 * su titolo, negozi, «dove» della guida ed effetti; Dote; stato di lettura). Le schede sono
 * divise fra da leggere e completati (questi ripiegati); le sessioni passano da una coda per
 * libro che invia una richiesta per volta e aggiorna i conteggi. «Mostra posizione» apre il
 * pannello con la mappa del luogo scelto e ci scorre.
 */
export function LibriPage({ soloChiave }: { soloChiave?: string } = {}) {
  // R10-27: nel pannello sopra il diario `soloChiave` mostra il libro citato dalla voce, nell'elenco filtrato su di lui (senza intestazione,
  // riepilogo e filtri: sono dell'elenco, e il libro è uno)
  useDocumentTitle('Libri');
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getLibri(partitaId ?? undefined), [partitaId]);
  const [ricerca, setRicerca] = useState('');
  const [stato, setStato] = useState<StatoLettura>('tutti');
  const [dote, setDote] = useState('');
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [fonteSelezionata, setFonteSelezionata] = useState(0);
  const pannelloRef = useRef<HTMLElement | null>(null);

  // Le pressioni rapide sulle sessioni: una richiesta per volta per libro insegue l'ultimo valore chiesto, nella partita di partenza.
  const coda = useCodaProgresso<LibroDto>(partitaId, {
    invia: impostaProgressoLibro,
    // il libro aggiornato sostituisce il suo nei dati correnti, con i conteggi della pagina
    applica: (libro) => dati.imposta((correnti) => ({
      ...correnti,
      libri: correnti.libri.map((l) => l.chiave === libro.chiave ? libro : l),
      completati: correnti.libri.reduce((n, l) => n + (l.chiave === libro.chiave ? Number(libro.fatto) : Number(l.fatto)), 0),
      sessioniFatte: correnti.libri.reduce((n, l) => n + (l.chiave === libro.chiave ? libro.progresso : l.progresso), 0),
    })),
    // il libro finito dà le sue Doti: si segnano a mano, l'avviso le ricorda
    dopoOgniInvio: (libro) => avvisaDotiDaSegnare(libro.daSegnare, libro.nome),
    messaggioErrore: 'Aggiornamento del libro fallito.',
    segnalaErrore: (m) => notifica('error', m),
  });
  /** Mette in coda il nuovo numero di sessioni del libro, tenuto fra zero e le sessioni che lo completano. */
  const accoda = (libro: LibroDto, valore: number) => coda.accoda(libro, Math.min(Math.max(valore, 0), libro.totaleSessioni));
  const valoreDi = coda.valore;

  const visibili = useMemo(() => {
    const q = ricerca.trim().toLocaleLowerCase('it');
    return (dati.dati?.libri ?? []).filter((l) => {
      if (soloChiave && l.chiave !== soloChiave) return false;
      const progresso = valoreDi(l);
      // Nella ricerca entra anche il testo «dove» della guida: per i libri senza negozio né posizione (premi, eventi) è l'unica indicazione.
      if (q && !`${l.nome} ${(l.nomiAltri ?? []).join(' ')} ${l.negozi.map((n) => n.negozioNome).join(' ')} ${l.dove} ${l.effettiTesto.join(' ')}`.toLocaleLowerCase('it').includes(q)) return false;
      if (dote && !haDote(l.effetti, dote)) return false;
      return passaStato(stato, progresso, l.fatto);
    });
  }, [dati.dati, valoreDi, ricerca, stato, dote, soloChiave]);

  const libroSelezionato = dati.dati?.libri.find((l) => l.chiave === selezionato) ?? null;
  const posizione = libroSelezionato?.posizioni[fonteSelezionata] ?? null;
  useEffect(() => {
    if (libroSelezionato) pannelloRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [libroSelezionato]);
  const d = dati.dati;
  // il libro della voce si vede anche se già completato: non finisce nella piega dei completati
  const daFare = soloChiave ? visibili : visibili.filter((l) => !l.fatto);
  const fatti = soloChiave ? [] : visibili.filter((l) => l.fatto);

  /** La scheda di un libro: la stessa nei due gruppi, scritta una volta sola. */
  const scheda = (libro: LibroDto) => {
    const progresso = valoreDi(libro);
    // «Lettura rapida» non tocca il libro stesso: è il pomeriggio che rende il doppio.
    const passo = d?.letturaRapida && libro.chiave !== 'lettura-rapida' ? 2 : 1;
    const titolo = libro.nome;
    // Dove si compra: i negozi collegati (con il prezzo) e i luoghi che non sono negozi.
    const negoziCollegati = new Set(libro.negozi.map((n) => n.negozio));
    const altrePosizioni = libro.posizioni.filter((p) => !(p.tipo === 'negozio' && negoziCollegati.has(p.chiave)));
    return <li key={libro.chiave} className={`card relative flex min-w-0 flex-col gap-3 overflow-hidden ${libro.fatto ? 'border-success/50' : ''}`}>
      <div className="flex items-start gap-3">
        <IconaCategoria categoria="libri" dimensione={44} />
        <div className="min-w-0 flex-1"><h2 className="m-0 text-lg leading-tight">{libro.catalogo ? <Link className="touch inline-flex items-center" to={libro.catalogo.casa}>{titolo}</Link> : titolo}</h2></div>
        <span className="flex flex-col items-end gap-1">
          <span className={`chip ${libro.fatto ? 'chip--attivo' : ''}`}>{libro.fatto ? 'Completato' : progresso ? 'In corso' : 'Da leggere'}</span>
          <ChipDisponibilita disponibilita={libro.disponibilita ?? undefined} compatto />
        </span>
      </div>
      <ComandiProgressoLettura titolo={titolo} tipo="libro" progresso={progresso} totale={libro.totaleSessioni}
        partita={partitaId !== null} occupato={coda.occupato(libro)} disponibilita={libro.disponibilita} passo={passo} onCambia={(valore) => accoda(libro, valore)} />
      <dl className="dl-scheda m-0 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
        <dt className="text-text-muted">Dove</dt>
        <dd className="m-0 flex flex-wrap gap-1">
          {libro.negozi.map((n) => <Link key={n.articolo} to={`/guida/negozi/${encodeURIComponent(n.negozio)}`} className="chip chip--attivo touch no-underline">{n.negozioNome}{prezzoChip(n.prezzo)}</Link>)}
          {altrePosizioni.map((p) => <span key={`${p.tipo}/${p.chiave}`} className="chip">{p.etichetta}</span>)}
          {libro.negozi.length === 0 && altrePosizioni.length === 0 && <span>{libro.dove || 'Non indicato'}</span>}
        </dd>
        <dt className="text-text-muted">Che cosa fa</dt>
        <dd className="m-0">{libro.effettiTesto.length ? <TestoNote testo={libro.effettiTesto.join(' · ')} /> : 'Nessun effetto dichiarato'}</dd>
        {/* Il luogo sbloccato è un riferimento, quindi ci si va. */}
        {(libro.apre?.length ?? 0) > 0 && <><dt className="text-text-muted">Apre</dt><dd className="m-0 flex flex-wrap gap-2">{libro.apre!.map((posto) => posto.casa ? <Link key={`${posto.tipo}:${posto.chiave}`} className="touch inline-flex items-center" to={posto.casa}>{posto.nome}</Link> : <span key={`${posto.tipo}:${posto.chiave}`}>{posto.nome}</span>)}</dd></>}
        {libro.negozi.length === 0 && libro.prezzo !== null && <><dt className="text-text-muted">Prezzo</dt><dd className="m-0">{libro.prezzo === 0 ? 'Gratis' : formattaYen(libro.prezzo)}</dd></>}
      </dl>
      {libro.notaPrezzo && <p className="m-0 text-xs text-text-secondary">{libro.notaPrezzo}</p>}
      {libro.dettagli && <p className="m-0 text-xs text-text-secondary"><TestoNote testo={libro.dettagli} daParole /></p>}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="posizione" dimensione={20} />} titolo="Mostra posizione"
          onClick={() => { setSelezionato(libro.chiave); setFonteSelezionata(0); }} />
        <CorreggiElemento tipo="libro" chiave={libro.chiave} onSalvato={() => void dati.ricarica()} />
        <ModificaGuida tipo="libro-posizioni" chiave={libro.chiave} cosa={`dove si ottiene «${titolo}»`} etichetta="Posizioni" onSalvato={() => void dati.ricarica()} />
      </div>
    </li>;
  };

  return <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
    {d && <CatalogoDaCompletare
      soloChiave={soloChiave}
      intestazione={<IntestazionePagina titolo="Libri" sottotitolo={partitaId
        ? <>Segna ogni sessione letta nella partita «{attiva?.nome}». Gli effetti si applicano quando il volume è completato.</>
        : <>I {d.libri.length} libri di Persona 5 Royal, con sessioni, effetti e dove si comprano. Attiva una partita per registrarne l’avanzamento.</>} />}
      riepilogo={{ etichetta: 'Riepilogo lettura', tessere: <>
        <TesseraKpi valore={d.completati} segno="completati" etichetta="completati" />
        <TesseraKpi valore={d.libri.length - d.completati} segno="iniziati" etichetta="da completare" />
        <TesseraKpi valore={d.sessioniFatte} segno="sessioni" etichetta="sessioni fatte" />
        <TesseraKpi valore={d.sessioniTotali} segno="sessioni" etichetta="sessioni totali" />
      </> }}
      avvisi={<>
        {partitaId && <NotaPuntiDote cosa="quali libri hai letto e a che punto sei" />}
        {d.letturaRapida && (
          <p className="prosa-misurata m-0 flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 testo-13 text-text-secondary" role="status">
            <IconaAzione chiave="libro" dimensione={18} />
            <span>Hai letto <strong>Lettura rapida</strong>: da qui in avanti una sessione di lettura vale doppia, quindi
            ogni altro libro si finisce in metà pomeriggi. Le sessioni già fatte restano quelle che erano —
            l’effetto non è retroattivo — e «+» avanza di due per volta.</span>
          </p>
        )}
      </>}
      filtri={{ etichetta: 'Filtri libri', contenuto: <>
        <div className="filtri-articoli__riga">
          <CampoRicerca valore={ricerca} onCambia={setRicerca} segnaposto="Cerca titolo, negozio o effetto…" />
          <Selettore compatto etichetta="Dote" valore={dote} vuoto="Tutte le Doti" opzioni={opzioniDaNomi(NOME_DOTE)} onCambia={setDote} />
        </div>
        <div className="filtri-articoli__riga">
          <Segmenti etichetta="Stato lettura" valore={stato} opzioni={STATI_LETTURA} onCambia={setStato} />
        </div>
      </> }}
      posizione={libroSelezionato && <PannelloPosizione rif={pannelloRef}
        titolo={<>Dove ottenere “{libroSelezionato.nome}”</>} etichetta={`Posizione di ${libroSelezionato.nome}`}
        modifica={<ModificaGuida tipo="libro-posizioni" chiave={libroSelezionato.chiave} cosa={`dove si ottiene «${libroSelezionato.nome}»`} soloIcona onSalvato={() => void dati.ricarica()} />}
        onChiudi={() => setSelezionato(null)}
        scelte={libroSelezionato.posizioni.map((p) => ({ chiave: `${p.tipo}/${p.chiave}`, etichetta: p.etichetta }))}
        indice={fonteSelezionata} onIndice={setFonteSelezionata} posizione={posizione}
        assente="Questo libro si ottiene come ricompensa o evento e non ha un punto territoriale verificato." />}
      conteggio={`${visibili.length} libri mostrati${fatti.length > 0 ? ` · ${daFare.length} da leggere` : ''}`}
      aggiungi={<AggiungiAlCatalogo tipo="libro" titolo="Aggiungi un libro" onSalvato={() => void dati.ricarica()} />}
      daFare={daFare} fatti={fatti} scheda={scheda}
      testi={{ elenco: 'Libri da leggere', sezioneFatti: 'Libri completati', elencoFatti: 'Libri già completati', vuoto: 'Nessun libro da leggere con questi filtri.', vuotoSolo: 'Questo libro non è nel catalogo.' }}
    />}
  </PageState>;
}
