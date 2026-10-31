// ============================================================
// ConfidentiPartita — i 23 Confidenti della partita: schede compatte in griglia + cassetto con tutti i comandi del Confidente
// ============================================================
//
// Disposizione (2026-10-24, una barra di scorrimento sola alla volta, regola dell'utente): due gruppi richiudibili («Attivi e
// sbloccabili», «Non ancora disponibili») con una scheda di sintesi per Confidente (`RigaConfidente`: ritratto, nome, arcano, rango e
// UN solo stato) in griglia; scorre solo la pagina. Il tocco su una scheda apre il cassetto (`Modal cassetto`: da destra, alto quanto lo
// schermo; dal basso sul telefono) col dettaglio (`DettaglioConfidente`: targa del rango con − / +, requisiti, moltiplicatori, note ♪,
// regalo e uscita, risposte migliori del prossimo rango a fianco); mentre è aperto scorre solo lui e la pagina sotto è ferma. Il
// Confidente aperto sta nell'indirizzo (`?confidente=<chiave>`, accanto a `?scheda=`): Indietro chiude il cassetto.
//
// Nel gioco ogni risposta mostra 1–3 note: valgono 5/10/15 punti base; un regalo gradito 50, un'uscita 10.
// Moltiplicatori cumulativi: Persona dello stesso arcano in scorta ×1,5 (rilevata dalla scorta della partita,
// modificabile per Confidente), esami (1º ×1,5, top 10 ×1,2), invito accettato subito via SMS ×1,2.
// La conversione la fa il backend (`noteRisposta`, `regalo`, `uscita`, `bonusArcano`, `invito`; il piazzamento agli esami è della partita).
// Qui sta tutta la logica delle azioni (salva, annulla ultimo, conferma, note, regalo); i componenti figli sono solo presentazione.
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { aggiornaConfidente, annullaRegaloOggetto, getConfidentiPartita, confermaRequisitoConfidente, impostaPiazzamentoEsame } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { PageState } from '../shared/PageState';
import { Modal } from '../shared/Modal';
import { IconChevronRight } from '../shared/icons';
import type { ConfidentePartitaDto, ModificaConfidente } from '../../types';
import { anteprimaPunti, formattaPunti } from '../../utils/punti';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { useSuggerimenti } from '../../stores/suggerimentiStore';
import { avvisaDotiDaSegnare } from '../../utils/dotiDaSegnare';
import { SceltaRegalo } from '../catalogo/SceltaRegalo';
import { esitoDelRegalo } from '../../../shared/regali';
import type { PiazzamentoEsame } from '../../../shared/puntiConfidenti';
import { RigaConfidente } from './RigaConfidente';
import { sogliaRaggiunta } from './regoleConfidente';
import { DettaglioConfidente, type AzioniConfidente } from './DettaglioConfidente';
import { svuotaDettagliConfidenti } from './useDettaglioConfidente';
import { SchedaNelCassetto } from './SchedaNelCassetto';

interface Props {
  partitaId: number;
  /** Solo il cassetto di un Confidente, sopra la pagina che lo apre (il cartellino del Confidente nel diario, 2026-10-24): niente elenco
   *  né indirizzo; stesse azioni e stessa logica della scheda «Confidenti». `onChiudi` lo chiude (✕, Esc). */
  soloCassetto?: { chiave: string; onChiudi: () => void };
}

type ChiaveGruppo = 'attivi' | 'bloccati';

/** Gruppi dell'elenco: in cima chi si puo far crescere adesso (rango > 0, gia sbloccato, o rango 0 con i requisiti del rango 1 soddisfatti). */
const GRUPPI: ReadonlyArray<{ chiave: ChiaveGruppo; titolo: string; descrizione: string }> = [
  { chiave: 'attivi', titolo: 'Attivi e sbloccabili', descrizione: 'in corso o pronti da avviare in gioco' },
  { chiave: 'bloccati', titolo: 'Non ancora disponibili', descrizione: 'requisiti del primo rango non soddisfatti' },
];

/** Un Confidente resta fra i bloccati solo finche non e mai stato avviato e i requisiti del rango 1 non sono soddisfatti. */
function gruppoDi(c: ConfidentePartitaDto): ChiaveGruppo {
  return c.rango > 0 || c.sbloccato || !c.bloccato ? 'attivi' : 'bloccati';
}

// ---- Gruppi aperti o chiusi, ricordati per visitatore (localStorage; la pagina funziona anche senza) ----

const CHIAVE_GRUPPI = 'p5r.confidentiPartita.gruppiAperti';
const GRUPPI_PREDEFINITI: Record<ChiaveGruppo, boolean> = { attivi: true, bloccati: false };

/** Lo stato salvato dei gruppi; se manca, è illeggibile o lo storage non c'è, quello predefinito (attivi aperti, non disponibili chiusi). */
function leggiGruppiAperti(): Record<ChiaveGruppo, boolean> {
  try {
    const grezzo = window.localStorage.getItem(CHIAVE_GRUPPI);
    if (grezzo) {
      const o = JSON.parse(grezzo) as Partial<Record<ChiaveGruppo, unknown>>;
      return {
        attivi: typeof o.attivi === 'boolean' ? o.attivi : GRUPPI_PREDEFINITI.attivi,
        bloccati: typeof o.bloccati === 'boolean' ? o.bloccati : GRUPPI_PREDEFINITI.bloccati,
      };
    }
  } catch { /* storage assente o contenuto illeggibile: valgono i predefiniti */ }
  return { ...GRUPPI_PREDEFINITI };
}

/** Ricorda lo stato dei gruppi; se lo storage non risponde non succede niente. */
function salvaGruppiAperti(stato: Record<ChiaveGruppo, boolean>): void {
  try {
    window.localStorage.setItem(CHIAVE_GRUPPI, JSON.stringify(stato));
  } catch { /* storage pieno o bloccato: si perde solo il ricordo */ }
}

/** I Confidenti della partita in due gruppi richiudibili, una scheda per Confidente e il cassetto del Confidente aperto: rango con +/−
 * (e «Segna comunque» se bloccato dai requisiti), semafori del rango successivo, punti con note della risposta e risposte migliori,
 * regalo e uscita calcolati coi moltiplicatori della partita (esami, invito SMS, scelti nel dettaglio) e col bonus arcano, «Annulla ultimo», sblocco e
 * note in una finestra. Ogni aggiornamento sostituisce il solo Confidente toccato. */
export function ConfidentiPartita({ partitaId, soloCassetto }: Props) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  // le correzioni a dialoghi, abilità e regali fatte nella scheda del Confidente si rileggono ogni volta che si apre questa scheda
  useState(() => { svuotaDettagliConfidenti(); return null; });
  const { dati, caricamento, errore, ricarica, imposta } = useCarica(() => getConfidentiPartita(partitaId), [partitaId]);
  const [occupato, setOccupato] = useState<string | null>(null);
  const sugg = useSuggerimenti();
  const [modifica, setModifica] = useState<ConfidentePartitaDto | null>(null);
  const [note, setNote] = useState('');
  const [gruppiAperti, setGruppiAperti] = useState<Record<ChiaveGruppo, boolean>>(leggiGruppiAperti);
  // Moltiplicatori globali (valgono per tutte le card finché l'utente non li cambia).
  // Il piazzamento agli esami sta nella partita (vale fino ai risultati dell'esame successivo): i pulsanti lo scrivono per l'esame che vale adesso.
  const [invito, setInvito] = useState(false);
  const piazzamentoEsame = dati?.[0]?.piazzamentoEsame ?? null;
  // L13 (ondata 7, O7-2): la stessa riga che la spunta della voce dei risultati scrive («Sopra la media» compreso: lì il moltiplicatore non c'è,
  // e nessuno dei due pulsanti risulta acceso); qui si scelgono i due piazzamenti che moltiplicano, o si tolgono
  const scegliPiazzamento = (p: Extract<PiazzamentoEsame, 'primo' | 'primi-10'>) => {
    if (!piazzamentoEsame) return;
    void impostaPiazzamentoEsame(partitaId, piazzamentoEsame.esame, piazzamentoEsame.piazzamento === p ? null : p)
      .then(() => ricarica())
      .catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Piazzamento non salvato.'));
  };
  /** L'anteprima dei punti: stesso modulo e stesse regole del server (piazzamento della partita, rango che sale a punti). */
  const anteprima = (c: ConfidentePartitaDto, cosa: { noteRisposta?: 1 | 2 | 3; regalo?: boolean; uscita?: boolean }, bonus: boolean) =>
    anteprimaPunti({ confidente: c.chiave, ...cosa, bonusArcano: bonus, invito, piazzamento: c.piazzamentoEsame?.piazzamento ?? null, contaPunti: c.contaPunti });
  // Bonus arcano per Confidente: predefinito dalla scorta, modificabile a mano (chiave → valore forzato).
  const [bonusForzato, setBonusForzato] = useState<Record<string, boolean>>({});
  // Gli incrementi di ogni Confidente, dal più vecchio al più recente, per «Annulla ultimo»: annulla l'ultimo, poi resta quello di prima.
  // Un regalo consegnato dalla finestra «Regala» porta il suo oggetto: si annulla con la sua consegna (punti compresi).
  const [ultimo, setUltimo] = useState<Record<string, Array<{ punti: number; regalo?: string; consegna?: number }>>>({});
  const cimaDi = (chiave: string) => ultimo[chiave]?.[ultimo[chiave].length - 1];
  // Il Confidente a cui si sta regalando (finestra unica «Regala»).
  const [regaloPer, setRegaloPer] = useState<string | null>(null);
  // La vista del cassetto (Level up o Scheda completa, con i parametri della scheda); vale per il Confidente aperto, poi torna al Level up.
  const [vista, setVista] = useState<{ chiave: string; tipo: 'levelup' | 'scheda'; search: string } | null>(null);
  // Il rango appena raggiunto con «+» o «Sali al rango N», per Confidente: finché resta quello, le risposte mostrate sono dell'evento
  // appena giocato (le note che dà valgono già verso il rango dopo); scendendo o salendo ancora si torna al prossimo evento.
  const [appenaSalito, setAppenaSalito] = useState<Record<string, number>>({});

  /** Bonus arcano del Confidente: quello forzato a mano, altrimenti la presenza in scorta di una Persona dello stesso arcano. */
  const bonusArcanoDi = (c: ConfidentePartitaDto) => bonusForzato[c.chiave] ?? c.personaArcanoInScorta;

  /** Invia la modifica di un Confidente e ne sostituisce i dati in elenco. Per i soli incrementi
   * di punti ricorda l'aumento per «Annulla ultimo» (azzerato se i punti calano o il rango cambia);
   * avvisa delle Doti da segnare per l'incontro e annuncia quando la soglia del rango successivo è
   * appena stata raggiunta. Restituisce il Confidente aggiornato, o `null` in caso di errore. */
  const salva = async (chiave: string, cambio: ModificaConfidente, mantieniPila = false): Promise<ConfidentePartitaDto | null> => {
    if (!dati) return null;
    setOccupato(chiave);
    try {
      const prima = dati.find((c) => c.chiave === chiave);
      const agg = await aggiornaConfidente(partitaId, chiave, cambio);
      // dai dati correnti: dopo l'`await` `dati` è quello del render, e un altro Confidente aggiornato nel frattempo si perderebbe
      imposta((correnti) => correnti.map((c) => (c.chiave === chiave ? agg : c)));
      if (prima && cambio.rango === undefined && cambio.punti === undefined) {
        const delta = Math.round((agg.punti - prima.punti) * 100) / 100;
        if (delta > 0) setUltimo((u) => ({ ...u, [chiave]: [...(u[chiave] ?? []), { punti: delta }] }));
        else if (delta < 0 && !mantieniPila) setUltimo((u) => ({ ...u, [chiave]: [] }));
      }
      if (prima && agg.rango !== prima.rango) setUltimo((u) => ({ ...u, [chiave]: [] }));
      // la Dote del passaggio di rango: il passaggio l'ha registrata (o, scendendo, tolta); una risposta registra l'incontro
      // senza Dote (dal 2026-10-17). Le Doti si segnano a mano: l'avviso la ricorda
      avvisaDotiDaSegnare(agg.doteIncontro, `Incontro con ${agg.nome}`);
      if (prima && agg.puntiNecessari !== null && agg.puntiNecessari > 0 && agg.mancanti === 0 && (prima.mancanti ?? 1) > 0) {
        notifica('success', `${agg.nome}: punti sufficienti per il rango ${agg.rango + 1}! Passa del tempo insieme per salire di rango.`);
      }
      return agg;
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
      return null;
    } finally {
      setOccupato(null);
    }
  };

  /** «Annulla ultimo»: toglie l'ultima azione (un regalo con la sua consegna, o i punti dell'incremento); poi resta disponibile quella di prima. */
  const annullaUltimo = async (c: ConfidentePartitaDto) => {
    const cima = cimaDi(c.chiave);
    if (!cima) return;
    const togli = () => setUltimo((u) => ({ ...u, [c.chiave]: (u[c.chiave] ?? []).slice(0, -1) }));
    if (!cima.regalo) {
      const agg = await salva(c.chiave, { deltaPunti: -cima.punti }, true);
      if (agg) togli();
      return;
    }
    setOccupato(c.chiave);
    try {
      const esito = await annullaRegaloOggetto(partitaId, c.chiave, cima.regalo, cima.consegna);
      imposta((correnti) => correnti.map((x) => (x.chiave === c.chiave ? esito.confidente : x)));
      // se il rango è cambiato i punti di prima non valgono più: la pila riparte da zero, altrimenti resta l'azione precedente
      if (esito.confidente.rango !== c.rango) setUltimo((u) => ({ ...u, [c.chiave]: [] }));
      else togli();
      notifica('success', `Regalo annullato per ${c.nome}.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Annullamento non riuscito.');
    } finally {
      setOccupato(null);
    }
  };

  /** Conferma (o toglie la conferma a) un requisito di rango verificato a mano e aggiorna il Confidente. */
  const conferma = async (c: ConfidentePartitaDto, rango: number, indice: number, confermato: boolean) => {
    setOccupato(c.chiave);
    try {
      const agg = await confermaRequisitoConfidente(partitaId, c.chiave, rango, indice, confermato);
      imposta((correnti) => correnti.map((x) => (x.chiave === agg.chiave ? agg : x)));
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    } finally {
      setOccupato(null);
    }
  };

  /** Salva le note del Confidente in modifica e chiude la finestra se il salvataggio riesce. */
  const salvaNote = async () => {
    if (!modifica) return;
    const esito = await salva(modifica.chiave, { note });
    if (esito) setModifica(null);
  };

  /** Le azioni che il dettaglio chiede per un Confidente: stesse chiamate, stessi argomenti di quando i comandi stavano nella card. */
  const azioniDi = (c: ConfidentePartitaDto): AzioniConfidente => {
    const bonus = bonusArcanoDi(c);
    /** Cambia il rango e, salendo, ricorda il rango raggiunto (le risposte dell'evento appena giocato restano in vista). */
    const portaA = (rango: number, forza?: boolean) => void salva(c.chiave, forza ? { rango, forza: true } : { rango }).then((agg) => {
      if (!agg) return;
      setAppenaSalito((s) => {
        const n = { ...s };
        if (agg.rango > c.rango) n[c.chiave] = agg.rango; else delete n[c.chiave];
        return n;
      });
    });
    return {
      cambiaRango: (rango) => portaA(rango),
      forzaRango: (rango) => portaA(rango, true),
      conferma: (rango, indice, confermato) => void conferma(c, rango, indice, confermato),
      correggi: (rango) => setVista({ chiave: c.chiave, tipo: 'scheda', search: `?requisiti=${rango}` }),
      apriScheda: () => setVista({ chiave: c.chiave, tipo: 'scheda', search: '' }),
      nota: (n) => void salva(c.chiave, { noteRisposta: n, bonusArcano: bonus, invito }),
      regala: () => setRegaloPer(c.chiave),
      uscita: () => void salva(c.chiave, { uscita: true, bonusArcano: bonus, invito }),
      annullaUltimo: () => void annullaUltimo(c),
      sbloccato: () => void salva(c.chiave, { sbloccato: !c.sbloccato }),
      apriNote: () => { setModifica(c); setNote(c.note); },
      bonus: (valore) => setBonusForzato((b) => ({ ...b, [c.chiave]: valore })),
    };
  };

  // ---- Elenco: gruppi, ordine e Confidente scelto ----
  const tutti = useMemo(() => dati ?? [], [dati]);
  const oggi = (chiave: string) => sugg.evidenziato('confidenti', chiave);
  /** Dentro gli attivi: prima i suggeriti di oggi, poi i «Pronti» (soglia raggiunta e non bloccati, lo stesso criterio della scheda),
   *  poi gli altri nell'ordine di prima (ordinamento stabile). */
  const attivi = tutti
    .filter((c) => gruppoDi(c) === 'attivi')
    .map((c, indice) => ({ c, indice, peso: oggi(c.chiave) ? 0 : sogliaRaggiunta(c) && !c.bloccato ? 1 : 2 }))
    .sort((a, b) => a.peso - b.peso || a.indice - b.indice)
    .map((x) => x.c);
  const elencoDi = (gruppo: ChiaveGruppo) => (gruppo === 'attivi' ? attivi : tutti.filter((c) => gruppoDi(c) === 'bloccati'));

  // Il Confidente aperto nel cassetto sta nell'indirizzo (`?confidente=`): il cassetto si apre con una voce di cronologia nuova,
  // così Indietro lo chiude; un indirizzo condiviso lo apre già aperto
  // (in `soloCassetto` il Confidente lo dice chi apre il cassetto, non l'indirizzo)
  const richiesto = soloCassetto ? soloCassetto.chiave : params.get('confidente');
  const trovato = richiesto ? tutti.find((c) => c.chiave === richiesto) ?? null : null;
  const cassettoAperto = trovato !== null;
  const aperturaConCronologia = useRef(false);
  // Alla chiusura del cassetto (✕, Esc o Indietro) si riparte dal Level up: la vista si azzera, le finestre aperte dal cassetto (note,
  // «Regala») si chiudono con lui, e se si era nella Scheda completa si rileggono i Confidenti (lì si possono consegnare regali; la
  // conferma dei requisiti, nel cassetto, è in sola lettura). La rilettura non smonta niente: i dati restano mentre arrivano quelli nuovi
  const vistaCorrente = useRef(vista);
  useEffect(() => { vistaCorrente.current = vista; }, [vista]);
  const eraAperto = useRef(cassettoAperto);
  useEffect(() => {
    if (cassettoAperto) { eraAperto.current = true; return; }
    aperturaConCronologia.current = false;
    if (!eraAperto.current) return;
    eraAperto.current = false;
    if (vistaCorrente.current?.tipo === 'scheda') void ricarica();
    setVista(null);
    setModifica(null);
    setRegaloPer(null);
  }, [cassettoAperto, ricarica]);
  const scegli = (chiave: string) => {
    const p = new URLSearchParams(params);
    p.set('confidente', chiave);
    aperturaConCronologia.current = true;
    setParams(p);
  };
  /** Chiude il cassetto: se l'ha aperto un tocco di questa pagina si torna indietro di una voce, altrimenti (indirizzo condiviso) si toglie il parametro. */
  const chiudiFoglio = () => {
    if (soloCassetto) { soloCassetto.onChiudi(); return; }
    if (aperturaConCronologia.current) {
      aperturaConCronologia.current = false;
      navigate(-1);
      return;
    }
    const p = new URLSearchParams(params);
    p.delete('confidente');
    setParams(p, { replace: true });
  };

  const alternaGruppo = (gruppo: ChiaveGruppo) => setGruppiAperti((s) => {
    const nuovo = { ...s, [gruppo]: !s[gruppo] };
    salvaGruppiAperti(nuovo);
    return nuovo;
  });

  /** I moltiplicatori della partita (esami, invito SMS): valgono per tutti i Confidenti, si scelgono nel dettaglio accanto al bonus
   * dell'arcano, dove si registrano i punti; la spiegazione sta nel suggerimento di ciascuno. */
  const moltiplicatori = (
    <>
      <PulsanteVisivo compatto attivo={piazzamentoEsame?.piazzamento === 'primi-10'} disabled={!piazzamentoEsame} icona={<IconaAzione chiave="esame-top10" dimensione={24} />} titolo="Esami top 10" dettaglio="×1,2 · scuola" onClick={() => scegliPiazzamento('primi-10')} aria-label="Esami top 10 ×1,2" title={piazzamentoEsame ? `Fra i primi dieci agli ultimi esami (${piazzamentoEsame.nome}): punti ×1,2 per Ryuji, Ann, Makoto, Haru, Sojiro, Kawakami e Kasumi fino all'esame successivo; vale per tutti i punti registrati` : 'I risultati del primo esame non sono ancora usciti'} />
      <PulsanteVisivo compatto attivo={piazzamentoEsame?.piazzamento === 'primo'} disabled={!piazzamentoEsame} icona={<IconaAzione chiave="esame-primo" dimensione={24} />} titolo="Esami 1º" dettaglio="×1,5 · scuola" onClick={() => scegliPiazzamento('primo')} aria-label="Esami 1º ×1,5" title={piazzamentoEsame ? `Primo del corso agli ultimi esami (${piazzamentoEsame.nome}): punti ×1,5 per Ryuji, Ann, Makoto, Haru, Sojiro, Kawakami e Kasumi fino all'esame successivo; vale per tutti i punti registrati` : 'I risultati del primo esame non sono ancora usciti'} />
      <PulsanteVisivo compatto attivo={invito} icona={<IconaAzione chiave="sms" dimensione={24} />} titolo="Invito SMS" dettaglio="×1,2 · uscita" onClick={() => setInvito((v) => !v)} aria-label="Invito SMS ×1,2" title="Invito accettato subito via SMS la sera prima: tutti i punti guadagnati durante l'uscita valgono ×1,2 (vale per tutti i Confidenti finché non lo spegni)" />
    </>
  );

  /** Il dettaglio del Confidente `c` (nel cassetto). */
  const dettaglioDi = (c: ConfidentePartitaDto) => (
    <DettaglioConfidente key={c.chiave} c={c} occupato={occupato === c.chiave} bonus={bonusArcanoDi(c)} ultimo={cimaDi(c.chiave)}
      oggi={oggi(c.chiave)} motivoOggi={sugg.motivo('confidenti', c.chiave)} moltiplicatori={moltiplicatori}
      appenaSalito={appenaSalito[c.chiave] === c.rango}
      anteprima={(cosa) => anteprima(c, cosa, bonusArcanoDi(c))} azioni={azioniDi(c)} />
  );

  /** Il cassetto del Confidente aperto: le due viste (Level up, Scheda completa) e il loro contenuto. Tornando al Level up dalla scheda
   * si rileggono i Confidenti della partita (dalla scheda si possono consegnare regali; i requisiti sono in sola lettura). */
  const contenutoCassetto = (c: ConfidentePartitaDto) => {
    const v = vista?.chiave === c.chiave ? vista : { chiave: c.chiave, tipo: 'levelup' as const, search: '' };
    const vai = (tipo: 'levelup' | 'scheda') => {
      if (tipo === v.tipo) return;
      if (tipo === 'levelup') { setVista(null); void ricarica(); } else setVista({ chiave: c.chiave, tipo, search: '' });
    };
    return (
      <>
        <div className="flex gap-1.5" role="tablist" aria-label={`Viste di ${c.nome}`}>
          <button type="button" role="tab" id="vista-confidente-levelup" aria-controls="pannello-confidente" aria-selected={v.tipo === 'levelup'} className={`chip touch ${v.tipo === 'levelup' ? 'chip--attivo' : ''}`} onClick={() => vai('levelup')}>Level up</button>
          <button type="button" role="tab" id="vista-confidente-scheda" aria-controls="pannello-confidente" aria-selected={v.tipo === 'scheda'} className={`chip touch ${v.tipo === 'scheda' ? 'chip--attivo' : ''}`} onClick={() => vai('scheda')}>Scheda completa</button>
        </div>
        <div id="pannello-confidente" role="tabpanel" aria-labelledby={v.tipo === 'levelup' ? 'vista-confidente-levelup' : 'vista-confidente-scheda'} className="flex flex-col gap-4">
          {v.tipo === 'levelup' ? dettaglioDi(c) : <SchedaNelCassetto key={`${c.chiave}${v.search}`} chiave={c.chiave} searchIniziale={v.search} onLevelUp={() => vai('levelup')} />}
        </div>
      </>
    );
  };

  const contenuto = (
    <>
      {/* una pagina sola che scorre: i gruppi richiudibili con le schede in griglia; il dettaglio si apre nel cassetto.
          Nel cassetto da solo (diario) l'elenco non c'è */}
      {!soloCassetto && <div className="flex flex-col gap-3">
          {GRUPPI.map(({ chiave: gruppo, titolo, descrizione }) => {
            const elenco = elencoDi(gruppo);
            // Il gruppo degli attivi resta visibile anche vuoto (a inizio partita lo e): senza spiegazione sembrerebbe che i Confidenti manchino.
            if (elenco.length === 0 && (gruppo !== 'attivi' || tutti.length === 0)) return null;
            const aperto = gruppiAperti[gruppo];
            const idElenco = `gruppo-confidenti-${gruppo}`;
            return (
              <section key={gruppo} className="flex flex-col gap-1.5" aria-label={titolo}>
                <h3 className="m-0">
                  <button type="button" className="gruppo-confidenti__testata touch" aria-expanded={aperto} aria-controls={idElenco} onClick={() => alternaGruppo(gruppo)}>
                    <IconChevronRight size={18} className={`shrink-0 transition-transform ${aperto ? 'rotate-90' : ''}`} />
                    <span className="font-display testo-20 uppercase whitespace-nowrap">{titolo}</span>
                    <span className="chip tabular-nums" aria-label={`${elenco.length} Confidenti`}>{elenco.length}</span>
                    <span className="hidden md:inline ml-auto testo-12 text-text-muted">{descrizione}</span>
                  </button>
                </h3>
                <div id={idElenco} hidden={!aperto}>
                  {elenco.length === 0
                    ? <p className="m-0 testo-13 text-text-secondary">Nessun Confidente è ancora avviabile: compariranno qui appena i requisiti del primo rango saranno soddisfatti (giorno di gioco, Dote sociale, Persona dell'arcano, Palazzo o richiesta).</p>
                    : (
                      <ul className="griglia-confidenti">
                        {elenco.map((c) => (
                          <RigaConfidente key={c.chiave} c={c} selezionata={trovato?.chiave === c.chiave} oggi={oggi(c.chiave)} motivoOggi={sugg.motivo('confidenti', c.chiave)} onScegli={() => scegli(c.chiave)} />
                        ))}
                      </ul>
                    )}
                </div>
              </section>
            );
          })}
      </div>}
      {/* il dettaglio: cassetto da destra alto quanto lo schermo (foglio dal basso sul telefono); mentre è aperto scorre solo lui.
          Da solo si apre subito e, finché i Confidenti arrivano, dice che sta caricando (o l'errore, con Riprova) */}
      {/* la ✕ chiude sempre; Esc solo se il cassetto è la finestra più in alto (lo decide `Modal`) */}
      <Modal titolo="Gestione del Confidente" aperta={soloCassetto ? true : cassettoAperto} onChiudi={chiudiFoglio} cassetto>
        {trovato ? contenutoCassetto(trovato) : soloCassetto && <PageState isLoading={caricamento && !dati} error={errore} onRetry={() => void ricarica()}>
          <p className="m-0 testo-13 text-text-muted">Questo Confidente non è nella partita attiva.</p>
        </PageState>}
      </Modal>
      {regaloPer && (() => {
        const c = tutti.find((x) => x.chiave === regaloPer);
        if (!c) return null;
        return <SceltaRegalo key={c.chiave} partita={partitaId} confidente={c.chiave} nomeConfidente={c.nome} stato={c} bonusArcano={bonusArcanoDi(c)} invito={invito}
          onChiudi={() => setRegaloPer(null)}
          onFatto={(esito) => {
            setRegaloPer(null);
            imposta((correnti) => correnti.map((x) => (x.chiave === c.chiave ? esito.confidente : x)));
            // «Annulla ultimo» annulla proprio questa consegna (ondata 5: lo stesso oggetto si può ridare, quindi la consegna si indica per id),
            // poi resta disponibile l'azione di prima; se il rango è cambiato i punti di prima non valgono più e la pila riparte
            const consegna = esito.consegna;
            setUltimo((u) => ({ ...u, [c.chiave]: esito.confidente.rango !== c.rango || !consegna ? [] : [...(u[c.chiave] ?? []), { punti: esito.punti, regalo: consegna.catalogo, consegna: consegna.id }] }));
            notifica('success', `${esitoDelRegalo(consegna?.modo, c.nome)}${esito.punti > 0 ? `: +${formattaPunti(esito.punti)} punti` : ''}${esito.acquistato ? ' · segnato anche comprato' : ''}.`);
            if (esito.confidente.puntiNecessari !== null && esito.confidente.puntiNecessari > 0 && esito.confidente.mancanti === 0 && (c.mancanti ?? 1) > 0) {
              notifica('success', `${c.nome}: punti sufficienti per il rango ${esito.confidente.rango + 1}! Passa del tempo insieme per salire di rango.`);
            }
          }} />;
      })()}
      <Modal
        titolo={modifica ? `Note — ${modifica.nome}` : 'Note'}
        aperta={modifica !== null}
        onChiudi={() => setModifica(null)}
        azioni={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModifica(null)}>Annulla</button>
            <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo="Salva" disabled={occupato !== null} onClick={() => void salvaNote()} />
          </>
        }
      >
        <textarea className="form-input min-h-[140px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Promemoria: prossimi eventi, regali graditi, risposte migliori…" />
      </Modal>
    </>
  );
  // da solo, niente stato di pagina: caricamento ed errore stanno dentro il cassetto
  // lo spinner di pagina solo al primo caricamento: una rilettura (esami, ritorno dalla Scheda completa) non smonta elenco e cassetto
  return soloCassetto ? contenuto : <PageState isLoading={caricamento && !dati} error={errore} onRetry={() => void ricarica()}>{contenuto}</PageState>;
}
