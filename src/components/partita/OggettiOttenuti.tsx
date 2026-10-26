// ============================================================
// OggettiOttenuti — gli oggetti del catalogo ottenuti nella partita (L13, ondata 3, decisioni 1 e 3)
// ============================================================
//
// In Partita → Denaro e squadra, sotto il denaro: è l'inventario di ciò che la partita ha ricevuto. Tre origini, una lettura sola del server
// (`GET /api/partite/:id/oggetti-ottenuti`): le voci del Diario spuntate con l'effetto «oggetto ricevuto», le Richieste completate (i loro
// oggetti del catalogo, una volta sola, finché restano completate) e (Ondata 5, lotto G) i turni delle attività registrati con un esito che dà
// oggetti (la sfida della Big Bang Burger vinta); (Ondata 5, lotto F-bis) i doni dei Confidenti già meritati e, accanto, le copie usate
// (concime, materiali della fabbricazione, incensi). Per ogni oggetto le copie in tutto e, aprendolo, da dove vengono e dove sono state usate.
// Rilievo della revisione (R2): le cifre sono quelle della stessa lettura delle copie della scelta dell'esito e della finestra «Regala»
// (comprate comprese): «×N» sono le copie avute (ricevute e comprate) e, se qualcuna è uscita (usata, regalata, ceduta), «ne restano M»,
// lo stesso numero che la scelta dell'esito chiama «ne hai». Mai un «×0» accanto a una copia usata che si era comprata.
// Si rilegge quando la partita cambia, senza azzerarsi (`useRileggiAlCambio`). L'unico gesto è annullare l'uso di un incenso in un Isolamento
// (rilievo R7: l'Isolamento non ha un gesto che lo tolga); l'uso di un turno si toglie togliendo il turno.
// ============================================================

import { useState } from 'react';
import { annullaConsumoIsolamento, getOggettiOttenuti } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { useRileggiAlCambio } from '../../hooks/useRileggiAlCambio';
import { usePartitaStore } from '../../stores/partitaStore';
import { notifica } from '../../stores/notificationStore';
import { conferma } from '../../stores/confermaStore';
import { dataLeggibile } from '../../../shared/condizioniSpillo';
import { PageState } from '../shared/PageState';
import { IconaAzione, IconaSegno } from '../shared/IconaAzione';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import type { OggettoConsumatoDto, OggettoOttenutoDto } from '../../types';

/** Da dove viene una riga: la voce del Diario (giorno e testo), la Richiesta completata o il turno di un'attività con il suo esito. */
function origine(o: OggettoOttenutoDto): string {
  if (o.origine.tipo === 'richiesta') return `Richiesta completata «${o.origine.nome}»`;
  // Ondata 5 (lotto G): un turno con un esito che dà oggetti (la sfida della Big Bang Burger vinta)
  if (o.origine.tipo === 'turno') return `${o.origine.attivitaNome} · ${o.origine.esitoNome}`;
  // Ondata 5 (lotto F-bis): il dono di un Confidente meritato con il rango e il giorno
  if (o.origine.tipo === 'confidente') return `Dono di ${o.origine.nome}`;
  const testo = o.origine.testo ? (o.origine.testo.length > 80 ? `${o.origine.testo.slice(0, 79)}…` : o.origine.testo) : 'voce non più nel Diario';
  return `${o.origine.giorno ? `${dataLeggibile(o.origine.giorno)} · ` : ''}${testo}`;
}

/** «1 copia», «3 copie». */
const copie = (n: number) => `${n} ${n === 1 ? 'copia' : 'copie'}`;

/** La sezione «Oggetti ottenuti»: i totali per oggetto, ognuno apribile con le sue origini; un testo semplice se non ce n'è nessuno. */
export function OggettiOttenuti({ partitaId }: { partitaId: number }) {
  const dati = useCarica(() => getOggettiOttenuti(partitaId), [partitaId]);
  const partita = usePartitaStore((s) => s.attiva);
  useRileggiAlCambio(dati.ricarica, partita?.id === partitaId ? partita : null);
  const [annullando, setAnnullando] = useState<number | null>(null);
  const d = dati.dati;

  /** Annulla l'uso di un incenso in un Isolamento dopo conferma: la copia torna; statistiche e skill della Persona restano. */
  const annulla = async (c: OggettoConsumatoDto, nome: string) => {
    if (c.id === undefined) return;
    if (!(await conferma({ titolo: 'Annullare l’uso dell’incenso?', testo: `La copia di «${nome}» torna fra quelle che hai. Le statistiche e la skill che l’Isolamento ha dato restano: se vanno tolte, si correggono nella Persona.`, etichetta: 'Annulla l’uso' }))) return;
    setAnnullando(c.id);
    try {
      dati.imposta(await annullaConsumoIsolamento(partitaId, c.id));
      notifica('info', `Uso annullato: la copia di «${nome}» è tornata.`);
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Annullamento fallito.');
    } finally {
      setAnnullando(null);
    }
  };

  return (
    <section className="card flex flex-col gap-2" aria-label="Oggetti ottenuti">
      <span className="flex items-center gap-1.5 testo-12 uppercase tracking-[0.08em] text-text-muted"><IconaSegno chiave="catalogo" dimensione={14} />Oggetti ottenuti</span>
      <PageState isLoading={dati.caricamento && !d} error={dati.errore} onRetry={() => void dati.ricarica()}>
        {d && (d.totali.length === 0
          ? <p className="m-0 testo-13 text-text-muted text-pretty">Nessun oggetto ancora: arrivano spuntando le voci del Diario che danno un oggetto, con gli esiti delle attività che ne danno (le sfide vinte della Big Bang Burger), completando le Richieste che ne danno e con i doni dei Confidenti al rango massimo. Qui compaiono anche gli oggetti comprati che usi (il concime della pianta, i materiali della fabbricazione, gli incensi dell’Isolamento).</p>
          : (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {d.totali.map((t) => {
                const righe = d.righe.filter((r) => r.catalogoChiave === t.catalogoChiave);
                // Ondata 5 (lotto F-bis): le copie usate (concime, materiali, incenso); il conto si dice solo se ce ne sono
                const usate = (d.consumi ?? []).filter((c) => c.catalogoChiave === t.catalogoChiave);
                const consumate = t.consumate ?? 0, comprate = t.comprate ?? 0, regalate = t.regalate ?? 0, cedute = t.cedute ?? 0;
                // le copie avute (ricevute e comprate) e, se qualcuna è uscita, quelle che restano: il numero della scelta dell'esito («ne hai»)
                const avute = t.quantita + comprate;
                const uscite = consumate + regalate + cedute;
                const restano = t.disponibili ?? Math.max(0, avute - uscite);
                const uscita = [consumate > 0 ? `${consumate} ${consumate === 1 ? 'usata' : 'usate'}` : null, regalate > 0 ? `${regalate} ${regalate === 1 ? 'regalata' : 'regalate'}` : null,
                  cedute > 0 ? `${cedute} ${cedute === 1 ? 'ceduta' : 'cedute'}` : null].filter(Boolean).join(' · ');
                return (
                  <li key={t.catalogoChiave} className="min-w-0">
                    <details className="min-w-0 rounded-md bg-white/[0.04] px-2.5">
                      <summary className="touch flex min-w-0 cursor-pointer items-center gap-2 testo-14">
                        <span className="min-w-0 flex-1 break-words"><strong>{t.nome}</strong>{t.categoria ? <span className="testo-12 text-text-muted"> · {t.categoria}</span> : null}</span>
                        <span className="shrink-0 text-right tabular-nums">
                          {avute > 0 ? `×${avute}` : null}
                          {uscite > 0 && <span className="block testo-12 text-text-muted">{uscita}{avute > 0 ? ` · ne restano ${restano}` : ''}</span>}
                        </span>
                      </summary>
                      <ul className="m-0 flex flex-col gap-1 pb-2 pl-4 testo-12 text-text-secondary">
                        {righe.map((r, i) => <li key={`${r.origine.tipo}:${r.origine.tipo === 'voce' ? r.origine.voceUid : r.origine.tipo === 'turno' ? `${r.origine.attivita}:${r.origine.ordine}` : r.origine.tipo === 'confidente' ? r.origine.confidente : r.origine.chiave}:${i}`}>{origine(r)}{r.quantita > 1 ? ` (×${r.quantita})` : ''}</li>)}
                        {/* le provenienze che non sono righe: gli acquisti (anche dentro un set), i regali e gli scambi, con le stesse cifre di «Regala» */}
                        {comprate > 0 && <li>Comprate nei negozi: {copie(comprate)}</li>}
                        {regalate > 0 && <li className="text-text-muted">Regalate: {copie(regalate)}</li>}
                        {cedute > 0 && <li className="text-text-muted">Cedute negli scambi: {copie(cedute)}</li>}
                        {avute === 0 && <li className="text-text-muted">Nessuna copia nota nella partita: l’uso è registrato lo stesso (una copia presa in un modo che l’app non conosce).</li>}
                        {usate.map((c, i) => (
                          <li key={`uso:${c.id ?? i}`} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-text-muted">
                            <span className="min-w-0 flex-1">Usata: {c.origine}{c.quantita > 1 ? ` (×${c.quantita})` : ''}</span>
                            {/* Rilievo R7: l'uso di un Isolamento si annulla da qui; quello di un turno si toglie togliendo il turno */}
                            {c.annullabile && c.id !== undefined && (
                              <PulsanteVisivo tono="fantasma" compatto className="shrink-0" icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla l’uso"
                                disabled={annullando !== null} onClick={() => void annulla(c, t.nome)} aria-label={`Annulla l’uso di ${t.nome} nell’Isolamento`} />
                            )}
                          </li>
                        ))}
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
