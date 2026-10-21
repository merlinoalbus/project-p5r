import { leggiAcquistiRegistrati } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { useGestiPartita } from '../../services/gestiPartita';
import { ConsumiAojiru } from '../catalogo/ConsumiAojiru';

/** La lettura dei fatti e i loro annulli non dipendono dalla permanenza di un’offerta nel catalogo. */
export function RegistroAcquistiPartita({ partitaId, onCambiato }: { partitaId: number; onCambiato?: () => void | Promise<void> }) {
  const gesti = useGestiPartita();
  const registro = useCarica(() => leggiAcquistiRegistrati(partitaId), [partitaId, gesti.versionePerPartita[partitaId] ?? 0, gesti.versioneGuida]);
  const articoli = [...new Set([...(registro.dati?.registrazioni.map(r => r.identita.articolo) ?? []), ...(registro.dati?.presenzeStoriche.map(p => p.articolo) ?? [])])];
  return <details className="card min-w-0">
    <summary className="touch cursor-pointer font-display text-[17px] uppercase">Registro degli acquisti{registro.dati ? ` · ${articoli.length} articoli` : ''}</summary>
    <div className="flex min-w-0 flex-col gap-3 pt-2 text-[13px]">
      <p className="m-0">Fatti, fonti e vecchie presenze della partita, comprese le offerte eliminate. Le nuove consumazioni si registrano dalla loro offerta; qui puoi leggere e togliere la fonte indicata.</p>
      <button className="btn btn-ghost touch self-start" type="button" onClick={() => void registro.ricarica()}>Rileggi il registro</button>
      {registro.caricamento && <p role="status" className="m-0">Caricamento del registro…</p>}
      {registro.errore && <p role="alert" className="m-0 text-error">{registro.errore}</p>}
      {registro.dati && !articoli.length && <p className="m-0">Nessun acquisto registrato.</p>}
      {articoli.map(articolo => {
        const registrazioni = registro.dati!.registrazioni.filter(r => r.identita.articolo === articolo);
        const presenzaStorica = registro.dati!.presenzeStoriche.find(p => p.articolo === articolo) ?? null;
        return <section key={articolo} className="flex min-w-0 flex-col gap-2 border-t border-border pt-2">
          <h3 className="m-0 break-words text-[14px]">{registrazioni[0]?.identita.nome ?? articolo}</h3>
          <ConsumiAojiru key={`${partitaId}:${articolo}`} partitaId={partitaId} registrabile={false} stato={{ articolo, acquistato: registrazioni.some(r => r.attiva) || !!presenzaStorica, presenzaStorica, registrazioni, aojiru: null }} onCambiato={async () => { await registro.ricarica(); await onCambiato?.(); }} />
        </section>;
      })}
    </div>
  </details>;
}
