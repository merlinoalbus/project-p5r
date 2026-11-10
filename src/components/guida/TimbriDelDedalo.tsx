// ============================================================
// TimbriDelDedalo — i timbri di un dedalo dei Memento: un tocco per timbro (2026-10-12; per dedalo dal L10-02)
// ============================================================
//
// Scelte dell'utente: «i timbri dovrebbero far parte della percentuale di completamento del dedalo»; «I timbri come le Persona devono
// essere banalmente un click per segnare i timbri ottenuti». Progetto approvato: una fila di timbri, uno per timbro; toccando il terzo
// risultano presi tre, toccando l'ultimo preso si torna indietro di uno. Immagini di Codex `ui/timbro-ottenuto` e `ui/timbro-vuoto`,
// con una riserva disegnata qui.
// L10-02 (Q8 A, migrazione 377): la guida dà i timbri per dedalo, non per area. La fila sta nella scheda del dedalo (prima era in ogni
// area); il totale si imposta in «Modifica la guida»; la riga piccola sotto dice da quale pagina e riga della guida viene. Un dedalo per
// cui la guida non dà un numero lo dice, e i suoi timbri non si contano: il numero non si inventa (DECISIONI:34).
// ============================================================

import { useState } from 'react';
import { aggiornaArea, impostaTimbri } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { AssetImg } from '../shared/AssetImg';
import { PulsanteVisivo, FrecciaApertura } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { timbriDopoIlTocco } from '../../utils/dedali';
import type { DedaloDto } from '../../types';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** Quanti timbri stanno sempre in vista: due righe da 44 px nella scheda del dedalo al telefono (7 per riga a 375 px). */
const MASSIMO_SEMPRE_APERTI = 14;

interface Props {
  /** Il dedalo: chiave, nome, i suoi timbri e la fonte del totale. */
  dedalo: { chiave: string; nome: string; timbri: DedaloDto['timbri']; timbriFonte: DedaloDto['timbriFonte'] };
  partitaId: number | null;
  /** «Modifica la guida» acceso: qui si imposta il totale. */
  modifica: boolean;
  /** I timbri raccolti nel dedalo sono cambiati (dalla risposta del server). */
  onTimbri: (dedalo: string, raccolti: number) => void;
  /** Rilegge la scheda dopo un totale cambiato: i timbri presi nelle partite non si toccano, la lettura li conta entro il nuovo totale. */
  onRicarica: () => Promise<void>;
}

/** Il totale scritto nel campo: vuoto = la guida non dà un numero (niente da contare); altrimenti un intero fra 0 e il tetto. */
function totaleDalTesto(testo: string): number | null {
  const t = testo.trim();
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isInteger(n) || n < 0 || n > LIMITI_GUIDA.dedalo.timbri) throw new Error(`Il totale dei timbri è un numero intero da 0 a ${LIMITI_GUIDA.dedalo.timbri} (vuoto = la guida non dà un numero).`);
  return n;
}

/** Un timbro: l'immagine presa o vuota, con la riserva disegnata (un tondo pieno o tratteggiato). */
function Timbro({ preso }: { preso: boolean }) {
  const riserva = <span aria-hidden className={`block size-[34px] rounded-full ${preso ? 'border-2 border-primary bg-primary/70' : 'border-2 border-dashed border-text-muted/70'}`} />;
  return <AssetImg nome={preso ? 'ui/timbro-ottenuto' : 'ui/timbro-vuoto'} alt="" decorativa className="size-[34px] object-contain" fallback={riserva} />;
}

/** I timbri del dedalo: titolo col conto, la fila da toccare (con una partita), la fonte del totale e, in «Modifica la guida», il totale. */
export function TimbriDelDedalo({ dedalo, partitaId, modifica: modificaRichiesta, onTimbri, onRicarica }: Props) {
  // L12 (passo 8): nel rilascio (sola lettura) il totale dei timbri non si imposta; i timbri si toccano (partita) come sempre
  const modifica = !IN_RILASCIO && modificaRichiesta;
  const [occupato, setOccupato] = useState(false);
  const [totale, setTotale] = useState<string | null>(null);
  /** La fila raccolta aperta con un tocco (vedi `raccoglibile`). */
  const [aperta, setAperta] = useState(false);
  const t = dedalo.timbri;
  // Oltre due righe di timbri da 44 px (14 al telefono) la fila spinge le schede delle aree fuori dalla prima schermata: misurato col
  // Dedalo di Da'at (40 timbri), al telefono la scheda del dedalo arrivava a 886 px su 812, a 1024×690 riempiva la colonna (457 px su
  // 462) e a 1366×657 tagliava le schede delle aree sul fondo della colonna. Lì la fila si raccoglie dietro il conto «N/totale» e si apre
  // con un tocco; sul tablet (768–1023 px), dove c'è posto, resta aperta.
  const raccoglibile = !!t && t.totale > MASSIMO_SEMPRE_APERTI;
  const raccolti = Math.min(t?.raccolti ?? 0, t?.totale ?? 0);
  /** Porta i timbri presi a `valore` (dal server la risposta). */
  const segna = async (valore: number) => {
    if (!partitaId || !t || occupato) return;
    setOccupato(true);
    try { onTimbri(dedalo.chiave, (await impostaTimbri(partitaId, dedalo.chiave, valore)).raccolti); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Timbri non aggiornati.'); }
    finally { setOccupato(false); }
  };
  /** Salva il totale scritto (vuoto = la guida non dà un numero); poi rilegge la scheda. I due passi hanno esiti separati: un totale
   *  salvato non si dice «non salvato» se fallisce solo la rilettura. */
  const salvaTotale = async () => {
    if (totale === null) return;
    let n: number | null;
    try { n = totaleDalTesto(totale); } catch (err) { notifica('error', (err as Error).message); return; }
    setOccupato(true);
    try {
      try { await aggiornaArea(dedalo.chiave, { timbriTotale: n }); }
      catch (err) { notifica('error', err instanceof Error ? err.message : 'Totale non salvato.'); return; }
      setTotale(null);
      notifica('success', n === null ? `«${dedalo.nome}»: i timbri non si contano più.` : `«${dedalo.nome}»: ${n} timbri.`);
      try { await onRicarica(); }
      catch (err) { notifica('error', `Totale salvato, ma la scheda non è stata riletta: ${err instanceof Error ? err.message : 'riprova ad aprirla.'}`); }
    } finally { setOccupato(false); }
  };
  const conto = !t ? null : partitaId ? `${raccolti}/${t.totale}` : String(t.totale);
  // la nota accanto al titolo solo dove informa: senza partita lo dice già la scheda del dedalo («Attiva una partita per segnare…»)
  const nota = !t ? null : t.totale === 0 ? 'nessun timbro' : partitaId ? 'un tocco per timbro' : null;
  return (
    <div className="flex min-w-0 flex-col gap-1.5 border-t border-border-light pt-2" role="group" aria-labelledby={`timbri-${dedalo.chiave}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <AssetImg nome="ui/sezione-timbri" alt="" decorativa className="size-[22px] shrink-0 object-contain"
          fallback={<span aria-hidden className="inline-flex size-[22px] items-center justify-center rounded-full border border-primary/60 testo-12 font-bold uppercase text-primary-testo">t</span>} />
        {/* il separatore fuori dallo span del conto: dentro, il nome accessibile perdeva lo spazio («Timbri· 3/8») */}
        <h3 id={`timbri-${dedalo.chiave}`} className="m-0 testo-14 font-semibold leading-tight">Timbri{conto ? <>{' · '}<span className="tabular-nums text-text-secondary">{conto}</span></> : null}</h3>
        {/* la nota parla della fila: dove la fila è raccolta non si mostra (e la riga del conto resta una) */}
        {nota && <span className={`testo-12 text-text-muted ${raccoglibile && !aperta ? 'hidden md:inline lg:hidden' : ''}`}>{nota}</span>}
        {/* L10-02 (rilievo dei revisori): una fila lunga si raccoglie dove spingerebbe le aree fuori dalla prima schermata */}
        {raccoglibile && (
          <span className={`ml-auto ${aperta ? '' : 'md:hidden lg:inline-flex'}`}>
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="dettagli" dimensione={20} />} titolo={<>{aperta ? 'Nascondi' : 'Mostra'}<FrecciaApertura aperto={aperta} /></>}
              aria-expanded={aperta} aria-controls={`fila-timbri-${dedalo.chiave}`} aria-label={`${aperta ? 'Nascondi' : 'Mostra'} i timbri di ${dedalo.nome}`} onClick={() => setAperta((x) => !x)} />
          </span>
        )}
        {modifica && totale === null && (
          <PulsanteVisivo tono="fantasma" compatto className="ml-auto" icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo={t ? 'Cambia il totale' : 'Imposta il totale'}
            aria-label={`${t ? 'Cambia' : 'Imposta'} il totale dei timbri di ${dedalo.nome}`} onClick={() => setTotale(t ? String(t.totale) : '')} />
        )}
      </div>
      {t && t.totale > 0 && (
        <ol id={`fila-timbri-${dedalo.chiave}`} className={`m-0 list-none flex-wrap gap-0.5 p-0 ${!raccoglibile || aperta ? 'flex' : 'hidden md:flex lg:hidden'}`} aria-label={`Timbri di ${dedalo.nome}`}>
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
      {/* il motivo, senza invitare a scrivere un numero: la guida non lo dà, e un numero inventato conterebbe come vero */}
      {!t && <p className="m-0 testo-12 text-text-muted">La guida non dice quanti timbri ha questo dedalo: qui non si contano.</p>}
      {t && dedalo.timbriFonte && <p className="m-0 testo-12 text-text-muted">Fonte: {dedalo.timbriFonte}</p>}
      {modifica && totale !== null && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); void salvaTotale(); }}>
          <label className="flex flex-col gap-1 testo-12">
            Timbri del dedalo (vuoto = la guida non dà un numero)
            {/* eslint-disable-next-line jsx-a11y/no-autofocus -- il campo compare al tocco di «Imposta il totale» o «Cambia il totale» per scriverlo subito */}
            <input className="form-input w-28" inputMode="numeric" maxLength={3} value={totale} autoFocus onChange={(e) => setTotale(e.target.value)} />
          </label>
          <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva" disabled={occupato} />
          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" disabled={occupato} onClick={() => setTotale(null)} />
        </form>
      )}
    </div>
  );
}
