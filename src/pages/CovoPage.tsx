// ============================================================
// CovoPage — il Covo dei Ladri
// ============================================================
//
// Era una **scheda dentro un'altra pagina**: la terza linguetta di «Trofei, finali e Covo dei
// Ladri», dove 52 sfide stavano in un elenco puntato e 36 premi in una tabella, senza un filtro,
// senza una ricerca e senza modo di sapere a che punto si è. Ma il Covo non è un capitolo dei
// trofei: è un'area del gioco con una valuta sua — le Medaglie P — che si guadagnano facendo
// cose e si spendono per sbloccarne altre. È un ciclo, e un ciclo si guarda tutto insieme.
//
// Da qui la pagina: le sfide da una parte, i premi dall'altra, e in cima quel che i dati sanno
// dire — quante sfide, quante voci di catalogo, in che fascia stanno i prezzi. Non un bilancio:
// la guida dichiara il totale delle medaglie ottenibili ma non quante ne dia ogni sfida, e le
// righe dei premi sono categorie che raccolgono più elementi; il perché è scritto sopra `conti`.
//
// I dati non sono nuovi e non li ho inventati: sono `completamento.json → covo`, gli stessi che la
// vecchia linguetta mostrava. Quel che cambia è che si possono cercare, contare e leggere in due
// colonne invece che in un elenco puntato lungo cinquantadue righe.
//
// Il Covo è anche un posto sulla **mappa di Tokyo**, e questa pagina è l'altro capo di quel
// collegamento: il cartellino in basso a sinistra porta qui.
// ============================================================

import { useMemo, useState } from 'react';
import { getCompletamento } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageState } from '../components/shared/PageState';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { TestoRipiegabile } from '../components/shared/TestoRipiegabile';
import { IconaSegno, type ChiaveSegno } from '../components/shared/IconaAzione';
import type { CompletamentoDto } from '../types';

type Covo = CompletamentoDto['covo'];

/** Che forma hanno i dati del Covo: quante sfide, quante voci di catalogo, in che fascia di prezzo.
 *
 * **Qui c'era un bilancio e l'ho tolto**, perché era falso pur essendo aritmeticamente esatto.
 * Sommava le medaglie delle sfide (tutte a `null`: la guida dichiara solo il totale complessivo,
 * non quante ne dia ciascuna) e i costi dei premi, e concludeva «mancano 201 medaglie». Ma le 36
 * righe dei premi non sono 36 oggetti: sono categorie che ne raccolgono molti — «Personae della
 * Stanza di Velluto» sono tredici elementi da 5 medaglie l'uno — quindi quei costi non si possono
 * sommare in una spesa totale, e la differenza fra due totali sbagliati non è un risultato.
 *
 * Restano i conti che i dati reggono davvero: quanti pezzi ci sono, quanti dichiarano un valore e
 * fra che minimo e che massimo stanno i prezzi. Il totale delle medaglie ottenibili lo dice la
 * guida stessa, nel testo qui sotto, ed è lì che va letto. Il bilancio ricompare da solo il giorno
 * in cui **tutte** le sfide avranno un valore dichiarato: fino ad allora un totale parziale
 * sarebbe la stessa bugia di prima, solo più piccola. */
function conti(covo: Covo) {
  const costi = covo.premi.map((p) => p.costo).filter((c): c is number => c !== null).sort((a, b) => a - b);
  const conValore = covo.sfide.filter((s) => s.medaglie !== null);
  return {
    premiConPrezzo: costi.length,
    minimo: costi[0] ?? null,
    massimo: costi[costi.length - 1] ?? null,
    sfideConValore: conValore.length,
    // Solo se le dichiarano tutte: un totale su una parte delle sfide sembra il totale e non lo è.
    guadagno: conValore.length === covo.sfide.length && covo.sfide.length > 0 ? conValore.reduce((s, x) => s + (x.medaglie ?? 0), 0) : null,
  };
}

/** Il prezzo di una voce, o la fascia dei prezzi: sempre con l'unità scritta per esteso. */
function medaglie(n: number): string {
  return `${n} ${n === 1 ? 'medaglia' : 'medaglie'}`;
}

function Numero({ etichetta, valore, nota, tono = '', segno }: { etichetta: string; valore: string; nota?: string; tono?: string; segno: ChiaveSegno }) {
  return (
    <span className={`flex flex-col gap-0.5 rounded-md px-3 py-2 ${tono || 'bg-white/[0.05]'}`}>
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-text-muted"><IconaSegno chiave={segno} dimensione={14} />{etichetta}</span>
      <span className="font-display text-[21px] leading-none tabular-nums">{valore}</span>
      {nota && <span className="text-[11px] text-text-muted">{nota}</span>}
    </span>
  );
}

export function CovoPage() {
  useDocumentTitle('Covo dei Ladri');
  const dati = useCarica(() => getCompletamento(), []);
  const [ricerca, setRicerca] = useState('');
  const covo = dati.dati?.covo;
  const q = ricerca.trim().toLocaleLowerCase('it');
  const sfide = useMemo(() => (covo?.sfide ?? []).filter((s) => !q || `${s.nome} ${s.requisito}`.toLocaleLowerCase('it').includes(q)), [covo, q]);
  const premi = useMemo(() => (covo?.premi ?? []).filter((p) => !q || `${p.nome} ${p.sblocco ?? ''} ${p.effetto ?? ''}`.toLocaleLowerCase('it').includes(q)), [covo, q]);
  const c = covo ? conti(covo) : null;

  return (
    <PageState isLoading={dati.caricamento && !dati.dati} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {covo && c && (
        <div className="flex flex-col gap-4">
          <IntestazionePagina titolo="Covo dei Ladri"
            sottotitolo={`L'area bonus di Royal, con la sua valuta: ${covo.sfide.length} sfide che danno Medaglie P e ${covo.premi.length} premi che le spendono.`} />

          <section className="card flex flex-col gap-3" aria-label="Come funziona il Covo">
            <div className="flex flex-wrap gap-2">
              <Numero etichetta="Sfide" valore={String(covo.sfide.length)} segno="sfide"
                nota={c.guadagno !== null ? `${medaglie(c.guadagno)} in tutto` : 'valore della singola sfida non dichiarato'} />
              <Numero etichetta="Voci di catalogo" valore={String(covo.premi.length)} segno="catalogo"
                nota={c.premiConPrezzo === covo.premi.length ? 'tutte con prezzo' : `${c.premiConPrezzo} con prezzo dichiarato`} />
              {c.minimo !== null && c.massimo !== null && (
                <Numero etichetta="Prezzi" valore={c.minimo === c.massimo ? String(c.minimo) : `${c.minimo}–${c.massimo}`}
                  nota="medaglie per elemento" tono="bg-primary/10" segno="medaglie" />
              )}
            </div>
            <p className="m-0 text-[13px] text-text-secondary">{covo.introduzione}</p>
            {/* La cautela va detta accanto ai numeri, non in fondo: chi legge «36 voci» a colpo
                d'occhio conclude «36 cose da comprare», e sarebbe il conto sbagliato. */}
            <p className="m-0 text-[12px] text-text-muted">
              Una voce del catalogo raccoglie spesso più elementi allo stesso prezzo, quindi i prezzi qui elencati non si sommano
              in una spesa complessiva; il totale delle medaglie ottenibili lo dichiara la guida, qui sotto.
            </p>
            <TestoRipiegabile testo={covo.medaglie} massimo={180} className="text-[13px] text-text-secondary" />
            {covo.fonte && <a href={covo.fonte} target="_blank" rel="noreferrer" className="credito self-start">fonte</a>}
          </section>

          {/* Una ricerca sola per tutte e due le colonne: quel che si cerca è «dove salta fuori
              questa cosa», e la risposta può stare fra le sfide come fra i premi. */}
          <label className="flex flex-col gap-1">
            <span className="sr-only">Cerca fra sfide e premi</span>
            <input type="search" className="form-input" placeholder="Cerca fra sfide e premi…" value={ricerca} onChange={(e) => setRicerca(e.target.value)} />
          </label>

          {/* Due colonne dal tablet in orizzontale in su (1024): sotto, i requisiti sono paragrafi
              lunghi e affiancarli darebbe due colonne strette invece di due elenchi leggibili. */}
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <section className="card flex flex-col gap-2" aria-label="Sfide del Covo">
              <h2 className="m-0 font-display text-[17px] uppercase leading-none">Sfide · {sfide.length}{sfide.length !== covo.sfide.length ? ` di ${covo.sfide.length}` : ''}</h2>
              {sfide.length === 0
                ? <p className="m-0 text-[13px] text-text-muted" role="status">Nessuna sfida con questo testo.</p>
                : <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0">
                    {sfide.map((s) => (
                      <li key={s.nome} className="flex items-start justify-between gap-3 py-2 text-[13px]">
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="font-semibold">{s.nome}</span>
                          <span className="text-text-secondary">{s.requisito}</span>
                        </span>
                        {/* Il valore compare solo se c'è: oggi la guida non lo dichiara per
                            nessuna sfida, e una colonna di 52 trattini è rumore, non un dato. */}
                        {s.medaglie !== null && <span className="shrink-0 tabular-nums text-[12px] text-text-muted">{medaglie(s.medaglie)}</span>}
                      </li>
                    ))}
                  </ul>}
            </section>

            <section className="card flex flex-col gap-2" aria-label="Premi del Covo">
              <h2 className="m-0 font-display text-[17px] uppercase leading-none">Premi · {premi.length}{premi.length !== covo.premi.length ? ` di ${covo.premi.length}` : ''}</h2>
              {premi.length === 0
                ? <p className="m-0 text-[13px] text-text-muted" role="status">Nessun premio con questo testo.</p>
                : <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0">
                    {premi.map((p) => (
                      <li key={p.nome} className="flex flex-col gap-0.5 py-2 text-[13px]">
                        <span className="flex items-start justify-between gap-3">
                          <span className="font-semibold">{p.nome}</span>
                          <span className="shrink-0 tabular-nums text-[12px] text-text-muted">{p.costo !== null ? medaglie(p.costo) : 'prezzo non dichiarato'}</span>
                        </span>
                        {p.effetto && <span className="text-text-secondary">{p.effetto}</span>}
                        {p.sblocco && <span className="text-[12px] text-text-muted">Si sblocca: {p.sblocco}</span>}
                      </li>
                    ))}
                  </ul>}
            </section>
          </div>
        </div>
      )}
    </PageState>
  );
}
