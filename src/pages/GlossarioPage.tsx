// ============================================================
// GlossarioPage — termini della localizzazione italiana ufficiale (dalla guida) per categoria
// ============================================================

import { useDeferredValue, useMemo, useState } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { useElementoDaIndirizzo } from '../hooks/useElementoDaIndirizzo';
import { getTermini, URL_TERMINI } from '../services/api';
import { PageState, EmptyState } from '../components/shared/PageState';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import type { TermineDto } from '../types';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { TitoloSezione } from '../components/shared/TitoloSezione';
import { nomeCategoriaTermine } from '../../shared/categorieTermine';
import { slug } from '../../shared/slug';

const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';
/** L'id della riga di un termine: la «casa» che la ricerca globale dà al termine è `?elemento=<slug della chiave>`. */
const idTermine = (chiave: string) => `elemento-${slug(chiave)}`;

/** Glossario italiano ↔ inglese dei termini di gioco, con ricerca e filtro per categoria. */
export function GlossarioPage() {
  useDocumentTitle('Glossario');
  const { dati, inPrimoCaricamento, errore, ricarica } = useCarica(() => getTermini(), [], { cacheUrl: URL_TERMINI });
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  // `?elemento=<chiave>` (la «casa» di un termine nella ricerca globale) porta in vista il termine e lo evidenzia
  useElementoDaIndirizzo(!!dati);

  const categorie = useMemo(() => [...new Set((dati ?? []).map((t) => t.categoria))], [dati]);
  // L5-09: il campo segue subito la battuta, l'elenco (centinaia di termini, con filtro, ordine e raggruppamento) si rifà con il testo
  // «differito»: calcolo e disegno a priorità bassa, interrotti alla battuta dopo (stesso criterio di Compendio e Skill)
  const qDifferita = useDeferredValue(q);
  const filtrati = useMemo(() => {
    const testo = qDifferita.trim().toLowerCase();
    return (dati ?? [])
      .filter((t) => (!categoria || t.categoria === categoria) && (!testo || t.nome.toLowerCase().includes(testo) || t.chiave.toLowerCase().includes(testo) || (t.definizione ?? '').toLowerCase().includes(testo)))
      .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome, 'it'));
  }, [dati, qDifferita, categoria]);

  const perCategoria = useMemo(() => {
    const m = new Map<string, TermineDto[]>();
    for (const t of filtrati) m.set(t.categoria, [...(m.get(t.categoria) ?? []), t]);
    return m;
  }, [filtrati]);

  return (
    <div className="flex flex-col gap-4">
      <IntestazionePagina
        titolo="Glossario dei termini"
        indietro={{ to: '/compendio', etichetta: 'Compendio' }}
        azioni={<span className="testo-13 text-text-muted">{dati ? `${filtrati.length} di ${dati.length}` : ''}</span>}
      />
      {/* la descrizione sta nel corpo, non nell'intestazione: con titolo e «indietro» il sottotitolo portava il fondo dell'intestazione al 37%
          dell'altezza a 1280×689 (soglia dell'utente: 30%) */}
      {/* L7-01/L7-09: la fonte sta solo in Impostazioni → Informazioni; dove si correggono i termini lo deve sapere solo chi prepara i contenuti */}
      <p className="m-0 testo-13 text-text-secondary max-w-[120ch]">Termini della localizzazione italiana ufficiale di Persona 5 Royal con il corrispondente inglese.{!IN_RILASCIO && ' Si correggono in Impostazioni → Traduzioni (ambito «termine»).'}</p>
      <div className="flex flex-wrap gap-2 items-center">
        <CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca in italiano o inglese…" />
        <div className="flex gap-1.5 flex-wrap">
          <button type="button" className={`chip touch ${categoria === '' ? 'chip--attivo' : ''}`} onClick={() => setCategoria('')} aria-pressed={categoria === ''}>Tutte</button>
          {categorie.map((c) => (
            <button key={c} type="button" className={`chip touch ${categoria === c ? 'chip--attivo' : ''}`} onClick={() => setCategoria(c)} aria-pressed={categoria === c}>{nomeCategoriaTermine(c)}</button>
          ))}
        </div>
      </div>
      <PageState isLoading={inPrimoCaricamento} error={errore} onRetry={() => void ricarica()}>
        {dati && dati.length === 0 ? (
          <EmptyState title="Glossario non ancora disponibile" hint="Questa versione dei dati di gioco non contiene i termini del glossario." />
        ) : filtrati.length === 0 ? (
          <EmptyState title="Nessun termine corrisponde alla ricerca" />
        ) : (
          [...perCategoria.entries()].map(([cat, termini]) => (
            <section key={cat} className="card">
              <TitoloSezione className="mb-2">{nomeCategoriaTermine(cat)}</TitoloSezione>
              <dl className="m-0 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                {termini.map((t) => (
                  <div key={`${t.categoria}/${t.chiave}`} id={idTermine(t.chiave)} className="flex flex-col scroll-mt-20 rounded-md">
                    <dt className="font-semibold testo-14">{t.nome} <span className="testo-12 font-normal text-text-muted">({t.chiave})</span></dt>
                    {t.definizione && <dd className="m-0 testo-13 text-text-secondary">{t.definizione}</dd>}
                  </div>
                ))}
              </dl>
            </section>
          ))
        )}
      </PageState>
    </div>
  );
}
