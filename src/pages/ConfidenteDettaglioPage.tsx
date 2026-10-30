// ============================================================
// ConfidenteDettaglioPage — scheda completa di un Confidente: abilità per rango, risposte migliori, regali, disponibilità (Fase 6.1)
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
// R10-27: la scheda si mostra anche nel pannello sopra il diario; questi hook, fuori dal pannello, sono quelli di react-router-dom
import { useParams, useSearchParams } from '../components/scheda/routerScheda';
import { useInPannello } from '../components/scheda/contestoScheda';
import { getConfidenteDettaglio, getConfidentiPartita, getRequisitiConfidente, impostaRegaloFatto, annullaRegaloOggetto, confermaRequisitoConfidente } from '../services/api';
import { formattaPunti } from '../utils/punti';
import { useCarica } from '../hooks/useCarica';
import { useRileggiAlCambio } from '../hooks/useRileggiAlCambio';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { ImmagineEntita } from '../components/shared/ImmagineEntita';
import { SemaforiRango } from '../components/partita/SemaforiRango';
import { EditorRequisiti } from '../components/confidenti/EditorRequisiti';
import { InvitiConfidente } from '../components/confidenti/InvitiConfidente';
import { RanghiConfidente } from '../components/confidenti/RanghiConfidente';
import { ModificaAbilita } from '../components/confidenti/ModificaAbilita';
import { ModificaDialogo } from '../components/confidenti/ModificaDialogo';
import { EditorDisponibilita } from '../components/confidenti/EditorDisponibilita';
import { DisponibilitaStrutturataScheda, EditorDisponibilitaStrutturata } from '../components/confidenti/DisponibilitaStrutturata';
import type { ConsegnaRegaloDto, RegaloConfidenteDto } from '../types';
import { DialogoRango } from '../components/confidenti/DialogoRango';
import { CollegamentoVisivo, PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IntestazioneScheda } from '../components/shared/IntestazioneScheda';
import { MenuModifica } from '../components/shared/MenuModifica';
import { IconaAzione } from '../components/shared/IconaAzione';
import { CollegamentoMappa } from '../components/mappe/CollegamentoMappa';
import { DotiIncontro } from '../components/partita/DotiIncontro';
import { sitoDellaFonte } from '../utils/fonti';
import { SceltaRegalo } from '../components/catalogo/SceltaRegalo';
import { RipristinoCostoRegalo } from '../components/catalogo/RipristinoCostoRegalo';
import { REAZIONE_FUORI_ELENCO, annulloDelRegalo, esitoDelRegalo, fraIGraditi, testoReazione } from '../../shared/regali';
import { casaOggetto } from '../../shared/catalogo';
import { ElencoConsegne } from '../components/catalogo/ConsegneRegalo';
import { raggruppaConsegne } from '../utils/consegneRegalo';
import { ChipReazione } from '../components/catalogo/ChipReazione';
import { OggettiCollegati } from '../components/catalogo/OggettiCollegati';
import { ModificaGuida } from '../components/guida/ModificaGuida';
import { TitoloSezione } from '../components/shared/TitoloSezione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/**
 * Scheda di un Confidente presa dalla chiave nell'URL: carica il dettaglio dal catalogo e, se c'è
 * una partita attiva, lo stato dei Confidenti nella partita per ricavarne rango, semafori dei
 * requisiti e regali già consegnati. Mostra intestazione con disponibilità, il prossimo passo
 * (requisiti e dialoghi fino al rango successivo, aperti), i requisiti dei ranghi seguenti, le
 * abilità per rango (attive fino al rango raggiunto), le Doti dell'incontro, tutti i dialoghi
 * apribili uno per uno, i regali con la spunta e le fonti.
 */
export function ConfidenteDettaglioPage() {
  const { chiave = '' } = useParams();
  const [params, setParams] = useSearchParams();
  // R10-27: nel pannello sopra il diario la scheda si legge e basta: i semafori non si confermano né si correggono da lì
  const nelPannello = useInPannello();
  const attiva = usePartitaStore((s) => s.attiva);
  const { dati: c, inPrimoCaricamento, errore, ricarica } = useCarica(() => getConfidenteDettaglio(chiave), [chiave]);
  // per id della partita e Confidente; ai cambi di stato della partita si rilegge senza azzerare (`mio`, Rango e semafori restano)
  const stato = useCarica(() => (attiva ? getConfidentiPartita(attiva.id) : Promise.resolve(null)), [attiva?.id, chiave]);
  useRileggiAlCambio(stato.ricarica, attiva);
  const requisiti = useCarica(() => getRequisitiConfidente(chiave), [chiave]);
  useDocumentTitle(c ? c.nome : 'Confidente');
  const [aperti, setAperti] = useState<Record<number, true>>({});
  const mio = useMemo(() => (stato.dati ?? []).find((x) => x.chiave === chiave) ?? null, [stato.dati, chiave]);
  const regaliFatti = useMemo(() => new Set(mio?.regaliFatti ?? []), [mio]);
  const regaliCatalogoFatti = useMemo(() => new Set(mio?.regaliFattiCatalogo ?? []), [mio]);
  const [regaloInCorso, setRegaloInCorso] = useState(false);
  const [sceltaRegaloPer, setSceltaRegaloPer] = useState<string | null>(null);
  /** L'oggetto già scelto quando «Regala» si apre da una riga dell'elenco (vuoto dal pulsante in alto). */
  const [regaloIniziale, setRegaloIniziale] = useState('');
  const bersaglioRegalo = `${chiave}:${attiva?.id ?? ''}`;
  const regaloConsegnato = (g: RegaloConfidenteDto): boolean => g.catalogo && mio?.regaliFattiCatalogo !== undefined
    ? regaliCatalogoFatti.has(g.catalogo.chiave) : regaliFatti.has(g.nomeStorico ?? g.nome);
  const prossimo = mio ? mio.rango + 1 : null;
  // Il recupero informativo deve restare disponibile anche se un vecchio JSON delle fonti è valido ma non è un elenco (L13, O6-2: le fonti sono
  // l'unico elenco rimasto nelle informazioni; giorni e fasce sono la disponibilità strutturata).
  const erroreInformativo = c && (!Array.isArray(c.fonti) || !c.fonti.every(x => typeof x === 'string'))
    ? 'Le fonti del Confidente sono un elenco illeggibile. Apri «Modifica informazioni del Confidente» per correggerle.' : null;

  const [confermaInCorso, setConfermaInCorso] = useState(false);
  // Lo stesso parametro apre «Correggi» dalla Partita e governa la finestra anche durante la navigazione.
  // Una copia in useState resterebbe aperta dopo un collegamento al Confidente senza il parametro.
  const rangoChiesto = Number(params.get('requisiti'));
  // L12 (passo 8): nel rilascio (sola lettura) i requisiti, le informazioni e la disponibilità del Confidente non si correggono: nessun editor, neanche da indirizzo
  const rangoDaModificare = !IN_RILASCIO && Number.isInteger(rangoChiesto) && rangoChiesto >= 1 && rangoChiesto <= 10 ? rangoChiesto : null;
  const setRangoDaModificare = (rango: number | null) => {
    const p = new URLSearchParams(params);
    if (rango === null) p.delete('requisiti'); else p.set('requisiti', String(rango));
    setParams(p, { replace: true });
  };
  // R9-01 (F4): l'editor della disponibilità strutturata; `versioneDisponibilita` rilegge la scheda dopo un salvataggio
  const [disponibilitaAperta, setDisponibilitaAperta] = useState(false);
  const [versioneDisponibilita, setVersioneDisponibilita] = useState(0);
  const informazioniAperte = !IN_RILASCIO && params.get('informazioni') === '1';
  const setInformazioniAperte = (aperta: boolean) => {
    const p = new URLSearchParams(params);
    if (aperta) p.set('informazioni', '1'); else p.delete('informazioni');
    setParams(p, { replace: true });
  };
  /** Conferma o annulla a mano un requisito di rango nella partita attiva, poi rilegge lo stato della partita; durante la richiesta i semafori sono occupati, l'errore viene notificato. */
  const conferma = async (rango: number, indice: number, confermato: boolean) => {
    if (!attiva) return;
    setConfermaInCorso(true);
    try {
      await confermaRequisitoConfidente(attiva.id, chiave, rango, indice, confermato);
      await stato.ricarica();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    } finally {
      setConfermaInCorso(false);
    }
  };

  /** Revisione dei lotti D e D2: le consegne della partita a questo Confidente, tutte (anche fuori elenco e la Cartolina), per oggetto. */
  const gruppiConsegne = useMemo(() => raggruppaConsegne(mio?.consegne ?? [], (x) => ({
    chiave: x.catalogo ?? `nome:${x.nome}`, nome: x.nome, casa: x.catalogo ? casaOggetto(x.catalogo) : null,
  })), [mio]);
  /** Toglie l'ultima consegna del gruppo: un oggetto del catalogo con ciò che l'azione «Regala» aveva fatto (proprio quella, per `id`); una
   *  consegna per nome senza oggetto con la vecchia spunta. Rilegge lo stato della partita e notifica l'esito (anche l'errore). */
  const annullaConsegna = async (ultima: ConsegnaRegaloDto) => {
    if (!attiva || regaloInCorso) return;
    setRegaloInCorso(true);
    try {
      if (ultima.catalogo) {
        const esito = await annullaRegaloOggetto(attiva.id, chiave, ultima.catalogo, ultima.id ?? undefined);
        await stato.ricarica();
        notifica('info', `${annulloDelRegalo(ultima.modo, ultima.nome)}${esito.punti < 0 ? `: −${formattaPunti(-esito.punti)} punti` : ''}${esito.acquistato ? ' e acquisto tolto' : ''}.`);
      } else {
        await impostaRegaloFatto(attiva.id, chiave, ultima.nome, false);
        await stato.ricarica();
        notifica('info', `Regalo «${ultima.nome}» segnato come non consegnato.`);
      }
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    } finally {
      setRegaloInCorso(false);
    }
  };
  /** Un regalo dell'elenco senza oggetto collegato resta la vecchia spunta per nome (quelli del catalogo si danno con «Regala»). */
  const segnaRegalo = async (g: RegaloConfidenteDto, fatto: boolean) => {
    if (!attiva || regaloInCorso) return;
    setRegaloInCorso(true);
    try {
      await impostaRegaloFatto(attiva.id, chiave, g.nomeStorico ?? g.nome, fatto);
      await stato.ricarica();
      notifica('info', fatto ? `Regalo «${g.nome}» segnato come consegnato.` : `Regalo «${g.nome}» segnato come non consegnato.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    } finally {
      setRegaloInCorso(false);
    }
  };

  // i graditi: ciò che vale più di +1, una riga con una nota, e le vecchie righe senza oggetto (la spunta per nome); le altre righe a +1 valgono
  // quanto ogni altro regalo (revisione dei lotti D e D2: presentarle come «gradite» contraddiceva la guida)
  const graditi = (c?.regali ?? []).filter(fraIGraditi);
  const altriInElenco = (c?.regali ?? []).filter((g) => !graditi.includes(g));
  // revisione dei lotti D e D2: «Regala» compare solo quando il regalo si può fare davvero, cioè a un Confidente che riceve regali e che nella
  // partita è già stato incontrato (si regala durante un ritrovo: rango 1 o più, come vuole il server). Al rango 0 il pulsante aprirebbe una
  // finestra con tutto disabilitato: al suo posto una riga dice perché
  const regalabileOra = !!attiva && !!c?.regalabile && !!mio && mio.rango > 0;
  const nonIncontrato = !!attiva && !!c?.regalabile && !!mio && mio.rango === 0;
  const rigaRegalo = (g: RegaloConfidenteDto) => (
    <li key={g.ordine} className="py-1.5 flex flex-wrap items-center gap-2 testo-13">
      {/* ondata 5: lo stesso oggetto si può ridare; le consegne già date (e il loro annullo) stanno in «Regali dati in questa partita» */}
      {regalabileOra && g.catalogo && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="regalo" dimensione={20} />} titolo="Regala" disabled={regaloInCorso || stato.caricamento}
        onClick={() => { setRegaloIniziale(g.catalogo!.chiave); setSceltaRegaloPer(bersaglioRegalo); }} aria-label={`Regala ${g.nome}`} />}
      {attiva && !g.catalogo && (
        <label className="flex items-center gap-1.5 touch">
          <input type="checkbox" className="w-5 h-5" disabled={regaloInCorso || stato.caricamento} checked={regaloConsegnato(g)} onChange={(e) => void segnaRegalo(g, e.target.checked)} aria-label={`Regalo ${g.nome} consegnato`} />
        </label>
      )}
      <strong className={!g.catalogo && regaloConsegnato(g) ? 'line-through text-text-muted' : ''}>{g.catalogo ? <Link to={g.catalogo.casa} className="touch inline-flex items-center">{g.nome}</Link> : g.nome}</strong>
      {g.reazione !== null && <ChipReazione reazione={g.reazione} />}
      {(g.dove || g.costo) && <span className="text-text-secondary">{g.catalogo && g.listinoCollegato === false ? 'Indicazioni della guida: ' : ''}{[g.dove, g.costo].filter(Boolean).join(' · ')}</span>}
      {g.nota && <span className="w-full whitespace-pre-line testo-12 text-text-muted">{g.nota}</span>}
      {!IN_RILASCIO && g.modificato && <span className="chip" title="Cambiato rispetto alla guida">Modificato</span>}
      <RipristinoCostoRegalo confidente={chiave} regalo={g} onSalvato={ricarica} />
      <ModificaGuida tipo="regalo" chiave={`${chiave}:${g.ordine}`} cosa={`il regalo «${g.nome}»`} soloIcona className="ml-auto" onSalvato={() => void ricarica()} />
    </li>
  );

  return (
    <>
    <PageState isLoading={inPrimoCaricamento} error={errore || erroreInformativo} onRetry={() => void ricarica()} scheda={{ titolo: 'Confidente', ripiego: '/partita?scheda=confidenti' }}>
      {c && !erroreInformativo && (
        <div className="flex flex-col gap-4">
          {/* Lotto B (punto 6): l'azione di gioco è il pulsante primario; gli strumenti di modifica stanno nel menu «Modifica ⋯», che
              compare con la scheda (prima «Modifica informazioni» stava fuori dallo stato della pagina e si vedeva durante il caricamento) */}
          <IntestazioneScheda ripiego="/partita?scheda=confidenti" titolo={c.nome}
            figura={<ImmagineEntita ambito="confidente" chiave={c.chiave} etichetta={c.nome} dimensione={44} forma="carta" modificabile />}
            chip={<>
              <span className="chip chip--attivo">{c.arcanaNome}</span>
              {mio && <span className="chip">Rango {mio.rango === 10 ? 'MAX' : mio.rango} nella partita</span>}
            </>}
            azioni={<>
              {/* il cassetto del Confidente nella Partita, già aperto su di lui: lì si segnano punti e rango */}
              {mio && <CollegamentoVisivo tono="primario" compatto icona={<IconaAzione chiave="su" dimensione={20} />} titolo="Aggiorna il rango"
                to={`/partita?scheda=confidenti&confidente=${encodeURIComponent(c.chiave)}`} />}
              {!IN_RILASCIO && <MenuModifica cosa={`il Confidente «${c.nome}»`}>
                <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Informazioni del Confidente"
                  aria-label="Modifica informazioni del Confidente" onClick={() => setInformazioniAperte(true)} />
                <ModificaGuida tipo="confidente" chiave={c.chiave} cosa={`il Confidente «${c.nome}»`} etichetta="Testi della guida" onSalvato={() => void ricarica()} />
              </MenuModifica>}
            </>} />
          <section className="card flex flex-col gap-2" aria-label="Disponibilità del Confidente">
              <div className="flex flex-wrap gap-2">
                <CollegamentoMappa tipo="confidente" chiave={c.chiave} compatto />
              </div>
              <div className="testo-13 text-text-secondary flex flex-col gap-1">
                {c.disponibilitaStrutturata
                  ? <DisponibilitaStrutturataScheda chiave={c.chiave} partita={attiva?.id} versione={versioneDisponibilita} onModifica={() => setDisponibilitaAperta(true)} />
                  : <span>Disponibilità non indicata.</span>}
                <span><strong className="text-text">Sblocco:</strong> {requisiti.caricamento ? 'Caricamento…' : requisiti.errore ? 'Requisiti non disponibili' : requisiti.dati?.ranghi.find((r) => r.rango === 1)?.requisiti.map((r) => r.descrizione).join(' · ') || 'Disponibile dall’inizio'}</span>
                {c.disponibilita.note && <span>{c.disponibilita.note}</span>}
              </div>
              {c.noteGenerali && <p className="m-0 testo-13 text-text-secondary whitespace-pre-wrap">{c.noteGenerali}</p>}
          </section>

          {prossimo !== null && prossimo <= 10 && c.dialoghi.some((d) => d.rango !== null && d.rango > (mio?.rango ?? 0) && d.rango <= prossimo) && (
            <section className="card flex flex-col gap-2 border-primary">
              <TitoloSezione>Prossimo passo: rango {prossimo}</TitoloSezione>
              {mio && mio.semafori.length > 0 && mio.semafori[0].rango <= prossimo && (
                <SemaforiRango semafori={mio.semafori[0]} occupato={confermaInCorso} onConferma={nelPannello ? undefined : (rango, r, confermato) => void conferma(rango, r.indice, confermato)} onCorreggi={IN_RILASCIO || nelPannello ? undefined : (rango) => setRangoDaModificare(rango)} />
              )}
              <ul className="m-0 p-0 list-none flex flex-col gap-2">
                {c.dialoghi.filter((d) => d.rango !== null && d.rango > (mio?.rango ?? 0) && d.rango <= prossimo).map((d) => (
                  <DialogoRango key={d.id} d={d} aperto onToggle={() => undefined} />
                ))}
              </ul>
            </section>
          )}

          {mio && mio.semafori.length > 1 && (
            <section className="card flex flex-col gap-3">
              <TitoloSezione>Requisiti dei ranghi successivi</TitoloSezione>
              {mio.semafori.slice(1).map((sr) => <SemaforiRango key={sr.rango} semafori={sr} compatto occupato={confermaInCorso} onConferma={nelPannello ? undefined : (rango, r, confermato) => void conferma(rango, r.indice, confermato)} onCorreggi={IN_RILASCIO || nelPannello ? undefined : (rango) => setRangoDaModificare(rango)} />)}
            </section>
          )}
          <section id="requisiti" className="card flex scroll-mt-20 flex-col gap-2">
            <TitoloSezione>Requisiti del Confidente</TitoloSezione>
            {requisiti.errore && <p className="m-0 flex flex-wrap items-center gap-2 testo-13" role="alert">{requisiti.errore} <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riprova" dimensione={20} />} titolo="Riprova" onClick={() => void requisiti.ricarica()} /></p>}
            {!IN_RILASCIO && <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica requisiti" onClick={() => setRangoDaModificare(1)} />}
          </section>
          <RanghiConfidente chiave={c.chiave} nome={c.nome} onSalvato={async () => { await Promise.all([ricarica(), stato.ricarica()]); }} />
          <InvitiConfidente filtro={{ confidente: c.chiave }} nomeConfidente={c.nome} onCambiato={async () => { await Promise.all([ricarica(), stato.ricarica()]); }} />
          <section className="card flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TitoloSezione>Abilità per rango</TitoloSezione>
              <ModificaAbilita chiave={c.chiave} nome={c.nome} onSalvato={ricarica} />
            </div>
            {c.abilita.length === 0 ? <p className="m-0 testo-13 text-text-muted">Nessuna abilità documentata.</p> : (
              <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light">
                {c.abilita.map((a, i) => (
                  <li key={i} className={`py-1.5 flex gap-3 testo-13 ${mio && a.rango <= mio.rango ? '' : 'text-text-secondary'}`}>
                    <span className={`chip shrink-0 ${mio && a.rango <= mio.rango ? 'chip--attivo' : ''}`}>{a.rango === 10 ? 'MAX' : a.rango}</span>
                    <div><strong className="text-text">{a.nome}</strong>{a.descrizione && <span> — {a.descrizione}</span>}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <DotiIncontro confidente={c} rangoPartita={mio ? mio.rango : null} onSalvato={ricarica} />

          <section className="card flex flex-col gap-2">
            <TitoloSezione>Risposte migliori per rango</TitoloSezione>
            <p className="m-0 testo-12 text-text-muted">Le scelte evidenziate danno il massimo dei punti secondo la guida; quelle in rosso avviano la relazione romantica. Registra poi le note ottenute nella scheda Confidenti della partita.</p>
            {c.dialoghi.length === 0 ? <p className="m-0 testo-13 text-text-muted">Nessun dialogo documentato.</p> : (
              <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                {c.dialoghi.map((d) => <DialogoRango key={d.id} d={d} azioni={<ModificaDialogo chiave={c.chiave} nome={c.nome} dialogo={d} onSalvato={ricarica} />} aperto={aperti[d.id] === true} onToggle={() => setAperti((a) => { const n = { ...a }; if (n[d.id]) delete n[d.id]; else n[d.id] = true; return n; })} />)}
              </ul>
            )}
          </section>

          <section className="card flex flex-col gap-2">
            <TitoloSezione>Regali graditi</TitoloSezione>
            {/* ondata 5 (RG-10, RG-11): si regala un qualunque oggetto regalo, a chi riceve regali */}
            {regalabileOra && <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="regalo" dimensione={20} />} titolo="Regala"
              disabled={regaloInCorso || stato.caricamento} onClick={() => { setRegaloIniziale(''); setSceltaRegaloPer(bersaglioRegalo); }} />}
            {nonIncontrato && <p className="m-0 testo-13 text-text-secondary text-pretty">{c.nome} non è ancora stato incontrato in questa partita: si regala durante un ritrovo.</p>}
            {regalabileOra && sceltaRegaloPer === bersaglioRegalo && <SceltaRegalo key={`${bersaglioRegalo}:${regaloIniziale}`} partita={attiva.id} confidente={chiave} nomeConfidente={c.nome} regali={c.regali} stato={mio} oggettoIniziale={regaloIniziale}
              onChiudi={() => setSceltaRegaloPer(null)} onFatto={(esito) => {
                setSceltaRegaloPer((corrente) => corrente === bersaglioRegalo ? null : corrente);
                void stato.ricarica();
                notifica('success', `${esitoDelRegalo(esito.consegna?.modo, c.nome)}${esito.punti > 0 ? `: +${formattaPunti(esito.punti)} punti` : ''}${esito.acquistato ? ' · segnato anche comprato' : ''}.`);
              }} />}
            {!c.regalabile ? <p className="m-0 testo-13 text-text-muted">Questo Confidente non accetta regali.</p> : graditi.length === 0 ? null : (
              <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light" aria-label="Regali graditi">
                {graditi.map((g) => rigaRegalo(g))}
              </ul>
            )}
            {/* ondata 5 (decisione 21): la guida non ha regali sconsigliati; quel che non è fra i graditi vale +1 */}
            {c.regalabile && <p className="m-0 testo-12 text-text-muted">{graditi.length ? 'Ogni altro' : 'Ogni'} oggetto regalo vale {testoReazione(REAZIONE_FUORI_ELENCO)}.</p>}
            {/* revisione dei lotti D e D2: le righe dell'elenco a +1 (le ex «sconsigliate») valgono quanto ogni altro regalo e non si mostrano fra i
                graditi; restano raggiungibili qui, nella preparazione, per correggerle */}
            {!IN_RILASCIO && altriInElenco.length > 0 && (
              <details className="testo-13">
                <summary className="touch inline-flex cursor-pointer items-center text-text-secondary"><span className="btn-visivo__freccia btn-visivo__freccia--menu ml-0 mr-1" aria-hidden="true">▸</span>Altre righe dell’elenco, a {testoReazione(REAZIONE_FUORI_ELENCO)} come ogni regalo ({altriInElenco.length})</summary>
                <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light" aria-label="Altre righe dell’elenco dei regali">
                  {altriInElenco.map((g) => rigaRegalo(g))}
                </ul>
              </details>
            )}
            {/* revisione dei lotti D e D2: ogni consegna della partita si vede e si annulla anche dopo aver lasciato la pagina, fuori elenco e
                Cartolina comprese, con il numero di volte per un regalo ripetuto */}
            {attiva && gruppiConsegne.length > 0 && <>
              <h3 className="m-0 mt-1 text-base">Regali dati in questa partita</h3>
              <ElencoConsegne gruppi={gruppiConsegne} occupato={regaloInCorso || stato.caricamento} etichetta={`Regali dati a ${c.nome}`}
                onAnnulla={(_g, ultima) => void annullaConsegna(ultima)} />
            </>}
          </section>

          {!!c.oggettiRicompensa?.length && <section className="card flex min-w-0 flex-col gap-2" aria-label="Oggetti ricevuti dal Confidente">
            <TitoloSezione>Oggetti ricevuti</TitoloSezione>
            <p className="m-0 testo-12 text-text-muted">Doni del Confidente secondo la guida, con le rispettive condizioni. Non sono i regali da consegnargli e non risultano automaticamente ottenuti.</p>
            <OggettiCollegati oggetti={c.oggettiRicompensa} />
          </section>}

          {c.fonti.length > 0 && (
            <p className="m-0 testo-12 text-text-muted">Fonti: {c.fonti.map((f, i) => {
              const sito = sitoDellaFonte(f);
              const separatore = i < c.fonti.length - 1 ? ', ' : '';
              return sito
                ? <a key={i} href={f} target="_blank" rel="noreferrer" className="credito">{sito}{separatore}</a>
                : <span key={i}>{f}{separatore}</span>;
            })}</p>
          )}
        </div>
      )}
      {rangoDaModificare !== null && c && <EditorRequisiti key={`${c.chiave}:${rangoDaModificare}`} confidente={{ chiave: c.chiave, nome: c.nome }} rangoIniziale={rangoDaModificare}
        onChiudi={() => setRangoDaModificare(null)} onSalvato={async () => { await Promise.all([ricarica(), stato.ricarica(), requisiti.ricarica()]); }} />}
    </PageState>
    {/* con le informazioni illeggibili la scheda non si mostra: l'editor che le corregge resta raggiungibile da qui */}
    {!IN_RILASCIO && c && erroreInformativo && <PulsanteVisivo tono="secondario" compatto className="mt-3" icona={<IconaAzione chiave="modifica" dimensione={20} />}
      titolo="Modifica informazioni del Confidente" onClick={() => setInformazioniAperte(true)} />}
    {!IN_RILASCIO && disponibilitaAperta && c && <EditorDisponibilitaStrutturata key={`struttura:${chiave}`} chiave={chiave} nome={c.nome} onChiudi={() => setDisponibilitaAperta(false)} onSalvato={async () => { setVersioneDisponibilita((v) => v + 1); await ricarica(); }} />}
    {/* dalle informazioni si passa all'editor strutturato (giorni, fasce, eccezioni, luoghi): una finestra alla volta */}
    {informazioniAperte && <EditorDisponibilita key={chiave} chiave={chiave} onChiudi={() => setInformazioniAperte(false)} onSalvato={ricarica}
      onApriDisponibilita={c?.disponibilitaStrutturata ? () => { setInformazioniAperte(false); setDisponibilitaAperta(true); } : undefined} />}
    </>
  );
}
