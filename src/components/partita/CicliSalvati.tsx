// ============================================================
// CicliSalvati — scheda «Cicli»: cicli di fusione salvati, anello corrente, partner da procurare, esecuzione e iterazioni (Fase 5.5)
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { aggiornaCiclo, aggiungiPosseduta, avanzaCiclo, eliminaCiclo, getCicliSalvati, getPossedute, isApiError } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { EmptyState, Spinner } from '../shared/PageState';
import { EseguiFusioneModal } from '../fusione/EseguiFusioneModal';
import { formattaYen } from '../../utils/punti';
import type { CicloSalvatoDto } from '../../types';

interface Props {
  partitaId: number;
}

const NOME_MODO = { scorta: 'dalla scorta', registro: 'dal Registro', cattura: 'da catturare' } as const;

function SchedaCicloSalvato({ ciclo, partitaId, onCambiato, onElimina }: { ciclo: CicloSalvatoDto; partitaId: number; onCambiato: (c: CicloSalvatoDto) => void; onElimina: () => void }) {
  const [esecuzione, setEsecuzione] = useState(false);
  const [occupato, setOccupato] = useState(false);
  const a = ciclo.anelli[ciclo.anelloCorrente];
  const av = ciclo.avanzamento;

  const procuraPartner = async () => {
    setOccupato(true);
    try {
      await aggiungiPosseduta(partitaId, a.partner.id, { origine: av.partnerRegistrato ? 'evocazione dal Registro' : a.partnerModo === 'cattura' ? 'cattura' : 'aggiunta per il ciclo' });
      notifica('success', `${a.partner.nomeIt} aggiunta alla scorta.`);
      onCambiato(await ricaricaUno());
    } catch (err) {
      notifica('error', isApiError(err, 'persona-gia-posseduta') ? `${a.partner.nomeIt} è già nella scorta.` : err instanceof Error ? err.message : 'Operazione fallita.');
    } finally {
      setOccupato(false);
    }
  };
  const ricaricaUno = async () => (await getCicliSalvati(partitaId)).find((c) => c.id === ciclo.id) ?? ciclo;
  const impostaAnello = async (n: number) => {
    try { onCambiato(await aggiornaCiclo(partitaId, ciclo.id, { anelloCorrente: n })); } catch (err) { notifica('error', err instanceof Error ? err.message : 'Aggiornamento fallito.'); }
  };
  const dopoEsecuzione = async () => {
    setEsecuzione(false);
    try {
      const agg = await avanzaCiclo(partitaId, ciclo.id);
      onCambiato(agg);
      if (agg.anelloCorrente === 0) notifica('success', `Iterazione ${agg.iterazioni} del ciclo «${ciclo.titolo}» completata: ${ciclo.nomeIt} è di nuovo nella scorta.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Avanzamento non registrato.');
    }
  };

  return (
    <article className="card flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Link to={`/compendio/persona/${ciclo.personaId}`} className="font-semibold text-[15px] text-text no-underline hover:text-primary">{ciclo.nomeIt}</Link>
        <span className="text-[12px] text-text-muted">{ciclo.arcanaNome}</span>
        <span className="chip">{ciclo.titolo}</span>
        <span className="chip chip--attivo" title="Iterazioni complete registrate">{ciclo.iterazioni} {ciclo.iterazioni === 1 ? 'giro' : 'giri'}</span>
        <span className="ml-auto font-black tabular-nums">{formattaYen(ciclo.costo)} / giro</span>
      </div>
      <ol className="m-0 p-0 list-none flex flex-col gap-1" aria-label={`Anelli di ${ciclo.titolo}`}>
        {ciclo.anelli.map((x, i) => (
          <li key={i} className={`flex flex-wrap items-center gap-1.5 text-[13px] rounded-md px-1 ${i === ciclo.anelloCorrente ? 'bg-primary-bg' : ''}`}>
            <button type="button" className={`chip touch ${i === ciclo.anelloCorrente ? 'chip--attivo' : ''}`} onClick={() => void impostaAnello(i)} title="Imposta come anello corrente" aria-pressed={i === ciclo.anelloCorrente}>{i + 1}</button>
            <span>{x.ingrediente.nomeIt}</span><span aria-hidden="true">+</span><span>{x.partner.nomeIt}</span>
            <span className="text-[12px] text-text-muted">{NOME_MODO[x.partnerModo]}{x.partnerModo === 'registro' ? ` · ${formattaYen(x.partnerCosto)}` : ''}</span>
            <span aria-hidden="true">→</span><span className="font-semibold">{x.risultato.nomeIt}</span>
            {x.bonusLivelli.max > 0 && <span className="text-[12px] text-text-muted">+{x.bonusLivelli.min === x.bonusLivelli.max ? x.bonusLivelli.min : `${x.bonusLivelli.min}…${x.bonusLivelli.max}`} livelli</span>}
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-1 text-[13px]">
        <div className="text-[12px] uppercase tracking-wide text-text-muted">Anello corrente: {ciclo.anelloCorrente + 1} di {ciclo.lunghezza}</div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`chip ${av.ingredientePossedutaId ? 'chip--attivo' : ''}`}>{a.ingrediente.nomeIt}: {av.ingredientePossedutaId ? 'in scorta' : 'non in scorta'}</span>
          <span className={`chip ${av.partnerPossedutaId ? 'chip--attivo' : ''}`}>{a.partner.nomeIt}: {av.partnerPossedutaId ? 'in scorta' : av.partnerRegistrato ? 'da evocare dal Registro' : a.partnerModo === 'cattura' ? 'da catturare' : 'da procurare'}</span>
          {!av.partnerPossedutaId && (
            <button type="button" className="btn btn-secondary btn-sm" disabled={occupato} onClick={() => void procuraPartner()}>
              {av.partnerRegistrato ? `Evoca ${a.partner.nomeIt} (${formattaYen(a.partnerCosto)})` : `Segna ${a.partner.nomeIt} ottenuta`}
            </button>
          )}
          {!av.ingredientePossedutaId && ciclo.anelloCorrente === 0 && <Link to={`/fusione?vista=piani&piani=${a.ingrediente.id}`} className="btn btn-ghost btn-sm no-underline">Come ottenere {a.ingrediente.nomeIt}</Link>}
          {!av.ingredientePossedutaId && ciclo.anelloCorrente > 0 && <span className="text-[12px] text-warning">Il risultato dell'anello precedente non è in scorta: reimposta l'anello corrente.</span>}
          <button type="button" className="btn btn-primary btn-sm" disabled={!av.eseguibile} onClick={() => setEsecuzione(true)}>Esegui anello {ciclo.anelloCorrente + 1}</button>
        </div>
      </div>
      {ciclo.note && <div className="text-[13px] text-text-secondary">{ciclo.note}</div>}
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className="btn btn-ghost btn-sm touch text-error" onClick={onElimina}>Elimina</button>
      </div>
      {esecuzione && av.ingredientePossedutaId && av.partnerPossedutaId && (
        <EseguiFusioneModal partitaId={partitaId} possedutaIds={[av.ingredientePossedutaId, av.partnerPossedutaId]} risultatoId={a.risultato.id} onChiudi={() => setEsecuzione(false)} onEseguita={() => void dopoEsecuzione()} />
      )}
    </article>
  );
}

export function CicliSalvati({ partitaId }: Props) {
  const lista = useCarica(() => getCicliSalvati(partitaId), [partitaId]);
  const scorta = useCarica(() => getPossedute(partitaId), [partitaId]);
  const totaleGiri = useMemo(() => (lista.dati ?? []).reduce((s, c) => s + c.iterazioni, 0), [lista.dati]);
  const sostituisci = (c: CicloSalvatoDto) => { lista.imposta((lista.dati ?? []).map((x) => (x.id === c.id ? c : x))); void scorta.ricarica(); };
  const elimina = async (c: CicloSalvatoDto) => {
    if (!window.confirm(`Eliminare il ciclo «${c.titolo}»?`)) return;
    try {
      await eliminaCiclo(partitaId, c.id);
      lista.imposta((lista.dati ?? []).filter((x) => x.id !== c.id));
      notifica('info', 'Ciclo eliminato.');
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Eliminazione fallita.');
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[13px] text-text-secondary">
        I cicli salvati dalla vista «Cicli di fusione» si eseguono qui anello per anello: procura il partner (evocazione dal Registro o cattura), esegui la fusione dalla scorta, e al ritorno sulla Persona di partenza il giro viene contato.
        {lista.dati && lista.dati.length > 0 && ` Giri completati in totale: ${totaleGiri}.`}
      </p>
      {lista.errore && <div className="text-[13px] text-error">{lista.errore} <button type="button" className="btn btn-ghost btn-sm" onClick={() => void lista.ricarica()}>Riprova</button></div>}
      {!lista.dati && !lista.errore && <div className="flex justify-center py-6"><Spinner /></div>}
      {lista.dati && lista.dati.length === 0 && (
        <EmptyState icon="🔁" title="Nessun ciclo salvato" hint="Trova un ciclo nella pagina Fusione («Cicli di fusione») e premi «Salva ciclo»." action={<Link to="/fusione?vista=cicli" className="btn btn-primary no-underline">Vai ai cicli di fusione</Link>} />
      )}
      {lista.dati && lista.dati.length > 0 && (
        <div className="flex flex-col gap-3">
          {lista.dati.map((c) => <SchedaCicloSalvato key={c.id} ciclo={c} partitaId={partitaId} onCambiato={sostituisci} onElimina={() => void elimina(c)} />)}
        </div>
      )}
    </div>
  );
}
