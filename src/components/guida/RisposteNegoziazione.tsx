// ============================================================
// RisposteNegoziazione — cerca la domanda dell'Ombra e vedi che cosa rispondere, per ogni carattere
// ============================================================
//
// **Si cerca quello che si legge sullo schermo**: la domanda. L'Ombra dice la sua frase strampalata,
// tu ne scrivi tre parole qui e trovi le tre risposte con, accanto a ciascuna, come la prende ogni
// personalità — buona, passabile, cattiva. Il carattere è un colore fisso, sempre lo stesso in
// tutta la scheda, così durante la trattativa si riconosce con la coda dell'occhio: se sai che
// l'Ombra è Giocosa cerchi il suo colore e leggi solo quella riga.
//
// Una personalità che non compare su una risposta **non è indifferente: non è stata verificata**.
// Dirlo è più utile che inventare un verdetto, perché una risposta sbagliata alla seconda domanda
// fa fallire la trattativa.
//
// Con l'Ombra scelta in cima (o il carattere scelto a mano) le risposte si ordinano da sole: prima
// quella buona per lei. Senza scelta restano nell'ordine del gioco.
// ============================================================

import { useMemo, useState } from 'react';
import { CampoRicerca } from '../shared/CampoRicerca';
import { COLORE_TRATTO, NOME_TRATTO, ORDINE_ESITO, SEGNO_ESITO, TRATTI_OMBRA, cercaDomande } from '../../utils/negoziazione';
import type { NegoziazioneDomandaDto, TrattoOmbra } from '../../types';

interface Props {
  domande: NegoziazioneDomandaDto[];
  fonte?: { titolo: string; autori: string[]; url: string; urlOriginale: string; nota: string };
  /** Il carattere dell'Ombra che si sta guardando, se la pagina ne ha uno (dall'indice delle Ombre). */
  trattoIniziale?: TrattoOmbra | null;
}

export function RisposteNegoziazione({ domande, fonte, trattoIniziale = null }: Props) {
  const [ricerca, setRicerca] = useState('');
  const [tratto, setTratto] = useState<TrattoOmbra | null>(trattoIniziale);
  const [quante, setQuante] = useState(20);
  const trovate = useMemo(() => cercaDomande(domande, ricerca), [domande, ricerca]);
  const visibili = trovate.slice(0, quante);
  const verdettoDi = (r: NegoziazioneDomandaDto['risposte'][number]) => (tratto ? r.verdetti.find((v) => v.tratto === tratto) ?? null : null);

  return (
    <section className="card flex flex-col gap-2.5" aria-label="Risposte della negoziazione">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 font-display text-[15px] uppercase leading-none">Che cosa ti ha chiesto?</h2>
        <span className="text-[11px] text-text-muted">{domande.length} domande · {domande.reduce((s, d) => s + d.risposte.length, 0)} risposte</span>
      </div>
      <p className="m-0 text-[12px] text-text-muted">
        Scrivi qualche parola della frase dell’Ombra (o di una risposta). Scegli il suo carattere e le risposte si ordinano da sole: prima quella buona per lei.
      </p>
      <CampoRicerca valore={ricerca} onCambia={(v) => { setRicerca(v); setQuante(20); }} segnaposto="Es. medicine, maschera, futuro…" />
      <div className="flex flex-wrap gap-1" role="group" aria-label="Carattere dell’Ombra">
        {TRATTI_OMBRA.map((t) => (
          <button key={t.chiave} type="button" aria-pressed={tratto === t.chiave}
            className={`chip touch text-[12px] ${tratto === t.chiave ? 'chip--attivo' : ''}`}
            style={tratto === t.chiave ? { borderColor: t.colore, color: t.colore } : undefined}
            onClick={() => setTratto(tratto === t.chiave ? null : t.chiave)}>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: t.colore }} aria-hidden="true" />{t.nome}
          </button>
        ))}
        {tratto && <button type="button" className="chip touch text-[12px]" onClick={() => setTratto(null)}>Tutti i caratteri</button>}
      </div>

      {trovate.length === 0 && (
        <p className="m-0 rounded-md bg-white/[0.04] px-3 py-2 text-[12px] text-text-muted" role="status">
          Nessuna domanda con queste parole. La raccolta non è completa: se l’Ombra ne fa una che non c’è, la risposta buona non è documentata da nessuno.
        </p>
      )}

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {visibili.map((d) => {
          const risposte = tratto
            ? [...d.risposte].sort((a, b) => (ORDINE_ESITO[verdettoDi(a)?.esito ?? 'passabile'] + (verdettoDi(a) ? 0 : 0.5)) - (ORDINE_ESITO[verdettoDi(b)?.esito ?? 'passabile'] + (verdettoDi(b) ? 0 : 0.5)))
            : d.risposte;
          return (
            <li key={d.domanda} className="flex flex-col gap-1.5 rounded-md bg-white/[0.04] px-2.5 py-2">
              <p className="m-0 text-[13px] font-semibold">{d.domanda}</p>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {risposte.map((r) => {
                  const mio = verdettoDi(r);
                  return (
                    <li key={r.testo} className={`flex flex-col gap-0.5 rounded px-1.5 py-1 ${mio?.esito === 'buona' ? 'bg-success/10' : mio?.esito === 'cattiva' ? 'bg-error/10' : ''}`}>
                      <span className="text-[13px]">{r.testo}</span>
                      <span className="flex flex-wrap items-center gap-1">
                        {r.verdetti.length === 0 && <span className="text-[11px] text-text-muted">nessun carattere verificato</span>}
                        {[...r.verdetti].sort((a, b) => ORDINE_ESITO[a.esito] - ORDINE_ESITO[b.esito]).map((v) => (
                          <span key={`${v.tratto}-${v.esito}`}
                            title={`${NOME_TRATTO[v.tratto]}: risposta ${v.esito}${v.incerto ? ' (non verificata dalla fonte)' : ''}`}
                            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] ${
                              v.esito === 'buona' ? 'border-success/60 bg-success/10 text-success'
                                : v.esito === 'cattiva' ? 'border-error/50 bg-error/10 text-error'
                                : 'border-border-light text-text-secondary'}`}>
                            <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORE_TRATTO[v.tratto] }} aria-hidden="true" />
                            {NOME_TRATTO[v.tratto]} {SEGNO_ESITO[v.esito]}{v.incerto ? '?' : ''}
                          </span>
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
      {trovate.length > visibili.length && (
        <button type="button" className="btn btn-ghost btn-sm touch self-start" onClick={() => setQuante((q) => q + 40)}>
          Mostra altre ({trovate.length - visibili.length})
        </button>
      )}
      {fonte && (
        <p className="m-0 text-[11px] text-text-muted">
          Domande e risposte da <a href={fonte.url} target="_blank" rel="noreferrer" className="credito">{fonte.titolo}</a> di {fonte.autori.join(' e ')}. {fonte.nota}
        </p>
      )}
    </section>
  );
}
