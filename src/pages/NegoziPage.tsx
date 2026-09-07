// ============================================================
// NegoziPage — negozi per quartiere e ricerca degli articoli in tutti i negozi (Fase 8.2)
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNegozi, ricercaArticoli } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { NOME_CATEGORIA_ARTICOLO, NOME_TIPO_NEGOZIO, PERSONAGGI } from '../utils/negozi';
import { ArticoliTabella } from '../components/guida/ArticoliTabella';
import type { NegozioRiassuntoDto } from '../types';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { IconaCategoria } from '../components/guida/IconaCategoria';
import { useSuggerimenti } from '../stores/suggerimentiStore';
import { classiSuggerito } from '../utils/suggerimenti';
import { TargaSuggerito } from '../components/shared/Suggerito';
import { ChipDisponibilita } from '../components/guida/ChipDisponibilita';
import { ModuloCatalogo } from '../components/guida/ModuloCatalogo';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { DoveSiTrova } from '../components/mappe/DoveSiTrova';

export function NegoziPage() {
  const sugg = useSuggerimenti();
  useDocumentTitle('Negozi e inventario');
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  // giorno corrente e fascia della giornata decidono la disponibilità: al cambio si ricarica
  const momento = `${attiva?.dataGioco ?? ''}|${attiva?.fasciaGioco ?? ''}`;
  const negozi = useCarica(() => getNegozi(partitaId ?? undefined), [partitaId, momento]);
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const [per, setPer] = useState('');
  const [negozioSelezionato, setNegozioSelezionato] = useState<NegozioRiassuntoDto | null>(null);
  // negozio aggiunto dall'utente: resta anche quando i dati della guida vengono aggiornati (16.1)
  const [nuovoNegozio, setNuovoNegozio] = useState(false);
  const cerca = q.trim().length >= 2 || categoria !== '' || per !== '';
  const risultati = useCarica(() => (cerca ? ricercaArticoli({ q: q.trim() || undefined, categoria: categoria || undefined, per: per || undefined }, partitaId ?? undefined) : Promise.resolve(null)), [q, categoria, per, partitaId, cerca, momento]);
  const lista = negozi.dati;
  // Con una partita attiva una voce bloccata non viene anticipata: appare soltanto quando il
  // requisito (data, libro completato, Confidente...) diventa realmente soddisfatto.
  const listaVisibile = useMemo(() => (lista ?? []).filter((n) => !partitaId || n.disponibilita?.stato !== 'bloccato'), [lista, partitaId]);
  const totaleArticoliVisibili = listaVisibile.reduce((somma, negozio) => somma + negozio.articoli, 0);
  const termineNegozio = q.trim().toLocaleLowerCase('it');
  const negoziTrovati = useMemo(() => termineNegozio.length >= 2
    ? listaVisibile.filter((n) => `${n.nome} ${n.quartiereNome ?? ''} ${n.luogo}`.toLocaleLowerCase('it').includes(termineNegozio))
    : [], [listaVisibile, termineNegozio]);
  const gruppi = useMemo(() => {
    const m = new Map<string, { nome: string; negozi: NegozioRiassuntoDto[] }>();
    for (const n of listaVisibile) {
      const k = n.luogoChiave ?? (n.tipo === 'online' ? '__online' : n.tipo === 'ambulante' ? '__ambulanti' : '__altro');
      const g = m.get(k) ?? { nome: n.quartiereNome ?? (k === '__online' ? 'Online' : k === '__ambulanti' ? 'Ambulanti' : 'Quartiere da assegnare'), negozi: [] };
      g.negozi.push(n); m.set(k, g);
    }
    return [...m.entries()];
  }, [listaVisibile]);
  const articoliVisibili = useMemo(() => (risultati.dati?.articoli ?? []).filter((a) => !partitaId || a.disponibilita?.stato !== 'bloccato'), [risultati.dati, partitaId]);
  const selezioneVisibile = negozioSelezionato
    && listaVisibile.some((n) => n.chiave === negozioSelezionato.chiave)
    && (!cerca || negoziTrovati.some((n) => n.chiave === negozioSelezionato.chiave))
    ? negozioSelezionato
    : null;
  const cambiaPosizione = (negozio: NegozioRiassuntoDto) => {
    setNegozioSelezionato((corrente) => corrente?.chiave === negozio.chiave ? null : negozio);
  };
  return (
    <PageState isLoading={negozi.caricamento && !negozi.dati} error={negozi.errore} onRetry={() => void negozi.ricarica()}>
      {negozi.dati && (
        <div className="flex flex-col gap-3">
          <IntestazionePagina titolo="Negozi e inventario" sottotitolo={<>{listaVisibile.length} {listaVisibile.length === 1 ? 'negozio o punto di acquisto' : 'negozi e punti di acquisto'} con {totaleArticoliVisibili} {totaleArticoliVisibili === 1 ? 'articolo disponibile' : 'articoli disponibili'}: armi, protezioni, accessori, oggetti, regali, cibo e materiali con prezzi, sblocchi e condizioni. Cerca un articolo in tutti i negozi o apri un negozio.</>} />
          <div className="flex justify-start sm:justify-end sm:-mt-2">
            <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="carica-altri" dimensione={20} />} titolo="Aggiungi un negozio" dettaglio="resta dopo gli aggiornamenti" onClick={() => setNuovoNegozio(true)} />
          </div>
          {nuovoNegozio && <ModuloCatalogo tipo="negozio" onChiudi={() => setNuovoNegozio(false)} onSalvato={() => { setNuovoNegozio(false); void negozi.ricarica(); }} />}
          <div className="flex flex-col gap-1.5">
            <CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca un articolo (nome, effetto) o un negozio…" />
            <div className="flex flex-wrap gap-1.5">
              <select className="form-input w-auto" value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
                <option value="">Tutte le categorie</option>
                {Object.entries(NOME_CATEGORIA_ARTICOLO).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
              </select>
              <select className="form-input w-auto" value={per} onChange={(e) => setPer(e.target.value)} aria-label="Per chi">
                <option value="">Per chiunque</option>
                {PERSONAGGI.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          {selezioneVisibile && <DoveSiTrova
            tipo="negozio"
            chiave={selezioneVisibile.chiave}
            titolo={`Dove si trova ${selezioneVisibile.nome}`}
            altezza={300}
          />}
          {cerca && termineNegozio.length >= 2 && <section aria-label="Negozi trovati" className="catalogo-risultati-negozi"><h2>Negozi trovati</h2>{negoziTrovati.map(n => <div className="card flex flex-wrap items-center justify-between gap-2" key={n.chiave}><Link className="touch no-underline text-text" to={`/guida/negozi/${encodeURIComponent(n.chiave)}`}><strong>{n.nome}</strong> · {n.quartiereNome ?? 'Senza quartiere'} · {n.articoli} articoli</Link><button type="button" className={`btn btn-sm touch ${negozioSelezionato?.chiave === n.chiave ? 'btn-primary' : 'btn-ghost'}`} aria-label={`Mostra posizione di ${n.nome}`} aria-pressed={negozioSelezionato?.chiave === n.chiave} onClick={() => cambiaPosizione(n)}><IconaAzione chiave="mappa" dimensione={16} /> Posizione</button></div>)}</section>}
          {cerca ? (
            <PageState isLoading={risultati.caricamento && !risultati.dati} error={risultati.errore} onRetry={() => void risultati.ricarica()}>
              {risultati.dati && (
                <div className="flex flex-col gap-1.5">
                  <p className="m-0 text-[12px] text-text-muted">{partitaId ? `${risultati.dati.totale} articoli disponibili trovati${risultati.dati.totale > articoliVisibili.length ? ` (mostrati i primi ${articoliVisibili.length})` : ''}` : `${risultati.dati.totale} articoli trovati${risultati.dati.totale > risultati.dati.articoli.length ? ` (mostrati i primi ${risultati.dati.articoli.length})` : ''}`}.</p>
                  <ArticoliTabella articoli={articoliVisibili} partitaId={partitaId} mostraNegozio onCambiato={(a) => risultati.imposta(risultati.dati ? { ...risultati.dati, articoli: risultati.dati.articoli.map((x) => (x.chiave === a.chiave ? a : x)) } : null)} />
                </div>
              )}
            </PageState>
          ) : (
            gruppi.map(([k, g]) => (
              <section key={k} className="flex flex-col gap-1.5">
                <h2 className="m-0 text-[15px] font-semibold">{k.startsWith('__') ? g.nome : <Link to={`/guida/citta/${k}`} className="no-underline text-text">{g.nome}</Link>}</h2>
                <ul className="m-0 p-0 list-none grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label={`Negozi: ${g.nome}`}>
                  {g.negozi.map((n) => (
                    <li key={n.chiave}>
                      <div className={`card card--cliccabile text-text flex flex-col gap-2 h-full ${classiSuggerito(sugg.evidenziato('negozi', n.chiave))}`}>
                        <Link to={`/guida/negozi/${encodeURIComponent(n.chiave)}`} className="no-underline text-text flex flex-1 flex-col gap-1 touch">
                          <span className="flex flex-wrap items-center gap-2"><IconaCategoria categoria={n.tipo} dimensione={30} /><strong className="font-display uppercase text-[18px] leading-none">{n.nome}</strong><span className="chip">{NOME_TIPO_NEGOZIO[n.tipo] ?? n.tipo}</span><ChipDisponibilita disponibilita={n.disponibilita} compatto />{sugg.evidenziato('negozi', n.chiave) && <TargaSuggerito motivo={sugg.motivo('negozi', n.chiave)} compatta />}</span>
                          <span className="text-[12px] text-text-secondary">{n.articoli} {n.articoli === 1 ? 'articolo' : 'articoli'}{n.verificati < n.articoli ? ` · ${n.articoli - n.verificati} da fonte secondaria` : ''}{n.gestore ? ` · ${n.gestore}` : ''}</span>
                          {n.luogo && <span className="text-[12px] text-text-muted">{n.luogo}</span>}
                        </Link>
                        <button type="button" className={`btn btn-sm touch self-start ${negozioSelezionato?.chiave === n.chiave ? 'btn-primary' : 'btn-ghost'}`} aria-label={`Mostra posizione di ${n.nome}`} aria-pressed={negozioSelezionato?.chiave === n.chiave} onClick={() => cambiaPosizione(n)}><IconaAzione chiave="mappa" dimensione={16} /> Posizione</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      )}
    </PageState>
  );
}
