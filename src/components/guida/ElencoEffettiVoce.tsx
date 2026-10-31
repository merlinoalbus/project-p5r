// ============================================================
// ElencoEffettiVoce — TUTTI gli effetti della spunta di una voce, in un solo elenco (L13, ondata 4a)
// ============================================================
//
// Richiesta dell'utente (2026-10-25): due acquisti nella stessa voce stavano uno nel riquadro «Spuntando succede» («Articolo comprato») e
// uno negli «Effetti aggiuntivi» («Articolo del negozio»), e il riepilogo ne mostrava uno solo. Ora non c'è più un effetto «principale»
// con un editor suo e degli «aggiuntivi» ripiegati con un altro: ogni effetto è una scheda dello stesso elenco, con la sua frase, «Modifica»
// (i campi di `CampiEffettoVoce`, l'UNICO editor di ogni tipo di effetto) e «Togli», nell'ordine in cui la spunta li applica; sotto, un
// solo «Aggiungi un effetto» con il menu a icone di tutti i tipi. L'effetto che corrisponde a tipo e «Quale» porta il segno «segue Quale»:
// cambiando «Quale» si aggiorna da solo (vedi `cambiaCollegamento`). Niente UID visibili, niente frecce (l'ordine non conta per l'utente;
// gli articoli di un negozio, che si riordinano, stanno negli «Acquisti da questo negozio»).
// ============================================================

import { useState } from 'react';
import { motivoOggettiGiaNelTurno, motivoYenGiaStrutturati, type DatoConYen, type EffettoVoce } from '../../../shared/effettiVoce';
import { CATEGORIA_EFFETTO, MENU_EFFETTI as MENU, effettoNuovo } from '../../utils/effettiDellaVoce';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { IconaCategoria } from './IconaCategoria';
import { CampiEffettoVoce } from './CampiEffettoVoce';
import type { ElenchiVoce } from '../../utils/opzioniEffetti';
import { effettoCompleto, type CampiStrutturati } from '../../utils/azioneStrutturata';
import { NOME_FAMIGLIA_EFFETTO, fraseEffetto, indiceDelCollegamento, type NomiEffetti, type RigaEffetto } from '../../utils/effettoAutomatico';
import { TestoNote } from '../shared/TestoNote';
import { testoNoteAParole } from '../../../shared/note';

type Tipo = EffettoVoce['tipo'];

/**
 * I codici degli effetti nuovi (ancora senza UID), legati all'oggetto della riga: le righe non toccate restano lo stesso oggetto fra una
 * modifica e l'altra (anche quando a cambiare la lista è un'altra parte della finestra), e la riga nuova modificata qui eredita il codice.
 */
const CODICI = new WeakMap<RigaEffetto, string>();
let prossimoCodice = 0;
/** L'identità stabile di una riga: l'UID, o il codice dato alla prima vista di una riga nuova. */
const idRiga = (r: RigaEffetto): string => {
  if (r.uid) return r.uid;
  let c = CODICI.get(r);
  if (!c) { prossimoCodice += 1; c = `nuovo-${prossimoCodice}`; CODICI.set(r, c); }
  return c;
};

/** Gli yen che film, attività e Richieste portano già, dagli elenchi dell'editor (il server li calcola con `yenDeiDati`). */
const yenDelDato = (el: ElenchiVoce, tipo: DatoConYen, chiave: string): number | undefined =>
  (tipo === 'film' ? el.azione.film : tipo === 'attivita' ? el.azione.attivita : el.azione.richieste).find((x) => x.chiave === chiave)?.yen;

/** Lo strumento di un esito e gli oggetti che dà (base e con il bonus), dagli elenchi dell'editor (il server li calcola con `prodottiDelloStrumento`). */
const prodottiDiStrumento = (el: ElenchiVoce, attivita: string, esito: string): { strumento: string; oggetti: readonly string[] } | null => {
  const x = el.azione.attivita.find((a) => a.chiave === attivita)?.esiti?.elenco.find((e) => e.chiave === esito);
  return x?.strumento && x.oggetti ? { strumento: x.strumento, oggetti: x.oggetti } : null;
};

/**
 * Su una voce già spuntata, i nomi dei tipi di effetto per la nota sotto l'elenco. L13 (decisione 19): gli effetti di stato si applicano subito al
 * salvataggio nelle partite che hanno la spunta (`motoreDiario.riallineaStatiDellaVoce`), e la finestra della voce notifica che cosa è successo in
 * ogni partita; gli altri compaiono come «Applica» sulla voce (`creaPropostaEffettoStorico`). Revisione UX del 2026-10-26 («le etichette di testo
 * devono essere visibili solo se hanno senso»): la nota nomina solo i tipi che la voce ha, nell'ordine di questi elenchi.
 */
const SUBITO: ReadonlyArray<[Tipo, string]> = [['articolo', 'articoli'], ['oggetto', 'oggetti'], ['uscitaOggetto', 'oggetti restituiti o venduti'], ['storia', 'eventi di storia'], ['domanda', 'domande'], ['cruciverba', 'cruciverba'],
  ['richiesta', 'Richieste'], ['invito', 'inviti'], ['puntiConfidente', 'note di rango ai Confidenti'], ['persona', 'Persona'], ['personaTolta', 'Persone tolte dalla scorta'], ['trofeo', 'trofei'], ['sblocco', 'sblocchi']];
const CON_APPLICA: ReadonlyArray<[Tipo, string]> = [['dote', 'Doti'], ['lettura', 'letture'], ['turno', 'turni'], ['acquisto', 'Aojiru'], ['pesca', 'pesca'], ['yen', 'yen']];
/** «a, b e c»: i nomi dei tipi presenti fra quelli dell'elenco, o null se nessuno. */
const tipiPresenti = (elenco: ReadonlyArray<[Tipo, string]>, presenti: ReadonlySet<Tipo>): string | null => {
  const nomi = elenco.filter(([t]) => presenti.has(t)).map(([, n]) => n);
  return !nomi.length ? null : nomi.length === 1 ? nomi[0]! : `${nomi.slice(0, -1).join(', ')} e ${nomi[nomi.length - 1]}`;
};
/** La nota per una voce già spuntata, solo con i tipi che la voce ha. */
function NotaVoceSpuntata({ righe }: { righe: readonly RigaEffetto[] }) {
  const presenti = new Set(righe.map((r) => r.effetto.tipo));
  const subito = tipiPresenti(SUBITO, presenti), conApplica = tipiPresenti(CON_APPLICA, presenti);
  const frasi = [
    subito && `aggiungendo, cambiando o togliendo ${subito}, le partite che l’hanno spuntata si aggiornano subito (togliendo, torna com’era solo ciò che la spunta aveva aggiunto e che non hai modificato dopo)`,
    conApplica && `per ${conApplica} compare il pulsante «Applica» sulla voce`,
    presenti.has('fortuna') && 'la Fortuna vale solo se la partita è ancora a quel giorno',
    // L13 (ondata 7, O7-2): il piazzamento si sceglie alla spunta; su una voce già spuntata nessuno l'ha scelto (il server lo chiede: 409)
    presenti.has('esame') && 'per i risultati di un esame il piazzamento si sceglie togliendo e rimettendo la spunta',
  ].filter((x): x is string => !!x);
  // senza effetti di questi tipi la nota dice solo che cosa succede a ciò che si aggiunge
  const testo = frasi.length ? frasi.join('; ') : 'ciò che aggiungi vale anche per le partite che l’hanno spuntata (gli effetti di stato subito, gli altri come pulsante «Applica» sulla voce)';
  return <p className="m-0 testo-12 text-text-secondary text-pretty">Questa voce è già spuntata: {testo}.</p>;
}

interface Props {
  valore: CampiStrutturati;
  onCambia: (v: CampiStrutturati) => void;
  elenchi: ElenchiVoce;
  nomi: NomiEffetti;
  /** Gli effetti che un'altra parte della finestra mostra già (gli articoli del negozio della voce): qui non compaiono una seconda volta. */
  altrove?: (r: RigaEffetto) => boolean;
  /** La voce è spuntata nella partita aperta. */
  fatta?: boolean;
}

/** L'elenco unico degli effetti, con «Aggiungi un effetto»: vedi l'intestazione del file. */
export function ElencoEffettiVoce({ valore, onCambia, elenchi, nomi, altrove, fatta }: Props) {
  const righe = valore.effettiVoce ?? [];
  const collegato = indiceDelCollegamento(righe, valore.tipo, valore.riferimento);
  const visibili = righe.map((r, i) => ({ r, i })).filter(({ r }) => !altrove?.(r));
  const [menu, setMenu] = useState(false);
  /**
   * La scheda aperta in modifica (una sola alla volta), per IDENTITÀ e non per posto: l'UID dell'effetto, o per un effetto nuovo (ancora senza UID)
   * il codice che gli diamo qui (`idRiga`). Togliere un articolo dagli «Acquisti da questo negozio», o spostarlo, cambia i posti nella lista
   * completa senza che questo elenco lo sappia: con il posto, la scheda aperta cambiava da sola.
   */
  const [inModifica, setInModifica] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const imposta = (effettiVoce: RigaEffetto[]) => { setErrore(null); onCambia({ ...valore, effettiVoce }); };
  const cambia = (i: number, effetto: EffettoVoce) => imposta(righe.map((r, j) => {
    if (j !== i) return r;
    const nuova = { ...r, effetto };
    if (!r.uid) CODICI.set(nuova, idRiga(r)); // la riga nuova modificata resta la stessa scheda
    return nuova;
  }));
  const togli = (i: number) => {
    const uid = righe[i]?.uid;
    if (uid && righe.some((r) => (r.effetto.tipo === 'acquisto' && r.effetto.sostituisceDoti.includes(uid)) || (r.effetto.tipo === 'pesca' && [...r.effetto.sostituisceTurni, ...r.effetto.sostituisceDoti].includes(uid)))) {
      setErrore('Questo effetto è indicato come sostituito da un acquisto Aojiru o da una sessione di pesca. Rivedi prima quel collegamento.');
      return;
    }
    setInModifica((m) => (m !== null && righe[i] && m === idRiga(righe[i]) ? null : m));
    imposta(righe.filter((_, j) => j !== i));
  };
  const aggiungi = (t: Tipo) => {
    setMenu(false);
    const nuova: RigaEffetto = { uid: null, effetto: effettoNuovo(t) };
    setInModifica(idRiga(nuova));
    imposta([...righe, nuova]);
  };

  // L13 (decisione 2): un effetto «yen» accanto a un dato che porta già i suoi yen si segnala SUBITO, con la stessa regola del server
  const motivoYen = motivoYenGiaStrutturati(righe.map((r) => r.effetto), { riferimento: valore.riferimento, yenDi: (tipo, chiave) => yenDelDato(elenchi, tipo, chiave) });
  // 2026-10-27 (punto 4 della richiesta: «nessun doppione»): un «oggetto ricevuto» che lo strumento del turno dà già si segnala SUBITO, con la
  // stessa regola del server (che lo rifiuta con 409 `oggetto-gia-nel-turno`)
  const motivoOggetti = motivoOggettiGiaNelTurno(righe.map((r) => r.effetto), { prodottiDi: (attivita, esito) => prodottiDiStrumento(elenchi, attivita, esito), nomeOggetto: (k) => nomi.oggetti?.get(k) });
  return (
    <div className="flex flex-col gap-2">
      {motivoYen && <p role="alert" className="m-0 rounded border border-warning p-2 testo-13 text-warning">{motivoYen}</p>}
      {motivoOggetti && <p role="alert" className="m-0 rounded border border-warning p-2 testo-13 text-warning text-pretty">{motivoOggetti}</p>}
      {visibili.length === 0 && <p className="m-0 testo-13 text-text-muted">{righe.length === 0 ? 'Nessun effetto: la spunta registra solo che l’hai fatta.' : 'Nessun altro effetto.'}</p>}
      {visibili.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Effetti della spunta">
          {visibili.map(({ r, i }) => {
            const completo = effettoCompleto(r.effetto);
            const id = idRiga(r);
            const editing = inModifica === id || !completo;
            const nome = NOME_FAMIGLIA_EFFETTO[r.effetto.tipo];
            const frase = completo ? fraseEffetto(r.effetto, nomi) : nome;
            // il nome per i lettori di schermo: la frase dell'effetto (due effetti dello stesso tipo nella voce restano distinti), o il tipo se da
            // completare, con le note dette a parole («2 note», non il nome del simbolo ripetuto)
            const nomeAccessibile = testoNoteAParole(frase);
            return (
              <li key={id}className="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-bg-tertiary p-2">
                <div className="flex min-w-0 flex-wrap items-start gap-2">
                  <IconaCategoria categoria={CATEGORIA_EFFETTO[r.effetto.tipo]} dimensione={32} />
                  {/* 2026-10-26 («le etichette di testo devono essere visibili solo se hanno senso»): niente titolo in maiuscolo sopra la frase, che
                      dice già di che effetto si tratta (con l'icona della categoria); il nome della famiglia compare solo finché l'effetto è da completare */}
                  <div className="flex min-h-8 min-w-0 flex-1 basis-40 flex-col justify-center">
                    <span className="testo-13 break-words text-pretty">
                      {completo ? <TestoNote testo={frase} /> : `${nome}: da scegliere qui sotto.`}
                      {i === collegato && <>{' '}<span className="chip testo-12 align-middle" title="Cambiando «Quale» questo effetto si aggiorna da solo">segue «Quale»</span></>}
                    </span>
                  </div>
                  <span className="flex shrink-0 gap-1">
                    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo={editing && completo ? 'Chiudi' : 'Modifica'}
                      aria-label={`${editing && completo ? 'Chiudi' : 'Modifica'}: ${nomeAccessibile}`} disabled={!completo} onClick={() => setInModifica(inModifica === id ? null : id)} />
                    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" aria-label={`Togli: ${nomeAccessibile}`} onClick={() => togli(i)} />
                  </span>
                </div>
                {editing && <CampiEffettoVoce effetto={r.effetto} elenchi={elenchi} righe={righe} onCambia={(e) => cambia(i, e)} />}
              </li>
            );
          })}
        </ul>
      )}
      {errore && <p role="alert" className="m-0 text-error-testo testo-12">{errore}</p>}
      {righe.length < 100 && (
        <div className="flex flex-col gap-2">
          <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi un effetto" attivo={menu} aria-expanded={menu} onClick={() => setMenu((m) => !m)} />
          {menu && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Che effetto aggiungere">
              {MENU.map((m) => (
                <PulsanteVisivo key={m.tipo} tono="secondario" disposizione="colonna" icona={<IconaCategoria categoria={m.categoria} dimensione={40} />} titolo={NOME_FAMIGLIA_EFFETTO[m.tipo]} onClick={() => aggiungi(m.tipo)} />
              ))}
            </div>
          )}
        </div>
      )}
      {fatta && <NotaVoceSpuntata righe={righe} />}
    </div>
  );
}
