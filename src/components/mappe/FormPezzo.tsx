// ============================================================
// FormPezzo — le proprietà di un pezzo della planimetria nell'editor (102, 2026-10-14)
// ============================================================
//
// Richiesta dell'utente: «permettermi di selezionarle con il mouse (toglierle dalla visualizzazione ordinaria e gestirle con le
// condizioni come i pin in punti specifici della mappa occupando lo stesso spazio originale...)»; «devo poter selezionare io aree da
// gestire come pezzi». Scelte: zona d'origine sempre cancellata; senza condizioni nascosto (in trasparenza a richiesta); rotazione
// a 90° e specchio. Qui: nome, posizione al pixel (campi e pulsanti di 1 px, per far combaciare il pezzo), rotazione, specchio,
// condizioni (quelle dei pin) ed eliminazione con conferma. Sulla mappa il pezzo si sposta anche trascinandolo.
// ============================================================

import { useState, type FormEvent } from 'react';
import type { DatiPezzoMappa, PezzoMappaDto, RotazionePezzo } from '../../types';
import { ingombroPezzo } from '../../../shared/pezziMappa';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { normalizzaRequisitoSpillo, type RequisitoSpillo } from '../../../shared/condizioniSpillo';
import type { ElenchiCondizioni } from '../../utils/condizioniSpillo';
import { CondizioniEditor } from '../guida/CondizioniEditor';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { Modal } from '../shared/Modal';
import { notifica } from '../../stores/notificationStore';

const ROTAZIONI: RotazionePezzo[] = [0, 90, 180, 270];

interface Props {
  pezzo: PezzoMappaDto;
  /** Le dimensioni dell'immagine, per tenere il pezzo dentro (null se non note: lo controlla il server). */
  immagine: { larghezza: number; altezza: number } | null;
  elenchi: ElenchiCondizioni;
  occupato: boolean;
  onSalva: (dati: DatiPezzoMappa) => Promise<void>;
  onElimina: () => Promise<void>;
  onChiudi: () => void;
}

/** Le condizioni del pezzo senza il testo descrittivo (quel che si rimanda al server). */
const condizioniNude = (p: PezzoMappaDto): RequisitoSpillo[] =>
  p.condizioni.map((c) => { const copia: Record<string, unknown> = { ...c }; delete copia.testo; return copia as unknown as RequisitoSpillo; });

/** Il modulo del pezzo selezionato: si salva tutto insieme con «Salva pezzo»; «Elimina» chiede conferma. */
export function FormPezzo({ pezzo: p, immagine, elenchi, occupato, onSalva, onElimina, onChiudi }: Props) {
  const [nome, setNome] = useState(p.nome);
  const [x, setX] = useState(p.posizione.x);
  const [y, setY] = useState(p.posizione.y);
  const [rotazione, setRotazione] = useState<RotazionePezzo>(p.rotazione);
  const [orizzontale, setOrizzontale] = useState(p.specchio.orizzontale);
  const [verticale, setVerticale] = useState(p.specchio.verticale);
  const [condizioni, setCondizioni] = useState<RequisitoSpillo[]>(() => condizioniNude(p));
  const [conferma, setConferma] = useState(false);
  const ingombro = ingombroPezzo(p.sorgente.larghezza, p.sorgente.altezza, rotazione);
  // il massimo che tiene tutto il pezzo (ruotato) dentro l'immagine
  const xMax = immagine ? Math.max(0, immagine.larghezza - ingombro.larghezza) : undefined;
  const yMax = immagine ? Math.max(0, immagine.altezza - ingombro.altezza) : undefined;
  /** Un intero fra 0 e il massimo (se noto). */
  const dentro = (v: number, max: number | undefined) => Math.max(0, Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.round(Number.isFinite(v) ? v : 0)));
  const dati: DatiPezzoMappa = { nome: nome.trim() || p.nome, posizione: { x: dentro(x, xMax), y: dentro(y, yMax) }, rotazione, specchio: { orizzontale, verticale }, condizioni };
  const modificato = dati.nome !== p.nome || dati.posizione!.x !== p.posizione.x || dati.posizione!.y !== p.posizione.y || rotazione !== p.rotazione
    || orizzontale !== p.specchio.orizzontale || verticale !== p.specchio.verticale || JSON.stringify(condizioni) !== JSON.stringify(condizioniNude(p));
  /** Salva tutto; un gruppo di condizioni vuoto o incompleto blocca, come nei pin. */
  const salva = (e: FormEvent) => {
    e.preventDefault();
    if (!condizioni.every((c) => normalizzaRequisitoSpillo(c) !== null)) { notifica('error', 'Completa o rimuovi i gruppi vuoti prima di salvare.'); return; }
    void onSalva(dati);
  };
  /** Sposta di un pixel (le frecce: il modo di far combaciare il pezzo anche sul telefono, dove i campi numerici non hanno frecce). */
  const sposta = (dx: number, dy: number) => { setX((v) => dentro(v + dx, xMax)); setY((v) => dentro(v + dy, yMax)); };
  return (
    <section className="visore-mappa__sezione visore-mappa__scheda" aria-label={`Proprietà del pezzo: ${p.nome}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="m-0 font-display text-[19px] leading-tight break-words">{p.nome}</h3>
          <p className="m-0 text-[11px] uppercase tracking-wide text-text-muted">Zona d’origine · {p.sorgente.x}, {p.sorgente.y} · {p.sorgente.larghezza}×{p.sorgente.altezza} px</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm touch" onClick={onChiudi} aria-label="Chiudi le proprietà del pezzo">×</button>
      </div>
      <form className="flex flex-col gap-2" onSubmit={salva}>
        <label className="editor-mappa__campo">Nome<input className="form-input" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={LIMITI_GUIDA.spillo.nome} /></label>
        <fieldset className="m-0 p-0 border-0 flex flex-col gap-1.5">
          <legend className="text-[12px] text-text-secondary mb-1">Posizione (angolo in alto a sinistra, pixel dell’immagine)</legend>
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
          <span className="text-[12px] text-text-secondary">Rotazione</span>
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Rotazione del pezzo">
            {ROTAZIONI.map((r) => (
              <button key={r} type="button" role="radio" aria-checked={rotazione === r} className={`btn btn-sm touch min-w-14 ${rotazione === r ? 'btn-primary' : 'btn-secondary'}`} disabled={occupato} onClick={() => setRotazione(r)}>{r}°</button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="touch flex items-center gap-2 text-[12px]"><input type="checkbox" className="w-5 h-5" checked={orizzontale} disabled={occupato} onChange={(e) => setOrizzontale(e.target.checked)} />Specchia in orizzontale</label>
          <label className="touch flex items-center gap-2 text-[12px]"><input type="checkbox" className="w-5 h-5" checked={verticale} disabled={occupato} onChange={(e) => setVerticale(e.target.checked)} />Specchia in verticale</label>
        </div>
        <p className="m-0 text-[12px] text-text-muted">La zona d’origine resta sempre cancellata dalla mappa. Il pezzo si vede quando le sue condizioni valgono; se no è nascosto, e compare in trasparenza con «Mostra anche i non ancora disponibili». Sulla mappa si sposta anche trascinandolo.</p>
        <CondizioniEditor condizioni={condizioni} onCambia={setCondizioni} elenchi={elenchi} disabilitato={occupato} perSpillo />
        <div className="flex flex-wrap gap-1.5">
          <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva pezzo" disabled={occupato || !modificato} />
          <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" disabled={occupato} onClick={() => setConferma(true)} />
        </div>
      </form>
      <Modal titolo={`Eliminare il pezzo «${p.nome}»?`} aperta={conferma} onChiudi={() => setConferma(false)}
        azioni={<>
          <button type="button" className="btn btn-secondary btn-sm touch" onClick={() => setConferma(false)}>Annulla</button>
          <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" disabled={occupato} onClick={() => { setConferma(false); void onElimina(); }} />
        </>}>
        <p className="m-0 text-[13px]">La sua zona d’origine torna visibile nell’immagine della mappa, per tutte le partite.</p>
      </Modal>
    </section>
  );
}
