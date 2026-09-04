// ============================================================
// CompendioPage — le 232 Persona con filtri nell'URL (ricerca, arcano, livello min/max, affinità, immagine caricata, ordine e verso),
// vista a piastrelle o compatta ricordata per dispositivo, ritorno alla Persona vista dopo la scheda di dettaglio
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ImmagineEntita } from '../components/shared/ImmagineEntita';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { getPersone } from '../services/api';
import { useGlossarioStore } from '../stores/glossarioStore';
import { usePreferenzeStore } from '../stores/preferenzeStore';
import { PageState, EmptyState } from '../components/shared/PageState';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { AffinitaGriglia } from '../components/compendio/AffinitaGriglia';
import { BadgeStato, PiastrellaPersona } from '../components/compendio/PiastrellaPersona';
import { LivelloBadge } from '../components/compendio/LivelloBadge';
import { IconChevronRight } from '../components/shared/icons';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { chiaviPresenti } from '../components/shared/immaginiCache';
import { ricordaUltimaPersona, ultimaPersonaVista } from '../utils/ultimaPersona';

type Ordine = 'livello' | 'nome' | 'arcana';
type Immagine = '' | 'con' | 'senza';

/** Elementi e codici delle affinità mostrati nei filtri quando il glossario non è ancora disponibile. */
const ELEMENTI_PREDEFINITI: Array<{ chiave: string; nome: string }> = [
  { chiave: 'phys', nome: 'Fisico' }, { chiave: 'gun', nome: 'Arma da fuoco' }, { chiave: 'fire', nome: 'Fuoco' }, { chiave: 'ice', nome: 'Ghiaccio' }, { chiave: 'electric', nome: 'Elettricità' },
  { chiave: 'wind', nome: 'Vento' }, { chiave: 'psy', nome: 'Psichico' }, { chiave: 'nuclear', nome: 'Nucleare' }, { chiave: 'bless', nome: 'Sacro' }, { chiave: 'curse', nome: 'Oscurità' },
];
const CODICI_PREDEFINITI: Array<{ chiave: string; nome: string }> = [
  { chiave: 'wk', nome: 'Debole' }, { chiave: 'rs', nome: 'Resiste' }, { chiave: 'nu', nome: 'Annulla' }, { chiave: 'rp', nome: 'Riflette' }, { chiave: 'ab', nome: 'Assorbe' },
];

const livelloValido = (v: string | null, predefinito: number): number => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 99 ? n : predefinito;
};

/** Elenco Persona: filtri persistenti nell'URL (così il ritorno dalla scheda li conserva) e vista a piastrelle o compatta. */
/** Parametri dell'URL gestiti dal pannello dei filtri (ricerca e ordinamento esclusi). */
const CHIAVI_FILTRI = ['arcana', 'lvMin', 'lvMax', 'el', 'aff', 'img', 'dlc', 'catturabili'] as const;

export function CompendioPage() {
  useDocumentTitle('Compendio');
  const glossario = useGlossarioStore((s) => s.glossario);
  const vista = usePreferenzeStore((s) => s.vistaPersona);
  const impostaVista = usePreferenzeStore((s) => s.impostaVistaPersona);
  const { dati, caricamento, errore, ricarica } = useCarica(() => getPersone(), []);
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const arcana = params.get('arcana') ?? '';
  const livelloMin = livelloValido(params.get('lvMin'), 1);
  const livelloMax = livelloValido(params.get('lvMax'), 99);
  const ordine: Ordine = params.get('ordine') === 'nome' || params.get('ordine') === 'arcana' ? (params.get('ordine') as Ordine) : 'livello';
  const decrescente = params.get('dir') === 'desc';
  const mostraDlc = params.get('dlc') !== '0';
  const soloCatturabili = params.get('catturabili') === '1';
  const elemento = params.get('el') ?? '';
  const codice = params.get('aff') ?? '';
  const immagine: Immagine = params.get('img') === 'con' || params.get('img') === 'senza' ? (params.get('img') as Immagine) : '';

  /** Imposta o rimuove (null) più parametri con un solo aggiornamento dell'URL. */
  const impostaTutti = (valori: Record<string, string | null>) => {
    setParams((prec) => {
      const n = new URLSearchParams(prec);
      for (const [k, v] of Object.entries(valori)) { if (v === null) n.delete(k); else n.set(k, v); }
      return n;
    }, { replace: true });
  };
  /** Aggiorna un filtro nell'URL (valore predefinito → parametro rimosso), senza aggiungere voci alla cronologia. */
  const imposta = (chiave: string, valore: string | number | boolean, predefinito: string | number | boolean) => {
    setParams((prec) => {
      const n = new URLSearchParams(prec);
      if (valore === predefinito || valore === '') n.delete(chiave);
      else n.set(chiave, typeof valore === 'boolean' ? (valore ? '1' : '0') : String(valore));
      return n;
    }, { replace: true });
  };

  // Immagini caricate dall'utente (per il filtro «immagine personalizzata»).
  const [conImmagine, setConImmagine] = useState<Set<string> | null>(null);
  useEffect(() => {
    let annullato = false;
    void chiaviPresenti('persona').then((set) => { if (!annullato) setConImmagine(set); });
    return () => { annullato = true; };
  }, []);

  const filtrate = useMemo(() => {
    if (!dati) return [];
    const testo = q.trim().toLowerCase();
    const lista = dati.filter((p) =>
      (!testo || p.nome.toLowerCase().includes(testo) || p.nomeIt.toLowerCase().includes(testo) || p.arcanaNome.toLowerCase().includes(testo))
      && (!arcana || p.arcana === arcana)
      && p.livello >= Math.min(livelloMin, livelloMax) && p.livello <= Math.max(livelloMin, livelloMax)
      && (mostraDlc || !p.dlc)
      && (!soloCatturabili || (!p.speciale && !p.rara && !p.dlc))
      && (!elemento || p.affinita.some((a) => a.elemento === elemento && (!codice || a.codice === codice)))
      && (!immagine || (immagine === 'con') === (conImmagine?.has(p.nome) ?? false)),
    );
    const ordArcana = new Map((glossario?.arcani ?? []).map((a) => [a.chiave, a.ordine]));
    const confronto = (a: typeof lista[number], b: typeof lista[number]) => {
      if (ordine === 'nome') return a.nomeIt.localeCompare(b.nomeIt, 'it');
      if (ordine === 'arcana') return (ordArcana.get(a.arcana) ?? 0) - (ordArcana.get(b.arcana) ?? 0) || a.livello - b.livello;
      return a.livello - b.livello || a.nomeIt.localeCompare(b.nomeIt, 'it');
    };
    return lista.sort((a, b) => (decrescente ? -confronto(a, b) : confronto(a, b)));
  }, [dati, q, arcana, livelloMin, livelloMax, mostraDlc, soloCatturabili, ordine, decrescente, elemento, codice, immagine, conImmagine, glossario]);

  // Ritorno dalla scheda: la Persona vista torna in vista ed è evidenziata per qualche secondo.
  const ultimaRef = useRef<number | null>(ultimaPersonaVista());
  const [evidenziata, setEvidenziata] = useState<number | null>(null);
  const [pannelloAperto, setPannelloAperto] = useState<boolean>(() => CHIAVI_FILTRI.some((k) => params.has(k)));
  useEffect(() => {
    const id = ultimaRef.current;
    if (id === null || !dati) return;
    ultimaRef.current = null;
    const el = document.getElementById(`persona-${id}`);
    if (!el) return;
    el.scrollIntoView?.({ block: 'center' });
    const t1 = setTimeout(() => setEvidenziata(id), 0);
    const t2 = setTimeout(() => setEvidenziata(null), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [dati]);

  const elementi = glossario?.elementiAffinita?.length ? glossario.elementiAffinita : ELEMENTI_PREDEFINITI;
  const codici = glossario?.affinita ? Object.entries(glossario.affinita).filter(([k]) => k !== '-').map(([k, v]) => ({ chiave: k, nome: v.nome })) : CODICI_PREDEFINITI;

  /** Filtri attivi (oltre a ricerca e ordinamento), con testo per il chip e azione per toglierli. */
  const filtriAttivi: Array<{ chiave: string; testo: string; togli: () => void }> = [];
  if (arcana) filtriAttivi.push({ chiave: 'arcana', testo: `Arcano: ${glossario?.arcani.find((x) => x.chiave === arcana)?.nome ?? arcana}`, togli: () => imposta('arcana', '', '') });
  if (livelloMin > 1 || livelloMax < 99) filtriAttivi.push({ chiave: 'livello', testo: `Livello ${livelloMin}–${livelloMax}`, togli: () => impostaTutti({ lvMin: null, lvMax: null }) });
  if (elemento) filtriAttivi.push({ chiave: 'affinita', testo: `${elementi.find((x) => x.chiave === elemento)?.nome ?? elemento}${codice ? ` · ${codici.find((x) => x.chiave === codice)?.nome ?? codice}` : ''}`, togli: () => impostaTutti({ el: null, aff: null }) });
  if (immagine) filtriAttivi.push({ chiave: 'img', testo: immagine === 'con' ? 'Con immagine mia' : 'Senza immagine mia', togli: () => imposta('img', '', '') });
  if (!mostraDlc) filtriAttivi.push({ chiave: 'dlc', testo: 'Senza DLC', togli: () => imposta('dlc', true, true) });
  if (soloCatturabili) filtriAttivi.push({ chiave: 'catturabili', testo: 'Solo catturabili', togli: () => imposta('catturabili', false, false) });
  const azzeraFiltri = () => impostaTutti(Object.fromEntries(CHIAVI_FILTRI.map((k) => [k, null])));

  return (
    <div className="flex flex-col gap-4">
      <IntestazionePagina
        titolo="Compendio"
        sottotitolo="Tutte le Persona di Royal con affinità, skill, statistiche e i modi per ottenerle; tocca una scheda per il dettaglio."
        azioni={
          <>
            <div className="flex gap-1" role="group" aria-label="Vista">
              <button type="button" className={`chip touch ${vista === 'piastrelle' ? 'chip--attivo' : ''}`} onClick={() => impostaVista('piastrelle')} aria-pressed={vista === 'piastrelle'}>Piastrelle</button>
              <button type="button" className={`chip touch ${vista === 'elenco' ? 'chip--attivo' : ''}`} onClick={() => impostaVista('elenco')} aria-pressed={vista === 'elenco'}>Elenco</button>
            </div>
            <Link to="/compendio/glossario" className="chip touch no-underline">Glossario dei termini</Link>
            <span className="text-[13px] text-text-muted">{dati ? `${filtrate.length} di ${dati.length} Persona` : ''}</span>
          </>
        }
      />

      {/* Ricerca e ordinamento sempre visibili; gli altri filtri in un pannello a gruppi etichettati, riassunti da chip rimovibili. */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2 items-center">
          <CampoRicerca valore={q} onCambia={(v) => imposta('q', v, '')} segnaposto="Cerca Persona o arcano…" />
          <label className="flex items-center gap-1.5 text-[12px] text-text-secondary">
            Ordina
            <select className="form-input form-input--compatto" value={ordine} onChange={(e) => imposta('ordine', e.target.value, 'livello')} aria-label="Ordinamento">
              <option value="livello">Livello</option>
              <option value="nome">Nome</option>
              <option value="arcana">Arcano</option>
            </select>
          </label>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => imposta('dir', decrescente ? 'asc' : 'desc', 'asc')} aria-label={decrescente ? 'Ordine decrescente: passa a crescente' : 'Ordine crescente: passa a decrescente'} title={decrescente ? 'Decrescente' : 'Crescente'}>
            {decrescente ? '↓' : '↑'}
          </button>
          <button type="button" className={`btn btn-sm ${pannelloAperto ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPannelloAperto((v) => !v)} aria-expanded={pannelloAperto} aria-controls="pannello-filtri-compendio">
            Filtri{filtriAttivi.length > 0 ? ` (${filtriAttivi.length})` : ''}
          </button>
          {filtriAttivi.length > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={azzeraFiltri}>Azzera</button>}
        </div>
        {filtriAttivi.length > 0 && (
          <ul className="m-0 p-0 list-none flex flex-wrap gap-1.5" aria-label="Filtri attivi">
            {filtriAttivi.map((f) => (
              <li key={f.chiave}>
                <button type="button" className="chip chip--attivo touch" onClick={f.togli} aria-label={`Togli il filtro ${f.testo}`}>{f.testo} ×</button>
              </li>
            ))}
          </ul>
        )}
        {pannelloAperto && (
          <div id="pannello-filtri-compendio" className="card pannello-filtri" role="group" aria-label="Filtri del compendio">
            <div className="pannello-filtri__gruppo">
              <span className="pannello-filtri__etichetta">Arcano</span>
              <select className="form-input form-input--compatto" value={arcana} onChange={(e) => imposta('arcana', e.target.value, '')} aria-label="Arcano">
                <option value="">Tutti</option>
                {glossario?.arcani.map((a) => (
                  <option key={a.chiave} value={a.chiave}>{a.nome}</option>
                ))}
              </select>
            </div>
            <div className="pannello-filtri__gruppo" role="group" aria-label="Intervallo di livello">
              <span className="pannello-filtri__etichetta">Livello</span>
              <span className="flex items-center gap-1">
                <input type="number" min={1} max={99} className="form-input form-input--compatto w-[64px]" value={livelloMin} onChange={(e) => imposta('lvMin', livelloValido(e.target.value, 1), 1)} aria-label="Livello minimo" />
                <span className="text-text-muted">–</span>
                <input type="number" min={1} max={99} className="form-input form-input--compatto w-[64px]" value={livelloMax} onChange={(e) => imposta('lvMax', livelloValido(e.target.value, 99), 99)} aria-label="Livello massimo" />
              </span>
            </div>
            <div className="pannello-filtri__gruppo" role="group" aria-label="Affinità">
              <span className="pannello-filtri__etichetta">Affinità</span>
              <span className="flex items-center gap-1">
                <select className="form-input form-input--compatto" value={elemento} onChange={(e) => imposta('el', e.target.value, '')} aria-label="Elemento dell'affinità">
                  <option value="">Elemento</option>
                  {elementi.map((el) => <option key={el.chiave} value={el.chiave}>{el.nome}</option>)}
                </select>
                <select className="form-input form-input--compatto" value={codice} onChange={(e) => imposta('aff', e.target.value, '')} aria-label="Tipo di affinità" disabled={!elemento}>
                  <option value="">Qualsiasi</option>
                  {codici.map((c) => <option key={c.chiave} value={c.chiave}>{c.nome}</option>)}
                </select>
              </span>
            </div>
            <div className="pannello-filtri__gruppo">
              <span className="pannello-filtri__etichetta">Immagine mia</span>
              <select className="form-input form-input--compatto" value={immagine} onChange={(e) => imposta('img', e.target.value, '')} aria-label="Immagine personalizzata">
                <option value="">Tutte</option>
                <option value="con">Presente</option>
                <option value="senza">Assente</option>
              </select>
            </div>
            <div className="pannello-filtri__gruppo" role="group" aria-label="Inclusioni">
              <span className="pannello-filtri__etichetta">Inclusioni</span>
              <span className="flex items-center gap-1">
                <button type="button" className={`chip touch ${mostraDlc ? 'chip--attivo' : ''}`} onClick={() => imposta('dlc', !mostraDlc, true)} aria-pressed={mostraDlc}>DLC</button>
                <button type="button" className={`chip touch ${soloCatturabili ? 'chip--attivo' : ''}`} onClick={() => imposta('catturabili', !soloCatturabili, false)} aria-pressed={soloCatturabili}>Solo catturabili</button>
              </span>
            </div>
          </div>
        )}
      </div>

      <PageState isLoading={caricamento} error={errore} onRetry={() => void ricarica()}>
        {filtrate.length === 0 ? (
          <EmptyState title="Nessuna Persona corrisponde ai filtri" hint="Prova ad allargare l'intervallo di livello, a cambiare arcano o a togliere i filtri di affinità e immagine." />
        ) : vista === 'piastrelle' ? (
          <ul className="m-0 p-0 list-none grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5" aria-label="Persona">
            {filtrate.map((p) => <PiastrellaPersona key={p.id} persona={p} evidenziata={evidenziata === p.id} onApri={() => ricordaUltimaPersona(p.id)} />)}
          </ul>
        ) : (
          <ul className="m-0 p-0 list-none grid gap-2 grid-cols-1 xl:grid-cols-2" aria-label="Persona">
            {filtrate.map((p) => (
              <li key={p.id} id={`persona-${p.id}`}>
                <Link to={`/compendio/persona/${p.id}`} className={`card card--cliccabile flex items-center gap-3 no-underline text-text ${evidenziata === p.id ? 'card--evidenza' : ''}`} onClick={() => ricordaUltimaPersona(p.id)}>
                  <span onClick={(e) => e.preventDefault()} className="shrink-0"><ImmagineEntita ambito="persona" chiave={p.nome} etichetta={p.nomeIt} dimensione={64} adatta="copri" /></span>
                  <LivelloBadge livello={p.livello} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display uppercase text-[18px] leading-none truncate">{p.nomeIt}</span>
                      {p.nomeIt !== p.nome && <span className="text-[12px] text-text-muted truncate">{p.nome}</span>}
                      <span className="chip">{p.arcanaNome}</span>
                      {p.dlc && <BadgeStato nome="dlc" testo="DLC" />}
                      {p.rara && <BadgeStato nome="tesoro" testo="Tesoro" />}
                      {p.speciale && <BadgeStato nome="speciale" testo="Speciale" />}
                      {p.richiedeConfidenteMax && <span className="chip">Confidente max</span>}
                    </div>
                    <div className="mt-1.5">
                      <AffinitaGriglia affinita={p.affinita} compatta />
                    </div>
                  </div>
                  <IconChevronRight size={18} className="text-text-muted shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageState>
    </div>
  );
}
