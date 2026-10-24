// ============================================================
// ConfidentiPartita — i 23 Confidenti della partita: elenco compatto a righe + pannello di dettaglio con tutti i comandi
// ============================================================
//
// Disposizione (approvata dall'utente): due gruppi richiudibili («Attivi e sbloccabili», «Non ancora disponibili»), una riga di
// sintesi per Confidente (`RigaConfidente`: ritratto, nome, arcano, rango e UN solo stato) e il dettaglio del Confidente scelto
// (`DettaglioConfidente`: rango ±, requisiti, note ♪ con le risposte migliori subito sotto, regalo, uscita, note…). Da 1024 px il
// dettaglio sta in un pannello fisso a destra dell'elenco, con scorrimento interno; sotto i 1024 px (tablet verticale, telefono)
// c'è solo l'elenco e il tocco su una riga apre il dettaglio in un foglio (`Modal`: dal basso sul telefono). Il Confidente scelto sta
// nell'indirizzo (`?confidente=<chiave>`, accanto a `?scheda=`): Indietro chiude il foglio e i collegamenti puntano a un Confidente.
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
import { useMedia } from '../../hooks/useMedia';
import { notifica } from '../../stores/notificationStore';
import { PageState } from '../shared/PageState';
import { Modal } from '../shared/Modal';
import { TestoRipiegabile } from '../shared/TestoRipiegabile';
import { IconChevronRight } from '../shared/icons';
import type { ConfidentePartitaDto, ModificaConfidente } from '../../types';
import { anteprimaPunti, formattaPunti } from '../../utils/punti';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { useSuggerimenti } from '../../stores/suggerimentiStore';
import { avvisaDotiDaSegnare } from '../../utils/dotiDaSegnare';
import { SceltaRegalo } from '../catalogo/SceltaRegalo';
import { RigaConfidente } from './RigaConfidente';
import { sogliaRaggiunta } from './regoleConfidente';
import { DettaglioConfidente, type AzioniConfidente } from './DettaglioConfidente';
import { svuotaDettagliConfidenti } from './useDettaglioConfidente';

interface Props {
  partitaId: number;
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

/** Il pannello a destra compare da 1024 px (sidebar dell'app visibile); sotto, il dettaglio è un foglio. */
const PANNELLO_AFFIANCATO = '(min-width: 1024px)';

/** I Confidenti della partita in due gruppi richiudibili, una riga per Confidente e il dettaglio del Confidente scelto: rango con +/−
 * (e «Segna comunque» se bloccato dai requisiti), semafori del rango successivo, punti con note della risposta e risposte migliori,
 * regalo e uscita calcolati coi moltiplicatori scelti in testa (esami, invito SMS) e col bonus arcano, «Annulla ultimo», sblocco e
 * note in una finestra. Ogni aggiornamento sostituisce il solo Confidente toccato. */
export function ConfidentiPartita({ partitaId }: Props) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const affiancato = useMedia(PANNELLO_AFFIANCATO);
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
  const scegliPiazzamento = (p: 'primo' | 'primi-10') => {
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
  const [ultimo, setUltimo] = useState<Record<string, Array<{ punti: number; regalo?: string }>>>({});
  const cimaDi = (chiave: string) => ultimo[chiave]?.[ultimo[chiave].length - 1];
  // Il Confidente a cui si sta regalando (finestra unica «Regala»).
  const [regaloPer, setRegaloPer] = useState<string | null>(null);

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
      const esito = await annullaRegaloOggetto(partitaId, c.chiave, cima.regalo);
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
    return {
      cambiaRango: (rango) => void salva(c.chiave, { rango }),
      forzaRango: (rango) => void salva(c.chiave, { rango, forza: true }),
      conferma: (rango, indice, confermato) => void conferma(c, rango, indice, confermato),
      correggi: (rango) => navigate(`/confidenti/${encodeURIComponent(c.chiave)}?requisiti=${rango}`),
      nota: (n) => void salva(c.chiave, { noteRisposta: n, bonusArcano: bonus, invito }),
      regala: () => setRegaloPer(c.chiave),
      regalo: () => void salva(c.chiave, { regalo: true, bonusArcano: bonus, invito }),
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
  /** Dentro gli attivi: prima i suggeriti di oggi, poi chi ha la soglia raggiunta, poi gli altri nell'ordine di prima (ordinamento stabile). */
  const attivi = tutti
    .filter((c) => gruppoDi(c) === 'attivi')
    .map((c, indice) => ({ c, indice, peso: oggi(c.chiave) ? 0 : sogliaRaggiunta(c) ? 1 : 2 }))
    .sort((a, b) => a.peso - b.peso || a.indice - b.indice)
    .map((x) => x.c);
  const elencoDi = (gruppo: ChiaveGruppo) => (gruppo === 'attivi' ? attivi : tutti.filter((c) => gruppoDi(c) === 'bloccati'));

  // Il Confidente scelto sta nell'indirizzo; affiancato, senza scelta vale il primo degli attivi
  const richiesto = params.get('confidente');
  const trovato = richiesto ? tutti.find((c) => c.chiave === richiesto) ?? null : null;
  const selezionato = trovato ?? (affiancato ? attivi[0] ?? null : null);
  const foglioAperto = !affiancato && trovato !== null;
  // Il foglio si apre con una voce di cronologia nuova (Indietro lo chiude); il pannello affiancato sostituisce la voce (niente cronologia a ogni tocco)
  const aperturaConCronologia = useRef(false);
  useEffect(() => {
    if (!foglioAperto) aperturaConCronologia.current = false;
  }, [foglioAperto]);
  const scegli = (chiave: string) => {
    const p = new URLSearchParams(params);
    p.set('confidente', chiave);
    if (!affiancato) aperturaConCronologia.current = true;
    setParams(p, { replace: affiancato });
  };
  /** Chiude il foglio: se l'ha aperto un tocco di questa pagina si torna indietro di una voce, altrimenti (indirizzo condiviso) si toglie il parametro. */
  const chiudiFoglio = () => {
    if (aperturaConCronologia.current) {
      aperturaConCronologia.current = false;
      navigate(-1);
      return;
    }
    const p = new URLSearchParams(params);
    p.delete('confidente');
    setParams(p, { replace: true });
  };
  /** Esc dentro il foglio chiude solo la finestra più in alto: se sopra al foglio c'è un'altra finestra (note, «Regala», ingrandimento) il foglio resta. */
  const chiudiFoglioSeSolo = () => {
    if (document.querySelectorAll('[role="dialog"]').length > 1) return;
    chiudiFoglio();
  };

  const alternaGruppo = (gruppo: ChiaveGruppo) => setGruppiAperti((s) => {
    const nuovo = { ...s, [gruppo]: !s[gruppo] };
    salvaGruppiAperti(nuovo);
    return nuovo;
  });

  /** Il dettaglio del Confidente `c` (nel pannello o nel foglio). */
  const dettaglioDi = (c: ConfidentePartitaDto) => (
    <DettaglioConfidente key={c.chiave} c={c} occupato={occupato === c.chiave} bonus={bonusArcanoDi(c)} ultimo={cimaDi(c.chiave)}
      oggi={oggi(c.chiave)} motivoOggi={sugg.motivo('confidenti', c.chiave)}
      anteprima={(cosa) => anteprima(c, cosa, bonusArcanoDi(c))} azioni={azioniDi(c)} />
  );

  return (
    <PageState isLoading={caricamento} error={errore} onRetry={() => void ricarica()}>
      <div className="flex flex-col gap-1.5 mb-3" role="group" aria-label="Moltiplicatori dei punti">
        <span className="text-[11px] font-semibold uppercase tracking-[.06em] text-text-muted">Moltiplicatori · valgono per tutti i punti registrati</span>
        <div className="flex flex-wrap gap-2">
          <PulsanteVisivo compatto attivo={piazzamentoEsame?.piazzamento === 'primi-10'} disabled={!piazzamentoEsame} icona={<IconaAzione chiave="esame-top10" dimensione={32} />} titolo="Esami top 10" dettaglio="×1,2" onClick={() => scegliPiazzamento('primi-10')} aria-label="Esami top 10 ×1,2" title={piazzamentoEsame ? `Fra i primi dieci agli ultimi esami (${piazzamentoEsame.nome}): punti ×1,2 per Ryuji, Ann, Makoto, Haru, Sojiro, Kawakami e Kasumi fino all'esame successivo` : 'I risultati del primo esame non sono ancora usciti'} />
          <PulsanteVisivo compatto attivo={piazzamentoEsame?.piazzamento === 'primo'} disabled={!piazzamentoEsame} icona={<IconaAzione chiave="esame-primo" dimensione={32} />} titolo="Esami 1º" dettaglio="×1,5" onClick={() => scegliPiazzamento('primo')} aria-label="Esami 1º ×1,5" title={piazzamentoEsame ? `Primo del corso agli ultimi esami (${piazzamentoEsame.nome}): punti ×1,5 per Ryuji, Ann, Makoto, Haru, Sojiro, Kawakami e Kasumi fino all'esame successivo` : 'I risultati del primo esame non sono ancora usciti'} />
          <PulsanteVisivo compatto attivo={invito} icona={<IconaAzione chiave="sms" dimensione={32} />} titolo="Invito SMS" dettaglio="×1,2" onClick={() => setInvito((v) => !v)} aria-label="Invito SMS ×1,2" title="Invito accettato subito via SMS la sera prima: tutti i punti guadagnati durante l'uscita valgono ×1,2" />
        </div>
        <TestoRipiegabile massimo={70} className="text-[12px] text-text-muted"
          testo="Le note mostrate in gioco valgono 5, 10 o 15 punti; il bonus della Persona dello stesso arcano (×1,5) viene proposto in base alla scorta della partita e si può forzare su ogni Confidente. Gli esami valgono solo per Ryuji, Ann, Makoto, Haru, Sojiro, Kawakami e Kasumi." />
      </div>
      <div className="confidenti-layout">
        <div className="flex flex-col gap-3 min-w-0">
          {GRUPPI.map(({ chiave: gruppo, titolo, descrizione }) => {
            const elenco = elencoDi(gruppo);
            // Il gruppo degli attivi resta visibile anche vuoto (a inizio partita lo e): senza spiegazione sembrerebbe che i Confidenti manchino.
            if (elenco.length === 0 && (gruppo !== 'attivi' || tutti.length === 0)) return null;
            const aperto = gruppiAperti[gruppo];
            const idElenco = `gruppo-confidenti-${gruppo}`;
            return (
              <section key={gruppo} className="flex flex-col gap-1.5" aria-label={titolo}>
                <h3 className="m-0">
                  {/* la descrizione sta nel suggerimento: accanto al titolo, nella colonna dell'elenco (400 px), lo mandava a capo */}
                  <button type="button" className="gruppo-confidenti__testata touch" aria-expanded={aperto} aria-controls={idElenco} title={`${titolo}: ${descrizione}`} onClick={() => alternaGruppo(gruppo)}>
                    <IconChevronRight size={18} className={`shrink-0 transition-transform ${aperto ? 'rotate-90' : ''}`} />
                    <span className="font-display text-[19px] uppercase whitespace-nowrap">{titolo}</span>
                    <span className="chip ml-auto tabular-nums" aria-label={`${elenco.length} Confidenti`}>{elenco.length}</span>
                  </button>
                </h3>
                <div id={idElenco} hidden={!aperto}>
                  {elenco.length === 0
                    ? <p className="m-0 text-[13px] text-text-secondary">Nessun Confidente è ancora avviabile: compariranno qui appena i requisiti del primo rango saranno soddisfatti (giorno di gioco, Dote sociale, Persona dell'arcano, Palazzo o richiesta).</p>
                    : (
                      <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                        {elenco.map((c) => (
                          <RigaConfidente key={c.chiave} c={c} selezionata={selezionato?.chiave === c.chiave} oggi={oggi(c.chiave)} motivoOggi={sugg.motivo('confidenti', c.chiave)} onScegli={() => scegli(c.chiave)} />
                        ))}
                      </ul>
                    )}
                </div>
              </section>
            );
          })}
        </div>
        {affiancato && (
          <aside className="confidenti-dettaglio area-scorrevole" aria-label="Dettaglio del Confidente">
            {selezionato ? dettaglioDi(selezionato) : <p className="m-0 text-[13px] text-text-muted">Scegli un Confidente dall'elenco per vederne i comandi.</p>}
          </aside>
        )}
      </div>
      {/* sotto i 1024 px il dettaglio è un foglio: dal basso sul telefono, finestra larga sul tablet */}
      <Modal titolo={trovato ? trovato.nome : 'Confidente'} aperta={foglioAperto} onChiudi={chiudiFoglioSeSolo} larga>
        {trovato && dettaglioDi(trovato)}
      </Modal>
      {regaloPer && (() => {
        const c = tutti.find((x) => x.chiave === regaloPer);
        if (!c) return null;
        return <SceltaRegalo key={c.chiave} partita={partitaId} confidente={c.chiave} nomeConfidente={c.nome} stato={c} bonusArcano={bonusArcanoDi(c)} invito={invito}
          onChiudi={() => setRegaloPer(null)}
          onFatto={(esito) => {
            setRegaloPer(null);
            imposta((correnti) => correnti.map((x) => (x.chiave === c.chiave ? esito.confidente : x)));
            // «Annulla ultimo» annulla questo regalo con la sua consegna (l'oggetto è quello appena aggiunto ai regali fatti), poi resta
            // disponibile l'azione di prima; se il rango è cambiato i punti di prima non valgono più e la pila riparte
            const nuovoOggetto = (esito.confidente.regaliFattiCatalogo ?? []).find((k) => !(c.regaliFattiCatalogo ?? []).includes(k));
            setUltimo((u) => ({ ...u, [c.chiave]: esito.confidente.rango !== c.rango || !nuovoOggetto ? [] : [...(u[c.chiave] ?? []), { punti: esito.punti, regalo: nuovoOggetto }] }));
            notifica('success', `Regalo consegnato a ${c.nome}${esito.punti > 0 ? `: +${formattaPunti(esito.punti)} punti` : ''}${esito.acquistato ? ' · segnato anche comprato' : ''}.`);
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
            <button type="button" className="btn btn-primary" disabled={occupato !== null} onClick={() => void salvaNote()}>Salva</button>
          </>
        }
      >
        <textarea className="form-input min-h-[140px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Promemoria: prossimi eventi, regali graditi, risposte migliori…" />
      </Modal>
    </PageState>
  );
}
