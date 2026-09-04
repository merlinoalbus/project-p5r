// ============================================================
// CruciverbaPage — cruciverba di Leblanc per data con indizio, risposta e spunta per partita (Fase 7.5)
// ============================================================

import { useMemo, useState } from 'react';
import { getCruciverba, impostaCruciverba } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { PageState } from '../components/shared/PageState';
import { dataGiocoTesto as formattaDataGioco } from '../utils/dateGioco';
import type { CruciverbaDto } from '../types';

function Cruciverba({ c, partitaId, onCambiato }: { c: CruciverbaDto; partitaId: number | null; onCambiato: (c: CruciverbaDto) => void }) {
  const [mostra, setMostra] = useState(false);
  const [occupato, setOccupato] = useState(false);
  const cambia = async (fatto: boolean) => {
    if (!partitaId) return;
    setOccupato(true);
    try { onCambiato(await impostaCruciverba(partitaId, c.giorno, fatto)); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); } finally { setOccupato(false); }
  };
  return (
    <li className={`card flex flex-col gap-1 text-[13px] ${c.fatto ? 'opacity-70' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        {partitaId && <input type="checkbox" className="w-5 h-5" checked={c.fatto} disabled={occupato} onChange={(e) => void cambia(e.target.checked)} aria-label={`Cruciverba del ${formattaDataGioco(c.giorno)} risolto`} />}
        <strong className="text-[15px]">{formattaDataGioco(c.giorno)}</strong>
        <span className="text-text-secondary">{c.indizio}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {mostra || c.fatto ? <span><strong>Risposta:</strong> {c.risposta}{c.rispostaEn && c.rispostaEn !== c.risposta ? <span className="text-text-muted"> ({c.rispostaEn})</span> : null}</span> : <button type="button" className="btn btn-ghost btn-sm touch" onClick={() => setMostra(true)}>Mostra la risposta</button>}
      </div>
    </li>
  );
}

export function CruciverbaPage() {
  useDocumentTitle('Cruciverba di Leblanc');
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getCruciverba(partitaId ?? undefined), [partitaId]);
  const [soloDaFare, setSoloDaFare] = useState(false);
  const d = dati.dati;
  const visibili = useMemo(() => (d?.cruciverba ?? []).filter((c) => !soloDaFare || !c.fatto), [d, soloDaFare]);
  const aggiorna = (c: CruciverbaDto) => { if (d) { const lista = d.cruciverba.map((x) => (x.giorno === c.giorno ? c : x)); dati.imposta({ ...d, cruciverba: lista, risolti: lista.filter((x) => x.fatto).length }); } };
  return (
    <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {d && (
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="m-0 text-2xl font-bold">Cruciverba di Leblanc</h1>
            <p className="m-0 mt-1 text-[13px] text-text-secondary">{d.totale} cruciverba sul tavolo di Leblanc (la sera, senza consumare tempo): ogni risposta esatta vale una nota di Conoscenza.{partitaId ? ` Nella partita «${attiva?.nome}»: ${d.risolti} risolti.` : ' Attiva una partita per spuntare quelli risolti.'}</p>
          </div>
          {partitaId && <label className="flex items-center gap-2 text-[13px] touch self-start"><input type="checkbox" className="w-5 h-5" checked={soloDaFare} onChange={(e) => setSoloDaFare(e.target.checked)} /> Solo da fare</label>}
          <ul className="m-0 p-0 list-none flex flex-col gap-2" aria-label="Cruciverba">
            {visibili.map((c) => <Cruciverba key={c.giorno} c={c} partitaId={partitaId} onCambiato={aggiorna} />)}
          </ul>
        </div>
      )}
    </PageState>
  );
}
