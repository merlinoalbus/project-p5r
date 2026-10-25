// ============================================================
// NegoziazionePerUmore — domande e risposte raggruppate per umore, da consultare in battaglia (L8, B8, R8-07c, R8-07d, R8-07f)
// ============================================================
//
// Si sceglie l'umore (quattro pulsanti) oppure l'Ombra, che porta al suo umore; poi la domanda, per scorrimento o per testo; l'esito di ogni risposta
// è scritto in parole e con un segno, mai solo a colori. Una sola fonte: il lettore unico della negoziazione (`GET /api/compendio/negoziazione`),
// in forma compatta per un umore (poche decine di KB) e col dettaglio completo di una famiglia a richiesta. Mai un esito neutro dove la fonte tace,
// mai «il peggiore» dove si contraddice: le alternative stanno tutte in vista. Una personalità sconosciuta non preseleziona nessun umore.
// La selezione sta nell'indirizzo (`umore`, `ombra`, `q`): cambiare Ombra la aggiorna, il ritorno dalla pagina Ombra la ritrova.
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getNegoziazioneCompatta, getNegoziazioneDomanda, getOmbre } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { CampoRicerca } from '../shared/CampoRicerca';
import { ModificaGuida } from './ModificaGuida';
import { Selettore } from '../shared/Selettore';
import { COLORE_TRATTO, NOME_TRATTO, SEGNO_ESITO, TRATTI_OMBRA } from '../../utils/negoziazione';
import { NOME_PERSONALITA, type EsitoNegoziazione, type UmoreNegoziazione } from '../../../shared/elementi';
import type { NegCellaCompattaDto, NegDomandaCompattaDto, NegDomandaDto, NegRispostaCompattaDto } from '../../../shared/negoziazione';
import { PulsanteVisivo, FrecciaApertura } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

const NOME_ESITO: Record<EsitoNegoziazione, string> = { buona: 'Buona', passabile: 'Passabile', cattiva: 'Cattiva' };
const CLASSE_ESITO: Record<EsitoNegoziazione, string> = {
  buona: 'border-success/70 bg-success/10 text-success', passabile: 'border-warning/70 bg-warning/10 text-warning', cattiva: 'border-error/60 bg-error/10 text-error',
};
const PASSO = 40;

/** Un esito in parole e con un segno. */
function Esito({ esito, incerto = false, piccolo = false }: { esito: EsitoNegoziazione; incerto?: boolean; piccolo?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${piccolo ? 'testo-12' : 'testo-12'} ${CLASSE_ESITO[esito]}`}>
      <span aria-hidden>{SEGNO_ESITO[esito]}</span>{NOME_ESITO[esito]}{incerto && <span title="Nemmeno la fonte è certa" aria-label="incerto"> ?</span>}
    </span>
  );
}

/** La cella di una risposta per l'umore scelto: l'esito principale, oppure le alternative se la fonte si contraddice, oppure «non documentata». */
function Cella({ c }: { c: NegCellaCompattaDto }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      {c.esito
        ? <Esito esito={c.esito} incerto={!!c.incerto} />
        : c.alternative && c.alternative.length > 0
          ? <>{c.alternative.map((e, i) => <Esito key={`${e}${i}`} esito={e} incerto={!!c.incerto} />)}<span className="testo-12 text-text-muted">la fonte si contraddice</span></>
          : <span className="testo-12 text-text-muted">non documentata</span>}
      {c.fonte && c.fonte !== 'royal' && <span className="testo-12 text-text-muted" title="Royal non documenta questa cella: l’esito viene dall’app e non è verificato">solo dall’app</span>}
      {c.nonConfermata && <span className="testo-12 text-text-muted" title="Esito ereditato dal gioco base, non confermato in Royal">ereditato, non confermato</span>}
      {c.altre && c.altre.map((a, i) => <span key={`${a.fonte}${i}`} className="testo-12 text-text-muted">anche «{NOME_ESITO[a.esito].toLowerCase()}» ({a.fonte === 'royal' ? 'Royal' : 'app'})</span>)}
    </span>
  );
}

/** Il dettaglio completo di una famiglia: le varianti e, per ogni risposta, le attestazioni di ogni provenienza. */
function Dettaglio({ domanda, umore, onCambiato }: { domanda: string; umore: UmoreNegoziazione; onCambiato: () => void }) {
  const d = useCarica(() => getNegoziazioneDomanda(domanda, umore), [domanda, umore]);
  /** Dopo una correzione si rilegge il dettaglio e l'elenco compatto che sta sopra. */
  const cambiato = () => { void d.ricarica(); onCambiato(); };
  /** La matita di un esito: la chiave è quella dell'attestazione. */
  const matitaEsito = (chiave: string) => <ModificaGuida tipo="negoziazione-verdetto" chiave={chiave} cosa="l’esito di questa risposta" soloIcona onSalvato={cambiato} />;
  if (d.caricamento && !d.dati) return <p className="m-0 testo-12 text-text-muted" role="status">Leggo il dettaglio…</p>;
  if (d.errore) return <p className="m-0 testo-12 text-error" role="alert">{d.errore}</p>;
  const fam: NegDomandaDto | undefined = d.dati?.domande[0];
  if (!fam) return null;
  return (
    <div className="flex flex-col gap-2 border-t border-border-light pt-2 testo-12">
      {fam.varianti.map((v) => (
        <section key={v.chiave} className="flex flex-col gap-1" aria-label={`Variante ${v.localizzatore}`}>
          <span className="flex items-center gap-1 text-text-secondary"><span><strong>{v.fonte === 'royal' ? 'Royal' : v.fonte === 'app-originale' ? 'App (file originale)' : 'Ritocco'}</strong> · {v.testo ?? v.testoOriginale}{v.nota ? ` — ${v.nota}` : ''}</span>
            <ModificaGuida tipo="negoziazione-variante" chiave={v.chiave} cosa={`la variante ${v.localizzatore}`} soloIcona onSalvato={cambiato} /></span>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {v.risposte.map((r) => (
              <li key={r.chiave} className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1"><span>{r.testoDisponibile ? (r.testo ?? r.testoOriginale) : 'Testo non disponibile nella fonte'}</span>
                  <ModificaGuida tipo="negoziazione-risposta" chiave={r.chiave} cosa="questa risposta" soloIcona onSalvato={cambiato} /></span>
                {r.celle.map((c) => (
                  <span key={c.umore} className="flex flex-wrap items-center gap-1 text-text-muted">
                    {c.principale && <><Esito esito={c.principale.esito} incerto={c.principale.incerto} piccolo /><span>{c.principale.fonte}{c.principale.valoreGrezzo ? ` («${c.principale.valoreGrezzo}»)` : ''}</span>{matitaEsito(c.principale.chiave)}</>}
                    {[...c.alternative, ...c.altre].map((a) => <span key={a.chiave} className="inline-flex items-center gap-1"><Esito esito={a.esito} incerto={a.incerto} piccolo /><span>{a.fonte}{a.valoreGrezzo ? ` («${a.valoreGrezzo}»)` : ''}</span>{matitaEsito(a.chiave)}</span>)}
                    {!c.principale && c.alternative.length === 0 && c.altre.length === 0 && <span>nessuna fonte documenta questa cella</span>}
                  </span>
                ))}
                {r.celleDa && <span className="text-text-muted">Gli esiti valgono quelli della risposta Royal collegata.</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Una domanda con le sue risposte e l'esito per l'umore; «Dettagli» apre le provenienze. */
function Domanda({ d, umore, onCambiato }: { d: NegDomandaCompattaDto; umore: UmoreNegoziazione; onCambiato: () => void }) {
  const [aperta, setAperta] = useState(false);
  return (
    <li className="card flex flex-col gap-1.5 p-2 testo-13">
      <strong className="leading-snug">{d.testo}</strong>
      {d.testoOrigine !== 'gioco' && <span className="testo-12 text-text-muted">resa in italiano, non il testo del gioco</span>}
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {d.risposte.map((r: NegRispostaCompattaDto) => (
          <li key={r.chiave} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
            <span className="min-w-0 flex-1">{r.testoDisponibile ? r.testo : 'Testo non disponibile nella fonte'}</span>
            <Cella c={r.cella} />
          </li>
        ))}
      </ul>
      <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="dettagli" dimensione={20} />} aria-expanded={aperta} onClick={() => setAperta((v) => !v)}
        titolo={<>{aperta ? 'Nascondi i dettagli' : `Dettagli e provenienze${d.nVarianti > 1 ? ` (${d.nVarianti} varianti)` : ''}`}<FrecciaApertura aperto={aperta} /></>} />
      {aperta && <Dettaglio domanda={d.chiave} umore={umore} onCambiato={onCambiato} />}
    </li>
  );
}

/** Le Ombre di un umore, con il collegamento alla loro pagina (R8-07d). */
function OmbreDellUmore({ umore }: { umore: UmoreNegoziazione }) {
  const ombre = useCarica(() => getOmbre({ personalita: umore }), [umore]);
  return (
    <details className="testo-12">
      <summary className="touch cursor-pointer text-text-muted">Ombre {NOME_PERSONALITA[umore].toLowerCase()}{ombre.dati ? ` · ${ombre.dati.length}` : ''}</summary>
      {ombre.dati && (
        <ul className="m-0 flex list-none flex-wrap gap-x-3 p-0 pt-1">
          {ombre.dati.map((o) => <li key={o.chiave}><Link to={o.casa} className="touch inline-flex min-h-11 items-center">{o.nome}</Link></li>)}
        </ul>
      )}
    </details>
  );
}

/** La vista: umore o Ombra in cima, poi la ricerca per testo, poi le domande. */
export function NegoziazionePerUmore() {
  const [params, setParams] = useSearchParams();
  const umoreUrl = params.get('umore');
  const ombra = params.get('ombra') ?? '';
  const q = params.get('q') ?? '';
  const [testo, setTesto] = useState(q);
  const [qCerca, setQCerca] = useState(q);
  const [quante, setQuante] = useState(PASSO);
  // la ricerca aspetta 250 ms dall'ultimo carattere e si riflette nell'indirizzo (senza aggiungere voci alla cronologia)
  useEffect(() => {
    const t = setTimeout(() => {
      const nuovo = testo.trim();
      setQCerca(nuovo);
      setQuante(PASSO);
      setParams((p) => {
        if ((p.get('q') ?? '') === nuovo) return p;
        const n = new URLSearchParams(p);
        if (nuovo) n.set('q', nuovo); else n.delete('q');
        return n;
      }, { replace: true });
    }, 250);
    return () => clearTimeout(t);
  }, [testo, setParams]);
  /** Aggiorna la selezione nell'indirizzo senza aggiungere voci alla cronologia. */
  const imposta = (cambi: Record<string, string | null>) => setParams((p) => {
    const n = new URLSearchParams(p);
    for (const [k, v] of Object.entries(cambi)) { if (v) n.set(k, v); else n.delete(k); }
    return n;
  }, { replace: true });

  const umoreScelto = TRATTI_OMBRA.find((t) => t.chiave === umoreUrl)?.chiave ?? null;
  const ombre = useCarica(() => getOmbre({}), []);
  const risposta = useCarica(() => (ombra || umoreScelto
    ? getNegoziazioneCompatta({ ...(ombra ? { ombra } : { umore: umoreScelto ?? undefined }), q: qCerca })
    : Promise.resolve(null)), [ombra, umoreScelto, qCerca]);
  const r = risposta.dati;
  // l'umore effettivo: quello dell'Ombra se ne ha uno valido, altrimenti quello scelto; con un'Ombra dalla personalità sconosciuta nessuno
  const umore: UmoreNegoziazione | null = ombra ? r?.ombra?.umore ?? null : umoreScelto;
  const opzioniOmbre = useMemo(() => (ombre.dati ?? []).filter((o) => o.negoziabile !== false).map((o) => ({ chiave: o.chiave, nome: o.nome, dettaglio: NOME_PERSONALITA[o.personalita] })), [ombre.dati]);
  const carta = r?.carte[0];

  return (
    <div className="flex flex-col gap-2" aria-label="Negoziazione per umore">
      <div className="flex flex-col gap-1.5" role="group" aria-label="Umore">
        <div className="flex flex-wrap gap-1.5">
          {TRATTI_OMBRA.map((t) => (
            <button key={t.chiave} type="button" className={`chip touch testo-13 ${umore === t.chiave && !ombra ? 'chip--attivo' : ''}`} aria-pressed={umore === t.chiave && !ombra}
              style={{ borderColor: umore === t.chiave ? t.colore : undefined }} onClick={() => imposta({ umore: t.chiave, ombra: null })}>
              <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: t.colore }} />{t.nome}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Selettore compatto etichetta="Ombra" valore={ombra} vuoto="Oppure scegli l’Ombra" opzioni={opzioniOmbre} onCambia={(k) => imposta({ ombra: k || null, umore: null })} />
          {ombra && r?.ombra && (
            <span className="testo-12 text-text-secondary" role="status">
              {r.ombra.umore ? <>Personalità <strong style={{ color: COLORE_TRATTO[r.ombra.umore] }}>{NOME_TRATTO[r.ombra.umore]}</strong> · <Link to={`/guida/ombra/${r.ombra.chiave}`}>pagina dell’Ombra</Link></>
                : r.ombra.negoziabile === false ? <>«{r.ombra.nome}» non si negozia · <Link to={`/guida/ombra/${r.ombra.chiave}`}>pagina dell’Ombra</Link></>
                : <>La personalità di «{r.ombra.nome}» non è nota: scegli tu l’umore · <Link to={`/guida/ombra/${r.ombra.chiave}`}>pagina dell’Ombra</Link></>}
            </span>
          )}
        </div>
      </div>

      {!umore && !ombra && <p className="m-0 testo-13 text-text-muted" role="status">Scegli l’umore dell’Ombra (o l’Ombra): ogni risposta ti dice come la prende.</p>}
      {!umore && ombra && r && <p className="m-0 testo-13 text-text-muted" role="status">Nessun umore da proporre per quest’Ombra: scegli uno dei quattro qui sopra.</p>}

      {umore && (
        <>
          {carta && (
            <section className="card flex flex-col gap-1.5 p-2" style={{ borderColor: COLORE_TRATTO[umore] }} aria-label={`Carta ${NOME_TRATTO[umore]}`}>
              <div className="flex items-center gap-1">
                <h3 className="m-0 font-display testo-14 uppercase leading-none" style={{ color: COLORE_TRATTO[umore] }}>{carta.nome}</h3>
                <ModificaGuida tipo="negoziazione-umore" chiave={umore} cosa={`la carta «${carta.nome}»`} soloIcona onSalvato={() => void risposta.ricarica()} />
              </div>
              <p className="m-0 testo-12 text-text-secondary">{carta.descrizione}</p>
              {carta.esempi.filter((e) => !e.proposta && typeof e.testo === 'string').length > 0 && (
                <div className="flex flex-wrap gap-1"><span className="testo-12 uppercase tracking-[0.08em] text-success">Rispondi così</span>
                  {carta.esempi.filter((e) => !e.proposta && typeof e.testo === 'string').map((e) => <span key={String(e.testo)} className="rounded-full border border-success/60 bg-success/10 px-2 py-0.5 testo-12 text-success">{String(e.testo)}</span>)}</div>
              )}
              {carta.daEvitare.length > 0 && (
                <div className="flex flex-wrap gap-1"><span className="testo-12 uppercase tracking-[0.08em] text-error">Da evitare</span>
                  {carta.daEvitare.map((x) => <span key={x} className="rounded-full border border-error/50 bg-error/10 px-2 py-0.5 testo-12 text-error">{x}</span>)}</div>
              )}
            </section>
          )}
          <CampoRicerca valore={testo} onCambia={setTesto} segnaposto="Cerca la domanda o la risposta…" />
          {risposta.caricamento && !r && <p className="m-0 testo-12 text-text-muted" role="status">Leggo la negoziazione…</p>}
          {risposta.errore && <p className="m-0 testo-12 text-error" role="alert">{risposta.errore}</p>}
          {r && (
            <>
              <p className="m-0 testo-12 text-text-muted" role="status">{r.totale} {r.totale === 1 ? 'domanda' : 'domande'}{qCerca ? ` per «${qCerca}»` : ''}. Esiti di Royal; dove Royal tace, quelli dell’app, dichiarati.</p>
              <ul className="m-0 grid list-none grid-cols-1 items-start gap-2 p-0 lg:grid-cols-2 2xl:grid-cols-3" aria-label="Domande">
                {r.domande.slice(0, quante).map((d) => <Domanda key={d.chiave} d={d} umore={umore} onCambiato={() => void risposta.ricarica()} />)}
              </ul>
              {r.domande.length > quante && <PulsanteVisivo compatto icona={<IconaAzione chiave="carica-altri" dimensione={20} />} titolo={<>Mostra altre {Math.min(PASSO, r.domande.length - quante)}</>} className="self-start" onClick={() => setQuante((n) => n + PASSO)} />}
              {r.totale === 0 && <p className="m-0 testo-13 text-text-muted">Nessuna domanda con questo testo.</p>}
            </>
          )}
          <OmbreDellUmore umore={umore} />
        </>
      )}
    </div>
  );
}
