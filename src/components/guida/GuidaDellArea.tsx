// ============================================================
// GuidaDellArea — la guida di un'area del Palazzo, modificabile e collegata ai pin (richiesta dell'utente, 2026-10-01)
// ============================================================
//
// «Mi serve la possibilità di modificare proprio la guida così da poter modificare/aggiornare, aggiungere, rimuovere le
// voci della guida o correggerli agganciandoli ad elementi della mappa.» Ogni voce si corregge (nome, tipo, esauribile,
// descrizione), si sposta su e giù, si elimina; in fondo se ne aggiunge una. E si collega ai pin delle planimetrie del
// Palazzo **scegliendoli sulla mappa, dentro la voce stessa** («deve essere contestuale al punto dove si fa questa
// associazione»): «Collega pin» apre lì sotto la planimetria in modalità scelta, un tocco collega, un altro scollega.
// Una voce collegata ha lo stato dei suoi pin (lo dice il server); i punti non vengono riconciliati in automatico:
// «lascia i punti come sono... li sistemo io via via a mano». Per questo la riga dice «da collegare» quando la voce è di
// un tipo che un pin può rappresentare e non ne ha ancora.
// Dal 2026-10-14 («come faccio a spostare più voci del palazzo insieme?») la scelta: le voci dell'area diventano righe da spuntare
// e «Sposta in…» le manda insieme in fondo a un'altra area del Palazzo; dal 2026-10-18 («attiva anche la modalità copia») il comando
// è «Copia o sposta voci» e accanto c'è «Copia in…», che ne fa voci nuove coi passi e le schede (`TrasferisciVociInArea`).
// ============================================================

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { collegaPinAlPunto, creaPunto, eliminaPunto, aggiornaPunto as salvaPunto, spostaPunto } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { COLORE_TIPO, NOME_TIPO } from '../../utils/dungeon';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { puntoDaCollegare, puntoEnigma } from '../../../shared/spilli';
import { quanteSegnate, segnataInVista, voceDescrittiva } from '../../utils/vociDellaGuida';
import { nomeSenzaPalazzo } from '../../utils/gruppiPlanimetrie';
import type { AreaDungeonDto, DivergenzaDto, DungeonDettaglioDto, PuntoInteresseDto, StatoPunto } from '../../types';
import type { DivergenzaDaVerificare } from './FinestraDaVerificare';
import { CampoCorrezione, CorrezioneGuida } from './CorrezioneGuida';
import { DettagliPunto } from './DettagliPunto';
import { ContenutoDellaVoce } from '../catalogo/ContenutoDellaVoce';
import { EditorDettagli } from './EditorDettagli';
import { AFFINITA_DELLA_PERSONA, dettagliDaRighe, etichetteRipetute, righeDaDettagli, type RigaDettaglio } from '../../utils/dettagliVoce';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione, type ChiaveAzione } from '../shared/IconaAzione';
import { TrasferisciVociInArea } from './TrasferisciVociInArea';
import { PersoneDelPalazzo } from './PersoneDelPalazzo';
import { NEL_CESTINO } from '../../utils/cestino';
import { inCorso, testoAvanzamento } from '../../utils/gestiVoce';
import { raggruppaPassi } from '../../utils/passiEnigmi';
import { voceDaCatturare } from '../../utils/piastrelleCattura';
import { useConfermaRiapertura } from './ConfermaRiapertura';
import { CARATTERI, NOME_CARATTERE, carattereDaTipo, type CarattereVoce } from '../../../shared/caratteriVoce';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

const TIPI = Object.keys(NOME_TIPO) as PuntoInteresseDto['tipo'][];

/** Il nome di una planimetria senza il Palazzo, con la versione se il nome non la dice già («Museo 1P · Livello 1»: due versioni di
 *  un'area hanno lo stesso nome). */
const nomePlanimetria = (m: { nome: string; versioneEtichetta?: string | null }) => {
  const nome = nomeSenzaPalazzo(m.nome);
  return m.versioneEtichetta && !nome.includes(m.versioneEtichetta) ? `${nome} · ${m.versioneEtichetta}` : nome;
};

// L4 §4.1: il carattere della voce, accanto al tipo. Colori dai chip esistenti: Permanente col bordo dell'evidenza, Si ripropone tinto come i
// valori che vengono dalla guida, Racconto neutro (non conta)
const CLASSE_CARATTERE: Record<CarattereVoce, string> = { permanente: 'chip--toccata', rigenerabile: 'chip--dalla-guida', descrittiva: '' };
/** Cosa vuol dire il carattere, nella voce aperta. */
const SPIEGAZIONE_CARATTERE: Record<CarattereVoce, string> = {
  permanente: 'Permanente: si fa una volta per sempre.',
  rigenerabile: 'Si ripropone: il suo stato vale in quest’infiltrazione.',
  descrittiva: 'Racconto: si segna come letto e non conta nel completamento.',
};
/** L'icona del carattere: il lucchetto aperto per una permanente da fare, chiuso quando è fatta; il ciclo per chi si ripropone; il libro per il racconto. */
const iconaCarattere = (c: CarattereVoce, fatta: boolean): ChiaveAzione => (c === 'permanente' ? (fatta ? 'bloccato' : 'sbloccato') : c === 'rigenerabile' ? 'ricalcola' : 'libro');

/**
 * Il collegamento dei pin di una voce, aperto dalla guida e fatto sulla **mappa principale** della scheda del Palazzo (richiesta
 * dell'utente, 2026-10-18: «Scegliere dalla mappa principale e non dalla mappa in piccolo… Perchè sdoppiare la mappa?»). La guida
 * dice quale voce, quali pin ha e che cosa fare a un tocco; la pagina mette la sua mappa in modalità scelta, con la barra del
 * collegamento (planimetria, ricerca, «Fatto»).
 */
export interface CollegamentoPin {
  /** La chiave e il nome della voce. */
  voce: string;
  nome: string;
  /** Da dove parte la mappa: dove sta già un suo pin, altrimenti la planimetria aperta, la prima dell'area o del Palazzo. */
  mappaIniziale: string | null;
  /** Le planimetrie del Palazzo fra cui scegliere, prima quelle dell'area. */
  opzioniMappa: ReadonlyArray<{ chiave: string; nome: string; dettaglio?: string }>;
  /** I pin già collegati alla voce. */
  scelti: ReadonlySet<number>;
  /** Mentre si salva un tocco. */
  occupato: boolean;
  /** Un tocco su un pin: lo collega o, se lo è già, lo scollega. */
  onScegli: (spillo: { id: number; nome: string }) => void;
  /** «Fatto»: chiude il collegamento. */
  onFine: () => void;
}

interface Props {
  area: AreaDungeonDto;
  /** Le planimetrie del Palazzo: fra queste si sceglie quella su cui toccare i pin (prima quelle dell'area). */
  planimetrie: DungeonDettaglioDto['planimetrie'];
  partitaId: number | null;
  /** La planimetria che la pagina sta mostrando: se è dell'area, la scelta parte da lì. */
  mappaAperta: string | null;
  /** Salva lo stato della voce nella partita; vero se è andato a buon fine. */
  cambiaStato: (p: PuntoInteresseDto, stato: StatoPunto | null) => Promise<boolean>;
  /** Una voce cambiata dal server (collegamento, correzione): la pagina la sostituisce senza ricaricare. */
  onPuntoAggiornato: (p: PuntoInteresseDto) => void;
  /** Rilegge la scheda del Palazzo (ordine cambiato, voce aggiunta o tolta, stati uniti da un collegamento). */
  onRicarica: () => Promise<void>;
  /** Nei dedali dei Memento (099): l'area del dedalo di cui si mostrano le voci (`area.punti` le ha già filtrate) e le altre aree
   *  dello stesso dedalo, dove una voce si può spostare. Lì ogni voce ha uno stato, e i tipi sono Persona e Trama (2026-10-11). */
  areaDedalo?: { chiave: string; nome: string; altre: ReadonlyArray<{ chiave: string; nome: string }> };
  /** Nei Palazzi (2026-10-12): le aree del Palazzo, in ordine di guida, dove una voce si può spostare («Area del Palazzo»). Con le loro voci
   *  (L4 §4.1), per dire in quali altre infiltrazioni sta l'oggetto permanente di una voce. */
  areePalazzo?: ReadonlyArray<{ chiave: string; nome: string; ordine: number; punti?: ReadonlyArray<PuntoInteresseDto> }>;
  /** L4 §4.1: apre un'altra infiltrazione del Palazzo («Anche nella 4ª infiltrazione»). Senza, la riga si legge e basta. */
  onApriInfiltrazione?: (chiave: string) => void;
  /** L3 UX3-14 (RG-5): la planimetria mostrata nel visore della scheda. Con lei l'elenco ha solo le voci di quella planimetria, le altre
   *  stanno in «Nelle altre planimetrie»; senza (dedali, infiltrazione che non tocca aree), l'elenco di sempre. */
  planimetriaMostrata?: string | null;
  /** Il collegamento dei pin aperto o chiuso (null): la pagina lo fa sulla sua mappa (2026-10-18). Senza, «Collega pin» non c'è. */
  onCollegamento?: (c: CollegamentoPin | null) => void;
  /** L4 (§4.1): le divergenze «da verificare» del Palazzo nella partita e l'apertura della finestra che le sistema (la apre la pagina). */
  divergenze?: ReadonlyArray<DivergenzaDto>;
  onDaVerificare?: (d: DivergenzaDaVerificare) => void;
  /** L8 (R8-12, R8-29): nei Palazzi le voci Persona collegate a un'Ombra si catturano con la piastrella dei Memento, sopra l'elenco: le Persona registrate nel
   *  compendio della partita (id; null senza partita) e il gesto che registra o toglie. Senza `onCattura` restano righe dell'elenco. */
  catturate?: ReadonlySet<number> | null;
  onCattura?: (personaId: number, catturata: boolean, ombra?: string) => Promise<void>;
}

/**
 * La guida di un'area, a scomparsa (aperta all'inizio): conteggi di voci, segnate e «da collegare», filtri per tipo e
 * «Anche le segnate» (le voci con uno stato restano nascoste salvo quella aperta), l'elenco delle voci con i passi
 * degli Enigmi annidati sotto il loro Enigma, e in fondo «Aggiungi una voce». Ogni voce si apre con un tocco: stato
 * nella partita, pin collegati, spostamento, correzione o eliminazione e «Collega pin», che si fa sulla mappa della pagina
 * (`onCollegamento`): qui resta il conto dei pin collegati con «Fatto». Ogni modifica fa rileggere la scheda.
 */
export function GuidaDellArea({ area: areaIntera, planimetrie, partitaId, mappaAperta, cambiaStato, onPuntoAggiornato, onRicarica, areaDedalo, areePalazzo, onCollegamento, divergenze, onDaVerificare, onApriInfiltrazione, planimetriaMostrata = null, catturate = null, onCattura }: Props) {
  // L8 (R8-12, R8-29): le voci Persona di un Palazzo con la loro Persona e la loro Ombra non sono righe dell'elenco ma piastrelle di cattura (sopra);
  // il resto della guida lavora sulle altre voci, quindi conteggi, filtri e «segnate» non le contano (la cattura sta nel compendio)
  const daCatturare = useMemo(() => (!areaDedalo && onCattura ? areaIntera.punti.filter(voceDaCatturare) : []), [areaIntera.punti, areaDedalo, onCattura]);
  const area = useMemo(() => (daCatturare.length === 0 ? areaIntera : { ...areaIntera, punti: areaIntera.punti.filter((p) => !daCatturare.includes(p)) }), [areaIntera, daCatturare]);
  // Una voce descrittiva si legge e basta (`voceDescrittiva`, la regola del server condivisa con la guida del visore): nelle aree dei dedali
  // non ce ne sono (099, scelta dell'utente: «Tutti con stato»); un «Altro» «Permanente» o «Si ripropone» si segna come le altre (2026-10-31).
  /** Il nome di quel che la guida mostra: l'area del dedalo o l'area del Palazzo. */
  const nomeArea = areaDedalo?.nome ?? area.nome;
  /** I tipi che una voce può avere qui (2026-10-11): fuori dai dedali tutti tranne Trama, che è solo dei Memento (lo stesso
   *  controllo lo fa il server). Nei dedali qui c'è solo la Trama, «unico tipo», e il tipo non si sceglie: le Persona hanno la
   *  loro sezione in cima all'area (`PersoneDellArea`), con la Persona scelta dal compendio. */
  const tipiAmmessi: PuntoInteresseDto['tipo'][] = areaDedalo ? ['trama'] : TIPI.filter((t) => t !== 'trama');
  const [filtro, setFiltro] = useState<Set<PuntoInteresseDto['tipo']>>(new Set());
  /** I filtri per tipo si aprono a richiesta (2026-10-18, «Riga unica ripiegabile»): chiusi, sono una riga sola. */
  const [filtriAperti, setFiltriAperti] = useState(false);
  const [mostraGestiti, setMostraGestiti] = useState(false);
  const [selezionato, setSelezionato] = useState<string | null>(null);
  /** Il modulo della voce nuova: in fondo all'area, o in fondo ai passi di un Enigma (`contenitore`, 095). */
  // (UX3-14) `dove`: la planimetria dell'elenco in cui la si aggiunge, che la voce prende (null senza planimetria mostrata)
  const [nuovoPunto, setNuovoPunto] = useState<{ nome: string; tipo: PuntoInteresseDto['tipo']; contenitore: string | null; dove: string | null } | null>(null);
  // L4 §8.11 e §8.6: «Riapri» con la conferma quando si riapre anche altro («Riapre anche: …», «Riapre anche l'Enigma «…»»), la stessa della
  // guida del visore
  const riapertura = useConfermaRiapertura((v) => void cambiaStato(v, null));
  /** La voce a cui si stanno collegando i pin (sulla mappa della pagina). */
  const [collegando, setCollegando] = useState<{ punto: string } | null>(null);
  const [occupato, setOccupato] = useState(false);
  /** Le voci scelte per spostarle insieme in un'altra area del Palazzo (2026-10-14), legate all'area in cui si è aperta la scelta:
   *  cambiando area la scelta non vale più. `trasferimento`: la finestra dell'area d'arrivo è aperta, per copiare (2026-10-18) o
   *  per spostare. */
  const [scelta, setScelta] = useState<{ area: string; chiavi: Set<string> } | null>(null);
  const [trasferimento, setTrasferimento] = useState<'copia' | 'sposta' | null>(null);
  const scelte = scelta && scelta.area === area.chiave ? scelta.chiavi : null;
  /** Aggiunge o toglie voci dalla scelta. */
  const scegli = (chiavi: string[], dentro: boolean) => setScelta((s) => {
    const n = new Set(s && s.area === area.chiave ? s.chiavi : []);
    for (const c of chiavi) { if (dentro) n.add(c); else n.delete(c); }
    return { area: area.chiave, chiavi: n };
  });

  // I passi di ogni Enigma (095), nel loro ordine: stanno dentro l'Enigma, non nell'elenco dell'area (la regola della guida del visore,
  // `raggruppaPassi`: in cima le voci fuori da ogni Enigma)
  const { inCima: vociDellArea, passiPer } = useMemo(() => raggruppaPassi(area.punti), [area]);
  /** Una voce si vede se passa il filtro per tipo (nessun filtro = tutti) e se non è segnata, salvo con «Anche le segnate» o se è quella aperta. */
  const voceVisibile = (p: PuntoInteresseDto) => (filtro.size === 0 || filtro.has(p.tipo)) && segnataInVista(p, { anche: mostraGestiti, aperta: selezionato });
  // L3 UX3-14 (RG-5), regola dell'utente: «NIENTE PIN: Vale la planimetria dove è stata inserita la voce. Con almeno un PIN la voce si vede
  // nella planimetria di tutti i PIN». Con una planimetria mostrata ogni voce ha la sua posizione nell'elenco: quella mostrata se ci sta (un
  // suo pin è lì, o senza pin la sua planimetria effettiva, calcolata dal server con la stessa regola del visore: `planimetria`), altrimenti
  // la prima delle sue nell'ordine delle planimetrie del Palazzo, che la mette in «Nelle altre planimetrie». Una voce senza planimetria nota
  // resta nell'elenco. Gli Enigmi coi passi seguono i loro passi.
  const qui = planimetriaMostrata;
  /** La planimetria sotto cui sta una voce (non un Enigma coi passi); null senza planimetria mostrata. */
  const planimetriaDi = (x: PuntoInteresseDto): string | null => {
    if (!qui) return null;
    const sue = x.pin.length ? [...new Set(x.pin.map((y) => y.mappa))] : x.planimetria ? [x.planimetria.chiave] : [];
    if (sue.length === 0 || sue.includes(qui)) return qui;
    return planimetrie.find((m) => sue.includes(m.chiave))?.chiave ?? qui;
  };
  /** La voce sta sotto la planimetria `pl` (null = senza planimetria mostrata, tutte): un Enigma coi passi se ci sta un suo passo. */
  const sta = (x: PuntoInteresseDto, pl: string | null): boolean =>
    pl === null || (passiPer.has(x.chiave) ? passiPer.get(x.chiave)!.some((y) => planimetriaDi(y) === pl) : planimetriaDi(x) === pl);
  /** I passi di un Enigma che stanno sotto la planimetria `pl`. */
  const passiSu = (p: PuntoInteresseDto, pl: string | null) => (passiPer.get(p.chiave) ?? []).filter((x) => sta(x, pl));
  /** Una voce in elenco sotto `pl`: visibile lei, o un suo passo di lì (una nota descrittiva fra i passi non ha stato: senza filtri non basta a
   *  tenere in vista un Enigma segnato — rilievo del validatore). */
  const inVistaSu = (p: PuntoInteresseDto, pl: string | null) => voceVisibile(p) || passiSu(p, pl).some((x) => voceVisibile(x) && (filtro.size > 0 || !voceDescrittiva(x)));
  // in cima le voci fuori da ogni Enigma (`vociDellArea`, sopra); un Enigma si vede anche quando i filtri prendono solo qualche suo passo
  const puntiVisibili = vociDellArea.filter((p) => sta(p, qui) && inVistaSu(p, qui));
  // i conteggi dell'intestazione sono quelli della planimetria mostrata
  const puntiQui = area.punti.filter((p) => sta(p, qui));
  const gestitiArea = quanteSegnate(puntiQui);
  // «Anche le segnate» vale per tutti gli elenchi, anche quelli delle altre planimetrie
  const gestitiTutti = quanteSegnate(area.punti);
  /** Le altre planimetrie dell'infiltrazione con le loro voci, nell'ordine delle planimetrie del Palazzo. */
  const altrePlanimetrie = qui
    ? planimetrie.filter((m) => m.chiave !== qui).map((m) => ({ chiave: m.chiave, nome: nomePlanimetria(m), voci: vociDellArea.filter((p) => sta(p, m.chiave)) })).filter((g) => g.voci.length > 0)
    : [];
  const quanteAltrove = qui ? area.punti.filter((p) => !passiPer.has(p.chiave) && planimetriaDi(p) !== qui).length : 0;
  /** La voce aperta e l'elenco in cui la si è aperta (un Enigma coi passi su più planimetrie compare in più elenchi). */
  const [vistaAperta, setVistaAperta] = useState<string | null>(null);
  const apri = (chiave: string | null, pl: string | null) => { setSelezionato(chiave); setVistaAperta(pl); };
  /** Spostare più voci insieme (2026-10-14): nei Palazzi con più aree, se l'area ha voci; nei dedali no (lì si cambia l'area del dedalo). */
  // L12 (passo 8): nel rilascio (sola lettura) le voci della guida non si copiano, spostano, aggiungono, correggono né si collegano ai pin
  const spostaInsieme = !IN_RILASCIO && !areaDedalo && !!areePalazzo && areePalazzo.length > 1 && vociDellArea.length > 0;
  const tutteScelte = !!scelte && puntiVisibili.length > 0 && puntiVisibili.every((p) => scelte.has(p.chiave));
  // La voce da portare in vista dopo un «Ottenuto»/«Esaurito»: si scorre al primo disegno in cui c'è, già aperta, e poi basta.
  const daMostrare = useRef<string | null>(null);
  useEffect(() => {
    if (!daMostrare.current) return;
    const chiave = daMostrare.current;
    const voce = [...document.querySelectorAll<HTMLElement>('[data-voce]')].find((e) => e.dataset.voce === chiave);
    if (!voce) return;
    daMostrare.current = null;
    voce.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  });
  /**
   * «Ottenuto» o «Esaurito» (richiesta dell'utente, 2026-10-04: «quando clicco su Ottenuto deve chiudersi l'elemento corrente e
   * nascondersi, andando all'elemento successivo»; anche Esaurito, scelta sua). Salvato lo stato, la voce si chiude — e, segnata,
   * esce dall'elenco salvo «Anche le segnate» — e si apre la voce successiva da segnare: la prima dopo di lei nell'ordine
   * dell'elenco (le voci e, dentro un Enigma, i suoi passi), che passa i filtri, non è segnata e non è descrittiva. I passi
   * dell'Enigma che si sta segnando si saltano: segnandolo si segnano anche loro. Senza una voce successiva non si apre niente;
   * se il salvataggio non riesce la voce resta aperta.
   */
  const segnaEPassaOltre = async (p: PuntoInteresseDto, stato: StatoPunto, pl: string | null) => {
    // (UX3-14) la successiva nello stesso elenco: quello della planimetria in cui si sta segnando
    const ordine = vociDellArea.filter((v) => sta(v, pl)).flatMap((v) => [v, ...passiSu(v, pl)]);
    const dopo = ordine.slice(ordine.indexOf(p) + 1);
    const successiva = dopo.find((q) => !q.stato && !voceDescrittiva(q) && q.contenitore !== p.chiave && (filtro.size === 0 || filtro.has(q.tipo))) ?? null;
    if (!(await cambiaStato(p, stato))) return;
    setCollegando(null);
    apri(successiva?.chiave ?? null, pl);
    daMostrare.current = successiva?.chiave ?? null;
  };
  // un Enigma coi suoi passi non ha pin suoi (stanno sui passi): non è «da collegare»
  const daCollegare = puntiQui.filter((p) => puntoDaCollegare(p.tipo) && p.pin.length === 0 && !passiPer.has(p.chiave)).length;
  // gli Enigmi dell'area che possono accogliere passi (non sono a loro volta passi)
  const enigmi = vociDellArea.filter((p) => puntoEnigma(p.tipo));
  // le planimetrie dell'area prima, poi il resto del Palazzo
  const opzioniMappa = useMemo(() => {
    const dellArea = new Set(area.mappe.map((m) => m.chiave));
    return [...planimetrie].sort((a, b) => Number(dellArea.has(b.chiave)) - Number(dellArea.has(a.chiave)))
      .map((p) => ({ chiave: p.chiave, nome: nomePlanimetria(p), dettaglio: dellArea.has(p.chiave) ? 'di quest’infiltrazione' : undefined }));
  }, [planimetrie, area.mappe]);
  /** La planimetria da cui parte la scelta dei pin di una voce. */
  const mappaIniziale = (p: PuntoInteresseDto): string | null => {
    const dellArea = area.mappe.map((m) => m.chiave);
    // dove sta già un suo pin, altrimenti la planimetria aperta (se è dell'area), altrimenti la prima dell'area o del Palazzo
    return p.pin[0]?.mappa ?? (mappaAperta && dellArea.includes(mappaAperta) ? mappaAperta : dellArea[0] ?? planimetrie[0]?.chiave ?? null);
  };

  /** Sposta la voce di un posto (su o giù) fra le sue sorelle e rilegge la scheda; l'errore va in notifica. */
  const sposta = async (p: PuntoInteresseDto, verso: -1 | 1) => {
    setOccupato(true);
    try { await spostaPunto(p.chiave, verso); await onRicarica(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Spostamento non riuscito.'); }
    finally { setOccupato(false); }
  };
  /** Collega il pin alla voce o, se è già collegato, lo scollega; poi rilegge la scheda e notifica. */
  const scegliPin: (p: PuntoInteresseDto, spilloId: number, nome: string) => Promise<void> = IN_RILASCIO ? async () => undefined : async (p, spilloId, nome) => {
    const collegato = p.pin.some((x) => x.id === spilloId);
    setOccupato(true);
    try {
      // La risposta dice i pin della voce ma non lo stato nella partita, che il collegamento può cambiare (gli stati si
      // uniscono): si rilegge la scheda con la partita, e con lei voce, raccolta, anello e visore (rilievo della revisione).
      await collegaPinAlPunto(p.chiave, spilloId, !collegato);
      await onRicarica();
      notifica('success', collegato ? `«${nome}» scollegato da «${p.nome}».` : `«${nome}» collegato a «${p.nome}».`);
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Collegamento non riuscito.'); }
    finally { setOccupato(false); }
  };
  /** Chiude la scelta dei pin e rilegge la scheda. */
  const fineCollegamento = async () => { setCollegando(null); await onRicarica(); };

  // Il collegamento va alla pagina, che lo fa sulla sua mappa: a ogni cambio della voce, dei suoi pin o del salvataggio in corso.
  // I gesti leggono la voce dell'ultimo render (un tocco dopo l'altro vede i pin aggiornati); chiudendo la guida (altra area) il
  // collegamento si chiude con lei.
  const voceCollegata = collegando ? area.punti.find((x) => x.chiave === collegando.punto) ?? null : null;
  const ultimaVoce = useRef(voceCollegata);
  const gesti = useRef({ scegliPin, fineCollegamento });
  useEffect(() => { ultimaVoce.current = voceCollegata; gesti.current = { scegliPin, fineCollegamento }; });
  const pinCollegati = voceCollegata?.pin.map((x) => x.id).join(',') ?? '';
  const comunica = useRef(onCollegamento);
  useEffect(() => { comunica.current = onCollegamento; });
  useEffect(() => {
    const p = ultimaVoce.current;
    if (!comunica.current) return;
    if (!p) { comunica.current(null); return; }
    comunica.current({
      voce: p.chiave, nome: p.nome, mappaIniziale: mappaIniziale(p), opzioniMappa, scelti: new Set(p.pin.map((x) => x.id)), occupato,
      onScegli: (s) => { const v = ultimaVoce.current; if (v) void gesti.current.scegliPin(v, s.id, s.nome); },
      onFine: () => void gesti.current.fineCollegamento(),
    });
    // la planimetria iniziale e l'elenco delle planimetrie si leggono all'apertura: cambiano solo con la voce
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voceCollegata?.chiave, voceCollegata?.nome, pinCollegati, occupato]);
  useEffect(() => () => comunica.current?.(null), []);

  /** Il modulo della voce nuova: in fondo all'area o, con `contenitore`, in fondo ai passi di un Enigma (095). Con una planimetria (UX3-14)
   *  la voce prende quella dell'elenco in cui la si aggiunge, così compare dove la si è aggiunta (anche un passo: senza pin starebbe sulla
   *  planimetria 1). */
  const moduloNuovaVoce = (n: { nome: string; tipo: PuntoInteresseDto['tipo']; contenitore: string | null; dove: string | null }) => (
    <form className="flex flex-wrap items-end gap-2 rounded-md bg-white/[0.04] px-2 py-2"
      onSubmit={(e) => { e.preventDefault(); const nome = n.nome.trim(); if (!nome) return; void creaPunto(area.chiave, { nome, tipo: n.tipo, ...(n.contenitore ? { contenitore: n.contenitore } : areaDedalo ? { areaDedalo: areaDedalo.chiave } : {}), ...(n.dove && !areaDedalo ? { planimetria: n.dove } : {}) }).then(async (nuovo) => { setNuovoPunto(null); await onRicarica(); apri(nuovo.chiave, n.dove); notifica('success', n.contenitore ? `Passo «${nome}» aggiunto all’Enigma.` : `Voce «${nome}» aggiunta a ${nomeArea}.`); }).catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Voce non aggiunta.')); }}>
      <CampoCorrezione etichetta={n.contenitore ? 'Nuovo passo' : areaDedalo ? 'Nuova voce di Trama' : 'Nuova voce'} valore={n.nome} massimo={LIMITI_GUIDA.punto.nome} onCambia={(v) => setNuovoPunto({ ...n, nome: v })} />
      {/* con un tipo solo (Trama, nei dedali) non c'è niente da scegliere */}
      {tipiAmmessi.length > 1 && <span className="min-w-[150px]">
        <Selettore etichetta="Tipo" valore={n.tipo} opzioni={tipiAmmessi.map((t) => ({ chiave: t, nome: NOME_TIPO[t] }))} onCambia={(v) => setNuovoPunto({ ...n, tipo: v as PuntoInteresseDto['tipo'] })} />
      </span>}
      <div className="flex gap-1.5">
        <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Aggiungi" disabled={!n.nome.trim()} />
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={() => setNuovoPunto(null)} />
      </div>
    </form>
  );

  /** Una voce della guida, fra le sue `fratelli` (le voci dell'area, o i passi dello stesso Enigma): riga, scheda aperta e, per un
   *  Enigma, i suoi passi dentro di lui (095). */
  const riga = (p: PuntoInteresseDto, fratelli: PuntoInteresseDto[], pl: string | null = qui) => {
    const indice = fratelli.indexOf(p);
    // (UX3-14) aperta solo nell'elenco in cui la si è aperta: un Enigma coi passi su più planimetrie compare in più elenchi
    const aperto = p.chiave === selezionato && (vistaAperta === pl || !qui);
    const scelta = collegando?.punto === p.chiave ? collegando : null;
    const passi = passiPer.get(p.chiave) ?? [];
    const conPassi = passi.length > 0;
    // l'Enigma è risolto quando i passi che si segnano sono fatti: qui quanti
    const passiDaSegnare = passi.filter((x) => !voceDescrittiva(x));
    const passiFatti = passiDaSegnare.filter((x) => x.stato).length;
    const puoAccogliere = puntoEnigma(p.tipo) && !p.contenitore;
    // gli Enigmi di cui la voce può diventare un passo (non sé stessa; un Enigma coi suoi passi non entra in un altro; un Enigma con
    // pin non accoglie passi, come dice il server)
    const enigmiPossibili = conPassi ? [] : enigmi.filter((e) => e.chiave !== p.chiave && (e.pin.length === 0 || e.chiave === p.contenitore));
    // L4 §4.1: un Racconto (descrittiva con stato, cioè una Storia) si segna come «Letto» e non conta; la riga dice «letto»
    const racconto = p.carattere === 'descrittiva' && !voceDescrittiva(p);
    // «esaurito» non sta nel testo: ha il suo chip (§4.1, R4-34)
    const statoTesto = p.stato && p.stato !== 'esaurito' ? (racconto ? 'letto' : p.stato) : null;
    // il carattere scelto a mano nella «Modifica» ('' = vale la regola)
    const carattereScelto = p.carattereScelto && p.carattere ? p.carattere : '';
    // L3 RG-4: la planimetria si sceglie a mano per una voce di Palazzo senza pin (con i pin sta dove stanno i pin); non per un Enigma coi
    // passi, che segue i passi (il server lo rifiuta: `enigma-segue-i-passi`). '' = nessun aggancio, vale la planimetria 1
    const planimetriaSceglibile =!areaDedalo && p.planimetria !== undefined && p.pin.length === 0 && !conPassi;
    const planimetriaAMano = p.planimetria?.aMano ? p.planimetria.chiave : '';
    // L4 §4.1: le altre infiltrazioni in cui sta l'oggetto permanente della voce (nell'ordine della guida)
    const ancheIn = p.oggetto ? [...(areePalazzo ?? [])].filter((a) => a.chiave !== area.chiave && a.punti?.some((x) => x.oggetto === p.oggetto)).sort((x, y) => x.ordine - y.ordine) : [];
    return (
      <li key={p.chiave} data-voce={p.chiave} className={`flex flex-col gap-1 rounded-md px-1 py-2 testo-13 ${aperto ? 'bg-primary-bg' : ''}`}>
        {/* segnata e chiusa, la riga si attenua: «esaurito» più di «ottenuto» (§4.1, R4-34: si distinguono a colpo d'occhio) */}
        <button type="button" className={`touch flex items-start gap-2 text-left ${p.stato && !aperto ? (p.stato === 'esaurito' ? 'opacity-40' : 'opacity-60') : ''}`} onClick={() => { apri(aperto ? null : p.chiave, pl); if (aperto) setCollegando(null); }} aria-expanded={aperto}>
          <span className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: COLORE_TIPO[p.tipo] }} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="font-semibold">{p.nome}</span>
            <span className="testo-12 text-text-muted"> · {NOME_TIPO[p.tipo]}{p.esauribile ? ' · esauribile' : ''}{statoTesto ? ` · ${statoTesto}` : ''}{passiDaSegnare.length > 0 ? ` · ${passiFatti}/${passiDaSegnare.length} passi` : ''}</span>
            {/* L4 §4.1: il carattere accanto al tipo (assente per le voci dei dedali e per le Persona); nel testo, così va a capo con lui */}
            {p.carattere && <span className={`chip chip--icona ml-1.5 align-middle testo-12 ${CLASSE_CARATTERE[p.carattere]}`} title={SPIEGAZIONE_CARATTERE[p.carattere]}>
              <IconaAzione chiave={iconaCarattere(p.carattere, !!p.stato)} dimensione={14} />{NOME_CARATTERE[p.carattere]}
            </span>}
            {p.stato === 'esaurito' && <span className="chip chip--icona chip--bloccata ml-1.5 align-middle testo-12"><IconaAzione chiave="esaurito" dimensione={14} />Esaurito</span>}
          </span>
          {/* L4 (§4.1): un suo pin risulta fatto ma la voce no (da prima dell'aggiornamento); si sistema dalla voce aperta */}
          {p.daVerificare && <span className="chip chip--oro shrink-0 testo-12">Da verificare</span>}
          {/* L4 §8.11: ogni pin tiene il suo stato e la voce lo calcola dai suoi pin; con più pin il contatore («In corso · 2/8») */}
          {testoAvanzamento(p.avanzamento) && <span className={`chip shrink-0 testo-12 ${inCorso(p.avanzamento) ? 'chip--attivo' : ''}`}>{testoAvanzamento(p.avanzamento)}</span>}
          {p.pin.length > 0
            ? <span className="chip chip--icona shrink-0 testo-12" title={p.pin.map((x) => `${x.nome} (${nomeSenzaPalazzo(x.mappaNome)})`).join(', ')}><IconaAzione chiave="posizione" dimensione={14} />{p.pin.length === 1 ? '1 pin' : `${p.pin.length} pin`}</span>
            : puntoDaCollegare(p.tipo) && !conPassi && <span className="chip shrink-0 testo-12 text-text-muted">da collegare</span>}
        </button>
        {/* L4 §4.1: l'oggetto permanente sta anche in altre infiltrazioni (fatto in una, è fatto in tutte): sotto la riga, un tocco la apre */}
        {/* una riga sola anche con più infiltrazioni («Anche nella 2ª e 4ª infiltrazione»): ogni ordinale è un bersaglio da 44 px col nome intero */}
        {ancheIn.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 pl-5 testo-12 text-text-muted">
            <span>Anche nella</span>
            {ancheIn.map((a, i) => (
              <Fragment key={a.chiave}>
                {i > 0 && (i === ancheIn.length - 1 ? <span>e</span> : <span className="-ml-1">,</span>)}
                {onApriInfiltrazione
                  ? <button type="button" className="chip touch min-w-11 justify-center testo-12 text-primary-testo" aria-label={`Anche nella ${a.ordine + 1}ª infiltrazione`} title={a.nome} onClick={() => onApriInfiltrazione(a.chiave)}>{a.ordine + 1}ª</button>
                  : <span title={a.nome}>{a.ordine + 1}ª</span>}
              </Fragment>
            ))}
            <span>infiltrazione</span>
          </div>
        )}
        {aperto && (
          <div className="flex flex-col gap-1.5 pl-5">
            {p.descrizione && <p className="m-0 whitespace-pre-wrap text-text-secondary">{p.descrizione}</p>}
            <DettagliPunto d={p.dettagli} contenuto={p.contenuto} senzaAffinita={p.tipo === 'persona' && !!p.persona} />
            <ContenutoDellaVoce key={p.chiave} voce={p.chiave} contenuto={p.contenuto ?? []} onCambiato={onRicarica} disabilitato={occupato} />
            {p.carattere && <p className="m-0 testo-12 text-text-muted">{SPIEGAZIONE_CARATTERE[p.carattere]}</p>}
            {conPassi && <p className="m-0 testo-12 text-text-muted">Risolto quando i suoi passi sono fatti: segnarlo li segna tutti, riaprirlo li riapre. I pin stanno sui passi.</p>}
            {p.daVerificare && partitaId && (() => {
              const div = divergenze?.find((x) => x.voce === p.chiave);
              return <div className="flex flex-wrap items-center gap-2 rounded-md border border-warning/50 px-2 py-1 testo-12">
                <span className="min-w-0 flex-1">Il pin {div ? `«${div.spilloNome}» ` : ''}risulta fatto ma la voce no: era così prima dell’aggiornamento.</span>
                {onDaVerificare && <PulsanteVisivo compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Sistema…" disabled={!div} onClick={() => div && onDaVerificare({ spilloUid: div.spilloUid, spilloNome: div.spilloNome, mappaNome: nomeSenzaPalazzo(div.mappaNome), voce: div.voce, voceNome: div.voceNome, infiltrazioneNome: div.infiltrazioneNome })} />}
              </div>;
            })()}
            {p.pin.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label={`Pin collegati a ${p.nome}`}>
                {p.pin.map((x) => (
                  <li key={x.id} className="flex items-center gap-2 testo-12">
                    <IconaAzione chiave="posizione" dimensione={16} />
                    <span className="min-w-0 flex-1">{x.nome} <span className="text-text-muted">· {nomeSenzaPalazzo(x.mappaNome)}</span></span>
                    {!IN_RILASCIO && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={18} />} titolo="Scollega" aria-label={`Scollega ${x.nome} da ${p.nome}`} disabled={occupato} onClick={() => void scegliPin(p, x.id, x.nome)} />}
                  </li>
                ))}
              </ul>
            )}
            {/* una voce descrittiva (solo «Altro») si legge e basta: niente stato, niente pin (scelta dell'utente) */}
            {voceDescrittiva(p)
              ? <p className="m-0 testo-12 text-text-muted">Voce descrittiva: si legge, non si segna e non ha pin.</p>
              : <div className="flex flex-wrap items-center gap-1.5">
                {partitaId && p.stato !== 'ottenuto' && <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="raggiunto" dimensione={20} />} titolo={racconto ? 'Letto' : 'Ottenuto'} onClick={() => void segnaEPassaOltre(p, 'ottenuto', pl)} />}
                {partitaId && p.esauribile && p.stato !== 'esaurito' && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="esaurito" dimensione={20} />} titolo="Esaurito" onClick={() => void segnaEPassaOltre(p, 'esaurito', pl)} />}
                {/* L4 §8.11: «Riapri» toglie il segno a tutti i suoi pin; se altre voci li condividono si riaprono anche loro, e prima lo si dice.
                    §8.6: se la voce è un passo di un Enigma risolto, l'Enigma si riapre: anche questo si dice prima */}
                {partitaId && p.stato && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Riapri"
                  onClick={() => riapertura.chiedi(p, areePalazzo, area.punti)} />}
              </div>}
            {!IN_RILASCIO && <div className="flex flex-wrap items-center gap-1.5">
              {/* nei dedali niente pin da collegare: i piani si generano a caso (2026-10-11) */}
              {/* i pin si scelgono sulla mappa della pagina (2026-10-18), anche in un'area senza planimetria propria: la pagina mostra quella
                  del collegamento, scelta fra le planimetrie del Palazzo */}
              {!areaDedalo && onCollegamento && !voceDescrittiva(p) && !conPassi && <PulsanteVisivo tono={scelta ? 'primario' : 'secondario'} compatto icona={<IconaAzione chiave="posizione" dimensione={20} />} titolo={scelta ? 'Fatto' : 'Collega pin'}
                aria-pressed={!!scelta} disabled={planimetrie.length === 0}
                onClick={() => (scelta ? void fineCollegamento() : setCollegando({ punto: p.chiave }))} />}
              {puoAccogliere && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi un passo" aria-label={`Aggiungi un passo a ${p.nome}`}
                disabled={p.pin.length > 0} title={p.pin.length > 0 ? 'Scollega prima i pin dell’Enigma: i pin stanno sui passi' : undefined}
                onClick={() => setNuovoPunto({ nome: '', tipo: 'meccanismo', contenitore: p.chiave, dove: pl })} />}
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="su" dimensione={20} />} titolo="Su" aria-label={`Sposta su: ${p.nome}`} disabled={occupato || indice <= 0} onClick={() => void sposta(p, -1)} />
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="giu" dimensione={20} />} titolo="Giù" aria-label={`Sposta giù: ${p.nome}`} disabled={occupato || indice >= fratelli.length - 1} onClick={() => void sposta(p, 1)} />
              <CorrezioneGuida key={p.chiave} cosa={`la voce «${p.nome}»`} compatto etichetta="Modifica"
                iniziale={() => ({ nome: p.nome, descrizione: p.descrizione, tipo: p.tipo as string, esauribile: p.esauribile ? 'sì' : 'no', contenitore: p.contenitore ?? '', areaDedalo: p.areaDedalo ?? '', area: area.chiave, dettagli: JSON.stringify(righeDaDettagli(p.dettagli)), carattere: carattereScelto, planimetria: planimetriaAMano })}
                onSalva={async (b) => {
                  // un'altra area del Palazzo (2026-10-12): solo per una voce fuori da ogni Enigma, come l'area del dedalo
                  const altrove = !!areePalazzo && !b.contenitore && b.area !== area.chiave ? areePalazzo.find((a) => a.chiave === b.area) ?? null : null;
                  // due dettagli con la stessa etichetta: uno cancellerebbe l'altro, il modulo resta aperto
                  const ripetute = etichetteRipetute(JSON.parse(b.dettagli) as RigaDettaglio[]);
                  if (ripetute.length > 0) throw new Error(`Due dettagli con la stessa etichetta (${ripetute.join(', ')}): cambiane una.`);
                  onPuntoAggiornato(await salvaPunto(p.chiave, { nome: b.nome, descrizione: b.descrizione, tipo: b.tipo as PuntoInteresseDto['tipo'], esauribile: b.esauribile === 'sì', ...(b.contenitore !== (p.contenitore ?? '') ? { contenitore: b.contenitore || null } : {}),
                  // un'altra area del dedalo (099): solo per una voce fuori da ogni Enigma (un passo sta nell'area del suo Enigma)
                  ...(areaDedalo && !b.contenitore && b.areaDedalo && b.areaDedalo !== (p.areaDedalo ?? '') ? { areaDedalo: b.areaDedalo } : {}),
                  ...(altrove ? { area: altrove.chiave } : {}),
                  // L4 §4.1: il carattere solo se cambiato; vuoto = «Ripristina» (null: vale la regola del tipo)
                  ...(b.carattere !== carattereScelto ? { carattere: (b.carattere || null) as CarattereVoce | null } : {}),
                  // L3 RG-4: l'aggancio a mano solo se cambiato; vuoto = «nessuna» (null: torna la planimetria 1)
                  ...(planimetriaSceglibile && b.planimetria !== planimetriaAMano ? { planimetria: b.planimetria || null } : {}),
                  // i dettagli (2026-10-18) solo se cambiati: tutti insieme, la maschera di una Persona la tiene il server
                  ...(b.dettagli !== JSON.stringify(righeDaDettagli(p.dettagli)) ? { dettagli: dettagliDaRighe(JSON.parse(b.dettagli)) } : {}) }));
                  if (altrove) { setSelezionato(null); notifica('success', `«${b.nome.trim() || p.nome}» spostata in ${altrove.ordine + 1}. ${altrove.nome}${conPassi ? ', con i suoi passi' : ''}.`); }
                  await onRicarica(); }}
                elimina={{ avviso: `${conPassi ? 'Se ne va dalla guida per tutte le partite, con quel che ne avevano segnato. I suoi passi restano, voci dell’infiltrazione con il loro stato.' : 'Se ne va dalla guida per tutte le partite, con quel che ne avevano segnato. I pin collegati restano sulla mappa, col loro «raccolto».'} ${NEL_CESTINO}`, onElimina: async () => { await eliminaPunto(p.chiave); setSelezionato(null); setCollegando(null); await onRicarica(); } }}>
                {(b, cambia) => <>
                  <CampoCorrezione etichetta="Nome" valore={b.nome} massimo={LIMITI_GUIDA.punto.nome} onCambia={(v) => cambia({ nome: v })} />
                  {tipiAmmessi.length > 1 && <span className="min-w-[150px]">
                    {/* un Enigma coi suoi passi resta un Enigma: il server lo rifiuta, qui non lo si offre */}
                    <Selettore etichetta="Tipo" valore={b.tipo} opzioni={(conPassi ? tipiAmmessi.filter(puntoEnigma) : tipiAmmessi).map((t) => ({ chiave: t, nome: NOME_TIPO[t] }))} onCambia={(v) => cambia({ tipo: v })} />
                  </span>}
                  {(enigmiPossibili.length > 0 || p.contenitore) && <span className="min-w-[180px]">
                    <Selettore etichetta="Passo di" valore={b.contenitore} opzioni={[{ chiave: '', nome: '— nessun Enigma (voce dell’infiltrazione) —' }, ...enigmiPossibili.map((e) => ({ chiave: e.chiave, nome: e.nome }))]} onCambia={(v) => cambia({ contenitore: v })} />
                  </span>}
                  {/* l'area del dedalo (099): una voce fuori da ogni Enigma passa in un'altra area dello stesso dedalo, coi passi se è un Enigma */}
                  {areaDedalo && areaDedalo.altre.length > 0 && !b.contenitore && <span className="min-w-[180px]">
                    <Selettore etichetta="Area del dedalo" valore={b.areaDedalo} opzioni={[{ chiave: areaDedalo.chiave, nome: areaDedalo.nome, dettaglio: 'questa' }, ...areaDedalo.altre.map((a) => ({ chiave: a.chiave, nome: a.nome }))]} onCambia={(v) => cambia({ areaDedalo: v })} />
                  </span>}
                  {/* l'area del Palazzo (2026-10-12): una voce fuori da ogni Enigma passa in fondo a un'altra area, coi passi se è un Enigma */}
                  {areePalazzo && areePalazzo.length > 1 && !b.contenitore && <span className="min-w-[200px]">
                    <Selettore etichetta="Infiltrazione" valore={b.area} opzioni={[...areePalazzo].sort((x, y) => x.ordine - y.ordine).map((a) => ({ chiave: a.chiave, nome: `${a.ordine + 1}. ${a.nome}`, dettaglio: a.chiave === area.chiave ? 'questa' : undefined }))} onCambia={(v) => cambia({ area: v })} />
                  </span>}
                  {/* L3 RG-4: la planimetria di una voce senza pin («dammi la possibilità di spostarli a mano in altre planimetrie»): prima quelle
                      dell'infiltrazione, poi le altre del Palazzo; «nessuna» torna alla planimetria 1 dell'infiltrazione */}
                  {planimetriaSceglibile && planimetrie.length > 0 && <span className="min-w-[200px]">
                    <Selettore etichetta="Planimetria" valore={b.planimetria} vuoto="— nessuna: la planimetria 1 dell’infiltrazione —" opzioni={opzioniMappa} onCambia={(v) => cambia({ planimetria: v })} />
                  </span>}
                  {/* L4 §4.1: il carattere (solo nei Palazzi, non per le Persona): la regola del tipo, o la scelta con «Ripristina» */}
                  {p.carattere !== undefined && carattereDaTipo(b.tipo, p.areaDedalo) && (() => {
                    const regola = carattereDaTipo(b.tipo, p.areaDedalo)!;
                    return <span className="flex min-w-[220px] flex-wrap items-end gap-1.5">
                      <span className="min-w-[160px] flex-1">
                        <Selettore etichetta="Carattere" valore={b.carattere || regola} opzioni={CARATTERI.map((c) => ({ chiave: c, nome: NOME_CARATTERE[c], dettaglio: c === regola ? 'regola' : undefined }))} onCambia={(v) => cambia({ carattere: v })} />
                      </span>
                      {b.carattere
                        ? <PulsanteVisivo compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Ripristina" onClick={() => cambia({ carattere: '' })} />
                        : <span className="pb-3 testo-12 text-text-muted">Dalla regola del tipo.</span>}
                    </span>;
                  })()}
                  <label className="touch flex items-center gap-1.5 testo-12">
                    <input type="checkbox" className="h-5 w-5" checked={b.esauribile === 'sì'} onChange={(e) => cambia({ esauribile: e.target.checked ? 'sì' : 'no' })} />Esauribile
                  </label>
                  <CampoCorrezione etichetta="Descrizione" valore={b.descrizione} multilinea massimo={LIMITI_GUIDA.punto.descrizione} onCambia={(v) => cambia({ descrizione: v })} />
                  {/* i dettagli della guida («ci sono elementi non modificabili come questo Contenuto», 2026-10-18) */}
                  {/* per una voce Persona collegata alla Persona del compendio le affinità (deboleA, resisteA, debolezze, resistenze) non si correggono qui:
                      nessuna vista legge più questa copia, e si correggono soltanto dalla matita della scheda Persona */}
                  <EditorDettagli valore={b.dettagli} onCambia={(v) => cambia({ dettagli: v })} nascosti={p.tipo === 'persona' && !!p.persona ? AFFINITA_DELLA_PERSONA : []} />
                </>}
              </CorrezioneGuida>
            </div>}
            {scelta && (
              <p className="scelta-pin m-0 testo-12" role="status" aria-label={`Scelta dei pin per ${p.nome}`}>
                Tocca i pin sulla mappa del Palazzo per collegarli o scollegarli; quelli grigi sono già raccolti o non ancora disponibili · <strong>{p.pin.length === 1 ? '1 collegato' : `${p.pin.length} collegati`}</strong>
              </p>
            )}
          </div>
        )}
        {/* i passi dell'Enigma, dentro di lui: ognuno è una voce vera, coi suoi pin e il suo stato */}
        {puoAccogliere && (conPassi || (nuovoPunto?.contenitore === p.chiave && nuovoPunto.dove === pl)) && (
          <div className="ml-5 mt-1 flex flex-col gap-1 border-l-2 border-border-light pl-2">
            <p className="m-0 testo-12 text-text-muted">Passi dell’Enigma</p>
            <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0" aria-label={`Passi di ${p.nome}`}>
              {/* (UX3-14) i passi di quest'elenco: quelli della sua planimetria */}
              {passi.filter((x) => sta(x, pl) && voceVisibile(x)).map((x) => riga(x, passi, pl))}
            </ul>
            {!IN_RILASCIO && nuovoPunto?.contenitore === p.chiave && nuovoPunto.dove === pl && moduloNuovaVoce(nuovoPunto)}
          </div>
        )}
      </li>
    );
  };

  return (
    <>
    {daCatturare.length > 0 && onCattura && <PersoneDelPalazzo persone={daCatturare} nomeArea={nomeArea} partitaId={partitaId} catturate={catturate} onCattura={onCattura} />}
    <details className="testo-12" open aria-label={`Guida di ${nomeArea}`}>
      <summary className="touch cursor-pointer text-text-muted">
        {/* (UX3-14) con voci su altre planimetrie, i conti sono quelli della planimetria mostrata, e lo si dice */}
        {areaDedalo ? 'Trama' : 'Guida dell’infiltrazione'} · {puntiQui.length === 1 ? '1 voce' : `${puntiQui.length} voci`}{quanteAltrove > 0 ? ' su questa planimetria' : ''}{gestitiArea > 0 ? ` (${gestitiArea} segnate)` : ''}{daCollegare > 0 ? ` · ${daCollegare} da collegare` : ''}
      </summary>
      <div className="flex flex-col gap-2 pt-2">
        <p className="m-0 testo-12 text-text-muted">
          {areaDedalo
            ? 'Le voci di Trama si segnano e sono elementi dell’area: l’area è completata quando lo sono tutti i suoi elementi.'
            : 'Una voce collegata ai pin ha il loro stato; le altre si segnano qui e non contano nella percentuale, che misura le planimetrie.'}
        </p>
        {area.punti.length > 0 && (gestitiTutti > 0 || !areaDedalo) && (
          <div className="flex flex-col gap-1" role="group" aria-label={areaDedalo ? 'Filtri' : 'Filtri per tipo'}>
            {/* una riga sola (2026-10-18, «poco pensata e ottimizzata a livello grafico»: tredici cartellini su sette righe): «Filtra per
                tipo» apre i tipi, con il conto di quelli scelti; «Tutti» e «Anche le segnate» restano accanto. Con un tipo solo (Trama,
                nei dedali) i filtri per tipo non servono: resta «Anche le segnate» */}
            <div className="flex flex-wrap items-center gap-1">
              {!areaDedalo && <button type="button" className={`chip touch testo-12 ${filtro.size > 0 ? 'chip--attivo' : ''}`} aria-expanded={filtriAperti} onClick={() => setFiltriAperti((v) => !v)}>
                Filtra per tipo{filtro.size > 0 ? ` · ${filtro.size === 1 ? '1 scelto' : `${filtro.size} scelti`}` : ''} {filtriAperti ? '▴' : '▾'}
              </button>}
              {filtro.size > 0 && <button type="button" className="chip touch testo-12" onClick={() => setFiltro(new Set())}>Tutti</button>}
              {/* vale anche per gli elenchi delle altre planimetrie: il conto è di tutta l'infiltrazione */}
              {gestitiTutti > 0 && <button type="button" className={`chip touch testo-12 ${mostraGestiti ? 'chip--attivo' : ''}`} onClick={() => setMostraGestiti((v) => !v)} aria-pressed={mostraGestiti}>Anche le segnate ({gestitiTutti})</button>}
            </div>
            {/* aperti: una griglia fitta, due o più colonne secondo la larghezza della colonna; un nome lungo va a capo, non si taglia */}
            {!areaDedalo && filtriAperti && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-1">
                {TIPI.filter((tp) => area.punti.some((p) => p.tipo === tp)).map((tp) => (
                  <button key={tp} type="button" className={`chip touch w-full max-w-none testo-12 ${filtro.has(tp) ? 'chip--attivo' : ''}`} aria-pressed={filtro.has(tp)} onClick={() => setFiltro((f) => { const n = new Set(f); if (n.has(tp)) n.delete(tp); else n.add(tp); return n; })}>
                    <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORE_TIPO[tp] }} aria-hidden="true" />
                    <span className="min-w-0 leading-tight">{NOME_TIPO[tp]}</span>
                    <span className="ml-auto shrink-0 text-text-muted">{area.punti.filter((p) => p.tipo === tp).length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {/* più voci insieme in un'altra area del Palazzo (spostare 2026-10-14, copiare 2026-10-18): fuori dalla scelta un comando solo;
            nella scelta la barra, che resta in vista scorrendo, col conto e i comandi */}
        {spostaInsieme && !scelte && (
          <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="copia" dimensione={20} />} titolo="Copia o sposta voci"
            aria-label="Scegli voci da copiare o spostare in un’altra infiltrazione del Palazzo" disabled={occupato}
            onClick={() => { setSelezionato(null); setCollegando(null); setNuovoPunto(null); setScelta({ area: area.chiave, chiavi: new Set() }); }} />
        )}
        {scelte && (
          <section className="@container card sticky top-0 z-10 flex flex-wrap items-center gap-2 py-2" aria-label="Copia o sposta voci in un’altra infiltrazione">
            {/* la guida sta in una colonna anche stretta (308 px a 1280): conta la larghezza della barra, non della finestra. I comandi
                non si restringono mai; sotto i 32rem la prima riga è conto, «Tutte» e «Fine» (la frase che spiega la scelta si vede da
                32rem in su: l'etichetta della sezione la dice comunque) e la seconda «Copia in…» / «Sposta in…», così la barra fissa resta
                di due righe; sopra, una riga sola */}
            <span className="min-w-0 flex-1 testo-13"><strong>{scelte.size === 0 ? 'Scegli le voci' : scelte.size === 1 ? '1 voce scelta' : `${scelte.size} voci scelte`}</strong>
              <span className="hidden text-text-muted @lg:inline"> · da copiare o spostare in un’altra infiltrazione</span></span>
            {puntiVisibili.length > 0 && <PulsanteVisivo tono="fantasma" compatto className="shrink-0" icona={<IconaAzione chiave={tutteScelte ? 'deseleziona' : 'seleziona'} dimensione={20} />} titolo={tutteScelte ? 'Nessuna' : 'Tutte'}
              aria-label={tutteScelte ? 'Togli dalla scelta tutte le voci in elenco' : 'Scegli tutte le voci in elenco'} onClick={() => scegli(puntiVisibili.map((p) => p.chiave), !tutteScelte)} />}
            <div className="order-last flex basis-full flex-wrap gap-2 @lg:order-none @lg:basis-auto">
              <PulsanteVisivo tono="primario" compatto className="shrink-0" icona={<IconaAzione chiave="copia" dimensione={20} />} titolo="Copia in…" disabled={scelte.size === 0} onClick={() => setTrasferimento('copia')} />
              <PulsanteVisivo tono="secondario" compatto className="shrink-0" icona={<IconaAzione chiave="incolla" dimensione={20} />} titolo="Sposta in…" disabled={scelte.size === 0} onClick={() => setTrasferimento('sposta')} />
            </div>
            <PulsanteVisivo tono="fantasma" compatto className="shrink-0" icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Fine" aria-label="Esci dalla scelta" onClick={() => setScelta(null)} />
          </section>
        )}
        <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0" aria-label={scelte ? `Voci di ${nomeArea} da scegliere` : `Voci della guida di ${nomeArea}`}>
          {area.punti.length === 0 && <li className="py-2 testo-13 text-text-muted">{areaDedalo ? `Quest’area non ha ancora voci${IN_RILASCIO ? '.' : ': aggiungile qui sotto.'}` : daCatturare.length > 0 ? 'Nessun’altra voce: le Persona da catturare sono qui sopra.' : `La guida non ha voci per quest’infiltrazione${IN_RILASCIO ? '.' : ': aggiungile qui sotto.'}`}</li>}
          {area.punti.length > 0 && puntiQui.length === 0 && <li className="py-2 testo-13 text-text-muted">Nessuna voce su questa planimetria: le voci dell’infiltrazione stanno nelle altre planimetrie, qui sotto.</li>}
          {puntiQui.length > 0 && puntiVisibili.length === 0 && <li className="py-2 testo-13 text-text-muted">Nessuna voce con questi filtri{!mostraGestiti && gestitiArea > 0 ? ` (${gestitiArea} segnate nascoste)` : ''}.</li>}
          {/* nella scelta le voci sono righe da spuntare (i passi seguono il loro Enigma e non si scelgono): niente scheda né gesti */}
          {scelte
            ? puntiVisibili.map((p) => {
              const passi = passiPer.get(p.chiave)?.length ?? 0;
              return (
                <li key={p.chiave}>
                  <label className="touch flex cursor-pointer items-start gap-2.5 px-1 py-1.5 testo-13">
                    <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={scelte.has(p.chiave)} onChange={(e) => scegli([p.chiave], e.target.checked)} />
                    <span className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: COLORE_TIPO[p.tipo] }} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{p.nome}</span>
                      <span className="testo-12 text-text-muted"> · {NOME_TIPO[p.tipo]}{p.stato ? ` · ${p.stato}` : ''}{passi > 0 ? ` · con ${passi === 1 ? '1 passo' : `${passi} passi`}` : ''}{p.pin.length > 0 ? ` · ${p.pin.length} pin` : ''}</span>
                    </span>
                  </label>
                </li>
              );
            })
            : puntiVisibili.map((p) => riga(p, vociDellArea))}
        </ul>
        {trasferimento && scelte && areePalazzo && (
          <TrasferisciVociInArea modo={trasferimento} voci={vociDellArea.filter((p) => scelte.has(p.chiave))} passi={vociDellArea.filter((p) => scelte.has(p.chiave)).reduce((n, p) => n + (passiPer.get(p.chiave)?.length ?? 0), 0)}
            area={areePalazzo.find((a) => a.chiave === area.chiave) ?? { chiave: area.chiave, nome: area.nome, ordine: area.ordine }} aree={areePalazzo}
            onChiudi={() => setTrasferimento(null)} onFatto={async () => { setScelta(null); await onRicarica(); }} />
        )}
        {/* La guida non ha trascritto tutto: quel che manca si aggiunge qui, dove lo si è cercato; poi si sposta dove va. */}
        {IN_RILASCIO || scelte ? null : nuovoPunto && !nuovoPunto.contenitore
          ? moduloNuovaVoce(nuovoPunto)
          : <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una voce" className="self-start" aria-label={areaDedalo ? `Aggiungi una voce di Trama in ${nomeArea}` : undefined} onClick={() => setNuovoPunto({ nome: '', tipo: areaDedalo ? 'trama' : 'altro', contenitore: null, dove: qui })} />}
        {/* (UX3-14) le voci delle altre planimetrie dell'infiltrazione, raggruppate per planimetria, chiuse: la gestione completa resta qui,
            coi gesti di sempre (fuori dalla scelta di «Copia o sposta voci», che lavora sull'elenco) */}
        {!scelte && altrePlanimetrie.length > 0 && (
          <details className="testo-12">
            <summary className="touch cursor-pointer text-text-muted">Nelle altre planimetrie · {quanteAltrove === 1 ? '1 voce' : `${quanteAltrove} voci`}</summary>
            <div className="flex flex-col gap-3 pt-2">
              {altrePlanimetrie.map((g) => {
                const visibili = g.voci.filter((p) => inVistaSu(p, g.chiave));
                return (
                  <section key={g.chiave} className="flex flex-col gap-1" aria-label={`Su ${g.nome}`}>
                    <h4 className="m-0 testo-12 font-semibold uppercase tracking-wide text-text-muted">{g.nome}</h4>
                    <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0" aria-label={`Voci della guida su ${g.nome}`}>
                      {visibili.length === 0 && <li className="py-1.5 testo-12 text-text-muted">Nessuna voce con questi filtri.</li>}
                      {visibili.map((p) => riga(p, vociDellArea, g.chiave))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </details>
        )}
        {/* L4 §8.11 e §1.6: la conferma di «Riapri» quando si riaprono anche altre voci */}
        {riapertura.finestra}
      </div>
    </details>
    </>
  );
}
