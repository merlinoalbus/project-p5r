// ============================================================
// MappaPage — i «Luoghi della guida» (albero, `IndiceLuoghi`, L11 B5) e il visore a schermo intero di una mappa (Fase 13.2)
// ============================================================

import { ImmaginiLuogo } from '../components/mappe/ImmaginiLuogo';
import { SelettoreContestoMappa } from '../components/mappe/SelettoreContestoMappa';
import { etichetteDistinte, nomePresentazioneMappa, nomeTecnicoMappa, pinDiContenuto, presentaMappa, testoPin } from '../utils/presentazioneMappa';
import { IndiceLuoghi } from '../components/mappe/IndiceLuoghi';
import { ContenutiGuidaMappa } from '../components/mappe/ContenutiGuidaMappa';
import { RisolviMappa } from '../components/mappe/RisolviMappa';
import { haPlanimetria } from '../utils/haPlanimetria';

import { casaConArrivo, casaEQuesta, urlMappa } from '../utils/navigazioneMappa';
import { useMemo, useState } from 'react';
import { Selettore } from '../components/shared/Selettore';
import type { MappaDto, MappaRiassuntoDto } from '../types';
import { AnteprimaMappa } from '../components/mappe/AnteprimaMappa';
import { centroAccessoMondo, schedaAccessoMondo, titoloSchedaAccessoMondo } from '../utils/accessoMondo';
import { etichettaMappeSorelle, nomeTipoMappa, titoloMappeSorelle, titoloModificaMappa } from '../utils/vocabolarioMappe';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { useMappaPartita } from '../hooks/useMappaPartita';
import { getAlberoMappe } from '../services/api';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { VisoreMappa } from '../components/mappe/VisoreMappa';
import { CollegamentoVisivo, PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IntestazioneScheda } from '../components/shared/IntestazioneScheda';
import { IconaAzione, IconaScheda } from '../components/shared/IconaAzione';
import { ritornoMappe } from '../utils/ritornoMappe';

/** Tokyo non ha un visore proprio: la sua mappa è quella disegnata nella Città.
 *
 * Il nodo `tokyo` dell'atlante resta — è il genitore dei quartieri, e senza di lui l'albero non
 * sta in piedi — ma la sua *planimetria* non è più una destinazione: chi ci arrivava vedeva una
 * seconda Tokyo, diversa da quella che aveva appena guardato. Il reindirizzamento è qui e non
 * solo sui collegamenti perché i modi di arrivarci sono tanti (le briciole del visore, «Su:
 * Tokyo», un indirizzo salvato) e vanno tutti a finire nello stesso posto. */
const TOKYO = 'tokyo';
const CITTA = '/guida/citta';

/**
 * Pagina delle mappe: senza chiave nell'URL mostra l'indice; con la chiave `tokyo` (anche quando
 * ci si arriva risolvendo un'altra chiave) reindirizza alla Città; altrimenti risolve la chiave
 * nella mappa vera e ne apre il dettaglio con lo stato della partita attiva.
 *
 * L2 (2026-10-20): ogni mappa ha **una casa**, l'unica pagina che la mostra. Se la casa non è questa pagina — l'illustrazione di un
 * quartiere sta nella pagina del quartiere, una planimetria del mondo nella pagina della sua Area, con la versione — si va lì,
 * portando lo spillo, il punto e il contesto: così ogni indirizzo vecchio (pubbliche, alias, «Sulla mappa» del diario) arriva al
 * posto giusto. Le mappe la cui casa è il visore (Palazzi, Memento) restano qui: nessun giro di redirect.
 */
export function MappaPage() {
  const { chiave } = useParams<{ chiave: string }>();
  const [params] = useSearchParams();
  const attiva = usePartitaStore((s) => s.attiva);
  if (!chiave) return <IndiceLuoghi />;
  if (chiave === TOKYO) return <Navigate to={CITTA} replace />;
  return <RisolviMappa chiave={chiave}>{(k, casa) => k === TOKYO ? <Navigate to={CITTA} replace />
    : casa && !casaEQuesta(casa, chiave) ? <Navigate to={casaConArrivo(casa, params)} replace />
    : <DettaglioMappa chiave={k} partitaId={attiva?.id ?? null} />}</RisolviMappa>;
}

/** Un luogo che **contiene** mappe invece di esserne una.
 *
 * È il nodo di raccolta — un Palazzo intero, un quartiere con più piante — e non ha una
 * planimetria propria. La pagina c'era già ma era tre collegamenti nudi in fila: «Scheda del
 * luogo», «Modifica luogo» e un elenco puntato di nomi. Chi ci arrivava cliccando un Palazzo
 * dall'indice trovava una lista di titoli e doveva aprirli uno per uno per capire quale fosse
 * quello che cercava.
 *
 * Ora le mappe contenute sono **una griglia di anteprime**: la forma di una pianta la si riconosce
 * a colpo d'occhio, il nome no. Le azioni sono comandi, non collegamenti in fondo alla pagina. */
function LuogoSenzaPlanimetria({ mappa, nome, albero, partitaId }: {
  mappa: MappaDto; nome: string; albero: ReturnType<typeof useCarica<MappaRiassuntoDto[]>>; partitaId: number | null;
}) {
  const contenute = useMemo(
    () => (albero.dati ?? []).filter((m) => m.genitore === mappa.chiave).sort((a, b) => a.ordine - b.ordine || a.chiave.localeCompare(b.chiave)),
    [albero.dati, mappa.chiave],
  );
  const nodo = (albero.dati ?? []).find((m) => m.chiave === mappa.chiave);
  const pinLuogo = nodo ? pinDiContenuto(nodo) : mappa.numeroSpilli;
  return <div className="flex flex-col gap-4">
    <IntestazioneScheda ripiego="/guida/mappe" titolo={nome}
      percorso={<nav aria-label="Percorso della mappa" className="flex flex-wrap items-center gap-1 testo-12 text-text-muted">
        {mappa.percorso.map((p, i) => <span key={p.chiave} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden>›</span>}
          {i === mappa.percorso.length - 1
            ? <span className="text-text">{p.nome}</span>
            : <Link to={urlMappa(p.chiave)} className="text-text-secondary">{p.nome}</Link>}
        </span>)}
      </nav>}
      chip={<>
        <span className="chip testo-12">{nomeTipoMappa(mappa)}</span>
        {/* L0: le mappe contenute si contano con la parola della gerarchia (quartieri di Tokyo, aree di un quartiere, planimetrie
            di un Palazzo); i Memento non ne hanno e non le contano */}
        {mappa.tipo !== 'dedalo' && <span className="testo-12 text-text-muted">
          {mappa.tipo === 'citta'
            ? (contenute.length === 0 ? 'nessun quartiere' : contenute.length === 1 ? 'un quartiere' : `${contenute.length} quartieri`)
            : mappa.tipo === 'quartiere'
              ? (contenute.length === 0 ? 'nessuna area' : contenute.length === 1 ? 'un’area' : `${contenute.length} aree`)
              : (contenute.length === 0 ? 'nessuna planimetria' : contenute.length === 1 ? 'una planimetria' : `${contenute.length} planimetrie`)}
          {/* E2 (L3): i pin di contenuto del luogo, dal suo nodo dell'albero (`conteggiPin`); senza, i suoi pin come prima */}
          {pinLuogo > 0 ? ` · ${testoPin(pinLuogo)}` : ''}
        </span>}
      </>}
      azioni={<>
        {mappa.radiceDi && <CollegamentoVisivo to={schedaAccessoMondo(mappa.radiceDi.tipo, mappa.radiceDi.chiave)} tono="secondario" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo={titoloSchedaAccessoMondo(mappa.radiceDi.tipo, mappa.radiceDi.chiave, mappa.nome)} />}
        <CollegamentoVisivo to={`/guida/mappe/${encodeURIComponent(mappa.chiave)}/modifica`} tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo={titoloModificaMappa(mappa)} />
        <TornaAllaPartita partitaId={partitaId} />
      </>}>
      {/* Va detto, invece di lasciarlo capire dall'assenza: questo nodo raccoglie, non disegna. */}
      {contenute.length > 0 && <p className="m-0 testo-13 text-text-secondary">Questa mappa non ha una pianta sua: raccoglie le mappe qui sotto.</p>}
    </IntestazioneScheda>
    <PageState isLoading={albero.inPrimoCaricamento} error={albero.errore} onRetry={albero.ricarica}>
      {contenute.length > 0
        ? <GriglieDelLuogo contenute={contenute} nome={nome} />
        : <p className="m-0 testo-13 text-text-muted" role="status">{mappa.tipo === 'dedalo' ? 'I Memento non hanno planimetrie: i piani si generano a ogni discesa, e i dedali stanno nella loro scheda.' : 'Qui non c’è ancora nessuna planimetria. Puoi aggiungerne una dall’editor.'}</p>}
    </PageState>
  </div>;
}

/** Le mappe di un Palazzo, divise per **utilita'** e non per ordine di estrazione.
 *
 * La pagina di un Palazzo mostrava trentaquattro riquadri uguali, in fila, con nomi come
 * «Palazzo di Kamoshida — Immagini native che nessun campo usa — tela quadrata, disegno medio —
 * la piu' estesa». Erano tre problemi in uno: le aree vere mescolate agli scarti
 * dell'estrazione, il nome del Palazzo ripetuto trentaquattro volte in una pagina che si chiama
 * col suo nome, e un vocabolario da estrattore («immagini native che nessun campo usa») dato in
 * pasto a chi gioca.
 *
 * Qui davanti vanno **le aree con un nome vero**, con o senza pin (UX3-8, L3), e i fogli
 * dell'estrazione senza nome e senza pin finiscono in un gruppo che si apre a richiesta. Non si
 * buttano: sono planimetrie vere, servono a chi cura l'atlante, ma non sono la risposta alla
 * domanda «dove devo andare».
 */
function GriglieDelLuogo({ contenute: tutte, nome, onScendi }: { contenute: MappaRiassuntoDto[]; nome: string; onScendi?: (chiave: string) => void }) {
  const [mostraFogli, setMostraFogli] = useState(false);
  // Sotto un quartiere si elencano le **aree**, una volta sola (L2): le versioni della stessa Area (il Sottopasso, il Covo) sono un
  // riquadro solo, con la predefinita e «N versioni»; i pin dell'Area si sommano su quel riquadro. E2 (L3): i pin del riquadro sono
  // quelli di contenuto contati dal server (`conteggiPin.contenuto`, `pinDiContenuto`), messi in `numeroSpilli` del riquadro; la sola
  // somma qui è quella delle versioni di un'Area in un riquadro, com'era.
  const { contenute, versioni } = useMemo(() => {
    const conteggio = new Map<string, number>();
    const spilli = new Map<string, number>();
    for (const m of tutte) if (m.area) { conteggio.set(m.area.chiave, (conteggio.get(m.area.chiave) ?? 0) + 1); spilli.set(m.area.chiave, (spilli.get(m.area.chiave) ?? 0) + pinDiContenuto(m)); }
    const scelte = new Map<string, MappaRiassuntoDto>();
    const elenco: MappaRiassuntoDto[] = [];
    for (const m of tutte) {
      if (!m.area) { elenco.push(m); continue; }
      const gia = scelte.get(m.area.chiave);
      if (!gia) { scelte.set(m.area.chiave, m); elenco.push(m); }
      else if (m.area.predefinita) { elenco[elenco.indexOf(gia)] = m; scelte.set(m.area.chiave, m); }
    }
    return { contenute: elenco.map((m) => ({ ...m, numeroSpilli: m.area ? spilli.get(m.area.chiave) ?? pinDiContenuto(m) : pinDiContenuto(m) })), versioni: conteggio };
  }, [tutte]);
  // UX3-8 (decisione del Manager, 2026-10-20; l'utente non trovava la planimetria di prova appena aggiunta): ogni Area o planimetria
  // con un nome vero sta nella griglia, nel suo ordine, anche senza pin («nessun pin»). I fogli dell'estrazione senza nome vero
  // («Planimetria non attribuita») vanno in fondo se hanno pin, e in un gruppo chiuso se non ne hanno: servono a chi cura l'atlante,
  // non sono la risposta alla domanda «dove devo andare».
  const nominate = contenute.filter((m) => !nomeTecnicoMappa(m));
  const tecnicheConPin = contenute.filter((m) => nomeTecnicoMappa(m) && m.numeroSpilli > 0);
  const tecnicheSenzaPin = contenute.filter((m) => nomeTecnicoMappa(m) && m.numeroSpilli === 0);
  const inGriglia = [...nominate, ...tecnicheConPin];
  // I titoli si numerano **una volta sola per il Palazzo**, non una per griglia: le due griglie
  // stanno nella stessa pagina, e numerando ciascuna per conto suo comparivano due «Planimetria
  // non attribuita · 1» a pochi centimetri l'una dall'altra.
  const titoli = new Map(etichetteDistinte(contenute, (t) => senzaPrefisso(t, nome)).map((t, i) => [contenute[i].chiave, t]));
  return <div className="flex flex-col gap-4">
    {inGriglia.length > 0 && <Griglia mappe={inGriglia} nome={nome} titoli={titoli} etichetta={`Contenuto di ${nome}`} onScendi={onScendi} versioni={versioni} />}
    {tecnicheSenzaPin.length > 0 && <section className="flex flex-col gap-2" aria-label="Fogli dell’estrazione senza nome">
      <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="pianta" dimensione={20} />} aria-expanded={mostraFogli} onClick={() => setMostraFogli((v) => !v)}
        titolo={`${mostraFogli ? 'Nascondi' : 'Mostra'} i fogli dell’estrazione senza nome`} dettaglio={`· ${tecnicheSenzaPin.length}`} />
      {mostraFogli && <Griglia mappe={tecnicheSenzaPin} nome={nome} titoli={titoli} etichetta={`Fogli dell’estrazione senza nome di ${nome}`} onScendi={onScendi} versioni={versioni} />}
    </section>}
  </div>;
}

/** Il nome del Palazzo non si ripete su ogni riquadro: la pagina si chiama gia' cosi'. */
function senzaPrefisso(titolo: string, nome: string): string {
  const p = `${nome} — `;
  return titolo.startsWith(p) ? titolo.slice(p.length) : titolo;
}

/**
 * Una griglia di anteprime di mappe con il titolo (quello già distinto se arriva, altrimenti
 * calcolato qui senza il nome del Palazzo), il numero di spilli sull'anteprima e quante mappe
 * contiene. Con `onScendi`, una mappa che ne contiene altre diventa un pulsante che scende nel
 * pannello; le altre sono collegamenti al visore.
 */
function Griglia({ mappe, nome, etichetta, titoli, onScendi, versioni }: { mappe: MappaRiassuntoDto[]; nome: string; etichetta: string; titoli?: Map<string, string>; onScendi?: (chiave: string) => void; versioni?: Map<string, number> }) {
  // I titoli arrivano già distinti da chi conosce **tutto** l'elenco (le due griglie di un Palazzo
  // sono la stessa pagina); dove non arrivano, si calcolano qui sull'elenco che c'è.
  const propri = titoli ?? new Map(etichetteDistinte(mappe, (t) => senzaPrefisso(t, nome)).map((t, i) => [mappe[i].chiave, t]));
  return <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-3 2xl:grid-cols-4" aria-label={etichetta}>
    {mappe.map((m) => {
      // una planimetria di un'Area si presenta col nome dell'Area, e con quante versioni ha (L2)
      const titolo = m.area?.nome ?? propri.get(m.chiave) ?? senzaPrefisso(nomePresentazioneMappa(m), nome);
      const nVersioni = m.area ? versioni?.get(m.area.chiave) ?? 1 : 1;
      const dentro = m.numeroFigli > 0;
      // Dentro il pannello dell'indice, un luogo che ne contiene altri **si apre lì**: cambiare
      // pagina per poi tornare indietro, quando si sta ancora scegliendo dove andare, fa perdere
      // il filo. Quelli che non contengono niente sono la fine della discesa e portano al visore.
      const corpo = <>
        <span className="relative">
          <AnteprimaMappa mappa={m} className="aspect-[4/3] w-full" sizes="(min-width: 1536px) 25vw, (min-width: 768px) 33vw, 50vw" />
        </span>
        <span className="flex flex-col gap-0.5">
          {/* Il numero dei pin è il dato che fa scegliere quale aprire: sta in evidenza accanto al nome. Stava sull'anteprima, ma
              con le miniature ritagliate sul disegno (UX2-13) ne copriva un angolo (residuo di L2, ripreso in L3). Decisione del PM
              dopo Test UX: i pin si dicono una volta sola, nel riquadro rosso («N pin», «1 pin», «nessun pin»); sotto restano versioni e
              contenuto, se ci sono. Il titolo tiene almeno 7rem: in una carta stretta (telefono) il riquadro va sotto il titolo invece di
              schiacciarlo sillaba per sillaba. */}
          <span className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
            <span className="min-w-0 flex-[1_1_7rem] break-words testo-13 font-semibold leading-tight group-hover:text-primary-testo">{titolo}</span>
            <span className="chip chip--attivo shrink-0 testo-12">{testoPin(m.numeroSpilli)}</span>
          </span>
          {(nVersioni > 1 || dentro) && <span className="testo-12 text-text-muted">
            {[nVersioni > 1 ? `${nVersioni} versioni` : null, dentro ? `${m.numeroFigli} dentro` : null].filter(Boolean).join(' · ')}
          </span>}
        </span>
      </>;
      const classi = 'card card--cliccabile group flex w-full flex-col gap-2 text-left no-underline text-text';
      return <li key={m.chiave} className="flex">
        {onScendi && dentro
          ? <button type="button" className={`${classi} touch`} onClick={() => onScendi(m.chiave)} aria-label={`Apri ${titolo}: ${m.numeroFigli} ${m.tipo === 'quartiere' ? (m.numeroFigli === 1 ? 'area' : 'aree') : (m.numeroFigli === 1 ? 'planimetria' : 'planimetrie')} dentro`}>{corpo}</button>
          : <Link to={m.casa || urlMappa(m.chiave)} className={classi}>{corpo}</Link>}
      </li>;
    })}
  </ul>;
}

/**
 * «Torna alla partita» (richiesta dell'utente, 2026-10-04): dal visualizzatore della mappa alla pagina Partita, sulla scheda
 * «Oggi» (correzione dell'utente: «io avevo chiesto di rimandare alla partita»; prima portava alla Home). Solo con una partita
 * attiva; «Chiudi» resta il ritorno alla pagina da cui si è entrati nelle mappe.
 */
function TornaAllaPartita({ partitaId }: { partitaId: number | null }) {
  if (partitaId === null) return null;
  return <CollegamentoVisivo to="/partita?scheda=oggi" tono="fantasma" compatto icona={<IconaScheda chiave="oggi" dimensione={20} />} titolo="Torna alla partita" />;
}

/** Visore a schermo intero con lo stato della partita attiva. */
function DettaglioMappa({ chiave, partitaId }: { chiave: string; partitaId: number | null }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const spilloIniziale = Number(params.get('spillo')) || null; const puntoIniziale = useMemo(() => centroAccessoMondo(params), [params]);
  const { mappa, caricamento, errore, ricarica, raccolto, statoPunto, acquisto } = useMappaPartita(chiave, partitaId);
  const albero = useCarica(getAlberoMappe, [chiave]);
  const presentata = mappa ? presentaMappa(mappa, params.get('contesto')) : null;
  useDocumentTitle(presentata ? `${presentata.nome} — Mappe` : 'Mappa');
  return (
    <PageState isLoading={caricamento && !mappa} error={errore} onRetry={ricarica} scheda={{ titolo: 'Mappa', ripiego: '/guida/mappe' }}>
      {mappa && <div className="flex flex-col gap-4">

        {!haPlanimetria(mappa) ? <LuogoSenzaPlanimetria mappa={mappa} nome={presentata!.nome} albero={albero} partitaId={partitaId} />
         : <><VisoreMappa
          key={`${mappa.chiave}-${spilloIniziale ?? ''}-${params.get('x') ?? ''}-${params.get('y') ?? ''}-${params.get('zoom') ?? ''}`}
          contenutiPannello={<><SelettoreContestoMappa mappa={mappa} selezione={params.get('contesto')} onCambia={id => { const q = new URLSearchParams(params); if (id) q.set('contesto', id); else q.delete('contesto'); setParams(q, { replace: true }); }} />{mappa.area ? <ImmaginiLuogo mappe={(albero.dati ?? [mappa]).filter(m => m.area?.chiave === mappa.area!.chiave)} attuale={mappa.chiave} /> : <nav aria-label={etichettaMappeSorelle(mappa.tipo)}><Selettore etichetta={titoloMappeSorelle(mappa.tipo)} valore={mappa.chiave} opzioni={(albero.dati ?? [mappa]).filter(m => m.chiave === mappa.chiave || (m.genitore === mappa.genitore && haPlanimetria(m))).map(m => ({ chiave: m.chiave, nome: nomePresentazioneMappa(m) }))} onCambia={k => navigate(urlMappa(k))} /></nav>}{/* L3 RG-1: nelle planimetrie dei Palazzi la guida si usa dal pulsante «Guida» della barra: la lista testuale non c'è più */}{mappa.area?.contenitore.tipo !== 'dungeon' && <ContenutiGuidaMappa mappa={mappa.chiave} area={params.get('area')} dungeon={mappa.radiceDi?.tipo === 'dungeon' ? mappa.radiceDi.chiave : undefined} />}</>}
          guida={{ onCambiato: () => { void ricarica(); } }}
          mappa={presentata!}
          partitaId={partitaId}
          selezioneIniziale={spilloIniziale} puntoIniziale={puntoIniziale}
          onNaviga={(k, arrivo) => navigate(urlMappa(k, arrivo))}
          onRaccolto={raccolto}
          onStatoPunto={statoPunto}
          onAcquisto={acquisto}
          onAcquistiCambiati={ricarica}
          onChiudi={() => navigate(ritornoMappe() ?? '/guida/mappe')}
          ritorno={<TornaAllaPartita partitaId={partitaId} />}
          azioni={<>{mappa.radiceDi && <CollegamentoVisivo icona={<IconaAzione chiave="scheda" dimensione={22} />} titolo={titoloSchedaAccessoMondo(mappa.radiceDi.tipo, mappa.radiceDi.chiave, mappa.nome)} to={schedaAccessoMondo(mappa.radiceDi.tipo, mappa.radiceDi.chiave)} />}<CollegamentoVisivo to={`/guida/mappe/${encodeURIComponent(mappa.chiave)}/modifica`} tono="secondario" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo={titoloModificaMappa(mappa)} /></>}
        /></>}
        {!haPlanimetria(mappa) && <ContenutiGuidaMappa mappa={mappa.chiave} area={params.get('area')} dungeon={mappa.radiceDi?.tipo === 'dungeon' ? mappa.radiceDi.chiave : undefined} />}
      </div>}
    </PageState>
  );
}
