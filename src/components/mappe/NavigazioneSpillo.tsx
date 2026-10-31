// ============================================================
// NavigazioneSpillo — il pulsante «Vai» di uno spillo che porta a un'altra mappa
// ============================================================

import type { SpilloDto } from '../../types';
import { arrivoSpillo, type NavigaMappa } from '../../utils/navigazioneMappa';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaSpillo } from './IconaSpillo';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** Il pulsante di uno spillo di spostamento: apre la mappa d'arrivo adattata alla finestra e, se indicato, con lo spillo già selezionato. */
export function NavigazioneSpillo({ spillo: s, partitaId, onNaviga, nomeMappa, nomeSpillo }: { spillo: SpilloDto; partitaId: number | null; onNaviga: NavigaMappa; nomeMappa?: string; nomeSpillo?: string }) {
  // l'editor non esiste nel rilascio: lì il passaggio resta senza invito a correggerlo
  if (s.destinazioneNonDisponibile) return <p role="status" className="testo-12 text-text-muted">{IN_RILASCIO ? 'Questo passaggio non porta ancora a una mappa.' : 'La mappa di arrivo non è più disponibile. Aggiorna il collegamento nell’editor.'}</p>;
  const arrivo = arrivoSpillo(s);
  if (!arrivo) return null;
  const bloccato = partitaId !== null && s.disponibilita !== undefined && s.disponibilita.stato !== 'disponibile';
  const mappa = nomeMappa ?? (s.dettaglio?.tipo === 'mappa' && s.dettaglio.mappa?.chiave === arrivo.mappa ? s.dettaglio.mappa.nome : arrivo.mappa);
  return <PulsanteVisivo tono="primario" compatto icona={<IconaSpillo tipo={s.tipo} dimensione={20} />}
    titolo={`Vai: ${mappa}`}
    dettaglio={bloccato ? 'Non disponibile nella partita corrente' : arrivo.spillo ? (nomeSpillo ? `allo spillo «${nomeSpillo}»` : 'allo spillo indicato') : undefined} disabled={bloccato}
    onClick={() => { if (bloccato) return; onNaviga(arrivo.mappa, arrivo.spillo ? { spillo: arrivo.spillo } : undefined); }} />;
}
