// ============================================================
// BattagliaPage — Aiuto in battaglia: Ombre per area con ricerca rapida, negoziazione, danno tecnico, Staffetta e Speciali, Ombre sciagura, Mietitore e Demoni del Tesoro (Fase 7.3)
// ============================================================

import { useMemo, useState, type ReactNode } from 'react';
import { Fonte } from '../components/shared/VoceFonte';
import { Selettore } from '../components/shared/Selettore';
import { Link, useSearchParams } from 'react-router-dom';
import { getBattaglia, getOmbre, URL_BATTAGLIA } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useSchede } from '../hooks/useSchede';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCatturaPersona } from '../hooks/useCatturaPersona';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { FilaScorrevole } from '../components/shared/FilaScorrevole';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { normalizzaTesto } from '../utils/testo';
import type { BattagliaDto } from '../types';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { ElementoChip } from '../components/compendio/ElementoChip';
import { IconaCategoria } from '../components/guida/IconaCategoria';
import { ModificaGuida } from '../components/guida/ModificaGuida';
import { NegoziazionePerUmore } from '../components/guida/NegoziazionePerUmore';
import { AvvisoTogliPersona, PiastrelleCattura } from '../components/guida/PiastrelleCattura';
import { SezioneConFregio } from '../components/shared/FregioSezione';
import { chiaveElementoDaTesto, nomeCanonicoNelTesto } from '../utils/elementiGuida';
import { NOME_ELEMENTO, NOME_ESITO_AFFINITA, NOME_PERSONALITA, PERSONALITA_OMBRA, type CodiceAffinita, type ChiaveElemento } from '../../shared/elementi';
import type { OmbraLuogoDto, OmbraSchedaDto } from '../../shared/ombre';
import { TitoloSezione } from '../components/shared/TitoloSezione';

/** Le cinque schede, ognuna con la sua icona.
 *
 * Erano cinque pastiglie di solo testo, tutte uguali: in mano durante uno scontro, una barra così
 * si legge parola per parola. L'icona la si riconosce prima di leggerla. */
const SCHEDE = [
  ['ombre', 'Ombre per infiltrazione o dedalo', 'velluto'],
  ['negoziazione', 'Negoziazione', 'regali'],
  ['tecnico', 'Danno tecnico', 'battaglia'],
  ['staffetta', 'Staffetta e Speciali', 'dote'],
  ['nemici', 'Nemici speciali', 'protezioni'],
] as const;
type Scheda = (typeof SCHEDE)[number][0];

/** Un dato con la sua etichetta: **l'etichetta sopra, piccola**, non un grassetto dentro la frase.
 *
 * Erano venti paragrafi «**Titolo:** testo» impilati in una colonna sola, cioè una pagina che si
 * legge come un manuale invece di consultarsi come una scheda: durante uno scontro non si legge,
 * si cerca. Con l'etichetta sopra i dati si possono affiancare, e su schermo largo venti righe
 * diventano tre colonne. */
function Voce({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-md bg-white/[0.04] px-2.5 py-1.5">
      <span className="testo-12 uppercase tracking-[0.08em] text-text-muted">{titolo}</span>
      <span className="testo-13">{children}</span>
    </div>
  );
}

/** La matita di una sezione di testo della guida (R11-15/4): corregge i testi e li rimette com'erano; le tabelle e le fonti non si correggono. */
function ModificaSezione({ sezione, cosa, onModificato }: { sezione: string; cosa: string; onModificato: () => void }) {
  return <ModificaGuida tipo="battaglia-sezione" chiave={sezione} cosa={cosa} soloIcona onSalvato={onModificato} />;
}

/** I dati di una sezione: in colonna sul telefono, affiancati da tablet in su. */
function Dati({ children, colonne = 3 }: { children: ReactNode; colonne?: 2 | 3 }) {
  return <div className={`grid gap-1.5 sm:grid-cols-2 ${colonne === 3 ? 'xl:grid-cols-3' : ''}`}>{children}</div>;
}

/** Debolezza o resistenza della guida: chip dell'elemento con icona se riconosciuto (col nome del vocabolario unico, R8-20c: «Tuono (respinge)» si mostra «Elettricità (Riflette)»), altrimenti chip testuale col testo della guida. */
function ChipElementoGuida({ testo }: { testo: string }) {
  const chiave = chiaveElementoDaTesto(testo);
  return chiave ? <ElementoChip elemento={chiave} nome={nomeCanonicoNelTesto(testo)} piccolo /> : <span className="chip">{testo}</span>;
}

/** Il testo breve di un luogo d'incontro: «Palazzo › infiltrazione» o «Memento › dedalo». */
const luogoBreve = (l: OmbraLuogoDto): string => (l.infiltrazione ? `${l.dungeonNome} › ${l.infiltrazione.nome}` : l.dungeonNome);

/** L'elemento della debolezza come chip, col nome del vocabolario unico (le affinità vengono dal compendio, R8-08). */
const ChipElemento = ({ elemento, nome }: { elemento: string; nome?: string }) => <ElementoChip elemento={elemento} nome={nome ?? NOME_ELEMENTO[elemento as ChiaveElemento] ?? elemento} piccolo />;

/**
 * Ricerca rapida delle Ombre (L8, R8-28): un testo libero (nome, nomi alternativi, Persona) e tre filtri (dove si incontra, debole a, personalità).
 * Ogni carta porta le debolezze e le altre affinità **dal compendio** (nessuna copia), dove si incontra con il link alla guida del posto, il
 * collegamento alla pagina dell'Ombra e — con una partita — la piastrella che la cattura con un tocco, la stessa di Palazzi e Memento.
 * Dal telefono: cerchi l'Ombra e nella stessa carta vedi le debolezze e se la Persona è registrata (due tocchi al più, uno per registrarla).
 */
function SchedaOmbre() {
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getOmbre({ partita: partitaId ?? undefined }), [partitaId]);
  const cattura = useCatturaPersona(partitaId);
  const [q, setQ] = useState('');
  const [dungeon, setDungeon] = useState('');
  const [elemento, setElemento] = useState('');
  const [personalita, setPersonalita] = useState('');
  const ombre = useMemo<OmbraSchedaDto[]>(() => dati.dati ?? [], [dati.dati]);
  const dungeons = useMemo(() => [...new Map(ombre.flatMap((o) => o.luoghi.map((l) => [l.dungeon, l.dungeonNome] as const))).entries()].sort((a, b) => a[1].localeCompare(b[1], 'it')), [ombre]);
  const elementi = useMemo(() => [...new Set(ombre.flatMap((o) => o.debolezze))], [ombre]);
  const visibili = useMemo(() => {
    const t = normalizzaTesto(q);
    return ombre.filter((o) => (!dungeon || o.luoghi.some((l) => l.dungeon === dungeon)) && (!elemento || o.debolezze.includes(elemento)) && (!personalita || o.personalita === personalita)
      && (!t || normalizzaTesto([o.nome, ...o.nomiAltri, o.persona?.nome ?? '', o.persona?.nomeIt ?? '', ...o.luoghi.map(luogoBreve)].join(' ')).includes(t)));
  }, [ombre, q, dungeon, elemento, personalita]);
  return (
    <PageState isLoading={dati.caricamento && !dati.dati} error={dati.errore} onRetry={() => void dati.ricarica()}>
      <div className="flex flex-col gap-2">
        <p className="m-0 testo-13 text-text-secondary">Ricerca rapida delle Ombre di Palazzi e Dedali: scrivi il nome dell'Ombra o della Persona, oppure filtra per dove si incontra, debolezza e personalità. Le debolezze sono quelle della Persona nel compendio.</p>
        <CampoRicerca valore={q} onCambia={setQ} segnaposto="Ombra, Persona, Palazzo o dedalo…" />
        <div className="flex flex-wrap gap-1.5">
          <Selettore compatto etichetta="Dove" valore={dungeon} vuoto="Ovunque" opzioni={dungeons.map(([k, n]) => ({ chiave: k, nome: n }))} onCambia={setDungeon} />
          <Selettore compatto etichetta="Debole a" valore={elemento} vuoto="Qualsiasi debolezza" opzioni={elementi.map((e) => ({ chiave: e, nome: `Debole a ${NOME_ELEMENTO[e as ChiaveElemento] ?? e}` }))} onCambia={setElemento} />
          <Selettore compatto etichetta="Personalità" valore={personalita} vuoto="Qualsiasi personalità" opzioni={PERSONALITA_OMBRA.map((p) => ({ chiave: p, nome: NOME_PERSONALITA[p] }))} onCambia={setPersonalita} />
        </div>
        <p className="m-0 testo-12 text-text-muted" role="status">{visibili.length} Ombre su {ombre.length}.</p>
        {cattura.daTogliere?.persona && <AvvisoTogliPersona nome={cattura.daTogliere.persona.nomeIt} occupato={cattura.occupata !== null} onConferma={cattura.conferma} onAnnulla={cattura.annulla} />}
        {/* Una griglia e non una colonna: le schede sono corte e su uno schermo largo la colonna
            unica lasciava tre quarti di pagina vuoti mentre si scorreva per centinaia di Ombre. */}
        <ul className="m-0 grid list-none grid-cols-1 items-start gap-2 p-0 lg:grid-cols-2 2xl:grid-cols-3" aria-label="Ombre">
          {visibili.length === 0 && <li className="testo-13 text-text-muted" role="status">Nessuna Ombra con questi filtri.</li>}
          {visibili.map((o) => (
            <li key={o.chiave} className="card flex gap-2 p-2 testo-13">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <Link to={o.casa} className="touch inline-flex items-center font-bold">{o.nome}</Link>
                  {o.persona ? <span className="testo-12 text-text-secondary">maschera {o.persona.nomeIt}</span> : <span className="testo-12 text-text-muted">non reclutabile</span>}
                  {o.livello !== null && <span className="chip testo-12">livello {o.livello}</span>}
                  <span className="chip testo-12">{NOME_PERSONALITA[o.personalita]}</span>
                </div>
                {/* Le debolezze sono il motivo per cui si apre questa scheda: stanno su una riga loro, con le altre affinità sotto. */}
                <div className="flex flex-wrap items-center gap-1">
                  {o.debolezze.length > 0
                    ? o.debolezze.map((d) => <ChipElemento key={d} elemento={d} />)
                    : <span className="testo-12 text-text-muted">nessuna debolezza nota</span>}
                </div>
                {o.resistenze.length > 0 && <div className="flex flex-wrap items-center gap-1 opacity-70">
                  {o.resistenze.map((r) => <ChipElemento key={r.elemento} elemento={r.elemento} nome={`${NOME_ELEMENTO[r.elemento as ChiaveElemento] ?? r.elemento}: ${NOME_ESITO_AFFINITA[r.codice as CodiceAffinita] ?? r.codice}`} />)}
                </div>}
                {o.luoghi.length > 0 && (
                  <div className="flex flex-wrap gap-x-3">
                    {o.luoghi.map((l) => (
                      <Link key={`${l.dungeon}|${l.infiltrazione?.chiave ?? ''}`} to={l.casa} className={`touch inline-flex items-center testo-12 text-text-muted ${l.raggiungibile === false ? 'line-through opacity-60' : ''}`} title={l.raggiungibile === false ? 'Palazzo concluso: non più raggiungibile' : undefined}>{luogoBreve(l)}</Link>
                    ))}
                  </div>
                )}
              </div>
              {o.persona && (
                <div className="w-[96px] shrink-0">
                  <PiastrelleCattura aria-label={`Cattura di ${o.nome}`} partitaId={partitaId} catturate={cattura.catturate} occupata={cattura.occupata} onTocca={cattura.tocca}
                    voci={[{ chiave: o.chiave, persona: o.persona, etichetta: o.persona.nomeIt, ombra: o.chiave, catturabile: o.catturabile }]} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </PageState>
  );
}

/**
 * La negoziazione (L8, B8): le domande e le risposte per umore vengono SOLO dal lettore unico (`NegoziazionePerUmore`, che non legge più il vecchio
 * JSON della guida); qui restano le parti discorsive della guida — quando e come si negozia, le opzioni dell'Hold Up — e, in fondo, regole,
 * incertezze e fonti separate da un punto.
 */
function SchedaNegoziazione({ d, onModificato }: { d: BattagliaDto; onModificato: () => void }) {
  const n = d.negoziazione;
  return (
    <div className="flex flex-col gap-3 testo-13">
      {/* La scelta dell'umore e la ricerca sulla domanda vengono prima di tutto: è l'unica cosa che si legge sullo schermo mentre l'Ombra parla.
          Le regole che spiegano il perché stanno sotto. */}
      <NegoziazionePerUmore />
      <SezioneConFregio chiave="battaglia-negoziazione" disposizione="fascia">
        <div className="flex items-center gap-1"><TitoloSezione variante="display">Quando e come</TitoloSezione><ModificaSezione sezione="negoziazione" cosa="la negoziazione: quando e come, regole e incertezze" onModificato={onModificato} /></div>
        <p className="m-0">{n.quandoSiPuoNegoziare}</p>
        <Dati colonne={2}>
          <Voce titolo="Personalità dell’Ombra">{n.comeVerificarePersonalita}</Voce>
          {n.opzioniHoldUp.map((o) => <Voce key={o.opzione} titolo={o.opzione}>{o.effetto}</Voce>)}
        </Dati>
      </SezioneConFregio>
      <SezioneConFregio chiave="battaglia-regole" disposizione="grande">
        <TitoloSezione variante="display">Regole</TitoloSezione>
        <ul className="m-0 pl-4">{n.regole.map((r) => <li key={r}>{r}</li>)}</ul>
        {n.incertezze && <p className="m-0 text-text-muted testo-12">{n.incertezze}</p>}
        <span>{n.urlFonti.map((u) => <Fonte etichetta="fonte: allgamestaff" allineato={false} key={u} url={u} />).reduce<ReactNode[]>((acc, x, i) => (i ? [...acc, ' · ', x] : [x]), [])}</span>
      </SezioneConFregio>
    </div>
  );
}

/**
 * Il danno tecnico: tabella stato alterato → elementi che danno il colpo tecnico, con l'effetto
 * dello stato preso dal sistema di battaglia (trattino se manca), poi gli esiti del colpo, il
 * «1 More» e la nota di fine battaglia.
 */
function SchedaTecnico({ d, onModificato }: { d: BattagliaDto; onModificato: () => void }) {
  const effetti = new Map(d.sistema.statiAlterati.map((s) => [s.stato, s.effetto]));
  return (
    <div className="flex flex-col gap-3 testo-13">
      <p className="m-0 text-text-secondary">{d.sistema.esitiColpo.tecnico}. Colpisci un nemico già colpito da uno stato alterato con l'elemento indicato per ottenere un colpo Tecnico (danno bonus e possibile «1 More»).</p>
      <div className="area-scorrevole-x">
        <table className="tabella tabella--adattiva">
          <thead><tr><th>Stato alterato</th><th>Colpo tecnico con</th><th>Effetto dello stato</th></tr></thead>
          <tbody>{d.tecnico.stati.map((s) => <tr key={s.stato}><td data-etichetta="Stato"><strong>{s.stato}</strong></td><td data-etichetta="Tecnico con">{s.elementi.join(', ')}</td><td data-etichetta="Effetto" className="text-text-secondary">{effetti.get(s.stato) ?? '—'}</td></tr>)}</tbody>
        </table>
      </div>
      <SezioneConFregio chiave="battaglia-tecnico" disposizione="fascia">
        <div className="flex items-center gap-1"><TitoloSezione variante="display">Esiti del colpo</TitoloSezione><ModificaSezione sezione="sistema" cosa="il sistema di battaglia: esiti del colpo, 1 More e comandi" onModificato={onModificato} /></div>
        <Dati>
          {Object.entries(d.sistema.esitiColpo).map(([k, v]) => <Voce key={k} titolo={k === 'block' ? 'Block' : k.charAt(0).toUpperCase() + k.slice(1)}>{v}</Voce>)}
          <Voce titolo="1 More">{d.sistema.unoMore}</Voce>
        </Dati>
        <p className="m-0 text-text-muted testo-12">{d.sistema.notaFineBattaglia}</p>
        <Fonte etichetta="fonte: allgamestaff" allineato={false} url={d.tecnico.urlFonte} />
      </SezioneConFregio>
    </div>
  );
}

/** Tre sezioni della guida: la Staffetta con i ranghi e i bonus, gli Speciali con la tabella delle coppie e dello sblocco, e Rapina, Assalto e Parla con i comandi di battaglia. */
function SchedaStaffetta({ d, onModificato }: { d: BattagliaDto; onModificato: () => void }) {
  const s = d.staffetta; const sp = d.speciali; const a = d.assaltoEHoldUp;
  return (
    <div className="flex flex-col gap-3 testo-13">
      <SezioneConFregio chiave="battaglia-staffetta" disposizione="lato">
        <div className="flex items-center gap-1"><TitoloSezione variante="display">Staffetta</TitoloSezione><ModificaSezione sezione="staffetta" cosa="la Staffetta" onModificato={onModificato} /></div>
        <p className="m-0">{s.cosaE}</p>
        <Dati>
          <Voce titolo="Disponibilità">{s.disponibilita}</Voce>
          <Voce titolo="Effetto">{s.effetto}</Voce>
          <Voce titolo="Livelli">{s.livelli}</Voce>
          <Voce titolo="Moltiplicatori">{s.moltiplicatori}</Voce>
          <Voce titolo="Indicatori">{s.indicatoriVisivi}</Voce>
          <Voce titolo="Catena completa">{s.effettoSpeciale}</Voce>
        </Dati>
        <div className="flex flex-wrap gap-1.5">
          {s.ranghi.map((r) => <span key={r.rango} className="rounded-md border border-border-light bg-white/[0.03] px-2 py-1 testo-12"><strong className="font-display">Rango {r.rango}</strong> · {r.bonus}</span>)}
        </div>
        <Fonte etichetta="fonte: allgamestaff" allineato={false} url={s.urlFonte} />
      </SezioneConFregio>
      <SezioneConFregio chiave="battaglia-speciali" disposizione="lato">
        <div className="flex items-center gap-1"><TitoloSezione variante="display">Speciali</TitoloSezione><ModificaSezione sezione="speciali" cosa="gli Speciali" onModificato={onModificato} /></div>
        <p className="m-0">{sp.meccanica}</p>
        <Dati colonne={2}>
          <Voce titolo="Attivazione">{sp.attivazione}</Voce>
          <Voce titolo="Danno">{sp.proprietaDanno}</Voce>
        </Dati>
        <div className="area-scorrevole-x">
          <table className="tabella tabella--adattiva testo-12">
            <thead><tr><th>Speciale</th><th>Coppia</th><th>Sblocco</th></tr></thead>
            <tbody>{sp.elenco.map((e) => <tr key={e.nome}><td data-etichetta="Speciale"><strong>{e.nome}</strong></td><td data-etichetta="Coppia">{e.personaggi.join(' e ')}</td><td data-etichetta="Sblocco">{e.sblocco}</td></tr>)}</tbody>
          </table>
        </div>
        <Fonte etichetta="fonte: allgamestaff" allineato={false} url={sp.urlFonte} />
      </SezioneConFregio>
      <SezioneConFregio chiave="battaglia-assalto" disposizione="grande">
        <div className="flex items-center gap-1"><TitoloSezione variante="display">Rapina, Assalto e Parla</TitoloSezione><ModificaSezione sezione="assalto" cosa="Rapina, Assalto e Parla" onModificato={onModificato} /></div>
        <Dati>
          <Voce titolo="Rapina">{a.rapina}</Voce>
          <Voce titolo="Assalto">{a.assalto}</Voce>
          <Voce titolo="Parla">{a.holdUp}</Voce>
          <Voce titolo="Avvio dello scontro">{d.sistema.avvioScontro}</Voce>
        </Dati>
        <ul className="m-0 pl-4">{d.sistema.comandi.map((c) => <li key={c}>{c}</li>)}</ul>
        <Fonte etichetta="fonte: allgamestaff" allineato={false} url={a.urlFonte} />
      </SezioneConFregio>
    </div>
  );
}

/** I nemici speciali: le Ombre sciagura (riconoscimento, comportamento, stati, ricompense), il Mietitore con la strategia numerata e i Demoni del Tesoro con la loro tabella. */
function SchedaNemici({ d, onModificato }: { d: BattagliaDto; onModificato: () => void }) {
  const o = d.ombreSciagura; const m = d.mietitore; const t = d.demoniTesoro;
  return (
    <div className="flex flex-col gap-3 testo-13">
      <SezioneConFregio chiave="battaglia-ombre-sciagura" disposizione="fascia">
        <div className="flex items-center gap-1"><TitoloSezione variante="display">Ombre sciagura <span className="text-text-muted testo-12 normal-case">({o.nomeOriginale})</span></TitoloSezione><ModificaSezione sezione="sciagura" cosa="le Ombre sciagura" onModificato={onModificato} /></div>
        <p className="m-0">{o.cosaSono}</p>
        <ul className="m-0 pl-4">{o.caratteristiche.map((c) => <li key={c}>{c}</li>)}</ul>
        <Dati>
          <Voce titolo="Come riconoscerle">{o.comeRiconoscerle}</Voce>
          <Voce titolo="Nel loro turno">{o.comportamentoInBattaglia.turnoProprio}</Voce>
          <Voce titolo="Quando attaccate">{o.comportamentoInBattaglia.quandoAttaccate}</Voce>
          <Voce titolo="Come neutralizzarle">{o.comportamentoInBattaglia.comeNeutralizzarle}</Voce>
          <Voce titolo="Stati che le immobilizzano">{o.effettiStati.immobilizzanti.join(', ')}</Voce>
          <Voce titolo="Soggiogamento">{o.effettiStati.soggiogamento}</Voce>
          <Voce titolo="Furia">{o.effettiStati.furia}</Voce>
          <Voce titolo="Esplosione alla sconfitta">{o.esplosioneAllaSconfitta.descrizione} {o.esplosioneAllaSconfitta.potenza} {o.esplosioneAllaSconfitta.eccezioni}</Voce>
          <Voce titolo="Ricompense">{o.ricompense}</Voce>
          <Voce titolo="Dove">{o.doveCompaiono}</Voce>
        </Dati>
        <p className="m-0 text-text-muted testo-12">{o.incertezze}</p>
        <Fonte etichetta="fonte: allgamestaff" allineato={false} url={o.urlFonte} />
      </SezioneConFregio>
      <SezioneConFregio chiave="battaglia-mietitore" disposizione="alta">
        <div className="flex items-center gap-1"><TitoloSezione variante="display">{m.categoria}</TitoloSezione><ModificaSezione sezione="mietitore" cosa="il Mietitore" onModificato={onModificato} /></div>
        <Dati>
          <Voce titolo="Dove e quando">{m.dove}</Voce>
          <Voce titolo="Segnali">{m.comeSiManifesta}</Voce>
          <Voce titolo="Livello consigliato">{m.livelloConsigliato}</Voce>
          <Voce titolo="Abilità">{m.abilita.join('; ')}</Voce>
          <Voce titolo="Immunità">{m.immunita.join(', ')}</Voce>
          <Voce titolo="Debolezze">{m.debolezze && m.debolezze.length > 0 ? <span className="flex flex-wrap items-center gap-1.5">{m.debolezze.map((d) => <ChipElementoGuida key={d} testo={d} />)}</span> : 'nessuna'}</Voce>
          <Voce titolo="Ricompense">{m.ricompense}</Voce>
        </Dati>
        {/* La strategia è una sequenza: resta numerata, che è la sua forma. */}
        <ol className="m-0 pl-4">{m.strategia.map((s) => <li key={s}>{s}</li>)}</ol>
        <Fonte etichetta="fonte: allgamestaff" allineato={false} url={m.urlFonte} />
      </SezioneConFregio>
      <SezioneConFregio chiave="battaglia-demoni-tesoro" disposizione="lato">
        <div className="flex items-center gap-1"><TitoloSezione variante="display">{t.categoria}</TitoloSezione><ModificaSezione sezione="tesoro" cosa="i Demoni del Tesoro" onModificato={onModificato} /></div>
        <p className="m-0">{t.cosaSono}</p>
        <Dati>
          <Voce titolo="Come compaiono">{t.comeCompaiono}</Voce>
          <Voce titolo="Prima comparsa">{t.primaComparsa}</Voce>
          <Voce titolo="Comportamento">{t.comportamento}</Voce>
          <Voce titolo="Resistenze">{t.resistenzeGenerali}</Voce>
          {t.tecnicheConsigliate.length > 0 && <Voce titolo="Tecniche consigliate">{t.tecnicheConsigliate.join('; ')}</Voce>}
        </Dati>
        <div className="area-scorrevole-x">
          <table className="tabella tabella--adattiva testo-12">
            <thead><tr><th>Demone del Tesoro</th><th>Livello</th><th>Arcano</th><th>Dove</th></tr></thead>
            <tbody>{t.elenco.map((e) => <tr key={e.nome}><td data-etichetta="Demone"><strong>{e.nome}</strong></td><td data-etichetta="Livello" className="tabular-nums">{e.livello}</td><td data-etichetta="Arcano">{e.arcano}</td><td data-etichetta="Dove">{e.dove}</td></tr>)}</tbody>
          </table>
        </div>
        <Fonte etichetta="fonte: allgamestaff" allineato={false} url={t.urlFonte} />
      </SezioneConFregio>
    </div>
  );
}

/**
 * Pagina dell'aiuto in battaglia: carica una volta il pacchetto `getBattaglia`, sceglie la scheda
 * dal parametro `scheda` dell'URL (le Ombre quando manca o non è valido) e mostra la barra delle
 * cinque schede con la scheda attiva sotto. Cambiare scheda sostituisce l'URL senza aggiungere
 * voci alla cronologia.
 */
export function BattagliaPage() {
  useDocumentTitle('Aiuto in battaglia');
  const dati = useCarica(() => getBattaglia(), [], { cacheUrl: URL_BATTAGLIA });
  const [params, setParams] = useSearchParams();
  const scheda = (SCHEDE.some(([k]) => k === params.get('scheda')) ? params.get('scheda') : 'ombre') as Scheda;
  const d = dati.dati;
  const schede = useSchede({ chiavi: SCHEDE.map(([k]) => k), attiva: scheda, onScegli: (k) => setParams(k === 'ombre' ? {} : { scheda: k }, { replace: true }) });
  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-3">
          <IntestazionePagina titolo="Aiuto in battaglia" sottotitolo="Debolezze delle Ombre per infiltrazione o dedalo, risposte in negoziazione, danno tecnico, Staffetta, Speciali e nemici speciali dalla guida allgamestaff." />
          <FilaScorrevole {...schede.lista} aria-label="Sezioni">
            {SCHEDE.map(([k, l, icona]) => <button key={k} type="button" {...schede.scheda(k)} className={`piastrella-scheda touch ${scheda === k ? 'piastrella-scheda--attiva' : ''}`} title={l}><IconaCategoria categoria={icona} dimensione={28} /><span>{l}</span></button>)}
          </FilaScorrevole>
          <div {...schede.pannello(scheda)} className="flex min-w-0 flex-col gap-3">
            {scheda === 'ombre' && <SchedaOmbre />}
            {scheda === 'negoziazione' && <SchedaNegoziazione d={d} onModificato={() => void dati.ricarica()} />}
            {scheda === 'tecnico' && <SchedaTecnico d={d} onModificato={() => void dati.ricarica()} />}
            {scheda === 'staffetta' && <SchedaStaffetta d={d} onModificato={() => void dati.ricarica()} />}
            {scheda === 'nemici' && <SchedaNemici d={d} onModificato={() => void dati.ricarica()} />}
          </div>
        </div>
      )}
    </PageState>
  );
}
