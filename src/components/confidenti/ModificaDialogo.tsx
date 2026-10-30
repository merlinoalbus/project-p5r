// ============================================================
// ModificaDialogo — le note e le scelte di un dialogo di rango, con i punti: «Modifica» e «Ripristina» (R9-07/4, R11-15/2, L13 O6-4)
// ============================================================
//
// La matita sta accanto al dialogo (Risposte migliori per rango). È la `FinestraModifica` comune: corpo che scorre, piè fisso con
// «Ripristina», «Annulla» e «Salva», conferma prima di chiudere con modifiche non salvate. Per ogni scelta: testo, punti come scelta a
// pulsanti (Nessun punto · ♪ · ♪♪ · ♪♪♪, i soli valori della guida), l'interruttore «Punti diversi nel ramo amore» che mostra la stessa
// scelta per il ramo amore, «romantica» e avviso; le scelte si aggiungono, si tolgono e si spostano (il server le rinumera da 1).
// L13 (ondata 6, lotto O6-4, migrazione 309): prima c'erano un numero da 0 a 100 e il testo libero «Punti come li scrive la guida»; i punti
// ora sono solo numerici e la resa è unica (`resaPuntiScelta`). «Nessun punto» vale anche per la scelta di cui la guida non dà punti: la si
// lascia com'è finché non si sceglie un'altra nota; scelto dopo una nota, lo scrive come zero.
// Si inviano solo i campi cambiati: un dialogo non toccato non perde la sua fotografia. «Ripristina» rimette note e scelte della guida; la
// scheda non dice se il dialogo è già stato cambiato, quindi un dialogo mai modificato risponde 409 e lo si dice con parole.
// Rotte: PUT `/api/compendio/confidenti/:chiave/dialoghi/:id`, POST `…/dialoghi/:id/ripristina`.
// ============================================================

import { useState } from 'react';
import { isApiError, ripristinaDialogoConfidente, salvaDialogoConfidente } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import type { DialogoConfidenteDto } from '../../types';
import { FinestraModifica } from '../shared/FinestraModifica';
import { Campo, CampoTesto, SezioneCampi } from '../shared/Campo';
import { FilaScelta } from '../guida/FilaScelta';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { conferma, RIPRISTINA_CON_MODIFICHE } from '../../stores/confermaStore';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';
import { SCELTE_NOTE } from '../../../shared/note';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** Una scelta in modifica: i punti come numeri (null = la guida non ne dà), il ramo amore acceso solo se la guida dà un valore diverso. */
interface SceltaBozza { testo: string; punti: number | null; amore: boolean; puntiAmore: number | null; romantica: boolean; avviso: string }

/** Le voci della scelta dei punti: nessuno e da una a tre note (i soli valori della guida). */
const NESSUNO = 'nessuno';
const OPZIONI_PUNTI = [{ chiave: NESSUNO, nome: 'Nessun punto' }, ...SCELTE_NOTE.map((s) => ({ chiave: s.chiave, nome: s.simboli }))];
/** La voce accesa per un valore: «Nessun punto» per zero e per nessun punto dato; '' (nessuna accesa) per un valore ancora da scegliere. */
const voceDi = (p: number | null, vuotoENessuno: boolean): string => (p === null ? (vuotoENessuno ? NESSUNO : '') : p === 0 ? NESSUNO : String(p));

const daDto = (s: DialogoConfidenteDto['scelte'][number]): SceltaBozza => {
  const amore = s.puntiAmore !== null && s.puntiAmore !== (s.punti ?? 0);
  return { testo: s.testo, punti: s.punti, amore, puntiAmore: amore ? s.puntiAmore : null, romantica: s.romantica, avviso: s.avviso ?? '' };
};
const perServer = (s: SceltaBozza) => ({ testo: s.testo.trim(), punti: s.punti, puntiAmore: s.amore ? s.puntiAmore : null, romantica: s.romantica, avviso: s.avviso.trim() === '' ? null : s.avviso });
/** Il problema del ramo amore della scelta, o null: acceso, va scelto e deve dire altro dal ramo amicizia. */
const erroreAmore = (s: SceltaBozza): string | null => !s.amore ? null
  : s.puntiAmore === null ? 'Scegli i punti del ramo amore.'
  : s.puntiAmore === (s.punti ?? 0) ? 'Sono gli stessi del ramo amicizia: spegni l’interruttore.' : null;

/** La matita del dialogo e, dopo una modifica fatta da qui, il chip «Modificato». */
// L12 (passo 8): nel rilascio (sola lettura) la modifica non esiste; la condizione è costante di build, `ModificaDialogoReale` esce dal bundle
export const ModificaDialogo: StrumentoDiModifica<typeof ModificaDialogoReale> = IN_RILASCIO ? NienteInRilascio : ModificaDialogoReale;
function ModificaDialogoReale({ chiave, nome, dialogo, onSalvato }: { chiave: string; nome: string; dialogo: DialogoConfidenteDto; onSalvato: () => void | Promise<void> }) {
  const [aperta, setAperta] = useState(false);
  /** Vero dopo una modifica salvata da qui (il server lo dice nella risposta); falso = non lo so, non «non modificato». */
  const [modificato, setModificato] = useState(false);
  return <>
    {modificato && <span className="chip" title="Cambiato rispetto alla guida">Modificato</span>}
    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" aria-label={`Modifica il dialogo del rango ${dialogo.etichetta} di ${nome}`} onClick={() => setAperta(true)} />
    {aperta && <EditorDialogo key={dialogo.id} chiave={chiave} nome={nome} dialogo={dialogo} onChiudi={() => setAperta(false)} onSalvato={onSalvato} onModificato={setModificato} />}
  </>;
}

function EditorDialogo({ chiave, nome, dialogo, onChiudi, onSalvato, onModificato }: {
  chiave: string; nome: string; dialogo: DialogoConfidenteDto; onChiudi: () => void; onSalvato: () => void | Promise<void>; onModificato: (m: boolean) => void;
}) {
  const [partenzaNote] = useState(dialogo.note);
  const [partenzaScelte] = useState<SceltaBozza[]>(() => dialogo.scelte.map(daDto));
  const [note, setNote] = useState(dialogo.note);
  const [scelte, setScelte] = useState<SceltaBozza[]>(partenzaScelte);
  const [occupato, setOccupato] = useState(false);
  const noteCambiate = note !== partenzaNote;
  const scelteCambiate = JSON.stringify(scelte) !== JSON.stringify(partenzaScelte);
  const sporca = noteCambiate || scelteCambiate;
  const valida = scelte.length <= 40 && scelte.every((s) => s.testo.trim() !== '' && erroreAmore(s) === null);
  useBozzaSporca(`dialogo:${dialogo.id}`, `il dialogo di ${nome}`, sporca);

  const cambiaScelta = (i: number, parte: Partial<SceltaBozza>) => setScelte((l) => l.map((x, j) => (j === i ? { ...x, ...parte } : x)));
  const sposta = (i: number, verso: -1 | 1) => setScelte((l) => { const n = [...l]; const j = i + verso; if (j < 0 || j >= n.length) return n; [n[i], n[j]] = [n[j]!, n[i]!]; return n; });
  /** «Nessun punto» lascia com'è la scelta senza punti nella guida (o già a zero); dopo una nota scrive zero. */
  const puntiDa = (voce: string, attuale: number | null): number | null => (voce === NESSUNO ? (attuale === null ? null : 0) : Number(voce));

  const salva = async () => {
    if (!sporca || !valida) return;
    setOccupato(true);
    try {
      const esito = await salvaDialogoConfidente(chiave, dialogo.id, { ...(noteCambiate ? { note } : {}), ...(scelteCambiate ? { scelte: scelte.map(perServer) } : {}) });
      onModificato(esito.modificato);
      notifica('success', 'Dialogo salvato: vale per tutte le partite.');
      await onSalvato(); onChiudi();
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.'); }
    finally { setOccupato(false); }
  };
  const ripristina = async () => {
    if (sporca && !(await conferma(RIPRISTINA_CON_MODIFICHE))) return;
    setOccupato(true);
    try {
      await ripristinaDialogoConfidente(chiave, dialogo.id);
      onModificato(false);
      notifica('success', 'Dialogo ripristinato come nella guida.');
      await onSalvato(); onChiudi();
    } catch (err) {
      if (isApiError(err, 'dialogo-della-guida')) notifica('info', 'Questo dialogo non è stato modificato: è già come nella guida.');
      else notifica('error', err instanceof Error ? err.message : 'Ripristino non riuscito.');
    } finally { setOccupato(false); }
  };

  return (
    <FinestraModifica titolo={`Dialogo del rango ${dialogo.etichetta}: ${nome}`} onChiudi={onChiudi} onSalva={salva} salvabile={sporca && valida} occupato={occupato} sporca={sporca}
      azioniExtra={<PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Ripristina" disabled={occupato} onClick={() => void ripristina()} />}>
      <p className="m-0 testo-13 text-text-muted">Le modifiche valgono per tutte le partite. «Ripristina» rimette note e scelte come nella guida.</p>
      <SezioneCampi titolo="Note del dialogo">
        <CampoTesto etichetta="Note" tipo="lungo" valore={note} onCambia={setNote} massimo={4000} disabilitato={occupato} />
      </SezioneCampi>
      {scelte.length === 0 && <p className="m-0 testo-13 text-text-muted">Nessuna scelta.</p>}
      {scelte.map((s, i) => (
        <SezioneCampi key={i} titolo={`Scelta ${i + 1}`}>
          <CampoTesto etichetta="Testo" valore={s.testo} onCambia={(v) => cambiaScelta(i, { testo: v })} massimo={500} obbligatorio largo disabilitato={occupato}
            errore={s.testo.trim() === '' ? 'Scrivi il testo della scelta.' : undefined} />
          <Campo etichetta="Punti" senzaGruppo>
            <FilaScelta etichetta={`Punti della scelta ${i + 1}`} valore={voceDi(s.punti, true)} opzioni={OPZIONI_PUNTI} disabilitato={occupato}
              onCambia={(v) => cambiaScelta(i, { punti: puntiDa(v, s.punti) })} />
          </Campo>
          <label className="touch flex items-center gap-2 testo-13"><input type="checkbox" className="h-5 w-5" checked={s.amore} disabled={occupato}
            onChange={(e) => cambiaScelta(i, { amore: e.target.checked, puntiAmore: null })} /> Punti diversi nel ramo amore</label>
          {s.amore && (
            <Campo etichetta="Punti nel ramo amore" senzaGruppo errore={erroreAmore(s) ?? undefined}>
              <FilaScelta etichetta={`Punti della scelta ${i + 1} nel ramo amore`} valore={voceDi(s.puntiAmore, false)} opzioni={OPZIONI_PUNTI} disabilitato={occupato}
                onCambia={(v) => cambiaScelta(i, { puntiAmore: v === NESSUNO ? 0 : Number(v) })} />
            </Campo>
          )}
          <CampoTesto etichetta="Avviso (facoltativo)" valore={s.avviso} onCambia={(v) => cambiaScelta(i, { avviso: v })} massimo={500} largo disabilitato={occupato} />
          <label className="touch flex items-center gap-2 testo-13"><input type="checkbox" className="h-5 w-5" checked={s.romantica} disabled={occupato} onChange={(e) => cambiaScelta(i, { romantica: e.target.checked })} /> Avvia o riguarda la relazione romantica</label>
          <div className="flex flex-wrap gap-2">
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="su" dimensione={20} />} titolo="Sposta su" disabled={occupato || i === 0} onClick={() => sposta(i, -1)} aria-label={`Sposta su la scelta ${i + 1}`} />
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="giu" dimensione={20} />} titolo="Sposta giù" disabled={occupato || i === scelte.length - 1} onClick={() => sposta(i, 1)} aria-label={`Sposta giù la scelta ${i + 1}`} />
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" disabled={occupato} onClick={() => setScelte((l) => l.filter((_, j) => j !== i))} aria-label={`Togli la scelta ${i + 1}`} />
          </div>
        </SezioneCampi>
      ))}
      <div><PulsanteVisivo compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una scelta" disabled={occupato || scelte.length >= 40}
        onClick={() => setScelte((l) => [...l, { testo: '', punti: null, amore: false, puntiAmore: null, romantica: false, avviso: '' }])} /></div>
    </FinestraModifica>
  );
}
