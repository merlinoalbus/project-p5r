// ============================================================
// ModuloRichiesta — modificare, aggiungere ed eliminare una Richiesta dei Mementos (richiesta dell'utente, 2026-10-11)
// ============================================================
//
// Scelte dell'utente: «Modifica, aggiungi, elimina», «In entrambi i posti» (pagina delle Richieste e colonna del dedalo), «Si elimina e si
// avvisa» (prima dice chi cita la Richiesta: partite, pin, condizioni, requisiti, azioni).
//
// L13 (rilievo dell'utente 2026-10-25: «Modifica: Richiesta» inguardabile; lo sblocco delle Richieste non esisteva). Cinque sezioni nella
// `FinestraModifica` (una colonna sul telefono, due da 768 px, piè fisso con Elimina / Annulla / Salva):
//  - «La Richiesta»: nome, committente, piano, Confidente collegato, note;
//  - «Sblocco e scadenza»: le condizioni di sblocco con l'editor UNICO delle condizioni (compresa «Sblocco ricevuto» da una voce del
//    Diario), la scadenza come data di gioco (`SelettoreData`) e l'eventuale proroga con le sue condizioni. Il testo della guida resta
//    visibile, e modificabile, solo dove la conversione non l'ha potuto leggere con certezza (migrazione 235);
//  - «Dove»: dedalo e area;
//  - «Il bersaglio»: l'Ombra del compendio se c'è (livello e affinità si leggono da lì e il modulo li mostra: un dato in un solo punto; i
//    campi propri restano salvati, non si azzerano, e valgono solo dove la scheda non sa), altrimenti i campi propri;
//  - «Ricompense»: oggetti del catalogo con le copie, yen ed esperienza come numeri, il testo per quel che non è nel catalogo.
// Il rango del Confidente che un tempo stava accanto al Confidente collegato è una condizione di sblocco: aprendo una Richiesta che lo ha
// ancora, entra fra le condizioni (se non c'è già) e al salvataggio la colonna si svuota.
// ============================================================

import { useState } from 'react';
import { aggiornaRichiesta, creaRichiesta, eliminaRichiesta, getCitazioniRichiesta, getConfidenti, getElenchiEffettiVoce, getOmbre, getRichieste } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { conferma } from '../../stores/confermaStore';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { normalizzaCondizioniSpillo, type RequisitoSpillo } from '../../../shared/condizioniSpillo';
import { NOME_ELEMENTO, NOME_ESITO_AFFINITA, eChiaveElemento, eCodiceAffinita } from '../../../shared/elementi';
import { Modal } from '../shared/Modal';
import { PageState } from '../shared/PageState';
import { Selettore } from '../shared/Selettore';
import { SelettoreData } from '../shared/SelettoreData';
import { CampoTesto, SezioneCampi } from '../shared/Campo';
import { ElencoElementi } from '../shared/ElencoElementi';
import { SceltaDaCatalogo } from '../shared/SceltaDaCatalogo';
import { FinestraModifica } from '../shared/FinestraModifica';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { CondizioniEditor } from './CondizioniEditor';
import { CampoQuantita } from './CampiEffettoVoce';
import { CampoElenco } from './moduli/campi';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import type { CitazioniRichiestaDto, RichiestaDto, RichiesteDto } from '../../types';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

const R = LIMITI_GUIDA.richiesta;
/** Nel selettore del dedalo e dell'area, la voce «nessuno». */
const NESSUNO = '';
const TERZO_SEMESTRE: RequisitoSpillo = { tipo: 'evento', evento: 'terzo-semestre-avviato' };

/** I campi del modulo, come si scrivono; diventano dati solo al salvataggio. */
interface Bozza {
  nome: string; committente: string; disponibileDal: string; scadenza: string; dedalo: string; areaDedalo: string; piano: string;
  bersaglio: string; formaDemoniaca: string; livello: string; debolezze: string[]; resistenze: string[]; confusione: boolean;
  ricompense: string[]; confidente: string; note: string;
  condizioni: RequisitoSpillo[]; scadenzaData: string; prorogaData: string; prorogaCondizioni: RequisitoSpillo[];
  ombra: string; yen: string; esperienza: string; oggetti: Array<{ chiave: string; quantita: number }>;
}

/** La bozza di partenza: i campi della Richiesta, o vuoti (con dedalo e area dati) per una nuova. Il rango del Confidente rimasto nella
 *  colonna di prima entra fra le condizioni di sblocco (un dato in un solo punto). */
function bozzaDa(r: RichiestaDto | null, iniziale: { dedalo?: string | null; areaDedalo?: string | null }): Bozza {
  const condizioni = normalizzaCondizioniSpillo(r?.condizioni ?? []);
  const c = r?.confidente;
  if (c?.rango && !condizioni.some((x) => x.tipo === 'confidente' && x.confidente === c.chiave)) condizioni.unshift({ tipo: 'confidente', confidente: c.chiave, rango: c.rango });
  // con un'Ombra del compendio il bersaglio della risposta mostra i valori della sua scheda: il modulo modifica i campi PROPRI salvati
  // (`daOmbra.propri`), che restano e valgono dove la scheda non sa; mai i valori letti dall'Ombra, che si correggono nella sua scheda
  const propri = r?.bersaglio.daOmbra?.propri ?? r?.bersaglio;
  return {
    nome: r?.nome ?? '', committente: r?.committente ?? '', disponibileDal: r?.disponibileDal ?? '', scadenza: r?.scadenza ?? '',
    dedalo: r ? r.areaChiave ?? NESSUNO : iniziale.dedalo ?? NESSUNO, areaDedalo: r ? r.areaDedalo ?? NESSUNO : iniziale.areaDedalo ?? NESSUNO, piano: r?.piano ?? '',
    bersaglio: r?.bersaglio.nome ?? '', formaDemoniaca: r?.bersaglio.formaDemoniaca ?? '', livello: propri?.livello ? String(propri.livello) : '',
    debolezze: [...(propri?.debolezze ?? [])], resistenze: [...(propri?.resistenze ?? [])], confusione: r?.bersaglio.vulnerabileConfusione ?? false,
    ricompense: [...(r?.ricompense ?? [])], confidente: c?.chiave ?? NESSUNO, note: r?.note ?? '',
    condizioni, scadenzaData: r?.scadenzaData ?? '', prorogaData: r?.proroga?.data ?? '', prorogaCondizioni: normalizzaCondizioniSpillo(r?.proroga?.condizioni ?? []),
    ombra: r?.ombra?.chiave ?? NESSUNO, yen: r?.yen ? String(r.yen) : '', esperienza: r?.esperienza ? String(r.esperienza) : '',
    oggetti: (r?.oggettiRicompensa ?? []).map((o) => ({ chiave: o.chiave, quantita: o.quantita ?? 1 })),
  };
}

/** Un'Ombra del compendio come la mostra il modulo: livello e affinità della sua scheda (`OmbraSchedaDto`, la stessa lettura del server). */
interface OmbraDelModulo { chiave: string; nome: string; livello: number | null; debolezze: string[]; resistenze: Array<{ elemento: string; codice: string }> }

/** Il nome di un elemento della scheda dell'Ombra («fire» → «Fuoco»), e di un'affinità non normale («Maledizione (Annulla)»). */
const nomeElemento = (k: string): string => (eChiaveElemento(k) ? NOME_ELEMENTO[k] : k);
const nomeResistenza = (x: { elemento: string; codice: string }): string => `${nomeElemento(x.elemento)} (${eCodiceAffinita(x.codice) ? NOME_ESITO_AFFINITA[x.codice] : x.codice})`;

/** Gli oggetti della ricompensa come confronto: stessi oggetti, stesse copie, stesso ordine. */
const stessiOggetti = (a: Bozza['oggetti'], b: Bozza['oggetti']): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Le voci di un elenco ripulite: senza spazi ai bordi e senza quelle vuote. */
const voci = (elenco: string[]): string[] => elenco.map((x) => x.trim()).filter((x) => x.length > 0);

/** Un intero fra `min` e `max`, o null se vuoto; un valore fuori misura è un errore detto con il nome del campo. */
function intero(testo: string, min: number, max: number, campo: string): number | null {
  const t = testo.trim().replace(/\./g, '');
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${campo}: un numero intero da ${min} a ${max.toLocaleString('it-IT')} (vuoto = nessuno).`);
  return n;
}

/** Il testo della domanda di conferma: dice chi cita la Richiesta e che cosa succede a ciascuno. */
function testoEliminazione(c: CitazioniRichiestaDto): string {
  const righe = [c.partite === 0 ? 'Nessuna partita ne ha segnato lo stato.' : `Lo stato segnato in ${c.partite === 1 ? '1 partita' : `${c.partite} partite`} se ne va con lei.`];
  if (c.pin.length > 0) righe.push(`Perdono il collegamento ${c.pin.length === 1 ? 'il pin' : `${c.pin.length} pin`}: ${c.pin.join(', ')} (restano sulla mappa).`);
  if (c.azioni > 0) righe.push(`Perdono il collegamento ${c.azioni === 1 ? '1 azione' : `${c.azioni} azioni`} della giornata (restano, col loro testo).`);
  if (c.condizioni.length > 0) righe.push(`Restano, da correggere, le condizioni di: ${c.condizioni.join('; ')}.`);
  if (c.requisiti.length > 0) righe.push(`Restano, da correggere, i requisiti dei Confidenti: ${c.requisiti.join('; ')}.`);
  // L13: gli effetti delle voci del Diario che la citano (completata, sblocco) restano; gli sblocchi ricevuti nelle partite se ne vanno con lei
  if (c.effetti.length > 0) righe.push(`Restano, da correggere, gli effetti delle voci del Diario: ${c.effetti.join('; ')}.`);
  if (c.sblocchi > 0) righe.push(`Lo sblocco ricevuto in ${c.sblocchi === 1 ? '1 partita' : `${c.sblocchi} partite`} se ne va con lei (torna col ripristino dal cestino).`);
  if (c.pin.length === 0 && c.azioni === 0 && c.condizioni.length === 0 && c.requisiti.length === 0 && c.effetti.length === 0) righe.push('Nessun pin, condizione, requisito, effetto o azione la cita.');
  return righe.join(' ');
}

interface Props {
  /** La Richiesta da correggere, o null per aggiungerne una. */
  chiave: string | null;
  /** Per una nuova: il dedalo e l'area in cui nasce (dalla colonna del dedalo). */
  iniziale?: { dedalo?: string | null; areaDedalo?: string | null };
  onChiudi: () => void;
  /** Salvata (creata o corretta) o eliminata: chi apre il modulo rilegge i suoi dati. */
  onCambiata: () => void | Promise<void>;
}

/** Il modulo di una Richiesta in una finestra: carica l'elenco (Richiesta e collocazioni), i Confidenti, le Ombre e gli oggetti, poi i campi. */
// L12 (passo 8): nel rilascio (sola lettura) il modulo non esiste; la condizione è costante di build, `ModuloRichiestaReale` esce dal bundle
export const ModuloRichiesta: StrumentoDiModifica<typeof ModuloRichiestaReale> = IN_RILASCIO ? NienteInRilascio : ModuloRichiestaReale;
function ModuloRichiestaReale({ chiave, iniziale = {}, onChiudi, onCambiata }: Props) {
  const dati = useCarica(() => getRichieste(), []);
  const altri = useCarica(() => Promise.all([getConfidenti(), getOmbre(), getElenchiEffettiVoce()]), []);
  const richiesta = chiave ? dati.dati?.richieste.find((r) => r.chiave === chiave) ?? null : null;
  const titolo = chiave ? `Modifica: ${richiesta?.nome ?? 'Richiesta'}` : 'Aggiungi una Richiesta';
  // finché i dati non ci sono (o sono in errore, o la Richiesta non esiste più) la finestra è un guscio semplice con il suo stato
  if (!dati.dati || !altri.dati || (chiave && !richiesta)) {
    return (
      <Modal titolo={titolo} aperta onChiudi={onChiudi} larga>
        <PageState isLoading={(dati.caricamento && !dati.dati) || (altri.caricamento && !altri.dati)} error={dati.errore ?? altri.errore} onRetry={() => { void dati.ricarica(); void altri.ricarica(); }}>
          {dati.dati && altri.dati && <p className="m-0 testo-13 text-text-muted" role="status">Questa Richiesta non c’è più.</p>}
        </PageState>
      </Modal>
    );
  }
  const [confidenti, ombre, elenchi] = altri.dati;
  return (
    <Campi key={chiave ?? 'nuova'} titolo={titolo} richiesta={richiesta} iniziale={iniziale} collocazioni={dati.dati.collocazioni}
      confidenti={confidenti.map((c) => ({ chiave: c.chiave, nome: c.nome, dettaglio: c.arcanaNome }))}
      ombre={ombre.map((o) => ({ chiave: o.chiave, nome: o.nome, livello: o.livello, debolezze: o.debolezze, resistenze: o.resistenze }))}
      oggetti={elenchi.oggetti ?? []} onChiudi={onChiudi} onCambiata={onCambiata} />
  );
}

/** La finestra con le sue cinque sezioni di campi e il piè fisso; per una Richiesta che c'è, «Elimina» con l'avviso di chi la cita. */
function Campi({ titolo, richiesta, iniziale, collocazioni, confidenti, ombre, oggetti, onChiudi, onCambiata }: {
  titolo: string; richiesta: RichiestaDto | null; iniziale: { dedalo?: string | null; areaDedalo?: string | null }; collocazioni: RichiesteDto['collocazioni'];
  confidenti: Array<{ chiave: string; nome: string; dettaglio: string }>; ombre: OmbraDelModulo[];
  oggetti: Array<{ chiave: string; nome: string; categoria: string }>; onChiudi: () => void; onCambiata: () => void | Promise<void>;
}) {
  // la bozza di partenza è anche il metro per capire se c'è qualcosa di non salvato (per «Aggiorna» e la chiusura della scheda del browser)
  const [partenza] = useState<Bozza>(() => bozzaDa(richiesta, iniziale));
  const [b, setB] = useState<Bozza>(partenza);
  const sporca = JSON.stringify(b) !== JSON.stringify(partenza);
  useBozzaSporca('modulo-richiesta', richiesta ? `modifica della Richiesta «${richiesta.nome}»` : 'nuova Richiesta', sporca);
  const [occupato, setOccupato] = useState(false);
  const [nuovoOggetto, setNuovoOggetto] = useState('');
  /** Cambia alcuni campi della bozza. */
  const cambia = (patch: Partial<Bozza>) => setB((x) => ({ ...x, ...patch }));
  const aree = collocazioni.find((d) => d.chiave === b.dedalo)?.aree ?? [];
  const ombra = ombre.find((o) => o.chiave === b.ombra) ?? null;
  const nomeOggetto = (k: string) => oggetti.find((o) => o.chiave === k)?.nome ?? k;

  /** I dati da mandare, controllati: nome e bersaglio obbligatori, numeri nei loro limiti, la proroga solo con una scadenza. */
  const datiDaMandare = () => {
    if (!b.nome.trim()) throw new Error('Il nome della Richiesta è obbligatorio.');
    if (!b.bersaglio.trim() && !ombra) throw new Error('Il nome del bersaglio è obbligatorio (o scegli l’Ombra del compendio).');
    if (b.prorogaData && !b.scadenzaData) throw new Error('La proroga vale solo con una scadenza: scegli prima la scadenza.');
    return {
      nome: b.nome.trim(), committente: b.committente.trim(), disponibileDal: b.disponibileDal.trim(), scadenza: b.scadenza.trim(),
      dedalo: b.dedalo || null, areaDedalo: b.dedalo && b.areaDedalo ? b.areaDedalo : null, piano: b.piano.trim(),
      // i campi propri si mandano sempre come sono: con l'Ombra non si azzerano (valgono dove la sua scheda non sa, e tornano se la si toglie)
      bersaglio: { nome: (b.bersaglio.trim() || ombra?.nome) ?? '', formaDemoniaca: b.formaDemoniaca.trim(), livello: intero(b.livello, 1, 99, 'Livello del bersaglio'),
        debolezze: voci(b.debolezze), resistenze: voci(b.resistenze), vulnerabileConfusione: b.confusione },
      ricompense: voci(b.ricompense), confidente: b.confidente || null, confidenteRango: null, note: b.note.trim(),
      condizioni: b.condizioni, scadenzaData: b.scadenzaData || null,
      proroga: b.prorogaData ? { data: b.prorogaData, condizioni: b.prorogaCondizioni } : null,
      ombra: b.ombra || null, yen: intero(b.yen, 1, 9_999_999, 'Yen'), esperienza: intero(b.esperienza, 1, 999_999, 'Esperienza (PE)'),
      // gli oggetti solo se cambiati: una Richiesta salvata per altro non tocca le sue ricompense (né le loro note)
      ...(stessiOggetti(b.oggetti, partenza.oggetti) ? {} : { oggetti: b.oggetti }),
    };
  };
  /** Salva (crea o corregge): a buon fine notifica, avvisa chi ha aperto il modulo e lo chiude; un errore resta in notifica. */
  const salva = async () => {
    setOccupato(true);
    try {
      const d = datiDaMandare();
      const r = richiesta ? await aggiornaRichiesta(richiesta.chiave, d) : await creaRichiesta(d);
      notifica('success', richiesta ? `Richiesta «${r.nome}» salvata.` : `Richiesta «${r.nome}» aggiunta.`);
      await onCambiata();
      onChiudi();
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Richiesta non salvata.'); }
    finally { setOccupato(false); }
  };
  /** Elimina: legge chi cita la Richiesta, lo mostra nella domanda di conferma (in primo piano, mai fuori vista) e solo dopo il «sì» elimina. */
  const elimina = async () => {
    if (!richiesta) return;
    setOccupato(true);
    try {
      const citazioni = await getCitazioniRichiesta(richiesta.chiave);
      if (!(await conferma({ titolo: `Eliminare «${richiesta.nome}» per tutte le partite?`, testo: testoEliminazione(citazioni), etichetta: 'Elimina' }))) return;
      await eliminaRichiesta(richiesta.chiave);
      notifica('success', `Richiesta «${richiesta.nome}» eliminata.`);
      await onCambiata();
      onChiudi();
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Eliminazione non riuscita.'); }
    finally { setOccupato(false); }
  };

  return (
    <FinestraModifica titolo={titolo} nomeModulo={richiesta ? `Correggi la Richiesta «${richiesta.nome}»` : 'Nuova Richiesta'} onChiudi={onChiudi} onSalva={salva}
      titoloSalva={richiesta ? 'Salva' : 'Aggiungi'} occupato={occupato} sporca={sporca} onElimina={richiesta ? () => void elimina() : undefined}>
      <SezioneCampi titolo="La Richiesta">
        <CampoTesto etichetta="Nome" obbligatorio valore={b.nome} massimo={R.nome} onCambia={(v) => cambia({ nome: v })} disabilitato={occupato} largo />
        <CampoTesto etichetta="Committente" valore={b.committente} massimo={R.breve} onCambia={(v) => cambia({ committente: v })} disabilitato={occupato} />
        <CampoTesto etichetta="Piano" valore={b.piano} massimo={R.breve} onCambia={(v) => cambia({ piano: v })} disabilitato={occupato} />
        <div className="campo--largo">
          <SceltaDaCatalogo tipo="confidente" valore={b.confidente} confidenti={confidenti} disabilitato={occupato} vuoto="Nessun Confidente"
            onCambia={(chiave) => cambia({ confidente: chiave })} />
        </div>
        <CampoTesto etichetta="Note" tipo="lungo" valore={b.note} massimo={R.note} onCambia={(v) => cambia({ note: v })} disabilitato={occupato} />
      </SezioneCampi>
      <SezioneCampi titolo="Sblocco e scadenza">
        <div className="campo--largo flex min-w-0 flex-col gap-1">
          <span className="testo-13 text-text-secondary">Quando si sblocca: tutte le condizioni vere (data, Confidente, Palazzo, Richiesta completata, «Sblocco ricevuto» da una voce del Diario…). Senza condizioni è disponibile da subito.</span>
          <CondizioniEditor condizioni={b.condizioni} onCambia={(c) => cambia({ condizioni: c })} disabilitato={occupato} massimo={20} />
        </div>
        {b.disponibileDal && <CampoTesto etichetta="Testo della guida da convertire (non si valuta)" valore={b.disponibileDal} massimo={R.breve} aiuto="La conversione non l’ha potuto leggere con certezza: scrivi le condizioni qui sopra e poi svuota il testo." onCambia={(v) => cambia({ disponibileDal: v })} disabilitato={occupato} largo />}
        <SelettoreData etichetta="Scadenza" valore={b.scadenzaData} facoltativa onCambia={(v) => cambia({ scadenzaData: v, ...(v ? {} : { prorogaData: '' }) })} disabilitato={occupato} />
        {b.scadenzaData && <SelettoreData etichetta="Proroga fino al" valore={b.prorogaData} facoltativa onCambia={(v) => cambia({ prorogaData: v, ...(v && !b.prorogaCondizioni.length ? { prorogaCondizioni: [TERZO_SEMESTRE] } : {}) })} disabilitato={occupato} />}
        {b.scadenzaData && b.prorogaData && (
          <div className="campo--largo flex min-w-0 flex-col gap-1">
            <span className="testo-13 text-text-secondary">La proroga vale solo con queste condizioni (per esempio «Terzo semestre avviato»).</span>
            <CondizioniEditor condizioni={b.prorogaCondizioni} onCambia={(c) => cambia({ prorogaCondizioni: c })} disabilitato={occupato} massimo={20} />
          </div>
        )}
        {b.scadenza && <CampoTesto etichetta="Scadenza scritta dalla guida (non si valuta)" valore={b.scadenza} massimo={R.breve} aiuto="Per esempio il bersaglio che si sposta nel Dedalo di Da’at: la data qui sopra è quella che conta." onCambia={(v) => cambia({ scadenza: v })} disabilitato={occupato} largo />}
      </SezioneCampi>
      <SezioneCampi titolo="Dove">
        <Selettore etichettaSopra etichetta="Dedalo" valore={b.dedalo} disabilitato={occupato} opzioni={[{ chiave: NESSUNO, nome: '— nessun dedalo —' }, ...collocazioni.map((d) => ({ chiave: d.chiave, nome: d.nome }))]}
          onCambia={(v) => cambia({ dedalo: v, areaDedalo: v === b.dedalo ? b.areaDedalo : NESSUNO })} />
        {b.dedalo && <Selettore etichettaSopra etichetta="Area del dedalo" valore={b.areaDedalo} disabilitato={occupato} opzioni={[{ chiave: NESSUNO, nome: '— da collocare —', dettaglio: 'non conta' }, ...aree.map((a) => ({ chiave: a.chiave, nome: a.nome }))]}
          onCambia={(v) => cambia({ areaDedalo: v })} />}
      </SezioneCampi>
      <SezioneCampi titolo="Il bersaglio">
        <Selettore etichettaSopra etichetta="Ombra del compendio" valore={b.ombra} disabilitato={occupato} opzioni={[{ chiave: NESSUNO, nome: '— nessuna: campi propri —' }, ...ombre.map((o) => ({ chiave: o.chiave, nome: o.nome, dettaglio: o.livello ? `Liv. ${o.livello}` : undefined }))]}
          onCambia={(v) => cambia({ ombra: v })} />
        <CampoTesto etichetta="Bersaglio (nome nella Richiesta)" obbligatorio={!ombra} valore={b.bersaglio} massimo={R.nome} onCambia={(v) => cambia({ bersaglio: v })} disabilitato={occupato} />
        <CampoTesto etichetta="Forma demoniaca" valore={b.formaDemoniaca} massimo={R.voce} onCambia={(v) => cambia({ formaDemoniaca: v })} disabilitato={occupato} />
        <label className="touch campo--largo flex items-center gap-2 testo-13">
          <input type="checkbox" className="h-5 w-5" checked={b.confusione} disabled={occupato} onChange={(e) => cambia({ confusione: e.target.checked })} />Confusione utile (confondendolo dà yen)
        </label>
        {ombra && (
          // i valori letti davvero dalla scheda dell'Ombra (la stessa lettura che il server mette nel bersaglio della pagina)
          <div className="campo--largo flex min-w-0 flex-col gap-1 rounded-md bg-white/[0.04] px-2.5 py-2 testo-13" aria-label={`Dalla scheda dell’Ombra «${ombra.nome}»`}>
            <span className="testo-12 text-text-secondary">Dalla scheda dell’Ombra «{ombra.nome}» (si correggono lì, una volta sola):</span>
            <span><span className="text-text-muted">Livello:</span> {ombra.livello ?? 'non indicato nella scheda (vale il livello proprio qui sotto)'}</span>
            <span><span className="text-text-muted">Debolezze:</span> {ombra.debolezze.length ? ombra.debolezze.map(nomeElemento).join(', ') : 'nessuna nota'}</span>
            <span><span className="text-text-muted">Resistenze:</span> {ombra.resistenze.length ? ombra.resistenze.map(nomeResistenza).join(', ') : 'nessuna nota'}</span>
            {!ombra.debolezze.length && !ombra.resistenze.length && <span className="testo-12 text-text-muted">La scheda non conosce le affinità: valgono quelle proprie qui sotto.</span>}
          </div>
        )}
        {ombra ? (
          // i campi propri restano salvati: valgono solo dove la scheda dell'Ombra non sa, e tornano se si toglie l'Ombra
          <details className="campo--largo min-w-0">
            <summary className="touch testo-13 text-text-secondary">Campi propri del bersaglio (valgono solo dove la scheda dell’Ombra non sa)</summary>
            <div className="flex min-w-0 flex-col gap-2 pt-2">
              <CampoTesto etichetta="Livello proprio" tipo="numero" valore={b.livello} massimo={2} aiuto="Da 1 a 99; vuoto se non si sa." onCambia={(v) => cambia({ livello: v })} disabilitato={occupato} />
              <ElencoElementi etichetta="Debolezze proprie" valore={b.debolezze} maxVoci={R.voci} massimo={R.voce} onCambia={(v) => cambia({ debolezze: v })} disabilitato={occupato} />
              <ElencoElementi etichetta="Resistenze proprie" valore={b.resistenze} maxVoci={R.voci} massimo={R.voce} onCambia={(v) => cambia({ resistenze: v })} disabilitato={occupato} />
            </div>
          </details>
        ) : <>
          <CampoTesto etichetta="Livello" tipo="numero" valore={b.livello} massimo={2} aiuto="Da 1 a 99; vuoto se non si sa." onCambia={(v) => cambia({ livello: v })} disabilitato={occupato} />
          <ElencoElementi etichetta="Debolezze" valore={b.debolezze} maxVoci={R.voci} massimo={R.voce} onCambia={(v) => cambia({ debolezze: v })} disabilitato={occupato} />
          <ElencoElementi etichetta="Resistenze" valore={b.resistenze} maxVoci={R.voci} massimo={R.voce} onCambia={(v) => cambia({ resistenze: v })} disabilitato={occupato} />
        </>}
      </SezioneCampi>
      <SezioneCampi titolo="Ricompense">
        <div className="campo--largo flex min-w-0 flex-col gap-2">
          <span className="testo-13 text-text-secondary">Oggetti del catalogo (li dà la Richiesta completata)</span>
          {b.oggetti.length === 0 && <span className="testo-12 text-text-muted">Nessun oggetto.</span>}
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {b.oggetti.map((o, i) => (
              <li key={o.chiave} className="flex min-w-0 flex-wrap items-end gap-2">
                <span className="min-w-0 flex-1 break-words testo-14">{nomeOggetto(o.chiave)}</span>
                <CampoQuantita valore={o.quantita} onCambia={(q) => cambia({ oggetti: b.oggetti.map((x, j) => (j === i ? { ...x, quantita: q } : x)) })} />
                <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" aria-label={`Togli ${nomeOggetto(o.chiave)}`} disabled={occupato}
                  onClick={() => cambia({ oggetti: b.oggetti.filter((_, j) => j !== i) })} />
              </li>
            ))}
          </ul>
          <Selettore etichetta="Aggiungi un oggetto" vuoto="Scegli un oggetto…" valore={nuovoOggetto} disabilitato={occupato}
            opzioni={oggetti.filter((o) => !b.oggetti.some((x) => x.chiave === o.chiave)).map((o) => ({ chiave: o.chiave, nome: o.nome, gruppo: o.categoria }))}
            onCambia={(v) => { if (v) cambia({ oggetti: [...b.oggetti, { chiave: v, quantita: 1 }] }); setNuovoOggetto(''); }} />
        </div>
        <CampoTesto etichetta="Yen" tipo="numero" valore={b.yen} massimo={9} aiuto="Vuoto se la Richiesta non dà yen." onCambia={(v) => cambia({ yen: v })} disabilitato={occupato} />
        <CampoTesto etichetta="Esperienza (PE)" tipo="numero" valore={b.esperienza} massimo={6} aiuto="Vuoto se non si sa." onCambia={(v) => cambia({ esperienza: v })} disabilitato={occupato} />
        <CampoElenco etichetta="Altre ricompense (testo, per ciò che non è nel catalogo)" voci={b.ricompense} max={R.voce} onCambia={(v) => cambia({ ricompense: v })} disabilitato={occupato} />
      </SezioneCampi>
    </FinestraModifica>
  );
}
