// ============================================================
// TimbriDellArea — i timbri di un'area di un dedalo dei Memento: un tocco per timbro (2026-10-12)
// ============================================================
//
// Scelte dell'utente: «i timbri dovrebbero far parte della percentuale di completamento del dedalo»; il totale di ogni area «li
// conterò io man mano e li setterò»; «I timbri come le Persona devono essere banalmente un click per segnare i timbri ottenuti».
// Progetto approvato: una fila di timbri, uno per ogni timbro dell'area; toccando il terzo risultano presi tre, toccando l'ultimo
// preso si torna indietro di uno. Un'area senza totale non conta i timbri e in «Gioca» dice «totale da impostare»; il totale si
// imposta in «Modifica la guida». Immagini di Codex `ui/timbro-ottenuto` e `ui/timbro-vuoto`, con una riserva disegnata qui.
// ============================================================

import { useState } from 'react';
import { aggiornaAreaDedalo, impostaTimbri } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { AssetImg } from '../shared/AssetImg';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { SezioneDellArea } from './SezioneDellArea';
import { timbriDopoIlTocco } from '../../utils/dedali';
import type { AreaDedaloDto } from '../../types';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

interface Props {
  area: AreaDedaloDto;
  partitaId: number | null;
  /** «Modifica la guida» acceso: qui si imposta il totale. */
  modifica: boolean;
  /** I timbri raccolti nell'area sono cambiati (dalla risposta del server). */
  onTimbri: (areaDedalo: string, raccolti: number) => void;
  /** Rilegge la scheda (totale cambiato: le partite si allineano). */
  onRicarica: () => Promise<void>;
}

/** Il totale scritto nel campo: vuoto = l'area non ha timbri; altrimenti un intero fra 0 e il tetto (un errore lo dice). */
function totaleDalTesto(testo: string): number | null {
  const t = testo.trim();
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isInteger(n) || n < 0 || n > LIMITI_GUIDA.areaDedalo.timbri) throw new Error(`Il totale dei timbri è un numero intero da 0 a ${LIMITI_GUIDA.areaDedalo.timbri} (vuoto = l’area non ha timbri).`);
  return n;
}

/** Un timbro: l'immagine presa o vuota, con la riserva disegnata (un tondo pieno o tratteggiato). */
function Timbro({ preso }: { preso: boolean }) {
  const riserva = <span aria-hidden className={`block size-[34px] rounded-full ${preso ? 'border-2 border-primary bg-primary/70' : 'border-2 border-dashed border-text-muted/70'}`} />;
  return <AssetImg nome={preso ? 'ui/timbro-ottenuto' : 'ui/timbro-vuoto'} alt="" decorativa className="size-[34px] object-contain" fallback={riserva} />;
}

/** La sezione dei timbri: la fila da toccare (con una partita), il conto, e in «Modifica la guida» il totale dell'area. */
export function TimbriDellArea({ area, partitaId, modifica: modificaRichiesta, onTimbri, onRicarica }: Props) {
  // L12 (passo 8): nel rilascio (sola lettura) il totale dei timbri non si imposta; i timbri si toccano (partita) come sempre
  const modifica = !IN_RILASCIO && modificaRichiesta;
  const [occupato, setOccupato] = useState(false);
  const [totale, setTotale] = useState<string | null>(null);
  const t = area.timbri;
  const raccolti = t?.raccolti ?? 0;
  /** Porta i timbri presi a `valore` (dal server la risposta). */
  const segna = async (valore: number) => {
    if (!partitaId || !t || occupato) return;
    setOccupato(true);
    try { onTimbri(area.chiave, (await impostaTimbri(partitaId, area.chiave, valore)).raccolti); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Timbri non aggiornati.'); }
    finally { setOccupato(false); }
  };
  /** Salva il totale scritto; vuoto toglie i timbri all'area (e i raccolti delle partite, come dice l'avviso). */
  const salvaTotale = async () => {
    if (totale === null) return;
    let n: number | null;
    try { n = totaleDalTesto(totale); } catch (err) { notifica('error', (err as Error).message); return; }
    setOccupato(true);
    try {
      await aggiornaAreaDedalo(area.chiave, { timbriTotale: n });
      setTotale(null);
      await onRicarica();
      notifica('success', n === null ? `«${area.nome}» non ha più timbri.` : `«${area.nome}»: ${n} timbri.`);
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Totale non salvato.'); }
    finally { setOccupato(false); }
  };
  const conto = !t ? undefined : partitaId ? `${raccolti}/${t.totale}` : `${t.totale}`;
  const nota = !t ? 'totale da impostare' : t.totale === 0 ? 'nessun timbro' : partitaId ? 'un tocco per timbro' : 'attiva una partita per segnarli';
  return (
    <SezioneDellArea chiave="timbri" titolo="Timbri" conto={conto} nota={nota}>
      {t && t.totale > 0 && (
        <ol className="m-0 flex list-none flex-wrap gap-0.5 p-0" aria-label={`Timbri di ${area.nome}`}>
          {Array.from({ length: t.totale }, (_, i) => {
            const k = i + 1;
            const preso = k <= raccolti;
            return (
              <li key={k}>
                <button type="button" className="touch inline-flex size-11 items-center justify-center rounded-full transition-transform active:scale-90 disabled:cursor-default"
                  aria-pressed={preso} disabled={!partitaId || occupato} onClick={() => void segna(timbriDopoIlTocco(k, raccolti))}
                  aria-label={`Timbro ${k} di ${t.totale}: ${preso ? 'preso' : 'da prendere'}`}
                  title={!partitaId ? 'Attiva una partita per segnare i timbri' : k === raccolti ? 'Tocca per togliere quest’ultimo timbro' : `Tocca: ${k} ${k === 1 ? 'timbro preso' : 'timbri presi'}`}>
                  <Timbro preso={preso} />
                </button>
              </li>
            );
          })}
        </ol>
      )}
      {!t && !modifica && <p className="m-0 testo-12 text-text-muted">Il totale dei timbri di quest’area non è ancora impostato{IN_RILASCIO ? '' : ': si imposta in «Modifica la guida»'}. Finché manca, i timbri non contano.</p>}
      {modifica && (totale === null
        ? <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo={t ? 'Cambia il totale' : 'Imposta il totale'}
            aria-label={`${t ? 'Cambia' : 'Imposta'} il totale dei timbri di ${area.nome}`} onClick={() => setTotale(t ? String(t.totale) : '')} />
        : (
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); void salvaTotale(); }}>
            <label className="flex flex-col gap-1 testo-12">
              Timbri dell’area (vuoto = nessuno)
              <input className="form-input w-28" inputMode="numeric" maxLength={3} value={totale} autoFocus onChange={(e) => setTotale(e.target.value)} />
            </label>
            <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva" disabled={occupato} />
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={() => setTotale(null)} />
            {t && <span className="basis-full testo-12 text-text-muted">Un totale più basso dei timbri già presi li riduce in ogni partita; vuoto li toglie.</span>}
          </form>
        ))}
    </SezioneDellArea>
  );
}
