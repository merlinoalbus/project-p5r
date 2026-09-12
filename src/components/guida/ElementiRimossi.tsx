// ============================================================
// ElementiRimossi — le righe nascoste di un tipo, con il ripristino in un tocco
// ============================================================
//
// «Nascondi dagli elenchi» toglieva la riga da ogni elenco, e il comando per rimetterla stava nel
// modulo di quella riga, che non si vedeva più. Qui le righe nascoste hanno un posto loro: la
// pagina «Rimossi» per tutti i tipi, e in un negozio i soli suoi articoli.
// ============================================================

import { useCarica } from '../../hooks/useCarica';
import { getCatalogo, getNegozi, nascondiElementoCatalogo } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NOME_TIPO_CATALOGO } from '../../utils/catalogo';
import type { TipoCatalogo } from '../../types';

interface Props {
  tipo: TipoCatalogo;
  /** Solo gli articoli di questo negozio. */
  negozio?: string;
  /** Chiamato dopo un ripristino (la pagina ricarica i suoi elenchi). */
  onRipristinato?: () => void;
  /** Senza righe nascoste non si mostra niente (dentro una pagina); con `sempre` si dice che non ce ne sono. */
  sempre?: boolean;
  /** Cambia quando la pagina ha nascosto o ripristinato qualcosa: l'elenco si ricarica. */
  versione?: unknown;
}

export function ElementiRimossi({ tipo, negozio, onRipristinato, sempre, versione }: Props) {
  const elenco = useCarica(() => getCatalogo(tipo, { nascosti: true, negozio }), [tipo, negozio, versione]);
  // Nella pagina di tutti i tipi un articolo dice di quale negozio è, col nome e non con la chiave.
  const negozi = useCarica(() => (tipo === 'articolo' && !negozio ? getNegozi() : Promise.resolve([])), [tipo, negozio]);
  const nomeNegozio = (chiave: unknown) => negozi.dati?.find((n) => n.chiave === chiave)?.nome ?? (typeof chiave === 'string' ? chiave : '');
  const righe = elenco.dati ?? [];
  if (!sempre && righe.length === 0) return null;
  const ripristina = (chiave: string, nome: string) => {
    void nascondiElementoCatalogo(tipo, chiave, false)
      .then(() => { notifica('success', `«${nome}» è di nuovo negli elenchi.`); void elenco.ricarica(); onRipristinato?.(); })
      .catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Ripristino fallito.'));
  };
  return (
    <section className="rimossi-elenco" aria-label={`${NOME_TIPO_CATALOGO[tipo].plurale} rimossi`}>
      <h3 className="rimossi-elenco__titolo">{NOME_TIPO_CATALOGO[tipo].plurale}<span className="text-text-muted"> · {righe.length}</span></h3>
      {elenco.errore && <p className="m-0 text-[13px] text-error" role="alert">{elenco.errore}</p>}
      {righe.length === 0 && !elenco.caricamento && <p className="m-0 text-[13px] text-text-muted">Nessuna riga rimossa.</p>}
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {righe.map((e) => (
          <li key={e.chiave} className="rimossi-elenco__riga">
            <span className="min-w-0 flex-1 text-[13px]">{e.nome}{tipo === 'articolo' && !negozio && e.dati.negozio_chiave ? <span className="text-text-muted"> · {nomeNegozio(e.dati.negozio_chiave)}</span> : null}</span>
            <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Rimetti negli elenchi" onClick={() => ripristina(e.chiave, e.nome)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
