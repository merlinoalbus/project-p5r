// ============================================================
// MieiDati — le righe del catalogo che hai aggiunto, corretto o nascosto (Fase 16.1)
// ============================================================
//
// I dati della guida vengono ricaricati a ogni avvio: quello che aggiungi o correggi resta, ed è qui che
// lo ritrovi tutto insieme, con «Ripristina» per tornare al dato originale.
// ============================================================

import { useState } from 'react';
import { getCatalogo, getRiepilogoCatalogo } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { ModuloCatalogo } from '../guida/ModuloCatalogo';
import type { ElementoCatalogoDto, TipoCatalogo } from '../../types';

const NOME_TIPO: Record<TipoCatalogo, { singolare: string; plurale: string }> = {
  negozio: { singolare: 'negozio', plurale: 'Negozi' },
  articolo: { singolare: 'articolo', plurale: 'Articoli dei negozi' },
  libro: { singolare: 'libro', plurale: 'Libri' },
  film: { singolare: 'film', plurale: 'Film e DVD' },
  attivita: { singolare: 'attività', plurale: 'Attività, lavori e videogiochi' },
  domanda: { singolare: 'domanda', plurale: 'Domande in classe e agli esami' },
  cruciverba: { singolare: 'riga del cruciverba', plurale: 'Cruciverba' },
};

export function MieiDati() {
  const riepilogo = useCarica(() => getRiepilogoCatalogo(), []);
  const [aperto, setAperto] = useState<TipoCatalogo | null>(null);
  const [inModifica, setInModifica] = useState<ElementoCatalogoDto | null>(null);
  const elenco = useCarica(() => (aperto ? getCatalogo(aperto) : Promise.resolve(null)), [aperto]);
  const perTipo = riepilogo.dati?.perTipo ?? [];
  const totale = perTipo.reduce((s, t) => s + t.creati + t.modificati + t.nascosti, 0);

  const ricarica = () => { void riepilogo.ricarica(); void elenco.ricarica(); };

  return (
    <section className="card flex flex-col gap-3" aria-label="I miei dati">
      <h2 className="m-0 text-[15px] font-semibold">I miei dati</h2>
      <p className="m-0 text-[13px] text-text-secondary">
        Le righe che hai aggiunto o corretto tu sopra i dati della guida. Restano anche quando i dati vengono ricaricati:
        «Ripristina dalla guida» rimette l'originale, e le righe che hai aggiunto tu si eliminano dallo stesso pulsante.
      </p>
      {riepilogo.errore && <p className="m-0 text-[13px] text-error">{riepilogo.errore}</p>}
      {totale === 0 && !riepilogo.caricamento && (
        <p className="m-0 text-[13px] text-text-muted">Non hai ancora aggiunto né corretto nulla: lo puoi fare dalle pagine dei negozi e dei giorni.</p>
      )}
      <ul className="m-0 p-0 list-none flex flex-col gap-1">
        {perTipo.filter((t) => t.creati + t.modificati + t.nascosti > 0).map((t) => (
          <li key={t.tipo} className="flex flex-col gap-1 border-b border-border-light last:border-0 pb-1">
            <button type="button" className="flex items-center justify-between gap-2 text-left touch bg-transparent border-0 p-0 text-[14px]"
              onClick={() => setAperto(aperto === t.tipo ? null : t.tipo)} aria-expanded={aperto === t.tipo}>
              <strong>{NOME_TIPO[t.tipo]?.plurale ?? t.tipo}</strong>
              <span className="text-[12px] text-text-secondary">
                {[t.creati && `${t.creati} aggiunti`, t.modificati && `${t.modificati} corretti`, t.nascosti && `${t.nascosti} nascosti`].filter(Boolean).join(' · ')}
              </span>
            </button>
            {aperto === t.tipo && (
              <ul className="m-0 p-0 list-none flex flex-col gap-0.5">
                {elenco.errore && <li className="text-[13px] text-error">{elenco.errore}</li>}
                {(elenco.dati ?? []).map((e) => (
                  <li key={e.chiave} className="flex items-center justify-between gap-2 text-[13px] py-0.5">
                    <span className={`flex-1 min-w-0 ${e.nascosta ? 'line-through text-text-muted' : ''}`}>
                      {e.nome}
                      <span className="text-[11px] text-text-muted"> · {e.modificata ? 'corretta da te' : e.origine === 'utente' ? 'aggiunta da te' : 'nascosta'}</span>
                    </span>
                    <button type="button" className="visore-mappa__azione-testo touch" onClick={() => setInModifica(e)} aria-label={`Apri ${e.nome}`}>Apri</button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {inModifica && (
        <ModuloCatalogo tipo={inModifica.tipo} elemento={inModifica} onChiudi={() => setInModifica(null)}
          onSalvato={() => { setInModifica(null); ricarica(); }} />
      )}
    </section>
  );
}
