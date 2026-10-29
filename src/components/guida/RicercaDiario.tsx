// ============================================================
// RicercaDiario — barra di ricerca del Diario e vista dei risultati (Guida › Giorno per giorno, 2026-10-29)
// ============================================================
//
// Richieste dell'utente: «mi servirebbe la possibilità di cercare nella guida giorno per giorno, tutte le voci del diario che contengono una
// parola o per tipologia... deve essere una ricerca basata sui valori di che cosa fare e note.» e «ovviamente devo poter visualizzare i
// risultati del filtro/ricerca in modo comodo...».
//
//   - `BarraRicercaDiario`: il campo (testo in «Che cosa fare» e note) e il tipo della voce; con una ricerca attiva resta in cima mentre la
//     pagina scorre (`fissa`) e offre «Cancella ricerca». Sta sempre nello stesso punto della pagina, così scrivendo il campo non perde il fuoco
//     quando il giorno lascia il posto ai risultati.
//   - `RisultatiRicercaDiario`: al posto del giorno, a tutta larghezza; il numero dei risultati (annunciato), poi i risultati per mese e per
//     giorno («martedì 12 aprile»), una riga per voce: fascia, testo con le parole evidenziate, collegamento, note ridotte se lunghe,
//     «Spuntando: …» e, con la partita, «Fatta». Un tocco apre il giorno sulla voce; tornando, la riga della voce riprende il fuoco.
//     Scorrono con la pagina: nessuna area scorrevole dentro.
// La lettura dal server sta in `hooks/useRicercaDiario.ts`, gli aiuti (tipo dall'indirizzo, ritorno ai risultati) in `utils/ricercaDiario.ts`.
// ============================================================

import { useEffect, useId, useMemo, useRef, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CampoRicerca } from '../shared/CampoRicerca';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { IconaFascia } from './FasciaGiornata';
import { TIPI_AZIONE, type TipoAzione } from '../../../shared/effettiAzione';
import { MINIMO_CARATTERI_RICERCA_DIARIO, inizioEstrattoRicerca, paroleRicercaDiario, pezziEvidenziati, piattoRicercaDiario, type RicercaDiarioDto, type RisultatoRicercaDiarioDto } from '../../../shared/ricercaDiario';
import { giornoDellaSettimana } from '../../../shared/date';
import { dataGiocoTesto, meseGioco } from '../../utils/dateGioco';
import { descrizioneRicerca, nomeTipoVoce as nomeTipo, testoSufficiente, tipoDaIndirizzo, type RitornoRicercaDiario } from '../../utils/ricercaDiario';
import type { RicercaDiario } from '../../hooks/useRicercaDiario';

// ---------------------------------------------------------------- barra

interface PropsBarra {
  testo: string;
  onTesto: (v: string) => void;
  tipo: TipoAzione | null;
  onTipo: (t: TipoAzione | null) => void;
  /** Con una ricerca attiva: la barra resta in cima scorrendo e offre «Cancella ricerca». */
  attiva: boolean;
  onCancella: () => void;
  /** Quante voci per tipo corrispondono al testo: il selettore lo dice accanto al nome (solo con un testo cercato). */
  perTipo?: RicercaDiarioDto['perTipo'] | null;
  /** L'id del campo, per rimettervi il fuoco dopo «Cancella ricerca». */
  idCampo: string;
}

/** Il campo di ricerca e il tipo della voce; con una ricerca attiva, fissi in cima con «Cancella ricerca». */
export function BarraRicercaDiario({ testo, onTesto, tipo, onTipo, attiva, onCancella, perTipo, idCampo }: PropsBarra) {
  // il numero accanto al tipo ha senso solo quando c'è un testo cercato (altrimenti direbbe solo quante voci ha ogni tipo nell'anno)
  const conteggi = perTipo && testoSufficiente(testo) ? perTipo : null;
  return (
    <div role="search" className={`ricerca-diario__barra ${attiva ? 'ricerca-diario__barra--fissa' : ''}`} aria-label="Cerca nel Diario">
      {/* base 15rem: sul telefono in verticale il campo prende la riga e tipo e «Cancella» vanno sotto; da circa 600 px tutto sta su una riga
          (telefono in orizzontale compreso), così la barra fissa resta bassa */}
      <CampoRicerca valore={testo} onCambia={onTesto} segnaposto="Cerca nel Diario (che cosa fare, note)" className="basis-60" id={idCampo} />
      <Selettore compatto etichetta="Tipo di voce" valore={tipo ?? ''} vuoto="Tutti i tipi" ricerca="mai"
        opzioni={TIPI_AZIONE.map((t) => ({ chiave: t.chiave, nome: t.nome, dettaglio: conteggi ? String(conteggi[t.chiave] ?? 0) : undefined }))}
        onCambia={(k) => onTipo(tipoDaIndirizzo(k))} />
      {attiva && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Cancella ricerca" onClick={onCancella} />}
    </div>
  );
}

/**
 * Nel giorno aperto da un risultato: «Torna ai risultati» con ciò che si cercava, fisso in cima mentre la pagina scorre (come la barra della
 * ricerca), perché la voce aperta sta a metà schermo e il comando in cima al giorno resterebbe fuori vista.
 */
export function BarraRitornoRisultati({ ritorno, onTorna }: { ritorno: RitornoRicercaDiario; onTorna: () => void }) {
  return (
    <div className="ricerca-diario__barra ricerca-diario__barra--fissa">
      <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="indietro" dimensione={20} />} titolo="Torna ai risultati" dettaglio={descrizioneRicerca(ritorno)} onClick={onTorna} />
    </div>
  );
}

// ---------------------------------------------------------------- risultati

/** Il testo con le parole cercate evidenziate (`<mark>`). */
function Evidenziato({ testo, parole }: { testo: string; parole: readonly string[] }) {
  return <>{pezziEvidenziati(testo, parole).map((p, i) => (p.evidenziato ? <mark key={i} className="ricerca-diario__evidenza">{p.testo}</mark> : <span key={i}>{p.testo}</span>))}</>;
}

/** «martedì 12 aprile». */
function intestazioneGiorno(giorno: string): string {
  const settimana = giornoDellaSettimana(giorno);
  return `${settimana ? `${settimana.toLowerCase()} ` : ''}${dataGiocoTesto(giorno)}`;
}

interface GruppoMese { mese: string; giorni: Array<{ giorno: string; voci: RisultatoRicercaDiarioDto[] }>; totale: number }

/** I risultati (già nell'ordine del calendario) per mese e per giorno, nello stesso ordine. */
function perMeseEGiorno(risultati: readonly RisultatoRicercaDiarioDto[]): GruppoMese[] {
  const out: GruppoMese[] = [];
  for (const r of risultati) {
    const mese = r.giorno.slice(0, 2);
    let m = out[out.length - 1];
    if (!m || m.mese !== mese) { m = { mese, giorni: [], totale: 0 }; out.push(m); }
    let g = m.giorni[m.giorni.length - 1];
    if (!g || g.giorno !== r.giorno) { g = { giorno: r.giorno, voci: [] }; m.giorni.push(g); }
    g.voci.push(r);
    m.totale += 1;
  }
  return out;
}

const voci = (n: number): string => (n === 1 ? '1 voce' : `${n} voci`);

/**
 * Le note da mostrare nella riga, ridotta a poche righe: se una parola cercata non è in «Che cosa fare» e nelle note compare solo dopo
 * l'inizio, la riga mostra le note dal punto della parola («…» davanti), così si vede perché la voce è stata trovata; altrimenti tutte.
 */
function noteDaMostrare(r: RisultatoRicercaDiarioDto, parole: readonly string[]): string | null {
  if (!r.note) return null;
  const azione = piattoRicercaDiario(r.azione);
  const mancanti = parole.filter((p) => !azione.includes(p));
  const da = inizioEstrattoRicerca(r.note, mancanti);
  return da > 0 ? `…${r.note.slice(da)}` : r.note;
}

/** Una voce trovata: un collegamento che apre il suo giorno sulla voce. */
function RigaRisultato({ r, parole, conTipo, q, tipo }: { r: RisultatoRicercaDiarioDto; parole: readonly string[]; conTipo: boolean; q: string; tipo: TipoAzione | null }) {
  const ritornoRicerca: RitornoRicercaDiario = { q, tipo, voce: r.uid, passi: 1 };
  const posizione = useLocation();
  const navigate = useNavigate();
  const note = noteDaMostrare(r, parole);
  // prima di aprire la voce, la voce di cronologia dei risultati ricorda la riga (`voceDiRitorno`): tornando anche con «indietro» del
  // sistema la riga torna in vista e riprende il fuoco (stesso modo dell'«Entra» nei Palazzi, `PartiAzione.ricordaVoce`). Con i tasti
  // che aprono altrove (nuova scheda, finestra) la pagina resta questa e non serve
  const ricordaRiga = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const stato = posizione.state && typeof posizione.state === 'object' ? posizione.state as Record<string, unknown> : {};
    navigate({ pathname: posizione.pathname, search: posizione.search, hash: posizione.hash }, { replace: true, state: { ...stato, voceDiRitorno: r.uid } });
  };
  return (
    <li>
      <Link id={`ricerca-voce-${r.uid}`} className="ricerca-diario__voce" to={{ pathname: `/guida/percorso/${r.giorno}`, search: `?voce=${r.uid}`, hash: `#voce-${r.uid}` }} state={{ ritornoRicerca }} onClick={ricordaRiga}>
        <span className="ricerca-diario__fascia">
          <IconaFascia fascia={r.fascia} dimensione={18} className="w-5 h-5 object-contain shrink-0" />
          <span>{r.fascia === 'sera' ? 'Di sera' : 'Di giorno'}</span>
          {conTipo && <span className="ricerca-diario__tipo">{nomeTipo(r.tipo)}</span>}
          {r.fatta && <span className="chip chip--attivo testo-12">Fatta</span>}
        </span>
        <span className="ricerca-diario__corpo">
          <span className="ricerca-diario__azione">
            <Evidenziato testo={r.azione} parole={parole} />
            {r.riferimentoTesto && <span className="ricerca-diario__collegamento"> · {r.riferimentoTesto}</span>}
          </span>
          {note && <span className="ricerca-diario__note"><Evidenziato testo={note} parole={parole} /></span>}
        </span>
        {r.spuntando.length > 0 && <span className="ricerca-diario__effetto"><span className="ricerca-diario__etichetta">Spuntando:</span> {r.spuntando.join('; ')}</span>}
      </Link>
    </li>
  );
}

interface PropsRisultati {
  q: string;
  tipo: TipoAzione | null;
  ricerca: RicercaDiario;
  /** Con la partita attiva: il riepilogo dice anche quante voci trovate sono fatte. */
  conPartita: boolean;
  /** La voce da cui si torna («Torna ai risultati»): la sua riga riprende il fuoco e torna in vista. */
  voceDiRitorno: string | null;
  onTogliTipo: () => void;
}

/** La vista dei risultati, al posto del giorno: riepilogo annunciato, poi i risultati per mese e per giorno. */
export function RisultatiRicercaDiario({ q, tipo, ricerca, conPartita, voceDiRitorno, onTogliTipo }: PropsRisultati) {
  const idTitolo = useId();
  const testo = q.trim();
  const parole = useMemo(() => paroleRicercaDiario(testoSufficiente(testo) ? testo : ''), [testo]);
  const { dati, inCorso, errore, riprova } = ricerca;
  const gruppi = useMemo(() => perMeseEGiorno(dati?.risultati ?? []), [dati]);
  // tornando dalla voce aperta, la sua riga torna in vista e riprende il fuoco (una volta per ritorno)
  const ripresa = useRef<string | null>(null);
  useEffect(() => {
    if (!voceDiRitorno || !dati || ripresa.current === voceDiRitorno) return;
    const riga = document.getElementById(`ricerca-voce-${voceDiRitorno}`);
    if (!riga) return;
    ripresa.current = voceDiRitorno;
    riga.scrollIntoView({ block: 'center' });
    riga.focus({ preventScroll: true });
  }, [voceDiRitorno, dati]);

  // la vista c'è solo con una ricerca valida (`PercorsoPage`: almeno due lettere o un tipo), quindi qui c'è sempre qualcosa da cercare
  let riepilogo: string;
  if (errore) riepilogo = 'La ricerca non è riuscita.';
  else if (!dati) riepilogo = 'Cerco…';
  else {
    const fatte = conPartita ? dati.risultati.filter((r) => r.fatta).length : 0;
    riepilogo = `${dati.totale === 1 ? '1 voce trovata' : `${dati.totale} voci trovate`}${dati.q ? ` con «${dati.q}»` : ''}${dati.tipo ? ` fra le voci «${nomeTipo(dati.tipo)}»` : ''}${fatte ? `, ${fatte} già ${fatte === 1 ? 'fatta' : 'fatte'} nella partita` : ''}.`;
    // con il tipo scelto e una lettera sola il testo non si cerca ancora: lo si dice, altrimenti sembrerebbe ignorato
    if (testo && !testoSufficiente(testo)) riepilogo += ` Per cercare nel testo scrivi almeno ${MINIMO_CARATTERI_RICERCA_DIARIO} lettere.`;
  }
  // senza risultati con un tipo scelto: quante voci troverebbe lo stesso testo con gli altri tipi
  const senzaTipo = dati && dati.totale === 0 && dati.tipo && dati.q ? Object.values(dati.perTipo).reduce((s, n) => s + (n ?? 0), 0) : 0;

  return (
    <section className="ricerca-diario__risultati" aria-labelledby={idTitolo} aria-busy={inCorso || undefined}>
      <h2 id={idTitolo} className="sr-only">Risultati della ricerca nel Diario</h2>
      <p className="m-0 testo-14 text-text-secondary" role="status" aria-live="polite" aria-atomic="true">{riepilogo}</p>
      {errore && <div><PulsanteVisivo compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={riprova} /></div>}
      {dati && dati.totale === 0 && (
        <div className="card flex flex-col items-start gap-2">
          <p className="m-0">Nessuna voce del Diario {dati.q ? <>contiene «{dati.q}» in «Che cosa fare» o nelle note</> : 'è di questo tipo'}{dati.tipo && dati.q ? <> fra le voci «{nomeTipo(dati.tipo)}»</> : null}.</p>
          {senzaTipo > 0 && <PulsanteVisivo compatto icona={<IconaAzione chiave="tutti" dimensione={20} />} titolo="Cerca in tutti i tipi" dettaglio={voci(senzaTipo)} onClick={onTogliTipo} />}
        </div>
      )}
      {gruppi.length > 0 && (
        <div className={`flex flex-col gap-4 ${inCorso ? 'ricerca-diario__in-corso' : ''}`}>
          {gruppi.map((m) => (
            <section key={m.mese} className="flex flex-col gap-2" aria-label={`${meseGioco(`${m.mese}-01`)}, ${voci(m.totale)}`}>
              <h3 className="ricerca-diario__mese">{meseGioco(`${m.mese}-01`)} <span className="ricerca-diario__conteggio">{voci(m.totale)}</span></h3>
              {m.giorni.map((g) => (
                <div key={g.giorno} className="card ricerca-diario__giorno">
                  <h4 className="ricerca-diario__data">{intestazioneGiorno(g.giorno)}</h4>
                  <ul className="m-0 p-0 list-none divide-y divide-border-light">
                    {g.voci.map((r) => <RigaRisultato key={r.uid} r={r} parole={parole} conTipo={!dati?.tipo} q={q} tipo={tipo} />)}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
