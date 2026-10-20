// ============================================================
// DungeonDettaglioPage — la scheda di un Palazzo (e dei Memento)
// ============================================================
//
// **L'intestazione dice il tempo, non lo elenca**: le tre date sono una linea del tempo in tre
// tappe; la prosa della guida resta ripiegata sotto. **Le aree sono un elenco**, colonna fissa da
// 1024 px in su e fila scorrevole sotto; ogni voce dice quanto resta da raccogliere con la stessa
// misura dell'anello in cima. **Il tre colonne è progressivo** (aree, mappa, raccolta o aree del dedalo).
//
// **Quel che si raccoglie sta sulle planimetrie** (voce 5): l'anello conta i collezionabili
// dell'atlante, e la colonna di destra li elenca da segnare in un tocco, con la parola del loro tipo («Aperto», «Sconfitto»…) — quelli dell'area
// scelta e, ripiegate, tutte le planimetrie del Palazzo. I punti della guida (sicure, enigmi,
// boss) restano in una piega «Dalla guida» con Ottenuto/Esaurito, senza effetto sulla percentuale.
//
// I Memento non hanno aree fisse: al posto della colonna delle aree c'è il pozzo disegnato, e la
// colonna di destra sono le **aree del dedalo** (099, richiesta dell'utente del 2026-10-11) — ognuna
// con i suoi elementi: voci della guida, Richieste e timbri — che fanno la percentuale; un'area è
// completata quando lo sono tutti, il dedalo quando lo sono tutte. La pianta della guida non c'è: i
// piani si generano.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Selettore } from '../components/shared/Selettore';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { aggiornaArea, aggiornaCompendio, aggiornaDungeon, creaArea, eliminaArea, eliminaAreaMondo, getArea, getDivergenze, getDungeon, impostaStatoPunto, riordinaAree } from '../services/api';
import { FinestraDaVerificare, SPIEGAZIONE_DA_VERIFICARE, type DivergenzaDaVerificare } from '../components/guida/FinestraDaVerificare';
import { nomeSenzaPalazzo } from '../utils/gruppiPlanimetrie';
import { PropostaDallaVoce } from '../components/guida/PropostaDallaVoce';
import { useMedia } from '../hooks/useMedia';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { IconChevronLeft } from '../components/shared/icons';
import { MappaIncorporata } from '../components/mappe/MappaIncorporata';
import { EmblemaDungeon } from '../components/guida/EmblemaDungeon';
import { IllustrazioneConSegno } from '../components/mappe/IllustrazioneConSegno';
import { useImmagineMappa } from '../hooks/useImmagineMappa';
import { AnelloAvanzamento } from '../components/shared/AnelloAvanzamento';
import { TestoRipiegabile } from '../components/shared/TestoRipiegabile';
import { RaccoltaPlanimetrie } from '../components/guida/RaccoltaPlanimetrie';
import { SpuntaCompletata, TestoCompletata } from '../components/guida/SpuntaCompletata';
import { AreePalazzo } from '../components/guida/AreePalazzo';
import { FinestraLegamiInfiltrazione } from '../components/guida/FinestraLegamiInfiltrazione';
import { ModuloNuovaArea, type DatiNuovaArea as DatiNuovaInfiltrazione } from '../components/guida/ModuloNuovaArea';
import { FinestraAggiungiArea } from '../components/mappe/FinestraAggiungiArea';
import { FinestraAggiungiPlanimetria } from '../components/mappe/FinestraAggiungiPlanimetria';
import { FinestraModificaArea } from '../components/mappe/FinestraModificaArea';
import { VersioniArea } from '../components/mappe/VersioniArea';
import { SelettoreVersioni } from '../components/mappe/SelettoreVersioni';
import { nomeVersione } from '../utils/aree';
import { anelloPalazzo, livelloPalazzo } from '../utils/completamentoPalazzo';
import { centroAccessoMondo } from '../utils/accessoMondo';
import { areeCompletate } from '../utils/completamentoAree';
import { LIMITI_GUIDA } from '../../shared/limitiGuida';
import { CampoCorrezione, CorrezioneGuida } from '../components/guida/CorrezioneGuida';
import { AreeDelDedalo } from '../components/guida/AreeDelDedalo';
import { raccoltaDeiDedali, ricalcolaDedalo } from '../utils/dedali';
import { dataBreve } from '../utils/testoBreve';
import type { AreaDedaloDto, AreaDungeonDto, AreaRiassuntoDto, DungeonDettaglioDto, PlanimetriaAreaDto, PuntoInteresseDto, StatoPunto, StatoRichiesta } from '../types';
import { GuidaDellArea, type CollegamentoPin } from '../components/guida/GuidaDellArea';
import { BarraCollegamentoPin } from '../components/guida/BarraCollegamentoPin';
import { IconaAzione, IconaSegno } from '../components/shared/IconaAzione';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { useSuggerimenti } from '../stores/suggerimentiStore';
import { classiSuggerito } from '../utils/suggerimenti';
import { CollegamentoMappa } from '../components/mappe/CollegamentoMappa';
import { AtterraggioTokyo } from '../components/guida/AtterraggioTokyo';
import { MappaMemento } from '../components/mappe/MappaMemento';
import { Modal } from '../components/shared/Modal';
import { NEL_CESTINO } from '../utils/cestino';

/** La versione mostrata non ha pin, un'altra sì (come nella pagina dell'Area): quale, e l'avviso; null altrimenti. */
function versioneSenzaPin(versioni: PlanimetriaAreaDto[], scelta: string | null): { chiave: string; nome: string; testo: string } | null {
  const mostrata = versioni.find((v) => v.chiave === scelta);
  const conPin = versioni.find((v) => v.numeroSpilli > 0 && v.chiave !== scelta);
  if (!mostrata || mostrata.numeroSpilli > 0 || !conPin) return null;
  const nome = nomeVersione(conPin, versioni.indexOf(conPin));
  return { chiave: conPin.chiave, nome, testo: `Su questa planimetria non ci sono pin: quelli dell’area stanno su «${nome}».` };
}

/** Le tre date di un Palazzo come una linea: si apre, conviene rubare, scade. La prosa della guida nel `title`. */
function LineaDelTempo({ date, memento = false }: { date: DungeonDettaglioDto['date']; memento?: boolean }) {
  const tappe = [
    { chiave: 'sblocco', etichetta: 'Si apre', valore: date.sblocco, tono: 'bg-white/10 text-text', segno: 'si-apre' as const },
    { chiave: 'furto', etichetta: 'Furto consigliato', valore: date.furtoConsigliato, tono: 'bg-[#f5c542]/15 text-[#f5c542]', segno: 'furto' as const },
    { chiave: 'scadenza', etichetta: 'Scade', valore: date.scadenza, tono: 'bg-primary/20 text-primary', segno: 'scade' as const },
  ].filter((t) => !!t.valore);
  if (tappe.length === 0) return null;
  return (
    <ol className="m-0 flex list-none flex-wrap items-stretch gap-1.5 p-0" aria-label={memento ? 'Finestra dei Memento' : 'Finestra del Palazzo'}>
      {tappe.map((t, i) => (
        <li key={t.chiave} className="flex items-stretch gap-1.5">
          {/* Le tappe vanno a capo sugli schermi stretti, e una freccia a inizio riga non collega
              più niente: da lì in giù l'ordine lo dicono già le etichette. */}
          {/* da 1024 px niente frecce: l'ordine lo dicono i segni delle tappe, e la riga sotto il titolo deve stare su una riga (R3-41) */}
          {i > 0 && <span aria-hidden className="hidden self-center text-text-muted sm:inline lg:hidden">→</span>}
          {/* Da 1024 px (R3-41) la tappa sta su una riga: segno e data, l'etichetta per chi non vede e nel suggerimento */}
          <span className={`flex flex-col gap-0.5 rounded-md px-2.5 py-1.5 lg:flex-row lg:items-center lg:gap-1 lg:px-1.5 lg:py-1 ${t.tono}`} title={`${t.etichetta}: ${t.valore!}`}>
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] opacity-80"><IconaSegno chiave={t.segno} dimensione={14} /><span className="lg:sr-only">{t.etichetta}</span></span>
            {/* da 1024 px al massimo 6,5rem coi puntini (una data della guida può essere una frase: «Nel corso della…»), intera nel suggerimento */}
            <span className="font-display text-[17px] leading-none lg:max-w-[6.5rem] lg:truncate lg:text-[14px]">{dataBreve(t.valore!)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** La percentuale di un dedalo (elementi fatti sul totale), o null senza partita o senza elementi. */
function quotaDedalo(a: AreaDungeonDto): number | null {
  const o = a.dedalo?.obiettivi;
  return o && o.fatti !== null && o.totale > 0 ? o.fatti / o.totale : null;
}

/** Il nome di un dedalo senza «Dedalo di»: nel binario e nella fila basta il nome proprio (progetto approvato: «2 Aiyatsbus 31%»). */
const nomeBreve = (nome: string): string => nome.replace(/^Dedalo di /i, '');

/** Un dedalo nel binario (da 1024 px) o nella fila (tablet): numero, nome, percentuale e barra, ✓ se completato. */
function DedaloNelBinario({ a, scelto, suggerito, onScegli, fila }: { a: AreaDungeonDto; scelto: boolean; suggerito: boolean; onScegli: () => void; fila?: boolean }) {
  const quota = quotaDedalo(a);
  const completato = a.dedalo?.completato === true;
  if (fila) {
    return (
      <button type="button" aria-pressed={scelto} onClick={onScegli} title={a.nome} className={`chip touch shrink-0 ${scelto ? 'chip--attivo' : ''} ${completato ? 'chip--icona' : ''} ${classiSuggerito(suggerito, 'chip')}`}>
        {completato && <SpuntaCompletata />}{a.ordine + 1} {nomeBreve(a.nome)}{!completato && quota !== null ? ` · ${Math.round(quota * 100)}%` : ''}{completato && <TestoCompletata />}
      </button>
    );
  }
  return (
    <button type="button" aria-pressed={scelto} onClick={onScegli} title={a.nome}
      className={`touch flex w-full flex-col gap-1 rounded-md border px-2 py-1.5 text-left transition-colors ${scelto ? 'border-primary bg-primary-bg text-text' : 'border-transparent text-text-secondary hover:border-border hover:bg-white/[0.05] hover:text-text'} ${classiSuggerito(suggerito)}`}>
      <span className="flex items-baseline gap-1.5 text-[13px] leading-tight">
        <span className={`w-4 shrink-0 text-right font-display ${scelto ? 'text-primary' : 'text-text-muted'}`}>{a.ordine + 1}</span>
        <span className="min-w-0 flex-1 font-semibold">{nomeBreve(a.nome)}{completato && <>{' '}<SpuntaCompletata dimensione={12} /><TestoCompletata /></>}</span>
        <span className="shrink-0 text-[11px] tabular-nums text-text-muted">{quota !== null ? `${Math.round(quota * 100)}%` : `${a.dedalo?.obiettivi.totale ?? 0} el.`}</span>
      </span>
      {quota !== null && <span className="visore-mappa__progresso ml-5 h-1" aria-hidden><span className="visore-mappa__progresso-barra" style={{ width: `${Math.round(quota * 100)}%` }} /></span>}
    </button>
  );
}

/**
 * Scheda di un Palazzo o dei Memento presa dalla chiave nell'URL: carica il dettaglio per la
 * partita attiva e l'area dal parametro `area` (la prima quando manca o non esiste). Mostra
 * l'intestazione (emblema, anello d'avanzamento, correzione della scheda, linea del tempo,
 * conteggi, dettagli in prosa) e sotto, a colonne da 1024 px, l'elenco delle planimetrie e delle
 * aree (o il pozzo con i dedali), l'area scelta con la sua planimetria o il disegno del dedalo, e
 * la colonna di quel che si raccoglie con la guida dell'area. I gesti aggiornano i dati locali
 * subito e, dove lo stato dipende dal server, li rileggono in silenzio.
 */
export function DungeonDettaglioPage() {
  const sugg = useSuggerimenti();
  const { chiave = '', slug = null } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getDungeon(chiave, partitaId ?? undefined), [chiave, partitaId]);
  useDocumentTitle(dati.dati ? dati.dati.nome : 'Palazzo');
  const d = dati.dati;
  const memento = d?.tipo === 'mementos';
  // L4 (§4.3): le divergenze conservate «da verificare» del Palazzo nella partita; si chiedono solo quando la scheda dice che ce ne sono
  const quanteDaVerificare = !memento ? d?.daVerificare ?? 0 : 0;
  const divergenze = useCarica(() => (partitaId && quanteDaVerificare > 0 ? getDivergenze(partitaId, chiave) : Promise.resolve([])), [partitaId, chiave, quanteDaVerificare]);
  const [daVerificare, setDaVerificare] = useState<DivergenzaDaVerificare | null>(null);
  const sezioneDaVerificare = useRef<HTMLDetailsElement>(null);
  // Le infiltrazioni completate nella partita (tutte le voci da segnare segnate, 2026-10-04): spunte, e `?infiltrazione=in-corso`.
  const completate = useMemo(() => areeCompletate(d?.aree ?? []), [d]);
  // L3 (§4.2): lo stato della scheda di un Palazzo ha due scelte, l'**infiltrazione** (I, `?infiltrazione=` o il vecchio `?area=`) e
  // l'**area** (A, `/area/<slug>`). I Memento restano come prima: il dedalo da `?area=` (R3-12; i campi delle aree per loro mancano).
  const areePalazzo = useMemo(() => d?.areePalazzo ?? [], [d]);
  const richiestaInfiltrazione = params.get('infiltrazione') ?? params.get('area');
  // UX3-1 (§4.4): la scheda aperta dalla proposta di una voce del diario; dopo «Conferma» o «Chiudi» il parametro se ne va (replace)
  const daVoce = memento ? null : params.get('daVoce');
  const togliDaVoce = () => setParams((p) => { const q = new URLSearchParams(p); q.delete('daVoce'); return q; }, { replace: true });
  const area: AreaDungeonDto | null = useMemo(() => {
    if (!d) return null;
    const perChiave = (k: string | null | undefined) => (k ? d.aree.find((a) => a.chiave === k) : undefined);
    if (memento) return perChiave(params.get('area')) ?? d.aree[0] ?? null;
    // «Entra» del diario senza infiltrazione scelta: la prima non completata del Palazzo, altrimenti la prima (§4.4)
    if (richiestaInfiltrazione === 'in-corso') return d.aree.find((a) => !completate.has(a.chiave)) ?? d.aree[0] ?? null;
    const daIndirizzo = perChiave(richiestaInfiltrazione);
    if (daIndirizzo) return daIndirizzo;
    // arrivo su un'area senza infiltrazione: la prima infiltrazione che la tocca, altrimenti la prima del Palazzo
    if (slug) { const prima = perChiave(d.areePalazzo?.find((x) => x.slug === slug)?.infiltrazioni?.[0]?.chiave); if (prima) return prima; }
    return d.aree[0] ?? null;
  }, [d, memento, params, richiestaInfiltrazione, slug, completate]);
  // A: quella dell'indirizzo; arrivando su un'infiltrazione, la prima area che tocca (nell'ordine del legame)
  const areaFisica: AreaRiassuntoDto | null = useMemo(() => {
    if (!d || memento) return null;
    if (slug) return areePalazzo.find((x) => x.slug === slug) ?? null;
    const prima = area?.areePalazzo?.[0];
    return prima ? areePalazzo.find((x) => x.chiave === prima.chiave) ?? null : null;
  }, [d, memento, slug, areePalazzo, area]);
  // le versioni dell'area (con etichette e conteggi): la pagina dell'area di L2, letta per il contenitore `dungeon`
  const [revisioneArea, setRevisioneArea] = useState(0);
  const dettaglioArea = useCarica(() => (d && areaFisica ? getArea({ tipo: 'dungeon', chiave: d.chiave }, areaFisica.slug, partitaId ?? undefined) : Promise.resolve(null)),
    [d?.chiave, areaFisica?.slug, partitaId, revisioneArea]);
  const versioniArea = dettaglioArea.dati && dettaglioArea.dati.slug === areaFisica?.slug ? dettaglioArea.dati.planimetrie : [];
  const planimetrieArea = useMemo(() => (d?.planimetrie ?? []).filter((p) => !!areaFisica && p.area === areaFisica.chiave), [d, areaFisica]);
  // la versione mostrata: quella dell'indirizzo se è dell'area, poi quella che l'infiltrazione apre, poi la predefinita, poi la prima.
  // NR3-4 (strada (a) del PM): sulla casa di un'area (`/area/<slug>` senza `?infiltrazione=`) la versione iniziale dell'infiltrazione
  // non conta e si apre la predefinita, perché il BE omette `?planimetria=` proprio per la predefinita: un indirizzo salvato apre ciò
  // che apriva. Senza area nell'indirizzo l'area viene dall'infiltrazione, e la sua versione iniziale resta.
  const chiaviVersioni = versioniArea.length ? versioniArea.map((v) => v.chiave) : planimetrieArea.map((p) => p.chiave);
  const inizialeInfiltrazione = !slug || richiestaInfiltrazione ? area?.areePalazzo?.find((x) => x.chiave === areaFisica?.chiave)?.planimetriaIniziale ?? null : null;
  const planimetriaScelta = [params.get('planimetria'), inizialeInfiltrazione, areaFisica?.predefinita]
    .find((k): k is string => !!k && chiaviVersioni.includes(k)) ?? chiaviVersioni[0] ?? null;
  const spilloIndirizzo = Number(params.get('spillo')) || null;
  const puntoIndirizzo = useMemo(() => centroAccessoMondo(params), [params]);
  // ogni cambio di stato dalla colonna ricarica il visore (e viceversa il visore ricarica la pagina)
  const [versioneStati, setVersioneStati] = useState(0);
  // Memento (progetto approvato del 2026-10-12): «Gioca» ha solo i comandi per segnare, «Modifica la guida» anche quelli per
  // sistemarla; il pozzo dei dedali si apre a richiesta
  const [modifica, setModifica] = useState(false);
  const [pozzo, setPozzo] = useState(false);

  // Gli aggiornamenti locali partono dai dati correnti (forma funzionale di `imposta`), non dalla `d` del render: arrivano dopo
  // un `await`, e due gesti ravvicinati si annullerebbero a vicenda.
  const aggiornaPunto = (nuovo: PuntoInteresseDto) => {
    dati.imposta((attuale) => {
      // nei Memento una voce è un elemento della sua area del dedalo (099): aree, dedalo e anello seguono subito
      const aree = attuale.aree.map((a) => (a.punti.some((p) => p.chiave === nuovo.chiave) ? ricalcolaDedalo({ ...a, punti: a.punti.map((p) => (p.chiave === nuovo.chiave ? nuovo : p)) }, partitaId !== null) : a));
      return { ...attuale, aree, raccolta: attuale.tipo === 'mementos' ? raccoltaDeiDedali(aree, attuale.raccolta) : attuale.raccolta };
    });
  };
  // Le riletture in silenzio della scheda (dopo uno stato o un raccolto) possono sovrapporsi: vale solo l'ultima chiesta, una
  // risposta più vecchia che arriva dopo non sovrascrive quella più nuova (rilievo del validatore).
  const ultimaLettura = useRef(0);
  /** Rilegge la scheda dal server senza stato di caricamento (solo con una partita) e la applica solo se nel frattempo non è partita una lettura più nuova. */
  const rileggiInSilenzio = async () => {
    if (!partitaId) return;
    const n = ++ultimaLettura.current;
    const fresco = await getDungeon(chiave, partitaId);
    if (n === ultimaLettura.current) dati.imposta(fresco);
  };
  // Cambiato il giorno della partita, la scheda si rilegge in silenzio: da quel giorno dipende dove si atterra dalla mappa di
  // Tokyo («Oggi si atterra su…», 2026-10-04). Non con una dipendenza di `useCarica`, che svuoterebbe la pagina fino alla
  // risposta e chiuderebbe la finestra aperta.
  const giornoPartita = attiva?.dataGioco ?? null;
  const giornoLetto = useRef(giornoPartita);
  // la rilettura più recente, letta dall'effetto senza farlo ripartire a ogni render
  const rilettura = useRef(rileggiInSilenzio);
  useEffect(() => { rilettura.current = rileggiInSilenzio; });
  useEffect(() => {
    if (giornoLetto.current === giornoPartita) return;
    giornoLetto.current = giornoPartita;
    void rilettura.current().catch(() => { /* resta la scheda di prima */ });
  }, [giornoPartita]);
  /** Imposta (o toglie, con null) lo stato di un punto della guida nella partita: aggiorna il punto locale, fa ricaricare il visore e poi
   *  rilegge la scheda; l'errore viene notificato. Vero se lo stato è stato salvato (la guida passa alla voce successiva solo allora). */
  const cambiaStato = async (p: PuntoInteresseDto, stato: StatoPunto | null): Promise<boolean> => {
    if (!partitaId) return false;
    try {
      aggiornaPunto(await impostaStatoPunto(partitaId, p.chiave, stato));
      setVersioneStati((v) => v + 1);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
      return false;
    }
    // Un punto della guida può essere agganciato a uno spillo collezionabile (il server lo conta come raccolto):
    // la raccolta si rilegge dal server, senza stato di caricamento, così anello e colonna non divergono. Lo stato è già
    // salvato: una rilettura fallita lo dice, ma non lo disfa.
    try { await rileggiInSilenzio(); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Rilettura della scheda non riuscita.'); }
    return true;
  };
  /**
   * Nei Memento una Persona è catturata se è registrata nel compendio della partita (scelte dell'utente, 2026-10-12): la registra o
   * la toglie, aggiorna subito le catturate della scheda e notifica. Le catture non contano nella percentuale: niente da ricalcolare.
   */
  const cattura = async (personaId: number, catturata: boolean): Promise<void> => {
    if (!partitaId) return;
    try {
      const compendio = await aggiornaCompendio(partitaId, personaId, { registrata: catturata });
      const registrate = compendio.filter((c) => c.registrata).map((c) => c.personaId);
      dati.imposta((attuale) => ({ ...attuale, personeCatturate: registrate }));
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Compendio non aggiornato.'); }
  };
  const catturate = useMemo(() => (d?.personeCatturate ? new Set(d.personeCatturate) : null), [d]);
  /** Uno spillo raccolto (o riaperto): si aggiornano le planimetrie del Palazzo, quelle delle aree e l'anello, senza ricaricare. */
  const segnaRaccolto = (spilloId: number, raccolto: boolean) => {
    if (!d) return;
    /** Una planimetria con lo spillo segnato raccolto o no e il conteggio dei presi ricalcolato; resta identica se lo spillo non è suo. */
    const aggiornaMappa = <T extends { presi: number | null; spilli: Array<{ id: number; raccolto: boolean | null }> }>(m: T): T => {
      if (!m.spilli.some((s) => s.id === spilloId)) return m;
      const spilli = m.spilli.map((s) => (s.id === spilloId ? { ...s, raccolto } : s));
      return { ...m, spilli, presi: spilli.filter((s) => s.raccolto).length };
    };
    dati.imposta((attuale) => {
      const planimetrie = attuale.planimetrie.map(aggiornaMappa);
      const aree = attuale.aree.map((a) => ({ ...a, mappe: a.mappe.map(aggiornaMappa) }));
      const presi = planimetrie.reduce((s, p) => s + (p.presi ?? 0), 0);
      return { ...attuale, planimetrie, aree, raccolta: { ...attuale.raccolta, presi, mappeComplete: planimetrie.filter((p) => p.presi !== null && p.presi >= p.n).length } };
    });
    setVersioneStati((v) => v + 1);
    // Il raccolto di un pin segna (o riapre) la sua voce della guida e, se è un passo, il suo Enigma (095): stati che qui non si
    // possono dedurre. Si rilegge la scheda dal server, senza stato di caricamento, come dopo uno stato cambiato dalla guida.
    void rileggiInSilenzio().catch(() => { /* resta l'aggiornamento immediato */ });
  };
  /** Un dedalo cambiato dentro (timbri, stato di una Richiesta): le sue aree, il dedalo e l'anello dei Memento si ricalcolano con
   *  la regola del server (`shared/dedali.ts`, 099). `cambia` riceve un'area del dedalo e la restituisce aggiornata. */
  const aggiornaAreeDedalo = (cambia: (a: AreaDedaloDto) => AreaDedaloDto) => {
    dati.imposta((attuale) => {
      const aree = attuale.aree.map((a) => (a.dedalo ? ricalcolaDedalo({ ...a, dedalo: { ...a.dedalo, aree: a.dedalo.aree.map(cambia) } }, partitaId !== null) : a));
      return { ...attuale, aree, raccolta: raccoltaDeiDedali(aree, attuale.raccolta) };
    });
  };
  /** I timbri di un'area di un dedalo cambiano. */
  const aggiornaTimbri = (areaDedalo: string, raccolti: number) => {
    aggiornaAreeDedalo((a) => (a.chiave === areaDedalo && a.timbri ? { ...a, timbri: { ...a.timbri, raccolti } } : a));
  };
  /** Lo stato di una Richiesta cambia (nell'area in cui sta, o fra quelle da collocare, che non contano). */
  const aggiornaRichiesta = (chiaveRichiesta: string, stato: StatoRichiesta | null) => {
    dati.imposta((attuale) => ({ ...attuale, aree: attuale.aree.map((a) => (a.dedalo ? { ...a, dedalo: { ...a.dedalo, daCollocare: a.dedalo.daCollocare.map((r) => (r.chiave === chiaveRichiesta ? { ...r, stato } : r)) } } : a)) }));
    aggiornaAreeDedalo((a) => (a.richieste.some((r) => r.chiave === chiaveRichiesta) ? { ...a, richieste: a.richieste.map((r) => (r.chiave === chiaveRichiesta ? { ...r, stato } : r)) } : a));
  };
  // Il collegamento dei pin di una voce della guida si fa sulla mappa principale (2026-10-18): la guida lo apre e dice voce, pin e
  // gesti; qui la planimetria mostrata durante il collegamento (parte da dove sta già un pin della voce) e la ricerca. Una voce
  // nuova riparte dalla sua planimetria e con la ricerca vuota, e la mappa viene portata in vista (sul telefono sta sopra la guida).
  const [collegamento, setCollegamento] = useState<CollegamentoPin | null>(null);
  const [mappaCollegamento, setMappaCollegamento] = useState<string | null>(null);
  const [ricercaPin, setRicercaPin] = useState('');
  const voceInCollegamento = useRef<string | null>(null);
  const riquadroMappa = useRef<HTMLDivElement | null>(null);
  /** Il collegamento aperto (o chiuso) dalla guida dell'area: cambiata la voce, planimetria iniziale e ricerca vuota. */
  const aggiornaCollegamento = useCallback((c: CollegamentoPin | null) => {
    if ((c?.voce ?? null) !== voceInCollegamento.current) {
      voceInCollegamento.current = c?.voce ?? null;
      setMappaCollegamento(c?.mappaIniziale ?? null);
      setRicercaPin('');
    }
    setCollegamento(c);
  }, []);
  const voceCollegata = collegamento?.voce ?? null;
  useEffect(() => { if (voceCollegata) riquadroMappa.current?.scrollIntoView?.({ block: 'start' }); }, [voceCollegata]);
  const mappaScelta = planimetriaScelta;
  // Collegando i pin la mappa principale mostra la planimetria del collegamento: anche in un'area che non ne ha una sua (la barra
  // sceglie fra quelle del Palazzo, come faceva la mappa nella voce), con la barra sopra e la modalità scelta.
  const mappaMostrata = collegamento ? (mappaCollegamento ?? mappaScelta) : mappaScelta;
  const barraCollegamento = collegamento && mappaMostrata
    ? <div ref={riquadroMappa} className="scroll-mt-2"><BarraCollegamentoPin collegamento={collegamento} mappa={mappaMostrata} onMappa={setMappaCollegamento} ricerca={ricercaPin} onRicerca={setRicercaPin} /></div>
    : null;
  // Da 1280 px la mappa prende l'altezza che la colonna le lascia, mai meno di 240 px di tela (2026-09-30, 2026-10-15). Collegando i
  // pin l'intestazione dell'area si riduce al titolo e la tela prende lo spazio liberato; il minimo di 560 px chiesto prima faceva
  // scorrere la colonna sotto la mappa («la mappa è letteralmente inusabile... appare la barra», 2026-10-18).
  const classeVisoreMappa = 'h-[max(300px,min(41vh,560px))] xl:h-auto xl:min-h-fit xl:flex-1 xl:[--minimo-tela:240px]';
  const sceltaPin = collegamento ? { titolo: collegamento.nome, scelti: collegamento.scelti, occupato: collegamento.occupato, ricerca: ricercaPin, attenuaNascosti: true, onScegli: (s: { id: number; nome: string }) => collegamento.onScegli(s) } : undefined;
  /** Memento: apre un dedalo mettendolo nell'indirizzo (che perde gli altri parametri). */
  const scegliArea = (k: string) => { setParams({ area: k }); };
  // ---- Palazzi (L3, §4.1–§4.2): l'area ha il suo indirizzo, l'infiltrazione va nei parametri ----
  const base = `/guida/dungeon/${encodeURIComponent(chiave)}`;
  /** Apre l'area `s`, con l'infiltrazione e la versione date (se ci sono). */
  const apriArea = (s: string, infiltrazione?: string | null, planimetria?: string | null) => {
    const q = new URLSearchParams();
    if (infiltrazione) q.set('infiltrazione', infiltrazione);
    if (planimetria) q.set('planimetria', planimetria);
    const testo = q.toString();
    navigate(`${base}/area/${encodeURIComponent(s)}${testo ? `?${testo}` : ''}`);
  };
  /** Un'area scelta dall'elenco: l'infiltrazione aperta resta se la tocca, altrimenti si apre la prima che la tocca. */
  const scegliAreaFisica = (s: string) => {
    const a = areePalazzo.find((x) => x.slug === s);
    apriArea(s, area && a?.infiltrazioni?.some((x) => x.chiave === area.chiave) ? area.chiave : null);
  };
  /** Un'infiltrazione scelta (selettore, aree senza infiltrazione): si apre sulla sua prima area. */
  const scegliInfiltrazione = (k: string) => navigate(`${base}?infiltrazione=${encodeURIComponent(k)}`);
  /** Un'infiltrazione scelta dentro l'area aperta («Infiltrazioni in quest'area»): l'area e la versione restano. */
  const scegliInfiltrazioneQui = (k: string) => (areaFisica ? apriArea(areaFisica.slug, k, planimetriaScelta) : scegliInfiltrazione(k));
  /** Un'altra versione dell'area: cambia solo `?planimetria=` (sostituendo la voce della cronologia), come nella pagina dell'Area (L2). */
  const scegliVersione = (p: string) => {
    const q = new URLSearchParams(params);
    q.set('planimetria', p);
    for (const k of ['spillo', 'x', 'y', 'zoom']) q.delete(k);
    setParams(q, { replace: true });
  };
  /** Un'infiltrazione eliminata dalla guida: se era quella aperta, la scheda torna sul Palazzo. */
  const areaEliminata = (k: string) => { if (area?.chiave === k) navigate(base); };
  /** Rilegge il Palazzo e l'area aperta (dopo una modifica di aree, versioni o legami). */
  const rileggiTutto = async () => { setRevisioneArea((r) => r + 1); await dati.ricarica(); setVersioneStati((v) => v + 1); };
  const [finestra, setFinestra] = useState<'aggiungi-area' | 'aggiungi-planimetria' | 'modifica-area' | 'elimina-area' | 'nuova-infiltrazione' | null>(null);
  const [legami, setLegami] = useState<string | null>(null);
  // R3-41: da 1024 px la riga dell'infiltrazione è una sola, e «Modifica testo» e «Descrizione» si aprono dal suo menu
  const largo = useMedia('(min-width: 1024px)');
  const moltoLargo = useMedia('(min-width: 1280px)');
  // la chiave dell'infiltrazione di cui si corregge il testo o si legge la descrizione: cambiando infiltrazione si chiudono da sé
  const [correggendoInfiltrazione, setCorreggendoInfiltrazione] = useState<string | null>(null);
  const [descrizioneAperta, setDescrizioneAperta] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);
  const contenitorePalazzo = { tipo: 'dungeon' as const, chiave };
  const infiltrazioniPalazzo = (d?.aree ?? []).map((a) => ({ chiave: a.chiave, nome: a.nome, ordine: a.ordine }));
  /** Salva l'ordine nuovo delle aree del Palazzo; vero se è andato. */
  const riordinaAreePalazzo = async (ordine: string[]): Promise<boolean> => {
    try { await riordinaAree(contenitorePalazzo, ordine); notifica('success', 'Ordine delle aree salvato.'); await rileggiTutto(); return true; }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Ordine non salvato.'); return false; }
  };
  /** Elimina l'area aperta (con la conferma della finestra, che dice cosa si porta via): va nel cestino, la scheda torna sul Palazzo. */
  const eliminaAreaFisica = async () => {
    if (!areaFisica) return;
    setOccupato(true);
    try {
      await eliminaAreaMondo(contenitorePalazzo, areaFisica.slug, true);
      notifica('success', `${areaFisica.nome} è nel cestino: da Impostazioni → Cestino la rimetti com’era.`);
      setFinestra(null);
      navigate(area ? `${base}?infiltrazione=${encodeURIComponent(area.chiave)}` : base, { replace: true });
      await dati.ricarica();
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Area non eliminata.'); }
    finally { setOccupato(false); }
  };
  /** Un'infiltrazione nuova (con le aree toccate): creata, la scheda la apre. */
  const nuovaInfiltrazione = async (b: DatiNuovaInfiltrazione) => {
    setOccupato(true);
    try {
      const creata = await creaArea(chiave, b);
      notifica('success', `Infiltrazione «${b.nome}» creata.`);
      setFinestra(null);
      await dati.ricarica();
      scegliInfiltrazione(creata.chiave);
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Infiltrazione non creata.'); }
    finally { setOccupato(false); }
  };
  // L'anello conta quel che si raccoglie: collezionabili delle planimetrie (Palazzi) o elementi delle aree dei dedali (Memento, 099).
  // L4 (§1.5, §8.10): nei Palazzi l'anello conta gli oggetti permanenti (numeri del server, percentuale per difetto come la sua); nei
  // Memento gli obiettivi dei dedali, come prima (R4-30)
  const anello = d ? anelloPalazzo(d, memento) : null;
  const percentuale = anello ? (memento ? Math.round(anello.quota * 100) : Math.floor(anello.quota * 100)) : null;
  const livello = d && !memento ? livelloPalazzo(d) : null;
  const conti = d && !memento ? d.completamento : undefined;
  // le planimetrie complete con la regola unica (L4 §1.5: senza niente da contare è completa); senza i numeri nuovi, il conto di prima
  const planimetrieComplete = d ? (d.planimetrie.some((p) => p.completamento) ? (d.planimetrie.some((p) => p.completamento?.completata === null) ? null : d.planimetrie.filter((p) => p.completamento?.completata).length) : d.raccolta.mappeComplete) : null;
  const areeSuggerite = (d?.aree ?? []).filter((a) => sugg.evidenziato('aree', a.chiave)).length;
  const suggerimentoDiffuso = !!d && d.aree.length > 0 && areeSuggerite === d.aree.length;
  /** Se un'area va evidenziata come suggerita: no quando lo sono tutte, perché allora il suggerimento riguarda il Palazzo intero e lo dice il chip dell'intestazione. */
  const areaSuggerita = (chiaveArea: string) => !suggerimentoDiffuso && sugg.evidenziato('aree', chiaveArea);
  const tempoInProsa = !d ? [] : ([
    { etichetta: 'Si apre', valore: d.date.sblocco },
    { etichetta: 'Furto consigliato', valore: d.date.furtoConsigliato },
    { etichetta: 'Scade', valore: d.date.scadenza },
  ] as const).filter((t) => !!t.valore && t.valore !== dataBreve(t.valore));
  /** Apre la sezione «Da verificare» (in fondo a «Da raccogliere») e la porta in vista. */
  const apriDaVerificare = () => { const s = sezioneDaVerificare.current; if (s) { s.open = true; s.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }); } };
  /** R3-41, da 1024 px: il chip che riassume livello («Concluso», «Completato» o «In corso»), Tesoro e boss (✓/✗) e «N da verificare».
   *  Con divergenze è un pulsante che apre la loro sezione; il dettaglio di Tesoro e boss sta nei «Dettagli dalla guida». */
  const chipRiassunto = () => {
    if (!d) return null;
    const c = d.completamento;
    const conPartita = !!c && c.tesoro !== null && c.boss !== null;
    if (!conPartita && quanteDaVerificare === 0) return null;
    // concluso o completato vogliono già dire Tesoro e boss fatti: il chip dice solo il livello; prima, Tesoro e boss coi segni
    const parti = [
      ...(conPartita ? (livello ? [livello.testo] : [`Tesoro ${c!.tesoro ? '✓' : '✗'}`, `Boss ${c!.boss ? '✓' : '✗'}`]) : []),
      ...(quanteDaVerificare > 0 ? [`${quanteDaVerificare} da verificare`] : []),
    ];
    const nome = [
      ...(conPartita ? [`${livello?.testo ?? 'In corso'}: Tesoro ${c!.tesoro ? 'raccolto' : 'da prendere'}, boss finale ${c!.boss ? 'sconfitto' : 'da sconfiggere'}`] : []),
      ...(quanteDaVerificare > 0 ? [`${quanteDaVerificare} da verificare`] : []),
    ].join('; ');
    const titolo = livello?.perche ?? 'Si conclude col Tesoro del Palazzo raccolto e il boss finale sconfitto; si completa con tutti gli oggetti permanenti fatti.';
    const classe = `chip ${quanteDaVerificare > 0 ? 'chip--oro' : livello?.testo === 'Completato' ? 'chip--attivo' : ''}`;
    return quanteDaVerificare > 0
      ? <button type="button" className={`${classe} touch`} title={`${titolo} — tocca per i pin da verificare`} aria-label={nome} onClick={apriDaVerificare}>{parti.join(' · ')}</button>
      : <span className={classe} title={titolo} aria-label={nome}>{parti.join(' · ')}</span>;
  };
  /** «Dettagli dalla guida»: livello consigliato, le date per esteso, le note e, nei Palazzi da 1024 px, i conteggi che lasciano la riga
   *  sotto il titolo (R3-41). `classe` dice dove si vede: sotto i 1024 in fondo alla riga dei dati, da 1024 nella riga del titolo. */
  const dettagliGuida = (classe: string) => d && (d.livelloConsigliato || d.note || tempoInProsa.length > 0 || !memento) ? (
    <details className={`text-[12px] ${classe}`}>
      <summary className="touch cursor-pointer text-text-muted">Dettagli dalla guida</summary>
      <div className="flex flex-col gap-1 pt-1.5">
        {!memento && <span className="hidden flex-wrap gap-1.5 lg:flex">
          <span className="chip">{d.aree.length} infiltrazioni</span>
          <span className="chip" title="I collezionabili sulle planimetrie (forzieri, semi, tesori).">{d.raccolta.totale} da raccogliere</span>
          <span className="chip" title="Sicure, scorciatoie, enigmi, incontri e boss della guida.">{d.punti} punti della guida</span>
        </span>}
        {/* il dettaglio del chip riassuntivo (R3-41, scelta 3): Tesoro e boss per esteso, e il perché del livello */}
        {!memento && d.completamento && d.completamento.tesoro !== null && d.completamento.boss !== null && (
          <span className="hidden text-[12px] text-text-secondary lg:block">
            Tesoro {d.completamento.tesoro ? 'raccolto' : 'da prendere'} · boss finale {d.completamento.boss ? 'sconfitto' : 'da sconfiggere'}{livello ? ` · ${livello.testo}: ${livello.perche}` : ''}
          </span>
        )}
        {d.livelloConsigliato && <TestoRipiegabile testo={`Livello consigliato: ${d.livelloConsigliato}`} massimo={120} className="text-[13px] text-text-secondary" />}
        {tempoInProsa.map((t) => <TestoRipiegabile key={t.etichetta} testo={`${t.etichetta}: ${t.valore}`} massimo={90} className="text-[12px] text-text-muted" />)}
        {d.note && <TestoRipiegabile testo={d.note} massimo={140} className="text-[12px] text-text-muted whitespace-pre-wrap" />}
      </div>
    </details>
  ) : null;
  // Con un'area aperta la colonna di destra mostra **quell'area** (rilievo dell'utente, 2026-10-01: «in ogni area sembrano poi vedersi
  // i raccoglibili di tutte le altre aree»); il resto del Palazzo sta nella piega qui sotto. I numeri restano per planimetria (R3-31).
  const mappeArea = planimetrieArea;
  const vuotoArea = !areaFisica ? 'Nessuna area aperta: niente da raccogliere qui.' : 'Niente da raccogliere sulle planimetrie di quest’area.';
  const altrePlanimetrie = (d?.planimetrie ?? []).filter((p) => !mappeArea.some((m) => m.chiave === p.chiave));
  const restanoAltre = altrePlanimetrie.reduce((s, p) => s + p.n - (p.presi ?? 0), 0);
  // Il Palazzo ha un'illustrazione da mostrare nell'intestazione (la stessa regola di IllustrazioneConSegno): i Memento no.
  const illustrato = !!useImmagineMappa(memento ? null : d?.illustrazione);

  const senzaPin = versioneSenzaPin(versioniArea, planimetriaScelta);
  /** Le azioni dell'area aperta: «Modifica» e «Planimetria» (da 1280 px solo icona) ed «Elimina», che sotto i 768 px e da 1024 a 1279
   *  sta nel menu «Altro» (UX2-3, UX3-3). Stanno nella riga del nome dell'area o, da 1024 px con più versioni, in fondo alla loro fila. */
  const azioniArea = () => (
    <span className="flex flex-wrap items-center gap-1.5 lg:shrink-0 lg:flex-nowrap">
      <PulsanteVisivo tono="secondario" compatto className="btn-visivo--icona-xl" icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" aria-label="Modifica area" title="Modifica area" disabled={!dettaglioArea.dati} onClick={() => setFinestra('modifica-area')} />
      {/* sotto i 768 px anche «Aggiungi planimetria» sta in «Altro» (UX3-3): «Modifica» e «Altro» stanno in una riga */}
      <span className="hidden md:inline-flex">
        <PulsanteVisivo tono="secondario" compatto className="btn-visivo--icona-xl" icona={<IconaAzione chiave="carica" dimensione={20} />} titolo="Planimetria" aria-label="Aggiungi planimetria" title="Aggiungi planimetria" disabled={!dettaglioArea.dati} onClick={() => setFinestra('aggiungi-planimetria')} />
      </span>
      {/* «Elimina» come nella pagina Area (UX2-3, UX3-3): in vista da 768 a 1023 px e da 1280 px (lì solo icona); sotto i
          768 px e da 1024 a 1279 px nel menu «Altro», così a telefono la riga non va a capo e il visore sale */}
      <span className="hidden md:max-lg:inline-flex xl:inline-flex">
        <PulsanteVisivo tono="fantasma" compatto className="btn-visivo--icona-xl text-error" icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" aria-label="Elimina area" title="Elimina area" onClick={() => setFinestra('elimina-area')} />
      </span>
      {/* sotto i 768 px «Altro» sta a inizio riga (la riga va a capo sotto il nome): il menu si apre verso destra, non fuori dallo schermo */}
      <details className="menu-altro relative md:max-lg:hidden xl:hidden max-md:[&_.menu-altro\_\_voci]:left-0 max-md:[&_.menu-altro\_\_voci]:right-auto">
        <summary className="btn btn-ghost btn-sm touch list-none" aria-label="Altre azioni dell’area">Altro ▾</summary>
        <div className="menu-altro__voci">
          <button type="button" className="btn btn-ghost touch justify-start md:hidden" disabled={!dettaglioArea.dati} onClick={(e) => { e.currentTarget.closest('details')?.removeAttribute('open'); setFinestra('aggiungi-planimetria'); }}>Aggiungi planimetria</button>
          <button type="button" className="btn btn-ghost touch justify-start text-error" onClick={(e) => { e.currentTarget.closest('details')?.removeAttribute('open'); setFinestra('elimina-area'); }}>Elimina area</button>
        </div>
      </details>
    </span>
  );

  /** R3-41 (decisione del PM, 2026-10-20), da 1024 px: la riga dell'infiltrazione è una sola — il selettore (il titolo), le aree toccate
   *  in una fila scorrevole (da 1280 i chip «Aree toccate»; da 1024 a 1279 la fila di tutte le aree, con le toccate evidenziate, che lì
   *  sostituisce la colonna), il menu «Altro» con «Modifica testo», «Modifica aree» e «Descrizione», e «Aggiungi infiltrazione». Il
   *  modulo della correzione e la descrizione si aprono sotto la riga, solo quando li si chiede. */
  const rigaInfiltrazioneLarga = () => {
    if (!d || !area) return null;
    const chiudiMenu = (e: { currentTarget: HTMLElement }) => e.currentTarget.closest('details')?.removeAttribute('open');
    return <>
      <div className="flex items-center gap-2">
        {d.aree.length > 1
          ? <div className="flex w-[min(15rem,40%)] shrink-0 items-center gap-1">
              <h2 className="sr-only">{area.nome}</h2>
              {/* compatto (una riga da 44, l'etichetta «Infiltrazione N di M» resta il nome per chi non vede): con l'etichetta sopra il
                  valore andava su due righe, 65 px (R3-41); «di M» accanto, piccolo */}
              <Selettore compatto className="min-w-0 flex-1" etichetta={`Infiltrazione ${area.ordine + 1} di ${d.aree.length}`} valore={area.chiave}
                opzioni={d.aree.map((a) => ({ chiave: a.chiave, nome: `${a.ordine + 1}. ${a.nome}`, dettaglio: completate.has(a.chiave) ? 'completata' : undefined }))} onCambia={scegliInfiltrazione} />
              <span className="shrink-0 text-[11px] text-text-muted" aria-hidden>di {d.aree.length}</span>
            </div>
          : <span className="flex shrink-0 flex-col"><h2 className="m-0 font-display text-[17px] uppercase leading-none">{area.nome}</h2><span className="text-[11px] text-text-muted">infiltrazione 1 di 1</span></span>}
        <div className="min-w-0 flex-1">
          {moltoLargo
            // `pb-0`: la barra sottile della fila sta subito sotto i chip, senza i 4 px in più (R3-41); la barra resta, evidente
            ? <FilaScorrevole className="fila-scorrevole--sempre items-center pb-0" aria-label={`Aree toccate da ${area.nome}`} role="list">
                <span className="shrink-0 text-[11px] uppercase tracking-wide text-text-muted" aria-hidden>Aree toccate</span>
                {(area.areePalazzo ?? []).length === 0 && <span className="shrink-0 text-[12px] text-text-muted">nessuna</span>}
                {(area.areePalazzo ?? []).map((a) => (
                  <span key={a.chiave} role="listitem" className="shrink-0">
                    <button type="button" className={`chip touch text-[11px] ${a.chiave === areaFisica?.chiave ? 'chip--attivo' : ''}`} aria-pressed={a.chiave === areaFisica?.chiave}
                      onClick={() => apriArea(a.slug, area.chiave, a.planimetriaIniziale)}>{a.nome}</button>
                  </span>
                ))}
              </FilaScorrevole>
            : <AreePalazzo forma="fila" aree={areePalazzo} infiltrazioni={d.aree} areaScelta={areaFisica?.slug ?? null} infiltrazioneScelta={area.chiave}
                completate={completate} onScegliArea={scegliAreaFisica} onScegliInfiltrazione={scegliInfiltrazione} onCollegaAree={setLegami}
                onAggiungiArea={() => setFinestra('aggiungi-area')} onRiordina={riordinaAreePalazzo} />}
        </div>
        <details className="menu-altro relative shrink-0">
          <summary className="btn btn-ghost btn-sm touch list-none" aria-label={`Altre azioni dell’infiltrazione «${area.nome}»`}>Altro ▾</summary>
          <div className="menu-altro__voci">
            <button type="button" className="btn btn-ghost touch justify-start" onClick={(e) => { chiudiMenu(e); setCorreggendoInfiltrazione(area.chiave); }}>✎ Modifica testo</button>
            <button type="button" className="btn btn-ghost touch justify-start" onClick={(e) => { chiudiMenu(e); setLegami(area.chiave); }}>Modifica aree</button>
            {area.descrizione && <button type="button" className="btn btn-ghost touch justify-start" aria-expanded={descrizioneAperta === area.chiave}
              onClick={(e) => { chiudiMenu(e); setDescrizioneAperta((x) => (x === area.chiave ? null : area.chiave)); }}>{descrizioneAperta === area.chiave ? 'Nascondi la descrizione' : 'Descrizione'}</button>}
          </div>
        </details>
        <PulsanteVisivo tono="fantasma" compatto className="btn-visivo--icona-xl shrink-0" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Infiltrazione" aria-label="Aggiungi infiltrazione" title="Aggiungi infiltrazione" onClick={() => setFinestra('nuova-infiltrazione')} />
      </div>
      {correggendoInfiltrazione === area.chiave && (
        <CorrezioneGuida key={area.chiave} aperta onChiudi={() => setCorreggendoInfiltrazione(null)} cosa={`l’infiltrazione «${area.nome}»`} etichetta="Modifica testo"
          iniziale={() => ({ nome: area.nome, descrizione: area.descrizione })}
          onSalva={async (b) => { await aggiornaArea(area.chiave, b); await dati.ricarica(); }}
          elimina={{
            avviso: `Se ne va dalla guida per tutte le partite${area.punti.length ? `, con i suoi ${area.punti.length} punti e quel che le partite ne avevano segnato` : ''}; le aree del Palazzo restano, con le loro altre infiltrazioni. ${NEL_CESTINO}`,
            onElimina: async () => { const k = area.chiave; await eliminaArea(k); areaEliminata(k); await dati.ricarica(); },
          }}>
          {(b, cambia) => <>
            <CampoCorrezione etichetta="Nome dell’infiltrazione" valore={b.nome} massimo={LIMITI_GUIDA.area.nome} onCambia={(v) => cambia({ nome: v })} />
            <CampoCorrezione etichetta="Descrizione" valore={b.descrizione} multilinea massimo={LIMITI_GUIDA.area.descrizione} onCambia={(v) => cambia({ descrizione: v })} />
          </>}
        </CorrezioneGuida>
      )}
      {descrizioneAperta === area.chiave && area.descrizione && <p className="m-0 text-[13px] text-text-secondary whitespace-pre-wrap">{area.descrizione}</p>}
    </>;
  };

  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && area && (
        // **Da 1024 px il Palazzo sta in una schermata** (richiesta dell'utente, 2026-09-29): «componenti che
        // sforano la pagina… aggiungendo una scrollbar di pagina che non è accettabile… tutti i componenti devono
        // finire con la stessa altezza». La pagina prende l'altezza dell'area di lettura, l'intestazione la sua, e
        // le colonne il resto: finiscono tutte allo stesso punto e ognuna scorre per conto suo (area-scorrevole).
        // Sotto i 1024 px le colonne sono una sola e scorre la pagina, l'unico scorrimento. Vale per i Palazzi e
        // per i Memento (2026-09-30).
        // R3-41: da 1024 px fra intestazione e colonne 12 px (non 16), e la colonna centrale con margini interni di 12 e righe a 8
        <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:gap-3">
          {/* ---- Intestazione: l'emblema, il nome, il tempo ----
              Da 1024 px è **compatta su due righe** (scelta dell'utente, 2026-09-30): alta 266 px, con il browser
              sul portatile lasciava alle colonne meno di metà dello schermo. Prima riga emblema e anello piccoli,
              nome, sovrano e arcana; seconda riga la finestra del Palazzo, i conteggi e «Dettagli dalla guida». */}
          {/* Collegando i pin la testata si ritira: l'altezza va alla mappa, che altrimenti faceva scorrere la colonna su uno schermo
              basso («appare la barra che fa salire e scendere la finestra», 2026-10-18); si torna con «Fatto». */}
          {!collegamento && <header className="card relative shrink-0 overflow-hidden lg:py-1.5">
            {/* Lo stemma grande e tenue nell'angolo resta solo dove non c'è l'illustrazione: accanto a una figura piena sarebbe un
                secondo stemma, e velato (L1). */}
            {!illustrato && <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 hidden opacity-[0.07] sm:block">
              <EmblemaDungeon chiave={d.chiave} nome={d.nome} arcanaSovrano={d.arcanaSovrano} dimensione={280} />
            </span>}
            {/* Nei Memento (2026-10-12) l'intestazione è compatta a ogni larghezza, come da 1024 px: emblema e anello piccoli in riga. */}
            <div className={`relative flex gap-3 ${memento ? 'flex-row items-center' : 'flex-col sm:flex-row sm:items-start sm:gap-5 lg:items-center lg:gap-3'}`}>
              {/* Da 1280 px, con l'illustrazione, figura e anello stanno in colonna: affiancati prendevano larghezza al testo e
                  in Shido, Niijima e Madarame il sovrano andava a capo (intestazione da 170 a 222 px); in colonna occupano la
                  larghezza dello stemma e dell'anello di prima e un'altezza che l'intestazione ha già (UX-1, 2026-10-20). */}
              {/* R3-41 (decisione del PM, 2026-10-20): da 1024 px stemma piccolo e anello in riga accanto al titolo (variante G1 di L1),
                  e l'illustrazione passa a sfondo dell'intestazione (sotto): in colonna, alta 115 px, teneva alta l'intestazione. */}
              <div className={`flex shrink-0 items-center gap-3 ${memento ? 'gap-2' : 'sm:flex-col lg:flex-row lg:gap-2'}`}>
                {/* Nei Palazzi l'illustrazione della radice `dungeon-<chiave>` (la caricata: l'asset della radice è lo stemma) con
                    lo stemma sopra come segno (scelta dell'utente, 2026-10-20); senza, lo stemma com'era. Le misure: 150 px sul
                    telefono, 176 sul tablet, solo lo stemma da 1024 a 1279 e 104, sopra l'anello, da 1280 (vedi sotto).
                    I Memento restano col loro stemma. */}
                {(() => {
                  const emblema = (dimensione: number) => <EmblemaDungeon chiave={d.chiave} nome={d.nome} arcanaSovrano={d.arcanaSovrano} dimensione={dimensione} />;
                  // il riquadro ha una larghezza fissa (`classe`), e la stessa misura (`sizes`) dice al browser quale miniatura scaricare
                  const figura = (classe: string, sizes: string, stemma: number, senza: number) => memento ? emblema(senza)
                    : <IllustrazioneConSegno illustrazione={d.illustrazione} alt={`Illustrazione di ${d.nome}`} className={classe} sizes={sizes}
                        segno={emblema(stemma)} senza={emblema(senza)} />;
                  return <>
                    <span className={memento ? 'lg:hidden' : 'sm:hidden'}>{memento ? emblema(40) : figura('w-[150px]', '150px', 34, 52)}</span>
                    {!memento && <span className="hidden sm:block lg:hidden">{figura('w-[176px]', '176px', 40, 80)}</span>}
                    {/* Da 1024 a 1279 px lo stemma da 48, senza illustrazione (decisione di L1, UX-1). Da 1280 px l'illustrazione piena, al
                        100%, nel suo spazio (104 px, lo stemma da 40 sopra), in riga con l'anello e non più in colonna: alta 59 px, sta nelle due
                        righe dell'intestazione compatta (R3-41). Mai velata dietro al testo (regola dell'utente, UX3-6). */}
                    <span className="hidden lg:block xl:hidden">{emblema(48)}</span>
                    <span className="hidden xl:block">{figura('w-[104px]', '104px', 40, 48)}</span>
                  </>;
                })()}
                {anello && percentuale !== null && (
                  // un anello solo (è la barra di avanzamento della pagina): da 1024 px si rimpicciolisce, non si duplica
                  <AnelloAvanzamento quota={anello.quota} dimensione={64} spessore={5} className={memento ? 'size-12!' : 'lg:size-12!'} etichetta={anello.etichetta}>
                    <span className={`font-display leading-none tabular-nums ${memento ? 'text-[13px]' : 'text-[17px] lg:text-[13px]'}`}>{percentuale}%</span>
                  </AnelloAvanzamento>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2.5 lg:gap-1">
                <div className="flex flex-col gap-1 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* nei Palazzi da 1024 px solo l'icona (R3-41, scelta 3 del PM): il nome resta per chi non vede e nel suggerimento */}
                    <button type="button" className="btn btn-ghost btn-sm touch -ml-2" title="Indietro" onClick={() => navigate(-1)}><IconChevronLeft size={18} /><span className={memento ? '' : 'lg:sr-only'}> Indietro</span></button>
                    <h1 className="titolo-display m-0 break-words">{d.nome}</h1>
                    {/* nei Memento la correzione della scheda è un comando per sistemare la guida: solo in «Modifica la guida» */}
                    {(!memento || modifica) && <CorrezioneGuida cosa={memento ? 'i Memento' : `il Palazzo «${d.nome}»`} etichetta="Correggi la scheda" classeEtichetta={memento ? undefined : 'lg:sr-only'}
                      iniziale={() => ({ nome: d.nome, sovrano: d.sovrano, dataSblocco: d.date.sblocco, dataScadenza: d.date.scadenza, furtoConsigliato: d.date.furtoConsigliato, livelloConsigliato: d.livelloConsigliato, note: d.note })}
                      onSalva={async (b) => { await aggiornaDungeon(d.chiave, b); await dati.ricarica(); }}>
                      {(b, cambia) => {
                        /** Un campo del modulo di correzione legato alla chiave della bozza, con etichetta, limite di lunghezza ed eventuale testo su più righe. */
                        const campo = (k: keyof typeof b & string, etichetta: string, massimo: number, multilinea?: boolean) => <CampoCorrezione key={k} etichetta={etichetta} valore={b[k]} multilinea={multilinea} massimo={massimo} onCambia={(v) => cambia({ [k]: v } as Partial<typeof b>)} />;
                        return <>
                          {campo('nome', 'Nome', LIMITI_GUIDA.dungeon.nome)}{campo('sovrano', 'Sovrano', LIMITI_GUIDA.dungeon.sovrano)}
                          {campo('dataSblocco', 'Si apre', LIMITI_GUIDA.dungeon.data)}{campo('furtoConsigliato', 'Furto consigliato', LIMITI_GUIDA.dungeon.data)}{campo('dataScadenza', 'Scade', LIMITI_GUIDA.dungeon.data)}
                          {campo('livelloConsigliato', 'Livello consigliato', LIMITI_GUIDA.dungeon.livello)}{campo('note', 'Note della guida', LIMITI_GUIDA.dungeon.note, true)}
                        </>; }}
                    </CorrezioneGuida>}
                  </div>
                  {/* Da 1024 px sovrano e arcana prendono quel che resta della riga del nome, ognuno su una riga coi puntini (testo intero nel
                      suggerimento): in Madarame e Okumura il sovrano è una frase e andava a capo (intestazione da 170 a 197 px), l'arcana di
                      Maruki la portava a 270 (L3, R3-41). Sotto i 160 px rimasti vanno a capo, interi come sotto i 1024. */}
                  <div className="flex flex-wrap items-center gap-2 text-[13px] text-text-secondary lg:min-w-0 lg:flex-1 lg:basis-40 lg:flex-nowrap">
                    {/* nei Memento, sul telefono, il sovrano sta nella piega dei dettagli: qui andava a capo su due righe */}
                    {/* LAY3-2: quando lo spazio non basta si accorcia prima l'arcana (si restringe mille volte più in fretta, fino a 3rem coi
                        puntini) e il nome del sovrano resta leggibile; solo dopo tocca al sovrano */}
                    {d.sovrano && <span className={`break-words lg:min-w-0 lg:truncate lg:[flex-shrink:1] ${memento ? 'max-md:hidden' : ''}`} title={d.sovrano}>{d.sovrano}</span>}
                    {d.arcanaSovranoNome && <span className="chip chip--attivo lg:block lg:min-w-[3rem] lg:max-w-[18rem] lg:truncate lg:[flex-shrink:1000]" title={d.arcanaSovranoNome}>{d.arcanaSovranoNome}</span>}
                    {memento && suggerimentoDiffuso && <span className="chip chip--attivo" title={sugg.motivo('dungeon', d.chiave) ?? undefined}>Suggerito oggi</span>}
                  </div>
                  {/* R3-41: da 1024 px nei Palazzi i «Dettagli dalla guida» chiudono la riga del titolo (aperti vanno a capo, sotto) */}
                  {!memento && dettagliGuida('hidden lg:block lg:open:basis-full')}
                </div>
                {/* Da 1024 px finestra, conteggi e dettagli stanno su una riga; i dettagli aperti vanno a capo, sotto. Nei Memento
                    (2026-10-12) la riga sta in una piega: lo spazio va ai dedali e alle aree, che sono la pagina. */}
                {(() => { const riga = <>
                {memento && d.sovrano && <span className="text-[13px] text-text-secondary md:hidden">{d.sovrano}</span>}
                <LineaDelTempo date={d.date} memento={memento} />
                {/* `lg:contents`: da 1024 px i chip entrano nella riga uno per uno, e vanno a capo solo quelli che non ci stanno. */}
                <div className="flex flex-wrap items-center gap-2 lg:contents">
                  {/* nei Palazzi «Mappa del Palazzo» non c'è più: il visore è nella scheda stessa (L3, §4.1); nei Memento resta */}
                  {memento && <CollegamentoMappa tipo="dungeon" chiave={d.chiave} testo="Mappa dei Memento" />}
                  {/* Quando compare sulla mappa di Tokyo e dove si atterra toccandolo (2026-10-04) */}
                  <AtterraggioTokyo dungeon={d} onSalvato={() => dati.ricarica()} compatto={!memento} />
                  {/* nei Palazzi, da 1024 px, infiltrazioni, collezionabili e punti della guida stanno nei «Dettagli dalla guida» (R3-41: la
                      riga sotto il titolo tiene finestra, atterraggio, aree e planimetrie, percentuale) */}
                  <span className={`chip ${memento ? '' : 'lg:hidden'}`}>{d.aree.length} {memento ? 'dedali' : 'infiltrazioni'}</span>
                  <span className={`chip ${memento ? '' : 'lg:hidden'}`} title={memento ? 'Gli elementi delle aree dei dedali (Richieste, timbri, voci di Trama): sono questi a fare la percentuale; le Persona no.' : 'I collezionabili sulle planimetrie (forzieri, semi, tesori).'}>{d.raccolta.totale} {memento ? 'elementi' : 'da raccogliere'}</span>
                  {!memento && <span className="chip" title="Le aree del Palazzo, con le loro versioni: si ordinano e si correggono dall’elenco delle aree.">
                    {areePalazzo.length} {areePalazzo.length === 1 ? 'area' : 'aree'} · {d.planimetrie.length} planimetrie{planimetrieComplete !== null ? ` · ${planimetrieComplete} complete` : ''}
                  </span>}
                  {largo && !memento
                    // R3-41 (scelta 3 del PM): da 1024 px livello, Tesoro, Boss e «da verificare» in un solo chip riassuntivo; Tesoro e boss
                    // per esteso stanno nei «Dettagli dalla guida». Con qualcosa da verificare il chip apre quella sezione.
                    ? chipRiassunto()
                    : <>
                  {/* L4 (§4.3, §8.10): Tesoro e boss finale (il «concluso», che governa gli effetti) e il livello raggiunto, in un chip solo */}
                  {conti && conti.tesoro !== null && conti.boss !== null && (
                    <span className={`chip ${livello?.testo === 'Completato' ? 'chip--attivo' : ''}`} title={livello?.perche ?? 'Si conclude col Tesoro del Palazzo raccolto e il boss finale sconfitto; si completa con tutti gli oggetti permanenti fatti.'}
                      aria-label={`${livello ? `${livello.testo}: ` : ''}Tesoro ${conti.tesoro ? 'raccolto' : 'da prendere'}, boss finale ${conti.boss ? 'sconfitto' : 'da sconfiggere'}`}>
                      {livello ? `${livello.testo} · ` : ''}Tesoro {conti.tesoro ? '✓' : '✗'} · Boss {conti.boss ? '✓' : '✗'}
                    </span>
                  )}
                  {/* il chip apre la sezione «Da verificare» (in fondo a «Da raccogliere») e la porta in vista */}
                  {quanteDaVerificare > 0 && <button type="button" className="chip chip--oro touch" title="Pin fatti con una voce non fatta, da prima dell’aggiornamento: tocca per sistemarli"
                    onClick={apriDaVerificare}>{quanteDaVerificare} da verificare</button>}
                  </>}
                  <span className={`chip ${memento ? '' : 'lg:hidden'}`} title="Sicure, scorciatoie, enigmi, incontri e boss della guida.">{d.punti} punti della guida</span>
                  {suggerimentoDiffuso && !memento && <span className="chip chip--attivo" title={sugg.motivo('dungeon', d.chiave) ?? undefined}>Suggerito oggi</span>}
                </div>
                {/* nei Palazzi, da 1024 px, i «Dettagli dalla guida» stanno nella riga del titolo (R3-41): qui solo sotto i 1024 */}
                {dettagliGuida(memento ? 'lg:open:basis-full' : 'lg:hidden')}
                </>;
                return memento
                  ? <details className="text-[12px]">
                      <summary className="touch cursor-pointer text-text-muted">Date, mappe e conteggi del Memento</summary>
                      <div className="flex flex-col gap-2.5 pt-1.5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2">{riga}</div>
                    </details>
                  : <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2">{riga}</div>;
                })()}
              </div>
            </div>
          </header>}

          {/* Da 1024 px una riga sola, alta quanto resta (`minmax(0,1fr)`): le colonne si stirano fino in fondo. Il
              minimo evita colonne schiacciate su uno schermo più basso di un portatile con il browser aperto: lì, e
              solo lì, torna a scorrere la pagina. */}
          {/* ---- I Memento (progetto approvato del 2026-10-12): da 1024 px il binario dei dedali a sinistra e il dedalo a destra,
              ognuno col suo scorrimento; sul tablet i dedali in fila sopra il dedalo; sul telefono la tendina sta nella scheda del
              dedalo. Da 1024 px il disegno del pozzo sta fisso in cima al binario; sotto, si apre a richiesta in una finestra. ---- */}
          {memento && (() => {
            const scelto = area.dedalo ? { ...area, dedalo: area.dedalo } : null;
            return (
              // la colonna dei dedali è larga 260 px da 1024 e 300 da 1280 (richiesta dell'utente, 2026-10-12: «allarga la colonna
              // dedali»): a 1024 la colonna del dedalo resta sui 430 px, a 1280 le due colonne dell'area restano affiancate
              <div className="grid grid-cols-1 items-start gap-3 lg:min-h-[280px] lg:flex-1 lg:grid-cols-[260px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:items-stretch xl:grid-cols-[300px_minmax(0,1fr)]">
                {/* «lascia sempre visibile Pozzo» (2026-10-12, scelta «Disegno fisso in cima»): il disegno del pozzo sta fermo in cima
                    alla colonna e si tocca per scegliere il dedalo; sotto, l'elenco dei dedali scorre da solo */}
                <nav aria-label="Dedali dei Memento" className="hidden min-h-0 flex-col gap-1.5 lg:flex">
                  <MappaMemento aree={d.aree} selezionata={area.chiave} onSeleziona={scegliArea} className="shrink-0" />
                  <div className="flex min-h-0 flex-1 flex-col gap-1 area-scorrevole p-1.5">
                    <span className="px-1 text-[11px] uppercase tracking-wide text-text-muted">Dedali</span>
                    {d.aree.map((a) => <DedaloNelBinario key={a.chiave} a={a} suggerito={areaSuggerita(a.chiave)} scelto={a.chiave === area.chiave} onScegli={() => scegliArea(a.chiave)} />)}
                  </div>
                </nav>
                <div className="flex min-w-0 flex-col gap-2.5 lg:min-h-0 lg:area-scorrevole lg:p-2">
                  {/* sul tablet: i dedali in fila, col pozzo */}
                  <div className="hidden items-center gap-2 md:flex lg:hidden">
                    <FilaScorrevole className="fila-scorrevole--sempre min-w-0 flex-1 items-center" aria-label="Dedali dei Memento">
                      {d.aree.map((a) => <DedaloNelBinario key={a.chiave} a={a} fila suggerito={areaSuggerita(a.chiave)} scelto={a.chiave === area.chiave} onScegli={() => scegliArea(a.chiave)} />)}
                    </FilaScorrevole>
                    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Pozzo" aria-label="Apri il pozzo dei Memento" onClick={() => setPozzo(true)} />
                  </div>
                  {scelto && <AreeDelDedalo key={area.chiave} dedalo={scelto} dedali={d.aree} onScegliDedalo={scegliArea} onApriPozzo={() => setPozzo(true)}
                    partitaId={partitaId} modifica={modifica} onModifica={setModifica} cambiaStato={cambiaStato} onPuntoAggiornato={aggiornaPunto}
                    onTimbri={aggiornaTimbri} onRichiesta={aggiornaRichiesta} catturate={catturate} onCattura={cattura}
                    onRicarica={async () => { await dati.ricarica(); setVersioneStati((v) => v + 1); }} />}
                </div>
                {pozzo && (
                  <Modal titolo="Il pozzo dei Memento" aperta onChiudi={() => setPozzo(false)}>
                    <MappaMemento aree={d.aree} selezionata={area.chiave} onSeleziona={(k) => { scegliArea(k); setPozzo(false); }} className="mx-auto w-[min(100%,calc(min(60vh,520px)*1.6))]" />
                  </Modal>
                )}
              </div>
            );
          })()}

          {/* collegando i pin l'elenco del Palazzo resta (2026-10-18, l'utente: «per quale motivo sparisce il menu laterale sinistro? come
              dovrei cambiare planimetria…»): toccare una planimetria la porta nella mappa del collegamento, senza cambiare area; lo spazio
              in più alla mappa lo dà l'altezza della tela */}
          {/* ---- Palazzi (L3, §4.2): «Aree · N» a sinistra da 1280 px (fila sopra il visore da 768, foglio dal basso sotto), al centro
              l'infiltrazione, l'area con le sue versioni e il visore, a destra quel che si raccoglie e la guida dell'infiltrazione. ---- */}
          {!memento && <div className="grid grid-cols-1 items-start gap-4 lg:min-h-[280px] lg:flex-1 lg:grid-rows-[minmax(0,1fr)] lg:items-stretch xl:grid-cols-[300px_minmax(0,1fr)]">
            {/* da 1280 px la colonna delle aree, alta quanto le altre, con lo scorrimento suo */}
            <nav aria-label="Il Palazzo" className="hidden xl:block xl:min-h-0">
              <div className="card h-full area-scorrevole p-2">
                {/* collegando i pin l'elenco resta (2026-10-18): toccare un'area porta la sua planimetria nella mappa del collegamento,
                    senza cambiare infiltrazione né area */}
                <AreePalazzo forma="colonna" aree={areePalazzo} infiltrazioni={d.aree} areaScelta={areaFisica?.slug ?? null} infiltrazioneScelta={area.chiave}
                  completate={completate} onScegliArea={collegamento ? (s) => setMappaCollegamento(areePalazzo.find((x) => x.slug === s)?.predefinita ?? null) : scegliAreaFisica}
                  onScegliInfiltrazione={scegliInfiltrazione} onCollegaAree={setLegami}
                  onAggiungiArea={() => setFinestra('aggiungi-area')} onRiordina={riordinaAreePalazzo} />
              </div>
            </nav>
            {/* ---- L'area scelta: planimetrie ---- */}
            {/* Da 1024 a 1279 px mappa e raccolta stanno una sotto l'altra in **un'area sola** che scorre; da 1280 px
                sono due colonne, ognuna con il suo scorrimento, e la mappa si allunga fino in fondo alla sua. */}
            <div className="grid grid-cols-1 items-start gap-4 lg:min-h-0 lg:max-xl:area-scorrevole lg:max-xl:p-2 xl:grid-rows-[minmax(0,1fr)] xl:items-stretch xl:grid-cols-[minmax(0,1fr)_352px]">
              <section className="card flex flex-col gap-2.5 lg:gap-1.5 lg:p-2.5 xl:min-h-0 xl:area-scorrevole">
                {/* R3-41 (decisione del PM, 2026-10-20): da 1024 px la riga dell'infiltrazione è una sola — selettore, aree toccate
                    scorrevoli, menu «Altro» con «Modifica testo», «Modifica aree» e «Descrizione», «Aggiungi infiltrazione» — così il visore
                    comincia entro metà altezza della finestra. Sotto i 1024 px resta com'era (le righe qui sotto). */}
                {largo && !collegamento ? rigaInfiltrazioneLarga() : <>
                {/* La riga dell'infiltrazione in una riga sola (R3-41): il selettore è il titolo, così versioni e visore restano nella prima
                    schermata del centro. Collegando i pin, o con un'infiltrazione sola, il titolo resta il nome. */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {!collegamento && d.aree.length > 1
                    ? <div className="min-w-0 flex-1 basis-44">
                        <h2 className="sr-only">{area.nome}</h2>
                        <Selettore etichetta={`Infiltrazione ${area.ordine + 1} di ${d.aree.length}`} valore={area.chiave}
                          opzioni={d.aree.map((a) => ({ chiave: a.chiave, nome: `${a.ordine + 1}. ${a.nome}`, dettaglio: completate.has(a.chiave) ? 'completata' : undefined }))} onCambia={scegliInfiltrazione} />
                      </div>
                    : <h2 className="m-0 font-display text-[19px] uppercase leading-none">{area.nome}</h2>}
                  {/* `key`: cambiando area il modulo si rimonta, altrimenti resterebbe aperto con il
                      testo dell'area di prima e lo salverebbe su quella nuova (rilievo della revisione). */}
                  {/* «Modifica testo» per esteso: la sola ✎ accanto al titolo non si trovava («come faccio a modificare
                      il testo delle Aree della guida?», 2026-09-30) */}
                  <CorrezioneGuida key={area.chiave} cosa={`l’infiltrazione «${area.nome}»`} etichetta="Modifica testo"
                    iniziale={() => ({ nome: area.nome, descrizione: area.descrizione })}
                    onSalva={async (b) => { await aggiornaArea(area.chiave, b); await dati.ricarica(); }}
                    // «Devo poter rimuovere un'area» (2026-09-30): l'eliminazione vera, per tutte le partite
                    elimina={{
                      avviso: `Se ne va dalla guida per tutte le partite${area.punti.length ? `, con i suoi ${area.punti.length} punti e quel che le partite ne avevano segnato` : ''}; le aree del Palazzo restano, con le loro altre infiltrazioni. ${NEL_CESTINO}`,
                      onElimina: async () => { const k = area.chiave; await eliminaArea(k); areaEliminata(k); await dati.ricarica(); },
                    }}>
                    {(b, cambia) => <>
                      <CampoCorrezione etichetta="Nome dell’infiltrazione" valore={b.nome} massimo={LIMITI_GUIDA.area.nome} onCambia={(v) => cambia({ nome: v })} />
                      <CampoCorrezione etichetta="Descrizione" valore={b.descrizione} multilinea massimo={LIMITI_GUIDA.area.descrizione} onCambia={(v) => cambia({ descrizione: v })} />
                    </>}
                  </CorrezioneGuida>
                  {(collegamento || d.aree.length <= 1) && <span className="text-[12px] text-text-muted">infiltrazione {area.ordine + 1} di {d.aree.length}</span>}
                  {!collegamento && <PulsanteVisivo tono="fantasma" compatto className="btn-visivo--icona-xl" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Infiltrazione" aria-label="Aggiungi infiltrazione" title="Aggiungi infiltrazione" onClick={() => setFinestra('nuova-infiltrazione')} />}
                </div>
                {/* Collegando i pin resta solo la riga del titolo (2026-10-18: «è inutile tutto ad eccezione del titolo»). */}
                {/* «Aree toccate» (§4.2): le aree che l'infiltrazione percorre, in ordine; toccarne una la apre. «Modifica aree» cambia i legami. */}
                {!collegamento && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] uppercase tracking-wide text-text-muted">Aree toccate</span>
                    <ol className="m-0 flex list-none flex-wrap gap-1 p-0" aria-label={`Aree toccate da ${area.nome}`}>
                      {(area.areePalazzo ?? []).map((a) => (
                        <li key={a.chiave}>
                          <button type="button" className={`chip touch text-[11px] ${a.chiave === areaFisica?.chiave ? 'chip--attivo' : ''}`} aria-pressed={a.chiave === areaFisica?.chiave}
                            onClick={() => apriArea(a.slug, area.chiave, a.planimetriaIniziale)}>{a.nome}</button>
                        </li>
                      ))}
                    </ol>
                    <button type="button" className="chip touch text-[11px]" onClick={() => setLegami(area.chiave)}>Modifica aree</button>
                    {/* la descrizione dell'infiltrazione in una piega sulla stessa riga: per esteso (anche ripiegata a 140 caratteri) spingeva
                        il visore sotto il bordo della colonna; aperta, va a capo sotto */}
                    {area.descrizione && (
                      <details className="text-[12px] open:basis-full">
                        <summary className="touch cursor-pointer text-text-muted">Descrizione</summary>
                        <p className="m-0 pt-1 text-[13px] text-text-secondary whitespace-pre-wrap">{area.descrizione}</p>
                      </details>
                    )}
                  </div>
                )}
                {/* da 768 a 1279 px le aree in fila sopra il visore; sotto i 768 px il pulsante «Aree · N» che apre il foglio */}
                {!collegamento && <>
                  <div className="hidden md:block xl:hidden">
                    <AreePalazzo forma="fila" aree={areePalazzo} infiltrazioni={d.aree} areaScelta={areaFisica?.slug ?? null} infiltrazioneScelta={area.chiave}
                      completate={completate} onScegliArea={scegliAreaFisica} onScegliInfiltrazione={scegliInfiltrazione} onCollegaAree={setLegami}
                      onAggiungiArea={() => setFinestra('aggiungi-area')} onRiordina={riordinaAreePalazzo} />
                  </div>
                  <div className="md:hidden">
                    <AreePalazzo forma="foglio" aree={areePalazzo} infiltrazioni={d.aree} areaScelta={areaFisica?.slug ?? null} infiltrazioneScelta={area.chiave}
                      completate={completate} onScegliArea={scegliAreaFisica} onScegliInfiltrazione={scegliInfiltrazione} onCollegaAree={setLegami}
                      onAggiungiArea={() => setFinestra('aggiungi-area')} onRiordina={riordinaAreePalazzo} />
                  </div>
                </>}
                </>}
                {/* Arrivando dalla proposta di una voce del diario (UX3-1, §4.4): la riga che lo dice, con «Conferma» e «Chiudi» */}
                {daVoce && !collegamento && <PropostaDallaVoce key={daVoce} uid={daVoce} partitaId={partitaId} onChiudi={togliDaVoce}
                  onConfermata={async () => { togliDaVoce(); await dati.ricarica(); }} />}
                {/* L'area aperta: nome, versioni, azioni, poi il visore della versione scelta (§4.2 punto 3). */}
                {areaFisica && !collegamento && !(largo && versioniArea.length > 1 && planimetriaScelta) && (
                  // da 1280 px una riga sola (R3-41): nella colonna centrale stretta le azioni andavano a capo e spingevano versioni e visore
                  // 36 px più giù; lì i comandi sono solo icona, e il nome lungo si accorcia coi puntini (intero nel suggerimento e nel titolo
                  // del visore). Sotto i 1280 px i comandi hanno l'etichetta e la riga va a capo, come prima.
                  // da 1024 px senza il filo sopra (R3-41: 9 px), la riga dell'infiltrazione sopra ha già il suo confine
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border-light pt-2 lg:border-t-0 lg:pt-0 xl:flex-nowrap">
                    {/* da 1280 px il nome prende tutto lo spazio libero e va a capo: troncato su una riga era «Canc…» (LAY3-1); i nomi
                        lunghi (le zone senza nome nativo, «Area riservata allo staff (verso …)») vanno su tre righe, ma si leggono interi */}
                    <h3 className="m-0 break-words text-[15px] font-semibold xl:min-w-0 xl:flex-1" title={areaFisica.nome}>{areaFisica.nome}</h3>
                    {/* da 1280 px il chip non c'è: le versioni le mostra la fila subito sotto, e i suoi 74 px servono al nome (LAY3-1) */}
                    {areaFisica.numeroPlanimetrie > 1 && <span className="chip shrink-0 whitespace-nowrap text-[11px] xl:hidden">{areaFisica.numeroPlanimetrie} versioni</span>}
                    <span className="flex-1 xl:hidden" />
                    {/* etichette corte, una riga: il nome completo lo sentono i lettori di schermo (come nella testata dell'Area, L2) */}
                    {azioniArea()}
                  </div>
                )}
                {areaFisica && !collegamento && versioniArea.length > 1 && planimetriaScelta && <>
                  {/* da 1024 px (R3-41) con più versioni la riga del nome non c'è: il nome sta nel chip acceso delle aree toccate e nel
                      titolo del visore, e le azioni dell'area chiudono la fila delle versioni */}
                  {largo
                    // da 1024 px (R3-41, scelta 2 del PM) le versioni in un selettore compatto con le miniature, e le azioni dell'area accanto:
                    // una riga da 44 invece della fila da 54–64
                    ? <div className="flex items-center gap-2">
                        <h3 className="sr-only">{areaFisica.nome}</h3>
                        {/* la versione mostrata senza pin (un'altra li ha): l'avviso sta nel selettore e «Passa» accanto, invece di una riga
                            da 44 sotto (R3-41); il testo intero è il nome del pulsante e il suggerimento */}
                        <SelettoreVersioni className="flex-1" nome={areaFisica.nome} planimetrie={versioniArea} scelta={planimetriaScelta} onScegli={scegliVersione}
                          avviso={senzaPin ? `nessun pin: stanno su «${senzaPin.nome}»` : undefined} />
                        {senzaPin && <button type="button" className="btn btn-secondary btn-sm touch shrink-0" title={senzaPin.testo} aria-label={`Passa a «${senzaPin.nome}»`}
                          onClick={() => scegliVersione(senzaPin.chiave)}>Passa</button>}
                        {azioniArea()}
                      </div>
                    : <VersioniArea nome={areaFisica.nome} planimetrie={versioniArea} scelta={planimetriaScelta} onScegli={scegliVersione} />}
                </>}
                {/* la versione mostrata non ha pin, un'altra sì: lo si dice e si passa a quella in un tocco (come nella pagina dell'Area) */}
                {/* da 1024 px l'avviso sta nella riga delle versioni (sopra); sotto, la sua riga com'era */}
                {senzaPin && !collegamento && !largo && (
                  <p className="m-0 flex flex-wrap items-center gap-2 text-[13px] text-text-secondary" role="status">
                    {senzaPin.testo}
                    <button type="button" className="btn btn-secondary btn-sm touch" onClick={() => scegliVersione(senzaPin.chiave)}>Passa a «{senzaPin.nome}»</button>
                  </p>
                )}
                {/* Collegando i pin di una voce (2026-10-18) la stessa mappa diventa quella di scelta: la barra sopra, tutti i pin
                    (i nascosti sbiaditi), un tocco collega o scollega; la planimetria può essere un'altra del Palazzo. */}
                {barraCollegamento}
                {/* Da 1280 px la mappa prende tutta l'altezza che la colonna le lascia, mai meno di 240 px di tela (2026-09-30, 2026-10-15). */}
                {mappaMostrata && (
                  <MappaIncorporata key={mappaMostrata} chiave={mappaMostrata} versione={versioneStati} classeVisore={classeVisoreMappa} onCambiato={() => void dati.ricarica()} scelta={sceltaPin}
                    spilloIniziale={collegamento ? null : spilloIndirizzo} puntoIniziale={collegamento ? null : puntoIndirizzo} titoloVisore={areaFisica?.nome}
                    contenutiPannello={areaFisica && !collegamento ? <InfiltrazioniInArea area={areaFisica} aperta={area.chiave} completate={completate} onScegli={scegliInfiltrazioneQui} /> : undefined} />
                )}
                {/* un'infiltrazione che non tocca aree (o un Palazzo senza aree): niente da mostrare, si collegano (§4.2) */}
                {!mappaMostrata && !collegamento && (
                  <div className="flex flex-col items-start gap-2 rounded-md bg-white/[0.04] px-3 py-2 text-[12px]" role="status">
                    <p className="m-0 text-text-muted">{areaFisica ? `${areaFisica.nome} non ha ancora planimetrie: aggiungine una.` : 'Quest’infiltrazione non tocca ancora aree.'}</p>
                    {!areaFisica && <button type="button" className="chip touch" onClick={() => setLegami(area.chiave)}>Collega aree</button>}
                  </div>
                )}
              </section>

              {/* ---- La colonna di quel che fa la percentuale: le planimetrie dell'area e la guida dell'infiltrazione ---- */}
              <aside className="card flex flex-col gap-3 xl:min-h-0 xl:area-scorrevole" aria-label={`Da raccogliere in ${areaFisica?.nome ?? area.nome}`}>
                <RaccoltaPlanimetrie planimetrie={mappeArea} partitaId={partitaId} onRaccolto={segnaRaccolto} vuoto={vuotoArea} />
                {/* Il resto del Palazzo, sempre ripiegato: con un'area aperta si vede quell'area (rilievo dell'utente, 2026-10-01). */}
                {altrePlanimetrie.length > 0 && (
                  <details className="text-[12px]">
                    <summary className="touch cursor-pointer text-text-muted">Tutte le planimetrie del Palazzo · {restanoAltre} da raccogliere</summary>
                    <div className="pt-2">
                      <RaccoltaPlanimetrie planimetrie={altrePlanimetrie} partitaId={partitaId} onRaccolto={segnaRaccolto} etichetta="Nel resto del Palazzo" />
                    </div>
                  </details>
                )}
                {!partitaId && <span className="text-[12px] text-text-muted">Attiva una <Link to="/partita" className="text-primary">partita</Link> per segnare quel che raccogli.</span>}
                {/* L4 (§4.3): i pin fatti con una voce non fatta, da prima dell'aggiornamento, coi due gesti che li sistemano */}
                {quanteDaVerificare > 0 && partitaId && (
                  <details ref={sezioneDaVerificare} id="da-verificare" className="text-[12px]">
                    <summary className="touch cursor-pointer font-semibold text-warning">Da verificare ({quanteDaVerificare})</summary>
                    <p className="m-0 pt-1 text-text-muted">{SPIEGAZIONE_DA_VERIFICARE} Tocca un pin per sistemarlo.</p>
                    <ul className="m-0 flex list-none flex-col gap-1 p-0 pt-1.5" aria-label="Pin da verificare">
                      {(divergenze.dati ?? []).map((x) => (
                        <li key={`${x.spilloUid}/${x.voce}`}>
                          <button type="button" className="touch flex w-full flex-col items-start rounded-md border border-warning/50 px-2 py-1 text-left"
                            onClick={() => setDaVerificare({ spilloUid: x.spilloUid, spilloNome: x.spilloNome, mappaNome: nomeSenzaPalazzo(x.mappaNome), voce: x.voce, voceNome: x.voceNome, infiltrazioneNome: x.infiltrazioneNome })}>
                            <span className="text-[13px] font-semibold">{x.spilloNome}</span>
                            <span className="text-[11px] text-text-muted">{x.voceNome} · {x.infiltrazioneNome}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {/* La guida dell'area: voci modificabili, spostabili e collegate ai pin delle planimetrie (2026-10-01). */}
                <GuidaDellArea key={area.chiave} area={area} planimetrie={d.planimetrie} partitaId={partitaId} mappaAperta={mappaScelta} areePalazzo={d.aree}
                  divergenze={divergenze.dati ?? undefined} onDaVerificare={setDaVerificare}
                  cambiaStato={cambiaStato} onPuntoAggiornato={aggiornaPunto} onRicarica={async () => { await dati.ricarica(); setVersioneStati((v) => v + 1); }} onCollegamento={aggiornaCollegamento} />
              </aside>
            </div>

            {/* ---- Le finestre della gestione (§4.3): quelle di L2 col contenitore `dungeon`, i legami dell'infiltrazione, l'infiltrazione nuova ---- */}
            {/* L4 (§4.1): «Da verificare», dalla sezione della scheda, dalla voce della guida o dal pin; risolta, si rilegge tutto */}
            {daVerificare && partitaId && (
              <FinestraDaVerificare divergenza={daVerificare} partitaId={partitaId} onChiudi={() => setDaVerificare(null)}
                onRisolta={async () => { await rileggiTutto(); await divergenze.ricarica(); }} />
            )}
            {finestra === 'aggiungi-area' && (
              <FinestraAggiungiArea aperta palazzo={{ chiave: d.chiave, nome: d.nome, infiltrazioni: infiltrazioniPalazzo, preselezionata: area.chiave }} onChiudi={() => setFinestra(null)}
                onCreata={(nuova) => { void dati.ricarica().then(() => apriArea(nuova.slug, (nuova.infiltrazioni ?? []).some((x) => x.chiave === area.chiave) ? area.chiave : null)); }} />
            )}
            {finestra === 'aggiungi-planimetria' && dettaglioArea.dati && (
              <FinestraAggiungiPlanimetria area={dettaglioArea.dati} aperta onChiudi={() => setFinestra(null)}
                onAggiunta={(_a, nuova) => { void rileggiTutto().then(() => { if (nuova) scegliVersione(nuova); }); }} />
            )}
            {finestra === 'modifica-area' && dettaglioArea.dati && (
              <FinestraModificaArea area={dettaglioArea.dati} aperta infiltrazioniPalazzo={infiltrazioniPalazzo} onChiudi={() => setFinestra(null)} onSalvata={rileggiTutto}
                altreAree={areePalazzo.filter((a) => a.slug !== areaFisica?.slug).map((a) => ({ slug: a.slug, nome: a.nome }))}
                // la versione spostata si apre nell'area d'arrivo (anche quando quella di partenza è rimasta vuota ed è andata nel cestino)
                onVersioneSpostata={(arrivo) => apriArea(arrivo.slug, area && (arrivo.infiltrazioni ?? []).some((x) => x.chiave === area.chiave) ? area.chiave : null)} />
            )}
            {areaFisica && (
              <Modal titolo={`Eliminare ${areaFisica.nome}?`} aperta={finestra === 'elimina-area'} onChiudi={() => setFinestra(null)}
                azioni={<>
                  <button type="button" className="btn btn-secondary touch" onClick={() => setFinestra(null)}>Annulla</button>
                  <button type="button" className="btn btn-danger touch" disabled={occupato} onClick={() => void eliminaAreaFisica()}>Elimina</button>
                </>}>
                <div className="flex flex-col gap-2 text-[14px]">
                  <p className="m-0">Si eliminano l’area, {areaFisica.numeroPlanimetrie === 1 ? 'la sua planimetria' : `le sue ${areaFisica.numeroPlanimetrie} planimetrie`}{areaFisica.numeroSpilli ? ` con ${areaFisica.numeroSpilli} pin` : ''} e {(areaFisica.infiltrazioni ?? []).length === 1 ? 'il legame con 1 infiltrazione' : `i legami con ${(areaFisica.infiltrazioni ?? []).length} infiltrazioni`}. Le voci della guida restano nelle loro infiltrazioni.</p>
                  <p className="m-0 text-text-secondary">{NEL_CESTINO}</p>
                </div>
              </Modal>
            )}
            {legami && d.aree.find((a) => a.chiave === legami) && (
              <FinestraLegamiInfiltrazione infiltrazione={d.aree.find((a) => a.chiave === legami)!} aree={areePalazzo} partitaId={partitaId}
                onChiudi={() => setLegami(null)} onSalvata={rileggiTutto} />
            )}
            {finestra === 'nuova-infiltrazione' && (
              <Modal titolo="Nuova infiltrazione" aperta onChiudi={() => setFinestra(null)}>
                {/* di partenza subito dopo l'infiltrazione aperta, come proponeva la scheda della planimetria di prima */}
                <ModuloNuovaArea aree={infiltrazioniPalazzo} areePalazzo={areePalazzo.map((a) => ({ slug: a.slug, nome: a.nome }))} occupato={occupato} dopoIniziale={area.chiave}
                  onCrea={nuovaInfiltrazione} onAnnulla={() => setFinestra(null)} />
              </Modal>
            )}
          </div>}
        </div>
      )}
    </PageState>
  );
}

/** Il pannello del visore nei Palazzi (§4.2): le infiltrazioni che passano dall'area aperta; toccarne una la apre restando sull'area. */
function InfiltrazioniInArea({ area, aperta, completate, onScegli }: { area: AreaRiassuntoDto; aperta: string; completate: ReadonlySet<string>; onScegli: (chiave: string) => void }) {
  // nell'ordine della guida, comunque arrivino
  const infiltrazioni = [...(area.infiltrazioni ?? [])].sort((x, y) => x.ordine - y.ordine);
  return (
    <section className="visore-mappa__sezione" aria-label="Infiltrazioni in quest’area">
      <h3 className="visore-mappa__intestazione">Infiltrazioni in quest’area</h3>
      {infiltrazioni.length === 0
        ? <p className="m-0 text-[12px] text-text-muted">Nessuna infiltrazione passa di qui.</p>
        : <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
          {infiltrazioni.map((x) => (
            <li key={x.chiave}>
              <button type="button" className={`chip touch text-[11px] ${x.chiave === aperta ? 'chip--attivo' : ''} ${completate.has(x.chiave) ? 'chip--icona' : ''}`} aria-pressed={x.chiave === aperta} onClick={() => onScegli(x.chiave)}>
                {completate.has(x.chiave) && <SpuntaCompletata />}{x.ordine + 1}. {x.nome}{completate.has(x.chiave) && <TestoCompletata />}
              </button>
            </li>
          ))}
        </ul>}
    </section>
  );
}
