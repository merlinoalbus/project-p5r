// ============================================================
// CampiEffettoVoce — i campi di un effetto della spunta, ognuno scelto PER NOME (mai chiavi digitate)
// ============================================================
//
// Un effetto cita il suo oggetto con una chiave interna (`makoto/07-30`, `takemi-clinic/…`, il numero di una Persona, la chiave di un
// evento): qui si sceglie da elenchi con ricerca (serviti da `percorso-elenchi` e `percorso-elenchi-effetti`) e la chiave la scrive
// l'app. Il formato dell'effetto non cambia (`EffettoVoce`).
// ============================================================

import { useState } from 'react';
import { Selettore } from '../shared/Selettore';
import { AnteprimaPersona } from '../shared/AnteprimaPersona';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { RigaDote } from './RigaDote';
import { FilaScelta } from './FilaScelta';
import { CampiAcquistoEffetto, EditorEffettoPescaVoce } from './EditorEffettiVoce';
import { CATEGORIE_LETTURA, type CategoriaLettura } from '../../../shared/effettiAzione';
import { DOTI_SOCIALI, type DoteChiave } from '../../../shared/doti';
import { ORIGINE_ESITO_AUTOMATICO } from '../../../shared/esitiAttivita';

/** «Dal giorno»: la voce dell'esito automatico senza esito dichiarato dalla voce (O9-2), con il testo condiviso. */
const DAL_GIORNO = `${ORIGINE_ESITO_AUTOMATICO.giorno.charAt(0).toUpperCase()}${ORIGINE_ESITO_AUTOMATICO.giorno.slice(1)}`;
import { noteAParole, SCELTE_NOTE, simboliNote, testoPunti } from '../../../shared/note';
import { BERSAGLI_SBLOCCO, eInNote, gruppiAlternativi, LIVELLO_MASSIMO_PERSONA, MODI_USCITA_OGGETTO, QUANTITA_MASSIMA_EFFETTO, REGOLA_ALTERNATIVE, testoNotePuntiConfidente, YEN_MASSIMI_EFFETTO, type BersaglioSblocco, type EffettoVoce, type ModoUscitaOggetto, type NotePuntiConfidente, type RichiestaSalvaEffettiVoce } from '../../../shared/effettiVoce';
import { Segmenti } from '../shared/Segmenti';
import { elencoNomi } from '../../../shared/riepilogoEffetti';
import { dataGiocoTesto } from '../../utils/dateGioco';
import { breve, conCorrente, opzioniArticoli, opzioniDomande, opzioniStoria, type ElenchiVoce } from '../../utils/opzioniEffetti';

type Righe = RichiestaSalvaEffettiVoce['effetti'];

export type { ElenchiVoce };

/** Le note di rango a un Confidente (♪ ♪♪ ♪♪♪), con i punti base di una risposta con le stesse note: «♪♪ · 10 punti». */
const NOTE_DI_RANGO = SCELTE_NOTE.map((s) => ({ chiave: s.chiave, nome: testoNotePuntiConfidente(Number(s.chiave) as NotePuntiConfidente) }));

const FIN_DOVE = [{ chiave: '', nome: 'Completato' }, ...Array.from({ length: 9 }, (_, i) => ({ chiave: String(i + 1), nome: String(i + 1) }))];

type Turno = Extract<EffettoVoce, { tipo: 'turno' }>;

/** «Doti proprie di questo turno»: di norma il turno dà le Doti dell'attività; qui si dichiarano quelle di questo turno (il secondo turno al Beef Bowl Shop, la sera con Lala). */
export function DotiProprieTurno({ effetto: e, onCambia }: { effetto: Turno; onCambia: (e: Turno) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 testo-13 touch"><input type="checkbox" className="w-5 h-5" checked={e.doti !== undefined}
        onChange={(ev) => onCambia(ev.target.checked ? { ...e, doti: [{ dote: 'perizia', note: 2 }] } : { tipo: 'turno', attivita: e.attivita })} />Doti proprie di questo turno, al posto di quelle dell’attività</label>
      {e.doti?.map((d, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-0"><RigaDote etichetta={`Dote ${i + 1}`} dote={d} onCambia={(nuova) => onCambia({ ...e, doti: e.doti!.map((x, j) => (j === i ? nuova : x)) })} /></div>
          {e.doti!.length > 1 && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" aria-label={`Togli la Dote ${i + 1}`} onClick={() => onCambia({ ...e, doti: e.doti!.filter((_, j) => j !== i) })} />}
        </div>
      ))}
      {e.doti && e.doti.length < 5 && <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una Dote" onClick={() => onCambia({ ...e, doti: [...e.doti!, { dote: 'fascino', note: 2 }] })} />}
    </div>
  );
}

type Dote = Extract<EffettoVoce, { tipo: 'dote' }>;

/** L13: la fabbricazione e simili danno valori diversi: chi gioca sceglie le note alla spunta, fra quelle possibili (le note dell'effetto sono la proposta). */
export function NotePossibiliDote({ effetto: e, onCambia }: { effetto: Dote; onCambia: (e: Dote) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-2 testo-13 touch"><input type="checkbox" className="w-5 h-5" checked={!!e.possibili}
        onChange={(ev) => onCambia(ev.target.checked ? { ...e, possibili: e.note === 3 ? [2, 3] : [e.note, (e.note + 1) as 2 | 3] } : { tipo: 'dote', dote: e.dote, note: e.note })} />Il gioco può dare valori diversi: le note si scelgono alla spunta</label>
      {e.possibili && (
        <span className="flex flex-wrap items-center gap-1.5 testo-13" role="group" aria-label="Note possibili">
          <span className="text-text-secondary">Note possibili:</span>
          {([1, 2, 3] as const).map((n) => {
            const dentro = e.possibili!.includes(n);
            // la proposta resta sempre fra le possibili, e le possibili sono almeno due
            const bloccata = n === e.note || (dentro && e.possibili!.length <= 2);
            return <button key={n} type="button" className={`chip touch ${dentro ? 'chip--attivo' : ''}`} aria-pressed={dentro} disabled={bloccata} aria-label={noteAParole(n)}
              onClick={() => onCambia({ ...e, possibili: dentro ? e.possibili!.filter((x) => x !== n) : [...e.possibili!, n].sort() })}>{simboliNote(n)}</button>;
          })}
        </span>
      )}
    </div>
  );
}

/** L13: quante copie (1–999; decisione 6: facoltativa, 1 se non indicata). `etichetta`: «Copie» se non detta (2026-10-27: «Quantità» per le
 *  creazioni dello strumento di un turno). */
export function CampoQuantita({ valore, disabilitato, onCambia, etichetta = 'Copie' }: { valore: number; disabilitato?: boolean; onCambia: (q: number) => void; etichetta?: string }) {
  return (
    <label className="flex flex-col gap-1 testo-13">{etichetta}
      <input className="form-input min-h-11 w-24" type="number" inputMode="numeric" min={1} max={QUANTITA_MASSIMA_EFFETTO} step={1} value={valore} disabled={disabilitato}
        onChange={(ev) => { const n = Math.trunc(Number(ev.target.value)); onCambia(Number.isFinite(n) ? Math.min(QUANTITA_MASSIMA_EFFETTO, Math.max(1, n)) : 1); }} />
    </label>
  );
}

/** L13: gli yen dell'effetto, ricevuti o spesi (l'importo è sempre positivo nel campo; il verso si sceglie a parte). */
export function CampoYen({ importo, onCambia }: { importo: number; onCambia: (importo: number) => void }) {
  const verso = importo < 0 ? 'spesi' : 'ricevuti';
  const valore = Math.abs(importo);
  return (
    <div className="flex flex-col gap-2">
      <FilaScelta etichetta="Yen" valore={verso} opzioni={[{ chiave: 'ricevuti', nome: 'Ricevuti' }, { chiave: 'spesi', nome: 'Spesi' }]} onCambia={(v) => onCambia(v === 'spesi' ? -valore : valore)} />
      <label className="flex flex-col gap-1 testo-13">Importo in yen
        <input className="form-input min-h-11 w-40" type="number" inputMode="numeric" min={1} max={YEN_MASSIMI_EFFETTO} step={1} value={valore || ''}
          onChange={(ev) => { const n = Math.min(YEN_MASSIMI_EFFETTO, Math.max(0, Math.trunc(Number(ev.target.value) || 0))); onCambia(verso === 'spesi' ? -n : n); }} />
      </label>
      <p className="m-0 testo-12 text-text-secondary text-pretty">Spuntando la voce gli yen entrano da soli nel saldo o se ne scalano, mai sotto zero: la spunta resta possibile anche se il saldo non basta. Togliendo la spunta torna quanto era stato mosso.</p>
      <details className="testo-12 text-text-secondary">
        <summary className="cursor-pointer touch">Quando non si usa</summary>
        <p className="m-0 text-pretty">Se la voce ha già un dato che porta i suoi yen, li muove quel dato:</p>
        <ul className="m-0 flex flex-col gap-0.5 pl-5">
          <li>un acquisto o un articolo comprato;</li>
          <li>una visita di pesca;</li>
          <li>una Richiesta completata;</li>
          <li>il turno di un’attività o di un lavoro con costo, paga o sfida;</li>
          <li>la visione di un film con il biglietto;</li>
          <li>il collegamento della voce a un film, un’attività o una Richiesta con i loro yen.</li>
        </ul>
      </details>
    </div>
  );
}

type EffettoPersona = Extract<EffettoVoce, { tipo: 'persona' }>;
const SCELTE_SCORTA = [{ chiave: 'compendio', nome: 'Solo nel Compendio' }, { chiave: 'scorta', nome: 'Compendio e scorta' }];

/**
 * 2026-10-26 (richiesta dell'utente: «devo poter scegliere se l'effetto si fermi solo al Compendio o se quella persona viene anche aggiunta alla
 * scorta»): la scelta a due tasti e, con la scorta, il livello con cui entra (proposto il livello base della Persona, scritto solo se diverso).
 * Un Demone del Tesoro resta solo nel Compendio, come nella scelta della scorta della partita. `persona` null: la Persona scelta non è più
 * nell'elenco (per esempio è diventata del gruppo); la scelta resta modificabile, il livello no (il livello base non si conosce: resta quello
 * salvato, e il server lo verifica).
 */
export function CampiScortaPersona({ effetto: e, persona, onCambia }: { effetto: EffettoPersona; persona: { livello: number; rara?: boolean } | null; onCambia: (e: EffettoPersona) => void }) {
  const base = persona?.livello ?? 1;
  // il testo mentre si scrive: «3» verso «35» con il livello base 20 non deve diventare subito 20; il valore valido si scrive appena c'è
  const [testo, setTesto] = useState<string | null>(null);
  const scriviLivello = (livello: number) => onCambia(livello === base ? { tipo: 'persona', persona: e.persona, scorta: true } : { tipo: 'persona', persona: e.persona, scorta: true, livello });
  // un Demone del Tesoro non ha scelta: al posto dei due tasti spenti, la nota che lo dice (un'etichetta visibile solo se ha senso)
  if (persona?.rara) return <p className="m-0 testo-12 text-text-secondary text-pretty">Demone del Tesoro: si registra solo nel Compendio, non va nella scorta da una voce.</p>;
  return (
    <div className="flex flex-col gap-2">
      <FilaScelta etichetta="Dove va la Persona" valore={e.scorta ? 'scorta' : 'compendio'} opzioni={SCELTE_SCORTA}
        // il tasto già acceso non cambia niente: riscrivere l'effetto toglierebbe il livello salvato (anche quello nascosto di una Persona fuori elenco)
        onCambia={(v) => { if ((v === 'scorta') !== !!e.scorta) onCambia(v === 'scorta' ? { tipo: 'persona', persona: e.persona, scorta: true } : { tipo: 'persona', persona: e.persona }); }} />
      {e.scorta && (
        <>
          {persona && <label className="flex flex-col gap-1 testo-13">Livello in scorta
            <input className="form-input min-h-11 w-24 tabular-nums" type="number" inputMode="numeric" min={base} max={LIVELLO_MASSIMO_PERSONA} step={1} value={testo ?? String(e.livello ?? base)}
              onChange={(ev) => {
                setTesto(ev.target.value);
                const n = Number(ev.target.value);
                if (Number.isInteger(n) && n >= base && n <= LIVELLO_MASSIMO_PERSONA) scriviLivello(n);
              }}
              // uscendo dal campo vale il livello scritto, portato fra il livello base e 99
              onBlur={() => {
                const n = Math.trunc(Number(testo));
                if (testo !== null) scriviLivello(Number.isFinite(n) && testo.trim() !== '' ? Math.min(LIVELLO_MASSIMO_PERSONA, Math.max(base, n)) : base);
                setTesto(null);
              }} />
          </label>}
          {/* l'inciso sul livello solo quando il campo «Livello in scorta» è a schermo (una Persona fuori elenco non lo mostra) */}
          <p className="m-0 testo-12 text-text-secondary text-pretty">Se è già nella scorta della partita resta com’è{persona ? ', anche cambiando qui il livello' : ''}. Togliendo la spunta esce dalla scorta solo se non l’hai modificata.</p>
        </>
      )}
    </div>
  );
}

type Uscita = Extract<EffettoVoce, { tipo: 'uscitaOggetto' }>;

/**
 * 2026-10-28 (richiesta dell'utente: «non c'è un vendi prodotto/restituisci prodotto per gestire vendita, restituzione»): come esce l'oggetto, quale,
 * quante copie e, per la vendita, il ricavo facoltativo. «Restituito» propone i prestiti (Biblioteca, DVD a noleggio); «Venduto» tutto il catalogo.
 * Le note compaiono solo quando dicono qualcosa che i campi non dicono (il prestito che torna in negozio, il ricavo che entra nel saldo).
 */
export function CampiUscitaOggetto({ effetto: e, oggetti, onCambia }: { effetto: Uscita; oggetti: NonNullable<ElenchiVoce['effetti']['oggetti']>; onCambia: (e: Uscita) => void }) {
  const restituito = e.modo === 'restituito';
  const elenco = restituito ? oggetti.filter((o) => o.prestito) : oggetti;
  const senza = (x: Uscita): Uscita => ({ tipo: 'uscitaOggetto', oggetto: x.oggetto, quantita: x.quantita, modo: x.modo });
  return (
    <div className="flex flex-col gap-2">
      <FilaScelta etichetta="Come esce" valore={e.modo} opzioni={MODI_USCITA_OGGETTO.map((m) => ({ chiave: m.chiave, nome: m.nome }))}
        onCambia={(v) => {
          if (v === e.modo) return;
          const modo = v as ModoUscitaOggetto;
          // tornando a «Restituito» il ricavo non ha più senso, e un oggetto che non si presta va scelto di nuovo
          const resta = modo === 'venduto' || oggetti.some((o) => o.chiave === e.oggetto && o.prestito);
          onCambia({ tipo: 'uscitaOggetto', oggetto: resta ? e.oggetto : '', quantita: e.quantita, modo });
        }} />
      <div className="flex flex-wrap items-end gap-2">
        <Selettore className="min-w-[12rem] flex-1" etichetta={restituito ? 'Prestito restituito' : 'Oggetto venduto'} valore={e.oggetto}
          opzioni={conCorrente(elenco.map((o) => ({ chiave: o.chiave, nome: o.nome, gruppo: o.categoria })), e.oggetto, 'Oggetto non più nel catalogo')}
          onCambia={(v) => onCambia({ ...e, oggetto: v })} />
        <CampoQuantita valore={e.quantita} onCambia={(quantita) => onCambia({ ...e, quantita })} />
        {!restituito && (
          <label className="flex flex-col gap-1 testo-13">Ricavo in yen (facoltativo)
            <input className="form-input min-h-11 w-32 tabular-nums" type="number" inputMode="numeric" min={1} max={YEN_MASSIMI_EFFETTO} step={1} value={e.prezzo ?? ''}
              onChange={(ev) => { const n = Math.min(YEN_MASSIMI_EFFETTO, Math.max(0, Math.trunc(Number(ev.target.value) || 0))); onCambia(n >= 1 ? { ...senza(e), prezzo: n } : senza(e)); }} />
          </label>
        )}
      </div>
      {restituito && <p className="m-0 testo-12 text-text-secondary text-pretty">Dal giorno della voce il prestito torna disponibile in negozio.</p>}
      {!restituito && !!e.prezzo && <p className="m-0 testo-12 text-text-secondary text-pretty">Spuntando la voce il ricavo entra da solo nel saldo; togliendo la spunta esce.</p>}
    </div>
  );
}

interface Props {
  effetto: EffettoVoce;
  elenchi: ElenchiVoce;
  /** Tutti gli effetti della voce: servono a pesca e Aojiru per i collegamenti fra effetti. */
  righe: Righe;
  onCambia: (e: EffettoVoce) => void;
}

/** I campi dell'effetto, secondo il suo genere. */
export function CampiEffettoVoce({ effetto: e, elenchi, righe, onCambia }: Props) {
  const { azione, effetti } = elenchi;
  switch (e.tipo) {
    case 'dote':
      return (
        <div className="flex flex-col gap-2">
          <RigaDote etichetta="Dote" dote={{ dote: e.dote, note: e.note }} onCambia={(d) => onCambia(e.possibili ? { tipo: 'dote', ...d, possibili: e.possibili.includes(d.note) ? e.possibili : [...e.possibili, d.note].sort() } : { tipo: 'dote', ...d })} />
          <NotePossibiliDote effetto={e} onCambia={onCambia} />
        </div>
      );
    case 'lettura': {
      const lista = e.categoria === 'libro' ? azione.libri : e.categoria === 'film' ? azione.film : azione.videogiochi;
      return (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-2">
            <Selettore className="min-w-[8rem]" etichetta="Che cosa" valore={e.categoria} opzioni={CATEGORIE_LETTURA.map((c) => ({ chiave: c.chiave, nome: c.nome }))} ricerca="mai"
              onCambia={(v) => { if (v !== e.categoria) onCambia({ ...e, categoria: v as CategoriaLettura, chiave: '' }); }} />
            <Selettore className="min-w-[12rem] flex-1" etichetta="Titolo" valore={e.chiave} opzioni={conCorrente(lista, e.chiave, 'Titolo non più nell’elenco')} onCambia={(v) => onCambia({ ...e, chiave: v })} />
          </div>
          <span className="testo-13 text-text-secondary">Fin dove arriva</span>
          <FilaScelta etichetta="Fin dove arriva" valore={e.almeno === null ? '' : String(e.almeno)} opzioni={FIN_DOVE} onCambia={(v) => onCambia({ ...e, almeno: v === '' ? null : Number(v) })} />
        </div>
      );
    }
    case 'turno': {
      // L13: un'attività con esiti dichiarati dà le Doti dell'esito scelto alla spunta: qui al più l'esito atteso, mai Doti proprie
      const esiti = azione.attivita.find((a) => a.chiave === e.attivita)?.esiti;
      // 2026-10-27 («L'oggetto è stato già scelto, la quantità anche»): un'attività con esiti che hanno la versione con il bonus si sceglie per
      // strumento (gli esiti base) e quantità; alla spunta resta solo «Bonus» sì/no. Un esito con il bonus già scritto nella voce si mostra
      // come il suo strumento: cambiando strumento o quantità si scrive la versione base
      // (revisione) con esiti misti (strumenti ed esiti a sé) si propongono anche gli esiti a sé, come esito atteso da confermare alla spunta:
      // un'attività di soli strumenti dice «Strumento» e non lascia la voce senza (`soloStrumenti` del server, 409 `strumento-da-scegliere`)
      // (revisione) uno strumento è anche la creazione senza versione con il bonus (`strumento` con `senzaBonus`: la fabbricazione di Kawakami):
      // stesso schema, strumento e quantità qui; alla spunta niente da chiedere
      const strumenti = esiti?.elenco.some((x) => x.strumento) ? esiti.elenco.filter((x) => !x.bonusDi) : null;
      const soloStrumentiQui = !!strumenti && strumenti.every((x) => x.strumento);
      const baseDi = (k: string | undefined): string => (k ? esiti?.elenco.find((x) => x.chiave === k)?.bonusDi ?? k : '');
      const eStrumento = (k: string): boolean => !!esiti?.elenco.find((x) => x.chiave === k)?.strumento;
      // la quantità (le creazioni) solo per uno strumento: il server la rifiuta per gli altri esiti (`quantita-senza-strumento`)
      const turnoStrumento = (esito: string, quantita: number): Turno => (quantita > 1 && eStrumento(esito) ? { tipo: 'turno', attivita: e.attivita, esito, quantita } : { tipo: 'turno', attivita: e.attivita, esito });
      return (
        <div className="flex flex-col gap-2">
          <Selettore etichetta="Attività (contata per volte)" valore={e.attivita} opzioni={conCorrente(azione.attivita.filter((a) => a.turni), e.attivita, 'Attività non più nell’elenco')} onCambia={(v) => {
            // l'esito atteso è dell'attività di prima e non la segue; le Doti proprie si conservano se la nuova attività non dichiara esiti
            // (con gli esiti le Doti le dà l'esito scelto: le proprie non sono ammesse)
            const nuovaConEsiti = !!azione.attivita.find((a) => a.chiave === v)?.esiti;
            onCambia(e.doti && !nuovaConEsiti ? { tipo: 'turno', attivita: v, doti: e.doti } : { tipo: 'turno', attivita: v });
          }} />
          {strumenti && (
            <div className="flex flex-wrap items-end gap-2">
              <Selettore className="min-w-[12rem] flex-1" etichetta={soloStrumentiQui ? 'Strumento' : 'Strumento o esito atteso'} valore={baseDi(e.esito)}
                vuoto={soloStrumentiQui ? 'Da scegliere' : 'Nessuno: lo scegli alla spunta'}
                opzioni={conCorrente(strumenti.map((x) => ({ chiave: x.chiave, nome: x.strumento ?? x.nome })), baseDi(e.esito), soloStrumentiQui ? 'Strumento non più dichiarato' : 'Esito non più dichiarato')}
                onCambia={(v) => onCambia(v ? turnoStrumento(v, e.quantita ?? 1) : { tipo: 'turno', attivita: e.attivita })} />
              {/* la quantità solo con uno strumento scelto: senza, o con un esito a sé, non direbbe niente */}
              {e.esito && eStrumento(baseDi(e.esito)) && <CampoQuantita etichetta="Quantità" valore={e.quantita ?? 1} onCambia={(q) => onCambia(turnoStrumento(baseDi(e.esito), q))} />}
            </div>
          )}
          {!strumenti && esiti?.modo === 'scelta' && <Selettore etichetta="Esito atteso (lo confermi alla spunta)" valore={e.esito ?? ''} vuoto="Nessuno: lo scegli alla spunta"
            opzioni={conCorrente(esiti.elenco, e.esito ?? '', 'Esito non più dichiarato')} onCambia={(v) => onCambia(v ? { tipo: 'turno', attivita: e.attivita, esito: v } : { tipo: 'turno', attivita: e.attivita })} />}
          {/* L13 (ondata 9, O9-2): nel modo automatico l'esito si ricava dal giorno (predefinito, nessun esito nella voce) o lo dichiara la voce,
              e allora prevale sul calcolo del giorno («Per il momento vale quello che riporta il testo sul bagno») */}
          {esiti?.modo === 'automatico' && <Selettore etichetta="Esito del turno" valore={e.esito ?? ''} vuoto={DAL_GIORNO} ricerca="mai"
            opzioni={conCorrente(esiti.elenco, e.esito ?? '', 'Esito non più dichiarato')} onCambia={(v) => onCambia(v ? { tipo: 'turno', attivita: e.attivita, esito: v } : { tipo: 'turno', attivita: e.attivita })} />}
          {!esiti && <DotiProprieTurno effetto={e} onCambia={onCambia} />}
        </div>
      );
    }
    case 'acquisto': return <CampiAcquistoEffetto effetto={e} righe={righe} onCambia={onCambia} />;
    case 'pesca': return <EditorEffettoPescaVoce effetto={e} righe={righe} onCambia={onCambia} />;
    case 'fortuna':
      return <Selettore etichetta="Dote della Fortuna" valore={e.dote} ricerca="mai" opzioni={DOTI_SOCIALI.map((d) => ({ chiave: d.chiave, nome: d.nome }))} onCambia={(d) => onCambia({ tipo: 'fortuna', dote: d as DoteChiave })} />;
    case 'storia':
      return <Selettore etichetta="Evento di storia" valore={e.evento} opzioni={opzioniStoria(e.evento)} onCambia={(v) => onCambia({ tipo: 'storia', evento: v })} />;
    case 'domanda':
      return <Selettore etichetta="Domanda" valore={String(e.domanda)} opzioni={opzioniDomande(elenchi, e.domanda)} onCambia={(v) => onCambia({ tipo: 'domanda', domanda: Number(v) })} />;
    case 'cruciverba':
      return <Selettore etichetta="Cruciverba" valore={e.data} opzioni={conCorrente(effetti.cruciverba.map((c) => ({ chiave: c.data, nome: dataGiocoTesto(c.data), dettaglio: breve(c.indizio, 50) })), e.data, dataGiocoTesto(e.data))} onCambia={(v) => onCambia({ tipo: 'cruciverba', data: v })} />;
    case 'richiesta':
      return <Selettore etichetta="Richiesta" valore={e.richiesta} opzioni={conCorrente(azione.richieste, e.richiesta, 'Richiesta non più nell’elenco')} onCambia={(v) => onCambia({ tipo: 'richiesta', richiesta: v })} />;
    case 'articolo': {
      const articoloDi = (k: string) => effetti.articoli.find((a) => a.chiave === k);
      const scelto = articoloDi(e.articolo);
      // rilievo L1 della revisione UX: un articolo nascosto nel catalogo (non più proposto da `opzioniArticoli`) si vede con il suo nome, come
      // in «Acquisti da questo negozio»; l'etichetta generica solo se il catalogo non lo conosce più
      const corrente = scelto ? (scelto.nascosto ? `${scelto.nome} (non più nell’elenco)` : scelto.nome) : 'Articolo non più nell’elenco';
      // rilievo L2: gli articoli della voce alternativi a questo (Set A o Set B, «non insieme a» del catalogo: lo stesso calcolo del riepilogo
      // e della spunta). La nota si vede solo se l'alternativa è nella voce: solo allora la spunta chiede quale si è comprato
      const chiaviVoce = righe.flatMap((r) => (r.effetto.tipo === 'articolo' ? [r.effetto.articolo] : []));
      const alternative = (gruppiAlternativi(chiaviVoce, (k) => articoloDi(k)?.incompatibili).find((g) => g.includes(e.articolo)) ?? [])
        .filter((k) => k !== e.articolo).flatMap((k) => { const a = articoloDi(k); return a ? [a.nome] : []; });
      return (
        <div className="flex flex-wrap items-end gap-2">
          <Selettore className="min-w-[12rem] flex-1" etichetta="Articolo del negozio" valore={e.articolo} opzioni={conCorrente(opzioniArticoli(effetti), e.articolo, corrente)} onCambia={(v) => onCambia(e.quantita ? { tipo: 'articolo', articolo: v, quantita: e.quantita } : { tipo: 'articolo', articolo: v })} />
          <CampoQuantita valore={e.quantita ?? 1} onCambia={(q) => onCambia(q > 1 ? { tipo: 'articolo', articolo: e.articolo, quantita: q } : { tipo: 'articolo', articolo: e.articolo })} />
          {alternative.length > 0 && <p className="m-0 w-full testo-12 text-text-secondary break-words text-pretty">In alternativa a {elencoNomi(alternative)}: {REGOLA_ALTERNATIVE.toLowerCase()}, alla spunta.</p>}
        </div>
      );
    }
    case 'yen':
      return <CampoYen importo={e.importo} onCambia={(importo) => onCambia({ tipo: 'yen', importo })} />;
    case 'oggetto':
      return (
        <div className="flex flex-wrap items-end gap-2">
          <Selettore className="min-w-[12rem] flex-1" etichetta="Oggetto del catalogo" valore={e.oggetto} opzioni={conCorrente((effetti.oggetti ?? []).map((o) => ({ chiave: o.chiave, nome: o.nome, gruppo: o.categoria })), e.oggetto, 'Oggetto non più nel catalogo')} onCambia={(v) => onCambia({ ...e, oggetto: v })} />
          <CampoQuantita valore={e.quantita} onCambia={(quantita) => onCambia({ ...e, quantita })} />
        </div>
      );
    case 'trofeo':
      return <Selettore etichetta="Trofeo" valore={e.trofeo} opzioni={conCorrente((effetti.trofei ?? []).map((t) => ({ chiave: t.chiave, nome: t.nome, dettaglio: t.tipo })), e.trofeo, 'Trofeo non più nell’elenco')} onCambia={(v) => onCambia({ tipo: 'trofeo', trofeo: v })} />;
    case 'sblocco':
      return (
        <div className="flex flex-col gap-2">
          <FilaScelta etichetta="Che cosa sblocca" valore={e.bersaglio} opzioni={BERSAGLI_SBLOCCO.map((b) => ({ chiave: b.chiave, nome: b.nome }))} onCambia={(v) => { if (v !== e.bersaglio) onCambia({ tipo: 'sblocco', bersaglio: v as BersaglioSblocco, chiave: '' }); }} />
          <Selettore etichetta={e.bersaglio === 'richiesta' ? 'Richiesta' : 'Attività o lavoro'} valore={e.chiave} opzioni={conCorrente(e.bersaglio === 'richiesta' ? azione.richieste : azione.attivita, e.chiave, 'Non più nell’elenco')} onCambia={(v) => onCambia({ ...e, chiave: v })} />
          <p className="m-0 testo-12 text-text-secondary">Spuntando la voce lo sblocco vale nella partita; togliendo la spunta torna bloccato. Perché blocchi, la Richiesta o l’attività deve avere la condizione «Sblocco ricevuto».</p>
        </div>
      );
    case 'invito':
      return <Selettore etichetta="Invito del Confidente" valore={e.invito} opzioni={conCorrente(effetti.inviti.map((i) => ({ chiave: i.chiave, nome: i.data ? dataGiocoTesto(i.data) : (i.nota || 'Invito'), dettaglio: i.nota ? breve(i.nota, 40) : undefined, gruppo: i.confidenteNome })), e.invito, 'Invito non più nell’elenco')}
        onCambia={(v) => onCambia({ tipo: 'invito', invito: v })} />;
    case 'persona': {
      const p = effetti.persone.find((x) => x.id === e.persona);
      return (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-2">
            {p && <AnteprimaPersona nome={p.nome} etichetta={p.nomeIt} dimensione={44} />}
            <Selettore className="min-w-[12rem] flex-1" etichetta="Persona del compendio" valore={String(e.persona)}
              opzioni={conCorrente(effetti.persone.map((x) => ({ chiave: String(x.id), nome: x.nome, dettaglio: `${x.arcana} · Liv. ${x.livello}` })), e.persona >= 1 ? String(e.persona) : '', 'Persona non più nell’elenco')}
              // cambiando Persona la scelta della scorta resta (se la nuova può entrarci); il livello no: era della Persona di prima
              onCambia={(v) => { const n = effetti.persone.find((x) => x.id === Number(v)); onCambia(e.scorta && n && !n.rara ? { tipo: 'persona', persona: Number(v), scorta: true } : { tipo: 'persona', persona: Number(v) }); }} />
          </div>
          {/* anche per una Persona non più nell'elenco la scelta resta modificabile (revisione UX): senza il livello, che non si conosce */}
          {e.persona >= 1 && <CampiScortaPersona key={e.persona} effetto={e} persona={p ?? null} onCambia={onCambia} />}
        </div>
      );
    }
    // 2026-10-28 («manca la rimozione di una persona dalla scorta come possibile effetto»): le Persone fuori dal gruppo, come «Persona registrata»
    case 'personaTolta': {
      const p = effetti.persone.find((x) => x.id === e.persona);
      return (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-2">
            {p && <AnteprimaPersona nome={p.nome} etichetta={p.nomeIt} dimensione={44} />}
            <Selettore className="min-w-[12rem] flex-1" etichetta="Persona da togliere dalla scorta" valore={e.persona >= 1 ? String(e.persona) : ''}
              opzioni={conCorrente(effetti.persone.map((x) => ({ chiave: String(x.id), nome: x.nome, dettaglio: x.arcana })), e.persona >= 1 ? String(e.persona) : '', 'Persona non più nell’elenco')}
              onCambia={(v) => onCambia({ tipo: 'personaTolta', persona: Number(v) })} />
          </div>
          <p className="m-0 testo-12 text-text-secondary text-pretty">Togliendo la spunta torna com’era, se nel frattempo non l’hai rimessa nella scorta.</p>
        </div>
      );
    }
    // 2026-10-28 («aggiunta punti rango del confidente (sempre come effetto) così da poterlo combinare ad altri effetti»; corretto lo stesso
    // giorno: «i punti rango andavano gestiti come note non come punti specifici»): le note come le risposte nei dialoghi, con i punti base
    case 'puntiConfidente': {
      const inNote = eInNote(e);
      return (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-2">
            <Selettore className="min-w-[12rem] flex-1" etichetta="Confidente" valore={e.confidente} opzioni={conCorrente(azione.confidenti, e.confidente, 'Confidente non più nell’elenco')}
              onCambia={(v) => onCambia({ ...e, confidente: v })} />
            <div className="flex flex-col gap-1 testo-13">
              <span aria-hidden="true">Note di rango</span>
              {/* un effetto scritto prima della correzione (punti fissi) non ha note scelte: si sceglie qui, e solo allora diventa in note */}
              <Segmenti etichetta="Note di rango" valore={inNote ? String(e.note) as '1' | '2' | '3' : ''} opzioni={NOTE_DI_RANGO}
                onCambia={(v) => onCambia({ tipo: 'puntiConfidente', confidente: e.confidente, note: Number(v) as NotePuntiConfidente })} />
            </div>
          </div>
          {!inNote && <p className="m-0 testo-12 text-pretty">Scritto prima come {testoPunti(e.punti)} fissi: scegli le note per usare il calcolo delle risposte.</p>}
          <p className="m-0 testo-12 text-text-secondary text-pretty">I punti si calcolano alla spunta come per le risposte nei dialoghi (Persona dello stesso arcano, esame, invito della voce) e contano dove il rango sale a punti; l’incontro resta quello della voce.</p>
        </div>
      );
    }
    case 'uscitaOggetto':
      return <CampiUscitaOggetto effetto={e} oggetti={effetti.oggetti ?? []} onCambia={onCambia} />;
    // L13 (ondata 7, O7-2): i risultati di un esame, scelto dall'elenco (con il giorno dei risultati); il piazzamento si sceglie alla spunta
    case 'esame':
      return <Selettore etichetta="Esame" valore={e.esame} ricerca="mai"
        opzioni={conCorrente((effetti.esami ?? []).map((x) => ({ chiave: x.chiave, nome: x.nome, ...(x.dataRisultati ? { dettaglio: `risultati il ${dataGiocoTesto(x.dataRisultati)}` } : {}) })), e.esame, 'Esame non più nella guida')}
        onCambia={(v) => onCambia({ tipo: 'esame', esame: v })} />;
  }
}
