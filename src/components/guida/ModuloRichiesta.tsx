// ============================================================
// ModuloRichiesta — modificare, aggiungere ed eliminare una Richiesta dei Mementos (richiesta dell'utente, 2026-10-11)
// ============================================================
//
// «come faccio a modificare i dettagli relativi alle richieste? non ho un pulsante modifica.» Scelte dell'utente: «Modifica,
// aggiungi, elimina» e «In entrambi i posti»: lo stesso modulo si apre dalla pagina delle Richieste e dalla colonna del dedalo.
// Ha tutti i campi della carta: nome, committente, date, dedalo e area del dedalo (099), piano, bersaglio con forma demoniaca,
// livello, debolezze e resistenze, confusione utile, ricompense (una voce per riga), Confidente e rango, note.
// «Elimina» prima dice chi cita la Richiesta (scelta «Si elimina e si avvisa»): partite, pin, condizioni, requisiti, azioni.
// Il modulo legge da sé l'elenco delle Richieste (poche decine): la Richiesta da correggere e dove la si può mettere.
//
// L13 (rilievo dell'utente 2026-10-25: «Modifica: Richiesta» inguardabile): il modulo usa i modelli comuni dell'interfaccia.
//  - `FinestraModifica`: quattro sezioni a una colonna sul telefono e due da 768 px, e il piè FISSO con Elimina / Annulla / Salva (prima
//    stavano in fondo al corpo, dopo quattro schermate; la conferma dell'eliminazione era un riquadro in fondo, fuori vista);
//  - `CampoTesto` (etichetta sopra, 44 px, testi lunghi che si allungano) al posto di cinque campi con larghezze casuali (`flex-wrap`);
//  - `ElencoElementi` per debolezze e resistenze (tessere con le icone degli elementi) invece di «una per riga»; `CampoElenco` per le ricompense;
//  - `SceltaDaCatalogo` (Confidente + rango scelto da 1 a 10) al posto del rango digitato.
// Le date («Disponibile dal», «Scadenza») restano TESTO: nei dati reali sono frasi («10 dicembre, dopo il Palazzo di Shido», «23 dicembre,
// estesa al 1 febbraio»), non un giorno MM-GG, e un selettore di data le perderebbe; la conversione in dato strutturato è un'ondata a parte.
// I formati salvati non cambiano: stessi campi, stesse rotte, stessi limiti.
// ============================================================

import { useState } from 'react';
import { aggiornaRichiesta, creaRichiesta, eliminaRichiesta, getCitazioniRichiesta, getConfidenti, getRichieste } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { conferma } from '../../stores/confermaStore';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { Modal } from '../shared/Modal';
import { PageState } from '../shared/PageState';
import { Selettore } from '../shared/Selettore';
import { CampoTesto, SezioneCampi } from '../shared/Campo';
import { ElencoElementi } from '../shared/ElencoElementi';
import { SceltaDaCatalogo } from '../shared/SceltaDaCatalogo';
import { FinestraModifica } from '../shared/FinestraModifica';
import { CampoElenco } from './moduli/campi';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import type { CitazioniRichiestaDto, RichiestaDto, RichiesteDto } from '../../types';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

const R = LIMITI_GUIDA.richiesta;
/** Nel selettore del dedalo e dell'area, la voce «nessuno». */
const NESSUNO = '';

/** I campi del modulo, come si scrivono (testo, elenchi di voci); diventano dati solo al salvataggio. */
interface Bozza {
  nome: string; committente: string; disponibileDal: string; scadenza: string; dedalo: string; areaDedalo: string; piano: string;
  bersaglio: string; formaDemoniaca: string; livello: string; debolezze: string[]; resistenze: string[]; confusione: boolean;
  ricompense: string[]; confidente: string; rango: number | null; note: string;
}

/** La bozza di partenza: i campi della Richiesta, o vuoti (con dedalo e area dati) per una nuova. */
function bozzaDa(r: RichiestaDto | null, iniziale: { dedalo?: string | null; areaDedalo?: string | null }): Bozza {
  return {
    nome: r?.nome ?? '', committente: r?.committente ?? '', disponibileDal: r?.disponibileDal ?? '', scadenza: r?.scadenza ?? '',
    dedalo: r ? r.areaChiave ?? NESSUNO : iniziale.dedalo ?? NESSUNO, areaDedalo: r ? r.areaDedalo ?? NESSUNO : iniziale.areaDedalo ?? NESSUNO, piano: r?.piano ?? '',
    bersaglio: r?.bersaglio.nome ?? '', formaDemoniaca: r?.bersaglio.formaDemoniaca ?? '', livello: r?.bersaglio.livello ? String(r.bersaglio.livello) : '',
    debolezze: [...(r?.bersaglio.debolezze ?? [])], resistenze: [...(r?.bersaglio.resistenze ?? [])], confusione: r?.bersaglio.vulnerabileConfusione ?? false,
    ricompense: [...(r?.ricompense ?? [])], confidente: r?.confidente?.chiave ?? NESSUNO, rango: r?.confidente?.rango ?? null, note: r?.note ?? '',
  };
}

/** Le voci di un elenco ripulite: senza spazi ai bordi e senza quelle vuote. */
const voci = (elenco: string[]): string[] => elenco.map((x) => x.trim()).filter((x) => x.length > 0);

/** Un intero fra `min` e `max`, o null se vuoto; un valore fuori misura è un errore detto con il nome del campo. */
function intero(testo: string, min: number, max: number, campo: string): number | null {
  const t = testo.trim();
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${campo}: un numero intero da ${min} a ${max} (vuoto = nessuno).`);
  return n;
}

/** Il testo della domanda di conferma: dice chi cita la Richiesta e che cosa succede a ciascuno. */
function testoEliminazione(c: CitazioniRichiestaDto): string {
  const righe = [c.partite === 0 ? 'Nessuna partita ne ha segnato lo stato.' : `Lo stato segnato in ${c.partite === 1 ? '1 partita' : `${c.partite} partite`} se ne va con lei.`];
  if (c.pin.length > 0) righe.push(`Perdono il collegamento ${c.pin.length === 1 ? 'il pin' : `${c.pin.length} pin`}: ${c.pin.join(', ')} (restano sulla mappa).`);
  if (c.azioni > 0) righe.push(`Perdono il collegamento ${c.azioni === 1 ? '1 azione' : `${c.azioni} azioni`} della giornata (restano, col loro testo).`);
  if (c.condizioni.length > 0) righe.push(`Restano, da correggere, le condizioni di: ${c.condizioni.join('; ')}.`);
  if (c.requisiti.length > 0) righe.push(`Restano, da correggere, i requisiti dei Confidenti: ${c.requisiti.join('; ')}.`);
  if (c.pin.length === 0 && c.azioni === 0 && c.condizioni.length === 0 && c.requisiti.length === 0) righe.push('Nessun pin, condizione, requisito o azione la cita.');
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

/** Il modulo di una Richiesta in una finestra: carica l'elenco (Richiesta e collocazioni) e i Confidenti, poi i campi. */
// L12 (passo 8): nel rilascio (sola lettura) il modulo non esiste; la condizione è costante di build, `ModuloRichiestaReale` esce dal bundle
export const ModuloRichiesta: StrumentoDiModifica<typeof ModuloRichiestaReale> = IN_RILASCIO ? NienteInRilascio : ModuloRichiestaReale;
function ModuloRichiestaReale({ chiave, iniziale = {}, onChiudi, onCambiata }: Props) {
  const dati = useCarica(() => getRichieste(), []);
  const confidenti = useCarica(() => getConfidenti(), []);
  const richiesta = chiave ? dati.dati?.richieste.find((r) => r.chiave === chiave) ?? null : null;
  const titolo = chiave ? `Modifica: ${richiesta?.nome ?? 'Richiesta'}` : 'Aggiungi una Richiesta';
  // finché i dati non ci sono (o sono in errore, o la Richiesta non esiste più) la finestra è un guscio semplice con il suo stato
  if (!dati.dati || !confidenti.dati || (chiave && !richiesta)) {
    return (
      <Modal titolo={titolo} aperta onChiudi={onChiudi} larga>
        <PageState isLoading={(dati.caricamento && !dati.dati) || (confidenti.caricamento && !confidenti.dati)} error={dati.errore ?? confidenti.errore} onRetry={() => { void dati.ricarica(); void confidenti.ricarica(); }}>
          {dati.dati && confidenti.dati && <p className="m-0 testo-13 text-text-muted" role="status">Questa Richiesta non c’è più.</p>}
        </PageState>
      </Modal>
    );
  }
  return (
    <Campi key={chiave ?? 'nuova'} titolo={titolo} richiesta={richiesta} iniziale={iniziale} collocazioni={dati.dati.collocazioni}
      confidenti={confidenti.dati.map((c) => ({ chiave: c.chiave, nome: c.nome, dettaglio: c.arcanaNome }))} onChiudi={onChiudi} onCambiata={onCambiata} />
  );
}

/** La finestra con le sue quattro sezioni di campi e il piè fisso; per una Richiesta che c'è, «Elimina» con l'avviso di chi la cita. */
function Campi({ titolo, richiesta, iniziale, collocazioni, confidenti, onChiudi, onCambiata }: {
  titolo: string; richiesta: RichiestaDto | null; iniziale: { dedalo?: string | null; areaDedalo?: string | null }; collocazioni: RichiesteDto['collocazioni'];
  confidenti: Array<{ chiave: string; nome: string; dettaglio: string }>; onChiudi: () => void; onCambiata: () => void | Promise<void>;
}) {
  // la bozza di partenza è anche il metro per capire se c'è qualcosa di non salvato (per «Aggiorna» e la chiusura della scheda del browser)
  const [partenza] = useState<Bozza>(() => bozzaDa(richiesta, iniziale));
  const [b, setB] = useState<Bozza>(partenza);
  const sporca = JSON.stringify(b) !== JSON.stringify(partenza);
  useBozzaSporca('modulo-richiesta', richiesta ? `modifica della Richiesta «${richiesta.nome}»` : 'nuova Richiesta', sporca);
  const [occupato, setOccupato] = useState(false);
  /** Cambia alcuni campi della bozza. */
  const cambia = (patch: Partial<Bozza>) => setB((x) => ({ ...x, ...patch }));
  const aree = collocazioni.find((d) => d.chiave === b.dedalo)?.aree ?? [];

  /** I dati da mandare, controllati: nome e bersaglio obbligatori, numeri nei loro limiti. */
  const datiDaMandare = () => {
    if (!b.nome.trim()) throw new Error('Il nome della Richiesta è obbligatorio.');
    if (!b.bersaglio.trim()) throw new Error('Il nome del bersaglio è obbligatorio.');
    return {
      nome: b.nome.trim(), committente: b.committente.trim(), disponibileDal: b.disponibileDal.trim(), scadenza: b.scadenza.trim(),
      dedalo: b.dedalo || null, areaDedalo: b.dedalo && b.areaDedalo ? b.areaDedalo : null, piano: b.piano.trim(),
      bersaglio: { nome: b.bersaglio.trim(), formaDemoniaca: b.formaDemoniaca.trim(), livello: intero(b.livello, 1, 99, 'Livello del bersaglio'),
        debolezze: voci(b.debolezze), resistenze: voci(b.resistenze), vulnerabileConfusione: b.confusione },
      ricompense: voci(b.ricompense), confidente: b.confidente || null, confidenteRango: b.confidente ? b.rango : null, note: b.note.trim(),
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
        <CampoTesto etichetta="Disponibile dal" valore={b.disponibileDal} massimo={R.breve} aiuto="Come lo scrive la guida: «18 giugno», «10 dicembre, dopo il Palazzo di Shido»." onCambia={(v) => cambia({ disponibileDal: v })} disabilitato={occupato} />
        <CampoTesto etichetta="Scadenza" valore={b.scadenza} massimo={R.breve} aiuto="Come lo scrive la guida: «23 dicembre, estesa al 1 febbraio»." onCambia={(v) => cambia({ scadenza: v })} disabilitato={occupato} />
      </SezioneCampi>
      <SezioneCampi titolo="Dove">
        <Selettore etichettaSopra etichetta="Dedalo" valore={b.dedalo} disabilitato={occupato} opzioni={[{ chiave: NESSUNO, nome: '— nessun dedalo —' }, ...collocazioni.map((d) => ({ chiave: d.chiave, nome: d.nome }))]}
          onCambia={(v) => cambia({ dedalo: v, areaDedalo: v === b.dedalo ? b.areaDedalo : NESSUNO })} />
        {b.dedalo && <Selettore etichettaSopra etichetta="Area del dedalo" valore={b.areaDedalo} disabilitato={occupato} opzioni={[{ chiave: NESSUNO, nome: '— da collocare —', dettaglio: 'non conta' }, ...aree.map((a) => ({ chiave: a.chiave, nome: a.nome }))]}
          onCambia={(v) => cambia({ areaDedalo: v })} />}
      </SezioneCampi>
      <SezioneCampi titolo="Il bersaglio">
        <CampoTesto etichetta="Bersaglio" obbligatorio valore={b.bersaglio} massimo={R.nome} onCambia={(v) => cambia({ bersaglio: v })} disabilitato={occupato} />
        <CampoTesto etichetta="Forma demoniaca" valore={b.formaDemoniaca} massimo={R.voce} onCambia={(v) => cambia({ formaDemoniaca: v })} disabilitato={occupato} />
        <CampoTesto etichetta="Livello" tipo="numero" valore={b.livello} massimo={2} aiuto="Da 1 a 99; vuoto se non si sa." onCambia={(v) => cambia({ livello: v })} disabilitato={occupato} />
        <label className="touch campo--largo flex items-center gap-2 testo-13">
          <input type="checkbox" className="h-5 w-5" checked={b.confusione} disabled={occupato} onChange={(e) => cambia({ confusione: e.target.checked })} />Confusione utile (confondendolo dà yen)
        </label>
        <ElencoElementi etichetta="Debolezze" valore={b.debolezze} maxVoci={R.voci} massimo={R.voce} onCambia={(v) => cambia({ debolezze: v })} disabilitato={occupato} />
        <ElencoElementi etichetta="Resistenze" valore={b.resistenze} maxVoci={R.voci} massimo={R.voce} onCambia={(v) => cambia({ resistenze: v })} disabilitato={occupato} />
      </SezioneCampi>
      <SezioneCampi titolo="Ricompense e Confidente">
        <CampoElenco etichetta="Ricompense" voci={b.ricompense} max={R.voce} onCambia={(v) => cambia({ ricompense: v })} disabilitato={occupato} />
        <div className="campo--largo">
          <SceltaDaCatalogo tipo="confidente" valore={b.confidente} confidenti={confidenti} rango={b.rango} rangoMassimo={R.rango} disabilitato={occupato}
            onCambia={(chiave, rango) => cambia({ confidente: chiave, rango })} />
        </div>
        <CampoTesto etichetta="Note" tipo="lungo" valore={b.note} massimo={R.note} onCambia={(v) => cambia({ note: v })} disabilitato={occupato} />
      </SezioneCampi>
    </FinestraModifica>
  );
}
