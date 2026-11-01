// ============================================================
// MieiDati — le righe del catalogo che hai aggiunto, corretto o nascosto (Fase 16.1)
// ============================================================
//
// Quello che aggiungi o correggi nei dati della guida (in `gioco.db`) lo ritrovi qui tutto insieme, con «Ripristina» per tornare al
// dato originale. «Importa» sostituisce `gioco.db`, e con lui anche queste righe.
// ============================================================

import { useState } from 'react';
import { getCatalogo, getRiepilogoCatalogo } from '../../services/api';
import { NOME_TIPO_CATALOGO } from '../../utils/catalogo';
import { useCarica } from '../../hooks/useCarica';
import { ModuloCatalogo } from '../guida/ModuloCatalogo';
import type { ElementoCatalogoDto, TipoCatalogo } from '../../types';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { TitoloSezione } from '../shared/TitoloSezione';

/**
 * Card «I miei dati» delle Impostazioni: per ogni tipo del catalogo con righe dell'utente mostra quante ne ha
 * aggiunte, corrette o nascoste; toccando un tipo si apre l'elenco delle sue righe (caricato solo allora) e
 * ogni riga si apre nel modulo del catalogo per correggerla o ripristinarla.
 */
export function MieiDati() {
  const riepilogo = useCarica(() => getRiepilogoCatalogo(), []);
  const [aperto, setAperto] = useState<TipoCatalogo | null>(null);
  const [inModifica, setInModifica] = useState<ElementoCatalogoDto | null>(null);
  const elenco = useCarica(() => (aperto ? getCatalogo(aperto) : Promise.resolve(null)), [aperto]);
  const perTipo = riepilogo.dati?.perTipo ?? [];
  const totale = perTipo.reduce((s, t) => s + t.creati + t.modificati + t.nascosti, 0);

  /** Rilegge sia il riepilogo per tipo sia l'elenco del tipo aperto (dopo un salvataggio nel modulo). */
  const ricarica = () => { void riepilogo.ricarica(); void elenco.ricarica(); };

  return (
    <section id="miei-dati" className="card flex flex-col gap-3" aria-label="I miei dati">
      <TitoloSezione>I miei dati</TitoloSezione>
      {/* `testo-link-esteso`: il collegamento «Nascosti dalla guida» sta dentro la frase (16 px di altezza): area di tocco da 44 px senza cambiare la riga */}
      <p className="m-0 testo-13 text-text-secondary testo-link-esteso">
        Le righe che hai aggiunto o corretto tu sopra i dati della guida. «Ripristina dalla guida» rimette l'originale, e le righe che hai
        aggiunto tu si eliminano dallo stesso pulsante. Stanno nei dati di gioco: importando un backup dei dati di gioco si sostituiscono anche loro.
        Le righe nascoste dagli elenchi stanno in <a href="#nascosti">Nascosti dalla guida</a>, qui sotto nel Cestino, con il ripristino in un tocco.
      </p>
      {riepilogo.errore && <p className="m-0 testo-13 text-error-testo">{riepilogo.errore}</p>}
      {totale === 0 && !riepilogo.caricamento && (
        <p className="m-0 testo-13 text-text-muted">Non hai ancora aggiunto né corretto nulla: lo puoi fare dalle pagine dei negozi e dei giorni.</p>
      )}
      <ul className="m-0 p-0 list-none flex flex-col gap-1">
        {perTipo.filter((t) => t.creati + t.modificati + t.nascosti > 0).map((t) => (
          <li key={t.tipo} className="flex flex-col gap-1 border-b border-border-light last:border-0 pb-1">
            <button type="button" className="flex items-center justify-between gap-2 text-left touch bg-transparent border-0 p-0 testo-14"
              onClick={() => setAperto(aperto === t.tipo ? null : t.tipo)} aria-expanded={aperto === t.tipo}>
              <strong>{NOME_TIPO_CATALOGO[t.tipo]?.plurale ?? t.tipo}</strong>
              <span className="testo-12 text-text-secondary">
                {[t.creati && `${t.creati} aggiunti`, t.modificati && `${t.modificati} corretti`, t.nascosti && `${t.nascosti} nascosti`].filter(Boolean).join(' · ')}
              </span>
            </button>
            {aperto === t.tipo && (
              <ul className="m-0 p-0 list-none flex flex-col gap-0.5">
                {elenco.errore && <li className="testo-13 text-error-testo">{elenco.errore}</li>}
                {(elenco.dati ?? []).map((e) => (
                  <li key={e.chiave} className="flex items-center justify-between gap-2 testo-13 py-0.5">
                    <span className={`flex-1 min-w-0 ${e.nascosta ? 'line-through text-text-muted' : ''}`}>
                      {e.nome}
                      <span className="testo-12 text-text-muted"> · {e.modificata ? 'corretta da te' : e.origine === 'utente' ? 'aggiunta da te' : 'nascosta'}</span>
                    </span>
                    <PulsanteVisivo tono="fantasma" compatto className="shrink-0" icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Apri" onClick={() => setInModifica(e)} aria-label={`Apri ${e.nome}`} />
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
