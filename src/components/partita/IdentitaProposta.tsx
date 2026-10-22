import { Link } from 'react-router-dom';
import type { RegistrazioneAcquistoDto } from '../../../shared/acquisti';
import type { PropostaPartitaDto } from '../../../shared/propostePartita';
import { descriviEffettoVoce, normalizzaEffettoVoce } from '../../../shared/effettiVoce';
import { eDote, nomeDote } from '../../../shared/doti';
import { DettagliConsumo } from '../catalogo/ConsumiAojiru';

/** Identità della proposta fotografata; i dati del registro riletti separatamente sono qualificati come correnti. */
export function IdentitaProposta({ proposta: p, registrazioni, erroreRegistro, caricamentoRegistro }: { proposta: PropostaPartitaDto; registrazioni: RegistrazioneAcquistoDto[] | null; erroreRegistro: string | null; caricamentoRegistro: boolean }) {
  const effetto = normalizzaEffettoVoce(p.dati.effetto);
  const precedente = normalizzaEffettoVoce(p.dati.versionePrecedente);
  const fatto = p.causa.tipo === 'acquisto' ? registrazioni?.find(r => r.partitaId === p.partitaId && r.id === p.causa.chiave) : null;
  const [voce, uidEffetto] = p.causa.tipo === 'voce' ? p.causa.chiave.split(':') : [];
  return <div className="flex min-w-0 flex-col gap-1 break-words text-[12px]">
    <code className="break-all">Partita {p.partitaId} · proposta {p.id}/{p.uid}</code>
    <code className="break-all">{p.causa.tipo === 'acquisto' ? 'Consumazione' : p.causa.tipo === 'pesca' ? 'Fonte della pesca' : 'Voce ed effetto'}: {p.causa.chiave}</code>
    {p.causa.tipo === 'pesca' && <>
      <span>Identità conservata della causa; una sessione o un acquisto esca rimangono distinguibili anche se la fonte è stata rimossa.</span>
      {typeof p.dati.sessioneId === 'string' && <code className="break-all">Sessione {p.dati.sessioneId}</code>}
      {typeof p.dati.acquistoEscaId === 'string' && <code className="break-all">Acquisto esca {p.dati.acquistoEscaId}</code>}
      {typeof p.dati.giorno === 'string' && <span>Giorno osservato: {p.dati.giorno}{p.dati.fascia === 'giorno' || p.dati.fascia === 'sera' ? ` · ${p.dati.fascia}` : ''}</span>}
      <Link className="touch self-start" to="/partita?scheda=progressi#pesca">Apri il registro della pesca nei Progressi</Link>
    </>}
    {p.causa.tipo === 'acquisto' && <>
      {caricamentoRegistro ? <span role="status">Rilettura del dettaglio della consumazione…</span> : erroreRegistro ? <span role="alert" className="text-error">Dettaglio corrente non leggibile: {erroreRegistro}. L’identità conservata resta quella indicata sopra.</span> : fatto ? <details><summary className="touch">Dettaglio corrente del registro, distinto dall’anteprima</summary><DettagliConsumo acquisto={fatto} /></details> : <span className="text-warning">Il fatto non è presente nel registro letto. Nessuna identità viene dedotta dal nome.</span>}
    </>}
    {voce && <><code className="break-all">Voce {voce} · effetto {uidEffetto}</code>{typeof p.dati.giorno === 'string' && <Link className="touch self-start" to={`/guida/percorso/${p.dati.giorno}?voce=${encodeURIComponent(voce)}`}>Apri la voce del Diario</Link>}</>}
    {effetto && <span>Effetto indicato: {descriviEffettoVoce(effetto)}</span>}
    {p.dati.sostituzione === true && <><strong>Sostituzione</strong><span>Prima: {precedente ? descriviEffettoVoce(precedente) : 'Versione precedente non riconciliata.'}</span><span>Dopo: {effetto ? descriviEffettoVoce(effetto) : 'Configurazione non leggibile.'}</span><code className="break-all">Ricevuta precedente: {typeof p.dati.ricevutaPrecedente === 'string' ? p.dati.ricevutaPrecedente : 'non attribuibile: serve riconciliazione'}</code></>}
    {Array.isArray(p.dati.raccordoDoti) && p.dati.raccordoDoti.map((dato, i) => {
      if (!dato || typeof dato !== 'object') return <span className="text-warning" key={i}>Raccordo Doti non leggibile.</span>;
      const r = dato as Record<string, unknown>;
      return <div className="flex flex-col gap-1 border-l border-border pl-2" key={typeof r.effettoUid === 'string' ? r.effettoUid : i}>
        <span>Dote da raccordare: {eDote(r.dote) ? nomeDote(r.dote) : 'non attribuibile'} · quantità già attribuita: {typeof r.attribuito === 'number' ? r.attribuito : 'da riconciliare'}.</span>
        <code className="break-all">Effetto {typeof r.effettoUid === 'string' ? r.effettoUid : 'non leggibile'} · ricevuta {typeof r.sidecarId === 'string' ? r.sidecarId : 'assente'}</code>
        {typeof r.giaAssorbitaDa === 'string' && <code className="break-all">Già assorbita dalla ricevuta {r.giaAssorbitaDa}</code>}
        <span>{effetto?.tipo === 'acquisto' && effetto.variante !== null && eDote(r.dote) ? effetto.variante === r.dote ? 'Stessa Dote: rialloca l’attribuzione provata senza cambiare il saldo.' : 'Dote diversa: le quantità provate producono proposte inverse e positive distinte.' : 'Il rapporto con la variante osservata sarà verificato prima del raccordo.'}</span>
      </div>;
    })}
  </div>;
}
