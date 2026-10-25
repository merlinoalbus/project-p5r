// ============================================================
// DaCompletarePage — l'elenco delle proposte «da completare» delle voci del Diario, filtrabile per periodo e stato (L13, ondata 4a)
// ============================================================
//
// Solo preparazione: la route esiste solo lì (`router.tsx`, costante di build) e ci si arriva dalle Impostazioni. Mostra le proposte
// (modello: `shared/proposteConversione.ts`) nell'ordine del Diario, raggruppate per giorno, con le stesse schede del Diario
// (`SchedaProposta`: Applica, Modifica, Scarta). Il periodo si sceglie con due date di gioco (`SelettoreData`, facoltative: «nessuna» =
// dall'inizio, fino alla fine); lo stato con i segmenti (da completare, applicate, scartate, tutte). «Modifica» legge il giorno della voce e
// apre la finestra della voce con la proposta già applicata.
// ============================================================

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCarica } from '../hooks/useCarica';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { getPercorsoGiorno, getProposteConversione } from '../services/api';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';
import { Campo } from '../components/shared/Campo';
import { SelettoreData } from '../components/shared/SelettoreData';
import { Segmenti } from '../components/shared/Segmenti';
import { SchedaProposta } from '../components/guida/ProposteDaCompletare';
import { useElenchiProposte } from '../hooks/useProposteDaCompletare';
import { ModuloVoceGiornata } from '../components/guida/ModuloVoceGiornata';
import { dataGiocoTesto } from '../utils/dateGioco';
import { ordineGioco } from '../../shared/condizioniSpillo';
import type { AzionePercorsoDto } from '../types';
import type { PropostaConversioneDto, StatoProposta } from '../../shared/proposteConversione';

type FiltroStato = StatoProposta | 'tutte';
const STATI: ReadonlyArray<{ chiave: FiltroStato; nome: string }> = [
  { chiave: 'aperta', nome: 'Da completare' }, { chiave: 'applicata', nome: 'Applicate' }, { chiave: 'scartata', nome: 'Scartate' }, { chiave: 'tutte', nome: 'Tutte' },
];

/** L'elenco «Da completare»: vedi l'intestazione del file. */
export function DaCompletarePage() {
  useDocumentTitle('Proposte da completare');
  const partitaId = usePartitaStore((s) => s.attiva?.id ?? null);
  const [da, setDa] = useState('');
  const [a, setA] = useState('');
  const [stato, setStato] = useState<FiltroStato>('aperta');
  const [versione, setVersione] = useState(0);
  const lista = useCarica(() => getProposteConversione({ da: da || undefined, a: a || undefined, stato }), [da, a, stato, versione]);
  const { elenchi, nomi, errore: erroreElenchi } = useElenchiProposte(da || '04-01');
  const [modifica, setModifica] = useState<{ proposta: PropostaConversioneDto; voce: AzionePercorsoDto; voci: AzionePercorsoDto[] } | null>(null);
  const periodoRovescio = !!da && !!a && ordineGioco(da) > ordineGioco(a);

  const perGiorno = useMemo(() => {
    const m = new Map<string, PropostaConversioneDto[]>();
    for (const p of lista.dati ?? []) m.set(p.giorno, [...(m.get(p.giorno) ?? []), p]);
    return [...m];
  }, [lista.dati]);

  /** «Modifica»: il giorno della voce (per il suo posto fra le altre), poi la finestra della voce con la proposta applicata. */
  const apriModifica = async (p: PropostaConversioneDto) => {
    try {
      const g = await getPercorsoGiorno(p.giorno, partitaId ?? undefined);
      const voce = g.azioni.find((v) => v.uid === p.voceUid);
      if (!voce) { notifica('error', 'La voce della proposta non è più in quel giorno: rileggi l’elenco.'); return; }
      setModifica({ proposta: p, voce, voci: g.azioni });
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Giorno non disponibile.'); }
  };

  const n = lista.dati?.length ?? 0;
  return (
    <div className="flex flex-col gap-4">
      <IntestazionePagina titolo="Proposte da completare" sottotitolo="Conversioni delle voci del Diario da approvare, per tutte le partite." />
      <section className="card flex flex-col gap-3" aria-label="Filtri">
        <div className="flex flex-wrap items-end gap-3">
          <Campo etichetta="Dal" senzaGruppo aiuto="«nessuna» = dall’inizio dell’anno"><SelettoreData etichetta="Dal" facoltativa valore={da} onCambia={setDa} /></Campo>
          <Campo etichetta="Al" senzaGruppo aiuto="«nessuna» = fino alla fine" errore={periodoRovescio ? 'Il giorno finale viene prima di quello iniziale.' : undefined}><SelettoreData etichetta="Al" facoltativa valore={a} onCambia={setA} /></Campo>
        </div>
        <Segmenti etichetta="Stato" valore={stato} opzioni={STATI} onCambia={setStato} />
        {lista.dati && <p className="m-0 testo-13 text-text-secondary" role="status">{n === 0 ? 'Nessuna proposta in questo periodo.' : n === 1 ? '1 proposta' : `${n} proposte`}</p>}
      </section>
      {lista.inPrimoCaricamento && <p role="status" className="m-0">Un attimo…</p>}
      {lista.errore && <p role="alert" className="m-0 text-error-testo">{lista.errore}</p>}
      {erroreElenchi && <p role="alert" className="m-0 text-error-testo">Elenchi non disponibili: {erroreElenchi}</p>}
      {elenchi && nomi && perGiorno.map(([giorno, proposte]) => (
        <section key={giorno} className="card flex flex-col gap-2" aria-labelledby={`giorno-${giorno}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id={`giorno-${giorno}`} className="m-0 testo-17 font-semibold">{dataGiocoTesto(giorno)}</h2>
            <Link className="chip touch testo-12" to={`/guida/percorso/${giorno}`}>Apri il giorno nel Diario</Link>
          </div>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {proposte.map((p) => (
              <SchedaProposta key={`${p.id}:${p.revisione}`} proposta={p} elenchi={elenchi} nomi={nomi} partitaId={partitaId} conVoce
                onModifica={(x) => void apriModifica(x)} onDecisa={() => setVersione((v) => v + 1)} />
            ))}
          </ul>
        </section>
      ))}
      {modifica && (
        <ModuloVoceGiornata soggetto={{ tipo: 'voce', voce: modifica.voce, proposta: modifica.proposta }} giorno={modifica.proposta.giorno} voci={modifica.voci} partitaId={partitaId}
          onChiudi={() => setModifica(null)} onSalvato={() => setVersione((v) => v + 1)} />
      )}
    </div>
  );
}
