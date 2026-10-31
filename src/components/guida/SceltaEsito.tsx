// ============================================================
// SceltaEsito — la scelta dell'esito alla spunta e al + del contatore (L13, ondata 2)
// ============================================================
//
// Le attività che dichiarano i loro esiti (`attivita.esiti_json`: la sfida della Big Bang Burger, il centro battute) chiedono, quando si
// registra un turno, quale esito si è ottenuto: come la scelta delle note di un Confidente (`SceltaNote`), con «Senza punti» e «Annulla».
// Una Dote a valori possibili (la fabbricazione: ♪♪ o ♪♪♪) chiede le note fra quelle dichiarate, o «nessuna». Gli esiti non ancora possibili
// (le condizioni dell'esito o dell'articolo della sfida, per esempio il rango) si vedono con il motivo ma non si toccano: il server li rifiuta.
// Ogni esito mostra le Doti che dà, con i punti, il prezzo dell'articolo (L13, decisione 18: registrando il turno si scala da solo dal saldo,
// mai sotto zero) e i premi in parole. Ondata 5 (lotto G): anche il trofeo e gli oggetti del catalogo che l'esito dà, e il prezzo dell'esito
// senza prova (l'estrazione della lotteria: «Non vinto, ricompri il Lotto R»), che nessuna intestazione dice.
// Ondata 5 (lotto F-bis): anche gli oggetti che l'esito consuma, con le copie che la partita ha (il concime, i materiali), e gli effetti dei
// libri letti che riguardano l'attività (L'ABC dell'artigianato per la fabbricazione), come promemoria.
// L13 (decisione 4): gli articoli in alternativa della voce (Set A o Set B delle televendite) chiedono quale si è comprato, o «Nessuno»
// (`SceltaAcquistoAlternativo`), con le stesse regole: con una sola scelta il tocco spunta, con più scelte si conferma.
// 2026-10-27 (richiesta dell'utente: «bastava un pulsante bonus sì/no. L'oggetto è stato già scelto, la quantità anche... se il pulsante bonus è
// attivo quando riscuoto applica la versione con il bonus, altrimenti quella base»): per lo strumento della voce con una versione con il bonus
// (`bonus` della scelta) la spunta mostra SOLO l'interruttore «Bonus» (spento all'inizio), con «Spunta» e «Annulla»: niente elenco di esiti,
// materiali o «Senza punti». Se la voce non dice lo strumento (`strumentoDaScegliere`) la spunta lo dice e rimanda all'editor della voce. Al +
// del contatore gli esiti con la versione con il bonus si scelgono per strumento, con lo stesso interruttore.
// Revisione: uno strumento SENZA versione con il bonus (una creazione: materiali → oggetto, come la fabbricazione di Kawakami) alla spunta non
// chiede niente (il server non lo mette fra le scelte); al + del contatore si sceglie per nome come gli altri, e l'interruttore compare solo se
// qualche strumento ha la versione con il bonus. Senza strumento nella voce, «Modifica la voce» apre l'editor dove sceglierlo.
// ============================================================

import { useId, useState } from 'react';
import { eCreazione, fraseConsumaEsito, fraseDotiEsito, fraseOggettiEsito, nomeStrumento, YEN_MASSIMI_LAVORO, type EsitoDisponibileDto, type SceltaEsitoSpunta, type SceltaEsitoVoceDto } from '../../../shared/esitiAttivita';
import type { DoteChiave } from '../../../shared/doti';
import { noteAParole, simboliNote, testoNoteAParole, testoPunti } from '../../../shared/note';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { formattaYen } from '../../utils/letture';
import { SceltaAcquistoAlternativo } from './SceltaAcquistoAlternativo';
import type { PiazzamentoEsame } from '../../../shared/puntiConfidenti';

/** Le Doti di un esito in breve, con i punti che il server ha calcolato per la partita (Fortuna compresa): «Coraggio ♪ · 2 punti, Fascino
 *  ♪ · 2 punti» (la frase unica di `fraseDotiEsito`), o «nessuna Dote». */
const dotiTesto = (e: EsitoDisponibileDto): string => fraseDotiEsito(e.doti);
/** Gli esiti parlano di Doti? Solo allora «nessuna Dote» e «Senza punti» hanno senso (l'estrazione della lotteria non dà Doti: Vinto o Non vinto). */
const conDoti = (esiti: readonly EsitoDisponibileDto[]): boolean => esiti.some((e) => e.doti.length > 0);
/** Il prezzo dell'articolo dell'esito, quando non lo dice già l'intestazione della prova (un esito senza gruppo: «Non vinto, ricompri il
 *  Lotto R» dell'estrazione della lotteria). È quello della fascia che si scala davvero (Ondata 5, lotti E e G). */
function prezzoEsito(e: EsitoDisponibileDto, prezzoGiaNelSaldo: boolean): string | null {
  if (e.gruppo || e.articolo?.prezzoNelMomento == null) return null;
  return `${e.articolo.nome} ${formattaYen(e.articolo.prezzoNelMomento)}, ${prezzoGiaNelSaldo ? 'già nel saldo (non si scala)' : 'si scala da solo dal saldo'}`;
}
/** Che cosa dà l'esito oltre al nome, in parole: Doti (se gli esiti ne parlano), prezzo (se l'intestazione non lo dice), trofeo, oggetti, oggetti
 *  usati, premi. Vuoto se niente. */
function dettaglioEsito(e: EsitoDisponibileDto, doti: boolean, prezzoGiaNelSaldo: boolean): string {
  // L13 (chiusure del 31/10): la paga dell'esito, che registrando il turno entra da sola al posto di quella base
  return [doti ? dotiTesto(e) : null, e.paga ? `paga ${formattaYen(e.paga)}` : null, prezzoEsito(e, prezzoGiaNelSaldo), e.trofeo ? `trofeo «${e.trofeo.nome}»` : null, fraseOggettiEsito(e.oggetti), fraseConsumaEsito(e.consuma), e.premi]
    .filter((x): x is string => !!x).join(' · ');
}

/** Gli esiti raggruppati per prova (il gruppo), nell'ordine dichiarato. */
function perGruppo(esiti: readonly EsitoDisponibileDto[]): Array<{ gruppo: string | null; esiti: EsitoDisponibileDto[] }> {
  const out: Array<{ gruppo: string | null; esiti: EsitoDisponibileDto[] }> = [];
  for (const e of esiti) {
    const g = out.find((x) => x.gruppo === e.gruppo);
    if (g) g.esiti.push(e); else out.push({ gruppo: e.gruppo, esiti: [e] });
  }
  return out;
}

/** L'elenco degli esiti come bersagli da toccare (≥ 44 px), con quello scelto in evidenza; i non possibili sono spenti col motivo. */
function ElencoEsiti({ esiti, scelto, occupato, onScegli, prezzoGiaNelSaldo = false }: { esiti: readonly EsitoDisponibileDto[]; scelto: string | null | undefined; occupato: boolean; onScegli: (chiave: string) => void; prezzoGiaNelSaldo?: boolean }) {
  // gli esiti non ancora possibili restano raggiungibili da tastiera (aria-disabled, non disabled): il motivo è scritto nel bottone e
  // collegato con aria-describedby; il tocco non fa nulla (il server li rifiuta comunque)
  const prefisso = useId();
  const doti = conDoti(esiti);
  return (
    <span className="flex w-full flex-col gap-1.5">
      {perGruppo(esiti).map((g) => (
        <span key={g.gruppo ?? '-'} className="flex flex-col gap-1" role="group" aria-label={g.gruppo ?? 'Esiti'}>
          {/* Ondata 5 (lotto E): il prezzo della fascia della voce (o della partita, al contatore), quello che si scala davvero */}
          {g.gruppo && <span className="text-text-secondary tabular-nums">{g.gruppo}{g.esiti[0]?.articolo?.prezzoNelMomento != null ? ` · ${formattaYen(g.esiti[0].articolo.prezzoNelMomento)}, ${prezzoGiaNelSaldo ? 'già nel saldo da prima che gli yen si muovessero da soli (non si scala)' : 'si scala da solo dal saldo (mai sotto zero)'}` : ''}</span>}
          <span className="flex flex-wrap gap-1.5">
            {g.esiti.map((e) => {
              const idMotivo = `${prefisso}-motivo-${e.chiave}`;
              const dettaglio = dettaglioEsito(e, doti, prezzoGiaNelSaldo);
              const oggetti = fraseOggettiEsito(e.oggetti), prezzo = prezzoEsito(e, prezzoGiaNelSaldo), usa = fraseConsumaEsito(e.consuma);
              return (
                <button key={e.chiave} type="button" className={`chip touch flex-col items-start text-left ${scelto === e.chiave ? 'chip--attivo' : ''} ${!e.disponibile ? 'opacity-60 cursor-not-allowed' : ''}`} disabled={occupato}
                  aria-disabled={!e.disponibile ? true : undefined} aria-describedby={!e.disponibile ? idMotivo : undefined}
                  aria-pressed={scelto === e.chiave} onClick={() => { if (e.disponibile) onScegli(e.chiave); }}
                  title={!e.disponibile ? `Non ancora possibile: ${e.condizioniTesto ?? 'condizioni non soddisfatte'}` : e.condizioniTesto ?? undefined}
                  aria-label={`${e.nome}${doti ? `: ${testoNoteAParole(dotiTesto(e))}` : ''}${e.paga ? `; paga ${formattaYen(e.paga)}` : ''}${prezzo ? `; ${prezzo}` : ''}${e.trofeo ? `; segna il trofeo ${e.trofeo.nome}` : ''}${oggetti ? `; ricevi ${oggetti}` : ''}${usa ? `; ${usa}` : ''}${e.premi ? `; premi: ${e.premi}` : ''}${!e.disponibile ? '; non ancora possibile' : ''}`}>
                  <span>{e.gruppo && e.nome.startsWith(`${e.gruppo} · `) ? e.nome.slice(e.gruppo.length + 3) : e.nome}</span>
                  {dettaglio && <span className="testo-12 text-text-secondary text-pretty">{dettaglio}</span>}
                  {!e.disponibile && <span id={idMotivo} className="testo-12 text-text-muted">Non ancora: {e.condizioniTesto ?? 'condizioni non soddisfatte'}</span>}
                </button>
              );
            })}
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * 2026-10-27: l'interruttore «Bonus» (sì/no). Un bersaglio da 44 px (`touch`), con lo stato detto dal testo («sì»/«no») oltre che dalla pista e
 * dal colore; `role="switch"` con `aria-checked`. `descrizione`: il nome accessibile completo (lo strumento e la quantità), il testo visibile
 * resta «Bonus».
 */
export function InterruttoreBonus({ acceso, disabled, descrizione, onCambia, className = '' }: { acceso: boolean; disabled?: boolean; descrizione: string; onCambia: (acceso: boolean) => void; className?: string }) {
  return (
    <button type="button" role="switch" aria-checked={acceso} aria-label={`Bonus: ${descrizione}`} disabled={disabled} onClick={() => onCambia(!acceso)}
      className={`chip touch gap-2 ${acceso ? 'chip--attivo' : ''} ${className}`}>
      <span aria-hidden="true" className={`interruttore-pista ${acceso ? 'interruttore-pista--acceso' : ''}`} />
      <span>Bonus</span>
      {/* (revisione) larghezza fissa: «sì» e «no» non spostano «Spunta» e «Annulla» toccando l'interruttore */}
      <span aria-hidden="true" className="inline-block min-w-[2ch] text-center font-semibold">{acceso ? 'sì' : 'no'}</span>
    </button>
  );
}

/** Gli strumenti, nell'ordine dichiarato: gli esiti base con la loro versione con il bonus e (revisione) le creazioni senza versione con il
 *  bonus (`eCreazione`: la fabbricazione di Kawakami), con `bonus` null. La stessa regola di `strumentoDi` del server. */
function strumentiDegliEsiti(esiti: readonly EsitoDisponibileDto[]): Array<{ base: EsitoDisponibileDto; bonus: EsitoDisponibileDto | null }> {
  return esiti.flatMap((base): Array<{ base: EsitoDisponibileDto; bonus: EsitoDisponibileDto | null }> => {
    if (base.bonusDi) return [];
    const bonus = esiti.find((x) => x.bonusDi === base.chiave);
    return bonus ? [{ base, bonus }] : eCreazione(base) ? [{ base, bonus: null }] : [];
  });
}

/** Il + del contatore di un'attività con esiti: un tocco sull'esito lo registra; «Senza punti» registra il turno senza Doti. 2026-10-27: gli
 *  strumenti si scelgono per nome breve, con l'interruttore «Bonus» che decide quale versione (solo se qualche strumento ne ha una). */
export function SceltaEsitoTurno({ nome, esiti, occupato, onScegli, onAnnulla, promemoria = [] }: { nome: string; esiti: readonly EsitoDisponibileDto[]; occupato: boolean; onScegli: (esito: string | null) => void; onAnnulla: () => void; promemoria?: readonly string[] }) {
  const [bonus, setBonus] = useState(false);
  const strumenti = strumentiDegliEsiti(esiti);
  const nelleCoppie = new Set(strumenti.flatMap((s) => [s.base.chiave, ...(s.bonus ? [s.bonus.chiave] : [])]));
  const altri = esiti.filter((e) => !nelleCoppie.has(e.chiave));
  const conInterruttore = strumenti.some((s) => s.bonus);
  const prefisso = useId();
  return (
    <span className="flex w-full flex-wrap items-center gap-1.5 testo-12" role="group" aria-label={`Esito del turno: ${nome}`}>
      <span className="w-full text-text-secondary">{strumenti.length && !altri.length ? 'Che cosa hai creato?' : 'Che esito hai ottenuto?'}</span>
      {promemoria.map((p) => <span key={p} className="w-full text-text-muted text-pretty">Dai libri letti: {p}</span>)}
      {strumenti.length > 0 && (
        <>
          {conInterruttore && <InterruttoreBonus acceso={bonus} disabled={occupato} descrizione={`${nome}, vale per lo strumento che tocchi`} onCambia={setBonus} />}
          <span className="flex w-full flex-wrap gap-1.5" role="group" aria-label="Strumenti">
            {strumenti.map(({ base, bonus: conBonus }) => {
              // uno strumento senza versione con il bonus registra sempre la sua creazione, con l'interruttore acceso o spento
              const scelto = bonus && conBonus ? conBonus : base;
              const idMotivo = `${prefisso}-motivo-${base.chiave}`;
              return (
                // (revisione) il motivo di uno strumento non ancora possibile è scritto nel bottone, come in `ElencoEsiti`, non solo per i lettori di schermo
                <button key={base.chiave} type="button" className={`chip touch flex-col items-start text-left ${!scelto.disponibile ? 'opacity-60 cursor-not-allowed' : ''}`} disabled={occupato}
                  aria-disabled={!scelto.disponibile ? true : undefined} aria-describedby={!scelto.disponibile ? idMotivo : undefined}
                  title={!scelto.disponibile ? `Non ancora possibile: ${scelto.condizioniTesto ?? 'condizioni non soddisfatte'}` : undefined}
                  aria-label={`${nomeStrumento(base)}${bonus && conBonus ? ', con il bonus' : ''}${!scelto.disponibile ? '; non ancora possibile' : ''}`}
                  onClick={() => { if (scelto.disponibile) onScegli(scelto.chiave); }}>
                  <span>{nomeStrumento(base)}</span>
                  {!scelto.disponibile && <span id={idMotivo} className="testo-12 text-text-muted text-pretty">Non ancora: {scelto.condizioniTesto ?? 'condizioni non soddisfatte'}</span>}
                </button>
              );
            })}
          </span>
        </>
      )}
      {altri.length > 0 && <ElencoEsiti esiti={altri} scelto={undefined} occupato={occupato} onScegli={(c) => onScegli(c)} />}
      {/* «Senza punti» solo se gli esiti danno Doti e non sono solo strumenti: per l'estrazione della lotteria la scelta è fra «Vinto» e «Non
          vinto»; per uno strumento il turno si registra con lo strumento creato */}
      {altri.length > 0 && conDoti(altri) && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="deseleziona" dimensione={20} />} titolo="Senza punti" disabled={occupato} onClick={() => onScegli(null)} />}
      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={onAnnulla} />
    </span>
  );
}

/** L13 (31/10): il turno di lavoro: gli yen ricevuti come scritti nel campo, le note toccate per Dote (assenti = non ancora scelte) e le Doti
 *  mostrate (quelle del lavoro, più quelle aggiunte a mano). */
type ValoreLavoro = { tipo: 'lavoro'; yen: string; note: Partial<Record<DoteChiave, 0 | 1 | 2 | 3>>; mostrate: DoteChiave[] };
type Valore = { tipo: 'turno'; esito: string | null } | { tipo: 'dote'; note: 0 | 1 | 2 | 3 } | { tipo: 'alternativa'; scelto: string | null } | { tipo: 'esame'; piazzamento: PiazzamentoEsame } | ValoreLavoro;

/** Gli yen scritti nel campo, se sono un importo valido (intero da 0 al massimo); null altrimenti. */
const yenValidi = (testo: string): number | null => {
  if (!/^\d+$/.test(testo.trim())) return null;
  const n = Number(testo.trim());
  return Number.isSafeInteger(n) && n <= YEN_MASSIMI_LAVORO ? n : null;
};
/** Il turno di lavoro è pronto da spuntare: yen validi (se il lavoro paga) e le note scelte per ogni Dote mostrata. */
const lavoroCompleto = (s: Extract<SceltaEsitoVoceDto, { tipo: 'lavoro' }>, v: ValoreLavoro): boolean =>
  (!chiedeYen(s) || yenValidi(v.yen) !== null) && v.mostrate.every((d) => v.note[d] !== undefined);
/** Gli yen si chiedono se il lavoro paga e la paga non è già nel saldo da prima (voce spuntata prima degli yen automatici). */
const chiedeYen = (s: Extract<SceltaEsitoVoceDto, { tipo: 'lavoro' }>): boolean => !!s.paga && !s.yenGiaNelSaldo;

/**
 * L13 (31/10, richiesta dell'utente: «se una paga è variabile la voce nel diario deve far inserire il valore di denaro ricevuto e poi aggiornare
 * il denaro direttamente… anche il numero di note ottenute dal lavoro… deve essere selezionabile»): gli yen ricevuti (già scritta la paga base,
 * entrano tutti da soli nel saldo) e, per ogni Dote del lavoro, le note ottenute a pulsanti (≥ 44 px) con i punti, o «Nessuna». Un'altra Dote si
 * aggiunge a mano (i clienti speciali del Crossroads la domenica). Le note partono senza scelta: le tocca chi gioca.
 */
function SceltaLavoro({ s, v, occupato, onCambia }: { s: Extract<SceltaEsitoVoceDto, { tipo: 'lavoro' }>; v: ValoreLavoro; occupato: boolean; onCambia: (v: ValoreLavoro) => void }) {
  const idYen = useId();
  const altre = s.doti.filter((d) => !v.mostrate.includes(d.dote));
  // anche il campo vuoto (o un testo che il browser rende vuoto) dice perché «Spunta» resta spento
  const yenScritti = yenValidi(v.yen) === null;
  return (
    <span className="flex w-full flex-col gap-2" role="group" aria-label={`Turno: ${s.attivitaNome}`}>
      <span className="text-text-secondary">{s.attivitaNome}: {chiedeYen(s) ? 'quanto hai ricevuto e quante note hai ottenuto?' : 'quante note hai ottenuto?'}</span>
      {s.paga && s.yenGiaNelSaldo && <span className="text-text-muted text-pretty">La paga di questo turno è già nel saldo da prima: non si muove di nuovo.</span>}
      {chiedeYen(s) && s.paga && (
        <span className="flex flex-col gap-1">
          <label htmlFor={idYen} className="testo-13">Yen ricevuti</label>
          <input id={idYen} className="form-input min-h-11 w-40 tabular-nums" type="number" inputMode="numeric" min={0} max={YEN_MASSIMI_LAVORO} step={1} value={v.yen} disabled={occupato}
            aria-describedby={`${idYen}-aiuto`} aria-invalid={yenScritti ? true : undefined} onChange={(ev) => onCambia({ ...v, yen: ev.target.value })} />
          <span id={`${idYen}-aiuto`} aria-live="polite" className={yenScritti ? 'text-error-testo' : 'text-text-muted text-pretty'}>
            {yenScritti ? `Un importo intero da 0 a ${formattaYen(YEN_MASSIMI_LAVORO)}.` : `Paga base ${formattaYen(s.paga.base)}${s.paga.massima ? `, fino a ${formattaYen(s.paga.massima)} con i bonus` : ''}: entrano tutti da soli nel saldo.`}
          </span>
        </span>
      )}
      {v.mostrate.map((dote) => {
        const d = s.doti.find((x) => x.dote === dote)!;
        const scelta = v.note[dote];
        const imposta = (note: 0 | 1 | 2 | 3) => onCambia({ ...v, note: { ...v.note, [dote]: note } });
        return (
          <span key={dote} className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`Note di ${d.doteNome}`}>
            <span className="w-full text-text-secondary">{d.doteNome}</span>
            {d.punti.map(({ note, punti }) => (
              <button key={note} type="button" className={`chip touch ${scelta === note ? 'chip--attivo' : ''}`} disabled={occupato} aria-pressed={scelta === note}
                onClick={() => imposta(note)} aria-label={`${d.doteNome}: ${noteAParole(note)}, ${testoPunti(punti)}`}>{simboliNote(note)} · {testoPunti(punti)}</button>
            ))}
            <button type="button" className={`chip touch ${scelta === 0 ? 'chip--attivo' : ''}`} disabled={occupato} aria-pressed={scelta === 0} aria-label={`${d.doteNome}: nessuna nota`} onClick={() => imposta(0)}>Nessuna</button>
            {/* una Dote aggiunta a mano si toglie; quelle del lavoro restano («Nessuna» se il turno non le ha date) */}
            {!s.proposte.includes(dote) && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" aria-label={`Togli ${d.doteNome}`} disabled={occupato}
              onClick={() => { const note = { ...v.note }; delete note[dote]; onCambia({ ...v, note, mostrate: v.mostrate.filter((x) => x !== dote) }); }} />}
          </span>
        );
      })}
      {altre.length > 0 && (
        <span className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Note anche in un’altra Dote">
          <span className="w-full text-text-muted">Note anche in un’altra Dote:</span>
          {altre.map((d) => <button key={d.dote} type="button" className="chip touch" disabled={occupato} onClick={() => onCambia({ ...v, mostrate: [...v.mostrate, d.dote] })}>+ {d.doteNome}</button>)}
        </span>
      )}
    </span>
  );
}

/** L13 (ondata 7, O7-2): il premio di un piazzamento in breve, con i punti che la spunta proporrà: «Fascino ♪♪♪ · 5 punti · trofeo «…»». */
const premioTesto = (o: Extract<SceltaEsitoVoceDto, { tipo: 'esame' }>['opzioni'][number]): string =>
  [o.doti.length ? fraseDotiEsito(o.doti) : null, o.trofeo ? `trofeo «${o.trofeo.nome}»` : null].filter((x): x is string => !!x).join(' · ');

/** L13 (ondata 7, O7-2): il piazzamento ai risultati di un esame, a pulsanti (≥ 44 px), ognuno col suo premio; senza premio, il solo nome. */
function SceltaPiazzamento({ s, scelto, occupato, onScegli }: { s: Extract<SceltaEsitoVoceDto, { tipo: 'esame' }>; scelto: PiazzamentoEsame | undefined; occupato: boolean; onScegli: (p: PiazzamentoEsame) => void }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`Piazzamento: ${s.esameNome}`}>
      <span className="w-full text-text-secondary">{s.esameNome}: come ti sei piazzato?</span>
      {s.opzioni.map((o) => {
        const premio = premioTesto(o);
        return (
          <button key={o.piazzamento} type="button" className={`chip touch flex-col items-start text-left ${scelto === o.piazzamento ? 'chip--attivo' : ''}`} disabled={occupato}
            aria-pressed={scelto === o.piazzamento} onClick={() => onScegli(o.piazzamento)} aria-label={`${o.nome}${premio ? `: ${testoNoteAParole(premio)}` : ''}`}>
            <span>{o.nome}</span>
            {premio && <span className="testo-12 text-text-secondary text-pretty">{premio}</span>}
          </button>
        );
      })}
    </span>
  );
}

/**
 * La scelta iniziale di ogni effetto: l'esito atteso dalla voce (se possibile) o il set già comprato nella partita. Le note di una Dote a
 * valori possibili partono SENZA scelta: le note dell'effetto (`preselezionato`) sono solo il valore base dell'editor (la più bassa delle
 * possibili, quando si attiva la scelta), non quelle ottenute. Prima comparivano già «scelte» (♪♪ acceso) e la spunta della voce del 04-17
 * ha registrato ♪♪ · 3 punti a chi aveva ottenuto ♪♪♪ (segnalazione dell'utente del 2026-10-26: «anche se ho scelto 3 note ha fatto +3»):
 * ora nessun valore è acceso finché chi gioca non tocca le note ottenute.
 */
function iniziali(scelte: readonly SceltaEsitoVoceDto[]): Record<string, Valore | undefined> {
  return Object.fromEntries(scelte.map((s): [string, Valore | undefined] => {
    if (s.tipo === 'dote') return [s.effettoUid, undefined];
    if (s.tipo === 'alternativa') return [s.effettoUid, s.preselezionato && s.opzioni.some((o) => o.effettoUid === s.preselezionato && o.disponibile) ? { tipo: 'alternativa', scelto: s.preselezionato } : undefined];
    // L13 (ondata 7, O7-2): il piazzamento già segnato da Partita per lo stesso esame (è un dato della partita, non un valore proposto)
    if (s.tipo === 'esame') return [s.effettoUid, s.preselezionato ? { tipo: 'esame', piazzamento: s.preselezionato } : undefined];
    // L13 (31/10): il turno di lavoro parte con la paga base scritta e le Doti del lavoro mostrate, senza note scelte
    if (s.tipo === 'lavoro') return [s.effettoUid, { tipo: 'lavoro', yen: s.paga ? String(s.paga.base) : '0', note: {}, mostrate: [...s.proposte] }];
    // 2026-10-27: lo strumento della voce parte dalla versione base (interruttore «Bonus» spento); senza strumento nella voce non c'è scelta
    if (s.bonus) return [s.effettoUid, { tipo: 'turno', esito: s.bonus.base }];
    if (s.strumentoDaScegliere) return [s.effettoUid, undefined];
    return [s.effettoUid, s.preselezionato && s.esiti.some((e) => e.chiave === s.preselezionato && e.disponibile) ? { tipo: 'turno', esito: s.preselezionato } : undefined];
  }));
}

/**
 * Le scelte della spunta di una voce: una riga per effetto che le chiede. Con una sola scelta il tocco sull'esito (o su «Senza punti» /
 * «Nessuna») spunta subito; con più scelte il pulsante «Spunta» si accende quando ogni scelta è fatta (anche «Senza punti» / «Nessuna»
 * è una scelta). «Annulla» lascia la voce com'era.
 */
export function SceltaEsitiVoce({ scelte, occupato, onConferma, onAnnulla, onModifica }: { scelte: readonly SceltaEsitoVoceDto[]; occupato: boolean; onConferma: (s: SceltaEsitoSpunta[]) => void; onAnnulla: () => void;
  /** (revisione) Apre l'editor della voce, dove si scelgono strumento e quantità; assente dove la voce non si modifica. */
  onModifica?: () => void }) {
  const [valori, setValori] = useState<Record<string, Valore | undefined>>(() => iniziali(scelte));
  // con UNA sola scelta un tocco basta (come le note di un Confidente e il + di Progressi): il tocco registra subito;
  // con più scelte insieme si fanno tutte e poi si conferma. 2026-10-27: l'interruttore «Bonus» non spunta da solo (si accende e si spegne),
  // e lo strumento da scegliere nell'editor non ha tocchi: con loro serve il pulsante «Spunta»
  // L13 (31/10): anche il turno di lavoro (yen e note insieme) si conferma con «Spunta»
  const conInterruttore = scelte.some((s) => (s.tipo === 'turno' && (s.bonus || s.strumentoDaScegliere)) || s.tipo === 'lavoro');
  const unica = scelte.length === 1 && !conInterruttore;
  const costruisci = (v: Record<string, Valore | undefined>): SceltaEsitoSpunta[] => scelte.map((s): SceltaEsitoSpunta => {
    const x = v[s.effettoUid]!;
    // con la paga già nel saldo si manda la base (la ricevuta la dice; il server non la muove di nuovo)
    if (x.tipo === 'lavoro') return { effettoUid: s.effettoUid, tipo: 'lavoro', yen: s.tipo === 'lavoro' && s.paga ? (s.yenGiaNelSaldo ? s.paga.base : yenValidi(x.yen) ?? 0) : 0,
      doti: x.mostrate.flatMap((dote) => { const n = x.note[dote]; return n ? [{ dote, note: n }] : []; }) };
    if (x.tipo === 'dote') return { effettoUid: s.effettoUid, tipo: 'dote', note: x.note };
    if (x.tipo === 'alternativa') return { effettoUid: s.effettoUid, tipo: 'alternativa', scelto: x.scelto };
    if (x.tipo === 'esame') return { effettoUid: s.effettoUid, tipo: 'esame', piazzamento: x.piazzamento };
    return { effettoUid: s.effettoUid, tipo: 'turno', esito: x.esito };
  });
  const imposta = (uid: string, v: Valore) => {
    // il valore toccato si accende anche con una scelta sola: mentre la spunta si salva si vede che cosa è stato inviato
    setValori((x) => ({ ...x, [uid]: v }));
    if (unica) onConferma(costruisci({ [uid]: v }));
  };
  const complete = scelte.every((s) => { const v = valori[s.effettoUid]; return v !== undefined && (s.tipo !== 'lavoro' || (v.tipo === 'lavoro' && lavoroCompleto(s, v))); });
  // rilievo L3 della revisione UX: con un acquisto fra le scelte (Set A o Set B) «esiti» non è la parola giusta. Solo acquisti: «acquisti»;
  // acquisti con esiti o note: «scelte»; senza acquisti resta «esiti», come prima
  const acquisti = scelte.filter((s) => s.tipo === 'alternativa').length;
  // L13 (ondata 7, O7-2): con soli piazzamenti d'esame la parola è «piazzamento»; misti con altro, «scelte»
  const esami = scelte.filter((s) => s.tipo === 'esame').length;
  // 2026-10-27: solo interruttori «Bonus»: il pulsante dice soltanto «Spunta» (gli esiti non si scelgono qui)
  const soloBonus = scelte.every((s) => s.tipo === 'turno' && (s.bonus || s.strumentoDaScegliere));
  // L13 (31/10): con soli turni di lavoro le scelte sono paga e note
  const soloLavoro = scelte.every((s) => s.tipo === 'lavoro');
  const parola = soloBonus ? { gruppo: 'Spunta della voce', pulsante: 'Spunta' }
    : soloLavoro ? { gruppo: 'Paga e note del turno da indicare per la spunta', pulsante: 'Spunta con questi valori' }
    : esami === scelte.length ? { gruppo: 'Piazzamento da scegliere per la spunta', pulsante: 'Spunta con questo piazzamento' }
    : esami > 0 ? { gruppo: 'Scelte da fare per la spunta', pulsante: 'Spunta con queste scelte' }
    : acquisti === 0 ? { gruppo: 'Esiti da scegliere per la spunta', pulsante: 'Spunta con questi esiti' }
    : acquisti === scelte.length ? { gruppo: 'Acquisti da scegliere per la spunta', pulsante: 'Spunta con questi acquisti' }
      : { gruppo: 'Scelte da fare per la spunta', pulsante: 'Spunta con queste scelte' };
  const conferma = () => {
    if (!complete) return;
    onConferma(costruisci(valori));
  };
  return (
    // 2026-10-27: solo l'interruttore «Bonus»: interruttore, «Spunta» e «Annulla» su una riga (vanno a capo sul telefono se serve)
    <span className={soloBonus ? 'flex w-full flex-wrap items-center gap-1.5 testo-12' : 'flex w-full flex-col gap-2 testo-12'} role="group" aria-label={parola.gruppo}>
      {scelte.map((s) => {
        const v = valori[s.effettoUid];
        if (s.tipo === 'dote') return (
          <span key={s.effettoUid} className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`Note di ${s.doteNome}`}>
            <span className="w-full text-text-secondary">{s.doteNome}: quante note hai ottenuto?</span>
            {/* le note con i punti che la spunta proporrà (calcolati dal server con la regola unica: Fortuna, libro, «Anima da cineasta») */}
            {s.possibili.map((n) => {
              const punti = s.punti.find((x) => x.note === n)?.punti;
              return (
                <button key={n} type="button" className={`chip touch ${v?.tipo === 'dote' && v.note === n ? 'chip--attivo' : ''}`} disabled={occupato} aria-pressed={v?.tipo === 'dote' && v.note === n}
                  onClick={() => imposta(s.effettoUid, { tipo: 'dote', note: n })} aria-label={`${noteAParole(n)}${punti !== undefined ? `, ${testoPunti(punti)}` : ''}`}>{simboliNote(n)}{punti !== undefined ? ` · ${testoPunti(punti)}` : ''}</button>
              );
            })}
            <button type="button" className={`chip touch ${v?.tipo === 'dote' && v.note === 0 ? 'chip--attivo' : ''}`} disabled={occupato} aria-pressed={v?.tipo === 'dote' && v.note === 0} onClick={() => imposta(s.effettoUid, { tipo: 'dote', note: 0 })}>Nessuna</button>
          </span>
        );
        // L13 (decisione 4): fra gli articoli in alternativa (Set A o Set B) quello comprato, o «Nessuno»
        if (s.tipo === 'alternativa') return (
          <SceltaAcquistoAlternativo key={s.effettoUid} s={s} scelto={v?.tipo === 'alternativa' ? v.scelto : undefined} occupato={occupato} onScegli={(uid) => imposta(s.effettoUid, { tipo: 'alternativa', scelto: uid })} />
        );
        // L13 (31/10): il turno di lavoro, con gli yen ricevuti e le note ottenute
        if (s.tipo === 'lavoro') return (
          <SceltaLavoro key={s.effettoUid} s={s} v={v?.tipo === 'lavoro' ? v : { tipo: 'lavoro', yen: s.paga ? String(s.paga.base) : '0', note: {}, mostrate: [...s.proposte] }} occupato={occupato}
            onCambia={(x) => setValori((y) => ({ ...y, [s.effettoUid]: x }))} />
        );
        // L13 (ondata 7, O7-2): il piazzamento ai risultati di un esame, col premio di ciascuno
        if (s.tipo === 'esame') return (
          <SceltaPiazzamento key={s.effettoUid} s={s} scelto={v?.tipo === 'esame' ? v.piazzamento : undefined} occupato={occupato} onScegli={(p) => imposta(s.effettoUid, { tipo: 'esame', piazzamento: p })} />
        );
        // 2026-10-27: lo strumento e la quantità li dice la voce; qui solo «Bonus» sì/no (acceso = la versione con il bonus, spento = quella base)
        if (s.bonus) {
          const b = s.bonus;
          // (revisione) allineato al centro come «Spunta» e «Annulla» nella stessa riga (`items-center`); fra altre scelte, a sinistra
          return <InterruttoreBonus key={s.effettoUid} className={soloBonus ? '' : 'self-start'} acceso={v?.tipo === 'turno' && v.esito === b.conBonus} disabled={occupato}
            descrizione={`${s.attivitaNome}, ${b.nome}${b.quantita > 1 ? ` ×${b.quantita}` : ''}`}
            onCambia={(acceso) => imposta(s.effettoUid, { tipo: 'turno', esito: acceso ? b.conBonus : b.base })} />;
        }
        // la voce non dice lo strumento: si sceglie nell'editor della voce, non alla spunta
        if (s.strumentoDaScegliere) return <span key={s.effettoUid} role="alert" className="w-full text-warning text-pretty">{s.attivitaNome}: la voce non dice che cosa si crea. Scegli strumento e quantità {onModifica ? 'con «Modifica la voce»' : 'nell’editor della voce'}, poi spunta.</span>;
        return (
          <span key={s.effettoUid} className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`Esito: ${s.attivitaNome}`}>
            <span className="w-full text-text-secondary">{s.attivitaNome}: che esito hai ottenuto?</span>
            {/* Ondata 5 (lotto F-bis): gli effetti dei libri letti che riguardano l'attività, solo se ce ne sono (un promemoria, nessun importo) */}
            {s.promemoria?.map((p) => <span key={p} className="w-full text-text-muted text-pretty">Dai libri letti: {p}</span>)}
            <ElencoEsiti esiti={s.esiti} scelto={v?.tipo === 'turno' ? v.esito : undefined} occupato={occupato} onScegli={(c) => imposta(s.effettoUid, { tipo: 'turno', esito: c })} prezzoGiaNelSaldo={s.yenGiaNelSaldo === true} />
            {conDoti(s.esiti) && <button type="button" className={`chip touch ${v?.tipo === 'turno' && v.esito === null ? 'chip--attivo' : ''}`} disabled={occupato} aria-pressed={v?.tipo === 'turno' && v.esito === null} onClick={() => imposta(s.effettoUid, { tipo: 'turno', esito: null })}>Senza punti</button>}
          </span>
        );
      })}
      <span className="flex flex-wrap gap-1.5">
        {/* uno strumento da scegliere nell'editor non lascia spuntare: il pulsante non si mostra (non si accenderebbe mai) */}
        {!unica && !scelte.some((s) => s.tipo === 'turno' && s.strumentoDaScegliere) && <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo={parola.pulsante} disabled={occupato || !complete} onClick={conferma} />}
        {/* (revisione) al posto di «Spunta», che non si accenderebbe, il gesto che risolve: l'editor della voce (dove la voce si modifica) */}
        {onModifica && scelte.some((s) => s.tipo === 'turno' && s.strumentoDaScegliere) && <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica la voce" disabled={occupato} onClick={() => { onAnnulla(); onModifica(); }} />}
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={onAnnulla} />
      </span>
    </span>
  );
}
