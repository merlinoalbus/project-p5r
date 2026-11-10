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
// con i suoi elementi: voci della guida e Richieste — che con i timbri del dedalo (L10-02) fanno la
// percentuale; un'area è completata quando lo sono tutti, il dedalo quando lo sono tutte e i suoi timbri
// sono tutti raccolti. La pianta della guida non c'è: i piani si generano.
//
// Qui la disposizione e lo stato dell'indirizzo; gli indirizzi della scheda stanno in `useNavigazionePalazzo`, i gesti di stato nella
// partita in `useStatiPalazzo`, i moduli di modifica in `CorrezioneSchedaPalazzo`, `ModuloBossFinale`, `ModuloInfiltrazione` e
// `MenuModificaPalazzo` (components/guida), con `LineaDelTempo`, `DedaloNelBinario` e `InfiltrazioniInArea`.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Selettore } from '../components/shared/Selettore';
import { Link } from 'react-router-dom';
// R10-27: la scheda si mostra anche nel pannello sopra il diario; questi hook, fuori dal pannello, sono quelli di react-router-dom
import { useNavigate, useParams, useSearchParams } from '../components/scheda/routerScheda';
import { creaArea, eliminaAreaMondo, getArea, getDivergenze, getDungeon, riordinaAree } from '../services/api';
import { useNavigazionePalazzo } from '../hooks/useNavigazionePalazzo';
import { useStatiPalazzo } from '../hooks/useStatiPalazzo';
import { enigmiCheSiRiaprono, righeRiapertura, vociDelPin } from '../utils/gestiVoce';
import { FinestraDaVerificare, SPIEGAZIONE_DA_VERIFICARE, type DivergenzaDaVerificare } from '../components/guida/FinestraDaVerificare';
import { SchedeDaSistemare } from '../components/guida/SchedeDaSistemare';
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
import { dimenticaEntrata, indirizzoDiUscita, istantaneaPalazzo, leggiEntrata, leggiRitornoDiario, ricordaEntrata, riepilogoUscita } from '../utils/ritornoDiario';
import { NoteStoricheOfferta, type EffettoNotaStorica } from '../components/catalogo/NoteStoricheOfferta';
import { testoLivelloConsigliato } from '../utils/palazzi';
import { AreeDelDedalo } from '../components/guida/AreeDelDedalo';
import { sommaTimbriDeiDedali } from '../utils/dedali';
import { percentualeSegnati } from '../../shared/avanzamento';
import type { AreaDungeonDto, AreaRiassuntoDto, PlanimetriaAreaDto } from '../types';
import { GuidaDellArea, type CollegamentoPin } from '../components/guida/GuidaDellArea';
import { BarraCollegamentoPin } from '../components/guida/BarraCollegamentoPin';
import { IconaAzione } from '../components/shared/IconaAzione';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IndietroScheda, TitoloScheda } from '../components/shared/IntestazioneScheda';
import { useSuggerimenti } from '../stores/suggerimentiStore';
import { LineaDelTempo } from '../components/guida/LineaDelTempo';
import { DedaloNelBinario } from '../components/guida/DedaloNelBinario';
import { InfiltrazioniInArea } from '../components/guida/InfiltrazioniInArea';
import { CorrezioneSchedaPalazzo } from '../components/guida/CorrezioneSchedaPalazzo';
import { ModuloBossFinale } from '../components/guida/ModuloBossFinale';
import { ModuloInfiltrazione } from '../components/guida/ModuloInfiltrazione';
import { MenuModificaPalazzo, type FinestraPalazzo } from '../components/guida/MenuModificaPalazzo';
import { CollegamentoMappa } from '../components/mappe/CollegamentoMappa';
import { AtterraggioTokyo } from '../components/guida/AtterraggioTokyo';
import { MappaMemento } from '../components/mappe/MappaMemento';
import { Modal } from '../components/shared/Modal';
import { NEL_CESTINO } from '../utils/cestino';
import { comportamentoScorrimento } from '../utils/movimento';
import { TitoloSezione } from '../components/shared/TitoloSezione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** La versione mostrata non ha pin, un'altra sì (come nella pagina dell'Area): quale, e l'avviso; null altrimenti. */
function versioneSenzaPin(versioni: PlanimetriaAreaDto[], scelta: string | null): { chiave: string; nome: string; testo: string } | null {
  const mostrata = versioni.find((v) => v.chiave === scelta);
  const conPin = versioni.find((v) => v.numeroSpilli > 0 && v.chiave !== scelta);
  if (!mostrata || mostrata.numeroSpilli > 0 || !conPin) return null;
  const nome = nomeVersione(conPin, versioni.indexOf(conPin));
  return { chiave: conPin.chiave, nome, testo: `Su questa planimetria non ci sono pin: quelli dell’area stanno su «${nome}».` };
}

/** La nota storica del livello non cambia il livello consigliato: lo dice la finestra della nota. */
const EFFETTO_NOTA_LIVELLO: EffettoNotaStorica = {
  modifica: 'È una nota sulla fonte: il livello consigliato minimo e massimo si correggono nella scheda del Palazzo.',
};

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
  // (L8, R8-16: l'indirizzo di Iweleth porta al suo dedalo dalla rotta in `router.tsx`; qui non serve altro)
  const memento = d?.tipo === 'mementos';
  // L4 (§4.3): le divergenze conservate «da verificare» del Palazzo nella partita; si chiedono solo quando la scheda dice che ce ne sono
  const quanteDaVerificare = !memento ? d?.daVerificare ?? 0 : 0;
  // L10-02: la somma dei timbri dei dedali accanto al totale che la guida dichiara per i Memento, solo se le due cifre sono diverse
  const sommaTimbri = memento ? sommaTimbriDeiDedali(d?.aree ?? []) : null;
  const timbriDiscordanti = memento && d?.timbriDichiarati && sommaTimbri !== null && sommaTimbri !== d.timbriDichiarati.totale
    ? { somma: sommaTimbri, dichiarati: d.timbriDichiarati.totale, fonte: d.timbriDichiarati.fonte } : null;
  const divergenze = useCarica(() => (partitaId && quanteDaVerificare > 0 ? getDivergenze(partitaId, chiave) : Promise.resolve([])), [partitaId, chiave, quanteDaVerificare]);
  const [daVerificare, setDaVerificare] = useState<DivergenzaDaVerificare | null>(null);
  const sezioneDaVerificare = useRef<HTMLDetailsElement>(null);
  // Le infiltrazioni completate nella partita (tutte le voci da segnare segnate, 2026-10-04): spunte, e `?infiltrazione=in-corso`.
  const completate = useMemo(() => areeCompletate(d?.aree ?? []), [d]);
  // R10-28: aperta con «Entra» da una voce del diario (`&da=<pagina>&voce=<uid>`) la scheda mostra «Esci»; all'ingresso si fa l'istantanea
  // con cui il riepilogo dell'uscita dice che cosa è avanzato (`utils/ritornoDiario.ts`)
  const ritorno = useMemo(() => leggiRitornoDiario(params), [params]);
  const pronto = !!d;
  useEffect(() => {
    if (!ritorno || !partitaId || !d) return;
    ricordaEntrata(partitaId, ritorno.voce, istantaneaPalazzo(d, completate.size));
    // solo al primo caricamento della scheda per quella voce: `ricordaEntrata` tiene la prima istantanea
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ritorno?.voce, partitaId, pronto]);
  /** «Esci»: riepilogo in una notifica, poi si torna alla pagina di partenza sulla stessa voce. */
  const esci = () => {
    if (!ritorno || !d) return;
    const entrata = partitaId ? leggiEntrata(partitaId, ritorno.voce) : null;
    notifica('success', riepilogoUscita(d.nome, d, memento ? 0 : completate.size, memento ? 0 : d.aree.length, entrata), 10000);
    if (partitaId) dimenticaEntrata(partitaId, ritorno.voce);
    navigate(indirizzoDiUscita(ritorno));
  };
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
    // R10-28a/4: lo stesso vale **senza alcun parametro** (la metro apre la scheda del Palazzo senza `?infiltrazione=`): prima la prima
    // infiltrazione non completata, non la prima in assoluto. Un'area aperta per indirizzo (`/area/<slug>`) ha la sua regola, qui sotto.
    if (richiestaInfiltrazione === 'in-corso' || (!richiestaInfiltrazione && !slug)) return d.aree.find((a) => !completate.has(a.chiave)) ?? d.aree[0] ?? null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- del Palazzo e dell'area contano chiave e slug; `revisioneArea` fa solo rileggere
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
  // Memento (progetto approvato del 2026-10-12): «Gioca» ha solo i comandi per segnare, «Modifica la guida» anche quelli per
  // sistemarla; il pozzo dei dedali si apre a richiesta
  const [modifica, setModifica] = useState(false);
  const [pozzo, setPozzo] = useState(false);

  // i gesti che cambiano lo stato nella partita (voci, catture, pin raccolti, timbri e Richieste dei dedali) e le riletture che seguono;
  // `versioneStati` cresce a ogni cambio dalla colonna e fa ricaricare il visore (e viceversa il visore ricarica la pagina)
  const { versioneStati, setVersioneStati, aggiornaPunto, cambiaStato, cattura, segnaRaccolto, aggiornaTimbri, aggiornaRichiesta } =
    useStatiPalazzo(dati, chiave, partitaId, attiva?.dataGioco ?? null);
  const catturate = useMemo(() => (d?.personeCatturate ? new Set(d.personeCatturate) : null), [d]);
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
  // LAY3-3 (R3-40, caso L3-L07): sotto i 1024 px il visore è alto min(64dvh, 560px), 520 a 375×812 e 560 a 768×1024 (con 41vh era 333 e
  // 420); comincia sotto la prima schermata, perché la pagina è lunga per scelta. Da 1024 a 1279 px resta la misura di R3-41.
  const classeVisoreMappa = 'h-[min(64dvh,560px)] lg:h-[max(300px,min(41vh,560px))] xl:h-auto xl:min-h-fit xl:flex-1 xl:[--minimo-tela:240px]';
  const sceltaPin = collegamento ? { titolo: collegamento.nome, scelti: collegamento.scelti, occupato: collegamento.occupato, ricerca: ricercaPin, attenuaNascosti: true, onScegli: (s: { id: number; nome: string }) => collegamento.onScegli(s) } : undefined;
  // gli indirizzi della scheda: dedalo (Memento), infiltrazione, area, versione e passaggi del visore (`useNavigazionePalazzo`)
  const { base, tieniRitorno, scegliArea, apriArea, scegliAreaFisica, scegliInfiltrazione, scegliInfiltrazioneQui, scegliVersione, indirizzoRaccolta, navigaDalVisore, areaEliminata } =
    useNavigazionePalazzo({ chiave, d, ritorno, params, setParams, navigate, areePalazzo, area, areaFisica, planimetriaScelta });
  /** Rilegge il Palazzo e l'area aperta (dopo una modifica di aree, versioni o legami). */
  const rileggiTutto = async () => { setRevisioneArea((r) => r + 1); await dati.ricarica(); setVersioneStati((v) => v + 1); };
  const [finestra, setFinestra] = useState<FinestraPalazzo | null>(null);
  const [legami, setLegami] = useState<string | null>(null);
  // R3-41: da 1024 px la riga dell'infiltrazione è una sola, e «Modifica infiltrazione» e «Descrizione» si aprono dal suo menu
  const largo = useMedia('(min-width: 1024px)');
  const moltoLargo = useMedia('(min-width: 1280px)');
  // L9-06: l'elenco delle aree (e il binario dei dedali) è montato una volta sola, nella forma del formato corrente
  const medio = useMedia('(min-width: 768px)');
  // L10: sotto i 640 px la riga dei dati del Palazzo sta sotto l'intestazione (che così resta entro il 30% della schermata)
  const stretto = useMedia('(max-width: 639px)');
  // la chiave dell'infiltrazione di cui si corregge il testo o si legge la descrizione: cambiando infiltrazione si chiudono da sé
  const [correggendoInfiltrazione, setCorreggendoInfiltrazione] = useState<string | null>(null);
  const [descrizioneAperta, setDescrizioneAperta] = useState<string | null>(null);
  // lotto B: il modulo della scheda del Palazzo, aperto dal menu «Modifica ⋯»
  const [correggendoPalazzo, setCorreggendoPalazzo] = useState(false);
  // L4 §8.14: il modulo «Boss finale» del Palazzo, aperto dal menu «Modifica ⋯» o dal segno «Boss finale da dichiarare»
  const [correggendoBoss, setCorreggendoBoss] = useState(false);
  const [occupato, setOccupato] = useState(false);
  // L4 §8.6 (O4-2): la conferma prima di togliere un segno che riapre un Enigma risolto («Riapre anche l'Enigma «…»»), dalla colonna «Da
  // raccogliere» e dal popup del pin; la promessa si risolve con la scelta («Annulla» = false)
  const [conferma, setConferma] = useState<{ titolo: string; righe: string[]; azione: string; risolvi: (ok: boolean) => void } | null>(null);
  const chiediConferma = (titolo: string, righe: string[], azione: string) => new Promise<boolean>((risolvi) => setConferma({ titolo, righe, azione, risolvi }));
  const chiudiConferma = (ok: boolean) => { conferma?.risolvi(ok); setConferma(null); };
  const tutteLeVoci = d?.aree.flatMap((a) => a.punti) ?? [];
  /** Prima di togliere il segno al pin: se riapre un Enigma risolto (un suo passo sta sul pin) chiede conferma, altrimenti va. */
  const primaDiTogliereIlPin = (id: number, nome?: string): Promise<boolean> => {
    const enigmi = enigmiCheSiRiaprono(vociDelPin(id, tutteLeVoci), tutteLeVoci);
    if (enigmi.length === 0) return Promise.resolve(true);
    const nomePin = nome ?? d?.planimetrie.flatMap((p) => p.spilli).find((s) => s.id === id)?.nome ?? 'pin';
    return chiediConferma(`Togliere il segno a «${nomePin}»?`, righeRiapertura(null, enigmi), 'Togli il segno');
  };
  /** Dal popup del pin: togliere il segno al pin (`voce` null) o riaprire una sua voce, con la stessa conferma. */
  const primaDiRiaprire = (s: { id: number; nome?: string }, voce: string | null): Promise<boolean> => {
    if (voce === null) return primaDiTogliereIlPin(s.id, s.nome);
    const v = tutteLeVoci.find((x) => x.chiave === voce);
    const enigmi = v ? enigmiCheSiRiaprono([v], tutteLeVoci) : [];
    return enigmi.length === 0 ? Promise.resolve(true) : chiediConferma(`Riaprire «${v!.nome}»?`, righeRiapertura(null, enigmi), 'Riapri');
  };
  const contenitorePalazzo = { tipo: 'dungeon' as const, chiave };
  const infiltrazioniPalazzo = (d?.aree ?? []).map((a) => ({ chiave: a.chiave, nome: a.nome, ordine: a.ordine }));
  /** Salva l'ordine nuovo delle aree del Palazzo; vero se è andato. */
  // L12 (passo 8): nel rilascio (sola lettura) le aree non si riordinano: la funzione non scrive (e `riordinaAree` esce dal bundle)
  const riordinaAreePalazzo = IN_RILASCIO ? async (): Promise<boolean> => false : async (ordine: string[]): Promise<boolean> => {
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
      navigate(area ? `${base}?${tieniRitorno(new URLSearchParams({ infiltrazione: area.chiave })).toString()}` : `${base}${ritorno ? `?${tieniRitorno(new URLSearchParams()).toString()}` : ''}`, { replace: true });
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
  // Memento gli obiettivi dei dedali, come prima (R4-30). L10-03: la percentuale, per difetto, con la regola unica dei dedali e delle carte
  // dei Luoghi (`percentualeSegnati`), anche per i Memento (prima arrotondata: 199 su 200 diceva 100%)
  const anello = d ? anelloPalazzo(d, memento) : null;
  const percentuale = anello ? percentualeSegnati(anello.fatti, anello.totale) : null;
  const livello = d && !memento ? livelloPalazzo(d) : null;
  const conti = d && !memento ? d.completamento : undefined;
  // le planimetrie complete con la regola unica (L4 §1.5: senza niente da contare è completa); senza i numeri nuovi, il conto di prima
  const planimetrieComplete = d ? (d.planimetrie.some((p) => p.completamento) ? (d.planimetrie.some((p) => p.completamento?.completata === null) ? null : d.planimetrie.filter((p) => p.completamento?.completata).length) : d.raccolta.mappeComplete) : null;
  const areeSuggerite = (d?.aree ?? []).filter((a) => sugg.evidenziato('aree', a.chiave)).length;
  const suggerimentoDiffuso = !!d && d.aree.length > 0 && areeSuggerite === d.aree.length;
  /** Se un'area va evidenziata come suggerita: no quando lo sono tutte, perché allora il suggerimento riguarda il Palazzo intero e lo dice il chip dell'intestazione. */
  const areaSuggerita = (chiaveArea: string) => !suggerimentoDiffuso && sugg.evidenziato('aree', chiaveArea);
  /** Apre la sezione «Da verificare» (in fondo a «Da raccogliere») e la porta in vista. */
  const apriDaVerificare = () => { const s = sezioneDaVerificare.current; if (s) { s.open = true; s.scrollIntoView?.({ block: 'nearest', behavior: comportamentoScorrimento() }); } };
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
  /** Aree, planimetrie e planimetrie complete del Palazzo, a parole (il chip della riga sotto il titolo, o dei «Dettagli» da 1024 a 1279 px). */
  const testoAreePlanimetrie = `${areePalazzo.length} ${areePalazzo.length === 1 ? 'area' : 'aree'} · ${d?.planimetrie.length ?? 0} planimetrie${planimetrieComplete !== null ? ` · ${planimetrieComplete} complete` : ''}`;
  // `sotto`: è l'istanza dei «Dettagli» della riga sotto il titolo (quella che si vede sotto i 1024 px); solo lei porta «Sulla mappa di
  // Tokyo», che così non è montato due volte
  // L8-04 (D5): il livello consigliato minimo e massimo; il confronto delle fonti (nota storica) solo nella preparazione (D10)
  const livelloTesto = d ? testoLivelloConsigliato(d.livelloConsigliato) : null;
  const noteLivello = !IN_RILASCIO && d ? d.noteLivello : [];
  const dettagliGuida = (classe: string, sotto = false) => d && (livelloTesto || noteLivello.length || d.note || !memento) ? (
    <details className={`testo-12 ${classe}`}>
      <summary className="touch cursor-pointer text-text-muted">Dettagli dalla guida</summary>
      <div className="flex flex-col gap-1 pt-1.5">
        {/* LAY3-5: nei Palazzi sotto i 1024 px «Sulla mappa di Tokyo» sta qui, per esteso (nell'intestazione mandava a capo la riga) */}
        {!memento && !largo && sotto && <AtterraggioTokyo dungeon={d} onSalvato={() => dati.ricarica()} />}
        {/* LAY3-5: nei Palazzi a ogni larghezza (prima da 1024 px): sotto i 1024 l'intestazione non tiene più i conteggi */}
        {!memento && <span className="flex flex-wrap gap-1.5">
          <span className="chip">{d.aree.length} infiltrazioni</span>
          <span className="chip" title="I collezionabili sulle planimetrie (forzieri, semi, tesori).">{d.raccolta.totale} da raccogliere</span>
          <span className="chip" title="Sicure, scorciatoie, enigmi, incontri e boss della guida.">{d.punti} punti della guida</span>
          {/* R3-41: da 1024 a 1279 px anche aree e planimetrie stanno qui (nella riga sotto il titolo la mandavano a capo) */}
          <span className="chip xl:hidden">{testoAreePlanimetrie}</span>
        </span>}
        {/* il dettaglio del chip riassuntivo (R3-41, scelta 3): Tesoro e boss per esteso, e il perché del livello */}
        {!memento && d.completamento && d.completamento.tesoro !== null && d.completamento.boss !== null && (
          <span className="block testo-12 text-text-secondary">
            Tesoro {d.completamento.tesoro ? 'raccolto' : 'da prendere'} · boss finale {d.completamento.boss ? 'sconfitto' : 'da sconfiggere'}{livello ? ` · ${livello.testo}: ${livello.perche}` : ''}
          </span>
        )}
        {/* LAY3-5 (e LAY3-2): sovrano e arcana interi, perché nell'intestazione si accorciano quando sono frasi lunghe */}
        {!memento && d.sovrano && <TestoRipiegabile testo={`Sovrano: ${d.sovrano}`} massimo={120} className="testo-12 text-text-secondary" />}
        {!memento && d.arcanaSovranoNome && <TestoRipiegabile testo={`Arcana: ${d.arcanaSovranoNome}`} massimo={120} className="testo-12 text-text-secondary" />}
        {livelloTesto && <span className="testo-13 text-text-secondary">Livello consigliato: {livelloTesto}</span>}
        {noteLivello.length > 0 && <NoteStoricheOfferta note={noteLivello} effetto={EFFETTO_NOTA_LIVELLO} />}
        {d.note && <TestoRipiegabile testo={d.note} massimo={140} className="testo-12 text-text-muted whitespace-pre-wrap" />}
      </div>
    </details>
  ) : null;
  /** La riga dei dati sotto il titolo: finestra, atterraggio, conteggi (nei Memento), chip riassuntivo e «Dettagli dalla guida». Nei
   *  Memento sta nella piega «Date, mappe e conteggi»; nei Palazzi nella testata, e sotto i 640 px appena sotto (L10). Montata in un
   *  posto solo per volta, così «Sulla mappa di Tokyo» e i dettagli non sono mai doppi. */
  const rigaDati = () => d && <>
    {memento && d.sovrano && <span className="testo-13 text-text-secondary md:hidden">{d.sovrano}</span>}
    <LineaDelTempo date={d.date} memento={memento} />
    {/* `lg:contents`: da 1024 px i chip entrano nella riga uno per uno, e vanno a capo solo quelli che non ci stanno (nei Palazzi
        a ogni larghezza, LAY3-5). */}
    <div className={memento ? 'flex flex-wrap items-center gap-2 lg:contents' : 'contents'}>
      {/* nei Palazzi «Mappa del Palazzo» non c'è più: il visore è nella scheda stessa (L3, §4.1); nei Memento resta */}
      {memento && <CollegamentoMappa tipo="dungeon" chiave={d.chiave} testo="Mappa dei Memento" />}
      {/* Quando compare sulla mappa di Tokyo e dove si atterra toccandolo (2026-10-04). Nei Palazzi sotto i 1024 px sta nei
          «Dettagli dalla guida» (LAY3-5): qui, intero, mandava a capo la riga; uno solo alla volta (`largo`) */}
      {(memento || largo) && <AtterraggioTokyo dungeon={d} onSalvato={() => dati.ricarica()} compatto={!memento} />}
      {/* nei Palazzi infiltrazioni, collezionabili e punti della guida stanno nei «Dettagli dalla guida» (da 1024 px per R3-41,
          sotto per LAY3-5: la riga tiene finestra, atterraggio e il chip riassuntivo) */}
      <span className={`chip ${memento ? '' : 'hidden'}`}>{d.aree.length} {memento ? 'dedali' : 'infiltrazioni'}</span>
      <span className={`chip ${memento ? '' : 'hidden'}`} title={memento ? 'Gli elementi delle aree dei dedali (Richieste, timbri, voci di Trama): sono questi a fare la percentuale; le Persona no.' : 'I collezionabili sulle planimetrie (forzieri, semi, tesori).'}>{d.raccolta.totale} {memento ? 'elementi' : 'da raccogliere'}</span>
      {/* R3-41: da 1024 a 1279 px questo chip sta nei «Dettagli dalla guida»: qui mandava a capo la riga (intestazione da 106 a 137 px);
          sotto i 1024 px anche (LAY3-5) */}
      {!memento && <span className="chip max-xl:hidden" title="Le aree del Palazzo, con le loro versioni: si ordinano e si correggono dall’elenco delle aree.">
        {testoAreePlanimetrie}
      </span>}
      {!memento
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
      <span className={`chip ${memento ? '' : 'hidden'}`} title="Sicure, scorciatoie, enigmi, incontri e boss della guida.">{d.punti} punti della guida</span>
      {suggerimentoDiffuso && !memento && <span className="chip chip--attivo" title={sugg.motivo('dungeon', d.chiave) ?? undefined}>Suggerito oggi</span>}
    </div>
    {/* L10-02 (Q8 A): i totali dei dedali vengono ognuno dalla sua pagina della guida, e la loro somma non è il totale che la guida dichiara
        per tutti i Memento: nulla si forza, la scheda lo dice una volta, qui, con le due cifre (solo se sono diverse) */}
    {memento && timbriDiscordanti && (
      <p className="m-0 basis-full testo-12 text-text-secondary text-pretty">
        Timbri: i totali dei dedali, ognuno dalla sua pagina della guida, sommano {timbriDiscordanti.somma}; la guida ne dichiara {timbriDiscordanti.dichiarati} in tutto. Valgono i totali dei dedali. Fonte: {timbriDiscordanti.fonte}.
      </p>
    )}
    {/* nei Palazzi, da 1024 px, i «Dettagli dalla guida» stanno nella riga del titolo (R3-41): qui solo sotto i 1024 */}
    {dettagliGuida(memento ? 'lg:open:basis-full' : 'lg:hidden', true)}
  </>;
  // Con un'area aperta la colonna di destra mostra **quell'area** (rilievo dell'utente, 2026-10-01: «in ogni area sembrano poi vedersi
  // i raccoglibili di tutte le altre aree»); il resto del Palazzo sta nella piega qui sotto. I numeri restano per planimetria (R3-31).
  const mappeArea = planimetrieArea;
  const vuotoArea = !areaFisica ? 'Nessuna area aperta: niente da raccogliere qui.' : 'Niente da raccogliere sulle planimetrie di quest’area.';
  const altrePlanimetrie = (d?.planimetrie ?? []).filter((p) => !mappeArea.some((m) => m.chiave === p.chiave));
  const restanoAltre = altrePlanimetrie.reduce((s, p) => s + p.n - (p.presi ?? 0), 0);
  // Il Palazzo ha un'illustrazione da mostrare nell'intestazione (la stessa regola di IllustrazioneConSegno): i Memento no.
  const illustrato = !!useImmagineMappa(memento ? null : d?.illustrazione);

  const senzaPin = versioneSenzaPin(versioniArea, planimetriaScelta);

  /** L9-06: l'elenco delle aree del Palazzo nella forma data. Una sola forma è montata per volta: colonna da 1280 px, fila da 768 a 1279, foglio
   *  sotto. Collegando i pin l'elenco resta (2026-10-18): toccare un'area porta la sua planimetria nella mappa del collegamento, senza cambiare
   *  infiltrazione né area. */
  const elencoAree = (forma: 'colonna' | 'fila' | 'foglio') => d && area && (
    <AreePalazzo forma={forma} aree={areePalazzo} infiltrazioni={d.aree} areaScelta={areaFisica?.slug ?? null} infiltrazioneScelta={area.chiave}
      completate={completate} onScegliArea={collegamento ? (s) => setMappaCollegamento(areePalazzo.find((x) => x.slug === s)?.predefinita ?? null) : scegliAreaFisica}
      onScegliInfiltrazione={scegliInfiltrazione} onCollegaAree={setLegami}
      onAggiungiArea={() => setFinestra('aggiungi-area')} onRiordina={riordinaAreePalazzo} />
  );

  /** Lotto B (punto 6): gli strumenti di modifica del Palazzo in un solo menu «Modifica ⋯» (`MenuModificaPalazzo`); nei Memento resta la
   *  modalità «Modifica la guida». */
  const menuModifica = (classePulsante = '') => {
    if (!d || !area || memento) return null;
    return (
      <MenuModificaPalazzo d={d} area={area} areaFisica={areaFisica} dettaglioAreaPronto={!!dettaglioArea.dati} classePulsante={classePulsante}
        onCorreggiScheda={() => setCorreggendoPalazzo(true)} onBossFinale={() => setCorreggendoBoss(true)} onModificaTesto={setCorreggendoInfiltrazione}
        onModificaAree={setLegami} onFinestra={setFinestra} />
    );
  };

  /** Il modulo del testo dell'infiltrazione (nome e descrizione, con l'eliminazione), aperto dal menu «Modifica ⋯»: sotto la riga. */
  const moduloInfiltrazione = () => d && area && correggendoInfiltrazione === area.chiave && (
    <ModuloInfiltrazione key={area.chiave} area={area} onChiudi={() => setCorreggendoInfiltrazione(null)} onSalvato={() => dati.ricarica()} onEliminata={areaEliminata} />
  );

  /** R3-41 (decisione del PM, 2026-10-20), da 1024 px: la riga dell'infiltrazione è una sola — il selettore (il titolo), le aree toccate
   *  in una fila scorrevole (da 1280 i chip «Aree toccate»; da 1024 a 1279 la fila di tutte le aree, con le toccate evidenziate, che lì
   *  sostituisce la colonna), «Descrizione» e il menu «Modifica ⋯» (lotto B: al posto di «Altro» e di «+ Infiltrazione», solo icona).
   *  Il modulo della correzione e la descrizione si aprono sotto la riga, solo quando li si chiede. */
  const rigaInfiltrazioneLarga = () => {
    if (!d || !area) return null;
    return <>
      <div className="flex items-center gap-2">
        {d.aree.length > 1
          ? <div className={`flex items-center gap-1 ${moltoLargo ? 'min-w-0 flex-1' : 'w-[min(15rem,40%)] shrink-0'}`}>
              <h2 className="sr-only">{area.nome}</h2>
              {/* compatto (una riga da 44, l'etichetta «Infiltrazione N di M» resta il nome per chi non vede): con l'etichetta sopra il
                  valore andava su due righe, 65 px (R3-41); «di M» accanto, piccolo */}
              {/* LAY3-7 (decisione del PM, strada (b)): su una riga, il valore chiuso può accorciarsi (R3-41 ha la precedenza); il nome
                  intero è nell'elenco aperto con un tocco e nel nome accessibile del pulsante (`valoreNelNome`) */}
              <Selettore compatto valoreNelNome className="min-w-0 flex-1" etichetta={`Infiltrazione ${area.ordine + 1} di ${d.aree.length}`} valore={area.chiave}
                opzioni={d.aree.map((a) => ({ chiave: a.chiave, nome: `${a.ordine + 1}. ${a.nome}`, dettaglio: completate.has(a.chiave) ? 'completata' : undefined }))} onCambia={scegliInfiltrazione} />
              <span className="shrink-0 testo-12 text-text-muted" aria-hidden>di {d.aree.length}</span>
            </div>
          : <span className="flex shrink-0 flex-col"><TitoloSezione variante="display">{area.nome}</TitoloSezione><span className="testo-12 text-text-muted">infiltrazione 1 di 1</span></span>}
        {/* UX3-13: da 1280 px la riga non ha più la striscia «Aree toccate» (51–190 px che scorreva di lato, già scorsa: etichetta
            tagliata, chip a metà, un gesto nascosto). Un comando visibile chiedeva 132 px e a capo sforava R3-41: le aree toccate sono
            quelle evidenziate nella colonna delle aree, con la legenda per esteso, e il selettore prende lo spazio liberato. */}
        {!moltoLargo && <div className="min-w-0 flex-1">{elencoAree('fila')}</div>}
        {area.descrizione && <PulsanteVisivo tono="fantasma" compatto className="btn-visivo--icona-lg shrink-0" icona={<IconaAzione chiave="dettagli" dimensione={20} />}
          titolo={descrizioneAperta === area.chiave ? 'Nascondi la descrizione' : 'Descrizione'} title="Descrizione dell’infiltrazione" aria-expanded={descrizioneAperta === area.chiave}
          onClick={() => setDescrizioneAperta((x) => (x === area.chiave ? null : area.chiave))} />}
        {!IN_RILASCIO && menuModifica('btn-visivo--icona-lg')}
      </div>
      {!IN_RILASCIO && moduloInfiltrazione()}
      {descrizioneAperta === area.chiave && area.descrizione && <p className="m-0 testo-13 text-text-secondary whitespace-pre-wrap">{area.descrizione}</p>}
    </>;
  };

  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}
      scheda={{ titolo: chiave === 'mementos' ? 'Memento' : 'Palazzo', ripiego: '/guida/dungeon' }}>
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
          {/* LAY3-5: nei Palazzi sotto i 1024 px margine verticale di 12 px (l'intestazione al massimo il 30% della schermata) */}
          {!collegamento && <header className={`card relative shrink-0 overflow-hidden lg:py-1.5 ${memento ? '' : 'max-lg:py-3'}`}>
            {/* Lo stemma grande e tenue nell'angolo resta solo dove non c'è l'illustrazione: accanto a una figura piena sarebbe un
                secondo stemma, e velato (L1). */}
            {!illustrato && <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 hidden opacity-[0.07] sm:block">
              <EmblemaDungeon chiave={d.chiave} nome={d.nome} arcanaSovrano={d.arcanaSovrano} dimensione={280} />
            </span>}
            {/* Nei Memento (2026-10-12) l'intestazione è compatta a ogni larghezza, come da 1024 px: emblema e anello piccoli in riga. */}
            {/* LAY3-5 (regola dell'utente: l'intestazione al massimo il 30% della schermata, ≤ 243 px a 375×812 e ≤ 307 a 768×1024): nei
                Palazzi sotto i 1024 px una griglia in tre righe — il titolo su tutta la riga; la figura (piena, più piccola) e l'anello a
                sinistra, sovrano e arcana a destra; date e chip sotto —, con i contenitori intermedi «trasparenti» (`contents`). Da 1024 px
                la disposizione di R3-41, invariata. Conteggi, testi lunghi e «Sulla mappa di Tokyo» stanno nei «Dettagli dalla guida». */}
            <div className={`relative gap-3 ${memento ? 'flex flex-row items-center' : 'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-y-1.5 lg:flex lg:items-center'}`}>
              {/* Da 1280 px, con l'illustrazione, figura e anello stanno in colonna: affiancati prendevano larghezza al testo e
                  in Shido, Niijima e Madarame il sovrano andava a capo (intestazione da 170 a 222 px); in colonna occupano la
                  larghezza dello stemma e dell'anello di prima e un'altezza che l'intestazione ha già (UX-1, 2026-10-20). */}
              {/* R3-41 (decisione del PM, 2026-10-20): da 1024 px stemma piccolo e anello in riga accanto al titolo (variante G1 di L1),
                  e l'illustrazione passa a sfondo dell'intestazione (sotto): in colonna, alta 115 px, teneva alta l'intestazione. */}
              <div className={`flex shrink-0 items-center ${memento ? 'gap-2' : 'gap-2 max-lg:col-start-1 max-lg:row-start-2'}`}>
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
                    {/* LAY3-5: sotto i 1024 px la figura resta piena, al 100%, più piccola: 96 px sul telefono, 128 sul tablet (erano 150 e
                        176, sopra al titolo) */}
                    <span className={memento ? 'lg:hidden' : 'sm:hidden'}>{memento ? emblema(40) : figura('w-[96px]', '96px', 28, 48)}</span>
                    {!memento && <span className="hidden sm:block lg:hidden">{figura('w-[128px]', '128px', 32, 56)}</span>}
                    {/* Da 1024 a 1279 px lo stemma da 48, senza illustrazione (decisione di L1, UX-1). Da 1280 px l'illustrazione piena, al
                        100%, nel suo spazio (104 px, lo stemma da 40 sopra), in riga con l'anello e non più in colonna: alta 59 px, sta nelle due
                        righe dell'intestazione compatta (R3-41). Mai velata dietro al testo (regola dell'utente, UX3-6). */}
                    <span className="hidden lg:block xl:hidden">{emblema(48)}</span>
                    <span className="hidden xl:block">{figura('w-[104px]', '104px', 40, 48)}</span>
                  </>;
                })()}
                {anello && percentuale !== null && (
                  // un anello solo (è la barra di avanzamento della pagina): da 1024 px si rimpicciolisce, non si duplica
                  // LAY3-5: nei Palazzi piccolo (48 px) a ogni larghezza, come nei Memento
                  <AnelloAvanzamento quota={anello.quota} dimensione={64} spessore={5} className="size-12!" etichetta={anello.etichetta}>
                    <span className="font-display testo-13 leading-none tabular-nums">{percentuale}%</span>
                  </AnelloAvanzamento>
                )}
              </div>
              {/* LAY3-5: nei Palazzi sotto i 1024 px colonna del testo e riga del titolo sono «trasparenti» (`contents`): i loro pezzi vanno
                  nelle righe della griglia sopra */}
              <div className={memento ? 'flex min-w-0 flex-1 flex-col gap-2.5 lg:gap-1' : 'contents lg:flex lg:min-w-0 lg:flex-1 lg:flex-col lg:gap-1'}>
                <div className={memento ? 'flex flex-col gap-1 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-3' : 'contents lg:flex lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-3'}>
                  <div className={`flex flex-wrap items-center gap-2 ${memento ? '' : 'max-lg:col-span-2 max-lg:row-start-1 max-lg:flex-nowrap'}`}>
                    {/* nei Palazzi solo l'icona (da 1024 px per R3-41, scelta 3 del PM; sotto per LAY3-5): il nome resta per chi non vede e nel
                        suggerimento */}
                    {/* lotto B: il ritorno comune delle schede (la pagina di prima o, entrando da un collegamento diretto, l'elenco dei
                        Palazzi); arrivando dal diario resta «Esci», che torna alla voce */}
                    {ritorno
                      ? <button type="button" className="btn btn-secondary btn-sm touch -ml-2 shrink-0" title="Esci dal Palazzo e torna alla voce del diario" onClick={esci}><IconChevronLeft size={18} /> Esci</button>
                      : <IndietroScheda ripiego="/guida/dungeon" etichettaNascosta={!memento} />}
                    <TitoloScheda>{d.nome}</TitoloScheda>
                    {/* nei Memento la correzione della scheda è un comando per sistemare la guida: solo in «Modifica la guida»; nei Palazzi
                        sta nel menu «Modifica ⋯» (lotto B); in tutti e due i casi è una finestra (L9-05) */}
                    {!IN_RILASCIO && memento && modifica && <CorrezioneSchedaPalazzo d={d} memento={memento} onSalvato={() => dati.ricarica()} />}
                  </div>
                  {/* Da 1024 px sovrano e arcana prendono quel che resta della riga del nome, ognuno su una riga coi puntini (testo intero nel
                      suggerimento): in Madarame e Okumura il sovrano è una frase e andava a capo (intestazione da 170 a 197 px), l'arcana di
                      Maruki la portava a 270 (L3, R3-41). Sotto i 128 px rimasti vanno a capo, interi come sotto i 1024 (erano 160: a 1024 in
                      Kamoshida, Kaneshiro e Madarame mandavano a capo «Dettagli dalla guida», intestazione da 106 a 154 px). */}
                  <div className={`flex flex-wrap items-center gap-2 testo-13 text-text-secondary lg:min-w-0 lg:flex-1 lg:basis-32 lg:gap-x-2 lg:gap-y-0 ${memento ? '' : 'max-lg:col-start-2 max-lg:row-start-2 max-lg:min-w-0 max-lg:gap-x-2 max-lg:gap-y-1'}`}>
                    {/* nei Memento, sul telefono, il sovrano sta nella piega dei dettagli: qui andava a capo su due righe */}
                    {/* LAY3-2: se sovrano e arcana non stanno in una riga, l'arcana va sulla seconda, sotto il sovrano: le due righe (18 + 22 px)
                        stanno nell'altezza della riga del titolo (44 px), quindi l'intestazione non cresce. Così il nome del sovrano e le parole
                        brevi («Avarizia» di Okumura) si leggono intere; si accorcia coi puntini solo un testo più largo di tutto lo spazio (le
                        frasi lunghe del sovrano di Okumura e Madarame, l'arcana di Maruki), intero nel suggerimento. */}
                    {/* LAY3-5: sotto i 1024 px nei Palazzi sovrano e arcana al massimo su due righe ciascuno (LAY3-6: l'arcana su una sola
                        tagliava «Giudizio (Judgement)» a 375); tutti e due interi anche nei «Dettagli dalla guida», che si leggono senza mouse */}
                    {d.sovrano && <span className={`break-words lg:min-w-0 lg:max-w-full lg:truncate ${memento ? 'max-md:hidden' : 'max-lg:line-clamp-2'}`} title={d.sovrano}>{d.sovrano}</span>}
                    {/* L10: nei Palazzi sotto i 1024 px il taglio a due righe sta sul testo, non sul chip: col taglio sul chip la terza riga
                        si intravedeva nei 4 px di margine interno, sotto le due righe (Kaneshiro a 375). Il testo intero resta nel suggerimento */}
                    {d.arcanaSovranoNome && <span className={`chip chip--attivo lg:block lg:min-w-0 lg:max-w-[min(100%,18rem)] lg:truncate ${memento ? '' : 'max-lg:min-w-0 max-lg:max-w-full'}`} title={d.arcanaSovranoNome}>
                      {memento ? d.arcanaSovranoNome : <span className="max-lg:line-clamp-2">{d.arcanaSovranoNome}</span>}
                    </span>}
                    {memento && suggerimentoDiffuso && <span className="chip chip--attivo" title={sugg.motivo('dungeon', d.chiave) ?? undefined}>Suggerito oggi</span>}
                  </div>
                  {/* R3-41: da 1024 px nei Palazzi i «Dettagli dalla guida» chiudono la riga del titolo (aperti vanno a capo, sotto) */}
                  {!memento && dettagliGuida('hidden lg:block lg:open:basis-full')}
                </div>
                {/* Da 1024 px finestra, conteggi e dettagli stanno su una riga; i dettagli aperti vanno a capo, sotto. Nei Memento
                    (2026-10-12) la riga sta in una piega: lo spazio va ai dedali e alle aree, che sono la pagina. */}
                {memento
                  ? <details className="testo-12">
                      <summary className="touch cursor-pointer text-text-muted">Date, mappe e conteggi del Memento</summary>
                      <div className="flex flex-col gap-2.5 pt-1.5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2">{rigaDati()}</div>
                    </details>
                  // LAY3-5: nei Palazzi la riga è in fila a ogni larghezza; sotto i 1024 px è la terza riga della griglia. L10: sotto i 640 px
                  // sta subito sotto l'intestazione, non dentro (con lei la testata arrivava al 36% della schermata del telefono)
                  : !stretto && <div className="flex flex-row flex-wrap items-center gap-x-1.5 gap-y-1.5 max-lg:col-span-2 max-lg:row-start-3 lg:gap-2">{rigaDati()}</div>}
              </div>
            </div>
          </header>}
          {/* L10: sul telefono la riga di date, «Concluso», Tesoro e boss e «Dettagli dalla guida» del Palazzo, appena sotto l'intestazione */}
          {!memento && !collegamento && stretto && <div className="flex shrink-0 flex-row flex-wrap items-center gap-x-1.5 gap-y-1.5 px-1" aria-label={`${d.nome}: date e avanzamento`} role="group">{rigaDati()}</div>}
          {/* L4 §8.14 (condizione del PM sulla 112): un Palazzo con la regola della voce e senza voce del boss finale non si conclude mai.
              Il segno lo dice e porta dritto a «Modifica › Boss finale». Sta sotto l'intestazione, non dentro: lì una riga in più l'avrebbe
              portata oltre il 30% della schermata sul telefono. Solo nella preparazione (nel rilascio la voce non si dichiara). */}
          {!IN_RILASCIO && !memento && !collegamento && d.bossFinaleDaDichiarare && !correggendoBoss && (
            <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 testo-12 text-text-secondary">
              <button type="button" className="chip chip--oro touch" onClick={() => setCorreggendoBoss(true)}
                aria-label={`Boss finale da dichiarare: scegli la voce del boss finale del Palazzo «${d.nome}»`}>Boss finale da dichiarare</button>
              <span className="min-w-0 flex-1 text-pretty">Senza la sua voce il Palazzo non risulta mai concluso.</span>
            </div>
          )}
          {/* lotto B: la correzione della scheda del Palazzo, aperta dal menu «Modifica ⋯»; L9-05: è una finestra, niente contenitore nella pagina */}
          {!IN_RILASCIO && !memento && correggendoPalazzo && <CorrezioneSchedaPalazzo d={d} memento={memento} onChiudi={() => setCorreggendoPalazzo(false)} onSalvato={() => dati.ricarica()} />}
          {!IN_RILASCIO && !memento && correggendoBoss && <div className="shrink-0"><ModuloBossFinale d={d} onChiudi={() => setCorreggendoBoss(false)} onSalvato={() => dati.ricarica()} /></div>}

          {/* Da 1024 px una riga sola, alta quanto resta (`minmax(0,1fr)`): le colonne si stirano fino in fondo. Il
              minimo evita colonne schiacciate su uno schermo più basso di un portatile con il browser aperto: lì, e
              solo lì, torna a scorrere la pagina. */}
          {/* ---- I Memento (progetto approvato del 2026-10-12): da 1024 px il binario dei dedali a sinistra e il dedalo a destra,
              ognuno col suo scorrimento; sul tablet i dedali in fila sopra il dedalo, col pozzo a richiesta in una finestra; sul telefono
              (L10-10) la griglia dei dedali sta nella scheda del dedalo, col pozzo come suo sfondo. Da 1024 px il disegno del pozzo sta
              fisso in cima al binario. ---- */}
          {memento && (() => {
            const scelto = area.dedalo ? { ...area, dedalo: area.dedalo } : null;
            return (
              // la colonna dei dedali è larga 260 px da 1024 e 300 da 1280 (richiesta dell'utente, 2026-10-12: «allarga la colonna
              // dedali»): a 1024 la colonna del dedalo resta sui 430 px, a 1280 le due colonne dell'area restano affiancate
              <div className="grid grid-cols-1 items-start gap-3 lg:min-h-[280px] lg:flex-1 lg:grid-cols-[260px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:items-stretch xl:grid-cols-[300px_minmax(0,1fr)]">
                {/* «lascia sempre visibile Pozzo» (2026-10-12, scelta «Disegno fisso in cima»): il disegno del pozzo sta fermo in cima
                    alla colonna e si tocca per scegliere il dedalo; sotto, l'elenco dei dedali scorre da solo */}
                {largo && (
                  <nav aria-label="Dedali dei Memento" className="flex min-h-0 flex-col gap-1.5">
                    <MappaMemento aree={d.aree} selezionata={area.chiave} onSeleziona={scegliArea} className="shrink-0" />
                    <div className="flex min-h-0 flex-1 flex-col gap-1 area-scorrevole p-1.5">
                      <span className="px-1 testo-12 uppercase tracking-wide text-text-muted">Dedali</span>
                      {d.aree.map((a) => <DedaloNelBinario key={a.chiave} a={a} suggerito={areaSuggerita(a.chiave)} scelto={a.chiave === area.chiave} onScegli={() => scegliArea(a.chiave)} />)}
                    </div>
                  </nav>
                )}
                <div className="flex min-w-0 flex-col gap-2.5 lg:min-h-0 lg:area-scorrevole lg:p-2">
                  {/* sul tablet: i dedali in fila, col pozzo */}
                  {medio && !largo && (
                    <div className="flex items-center gap-2">
                      <FilaScorrevole className="fila-scorrevole--sempre min-w-0 flex-1 items-center" aria-label="Dedali dei Memento">
                        {d.aree.map((a) => <DedaloNelBinario key={a.chiave} a={a} fila suggerito={areaSuggerita(a.chiave)} scelto={a.chiave === area.chiave} onScegli={() => scegliArea(a.chiave)} />)}
                      </FilaScorrevole>
                      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Pozzo" aria-label="Apri il pozzo dei Memento" onClick={() => setPozzo(true)} />
                    </div>
                  )}
                  {scelto && <AreeDelDedalo key={area.chiave} dedalo={scelto} dedali={d.aree} onScegliDedalo={scegliArea}
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
            {moltoLargo && (
              <nav aria-label="Il Palazzo" className="min-h-0">
                <div className="card h-full area-scorrevole p-2">{elencoAree('colonna')}</div>
              </nav>
            )}
            {/* ---- L'area scelta: planimetrie ---- */}
            {/* Da 1024 a 1279 px mappa e raccolta stanno una sotto l'altra in **un'area sola** che scorre; da 1280 px
                sono due colonne, ognuna con il suo scorrimento, e la mappa si allunga fino in fondo alla sua. */}
            <div className="grid grid-cols-1 items-start gap-4 lg:min-h-0 lg:max-xl:area-scorrevole lg:max-xl:p-2 xl:grid-rows-[minmax(0,1fr)] xl:items-stretch xl:grid-cols-[minmax(0,1fr)_352px]">
              <section className="card flex flex-col gap-2.5 lg:gap-1.5 lg:p-2.5 xl:min-h-0 xl:area-scorrevole">
                {/* R3-41 (decisione del PM, 2026-10-20): da 1024 px la riga dell'infiltrazione è una sola — selettore, aree toccate
                    scorrevoli, «Descrizione» e il menu «Modifica ⋯» — così il visore
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
                    : <TitoloSezione variante="display">{area.nome}</TitoloSezione>}
                  {(collegamento || d.aree.length <= 1) && <span className="testo-12 text-text-muted">infiltrazione {area.ordine + 1} di {d.aree.length}</span>}
                  {/* lotto B (punto 6): le azioni sull'infiltrazione e sull'area in un solo menu, accanto
                      al selettore: la prima schermata del telefono mostra la mappa e non quattro comandi di modifica */}
                  {/* L9-05: andando a capo il pulsante resta a destra: il riquadro del menu si apre verso sinistra e a 375 px usciva dallo schermo (x=-125) */}
                  {!IN_RILASCIO && !collegamento && <div className="ml-auto">{menuModifica()}</div>}
                </div>
                {/* il modulo del testo si apre sotto la riga; `key`: cambiando infiltrazione si rimonta (rilievo della revisione) */}
                {!IN_RILASCIO && !collegamento && moduloInfiltrazione()}
                {/* Collegando i pin resta solo la riga del titolo (2026-10-18: «è inutile tutto ad eccezione del titolo»). */}
                {/* «Aree toccate» (§4.2): le aree che l'infiltrazione percorre, in ordine; toccarne una la apre. La voce «Aree toccate dall’infiltrazione» del menu cambia i legami. */}
                {!collegamento && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="testo-12 uppercase tracking-wide text-text-muted">Aree toccate</span>
                    <ol className="m-0 flex list-none flex-wrap gap-1 p-0" aria-label={`Aree toccate da ${area.nome}`}>
                      {(area.areePalazzo ?? []).map((a) => (
                        <li key={a.chiave}>
                          <button type="button" className={`chip touch testo-12 ${a.chiave === areaFisica?.chiave ? 'chip--attivo' : ''}`} aria-pressed={a.chiave === areaFisica?.chiave}
                            onClick={() => apriArea(a.slug, area.chiave, a.planimetriaIniziale)}>{a.nome}</button>
                        </li>
                      ))}
                    </ol>
                    {/* la descrizione dell'infiltrazione in una piega sulla stessa riga: per esteso (anche ripiegata a 140 caratteri) spingeva
                        il visore sotto il bordo della colonna; aperta, va a capo sotto */}
                    {area.descrizione && (
                      <details className="testo-12 open:basis-full">
                        <summary className="touch cursor-pointer text-text-muted">Descrizione</summary>
                        <p className="m-0 pt-1 testo-13 text-text-secondary whitespace-pre-wrap">{area.descrizione}</p>
                      </details>
                    )}
                  </div>
                )}
                {/* da 768 a 1279 px le aree in fila sopra il visore; sotto i 768 px il pulsante «Aree · N» che apre il foglio */}
                {!collegamento && <div>{elencoAree(medio ? 'fila' : 'foglio')}</div>}
                </>}
                {/* Arrivando dalla proposta di una voce del diario (UX3-1, §4.4): la riga che lo dice, con «Conferma» e «Chiudi» */}
                {!IN_RILASCIO && daVoce && !collegamento && <PropostaDallaVoce key={daVoce} uid={daVoce} partitaId={partitaId} onChiudi={togliDaVoce}
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
                    <h3 className="m-0 break-words testo-15 font-semibold xl:min-w-0 xl:flex-1" title={areaFisica.nome}>{areaFisica.nome}</h3>
                    {/* da 1280 px il chip non c'è: le versioni le mostra la fila subito sotto, e i suoi 74 px servono al nome (LAY3-1) */}
                    {areaFisica.numeroPlanimetrie > 1 && <span className="chip shrink-0 whitespace-nowrap testo-12 xl:hidden">{areaFisica.numeroPlanimetrie} versioni</span>}
                    {/* lotto B: le azioni dell'area («Modifica», «Planimetria», «Elimina», «Altro») stanno nel menu «Modifica ⋯» */}
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
                        {senzaPin && <PulsanteVisivo compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Passa" className="shrink-0" title={senzaPin.testo} aria-label={`Passa a «${senzaPin.nome}»`} onClick={() => scegliVersione(senzaPin.chiave)} />}
                      </div>
                    : <VersioniArea nome={areaFisica.nome} planimetrie={versioniArea} scelta={planimetriaScelta} onScegli={scegliVersione} />}
                </>}
                {/* la versione mostrata non ha pin, un'altra sì: lo si dice e si passa a quella in un tocco (come nella pagina dell'Area) */}
                {/* da 1024 px l'avviso sta nella riga delle versioni (sopra); sotto, la sua riga com'era */}
                {senzaPin && !collegamento && !largo && (
                  <p className="m-0 flex flex-wrap items-center gap-2 testo-13 text-text-secondary" role="status">
                    {senzaPin.testo}
                    <PulsanteVisivo compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo={<>Passa a «{senzaPin.nome}»</>} onClick={() => scegliVersione(senzaPin.chiave)} />
                  </p>
                )}
                {/* Collegando i pin di una voce (2026-10-18) la stessa mappa diventa quella di scelta: la barra sopra, tutti i pin
                    (i nascosti sbiaditi), un tocco collega o scollega; la planimetria può essere un'altra del Palazzo. */}
                {barraCollegamento}
                {/* Da 1280 px la mappa prende tutta l'altezza che la colonna le lascia, mai meno di 240 px di tela (2026-09-30, 2026-10-15). */}
                {mappaMostrata && (
                  <MappaIncorporata key={mappaMostrata} chiave={mappaMostrata} versione={versioneStati} classeVisore={classeVisoreMappa} onCambiato={() => void dati.ricarica()} scelta={sceltaPin}
                    spilloIniziale={collegamento ? null : spilloIndirizzo} puntoIniziale={collegamento ? null : puntoIndirizzo} titoloVisore={areaFisica?.nome}
                    // AP3-2: come nella pagina dell'Area (L2) niente «Su:» né planimetrie vicine (l'elenco delle aree è accanto), e i passaggi restano nella scheda
                    senzaVicine onNaviga={navigaDalVisore}
                    // L4 §8.6: togliendo un segno dal popup che riapre un Enigma risolto, prima la conferma
                    primaDiRiaprire={primaDiRiaprire}
                    // L4 §1.4 (regola 1): lo stato dei pin condivisi dalle voci di più infiltrazioni si legge nell'infiltrazione aperta; il popup
                    // ne sceglie un'altra (§4.2)
                    infiltrazione={area.chiave}
                    contenutiPannello={areaFisica && !collegamento ? <InfiltrazioniInArea area={areaFisica} aperta={area.chiave} completate={completate} onScegli={scegliInfiltrazioneQui} /> : undefined} />
                )}
                {/* un'infiltrazione che non tocca aree (o un Palazzo senza aree): niente da mostrare, si collegano (§4.2) */}
                {!mappaMostrata && !collegamento && (
                  <div className="flex flex-col items-start gap-2 rounded-md bg-white/[0.04] px-3 py-2 testo-12" role="status">
                    <p className="m-0 text-text-muted">{areaFisica ? `${areaFisica.nome} non ha ancora planimetrie: aggiungine una.` : 'Quest’infiltrazione non tocca ancora aree.'}</p>
                    {!IN_RILASCIO && !areaFisica && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="url" dimensione={20} />} titolo="Collega aree" onClick={() => setLegami(area.chiave)} />}
                  </div>
                )}
              </section>

              {/* ---- La colonna di quel che fa la percentuale: le planimetrie dell'area e la guida dell'infiltrazione ---- */}
              <aside className="card flex flex-col gap-3 xl:min-h-0 xl:area-scorrevole" aria-label={`Da raccogliere in ${areaFisica?.nome ?? area.nome}`}>
                <RaccoltaPlanimetrie planimetrie={mappeArea} partitaId={partitaId} onRaccolto={segnaRaccolto} vuoto={vuotoArea} indirizzo={indirizzoRaccolta} primaDiTogliere={(id) => primaDiTogliereIlPin(id)} />
                {/* Il resto del Palazzo, sempre ripiegato: con un'area aperta si vede quell'area (rilievo dell'utente, 2026-10-01). */}
                {altrePlanimetrie.length > 0 && (
                  <details className="testo-12">
                    <summary className="touch cursor-pointer text-text-muted">Tutte le planimetrie del Palazzo · {restanoAltre} da raccogliere</summary>
                    <div className="pt-2">
                      <RaccoltaPlanimetrie planimetrie={altrePlanimetrie} partitaId={partitaId} onRaccolto={segnaRaccolto} etichetta="Nel resto del Palazzo" indirizzo={indirizzoRaccolta} primaDiTogliere={(id) => primaDiTogliereIlPin(id)} />
                    </div>
                  </details>
                )}
                {!partitaId && <span className="testo-12 text-text-muted">Attiva una <Link to="/partita" className="text-primary-testo">partita</Link> per segnare quel che raccogli.</span>}
                {/* L4 (§4.3): i pin fatti con una voce non fatta, da prima dell'aggiornamento, coi due gesti che li sistemano */}
                {quanteDaVerificare > 0 && partitaId && (
                  <details ref={sezioneDaVerificare} id="da-verificare" className="testo-12">
                    <summary className="touch cursor-pointer font-semibold text-warning">Da verificare ({quanteDaVerificare})</summary>
                    <p className="m-0 pt-1 text-text-muted">{SPIEGAZIONE_DA_VERIFICARE} Tocca un pin per sistemarlo.</p>
                    <ul className="m-0 flex list-none flex-col gap-1 p-0 pt-1.5" aria-label="Pin da verificare">
                      {(divergenze.dati ?? []).map((x) => (
                        <li key={`${x.spilloUid}/${x.voce}`}>
                          <button type="button" className="touch flex w-full flex-col items-start rounded-md border border-warning/50 px-2 py-1 text-left"
                            onClick={() => setDaVerificare({ spilloUid: x.spilloUid, spilloNome: x.spilloNome, mappaNome: nomeSenzaPalazzo(x.mappaNome), voce: x.voce, voceNome: x.voceNome, infiltrazioneNome: x.infiltrazioneNome })}>
                            <span className="testo-13 font-semibold">{x.spilloNome}</span>
                            <span className="testo-12 text-text-muted">{x.voceNome} · {x.infiltrazioneNome}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                {/* AP3-1 (decisione del PM): le schede della guida senza mappa né voce (Kamoshida 1, 14, 15, 16; Madarame 28) non si
                    aprono più dal visore di Mappe, che per i Palazzi porta qui: si leggono in questa sezione, col loro testo e la loro
                    infiltrazione, e da L4 (§4.3) si sistemano con «Crea la voce» o «Collega a una voce» */}
                <SchedeDaSistemare schede={d.schedeDaSistemare ?? []} aree={d.aree} onSistemata={rileggiTutto} completato={!!d.completato} />

                {/* La guida dell'area: voci modificabili, spostabili e collegate ai pin delle planimetrie (2026-10-01). */}
                <GuidaDellArea key={area.chiave} area={area} planimetrie={d.planimetrie} partitaId={partitaId} mappaAperta={mappaScelta} areePalazzo={d.aree}
                  divergenze={divergenze.dati ?? undefined} onDaVerificare={setDaVerificare} onApriInfiltrazione={scegliInfiltrazione}
                  planimetriaMostrata={mappaScelta} catturate={catturate} onCattura={cattura}
                  cambiaStato={cambiaStato} onPuntoAggiornato={aggiornaPunto} onRicarica={async () => { await dati.ricarica(); setVersioneStati((v) => v + 1); }} onCollegamento={aggiornaCollegamento} />
              </aside>
            </div>

            {/* ---- Le finestre della gestione (§4.3): quelle di L2 col contenitore `dungeon`, i legami dell'infiltrazione, l'infiltrazione nuova ---- */}
            {/* L4 (§4.1): «Da verificare», dalla sezione della scheda, dalla voce della guida o dal pin; risolta, si rilegge tutto */}
            {conferma && (
              <Modal titolo={conferma.titolo} aperta onChiudi={() => chiudiConferma(false)}
                azioni={<>
                  <button type="button" className="btn btn-secondary touch" onClick={() => chiudiConferma(false)}>Annulla</button>
                  <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="raggiunto" dimensione={22} />} titolo={conferma.azione} onClick={() => chiudiConferma(true)} />
                </>}>
                {conferma.righe.map((r) => <p key={r} className="m-0 testo-14">{r}</p>)}
              </Modal>
            )}
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
            {!IN_RILASCIO && areaFisica && (
              <Modal titolo={`Eliminare ${areaFisica.nome}?`} aperta={finestra === 'elimina-area'} onChiudi={() => setFinestra(null)}
                azioni={<>
                  <button type="button" className="btn btn-secondary touch" onClick={() => setFinestra(null)}>Annulla</button>
                  <PulsanteVisivo tono="pericolo" icona={<IconaAzione chiave="elimina" dimensione={22} />} titolo="Elimina" disabled={occupato} onClick={() => void eliminaAreaFisica()} />
                </>}>
                <div className="flex flex-col gap-2 testo-14">
                  <p className="m-0">Si eliminano l’area, {areaFisica.numeroPlanimetrie === 1 ? 'la sua planimetria' : `le sue ${areaFisica.numeroPlanimetrie} planimetrie`}{areaFisica.numeroSpilli ? ` con ${areaFisica.numeroSpilli} pin` : ''} e {(areaFisica.infiltrazioni ?? []).length === 1 ? 'il legame con 1 infiltrazione' : `i legami con ${(areaFisica.infiltrazioni ?? []).length} infiltrazioni`}. Le voci della guida restano nelle loro infiltrazioni.</p>
                  <p className="m-0 text-text-secondary">{NEL_CESTINO}</p>
                </div>
              </Modal>
            )}
            {!IN_RILASCIO && legami && d.aree.find((a) => a.chiave === legami) && (
              <FinestraLegamiInfiltrazione infiltrazione={d.aree.find((a) => a.chiave === legami)!} aree={areePalazzo} partitaId={partitaId}
                onChiudi={() => setLegami(null)} onSalvata={rileggiTutto} />
            )}
            {/* di partenza subito dopo l'infiltrazione aperta, come proponeva la scheda della planimetria di prima; il modulo è la finestra (L13, O7-5) */}
            {!IN_RILASCIO && finestra === 'nuova-infiltrazione' && (
              <ModuloNuovaArea aree={infiltrazioniPalazzo} areePalazzo={areePalazzo.map((a) => ({ slug: a.slug, nome: a.nome }))} occupato={occupato} dopoIniziale={area.chiave}
                onCrea={nuovaInfiltrazione} onAnnulla={() => setFinestra(null)} />
            )}
          </div>}
        </div>
      )}
      {/* L1-13: un Palazzo (o un Memento) senza infiltrazioni non ha area da mostrare: lo dice, invece di una pagina bianca; nella preparazione
          un comando proprio aggiunge la prima infiltrazione (senza area il menu «Modifica ⋯» non c'è) */}
      {d && !area && (
        <div className="card flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <IndietroScheda ripiego="/guida/dungeon" />
            <TitoloScheda>{d.nome}</TitoloScheda>
          </div>
          <p className="m-0 testo-13 text-text-secondary" role="status">{memento ? 'Questo Memento non ha ancora aree nella guida.' : 'Questo Palazzo non ha ancora infiltrazioni nella guida.'}</p>
          {!IN_RILASCIO && !memento && (
            <span className="flex flex-wrap gap-2">
              <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi infiltrazione" onClick={() => setFinestra('nuova-infiltrazione')} />
            </span>
          )}
          {!IN_RILASCIO && !memento && finestra === 'nuova-infiltrazione' && (
            <ModuloNuovaArea aree={infiltrazioniPalazzo} areePalazzo={areePalazzo.map((a) => ({ slug: a.slug, nome: a.nome }))} occupato={occupato}
              onCrea={nuovaInfiltrazione} onAnnulla={() => setFinestra(null)} />
          )}
        </div>
      )}
    </PageState>
  );
}
