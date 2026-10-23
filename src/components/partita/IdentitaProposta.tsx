import { Link } from 'react-router-dom';
import type { RegistrazioneAcquistoDto } from '../../../shared/acquisti';
import type { PropostaPartitaDto } from '../../../shared/propostePartita';
import { descriviEffettoVoce, normalizzaEffettoVoce } from '../../../shared/effettiVoce';
import { dataLeggibile } from '../../../shared/condizioniSpillo';
import { eDote, nomeDote } from '../../../shared/doti';

/** Il giorno di gioco in parole («18 aprile»), con la fascia se c'è. */
const quando = (giorno: unknown, fascia: unknown): string | null =>
  typeof giorno === 'string' ? `${dataLeggibile(giorno)}${fascia === 'giorno' ? ', di giorno' : fascia === 'sera' ? ', di sera' : ''}` : null;

/**
 * Da dove viene la proposta, in parole (BON-02): il giorno e la voce del Diario, il consumo o la pesca. Niente identificativi, hash o
 * JSON: chi vuole vedere la voce ha il collegamento. Le righe del registro riletto servono solo a dire quale consumo è.
 */
export function IdentitaProposta({ proposta: p, registrazioni, erroreRegistro, caricamentoRegistro }: { proposta: PropostaPartitaDto; registrazioni: RegistrazioneAcquistoDto[] | null; erroreRegistro: string | null; caricamentoRegistro: boolean }) {
  const effetto = normalizzaEffettoVoce(p.dati.effetto);
  const precedente = normalizzaEffettoVoce(p.dati.versionePrecedente);
  const fatto = p.causa.tipo === 'acquisto' ? registrazioni?.find(r => r.partitaId === p.partitaId && r.id === p.causa.chiave) : null;
  const voce = p.causa.tipo === 'voce' ? p.causa.chiave.split(':')[0] : null;
  const giorno = quando(p.dati.giorno, p.dati.fascia);
  return <div className="flex min-w-0 flex-col gap-1 break-words text-[12px]">
    {p.causa.tipo === 'pesca' && <>
      <span>Dalla pesca{giorno ? ` del ${giorno}` : ''}.</span>
      <Link className="touch self-start" to="/partita?scheda=progressi#pesca">Apri il registro della pesca</Link>
    </>}
    {p.causa.tipo === 'acquisto' && (caricamentoRegistro ? <span role="status">Un attimo…</span>
      : erroreRegistro ? <span role="alert" className="text-error">Non riesco a leggere il consumo: {erroreRegistro}</span>
        : fatto ? <span>Dal consumo di {fatto.identita.nome} ({fatto.identita.negozioNome}), {quando(fatto.momento.giorno, fatto.momento.fascia)}.</span>
          : <span className="text-warning">Il consumo da cui nasce non c’è più nell’elenco.</span>)}
    {voce && <>
      <span>Dalla voce del Diario{giorno ? ` del ${giorno}` : ''}.</span>
      {typeof p.dati.giorno === 'string' && <Link className="touch self-start" to={`/guida/percorso/${p.dati.giorno}?voce=${encodeURIComponent(voce)}`}>Apri la voce del Diario</Link>}
    </>}
    {effetto && <span>Effetto della voce: {descriviEffettoVoce(effetto)}.</span>}
    {p.dati.sostituzione === true && <span>Sostituisce un effetto precedente: prima {precedente ? descriviEffettoVoce(precedente) : 'non indicato'}, ora {effetto ? descriviEffettoVoce(effetto) : 'non leggibile'}. Si applica solo la differenza.</span>}
    {Array.isArray(p.dati.raccordoDoti) && p.dati.raccordoDoti.map((dato, i) => {
      if (!dato || typeof dato !== 'object') return null;
      const r = dato as Record<string, unknown>;
      if (!eDote(r.dote)) return null;
      return <span key={typeof r.effettoUid === 'string' ? r.effettoUid : i}>{nomeDote(r.dote)}: {typeof r.attribuito === 'number' ? `già contati ${r.attribuito} punti da una versione precedente` : 'una versione precedente aveva già dato dei punti'}.</span>;
    })}
  </div>;
}
