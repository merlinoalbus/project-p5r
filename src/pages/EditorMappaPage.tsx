import { etichettaPlanimetria, nomePresentazioneMappa, presentaMappa } from '../utils/presentazioneMappa';
import { RisolviMappa } from '../components/mappe/RisolviMappa';
import { destinazioneMappaSpillo } from '../utils/navigazioneMappa';
import { Selettore } from '../components/shared/Selettore';
import type { DestinazioneSpillo } from '../types';
import { CondizioniEditor } from '../components/guida/CondizioniEditor';
// ============================================================
// EditorMappaPage — editor di una mappa a livelli (Fase 13.3): strumenti seleziona/sposta e aggiungi, proprietà dello spillo con
// riferimento cercato fra le entità della guida, immagine di base, proprietà e albero delle mappe, esportazione/importazione
// ============================================================
//
// Ogni modifica viene salvata subito tramite l'API (niente stato «non salvato» da perdere); il posizionamento degli spilli esiste solo qui.
// ============================================================

import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { aggiornaImmagineSpillo, aggiornaMappa, aggiornaSpillo, aggiungiImmagineSpillo, caricaImmagineMappa, cercaRiferimenti, creaMappa, creaPassaggio, creaSpillo, eliminaImmagineSpillo, eliminaMappa, eliminaSpillo, esportaMappe, getAlberoMappe, getConfidenti, getDungeons, getMappa, getQuartieri, getRichieste, importaMappe, scaricaPianta, scaricaPiantaQuartiere } from '../services/api';
import { notifica } from '../stores/notificationStore';
import { useAsset } from '../stores/assetStore';
import { PageState } from '../components/shared/PageState';
import { Modal } from '../components/shared/Modal';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { VisoreMappa, GalleriaSpillo, type StrumentiEditor, type StrumentoEditor } from '../components/mappe/VisoreMappa';
import { IconaSpillo, PuntoSpillo } from '../components/mappe/IconaSpillo';

import { ELENCHI_VUOTI, type ElenchiCondizioni } from '../utils/condizioniSpillo';
import { normalizzaRequisitoSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo';
import { CATEGORIE_SPILLO, DEFINIZIONI_CATEGORIA, DEFINIZIONI_SPILLO, NOME_TIPO_MAPPA, RIFERIMENTI_PER_CATEGORIA, TIPI_MAPPA, categoriaSpillo, tipiDellaCategoria, type TipoMappa, type TipoRiferimento, type TipoSpillo } from '../../shared/spilli';
import { slug } from '../../shared/slug';
import type { EsportazioneMappeDto, MappaDto, MappaRiassuntoDto, SpilloDto } from '../types';


function messaggio(err: unknown, predefinito: string): string { return err instanceof Error ? err.message : predefinito; }

/** Spillo copiato negli appunti dell'editor: tutti i campi tranne la posizione; sopravvive al cambio di mappa e alla ricarica della pagina. */
export interface AppuntiSpillo { destinazione?: DestinazioneSpillo | null; tipo: TipoSpillo; nome: string; descrizione: string; riferimento: { tipo: TipoRiferimento; chiave: string } | null; condizioni: RequisitoSpillo[] }
/** Le condizioni dello spillo senza il testo descrittivo del server (è il server a ricalcolarlo). */
function condizioniNude(s: SpilloDto): RequisitoSpillo[] {
  return s.condizioni.map((c) => { const copia: Record<string, unknown> = { ...c }; delete copia.testo; return copia as unknown as RequisitoSpillo; });
}
const CHIAVE_APPUNTI = 'p5r.editor.appunti-spillo';
function leggiAppunti(): AppuntiSpillo | null {
  try { const raw = sessionStorage.getItem(CHIAVE_APPUNTI); return raw ? (JSON.parse(raw) as AppuntiSpillo) : null; } catch { return null; }
}
function scriviAppunti(a: AppuntiSpillo | null): void {
  try { if (a) sessionStorage.setItem(CHIAVE_APPUNTI, JSON.stringify(a)); else sessionStorage.removeItem(CHIAVE_APPUNTI); } catch { /* memoria di sessione non disponibile: gli appunti restano solo in pagina */ }
}

export function EditorMappaPage() {
  const { chiave = '' } = useParams<{ chiave: string }>();
  return <RisolviMappa chiave={chiave}>{k => <EditorMappaRisolta key={k} chiave={k} />}</RisolviMappa>;
}

function EditorMappaRisolta({ chiave }: { chiave: string }) {
  const navigate = useNavigate();
  const { dati, caricamento, errore, ricarica } = useCarica(() => getMappa(chiave), [chiave]);
  const albero = useCarica(() => getAlberoMappe(), [chiave]);
  // elenchi per le condizioni di visibilità (Confidenti, quartieri, richieste, Palazzi): una volta per pagina
  const elenchi = useCarica<ElenchiCondizioni>(async () => {
    const [confidenti, quartieri, richieste, dungeon] = await Promise.all([getConfidenti(), getQuartieri(), getRichieste(), getDungeons()]);
    return { confidenti, quartieri, richieste: richieste.richieste, dungeon };
  }, []);
  const [strumento, setStrumento] = useState<StrumentoEditor>('seleziona');
  const [appunti, setAppunti] = useState<AppuntiSpillo | null>(leggiAppunti);
  const [tipoNuovo, setTipoNuovo] = useState<TipoSpillo>('nota');
  const [selezionatoId, setSelezionatoId] = useState<number | null>(null);
  const [sezione, setSezione] = useState('spilli');
  const seleziona = (id:number|null) => { setSelezionatoId(id); if(id!==null)setSezione('spilli'); };
  const [occupato, setOccupato] = useState(false);
  const [confermaEliminaMappa, setConfermaEliminaMappa] = useState(false);
  const [nuovaMappaAperta, setNuovaMappaAperta] = useState(false);
  useDocumentTitle(dati ? `Modifica: ${dati.nome} — Mappe` : 'Modifica mappa');

  const vai = (k: string) => navigate(`/guida/mappe/${encodeURIComponent(k)}/modifica`);
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
      void esegui(async () => {
        const s = await creaSpillo(chiave, { tipo: tipoNuovo, nome: DEFINIZIONI_SPILLO[tipoNuovo].nome, x, y });
        seleziona(s.id);
        setStrumento('seleziona');
      }, `Spillo «${DEFINIZIONI_SPILLO[tipoNuovo].nome}» aggiunto: completa nome e riferimento nel pannello.`);
    },
    onSposta: (id, x, y) => void esegui(() => aggiornaSpillo(id, { x, y })),
  };

  const selezionato = dati?.spilli.find((s) => s.id === selezionatoId) ?? null;
  const copia = (a: AppuntiSpillo) => {
    setAppunti(a); scriviAppunti(a); setStrumento('incolla');
    notifica('info', `Spillo «${a.nome}» copiato: tocca la mappa (anche di un altro luogo) nel punto dove incollarlo.`);
  };

  return (
    <PageState isLoading={caricamento && !dati} error={errore} onRetry={ricarica}>
      {dati && (
        <VisoreMappa
          key={dati.chiave}
          mappa={presentaMappa(dati)}
          partitaId={null}
          onNaviga={vai}
          onChiudi={() => navigate(`/guida/mappe/${encodeURIComponent(chiave)}`)}
          editor={editor}
          className="visore-mappa--editor"
          intestazione={<span className="editor-mappa__targhetta">Modifica</span>}
          azioni={<PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Apri il visore" onClick={() => navigate(`/guida/mappe/${encodeURIComponent(chiave)}`)} />}
          pannello={
            <PannelloEditor
              mappa={dati} albero={albero.dati ?? []} strumento={strumento} tipoNuovo={tipoNuovo} selezionato={selezionato} occupato={occupato} appunti={appunti} elenchi={elenchi.dati ?? ELENCHI_VUOTI}
              onStrumento={setStrumento} onTipoNuovo={setTipoNuovo} onSeleziona={seleziona} sezione={sezione} onSezione={setSezione} onCopia={copia}
              onSalvaSpillo={(id, d) => esegui(() => aggiornaSpillo(id, d), 'Spillo salvato.')}
              onEliminaSpillo={(id) => esegui(async () => { await eliminaSpillo(id); setSelezionatoId(null); }, 'Spillo eliminato.')}
              onAggiungiImmagine={(id, file, didascalia) => esegui(() => aggiungiImmagineSpillo(id, file, didascalia), 'Schermata aggiunta allo spillo (resta nella tua istanza).')}
              onDidascalia={(id, didascalia) => esegui(() => aggiornaImmagineSpillo(id, { didascalia }), 'Didascalia salvata.')}
              onEliminaImmagine={(id) => esegui(() => eliminaImmagineSpillo(id), 'Schermata eliminata.')}
              onCreaMappaCollegata={(s) => esegui(async () => {
                const nuova=await creaMappa({ nome:s.nome, tipo:dati.tipo==='palazzo'||dati.tipo==='dedalo'||dati.tipo==='area'?'area':'luogo', genitore:dati.chiave, ordine:dati.figli.length });
                await aggiornaSpillo(s.id,{tipo:'passaggio',riferimento:{tipo:'mappa',chiave:nuova.chiave}});
                await albero.ricarica();
              }, 'Mappa collegata creata: lo spillo ora è un passaggio verso di lei.')}
              onSalvaMappa={(d) => esegui(async()=>{const aggiornata=await aggiornaMappa(chiave,d);await albero.ricarica();if(aggiornata.chiave!==chiave)vai(aggiornata.chiave);}, 'Mappa salvata.')}
              onImmagine={(file) => esegui(() => caricaImmagineMappa(chiave, file), 'Immagine di base caricata (resta nella tua istanza).')}
              onScaricaDallaGuida={() => esegui(async () => {
                if (dati.entita?.tipo === 'area') await scaricaPianta(dati.entita.chiave);
                else if (dati.entita?.tipo === 'quartiere') await scaricaPiantaQuartiere(dati.entita.chiave);
              }, 'Pianta scaricata dalla guida nella tua istanza.')}
              onEliminaMappa={() => setConfermaEliminaMappa(true)}
              onNuovaMappa={() => setNuovaMappaAperta(true)}
              onCreaPassaggio={(destinazione) => esegui(async () => {
                const s = await creaPassaggio(chiave, destinazione);
                seleziona(s.id); setStrumento('seleziona');
              }, destinazione === dati.genitore ? `Passaggio di ritorno verso «${dati.genitoreNome ?? destinazione}» creato in basso al centro: trascinalo dove sta l'uscita.` : 'Passaggio creato al centro della mappa: trascinalo dove sta l\'ingresso.')}
              onEsporta={() => void esegui(async () => {
                const pacchetto = await esportaMappe();
                const blob = new Blob([JSON.stringify(pacchetto, null, 1)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'mappe-editor.json'; a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }, 'Mappe esportate in JSON: per condividerle con un\'altra istanza usa «Importa», oppure il pacchetto di gioco in Impostazioni.')}
              onImporta={(file, sovrascrivi) => esegui(async () => {
                const pacchetto = JSON.parse(await file.text()) as EsportazioneMappeDto;
                const esito = await importaMappe(pacchetto, sovrascrivi);
                await albero.ricarica();
                notifica('info', `Importate ${esito.mappe} mappe, ${esito.spilli} spilli, ${esito.immagini} immagini${esito.saltate.length ? `; saltate: ${esito.saltate.join(', ')}` : ''}${esito.condizioniScartate ? `; ${esito.condizioniScartate} condizioni scartate perché citano chiavi assenti dalla Guida` : ''}.`);
              })}
              onVai={vai}
            />
          }
        />
      )}
      {dati && (
        <Modal titolo={`Eliminare la mappa «${dati.nome}»?`} aperta={confermaEliminaMappa} onChiudi={() => setConfermaEliminaMappa(false)}
          azioni={<>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfermaEliminaMappa(false)}>Annulla</button>
            <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" disabled={occupato} onClick={() => void esegui(async () => { await eliminaMappa(chiave); navigate(dati.genitore ? `/guida/mappe/${encodeURIComponent(dati.genitore)}/modifica` : '/guida/mappe'); }, 'Mappa eliminata.')} />
          </>}>
          <p className="m-0 text-[13px]">Gli spilli della mappa vengono eliminati; le mappe figlie ({dati.figli.length}) restano senza genitore. L'immagine di base resta fra le immagini caricate.</p>
        </Modal>
      )}
      {dati && <NuovaMappaModal key={nuovaMappaAperta ? 'aperta' : 'chiusa'} aperta={nuovaMappaAperta} genitore={dati} albero={albero.dati ?? []} occupato={occupato} onChiudi={() => setNuovaMappaAperta(false)}
        onCrea={(d) => esegui(async () => { const m = await creaMappa(d); setNuovaMappaAperta(false); await albero.ricarica(); vai(m.chiave); },
          d.passaggio ? `Mappa creata. Il passaggio verso «${d.nome}» è al centro di «${dati.nome}»: torna «Su» e trascinalo dove sta l'ingresso.${d.ritorno ? ' Qui in basso c\'è il passaggio di ritorno.' : ''}` : 'Mappa creata (senza passaggio: si aggiunge dall\'albero con «Crea passaggio»).')} />}
    </PageState>
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
  onStrumento: (s: StrumentoEditor) => void;
  onCopia: (a: AppuntiSpillo) => void;
  onTipoNuovo: (t: TipoSpillo) => void;
  onSeleziona: (id: number | null) => void;
  onSalvaSpillo: (id: number, dati: Parameters<typeof aggiornaSpillo>[1]) => Promise<void>;
  onEliminaSpillo: (id: number) => Promise<void>;
  onAggiungiImmagine: (id: number, file: File, didascalia: string) => Promise<void>;
  onDidascalia: (immagineId: number, didascalia: string) => Promise<void>;
  onEliminaImmagine: (immagineId: number) => Promise<void>;
  onCreaMappaCollegata: (s: SpilloDto) => Promise<void>;
  onSalvaMappa: (dati: Parameters<typeof aggiornaMappa>[1]) => Promise<void>;
  onImmagine: (file: File) => Promise<void>;
  onScaricaDallaGuida: () => Promise<void>;
  onEliminaMappa: () => void;
  onNuovaMappa: () => void;
  /** Passaggio da questa mappa verso `destinazione` (figlia senza passaggio o genitore per il ritorno), 15.24. */
  onCreaPassaggio: (destinazione: string) => Promise<void>;
  onEsporta: () => void;
  onImporta: (file: File, sovrascrivi: boolean) => Promise<void>;
  onVai: (chiave: string) => void;
}

/** Pannello laterale dell'editor: strumenti, proprietà dello spillo, immagine e proprietà della mappa, albero, esportazione/importazione. */
function PannelloEditor(p: PropsPannello) {
  const { mappa, strumento, tipoNuovo, selezionato, occupato, appunti } = p;
  const inputImmagine = useRef<HTMLInputElement | null>(null);
  const inputImporta = useRef<HTMLInputElement | null>(null);
  const [sovrascrivi, setSovrascrivi] = useState(false);
  const {sezione,onSezione:setSezione} = p;
  const scaricabile = mappa.entita?.tipo === 'area' || mappa.entita?.tipo === 'quartiere';
  // l'asset del repository è un puntatore: consegnato solo se sta nel manifest degli asset
  const assetAttuale = useAsset(mappa.asset);
  const assetOriginale = useAsset(mappa.assetOriginale);
  const assetConsegnato = assetAttuale ?? assetOriginale;
  // una mappa si «raggiunge» da questa se uno spillo (passaggio, stazione o altro) punta a lei: le figlie senza spillo e il genitore senza ritorno vengono segnalati
  const raggiunge = (destinazione: string) => mappa.spilli.some((s) => destinazioneMappaSpillo(s) === destinazione);
  return (
    <>
      <nav className="editor-mappa__sezioni" aria-label="Sezioni dell’editor">
        {[['spilli','Spilli'],['mappa','Mappa'],['collegamenti','Collegamenti'],['file','File']].map(([id,nome]) => <button key={id} type="button" aria-pressed={sezione === id} onClick={() => setSezione(id)}>{nome}</button>)}
      </nav>
      <div hidden={sezione !== 'spilli'} className="editor-mappa__contenuto">
      <section className="visore-mappa__sezione" aria-label="Strumenti">
        <h3 className="visore-mappa__intestazione">Strumenti</h3>
        <div className="editor-mappa__strumenti" role="group" aria-label="Strumento attivo">
          <PulsanteVisivo tono="secondario" compatto attivo={strumento === 'seleziona'} icona={<IconaAzione chiave="seleziona" dimensione={20} />} titolo="Seleziona" dettaglio="sposta trascinando" onClick={() => p.onStrumento('seleziona')} />
          <PulsanteVisivo tono="secondario" compatto attivo={strumento === 'aggiungi'} icona={<IconaAzione chiave="carica-altri" dimensione={20} />} titolo="Aggiungi" dettaglio="tocca la mappa" onClick={() => p.onStrumento('aggiungi')} />
          <PulsanteVisivo tono="secondario" compatto attivo={strumento === 'incolla'} icona={<IconaAzione chiave="incolla" dimensione={20} />} titolo="Incolla" dettaglio={appunti ? `«${appunti.nome}»` : 'copia prima uno spillo'} disabled={!appunti} onClick={() => p.onStrumento('incolla')} />
        </div>
        {strumento === 'aggiungi' && (
          <div className="flex flex-col gap-1.5" role="group" aria-label="Tipo del nuovo spillo">
            {CATEGORIE_SPILLO.map((c) => (
              <div key={c} className="flex flex-col gap-0.5">
                <span className="editor-mappa__gruppo" title={DEFINIZIONI_CATEGORIA[c].descrizione}>{DEFINIZIONI_CATEGORIA[c].nome}</span>
                <div className="editor-mappa__palette">
                  {tipiDellaCategoria(c).map((t) => (
                    <button key={t} type="button" className={`editor-mappa__tipo ${t === tipoNuovo ? 'editor-mappa__tipo--attivo' : ''}`} aria-pressed={t === tipoNuovo} onClick={() => p.onTipoNuovo(t)}>
                      <PuntoSpillo tipo={t} colore={DEFINIZIONI_SPILLO[t].colore} />
                      <span className="truncate">{DEFINIZIONI_SPILLO[t].nome}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="m-0 text-[12px] text-text-muted">{strumento === 'aggiungi' ? 'Tocca la mappa dove vuoi lo spillo: viene creato subito con il tipo scelto.' : strumento === 'incolla' ? `Tocca la mappa dove vuoi la copia di «${appunti?.nome ?? 'spillo'}»: stesso tipo, nome, descrizione, riferimento e condizioni di visibilità; gli appunti restano per altre copie, anche su altre mappe.` : 'Tocca uno spillo per modificarlo, trascinalo per spostarlo (posizione salvata al rilascio); il tipo si cambia dal pannello senza ricreare lo spillo.'}</p>
      </section>

      {selezionato && (
        <FormSpillo key={selezionato.id} spillo={selezionato} mappa={mappa} albero={p.albero} occupato={occupato} onSalva={(d) => p.onSalvaSpillo(selezionato.id, d)} onCopia={p.onCopia} onElimina={() => p.onEliminaSpillo(selezionato.id)} elenchi={p.elenchi} onCreaMappaCollegata={() => p.onCreaMappaCollegata(selezionato)} onChiudi={() => p.onSeleziona(null)} onVai={p.onVai} onAggiungiImmagine={(f, did) => p.onAggiungiImmagine(selezionato.id, f, did)} onDidascalia={p.onDidascalia} onEliminaImmagine={p.onEliminaImmagine} />
      )}

      {!selezionato && strumento === 'seleziona' && <p className="editor-mappa__aiuto">Seleziona un punto sulla mappa per modificarne nome, collegamento e condizioni, oppure scegli Aggiungi.</p>}
      </div>
      <div hidden={sezione !== 'mappa'} className="editor-mappa__contenuto">
      <section className="visore-mappa__sezione" aria-label="Immagine di base">
        <h3 className="visore-mappa__intestazione">Immagine di base</h3>
        <p className="m-0 text-[12px] text-text-muted">{mappa.immagineUrl ? `Immagine dell'istanza${mappa.larghezza && mappa.altezza ? ` · ${mappa.larghezza}×${mappa.altezza}` : ''}` : mappa.asset ? (assetConsegnato ? `Asset del repository «${mappa.asset}».` : `Asset del repository «${mappa.asset}» non ancora consegnato: gli spilli stanno su una griglia.`) : 'Nessuna immagine: gli spilli stanno su una griglia.'} Cambiare immagine mantiene gli spilli (coordinate in percentuale).</p>
        <input ref={inputImmagine} type="file" accept="image/*" className="sr-only" aria-label="File dell'immagine di base" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) void p.onImmagine(f); e.target.value = ''; }} />
        <div className="flex flex-wrap gap-1.5">
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="carica" dimensione={20} />} titolo={mappa.immagineUrl ? 'Sostituisci immagine' : 'Carica immagine'} disabled={occupato} onClick={() => inputImmagine.current?.click()} />
          {scaricabile && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="url" dimensione={20} />} titolo="Scarica dalla guida" disabled={occupato} onClick={() => void p.onScaricaDallaGuida()} />}
        </div>
      </section>

      <FormMappa key={mappa.chiave + mappa.updatedAt} mappa={mappa} albero={p.albero} occupato={occupato} onSalva={p.onSalvaMappa} onElimina={p.onEliminaMappa} />

      </div>
      <div hidden={sezione !== 'collegamenti'} className="editor-mappa__contenuto">
      <section className="visore-mappa__sezione" aria-label="Albero delle mappe">
        <h3 className="visore-mappa__intestazione">Albero</h3>
        <p className="m-0 text-[12px] text-text-muted">L'albero dice chi contiene chi; sulla mappa ci si sposta con gli spilli «passaggio». Una figlia «senza passaggio» si raggiunge solo da qui.</p>
        {mappa.genitore && (
          <div className="flex flex-col gap-1">
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="indietro" dimensione={20} />} titolo={`Su: ${mappa.genitoreNome ?? mappa.genitore}`} onClick={() => p.onVai(mappa.genitore!)} />
            {!raggiunge(mappa.genitore) && (
              <div className="editor-mappa__senza-passaggio">
                <span className="flex-1 min-w-0">Nessun passaggio di ritorno verso «{mappa.genitoreNome ?? mappa.genitore}».</span>
                <button type="button" className="visore-mappa__azione-testo touch" disabled={occupato} onClick={() => void p.onCreaPassaggio(mappa.genitore!)}>Crea passaggio di ritorno</button>
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
                  <span className="text-[11px] text-text-muted">{NOME_TIPO_MAPPA[f.tipo]}{f.numeroSpilli > 0 ? ` · ${f.numeroSpilli}` : ''}</span>
                </button>
                {!raggiunge(f.chiave) && (
                  <div className="editor-mappa__senza-passaggio">
                    <span className="flex-1 min-w-0">Senza passaggio da questa mappa.</span>
                    <button type="button" className="visore-mappa__azione-testo touch" disabled={occupato} onClick={() => void p.onCreaPassaggio(f.chiave)} aria-label={`Crea passaggio verso ${nomePresentazioneMappa(f)}`}>Crea passaggio</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="carica-altri" dimensione={20} />} titolo="Nuova mappa" dettaglio={`figlia di ${nomePresentazioneMappa(mappa)}`} disabled={occupato} onClick={p.onNuovaMappa} />
      </section>

      </div>
      <div hidden={sezione !== 'file'} className="editor-mappa__contenuto">
      <section className="visore-mappa__sezione" aria-label="Esportazione e importazione">
        <h3 className="visore-mappa__intestazione">Scambio</h3>
        <p className="m-0 text-[12px] text-text-muted">Le mappe fanno parte dei dati di gioco: per portarle in un'altra istanza, o farne il dato predefinito dell'app, si usa il pacchetto di gioco (Impostazioni → Dati di gioco). «Esporta» salva tutte le mappe in un JSON (con le immagini dell'istanza in base64) per copie e trasferimenti; «Importa» legge lo stesso formato.</p>
        <input ref={inputImporta} type="file" accept="application/json,.json" className="sr-only" aria-label="File del pacchetto da importare" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) void p.onImporta(f, sovrascrivi); e.target.value = ''; }} />
        <div className="flex flex-wrap gap-1.5 items-center">
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Esporta" dettaglio="tutte le mappe, JSON" disabled={occupato} onClick={p.onEsporta} />
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="carica" dimensione={20} />} titolo="Importa" disabled={occupato} onClick={() => inputImporta.current?.click()} />
          <label className="flex items-center gap-1 text-[12px]"><input type="checkbox" checked={sovrascrivi} onChange={(e) => setSovrascrivi(e.target.checked)} /> Sovrascrivi le mappe esistenti</label>
        </div>
      </section>
      </div>
    </>
  );
}

interface PropsFormSpillo { spillo: SpilloDto; mappa: MappaDto; albero: MappaRiassuntoDto[]; occupato: boolean; elenchi: ElenchiCondizioni; onSalva: (dati: Parameters<typeof aggiornaSpillo>[1]) => Promise<void>; onCopia: (a: AppuntiSpillo) => void; onElimina: () => Promise<void>; onCreaMappaCollegata: () => Promise<void>; onChiudi: () => void; onVai: (chiave: string) => void; onAggiungiImmagine: (file: File, didascalia: string) => Promise<void>; onDidascalia: (immagineId: number, didascalia: string) => Promise<void>; onEliminaImmagine: (immagineId: number) => Promise<void> }

const COLLEGAMENTI_CITTA: Array<{ tipo: TipoRiferimento; nome: string }> = [{ tipo: 'negozio', nome: 'Negozio' }, { tipo: 'attivita', nome: 'Attività' }, { tipo: 'luogo', nome: 'Luogo della città' }, { tipo: 'confidente', nome: 'Confidente' }];

/** «Porta a»: la mappa d'arrivo e, se si vuole, uno spillo di quella mappa. Elenchi con ricerca, mai un punto da cliccare a mano. */
function DestinazioneSpostamento({ valore, mappaCorrente, albero, disabilitato, onCambia }: { valore: DestinazioneSpillo | null; mappaCorrente: string; albero: MappaRiassuntoDto[]; disabilitato: boolean; onCambia: (d: DestinazioneSpillo | null) => void }) {
  const mappe = useMemo(() => albero.filter((m) => m.chiave !== mappaCorrente).map((m) => ({ chiave: m.chiave, nome: etichettaPlanimetria(m), gruppo: NOME_TIPO_MAPPA[m.tipo] })), [albero, mappaCorrente]);
  const arrivo = useCarica(() => (valore?.mappa ? getMappa(valore.mappa) : Promise.resolve(null)), [valore?.mappa]);
  const spilli = useMemo(() => [{ chiave: '', nome: 'Nessuno: solo la mappa, adattata alla finestra' }, ...(arrivo.dati?.spilli ?? []).map((s) => ({ chiave: String(s.id), nome: s.nome, dettaglio: s.tipoNome }))], [arrivo.dati]);
  return (
    <fieldset className="m-0 p-0 border-0 flex flex-col gap-1.5" disabled={disabilitato}>
      <legend className="text-[12px] text-text-secondary">Porta a</legend>
      <Selettore ricerca="sempre" etichetta="Mappa di arrivo" valore={valore?.mappa ?? ''} opzioni={mappe} segnaposto="Scegli la mappa…" onCambia={(k) => onCambia(k ? { mappa: k, spillo: null } : null)} />
      {valore && (arrivo.errore
        ? <p role="alert" className="m-0 text-[12px]">{arrivo.errore} <button type="button" className="visore-mappa__azione-testo" onClick={() => void arrivo.ricarica()}>Riprova</button></p>
        : <Selettore ricerca="sempre" etichetta="Spillo di arrivo (facoltativo)" valore={valore.spillo ? String(valore.spillo) : ''} opzioni={spilli} onCambia={(k) => onCambia({ mappa: valore.mappa, spillo: k ? Number(k) : null })} disabilitato={arrivo.caricamento} />)}
      {valore && <div className="flex gap-2"><button type="button" className="visore-mappa__azione-testo" onClick={() => onCambia(null)}>Togli la destinazione</button></div>}
    </fieldset>
  );
}

/** «Collegato a»: un negozio, un'attività, un luogo o un Confidente, scelto da un elenco con ricerca. */
function CollegamentoCitta({ valore, disabilitato, onCambia }: { valore: { tipo: TipoRiferimento; chiave: string } | null; disabilitato: boolean; onCambia: (r: { tipo: TipoRiferimento; chiave: string } | null) => void }) {
  const [tipo, setTipo] = useState<TipoRiferimento>(valore?.tipo ?? 'negozio');
  const voci = useCarica(() => cercaRiferimenti(tipo, '', 100), [tipo]);
  const opzioni = useMemo(() => (voci.dati ?? []).map((r) => ({ chiave: r.chiave, nome: r.nome, dettaglio: r.dettaglio || undefined })), [voci.dati]);
  const etichetta = COLLEGAMENTI_CITTA.find((c) => c.tipo === tipo)?.nome ?? 'Collegamento';
  return (
    <fieldset className="m-0 p-0 border-0 flex flex-col gap-1.5" disabled={disabilitato}>
      <legend className="text-[12px] text-text-secondary">Collegato a</legend>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Che cosa collegare">
        {COLLEGAMENTI_CITTA.map((c) => <button key={c.tipo} type="button" className={`chip chip--icona touch ${tipo === c.tipo ? 'chip--attivo' : ''}`} aria-pressed={tipo === c.tipo} onClick={() => { setTipo(c.tipo); if (valore && valore.tipo !== c.tipo) onCambia(null); }}>{c.nome}</button>)}
      </div>
      {voci.errore
        ? <p role="alert" className="m-0 text-[12px]">{voci.errore} <button type="button" className="visore-mappa__azione-testo" onClick={() => void voci.ricarica()}>Riprova</button></p>
        : <Selettore ricerca="sempre" etichetta={`Elenco: ${etichetta}`} valore={valore?.tipo === tipo ? valore.chiave : ''} opzioni={opzioni} segnaposto="Scegli…" onCambia={(k) => onCambia(k ? { tipo, chiave: k } : null)} disabilitato={voci.caricamento} />}
      {valore && <button type="button" className="visore-mappa__azione-testo self-start" onClick={() => onCambia(null)}>Togli il collegamento</button>}
    </fieldset>
  );
}

/** Proprietà dello spillo selezionato: nome, tipo e descrizione, poi quel che la categoria del tipo richiede. */
function FormSpillo({ spillo: s, mappa, albero, occupato, elenchi, onSalva, onCopia, onElimina, onCreaMappaCollegata, onChiudi, onVai, onAggiungiImmagine, onDidascalia, onEliminaImmagine }: PropsFormSpillo) {
  const inputSchermata = useRef<HTMLInputElement | null>(null);
  const [didascaliaNuova, setDidascaliaNuova] = useState('');
  const [nome, setNome] = useState(s.nome);
  const [tipo, setTipo] = useState<TipoSpillo>(s.tipo);
  const [descrizione, setDescrizione] = useState(s.descrizione);
  const [riferimento, setRiferimento] = useState<{ tipo: TipoRiferimento; chiave: string } | null>(s.riferimento);
  const [condizioni, setCondizioni] = useState<RequisitoSpillo[]>(() => condizioniNude(s));
  // gli spostamenti di prima avevano solo il riferimento alla mappa: qui è la stessa cosa di una destinazione senza spillo
  const destinazioneIniziale: DestinazioneSpillo | null = s.destinazione ?? (s.riferimento?.tipo === 'mappa' ? { mappa: s.riferimento.chiave, spillo: null } : null);
  const [destinazione, setDestinazione] = useState<DestinazioneSpillo | null>(destinazioneIniziale);
  const categoria = categoriaSpillo(tipo);
  // Cambiando categoria si tolgono le cose che quella categoria non ha: un collegamento estraneo non si salva.
  const cambiaTipo = (t: TipoSpillo) => {
    setTipo(t);
    const c = categoriaSpillo(t);
    if (riferimento && !RIFERIMENTI_PER_CATEGORIA[c].includes(riferimento.tipo)) setRiferimento(null);
    if (c !== 'spostamento') setDestinazione(null);
    if (c === 'citta') setCondizioni([]);
  };
  // Uno spostamento che **è** un luogo o un punto della Guida (stazione, scorciatoia) tiene quel riferimento: è la sua identità
  // per il seed e per lo stato condiviso con la scheda del Palazzo; la destinazione vive a parte. Il riferimento «mappa» si
  // scrive solo per chi non ha un'identità propria (i passaggi vecchi lo usano come ripiego).
  const riferimentoEffettivo = categoria === 'spostamento'
    ? (riferimento && riferimento.tipo !== 'mappa' ? riferimento : (destinazione ? { tipo: 'mappa' as const, chiave: destinazione.mappa } : null))
    : riferimento;
  const dati = { nome: nome.trim() || s.nome, tipo, descrizione, riferimento: riferimentoEffettivo, condizioni: categoria === 'citta' ? [] : condizioni, destinazione: categoria === 'spostamento' ? destinazione : null };
  const modificato = dati.nome !== s.nome || tipo !== s.tipo || descrizione !== s.descrizione
    || (dati.riferimento?.tipo ?? null) !== (s.riferimento?.tipo ?? null) || (dati.riferimento?.chiave ?? null) !== (s.riferimento?.chiave ?? null)
    || JSON.stringify(dati.condizioni) !== JSON.stringify(condizioniNude(s)) || JSON.stringify(dati.destinazione) !== JSON.stringify(categoria === 'spostamento' ? destinazioneIniziale : null);
  const salva = (e: FormEvent) => {
    e.preventDefault();
    if (!condizioni.every((c) => normalizzaRequisitoSpillo(c) !== null)) { notifica('error', 'Completa o rimuovi i gruppi vuoti prima di salvare.'); return; }
    void onSalva(dati);
  };
  const puntoGuida = s.dettaglio?.tipo === 'punto' ? s.dettaglio.punto ?? null : null;
  return (
    <section className="visore-mappa__sezione visore-mappa__scheda" aria-label={`Proprietà dello spillo: ${s.nome}`}>
      <div className="flex items-start gap-2">
        <PuntoSpillo tipo={tipo} colore={DEFINIZIONI_SPILLO[tipo].colore} grande />
        <div className="flex-1 min-w-0">
          <h3 className="m-0 font-display text-[19px] leading-tight break-words">{s.nome}</h3>
          <p className="m-0 text-[11px] uppercase tracking-wide text-text-muted">{DEFINIZIONI_CATEGORIA[categoria].nome} · x {s.x}% · y {s.y}% · {s.origine}</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onChiudi} aria-label="Chiudi le proprietà">×</button>
      </div>
      <form className="flex flex-col gap-2" onSubmit={salva}>
        <label className="editor-mappa__campo">Nome<input className="form-input" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={160} /></label>
        <div className="editor-mappa__campo">
          <Selettore etichetta="Tipo" valore={tipo} opzioni={CATEGORIE_SPILLO.flatMap((c) => tipiDellaCategoria(c).map((t) => ({ chiave: t, nome: DEFINIZIONI_SPILLO[t].nome, gruppo: DEFINIZIONI_CATEGORIA[c].nome })))} onCambia={(k) => cambiaTipo(k as TipoSpillo)} />
        </div>
        <p className="m-0 text-[12px] text-text-muted">{DEFINIZIONI_CATEGORIA[categoria].descrizione}</p>
        <label className="editor-mappa__campo">Descrizione<textarea className="form-input" rows={3} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} maxLength={2000} /></label>

        {categoria === 'spostamento' && <DestinazioneSpostamento valore={destinazione} mappaCorrente={mappa.chiave} albero={albero} disabilitato={occupato} onCambia={setDestinazione} />}
        {categoria === 'citta' && <CollegamentoCitta valore={riferimento} disabilitato={occupato} onCambia={setRiferimento} />}
        {categoria !== 'citta' && puntoGuida && <p className="m-0 text-[12px] text-text-secondary">Punto della Guida: <strong>{puntoGuida.nome}</strong> — lo stato «ottenuto / esaurito» si condivide con la scheda del Palazzo.</p>}
        {categoria === 'consumabile' && <p className="m-0 text-[12px] text-text-muted">Si segna come fatto nella partita; non porta da nessuna parte.</p>}
        {categoria !== 'citta' && <CondizioniEditor condizioni={condizioni} onCambia={setCondizioni} elenchi={elenchi} disabilitato={occupato} perSpillo />}

        <div className="flex flex-wrap gap-1.5">
          <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva spillo" disabled={occupato || !modificato} />
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="copia" dimensione={20} />} titolo="Copia" dettaglio="per incollarlo altrove" disabled={occupato} onClick={() => onCopia({ tipo, nome: dati.nome, descrizione, riferimento: dati.riferimento, condizioni: dati.condizioni, destinazione: dati.destinazione })} />
          {categoria === 'spostamento' && destinazione && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Apri l’arrivo" onClick={() => onVai(destinazione.mappa)} />}
          {categoria === 'spostamento' && !destinazione && <PulsanteVisivo tono="secondario" compatto icona={<IconaSpillo tipo="passaggio" dimensione={20} />} titolo="Crea mappa collegata" disabled={occupato || modificato} onClick={() => void onCreaMappaCollegata()} />}
          <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" disabled={occupato} onClick={() => void onElimina()} />
        </div>
        {modificato && categoria === 'spostamento' && !destinazione && <span className="editor-mappa__avviso">Salva le modifiche prima di creare la mappa collegata.</span>}
      </form>
      <fieldset className="m-0 p-0 border-0 flex flex-col gap-1.5" aria-label="Schermate di riferimento">
        <legend className="text-[12px] text-text-secondary">Schermate di riferimento ({s.immagini.length})</legend>
        <GalleriaSpillo immagini={s.immagini} nome={s.nome} compatta />
        {s.immagini.length > 0 && (
          <ul className="m-0 p-0 list-none flex flex-col gap-1" aria-label="Didascalie delle schermate">
            {s.immagini.map((i, n) => (
              <li key={i.id} className="flex items-center gap-1 text-[12px]">
                <span className="text-text-muted w-4 shrink-0">{n + 1}</span>
                <input className="form-input flex-1 min-w-0" defaultValue={i.didascalia} placeholder="Didascalia" aria-label={`Didascalia della schermata ${n + 1}`} maxLength={300} onBlur={(e) => { if (e.target.value !== i.didascalia) void onDidascalia(i.id, e.target.value); }} />
                <button type="button" className="visore-mappa__azione-testo" onClick={() => void onEliminaImmagine(i.id)} disabled={occupato} aria-label={`Elimina la schermata ${n + 1}`}>Elimina</button>
              </li>
            ))}
          </ul>
        )}
        <input ref={inputSchermata} type="file" accept="image/*" className="sr-only" aria-label="File della schermata" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) { void onAggiungiImmagine(f, didascaliaNuova.trim()); setDidascaliaNuova(''); } e.target.value = ''; }} />
        <div className="flex gap-1">
          <input className="form-input flex-1 min-w-0" value={didascaliaNuova} onChange={(e) => setDidascaliaNuova(e.target.value)} placeholder="Didascalia della nuova schermata (facoltativa)" aria-label="Didascalia della nuova schermata" maxLength={300} />
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="carica" dimensione={20} />} titolo="Aggiungi schermata" disabled={occupato} onClick={() => inputSchermata.current?.click()} />
        </div>
      </fieldset>
    </section>
  );
}

interface PropsFormMappa { mappa: MappaDto; albero: MappaRiassuntoDto[]; occupato: boolean; onSalva: (dati: Parameters<typeof aggiornaMappa>[1]) => Promise<void>; onElimina: () => void }

/** Proprietà della mappa (nome, tipo, genitore, ordine, asset, note). */
function FormMappa({ mappa, albero, occupato, onSalva, onElimina }: PropsFormMappa) {
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
  const modificata = nome !== mappa.nome || tipo !== mappa.tipo || genitore !== (mappa.genitore ?? '') || Number(ordine) !== mappa.ordine || note !== mappa.note;
  return (
    <section className="visore-mappa__sezione" aria-label="Proprietà della mappa">
      <h3 className="visore-mappa__intestazione">Mappa</h3>
      <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); void onSalva({ nome: nome.trim() || mappa.nome, tipo, genitore: genitore || null, ordine: Math.max(0, Math.round(Number(ordine) || 0)), note }); }}>
        <label className="editor-mappa__campo">Nome<input className="form-input" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={120} /></label>
        <div className="grid grid-cols-2 gap-2">
          <div className="editor-mappa__campo">
            <Selettore etichetta="Tipo di mappa" valore={tipo} opzioni={TIPI_MAPPA.map((t) => ({ chiave: t, nome: NOME_TIPO_MAPPA[t] }))} onCambia={(k) => setTipo(k as TipoMappa)} />
          </div>
          <label className="editor-mappa__campo">Ordine<input className="form-input" type="number" min={0} value={ordine} onChange={(e) => setOrdine(e.target.value)} /></label>
        </div>
        <div className="editor-mappa__campo">
          <Selettore etichetta="Mappa genitore" valore={genitore} vuoto="— nessuna (radice) —" opzioni={albero.filter((m) => !discendenti.has(m.chiave)).map((m) => ({ chiave: m.chiave, nome: etichettaPlanimetria(m), dettaglio: NOME_TIPO_MAPPA[m.tipo] }))} onCambia={setGenitore} />
        </div>
        <label className="editor-mappa__campo">Note<textarea className="form-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} /></label>
        <div className="flex flex-wrap gap-1.5">
          <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva mappa" disabled={occupato || !modificata} />
          <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina mappa" disabled={occupato} onClick={onElimina} />
        </div>
      </form>
    </section>
  );
}

interface PropsNuova { aperta: boolean; genitore: MappaDto; albero: MappaRiassuntoDto[]; occupato: boolean; onChiudi: () => void; onCrea: (dati: Parameters<typeof creaMappa>[0]) => Promise<void> }

/** Finestra «Nuova mappa»: chiave proposta dal nome, tipo coerente col genitore; passaggio dal genitore (predefinito) e di ritorno (a scelta), 15.24. */
function NuovaMappaModal({ aperta, genitore, albero, occupato, onChiudi, onCrea }: PropsNuova) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoMappa>(genitore.tipo === 'palazzo' || genitore.tipo === 'dedalo' || genitore.tipo === 'area' ? 'area' : genitore.tipo === 'citta' ? 'quartiere' : 'luogo');
  const [passaggio, setPassaggio] = useState(true);
  const [ritorno, setRitorno] = useState(false);
  // asset del repository: segue la chiave («mappe/<chiave>») finché l'utente non lo tocca; vuoto = nessun asset (15.25)
  const chiaveEffettiva = (genitore.tipo==='citta'?'':genitore.chiave+'-')+slug(nome);
  const esiste = albero.some((m) => m.chiave === chiaveEffettiva);
  const valida = /^[a-z0-9][a-z0-9-]{0,179}$/.test(chiaveEffettiva) && !esiste && nome.trim().length > 0;
  return (
    <Modal titolo="Nuova mappa" aperta={aperta} onChiudi={onChiudi}
      azioni={<>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onChiudi}>Annulla</button>
        <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Crea" disabled={occupato || !valida} onClick={() => void onCrea({ nome: nome.trim(), tipo, genitore: genitore.chiave, ordine: genitore.figli.length, passaggio, ritorno })} />
      </>}>
      <div className="flex flex-col gap-2">
        <label className="editor-mappa__campo">Nome<input className="form-input" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} autoFocus /></label>
        <div className="editor-mappa__campo">
          <Selettore etichetta="Tipo di mappa" valore={tipo} opzioni={TIPI_MAPPA.map((t) => ({ chiave: t, nome: NOME_TIPO_MAPPA[t] }))} onCambia={(k) => setTipo(k as TipoMappa)} />
        </div>
        <p className="m-0 text-[12px] text-text-muted">Genitore: {genitore.nome}. {esiste ? <span className="editor-mappa__avviso">Esiste già una mappa con questa chiave.</span> : 'Nomi e file seguiranno automaticamente questo percorso.'}</p>
        <label className="flex items-start gap-2 text-[13px] touch"><input type="checkbox" className="w-5 h-5 mt-0.5 shrink-0" checked={passaggio} onChange={(e) => setPassaggio(e.target.checked)} /> <span>Crea il passaggio su «{genitore.nome}» verso la nuova mappa <span className="text-text-muted">(al centro, in un punto libero: poi lo trascini dove sta l'ingresso)</span></span></label>
        <label className="flex items-start gap-2 text-[13px] touch"><input type="checkbox" className="w-5 h-5 mt-0.5 shrink-0" checked={ritorno} onChange={(e) => setRitorno(e.target.checked)} /> <span>Crea anche il passaggio di ritorno verso «{genitore.nome}» nella nuova mappa <span className="text-text-muted">(in basso al centro)</span></span></label>
      </div>
    </Modal>
  );
}
