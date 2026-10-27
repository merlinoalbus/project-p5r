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
// ============================================================

import { useId, useState } from 'react';
import { fraseConsumaEsito, fraseDotiEsito, fraseOggettiEsito, type EsitoDisponibileDto, type SceltaEsitoSpunta, type SceltaEsitoVoceDto } from '../../../shared/esitiAttivita';
import { noteAParole, simboliNote, testoNoteAParole, testoPunti } from '../../../shared/note';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { formattaYen } from '../../utils/letture';
import { SceltaAcquistoAlternativo } from './SceltaAcquistoAlternativo';

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
  return [doti ? dotiTesto(e) : null, prezzoEsito(e, prezzoGiaNelSaldo), e.trofeo ? `trofeo «${e.trofeo.nome}»` : null, fraseOggettiEsito(e.oggetti), fraseConsumaEsito(e.consuma), e.premi]
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
                  aria-label={`${e.nome}${doti ? `: ${testoNoteAParole(dotiTesto(e))}` : ''}${prezzo ? `; ${prezzo}` : ''}${e.trofeo ? `; segna il trofeo ${e.trofeo.nome}` : ''}${oggetti ? `; ricevi ${oggetti}` : ''}${usa ? `; ${usa}` : ''}${e.premi ? `; premi: ${e.premi}` : ''}${!e.disponibile ? '; non ancora possibile' : ''}`}>
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

/** Il + del contatore di un'attività con esiti: un tocco sull'esito lo registra; «Senza punti» registra il turno senza Doti. */
export function SceltaEsitoTurno({ nome, esiti, occupato, onScegli, onAnnulla, promemoria = [] }: { nome: string; esiti: readonly EsitoDisponibileDto[]; occupato: boolean; onScegli: (esito: string | null) => void; onAnnulla: () => void; promemoria?: readonly string[] }) {
  return (
    <span className="flex w-full flex-wrap items-center gap-1.5 testo-12" role="group" aria-label={`Esito del turno: ${nome}`}>
      <span className="w-full text-text-secondary">Che esito hai ottenuto?</span>
      {promemoria.map((p) => <span key={p} className="w-full text-text-muted text-pretty">Dai libri letti: {p}</span>)}
      <ElencoEsiti esiti={esiti} scelto={undefined} occupato={occupato} onScegli={(c) => onScegli(c)} />
      {/* «Senza punti» solo se gli esiti danno Doti: per l'estrazione della lotteria la scelta è fra «Vinto» e «Non vinto» */}
      {conDoti(esiti) && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="deseleziona" dimensione={20} />} titolo="Senza punti" disabled={occupato} onClick={() => onScegli(null)} />}
      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={onAnnulla} />
    </span>
  );
}

type Valore = { tipo: 'turno'; esito: string | null } | { tipo: 'dote'; note: 0 | 1 | 2 | 3 } | { tipo: 'alternativa'; scelto: string | null };

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
    return [s.effettoUid, s.preselezionato && s.esiti.some((e) => e.chiave === s.preselezionato && e.disponibile) ? { tipo: 'turno', esito: s.preselezionato } : undefined];
  }));
}

/**
 * Le scelte della spunta di una voce: una riga per effetto che le chiede. Con una sola scelta il tocco sull'esito (o su «Senza punti» /
 * «Nessuna») spunta subito; con più scelte il pulsante «Spunta» si accende quando ogni scelta è fatta (anche «Senza punti» / «Nessuna»
 * è una scelta). «Annulla» lascia la voce com'era.
 */
export function SceltaEsitiVoce({ scelte, occupato, onConferma, onAnnulla }: { scelte: readonly SceltaEsitoVoceDto[]; occupato: boolean; onConferma: (s: SceltaEsitoSpunta[]) => void; onAnnulla: () => void }) {
  const [valori, setValori] = useState<Record<string, Valore | undefined>>(() => iniziali(scelte));
  // con UNA sola scelta un tocco basta (come le note di un Confidente e il + di Progressi): il tocco registra subito;
  // con più scelte insieme si fanno tutte e poi si conferma
  const unica = scelte.length === 1;
  const costruisci = (v: Record<string, Valore | undefined>): SceltaEsitoSpunta[] => scelte.map((s): SceltaEsitoSpunta => {
    const x = v[s.effettoUid]!;
    if (x.tipo === 'dote') return { effettoUid: s.effettoUid, tipo: 'dote', note: x.note };
    if (x.tipo === 'alternativa') return { effettoUid: s.effettoUid, tipo: 'alternativa', scelto: x.scelto };
    return { effettoUid: s.effettoUid, tipo: 'turno', esito: x.esito };
  });
  const imposta = (uid: string, v: Valore) => {
    // il valore toccato si accende anche con una scelta sola: mentre la spunta si salva si vede che cosa è stato inviato
    setValori((x) => ({ ...x, [uid]: v }));
    if (unica) onConferma(costruisci({ [uid]: v }));
  };
  const complete = scelte.every((s) => valori[s.effettoUid] !== undefined);
  // rilievo L3 della revisione UX: con un acquisto fra le scelte (Set A o Set B) «esiti» non è la parola giusta. Solo acquisti: «acquisti»;
  // acquisti con esiti o note: «scelte»; senza acquisti resta «esiti», come prima
  const acquisti = scelte.filter((s) => s.tipo === 'alternativa').length;
  const parola = acquisti === 0 ? { gruppo: 'Esiti da scegliere per la spunta', pulsante: 'Spunta con questi esiti' }
    : acquisti === scelte.length ? { gruppo: 'Acquisti da scegliere per la spunta', pulsante: 'Spunta con questi acquisti' }
      : { gruppo: 'Scelte da fare per la spunta', pulsante: 'Spunta con queste scelte' };
  const conferma = () => {
    if (!complete) return;
    onConferma(costruisci(valori));
  };
  return (
    <span className="flex w-full flex-col gap-2 testo-12" role="group" aria-label={parola.gruppo}>
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
        {!unica && <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo={parola.pulsante} disabled={occupato || !complete} onClick={conferma} />}
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={onAnnulla} />
      </span>
    </span>
  );
}
