// ============================================================
// CompendioPage — le 232 Persona con filtri (client-side): piastrelle con arte grande (default) o elenco compatto
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

type Ordine = 'livello' | 'nome' | 'arcana';

/** Elenco Persona: ricerca, arcano, intervallo di livello, DLC/rare/speciali, ordinamento; vista a piastrelle o compatta ricordata per dispositivo. */
export function CompendioPage() {
  useDocumentTitle('Compendio');
  const glossario = useGlossarioStore((s) => s.glossario);
  const vista = usePreferenzeStore((s) => s.vistaPersona);
  const impostaVista = usePreferenzeStore((s) => s.impostaVistaPersona);
  const { dati, caricamento, errore, ricarica } = useCarica(() => getPersone(), []);
  const [q, setQ] = useState('');
  const [arcana, setArcana] = useState('');
  const [livelloMax, setLivelloMax] = useState(99);
  const [mostraDlc, setMostraDlc] = useState(true);
  const [soloCatturabili, setSoloCatturabili] = useState(false);
  const [ordine, setOrdine] = useState<Ordine>('livello');

  const filtrate = useMemo(() => {
    if (!dati) return [];
    const testo = q.trim().toLowerCase();
    const lista = dati.filter((p) =>
      (!testo || p.nome.toLowerCase().includes(testo) || p.nomeIt.toLowerCase().includes(testo) || p.arcanaNome.toLowerCase().includes(testo))
      && (!arcana || p.arcana === arcana)
      && p.livello <= livelloMax
      && (mostraDlc || !p.dlc)
      && (!soloCatturabili || (!p.speciale && !p.rara && !p.dlc)),
    );
    const ordArcana = new Map((glossario?.arcani ?? []).map((a) => [a.chiave, a.ordine]));
    return lista.sort((a, b) => {
      if (ordine === 'nome') return a.nome.localeCompare(b.nome, 'it');
      if (ordine === 'arcana') return (ordArcana.get(a.arcana) ?? 0) - (ordArcana.get(b.arcana) ?? 0) || a.livello - b.livello;
      return a.livello - b.livello || a.nome.localeCompare(b.nome, 'it');
    });
  }, [dati, q, arcana, livelloMax, mostraDlc, soloCatturabili, ordine, glossario]);

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

      <div className="flex flex-wrap gap-2 items-center">
        <CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca Persona o arcano…" />
        <select className="form-input w-auto min-w-[160px]" value={arcana} onChange={(e) => setArcana(e.target.value)} aria-label="Arcano">
          <option value="">Tutti gli arcani</option>
          {glossario?.arcani.map((a) => (
            <option key={a.chiave} value={a.chiave}>{a.nome}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-[13px] text-text-secondary">
          Livello ≤ <span className="font-semibold text-text w-7">{livelloMax}</span>
          <input type="range" min={1} max={99} value={livelloMax} onChange={(e) => setLivelloMax(Number(e.target.value))} aria-label="Livello massimo" className="w-[120px]" />
        </label>
        <select className="form-input w-auto" value={ordine} onChange={(e) => setOrdine(e.target.value as Ordine)} aria-label="Ordinamento">
          <option value="livello">Per livello</option>
          <option value="nome">Per nome</option>
          <option value="arcana">Per arcano</option>
        </select>
        <button type="button" className={`chip touch ${mostraDlc ? 'chip--attivo' : ''}`} onClick={() => setMostraDlc((v) => !v)} aria-pressed={mostraDlc}>DLC</button>
        <button type="button" className={`chip touch ${soloCatturabili ? 'chip--attivo' : ''}`} onClick={() => setSoloCatturabili((v) => !v)} aria-pressed={soloCatturabili}>Solo catturabili</button>
      </div>

      <PageState isLoading={caricamento} error={errore} onRetry={() => void ricarica()}>
        {filtrate.length === 0 ? (
          <EmptyState title="Nessuna Persona corrisponde ai filtri" hint="Prova ad allargare l'intervallo di livello o a cambiare arcano." />
        ) : vista === 'piastrelle' ? (
          <ul className="m-0 p-0 list-none grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5" aria-label="Persona">
            {filtrate.map((p) => <PiastrellaPersona key={p.id} persona={p} />)}
          </ul>
        ) : (
          <ul className="m-0 p-0 list-none grid gap-2 grid-cols-1 xl:grid-cols-2" aria-label="Persona">
            {filtrate.map((p) => (
              <li key={p.id}>
                <Link to={`/compendio/persona/${p.id}`} className="card card--cliccabile flex items-center gap-3 no-underline text-text">
                  <span onClick={(e) => e.preventDefault()} className="shrink-0"><ImmagineEntita ambito="persona" chiave={p.nome} etichetta={p.nome} dimensione={64} adatta="copri" /></span>
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
