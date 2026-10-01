// ============================================================
// GuidaDellArea — la guida di un'area del Palazzo, modificabile e collegata ai pin (richiesta dell'utente, 2026-10-01)
// ============================================================
//
// «Mi serve la possibilità di modificare proprio la guida così da poter modificare/aggiornare, aggiungere, rimuovere le
// voci della guida o correggerli agganciandoli ad elementi della mappa.» Ogni voce si corregge (nome, tipo, esauribile,
// descrizione), si sposta su e giù, si elimina; in fondo se ne aggiunge una. E si collega ai pin delle planimetrie del
// Palazzo **scegliendoli sulla mappa, dentro la voce stessa** («deve essere contestuale al punto dove si fa questa
// associazione»): «Collega pin» apre lì sotto la planimetria in modalità scelta, un tocco collega, un altro scollega.
// Una voce collegata ha lo stato dei suoi pin (lo dice il server); i punti non vengono riconciliati in automatico:
// «lascia i punti come sono... li sistemo io via via a mano». Per questo la riga dice «da collegare» quando la voce è di
// un tipo che un pin può rappresentare e non ne ha ancora.
// ============================================================

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { collegaPinAlPunto, creaPunto, eliminaPunto, aggiornaPunto as salvaPunto, spostaPunto } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { COLORE_TIPO, NOME_TIPO } from '../../utils/dungeon';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { puntoDaCollegare, puntoDescrittivo } from '../../../shared/spilli';
import { nomeSenzaPalazzo } from '../../utils/gruppiPlanimetrie';
import type { AreaDungeonDto, DungeonDettaglioDto, PuntoInteresseDto, StatoPunto } from '../../types';
import { CampoCorrezione, CorrezioneGuida } from './CorrezioneGuida';
import { DettagliPunto } from './DettagliPunto';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { MappaIncorporata } from '../mappe/MappaIncorporata';

const TIPI = Object.keys(NOME_TIPO) as PuntoInteresseDto['tipo'][];
/** I limiti dell'altezza della mappa di scelta: 220 è il minimo del visore incorporato (`.visore-mappa--incorporato`), sopra i 460 non serve. */
const ALTEZZA_MINIMA = 220;
const ALTEZZA_MASSIMA = 460;

/** Il contenitore che scorre attorno all'elemento (la colonna della scheda, o l'area di lettura sul telefono). */
function contenitoreCheScorre(el: HTMLElement): HTMLElement | null {
  for (let e = el.parentElement; e; e = e.parentElement) {
    const oy = getComputedStyle(e).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && e.scrollHeight > e.clientHeight) return e;
  }
  return null;
}

interface Props {
  area: AreaDungeonDto;
  /** Le planimetrie del Palazzo: fra queste si sceglie quella su cui toccare i pin (prima quelle dell'area). */
  planimetrie: DungeonDettaglioDto['planimetrie'];
  memento: boolean;
  partitaId: number | null;
  /** La planimetria che la pagina sta mostrando: se è dell'area, la scelta parte da lì. */
  mappaAperta: string | null;
  cambiaStato: (p: PuntoInteresseDto, stato: StatoPunto | null) => Promise<void>;
  /** Una voce cambiata dal server (collegamento, correzione): la pagina la sostituisce senza ricaricare. */
  onPuntoAggiornato: (p: PuntoInteresseDto) => void;
  /** Rilegge la scheda del Palazzo (ordine cambiato, voce aggiunta o tolta, stati uniti da un collegamento). */
  onRicarica: () => Promise<void>;
}

export function GuidaDellArea({ area, planimetrie, memento, partitaId, mappaAperta, cambiaStato, onPuntoAggiornato, onRicarica }: Props) {
  const [filtro, setFiltro] = useState<Set<PuntoInteresseDto['tipo']>>(new Set());
  const [mostraGestiti, setMostraGestiti] = useState(false);
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [nuovoPunto, setNuovoPunto] = useState<{ nome: string; tipo: PuntoInteresseDto['tipo'] } | null>(null);
  /** La voce a cui si stanno collegando i pin, e su quale planimetria. */
  const [collegando, setCollegando] = useState<{ punto: string; mappa: string | null; ricerca: string } | null>(null);
  const [occupato, setOccupato] = useState(false);
  // La mappa di scelta si apre in fondo alla voce, spesso sotto il bordo della colonna che scorre. **Si misura** lo spazio
  // che il contenitore che scorre mostra davvero, si tolgono i comandi della scelta e lì sta la mappa, tutta; poi la si porta
  // in vista. Una formula sull'altezza della finestra non basta: a 1366×657 la colonna parte a 274 px, a 1024×690 a 305,
  // sul telefono scorre la pagina (verifica nel browser, 2026-10-01). Si rimisura quando la finestra cambia misura.
  const riquadroScelta = useRef<HTMLDivElement | null>(null);
  const puntoInScelta = collegando?.punto ?? null;
  const [altezzaScelta, setAltezzaScelta] = useState(300);
  useLayoutEffect(() => {
    if (!puntoInScelta) return;
    const misura = () => {
      const box = riquadroScelta.current;
      if (!box) return;
      const contenitore = contenitoreCheScorre(box);
      const visibile = contenitore ? contenitore.clientHeight : window.innerHeight;
      const mappa = box.querySelector<HTMLElement>('[data-mappa-scelta]');
      const comandi = box.getBoundingClientRect().height - (mappa?.getBoundingClientRect().height ?? 0);
      setAltezzaScelta(Math.max(ALTEZZA_MINIMA, Math.min(ALTEZZA_MASSIMA, Math.floor(visibile - comandi - 8))));
    };
    misura();
    window.addEventListener('resize', misura);
    return () => window.removeEventListener('resize', misura);
  }, [puntoInScelta]);
  useEffect(() => { if (puntoInScelta) riquadroScelta.current?.scrollIntoView?.({ block: 'nearest' }); }, [puntoInScelta, altezzaScelta]);

  const puntiVisibili = useMemo(() => area.punti.filter((p) => (filtro.size === 0 || filtro.has(p.tipo)) && (mostraGestiti || !p.stato || p.chiave === selezionato)), [area, filtro, mostraGestiti, selezionato]);
  const gestitiArea = area.punti.filter((p) => p.stato && !puntoDescrittivo(p.tipo)).length;
  const daCollegare = area.punti.filter((p) => puntoDaCollegare(p.tipo) && p.pin.length === 0).length;
  // le planimetrie dell'area prima, poi il resto del Palazzo
  const opzioniMappa = useMemo(() => {
    const dellArea = new Set(area.mappe.map((m) => m.chiave));
    return [...planimetrie].sort((a, b) => Number(dellArea.has(b.chiave)) - Number(dellArea.has(a.chiave)))
      .map((p) => ({ chiave: p.chiave, nome: nomeSenzaPalazzo(p.nome), dettaglio: dellArea.has(p.chiave) ? 'di quest’area' : undefined }));
  }, [planimetrie, area.mappe]);
  const mappaIniziale = (p: PuntoInteresseDto): string | null => {
    const dellArea = area.mappe.map((m) => m.chiave);
    // dove sta già un suo pin, altrimenti la planimetria aperta (se è dell'area), altrimenti la prima dell'area o del Palazzo
    return p.pin[0]?.mappa ?? (mappaAperta && dellArea.includes(mappaAperta) ? mappaAperta : dellArea[0] ?? planimetrie[0]?.chiave ?? null);
  };

  const sposta = async (p: PuntoInteresseDto, verso: -1 | 1) => {
    setOccupato(true);
    try { await spostaPunto(p.chiave, verso); await onRicarica(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Spostamento non riuscito.'); }
    finally { setOccupato(false); }
  };
  const scegliPin = async (p: PuntoInteresseDto, spilloId: number, nome: string) => {
    const collegato = p.pin.some((x) => x.id === spilloId);
    setOccupato(true);
    try {
      // La risposta dice i pin della voce ma non lo stato nella partita, che il collegamento può cambiare (gli stati si
      // uniscono): si rilegge la scheda con la partita, e con lei voce, raccolta, anello e visore (rilievo della revisione).
      await collegaPinAlPunto(p.chiave, spilloId, !collegato);
      await onRicarica();
      notifica('success', collegato ? `«${nome}» scollegato da «${p.nome}».` : `«${nome}» collegato a «${p.nome}».`);
    } catch (err) { notifica('error', err instanceof Error ? err.message : 'Collegamento non riuscito.'); }
    finally { setOccupato(false); }
  };
  const fineCollegamento = async () => { setCollegando(null); await onRicarica(); };

  return (
    <details className="text-[12px]" open aria-label={`Guida di ${area.nome}`}>
      <summary className="touch cursor-pointer text-text-muted">
        Guida dell’area · {area.punti.length === 1 ? '1 voce' : `${area.punti.length} voci`}{gestitiArea > 0 ? ` (${gestitiArea} segnate)` : ''}{daCollegare > 0 ? ` · ${daCollegare} da collegare` : ''}
      </summary>
      <div className="flex flex-col gap-2 pt-2">
        <p className="m-0 text-[11px] text-text-muted">
          Una voce collegata ai pin ha il loro stato; le altre si segnano qui e non contano nella percentuale, che misura {memento ? 'gli obiettivi dei dedali' : 'le planimetrie'}.
        </p>
        {area.punti.length > 0 && (
          <div className="flex flex-wrap items-center gap-1" aria-label="Filtri per tipo">
            {TIPI.filter((tp) => area.punti.some((p) => p.tipo === tp)).map((tp) => (
              <button key={tp} type="button" className={`chip touch text-[11px] ${filtro.has(tp) ? 'chip--attivo' : ''}`} aria-pressed={filtro.has(tp)} onClick={() => setFiltro((f) => { const n = new Set(f); if (n.has(tp)) n.delete(tp); else n.add(tp); return n; })}>
                <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: COLORE_TIPO[tp] }} aria-hidden="true" />{NOME_TIPO[tp]} ({area.punti.filter((p) => p.tipo === tp).length})
              </button>
            ))}
            {filtro.size > 0 && <button type="button" className="chip touch text-[11px]" onClick={() => setFiltro(new Set())}>Tutti</button>}
            {gestitiArea > 0 && <button type="button" className={`chip touch text-[11px] ${mostraGestiti ? 'chip--attivo' : ''}`} onClick={() => setMostraGestiti((v) => !v)} aria-pressed={mostraGestiti}>Anche le segnate ({gestitiArea})</button>}
          </div>
        )}
        <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0" aria-label={`Voci della guida di ${area.nome}`}>
          {area.punti.length === 0 && <li className="py-2 text-[13px] text-text-muted">La guida non ha voci per quest’area: aggiungile qui sotto.</li>}
          {area.punti.length > 0 && puntiVisibili.length === 0 && <li className="py-2 text-[13px] text-text-muted">Nessuna voce con questi filtri{!mostraGestiti && gestitiArea > 0 ? ` (${gestitiArea} segnate nascoste)` : ''}.</li>}
          {puntiVisibili.map((p) => {
            const indice = area.punti.indexOf(p);
            const aperto = p.chiave === selezionato;
            const scelta = collegando?.punto === p.chiave ? collegando : null;
            return (
              <li key={p.chiave} className={`flex flex-col gap-1 rounded-md px-1 py-2 text-[13px] ${aperto ? 'bg-primary-bg' : ''}`}>
                <button type="button" className={`touch flex items-start gap-2 text-left ${p.stato && !aperto ? 'opacity-60' : ''}`} onClick={() => { setSelezionato(aperto ? null : p.chiave); if (aperto) setCollegando(null); }} aria-expanded={aperto}>
                  <span className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: COLORE_TIPO[p.tipo] }} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{p.nome}</span>
                    <span className="text-[12px] text-text-muted"> · {NOME_TIPO[p.tipo]}{p.esauribile ? ' · esauribile' : ''}{p.stato ? ` · ${p.stato}` : ''}</span>
                  </span>
                  {p.pin.length > 0
                    ? <span className="chip chip--icona shrink-0 text-[11px]" title={p.pin.map((x) => `${x.nome} (${nomeSenzaPalazzo(x.mappaNome)})`).join(', ')}><IconaAzione chiave="posizione" dimensione={14} />{p.pin.length === 1 ? '1 pin' : `${p.pin.length} pin`}</span>
                    : puntoDaCollegare(p.tipo) && <span className="chip shrink-0 text-[11px] text-text-muted">da collegare</span>}
                </button>
                {aperto && (
                  <div className="flex flex-col gap-1.5 pl-5">
                    {p.descrizione && <p className="m-0 whitespace-pre-wrap text-text-secondary">{p.descrizione}</p>}
                    <DettagliPunto d={p.dettagli} />
                    {p.pin.length > 0 && (
                      <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label={`Pin collegati a ${p.nome}`}>
                        {p.pin.map((x) => (
                          <li key={x.id} className="flex items-center gap-2 text-[12px]">
                            <IconaAzione chiave="posizione" dimensione={16} />
                            <span className="min-w-0 flex-1">{x.nome} <span className="text-text-muted">· {nomeSenzaPalazzo(x.mappaNome)}</span></span>
                            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={18} />} titolo="Scollega" aria-label={`Scollega ${x.nome} da ${p.nome}`} disabled={occupato} onClick={() => void scegliPin(p, x.id, x.nome)} />
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* una voce descrittiva (solo «Altro») si legge e basta: niente stato, niente pin (scelta dell'utente) */}
                    {puntoDescrittivo(p.tipo)
                      ? <p className="m-0 text-[11px] text-text-muted">Voce descrittiva: si legge, non si segna e non ha pin.</p>
                      : <div className="flex flex-wrap items-center gap-1.5">
                        {partitaId && p.stato !== 'ottenuto' && <button type="button" className="btn btn-primary btn-sm touch" onClick={() => void cambiaStato(p, 'ottenuto')}>Ottenuto</button>}
                        {partitaId && p.esauribile && p.stato !== 'esaurito' && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="esaurito" dimensione={20} />} titolo="Esaurito" onClick={() => void cambiaStato(p, 'esaurito')} />}
                        {partitaId && p.stato && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Riapri" onClick={() => void cambiaStato(p, null)} />}
                      </div>}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!puntoDescrittivo(p.tipo) && <PulsanteVisivo tono={scelta ? 'primario' : 'secondario'} compatto icona={<IconaAzione chiave="posizione" dimensione={20} />} titolo={scelta ? 'Chiudi la mappa' : 'Collega pin'}
                        aria-expanded={!!scelta} disabled={planimetrie.length === 0}
                        onClick={() => (scelta ? void fineCollegamento() : setCollegando({ punto: p.chiave, mappa: mappaIniziale(p), ricerca: '' }))} />}
                      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="su" dimensione={20} />} titolo="Su" aria-label={`Sposta su: ${p.nome}`} disabled={occupato || indice <= 0} onClick={() => void sposta(p, -1)} />
                      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="giu" dimensione={20} />} titolo="Giù" aria-label={`Sposta giù: ${p.nome}`} disabled={occupato || indice >= area.punti.length - 1} onClick={() => void sposta(p, 1)} />
                      <CorrezioneGuida key={p.chiave} cosa={`la voce «${p.nome}»`} compatto etichetta="Modifica"
                        iniziale={() => ({ nome: p.nome, descrizione: p.descrizione, tipo: p.tipo as string, esauribile: p.esauribile ? 'sì' : 'no' })}
                        onSalva={async (b) => { onPuntoAggiornato(await salvaPunto(p.chiave, { nome: b.nome, descrizione: b.descrizione, tipo: b.tipo as PuntoInteresseDto['tipo'], esauribile: b.esauribile === 'sì' })); await onRicarica(); }}
                        elimina={{ avviso: 'Se ne va dalla guida per tutte le partite, con quel che ne avevano segnato. I pin collegati restano sulla mappa, col loro «raccolto».', onElimina: async () => { await eliminaPunto(p.chiave); setSelezionato(null); setCollegando(null); await onRicarica(); } }}>
                        {(b, cambia) => <>
                          <CampoCorrezione etichetta="Nome" valore={b.nome} massimo={LIMITI_GUIDA.punto.nome} onCambia={(v) => cambia({ nome: v })} />
                          <span className="min-w-[150px]">
                            <Selettore etichetta="Tipo" valore={b.tipo} opzioni={TIPI.map((t) => ({ chiave: t, nome: NOME_TIPO[t] }))} onCambia={(v) => cambia({ tipo: v })} />
                          </span>
                          <label className="touch flex items-center gap-1.5 text-[12px]">
                            <input type="checkbox" className="h-5 w-5" checked={b.esauribile === 'sì'} onChange={(e) => cambia({ esauribile: e.target.checked ? 'sì' : 'no' })} />Esauribile
                          </label>
                          <CampoCorrezione etichetta="Descrizione" valore={b.descrizione} multilinea massimo={LIMITI_GUIDA.punto.descrizione} onCambia={(v) => cambia({ descrizione: v })} />
                        </>}
                      </CorrezioneGuida>
                    </div>
                    {scelta && (
                      <div ref={riquadroScelta} className="scelta-pin" role="group" aria-label={`Scelta dei pin per ${p.nome}`}>
                        <p className="m-0 text-[11px] leading-tight" title="Tocca un pin sulla mappa per collegarlo alla voce, toccalo di nuovo per scollegarlo">Tocca i pin da collegare · <strong>{p.pin.length === 1 ? '1 collegato' : `${p.pin.length} collegati`}</strong></p>
                        <Selettore etichetta="Planimetria" valore={scelta.mappa ?? ''} opzioni={opzioniMappa}
                          onCambia={(k) => setCollegando({ ...scelta, mappa: k })} />
                        <div className="flex items-center gap-1.5">
                          <label className="min-w-0 flex-1">
                            <span className="sr-only">Cerca un pin sulla mappa</span>
                            <input type="search" className="form-input" placeholder="Cerca un pin…" value={scelta.ricerca} onChange={(e) => setCollegando({ ...scelta, ricerca: e.target.value })} />
                          </label>
                          <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Fatto" onClick={() => void fineCollegamento()} />
                        </div>
                        {scelta.mappa && <div data-mappa-scelta style={{ height: altezzaScelta }}>
                          <MappaIncorporata key={scelta.mappa} chiave={scelta.mappa} partitaId={partitaId} conEditor={false} altezza={altezzaScelta}
                            scelta={{ titolo: p.nome, scelti: new Set(p.pin.map((x) => x.id)), occupato, ricerca: scelta.ricerca, onScegli: (s) => void scegliPin(p, s.id, s.nome) }} />
                        </div>}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {/* La guida non ha trascritto tutto: quel che manca si aggiunge qui, dove lo si è cercato; poi si sposta dove va. */}
        {nuovoPunto
          ? <form className="flex flex-wrap items-end gap-2 rounded-md bg-white/[0.04] px-2 py-2"
              onSubmit={(e) => { e.preventDefault(); const n = nuovoPunto.nome.trim(); if (!n) return; void creaPunto(area.chiave, { nome: n, tipo: nuovoPunto.tipo }).then(async (nuovo) => { setNuovoPunto(null); await onRicarica(); setSelezionato(nuovo.chiave); notifica('success', `Voce «${n}» aggiunta a ${area.nome}.`); }).catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Voce non aggiunta.')); }}>
              <CampoCorrezione etichetta="Nuova voce" valore={nuovoPunto.nome} massimo={LIMITI_GUIDA.punto.nome} onCambia={(v) => setNuovoPunto({ ...nuovoPunto, nome: v })} />
              <span className="min-w-[150px]">
                <Selettore etichetta="Tipo" valore={nuovoPunto.tipo} opzioni={TIPI.map((t) => ({ chiave: t, nome: NOME_TIPO[t] }))} onCambia={(v) => setNuovoPunto({ ...nuovoPunto, tipo: v as PuntoInteresseDto['tipo'] })} />
              </span>
              <div className="flex gap-1.5">
                <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Aggiungi" disabled={!nuovoPunto.nome.trim()} />
                <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={() => setNuovoPunto(null)} />
              </div>
            </form>
          : <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una voce" className="self-start" onClick={() => setNuovoPunto({ nome: '', tipo: 'altro' })} />}
      </div>
    </details>
  );
}
