// ============================================================
// SchedaSpillo — la scheda di uno spillo del visore e i pezzi del suo popup: immagine e galleria, merce del negozio, azioni di stato
// ============================================================
//
// Separata da `VisoreMappa` (L11-01): il visore decide dove e quando la scheda e il popup si aprono, qui sta che cosa dicono. La scheda è
// anche quella dei contenuti della guida senza mappa (`SchedaContenutoGuida`), per questo accetta `SpilloDto | SchedaContenutoGuidaDto`.
// ============================================================

import { useState, type Ref } from 'react';
import { Link } from 'react-router-dom';
import type { SchedaContenutoGuidaDto } from '../../../shared/organizzazioneMappe';
import { eOffertaAojiru } from '../../../shared/acquisti';
import { ePezzoUnico, eRifornibile } from '../../../shared/rifornimento';
import { puntoDescrittivo, ritornoDelloStato, statoDelPin } from '../../../shared/spilli';
import { testoAvanzamento } from '../../utils/gestiVoce';
import { indirizzoElemento } from '../../utils/pannelloScheda';
import type { NavigaMappa } from '../../utils/navigazioneMappa';
import { nomePin, parolaSegnato, passaggioConArrivo } from '../../utils/paroleSpillo';
import { annullaRigaAcquisto, togliSegnoSenzaGiorno } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import type { DisponibilitaDto, ImmagineSpilloDto, SpilloDto, VoceDelPinDto } from '../../types';
import { ConsumiAojiru } from '../catalogo/ConsumiAojiru';
import { AcquistiOfferta } from '../catalogo/AcquistiOfferta';
import { CostoDellOggetto } from '../catalogo/CostoDellOggetto';
import { PrezzoScontato, RegolaDelloSconto } from '../catalogo/PrezzoScontato';
import { OggettiCollegati } from '../catalogo/OggettiCollegati';
import { ChipDisponibilita } from '../guida/ChipDisponibilita';
import { PulsanteVisivo, CollegamentoVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { SegnoStato } from '../shared/SegnoStato';
import { AssetImg } from '../shared/AssetImg';
import { Modal } from '../shared/Modal';
import { NavigazioneSpillo } from './NavigazioneSpillo';
import { IconaSpillo, PuntoSpillo } from './IconaSpillo';
import { CondizioniSpilloElenco } from './CondizioniSpillo';
import { ProveNativeSpillo } from './ProveNativeSpillo';

export type StatoPuntoMappa = 'ottenuto' | 'esaurito' | null;

/** Immagine dell'entità collegata (istanza → asset del repository); niente se l'entità non ha immagini nell'app. */
export function ImmagineRiferimento({ immagine, nome, dimensione = 56 }: { immagine: { url: string | null; asset: string | null } | null | undefined; nome: string; dimensione?: number }) {
  if (!immagine || (!immagine.url && !immagine.asset)) return null;
  const stile = { width: dimensione, height: dimensione };
  if (immagine.url) return <img src={immagine.url} alt={`Immagine: ${nome}`} className="object-contain border border-border shrink-0" style={stile} draggable={false} />;
  return <AssetImg nome={immagine.asset} alt={`Immagine: ${nome}`} className="object-contain border border-border shrink-0" style={stile} fallback={null} />;
}

/** Galleria delle schermate di riferimento dello spillo: miniature, ingrandimento in finestra. */
export function GalleriaSpillo({ immagini, nome, compatta }: { immagini: ImmagineSpilloDto[]; nome: string; compatta?: boolean }) {
  const [aperta, setAperta] = useState<ImmagineSpilloDto | null>(null);
  if (immagini.length === 0) return null;
  const d = compatta ? 48 : 72;
  return (
    <>
      <ul className="m-0 p-0 list-none flex flex-wrap gap-1" aria-label={`Schermate di ${nome}`}>
        {immagini.map((i, n) => (
          <li key={i.id}>
            <button type="button" className="p-0 border border-border bg-bg-tertiary block" style={{ width: d, height: d }} onClick={() => setAperta(i)} title={i.didascalia || `Schermata ${n + 1}`} aria-label={`Ingrandisci: ${i.didascalia || `schermata ${n + 1}`}`}>
              {i.url ? <img src={i.url} alt="" className="w-full h-full object-contain" draggable={false} /> : <AssetImg nome={i.asset} alt="" decorativa className="w-full h-full object-contain" fallback={<span className="testo-12 text-text-muted">assente</span>} />}
            </button>
          </li>
        ))}
      </ul>
      <Modal titolo={aperta?.didascalia || nome} aperta={aperta !== null} onChiudi={() => setAperta(null)} larga>
        {aperta && (aperta.url ? <img src={aperta.url} alt={aperta.didascalia || nome} className="max-w-full max-h-[75vh] mx-auto block" /> : <AssetImg nome={aperta.asset} alt={aperta.didascalia || nome} className="max-w-full max-h-[75vh] mx-auto block" fallback={<p className="m-0 testo-13 text-text-muted">Immagine non disponibile.</p>} />)}
      </Modal>
    </>
  );
}

/** La disponibilità di un articolo nella riga del visore (L7-10): con l'esito strutturato della partita vale lui — «disponibile», o il
 *  cartellino di `ChipDisponibilita` (lo stesso del listino, `ArticoliTabella`) —; senza esito, la frase delle condizioni di tempo che il
 *  server ricava dalle condizioni strutturate («dal 18 aprile», «dopo Palazzo di Madarame», «solo in primavera»), o niente. */
function DisponibilitaArticolo({ a }: { a: { disponibileDal: string | null; disponibilita?: DisponibilitaDto } }) {
  if (a.disponibilita) {
    return a.disponibilita.stato === 'disponibile'
      ? <><span>disponibile</span><ChipDisponibilita disponibilita={a.disponibilita} compatto /></>
      : <ChipDisponibilita disponibilita={a.disponibilita} compatto />;
  }
  const tempo = a.disponibileDal?.trim();
  return tempo ? <span>{tempo}</span> : null;
}

type NegozioNelPopup = NonNullable<NonNullable<SpilloDto['dettaglio']>['negozio']>;
type MerceDelNegozio = NegozioNelPopup['articoli'][number];

/**
 * Ondata 5: in vendita in questo momento della partita, anche se la scorta del ciclo è finita (o un ordine di Tanaka è in viaggio): tutte
 * le condizioni sono vere tranne la scorta. Resta in vista con la sua pastiglia («Esaurito: torna lunedì 25 aprile») e i suoi acquisti da
 * annullare: comprato l'ultimo pezzo, la riga non sparisce sotto il dito e non si confonde con ciò che «non è ancora in vendita».
 */
function inVenditaOggi(d: DisponibilitaDto | undefined): boolean {
  if (d === undefined || d.stato === 'disponibile') return true;
  return d.requisiti.some((q) => q.tipo === 'scorta') && d.requisiti.every((q) => q.tipo === 'scorta' || q.stato === 'verde');
}

/** Non è un pezzo unico (scorta che si rinnova, un servizio, l'Aojiru con le sue consumazioni, nessuna regola): niente nome barrato. Progetto
 *  dell'ondata 5, §9: si barra solo l'articolo «mai» (revisione finale, R1). */
const ripetibile = (a: MerceDelNegozio): boolean => eOffertaAojiru({ chiave: a.chiave }) || !ePezzoUnico(a.rifornimento?.regola);

/** Con la partita, l'articolo che si rifornisce si compra come nella pagina del negozio: «Compra», non una spunta da togliere e rimettere. */
const conCompra = (a: MerceDelNegozio, partitaId: number | null): partitaId is number =>
  partitaId !== null && !eOffertaAojiru({ chiave: a.chiave }) && eRifornibile(a.rifornimento?.regola ?? null) && !!a.scorta;

/**
 * Ondata 5 (decisione 21, rilievo della revisione): l'acquisto di un articolo che si rifornisce, nella mappa con lo stesso componente della
 * pagina del negozio (`AcquistiOfferta`): «Compra» aggiunge un acquisto (`onCompra`, il gesto del visore), «rimasti N di Q», gli acquisti del
 * ciclo e quelli passati, ognuno col suo «Annulla», e il segno «ottenuto» senza giorno. Annullo e segno vanno al server e poi il pin si rilegge
 * (`onAcquistiCambiati`), come fanno le consumazioni dell'Aojiru.
 */
function AcquistoDellaMerce({ a, partitaId, occupato, onCompra, onAcquistiCambiati }: { a: MerceDelNegozio; partitaId: number; occupato: boolean;
  onCompra: (articolo: string) => void; onAcquistiCambiati?: () => void | Promise<void> }) {
  const [lavoro, setLavoro] = useState(false);
  const esegui = async (azione: () => Promise<unknown>) => {
    setLavoro(true);
    try { await azione(); await onAcquistiCambiati?.(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Annullamento fallito.'); }
    finally { setLavoro(false); }
  };
  return <AcquistiOfferta articolo={a.chiave} nome={a.nome} registrati={a.acquistiRegistrati ?? []}
    bloccato={a.disponibilita !== undefined && a.disponibilita.stato !== 'disponibile'} occupato={occupato || lavoro}
    onCambia={(chiave, fatto) => { if (fatto) onCompra(chiave); }} rifornimento={a.rifornimento} scorta={a.scorta}
    onAnnullaRiga={(id) => void esegui(() => annullaRigaAcquisto(partitaId, id))}
    onTogliSegno={(k) => void esegui(() => togliSegnoSenzaGiorno(partitaId, k))} />;
}

/** La merce del negozio **in vendita adesso**, dentro il popup dello spillo di città: nome, prezzo e, con la partita, la casella «comprato»
 *  del pezzo unico o «Compra» per ciò che si rifornisce (Ondata 5), con la scorta della sede del pin. */
export function MerceNelPopup({ negozio, spillo, partitaId, occupato, onAcquisto, onAcquistiCambiati }: { negozio: NegozioNelPopup; spillo: SpilloDto; partitaId: number | null; occupato: boolean; onAcquisto?: (spillo: SpilloDto, articoloChiave: string, fatto: boolean) => Promise<void>; onAcquistiCambiati?: () => void | Promise<void> }) {
  const disponibili = negozio.articoli.filter((a) => inVenditaOggi(a.disponibilita));
  const bloccati = negozio.articoli.length - disponibili.length;
  return (
    <div className="flex flex-col gap-1" role="group" aria-label={`Merce di ${negozio.nome}`}>
      <div className="flex items-center justify-between gap-2 testo-12 text-text-muted uppercase tracking-wide">
        {/* il titolo del popup dice già il nome, quando è quello del negozio (le macchine) */}
        <span>{nomePin(spillo) === negozio.nome ? '' : `${negozio.nome} · `}{disponibili.length === 1 ? '1 articolo' : `${disponibili.length} articoli`}{partitaId ? ' adesso' : ''}</span>
        {negozio.disponibilita && negozio.disponibilita.stato !== 'disponibile' && <ChipDisponibilita disponibilita={negozio.disponibilita} compatto />}
      </div>
      {!negozio.articoli.some((a) => a.prezzoScontato) && <RegolaDelloSconto sconto={negozio.sconto} />}
      {disponibili.length === 0
        ? <p className="m-0 testo-12 text-text-secondary">{bloccati > 0 ? 'Niente in vendita in questo momento della partita.' : 'Nessun articolo registrato.'}</p>
        : (
          <ul className="spillo-popup__merce m-0 p-0 list-none flex flex-col">
            {disponibili.map((a) => (
              <li key={a.chiave} className="flex flex-wrap items-center gap-2 py-1 border-b border-border testo-12">
                {/* L'etichetta attorno alla casella è il bersaglio: era l'unica casella dell'app a
                    non averla, e restava un quadratino di 20 px (trovata cercando nel codice, non
                    nelle misure: il criterio dice di misurare l'etichetta, e qui non c'era). */}
                {!eOffertaAojiru({ chiave: a.chiave }) && !(conCompra(a, partitaId) && onAcquistiCambiati) && partitaId && onAcquisto
                  ? <label className="touch flex items-center justify-center shrink-0 -my-1 cursor-pointer"><input type="checkbox" className="w-5 h-5 shrink-0" checked={a.comprato} disabled={occupato} aria-label={`${a.nome} comprato`} onChange={(e) => void onAcquisto(spillo, a.chiave, e.target.checked)} /></label>
                  : <span className="w-5 shrink-0 text-center">{a.comprato && !ripetibile(a) && <span className="sr-only">comprato</span>}</span>}
                {/* D15: pezzo unico comprato = spunta rossa a sinistra del nome e nome barrato in grigio (il collegamento al catalogo, inline-flex, non prende la barratura del genitore: la classe sta anche su di lui) */}
                <div className="min-w-0 flex-1 break-words"><SegnoStato stato={a.comprato && !ripetibile(a) ? 'fatto' : null} dimensione={14} className="mr-1.5 align-text-bottom" /><span className={a.comprato && !ripetibile(a) ? 'stato-fatto' : ''} title={`${a.nome} · ${a.categoria}`}>{a.catalogo ? <Link to={a.catalogo.casa} className={`touch inline-flex items-center ${a.comprato && !ripetibile(a) ? 'stato-fatto' : ''}`}>{a.nome}</Link> : a.nome}</span>
                  {!!a.ricevuti?.length && <OggettiCollegati oggetti={a.ricevuti} />}</div>
                <span className="min-w-0 max-w-full tabular-nums text-text-secondary"><CostoDellOggetto costo={a.costo ?? null} prezzo={a.prezzo} prezzoPerFascia={a.prezzoPerFascia} daVerificare={a.costoDaVerificare} /></span>
                {/* revisione della chiusura dell'ondata 5 (B1): l'importo che l'acquisto da qui scala, come nel listino */}
                <PrezzoScontato scontato={a.prezzoScontato} className="min-w-0 max-w-full" />
                {a.disponibilita && a.disponibilita.stato !== 'disponibile' && <ChipDisponibilita disponibilita={a.disponibilita} compatto />}
                {partitaId !== null && onAcquistiCambiati && eOffertaAojiru({ chiave: a.chiave }) && <div className="w-full"><ConsumiAojiru key={`${partitaId}:${spillo.id}:${a.chiave}`} partitaId={partitaId} stato={a.acquisti} onCambiato={onAcquistiCambiati} /></div>}
                {conCompra(a, partitaId) && onAcquisto && onAcquistiCambiati && <div className="w-full"><AcquistoDellaMerce a={a} partitaId={partitaId} occupato={occupato}
                  onCompra={(k) => void onAcquisto(spillo, k, true)} onAcquistiCambiati={onAcquistiCambiati} /></div>}
              </li>
            ))}
          </ul>
        )}
      {bloccati > 0 && <span className="testo-12 text-text-muted">{bloccati === 1 ? '1 articolo non ancora in vendita' : `${bloccati} articoli non ancora in vendita`}: nella scheda del negozio.</span>}
    </div>
  );
}

interface PropsAzioni<T extends SpilloDto | SchedaContenutoGuidaDto> { spillo: T; occupato: boolean; onRaccolto?: (spillo: T, raccolto: boolean) => Promise<void>; onStatoPunto?: (spillo: T, voce: string, stato: StatoPuntoMappa) => Promise<void> }

/** Che cosa si potrebbe segnare con una partita attiva: le voci della guida, lo stato del pin con la sua parola, gli acquisti. */
function invitoSenzaPartita(s: SpilloDto | SchedaContenutoGuidaDto, negozio: boolean): string {
  const stato = statoDelPin(s);
  const voci = s.voci.length === 1 ? 'segnare la sua voce della guida' : s.voci.length > 1 ? 'segnare le sue voci della guida' : null;
  const cose = [voci ?? (stato ? `segnarne lo stato (${stato})` : null), negozio ? 'segnare gli acquisti' : null].filter((x): x is string => x !== null);
  return cose.join(' e ');
}

/** Una voce descrittiva della guida («Altro» fuori dalle aree dei dedali: lì ogni voce ha uno stato, 099; senza il carattere «Permanente»
 *  o «Si ripropone», 2026-10-31) si legge, non si segna (scelta dell'utente, 2026-10-01): come nella scheda del Palazzo. */
const VOCE_DESCRITTIVA = <span className="testo-12 text-text-muted">Voce descrittiva della guida: si legge, non si segna.</span>;

/** I pulsanti di una voce della guida: «Ottenuto», «Esaurito» (se esauribile), «Riapri» (se segnata); una descrittiva si legge e basta. */
function AzioniVoce<T extends SpilloDto | SchedaContenutoGuidaDto>({ spillo: s, voce, occupato, onStatoPunto }: { spillo: T; voce: VoceDelPinDto; occupato: boolean; onStatoPunto: (spillo: T, voce: string, stato: StatoPuntoMappa) => Promise<void> }) {
  if (puntoDescrittivo(voce.tipo, voce.areaDedalo, voce.carattere)) return VOCE_DESCRITTIVA;
  return (
    <>
      {voce.stato !== 'ottenuto' && <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="raggiunto" dimensione={20} />} titolo="Ottenuto" onClick={() => void onStatoPunto(s, voce.chiave, 'ottenuto')} disabled={occupato} />}
      {voce.esauribile && voce.stato !== 'esaurito' && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="esaurito" dimensione={20} />} titolo="Esaurito" onClick={() => void onStatoPunto(s, voce.chiave, 'esaurito')} disabled={occupato} />}
      {voce.stato && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Riapri" onClick={() => void onStatoPunto(s, voce.chiave, null)} disabled={occupato} />}
    </>
  );
}

/** Azioni di stato nella partita: per le voci della Guida «Ottenuto/Esaurito/Riapri» (stessi stati della scheda del Palazzo) — con più
 *  voci (098) una riga per voce, col suo nome, che si segna da sola («Voci indipendenti», 2026-10-09) —, altrimenti lo stato del pin
 *  con la parola del tipo («Raccolto», «Aperto», «Parlato», «Incontrato», «Sconfitto», «Azionato»…: `statoDelPin`) e, per toglierlo,
 *  «Richiudi» per porta e forzieri, «Annulla» per gli altri (`ritornoDelloStato`). */
export function AzioniStato<T extends SpilloDto | SchedaContenutoGuidaDto>({ spillo: s, occupato, onRaccolto, onStatoPunto }: PropsAzioni<T>) {
  if (s.voci.length === 1 && puntoDescrittivo(s.voci[0].tipo, s.voci[0].areaDedalo, s.voci[0].carattere)) return VOCE_DESCRITTIVA;
  if (s.voci.length === 1 && onStatoPunto) return <AzioniVoce spillo={s} voce={s.voci[0]} occupato={occupato} onStatoPunto={onStatoPunto} />;
  if (s.voci.length > 1 && onStatoPunto) {
    return (
      <ul className="m-0 flex w-full list-none flex-col gap-1 p-0" aria-label={`Voci della guida di ${nomePin(s)}`}>
        {s.voci.map((v) => (
          <li key={v.chiave} className="flex flex-wrap items-center gap-1" role="group" aria-label={`Voce: ${v.nome}`}>
            {/* L4 §8.11: la voce col suo contatore dei pin fatti («In corso · 2/8»); lo stato del pin sta sopra */}
            <span className="min-w-0 flex-1 basis-full testo-12 font-semibold break-words">{v.nome}{v.stato ? ` · ${v.stato}` : ''}{testoAvanzamento(v.avanzamento) ? ` · ${testoAvanzamento(v.avanzamento)}` : ''}</span>
            <AzioniVoce spillo={s} voce={v} occupato={occupato} onStatoPunto={onStatoPunto} />
          </li>
        ))}
      </ul>
    );
  }
  // la parola del tipo (tabella scelta dall'utente, 2026-10-03: `shared/spilli.ts` `STATO_PER_TIPO`)
  const stato = statoDelPin(s);
  if (stato === null || !onRaccolto) return null;
  return s.raccolto
    ? <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo={ritornoDelloStato(s).pulsante} onClick={() => void onRaccolto(s, false)} disabled={occupato} />
    : <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="raggiunto" dimensione={20} />} titolo={stato.charAt(0).toUpperCase() + stato.slice(1)} onClick={() => void onRaccolto(s, true)} disabled={occupato} />;
}

interface PropsScheda<T extends SpilloDto | SchedaContenutoGuidaDto> {
  /** Riferimento alla sezione (scorrimento e fuoco da «Dettagli»). */
  ref?: Ref<HTMLElement>;
  spillo: T;
  partitaId: number | null;
  occupato: boolean;
  nonSpaziale?: boolean;
  onNaviga?: NavigaMappa;
  onRaccolto?: (spillo: T, raccolto: boolean) => Promise<void>;
  onStatoPunto?: (spillo: T, voce: string, stato: StatoPuntoMappa) => Promise<void>;
  onAcquisto?: (spillo: T, articoloChiave: string, fatto: boolean) => Promise<void>;
  onAcquistiCambiati?: () => void | Promise<void>;
  onChiudi: () => void;
  onCentra?: () => void;
}

/** Scheda dello spillo selezionato: descrizione, entità collegata e azioni. */
export function SchedaSpillo<T extends SpilloDto | SchedaContenutoGuidaDto>({ ref, spillo: s, partitaId, occupato, onNaviga, onRaccolto, onStatoPunto, onAcquisto, onAcquistiCambiati, onChiudi, onCentra, nonSpaziale = false }: PropsScheda<T>) {
  const acquistabile = Boolean(partitaId && onAcquisto);
  const d = s.dettaglio;
  const negozio = d?.negozio ?? null;
  // Con una partita gli articoli non ancora disponibili (data, Confidente, Dote, Palazzo, meteo…)
  // sono nascosti, con un comando per vederli: stessa regola dei pin, e per la stessa ragione —
  // la vista predefinita è quel che si può comprare oggi, ma «e quello quando arriva?» è una
  // domanda che a una guida si fa. Quando compaiono portano il loro «Non ancora» accanto.
  const [mostraBloccati, setMostraBloccati] = useState(false);
  // Ondata 5: ciò che è esaurito resta in vista (è in vendita, la scorta tornerà): «non ancora in vendita» è solo ciò che le condizioni bloccano
  const bloccati = negozio ? negozio.articoli.filter((a) => !inVenditaOggi(a.disponibilita)).length : 0;
  const articoliVisibili = negozio ? (mostraBloccati ? negozio.articoli : negozio.articoli.filter((a) => inVenditaOggi(a.disponibilita))) : [];
  return (
    <section ref={ref} tabIndex={-1} className="visore-mappa__sezione visore-mappa__scheda" aria-label={`Scheda: ${nomePin(s)}`}>
      <div className="flex items-start gap-2">
        <PuntoSpillo tipo={s.tipo} colore={s.colore} grande />
        <ImmagineRiferimento immagine={d?.immagine} nome={nomePin(s)} />
        <div className="flex-1 min-w-0">
          <h3 className="m-0 font-display testo-20 leading-tight break-words">{nomePin(s)}</h3>
          {/* il nome proprio del pin, se diverso dalla meta, resta come nota (L2: «Banchina Metro», «Piano 2», «Mappa»…) */}
          {nomePin(s) !== s.nome && <p className="m-0 testo-12 text-text-muted">Pin: «{s.nome}»</p>}
          <p className="m-0 testo-12 uppercase tracking-wide text-text-muted">{s.tipoNome}{s.collezionabile ? ' · collezionabile' : ''}{s.raccolto ? ` · ${parolaSegnato(s)}` : ''}</p>
          {s.disponibilita && <ChipDisponibilita disponibilita={s.disponibilita} compatto />}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onChiudi} aria-label="Chiudi la scheda">×</button>
      </div>
      {s.descrizione && <p className="m-0 testo-13 text-text-secondary whitespace-pre-line">{s.descrizione}</p>}
      {/* L5: la descrizione propria del pin di un luogo, se diversa da quella del luogo */}
      {'notaPin' in s && s.notaPin && <p className="m-0 testo-12 text-text-muted">Nota del pin: {s.notaPin}</p>}
      {s.nativo?.daVerificare && <ProveNativeSpillo nativo={s.nativo} />}
      <CondizioniSpilloElenco condizioni={s.condizioni} disponibilita={s.disponibilita} />
      <GalleriaSpillo immagini={s.immagini} nome={nomePin(s)} />

      {!nonSpaziale && onNaviga && "mappaChiave" in s && <NavigazioneSpillo spillo={s} partitaId={partitaId} onNaviga={onNaviga} nomeMappa={s.destinazioneNomi?.mappa} nomeSpillo={s.destinazioneNomi?.spillo ?? undefined} />}
      {s.voci.length === 1 && (
        <p className="m-0 testo-12 text-text-secondary">
          {s.voci[0].esauribile ? 'Esauribile · ' : ''}{s.voci[0].stato ? `Nella Guida: ${s.voci[0].stato}` : 'Non ancora segnata nella Guida'} · <Link to={`/guida/dungeon/${encodeURIComponent(s.voci[0].dungeon)}`} className="text-primary-testo">scheda del Palazzo</Link>
        </p>
      )}
      {/* più voci (098): ognuna col suo stato; il Palazzo è lo stesso per tutte (lo controlla ogni collegamento) */}
      {s.voci.length > 1 && (
        <div className="flex flex-col gap-0.5 testo-12 text-text-secondary">
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0" aria-label="Voci della guida">
            {s.voci.map((v) => <li key={v.chiave} className="break-words">«{v.nome}»: {v.esauribile ? 'esauribile · ' : ''}{v.stato ? `nella Guida: ${v.stato}` : 'non ancora segnata nella Guida'}</li>)}
          </ul>
          <Link to={`/guida/dungeon/${encodeURIComponent(s.voci[0].dungeon)}`} className="text-primary-testo">scheda del Palazzo</Link>
        </div>
      )}
      {(d?.tipo === 'luogo' || d?.tipo === 'attivita') && d.luogo && (
        <p className="m-0 testo-12 text-text-secondary">
          {/* L5 (T5): la pagina del luogo, col suo nome; gli orari dal luogo */}
          {d.luogo.cosaOffre && d.luogo.cosaOffre !== s.descrizione ? `${d.luogo.cosaOffre} · ` : ''}{d.luogo.orariTesto ? `${d.luogo.orariTesto} · ` : ''}<Link to={d.luogo.casa ?? `/guida/citta/${encodeURIComponent(d.luogo.quartiere)}`} className="text-primary-testo">{d.luogo.casa ? d.luogo.nome : 'scheda del quartiere'}</Link>
        </p>
      )}
      {negozio && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* L5 (T5): il negozio nella pagina del suo luogo, col suo nome; se il nome è già il titolo della scheda (le macchine) non si ripete */}
            <Link to={d?.luogo?.negozi?.find((x) => x.chiave === negozio.chiave)?.casa ?? `/guida/negozi/${encodeURIComponent(negozio.chiave)}`} className="touch inline-flex items-center testo-12 font-semibold text-primary-testo">{nomePin(s) === negozio.nome ? 'scheda del negozio' : negozio.nome}</Link>
            <span className="testo-12 flex items-center gap-1.5 flex-wrap">{articoliVisibili.length} {articoliVisibili.length === 1 ? 'articolo' : 'articoli'}<ChipDisponibilita disponibilita={negozio.disponibilita} compatto /></span>
          </div>
          {/* seconda revisione della chiusura dell'ondata 5: lo sconto che non vale adesso si dice con la sua regola, come in «Dove si compra» */}
          {!negozio.articoli.some((a) => a.prezzoScontato) && <RegolaDelloSconto sconto={negozio.sconto} />}
          {bloccati > 0 && (
            <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="bloccato" dimensione={20} />} aria-pressed={mostraBloccati} onClick={() => setMostraBloccati((v) => !v)}
              titolo={mostraBloccati
                ? (bloccati === 1 ? 'Nascondi l’articolo non ancora in vendita' : `Nascondi i ${bloccati} articoli non ancora in vendita`)
                : (bloccati === 1 ? 'Mostra anche l’articolo non ancora in vendita' : `Mostra anche i ${bloccati} articoli non ancora in vendita`)} />
          )}
          {articoliVisibili.length > 0 && (
            <div className="area-scorrevole-x">
              {/* `tabella--adattiva`: nel pannello, largo 280 px, quattro colonne fisse spezzavano
                  l'intestazione lettera per lettera. La regola guarda la larghezza del contenitore,
                  non quella della finestra, quindi qui scatta anche su un monitor largo. */}
              {/* **Una riga per articolo, non una tabella impilata.**
                  La tabella adattiva va bene dove le colonne sono tante e la larghezza c'e'; qui il
                  pannello e' 280 px e impilarla dava quattro etichette maiuscole per ogni articolo —
                  dodici in tre righe — che mangiavano un terzo della larghezza e mandavano a capo
                  «Yaki-Imo leggendario», con la categoria orfana sotto. Le etichette ripetute non
                  dicevano niente che il valore non dicesse gia' da se': un prezzo si riconosce, e
                  una casella accanto al nome si capisce.
                  Qui ogni articolo e' una riga: nome e categoria in alto, prezzo e stato sotto. */}
              <ul className="visore-mappa__merce m-0 list-none p-0" aria-label={`Articoli di ${negozio.nome}`}>
                {articoliVisibili.map((a) => (
                  <li key={a.chiave} className="visore-mappa__merce-riga">
                    {acquistabile && !eOffertaAojiru({ chiave: a.chiave }) && !(conCompra(a, partitaId) && onAcquistiCambiati)
                      ? <label className="touch flex items-center justify-center shrink-0 -my-1 cursor-pointer"><input type="checkbox" className="w-5 h-5 shrink-0" checked={a.comprato} disabled={occupato}
                          onChange={(e) => void onAcquisto!(s, a.chiave, e.target.checked)} aria-label={`${a.nome} comprato`} /></label>
                      : ripetibile(a)
                        // ciò che si compra più volte non ha un «comprato» sì/no: lo dicono «Compra» e gli acquisti qui sotto
                        ? <span className="w-5 shrink-0" aria-hidden="true" />
                        : <span className="w-5 shrink-0 text-center" role="img" aria-label={a.comprato ? 'comprato' : 'non comprato'} />}
                    <div className="min-w-0 flex-1">
                      {/* D15: pezzo unico comprato = spunta rossa a sinistra del nome e nome barrato in grigio, non la categoria (il collegamento al catalogo, inline-flex, non prende la barratura del genitore: la classe sta anche su di lui) */}
                      <span className="block testo-13 leading-tight">
                        <SegnoStato stato={a.comprato && !ripetibile(a) ? 'fatto' : null} dimensione={14} className="mr-1.5 align-text-bottom" /><span className={a.comprato && !ripetibile(a) ? 'stato-fatto' : ''}>{a.catalogo ? <Link to={a.catalogo.casa} className={`touch inline-flex items-center ${a.comprato && !ripetibile(a) ? 'stato-fatto' : ''}`}>{a.nome}</Link> : a.nome}</span><span className="text-text-muted"> · {a.categoria}</span>
                      </span>
                      {!!a.ricevuti?.length && <OggettiCollegati oggetti={a.ricevuti} />}
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 testo-12 text-text-secondary">
                        <span className="tabular-nums"><CostoDellOggetto costo={a.costo ?? null} prezzo={a.prezzo} prezzoPerFascia={a.prezzoPerFascia} daVerificare={a.costoDaVerificare} /></span>
                        {/* revisione della chiusura dell'ondata 5 (B1): l'importo che l'acquisto da qui scala, come nel listino */}
                        <PrezzoScontato scontato={a.prezzoScontato} />
                        {/* L7-10: prevale l'esito strutturato della partita; la frase delle condizioni di tempo («dal 18 aprile») solo
                            senza esito (nessuna partita). «Sempre» non si dice più: senza esito non si sa, e accanto a un cartellino
                            che avvisava del contrario era una contraddizione scritta due volte sulla stessa riga. */}
                        <DisponibilitaArticolo a={a} />
                      </span>
                      {partitaId !== null && onAcquistiCambiati && eOffertaAojiru({ chiave: a.chiave }) && <ConsumiAojiru key={`${partitaId}:${s.id}:${a.chiave}`} partitaId={partitaId} stato={a.acquisti} onCambiato={onAcquistiCambiati} />}
                      {acquistabile && conCompra(a, partitaId) && onAcquistiCambiati && <AcquistoDellaMerce a={a} partitaId={partitaId} occupato={occupato}
                        onCompra={(k) => void onAcquisto!(s, k, true)} onAcquistiCambiati={onAcquistiCambiati} />}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {d?.tipo === 'confidente' && d.confidente && <CollegamentoVisivo to={`/confidenti/${encodeURIComponent(d.confidente.chiave)}`} tono="secondario" compatto icona={<IconaSpillo tipo="confidente" dimensione={20} />} titolo={d.confidente.nome} dettaglio={d.confidente.arcanaNome} />}
      {d?.tipo === 'richiesta' && d.richiesta && <CollegamentoVisivo to={indirizzoElemento('/guida/richieste', d.richiesta.chiave)} tono="secondario" compatto icona={<IconaAzione chiave="obiettivo" dimensione={20} />} titolo={d.richiesta.nome} dettaglio={d.richiesta.stato ?? 'richiesta dei Mementos'} />}

      <div className="flex flex-wrap gap-1.5">
        {!nonSpaziale && onCentra && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Centra" onClick={onCentra} />}
        {/* un passaggio con arrivo non si segna (le sue voci si segnano dalla guida) */}
        {partitaId && !passaggioConArrivo(s) && <AzioniStato spillo={s} occupato={occupato} onRaccolto={onRaccolto} onStatoPunto={onStatoPunto} />}
      </div>
      {(statoDelPin(s) !== null || s.voci.length > 0 || negozio) && !partitaId && !passaggioConArrivo(s) && <span className="testo-12 text-text-muted">Attiva una <Link to="/partita" className="text-primary-testo">partita</Link> per {invitoSenzaPartita(s, !!negozio)}.</span>}
    </section>
  );
}
