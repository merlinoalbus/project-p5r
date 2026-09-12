// ============================================================
// CruciverbaPage — cruciverba di Leblanc per data con indizio, risposta e spunta per partita (Fase 7.5)
// ============================================================
//
// Il prossimo cruciverba — il primo non risolto dal giorno di gioco in poi — è evidenziato nel suo
// mese, con il rimando in cima. I filtri sono valori: la ricerca (data, indizio, risposta) e lo
// stato con i segmenti. Le righe sono raggruppate per mese, come le domande.
// ============================================================

import { useMemo, useState } from 'react';
import { getCruciverba, impostaCruciverba } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { CampoRicerca } from '../components/shared/CampoRicerca';
import { Segmenti } from '../components/shared/Segmenti';
import { dataGiocoTesto as formattaDataGioco, meseGioco } from '../utils/dateGioco';
import type { CruciverbaDto } from '../types';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { PulsanteVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { AggiungiAlCatalogo, CorreggiElemento } from '../components/guida/AzioniCatalogo';

type FiltroStato = 'tutti' | 'da-fare' | 'fatti';
const STATI: ReadonlyArray<{ chiave: FiltroStato; nome: string }> = [{ chiave: 'tutti', nome: 'Tutti' }, { chiave: 'da-fare', nome: 'Da fare' }, { chiave: 'fatti', nome: 'Fatti' }];
const piatto = (s: string | null | undefined) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('it');
const ancoraGiorno = (giorno: string) => `cruciverba-${giorno}`;

function Cruciverba({ c, partitaId, onCambiato, onCorretto, evidenzia }: { c: CruciverbaDto; partitaId: number | null; onCambiato: (c: CruciverbaDto) => void; onCorretto: () => void; evidenzia: boolean }) {
  const [mostra, setMostra] = useState(false);
  const [occupato, setOccupato] = useState(false);
  const cambia = async (fatto: boolean) => {
    if (!partitaId) return;
    setOccupato(true);
    try { onCambiato(await impostaCruciverba(partitaId, c.giorno, fatto)); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupato(false); }
  };
  return (
    <li id={evidenzia ? ancoraGiorno(c.giorno) : undefined} className={`card flex flex-col gap-1 text-[13px] scroll-mt-20 ${c.fatto ? 'opacity-70' : ''} ${evidenzia ? 'border-primary' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        {partitaId && <input type="checkbox" className="w-5 h-5" checked={c.fatto} disabled={occupato} onChange={(e) => void cambia(e.target.checked)} aria-label={`Cruciverba del ${formattaDataGioco(c.giorno)} risolto`} />}
        <strong className="text-[15px]">{formattaDataGioco(c.giorno)}</strong>
        {evidenzia && <span className="chip chip--attivo text-[11px]">Prossimo</span>}
        <span className="text-text-secondary">{c.indizio}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {mostra || c.fatto ? <span><strong>Risposta:</strong> {c.risposta}{c.rispostaEn && c.rispostaEn !== c.risposta ? <span className="text-text-muted"> ({c.rispostaEn})</span> : null}</span> : <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="scheda" dimensione={20} />} titolo="Mostra la risposta" onClick={() => setMostra(true)} />}
        {c.chiave && <span className="ml-auto"><CorreggiElemento tipo="cruciverba" chiave={c.chiave} onSalvato={onCorretto} /></span>}
      </div>
    </li>
  );
}

export function CruciverbaPage() {
  useDocumentTitle('Cruciverba di Leblanc');
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getCruciverba(partitaId ?? undefined), [partitaId]);
  const [ricerca, setRicerca] = useState('');
  const [stato, setStato] = useState<FiltroStato>('tutti');
  const d = dati.dati;
  const q = piatto(ricerca.trim());
  const visibili = useMemo(() => (d?.cruciverba ?? []).filter((c) => {
    if (stato === 'da-fare' && c.fatto) return false;
    if (stato === 'fatti' && !c.fatto) return false;
    // la risposta entra nella ricerca: chi la cerca la sa già, e vuole trovare il giorno
    if (q && !piatto(`${formattaDataGioco(c.giorno)} ${c.giorno} ${c.indizio} ${c.risposta} ${c.rispostaEn ?? ''}`).includes(q)) return false;
    return true;
  }), [d, stato, q]);
  const perMese = useMemo(() => {
    const m = new Map<string, CruciverbaDto[]>();
    for (const c of visibili) {
      const mese = meseGioco(c.giorno);
      if (!m.has(mese)) m.set(mese, []);
      m.get(mese)!.push(c);
    }
    return [...m.entries()];
  }, [visibili]);
  const aggiorna = (c: CruciverbaDto) => { if (d) { const lista = d.cruciverba.map((x) => (x.giorno === c.giorno ? c : x)); dati.imposta({ ...d, cruciverba: lista, risolti: lista.filter((x) => x.fatto).length, prossimo: d.prossimo?.giorno === c.giorno && c.fatto ? (lista.find((x) => !x.fatto && d.dataGioco !== null && x.giorno >= d.dataGioco) ?? null) : d.prossimo }); } };
  const prossimo = d?.prossimo ?? null;
  // Il rimando azzera i filtri e scorre alla riga evidenziata al giro successivo, quando esiste.
  const vaiAlProssimo = () => {
    if (!prossimo) return;
    setStato('tutti'); setRicerca('');
    setTimeout(() => document.getElementById(ancoraGiorno(prossimo.giorno))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };
  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-3">
          <IntestazionePagina titolo="Cruciverba di Leblanc" sottotitolo={<>{d.totale} cruciverba sul tavolo di Leblanc (la sera, senza consumare tempo): ogni risposta esatta vale una nota di Conoscenza.{partitaId ? ` Nella partita «${attiva?.nome}»: ${d.risolti} risolti.` : ' Attiva una partita per spuntare quelli risolti.'}</>} />
          {prossimo && (
            <div className="card flex flex-wrap items-center justify-between gap-2 border-primary" role="status">
              <span className="text-[13px]"><strong>Prossimo cruciverba:</strong> {formattaDataGioco(prossimo.giorno)} · {prossimo.indizio}</span>
              <button type="button" className="btn btn-ghost btn-sm touch" onClick={vaiAlProssimo}>Vai al cruciverba</button>
            </div>
          )}
          <section className="filtri-articoli" role="search" aria-label="Filtri dei cruciverba">
            <div className="filtri-articoli__riga">
              <CampoRicerca valore={ricerca} onCambia={setRicerca} segnaposto="Cerca data, indizio o risposta…" />
              {partitaId && <Segmenti etichetta="Stato" valore={stato} opzioni={STATI} onCambia={setStato} />}
              <AggiungiAlCatalogo tipo="cruciverba" titolo="Aggiungi un cruciverba" onSalvato={() => void dati.ricarica()} />
            </div>
          </section>
          {perMese.length === 0 && <p className="m-0 text-[13px] text-text-muted" role="status">Nessun cruciverba con questi filtri.</p>}
          {perMese.map(([mese, lista]) => (
            <section key={mese} className="flex flex-col gap-2" aria-label={`Cruciverba di ${mese}`}>
              <h2 className="m-0 text-[15px] font-semibold">{mese}</h2>
              <ul className="m-0 p-0 list-none flex flex-col gap-2">
                {lista.map((c) => <Cruciverba key={c.giorno} c={c} partitaId={partitaId} onCambiato={aggiorna} onCorretto={() => void dati.ricarica()} evidenzia={prossimo?.giorno === c.giorno} />)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageState>
  );
}
