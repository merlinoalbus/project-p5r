// ============================================================
// OggettiOttenuti — gli oggetti del catalogo ottenuti nella partita (L13, ondata 3, decisioni 1 e 3)
// ============================================================
//
// In Partita → Denaro e squadra, sotto il denaro: è l'inventario di ciò che la partita ha ricevuto. Tre origini, una lettura sola del server
// (`GET /api/partite/:id/oggetti-ottenuti`): le voci del Diario spuntate con l'effetto «oggetto ricevuto», le Richieste completate (i loro
// oggetti del catalogo, una volta sola, finché restano completate) e (Ondata 5, lotto G) i turni delle attività registrati con un esito che dà
// oggetti (la sfida della Big Bang Burger vinta). Per ogni oggetto le copie in tutto e, aprendolo, da dove vengono.
// Sola lettura (anche nel rilascio): gli oggetti cambiano spuntando o togliendo la spunta, completando o riaprendo una Richiesta. Si rilegge
// quando la partita cambia, senza azzerarsi (`useRileggiAlCambio`).
// ============================================================

import { getOggettiOttenuti } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { useRileggiAlCambio } from '../../hooks/useRileggiAlCambio';
import { usePartitaStore } from '../../stores/partitaStore';
import { dataLeggibile } from '../../../shared/condizioniSpillo';
import { PageState } from '../shared/PageState';
import { IconaSegno } from '../shared/IconaAzione';
import type { OggettoOttenutoDto } from '../../types';

/** Da dove viene una riga: la voce del Diario (giorno e testo), la Richiesta completata o il turno di un'attività con il suo esito. */
function origine(o: OggettoOttenutoDto): string {
  if (o.origine.tipo === 'richiesta') return `Richiesta completata «${o.origine.nome}»`;
  // Ondata 5 (lotto G): un turno con un esito che dà oggetti (la sfida della Big Bang Burger vinta)
  if (o.origine.tipo === 'turno') return `${o.origine.attivitaNome} · ${o.origine.esitoNome}`;
  const testo = o.origine.testo ? (o.origine.testo.length > 80 ? `${o.origine.testo.slice(0, 79)}…` : o.origine.testo) : 'voce non più nel Diario';
  return `${o.origine.giorno ? `${dataLeggibile(o.origine.giorno)} · ` : ''}${testo}`;
}

/** La sezione «Oggetti ottenuti»: i totali per oggetto, ognuno apribile con le sue origini; un testo semplice se non ce n'è nessuno. */
export function OggettiOttenuti({ partitaId }: { partitaId: number }) {
  const dati = useCarica(() => getOggettiOttenuti(partitaId), [partitaId]);
  const partita = usePartitaStore((s) => s.attiva);
  useRileggiAlCambio(dati.ricarica, partita?.id === partitaId ? partita : null);
  const d = dati.dati;
  return (
    <section className="card flex flex-col gap-2" aria-label="Oggetti ottenuti">
      <span className="flex items-center gap-1.5 testo-12 uppercase tracking-[0.08em] text-text-muted"><IconaSegno chiave="catalogo" dimensione={14} />Oggetti ottenuti</span>
      <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
        {d && (d.totali.length === 0
          ? <p className="m-0 testo-13 text-text-muted">Nessun oggetto ancora: arrivano spuntando le voci del Diario che danno un oggetto, con gli esiti delle attività che ne danno (le sfide vinte della Big Bang Burger) e completando le Richieste che ne danno.</p>
          : (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {d.totali.map((t) => {
                const righe = d.righe.filter((r) => r.catalogoChiave === t.catalogoChiave);
                return (
                  <li key={t.catalogoChiave} className="min-w-0">
                    <details className="min-w-0 rounded-md bg-white/[0.04] px-2.5">
                      <summary className="touch flex min-w-0 cursor-pointer items-center gap-2 testo-14">
                        <span className="min-w-0 flex-1 break-words"><strong>{t.nome}</strong>{t.categoria ? <span className="testo-12 text-text-muted"> · {t.categoria}</span> : null}</span>
                        <span className="shrink-0 tabular-nums">×{t.quantita}</span>
                      </summary>
                      <ul className="m-0 flex flex-col gap-0.5 pb-2 pl-4 testo-12 text-text-secondary">
                        {righe.map((r, i) => <li key={`${r.origine.tipo}:${r.origine.tipo === 'voce' ? r.origine.voceUid : r.origine.tipo === 'turno' ? `${r.origine.attivita}:${r.origine.ordine}` : r.origine.chiave}:${i}`}>{origine(r)}{r.quantita > 1 ? ` (×${r.quantita})` : ''}</li>)}
                      </ul>
                    </details>
                  </li>
                );
              })}
            </ul>
          ))}
      </PageState>
    </section>
  );
}
