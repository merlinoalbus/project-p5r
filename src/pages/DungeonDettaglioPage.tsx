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

import { useEffect, useMemo, useRef, useState } from 'react';
import { Selettore } from '../components/shared/Selettore';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { aggiornaArea, aggiornaCompendio, aggiornaDungeon, eliminaArea, getAlberoMappe, getDungeon, impostaAreeMappa, impostaStatoPunto } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { IconChevronLeft } from '../components/shared/icons';
import { MappaIncorporata } from '../components/mappe/MappaIncorporata';
import { EmblemaDungeon } from '../components/guida/EmblemaDungeon';
import { AnelloAvanzamento } from '../components/shared/AnelloAvanzamento';
import { TestoRipiegabile } from '../components/shared/TestoRipiegabile';
import { RaccoltaPlanimetrie } from '../components/guida/RaccoltaPlanimetrie';
import { PlanimetriePalazzo, SpuntaCompletata, TestoCompletata } from '../components/guida/PlanimetriePalazzo';
import { areeCompletate } from '../utils/completamentoAree';
import { nomeSenzaPalazzo, perOrdineDiGuida } from '../utils/gruppiPlanimetrie';
import { LIMITI_GUIDA } from '../../shared/limitiGuida';
import { CampoCorrezione, CorrezioneGuida } from '../components/guida/CorrezioneGuida';
import { AreeDelDedalo } from '../components/guida/AreeDelDedalo';
import { raccoltaDeiDedali, ricalcolaDedalo } from '../utils/dedali';
import { dataBreve } from '../utils/testoBreve';
import type { AreaDedaloDto, AreaDungeonDto, DungeonDettaglioDto, PuntoInteresseDto, StatoPunto, StatoRichiesta } from '../types';
import { GuidaDellArea } from '../components/guida/GuidaDellArea';
import { IconaAzione, IconaSegno } from '../components/shared/IconaAzione';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { useSuggerimenti } from '../stores/suggerimentiStore';
import { classiSuggerito } from '../utils/suggerimenti';
import { CollegamentoMappa } from '../components/mappe/CollegamentoMappa';
import { AtterraggioTokyo } from '../components/guida/AtterraggioTokyo';
import { MappaMemento } from '../components/mappe/MappaMemento';
import { Modal } from '../components/shared/Modal';

/** Le tre date di un Palazzo come una linea: si apre, conviene rubare, scade. La prosa della guida nel `title`. */
function LineaDelTempo({ date }: { date: DungeonDettaglioDto['date'] }) {
  const tappe = [
    { chiave: 'sblocco', etichetta: 'Si apre', valore: date.sblocco, tono: 'bg-white/10 text-text', segno: 'si-apre' as const },
    { chiave: 'furto', etichetta: 'Furto consigliato', valore: date.furtoConsigliato, tono: 'bg-[#f5c542]/15 text-[#f5c542]', segno: 'furto' as const },
    { chiave: 'scadenza', etichetta: 'Scade', valore: date.scadenza, tono: 'bg-primary/20 text-primary', segno: 'scade' as const },
  ].filter((t) => !!t.valore);
  if (tappe.length === 0) return null;
  return (
    <ol className="m-0 flex list-none flex-wrap items-stretch gap-1.5 p-0" aria-label="Finestra del Palazzo">
      {tappe.map((t, i) => (
        <li key={t.chiave} className="flex items-stretch gap-1.5">
          {/* Le tappe vanno a capo sugli schermi stretti, e una freccia a inizio riga non collega
              più niente: da lì in giù l'ordine lo dicono già le etichette. */}
          {i > 0 && <span aria-hidden className="hidden self-center text-text-muted sm:inline">→</span>}
          <span className={`flex flex-col gap-0.5 rounded-md px-2.5 py-1.5 ${t.tono}`} title={t.valore!}>
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] opacity-80"><IconaSegno chiave={t.segno} dimensione={14} />{t.etichetta}</span>
            <span className="font-display text-[17px] leading-none">{dataBreve(t.valore!)}</span>
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
  const { chiave = '' } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getDungeon(chiave, partitaId ?? undefined), [chiave, partitaId]);
  useDocumentTitle(dati.dati ? dati.dati.nome : 'Palazzo');
  const d = dati.dati;
  const areaChiave = params.get('area') ?? d?.aree[0]?.chiave ?? null;
  const area: AreaDungeonDto | null = useMemo(() => d?.aree.find((a) => a.chiave === areaChiave) ?? d?.aree[0] ?? null, [d, areaChiave]);
  // ogni cambio di stato dalla colonna ricarica il visore (e viceversa il visore ricarica la pagina)
  const [versioneStati, setVersioneStati] = useState(0);
  const memento = d?.tipo === 'mementos';
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
  // Quale planimetria dell'area si sta guardando: quasi sempre una sola; la scelta si azzera cambiando area.
  const [piantaScelta, setPianta] = useState<string | null>(null);
  // Una planimetria scelta dal pannello «Planimetrie» vale **su tutto il Palazzo**, anche quando non
  // è legata a nessuna area: è il modo di guardare (e segnare) una tavola che la guida non aggancia.
  const [planimetriaLibera, setPlanimetriaLibera] = useState<string | null>(null);
  // L'atlante serve all'elenco del Palazzo: da lì vengono il nome di presentazione, il
  // gruppo che dice quali tavole sono la stessa stanza e l'etichetta di ogni versione. Si carica
  // subito, perché l'elenco è la colonna di atterraggio, e **si rilegge dopo ogni modifica**:
  // correggere il nome di una stanza o l'etichetta di una planimetria cambia l'atlante, non la
  // scheda del Palazzo, e ricaricare solo quest'ultima lasciava a schermo il testo vecchio benché
  // salvato. Nei Memento non serve: i dedali non hanno planimetrie.
  const albero = useCarica(() => (memento ? Promise.resolve([]) : getAlberoMappe()), [memento]);
  const planimetriaAperta = (d?.planimetrie ?? []).find((p) => p.chiave === planimetriaLibera) ?? null;
  const mappaScelta = planimetriaAperta?.chiave ?? (area && area.mappe.some((m) => m.chiave === piantaScelta) ? piantaScelta : area?.mappe[0]?.chiave ?? null);
  /** Apre un'area mettendola nell'URL (che perde gli altri parametri) e azzera la planimetria scelta e quella libera. */
  const scegliArea = (k: string) => { setParams({ area: k }); setPianta(null); setPlanimetriaLibera(null); };
  /** Un'area eliminata dalla guida: se era quella aperta, la scheda torna alla prima (senza parametro). */
  const areaEliminata = (k: string) => { if (area?.chiave === k) { setParams({}); setPianta(null); } };
  /**
   * Una planimetria scelta dal pannello: se contiene aree della guida si apre la sua prima in ordine di
   * guida — o resta quella aperta, se la planimetria contiene anche lei —, altrimenti resta «libera».
   */
  const scegliPlanimetria = (k: string) => {
    const p = (d?.planimetrie ?? []).find((x) => x.chiave === k);
    const prima = p ? [...p.aree].sort(perOrdineDiGuida)[0] : undefined;
    if (p && prima) { setParams({ area: area && p.aree.some((a) => a.chiave === area.chiave) ? area.chiave : prima.chiave }); setPianta(k); setPlanimetriaLibera(null); }
    else setPlanimetriaLibera(k);
  };
  /**
   * Lega l'area aperta anche alla planimetria `k`, che tiene le sue altre aree; l'area resta anche sulle planimetrie che già
   * la avevano (un'area può stare su più tavole, decisione dell'utente del 2026-10-04). Poi rilegge la scheda e lo dice.
   */
  const collegaArea = (k: string) => {
    const t = (d?.planimetrie ?? []).find((x) => x.chiave === k);
    if (!t || !area) return;
    void impostaAreeMappa(t.chiave, [...t.aree.map((a) => a.chiave), area.chiave])
      .then(async () => { await dati.ricarica(); notifica('success', `«${area.nome}» ora sta anche su «${nomeSenzaPalazzo(t.nome)}».`); })
      .catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Collegamento non riuscito.'));
  };
  /** Toglie l'area aperta dalla planimetria `k` (le altre aree della planimetria restano), poi rilegge la scheda e lo dice. */
  const scollegaArea = (k: string) => {
    const t = (d?.planimetrie ?? []).find((x) => x.chiave === k);
    if (!t || !area) return;
    void impostaAreeMappa(t.chiave, t.aree.map((a) => a.chiave).filter((c) => c !== area.chiave))
      .then(async () => { setPianta(null); await dati.ricarica(); notifica('success', `«${area.nome}» non sta più su «${nomeSenzaPalazzo(t.nome)}».`); })
      .catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Scollegamento non riuscito.'));
  };
  // L'anello conta quel che si raccoglie: collezionabili delle planimetrie (Palazzi) o elementi delle aree dei dedali (Memento, 099).
  const quota = d && d.raccolta.presi !== null && d.raccolta.totale > 0 ? d.raccolta.presi / d.raccolta.totale : null;
  const areeSuggerite = (d?.aree ?? []).filter((a) => sugg.evidenziato('aree', a.chiave)).length;
  const suggerimentoDiffuso = !!d && d.aree.length > 0 && areeSuggerite === d.aree.length;
  /** Se un'area va evidenziata come suggerita: no quando lo sono tutte, perché allora il suggerimento riguarda il Palazzo intero e lo dice il chip dell'intestazione. */
  const areaSuggerita = (chiaveArea: string) => !suggerimentoDiffuso && sugg.evidenziato('aree', chiaveArea);
  const tempoInProsa = !d ? [] : ([
    { etichetta: 'Si apre', valore: d.date.sblocco },
    { etichetta: 'Furto consigliato', valore: d.date.furtoConsigliato },
    { etichetta: 'Scade', valore: d.date.scadenza },
  ] as const).filter((t) => !!t.valore && t.valore !== dataBreve(t.valore));
  const mappeArea = area?.mappe ?? [];
  // Con un'area scelta la colonna mostra **quell'area** (rilievo dell'utente, 2026-10-01: «in ogni area sembrano poi vedersi
  // i raccoglibili di tutte le altre aree»). Prima, quando l'area non aveva collezionabili, la colonna passava da sola a
  // tutto il Palazzo; ora lo dice, e il resto del Palazzo sta nella piega qui sotto.
  const vuotoArea = mappeArea.length === 0 ? 'Quest’area non ha planimetrie legate: niente da raccogliere qui.' : 'Niente da raccogliere sulle planimetrie di quest’area.';
  const altrePlanimetrie = (d?.planimetrie ?? []).filter((p) => !mappeArea.some((m) => m.chiave === p.chiave));
  // La planimetria a schermo e le aree della guida che contiene, in ordine di guida (possono essere più d'una).
  const areeDellaPianta = [...((d?.planimetrie ?? []).find((p) => p.chiave === mappaScelta)?.aree ?? [])].sort(perOrdineDiGuida);
  // Le aree con tutte le voci da segnare segnate (scelta dell'utente, 2026-10-04): spunta nella lista e nei chip. Si ricalcola
  // dai dati della pagina, che si aggiornano a ogni voce segnata.
  const completate = useMemo(() => areeCompletate(d?.aree ?? []), [d]);
  const restanoAltre = altrePlanimetrie.reduce((s, p) => s + p.n - (p.presi ?? 0), 0);

  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && area && (
        // **Da 1024 px il Palazzo sta in una schermata** (richiesta dell'utente, 2026-09-29): «componenti che
        // sforano la pagina… aggiungendo una scrollbar di pagina che non è accettabile… tutti i componenti devono
        // finire con la stessa altezza». La pagina prende l'altezza dell'area di lettura, l'intestazione la sua, e
        // le colonne il resto: finiscono tutte allo stesso punto e ognuna scorre per conto suo (area-scorrevole).
        // Sotto i 1024 px le colonne sono una sola e scorre la pagina, l'unico scorrimento. Vale per i Palazzi e
        // per i Memento (2026-09-30).
        <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
          {/* ---- Intestazione: l'emblema, il nome, il tempo ----
              Da 1024 px è **compatta su due righe** (scelta dell'utente, 2026-09-30): alta 266 px, con il browser
              sul portatile lasciava alle colonne meno di metà dello schermo. Prima riga emblema e anello piccoli,
              nome, sovrano e arcana; seconda riga la finestra del Palazzo, i conteggi e «Dettagli dalla guida». */}
          <header className="card relative shrink-0 overflow-hidden lg:py-2.5">
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 hidden opacity-[0.07] sm:block">
              <EmblemaDungeon chiave={d.chiave} nome={d.nome} arcanaSovrano={d.arcanaSovrano} dimensione={280} />
            </span>
            {/* Nei Memento (2026-10-12) l'intestazione è compatta a ogni larghezza, come da 1024 px: emblema e anello piccoli in riga. */}
            <div className={`relative flex gap-3 ${memento ? 'flex-row items-center' : 'flex-col sm:flex-row sm:items-start sm:gap-5 lg:items-center lg:gap-3'}`}>
              <div className={`flex shrink-0 items-center gap-3 ${memento ? 'gap-2' : 'sm:flex-col lg:flex-row lg:gap-2'}`}>
                <span className={memento ? 'lg:hidden' : 'sm:hidden'}><EmblemaDungeon chiave={d.chiave} nome={d.nome} arcanaSovrano={d.arcanaSovrano} dimensione={memento ? 40 : 52} /></span>
                {!memento && <span className="hidden sm:block lg:hidden"><EmblemaDungeon chiave={d.chiave} nome={d.nome} arcanaSovrano={d.arcanaSovrano} dimensione={80} /></span>}
                <span className="hidden lg:block"><EmblemaDungeon chiave={d.chiave} nome={d.nome} arcanaSovrano={d.arcanaSovrano} dimensione={48} /></span>
                {quota !== null && (
                  // un anello solo (è la barra di avanzamento della pagina): da 1024 px si rimpicciolisce, non si duplica
                  <AnelloAvanzamento quota={quota} dimensione={64} spessore={5} className={memento ? 'size-12!' : 'lg:size-12!'} etichetta={`Avanzamento in ${d.nome}: ${d.raccolta.presi} ${memento ? 'elementi fatti' : 'da raccogliere presi'} su ${d.raccolta.totale}`}>
                    <span className={`font-display leading-none tabular-nums ${memento ? 'text-[13px]' : 'text-[17px] lg:text-[13px]'}`}>{Math.round(quota * 100)}%</span>
                  </AnelloAvanzamento>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2.5 lg:gap-1.5">
                <div className="flex flex-col gap-1 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="btn btn-ghost btn-sm touch -ml-2" onClick={() => navigate(-1)}><IconChevronLeft size={18} /> Indietro</button>
                    <h1 className="titolo-display m-0 break-words">{d.nome}</h1>
                    {/* nei Memento la correzione della scheda è un comando per sistemare la guida: solo in «Modifica la guida» */}
                    {(!memento || modifica) && <CorrezioneGuida cosa={`il Palazzo «${d.nome}»`} etichetta="Correggi la scheda"
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
                  <div className="flex flex-wrap items-center gap-2 text-[13px] text-text-secondary">
                    {/* nei Memento, sul telefono, il sovrano sta nella piega dei dettagli: qui andava a capo su due righe */}
                    {d.sovrano && <span className={`break-words ${memento ? 'max-md:hidden' : ''}`}>{d.sovrano}</span>}
                    {d.arcanaSovranoNome && <span className="chip chip--attivo">{d.arcanaSovranoNome}</span>}
                    {memento && suggerimentoDiffuso && <span className="chip chip--attivo" title={sugg.motivo('dungeon', d.chiave) ?? undefined}>Suggerito oggi</span>}
                  </div>
                </div>
                {/* Da 1024 px finestra, conteggi e dettagli stanno su una riga; i dettagli aperti vanno a capo, sotto. Nei Memento
                    (2026-10-12) la riga sta in una piega: lo spazio va ai dedali e alle aree, che sono la pagina. */}
                {(() => { const riga = <>
                {memento && d.sovrano && <span className="text-[13px] text-text-secondary md:hidden">{d.sovrano}</span>}
                <LineaDelTempo date={d.date} />
                {/* `lg:contents`: da 1024 px i chip entrano nella riga uno per uno, e vanno a capo solo quelli che non ci stanno. */}
                <div className="flex flex-wrap items-center gap-2 lg:contents">
                  <CollegamentoMappa tipo="dungeon" chiave={d.chiave} testo="Mappa del Palazzo" />
                  {/* Quando compare sulla mappa di Tokyo e dove si atterra toccandolo (2026-10-04) */}
                  <AtterraggioTokyo dungeon={d} onSalvato={() => dati.ricarica()} />
                  <span className="chip">{d.aree.length} {memento ? 'dedali' : 'aree'}</span>
                  <span className="chip" title={memento ? 'Gli elementi delle aree dei dedali (Richieste, timbri, voci di Trama): sono questi a fare la percentuale; le Persona no.' : 'I collezionabili sulle planimetrie (forzieri, semi, tesori): sono questi a fare la percentuale.'}>{d.raccolta.totale} {memento ? 'elementi' : 'da raccogliere'}</span>
                  {!memento && <span className="chip" title="Le tavole dell’atlante del Palazzo. Si ordinano e si correggono nell’elenco qui sotto.">
                    {d.planimetrie.length} planimetrie{d.raccolta.mappeComplete !== null ? ` · ${d.raccolta.mappeComplete} complete` : ''}
                  </span>}
                  <span className="chip" title="Sicure, scorciatoie, enigmi, incontri e boss della guida.">{d.punti} punti della guida</span>
                  {suggerimentoDiffuso && !memento && <span className="chip chip--attivo" title={sugg.motivo('dungeon', d.chiave) ?? undefined}>Suggerito oggi</span>}
                </div>
                {(d.livelloConsigliato || d.note || tempoInProsa.length > 0) && <details className="text-[12px] lg:open:basis-full">
                  <summary className="touch cursor-pointer text-text-muted">Dettagli dalla guida</summary>
                  <div className="flex flex-col gap-1 pt-1.5">
                    {d.livelloConsigliato && <TestoRipiegabile testo={`Livello consigliato: ${d.livelloConsigliato}`} massimo={120} className="text-[13px] text-text-secondary" />}
                    {tempoInProsa.map((t) => <TestoRipiegabile key={t.etichetta} testo={`${t.etichetta}: ${t.valore}`} massimo={90} className="text-[12px] text-text-muted" />)}
                    {d.note && <TestoRipiegabile testo={d.note} massimo={140} className="text-[12px] text-text-muted whitespace-pre-wrap" />}
                  </div>
                </details>}
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
          </header>

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

          {!memento && <div className="grid grid-cols-1 items-start gap-4 lg:min-h-[280px] lg:flex-1 lg:grid-rows-[minmax(0,1fr)] lg:items-stretch lg:grid-cols-[360px_minmax(0,1fr)]">
            {/* ---- Le aree: colonna da 1024 px in su, fila scorrevole sotto ---- */}
            {/* **Un elenco solo.** Le stanze in ordine di percorso con i loro comandi, e in coda le
                aree della guida ancora da collegare: è la lista di atterraggio e insieme il posto
                dove si sistema il Palazzo, senza un secondo pannello da scoprire. Sotto i 1024 px
                la fila di chip resta come salto rapido fra le aree. */}
            {!memento && (
              <nav aria-label="Il Palazzo" className="order-2 lg:order-none lg:min-h-0">
                {/* **Niente fila di chip sotto i 1024 px.** C'era, e rimetteva in piedi la doppia
                    lista appena tolta: diciotto aree in otto righe di chip sopra l'elenco che le
                    contiene già. L'elenco vale a tutte le larghezze.

                    Ma in colonna unica **va dopo il contenuto che serve a scegliere**, e con il suo
                    tetto d'altezza: srotolato, per Kamoshida è alto 4053 px, e l'area aperta finiva
                    a 4682 px dall'alto — la navigazione seppelliva ciò che seleziona (rilievo della
                    revisione). Sopra i 1024 px è la colonna di sinistra, alta quanto le altre. */}
                <div className="card max-h-[70vh] area-scorrevole p-2 lg:h-full lg:max-h-none">
                  <PlanimetriePalazzo dungeonChiave={d.chiave} planimetrie={d.planimetrie} albero={albero.dati ?? []}
                    alberoPronto={!!albero.dati} alberoErrore={albero.errore} onRiprovaAlbero={() => void albero.ricarica()}
                    aree={d.aree.map((a) => ({ chiave: a.chiave, nome: a.nome, ordine: a.ordine }))}
                    areeOrfane={d.aree.filter((a) => a.mappe.length === 0).map((a) => ({ chiave: a.chiave, nome: a.nome, ordine: a.ordine, descrizione: a.descrizione, punti: a.punti.length }))}
                    areaScelta={area.chiave} onScegliArea={scegliArea}
                    sceltaChiave={mappaScelta} onScegli={scegliPlanimetria}
                    onCambiato={async () => { await Promise.all([dati.ricarica(), albero.ricarica()]); }}
                    areeCompletate={completate} onAreaEliminata={areaEliminata} />
                </div>
              </nav>
            )}
            {/* ---- L'area scelta: planimetrie ---- */}
            {/* Da 1024 a 1279 px mappa e raccolta stanno una sotto l'altra in **un'area sola** che scorre; da 1280 px
                sono due colonne, ognuna con il suo scorrimento, e la mappa si allunga fino in fondo alla sua. */}
            <div className="order-1 grid grid-cols-1 items-start gap-4 lg:order-none lg:min-h-0 lg:max-xl:area-scorrevole lg:max-xl:p-2 xl:grid-rows-[minmax(0,1fr)] xl:items-stretch xl:grid-cols-[minmax(0,1fr)_352px]">
              <section className="card flex flex-col gap-2.5 xl:min-h-0 xl:area-scorrevole">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h2 className="m-0 font-display text-[19px] uppercase leading-none">{area.nome}</h2>
                  {/* `key`: cambiando area il modulo si rimonta, altrimenti resterebbe aperto con il
                      testo dell'area di prima e lo salverebbe su quella nuova (rilievo della revisione). */}
                  {/* «Modifica testo» per esteso: la sola ✎ accanto al titolo non si trovava («come faccio a modificare
                      il testo delle Aree della guida?», 2026-09-30) */}
                  <CorrezioneGuida key={area.chiave} cosa={`l’area «${area.nome}»`} etichetta="Modifica testo"
                    iniziale={() => ({ nome: area.nome, descrizione: area.descrizione })}
                    onSalva={async (b) => { await aggiornaArea(area.chiave, b); await dati.ricarica(); }}
                    // «Devo poter rimuovere un'area» (2026-09-30): l'eliminazione vera, per tutte le partite
                    elimina={{
                      avviso: `Se ne va dalla guida per tutte le partite${area.punti.length ? `, con i suoi ${area.punti.length} punti e quel che le partite ne avevano segnato` : ''}; le planimetrie restano, con le loro altre aree.`,
                      onElimina: async () => { const k = area.chiave; await eliminaArea(k); areaEliminata(k); await Promise.all([dati.ricarica(), albero.ricarica()]); },
                    }}>
                    {(b, cambia) => <>
                      <CampoCorrezione etichetta="Nome dell’area" valore={b.nome} massimo={LIMITI_GUIDA.area.nome} onCambia={(v) => cambia({ nome: v })} />
                      <CampoCorrezione etichetta="Descrizione" valore={b.descrizione} multilinea massimo={LIMITI_GUIDA.area.descrizione} onCambia={(v) => cambia({ descrizione: v })} />
                    </>}
                  </CorrezioneGuida>
                  <span className="text-[12px] text-text-muted">area {area.ordine + 1} di {d.aree.length}</span>
                  <span className="flex-1" />
                </div>
                {/* La descrizione si ripiega: per esteso spingeva la mappa sotto il bordo della colonna. */}
                {area.descrizione && <TestoRipiegabile testo={area.descrizione} massimo={140} className="text-[13px] text-text-secondary" />}
                {/* La planimetria dell'atlante legata all'area, se c'è. */}
                {mappaScelta && <>
                  {area.mappe.length > 1 && (
                    <Selettore etichetta="Planimetria" valore={mappaScelta} opzioni={area.mappe.map((m) => ({ chiave: m.chiave, nome: m.nome }))} onCambia={setPianta} />
                  )}
                  {/* Un'area può stare su più planimetrie (decisione dell'utente, 2026-10-04): qui se ne aggiunge un'altra, o si
                      toglie quella a schermo. Ripiegato, perché si usa di rado e la mappa resta il primo piano. */}
                  {area.mappe.length > 0 && (
                    <details className="text-[12px]">
                      <summary className="touch cursor-pointer text-text-muted">Planimetrie di quest’area · {area.mappe.length}</summary>
                      <div className="flex flex-col gap-2 pt-2">
                        {d.planimetrie.some((t) => !area.mappe.some((m) => m.chiave === t.chiave)) && (
                          <Selettore etichetta="Collega anche a" valore="" vuoto="— scegli una planimetria —"
                            opzioni={d.planimetrie.filter((t) => !area.mappe.some((m) => m.chiave === t.chiave)).map((t) => ({ chiave: t.chiave, nome: nomeSenzaPalazzo(t.nome),
                              dettaglio: [t.n > 0 ? `${t.n} da raccogliere` : null, t.aree.length ? `contiene ${[...t.aree].sort(perOrdineDiGuida).map((a) => a.nome).join(', ')}` : 'nessuna area'].filter(Boolean).join(' · ') }))}
                            onCambia={collegaArea} />
                        )}
                        {area.mappe.some((m) => m.chiave === mappaScelta) && (
                          <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="annulla" dimensione={20} />}
                            titolo="Scollega questa planimetria" dettaglio={area.mappe.length > 1 ? 'l’area resta sulle altre' : 'l’area resta senza planimetria'}
                            onClick={() => scollegaArea(mappaScelta)} />
                        )}
                      </div>
                    </details>
                  )}
                  {/* Una planimetria che contiene più aree della guida le mostra tutte, in ordine: toccarne una la apre. */}
                  {areeDellaPianta.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] uppercase tracking-wide text-text-muted">Su questa planimetria</span>
                      <ol className="m-0 flex list-none flex-wrap gap-1 p-0" aria-label="Aree della guida su questa planimetria">
                        {areeDellaPianta.map((a) => (
                          <li key={a.chiave}>
                            <button type="button" className={`chip touch text-[11px] ${completate.has(a.chiave) ? 'chip--icona' : ''} ${a.chiave === area.chiave ? 'chip--attivo' : ''}`} aria-pressed={a.chiave === area.chiave}
                              onClick={() => { if (a.chiave !== area.chiave) { const k = mappaScelta; scegliArea(a.chiave); setPianta(k); } }}>
                              {completate.has(a.chiave) && <SpuntaCompletata />}
                              {a.ordine + 1}. {a.nome}
                              {completate.has(a.chiave) && <TestoCompletata />}
                            </button>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {/* Da 1280 px la mappa prende tutta l'altezza che la colonna le lascia, mai meno di 240 px (scelta
                      dell'utente, 2026-09-30: sotto quel minimo scorre la colonna, non la pagina); sotto, l'altezza di prima. */}
                  <MappaIncorporata chiave={mappaScelta} versione={versioneStati} classeVisore="h-[max(300px,min(41vh,560px))] xl:h-auto xl:min-h-[240px] xl:flex-1" onCambiato={() => void dati.ricarica()} />
                  {/* Da 1280 px la colonna è alta quanto lo schermo: la nota lascia il posto alla mappa, che ha già «Modifica mappa». */}
                  <p className="m-0 text-[11px] text-text-muted xl:hidden">Spilli e immagine della pianta si modificano dall’editor («Modifica mappa» nel visore).</p>
                </>}
                {/* **Dove manca il legame si collega, non si mostra un'altra immagine.** Prima qui
                    c'era la pianta scaricata dalla guida: una seconda figura della stessa stanza,
                    presa da un sito, che copriva il fatto che nessuno avesse ancora detto quale
                    tavola dell'atlante è quest'area. Le tavole ci sono quasi sempre: manca il
                    legame, e questo è il posto per farlo — la scelta vale per tutte le partite. */}
                {!mappaScelta && (
                  <div className="flex flex-col gap-2 rounded-md bg-white/[0.04] px-3 py-2 text-[12px]" role="status">
                    <p className="m-0 text-text-muted">Quest’area non ha ancora una planimetria: sceglila fra le tavole del Palazzo — anche una che contiene già altre aree, si aggiunge a quelle. Quel che c’è da raccogliere sta nella colonna accanto.</p>
                    {d.planimetrie.length > 0
                      ? <Selettore etichetta="Collega una planimetria" valore="" vuoto="— scegli —"
                          opzioni={d.planimetrie.map((t) => ({ chiave: t.chiave, nome: nomeSenzaPalazzo(t.nome),
                            dettaglio: [t.n > 0 ? `${t.n} da raccogliere` : null, t.aree.length ? `contiene ${[...t.aree].sort(perOrdineDiGuida).map((a) => a.nome).join(', ')}` : 'nessuna area'].filter(Boolean).join(' · ') }))}
                          onCambia={collegaArea} />
                      : <span className="text-text-muted">Il Palazzo non ha ancora planimetrie: aggiungine una dall’elenco del Palazzo.</span>}
                  </div>
                )}
              </section>

              {/* ---- La colonna di quel che fa la percentuale: le planimetrie e la guida dell'area ---- */}
              <aside className="card flex flex-col gap-3 xl:min-h-0 xl:area-scorrevole" aria-label={`Da raccogliere in ${area.nome}`}>
                {planimetriaAperta
                  ? <RaccoltaPlanimetrie planimetrie={[planimetriaAperta]} partitaId={partitaId} onRaccolto={segnaRaccolto}
                      etichetta="Su questa planimetria" nota="Planimetria scelta dal pannello: qui c’è solo quel che si raccoglie su di lei."
                      vuoto="Su questa planimetria non c’è niente da raccogliere." />
                  : <RaccoltaPlanimetrie planimetrie={mappeArea} partitaId={partitaId} onRaccolto={segnaRaccolto} vuoto={vuotoArea} />}
                {/* Il resto del Palazzo, sempre ripiegato: con un'area scelta si vede quell'area (rilievo dell'utente, 2026-10-01). */}
                {!planimetriaAperta && altrePlanimetrie.length > 0 && (
                  <details className="text-[12px]">
                    <summary className="touch cursor-pointer text-text-muted">Tutte le planimetrie del Palazzo · {restanoAltre} da raccogliere</summary>
                    <div className="pt-2">
                      <RaccoltaPlanimetrie planimetrie={altrePlanimetrie} partitaId={partitaId} onRaccolto={segnaRaccolto} etichetta="Nel resto del Palazzo" />
                    </div>
                  </details>
                )}
                {!partitaId && <span className="text-[12px] text-text-muted">Attiva una <Link to="/partita" className="text-primary">partita</Link> per segnare quel che raccogli.</span>}

                {/* La guida dell'area: voci modificabili, spostabili e collegate ai pin delle planimetrie (2026-10-01). */}
                <GuidaDellArea key={area.chiave} area={area} planimetrie={d.planimetrie} partitaId={partitaId} mappaAperta={mappaScelta}
                  cambiaStato={cambiaStato} onPuntoAggiornato={aggiornaPunto} onRicarica={async () => { await dati.ricarica(); setVersioneStati((v) => v + 1); }} />
              </aside>
            </div>
          </div>}
        </div>
      )}
    </PageState>
  );
}
