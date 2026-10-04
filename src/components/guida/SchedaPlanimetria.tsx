// ============================================================
// SchedaPlanimetria — tutto quel che si sistema di una planimetria, in una finestra sola
// ============================================================
//
// Richiesta dell'utente (2026-09-30): la colonna del Palazzo «è fatta molto male ed è poco usabile… deve
// permettere di riordinare le planimetrie, associare Aree della Guida e soprattutto cambiare i nomi in
// che cosa mostra (etichetta). Devo poter rimuovere un'area/planimetria». Prima ogni riga portava matita,
// frecce, Editor, cestino e selettore delle aree: la matita apriva il modulo dentro la colonna stretta,
// che sforava, e la conferma del cestino compariva in fondo all'elenco, fuori vista.
//
// Scelta dell'utente: **l'elenco serve a scegliere, la scheda a sistemare**. Qui stanno il nome della
// stanza (vale per tutte le sue planimetrie), «Che cosa mostra» (l'etichetta della versione), il nome
// della planimetria, le aree della guida, l'editor dell'immagine e l'eliminazione — con la conferma
// nel piè della finestra, sempre in vista.
// ============================================================

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { CollegamentoVisivo, PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { CampoCorrezione } from './CorrezioneGuida';
import { SceltaAreePlanimetria } from './SceltaAreePlanimetria';
import { ModuloNuovaArea, type DatiNuovaArea } from './ModuloNuovaArea';
import { notifica } from '../../stores/notificationStore';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { perOrdineDiGuida, type Planimetria } from '../../utils/gruppiPlanimetrie';
import { SOGLIA_RICERCA } from '../../utils/selettore';
import { corrispondeRicerca } from '../../../shared/testo';

export interface ModificheScheda {
  stanza?: string;
  /** `null`: torna all'etichetta dedotta dall'estrazione. */
  etichetta?: string | null;
  nome?: string;
  aree?: string[];
}

interface Props {
  planimetria: Planimetria;
  /** Nome della stanza a cui appartiene. */
  stanza: string;
  /** Quante planimetrie ha la stanza: il nome vale per tutte. */
  versioni: number;
  /** L'etichetta scritta a mano, se c'è; altrimenti vuota. */
  etichetta: string;
  /** Come la si chiamerebbe senza etichetta: il suggerimento del campo. */
  etichettaDedotta: string;
  /** Il nome della planimetria, senza il Palazzo davanti. */
  nome: string;
  /** Tutte le aree del Palazzo, in ordine di guida. */
  aree: Array<{ chiave: string; nome: string; ordine: number }>;
  /** Per ogni area che sta anche su altre planimetrie, i nomi di quelle (un'area può stare su più tavole, 2026-10-04). */
  altrove: ReadonlyMap<string, readonly string[]>;
  /** Le altre stanze del Palazzo, ognuna rappresentata da una sua planimetria (`chiave`). */
  altreStanze: Array<{ chiave: string; nome: string; dettaglio?: string }>;
  onSalva: (m: ModificheScheda) => Promise<void>;
  /** Entra nella stanza di `con` (`nome`: come chiamarla se non ha ancora un nome suo) o, con `null`, diventa una stanza a sé (`nome`). */
  onCambiaStanza: (con: string | null, nome: string) => Promise<void>;
  onElimina: () => Promise<void>;
  /** Una sezione nuova della guida dentro questa planimetria (2026-10-01). */
  onCreaArea: (dati: DatiNuovaArea) => Promise<void>;
  onChiudi: () => void;
}

/**
 * Che cosa succede alle aree della guida eliminando la planimetria, per la conferma: quelle che stanno anche su altre tavole
 * restano lì (2026-10-04), le altre restano senza planimetria. Stringa vuota se la planimetria non contiene aree.
 */
function testoAreeDopoEliminazione(aree: Planimetria['aree'], altrove: ReadonlyMap<string, readonly string[]>): string {
  const ordinate = [...aree].sort(perOrdineDiGuida);
  /** I nomi delle aree fra virgolette, separati da virgole. */
  const nomi = (xs: typeof ordinate) => xs.map((a) => `«${a.nome}»`).join(', ');
  const senza = ordinate.filter((a) => !(altrove.get(a.chiave)?.length));
  const altre = ordinate.filter((a) => !!altrove.get(a.chiave)?.length);
  const parti: string[] = [];
  if (senza.length) parti.push(`${senza.length === 1 ? 'L’area della guida' : 'Le aree della guida'} ${nomi(senza)} ${senza.length === 1 ? 'resta' : 'restano'} senza planimetria.`);
  if (altre.length) parti.push(altre.length === 1
    ? `L’area ${nomi(altre)} resta sulle altre planimetrie che la contengono.`
    : `Le aree ${nomi(altre)} restano sulle altre planimetrie che le contengono.`);
  return parti.length ? ` ${parti.join(' ')}` : '';
}

/**
 * La finestra di una planimetria. Calcola a ogni disegno le modifiche da salvare confrontando i campi (stanza,
 * etichetta, nome, aree spuntate) con i valori d'apertura: un'etichetta svuotata si salva come null, e rinominando
 * la planimetria si fissa anche il nome della stanza. Offre «Salva», la creazione di un'area dentro la planimetria,
 * il cambio di stanza (a sé o in un'altra), il collegamento all'editor ed «Elimina…» con la conferma nel piè.
 * Le azioni immediate aspettano finché ci sono modifiche non salvate o la conferma è aperta.
 */
export function SchedaPlanimetria({ planimetria: p, stanza, versioni, etichetta, etichettaDedotta, nome, aree, altrove, altreStanze, onSalva, onCambiaStanza, onElimina, onCreaArea, onChiudi }: Props) {
  const [valori, setValori] = useState({ stanza, etichetta, nome });
  const [sposta, setSposta] = useState(false);
  const [cerca, setCerca] = useState('');
  // le aree all'apertura: il metro per capire se l'insieme è cambiato
  const [iniziali] = useState(() => new Set(p.aree.map((a) => a.chiave)));
  const [spuntate, setSpuntate] = useState<Set<string>>(() => new Set(iniziali));
  const [conferma, setConferma] = useState(false);
  const [nuovaArea, setNuovaArea] = useState(false);
  const [occupato, setOccupato] = useState(false);

  const modifiche: ModificheScheda = {};
  if (valori.stanza.trim() && valori.stanza.trim() !== stanza) modifiche.stanza = valori.stanza.trim();
  if (valori.etichetta.trim() !== etichetta) modifiche.etichetta = valori.etichetta.trim() || null;
  if (valori.nome.trim() && valori.nome.trim() !== nome) modifiche.nome = valori.nome.trim();
  // Rinominare la planimetria non deve rinominare la stanza: una mappa rinominata a mano presentava il suo nome
  // anche come titolo della stanza. Fissando qui il nome della stanza, lo decide la stanza (2026-09-30).
  if (modifiche.nome !== undefined && modifiche.stanza === undefined) modifiche.stanza = stanza;
  const areeCambiate = spuntate.size !== iniziali.size || [...spuntate].some((k) => !iniziali.has(k));
  if (areeCambiate) modifiche.aree = aree.filter((a) => spuntate.has(a.chiave)).map((a) => a.chiave);
  const daSalvare = Object.keys(modifiche).length > 0;

  /** Esegue un'operazione con i comandi bloccati; l'errore va in notifica (l'esito positivo lo gestisce chi apre la scheda). */
  const esegui = async (azione: () => Promise<void>) => {
    setOccupato(true);
    try { await azione(); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Operazione non riuscita.'); } finally { setOccupato(false); }
  };

  return (
    // La conferma dell'eliminazione sta nel piè della finestra, che resta sempre in vista: in fondo al
    // corpo, sotto le aree del Palazzo, andava cercata scorrendo (verifica nel browser, 2026-09-30).
    <Modal titolo={`${stanza} · ${etichetta || etichettaDedotta}`} aperta onChiudi={onChiudi}
      azioni={conferma
        ? <div role="alertdialog" aria-label="Conferma eliminazione" className="flex w-full flex-col gap-2 rounded-md border border-primary bg-primary-bg p-2.5">
            <p className="m-0 text-[13px]">
              Elimino «{etichetta || etichettaDedotta}» di {stanza}? Se ne vanno anche i suoi spilli{p.n > 0 ? `, compresi ${p.n} da raccogliere` : ''}.
              {testoAreeDopoEliminazione(p.aree, altrove)}
              {' '}L’immagine di base resta fra le immagini caricate.
            </p>
            <div className="flex flex-wrap justify-end gap-1.5">
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Non eliminare" onClick={() => setConferma(false)} />
              <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina la planimetria" disabled={occupato} onClick={() => void esegui(onElimina)} />
            </div>
          </div>
        : <>
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={onChiudi} />
            <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva" disabled={occupato || !daSalvare}
              onClick={() => void esegui(() => onSalva(modifiche))} />
          </>}>
      <form className="flex flex-col gap-3" aria-label={`Scheda della planimetria «${etichetta || etichettaDedotta}» di ${stanza}`}
        onSubmit={(e) => { e.preventDefault(); if (daSalvare && !occupato) void esegui(() => onSalva(modifiche)); }}>
        <div className="flex flex-col gap-1">
          <CampoCorrezione etichetta="Nome della stanza" valore={valori.stanza} massimo={LIMITI_GUIDA.mappa.gruppoNome} onCambia={(v) => setValori((x) => ({ ...x, stanza: v }))} />
          {versioni > 1 && <span className="text-[11px] text-text-muted">Vale per tutte e {versioni} le planimetrie della stanza.</span>}
        </div>
        <div className="flex flex-col gap-1">
          <CampoCorrezione etichetta="Che cosa mostra" valore={valori.etichetta} massimo={LIMITI_GUIDA.mappa.etichetta} onCambia={(v) => setValori((x) => ({ ...x, etichetta: v }))} />
          {/* senza etichetta la versione prende il suo numero nella stanza («Immagine 2»): lo si dice com'è,
              e svuotare un'etichetta che c'era la perde (rilievo della revisione) */}
          <span className="text-[11px] text-text-muted">
            {valori.etichetta.trim()
              ? 'Distingue questa planimetria dalle altre della stanza.'
              : `Vuoto: si chiama col suo numero nella stanza, «${etichettaDedotta}»${etichetta ? `; l’etichetta «${etichetta}» si perde` : ''}.`}
          </span>
        </div>
        <CampoCorrezione etichetta="Nome della planimetria" valore={valori.nome} massimo={LIMITI_GUIDA.mappa.nome} onCambia={(v) => setValori((x) => ({ ...x, nome: v }))} />
        <SceltaAreePlanimetria aree={aree} spuntate={spuntate} onCambia={setSpuntate} altrove={altrove} />
        {/* invio da tastiera nei campi di testo */}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>

      {/* Una sezione nuova della guida dentro questa planimetria (richiesta dell'utente, 2026-10-01): per una stanza che la
          guida non ha trascritto. Il nome proposto è quello della stanza; il posto, dopo l'ultima area che la planimetria ha.
          Come per la stanza, con modifiche non salvate qui sopra si aspetta: rileggendo il Palazzo andrebbero perse. */}
      <section aria-label="Nuova area della guida" className="flex flex-col gap-2 border-t border-border-light pt-3">
        {nuovaArea
          ? <ModuloNuovaArea aree={aree} nomeIniziale={stanza} occupato={occupato}
              // creata l'area la scheda si chiude e il Palazzo si rilegge: con modifiche non salvate qui sopra (o la conferma
              // d'eliminazione aperta) si aspetta, anche a modulo già aperto (rilievo della revisione)
              bloccato={daSalvare ? 'Salva prima le modifiche della scheda: creando l’area la finestra si chiude.' : conferma ? 'Chiudi prima la conferma dell’eliminazione.' : undefined}
              dopoIniziale={[...p.aree].sort(perOrdineDiGuida).at(-1)?.chiave}
              onCrea={(dati) => esegui(() => onCreaArea(dati))} onAnnulla={() => setNuovaArea(false)} />
          : <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] text-text-muted">{p.aree.length === 0 ? 'Non contiene sezioni della guida: creane una qui.' : 'Una sezione della guida in più, dentro questa planimetria.'}</span>
              <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Nuova area della guida…" disabled={occupato || daSalvare || conferma} onClick={() => setNuovaArea(true)} />
            </div>}
        {daSalvare && !nuovaArea && <span className="text-[11px] text-text-muted" role="status">Salva prima le modifiche qui sopra per creare un’area.</span>}
      </section>

      {/* La stanza (richiesta dell'utente, 2026-09-30): una planimetria a sé può diventare una versione di
          un'altra stanza, e una versione può diventare una stanza a sé. Sono azioni immediate, che rileggono
          il Palazzo: con modifiche non salvate nel modulo si aspetta, altrimenti andrebbero perse. */}
      <section aria-label="Stanza della planimetria" className="flex flex-col gap-2 border-t border-border-light pt-3">
        <span className="text-[12px]">Stanza</span>
        {daSalvare && <span className="text-[11px] text-text-muted" role="status">Salva prima le modifiche qui sopra per cambiare stanza.</span>}
        {versioni > 1
          ? <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] text-text-muted">È una delle {versioni} planimetrie di «{stanza}».</span>
              <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Rendila una stanza a sé" disabled={occupato || daSalvare || conferma}
                onClick={() => void esegui(() => onCambiaStanza(null, valori.nome.trim() || nome))} />
            </div>
          : <span className="text-[12px] text-text-muted">È una stanza a sé.</span>}
        {altreStanze.length > 0 && (sposta
          ? <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
              <legend className="mb-1 p-0 text-[12px]">Sposta in un’altra stanza</legend>
              <span className="text-[11px] text-text-muted">Diventa una planimetria di quella stanza, in fondo alle sue; le sue aree e i suoi spilli restano suoi.</span>
              {altreStanze.length >= SOGLIA_RICERCA && (
                <input className="form-input" type="search" value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca una stanza…" aria-label="Cerca una stanza" autoComplete="off" />
              )}
              <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label="Stanze in cui spostarla">
                {altreStanze.filter((s) => corrispondeRicerca(cerca, s.nome, s.dettaglio)).map((s) => (
                  <li key={s.chiave}>
                    <button type="button" className="touch flex w-full flex-col rounded-md border border-border-light px-2.5 py-1.5 text-left hover:border-primary disabled:opacity-50" disabled={occupato || daSalvare || conferma}
                      onClick={() => void esegui(() => onCambiaStanza(s.chiave, s.nome))}>
                      <span className="text-[13px] font-semibold leading-tight">{s.nome}</span>
                      {s.dettaglio && <span className="text-[11px] leading-tight text-text-muted">{s.dettaglio}</span>}
                    </button>
                  </li>
                ))}
              </ul>
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Lascia nella sua stanza" className="self-start" onClick={() => { setSposta(false); setCerca(''); }} />
            </fieldset>
          : <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] text-text-muted">Può diventare una planimetria di un’altra stanza.</span>
              <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Sposta in un’altra stanza…" disabled={occupato || daSalvare || conferma} onClick={() => setSposta(true)} />
            </div>)}
      </section>

      <div className="flex flex-col gap-2 border-t border-border-light pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] text-text-muted">Immagine e spilli si modificano nell’editor.</span>
          <CollegamentoVisivo to={`/guida/mappe/${encodeURIComponent(p.chiave)}/modifica`} tono="secondario" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Apri nell’editor" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] text-text-muted">Toglie la planimetria dal Palazzo, con i suoi spilli.</span>
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina…" disabled={occupato || conferma} onClick={() => setConferma(true)} />
        </div>
      </div>
    </Modal>
  );
}
