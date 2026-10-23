// ============================================================
// ConfidenteDettaglioPage — scheda completa di un Confidente: abilità per rango, risposte migliori, regali, disponibilità (Fase 6.1)
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
// R10-27: la scheda si mostra anche nel pannello sopra il diario; questi hook, fuori dal pannello, sono quelli di react-router-dom
import { useNavigate, useParams, useSearchParams } from '../components/scheda/routerScheda';
import { useInPannello } from '../components/scheda/contestoScheda';
import { getConfidenteDettaglio, getConfidentiPartita, getRequisitiConfidente, impostaRegaloFatto, annullaRegaloOggetto, confermaRequisitoConfidente } from '../services/api';
import { formattaPunti } from '../utils/punti';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { ImmagineEntita } from '../components/shared/ImmagineEntita';
import { SemaforiRango } from '../components/partita/SemaforiRango';
import { EditorRequisiti } from '../components/confidenti/EditorRequisiti';
import { InvitiConfidente } from '../components/confidenti/InvitiConfidente';
import { EditorDisponibilita } from '../components/confidenti/EditorDisponibilita';
import { IconChevronLeft } from '../components/shared/icons';
import type { DialogoConfidenteDto, RegaloConfidenteDto } from '../types';
import { CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { CollegamentoMappa } from '../components/mappe/CollegamentoMappa';
import { DotiIncontro } from '../components/partita/DotiIncontro';
import { sitoDellaFonte } from '../utils/fonti';
import { SceltaRegalo } from '../components/catalogo/SceltaRegalo';
import { RipristinoCostoRegalo } from '../components/catalogo/RipristinoCostoRegalo';
import { OggettiCollegati } from '../components/catalogo/OggettiCollegati';

/** Un dialogo di rango: scelte in ordine, con le migliori evidenziate (punti massimi), le romantiche e gli avvisi. */
export function DialogoRango({ d, aperto, onToggle }: { d: DialogoConfidenteDto; aperto: boolean; onToggle: () => void }) {
  const max = Math.max(0, ...d.scelte.map((s) => s.punti ?? 0));
  return (
    <li className="border border-border-light rounded-lg">
      {/* Il rango e il conteggio non si spezzano e non si comprimono: senza `shrink-0` la nota in
          mezzo si prendeva tutta la riga e loro finivano incolonnati lettera per lettera — «R a n g
          o 1» alto 135 px sul telefono. La nota, che è la parte elastica, va a capo per prima. */}
      <button type="button" className="w-full text-left px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-1 touch" onClick={onToggle} aria-expanded={aperto}>
        <span className="font-semibold shrink-0 whitespace-nowrap">Rango {d.etichetta}</span>
        <span className="min-w-0 flex-1 text-[12px] text-text-muted">{d.note}</span>
        <span className="shrink-0 whitespace-nowrap text-[12px] text-text-muted">{d.scelte.length} {d.scelte.length === 1 ? 'scelta' : 'scelte'}</span>
      </button>
      {/* Un rango senza scelte da fare esiste — il primo e l'ultimo di molti Confidenti — e aprendolo
          restava una striscia di dodici pixel di solo padding: il vuoto non dice che non c'è niente,
          lo fa solo sembrare rotto (rilievo del validatore, 2026-09-13). */}
      {aperto && d.scelte.length === 0 && (
        <p className="m-0 px-3 pb-3 text-[13px] text-text-muted">Nessuna scelta da fare in questo rango.</p>
      )}
      {aperto && d.scelte.length > 0 && (
        <ol className="m-0 px-3 pb-3 list-none flex flex-col gap-1 text-[13px]" aria-label={`Scelte del rango ${d.etichetta}`}>
          {d.scelte.map((s) => (
            <li key={s.ordine} className={`flex flex-wrap items-center gap-2 rounded-md px-2 py-1 ${s.punti !== null && s.punti === max && max > 0 ? 'bg-primary-bg' : ''}`}>
              <span className="text-text-muted w-5">{s.ordine}.</span>
              <span className={s.romantica ? 'text-primary font-semibold' : ''}>{s.testo}</span>
              {s.puntiTesto && <span className="chip" title="Punti secondo la guida">{s.puntiTesto}</span>}
              {s.romantica && <span className="chip chip--attivo" title="Scelta che avvia o riguarda la relazione romantica">romantica</span>}
              {s.avviso && <span className="text-[12px] text-warning">{s.avviso}</span>}
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

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
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  // R10-27: nel pannello sopra il diario la scheda si legge e basta: i semafori non si confermano né si correggono da lì
  const nelPannello = useInPannello();
  const attiva = usePartitaStore((s) => s.attiva);
  const { dati: c, caricamento, errore, ricarica } = useCarica(() => getConfidenteDettaglio(chiave), [chiave]);
  const stato = useCarica(() => (attiva ? getConfidentiPartita(attiva.id) : Promise.resolve(null)), [attiva, chiave]);
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
  // Il recupero informativo deve restare disponibile anche se un vecchio JSON è valido ma non è un elenco.
  const erroreInformativo = c && [c.disponibilita.giorni, c.disponibilita.fasce, c.fonti]
    .some(v => !Array.isArray(v) || !v.every(x => typeof x === 'string'))
    ? 'Le informazioni della disponibilità contengono un elenco illeggibile. Apri «Modifica informazioni del Confidente» per correggere i soli campi interessati.' : null;

  const [confermaInCorso, setConfermaInCorso] = useState(false);
  // Lo stesso parametro apre «Correggi» dalla Partita e governa la finestra anche durante la navigazione.
  // Una copia in useState resterebbe aperta dopo un collegamento al Confidente senza il parametro.
  const rangoChiesto = Number(params.get('requisiti'));
  const rangoDaModificare = Number.isInteger(rangoChiesto) && rangoChiesto >= 1 && rangoChiesto <= 10 ? rangoChiesto : null;
  const setRangoDaModificare = (rango: number | null) => {
    const p = new URLSearchParams(params);
    if (rango === null) p.delete('requisiti'); else p.set('requisiti', String(rango));
    setParams(p, { replace: true });
  };
  const informazioniAperte = params.get('informazioni') === '1';
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

  /** Un regalo del catalogo si dà con «Regala» (azione unica: punti, consegna, acquisto) e qui si annulla con ciò che aveva fatto; un regalo
   *  senza oggetto collegato resta la vecchia spunta per nome. Rilegge lo stato della partita e notifica l'esito (anche l'errore). */
  const segnaRegalo = async (g: RegaloConfidenteDto, fatto: boolean) => {
    if (!attiva || regaloInCorso) return;
    setRegaloInCorso(true);
    try {
      if (g.catalogo) {
        const esito = await annullaRegaloOggetto(attiva.id, chiave, g.catalogo.chiave);
        await stato.ricarica();
        notifica('info', `Consegna di «${g.nome}» annullata${esito.punti < 0 ? `: −${formattaPunti(-esito.punti)} punti` : ''}${esito.acquistato ? ' e acquisto tolto' : ''}.`);
        return;
      }
      await impostaRegaloFatto(attiva.id, chiave, g.nomeStorico ?? g.nome, fatto);
      await stato.ricarica();
      notifica('info', fatto ? `Regalo «${g.nome}» segnato come consegnato.` : `Regalo «${g.nome}» segnato come non consegnato.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.');
    } finally {
      setRegaloInCorso(false);
    }
  };

  return (
    <>
    <div className="flex justify-end mb-3"><button type="button" className="btn btn-secondary touch" onClick={() => setInformazioniAperte(true)}>Modifica informazioni del Confidente</button></div>
    <PageState isLoading={caricamento} error={errore || erroreInformativo} onRetry={() => void ricarica()}>
      {c && !erroreInformativo && (
        <div className="flex flex-col gap-4">
          {!nelPannello && <button type="button" className="btn btn-ghost self-start -ml-2" onClick={() => navigate(-1)}><IconChevronLeft size={18} /> Indietro</button>}
          <header className="card flex items-center gap-3">
            <ImmagineEntita ambito="confidente" chiave={c.chiave} etichetta={c.nome} dimensione={64} forma="carta" modificabile />
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="titolo-display m-0 text-[24px] leading-tight">{c.nome}</h1>
                <span className="chip chip--attivo">{c.arcanaNome}</span>
                {mio && <span className="chip">Rango {mio.rango === 10 ? 'MAX' : mio.rango} nella partita</span>}
              </div>
            </div>
          </header>
          <section className="card flex flex-col gap-2" aria-label="Disponibilità del Confidente">
              <div className="flex flex-wrap gap-2">
                {mio && <CollegamentoVisivo tono="fantasma" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Aggiorna il rango" to="/partita?scheda=confidenti" />}
                <CollegamentoMappa tipo="confidente" chiave={c.chiave} compatto />
              </div>
              <div className="text-[13px] text-text-secondary flex flex-col gap-1">
                <span><strong className="text-text">Dove:</strong> {c.disponibilita.luogo || '—'}</span>
                <span><strong className="text-text">Quando:</strong> {c.disponibilita.giorni.join(', ') || '—'}{c.disponibilita.fasce.length ? ` · ${c.disponibilita.fasce.join(', ')}` : ''}</span>
                <span><strong className="text-text">Sblocco:</strong> {requisiti.caricamento ? 'Caricamento…' : requisiti.errore ? 'Requisiti non disponibili' : requisiti.dati?.ranghi.find((r) => r.rango === 1)?.requisiti.map((r) => r.descrizione).join(' · ') || 'Disponibile dall’inizio'}</span>
                {c.disponibilita.note && <span>{c.disponibilita.note}</span>}
              </div>
              {c.noteGenerali && <p className="m-0 text-[13px] text-text-secondary whitespace-pre-wrap">{c.noteGenerali}</p>}
          </section>

          {prossimo !== null && prossimo <= 10 && c.dialoghi.some((d) => d.rango !== null && d.rango > (mio?.rango ?? 0) && d.rango <= prossimo) && (
            <section className="card flex flex-col gap-2 border-primary">
              <h2 className="m-0 text-[15px] font-semibold">Prossimo passo: rango {prossimo}</h2>
              {mio && mio.semafori.length > 0 && mio.semafori[0].rango <= prossimo && (
                <SemaforiRango semafori={mio.semafori[0]} occupato={confermaInCorso} onConferma={nelPannello ? undefined : (rango, r, confermato) => void conferma(rango, r.indice, confermato)} onCorreggi={nelPannello ? undefined : (rango) => setRangoDaModificare(rango)} />
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
              <h2 className="m-0 text-[15px] font-semibold">Requisiti dei ranghi successivi</h2>
              {mio.semafori.slice(1).map((sr) => <SemaforiRango key={sr.rango} semafori={sr} compatto occupato={confermaInCorso} onConferma={nelPannello ? undefined : (rango, r, confermato) => void conferma(rango, r.indice, confermato)} onCorreggi={nelPannello ? undefined : (rango) => setRangoDaModificare(rango)} />)}
            </section>
          )}
          <section id="requisiti" className="card flex scroll-mt-20 flex-col gap-2">
            <h2 className="m-0 text-[15px] font-semibold">Requisiti del Confidente</h2>
            {requisiti.errore && <p className="m-0 text-[13px]" role="alert">{requisiti.errore} <button type="button" className="btn btn-sm touch" onClick={() => void requisiti.ricarica()}>Riprova</button></p>}
            <button type="button" className="btn btn-secondary touch self-start" onClick={() => setRangoDaModificare(1)}>Modifica requisiti</button>
          </section>
          <InvitiConfidente filtro={{ confidente: c.chiave }} onCambiato={async () => { await Promise.all([ricarica(), stato.ricarica()]); }} />
          <section className="card flex flex-col gap-2">
            <h2 className="m-0 text-[15px] font-semibold">Abilità per rango</h2>
            {c.abilita.length === 0 ? <p className="m-0 text-[13px] text-text-muted">Nessuna abilità documentata.</p> : (
              <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light">
                {c.abilita.map((a, i) => (
                  <li key={i} className={`py-1.5 flex gap-3 text-[13px] ${mio && a.rango <= mio.rango ? '' : 'text-text-secondary'}`}>
                    <span className={`chip shrink-0 ${mio && a.rango <= mio.rango ? 'chip--attivo' : ''}`}>{a.rango === 10 ? 'MAX' : a.rango}</span>
                    <div><strong className="text-text">{a.nome}</strong>{a.descrizione && <span> — {a.descrizione}</span>}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <DotiIncontro confidente={c} rangoPartita={mio ? mio.rango : null} onSalvato={ricarica} />

          <section className="card flex flex-col gap-2">
            <h2 className="m-0 text-[15px] font-semibold">Risposte migliori per rango</h2>
            <p className="m-0 text-[12px] text-text-muted">Le scelte evidenziate danno il massimo dei punti secondo la guida; quelle in rosso avviano la relazione romantica. Registra poi le note ottenute nella scheda Confidenti della partita.</p>
            {c.dialoghi.length === 0 ? <p className="m-0 text-[13px] text-text-muted">Nessun dialogo documentato.</p> : (
              <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                {c.dialoghi.map((d) => <DialogoRango key={d.id} d={d} aperto={aperti[d.id] === true} onToggle={() => setAperti((a) => { const n = { ...a }; if (n[d.id]) delete n[d.id]; else n[d.id] = true; return n; })} />)}
              </ul>
            )}
          </section>

          <section className="card flex flex-col gap-2">
            <h2 className="m-0 text-[15px] font-semibold">Regali graditi</h2>
            {attiva && c.regali.some((g) => g.catalogo) && <button type="button" className="btn btn-secondary touch self-start" disabled={regaloInCorso || stato.caricamento} onClick={() => { setRegaloIniziale(''); setSceltaRegaloPer(bersaglioRegalo); }}>Regala</button>}
            {attiva && sceltaRegaloPer === bersaglioRegalo && <SceltaRegalo key={`${bersaglioRegalo}:${regaloIniziale}`} partita={attiva.id} confidente={chiave} nomeConfidente={c.nome} regali={c.regali} stato={mio} oggettoIniziale={regaloIniziale}
              onChiudi={() => setSceltaRegaloPer(null)} onFatto={(esito) => {
                setSceltaRegaloPer((corrente) => corrente === bersaglioRegalo ? null : corrente);
                void stato.ricarica();
                notifica('success', `Regalo consegnato a ${c.nome}${esito.punti > 0 ? `: +${formattaPunti(esito.punti)} punti` : ''}${esito.acquistato ? ' · segnato anche comprato' : ''}.`);
              }} />}
            {c.regali.length === 0 ? <p className="m-0 text-[13px] text-text-muted">Questo Confidente non accetta regali.</p> : (
              <ul className="m-0 p-0 list-none flex flex-col divide-y divide-border-light" aria-label="Regali">
                {c.regali.map((g, i) => (
                  <li key={i} className="py-1.5 flex flex-wrap items-center gap-2 text-[13px]">
                    {attiva && g.catalogo && (regaloConsegnato(g)
                      ? <button type="button" className="btn btn-ghost btn-sm touch" disabled={regaloInCorso || stato.caricamento} onClick={() => void segnaRegalo(g, false)} aria-label={`Annulla la consegna di ${g.nome}`}>Annulla consegna</button>
                      : <button type="button" className="btn btn-secondary btn-sm touch" disabled={regaloInCorso || stato.caricamento} onClick={() => { setRegaloIniziale(g.catalogo!.chiave); setSceltaRegaloPer(bersaglioRegalo); }} aria-label={`Regala ${g.nome}`}>Regala</button>)}
                    {attiva && !g.catalogo && (
                      <label className="flex items-center gap-1.5 touch">
                        <input type="checkbox" className="w-5 h-5" disabled={regaloInCorso || stato.caricamento} checked={regaloConsegnato(g)} onChange={(e) => void segnaRegalo(g, e.target.checked)} aria-label={`Regalo ${g.nome} consegnato`} />
                      </label>
                    )}
                    <strong className={regaloConsegnato(g) ? 'line-through text-text-muted' : ''}>{g.catalogo ? <Link to={g.catalogo.casa} className="touch inline-flex items-center">{g.nome}</Link> : g.nome}</strong>
                    {g.effetto && <span className="chip">{g.effetto}</span>}
                    <span className="text-text-secondary">{g.catalogo && g.listinoCollegato === false ? 'Indicazioni della guida: ' : ''}{[g.dove, g.costo].filter(Boolean).join(' · ')}</span>
                    {g.nota && <span className="w-full whitespace-pre-line text-[12px] text-text-muted">{g.nota}</span>}
                    <RipristinoCostoRegalo confidente={chiave} regalo={g} onSalvato={ricarica} />
                  </li>
                ))}
              </ul>
            )}
            {c.regaliSconsigliati.length > 0 && <p className="m-0 text-[12px] text-text-muted">Sconsigliati: {c.regaliSconsigliati.join(', ')}.</p>}
          </section>

          {!!c.oggettiRicompensa?.length && <section className="card flex min-w-0 flex-col gap-2" aria-label="Oggetti ricevuti dal Confidente">
            <h2 className="m-0 text-[15px] font-semibold">Oggetti ricevuti</h2>
            <p className="m-0 text-[12px] text-text-muted">Doni del Confidente secondo la guida, con le rispettive condizioni. Non sono i regali da consegnargli e non risultano automaticamente ottenuti.</p>
            <OggettiCollegati oggetti={c.oggettiRicompensa} />
          </section>}

          {c.fonti.length > 0 && (
            <p className="m-0 text-[11px] text-text-muted">Fonti: {c.fonti.map((f, i) => {
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
    {informazioniAperte && <EditorDisponibilita key={chiave} chiave={chiave} onChiudi={() => setInformazioniAperte(false)} onSalvato={ricarica} />}
    </>
  );
}
