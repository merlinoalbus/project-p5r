// ============================================================
// EditorMappaPage — editor di una mappa a livelli (Fase 13.3): strumenti seleziona/sposta e aggiungi, proprietà dello spillo con
// riferimento cercato fra le entità della guida, immagine di base, proprietà e albero delle mappe, esportazione/importazione
// ============================================================
//
// Ogni modifica viene salvata subito tramite l'API (niente stato «non salvato» da perdere); il posizionamento degli spilli esiste solo qui.
// Dal 2026-10-14 la sezione «Pezzi» (102): «Ritaglia pezzo» trasforma una zona dell'immagine scelta col mouse in un pezzo da posare,
// ruotare, specchiare e mostrare con le condizioni (`FormPezzo`); sostituire l'immagine di una mappa con dei pezzi chiede conferma.
// ============================================================

import { etichettaPlanimetria, nomePresentazioneMappa, presentaMappa } from '../utils/presentazioneMappa';
import { RisolviMappa } from '../components/mappe/RisolviMappa';
import { casaConInfiltrazione, destinazioneMappaSpillo, infiltrazioneDelRitorno } from '../utils/navigazioneMappa';
import { Selettore } from '../components/shared/Selettore';
import type { DestinazioneSpillo } from '../types';
import { CondizioniEditor } from '../components/guida/CondizioniEditor';

import { useId, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { aggiornaCopiaPezzoMappa, aggiornaElementoCatalogo, aggiornaMappa, aggiornaSpillo, getElementoCatalogo, creaCopiaPezzoMappa, creaPezzoMappa, eliminaCopiaPezzoMappa, eliminaPezzoMappa, isApiError, caricaImmagineMappa, cercaRiferimenti, collegaPinAlPunto, creaMappa, creaPassaggio, creaSpillo, eliminaMappa, esportaMappe, getAlberoMappe, getConfidenti, getDungeons, getMappa, getQuartieri, getRichieste, getVociCollegabili, importaMappe } from '../services/api';
import { notifica } from '../stores/notificationStore';
import { usePartitaStore } from '../stores/partitaStore';
import { LIMITI_GUIDA } from '../../shared/limitiGuida';
import { useImmagineMappa } from '../hooks/useImmagineMappa';
import { PageState } from '../components/shared/PageState';
import { Modal } from '../components/shared/Modal';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { VisoreMappa, type StrumentiEditor, type StrumentoEditor } from '../components/mappe/VisoreMappa';
import { IconaSpillo, PuntoSpillo } from '../components/mappe/IconaSpillo';
import { PassaggiMappa } from '../components/mappe/PassaggiMappa';
import { FormPezzo } from '../components/mappe/FormPezzo';
import { FinestraLuogoDaPin } from '../components/mappe/FinestraLuogoDaPin';
import { FinestraRimozionePin } from '../components/mappe/FinestraRimozionePin';
import { pinCompatibileConNuovoLuogo } from '../../shared/luogoDaPin';
import { copiePosate, nomeCopia, posizioneNuovaCopia, type CopiaPosata } from '../utils/pezziMappa';

import { condizioniSenzaTesto, ELENCHI_VUOTI, type ElenchiCondizioni } from '../utils/condizioniSpillo';
import { normalizzaRequisitoSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo';
import { ammetteCondizioni, CATEGORIE_SPILLO, DEFINIZIONI_CATEGORIA, DEFINIZIONI_SPILLO, NOME_TIPO_MAPPA, riferimentiAmmessiPerTipo, TIPI_MAPPA, categoriaSpillo, statoDelTipo, tipiDellaCategoria, type TipoMappa, type TipoRiferimento, type TipoSpillo } from '../../shared/spilli';
import { ritornoMappe } from '../utils/ritornoMappe';
import { NEL_CESTINO } from '../utils/cestino';
import { haCasaPropria, paginaPerAggiungere } from '../utils/aree';
import type { DatiAggiornaCopiaPezzo, EsportazioneMappeDto, MappaDto, MappaRiassuntoDto, SpilloDto } from '../types';
import { NienteInRilascio, type StrumentoDiModifica } from '../components/shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';


/** Un numero col nome accordato: «1 copia», «3 copie». */
const conta = (n: number, singolare: string, plurale: string): string => `${n} ${n === 1 ? singolare : plurale}`;

/** Il testo da notificare per un errore: il messaggio se è un `Error`, altrimenti il testo predefinito. */
function messaggio(err: unknown, predefinito: string): string { return err instanceof Error ? err.message : predefinito; }

/** Nessuna condizione per i pin nuovi: lo stesso elenco vuoto a ogni resa. */
const SENZA_CONDIZIONI: RequisitoSpillo[] = [];

/** Spillo copiato negli appunti dell'editor: tutti i campi tranne la posizione; sopravvive al cambio di mappa e alla ricarica della pagina. */
export interface AppuntiSpillo { destinazione?: DestinazioneSpillo | null; tipo: TipoSpillo; nome: string; descrizione: string; riferimento: { tipo: TipoRiferimento; chiave: string } | null; condizioni: RequisitoSpillo[] }
/** Le condizioni dello spillo (o di una copia di un pezzo, 103) senza il testo descrittivo del server (è il server a ricalcolarlo). */
const condizioniNude = (s: Pick<SpilloDto, 'condizioni'>): RequisitoSpillo[] => condizioniSenzaTesto(s.condizioni);
const CHIAVE_APPUNTI = 'p5r.editor.appunti-spillo';
/** L'id dell'istruzione sulle frecce nel modulo dello spillo: il pin selezionato sulla mappa la cita con `aria-describedby`. */
const ID_FRECCE_SPILLO = 'editor-spillo-frecce';
/** Le sezioni del pannello dell'editor, nell'ordine dei pulsanti. */
const SEZIONI_EDITOR = ['spilli', 'pezzi', 'mappa', 'collegamenti', 'file'] as const;
/** Legge gli appunti dello spillo dalla memoria di sessione; null se mancano, se il JSON non si legge o se la memoria non è disponibile. */
function leggiAppunti(): AppuntiSpillo | null {
  try { const raw = sessionStorage.getItem(CHIAVE_APPUNTI); return raw ? (JSON.parse(raw) as AppuntiSpillo) : null; } catch { return null; }
}
/** Salva gli appunti dello spillo nella memoria di sessione, o li cancella con null; se la memoria non è disponibile non fa niente. */
function scriviAppunti(a: AppuntiSpillo | null): void {
  try { if (a) sessionStorage.setItem(CHIAVE_APPUNTI, JSON.stringify(a)); else sessionStorage.removeItem(CHIAVE_APPUNTI); } catch { /* memoria di sessione non disponibile: gli appunti restano solo in pagina */ }
}

/** Pagina dell'editor: risolve la chiave dell'URL nella mappa vera (tramite `RisolviMappa`) e monta l'editor su quella, rimontandolo da capo quando la chiave risolta cambia. */
// L12 (passo 8): l'editor delle mappe esiste solo nella preparazione. Il router non registra la rotta nel rilascio (e il bundler non emette il
// chunk); questa condizione è la seconda difesa: anche se un domani un altro modulo importasse la pagina, nel rilascio sarebbe un componente
// vuoto (nessuno strumento, nessuna chiamata all'API di scrittura).
export const EditorMappaPage: StrumentoDiModifica<typeof EditorMappaPageReale> = IN_RILASCIO ? NienteInRilascio : EditorMappaPageReale;
function EditorMappaPageReale() {
  const { chiave = '' } = useParams<{ chiave: string }>();
  return <RisolviMappa chiave={chiave}>{k => <EditorMappaRisolta key={k} chiave={k} />}</RisolviMappa>;
}

/**
 * L'editor di una mappa già risolta: carica la mappa (filtrata sul giorno della partita se la
 * vista del giorno corrente è accesa), l'albero delle mappe e gli elenchi per le condizioni di
 * visibilità. Mostra il visore in modalità modifica con il pannello laterale e tiene lo
 * strumento attivo, il tipo del nuovo spillo, lo spillo selezionato, gli appunti e le finestre di
 * eliminazione e di nuova mappa. Toccare la mappa crea uno spillo nuovo o incolla quello copiato;
 * ogni operazione passa da `esegui`, che salva e ricarica.
 */
function EditorMappaRisolta({ chiave }: { chiave: string }) {
  const navigate = useNavigate();
  // **Vista del giorno corrente** (richiesta dell'utente, 2026-09-18): l'editor di regola mostra
  // tutto, perché deve poter modificare anche quel che nel mondo non c'è ancora. Con l'interruttore
  // acceso la mappa si legge invece come la legge chi consulta la guida oggi — nascondendo quel che
  // le condizioni di visibilità escludono nel giorno e nella fascia della partita attiva — così si
  // controlla il lavoro senza uscire dalla modifica. Senza partita attiva non c'è un «oggi»: resta spento.
  const attiva = usePartitaStore((s) => s.attiva);
  const momento = usePartitaStore((s) => `${s.attiva?.dataGioco ?? ''}|${s.attiva?.fasciaGioco ?? ''}|${s.attiva?.meteoOra ?? ''}`);
  const [giornoCorrente, setGiornoCorrente] = useState(false);
  const conGiorno = giornoCorrente && !!attiva;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `momento` (giorno, fascia, meteo) non entra nella lettura: al suo cambio si rilegge
  const { dati, caricamento, errore, ricarica } = useCarica(() => getMappa(chiave, conGiorno ? attiva.id : undefined), [chiave, conGiorno, attiva?.id, momento]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `chiave` non entra nella lettura: l'albero si rilegge al cambio di mappa
  const albero = useCarica(() => getAlberoMappe(), [chiave]);
  // elenchi per le condizioni di visibilità (Confidenti, quartieri, richieste, Palazzi): una volta per pagina
  const elenchi = useCarica<ElenchiCondizioni>(async () => {
    const [confidenti, quartieri, richieste, dungeon] = await Promise.all([getConfidenti(), getQuartieri(), getRichieste(), getDungeons()]);
    return { confidenti, quartieri, richieste: richieste.richieste, dungeon };
  }, []);
  const [strumento, setStrumento] = useState<StrumentoEditor>('seleziona');
  const [condizioniImportate, setCondizioniImportate] = useState<string[]>([]);
  const [appunti, setAppunti] = useState<AppuntiSpillo | null>(leggiAppunti);
  const [tipoNuovo, setTipoNuovo] = useState<TipoSpillo>('nota');
  // 2026-11-14 (richiesta dell'utente): le condizioni con cui nasce ogni pin nuovo di questa mappa (creato con un tocco o come passaggio
  // dalla sezione Collegamenti), per preparare in serie i pin soggetti allo stesso evento. Valgono finché l'editor di questa mappa è
  // aperto (scelta dell'utente): l'editor si rimonta a ogni cambio di mappa e lo stato riparte vuoto; il confronto con la mappa è una difesa in più
  const [predefinite, setPredefinite] = useState<{ mappa: string; condizioni: RequisitoSpillo[] }>({ mappa: chiave, condizioni: [] });
  const condizioniNuovi = predefinite.mappa === chiave ? predefinite.condizioni : SENZA_CONDIZIONI;
  const [selezionatoId, setSelezionatoId] = useState<number | null>(null);
  /** La copia di un pezzo della planimetria selezionata (102; copie dalla 103): uno spillo o una copia alla volta. */
  const [copiaId, setCopiaId] = useState<number | null>(null);
  const [pinDaLuogo, setPinDaLuogo] = useState<{ spillo: SpilloDto; contesto: string } | null>(null);
  const [pinDaRimuovere, setPinDaRimuovere] = useState<{ spillo: SpilloDto; contesto: string } | null>(null);
  const [versioneFormSpillo, setVersioneFormSpillo] = useState(0);
  const contestoEditorRef = useRef('');
  // `?sezione=mappa` apre l'editor sulla sezione dell'immagine («Carica l'immagine» di una planimetria che non ce l'ha, 2026-10-18)
  const [parametri] = useSearchParams();
  const [sezione, setSezione] = useState(() => (SEZIONI_EDITOR as readonly string[]).includes(parametri.get('sezione') ?? '') ? parametri.get('sezione')! : 'spilli');
  /** Seleziona uno spillo (o nessuno con null); selezionandone uno il pannello torna alla sezione «Spilli» e la copia si deseleziona. */
  const seleziona = (id:number|null) => { setSelezionatoId(id); if(id!==null){setSezione('spilli');setCopiaId(null);} };
  /** Seleziona una copia di un pezzo (o nessuna): il pannello passa alla sezione «Pezzi» e lo spillo si deseleziona. */
  const selezionaCopia = (id: number | null) => { setCopiaId(id); if (id !== null) { setSezione('pezzi'); setSelezionatoId(null); } };
  /** L'immagine nuova in attesa di conferma su una mappa con dei pezzi (102: 409 `mappa-con-pezzi`): un file caricato o, da L1 (F5),
   *  la pianta da scaricare dalla guida. `sostituisci` ripete la stessa operazione con la conferma; `ok` è l'avviso dopo. */
  const [immagineDaConfermare, setImmagineDaConfermare] = useState<{ messaggio: string; sostituisci: () => Promise<unknown>; ok: string } | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [confermaEliminaMappa, setConfermaEliminaMappa] = useState(false);
  /** FUN2-8 (L2): il rifiuto del server di mettere nel mondo una planimetria senza Area (409 `usa-aggiungi-area`), con la pagina da cui
   *  aggiungerla per bene accanto al genitore scelto. Resta scritto sopra le proprietà finché non si chiude o si salva di nuovo. */
  const [avvisoMondo, setAvvisoMondo] = useState<{ messaggio: string; aggiunta: { href: string; testo: string } | null } | null>(null);
  useDocumentTitle(dati ? `Modifica: ${dati.nome} — Mappe` : 'Modifica mappa');

  /** Apre nell'editor un'altra mappa. */
  const vai = (k: string) => navigate(`/guida/mappe/${encodeURIComponent(k)}/modifica`);
  /** Esegue un'operazione dell'editor con lo stato «occupato»: se riesce notifica il messaggio di successo (se dato) e ricarica la mappa, se fallisce notifica l'errore. */
  const esegui = async (azione: () => Promise<unknown>, ok?: string) => {
    setOccupato(true);
    try {
      await azione();
      if (ok) notifica('success', ok);
      await ricarica();
    } catch (err) {
      notifica('error', messaggio(err, 'Operazione fallita.'));
    } finally {
      setOccupato(false);
    }
  };

  const editor: StrumentiEditor = {
    strumento,
    selezionatoId,
    idIstruzioniFrecce: ID_FRECCE_SPILLO,
    onSeleziona: seleziona,
    onClickMappa: (x, y) => {
      if (strumento === 'incolla') {
        if (!appunti) { setStrumento('seleziona'); return; }
        void esegui(async () => {
          const s = await creaSpillo(chiave, { ...appunti, x, y });
          seleziona(s.id);
          setStrumento('seleziona');
        }, `Spillo «${appunti.nome}» incollato: stesso tipo, descrizione, riferimento e condizioni di visibilità dell'originale.`);
        return;
      }
      // le condizioni dei pin nuovi, se ce ne sono e il tipo le ammette: scritte sul pin, restano sue anche quando l'impostazione si azzera
      const conCondizioni = condizioniNuovi.length > 0 && ammetteCondizioni(tipoNuovo);
      void esegui(async () => {
        const s = await creaSpillo(chiave, { tipo: tipoNuovo, nome: DEFINIZIONI_SPILLO[tipoNuovo].nome, x, y, ...(conCondizioni ? { condizioni: condizioniNuovi } : {}) });
        seleziona(s.id);
        setStrumento('seleziona');
      }, `Spillo «${DEFINIZIONI_SPILLO[tipoNuovo].nome}» aggiunto${conCondizioni ? ' con le condizioni dei pin nuovi' : ''}: completa nome e riferimento nel pannello.`);
    },
    onSposta: (id, x, y) => void esegui(() => aggiornaSpillo(id, { x, y })),
    // doppio tocco su uno spostamento: si visita l'arrivo senza uscire dalla modifica
    onVisita: vai,
    // i pezzi della planimetria (102): la zona trascinata con «Ritaglia pezzo» diventa un pezzo con la sua prima copia (103),
    // selezionata e pronta da posare; sulla mappa si trascinano le copie
    pezzi: {
      selezionatoId: copiaId,
      onSeleziona: selezionaCopia,
      onRitaglia: (zona) => void esegui(async () => {
        const p = await creaPezzoMappa(chiave, { sorgente: zona });
        selezionaCopia(p.copie[0]?.id ?? null);
        setStrumento('seleziona');
      }, `Pezzo ritagliato (${zona.larghezza}×${zona.altezza} px): la sua zona è cancellata dalla mappa. Trascinalo dove va, o scrivi la posizione nel pannello; con «Aggiungi copia» lo posi anche altrove.`),
      onSposta: (id, x, y) => void esegui(() => aggiornaCopiaPezzoMappa(id, { posizione: { x, y } })),
    },
  };
  /**
   * Carica l'immagine di base. Su una mappa con dei pezzi il server chiede conferma (409 `mappa-con-pezzi`, scelta dell'utente del
   * 2026-10-14: «Chiedere conferma ed eliminarli»): si apre la finestra, e confermando si ricarica con `eliminaPezzi`.
   */
  const caricaImmagine = (file: File) => esegui(async () => {
    try {
      await caricaImmagineMappa(chiave, file);
      notifica('success', 'Immagine di base caricata (resta nella tua istanza).');
    } catch (err) {
      if (isApiError(err, 'mappa-con-pezzi')) {
        setImmagineDaConfermare({ messaggio: err.message, sostituisci: () => caricaImmagineMappa(chiave, file, { eliminaPezzi: true }),
          ok: 'Immagine di base sostituita; i pezzi ritagliati dall’immagine di prima sono stati eliminati.' });
        return;
      }
      throw err;
    }
  });

  const selezionato = dati?.spilli.find((s) => s.id === selezionatoId) ?? null;
  const uidSelezionato = selezionato?.uid ?? (pinDaLuogo?.spillo.id === selezionatoId ? pinDaLuogo.spillo.uid : null);
  const contestoEditor = JSON.stringify([chiave, selezionatoId, uidSelezionato, attiva?.id ?? null, momento, conGiorno]);
  // Il contesto diventa attivo insieme alla vista, prima delle callback asincrone e degli effetti passivi.
  // Anche smontare l'editor invalida subito i gesti ancora pendenti della vecchia selezione.
  useLayoutEffect(() => {
    contestoEditorRef.current = contestoEditor;
    return () => { contestoEditorRef.current = ''; };
  }, [contestoEditor]);
  /** La copia selezionata con il suo pezzo e il suo posto fra le copie (null se non c'è più, per esempio dopo un'eliminazione). */
  const copiaSelezionata = copiePosate(dati?.pezzi ?? []).find((x) => x.copia.id === copiaId) ?? null;
  /** L'immagine della mappa in pixel, per tenere le copie dentro (null se non nota: lo controlla il server). */
  const immagineMappa = dati?.larghezza && dati.altezza ? { larghezza: dati.larghezza, altezza: dati.altezza } : null;
  /** La casa della mappa per «Chiudi» e «Apri il visore»: per una planimetria di un Palazzo (L3, AP3-4) con l'infiltrazione aperta
   *  nella scheda da cui si è entrati, se è la scheda di quel Palazzo. */
  const casaDellaMappa = (m: { chiave: string; casa: string }) => casaConInfiltrazione(m.casa, m.chiave, infiltrazioneDelRitorno(m.casa, ritornoMappe()));
  /** Copia uno spillo negli appunti (in pagina e nella memoria di sessione), passa allo strumento «Incolla» e spiega come incollarlo. */
  const copia = (a: AppuntiSpillo) => {
    setAppunti(a); scriviAppunti(a); setStrumento('incolla');
    notifica('info', `Spillo «${a.nome}» copiato: tocca la mappa (anche di un’altra mappa) nel punto dove incollarlo.`);
  };

  return (
    <><PageState isLoading={caricamento && !dati} error={errore} onRetry={ricarica}>
      {dati && (
        <VisoreMappa
          key={dati.chiave}
          mappa={presentaMappa(dati)}
          partitaId={conGiorno ? attiva.id : null}
          vistaGiornoCorrente={conGiorno}
          onNaviga={vai}
          // nel mondo «Chiudi» porta alla casa della mappa (la pagina della città, del quartiere o dell'Area, sulla versione aperta: L2,
          // R2-20); fuori resta il ritorno alla pagina da cui si è entrati nelle mappe
          // L3 (AP3-4): anche per una planimetria di un Palazzo, dritti alla sua casa (la scheda, sulla sua area e versione)
          onChiudi={() => navigate(haCasaPropria(dati) ? casaDellaMappa(dati) : ritornoMappe() ?? `/guida/mappe/${encodeURIComponent(chiave)}`)}
          editor={editor}
          className="visore-mappa--editor"
          intestazione={<h1 className="editor-mappa__targhetta">Modifica<span className="sr-only"> la mappa {nomePresentazioneMappa(dati)}</span></h1>}
          azioni={<>
            <PulsanteVisivo tono={conGiorno ? 'primario' : 'fantasma'} compatto attivo={conGiorno}
              icona={<IconaAzione chiave="calendario" dimensione={20} />} titolo="Giorno corrente"
              dettaglio={attiva ? (conGiorno ? 'acceso: vedi solo quel che c’è oggi' : 'spento: vedi tutto') : 'serve una partita attiva'}
              disabled={!attiva} onClick={() => setGiornoCorrente((v) => !v)} />
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Apri il visore" onClick={() => navigate(haCasaPropria(dati) ? casaDellaMappa(dati) : `/guida/mappe/${encodeURIComponent(chiave)}`)} />
          </>}
          pannello={
            <PannelloEditor
              mappa={dati} albero={albero.dati ?? []} strumento={strumento} tipoNuovo={tipoNuovo} selezionato={selezionato} occupato={occupato} appunti={appunti} elenchi={elenchi.dati ?? ELENCHI_VUOTI}
              condizioniNuovi={condizioniNuovi} onCondizioniNuovi={(c) => setPredefinite({ mappa: chiave, condizioni: c })}
              // entrando in «Aggiungi» il pin aperto si chiude: mentre si aggiunge c'è un solo blocco di condizioni, quello dei pin nuovi
              onStrumento={(s) => { if (s === 'aggiungi') setSelezionatoId(null); setStrumento(s); }} onTipoNuovo={setTipoNuovo} onSeleziona={seleziona} sezione={sezione} onSezione={setSezione} onCopia={copia}
              onSalvaSpillo={(id, d) => esegui(() => aggiornaSpillo(id, d), 'Spillo salvato.')}
              onEliminaSpillo={async (id) => { const spillo = dati.spilli.find(s => s.id === id); if (spillo) setPinDaRimuovere({ spillo, contesto: contestoEditor }); }}
              onCollegaVoce={(id, voce, collega) => esegui(() => collegaPinAlPunto(voce, id, collega), collega ? 'Voce della guida collegata.' : 'Voce della guida scollegata.')}
              versioneFormSpillo={versioneFormSpillo}
              onCreaLuogoDaPin={(spillo) => setPinDaLuogo({ spillo, contesto: contestoEditor })}
              onCreaMappaCollegata={(s) => esegui(async () => {
                const nuova=await creaMappa({ nome:s.nome, tipo:dati.tipo==='palazzo'||dati.tipo==='dedalo'||dati.tipo==='area'?'area':'luogo', genitore:dati.chiave, ordine:dati.figli.length });
                await aggiornaSpillo(s.id,{tipo:'passaggio',riferimento:{tipo:'mappa',chiave:nuova.chiave}});
                await albero.ricarica();
              }, 'Mappa collegata creata: lo spillo ora è un passaggio verso di lei.')}
              onSalvaMappa={(d) => esegui(async () => {
                setAvvisoMondo(null);
                try {
                  const aggiornata = await aggiornaMappa(chiave, d);
                  notifica('success', 'Mappa salvata.');
                  await albero.ricarica();
                  if (aggiornata.chiave !== chiave) vai(aggiornata.chiave);
                } catch (err) {
                  // FUN2-8: il messaggio del server resta scritto, con la strada giusta (un avviso che sparisce non bastava)
                  if (!isApiError(err, 'usa-aggiungi-area')) throw err;
                  const genitore = albero.dati?.find((m) => m.chiave === d.genitore);
                  setAvvisoMondo({ messaggio: err.message, aggiunta: genitore ? paginaPerAggiungere(genitore, albero.dati ?? []) : null });
                }
              })}
              avvisoMondo={avvisoMondo} onChiudiAvvisoMondo={() => setAvvisoMondo(null)}
              onImmagine={caricaImmagine}
              onEliminaMappa={() => setConfermaEliminaMappa(true)}
              onCreaPassaggio={(destinazione) => esegui(async () => {
                // anche un passaggio creato da qui è un pin nuovo: nasce con le condizioni dei pin nuovi, se ce ne sono
                const s = condizioniNuovi.length > 0 ? await creaPassaggio(chiave, destinazione, condizioniNuovi) : await creaPassaggio(chiave, destinazione);
                seleziona(s.id); setStrumento('seleziona');
              }, `${destinazione === dati.genitore ? `Passaggio di ritorno verso «${dati.genitoreNome ?? destinazione}» creato in basso al centro: trascinalo dove sta l'uscita.` : 'Passaggio creato al centro della mappa: trascinalo dove sta l\'ingresso.'}${condizioniNuovi.length > 0 ? ' Nasce con le condizioni dei pin nuovi.' : ''}`)}
              onEsporta={() => void esegui(async () => {
                const pacchetto = await esportaMappe();
                const blob = new Blob([JSON.stringify(pacchetto, null, 1)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'mappe-editor.json'; a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }, 'Mappe esportate in JSON: per condividerle con un\'altra istanza usa «Importa», oppure il backup dei dati di gioco in Impostazioni.')}
              onImporta={(file, sovrascrivi) => esegui(async () => {
                const pacchetto = JSON.parse(await file.text()) as EsportazioneMappeDto;
                const esito = await importaMappe(pacchetto, sovrascrivi);
                setCondizioniImportate(esito.condizioniConvertite ?? []);
                await albero.ricarica();
                notifica('info', `Importate ${esito.mappe} mappe, ${esito.spilli} spilli, ${conta(esito.pezzi, 'pezzo', 'pezzi')} (${conta(esito.copie, 'copia', 'copie')}), ${esito.immagini} immagini${esito.saltate.length ? `; saltate: ${esito.saltate.join(', ')}` : ''}${esito.condizioniScartate ? `; ${esito.condizioniScartate} condizioni scartate perché citano chiavi assenti dalla Guida` : ''}${esito.vociScartate ? `; ${esito.vociScartate} voci della guida scartate (inesistenti, descrittive o di un altro Palazzo)` : ''}${esito.copieScartate ? `; ${conta(esito.copieScartate, 'copia scartata', 'copie scartate')} perché ${esito.copieScartate === 1 ? 'esce' : 'escono'} dall’immagine della loro mappa${esito.pezziScartati ? ` (con ${esito.copieScartate === 1 ? 'lei' : 'loro'} ${conta(esito.pezziScartati, 'pezzo rimasto', 'pezzi rimasti')} senza copie o con la zona fuori)` : ''}` : ''}${esito.pezziEliminati ? `; ${conta(esito.pezziEliminati, 'pezzo', 'pezzi')} (${conta(esito.copieEliminate, 'copia', 'copie')}) ${esito.pezziEliminati === 1 ? 'tolto perché ritagliato' : 'tolti perché ritagliati'} da un’immagine poi sostituita` : ''}.`);
              })}
              onVai={vai}
              copiaSelezionata={copiaSelezionata}
              immagineMappa={immagineMappa}
              onSelezionaCopia={selezionaCopia}
              onSalvaCopia={(id, d) => esegui(() => aggiornaCopiaPezzoMappa(id, d), 'Copia salvata.')}
              onAggiungiCopia={(x) => esegui(async () => {
                // la copia nuova parte da quella selezionata (rotazione, specchio, condizioni), accanto a lei e dentro l'immagine
                const nuova = await creaCopiaPezzoMappa(x.pezzo.id, { posizione: posizioneNuovaCopia(x.pezzo.sorgente, x.copia, immagineMappa), rotazione: x.copia.rotazione, specchio: x.copia.specchio, condizioni: condizioniNude(x.copia) });
                selezionaCopia(nuova.id);
              }, `Copia aggiunta accanto a «${nomeCopia(x.pezzo, x.copia, x.indice)}», con la stessa rotazione, lo stesso specchio e le stesse condizioni: trascinala dove va e cambia nel pannello quel che serve.`)}
              onEliminaCopia={(id) => esegui(async () => {
                const { pezzoEliminato } = await eliminaCopiaPezzoMappa(id);
                setCopiaId(null);
                notifica('success', pezzoEliminato ? 'Era l’ultima copia: il pezzo è stato eliminato e la sua zona torna visibile nella mappa.' : 'Copia eliminata: le altre restano sulla mappa.');
              })}
              onEliminaPezzo={(id) => esegui(async () => { await eliminaPezzoMappa(id); setCopiaId(null); }, 'Pezzo eliminato con tutte le copie: la sua zona torna visibile nella mappa.')}
            />
          }
        />
      )}
      {dati && (
        // la sostituzione dell'immagine di una mappa con dei pezzi (102): il messaggio del server dice quanti se ne vanno
        <Modal titolo="Sostituire l’immagine di base?" aperta={immagineDaConfermare !== null} onChiudi={() => setImmagineDaConfermare(null)}
          azioni={<>
            <button type="button" className="btn btn-secondary btn-sm touch" onClick={() => setImmagineDaConfermare(null)}>Annulla</button>
            <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="carica" dimensione={20} />} titolo="Sostituisci ed elimina i pezzi" disabled={occupato}
              onClick={() => { const da = immagineDaConfermare; setImmagineDaConfermare(null); if (da) void esegui(async () => { await da.sostituisci(); setCopiaId(null); }, da.ok); }} />
          </>}>
          <p className="m-0 testo-13">{immagineDaConfermare?.messaggio} I pezzi sono ritagli in pixel di quell’immagine: su un’altra ritaglierebbero zone sbagliate.</p>
        </Modal>
      )}
      {condizioniImportate.length > 0 && <Modal titolo="Condizioni recuperate dall’importazione" aperta onChiudi={() => setCondizioniImportate([])} larga
        azioni={<PulsanteVisivo icona={<IconaAzione chiave="chiudi" dimensione={22} />} titolo="Chiudi" onClick={() => setCondizioniImportate([])} />}>
        <p className="mt-0 testo-13">Queste vecchie condizioni «manuale» sono lette come avvisi non bloccanti. Gli elementi saltati o scartati non sono inclusi.</p>
        <ul className="m-0 pl-4 testo-13">{condizioniImportate.map((c, i) => <li key={i} className="break-words">{c}</li>)}</ul>
      </Modal>}
      {dati && (
        <Modal titolo={`Eliminare la mappa «${dati.nome}»?`} aperta={confermaEliminaMappa} onChiudi={() => setConfermaEliminaMappa(false)}
          azioni={<>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfermaEliminaMappa(false)}>Annulla</button>
            <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" disabled={occupato} onClick={() => void esegui(async () => { await eliminaMappa(chiave); navigate(dati.genitore ? `/guida/mappe/${encodeURIComponent(dati.genitore)}/modifica` : '/guida/mappe'); }, 'Mappa eliminata.')} />
          </>}>
          <p className="m-0 testo-13">Gli spilli della mappa vengono eliminati; le mappe figlie ({dati.figli.length}) restano senza genitore. {NEL_CESTINO}</p>
        </Modal>
      )}
    </PageState>
      {pinDaRimuovere && pinDaRimuovere.contesto === contestoEditor && <FinestraRimozionePin
        key={`${pinDaRimuovere.spillo.id}:${pinDaRimuovere.spillo.uid}:${pinDaRimuovere.contesto}`}
        spillo={pinDaRimuovere.spillo} mappa={chiave}
        contestoAncoraAttivo={() => contestoEditorRef.current === pinDaRimuovere.contesto}
        onChiudi={() => setPinDaRimuovere(null)}
        onRimosso={async () => { if (contestoEditorRef.current !== pinDaRimuovere.contesto) return; setPinDaRimuovere(null); setSelezionatoId(null); await Promise.all([ricarica(), albero.ricarica()]); }} />}
      {pinDaLuogo && pinDaLuogo.contesto === contestoEditor && <FinestraLuogoDaPin
        key={`${pinDaLuogo.spillo.id}:${pinDaLuogo.spillo.uid}:${pinDaLuogo.contesto}`}
        spillo={pinDaLuogo.spillo} mappa={chiave} partita={conGiorno ? attiva.id : undefined}
        mappaRiletta={dati} caricamentoMappa={caricamento} erroreMappa={errore} onRileggi={ricarica}
        contestoAncoraAttivo={() => contestoEditorRef.current === pinDaLuogo.contesto}
        onRiletta={() => { if (contestoEditorRef.current === pinDaLuogo.contesto) setVersioneFormSpillo(v => v + 1); }}
        onChiudi={() => setPinDaLuogo(null)} />}
    </>
  );
}

interface PropsPannello {
  sezione:string; onSezione:(s:string)=>void;
  mappa: MappaDto;
  albero: MappaRiassuntoDto[];
  strumento: StrumentoEditor;
  tipoNuovo: TipoSpillo;
  selezionato: SpilloDto | null;
  occupato: boolean;
  appunti: AppuntiSpillo | null;
  elenchi: ElenchiCondizioni;
  /** Le condizioni con cui nasce ogni pin nuovo di questa mappa (vuote: nasce senza, come sempre); durano finché l'editor resta su questa mappa. */
  condizioniNuovi: RequisitoSpillo[];
  onCondizioniNuovi: (c: RequisitoSpillo[]) => void;
  onStrumento: (s: StrumentoEditor) => void;
  onCopia: (a: AppuntiSpillo) => void;
  onTipoNuovo: (t: TipoSpillo) => void;
  onSeleziona: (id: number | null) => void;
  onSalvaSpillo: (id: number, dati: Parameters<typeof aggiornaSpillo>[1]) => Promise<void>;
  onEliminaSpillo: (id: number) => Promise<void>;
  /** Collega (o scollega) una voce della guida a uno spillo (098). */
  onCollegaVoce: (id: number, voce: string, collega: boolean) => Promise<void>;
  onCreaMappaCollegata: (s: SpilloDto) => Promise<void>;
  onCreaLuogoDaPin: (s: SpilloDto) => void;
  versioneFormSpillo: number;
  onSalvaMappa: (dati: Parameters<typeof aggiornaMappa>[1]) => Promise<void>;
  /** FUN2-8: il rifiuto di mettere nel mondo una planimetria senza Area (messaggio del server e pagina da cui aggiungerla), o null. */
  avvisoMondo: { messaggio: string; aggiunta: { href: string; testo: string } | null } | null;
  onChiudiAvvisoMondo: () => void;
  onImmagine: (file: File) => Promise<void>;
  onEliminaMappa: () => void;
  /** Passaggio da questa mappa verso `destinazione` (figlia senza passaggio o genitore per il ritorno), 15.24. */
  onCreaPassaggio: (destinazione: string) => Promise<void>;
  onEsporta: () => void;
  onImporta: (file: File, sovrascrivi: boolean) => Promise<void>;
  onVai: (chiave: string) => void;
  /** I pezzi della planimetria (102) e le loro copie (103): la copia selezionata (col pezzo), la selezione, il salvataggio,
   *  l'aggiunta di una copia accanto a quella selezionata e le eliminazioni (di una copia, o del pezzo con tutte le copie). */
  copiaSelezionata: CopiaPosata | null;
  /** Le dimensioni dell'immagine della mappa (null se non note). */
  immagineMappa: { larghezza: number; altezza: number } | null;
  onSelezionaCopia: (id: number | null) => void;
  onSalvaCopia: (id: number, dati: DatiAggiornaCopiaPezzo) => Promise<void>;
  onAggiungiCopia: (da: CopiaPosata) => Promise<void>;
  onEliminaCopia: (id: number) => Promise<void>;
  onEliminaPezzo: (id: number) => Promise<void>;
}

/** Pannello laterale dell'editor: strumenti, proprietà dello spillo, immagine e proprietà della mappa, albero, esportazione/importazione. */
function PannelloEditor(p: PropsPannello) {
  const { mappa, strumento, tipoNuovo, selezionato, occupato, appunti } = p;
  const inputImmagine = useRef<HTMLInputElement | null>(null);
  const inputImporta = useRef<HTMLInputElement | null>(null);
  const [sovrascrivi, setSovrascrivi] = useState(false);
  const {sezione,onSezione:setSezione} = p;
  // solo la pianta di un quartiere si scarica dalla guida: quella delle aree dei Palazzi non c'è più (rotta tolta il 2026-09-18)
  // l'immagine di base con la regola di ogni vista (`useImmagineMappa`, L1): la caricata, poi l'asset dichiarato se sta nel
  // manifesto degli asset — la stessa che il visore qui accanto mostra; prima l'editor la ricalcolava per conto suo
  const immagineDiBase = useImmagineMappa(mappa);
  // una mappa si «raggiunge» da questa se uno spillo (passaggio, stazione o altro) punta a lei: le figlie senza spillo e il genitore senza ritorno vengono segnalati
  const raggiunge = (destinazione: string) => mappa.spilli.some((s) => destinazioneMappaSpillo(s) === destinazione);
  const aggiunta = paginaPerAggiungere(mappa, p.albero);
  return (
    <>
      <nav className="editor-mappa__sezioni" aria-label="Sezioni dell’editor">
        {[['spilli','Spilli'],['pezzi','Pezzi'],['mappa','Mappa'],['collegamenti','Collegamenti'],['file','File']].map(([id,nome]) => <button key={id} type="button" aria-pressed={sezione === id} onClick={() => setSezione(id)}>{nome}</button>)}
      </nav>
      {/* I pezzi della planimetria (102, 2026-10-14): zone dell'immagine scelte dall'utente, cancellate e posate altrove con condizioni */}
      <div hidden={sezione !== 'pezzi'} className="editor-mappa__contenuto">
      <section className="visore-mappa__sezione" aria-label="Pezzi della planimetria">
        <h3 className="visore-mappa__intestazione">Pezzi</h3>
        <p className="m-0 testo-12 text-text-muted">Le parti disegnate a parte nell’immagine (muri mobili, passerelle…): con «Ritaglia pezzo» trascini un rettangolo attorno a una, che sparisce dalla mappa e diventa un pezzo da posare dove va, della stessa misura, con le condizioni che lo mostrano.</p>
        <PulsanteVisivo tono="secondario" compatto attivo={strumento === 'ritaglia'} icona={<IconaAzione chiave="seleziona" dimensione={20} />} titolo="Ritaglia pezzo" dettaglio={strumento === 'ritaglia' ? 'trascina un rettangolo sulla mappa' : 'poi trascina sulla mappa'}
          disabled={occupato || !immagineDiBase} onClick={() => p.onStrumento(strumento === 'ritaglia' ? 'seleziona' : 'ritaglia')} />
        {!immagineDiBase && <p className="m-0 testo-12 text-text-muted">Serve un’immagine di base da cui ritagliare.</p>}
        {p.copiaSelezionata && <p className="m-0 testo-12 text-text-muted">Copia selezionata: con il fuoco sulla sua voce dell’elenco, le frecce la spostano di 1 px, con Maiusc di 10; la posizione si scrive anche nei campi X e Y qui sotto.</p>}
        {mappa.pezzi.length === 0
          ? <p className="m-0 testo-12 text-text-muted">Nessun pezzo su questa mappa.</p>
          : (
            // ogni pezzo con le sue copie (103): il nome e la zona del ritaglio, poi una voce per copia
            <ul className="m-0 p-0 list-none flex flex-col gap-1" aria-label="Pezzi di questa mappa">
              {mappa.pezzi.map((pz) => (
                <li key={pz.id}>
                  <p className="m-0 px-2 pt-1 flex items-baseline gap-2 testo-12">
                    <span className="flex-1 min-w-0 truncate font-semibold">{pz.nome}</span>
                    <span className="testo-12 text-text-muted shrink-0">{pz.sorgente.larghezza}×{pz.sorgente.altezza} px · {pz.copie.length === 1 ? '1 copia' : `${pz.copie.length} copie`}</span>
                  </p>
                  <ul className="m-0 pl-3 list-none flex flex-col" aria-label={`Copie di ${pz.nome}`}>
                    {pz.copie.map((c, i) => {
                      const attiva = c.id === p.copiaSelezionata?.copia.id;
                      return (
                        <li key={c.id}>
                          <button type="button" data-copia-id={c.id} className={`visore-mappa__voce ${attiva ? 'visore-mappa__voce--attiva' : ''}`} aria-pressed={attiva} onClick={() => p.onSelezionaCopia(attiva ? null : c.id)}>
                            <span className="flex-1 min-w-0 truncate">{nomeCopia(pz, c, i)}</span>
                            <span className="testo-12 text-text-muted shrink-0">{c.posizione.x}, {c.posizione.y}{c.rotazione ? ` · ${c.rotazione}°` : ''}{c.condizioni.length ? ` · ${c.condizioni.length === 1 ? '1 condizione' : `${c.condizioni.length} condizioni`}` : ''}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
      </section>
      {p.copiaSelezionata && (() => {
        const { pezzo, copia, indice } = p.copiaSelezionata;
        return (
          <FormPezzo key={`${copia.id}-${copia.updatedAt}-${pezzo.updatedAt}-${pezzo.copie.length}`} pezzo={pezzo} copia={copia} indice={indice} immagine={p.immagineMappa}
            elenchi={p.elenchi} occupato={occupato} onSalva={(d) => p.onSalvaCopia(copia.id, d)} onAggiungiCopia={() => p.onAggiungiCopia(p.copiaSelezionata!)}
            onEliminaCopia={() => p.onEliminaCopia(copia.id)} onEliminaPezzo={() => p.onEliminaPezzo(pezzo.id)} onChiudi={() => p.onSelezionaCopia(null)} />
        );
      })()}
      </div>
      <div hidden={sezione !== 'spilli'} className="editor-mappa__contenuto">
      <section className="visore-mappa__sezione" aria-label="Strumenti">
        <h3 className="sr-only">Strumenti</h3>
        <div className="editor-mappa__strumenti" role="group" aria-label="Strumento attivo">
          <PulsanteVisivo tono="secondario" compatto attivo={strumento === 'seleziona'} icona={<IconaAzione chiave="seleziona" dimensione={20} />} titolo="Seleziona" dettaglio="tocca o trascina" onClick={() => p.onStrumento('seleziona')} />
          <PulsanteVisivo tono="secondario" compatto attivo={strumento === 'aggiungi'} icona={<IconaAzione chiave="carica-altri" dimensione={20} />} titolo="Aggiungi" dettaglio="tocca la mappa" onClick={() => p.onStrumento('aggiungi')} />
          <PulsanteVisivo tono="secondario" compatto attivo={strumento === 'incolla'} icona={<IconaAzione chiave="incolla" dimensione={20} />} titolo="Incolla" dettaglio={appunti ? `«${appunti.nome}»` : 'copia prima uno spillo'} disabled={!appunti} onClick={() => p.onStrumento('incolla')} />
        </div>
        {/* le condizioni con cui nasce ogni pin nuovo (2026-11-14): subito sotto gli strumenti, prima della tavolozza dei tipi, così si
            vedono senza scorrere anche sul telefono; vuote occupano una riga */}
        {strumento === 'aggiungi' && (
          <CondizioniEditor titolo="Condizioni dei pin nuovi" testoVuoto="nessuna: i pin nascono senza condizioni" condizioni={p.condizioniNuovi} onCambia={p.onCondizioniNuovi}
            elenchi={p.elenchi} disabilitato={occupato} perSpillo contesto={{ mappa: mappa.chiave, palazzo: mappa.palazzo ?? null }} />
        )}
        {strumento === 'aggiungi' && (
          <div className="flex flex-col gap-1.5" role="group" aria-label="Tipo del nuovo spillo">
            {CATEGORIE_SPILLO.map((c) => (
              <div key={c} className="flex flex-col gap-0.5">
                <span className="editor-mappa__gruppo" title={DEFINIZIONI_CATEGORIA[c].descrizione}>{DEFINIZIONI_CATEGORIA[c].nome}</span>
                <div className="editor-mappa__palette">
                  {tipiDellaCategoria(c).map((t) => (
                    <button key={t} type="button" className={`editor-mappa__tipo ${t === tipoNuovo ? 'editor-mappa__tipo--attivo' : ''}`} aria-pressed={t === tipoNuovo} title={DEFINIZIONI_SPILLO[t].nome} onClick={() => p.onTipoNuovo(t)}>
                      <PuntoSpillo tipo={t} colore={DEFINIZIONI_SPILLO[t].colore} />
                      <span className="truncate">{DEFINIZIONI_SPILLO[t].nome}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {strumento === 'aggiungi' && p.condizioniNuovi.length > 0 && !ammetteCondizioni(tipoNuovo) && (
          <p className="m-0 testo-12 text-warning" role="note">Il tipo «{DEFINIZIONI_SPILLO[tipoNuovo].nome}» non ammette condizioni: questo pin nasce senza.</p>
        )}
        {/* con un altro strumento resta il segno che le condizioni dei pin nuovi sono attive: un tocco riporta ad «Aggiungi» */}
        {strumento !== 'aggiungi' && p.condizioniNuovi.length > 0 && (
          <button type="button" className="chip chip--attivo chip--icona touch self-start testo-12" onClick={() => p.onStrumento('aggiungi')}
            title="Ogni pin nuovo di questa mappa nasce con queste condizioni, finché resti in questo editor">
            <IconaAzione chiave="bloccato" dimensione={14} />Pin nuovi con {p.condizioniNuovi.length === 1 ? '1 condizione' : `${p.condizioniNuovi.length} condizioni`}
          </button>
        )}
        {strumento !== 'seleziona' && <p className="m-0 testo-12 text-text-muted">{strumento === 'aggiungi' ? (p.condizioniNuovi.length > 0 && ammetteCondizioni(tipoNuovo) ? 'Tocca la mappa dove vuoi lo spillo: viene creato subito con il tipo scelto e le condizioni dei pin nuovi.' : 'Tocca la mappa dove vuoi lo spillo: viene creato subito con il tipo scelto.') : `Tocca la mappa dove vuoi la copia di «${appunti?.nome ?? 'spillo'}»: stesso tipo, nome, descrizione, riferimento e condizioni di visibilità; gli appunti restano per altre copie, anche su altre mappe.`}</p>}
      </section>

      {selezionato && (
        <FormSpillo key={`${selezionato.id}:${p.versioneFormSpillo}`} spillo={selezionato} mappa={mappa} albero={p.albero} occupato={occupato} onSalva={(d) => p.onSalvaSpillo(selezionato.id, d)} onCopia={p.onCopia} onElimina={() => p.onEliminaSpillo(selezionato.id)} elenchi={p.elenchi} onCreaMappaCollegata={() => p.onCreaMappaCollegata(selezionato)} onCreaLuogoDaPin={() => p.onCreaLuogoDaPin(selezionato)} onChiudi={() => p.onSeleziona(null)} onVai={p.onVai} onCollegaVoce={(voce, collega) => p.onCollegaVoce(selezionato.id, voce, collega)} />
      )}

      {!selezionato && strumento === 'seleziona' && <p className="editor-mappa__aiuto">Tocca uno spillo per modificarlo, trascinalo per spostarlo. Da tastiera: Tab fino allo spillo, Invio per selezionarlo.</p>}
      </div>
      <div hidden={sezione !== 'mappa'} className="editor-mappa__contenuto">
      <section className="visore-mappa__sezione" aria-label="Immagine di base">
        <h3 className="visore-mappa__intestazione">Immagine di base</h3>
        <p className="m-0 testo-12 text-text-muted">{mappa.immagineUrl ? `Immagine dell'istanza${mappa.larghezza && mappa.altezza ? ` · ${mappa.larghezza}×${mappa.altezza}` : ''}` : mappa.asset ? (immagineDiBase ? 'Immagine predefinita dell’app.' : 'Immagine non disponibile: gli spilli stanno su una griglia.') : 'Nessuna immagine: gli spilli stanno su una griglia.'} Cambiare immagine mantiene gli spilli (coordinate in percentuale).</p>
        <input ref={inputImmagine} type="file" accept="image/*" className="sr-only" aria-label="File dell'immagine di base" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) void p.onImmagine(f); e.target.value = ''; }} />
        <div className="flex flex-wrap gap-1.5">
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="carica" dimensione={20} />} titolo={mappa.immagineUrl ? 'Sostituisci immagine' : 'Carica immagine'} disabled={occupato} onClick={() => inputImmagine.current?.click()} />
        </div>
      </section>

      {/* FUN2-8: il server non mette nel mondo una planimetria senza Area; il suo messaggio resta qui, con le due strade */}
      {p.avvisoMondo && (
        <div role="alert" aria-label="La mappa non si sposta lì" className="flex flex-col gap-1.5 rounded-md border border-warning/60 bg-white/[0.04] p-2 testo-13">
          <p className="m-0">{p.avvisoMondo.messaggio}</p>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {p.avvisoMondo.aggiunta && <Link className="touch inline-flex items-center text-primary-testo" to={p.avvisoMondo.aggiunta.href}>{p.avvisoMondo.aggiunta.testo}</Link>}
            <Link className="touch inline-flex items-center text-primary-testo" to="/guida/citta">Planimetrie da collocare</Link>
            <PulsanteVisivo tono="fantasma" compatto className="ml-auto" icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Chiudi" aria-label="Chiudi l’avviso" onClick={p.onChiudiAvvisoMondo} />
          </span>
        </div>
      )}
      <FormMappa key={mappa.chiave + mappa.updatedAt} mappa={mappa} albero={p.albero} occupato={occupato} onSalva={p.onSalvaMappa} onElimina={p.onEliminaMappa} />

      </div>
      <div hidden={sezione !== 'collegamenti'} className="editor-mappa__contenuto">
      <section className="visore-mappa__sezione" aria-label="Albero delle mappe">
        <h3 className="visore-mappa__intestazione">Albero</h3>
        <p className="m-0 testo-12 text-text-muted">L'albero dice chi contiene chi; sulla mappa ci si sposta con gli spilli «passaggio». Una figlia «senza passaggio» si raggiunge solo da qui.</p>
        {mappa.genitore && (
          <div className="flex flex-col gap-1">
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="indietro" dimensione={20} />} titolo={`Su: ${mappa.genitoreNome ?? mappa.genitore}`} onClick={() => p.onVai(mappa.genitore!)} />
            {!raggiunge(mappa.genitore) && (
              <div className="editor-mappa__senza-passaggio">
                <span className="flex-1 min-w-0">Nessun passaggio di ritorno verso «{mappa.genitoreNome ?? mappa.genitore}».</span>
                <PulsanteVisivo compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Crea passaggio di ritorno" disabled={occupato} onClick={() => void p.onCreaPassaggio(mappa.genitore!)} />
              </div>
            )}
          </div>
        )}
        {mappa.figli.length > 0 && (
          <ul className="m-0 p-0 list-none flex flex-col gap-1" aria-label="Mappe figlie">
            {mappa.figli.map((f) => (
              <li key={f.chiave} className="flex flex-col">
                <button type="button" className="visore-mappa__figlia" onClick={() => p.onVai(f.chiave)}>
                  <IconaSpillo tipo="passaggio" dimensione={18} />
                  <span className="flex-1 min-w-0 truncate">{etichettaPlanimetria(f)}</span>
                  <span className="testo-12 text-text-muted">{NOME_TIPO_MAPPA[f.tipo]}{f.numeroSpilli > 0 ? ` · ${f.numeroSpilli}` : ''}</span>
                </button>
                {!raggiunge(f.chiave) && (
                  <div className="editor-mappa__senza-passaggio">
                    <span className="flex-1 min-w-0">Senza passaggio da questa mappa.</span>
                    <PulsanteVisivo compatto className="shrink-0" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Crea passaggio" disabled={occupato} onClick={() => void p.onCreaPassaggio(f.chiave)} aria-label={`Crea passaggio verso ${nomePresentazioneMappa(f)}`} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {/* R11-14: «Nuova mappa» generica non esiste più: aree e planimetrie nascono dalle loro pagine (L2, R2-27, e i Palazzi dalla scheda del Palazzo) */}
        {aggiunta && <Link to={aggiunta.href} className="visore-mappa__azione-testo touch inline-flex items-center">{aggiunta.testo}</Link>}
      </section>
      <PassaggiMappa mappa={mappa} albero={p.albero} occupato={occupato} onVai={p.onVai} onCreaPassaggio={(k) => void p.onCreaPassaggio(k)} />

      </div>
      <div hidden={sezione !== 'file'} className="editor-mappa__contenuto">
      <section className="visore-mappa__sezione" aria-label="Esportazione e importazione">
        <h3 className="visore-mappa__intestazione">Scambio</h3>
        <p className="m-0 testo-12 text-text-muted">Le mappe fanno parte dei dati di gioco: per portarle in un'altra istanza, o farne il dato predefinito dell'app, si usa il backup dei dati di gioco (Impostazioni → Backup dei dati di gioco). «Esporta» salva tutte le mappe in un file JSON, con le immagini dell'istanza, per copie e trasferimenti; «Importa» legge lo stesso formato.</p>
        <input ref={inputImporta} type="file" accept="application/json,.json" className="sr-only" aria-label="File delle mappe da importare" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) void p.onImporta(f, sovrascrivi); e.target.value = ''; }} />
        <div className="flex flex-wrap gap-1.5 items-center">
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Esporta" dettaglio="tutte le mappe, JSON" disabled={occupato} onClick={p.onEsporta} />
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="carica" dimensione={20} />} titolo="Importa" disabled={occupato} onClick={() => inputImporta.current?.click()} />
          {/* `touch` sull'etichetta: senza, il bersaglio era alto 19 px — l'unica casella dell'app
              rimasta senza, insieme a quella della merce (misurato, non dedotto). */}
          <label className="touch flex items-center gap-2 testo-12"><input type="checkbox" className="w-5 h-5" checked={sovrascrivi} onChange={(e) => setSovrascrivi(e.target.checked)} /> Sovrascrivi le mappe esistenti</label>
        </div>
      </section>
      </div>
    </>
  );
}

interface PropsFormSpillo { spillo: SpilloDto; mappa: MappaDto; albero: MappaRiassuntoDto[]; occupato: boolean; elenchi: ElenchiCondizioni; onSalva: (dati: Parameters<typeof aggiornaSpillo>[1]) => Promise<void>; onCopia: (a: AppuntiSpillo) => void; onElimina: () => Promise<void>; onCreaMappaCollegata: () => Promise<void>; onCreaLuogoDaPin: () => void; onChiudi: () => void; onVai: (chiave: string) => void; /** Collega o scollega una voce della guida (098). */ onCollegaVoce: (voce: string, collega: boolean) => Promise<void> }

// L3 (AD6): i termini della gerarchia — il pin indica un luogo o, dentro il luogo, uno dei suoi punti vendita (la macchina)
const COLLEGAMENTI_CITTA: Array<{ tipo: TipoRiferimento; nome: string }> = [{ tipo: 'negozio', nome: 'Punto vendita' }, { tipo: 'luogo', nome: 'Luogo' }, { tipo: 'confidente', nome: 'Confidente' }];

/** La radice di ogni mappa dell'albero (chiave → chiave della radice), risalendo i genitori; una mappa col genitore fuori dall'elenco è radice di sé. */
function radiciDelleMappe(albero: readonly MappaRiassuntoDto[]): Map<string, string> {
  const perChiave = new Map(albero.map((m) => [m.chiave, m]));
  const radici = new Map<string, string>();
  for (const m of albero) {
    let corrente = m;
    const visti = new Set<string>();
    while (corrente.genitore !== null && perChiave.has(corrente.genitore) && !visti.has(corrente.chiave)) { visti.add(corrente.chiave); corrente = perChiave.get(corrente.genitore)!; }
    radici.set(m.chiave, corrente.chiave);
  }
  return radici;
}

/** «Porta a»: la mappa d'arrivo e, se si vuole, uno spillo di quella mappa. Elenchi con ricerca, mai un punto da cliccare a mano. */
function DestinazioneSpostamento({ valore, mappaCorrente, albero, disabilitato, onCambia }: { valore: DestinazioneSpillo | null; mappaCorrente: string; albero: MappaRiassuntoDto[]; disabilitato: boolean; onCambia: (d: DestinazioneSpillo | null) => void }) {
  // 2026-11-14 (richiesta dell'utente): in una mappa di un Palazzo, prima le altre mappe dello stesso Palazzo, sotto il suo nome; poi le
  // mappe di fuori, per tipo come prima. L'ordinamento è stabile: dentro ogni fascia resta l'ordine dell'albero. Nelle mappe del mondo
  // (la loro radice è Tokyo intera) l'elenco resta com'era, per tipo
  const mappe = useMemo(() => {
    const radice = radiciDelleMappe(albero);
    const mia = radice.get(mappaCorrente);
    const palazzo = mia === undefined ? undefined : albero.find((m) => m.chiave === mia && m.radiceDi?.tipo === 'dungeon');
    const dentro = (m: MappaRiassuntoDto) => palazzo !== undefined && radice.get(m.chiave) === palazzo.chiave;
    return albero.filter((m) => m.chiave !== mappaCorrente)
      .map((m) => ({ m, opzione: { chiave: m.chiave, nome: etichettaPlanimetria(m), gruppo: dentro(m) && palazzo ? nomePresentazioneMappa(palazzo) : NOME_TIPO_MAPPA[m.tipo] } }))
      .sort((a, b) => Number(dentro(b.m)) - Number(dentro(a.m)))
      .map((x) => x.opzione);
  }, [albero, mappaCorrente]);
  const arrivo = useCarica(() => (valore?.mappa ? getMappa(valore.mappa) : Promise.resolve(null)), [valore?.mappa]);
  const spilli = useMemo(() => [{ chiave: '', nome: 'Nessuno: solo la mappa, adattata alla finestra' }, ...(arrivo.dati?.spilli ?? []).map((s) => ({ chiave: String(s.id), nome: s.nome, dettaglio: s.tipoNome }))], [arrivo.dati]);
  return (
    <fieldset className="m-0 p-0 border-0 flex flex-col gap-1.5" disabled={disabilitato}>
      <legend className="testo-12 text-text-secondary">Porta a</legend>
      <Selettore ricerca="sempre" etichetta="Mappa di arrivo" valore={valore?.mappa ?? ''} opzioni={mappe} segnaposto="Scegli la mappa…" onCambia={(k) => onCambia(k ? { mappa: k, spillo: null } : null)} />
      {valore && (arrivo.errore
        ? <p role="alert" className="m-0 testo-12">{arrivo.errore} <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={() => void arrivo.ricarica()} /></p>
        : <Selettore ricerca="sempre" etichetta="Spillo di arrivo (facoltativo)" valore={valore.spillo ? String(valore.spillo) : ''} opzioni={spilli} onCambia={(k) => onCambia({ mappa: valore.mappa, spillo: k ? Number(k) : null })} disabilitato={arrivo.caricamento} />)}
      {valore && <div className="flex gap-2"><PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Togli la destinazione" onClick={() => onCambia(null)} /></div>}
    </fieldset>
  );
}

/** Il chip di partenza di «Collegato a» senza un collegamento: il riferimento tipico del tipo di pin, se ammesso, altrimenti il luogo. */
function collegamentoTipico(tipoPin: TipoSpillo): TipoRiferimento {
  const tipico = DEFINIZIONI_SPILLO[tipoPin].riferimento;
  return tipico && riferimentiAmmessiPerTipo(tipoPin).includes(tipico) ? tipico : 'luogo';
}

/** «Collegato a»: un negozio, un luogo o un Confidente, scelto da un elenco con ricerca. Un pin già salvato con un'attività si legge ancora.
 *  Il chip è quello del collegamento; senza collegamento quello toccato per questo tipo di pin, altrimenti il riferimento tipico del tipo:
 *  è un valore derivato, quindi cambiare il tipo del pin lo aggiorna senza toccare il collegamento. */
function CollegamentoCitta({ valore, salvato, tipoPin, disabilitato, onCambia }: { valore: { tipo: TipoRiferimento; chiave: string } | null; salvato: { tipo: TipoRiferimento; chiave: string } | null; tipoPin: TipoSpillo; disabilitato: boolean; onCambia: (r: { tipo: TipoRiferimento; chiave: string } | null) => void }) {
  const [scelto, setScelto] = useState<{ tipoPin: TipoSpillo; tipo: TipoRiferimento } | null>(null);
  const tipo = valore?.tipo ?? (scelto?.tipoPin === tipoPin ? scelto.tipo : collegamentoTipico(tipoPin));
  // la voce salvata sul pin si chiede sempre, anche se è nascosta o fuori dalle prime cento: altrimenti il pin sembrerebbe scollegato
  const salvata = salvato?.tipo === tipo ? salvato.chiave : undefined;
  const voci = useCarica(() => (salvata ? cercaRiferimenti(tipo, '', 100, salvata) : cercaRiferimenti(tipo, '', 100)), [tipo, salvata]);
  const opzioni = useMemo(() => (voci.dati ?? []).map((r) => ({ chiave: r.chiave, nome: r.nome, dettaglio: r.dettaglio || undefined })), [voci.dati]);
  const etichetta = COLLEGAMENTI_CITTA.find((c) => c.tipo === tipo)?.nome ?? 'Collegamento';
  return (
    <fieldset className="m-0 p-0 border-0 flex flex-col gap-1.5" disabled={disabilitato}>
      <legend className="testo-12 text-text-secondary">Collegato a</legend>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Che cosa collegare">
        {COLLEGAMENTI_CITTA.map((c) => <button key={c.tipo} type="button" className={`chip chip--icona touch ${tipo === c.tipo ? 'chip--attivo' : ''}`} aria-pressed={tipo === c.tipo} onClick={() => { setScelto({ tipoPin, tipo: c.tipo }); if (valore && valore.tipo !== c.tipo) onCambia(null); }}>{c.nome}</button>)}
      </div>
      {voci.errore
        ? <p role="alert" className="m-0 testo-12">{voci.errore} <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={() => void voci.ricarica()} /></p>
        : <Selettore ricerca="sempre" etichetta={`Elenco: ${etichetta}`} valore={valore?.tipo === tipo ? valore.chiave : ''} opzioni={opzioni} segnaposto="Scegli…" onCambia={(k) => onCambia(k ? { tipo, chiave: k } : null)} disabilitato={voci.caricamento} />}
      {valore && <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Togli il collegamento" onClick={() => { setScelto({ tipoPin, tipo }); onCambia(null); }} />}
    </fieldset>
  );
}

/**
 * «Voci della guida» del pin (098, scelta dell'utente del 2026-10-09: «Guida ed editor»): le voci a cui appartiene, ognuna con
 * «Scollega», e «Aggiungi voce» fra quelle del suo Palazzo che si possono ancora collegare (`getVociCollegabili`). Ogni gesto si
 * salva subito, come «Collega pin» nella guida. Un pin fuori dai Palazzi, senza voci, non ne mostra niente.
 */
function VociDelPin({ spillo: s, disabilitato, onCollega }: { spillo: SpilloDto; disabilitato: boolean; onCollega: (voce: string, collega: boolean) => Promise<void> }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- le voci già collegate non entrano nella lettura: al loro cambio si rilegge
  const collegabili = useCarica(() => getVociCollegabili(s.id), [s.id, s.voci.map((v) => v.chiave)]);
  const opzioni = useMemo(() => (collegabili.dati ?? []).map((v) => ({ chiave: v.chiave, nome: v.nome, gruppo: v.areaNome, ...(v.enigma ? { dettaglio: 'passo di un Enigma' } : {}) })), [collegabili.dati]);
  if (s.voci.length === 0 && !collegabili.errore && opzioni.length === 0) return null;
  return (
    <fieldset className="m-0 p-0 border-0 flex flex-col gap-1.5" disabled={disabilitato}>
      <legend className="testo-12 text-text-secondary">Voci della guida ({s.voci.length})</legend>
      {s.voci.length > 0 && (
        <ul className="m-0 p-0 list-none flex flex-col gap-1" aria-label="Voci della guida del pin">
          {s.voci.map((v) => (
            <li key={v.chiave} className="flex items-center gap-1 testo-12">
              <strong className="min-w-0 flex-1 break-words">{v.nome}</strong>
              <PulsanteVisivo tono="fantasma" compatto className="shrink-0" icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Scollega" onClick={() => void onCollega(v.chiave, false)} aria-label={`Scollega la voce ${v.nome}`} />
            </li>
          ))}
        </ul>
      )}
      {s.voci.length > 0 && <p className="m-0 testo-12 text-text-muted">{s.voci.length === 1 ? 'Lo stato «ottenuto / esaurito» si condivide con la scheda del Palazzo.' : 'Ogni voce si segna da sola, anche dalla scheda del Palazzo; il pin è fatto quando lo sono tutte.'}</p>}
      {collegabili.errore
        ? <p role="alert" className="m-0 testo-12">{collegabili.errore} <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={() => void collegabili.ricarica()} /></p>
        : opzioni.length > 0 && <Selettore ricerca="sempre" etichetta="Aggiungi voce" valore="" opzioni={opzioni} segnaposto="Scegli la voce…" disabilitato={collegabili.caricamento} onCambia={(k) => { if (k) void onCollega(k, true); }} />}
    </fieldset>
  );
}

/** Proprietà dello spillo selezionato: nome, tipo e descrizione, poi quel che la categoria del tipo richiede. */
function FormSpillo({ spillo: s, mappa, albero, occupato, elenchi, onSalva, onCopia, onElimina, onCreaMappaCollegata, onCreaLuogoDaPin, onChiudi, onVai, onCollegaVoce }: PropsFormSpillo) {
  const idModulo = useId();
  // la mappa e il suo Palazzo o i Memento (dal server: l'albero dell'editor non ha le mappe dei Memento) per l'editor delle condizioni:
  // pin e voci della guida offerti partono da qui
  const contestoCondizioni = useMemo(() => ({ mappa: mappa.chiave, palazzo: mappa.palazzo ?? null }), [mappa.chiave, mappa.palazzo]);
  const [nome, setNome] = useState(s.nome);
  const [tipo, setTipo] = useState<TipoSpillo>(s.tipo);
  // L5 (F3): un pin di luogo mostra nome e descrizione del luogo (fonte unica); qui la descrizione è la **nota del pin** (`notaPin`), così
  // salvando non si scrive nel pin il testo del luogo
  const luogo = s.dettaglio?.luogo?.casa ? s.dettaglio.luogo : null;
  const descrizioneIniziale = luogo ? s.notaPin ?? '' : s.descrizione;
  const [descrizione, setDescrizione] = useState(descrizioneIniziale);
  const [spostando, setSpostando] = useState(false);
  /** «Sposta nel luogo»: aggiunge la nota del pin alle note del luogo (correzione del catalogo) e svuota il campo; lo spillo si salva poi. */
  const spostaNelLuogo = async () => {
    if (!luogo || !descrizione.trim()) return;
    setSpostando(true);
    try {
      const e = await getElementoCatalogo('luogo', luogo.chiave);
      const prima = typeof e.dati.note === 'string' ? e.dati.note.trim() : '';
      await aggiornaElementoCatalogo('luogo', luogo.chiave, { note: prima ? `${prima} · ${descrizione.trim()}` : descrizione.trim() });
      setDescrizione('');
      notifica('success', `Nota aggiunta alle note di «${luogo.nome}»: salva lo spillo per toglierla dal pin.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'La nota non è stata spostata.');
    } finally {
      setSpostando(false);
    }
  };
  const [riferimento, setRiferimento] = useState<{ tipo: TipoRiferimento; chiave: string } | null>(s.riferimento);
  const [condizioni, setCondizioni] = useState<RequisitoSpillo[]>(() => condizioniNude(s));
  // gli spostamenti di prima avevano solo il riferimento alla mappa: qui è la stessa cosa di una destinazione senza spillo
  const destinazioneIniziale: DestinazioneSpillo | null = s.destinazione ?? (s.riferimento?.tipo === 'mappa' ? { mappa: s.riferimento.chiave, spillo: null } : null);
  const [destinazione, setDestinazione] = useState<DestinazioneSpillo | null>(destinazioneIniziale);
  // L6-07 (WCAG 2.5.7): la posizione si scrive anche nei campi, in percentuale dell'immagine con una cifra decimale come il trascinamento;
  // `null` = la posizione salvata. Se lo spillo si sposta per altra via (trascinamento, frecce) i campi tornano alla posizione nuova.
  const [xTesto, setXTesto] = useState<string | null>(null);
  const [yTesto, setYTesto] = useState<string | null>(null);
  const [posizioneVista, setPosizioneVista] = useState({ x: s.x, y: s.y });
  if (posizioneVista.x !== s.x || posizioneVista.y !== s.y) { setPosizioneVista({ x: s.x, y: s.y }); setXTesto(null); setYTesto(null); }
  /** Il valore di un campo di posizione: fra 0 e 100, una cifra decimale; vuoto o non numerico vale la posizione salvata. */
  const percentuale = (testo: string | null, salvata: number) => {
    if (testo === null || testo.trim() === '') return salvata;
    const n = Number(testo.replace(',', '.'));
    return Number.isFinite(n) ? Math.round(Math.min(100, Math.max(0, n)) * 10) / 10 : salvata;
  };
  const x = percentuale(xTesto, s.x);
  const y = percentuale(yTesto, s.y);
  const posizioneCambiata = x !== s.x || y !== s.y;
  /** Nel mondo, la pagina da cui si aggiunge la mappa di destinazione al posto di «Crea mappa collegata» (null fuori). */
  const aggiunta = paginaPerAggiungere(mappa);
  const categoria = categoriaSpillo(tipo);
  // Cambiando categoria si tolgono le cose che quella categoria non ha: un collegamento estraneo non si salva.
  const cambiaTipo = (t: TipoSpillo) => {
    setTipo(t);
    const c = categoriaSpillo(t);
    if (riferimento && !riferimentiAmmessiPerTipo(t).includes(riferimento.tipo)) setRiferimento(null);
    if (c !== 'spostamento') setDestinazione(null);
    if (!ammetteCondizioni(t)) setCondizioni([]);
  };
  // Uno spostamento che **è** un luogo (una stazione) tiene quel riferimento: è la sua identità nel pacchetto, con cui lo si riconosce all’import; la voce della guida
  // sta altrove (`spillo_voce`, 098: una o più, «Voci della guida» qui sotto) e la destinazione vive a parte. Il riferimento «mappa» si
  // scrive solo per chi non ha un'identità propria (i passaggi vecchi lo usano come ripiego).
  const riferimentoEffettivo = categoria === 'spostamento'
    ? (riferimento && riferimento.tipo !== 'mappa' ? riferimento : (destinazione ? { tipo: 'mappa' as const, chiave: destinazione.mappa } : null))
    : riferimento;
  const dati = { nome: nome.trim() || s.nome, tipo, descrizione, riferimento: riferimentoEffettivo, condizioni: ammetteCondizioni(tipo) ? condizioni : [], destinazione: categoria === 'spostamento' ? destinazione : null, ...(posizioneCambiata ? { x, y } : {}) };
  const modificato = posizioneCambiata || dati.nome !== s.nome || tipo !== s.tipo || descrizione !== descrizioneIniziale
    || (dati.riferimento?.tipo ?? null) !== (s.riferimento?.tipo ?? null) || (dati.riferimento?.chiave ?? null) !== (s.riferimento?.chiave ?? null)
    || JSON.stringify(dati.condizioni) !== JSON.stringify(condizioniNude(s)) || JSON.stringify(dati.destinazione) !== JSON.stringify(categoria === 'spostamento' ? destinazioneIniziale : null);
  const puoCreareLuogo = pinCompatibileConNuovoLuogo(s);
  const azioneLuogo = puoCreareLuogo && <PulsanteVisivo tono="secondario" compatto
    icona={<IconaAzione chiave="carica-altri" dimensione={20} />} titolo="Crea luogo da questo pin"
    disabled={occupato || modificato || !s.uid} onClick={onCreaLuogoDaPin} />;
  const creaMappaCollegata = categoria === 'spostamento' && !destinazione && !aggiunta;
  const azioneLuogoNelCorpo = categoria !== 'citta' && azioneLuogo;
  /** Invio del modulo dello spillo: blocca il salvataggio se un gruppo di condizioni è vuoto o incompleto (lo notifica), altrimenti salva i dati composti sopra. */
  const salva = (e: FormEvent) => {
    e.preventDefault();
    if (!condizioni.every((c) => normalizzaRequisitoSpillo(c) !== null)) { notifica('error', 'Completa o rimuovi i gruppi vuoti prima di salvare.'); return; }
    void onSalva(dati);
  };
  const schedaRef = useRef<HTMLElement | null>(null);
  // «Salva spillo» sta nel piè fermo sul bordo del pannello; in più, se la cima della scheda appena scelta non è fra le sezioni ferme in alto e il
  // piè (parte sotto il bordo, a ≤860 px col pannello basso sotto la mappa, o è già passata sopra perché il pannello era scorso), il pannello si
  // porta su di lei, subito sotto le sezioni, così si vede che cosa si salva.
  useLayoutEffect(() => {
    const scheda = schedaRef.current;
    const pannello = scheda?.closest<HTMLElement>('.visore-mappa__pannello');
    if (!scheda || !pannello) return;
    const bordo = pannello.getBoundingClientRect();
    // il piè di questa scheda, che le sta subito accanto (non un altro piè del pannello)
    const piedeAccanto = scheda.nextElementSibling;
    const piede = piedeAccanto?.classList.contains('editor-mappa__piede') ? piedeAccanto.getBoundingClientRect().height : 0;
    const sezioni = pannello.querySelector('.editor-mappa__sezioni')?.getBoundingClientRect().height ?? 0;
    const cima = scheda.getBoundingClientRect().top;
    // 1 px di tolleranza per zoom e densità non interi
    if (cima >= bordo.top + sezioni - 1 && cima <= bordo.bottom - piede + 1) return;
    pannello.scrollTop += cima - bordo.top - sezioni;
  }, []);
  return (
    <>
    <section ref={schedaRef} className="visore-mappa__sezione visore-mappa__scheda" aria-label={`Proprietà dello spillo: ${s.nome}`}>
      <div className="flex items-start gap-2">
        <PuntoSpillo tipo={tipo} colore={DEFINIZIONI_SPILLO[tipo].colore} grande />
        <div className="flex-1 min-w-0">
          <h3 className="m-0 font-display testo-20 leading-tight break-words">{s.nome}</h3>
          <p className="m-0 testo-12 uppercase tracking-wide text-text-muted">{DEFINIZIONI_CATEGORIA[categoria].nome} · <span aria-live="polite">x {s.x}% · y {s.y}%</span> · {s.origine}</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onChiudi} aria-label="Chiudi le proprietà">×</button>
      </div>
      {/* Visitare l'arrivo è il gesto più frequente su uno spostamento: sta qui, non in fondo alle azioni. */}
      {categoria === 'spostamento' && destinazione && (
        <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Apri l’arrivo" dettaglio={s.destinazioneNomi?.mappa ?? undefined} onClick={() => onVai(destinazione.mappa)} />
      )}
      <form id={idModulo} className="flex flex-col gap-2" onSubmit={salva}>
        <label className="editor-mappa__campo">Nome<input className="form-input" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={LIMITI_GUIDA.spillo.nome} readOnly={!!luogo} aria-describedby={luogo ? 'spillo-dal-luogo' : undefined} /></label>
        {luogo && <p id="spillo-dal-luogo" className="m-0 flex flex-wrap items-center gap-1.5 testo-12 text-text-muted">Nome e descrizione vengono dal luogo «{luogo.nome}»: qui si scrive solo la nota del pin.
          <Link to={luogo.casa!} className="touch inline-flex items-center text-primary-testo">Modifica il luogo</Link></p>}
        <div className="editor-mappa__campo">
          {/* L3 (AD6): «Segno sulla mappa», non «Tipo»: dice l'icona del pin, non che cosa è il posto né che cosa vende */}
          <Selettore etichetta="Segno sulla mappa" valore={tipo} opzioni={CATEGORIE_SPILLO.flatMap((c) => tipiDellaCategoria(c).map((t) => ({ chiave: t, nome: DEFINIZIONI_SPILLO[t].nome, gruppo: DEFINIZIONI_CATEGORIA[c].nome })))} onCambia={(k) => cambiaTipo(k as TipoSpillo)} />
        </div>
        {/* un informativo con uno stato suo (meccanismo, punto sensibile, nemico, porta chiusa: 2026-10-03) non è «un segno e basta» */}
        <p className="m-0 testo-12 text-text-muted">{categoria === 'informativo' && statoDelTipo(tipo) ? `Un segno sulla mappa con uno stato da segnare nella partita («${statoDelTipo(tipo)}»); non conta nel completamento della mappa.` : DEFINIZIONI_CATEGORIA[categoria].descrizione}</p>
        {/* un pin di città con uno stato suo (il Confidente, «incontrato»: 2026-10-03) */}
        {categoria === 'citta' && statoDelTipo(tipo) && <p className="m-0 testo-12 text-text-muted">Ha uno stato da segnare nella partita («{statoDelTipo(tipo)}»); non conta nel completamento della mappa.</p>}
        <label className="editor-mappa__campo">{luogo ? 'Nota del pin' : 'Descrizione'}<textarea className="form-input" rows={3} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} maxLength={LIMITI_GUIDA.spillo.descrizione} /></label>
        {luogo && descrizione && <div className="flex flex-wrap gap-1.5">
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli la nota" disabled={occupato || spostando} onClick={() => setDescrizione('')} />
          {/* L5 (M §4.4): la nota va nelle note del luogo, poi il campo si svuota; salvando lo spillo la nota esce dal pin (due gesti espliciti) */}
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="incolla" dimensione={20} />} titolo="Sposta nel luogo" disabled={occupato || spostando} onClick={() => void spostaNelLuogo()} />
        </div>}

        <fieldset className="m-0 p-0 border-0 flex flex-col gap-1.5">
          <legend className="testo-12 text-text-secondary mb-1">Posizione sulla mappa (percentuale dell’immagine)</legend>
          <div className="flex flex-wrap items-end gap-2">
            <label className="editor-mappa__campo w-24">X<input className="form-input" type="number" inputMode="decimal" min={0} max={100} step={0.1} value={xTesto ?? String(s.x)} onChange={(e) => setXTesto(e.target.value)} disabled={occupato} /></label>
            <label className="editor-mappa__campo w-24">Y<input className="form-input" type="number" inputMode="decimal" min={0} max={100} step={0.1} value={yTesto ?? String(s.y)} onChange={(e) => setYTesto(e.target.value)} disabled={occupato} /></label>
          </div>
          {/* l'unica istruzione sulle frecce: il pin selezionato la usa anche come descrizione per i lettori di schermo */}
          <span className="testo-12 text-text-muted">Si salva con «Salva spillo». <span id={ID_FRECCE_SPILLO}>Sulla mappa, con lo spillo selezionato: frecce di 1 px, con Maiusc di 10.</span></span>
        </fieldset>
        {categoria === 'spostamento' && <DestinazioneSpostamento valore={destinazione} mappaCorrente={mappa.chiave} albero={albero} disabilitato={occupato} onCambia={setDestinazione} />}
        {categoria === 'citta' && <CollegamentoCitta valore={riferimento} salvato={s.riferimento} tipoPin={tipo} disabilitato={occupato} onCambia={setRiferimento} />}
        {categoria === 'citta' && azioneLuogo}
        {puoCreareLuogo && (modificato || !s.uid) && <p className="editor-mappa__avviso">{!s.uid ? 'Ricarica la mappa per recuperare l’identità del pin.' : 'Salva prima le modifiche del pin.'}</p>}
        <VociDelPin spillo={s} disabilitato={occupato} onCollega={onCollegaVoce} />
        {categoria === 'consumabile' && <p className="m-0 testo-12 text-text-muted">Si segna nella partita («{statoDelTipo(tipo)}»); non porta da nessuna parte.</p>}
        {ammetteCondizioni(tipo) && <CondizioniEditor condizioni={condizioni} onCambia={setCondizioni} elenchi={elenchi} disabilitato={occupato} perSpillo pinCorrente={s.uid} contesto={contestoCondizioni} />}

        {/* le azioni sul pin (non il salvataggio) stanno nel corpo; «Salva» ed «Elimina» nel piè fermo del pannello (AD10) */}
        <div className="flex flex-wrap gap-1.5">
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="copia" dimensione={20} />} titolo="Copia" dettaglio="per incollarlo altrove" disabled={occupato} onClick={() => onCopia({ tipo, nome: dati.nome, descrizione, riferimento: dati.riferimento, condizioni: dati.condizioni, destinazione: dati.destinazione })} />
          {creaMappaCollegata && <PulsanteVisivo tono="secondario" compatto icona={<IconaSpillo tipo="passaggio" dimensione={20} />} titolo="Crea mappa collegata" disabled={occupato || modificato} onClick={() => void onCreaMappaCollegata()} />}
          {azioneLuogoNelCorpo}
        </div>
        {/* nel mondo la mappa di destinazione non nasce dallo spillo: si aggiunge come area o planimetria e poi si sceglie qui sopra (L2, R2-27) */}
        {categoria === 'spostamento' && !destinazione && aggiunta && <Link to={aggiunta.href} className="visore-mappa__azione-testo touch inline-flex items-center">{aggiunta.testo}</Link>}
        {modificato && creaMappaCollegata && <span className="editor-mappa__avviso">Salva le modifiche prima di creare la mappa collegata.</span>}
      </form>
    </section>
    {/* il piè sta fuori dalla scheda, accanto: sticky nel contenuto del pannello (non nel modulo, che comincia sotto gli strumenti) e
        quindi sul bordo basso del pannello anche quando il modulo è ancora fuori vista o si scorre; «Salva» è del modulo (`form`) */}
    <div className="editor-mappa__piede">
      <PulsanteVisivo type="submit" form={idModulo} tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva spillo" disabled={occupato || !modificato} />
      <PulsanteVisivo tono="pericolo" compatto className="ml-auto" icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" disabled={occupato} onClick={() => void onElimina()} />
    </div>
    </>
  );
}

interface PropsFormMappa { mappa: MappaDto; albero: MappaRiassuntoDto[]; occupato: boolean; onSalva: (dati: Parameters<typeof aggiornaMappa>[1]) => Promise<void>; onElimina: () => void }

/** Proprietà della mappa (nome, tipo, genitore, ordine, note); il nome dedotto da confermare si segnala sotto il campo Nome. */
function FormMappa({ mappa, albero, occupato, onSalva, onElimina }: PropsFormMappa) {
  const idModulo = useId();
  const [nome, setNome] = useState(mappa.nome);
  const [tipo, setTipo] = useState<TipoMappa>(mappa.tipo);
  const [genitore, setGenitore] = useState<string>(mappa.genitore ?? '');
  const [ordine, setOrdine] = useState(String(mappa.ordine));
  const [note, setNote] = useState(mappa.note);
  // un discendente non può diventare genitore
  const discendenti = useMemo(() => {
    const out = new Set<string>([mappa.chiave]);
    let aggiunti = true;
    while (aggiunti) { aggiunti = false; for (const m of albero) if (m.genitore && out.has(m.genitore) && !out.has(m.chiave)) { out.add(m.chiave); aggiunti = true; } }
    return out;
  }, [albero, mappa.chiave]);
  // una planimetria di un'Area sta dove la mette l'Area: tipo e genitore non si cambiano da qui (L2, `modifiche.md` §4.6)
  const dellArea = !!mappa.area;
  const modificata = nome !== mappa.nome || tipo !== mappa.tipo || genitore !== (mappa.genitore ?? '') || Number(ordine) !== mappa.ordine || note !== mappa.note;
  // Finché il nome non è dichiarato, in alto si legge quello dedotto da contesti e gruppo di
  // immagini: qui si dice quale dei due si sta guardando, e Salva resta attivo anche senza
  // modifiche, perché chi il nome l'aveva già corretto non avrebbe più niente da cambiare.
  const titoloMostrato = nomePresentazioneMappa(mappa);
  const nomeDaConfermare = !mappa.nomeRivisto && titoloMostrato !== mappa.nome;
  return (
    <>
    <section className="visore-mappa__sezione" aria-label="Proprietà della mappa">
      <h3 className="visore-mappa__intestazione">Mappa</h3>
      <form id={idModulo} className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); void onSalva({ nome: nome.trim() || mappa.nome, ...(dellArea ? {} : { tipo, genitore: genitore || null }), ordine: Math.max(0, Math.round(Number(ordine) || 0)), note }); }}>
        <label className="editor-mappa__campo">Nome<input className="form-input" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={LIMITI_GUIDA.mappa.nome} /></label>
        {nomeDaConfermare && <p className="editor-mappa__avviso" role="status">In alto si legge «{titoloMostrato}»: è il nome ricavato dai dati dell’estrazione. Salva per usare «{mappa.nome}» dappertutto.</p>}
        <div className="grid grid-cols-2 gap-2">
          {!dellArea && (
            <div className="editor-mappa__campo">
              <Selettore etichetta="Tipo di mappa" valore={tipo} opzioni={TIPI_MAPPA.map((t) => ({ chiave: t, nome: NOME_TIPO_MAPPA[t] }))} onCambia={(k) => setTipo(k as TipoMappa)} />
            </div>
          )}
          <label className="editor-mappa__campo">Ordine<input className="form-input" type="number" min={0} value={ordine} onChange={(e) => setOrdine(e.target.value)} /></label>
        </div>
        {dellArea && mappa.area
          ? <p className="m-0 testo-12 text-text-muted">Planimetria dell’area «{mappa.area.nome}» ({mappa.area.contenitore.nome}){mappa.area.versioneEtichetta ? `, versione «${mappa.area.versioneEtichetta}»` : ''}: l’area e le sue versioni si cambiano dalla <Link to={mappa.area.casa} className="link-in-riga">pagina dell’area</Link>.</p>
          : (
            <div className="editor-mappa__campo">
              <Selettore etichetta="Mappa genitore" valore={genitore} vuoto="— nessuna (radice) —" opzioni={albero.filter((m) => !discendenti.has(m.chiave)).map((m) => ({ chiave: m.chiave, nome: etichettaPlanimetria(m), dettaglio: NOME_TIPO_MAPPA[m.tipo] }))} onCambia={setGenitore} />
            </div>
          )}
        <label className="editor-mappa__campo">Note<textarea className="form-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={LIMITI_GUIDA.mappa.note} /></label>
      </form>
    </section>
    {/* piè fermo sul bordo basso del pannello (AD10): «Salva mappa» è sempre in vista; «Salva» è del modulo (`form`) */}
    <div className="editor-mappa__piede">
      <PulsanteVisivo type="submit" form={idModulo} tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva mappa" dettaglio={!modificata && nomeDaConfermare ? 'conferma il nome' : undefined} disabled={occupato || (!modificata && !nomeDaConfermare)} />
      <PulsanteVisivo tono="pericolo" compatto className="ml-auto" icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina mappa" disabled={occupato} onClick={onElimina} />
    </div>
    </>
  );
}
