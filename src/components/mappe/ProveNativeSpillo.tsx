import type { NativoSpilloDto } from '../../../shared/types';

/** Le prove native di uno spillo il cui significato non è ancora dimostrato.
 *
 * Sulla mappa questi pin ci sono e si vedono, ma dire che cosa siano sarebbe inventarlo: il gioco
 * li disegna con una certa icona e nient'altro nei dati dice che cosa quell'icona indichi. Invece
 * di nasconderli o di battezzarli per somiglianza, portano con sé quello che si sa, così chi apre
 * la scheda può chiudere la questione guardando le schermate del gioco.
 *
 * L'ordine non è casuale: prima le tracce che il gioco stesso fornisce — il nome interno dello
 * sprite, le procedure che accendono la bandiera del pin, i testi mostrati lì vicino — e per
 * ultima la lettura geometrica, con accanto l'avvertenza che sbaglia più di quanto azzecchi.
 */
export function ProveNativeSpillo({ nativo }: { nativo: NativoSpilloDto }) {
  if (!nativo.daVerificare) return null;
  const p = (nativo.prove ?? {}) as Record<string, Record<string, unknown> | string | undefined>;
  const bandiera = p.procedureCheAccendonoLaBandiera as { procedureTutte?: Record<string, number>; etichetteDeiTriggerTutte?: Record<string, number> } | undefined;
  const sotto = p.sottoIlPin as { proposta?: string; punti?: number } | undefined;
  const vicini = p.etichetteDeiPuntiViciniTutte as Record<string, number> | undefined;
  const diffusione = p.diffusione as { pin?: number; planimetrieDungeon?: number; planimetrieUrbane?: number } | undefined;

  return <section className="card flex flex-col gap-2 text-[13px]" aria-label="Prove da verificare">
    <h3 className="m-0 text-[14px]">Significato da verificare</h3>
    <p className="m-0 text-text-secondary">
      Il gioco disegna questo pin con la parte {nativo.partId ?? '—'}
      {nativo.nomeNativo ? <> , lo sprite chiamato <strong lang="ja">{nativo.nomeNativo}</strong></> : null}
      , ma che cosa indichi non è dimostrato: <em>{String(p.motivoNonDeterminato ?? 'nessuna prova sufficiente')}</em>.
    </p>
    {nativo.motivoSenzaSprite && <p className="m-0 text-text-secondary">{nativo.motivoSenzaSprite}</p>}
    {diffusione && <p className="m-0 text-text-muted">
      Tipo nativo {nativo.tipoNativo}: compare {diffusione.pin} volte, su {diffusione.planimetrieDungeon} planimetrie di Palazzo e {diffusione.planimetrieUrbane} urbane.
    </p>}
    {bandiera?.procedureTutte && Object.keys(bandiera.procedureTutte).length > 0 && <Elenco
      titolo="Procedure che ne accendono la bandiera" voci={bandiera.procedureTutte} />}
    {bandiera?.etichetteDeiTriggerTutte && Object.keys(bandiera.etichetteDeiTriggerTutte).length > 0 && <Elenco
      titolo="Testi che il gioco mostra sui comandi vicini" voci={bandiera.etichetteDeiTriggerTutte} />}
    {vicini && Object.keys(vicini).length > 0 && <Elenco titolo="Etichette dei punti vicini" voci={vicini} />}
    {sotto?.proposta && <p className="m-0 text-text-muted">
      La lettura geometrica suggerirebbe «{sotto.proposta}» su {sotto.punti ?? 0} punti, ma su quella strada si sbaglia più della metà delle volte: è un indizio da controllare, non una risposta.
    </p>}
    {typeof p.avvertenza === 'string' && <p className="m-0 text-text-muted italic">{p.avvertenza}</p>}
  </section>;
}

function Elenco({ titolo, voci }: { titolo: string; voci: Record<string, number> }) {
  const righe = Object.entries(voci).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return <div>
    <h4 className="m-0 text-[13px] text-text-secondary">{titolo}</h4>
    <ul className="m-0 pl-4 text-text-muted">
      {righe.map(([nome, quante]) => <li key={nome}><code>{nome}</code> ×{quante}</li>)}
    </ul>
  </div>;
}
