// ============================================================
// PlanimetriePalazzo — l'elenco ordinabile delle planimetrie di un Palazzo
// ============================================================
//
// **Un Palazzo ha un ordine logico**, che è quello in cui lo si percorre, e non coincide con
// l'ordine in cui l'estrazione ha trovato le immagini: qui si cambia trascinando (o con i tasti
// «Su»/«Giù», che sul tablet sono più precisi del trascinamento e funzionano anche da tastiera).
//
// Ogni riga dice **quanto resta da raccogliere su quella planimetria** e **a quale area della
// guida è legata**. Il legame è uno solo per area (decisione dell'utente, 2026-09-18): scegliere
// un'area che ne ha già un'altra stacca la precedente — è il server a farlo, qui si ricarica.
//
// Da qui si aggiunge una planimetria al Palazzo e si cancella quella che non serve (le varianti
// della stessa stanza, i ritagli che nessun campo usa): la cancellazione dice prima che cosa si
// porta via, perché gli spilli della mappa se ne vanno con lei.
// ============================================================

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { aggiornaMappa, creaMappa, eliminaMappa, riordinaMappe } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import type { DungeonDettaglioDto } from '../../types';

export type Planimetria = DungeonDettaglioDto['planimetrie'][number];

interface Props {
  /** Chiave del dungeon: la radice dell'albero è `dungeon-<chiave>`. */
  dungeonChiave: string;
  planimetrie: Planimetria[];
  aree: Array<{ chiave: string; nome: string; ordine: number }>;
  /** La planimetria che si sta guardando nel visore, evidenziata nell'elenco. */
  sceltaChiave: string | null;
  onScegli: (chiave: string) => void;
  /** Dopo ogni modifica strutturale: la scheda rilegge il Palazzo. */
  onCambiato: () => Promise<void> | void;
}

/** Il nome della planimetria senza il prefisso del Palazzo («Palazzo di Kamoshida › Torre» → «Torre»). */
const nomeBreve = (nome: string) => nome.split(' › ').slice(1).join(' › ') || nome;

export function PlanimetriePalazzo({ dungeonChiave, planimetrie, aree, sceltaChiave, onScegli, onCambiato }: Props) {
  // L'ordine mostrato è locale finché il server non risponde: il trascinamento deve vedersi subito.
  const [ordine, setOrdine] = useState<string[] | null>(null);
  const [occupato, setOccupato] = useState(false);
  const [trascinata, setTrascinata] = useState<string | null>(null);
  const elenco = ordine
    ? ordine.map((k) => planimetrie.find((p) => p.chiave === k)).filter((p): p is Planimetria => !!p)
    : planimetrie;

  // Il trascinamento è a puntatore e non `draggable`: l'HTML5 drag-and-drop col dito non parte,
  // e questa scheda si usa sul tablet mentre si gioca. I tasti Su/Giù restano per la precisione.
  const righe = useRef(new Map<string, HTMLLIElement>());
  const [sopra, setSopra] = useState<number | null>(null);
  /** L'indice della riga sotto il puntatore: l'ultima riga il cui bordo alto è già stato superato dal dito. */
  const indiceSotto = (y: number): number | null => {
    let trovato: number | null = null;
    elenco.forEach((p, i) => { const el = righe.current.get(p.chiave); if (el && y >= el.getBoundingClientRect().top) trovato = i; });
    return trovato;
  };
  const [daEliminare, setDaEliminare] = useState<Planimetria | null>(null);
  const [nuovaAperta, setNuovaAperta] = useState(false);
  const [nomeNuova, setNomeNuova] = useState('');

  const esegui = async (azione: () => Promise<unknown>, messaggio: string) => {
    setOccupato(true);
    try { await azione(); await onCambiato(); notifica('success', messaggio); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Operazione non riuscita.'); setOrdine(null); }
    finally { setOccupato(false); }
  };

  /** Sposta `chiave` alla posizione `a` e salva il nuovo ordine. */
  const spostaA = (chiave: string, a: number) => {
    const attuale = elenco.map((p) => p.chiave);
    const da = attuale.indexOf(chiave);
    if (da < 0 || a < 0 || a >= attuale.length || a === da) return;
    const nuovo = [...attuale];
    nuovo.splice(a, 0, ...nuovo.splice(da, 1));
    setOrdine(nuovo);
    void esegui(() => riordinaMappe(`dungeon-${dungeonChiave}`, nuovo), 'Ordine delle planimetrie salvato.');
  };

  const legaArea = (p: Planimetria, area: string) =>
    esegui(() => aggiornaMappa(p.chiave, { entita: area ? { tipo: 'area', chiave: area } : null }),
      area ? `«${nomeBreve(p.nome)}» legata all’area scelta.` : `«${nomeBreve(p.nome)}» non è più legata a un’area.`);

  const totale = planimetrie.reduce((s, p) => s + p.n, 0);
  const presi = planimetrie.reduce((s, p) => s + (p.presi ?? 0), 0);
  const senzaArea = planimetrie.filter((p) => !p.area).length;

  return (
    <div className="flex flex-col gap-2.5" aria-label="Planimetrie del Palazzo">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 font-display text-[15px] uppercase leading-none">Planimetrie · {planimetrie.length}</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          {senzaArea > 0 && <span className="chip text-[11px]" title="Le planimetrie senza area non compaiono nell’elenco delle aree: legale, oppure cancellale.">{senzaArea} senza area</span>}
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi" disabled={occupato} onClick={() => { setNomeNuova(''); setNuovaAperta(true); }} />
        </div>
      </div>
      <p className="m-0 text-[11px] text-text-muted">
        Trascina la maniglia (o usa Su/Giù) per l’ordine in cui percorri il Palazzo. {totale > 0 ? `${presi}/${totale} raccolti in tutto.` : 'Nessun collezionabile su queste planimetrie.'}
      </p>

      {nuovaAperta && (
        <form className="flex flex-wrap items-end gap-2 rounded-md bg-white/[0.04] px-2 py-2"
          onSubmit={(e) => { e.preventDefault(); const nome = nomeNuova.trim(); if (!nome) return; void esegui(async () => { await creaMappa({ nome, tipo: 'area', genitore: `dungeon-${dungeonChiave}`, ordine: planimetrie.length }); setNuovaAperta(false); }, `Planimetria «${nome}» aggiunta in fondo: caricane l’immagine dall’editor.`); }}>
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-[12px]">Nome della planimetria
            <input className="form-input" value={nomeNuova} onChange={(e) => setNomeNuova(e.target.value)} maxLength={120} autoFocus placeholder="Es. Torre: Livello superiore" />
          </label>
          <div className="flex gap-1.5">
            <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Crea" disabled={occupato || !nomeNuova.trim()} />
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Annulla" onClick={() => setNuovaAperta(false)} />
          </div>
        </form>
      )}

      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {elenco.map((p, i) => {
          const scelta = p.chiave === sceltaChiave;
          const restano = p.presi === null ? p.n : p.n - p.presi;
          return (
            <li key={p.chiave} ref={(el) => { if (el) righe.current.set(p.chiave, el); else righe.current.delete(p.chiave); }}
              className={`flex flex-col gap-1 rounded-md border px-2 py-1.5 transition-colors ${scelta ? 'border-primary bg-primary-bg' : 'border-border-light bg-white/[0.02]'} ${trascinata === p.chiave ? 'opacity-50' : ''} ${sopra === i && trascinata && trascinata !== p.chiave ? 'border-primary' : ''}`}>
              <div className="flex items-center gap-1.5">
                <span role="button" tabIndex={-1} aria-label={`Trascina «${nomeBreve(p.nome)}» per riordinare`} title="Trascina per riordinare"
                  className="touch shrink-0 cursor-grab select-none px-1 text-text-muted touch-none"
                  onPointerDown={(e) => { if (occupato) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setTrascinata(p.chiave); setSopra(i); }}
                  onPointerMove={(e) => { if (trascinata !== p.chiave) return; setSopra(indiceSotto(e.clientY)); }}
                  onPointerUp={() => { if (trascinata === p.chiave && sopra !== null) spostaA(p.chiave, sopra); setTrascinata(null); setSopra(null); }}
                  onPointerCancel={() => { setTrascinata(null); setSopra(null); }}>⠿</span>
                <button type="button" className="touch min-w-0 flex-1 text-left" onClick={() => onScegli(p.chiave)} aria-pressed={scelta}>
                  <span className="block truncate text-[13px] font-semibold">{i + 1}. {nomeBreve(p.nome)}</span>
                  <span className="block text-[11px] text-text-muted">
                    {p.n === 0 ? 'niente da raccogliere' : p.presi === null ? `${p.n} da raccogliere` : restano > 0 ? `${restano} da prendere su ${p.n}` : `${p.n} raccolti · completa`}
                    {p.area ? ` · ${p.area.nome}` : ' · nessuna area'}
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button type="button" className="touch px-1 text-text-muted disabled:opacity-30" disabled={occupato || i === 0} onClick={() => spostaA(p.chiave, i - 1)} aria-label={`Sposta «${nomeBreve(p.nome)}» su`}>▲</button>
                  <button type="button" className="touch px-1 text-text-muted disabled:opacity-30" disabled={occupato || i === elenco.length - 1} onClick={() => spostaA(p.chiave, i + 1)} aria-label={`Sposta «${nomeBreve(p.nome)}» giù`}>▼</button>
                  <Link to={`/guida/mappe/${encodeURIComponent(p.chiave)}/modifica`} className="touch px-1 text-[11px]" title="Modifica nella pagina mappe">Editor</Link>
                  <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={18} />} titolo="" dettaglio={undefined} aria-label={`Elimina «${nomeBreve(p.nome)}»`} disabled={occupato} onClick={() => setDaEliminare(p)} />
                </div>
              </div>
              {p.n > 0 && p.presi !== null && (
                <span className="visore-mappa__progresso h-1.5" role="progressbar" aria-label={`${nomeBreve(p.nome)}: raccolti`} aria-valuemin={0} aria-valuemax={p.n} aria-valuenow={p.presi}>
                  <span className="visore-mappa__progresso-barra" style={{ width: `${Math.round((p.presi / p.n) * 100)}%` }} />
                </span>
              )}
              <Selettore etichetta="Area della guida" valore={p.area?.chiave ?? ''} vuoto="— nessuna —"
                opzioni={aree.map((a) => ({ chiave: a.chiave, nome: `${a.ordine + 1}. ${a.nome}` }))}
                onCambia={(k) => void legaArea(p, k)} />
            </li>
          );
        })}
        {elenco.length === 0 && <li className="text-[12px] text-text-muted" role="status">Questo Palazzo non ha ancora planimetrie: aggiungine una.</li>}
      </ul>

      {daEliminare && (
        <div className="flex flex-col gap-2 rounded-md border border-primary bg-primary-bg px-2 py-2 text-[12px]" role="alertdialog" aria-label="Conferma eliminazione">
          <p className="m-0">Elimino «{nomeBreve(daEliminare.nome)}»? Se ne vanno anche i suoi spilli{daEliminare.n > 0 ? `, compresi ${daEliminare.n} collezionabili` : ''}. L’immagine di base resta fra le immagini caricate.</p>
          <div className="flex flex-wrap gap-1.5">
            <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" disabled={occupato}
              onClick={() => { const p = daEliminare; setDaEliminare(null); setOrdine(null); void esegui(() => eliminaMappa(p.chiave), `«${nomeBreve(p.nome)}» eliminata.`); }} />
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={() => setDaEliminare(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
