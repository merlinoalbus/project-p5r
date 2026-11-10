// ============================================================
// FinestraPosto — «Il posto»: il luogo, i suoi punti vendita e i loro listini in una finestra sola (L3)
// ============================================================
//
// Si apre da «Modifica» del luogo. A sinistra (da 1024 px; sopra, a chip, sotto) «Il luogo» e i punti vendita, con «Aggiungi» e
// «Duplica»; a destra quello scelto: i campi del luogo, oppure il punto vendita (nome, che cosa vende, il resto ripiegato) e il suo listino
// a righe (oggetto, prezzo, pezzi; i dettagli dell'offerta si aprono nella riga). Una riga vuota in fondo al listino aspetta il prossimo
// oggetto: scegliendolo nasce l'offerta, senza un «Aggiungi» in più. Il luogo dice dove, il punto vendita che cosa si compra.
//
// Niente parte finché non si salva: «Salva» manda tutto in una transazione (`PUT /api/catalogo/posto/…`), «Annulla» butta la bozza. Un
// punto vendita nuovo nasce con la sede nel luogo e che cosa vende dal genere del posto (una macchina per un distributore); «Duplica» copia
// il punto vendita scelto con offerte proprie (la sorgente resta com'è, la copia è tua). Ripristina, Nascondi ed Elimina di luogo e punto
// vendita sono gesti immediati come prima: con la bozza pulita, poi la finestra rilegge.
// Formati: da 1024 px due colonne; sotto, le voci a capo sopra il pannello; sotto i 768 px la finestra è il foglio dal basso, un punto
// vendita per volta. Un solo scorrimento, quello del corpo della finestra.
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { eliminaNelCestino, getPosto, isApiError, nascondiElementoCatalogo, ripristinaElementoCatalogo, salvaPosto } from '../../services/api';
import { getCatalogoOggetti } from '../../services/api/catalogoOggetti';
import { useCarica } from '../../hooks/useCarica';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import { notifica } from '../../stores/notificationStore';
import { conferma } from '../../stores/confermaStore';
import { FinestraModifica } from '../shared/FinestraModifica';
import { SezioneCampi } from '../shared/Campo';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { TestoNote } from '../shared/TestoNote';
import { CondizioniEditor } from '../guida/CondizioniEditor';
import { MODULI, type Dati } from '../guida/moduli';
import { CampiPuntoVendita } from '../guida/moduli/ModuloNegozio';
import { EditorRifornimento } from '../guida/moduli/ModuloArticolo';
import { CostoOfferta } from '../guida/moduli/CostoOfferta';
import { Campo } from '../guida/moduli/campi';
import { SceltaNelCatalogo, type StatoSceltaCatalogo } from '../catalogo/SceltaCatalogoOggetto';
import { jsonDi, jsonSenzaPerdite, numeroDi, testoDi } from '../guida/moduli/base';
import { normalizzaCondizioniSpillo, normalizzaRequisitoSpillo, type RequisitoSpillo } from '../../../shared/condizioniSpillo';
import { normalizzaCostoScambio, normalizzaPrezzoPerFascia, VALUTA_COSTO, eCostoAImporto, type PrezzoPerFascia } from '../../../shared/catalogo';
import { normalizzaRifornimento, type RegolaRifornimento } from '../../../shared/rifornimento';
import { TIPI_LUOGO_DI_VENDITA, tipoPuntoVenditaDelLuogo } from '../../../shared/puntoVendita';
import { NOME_TIPO_NEGOZIO } from '../../utils/negozi';
import type { CatalogoOggettoDto, ElementoCatalogoDto, PostoDto, RegolaTipoNegozioDto, SalvaPostoDto } from '../../types';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

interface Props {
  /** La chiave del luogo («quartiere/luogo»). */
  luogo: string;
  /** Che cosa mostrare all'apertura: la chiave di un punto vendita, «nuovo» (uno da aggiungere) o «luogo»; assente = il primo punto vendita. */
  apri?: string;
  onChiudi: () => void;
  /**
   * Dopo un salvataggio o un gesto immediato: chi apre rilegge. `chiudi`: la finestra ha finito (salvataggio, luogo nel cestino) e chi
   * la apre la chiude; altrimenti resta aperta e si rilegge da sé. `eliminato` se il luogo è andato nel cestino.
   */
  onSalvato: (esito: { creati: string[]; chiudi: boolean; eliminato?: boolean }) => void;
}

/** Una riga del listino nella bozza. */
interface BozzaOfferta {
  id: string;
  chiave: string | null;
  elemento: ElementoCatalogoDto | null;
  dati: Dati;
  condizioni: RequisitoSpillo[];
  /** Le condizioni salvate si leggono senza perdite: si possono cambiare (altrimenti restano com'erano). */
  condizioniLeggibili: boolean;
  condizioniCambiate: boolean;
  /** La copia di un'altra offerta («Duplica»): le condizioni partono dall'originale e si mandano così come sono. */
  condizioniDaCopia: unknown;
  conAcquisti: boolean;
  /** Per una copia («Duplica»): l'offerta salvata d'origine, i cui contenuti (i set) il server passa alla copia. */
  copiaDa?: string;
  /** L4-01: l'offerta segue la regola comune del genere del suo punto vendita (pezzi, rifornimento, condizioni vengono da lì). */
  regolaComune: boolean;
  /** L4-01: com'era salvata all'apertura (una riga che ci torna adesso manda i valori della regola, una che la seguiva già no). */
  seguivaLaRegola: boolean;
  /** L'impronta all'apertura, per sapere se la riga è cambiata. */
  impronta: string;
}

/** L4-01: la regola comune di un genere nella bozza (si cambia nel posto e vale per tutte le offerte che la seguono). */
interface BozzaRegola {
  tipo: string; quantita: number | null; rifornimento: RegolaRifornimento | null; condizioni: RequisitoSpillo[]; cambiata: boolean;
  /** I campi cambiati: solo questi si salvano (un valore salvato che l'editor non sa leggere resta com'è). */
  cambiati: { quantita?: true; rifornimento?: true; condizioni?: true };
}

/** Un punto vendita nella bozza. */
interface BozzaPuntoVendita {
  id: string;
  chiave: string | null;
  elemento: ElementoCatalogoDto | null;
  dati: Dati;
  impronta: string;
  offerte: BozzaOfferta[];
  tolte: BozzaOfferta[];
}

interface Bozza {
  luogo: Dati;
  condizioniLuogo: RequisitoSpillo[];
  condizioniLuogoLeggibili: boolean;
  condizioniLuogoCambiate: boolean;
  improntaLuogo: string;
  punti: BozzaPuntoVendita[];
  /** Il punto vendita nato da solo quando il genere del posto è diventato uno che vende, con i suoi campi di allora. */
  automatico: { id: string; impronta: string } | null;
  /** Le regole comuni per genere di punto vendita. */
  regole: Record<string, BozzaRegola>;
}

let contatore = 0;
const nuovoId = () => `posto-${++contatore}`;
const impronta = (v: unknown) => JSON.stringify(v);

/** Una riga del listino da un'offerta salvata. */
function offertaDa(e: ElementoCatalogoDto & { conAcquisti?: boolean; regolaComune?: boolean }): BozzaOfferta {
  const dati = MODULI.articolo.iniziali(e);
  const condizioni = normalizzaCondizioniSpillo(jsonDi(e.dati.condizioni_json, []));
  return { id: nuovoId(), chiave: e.chiave, elemento: e, dati, condizioni, condizioniLeggibili: jsonSenzaPerdite(e.dati.condizioni_json, normalizzaCondizioniSpillo),
    condizioniCambiate: false, condizioniDaCopia: null, conAcquisti: e.conAcquisti === true, regolaComune: e.regolaComune === true, seguivaLaRegola: e.regolaComune === true, impronta: impronta(dati) };
}

/** Una riga nuova per l'oggetto scelto nella riga vuota. */
function offertaNuova(negozio: string, oggetto: string, conRegola: boolean): BozzaOfferta {
  // confermata: la scrive chi la vede in gioco (come ogni riga aggiunta dall'utente, `catalogoService.creaElementoNellaTransazione`)
  const dati = { ...MODULI.articolo.iniziali(null, negozio), catalogo_chiave: oggetto, verificato: true };
  // con una regola comune la riga nuova la segue: pezzi, rifornimento e condizioni li mette il server dalla regola
  return { id: nuovoId(), chiave: null, elemento: null, dati, condizioni: [], condizioniLeggibili: true, condizioniCambiate: false, condizioniDaCopia: null, conAcquisti: false, regolaComune: conRegola, seguivaLaRegola: false, impronta: '' };
}

/** La copia di una riga per «Duplica»: gli stessi valori, nessun legame con l'originale (costo, fasce e rifornimento si mandano interi). */
function copiaOfferta(o: BozzaOfferta): BozzaOfferta {
  const d = o.dati;
  const dati: Dati = { ...d, _catalogoIniziale: null, _prezzoPerFasciaIniziale: null, _copia: true, _fasceDaCopia: (d._copia === true ? d._fasceDaCopia : d._prezzoPerFasciaIniziale) ?? null,
    _costoModificato: d.costo_json != null && normalizzaCostoScambio(d.costo_json) !== null,
    _rifornimentoModificato: d.rifornimento_json != null && normalizzaRifornimento(d.rifornimento_json) !== null,
    // la regola salvata che il modulo non sa leggere: passa com'è (la controlla il server), non si perde nella copia
    _rifornimentoDaCopia: d._copia === true ? d._rifornimentoDaCopia : d._rifornimentoNonLeggibile === true ? o.elemento?.dati.rifornimento_json ?? null : null };
  return { ...o, id: nuovoId(), chiave: null, elemento: null, dati, conAcquisti: false, seguivaLaRegola: false, impronta: '', copiaDa: o.chiave ?? o.copiaDa,
    // le condizioni salvate dell'originale passano intere (anche quelle che l'editor non sa mostrare: le controlla il server); cambiate, valgono le nuove
    condizioniDaCopia: o.condizioniCambiate ? null : o.condizioniDaCopia ?? o.elemento?.dati.condizioni_json ?? null,
    condizioniCambiate: o.condizioniCambiate };
}

function bozzaDa(posto: PostoDto): Bozza {
  const luogo = MODULI.luogo.iniziali(posto.luogo);
  return {
    luogo, improntaLuogo: impronta(luogo), automatico: null,
    regole: Object.fromEntries(Object.values(posto.regole ?? {}).map((r) => [r.tipo, { tipo: r.tipo, quantita: r.quantita, rifornimento: r.rifornimento, condizioni: r.condizioni, cambiata: false, cambiati: {} }])),
    condizioniLuogo: normalizzaCondizioniSpillo(jsonDi(posto.luogo.dati.condizioni_json, [])),
    condizioniLuogoLeggibili: jsonSenzaPerdite(posto.luogo.dati.condizioni_json, normalizzaCondizioniSpillo), condizioniLuogoCambiate: false,
    punti: posto.puntiVendita.map((p) => {
      const dati = MODULI.negozio.iniziali(p.negozio);
      return { id: nuovoId(), chiave: p.negozio.chiave, elemento: p.negozio, dati, impronta: impronta(dati), offerte: p.offerte.map(offertaDa), tolte: [] };
    }),
  };
}

/** Che cosa vende un punto vendita nuovo, e il suo nome proposto: dal genere del posto e da quanti punti vendita ha già. */
function puntoVenditaNuovo(luogo: Dati, quanti: number): BozzaPuntoVendita {
  const nome = testoDi(luogo.nome).trim();
  const dati = { ...MODULI.negozio.iniziali(null), nome: quanti === 0 ? nome : `${nome} ${quanti + 1}`, tipo: tipoPuntoVenditaDelLuogo(testoDi(luogo.tipo)) ?? 'altro' };
  return { id: nuovoId(), chiave: null, elemento: null, dati, impronta: '', offerte: [], tolte: [] };
}

const offertaCambiata = (o: BozzaOfferta) => o.chiave === null || o.condizioniCambiate || impronta(o.dati) !== o.impronta;
const puntoCambiato = (p: BozzaPuntoVendita) => p.chiave === null || impronta(p.dati) !== p.impronta || p.tolte.length > 0 || p.offerte.some(offertaCambiata);
const luogoCambiato = (b: Bozza) => b.condizioniLuogoCambiate || impronta(b.luogo) !== b.improntaLuogo;
const regolaCambiata = (b: Bozza) => Object.values(b.regole).some((r) => r.cambiata);

/** Il corpo del salvataggio: solo quel che è cambiato, nella forma delle colonne (`prepara` dei moduli). */
function corpoDa(b: Bozza): SalvaPostoDto {
  const regole = Object.values(b.regole).filter((r) => r.cambiata).map((r) => ({ tipo: r.tipo,
    ...(r.cambiati.quantita ? { quantita: r.quantita } : {}), ...(r.cambiati.rifornimento ? { rifornimento_json: r.rifornimento } : {}),
    ...(r.cambiati.condizioni ? { condizioni_json: r.condizioni } : {}) }));
  return {
    luogo: luogoCambiato(b) ? { ...MODULI.luogo.prepara(b.luogo), ...(b.condizioniLuogoCambiate ? { condizioni_json: b.condizioniLuogo } : {}) } : undefined,
    ...(regole.length ? { regole } : {}),
    puntiVendita: b.punti.filter(puntoCambiato).map((p) => {
      const regola = b.regole[testoDi(p.dati.tipo)] ?? null;
      const stessoGenere = p.elemento === null || testoDi(p.elemento.dati.tipo) === testoDi(p.dati.tipo);
      return {
      ...(p.chiave ? { chiave: p.chiave } : {}),
      ...(p.chiave === null || impronta(p.dati) !== p.impronta ? { dati: MODULI.negozio.prepara(p.dati) } : {}),
      offerte: p.offerte.filter(offertaCambiata).map((o) => {
        const dati = MODULI.articolo.prepara(o.dati);
        delete dati.negozio_chiave;
        if (o.condizioniCambiate) dati.condizioni_json = o.condizioni;
        // un JSON che non si legge passa com'è: il server lo rifiuta con il suo messaggio, invece di diventare «nessuna condizione»
        else if (o.chiave === null && o.condizioniDaCopia != null) dati.condizioni_json = jsonDi<unknown>(o.condizioniDaCopia, o.condizioniDaCopia);
        if (o.chiave === null && o.dati._copia === true) {
          // la copia porta tutte le fasce di prezzo dell'originale (la sera come scritta nella riga) e il costo così com'è salvato, anche
          // quello che l'editor non sa leggere: lo controlla il server, invece di perderlo in silenzio
          if (o.dati.costo_json == null) {
            const sera = numeroDi(o.dati.prezzo_sera);
            const fasce = normalizzaPrezzoPerFascia({ ...((o.dati._fasceDaCopia as PrezzoPerFascia | null) ?? {}), sera: sera ?? undefined });
            if (fasce) dati.prezzo_per_fascia_json = fasce;
          } else if (normalizzaCostoScambio(o.dati.costo_json) === null) dati.costo_json = jsonDi<unknown>(o.dati.costo_json, o.dati.costo_json);
          if (o.dati._rifornimentoModificato !== true && o.dati._rifornimentoDaCopia != null) dati.rifornimento_json = jsonDi<unknown>(o.dati._rifornimentoDaCopia, o.dati._rifornimentoDaCopia);
        }
        // L4-01: una riga che seguiva già la regola (o nuova) non dice pezzi, rifornimento e condizioni: li tiene (o li prende) dalla regola,
        // anche quando la regola cambia nello stesso salvataggio. Una riga che ci torna adesso, o il cui punto vendita cambia genere, manda i
        // valori della regola com'è nella bozza: il server salva prima la regola, li trova uguali e la segna «segue».
        if (o.regolaComune && regola) {
          if ((o.chiave === null || o.seguivaLaRegola) && stessoGenere) { delete dati.quantita; delete dati.rifornimento_json; delete dati.condizioni_json; }
          else { dati.quantita = regola.quantita; dati.rifornimento_json = regola.rifornimento; dati.condizioni_json = regola.condizioni; }
        }
        return { ...(o.chiave ? { chiave: o.chiave } : {}), ...(o.chiave === null && o.copiaDa ? { copiaDa: o.copiaDa } : {}), dati };
      }),
      ...(p.tolte.length ? { offerteTolte: p.tolte.flatMap((o) => (o.chiave ? [o.chiave] : [])) } : {}),
      };
    }),
  };
}

/** Che cosa manca perché la bozza si salvi, in parole (vuoto = salvabile). */
function problemi(b: Bozza): string[] {
  const out: string[] = [];
  if (!MODULI.luogo.valido(b.luogo)) out.push('Il luogo ha bisogno del nome, del genere di posto e del quartiere.');
  if (b.condizioniLuogo.some((c) => normalizzaRequisitoSpillo(c) === null)) out.push('Completa o togli le condizioni vuote del luogo.');
  for (const r of Object.values(b.regole)) if (r.cambiata && r.condizioni.some((c) => normalizzaRequisitoSpillo(c) === null)) out.push('Completa o togli le condizioni vuote della regola comune.');
  for (const p of b.punti) {
    const nome = testoDi(p.dati.nome).trim() || 'Un punto vendita';
    if (!MODULI.negozio.valido(p.dati)) out.push(testoDi(p.dati.nome).trim() ? `${nome}: completa i campi in «Altro del punto vendita».` : 'Un punto vendita non ha il nome.');
    const male = p.offerte.filter((o) => !MODULI.articolo.valido(o.dati) || o.condizioni.some((c) => normalizzaRequisitoSpillo(c) === null)).length;
    if (male) out.push(`${nome}: ${male === 1 ? 'un’offerta è incompleta' : `${male} offerte sono incomplete`}.`);
  }
  return out;
}

export const FinestraPosto: StrumentoDiModifica<typeof FinestraPostoReale> = IN_RILASCIO ? NienteInRilascio : FinestraPostoReale;
/** «Modifica» di un luogo dove la pagina non è la sua (la carta del quartiere): il pulsante e la finestra del posto. */
export const ModificaPosto: StrumentoDiModifica<typeof ModificaPostoReale> = IN_RILASCIO ? NienteInRilascio : ModificaPostoReale;

function ModificaPostoReale({ luogo, nome, onSalvato }: { luogo: string; nome: string; onSalvato: () => void }) {
  const [aperto, setAperto] = useState(false);
  return <>
    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" aria-label={`Modifica il posto «${nome}»`} onClick={() => setAperto(true)} />
    {aperto && <FinestraPostoReale luogo={luogo} onChiudi={() => setAperto(false)} onSalvato={(e) => { onSalvato(); if (e.chiudi) setAperto(false); }} />}
  </>;
}

/** Carica il posto, poi l'editor (che si rimonta quando un gesto immediato fa rileggere). */
function FinestraPostoReale({ luogo, apri, onChiudi, onSalvato }: Props) {
  const [versione, setVersione] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `versione` non entra nella lettura: è il segnale di rileggere dopo un gesto immediato
  const posto = useCarica(() => getPosto(luogo), [luogo, versione]);
  // dopo un gesto immediato si torna sullo stesso punto vendita
  const [riapri, setRiapri] = useState<string | 'nuovo' | undefined>(apri);
  if (!posto.dati) {
    return <FinestraModifica titolo="Il posto" onChiudi={onChiudi} onSalva={() => undefined} caricamento={posto.caricamento} erroreCaricamento={posto.errore}>{null}</FinestraModifica>;
  }
  return <EditorPosto key={`${versione}`} posto={posto.dati} apri={riapri} onChiudi={onChiudi} onSalvato={onSalvato}
    onRileggi={(su) => { setRiapri(su); setVersione((v) => v + 1); }} />;
}

function EditorPosto({ posto, apri, onChiudi, onSalvato, onRileggi }: { posto: PostoDto; apri?: string | 'nuovo'; onChiudi: () => void; onSalvato: Props['onSalvato']; onRileggi: (su?: string) => void }) {
  const [bozza, setBozza] = useState<Bozza>(() => {
    const b = bozzaDa(posto);
    return apri === 'nuovo' ? { ...b, punti: [...b.punti, puntoVenditaNuovo(b.luogo, b.punti.length)] } : b;
  });
  const [scelto, setScelto] = useState<string>(() => (apri === 'nuovo' ? bozza.punti.at(-1)!.id : apri === 'luogo' ? 'luogo' : bozza.punti.find((p) => p.chiave === apri)?.id ?? bozza.punti[0]?.id ?? 'luogo'));
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const elenco = useCarica(() => getCatalogoOggetti(), []);
  const catalogo: StatoSceltaCatalogo = { oggetti: elenco.dati, caricamento: elenco.caricamento, errore: elenco.errore, onRicarica: () => void elenco.ricarica() };
  const sporca = luogoCambiato(bozza) || regolaCambiata(bozza) || bozza.punti.some(puntoCambiato) || bozza.punti.length !== posto.puntiVendita.length;
  useBozzaSporca('finestra-posto', `modifica di «${posto.luogo.nome}»`, sporca);
  const mancano = problemi(bozza);
  const punto = bozza.punti.find((p) => p.id === scelto) ?? null;
  const pannello = useRef<HTMLDivElement | null>(null);

  /** Sceglie che cosa mostrare e riporta in cima il pannello (al telefono la scelta sta sopra). */
  const scegli = (id: string) => { setScelto(id); requestAnimationFrame(() => pannello.current?.scrollIntoView?.({ block: 'nearest' })); };
  const cambiaPunto = (id: string, f: (p: BozzaPuntoVendita) => BozzaPuntoVendita) => setBozza((b) => ({ ...b, punti: b.punti.map((p) => (p.id === id ? f(p) : p)) }));
  /** Il genere del posto: se diventa un luogo che vende e non ha punti vendita, ne nasce uno (la regola I4 lo chiede). */
  // Tornando a un genere che non vende, quel punto vendita nato da solo se ne va se è ancora intatto (nessuna offerta, nessun campo cambiato).
  const impostaLuogo = (patch: Dati) => setBozza((b) => {
    const luogo = { ...b.luogo, ...patch };
    if (typeof patch.tipo !== 'string') return { ...b, luogo };
    if (TIPI_LUOGO_DI_VENDITA.includes(patch.tipo)) {
      if (b.punti.length > 0) return { ...b, luogo };
      const nato = puntoVenditaNuovo(luogo, 0);
      return { ...b, luogo, punti: [nato], automatico: { id: nato.id, impronta: impronta(nato.dati) } };
    }
    const a = b.automatico;
    const intatto = a && b.punti.some((p) => p.id === a.id && p.offerte.length === 0 && impronta(p.dati) === a.impronta);
    return { ...b, luogo, punti: intatto ? b.punti.filter((p) => p.id !== a.id) : b.punti, automatico: null };
  });
  const aggiungi = () => {
    const nuovo = puntoVenditaNuovo(bozza.luogo, bozza.punti.length);
    setBozza((b) => ({ ...b, punti: [...b.punti, nuovo] }));
    scegli(nuovo.id);
  };
  /** «Duplica»: la copia si chiama come l'originale con «(copia)», «(copia 2)»… senza ripetere il segno. */
  const duplica = (p: BozzaPuntoVendita) => {
    const base = testoDi(p.dati.nome).trim().replace(/ \(copia(?: \d+)?\)$/, '');
    const nomi = new Set(bozza.punti.map((x) => testoDi(x.dati.nome).trim()));
    let nome = `${base} (copia)`;
    for (let i = 2; nomi.has(nome); i++) nome = `${base} (copia ${i})`;
    const copia: BozzaPuntoVendita = { id: nuovoId(), chiave: null, elemento: null, impronta: '', tolte: [],
      dati: { ...p.dati, nome }, offerte: p.offerte.map(copiaOfferta) };
    setBozza((b) => ({ ...b, punti: [...b.punti, copia] }));
    scegli(copia.id);
  };

  const salva = async () => {
    if (occupato || mancano.length) return;
    setOccupato(true);
    setErrore(null);
    try {
      const esito = await salvaPosto(posto.luogo.chiave, corpoDa(bozza));
      notifica('success', esito.creati.length ? `Salvato: ${esito.creati.length === 1 ? 'un punto vendita nuovo' : `${esito.creati.length} punti vendita nuovi`} in «${testoDi(bozza.luogo.nome)}».` : `«${testoDi(bozza.luogo.nome)}» salvato.`);
      onSalvato({ creati: esito.creati, chiudi: true });
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Salvataggio non riuscito.';
      setErrore(m);
      notifica('error', m);
    } finally {
      setOccupato(false);
    }
  };

  /** Un gesto immediato (ripristina, nascondi, elimina): solo con la bozza pulita, poi si rilegge. */
  const immediato = async (gesto: () => Promise<unknown>, fatto: string, su?: string) => {
    setOccupato(true);
    try { await gesto(); notifica('success', fatto); onSalvato({ creati: [], chiudi: false }); onRileggi(su); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Operazione non riuscita.'); }
    finally { setOccupato(false); }
  };
  /** Luogo o punto vendita nel cestino: con dei contenuti il server li elenca (409) e una seconda conferma li porta via. */
  const nelCestino = async (tipo: 'luogo' | 'negozio', e: ElementoCatalogoDto) => {
    if (!(await conferma({ titolo: `Eliminare «${e.nome}»?`, testo: 'Va nel cestino: si può rimettere da Impostazioni › Cestino.', etichetta: 'Elimina' }))) return;
    setOccupato(true);
    try {
      try { await eliminaNelCestino(tipo, e.chiave, false); }
      catch (err) {
        if (!isApiError(err) || (err.code !== 'luogo-con-contenuti' && err.code !== 'negozio-con-acquisti')) throw err;
        const conti = riepilogo(err.details);
        if (!(await conferma({ titolo: `«${e.nome}» ha dei contenuti`, testo: `Se ne vanno anche: ${conti || err.message}. Restano nel cestino con lui.`, etichetta: 'Metti nel cestino' }))) return;
        await eliminaNelCestino(tipo, e.chiave, true);
      }
      notifica('success', `«${e.nome}» è nel cestino: si rimette da Impostazioni › Cestino.`);
      if (tipo === 'luogo') { onSalvato({ creati: [], chiudi: true, eliminato: true }); return; }
      onSalvato({ creati: [], chiudi: false });
      onRileggi();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Operazione non riuscita.');
    } finally {
      setOccupato(false);
    }
  };
  const azioniDi = (tipo: 'luogo' | 'negozio', e: ElementoCatalogoDto | null, su?: string) => {
    if (!e) return null;
    const ferme = occupato || sporca;
    return <div className="flex flex-wrap items-center gap-1.5">
      {e.modificata && <PulsanteVisivo compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Ripristina i valori della guida" disabled={ferme}
        onClick={() => void immediato(() => ripristinaElementoCatalogo(tipo, e.chiave), 'Ripristinati i valori della guida.', su)} />}
      {e.origine === 'seed' && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="bloccato" dimensione={20} />} titolo="Nascondi dagli elenchi" disabled={ferme}
        onClick={() => void immediato(() => nascondiElementoCatalogo(tipo, e.chiave, true), 'Nascosto: lo ritrovi in Impostazioni › Nascosti dalla guida.')} />}
      <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo={tipo === 'luogo' ? 'Elimina il luogo' : 'Elimina il punto vendita'} disabled={ferme}
        onClick={() => void nelCestino(tipo, e)} />
      {sporca && <span className="testo-12 text-text-muted">Salva o annulla le modifiche prima.</span>}
    </div>;
  };

  const ModuloDelLuogo = MODULI.luogo.Componente;
  return (
    <FinestraModifica titolo={`Il posto: ${posto.luogo.nome}`} nomeModulo={`Il posto ${posto.luogo.nome}`} onChiudi={onChiudi} onSalva={salva}
      salvabile={mancano.length === 0} occupato={occupato} sporca={sporca}>
      <div className="posto">
        <nav className="posto__elenco" aria-label="Il luogo e i suoi punti vendita">
          <ul className="posto__voci">
            <li><button type="button" className={`posto__voce touch ${scelto === 'luogo' ? 'posto__voce--scelta' : ''}`} aria-current={scelto === 'luogo' ? 'true' : undefined} onClick={() => scegli('luogo')}>
              <span className="posto__voce-nome">Il luogo</span>
              {luogoCambiato(bozza) && <span className="posto__segno" title="Modificato, da salvare">modificato</span>}
            </button></li>
            {bozza.punti.map((p) => (
              <li key={p.id}><button type="button" className={`posto__voce touch ${scelto === p.id ? 'posto__voce--scelta' : ''}`} aria-current={scelto === p.id ? 'true' : undefined} onClick={() => scegli(p.id)}>
                <span className="posto__voce-nome">{testoDi(p.dati.nome).trim() || 'Senza nome'}</span>
                <span className="posto__voce-dettaglio">{NOME_TIPO_NEGOZIO[testoDi(p.dati.tipo)] ?? testoDi(p.dati.tipo)} · {p.offerte.length} {p.offerte.length === 1 ? 'offerta' : 'offerte'}</span>
                {(p.chiave === null || puntoCambiato(p)) && <span className="posto__segno">{p.chiave === null ? 'nuovo' : 'modificato'}</span>}
              </button></li>
            ))}
          </ul>
          <div className="posto__comandi">
            <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi un punto vendita" disabled={occupato} onClick={aggiungi} />
            {punto && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="copia" dimensione={20} />} titolo="Duplica" aria-label={`Duplica ${testoDi(punto.dati.nome)}`} disabled={occupato} onClick={() => duplica(punto)} />}
          </div>
        </nav>
        <div ref={pannello} className="posto__pannello scroll-mt-4">
          {errore && <p role="alert" className="m-0 testo-13 text-error-testo"><TestoNote testo={errore} /> La finestra resta aperta.</p>}
          {mancano.length > 0 && <ul className="m-0 pl-5 testo-13 text-error-testo" aria-label="Che cosa manca per salvare">{mancano.map((m) => <li key={m}>{m}</li>)}</ul>}
          {scelto === 'luogo' || !punto ? (
            <section className="flex flex-col gap-5" aria-label="Il luogo">
              <ModuloDelLuogo dati={bozza.luogo} imposta={impostaLuogo} elemento={posto.luogo} nuovo={false} disabilitato={occupato} />
              <SezioneCampi titolo="Condizioni del luogo">
                <div className="campo--largo flex min-w-0 flex-col gap-2">
                  {!bozza.condizioniLuogoLeggibili && !bozza.condizioniLuogoCambiate && <p role="alert" className="m-0 testo-13 text-warning">Le condizioni salvate hanno parti che l’editor non sa mostrare: restano com’erano finché non le cambi qui.</p>}
                  <CondizioniEditor condizioni={bozza.condizioniLuogo} disabilitato={occupato}
                    onCambia={(c) => setBozza((b) => ({ ...b, condizioniLuogo: c, condizioniLuogoCambiate: true }))} />
                </div>
              </SezioneCampi>
              <label className="flex items-start gap-2 testo-13 touch">
                <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={bozza.luogo.verificato === true} disabled={occupato} onChange={(e) => impostaLuogo({ verificato: e.target.checked })} />
                <span>Confermato <span className="text-text-muted">· senza la spunta compare come «da fonte secondaria»</span></span>
              </label>
              {azioniDi('luogo', posto.luogo, 'luogo')}
            </section>
          ) : (
            <section className="flex flex-col gap-5" aria-label={`Punto vendita ${testoDi(punto.dati.nome)}`}>
              <CampiPuntoVendita nelPosto dati={punto.dati} imposta={(patch) => cambiaPunto(punto.id, (p) => ({ ...p, dati: { ...p.dati, ...patch },
                // L4-01: un altro genere non ha la stessa regola: le righe che la seguivano tengono i loro valori, come eccezioni
                ...('tipo' in patch && patch.tipo !== p.dati.tipo ? { offerte: p.offerte.map((o) => (o.regolaComune ? { ...o, regolaComune: false } : o)) } : {}) }))} disabilitato={occupato} />
              <Listino punto={punto} catalogo={catalogo} disabilitato={occupato} onCreato={() => void elenco.ricarica()}
                regola={bozza.regole[testoDi(punto.dati.tipo)] ?? null} infoRegola={posto.regole?.[testoDi(punto.dati.tipo)] ?? null}
                onRegola={(r) => setBozza((b) => ({ ...b, regole: { ...b.regole, [r.tipo]: { ...r, cambiata: true } } }))}
                onCambia={(f) => cambiaPunto(punto.id, f)} />
              {punto.chiave === null
                ? <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli questo punto vendita nuovo" disabled={occupato}
                  onClick={() => {
                    setBozza((b) => ({ ...b, punti: b.punti.filter((x) => x.id !== punto.id) }));
                    setScelto('luogo');
                    // il fuoco non resta sul pulsante che sparisce: va su «Il luogo», che ora si vede
                    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.posto__voce')?.focus());
                  }} />
                : azioniDi('negozio', punto.elemento, punto.chiave)}
            </section>
          )}
        </div>
      </div>
    </FinestraModifica>
  );
}

/** Il riepilogo del 409 a parole (solo le voci non a zero). */
function riepilogo(d: Record<string, unknown> | undefined): string {
  if (!d) return '';
  const voci: Array<[string, string, string]> = [['pin', 'pin', 'pin'], ['negozi', 'punto vendita', 'punti vendita'], ['attivita', 'attività', 'attività'], ['articoli', 'offerta', 'offerte'],
    ['acquisti', 'presenza d’acquisto nelle partite', 'presenze d’acquisto nelle partite'], ['punti', 'riga di punti nelle partite', 'righe di punti nelle partite'], ['consumazioni', 'consumazione', 'consumazioni'],
    ['provenienze', 'fonte d’acquisto', 'fonti d’acquisto'], ['proposte', 'proposta da applicare', 'proposte da applicare'], ['ricevute', 'ricevuta degli effetti', 'ricevute degli effetti']];
  return voci.filter(([k]) => typeof d[k] === 'number' && (d[k] as number) > 0).map(([k, uno, molti]) => `${d[k] as number} ${(d[k] as number) === 1 ? uno : molti}`).join(', ');
}

/** Il prezzo di una riga quando non si paga in yen, a parole («30 fiori», «2 oggetti da cedere»). */
function costoBreve(d: Dati): string {
  const c = normalizzaCostoScambio(d.costo_json);
  if (!c) return 'Costo non leggibile';
  if (c.tipo === 'oggetti') return c.oggetti.length === 1 ? 'Un oggetto da cedere' : `${c.oggetti.length} oggetti da cedere`;
  return eCostoAImporto(c.tipo) ? `${c.importo ?? '—'} ${VALUTA_COSTO[c.tipo].nome}` : '—';
}

/** Il listino a righe: oggetto, prezzo e pezzi in vista, il resto dell'offerta nei dettagli della riga; in fondo la riga vuota del prossimo oggetto. */
function Listino({ punto, catalogo, disabilitato, onCambia, onCreato, regola, infoRegola, onRegola }: {
  punto: BozzaPuntoVendita; catalogo: StatoSceltaCatalogo; disabilitato: boolean; onCambia: (f: (p: BozzaPuntoVendita) => BozzaPuntoVendita) => void; onCreato: (o: CatalogoOggettoDto) => void;
  /** L4-01: la regola comune del genere del punto vendita (nella bozza) e com'è salvata (frase, offerte che la seguono). */
  regola: BozzaRegola | null; infoRegola: RegolaTipoNegozioDto | null; onRegola: (r: BozzaRegola) => void;
}) {
  const [aperta, setAperta] = useState<string | null>(null);
  /** Pezzi, rifornimento o condizioni cambiati in una riga che seguiva la regola: da qui è un'eccezione per riga. */
  const eccezione = (r: BozzaOfferta): BozzaOfferta => (r.regolaComune ? { ...r, regolaComune: false } : r);
  const negozio = punto.chiave ?? '';
  // scelto l'oggetto nella riga vuota, il fuoco va al prezzo della riga nata: si scrive subito, senza un tocco in più
  const fuocoSu = useRef<string | null>(null);
  const listino = useRef<HTMLUListElement | null>(null);
  useEffect(() => {
    if (!fuocoSu.current) return;
    listino.current?.querySelector<HTMLInputElement>(`[data-prezzo="${fuocoSu.current}"]`)?.focus();
    fuocoSu.current = null;
  }, [punto.offerte]);
  const cambia = (id: string, f: (o: BozzaOfferta) => BozzaOfferta) => onCambia((p) => ({ ...p, offerte: p.offerte.map((o) => (o.id === id ? f(o) : o)) }));
  /** Toglie la riga; il fuoco, che stava sul pulsante che sparisce, va alla riga vuota in fondo. */
  const togli = (o: BozzaOfferta) => {
    onCambia((p) => ({ ...p, offerte: p.offerte.filter((x) => x.id !== o.id), tolte: o.chiave ? [...p.tolte, o] : p.tolte }));
    requestAnimationFrame(() => listino.current?.querySelector<HTMLButtonElement>('.posto__offerta--vuota button[role="combobox"]')?.focus());
  };
  const rimetti = (o: BozzaOfferta) => onCambia((p) => ({ ...p, tolte: p.tolte.filter((x) => x.id !== o.id), offerte: [...p.offerte, o] }));
  // gli oggetti già nel listino, e per ogni oggetto quelli da escludere nella sua riga: si ricalcolano solo quando cambia un oggetto, non a
  // ogni cifra di un prezzo (ogni selettore filtra e ordina il catalogo intero quando cambia `escludi`)
  const chiaviUsate = punto.offerte.map((o) => testoDi(o.dati.catalogo_chiave)).filter(Boolean).join('\u0001');
  const usati = useMemo(() => (chiaviUsate ? chiaviUsate.split('\u0001') : []), [chiaviUsate]);
  const escludiPer = useMemo(() => new Map(usati.map((k) => [k, usati.filter((x) => x !== k)])), [usati]);
  return (
    <section className="flex flex-col gap-2" aria-label="Listino">
      <h3 className="m-0 testo-14 font-semibold">Listino <span className="font-normal text-text-muted">· {punto.offerte.length} {punto.offerte.length === 1 ? 'offerta' : 'offerte'}</span></h3>
      {regola && <RegolaComune regola={regola} info={infoRegola} disabilitato={disabilitato} onCambia={onRegola} />}
      <ul ref={listino} className="posto__listino">
        <li className="posto__riga posto__riga--testa" aria-hidden="true"><span>Oggetto</span><span>Prezzo</span><span>Pezzi</span><span /></li>
        {punto.offerte.map((o, i) => {
          const nome = o.elemento?.nome ?? catalogo.oggetti?.find((x) => x.chiave === o.dati.catalogo_chiave)?.nome ?? `riga ${i + 1}`;
          const yen = o.dati.costo_json == null;
          return (
            <li key={o.id} className="posto__offerta">
              <div className="posto__riga">
                <div className="posto__cella posto__cella--oggetto">
                  {o.dati._aMano === true && !o.dati.catalogo_chiave
                    ? <span className="testo-13 break-words" title="Offerta storica senza oggetto del catalogo: lo scegli nei dettagli">{testoDi(o.dati.nome) || '—'}</span>
                    : <SceltaNelCatalogo {...catalogo} compatto etichetta={`Oggetto (riga ${nome})`} valore={testoDi(o.dati.catalogo_chiave)} disabilitato={disabilitato}
                      escludi={escludiPer.get(testoDi(o.dati.catalogo_chiave)) ?? usati} onCreato={onCreato} onScegli={(x) => cambia(o.id, (r) => ({ ...r, dati: { ...r.dati, catalogo_chiave: x.chiave, _aMano: false } }))} />}
                </div>
                <div className="posto__cella">
                  {yen
                    ? <span className="posto__campo"><input data-prezzo={o.id} className="form-input tabular-nums" type="number" inputMode="numeric" min={0} aria-label={`Prezzo in yen di ${nome}`} disabled={disabilitato}
                      value={testoDi(o.dati.prezzo)} onChange={(e) => cambia(o.id, (r) => ({ ...r, dati: { ...r.dati, prezzo: e.target.value === '' ? null : Number(e.target.value) } }))} /><span className="posto__unita" aria-hidden="true">¥</span></span>
                    : <span className="testo-13">{costoBreve(o.dati)}</span>}
                </div>
                <div className="posto__cella">
                  {/* una riga che segue la regola mostra i pezzi della regola; scriverne altri ne fa un'eccezione */}
                  <span className="posto__campo"><input className="form-input tabular-nums" type="number" inputMode="numeric" min={0} aria-label={`Pezzi per ciclo di ${nome}${o.regolaComune && regola ? ' (dalla regola comune)' : ''}`} disabled={disabilitato}
                    value={o.regolaComune && regola ? testoDi(regola.quantita) : testoDi(o.dati.quantita)}
                    onChange={(e) => cambia(o.id, (r) => eccezione({ ...r, dati: { ...r.dati, quantita: e.target.value === '' ? null : Number(e.target.value) } }))} /><span className="posto__unita" aria-hidden="true">pz</span></span>
                </div>
                <div className="posto__cella posto__cella--azioni">
                  <button type="button" className="btn btn-ghost btn-sm touch posto__icona" aria-expanded={aperta === o.id} aria-label={`Dettagli dell’offerta ${nome}`} title="Dettagli" disabled={disabilitato}
                    onClick={() => setAperta((a) => (a === o.id ? null : o.id))}><IconaAzione chiave={aperta === o.id ? 'chiudi' : 'modifica'} dimensione={20} /></button>
                  <button type="button" className="btn btn-ghost btn-sm touch posto__icona" aria-label={`Togli ${nome} dal listino`} title={o.conAcquisti ? 'Togli: ha acquisti, si nasconde' : 'Togli'} disabled={disabilitato}
                    onClick={() => togli(o)}><IconaAzione chiave="elimina" dimensione={20} /></button>
                </div>
              </div>
              {aperta === o.id && <DettagliOfferta o={o} catalogo={catalogo} disabilitato={disabilitato} onCreato={onCreato} onCambia={(f) => cambia(o.id, f)} regola={regola} testoRegola={infoRegola?.testo ?? null} />}
            </li>
          );
        })}
        <li className="posto__offerta posto__offerta--vuota">
          <div className="posto__riga">
            <div className="posto__cella posto__cella--oggetto">
              <SceltaNelCatalogo {...catalogo} compatto etichetta="Aggiungi un oggetto al listino" valore="" disabilitato={disabilitato} escludi={usati} onCreato={onCreato}
                onScegli={(x) => { const nuova = offertaNuova(negozio, x.chiave, regola !== null); fuocoSu.current = nuova.id; onCambia((p) => ({ ...p, offerte: [...p.offerte, nuova] })); }} />
            </div>
          </div>
        </li>
      </ul>
      {punto.tolte.length > 0 && (
        <div role="group" className="flex flex-wrap items-center gap-1.5 testo-12 text-text-secondary" aria-label="Offerte da togliere al salvataggio">
          <span>Da togliere salvando:</span>
          {punto.tolte.map((o) => <button key={o.id} type="button" className="chip touch" disabled={disabilitato} aria-label={`Rimetti ${o.elemento?.nome ?? 'l’offerta'}`}
            onClick={() => rimetti(o)}>{o.elemento?.nome ?? 'Offerta'}{o.conAcquisti ? ' (ha acquisti: si nasconde)' : ''} · rimetti</button>)}
        </div>
      )}
    </section>
  );
}

/** I dettagli di un'offerta nella sua riga: come si paga, prezzo di sera, rifornimento, nota, condizioni, «Confermato»; l'oggetto delle righe storiche. */
function DettagliOfferta({ o, catalogo, disabilitato, onCambia, onCreato, regola, testoRegola }: {
  o: BozzaOfferta; catalogo: StatoSceltaCatalogo; disabilitato: boolean; onCambia: (f: (o: BozzaOfferta) => BozzaOfferta) => void; onCreato: (o: CatalogoOggettoDto) => void;
  regola: BozzaRegola | null; testoRegola: string | null;
}) {
  const imposta = (patch: Dati) => onCambia((r) => ({ ...r, dati: { ...r.dati, ...patch } }));
  // L4-01: una riga che segue la regola comune non ripete i suoi campi: li dice la regola, e «Fai un'eccezione» li apre per questa riga
  const segue = o.regolaComune && regola !== null;
  /** I tre campi della regola nella riga: la riga torna a seguirla (il server la segna così perché i campi coincidono). */
  const tornaAllaRegola = () => regola && onCambia((r) => ({ ...r, regolaComune: true, condizioni: regola.condizioni, condizioniCambiate: true,
    dati: { ...r.dati, quantita: regola.quantita, rifornimento_json: regola.rifornimento, _rifornimentoModificato: true } }));
  const ugualeAllaRegola = regola !== null && (numeroDi(o.dati.quantita) ?? null) === regola.quantita
    && JSON.stringify(normalizzaRifornimento(o.dati.rifornimento_json ?? null)) === JSON.stringify(regola.rifornimento)
    && JSON.stringify(o.condizioni) === JSON.stringify(regola.condizioni);
  return (
    <div className="posto__dettagli">
      {o.dati._aMano === true && !o.dati.catalogo_chiave && <SceltaNelCatalogo {...catalogo} etichetta="Oggetto del catalogo" valore="" disabilitato={disabilitato} onCreato={onCreato}
        onScegli={(x) => imposta({ catalogo_chiave: x.chiave, _aMano: false })} />}
      <CostoOfferta senzaPrezzo dati={o.dati} imposta={imposta} disabilitato={disabilitato} catalogo={catalogo} />
      {segue
        ? <div className="flex flex-col gap-2 testo-13">
          <p className="m-0"><strong>Segue la regola comune</strong>{regola.cambiata ? ' (cambiata, da salvare)' : testoRegola ? `: ${testoRegola}` : ''}.</p>
          <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Fai un’eccezione per questa offerta" disabled={disabilitato}
            onClick={() => onCambia((r) => ({ ...r, regolaComune: false, condizioni: regola.condizioni, condizioniCambiate: true,
              dati: { ...r.dati, quantita: regola.quantita, rifornimento_json: regola.rifornimento, _rifornimentoModificato: true } }))} />
        </div>
        : <>
          {regola && <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Torna alla regola comune" disabled={disabilitato} onClick={tornaAllaRegola} />}
          {/* il segno lo decide l'uguaglianza dei valori (il server lo ricalcola): finché sono quelli della regola, salvando la riga la segue */}
          {regola && ugualeAllaRegola && <p className="m-0 testo-13 text-text-muted">Ha i valori della regola comune: diventa un’eccezione quando cambi pezzi, rifornimento o condizioni.</p>}
          <EditorRifornimento valore={(o.dati.rifornimento_json as RegolaRifornimento | null) ?? null}
            nonLeggibile={o.dati._rifornimentoNonLeggibile === true && o.dati._rifornimentoModificato !== true}
            disabilitato={disabilitato} onCambia={(r) => imposta({ rifornimento_json: r, _rifornimentoModificato: true })} />
        </>}
      <Campo nome="nota" etichetta="Nota" tipo="testolungo" dati={o.dati} imposta={imposta} disabilitato={disabilitato} max={600} largo />
      {!segue && <fieldset className="regole-editor flex min-w-0 flex-col gap-2">
        <legend>Condizioni dell’offerta</legend>
        {!o.condizioniLeggibili && !o.condizioniCambiate
          ? <p role="alert" className="m-0 testo-13 text-warning">Le condizioni salvate hanno parti che l’editor non sa mostrare: restano com’erano.</p>
          : <CondizioniEditor condizioni={o.condizioni} disabilitato={disabilitato} onCambia={(c) => onCambia((r) => ({ ...r, condizioni: c, condizioniCambiate: true }))} />}
      </fieldset>}
      <label className="flex items-start gap-2 testo-13 touch">
        <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={o.dati.verificato === true} disabled={disabilitato} onChange={(e) => imposta({ verificato: e.target.checked })} />
        <span>Confermato <span className="text-text-muted">· senza la spunta compare come «da fonte secondaria»</span></span>
      </label>
    </div>
  );
}

/**
 * L4-01: la regola comune del genere del punto vendita, sopra il listino: la frase, quante offerte la seguono (in tutti i luoghi) e, a
 * richiesta, i suoi campi. È il solo punto in cui si cambiano pezzi, rifornimento e condizioni delle offerte che la seguono.
 */
function RegolaComune({ regola, info, disabilitato, onCambia }: { regola: BozzaRegola; info: RegolaTipoNegozioDto | null; disabilitato: boolean; onCambia: (r: BozzaRegola) => void }) {
  const [aperta, setAperta] = useState(false);
  return (
    <div className="posto__regola" role="group" aria-label="Regola comune">
      <div className="flex flex-wrap items-center gap-2">
        <p className="m-0 min-w-0 flex-1 testo-13 text-pretty">
          <strong>Regola comune</strong>{regola.cambiata ? ' · cambiata, vale da quando salvi' : info?.testo ? `: ${info.testo}` : ''}
          {info && <span className="text-text-muted"> · la seguono {info.offerte} {info.offerte === 1 ? 'offerta' : 'offerte'} in tutti i luoghi</span>}
        </p>
        <button type="button" className="btn btn-ghost btn-sm touch" aria-expanded={aperta} disabled={disabilitato} onClick={() => setAperta((a) => !a)}>
          {aperta ? 'Chiudi la regola' : 'Modifica la regola'}
        </button>
      </div>
      {aperta && <div className="flex flex-col gap-3">
        <label className="editor-mappa__campo w-40">Pezzi per ciclo
          <input className="form-input tabular-nums" type="number" inputMode="numeric" min={0} disabled={disabilitato} value={regola.quantita ?? ''}
            onChange={(e) => onCambia({ ...regola, quantita: e.target.value === '' ? null : Number(e.target.value), cambiati: { ...regola.cambiati, quantita: true } })} />
        </label>
        {/* un valore salvato che l'editor non sa leggere resta com'è finché non lo riscrivi: si mandano solo i campi cambiati */}
        <EditorRifornimento valore={regola.rifornimento} nonLeggibile={info?.rifornimentoLeggibile === false && !regola.cambiati.rifornimento} disabilitato={disabilitato}
          onCambia={(r) => onCambia({ ...regola, rifornimento: r, cambiati: { ...regola.cambiati, rifornimento: true } })} />
        <fieldset className="regole-editor flex min-w-0 flex-col gap-2">
          <legend>Condizioni della regola</legend>
          {info?.condizioniLeggibili === false && !regola.cambiati.condizioni
            && <p role="alert" className="m-0 testo-13 text-warning">Le condizioni salvate hanno parti che l’editor non sa mostrare: restano com’erano finché non le cambi.</p>}
          <CondizioniEditor condizioni={regola.condizioni} disabilitato={disabilitato} onCambia={(c) => onCambia({ ...regola, condizioni: c, cambiati: { ...regola.cambiati, condizioni: true } })} />
        </fieldset>
      </div>}
    </div>
  );
}
