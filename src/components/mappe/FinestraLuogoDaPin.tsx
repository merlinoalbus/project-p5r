import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AnteprimaLuogoDaPinDto, LuogoCreatoDaPinDto, LuogoNuovoDaPin } from '../../../shared/luogoDaPin';
import { definizioneTipoLuogo, eTipoLuogo, type TipoLuogo } from '../../../shared/tipiLuogo';
import { descriviOrari, TESTO_REGOLA_APP, type OrariNegozio } from '../../../shared/orariNegozio';
import { anteprimaLuogoDaPin, creaLuogoDaPin, getLuogo, isApiError } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import type { LuogoDettaglioDto, MappaDto, SpilloDto } from '../../types';
import { Modal } from '../shared/Modal';
import { CampiLuogo } from '../guida/moduli/CampiLuogo';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

interface Props {
  spillo: SpilloDto;
  mappa: string;
  partita?: number;
  /** La fotografia dell'editor: la rilettura usa la sua generazione, senza un secondo caricamento concorrente. */
  mappaRiletta: MappaDto | null;
  caricamentoMappa: boolean;
  erroreMappa: string | null;
  onRileggi: () => Promise<void>;
  onRiletta: () => void;
  contestoAncoraAttivo: () => boolean;
  onChiudi: () => void;
}
interface Anteprima { dto: AnteprimaLuogoDaPinDto; bozza: string }
interface Lettura { generazione: number; prima: MappaDto | null; completata: boolean }
interface Riscontro { testo: string; libero: boolean; casa?: string }
const casaLuogo = (chiave: string) => `/guida/luogo/${chiave.split('/').map(encodeURIComponent).join('/')}`;
const messaggio = (e: unknown) => e instanceof Error ? e.message : 'Operazione non riuscita.';

function corrisponde(luogo: LuogoDettaglioDto, anteprima: AnteprimaLuogoDaPinDto): boolean {
  const atteso = anteprima.luogoPrevisto;
  if (luogo.chiave !== atteso.chiave || luogo.nome !== atteso.nome || luogo.tipo !== atteso.tipo || luogo.cosaOffre !== atteso.cosaOffre
    || luogo.quartiere !== anteprima.quartiere.chiave || luogo.area?.slug !== anteprima.area.slug || !luogo.orari) return false;
  if (atteso.orari === null) return luogo.orari.origine === 'regola-app';
  return luogo.orari.origine === 'guida' && luogo.orari.chiusoConPioggia === atteso.orari.chiusoConPioggia
    && luogo.orari.nota === atteso.orari.nota && JSON.stringify(luogo.orari.giorni) === JSON.stringify(atteso.orari.giorni)
    && JSON.stringify(luogo.orari.fasce) === JSON.stringify(atteso.orari.fasce);
}

/** Crea il luogo sul pin esistente; anteprima, ricevuta e stato osservato restano esiti distinti. */
// L12 (passo 8): nel rilascio (sola lettura) la finestra non esiste; la condizione è costante di build, `FinestraLuogoDaPinReale` esce dal bundle
export const FinestraLuogoDaPin: StrumentoDiModifica<typeof FinestraLuogoDaPinReale> = IN_RILASCIO ? NienteInRilascio : FinestraLuogoDaPinReale;
function FinestraLuogoDaPinReale({ spillo, mappa, partita, mappaRiletta, caricamentoMappa, erroreMappa,
  onRileggi, onRiletta, contestoAncoraAttivo, onChiudi }: Props) {
  const [nome, setNome] = useState(spillo.nome);
  const [tipo, setTipo] = useState<TipoLuogo | null>(null);
  const [cosaOffre, setCosaOffre] = useState('');
  const [orari, setOrari] = useState<OrariNegozio | null>(null);
  const [anteprima, setAnteprima] = useState<Anteprima | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [fase, setFase] = useState<'bozza' | 'anteprima' | 'salvataggio' | 'incerto' | 'creato'>('bozza');
  const [ricevuta, setRicevuta] = useState<LuogoCreatoDaPinDto | null>(null);
  const [lettura, setLettura] = useState<Lettura | null>(null);
  const [riscontro, setRiscontro] = useState<Riscontro | null>(null);
  const [erroreLettura, setErroreLettura] = useState<string | null>(null);
  const generazione = useRef(0);
  const elaborata = useRef<number | null>(null);
  const smontata = useRef(false);
  const mutazionePendente = useRef(false);
  const riletturaAutomatica = useRef(false);
  const identita = useRef({ id: spillo.id, uid: spillo.uid, mappa });
  const bozza = JSON.stringify({ nome, tipo, cosaOffre, orari });
  // i valori con cui si apre la finestra: nessun falso positivo all'apertura; dopo la creazione (ricevuta) i dati sono salvati e la bozza non c'è più
  const [bozzaIniziale] = useState(bozza);
  useBozzaSporca('luogo-da-pin', `luogo da pin «${spillo.nome}»`, ricevuta === null && fase !== 'creato' && bozza !== bozzaIniziale);
  const valida = nome.trim().length > 0 && nome.trim().length <= 160 && tipo !== null && cosaOffre.length <= 600;
  const occupato = fase === 'anteprima' || fase === 'salvataggio' || lettura !== null;
  const bloccoEsito = ricevuta !== null || (fase === 'incerto' && !riscontro?.libero);
  const attiva = (g: number) => !smontata.current && generazione.current === g && contestoAncoraAttivo();

  useEffect(() => {
    smontata.current = false;
    return () => { smontata.current = true; };
  }, []);

  const cambia = (azione: () => void) => {
    if (occupato || mutazionePendente.current || bloccoEsito) return;
    generazione.current++; azione(); setAnteprima(null); setErrore(null); setRiscontro(null); setFase('bozza');
  };
  const chiudi = () => { if (!occupato && !mutazionePendente.current) onChiudi(); };

  const rivedi = async () => {
    if (!valida || !tipo || occupato || mutazionePendente.current || bloccoEsito) return;
    const g = ++generazione.current;
    const input: LuogoNuovoDaPin = { nome, tipo, cosaOffre, orari };
    setFase('anteprima'); setErrore(null); setAnteprima(null); setRiscontro(null);
    try {
      const a = await anteprimaLuogoDaPin(spillo.id, { nuovo: input });
      if (!attiva(g)) return;
      if (a.spillo.id !== identita.current.id || a.spillo.uid !== identita.current.uid || a.spillo.mappa.chiave !== identita.current.mappa) {
        throw new Error('L’identità o la mappa del pin sono cambiate. Rileggi il pin prima di procedere.');
      }
      setAnteprima({ dto: a, bozza });
    } catch (e) { if (attiva(g)) setErrore(messaggio(e)); }
    finally { if (attiva(g)) setFase('bozza'); }
  };

  const rileggi = async () => {
    if (occupato || mutazionePendente.current) return;
    const g = ++generazione.current;
    setErroreLettura(null); setRiscontro(null); elaborata.current = null;
    setLettura({ generazione: g, prima: mappaRiletta, completata: false });
    try {
      await onRileggi();
      if (attiva(g)) setLettura(l => l?.generazione === g ? { ...l, completata: true } : l);
    } catch (e) {
      if (attiva(g)) { setErroreLettura(messaggio(e)); setLettura(null); }
    }
  };

  useEffect(() => {
    if (ricevuta && !riletturaAutomatica.current && !occupato) {
      riletturaAutomatica.current = true;
      void rileggi();
    }
  });

  // ricarica() risolve anche quando useCarica riceve un errore: si osservano separatamente il nuovo esito e la sua fotografia.
  useEffect(() => {
    if (!lettura?.completata || caricamentoMappa || elaborata.current === lettura.generazione || !attiva(lettura.generazione)) return;
    if (!erroreMappa && mappaRiletta === lettura.prima) return;
    const g = lettura.generazione;
    elaborata.current = g;
    const controlla = async () => {
      try {
        if (erroreMappa || !mappaRiletta) throw new Error(erroreMappa ?? 'La mappa non è disponibile.');
        if (mappaRiletta.chiave !== identita.current.mappa) throw new Error('La lettura appartiene a un’altra mappa: vista non aggiornata.');
        const pin = mappaRiletta.spilli.find(s => s.id === identita.current.id);
        if (!pin || pin.uid !== identita.current.uid || pin.mappaChiave !== identita.current.mappa) {
          setRiscontro({ libero: false, testo: 'Il pin originario non è presente con la stessa identità in questa lettura. Nessuna operazione viene ripetuta.' }); return;
        }
        onRiletta();
        if (!ricevuta && fase !== 'incerto') {
          setAnteprima(null);
          setRiscontro({ libero: false, testo: 'Vista del pin riletta. I dati del nuovo luogo sono conservati: chiedi una nuova anteprima prima di procedere.' }); return;
        }
        const atteso = ricevuta?.luogo.chiave ?? anteprima?.dto.luogoPrevisto.chiave;
        if (ricevuta) {
          setRiscontro({ libero: false, testo: pin.riferimento?.tipo === 'luogo' && pin.riferimento.chiave === atteso
            ? 'Vista aggiornata: il pin è collegato al luogo della ricevuta.'
            : 'Creazione confermata dalla ricevuta. Il pin ora mostra uno stato diverso: controlla la vista corrente.' });
        } else if (!pin.riferimento) {
          setRiscontro({ libero: true, testo: 'Stato osservato: il pin risulta senza collegamento. Questo non dimostra l’esito del tentativo precedente. Puoi rivedere i dati e chiedere una nuova anteprima; nessuna creazione viene ripetuta automaticamente.' });
          setAnteprima(null);
        } else if (pin.riferimento.tipo !== 'luogo' || pin.riferimento.chiave !== atteso || !anteprima) {
          setRiscontro({ libero: false, testo: 'Stato osservato: il pin ha un collegamento diverso da quello atteso. Nessuna creazione viene attribuita al tentativo né ripetuta.' });
        } else {
          const luogo = await getLuogo(atteso!, partita);
          if (!attiva(g)) return;
          setRiscontro({ libero: false, casa: casaLuogo(luogo.chiave), testo: corrisponde(luogo, anteprima.dto)
            ? 'Stato osservato: il pin punta al luogo atteso e i suoi dati coincidono con l’anteprima. Questa lettura non certifica quale operazione lo abbia creato.'
            : 'Stato osservato: il pin punta alla chiave attesa, ma i dati del luogo differiscono dall’anteprima. Non è una conferma del tentativo di creazione.' });
        }
      } catch (e) { if (attiva(g)) setErroreLettura(messaggio(e)); }
      finally { if (attiva(g)) setLettura(null); }
    };
    void controlla();
  });

  const salva = async () => {
    if (!anteprima || anteprima.bozza !== bozza || occupato || mutazionePendente.current || bloccoEsito) return;
    mutazionePendente.current = true;
    const g = ++generazione.current;
    setFase('salvataggio'); setErrore(null); setRiscontro(null);
    try {
      const r = await creaLuogoDaPin(spillo.id, { nuovo: anteprima.dto.nuovo, revisioneRaccordoAttesa: anteprima.dto.revisioneRaccordoAttesa });
      if (r.esito !== 'creato-collegato' || r.spillo.id !== identita.current.id || r.spillo.uid !== identita.current.uid
        || r.spillo.mappaChiave !== identita.current.mappa || r.luogo.chiave !== anteprima.dto.luogoPrevisto.chiave) {
        throw new Error('La risposta non conferma il pin e il luogo attesi. Rileggi lo stato corrente.');
      }
      if (!attiva(g)) {
        // Una ricevuta valida appartiene al gesto già concluso, anche se la sua finestra non è più montata.
        // Si notifica il vecchio bersaglio senza aggiornare il pin o la vista selezionati successivamente.
        notifica('success', `Luogo «${r.luogo.nome}» creato e collegato al pin «${anteprima.dto.spillo.nome}» della mappa «${anteprima.dto.spillo.mappa.nome}». La vista corrente non è stata modificata.`);
        return;
      }
      setRicevuta(r); setFase('creato');
    } catch (e) {
      if (!attiva(g)) return;
      if (isApiError(e) && e.status >= 400 && e.status < 500) {
        setErrore(messaggio(e)); setAnteprima(null); setFase('bozza');
      } else { setErrore(messaggio(e)); setFase('incerto'); }
    } finally { mutazionePendente.current = false; }
  };

  return <Modal titolo="Crea un luogo da questo pin" aperta onChiudi={chiudi} larga azioni={<>
    {ricevuta || fase === 'incerto'
      ? <PulsanteVisivo icona={<IconaAzione chiave="chiudi" dimensione={22} />} titolo="Chiudi" disabled={occupato} onClick={chiudi} />
      : <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={chiudi}>Annulla</button>}
    {!ricevuta && (fase !== 'incerto' || riscontro?.libero) && <PulsanteVisivo icona={<IconaAzione chiave="riapri" dimensione={22} />} titolo="Rivedi" disabled={occupato || !valida} onClick={() => void rivedi()} />}
    {!ricevuta && fase !== 'incerto' && anteprima && <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="piu" dimensione={22} />} titolo="Crea e collega questo pin" disabled={occupato || anteprima.bozza !== bozza} onClick={() => void salva()} />}
    {!ricevuta && fase !== 'incerto' && errore && <PulsanteVisivo icona={<IconaAzione chiave="ricalcola" dimensione={22} />} titolo="Rileggi il pin" disabled={occupato} onClick={() => void rileggi()} />}
    {(ricevuta || fase === 'incerto') && <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="ricalcola" dimensione={22} />} titolo="Rileggi lo stato corrente" disabled={occupato} onClick={() => void rileggi()} />}
  </>}>
    <div className="flex min-w-0 flex-col gap-3 testo-13">
      {ricevuta && <div role="status" className="flex flex-col gap-1"><strong>Luogo creato e collegato: {ricevuta.luogo.nome}.</strong>
        <span>La ricevuta conferma la creazione. La rilettura della vista è un’operazione separata.</span>
        <Link className="touch inline-flex items-center text-primary-testo" to={casaLuogo(ricevuta.luogo.chiave)}>Apri il luogo</Link></div>}
      {fase === 'incerto' && <p role="alert" className="m-0">Esito del salvataggio non confermato. Rileggi lo stato del pin prima di procedere: il tentativo non viene ripetuto.</p>}
      {errore && <p role="alert" className="m-0 break-words">{errore}</p>}
      {erroreLettura && <p role="alert" className="m-0 break-words">{ricevuta ? 'Luogo creato, vista non aggiornata. ' : 'Stato corrente non verificabile. '}{erroreLettura}</p>}
      {riscontro && <div role="status" className="flex flex-col gap-1"><p className="m-0">{riscontro.testo}</p>{riscontro.casa && <Link className="touch inline-flex items-center text-primary-testo" to={riscontro.casa}>Apri il luogo osservato</Link>}</div>}
      {occupato && <p role="status" className="m-0">{fase === 'salvataggio' ? 'Salvataggio in corso…' : lettura ? 'Rilettura in corso…' : 'Preparazione dell’anteprima…'}</p>}
      {!ricevuta && <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0" disabled={occupato || bloccoEsito}>
        <legend className="mb-2 font-semibold">Nuovo luogo</legend>
        {/* L13 (O7-5): i campi del luogo nuovo sono quelli del modulo del luogo (`CampiLuogo`); ogni cambio passa da `cambia` e annulla l'anteprima */}
        <div className="griglia-campi">
          <CampiLuogo valore={{ nome, tipo, cosaOffre, orari }} disabilitato={occupato || bloccoEsito} onCambia={(p) => {
            if (p.tipo !== undefined && (p.tipo === null || !eTipoLuogo(p.tipo))) return;
            cambia(() => {
              if (p.nome !== undefined) setNome(p.nome);
              if (p.tipo != null && eTipoLuogo(p.tipo)) setTipo(p.tipo);
              if (p.cosaOffre !== undefined) setCosaOffre(p.cosaOffre);
              if (p.orari !== undefined) setOrari(p.orari);
            });
          }} />
        </div>
      </fieldset>}
      {anteprima && !ricevuta && <section className="flex min-w-0 flex-col gap-2" aria-label="Anteprima del luogo da creare">
        <h3 className="m-0 testo-16">Anteprima</h3>
        <dl className="m-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1">
          <dt>Nome</dt><dd className="m-0 break-words">{anteprima.dto.luogoPrevisto.nome}</dd>
          <dt>Chiave</dt><dd className="m-0 break-all">{anteprima.dto.luogoPrevisto.chiave}</dd>
          <dt>Tipo</dt><dd className="m-0">{definizioneTipoLuogo(anteprima.dto.luogoPrevisto.tipo).nome}</dd>
          <dt>Offre</dt><dd className="m-0 whitespace-pre-wrap break-words">{anteprima.dto.luogoPrevisto.cosaOffre || 'Nessuna descrizione'}</dd>
          <dt>Orari</dt><dd className="m-0 break-words">{anteprima.dto.luogoPrevisto.orari ? descriviOrari(anteprima.dto.luogoPrevisto.orari) : TESTO_REGOLA_APP}</dd>
          <dt>Quartiere</dt><dd className="m-0 break-words">{anteprima.dto.quartiere.nome}</dd>
          <dt>Area</dt><dd className="m-0 break-words">{anteprima.dto.area.nome}</dd>
          <dt>Planimetria</dt><dd className="m-0 break-words">{anteprima.dto.spillo.mappa.nome}</dd>
        </dl>
        <p className="m-0">Si collega il pin «{anteprima.dto.spillo.nome}» già presente. Posizione, tipo, condizioni, immagini, voci e progressi restano; la sua descrizione resta come nota del pin.</p>
        <h4 className="m-0 testo-14">Luoghi già presenti nel quartiere ({anteprima.dto.luoghiEsistenti.length})</h4>
        {anteprima.dto.luoghiEsistenti.length === 0 ? <p className="m-0">Non risultano altri luoghi nel quartiere.</p>
          : <ul className="m-0 flex min-w-0 flex-col gap-1 pl-5">{anteprima.dto.luoghiEsistenti.map(l => <li className="break-words" key={l.chiave}>
            {l.casa && !occupato ? <Link className="text-primary-testo" to={l.casa} onClick={e => { if (mutazionePendente.current) e.preventDefault(); }}>{l.nome}</Link> : <span>{l.nome}</span>}
            {` · ${eTipoLuogo(l.tipo) ? definizioneTipoLuogo(l.tipo).nome : l.tipo} · ${l.area?.nome ?? 'Da collocare'}${l.nascosto ? ' · nascosto' : ''}`}
          </li>)}</ul>}
        <p className="m-0 text-text-muted">Controlla l’elenco prima di creare un altro luogo. Nessuno di questi viene collegato automaticamente.</p>
      </section>}
    </div>
  </Modal>;
}
