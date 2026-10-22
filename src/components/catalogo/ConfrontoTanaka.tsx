import { useState } from 'react';
import manifest from '../../../shared/tanakaConfronto.json';
import { getNegozio } from '../../services/api/compendio';
import { getProposteOggetti } from '../../services/api/catalogoOggetti';
import { useCarica } from '../../hooks/useCarica';
import { PageState } from '../shared/PageState';
import { descriviRequisitoSpillo } from '../../../shared/condizioniSpillo';

const yen = (n: number | null) => n === null ? 'Prezzo non indicato' : `${n.toLocaleString('it-IT')} ¥`;
const gradi: Record<string, string> = { iniziale: 'Nessun grado', nero: 'Nero', oscuro: 'Oscurità', caos: 'Caos' };

/** Confronto preparatorio: nessuna delle proposte viene decisa da questa vista. */
export function ConfrontoTanaka() {
  const [aperto, setAperto] = useState(false);
  return <section className="flex min-w-0 flex-col gap-2" aria-label="Confronto unitario Tanaka">
    <button type="button" className="chip touch self-start" aria-expanded={aperto} onClick={() => setAperto(v => !v)}>Tanaka · confronto unitario 20 / 18</button>
    {aperto && <DatiConfronto />}
  </section>;
}

function DatiConfronto() {
  const dati = useCarica(async () => {
    const [negozio, ...stati] = await Promise.all([
      getNegozio(manifest.negozio),
      ...(['da-approvare', 'confermata', 'scartata'] as const).map(stato => getProposteOggetti({ riga_tipo: 'articolo', stato })),
    ]);
    const chiavi = new Set([...manifest.chiaviCorrenti, ...manifest.royal.map(r => r.chiave), ...negozio.articoliElenco.map(a => a.chiave)]);
    return { negozio, proposte: stati.flat().filter(p => p.rigaTipo === 'articolo' && chiavi.has(p.rigaChiave)) };
  }, []);
  const c = dati.dati;
  return <PageState isLoading={dati.caricamento && !c} error={dati.errore} onRetry={() => void dati.ricarica()}>
    {c && <div className="card flex min-w-0 flex-col gap-3">
      <h2 className="m-0 text-[18px]">Tanaka · preparazione di una sola decisione</h2>
      <p className="m-0">Questo confronto non applica proposte. Prima del consenso unico occorrono protezione di spesa e grado storici, condizioni aggiornate, nota Homunculus e conferma atomica con ripristino unitario. La procedura individuale esistente non realizza questa decisione.</p>
      <p className="m-0 text-warning">Fonte: gradi oltre 10.000 / 50.000 / 100.000 ¥. L’app valuta attualmente anche la soglia esatta: questo confine resta da risolvere. Gemme elementali e sei Magatama non sono sei identità automaticamente equivalenti.</p>
      <p className="m-0">Proposta originale: conservare 10 chiavi, nascondere 10 offerte e aggiungerne 8, dopo il consenso. Il precedente dossier con 18 nuove identità commerciali non è una decisione approvata.</p>
      <p className="m-0">Presenza corrente del negozio: {c.negozio.condizioni === undefined ? 'Dato non disponibile' : c.negozio.condizioni.length ? c.negozio.condizioni.map(r => descriviRequisitoSpillo(r)).join(' · ') : 'Nessuna condizione strutturata'}.</p>
      <button type="button" className="btn btn-ghost touch self-start" disabled={dati.caricamento} onClick={() => void dati.ricarica()}>Rileggi tutto il confronto</button>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <section className="min-w-0"><h3>Offerte correnti · {c.negozio.articoliElenco.length}</h3>
          {manifest.chiaviCorrenti.filter(k => !c.negozio.articoliElenco.some(a => a.chiave === k)).map(k => <p key={k} className="break-all text-warning">Assente o nascosta nella vista corrente: {k}. Non viene ricreata.</p>)}
          <ul className="m-0 flex list-none flex-col gap-2 p-0">{c.negozio.articoliElenco.map(a => <li key={a.chiave} className="min-w-0 border-t border-border pt-2"><strong>{a.nomeIt ?? a.nome}</strong> · {yen(a.prezzo)}<code className="block break-all text-[11px]">{a.chiave}</code><p className="m-0">Descrizione conservata: {a.condizione ?? 'Nessun grado dichiarato nella descrizione'}</p><p className="m-0">Condizioni correnti dell’offerta: {a.condizioni === undefined ? 'Dato non disponibile' : a.condizioni.length ? a.condizioni.map(r => descriviRequisitoSpillo(r)).join(' · ') : 'Nessuna condizione strutturata'}.</p><p className="m-0 text-[12px]">{manifest.royal.find(r => r.chiave === a.chiave)?.nome ?? (manifest.chiaviCorrenti.includes(a.chiave) ? 'Proposta: nascondere, senza cancellazione' : 'Offerta aggiunta: piano da riconciliare')}</p></li>)}</ul>
        </section>
        <section className="min-w-0"><h3>Listino Royal proposto · {manifest.royal.length}</h3><ul className="m-0 flex list-none flex-col gap-2 p-0">{manifest.royal.map(r => <li key={r.chiave} className="min-w-0 border-t border-border pt-2"><strong>{r.nome}</strong> · {yen(r.prezzo)} · {gradi[r.grado]}<code className="block break-all text-[11px]">{r.chiave}</code><p className="m-0 text-[12px]">{r.rapporto}</p><span className="break-all text-[11px]">Catalogo proposto: {r.catalogo}</span></li>)}</ul></section>
      </div>
      <details><summary className="touch">Proposte collegate in tutti gli stati · {c.proposte.length}</summary><ul className="m-0 flex list-none flex-col gap-2 p-0">{c.proposte.map(p => <li key={JSON.stringify([p.rigaTipo, p.rigaChiave, p.gruppo, p.catalogo?.chiave ?? null])} className="min-w-0 border-t border-border pt-2"><strong>{p.stato}</strong><code className="block break-all text-[11px]">{JSON.stringify([p.rigaTipo, p.rigaChiave, p.gruppo, p.catalogo?.chiave ?? null])}</code><p className="m-0">{p.modifica?.azione ?? 'Azione non disponibile'}{p.modifica?.prezzo !== undefined ? ` · ${yen(p.modifica.prezzo)}` : ''}</p><p className="m-0 text-[12px]">Payload precedente: {p.modifica?.condizioniTesto?.join(' · ') || 'Nessuna condizione descritta'}. Non sostituisce le condizioni correnti post124.</p></li>)}</ul></details>
      <p className="m-0 text-[12px]">Fonte documentale: {manifest.fonte}. Una riga assente o modificata richiede riconciliazione, non ripristino automatico.</p>
    </div>}
  </PageState>;
}
