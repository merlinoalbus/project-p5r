// ============================================================
// FormPezzo — le proprietà di una copia di un pezzo della planimetria nell'editor (102, 2026-10-14; copie dalla 103, 2026-10-15)
// ============================================================
//
// Richiesta dell'utente: «permettermi di selezionarle con il mouse (toglierle dalla visualizzazione ordinaria e gestirle con le
// condizioni come i pin in punti specifici della mappa occupando lo stesso spazio originale...)»; «devo poter selezionare io aree da
// gestire come pezzi». Scelte: zona d'origine sempre cancellata; senza condizioni nascosto (in trasparenza a richiesta); rotazione
// a 90° e specchio. Poi (2026-10-15): «vorrei poter usare un pezzo una volta recuperato e definito per inserirlo più volte nella
// mappa». Scelte: ritaglio con copie; condizioni per copia; eliminata l'ultima copia se ne va il ritaglio; nome del pezzo più
// etichetta facoltativa della copia (vuota = «Nome · copia N»).
// Qui, per la copia selezionata: il nome del pezzo (comune a tutte le copie), l'etichetta della copia, la posizione al pixel (campi
// e pulsanti di 1 px, per far combaciare il pezzo), rotazione, specchio, condizioni (quelle dei pin); «Aggiungi copia», «Elimina
// copia» ed «Elimina pezzo» (con conferma). Sulla mappa la copia si sposta anche trascinandola.
// ============================================================

import { useState, type FormEvent } from 'react';
import type { CopiaPezzoDto, DatiAggiornaCopiaPezzo, PezzoMappaDto, RotazionePezzo } from '../../types';
import { ingombroPezzo } from '../../../shared/pezziMappa';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { normalizzaRequisitoSpillo, type RequisitoSpillo } from '../../../shared/condizioniSpillo';
import { condizioniSenzaTesto, type ElenchiCondizioni } from '../../utils/condizioniSpillo';
import { nomeCopia } from '../../utils/pezziMappa';
import { CondizioniEditor } from '../guida/CondizioniEditor';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { Modal } from '../shared/Modal';
import { notifica } from '../../stores/notificationStore';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

const ROTAZIONI: RotazionePezzo[] = [0, 90, 180, 270];

interface Props {
  pezzo: PezzoMappaDto;
  /** La copia selezionata e il suo posto fra le copie del pezzo (da 0). */
  copia: CopiaPezzoDto;
  indice: number;
  /** Le dimensioni dell'immagine, per tenere la copia dentro (null se non note: lo controlla il server). */
  immagine: { larghezza: number; altezza: number } | null;
  elenchi: ElenchiCondizioni;
  occupato: boolean;
  /** Salva la copia (e, se cambiato, il nome del pezzo: `nomePezzo`). */
  onSalva: (dati: DatiAggiornaCopiaPezzo) => Promise<void>;
  /** Aggiunge una copia dello stesso pezzo accanto a questa. */
  onAggiungiCopia: () => Promise<void>;
  onEliminaCopia: () => Promise<void>;
  onEliminaPezzo: () => Promise<void>;
  onChiudi: () => void;
}

/** Le condizioni della copia senza il testo descrittivo (quel che si rimanda al server). */
const condizioniNude = (c: CopiaPezzoDto): RequisitoSpillo[] => condizioniSenzaTesto(c.condizioni);

/** Il modulo della copia selezionata: si salva tutto insieme con «Salva copia»; le eliminazioni chiedono conferma. */
// L12 (passo 8): nel rilascio (sola lettura) il modulo non esiste; la condizione è costante di build, `FormPezzoReale` esce dal bundle
export const FormPezzo: StrumentoDiModifica<typeof FormPezzoReale> = IN_RILASCIO ? NienteInRilascio : FormPezzoReale;
function FormPezzoReale({ pezzo: p, copia: c, indice, immagine, elenchi, occupato, onSalva, onAggiungiCopia, onEliminaCopia, onEliminaPezzo, onChiudi }: Props) {
  const [nome, setNome] = useState(p.nome);
  const [etichetta, setEtichetta] = useState(c.etichetta);
  const [x, setX] = useState(c.posizione.x);
  const [y, setY] = useState(c.posizione.y);
  const [rotazione, setRotazione] = useState<RotazionePezzo>(c.rotazione);
  const [orizzontale, setOrizzontale] = useState(c.specchio.orizzontale);
  const [verticale, setVerticale] = useState(c.specchio.verticale);
  const [condizioni, setCondizioni] = useState<RequisitoSpillo[]>(() => condizioniNude(c));
  const [conferma, setConferma] = useState<'copia' | 'pezzo' | null>(null);
  const ingombro = ingombroPezzo(p.sorgente.larghezza, p.sorgente.altezza, rotazione);
  const titolo = nomeCopia(p, c, indice);
  const ultima = p.copie.length === 1;
  // il massimo che tiene tutta la copia (ruotata) dentro l'immagine
  const xMax = immagine ? Math.max(0, immagine.larghezza - ingombro.larghezza) : undefined;
  const yMax = immagine ? Math.max(0, immagine.altezza - ingombro.altezza) : undefined;
  /** Un intero fra 0 e il massimo (se noto). */
  const dentro = (v: number, max: number | undefined) => Math.max(0, Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.round(Number.isFinite(v) ? v : 0)));
  const nomeNuovo = nome.trim() || p.nome;
  const dati: DatiAggiornaCopiaPezzo = {
    etichetta: etichetta.trim(), posizione: { x: dentro(x, xMax), y: dentro(y, yMax) }, rotazione, specchio: { orizzontale, verticale }, condizioni,
    ...(nomeNuovo !== p.nome ? { nomePezzo: nomeNuovo } : {}),
  };
  const modificato = nomeNuovo !== p.nome || dati.etichetta !== c.etichetta || dati.posizione!.x !== c.posizione.x || dati.posizione!.y !== c.posizione.y || rotazione !== c.rotazione
    || orizzontale !== c.specchio.orizzontale || verticale !== c.specchio.verticale || JSON.stringify(condizioni) !== JSON.stringify(condizioniNude(c));
  /** Salva tutto; un gruppo di condizioni vuoto o incompleto blocca, come nei pin. */
  const salva = (e: FormEvent) => {
    e.preventDefault();
    if (!condizioni.every((r) => normalizzaRequisitoSpillo(r) !== null)) { notifica('error', 'Completa o rimuovi i gruppi vuoti prima di salvare.'); return; }
    void onSalva(dati);
  };
  /** Sposta di un pixel (le frecce: il modo di far combaciare il pezzo anche sul telefono, dove i campi numerici non hanno frecce). */
  const sposta = (dx: number, dy: number) => { setX((v) => dentro(v + dx, xMax)); setY((v) => dentro(v + dy, yMax)); };
  return (
    <section className="visore-mappa__sezione visore-mappa__scheda" aria-label={`Proprietà della copia: ${titolo}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="m-0 font-display testo-20 leading-tight break-words">{titolo}</h3>
          <p className="m-0 testo-12 uppercase tracking-wide text-text-muted">Copia {indice + 1} di {p.copie.length} · zona d’origine {p.sorgente.x}, {p.sorgente.y} · {p.sorgente.larghezza}×{p.sorgente.altezza} px</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm touch" onClick={onChiudi} aria-label="Chiudi le proprietà della copia">×</button>
      </div>
      <form className="flex flex-col gap-2" onSubmit={salva}>
        <label className="editor-mappa__campo">Nome del pezzo<input className="form-input" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={LIMITI_GUIDA.spillo.nome} /></label>
        <span className="-mt-1 testo-12 text-text-muted">Comune a tutte le copie del pezzo.</span>
        <label className="editor-mappa__campo">Etichetta della copia
          <input className="form-input" value={etichetta} onChange={(e) => setEtichetta(e.target.value)} maxLength={LIMITI_GUIDA.spillo.nome} placeholder={`${nomeNuovo} · copia ${indice + 1}`} />
        </label>
        <fieldset className="m-0 p-0 border-0 flex flex-col gap-1.5">
          <legend className="testo-12 text-text-secondary mb-1">Posizione (angolo in alto a sinistra, pixel dell’immagine)</legend>
          <div className="flex flex-wrap items-end gap-2">
            <label className="editor-mappa__campo w-24">X<input className="form-input" type="number" inputMode="numeric" min={0} max={xMax} step={1} value={x} onChange={(e) => setX(Number(e.target.value))} /></label>
            <label className="editor-mappa__campo w-24">Y<input className="form-input" type="number" inputMode="numeric" min={0} max={yMax} step={1} value={y} onChange={(e) => setY(Number(e.target.value))} /></label>
            <div className="flex gap-1" role="group" aria-label="Sposta di un pixel">
              {([[-1, 0, 'sinistra', '←'], [0, -1, 'su', '↑'], [0, 1, 'giù', '↓'], [1, 0, 'destra', '→']] as const).map(([dx, dy, verso, freccia]) => (
                <button key={verso} type="button" className="btn btn-secondary btn-sm touch min-w-11" aria-label={`Sposta di 1 px a ${verso}`} disabled={occupato} onClick={() => sposta(dx, dy)}>{freccia}</button>
              ))}
            </div>
          </div>
        </fieldset>
        <div className="flex flex-col gap-1">
          <span className="testo-12 text-text-secondary">Rotazione</span>
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Rotazione della copia">
            {ROTAZIONI.map((r) => (
              <button key={r} type="button" role="radio" aria-checked={rotazione === r} className={`btn btn-sm touch min-w-14 ${rotazione === r ? 'btn-primary' : 'btn-secondary'}`} disabled={occupato} onClick={() => setRotazione(r)}>{r}°</button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="touch flex items-center gap-2 testo-12"><input type="checkbox" className="w-5 h-5" checked={orizzontale} disabled={occupato} onChange={(e) => setOrizzontale(e.target.checked)} />Specchia in orizzontale</label>
          <label className="touch flex items-center gap-2 testo-12"><input type="checkbox" className="w-5 h-5" checked={verticale} disabled={occupato} onChange={(e) => setVerticale(e.target.checked)} />Specchia in verticale</label>
        </div>
        <p className="m-0 testo-12 text-text-muted">La zona d’origine resta sempre cancellata dalla mappa. Ogni copia si vede quando valgono le sue condizioni; se no è nascosta, e compare in trasparenza con «Mostra anche i non ancora disponibili». Sulla mappa si sposta anche trascinandola.</p>
        <CondizioniEditor condizioni={condizioni} onCambia={setCondizioni} elenchi={elenchi} disabilitato={occupato} perSpillo />
        <div className="flex flex-wrap gap-1.5">
          <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva copia" disabled={occupato || !modificato} />
          {/* la copia nuova parte da quella salvata: con modifiche in sospeso andrebbero perse cambiando selezione */}
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="carica-altri" dimensione={20} />} titolo="Aggiungi copia" dettaglio={modificato ? 'salva prima le modifiche' : 'accanto a questa'}
            disabled={occupato || modificato} onClick={() => void onAggiungiCopia()} />
          <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo={ultima ? 'Elimina' : 'Elimina copia'} disabled={occupato} onClick={() => setConferma('copia')} />
          {!ultima && <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina pezzo" dettaglio={`con le ${p.copie.length} copie`} disabled={occupato} onClick={() => setConferma('pezzo')} />}
        </div>
      </form>
      <Modal titolo={conferma === 'pezzo' ? `Eliminare il pezzo «${p.nome}» con tutte le copie?` : ultima ? `Eliminare il pezzo «${p.nome}»?` : `Eliminare la copia «${titolo}»?`} aperta={conferma !== null} onChiudi={() => setConferma(null)}
        azioni={<>
          <button type="button" className="btn btn-secondary btn-sm touch" onClick={() => setConferma(null)}>Annulla</button>
          <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" disabled={occupato}
            onClick={() => { const cosa = conferma; setConferma(null); void (cosa === 'pezzo' ? onEliminaPezzo() : onEliminaCopia()); }} />
        </>}>
        <p className="m-0 testo-13">
          {conferma === 'pezzo'
            ? `Se ne vanno tutte le ${p.copie.length} copie e la zona d’origine torna visibile nell’immagine della mappa, per tutte le partite.`
            : ultima
              ? 'È l’ultima copia: con lei se ne va il pezzo, e la sua zona d’origine torna visibile nell’immagine della mappa, per tutte le partite.'
              : `${p.copie.length - 1 === 1 ? 'L’altra copia resta' : `Le altre ${p.copie.length - 1} copie restano`} sulla mappa; la zona d’origine resta cancellata.`}
        </p>
      </Modal>
    </section>
  );
}
