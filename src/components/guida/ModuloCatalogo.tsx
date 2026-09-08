import { CondizioniEditor } from './CondizioniEditor';
import { normalizzaRequisitoSpillo, type RequisitoSpillo } from '../../../shared/condizioniSpillo';
// ============================================================
// ModuloCatalogo — aggiungere o correggere negozi e articoli dall'interfaccia (Fase 16.1)
// ============================================================
//
// Quello che aggiungi resta anche quando i dati della guida vengono aggiornati: la riga è marcata come tua.
// Correggendo una riga della guida, l'originale viene conservato e «Ripristina» lo rimette.
// ============================================================

import { useCarica } from '../../hooks/useCarica';
import { getAttivita, getQuartieri } from '../../services/api/compendio';
import { useState, type ReactNode } from 'react';
import { aggiornaElementoCatalogo, creaElementoCatalogo, eliminaElementoCatalogo, nascondiElementoCatalogo } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { Modal } from '../shared/Modal';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NOME_CATEGORIA_ARTICOLO, NOME_TIPO_NEGOZIO } from '../../utils/negozi';
import { getTuttiGliOggetti } from '../../services/api/catalogo';
import { NOME_DOTE } from '../../utils/citta';
import { BERSAGLI, FAMIGLIE_EFFETTO, FUNZIONI, GUADAGNI, MISURE, NOME_FUNZIONE, NOME_GUADAGNO, NOME_RESA, RESE, NOME_BERSAGLIO, NOME_RISORSA, NOME_STATISTICA, NOME_STATO, PROBABILITA, RISORSE, STATISTICHE_OGGETTO, STATI_ALTERATI, descriviEffetto, type EffettoOggetto, type StatoAlterato } from '../../../shared/effettiOggetto';
import type { ElementoCatalogoDto, OggettoSelezionabileDto, TipoCatalogo } from '../../types';

interface Campo {
  nome: string;
  etichetta: string;
  tipo: 'testo' | 'testolungo' | 'numero' | 'select' | 'booleano';
  opzioni?: Record<string, string>;
  aiuto?: string;
}

/** Campi mostrati dal modulo, nell'ordine: gli stessi che l'API accetta. */
const CAMPI: Record<TipoCatalogo, Campo[]> = {
  negozio: [
    { nome: 'nome', etichetta: 'Nome del negozio', tipo: 'testo' },
    { nome: 'tipo', etichetta: 'Tipo', tipo: 'select', opzioni: NOME_TIPO_NEGOZIO },
    { nome: 'luogo_chiave', etichetta: 'Quartiere', tipo: 'select' },
    { nome: 'luogo', etichetta: 'Posizione nel quartiere', tipo: 'testo', aiuto: 'Per esempio: vicino alla stazione. Il quartiere si sceglie nel campo sopra.' },
    { nome: 'gestore', etichetta: 'Chi lo gestisce', tipo: 'testo' },
    { nome: 'orari', etichetta: 'Orari', tipo: 'testo' },
    { nome: 'note', etichetta: 'Note', tipo: 'testolungo' },
  ],
  articolo: [
    { nome: 'nome', etichetta: 'Nome dell\'articolo', tipo: 'testo' },
    { nome: 'categoria', etichetta: 'Categoria', tipo: 'select', opzioni: NOME_CATEGORIA_ARTICOLO },
    { nome: 'prezzo', etichetta: 'Prezzo in yen', tipo: 'numero' },
    { nome: 'quantita', etichetta: 'Quante se ne possono comprare', tipo: 'numero', aiuto: 'Vuoto = nessun limite dichiarato' },
    { nome: 'nota', etichetta: 'Nota', tipo: 'testolungo' },
  ],
  libro: [
    { nome: 'nome', etichetta: 'Titolo del libro', tipo: 'testo' },
    { nome: 'nome_it', etichetta: 'Titolo italiano', tipo: 'testo', aiuto: 'Solo se diverso dal titolo qui sopra' },
    { nome: 'dove', etichetta: 'Dove si trova', tipo: 'testo', aiuto: 'Per esempio: Libreria Taiheido (Shibuya)' },
    { nome: 'prezzo', etichetta: 'Prezzo in yen', tipo: 'numero', aiuto: 'Vuoto o 0 se è gratis' },
    { nome: 'disponibile_dal', etichetta: 'Disponibile dal', tipo: 'testo', aiuto: 'La data come la scrive la guida: «dal 18 aprile»' },
    { nome: 'dote', etichetta: 'Dote che alza', tipo: 'select', opzioni: NOME_DOTE, aiuto: 'Campo che l’app usa: diventa punti veri quando spunti la lettura nella guida giorno per giorno' },
    { nome: 'note', etichetta: 'Note della Dote (1-3)', tipo: 'numero', aiuto: 'Quante ♪ dà: è il numero, non un testo. Con la Dote qui sopra fa i punti (♪ = 2, ♪♪ = 3, ♪♪♪ = 5, e 7 per un libro)' },
    { nome: 'sessioni', etichetta: 'Sessioni di lettura', tipo: 'numero', aiuto: 'Quante volte va letto per finirlo' },
    { nome: 'dettagli', etichetta: 'Dettagli', tipo: 'testolungo' },
  ],
  film: [
    { nome: 'nome', etichetta: 'Titolo del film', tipo: 'testo' },
    { nome: 'nome_it', etichetta: 'Titolo italiano', tipo: 'testo', aiuto: 'Solo se diverso dal titolo qui sopra' },
    { nome: 'dove', etichetta: 'Dove si vede', tipo: 'select', opzioni: { cinema: 'Al cinema', dvd: 'In DVD' } },
    { nome: 'periodo', etichetta: 'Periodo', tipo: 'testo', aiuto: 'Quando è in programmazione: «dal 24 aprile», «Maggio-Giugno»' },
    { nome: 'prezzo', etichetta: 'Prezzo in yen', tipo: 'numero' },
    { nome: 'dote', etichetta: 'Dote che alza', tipo: 'select', opzioni: NOME_DOTE, aiuto: 'Campo che l’app usa: diventa punti veri quando spunti la visione nella guida giorno per giorno' },
    { nome: 'note', etichetta: 'Note della Dote (1-3)', tipo: 'numero', aiuto: 'Quante ♪ dà la PRIMA volta. Con «Anima da cineasta» letto, film e DVD salgono di uno scalino' },
    { nome: 'note_successive', etichetta: 'Note delle volte dopo', tipo: 'numero', aiuto: 'Quanto vale rivederlo: al cinema la guida lo dichiara («visioni successive: +1»). Vuoto = rivederlo non dà niente' },
    { nome: 'sessioni', etichetta: 'Visioni per completarlo', tipo: 'numero', aiuto: 'Un film al cinema 1, un DVD 2' },
    { nome: 'dettagli', etichetta: 'Dettagli', tipo: 'testolungo' },
  ],
  attivita: [
    { nome: 'nome', etichetta: 'Nome dell’attività', tipo: 'testo' },
    { nome: 'tipo', etichetta: 'Tipo', tipo: 'select', opzioni: { 'mini-gioco': 'Minigioco', lavoro: 'Lavoro part-time', videogioco: 'Videogioco', studio: 'Studio', lettura: 'Lettura', allenamento: 'Allenamento', cibo: 'Cibo', sfida: 'Sfida', altro: 'Altro' } },
    { nome: 'luogo_chiave', etichetta: 'Quartiere', tipo: 'select' },
    { nome: 'luogo', etichetta: 'Dove, per esteso', tipo: 'testo', aiuto: 'Il quartiere si sceglie nel campo sopra' },
    { nome: 'fascia', etichetta: 'Quando', tipo: 'select', opzioni: { giorno: 'Di giorno', sera: 'Di sera', entrambe: 'Giorno e sera' } },
    { nome: 'costo', etichetta: 'Costo in yen', tipo: 'numero' },
    { nome: 'paga', etichetta: 'Quanto paga', tipo: 'testo', aiuto: 'Solo per i lavori' },
    { nome: 'sessioni', etichetta: 'Round o sessioni', tipo: 'numero', aiuto: 'Per i videogiochi: quanti round per finirlo' },
    { nome: 'regole', etichetta: 'Regole', tipo: 'testolungo' },
    { nome: 'premi', etichetta: 'Premi', tipo: 'testolungo', aiuto: 'Nota per te: qui «Coraggio +3» resta una frase. Quello che alza una Dote va dichiarato in «Doti alzate»' },
    { nome: 'altri_effetti', etichetta: 'Altri effetti', tipo: 'testolungo' },
  ],
  // La risposta non è qui: sta in «Risposte giuste», l'editor a righe qui sotto, perché è il dato
  // che l'app usa per dirti che cosa rispondere e un campo di testo l'avrebbe reso illeggibile.
  domanda: [
    { nome: 'data', etichetta: 'Giorno', tipo: 'testo', aiuto: 'Nel formato del calendario di gioco, mese-giorno: «04-12»' },
    { nome: 'tipo', etichetta: 'Quando', tipo: 'select', opzioni: { classe: 'Domanda in classe', 'esame-medio': 'Esame di metà semestre', 'esame-finale': 'Esame finale', altro: 'Altro' } },
    { nome: 'chi', etichetta: 'Chi la fa', tipo: 'select', opzioni: { 'Prof. Ushimaru': 'Prof. Ushimaru', 'Prof. Kawakami': 'Prof. Kawakami', 'Prof. Hiruta': 'Prof. Hiruta', 'Prof. Inui': 'Prof. Inui', 'Prof. Chuono': 'Prof. Chuono', 'Prof. Maruki': 'Prof. Maruki', 'Prof. Usami': 'Prof. Usami', 'Game show in TV': 'Game show in TV' } },
    { nome: 'domanda', etichetta: 'Domanda', tipo: 'testolungo' },
    { nome: 'ricompensa', etichetta: 'Che cosa dà', tipo: 'testo', aiuto: 'Per esempio: Conoscenza +1 nota' },
    { nome: 'note', etichetta: 'Note', tipo: 'testolungo' },
  ],
  cruciverba: [
    { nome: 'data', etichetta: 'Giorno', tipo: 'testo', aiuto: 'Nel formato del calendario di gioco, mese-giorno: «04-18»' },
    { nome: 'indizio', etichetta: 'Indizio', tipo: 'testolungo' },
    { nome: 'risposta', etichetta: 'Risposta', tipo: 'testo' },
    { nome: 'risposta_en', etichetta: 'Risposta in inglese', tipo: 'testo', aiuto: 'Solo se ti serve: è la parola con cui la risolve chi gioca in inglese' },
  ],
};

const etichettaOggetto = (o: OggettoSelezionabileDto) => o.nomeIt && o.nomeIt !== o.nome ? `${o.nomeIt} (${o.nome})` : o.nome;

const NOME_ARCHIVIO: Record<OggettoSelezionabileDto['fonte'], string> = {
  equipaggiamento: 'Equipaggiamento', guida: 'Guida', libri: 'Libri', film: 'Film e DVD', videogiochi: 'Videogiochi',
};

/** **Prima si sceglie la cosa. Se non c'è, la si inserisce.**
 *
 * Il modulo era al contrario: nome e categoria in cima, l'archivio in fondo, e l'archivio filtrato
 * per la categoria scelta sopra — cioè bisognava indovinare «Libro» prima di poter cercare «Il
 * magnifico ladro». La via normale era digitare, e la scelta un ripensamento. È così che 454
 * articoli su 575 sono rimasti scollegati da quello che l'app già sapeva.
 *
 * Qui l'elenco è **uno solo su tutti i tipi** — equipaggiamenti, consumabili, oggetti chiave,
 * abiti, libri, film, videogiochi — si cerca per nome, e la categoria arriva con l'oggetto scelto.
 *
 * E soprattutto **collega, non copia**: sulla riga restano `oggetto_fonte` e `oggetto_chiave`, e
 * nome, effetto, statistiche e «per chi» si leggono dall'oggetto a ogni lettura. Correggere
 * l'effetto di un libro aggiorna da solo i negozi che lo vendono, invece di lasciare in giro copie
 * che dicono cose diverse. */
function SceltaOggetto({ collegato, onCollega, onScollega, aMano, onAMano }: {
  collegato: OggettoSelezionabileDto | null;
  onCollega: (o: OggettoSelezionabileDto) => void;
  onScollega: () => void;
  aMano: boolean;
  onAMano: () => void;
}) {
  const elenco = useCarica(() => getTuttiGliOggetti(), []);
  const [ricerca, setRicerca] = useState('');
  const voci = elenco.dati ?? [];
  const q = ricerca.trim().toLocaleLowerCase('it');
  const trovati = q ? voci.filter((o) => `${o.nome} ${o.nomeIt ?? ''}`.toLocaleLowerCase('it').includes(q)).slice(0, 40) : [];

  if (collegato) {
    return (
      <fieldset className="regole-editor flex flex-col gap-2">
        <legend>Oggetto collegato</legend>
        <div className="flex flex-wrap items-baseline gap-2">
          <strong className="text-[15px]">{etichettaOggetto(collegato)}</strong>
          <span className="chip text-[11px]">{NOME_ARCHIVIO[collegato.fonte]}</span>
        </div>
        {/* In sola lettura, e viene dall'oggetto: qui non si digita niente. */}
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
          {collegato.effetto && <><dt className="text-text-muted">Effetto</dt><dd className="m-0">{collegato.effetto}</dd></>}
          {collegato.statistiche && <><dt className="text-text-muted">Statistiche</dt><dd className="m-0">{collegato.statistiche}</dd></>}
          {collegato.per && <><dt className="text-text-muted">Per chi</dt><dd className="m-0">{collegato.per}</dd></>}
        </dl>
        <button type="button" className="btn btn-ghost touch self-start" onClick={onScollega}>Scollega e scegli un altro oggetto</button>
      </fieldset>
    );
  }

  return (
    <fieldset className="regole-editor flex flex-col gap-2">
      <legend>Che cosa vende</legend>
      {elenco.errore && <p className="m-0 text-[12px]" role="alert">Non riesco a leggere l’archivio. <button type="button" className="btn touch" onClick={() => void elenco.ricarica()}>Riprova</button></p>}
      <label className="editor-mappa__campo">
        Cerca l’oggetto
        <input type="search" className="form-input" value={ricerca} onChange={(e) => setRicerca(e.target.value)}
          placeholder={elenco.caricamento ? 'Carico l’archivio…' : `Cerca fra ${voci.length} oggetti di ogni tipo…`} />
      </label>
      {q && trovati.length > 0 && (
        <ul className="m-0 flex max-h-64 list-none flex-col gap-1 overflow-y-auto p-0">
          {trovati.map((o) => (
            <li key={`${o.fonte}/${o.chiave}`}>
              <button type="button" className="btn btn-ghost touch w-full justify-between text-left" onClick={() => onCollega(o)}>
                <span>{etichettaOggetto(o)}</span>
                <span className="chip text-[11px]">{NOME_ARCHIVIO[o.fonte]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q && trovati.length === 0 && !elenco.caricamento && (
        <p className="m-0 text-[12px] text-text-muted" role="status">Nessun oggetto con questo nome.</p>
      )}
      {!aMano && (
        <button type="button" className="btn touch self-start" onClick={onAMano}>Non c’è: lo inserisco</button>
      )}
    </fieldset>
  );
}

/** **L'effetto di un articolo generico, dichiarato invece che descritto.**
 *
 * Serve solo qui: l'articolo collegato l'effetto lo prende dall'oggetto. Ma un articolo che nessun
 * archivio conosce un effetto ce l'ha lo stesso, e finche' era un campo di testo il risultato nei
 * dati e' stato 276 forme diverse su 575 righe — con dentro tre tipi di dato che non c'entrano fra
 * loro. Qui si sceglie la famiglia e si compilano i suoi parametri: la frase la scrive l'app, cosi'
 * due articoli che fanno la stessa cosa la mostrano identica.
 *
 * `descrittivo` c'e' e non e' una scappatoia: nei dati sette casi non formano una famiglia
 * («Abilita il Terzo Occhio nella pesca»). Dichiararli tali e' diverso dal lasciare il campo libero
 * a tutti — si vede quanti sono, e non si confondono con quelli che l'app sa leggere. */
function EditorEffetto({ valore, onCambia, quartieri, attivita }: {
  valore: EffettoOggetto | null; onCambia: (e: EffettoOggetto | null) => void;
  quartieri?: Array<{ chiave: string; nome: string }>; attivita?: Array<{ chiave: string; nome: string }>;
}) {
  const famiglia = valore?.famiglia ?? '';
  const cambiaFamiglia = (f: string) => {
    if (!f) return onCambia(null);
    switch (f as EffettoOggetto['famiglia']) {
      case 'ripristina': return onCambia({ famiglia: 'ripristina', risorsa: 'hp', misura: 'assoluta', valore: 10, bersaglio: 'chi-lo-usa' });
      case 'rianima': return onCambia({ famiglia: 'rianima', percentuale: 50, bersaglio: 'un-alleato' });
      case 'cura-stato': return onCambia({ famiglia: 'cura-stato', stato: 'sonno', bersaglio: 'un-alleato' });
      case 'infliggi-stato': return onCambia({ famiglia: 'infliggi-stato', stato: 'sonno', probabilita: 'media', bersaglio: 'un-nemico' });
      case 'resiste-stato': return onCambia({ famiglia: 'resiste-stato', stato: 'sonno' });
      case 'previene-stato': return onCambia({ famiglia: 'previene-stato', stato: 'sonno' });
      case 'statistica': return onCambia({ famiglia: 'statistica', statistica: 'forza', valore: 1 });
      case 'dote': return onCambia({ famiglia: 'dote', dote: 'Conoscenza', note: 1 });
      case 'regalo': return onCambia({ famiglia: 'regalo', graditoA: [] });
      case 'sblocca-luogo': return onCambia({ famiglia: 'sblocca-luogo', luogo: '' });
      case 'sblocca-funzione': return onCambia({ famiglia: 'sblocca-funzione', funzione: 'terzo-occhio', dove: null });
      case 'moltiplica': return onCambia({ famiglia: 'moltiplica', cosa: 'lettura', fattore: 2 });
      case 'aumenta-punti': return onCambia({ famiglia: 'aumenta-punti', dove: 'film' });
      case 'descrittivo': return onCambia({ famiglia: 'descrittivo', testo: '' });
    }
  };
  const nomiEffetto = {
    luoghi: Object.fromEntries((quartieri ?? []).map((q) => [q.chiave, q.nome])),
    attivita: Object.fromEntries((attivita ?? []).map((a) => [a.chiave, a.nome])),
  };
  const campo = (etichetta: string, dentro: ReactNode) => <label className="editor-mappa__campo">{etichetta}{dentro}</label>;
  const scelta = <C extends string>(v: C, opzioni: readonly C[], nomi: Record<C, string>, set: (x: C) => void) => (
    <select className="form-input" value={v} onChange={(e) => set(e.target.value as C)}>
      {opzioni.map((o) => <option key={o} value={o}>{nomi[o]}</option>)}
    </select>
  );
  const numero = (v: number | null, set: (n: number) => void) => (
    <input className="form-input" type="number" min={0} max={9999} value={v ?? 0} onChange={(e) => set(Number(e.target.value))} />
  );
  return (
    <fieldset className="regole-editor flex flex-col gap-2">
      <legend>Che cosa fa</legend>
      <label className="editor-mappa__campo">
        Effetto
        <select className="form-input" value={famiglia} onChange={(e) => cambiaFamiglia(e.target.value)}>
          <option value="">Nessun effetto dichiarato</option>
          {FAMIGLIE_EFFETTO.map((f) => <option key={f.chiave} value={f.chiave}>{f.nome}</option>)}
        </select>
      </label>
      {valore?.famiglia === 'ripristina' && <>
        {campo('Che cosa ripristina', scelta(valore.risorsa, RISORSE, NOME_RISORSA, (risorsa) => onCambia({ ...valore, risorsa })))}
        {campo('Quanto', scelta(valore.misura, MISURE, { assoluta: 'Una quantità', percentuale: 'Una percentuale', tutto: 'Tutto' }, (misura) => onCambia({ ...valore, misura })))}
        {valore.misura !== 'tutto' && campo(valore.misura === 'percentuale' ? 'Percentuale' : 'Quantità', numero(valore.valore, (v) => onCambia({ ...valore, valore: v })))}
        {campo('A chi', scelta(valore.bersaglio, BERSAGLI, NOME_BERSAGLIO, (bersaglio) => onCambia({ ...valore, bersaglio })))}
      </>}
      {valore?.famiglia === 'rianima' && <>
        {campo('Con quanti HP (%)', numero(valore.percentuale, (v) => onCambia({ ...valore, percentuale: v })))}
        {campo('A chi', scelta(valore.bersaglio, BERSAGLI, NOME_BERSAGLIO, (bersaglio) => onCambia({ ...valore, bersaglio })))}
      </>}
      {valore?.famiglia === 'cura-stato' && <>
        {campo('Quale stato', scelta(valore.stato as StatoAlterato, STATI_ALTERATI, NOME_STATO, (stato) => onCambia({ ...valore, stato })))}
        {campo('A chi', scelta(valore.bersaglio, BERSAGLI, NOME_BERSAGLIO, (bersaglio) => onCambia({ ...valore, bersaglio })))}
      </>}
      {valore?.famiglia === 'infliggi-stato' && <>
        {campo('Quale stato', scelta(valore.stato, STATI_ALTERATI, NOME_STATO, (stato) => onCambia({ ...valore, stato })))}
        {campo('Quanto è probabile', scelta(valore.probabilita, PROBABILITA, { alta: 'Alta', media: 'Media', bassa: 'Bassa', 'non-detta': 'Non dichiarata' }, (probabilita) => onCambia({ ...valore, probabilita })))}
        {campo('A chi', scelta(valore.bersaglio, BERSAGLI, NOME_BERSAGLIO, (bersaglio) => onCambia({ ...valore, bersaglio })))}
      </>}
      {(valore?.famiglia === 'resiste-stato' || valore?.famiglia === 'previene-stato') &&
        campo('Quale stato', scelta(valore.stato, STATI_ALTERATI, NOME_STATO, (stato) => onCambia({ ...valore, stato })))}
      {valore?.famiglia === 'statistica' && <>
        {campo('Quale statistica', scelta(valore.statistica, STATISTICHE_OGGETTO, NOME_STATISTICA, (statistica) => onCambia({ ...valore, statistica })))}
        {campo('Di quanto', numero(valore.valore, (v) => onCambia({ ...valore, valore: v })))}
      </>}
      {valore?.famiglia === 'dote' && <>
        {campo('Quale Dote', scelta(valore.dote, Object.keys(NOME_DOTE) as string[], NOME_DOTE, (dote) => onCambia({ ...valore, dote })))}
        {campo('Quante note (♪)', numero(valore.note, (v) => onCambia({ ...valore, note: v })))}
      </>}
      {valore?.famiglia === 'sblocca-luogo' &&
        campo('Quale luogo', <select className="form-input" value={valore.luogo} onChange={(e) => onCambia({ ...valore, luogo: e.target.value })}>
          <option value="">Scegli il quartiere…</option>
          {(quartieri ?? []).map((q) => <option key={q.chiave} value={q.chiave}>{q.nome}</option>)}
        </select>)}
      {valore?.famiglia === 'sblocca-funzione' && <>
        {campo('Che cosa apre', scelta(valore.funzione, FUNZIONI, NOME_FUNZIONE, (funzione) => onCambia({ ...valore, funzione })))}
        {campo('In quale attività', <select className="form-input" value={valore.dove ?? ''} onChange={(e) => onCambia({ ...valore, dove: e.target.value || null })}>
          <option value="">Non è legata a una sola attività</option>
          {(attivita ?? []).map((a) => <option key={a.chiave} value={a.chiave}>{a.nome}</option>)}
        </select>)}
      </>}
      {valore?.famiglia === 'moltiplica' && <>
        {campo('Che cosa moltiplica', scelta(valore.cosa, RESE, NOME_RESA, (cosa) => onCambia({ ...valore, cosa })))}
        {campo('Per quanto', numero(valore.fattore, (v) => onCambia({ ...valore, fattore: Math.max(1, v) })))}
      </>}
      {valore?.famiglia === 'aumenta-punti' &&
        campo('Dove si guadagna di più', scelta(valore.dove, GUADAGNI, NOME_GUADAGNO, (dove) => onCambia({ ...valore, dove })))}
      {valore?.famiglia === 'descrittivo' &&
        campo('Descrizione', <textarea className="form-input" rows={2} maxLength={600} value={valore.testo} onChange={(e) => onCambia({ ...valore, testo: e.target.value })} />)}
      {/* L'anteprima mostrava la chiave grezza — «Sblocca yongen-jaya» — perche' `descriviEffetto`
          sta in `shared/` e non puo' leggere il database. I nomi glieli diamo noi, che li abbiamo
          gia' caricati per i selettori qui sopra. */}
      {valore && <p className="m-0 text-[12px] text-text-muted" role="status">Verrà mostrato così: <strong>{descriviEffetto(valore, nomiEffetto)}</strong></p>}
    </fieldset>
  );
}

/** Come si chiama una riga di ogni tipo, nei titoli e nei messaggi. */
const NOME_TIPO: Record<TipoCatalogo, { nuovo: string; singolare: string }> = {
  negozio: { nuovo: 'Nuovo negozio', singolare: 'Negozio' },
  articolo: { nuovo: 'Nuovo articolo', singolare: 'Articolo' },
  libro: { nuovo: 'Nuovo libro', singolare: 'Libro' },
  film: { nuovo: 'Nuovo film o DVD', singolare: 'Film' },
  attivita: { nuovo: 'Nuova attività', singolare: 'Attività' },
  domanda: { nuovo: 'Nuova domanda', singolare: 'Domanda' },
  cruciverba: { nuovo: 'Nuova riga del cruciverba', singolare: 'Riga del cruciverba' },
};

/** I tipi che hanno davvero la colonna `condizioni_json`: agli altri l'editor non va mostrato. */
const CON_CONDIZIONI = new Set<TipoCatalogo>(['negozio', 'articolo', 'libro', 'film', 'attivita']);

/** Una Dote alzata da un'attività: quale, quante note, e l'eventuale condizione della guida. */
interface DoteAttivita {
  dote: string | null;
  note: number | null;
  condizione?: string | null;
}

/** L'editor delle Doti: righe che si aggiungono e si tolgono, non un campo di testo.
 *
 * Le note (♪) sono l'unità con cui la guida misura quel che un'attività dà, e sono l'unità che il
 * motore sa convertire in punti. Un menu a tendina con tre voci è quindi tutto quel che serve —
 * scriverlo a mano vorrebbe dire riportare il problema al punto di partenza. */
function EditorDoti({ doti, onCambia, disabilitato }: { doti: DoteAttivita[]; onCambia: (d: DoteAttivita[]) => void; disabilitato?: boolean }) {
  const cambia = (i: number, campo: keyof DoteAttivita, valore: string) => {
    const nuove = doti.map((d, j) => (j === i ? { ...d, [campo]: campo === 'note' ? (valore ? Number(valore) : null) : (valore || null) } : d));
    onCambia(nuove);
  };
  return (
    <fieldset className="regole-editor flex flex-col gap-2">
      <legend>Doti alzate</legend>
      <p className="m-0 text-[12px] text-text-muted">
        Quello che scrivi in «Premi» resta una nota per te. Le Doti dichiarate qui invece l’app le
        usa: spuntando l’azione nella guida giorno per giorno, i punti si alzano davvero.
      </p>
      {doti.length === 0 && <p className="m-0 text-[12px] text-text-muted" role="status">Nessuna Dote dichiarata.</p>}
      {doti.map((d, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <label className="editor-mappa__campo min-w-[160px] flex-1">
            Dote
            <select className="form-input" value={d.dote ?? ''} disabled={disabilitato} onChange={(e) => cambia(i, 'dote', e.target.value)}>
              <option value="">Dote variabile</option>
              {Object.entries(NOME_DOTE).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
          </label>
          <label className="editor-mappa__campo w-[130px]">
            Note
            <select className="form-input" value={d.note ?? ''} disabled={disabilitato} onChange={(e) => cambia(i, 'note', e.target.value)}>
              <option value="">Non indicate</option>
              <option value="1">♪ (1)</option>
              <option value="2">♪♪ (2)</option>
              <option value="3">♪♪♪ (3)</option>
            </select>
          </label>
          <label className="editor-mappa__campo min-w-[200px] flex-[2]">
            Quando (facoltativo)
            <input className="form-input" type="text" maxLength={400} value={d.condizione ?? ''} disabled={disabilitato}
              onChange={(e) => cambia(i, 'condizione', e.target.value)} placeholder="Per esempio: solo completando la sfida" />
          </label>
          <button type="button" className="btn btn-ghost btn-sm touch" disabled={disabilitato}
            onClick={() => onCambia(doti.filter((_, j) => j !== i))} aria-label={`Togli la Dote ${i + 1}`}>Togli</button>
        </div>
      ))}
      <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />}
        titolo="Aggiungi una Dote" disabled={disabilitato} onClick={() => onCambia([...doti, { dote: null, note: null, condizione: null }])} />
    </fieldset>
  );
}

/** Una risposta giusta a una domanda: che cosa rispondere, e in che ordine se i passaggi sono più d'uno. */
interface RispostaDomanda {
  ordine: number;
  testo: string;
}

/** L'editor delle risposte: righe in ordine, non un campo di testo.
 *
 * È il dato per cui la pagina esiste — «che cosa rispondo?» — e va nella forma che l'app sa usare.
 * L'ordine conta: certe domande d'esame si rispondono in due o tre passaggi, e la guida li elenca
 * proprio così. Scriverli in un campo libero vorrebbe dire ritrovarseli in dieci formati diversi e
 * doverli leggere a occhio ogni volta, che è esattamente il difetto per cui le Doti hanno avuto il
 * loro editor. */
function EditorRisposte({ risposte, onCambia, disabilitato }: { risposte: RispostaDomanda[]; onCambia: (r: RispostaDomanda[]) => void; disabilitato?: boolean }) {
  const cambia = (i: number, testo: string) => onCambia(risposte.map((r, j) => (j === i ? { ...r, testo } : r)));
  const togli = (i: number) => onCambia(risposte.filter((_, j) => j !== i).map((r, j) => ({ ...r, ordine: j + 1 })));
  return (
    <fieldset className="regole-editor flex flex-col gap-2">
      <legend>Risposte giuste</legend>
      <p className="m-0 text-[12px] text-text-muted">
        Che cosa rispondere, nell’ordine. Una sola riga per le domande in classe; più righe dove il gioco chiede una sequenza di risposte.
      </p>
      {risposte.map((r, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <span className="chip shrink-0" aria-hidden>{i + 1}</span>
          <label className="editor-mappa__campo min-w-[220px] flex-[3]">
            <span className="sr-only">Risposta {i + 1}</span>
            <input className="form-input" type="text" maxLength={300} value={r.testo} disabled={disabilitato}
              onChange={(e) => cambia(i, e.target.value)} placeholder="La risposta come la dà il gioco" aria-label={`Risposta ${i + 1}`} />
          </label>
          <button type="button" className="btn btn-ghost btn-sm touch" disabled={disabilitato}
            onClick={() => togli(i)} aria-label={`Togli la risposta ${i + 1}`}>Togli</button>
        </div>
      ))}
      <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />}
        titolo="Aggiungi una risposta" disabled={disabilitato} onClick={() => onCambia([...risposte, { ordine: risposte.length + 1, testo: '' }])} />
    </fieldset>
  );
}

interface Props {
  tipo: TipoCatalogo;
  /** Presente = modifica di una riga esistente; assente = creazione. */
  elemento?: ElementoCatalogoDto | null;
  /** Per un articolo nuovo: il negozio a cui appartiene. */
  negozioChiave?: string;
  onChiudi: () => void;
  onSalvato: () => void;
}

export function ModuloCatalogo({ tipo, elemento, negozioChiave, onChiudi, onSalvato }: Props) {
  // Il selettore dei quartieri serve ai negozi e alle attivita': tutte e due hanno un `luogo_chiave`.
  const quartieri = useCarica(() => (tipo === 'negozio' || tipo === 'attivita' || tipo === 'libro') ? getQuartieri() : Promise.resolve([]), [tipo]);
  // Le attivita' servono a «sblocca una capacita'»: il Terzo Occhio *alla pesca*, i tiri *a
  // biliardo*. Anche li' il posto e' un riferimento, non una parola scritta a mano.
  const attivitaElenco = useCarica(async () => (tipo === 'libro' || tipo === 'articolo')
    ? (await getAttivita()).attivita.map((a) => ({ chiave: a.chiave, nome: a.nome }))
    : [], [tipo]);

  const iniziali = () => {
    const v: Record<string, string> = {};
    for (const c of CAMPI[tipo]) {
      const valore = elemento?.dati[c.nome];
      v[c.nome] = valore === null || valore === undefined ? (c.tipo === 'select' && c.nome !== 'luogo_chiave' ? 'altro' : '') : String(valore);
    }
    return v;
  };
  const [valori, setValori] = useState<Record<string, string>>(iniziali);
  // Il collegamento all'oggetto, e la via secondaria per quando quell'oggetto non esiste.
  const [collegato, setCollegato] = useState<OggettoSelezionabileDto | null>(null);
  const [aMano, setAMano] = useState(false);
  // L'effetto dichiarato di un articolo generico. Nasce da `effetto_json` se la riga ce l'ha gia'.
  const [effetto, setEffetto] = useState<EffettoOggetto | null>(() => {
    try { const g = elemento?.dati.effetto_json; return g ? (JSON.parse(String(g)) as EffettoOggetto) : null; } catch { return null; }
  });
  const [condizioni,setCondizioni]=useState<RequisitoSpillo[]>(()=>JSON.parse(String(elemento?.dati.condizioni_json ?? '[]')));
  // Le Doti di un'attività stanno in `doti_json`, che è già una colonna e già un campo accettato
  // dall'API: mancava solo il modo di scriverlo.
  const [doti, setDoti] = useState<DoteAttivita[]>(() => {
    try { return JSON.parse(String(elemento?.dati.doti_json ?? '[]')) as DoteAttivita[]; } catch { return []; }
  });
  // Le risposte giuste di una domanda: stessa storia delle Doti, altro dato.
  const [risposte, setRisposte] = useState<RispostaDomanda[]>(() => {
    try { return JSON.parse(String(elemento?.dati.risposte_json ?? '[]')) as RispostaDomanda[]; } catch { return []; }
  });
  const regoleValide=condizioni.every(c=>normalizzaRequisitoSpillo(c)!==null);
  const [occupato, setOccupato] = useState(false);
  const nuovo = !elemento;

  const salva = async () => {
    setOccupato(true);
    try {
      const dati: Record<string, unknown> = { condizioni_json: condizioni };
      // Solo dove la tabella ce l'ha: le righe vuote non si salvano, e una Dote «variabile» senza
      // note non è una dichiarazione, è un buco.
      // L'API vuole l'**elenco**, non la stringa: è lei a serializzarlo (`doti_json` nello schema
      // è un array che si trasforma in JSON). Mandare già la stringa faceva fallire la convalida.
      if (tipo === 'attivita') {
        dati.doti_json = doti
          .filter((d) => d.dote || d.note)
          .map((d) => ({ dote: d.dote ?? null, note: d.note ?? null, condizione: d.condizione?.trim() || null }));
      }
      if (tipo === 'domanda') {
        dati.risposte_json = risposte
          .map((r) => ({ ordine: r.ordine, testo: r.testo.trim() }))
          .filter((r) => r.testo)
          .map((r, i) => ({ ordine: i + 1, testo: r.testo }));
      }
      for (const c of CAMPI[tipo]) {
        const grezzo = valori[c.nome]?.trim() ?? '';
        if (c.tipo === 'booleano') dati[c.nome] = grezzo === '1';
        else if (c.tipo === 'numero') dati[c.nome] = grezzo === '' ? null : Number(grezzo);
        else dati[c.nome] = grezzo === '' ? (['nome', 'luogo', 'fonte'].includes(c.nome) ? '' : null) : grezzo;
      }
      if (tipo === 'articolo') {
        dati.oggetto_fonte = collegato?.fonte ?? null;
        dati.oggetto_chiave = collegato?.chiave ?? null;
      }
      // Si salva la **dichiarazione**, e accanto la frase che ne discende: cosi' chi legge il
      // database senza passare dall'app vede comunque che cosa fa, e la ricerca per testo continua
      // a funzionare come prima. Per il libro la frase va in `sblocca`, che e' la colonna dove quel
      // testo e' sempre stato.
      if (tipo === 'articolo') {
        dati.effetto_json = effetto;
        dati.effetto = effetto ? descriviEffetto(effetto) : null;
      } else if (tipo === 'libro') {
        dati.effetto_json = effetto;
        dati.sblocca = effetto ? descriviEffetto(effetto) : null;
      }
      if (tipo === 'articolo' && nuovo) dati.negozio_chiave = negozioChiave;
      if (nuovo) {
        const e = await creaElementoCatalogo(tipo, dati);
        notifica('success', `${NOME_TIPO[tipo].singolare} «${e.nome}» aggiunto: resta anche quando i dati della guida vengono aggiornati.`);
      } else {
        await aggiornaElementoCatalogo(tipo, elemento.chiave, dati);
        notifica('success', `${NOME_TIPO[tipo].singolare} corretto: «Ripristina» rimette i dati della guida.`);
      }
      onSalvato();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Salvataggio fallito.');
    } finally {
      setOccupato(false);
    }
  };

  const ripristinaOelimina = async () => {
    if (!elemento) return;
    setOccupato(true);
    try {
      const esito = await eliminaElementoCatalogo(tipo, elemento.chiave);
      notifica('success', esito.esito === 'eliminata' ? 'Eliminato.' : 'Ripristinati i dati della guida.');
      onSalvato();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Operazione fallita.');
    } finally {
      setOccupato(false);
    }
  };

  const nascondi = async () => {
    if (!elemento) return;
    setOccupato(true);
    try {
      await nascondiElementoCatalogo(tipo, elemento.chiave, !elemento.nascosta);
      notifica('success', elemento.nascosta ? 'Di nuovo visibile.' : 'Nascosto: resta nei dati ma non compare più negli elenchi.');
      onSalvato();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Operazione fallita.');
    } finally {
      setOccupato(false);
    }
  };

  const titolo = nuovo ? NOME_TIPO[tipo].nuovo : `${NOME_TIPO[tipo].singolare}: ${elemento.nome}`;

  return (
    <Modal
      titolo={titolo}
      aperta
      onChiudi={onChiudi}
      larga
      azioni={
        <>
          <button type="button" className="btn btn-secondary" onClick={onChiudi}>Annulla</button>
          {!nuovo && (elemento.origine === 'utente' || elemento.nascosta) && (
            <button type="button" className="btn btn-danger" disabled={occupato} onClick={() => void ripristinaOelimina()}>
              {elemento.modificata || elemento.nascosta ? 'Ripristina dalla guida' : 'Elimina'}
            </button>
          )}
          <button type="button" className="btn btn-primary" disabled={occupato || !regoleValide || !valori.nome?.trim()} onClick={() => void salva()}>Salva</button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        {!nuovo && (
          <p className="m-0 text-[12px] text-text-muted">
            {elemento.origine === 'utente' && !elemento.modificata && 'Riga aggiunta da te.'}
            {elemento.modificata && 'Riga della guida corretta da te: «Ripristina dalla guida» rimette i dati originali.'}
            {elemento.origine === 'seed' && !elemento.modificata && 'Riga dei dati della guida: salvando, la correzione resterà anche dopo gli aggiornamenti.'}
            {elemento.nascosta && ' Attualmente nascosta.'}
          </p>
        )}
        {tipo === 'negozio' && quartieri.errore && <p role="alert">Impossibile caricare i quartieri. <button type="button" className="btn touch" onClick={() => void quartieri.ricarica()}>Riprova</button></p>}
        {tipo === 'articolo' && (
          <SceltaOggetto
            collegato={collegato}
            onCollega={(o) => { setCollegato(o); setAMano(false); setValori({ ...valori, nome: o.nome, categoria: o.categoria, prezzo: valori.prezzo?.trim() ? valori.prezzo : (o.prezzo !== null ? String(o.prezzo) : '') }); }}
            onScollega={() => setCollegato(null)}
            aMano={aMano}
            onAMano={() => setAMano(true)}
          />
        )}
        {/* **Vale per i libri quanto per gli articoli.** «Esplorando Yoncha 4» non da' una Dote:
            apre le scorciatoie di Yongen-Jaya, e prima non c'era modo di dirlo dall'interfaccia —
            avevo tolto il campo di testo sostenendo che bastassero le condizioni, che pero' dicono
            **quando il libro e' disponibile**, non che cosa apre leggendolo: il verso opposto. */}
        {(tipo === 'articolo' ? aMano : tipo === 'libro') && <EditorEffetto valore={effetto} onCambia={setEffetto} quartieri={quartieri.dati ?? []} attivita={attivitaElenco.dati ?? []} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Nome e categoria compaiono **solo** quando l'oggetto si inserisce a mano. Con un oggetto
              collegato vengono da lui, e mostrarli come campi vorrebbe dire invitare a correggere qui
              una cosa che qui non vive: e' la copia che questo lavoro toglie di mezzo. */}
          {CAMPI[tipo].filter((c) => tipo !== 'articolo' || aMano || !['nome', 'categoria'].includes(c.nome)).map((c) => (
            <label key={c.nome} className={`editor-mappa__campo ${c.tipo === 'testolungo' ? 'sm:col-span-2' : ''}`}>
              {c.etichetta}
              {c.tipo === 'select' ? (
                <select className="form-input" value={valori[c.nome] ?? ''} onChange={(e) => setValori({ ...valori, [c.nome]: e.target.value })}>
                  {c.nome === 'luogo_chiave' && <option value="">Nessun quartiere (online, ambulante o da assegnare)</option>}
                  {c.nome === 'luogo_chiave' && valori.luogo_chiave && !quartieri.dati?.some(q => q.chiave === valori.luogo_chiave) && <option value={valori.luogo_chiave}>{valori.luogo_chiave}</option>}
                  {Object.entries(c.nome === 'luogo_chiave' ? Object.fromEntries((quartieri.dati ?? []).map(q => [q.chiave, q.nome])) : c.opzioni ?? {}).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                </select>
              ) : c.tipo === 'booleano' ? (
                <input type="checkbox" className="w-5 h-5" checked={valori[c.nome] === '1'}
                  onChange={(e) => setValori({ ...valori, [c.nome]: e.target.checked ? '1' : '' })} />
              ) : c.tipo === 'testolungo' ? (
                <textarea className="form-input" rows={2} value={valori[c.nome] ?? ''} onChange={(e) => setValori({ ...valori, [c.nome]: e.target.value })} maxLength={2000} />
              ) : (
                <input className="form-input" type={c.tipo === 'numero' ? 'number' : 'text'} min={c.tipo === 'numero' ? 0 : undefined} value={valori[c.nome] ?? ''} onChange={(e) => setValori({ ...valori, [c.nome]: e.target.value })} maxLength={400} />
              )}
              {c.aiuto && <span className="text-[11px] text-text-muted">{c.aiuto}</span>}
            </label>
          ))}
        </div>
        {/* **Le Doti sono il campo che l'app sa usare davvero.** Un premio scritto «Coraggio +3»
            resta una frase che nessuno legge; dichiarata qui, la Dote con le sue note (♪) diventa
            punti veri con la regola del gioco — `puntiDaNote`, scalini 2/3/5, più uno scalino con
            «Anima da cineasta» — nel momento in cui l'azione viene spuntata nella guida giorno per
            giorno. Libri e film il campo l'avevano già; le attività e i videogiochi ce l'hanno in
            tabella (`doti_json`) e il modulo non lo mostrava: si potevano aggiungere senza poter
            dire che cosa alzano. */}
        {tipo === 'attivita' && <EditorDoti doti={doti} onCambia={setDoti} disabilitato={occupato} />}
        {tipo === 'domanda' && <EditorRisposte risposte={risposte} onCambia={setRisposte} disabilitato={occupato} />}
        {/* Le condizioni valgono per quel che compare e sparisce col procedere della partita. Una
            domanda in classe e una riga del cruciverba hanno già il loro giorno, che è la
            condizione: mostrare l'editor lì vorrebbe dire offrire un campo che non viene salvato. */}
        {CON_CONDIZIONI.has(tipo) && <CondizioniEditor condizioni={condizioni} onCambia={setCondizioni} disabilitato={occupato}/>}
        {!regoleValide&&<p role="alert">Completa o rimuovi i gruppi vuoti prima di salvare.</p>}
        {!nuovo && elemento.origine === 'seed' && (
          <div className="flex justify-end">
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave={elemento.nascosta ? 'sbloccato' : 'bloccato'} dimensione={20} />} titolo={elemento.nascosta ? 'Mostra di nuovo' : 'Nascondi dagli elenchi'} disabled={occupato} onClick={() => void nascondi()} />
          </div>
        )}
      </div>
    </Modal>
  );
}
