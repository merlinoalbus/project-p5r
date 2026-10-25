import { leggiAcquistiRegistrati } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { useGestiPartita } from '../../services/gestiPartita';
import { ConsumiAojiru } from '../catalogo/ConsumiAojiru';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

/** La lettura dei fatti e i loro annulli non dipendono dalla permanenza di un’offerta nel catalogo. */
export function RegistroAcquistiPartita({ partitaId, onCambiato }: { partitaId: number; onCambiato?: () => void | Promise<void> }) {
  const gesti = useGestiPartita();
  const registro = useCarica(() => leggiAcquistiRegistrati(partitaId), [partitaId, gesti.versionePerPartita[partitaId] ?? 0, gesti.versioneGuida]);
  const articoli = [...new Set([...(registro.dati?.registrazioni.map(r => r.identita.articolo) ?? []), ...(registro.dati?.presenzeStoriche.map(p => p.articolo) ?? [])])];
  return <details className="card min-w-0">
    <summary className="touch cursor-pointer font-display testo-17 uppercase">Registro degli acquisti{registro.dati ? ` · ${articoli.length} articoli` : ''}</summary>
    <div className="flex min-w-0 flex-col gap-3 pt-2 testo-13">
      <p className="m-0">Gli acquisti registrati in questa partita, anche di offerte che nel negozio non ci sono più. I nuovi acquisti si registrano dalla pagina dell’offerta; qui puoi rileggerli e togliere quello segnato per errore.</p>
      <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="ricalcola" dimensione={22} />} titolo="Rileggi il registro" className="self-start" onClick={() => void registro.ricarica()} />
      {registro.caricamento && <p role="status" className="m-0">Caricamento del registro…</p>}
      {registro.errore && <p role="alert" className="m-0 text-error-testo">{registro.errore}</p>}
      {registro.dati && !articoli.length && <p className="m-0">Nessun acquisto registrato.</p>}
      {articoli.map(articolo => {
        const registrazioni = registro.dati!.registrazioni.filter(r => r.identita.articolo === articolo);
        const presenzaStorica = registro.dati!.presenzeStoriche.find(p => p.articolo === articolo) ?? null;
        return <section key={articolo} className="flex min-w-0 flex-col gap-2 border-t border-border pt-2">
          <h3 className="m-0 break-words testo-14">{registrazioni[0]?.identita.nome ?? presenzaStorica?.valutazione?.nome ?? articolo}</h3>
          <ConsumiAojiru key={`${partitaId}:${articolo}`} partitaId={partitaId} registrabile={false} stato={{ articolo, acquistato: registrazioni.some(r => r.attiva) || !!presenzaStorica, presenzaStorica, registrazioni, aojiru: null }} onCambiato={async () => { await registro.ricarica(); await onCambiato?.(); }} />
        </section>;
      })}
    </div>
  </details>;
}
