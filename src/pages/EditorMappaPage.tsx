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
import { aggiornaImmagineSpillo, aggiornaMappa, aggiornaSpillo, aggiungiImmagineSpillo, caricaImmagineMappa, cercaRiferimenti, creaMappa, creaSpillo, eliminaImmagineSpillo, eliminaMappa, eliminaSpillo, esportaMappe, esportaPacchettoRepository, getAlberoMappe, getConfidenti, getDungeons, getMappa, getQuartieri, getRichieste, importaMappe, scaricaPianta, scaricaPiantaQuartiere, type RiferimentoTrovatoApi } from '../services/api';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { Modal } from '../components/shared/Modal';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { VisoreMappa, GalleriaSpillo, type StrumentiEditor, type StrumentoEditor } from '../components/mappe/VisoreMappa';
import { IconaSpillo, PuntoSpillo } from '../components/mappe/IconaSpillo';
import { CondizioniSpilloEditor } from '../components/mappe/CondizioniSpillo';
import { ELENCHI_VUOTI, type ElenchiCondizioni } from '../utils/condizioniSpillo';
import type { RequisitoSpillo } from '../../shared/condizioniSpillo';
import { DEFINIZIONI_SPILLO, NOME_TIPO_MAPPA, TIPI_MAPPA, TIPI_RIFERIMENTO, TIPI_SPILLO, type TipoMappa, type TipoRiferimento, type TipoSpillo } from '../../shared/spilli';
import { slug } from '../../shared/slug';
import type { EsportazioneMappeDto, MappaDto, MappaRiassuntoDto, SpilloDto } from '../types';

const NOME_RIFERIMENTO: Record<TipoRiferimento, string> = { mappa: 'Altra mappa', negozio: 'Negozio', punto: 'Punto di un Palazzo', luogo: 'Luogo della città', confidente: 'Confidente', richiesta: 'Richiesta dei Mementos', attivita: 'Attività' };

function messaggio(err: unknown, predefinito: string): string { return err instanceof Error ? err.message : predefinito; }

/** Spillo copiato negli appunti dell'editor: tutti i campi tranne la posizione; sopravvive al cambio di mappa e alla ricarica della pagina. */
export interface AppuntiSpillo { tipo: TipoSpillo; nome: string; descrizione: string; collezionabile: boolean; riferimento: { tipo: TipoRiferimento; chiave: string } | null; condizioni: RequisitoSpillo[] }
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
    onSeleziona: setSelezionatoId,
    onClickMappa: (x, y) => {
      if (strumento === 'incolla') {
        if (!appunti) { setStrumento('seleziona'); return; }
        void esegui(async () => {
          const s = await creaSpillo(chiave, { ...appunti, x, y });
          setSelezionatoId(s.id);
          setStrumento('seleziona');
        }, `Spillo «${appunti.nome}» incollato: stesso tipo, descrizione, riferimento e condizioni di visibilità dell'originale.`);
        return;
      }
      void esegui(async () => {
        const s = await creaSpillo(chiave, { tipo: tipoNuovo, nome: DEFINIZIONI_SPILLO[tipoNuovo].nome, x, y });
        setSelezionatoId(s.id);
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
          mappa={dati}
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
              onStrumento={setStrumento} onTipoNuovo={setTipoNuovo} onSeleziona={setSelezionatoId} onCopia={copia}
              onSalvaSpillo={(id, d) => esegui(() => aggiornaSpillo(id, d), 'Spillo salvato.')}
              onEliminaSpillo={(id) => esegui(async () => { await eliminaSpillo(id); setSelezionatoId(null); }, 'Spillo eliminato.')}
              onAggiungiImmagine={(id, file, didascalia) => esegui(() => aggiungiImmagineSpillo(id, file, didascalia), 'Schermata aggiunta allo spillo (resta nella tua istanza).')}
              onDidascalia={(id, didascalia) => esegui(() => aggiornaImmagineSpillo(id, { didascalia }), 'Didascalia salvata.')}
              onEliminaImmagine={(id) => esegui(() => eliminaImmagineSpillo(id), 'Schermata eliminata.')}
              onEsportaLuogo={() => void esegui(async () => {
                const { nome, blob } = await esportaPacchettoRepository(chiave);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = nome; a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }, `Pacchetto «${chiave}» pronto: estrailo nella radice del repository (data/seed/mappe/ e public/asset/).`)}
              onCreaMappaCollegata={(s) => esegui(async () => {
                const base = slug(s.nome) || `mappa-${s.id}`;
                let chiaveNuova = base;
                for (let i = 2; (albero.dati ?? []).some((m) => m.chiave === chiaveNuova); i++) chiaveNuova = `${base}-${i}`;
                await creaMappa({ chiave: chiaveNuova, nome: s.nome, tipo: dati.tipo === 'palazzo' || dati.tipo === 'dedalo' || dati.tipo === 'area' ? 'area' : 'luogo', genitore: dati.chiave, ordine: dati.figli.length });
                await aggiornaSpillo(s.id, { tipo: 'passaggio', riferimento: { tipo: 'mappa', chiave: chiaveNuova } });
                await albero.ricarica();
              }, 'Mappa collegata creata: lo spillo ora è un passaggio verso di lei.')}
              onSalvaMappa={(d) => esegui(() => aggiornaMappa(chiave, d), 'Mappa salvata.')}
              onImmagine={(file) => esegui(() => caricaImmagineMappa(chiave, file), 'Immagine di base caricata (resta nella tua istanza).')}
              onScaricaDallaGuida={() => esegui(async () => {
                if (dati.entita?.tipo === 'area') await scaricaPianta(dati.entita.chiave);
                else if (dati.entita?.tipo === 'quartiere') await scaricaPiantaQuartiere(dati.entita.chiave);
              }, 'Pianta scaricata dalla guida nella tua istanza.')}
              onEliminaMappa={() => setConfermaEliminaMappa(true)}
              onNuovaMappa={() => setNuovaMappaAperta(true)}
              onEsporta={() => void esegui(async () => {
                const pacchetto = await esportaMappe();
                const blob = new Blob([JSON.stringify(pacchetto, null, 1)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'mappe-editor.json'; a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }, 'Pacchetto esportato: mettilo in data/seed/mappe-editor.json per il repository (le immagini in base64 vanno tolte, salvo asset propri).')}
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
      {dati && <NuovaMappaModal aperta={nuovaMappaAperta} genitore={dati} albero={albero.dati ?? []} occupato={occupato} onChiudi={() => setNuovaMappaAperta(false)}
        onCrea={(d) => esegui(async () => { const m = await creaMappa(d); setNuovaMappaAperta(false); await albero.ricarica(); vai(m.chiave); }, 'Mappa creata.')} />}
    </PageState>
  );
}

interface PropsPannello {
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
  onEsportaLuogo: () => void;
  onCreaMappaCollegata: (s: SpilloDto) => Promise<void>;
  onSalvaMappa: (dati: Parameters<typeof aggiornaMappa>[1]) => Promise<void>;
  onImmagine: (file: File) => Promise<void>;
  onScaricaDallaGuida: () => Promise<void>;
  onEliminaMappa: () => void;
  onNuovaMappa: () => void;
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
  const scaricabile = mappa.entita?.tipo === 'area' || mappa.entita?.tipo === 'quartiere';
  return (
    <>
      <section className="visore-mappa__sezione" aria-label="Strumenti">
        <h3 className="visore-mappa__intestazione">Strumenti</h3>
        <div className="editor-mappa__strumenti" role="group" aria-label="Strumento attivo">
          <PulsanteVisivo tono="secondario" compatto attivo={strumento === 'seleziona'} icona={<IconaAzione chiave="seleziona" dimensione={20} />} titolo="Seleziona" dettaglio="sposta trascinando" onClick={() => p.onStrumento('seleziona')} />
          <PulsanteVisivo tono="secondario" compatto attivo={strumento === 'aggiungi'} icona={<IconaAzione chiave="carica-altri" dimensione={20} />} titolo="Aggiungi" dettaglio="tocca la mappa" onClick={() => p.onStrumento('aggiungi')} />
          <PulsanteVisivo tono="secondario" compatto attivo={strumento === 'incolla'} icona={<IconaAzione chiave="incolla" dimensione={20} />} titolo="Incolla" dettaglio={appunti ? `«${appunti.nome}»` : 'copia prima uno spillo'} disabled={!appunti} onClick={() => p.onStrumento('incolla')} />
        </div>
        {strumento === 'aggiungi' && (
          <div className="editor-mappa__palette" role="group" aria-label="Tipo del nuovo spillo">
            {TIPI_SPILLO.map((t) => (
              <button key={t} type="button" className={`editor-mappa__tipo ${t === tipoNuovo ? 'editor-mappa__tipo--attivo' : ''}`} aria-pressed={t === tipoNuovo} onClick={() => p.onTipoNuovo(t)}>
                <PuntoSpillo tipo={t} colore={DEFINIZIONI_SPILLO[t].colore} />
                <span className="truncate">{DEFINIZIONI_SPILLO[t].nome}</span>
              </button>
            ))}
          </div>
        )}
        <p className="m-0 text-[12px] text-text-muted">{strumento === 'aggiungi' ? 'Tocca la mappa dove vuoi lo spillo: viene creato subito con il tipo scelto.' : strumento === 'incolla' ? `Tocca la mappa dove vuoi la copia di «${appunti?.nome ?? 'spillo'}»: stesso tipo, nome, descrizione, riferimento e condizioni di visibilità; gli appunti restano per altre copie, anche su altre mappe.` : 'Tocca uno spillo per modificarlo, trascinalo per spostarlo (posizione salvata al rilascio); il tipo si cambia dal pannello senza ricreare lo spillo.'}</p>
      </section>

      {selezionato && (
        <FormSpillo key={selezionato.id} spillo={selezionato} occupato={occupato} onSalva={(d) => p.onSalvaSpillo(selezionato.id, d)} onCopia={p.onCopia} onElimina={() => p.onEliminaSpillo(selezionato.id)} elenchi={p.elenchi} onCreaMappaCollegata={() => p.onCreaMappaCollegata(selezionato)} onChiudi={() => p.onSeleziona(null)} onVai={p.onVai} onAggiungiImmagine={(f, did) => p.onAggiungiImmagine(selezionato.id, f, did)} onDidascalia={p.onDidascalia} onEliminaImmagine={p.onEliminaImmagine} />
      )}

      <section className="visore-mappa__sezione" aria-label="Immagine di base">
        <h3 className="visore-mappa__intestazione">Immagine di base</h3>
        <p className="m-0 text-[12px] text-text-muted">{mappa.immagineUrl ? `Immagine dell'istanza${mappa.larghezza && mappa.altezza ? ` · ${mappa.larghezza}×${mappa.altezza}` : ''}` : mappa.asset ? `Asset del repository «${mappa.asset}» (se consegnato)` : 'Nessuna immagine: gli spilli stanno su una griglia.'} Cambiare immagine mantiene gli spilli (coordinate in percentuale).</p>
        <input ref={inputImmagine} type="file" accept="image/*" className="sr-only" aria-label="File dell'immagine di base" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) void p.onImmagine(f); e.target.value = ''; }} />
        <div className="flex flex-wrap gap-1.5">
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="carica" dimensione={20} />} titolo={mappa.immagineUrl ? 'Sostituisci immagine' : 'Carica immagine'} disabled={occupato} onClick={() => inputImmagine.current?.click()} />
          {scaricabile && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="url" dimensione={20} />} titolo="Scarica dalla guida" disabled={occupato} onClick={() => void p.onScaricaDallaGuida()} />}
        </div>
      </section>

      <FormMappa key={mappa.chiave + mappa.updatedAt} mappa={mappa} albero={p.albero} occupato={occupato} onSalva={p.onSalvaMappa} onElimina={p.onEliminaMappa} />

      <section className="visore-mappa__sezione" aria-label="Albero delle mappe">
        <h3 className="visore-mappa__intestazione">Albero</h3>
        {mappa.genitore && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="indietro" dimensione={20} />} titolo={`Su: ${mappa.genitoreNome ?? mappa.genitore}`} onClick={() => p.onVai(mappa.genitore!)} />}
        {mappa.figli.length > 0 && (
          <ul className="m-0 p-0 list-none flex flex-col gap-1" aria-label="Mappe figlie">
            {mappa.figli.map((f) => (
              <li key={f.chiave}>
                <button type="button" className="visore-mappa__figlia" onClick={() => p.onVai(f.chiave)}>
                  <IconaSpillo tipo="passaggio" dimensione={18} />
                  <span className="flex-1 min-w-0 truncate">{f.nome}</span>
                  <span className="text-[11px] text-text-muted">{NOME_TIPO_MAPPA[f.tipo]}{f.numeroSpilli > 0 ? ` · ${f.numeroSpilli}` : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="carica-altri" dimensione={20} />} titolo="Nuova mappa" dettaglio={`figlia di ${mappa.nome}`} disabled={occupato} onClick={p.onNuovaMappa} />
      </section>

      <section className="visore-mappa__sezione" aria-label="Esportazione e importazione">
        <h3 className="visore-mappa__intestazione">Repository</h3>
        <p className="m-0 text-[12px] text-text-muted">«Esporta questo luogo» produce uno ZIP completo (questa mappa con le discendenti, gli spilli, le immagini di base e le schermate degli spilli, puntate come asset) da consegnare per il repository: estratto nella radice diventa dato preimpostato dell'app (`data/seed/mappe/{mappa.chiave}.json` + `public/asset/`).</p>
        <div className="flex flex-wrap gap-1.5 items-center">
          <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Esporta questo luogo" dettaglio="ZIP completo per il repository" disabled={occupato} onClick={p.onEsportaLuogo} />
        </div>
        <p className="m-0 text-[12px] text-text-muted">«Esporta» salva invece tutte le mappe in un JSON (con le immagini dell'istanza in base64) per copie e trasferimenti; «Importa» legge lo stesso formato.</p>
        <input ref={inputImporta} type="file" accept="application/json,.json" className="sr-only" aria-label="File del pacchetto da importare" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) void p.onImporta(f, sovrascrivi); e.target.value = ''; }} />
        <div className="flex flex-wrap gap-1.5 items-center">
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Esporta" dettaglio="tutte le mappe, JSON" disabled={occupato} onClick={p.onEsporta} />
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="carica" dimensione={20} />} titolo="Importa" disabled={occupato} onClick={() => inputImporta.current?.click()} />
          <label className="flex items-center gap-1 text-[12px]"><input type="checkbox" checked={sovrascrivi} onChange={(e) => setSovrascrivi(e.target.checked)} /> Sovrascrivi le mappe esistenti</label>
        </div>
      </section>
    </>
  );
}

interface PropsFormSpillo { spillo: SpilloDto; occupato: boolean; elenchi: ElenchiCondizioni; onSalva: (dati: Parameters<typeof aggiornaSpillo>[1]) => Promise<void>; onCopia: (a: AppuntiSpillo) => void; onElimina: () => Promise<void>; onCreaMappaCollegata: () => Promise<void>; onChiudi: () => void; onVai: (chiave: string) => void; onAggiungiImmagine: (file: File, didascalia: string) => Promise<void>; onDidascalia: (immagineId: number, didascalia: string) => Promise<void>; onEliminaImmagine: (immagineId: number) => Promise<void> }

/** Proprietà dello spillo selezionato con la ricerca dell'entità da collegare. */
function FormSpillo({ spillo: s, occupato, elenchi, onSalva, onCopia, onElimina, onCreaMappaCollegata, onChiudi, onVai, onAggiungiImmagine, onDidascalia, onEliminaImmagine }: PropsFormSpillo) {
  const inputSchermata = useRef<HTMLInputElement | null>(null);
  const [didascaliaNuova, setDidascaliaNuova] = useState('');
  const [nome, setNome] = useState(s.nome);
  const [tipo, setTipo] = useState<TipoSpillo>(s.tipo);
  const [descrizione, setDescrizione] = useState(s.descrizione);
  const [collezionabile, setCollezionabile] = useState(s.collezionabile);
  const [riferimento, setRiferimento] = useState<{ tipo: TipoRiferimento; chiave: string; nome?: string } | null>(s.riferimento);
  const [condizioni, setCondizioni] = useState<RequisitoSpillo[]>(() => condizioniNude(s));
  const [tipoRicerca, setTipoRicerca] = useState<TipoRiferimento>(s.riferimento?.tipo ?? DEFINIZIONI_SPILLO[s.tipo].riferimento ?? 'mappa');
  const [testoRicerca, setTestoRicerca] = useState('');
  const [risultati, setRisultati] = useState<RiferimentoTrovatoApi[] | null>(null);
  const [cercando, setCercando] = useState(false);
  const modificato = nome !== s.nome || tipo !== s.tipo || descrizione !== s.descrizione || collezionabile !== s.collezionabile || (riferimento?.tipo ?? null) !== (s.riferimento?.tipo ?? null) || (riferimento?.chiave ?? null) !== (s.riferimento?.chiave ?? null) || JSON.stringify(condizioni) !== JSON.stringify(condizioniNude(s));
  const nomeRiferimento = useMemo(() => {
    if (!riferimento) return null;
    if (riferimento.nome) return riferimento.nome;
    const d = s.dettaglio;
    return d?.mappa?.nome ?? d?.negozio?.nome ?? d?.punto?.nome ?? d?.luogo?.nome ?? d?.confidente?.nome ?? d?.richiesta?.nome ?? riferimento.chiave;
  }, [riferimento, s.dettaglio]);

  const cerca = async (e: FormEvent) => {
    e.preventDefault();
    setCercando(true);
    try { setRisultati(await cercaRiferimenti(tipoRicerca, testoRicerca)); } catch (err) { notifica('error', messaggio(err, 'Ricerca fallita.')); } finally { setCercando(false); }
  };
  const salva = (e: FormEvent) => {
    e.preventDefault();
    void onSalva({ nome: nome.trim() || s.nome, tipo, descrizione, collezionabile, riferimento: riferimento ? { tipo: riferimento.tipo, chiave: riferimento.chiave } : null, condizioni });
  };
  return (
    <section className="visore-mappa__sezione visore-mappa__scheda" aria-label={`Proprietà dello spillo: ${s.nome}`}>
      <div className="flex items-start gap-2">
        <PuntoSpillo tipo={tipo} colore={DEFINIZIONI_SPILLO[tipo].colore} grande />
        <div className="flex-1 min-w-0">
          <h3 className="m-0 font-display text-[19px] leading-tight break-words">{s.nome}</h3>
          <p className="m-0 text-[11px] uppercase tracking-wide text-text-muted">x {s.x}% · y {s.y}% · {s.origine}</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onChiudi} aria-label="Chiudi le proprietà">×</button>
      </div>
      <form className="flex flex-col gap-2" onSubmit={salva}>
        <label className="editor-mappa__campo">Nome<input className="form-input" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={160} /></label>
        <label className="editor-mappa__campo">Tipo
          <select className="form-input" value={tipo} onChange={(e) => { const t = e.target.value as TipoSpillo; setTipo(t); setCollezionabile(DEFINIZIONI_SPILLO[t].collezionabile); }}>
            {TIPI_SPILLO.map((t) => <option key={t} value={t}>{DEFINIZIONI_SPILLO[t].nome}</option>)}
          </select>
        </label>
        <label className="editor-mappa__campo">Descrizione<textarea className="form-input" rows={3} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} maxLength={2000} /></label>
        <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={collezionabile} onChange={(e) => setCollezionabile(e.target.checked)} /> Collezionabile (sparisce una volta raccolto)</label>

        <fieldset className="m-0 p-0 border-0 flex flex-col gap-1.5">
          <legend className="text-[12px] text-text-secondary">Riferimento</legend>
          {riferimento ? (
            <div className="flex items-center gap-2 text-[12px]">
              <span className="chip chip--attivo">{NOME_RIFERIMENTO[riferimento.tipo]}: {nomeRiferimento}</span>
              <button type="button" className="visore-mappa__azione-testo" onClick={() => setRiferimento(null)}>Togli</button>
              {riferimento.tipo === 'mappa' && <button type="button" className="visore-mappa__azione-testo" onClick={() => onVai(riferimento.chiave)}>Apri</button>}
            </div>
          ) : <span className="text-[12px] text-text-muted">Nessuna entità collegata.</span>}
          <div className="flex gap-1">
            <select className="form-input" value={tipoRicerca} onChange={(e) => setTipoRicerca(e.target.value as TipoRiferimento)} aria-label="Tipo di entità da cercare">
              {TIPI_RIFERIMENTO.map((t) => <option key={t} value={t}>{NOME_RIFERIMENTO[t]}</option>)}
            </select>
            <input className="form-input" value={testoRicerca} onChange={(e) => setTestoRicerca(e.target.value)} placeholder="Cerca per nome…" aria-label="Testo da cercare" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void cerca(e); } }} />
            <button type="button" className="visore-mappa__azione-testo" onClick={(e) => void cerca(e)} disabled={cercando}>Cerca</button>
          </div>
          {risultati && (
            <ul className="m-0 p-0 list-none editor-mappa__risultati" aria-label="Risultati della ricerca">
              {risultati.length === 0 && <li className="p-2 text-[12px] text-text-muted">Nessun risultato.</li>}
              {risultati.map((r) => (
                <li key={`${r.tipo}:${r.chiave}`}>
                  <button type="button" className="editor-mappa__risultato" onClick={() => { setRiferimento({ tipo: r.tipo, chiave: r.chiave, nome: r.nome }); setRisultati(null); if (r.tipo === 'mappa' && tipo === 'nota') setTipo('passaggio'); }}>
                    <span className="flex-1 min-w-0 truncate">{r.nome}</span>
                    <span className="text-text-muted">{r.dettaglio}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <CondizioniSpilloEditor condizioni={condizioni} onCambia={setCondizioni} elenchi={elenchi} disabilitato={occupato} />

        <div className="flex flex-wrap gap-1.5">
          <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva spillo" disabled={occupato || !modificato} />
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="copia" dimensione={20} />} titolo="Copia" dettaglio="per incollarlo altrove" disabled={occupato} onClick={() => onCopia({ tipo, nome: nome.trim() || s.nome, descrizione, collezionabile, riferimento: riferimento ? { tipo: riferimento.tipo, chiave: riferimento.chiave } : null, condizioni })} />
          {!riferimento && <PulsanteVisivo tono="secondario" compatto icona={<IconaSpillo tipo="passaggio" dimensione={20} />} titolo="Crea mappa collegata" disabled={occupato || modificato} onClick={() => void onCreaMappaCollegata()} />}
          <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" disabled={occupato} onClick={() => void onElimina()} />
        </div>
        {modificato && !riferimento && <span className="editor-mappa__avviso">Salva le modifiche prima di creare la mappa collegata.</span>}
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
  const [asset, setAsset] = useState(mappa.asset ?? '');
  const [note, setNote] = useState(mappa.note);
  // un discendente non può diventare genitore
  const discendenti = useMemo(() => {
    const out = new Set<string>([mappa.chiave]);
    let aggiunti = true;
    while (aggiunti) { aggiunti = false; for (const m of albero) if (m.genitore && out.has(m.genitore) && !out.has(m.chiave)) { out.add(m.chiave); aggiunti = true; } }
    return out;
  }, [albero, mappa.chiave]);
  const modificata = nome !== mappa.nome || tipo !== mappa.tipo || genitore !== (mappa.genitore ?? '') || Number(ordine) !== mappa.ordine || asset !== (mappa.asset ?? '') || note !== mappa.note;
  return (
    <section className="visore-mappa__sezione" aria-label="Proprietà della mappa">
      <h3 className="visore-mappa__intestazione">Mappa</h3>
      <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); void onSalva({ nome: nome.trim() || mappa.nome, tipo, genitore: genitore || null, ordine: Math.max(0, Math.round(Number(ordine) || 0)), asset: asset.trim() || null, note }); }}>
        <label className="editor-mappa__campo">Nome<input className="form-input" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={120} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="editor-mappa__campo">Tipo
            <select className="form-input" value={tipo} onChange={(e) => setTipo(e.target.value as TipoMappa)}>{TIPI_MAPPA.map((t) => <option key={t} value={t}>{NOME_TIPO_MAPPA[t]}</option>)}</select>
          </label>
          <label className="editor-mappa__campo">Ordine<input className="form-input" type="number" min={0} value={ordine} onChange={(e) => setOrdine(e.target.value)} /></label>
        </div>
        <label className="editor-mappa__campo">Mappa genitore
          <select className="form-input" value={genitore} onChange={(e) => setGenitore(e.target.value)}>
            <option value="">— nessuna (radice) —</option>
            {albero.filter((m) => !discendenti.has(m.chiave)).map((m) => <option key={m.chiave} value={m.chiave}>{m.nome} ({NOME_TIPO_MAPPA[m.tipo]})</option>)}
          </select>
        </label>
        <label className="editor-mappa__campo">Asset del repository (es. mappe/citta-shibuya)<input className="form-input" value={asset} onChange={(e) => setAsset(e.target.value)} maxLength={200} /></label>
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

/** Finestra «Nuova mappa»: chiave proposta dal nome, tipo coerente col genitore. */
function NuovaMappaModal({ aperta, genitore, albero, occupato, onChiudi, onCrea }: PropsNuova) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoMappa>(genitore.tipo === 'palazzo' || genitore.tipo === 'dedalo' || genitore.tipo === 'area' ? 'area' : genitore.tipo === 'citta' ? 'quartiere' : 'luogo');
  const [chiave, setChiave] = useState('');
  const chiaveEffettiva = (chiave || slug(nome)).slice(0, 80);
  const esiste = albero.some((m) => m.chiave === chiaveEffettiva);
  const valida = /^[a-z0-9][a-z0-9-]{1,79}$/.test(chiaveEffettiva) && !esiste && nome.trim().length > 0;
  return (
    <Modal titolo="Nuova mappa" aperta={aperta} onChiudi={onChiudi}
      azioni={<>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onChiudi}>Annulla</button>
        <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Crea" disabled={occupato || !valida} onClick={() => void onCrea({ chiave: chiaveEffettiva, nome: nome.trim(), tipo, genitore: genitore.chiave, ordine: genitore.figli.length })} />
      </>}>
      <div className="flex flex-col gap-2">
        <label className="editor-mappa__campo">Nome<input className="form-input" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} autoFocus /></label>
        <label className="editor-mappa__campo">Tipo
          <select className="form-input" value={tipo} onChange={(e) => setTipo(e.target.value as TipoMappa)}>{TIPI_MAPPA.map((t) => <option key={t} value={t}>{NOME_TIPO_MAPPA[t]}</option>)}</select>
        </label>
        <label className="editor-mappa__campo">Chiave (minuscole, cifre, trattini)<input className="form-input" value={chiave} onChange={(e) => setChiave(e.target.value)} placeholder={slug(nome) || 'proposta dal nome'} maxLength={80} /></label>
        <p className="m-0 text-[12px] text-text-muted">Genitore: {genitore.nome}. {esiste ? <span className="editor-mappa__avviso">Esiste già una mappa con questa chiave.</span> : chiaveEffettiva ? `Chiave: ${chiaveEffettiva}` : ''}</p>
      </div>
    </Modal>
  );
}
