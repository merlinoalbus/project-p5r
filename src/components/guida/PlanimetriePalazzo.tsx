// ============================================================
// PlanimetriePalazzo — le stanze di un Palazzo, con le loro planimetrie
// ============================================================
//
// **Un Palazzo è fatto di stanze, non di immagini.** L'estrazione ha prodotto più tavole della
// stessa stanza — «Cancello del castello» come planimetria completa e come porzione occidentale,
// il Tetto in cinque inquadrature — e restano separate, perché ognuna ha i suoi spilli e serve a
// vedere una cosa diversa (decisione dell'utente, 2026-09-18: tenerle separate, ma in ordine).
// Elencarle piatte però faceva sembrare dieci stanze trentaquattro voci quasi uguali.
//
// Qui il Palazzo è un elenco di stanze: si trascina **la stanza** per l'ordine in cui la percorri
// — le sue versioni la seguono — e dentro la stanza si mettono in fila le versioni, con «Su»/«Giù»
// che sul tablet sono più precisi del trascinamento e funzionano anche da tastiera.
//
// Ogni versione dice quanto resta da raccogliere su di lei e se è **quella legata all'area** della
// guida: il legame è uno solo per area, e sceglierne un'altra stacca la precedente (lo fa il
// server). I nomi vengono da `presentazioneMappa`, l'unico posto che decide come si chiama una
// mappa: qui non si compone niente, altrimenti la stessa stanza si chiamerebbe in due modi.
// ============================================================

import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { aggiornaMappa, aggiornaPresentazioneMappa, creaMappa, eliminaMappa, riordinaMappe } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { Selettore } from '../shared/Selettore';
import { CampoCorrezione, CorrezioneGuida } from './CorrezioneGuida';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { chiaviInOrdine, nomeSenzaPalazzo, raggruppaPlanimetrie, spostaGruppo, spostaVersione, type GruppoPlanimetrie, type Planimetria } from '../../utils/gruppiPlanimetrie';
import type { MappaRiassuntoDto } from '../../types';

export type { Planimetria };

interface Props {
  /** Chiave del dungeon: la radice dell'albero è `dungeon-<chiave>`. */
  dungeonChiave: string;
  planimetrie: Planimetria[];
  /** L'atlante: serve per il nome di presentazione e per sapere quali versioni sono la stessa stanza. */
  albero: MappaRiassuntoDto[];
  /** Finché l'atlante non c'è, le stanze non si sanno: l'ordine resta bloccato (vedi sotto). */
  alberoPronto: boolean;
  alberoErrore: string | null;
  onRiprovaAlbero: () => void;
  aree: Array<{ chiave: string; nome: string; ordine: number }>;
  /** La planimetria che si sta guardando nel visore, evidenziata nell'elenco. */
  sceltaChiave: string | null;
  onScegli: (chiave: string) => void;
  /** Dopo ogni modifica strutturale: la scheda rilegge il Palazzo. */
  onCambiato: () => Promise<void> | void;
}

export function PlanimetriePalazzo({ dungeonChiave, planimetrie, albero, alberoPronto, alberoErrore, onRiprovaAlbero, aree, sceltaChiave, onScegli, onCambiato }: Props) {
  // L'ordine mostrato è locale finché il server non risponde: il trascinamento deve vedersi subito.
  // Vale solo per le planimetrie che ci sono adesso; quelle appena aggiunte si accodano nell'ordine
  // del server e quelle eliminate cadono, altrimenti una creazione riuscita sembrerebbe fallita.
  const [ordine, setOrdine] = useState<string[] | null>(null);
  const [occupato, setOccupato] = useState(false);
  // **Senza l'atlante non si riordina.** È l'atlante a dire quali tavole sono la stessa stanza:
  // finché non è arrivato, ogni planimetria sembrerebbe una stanza a sé e trascinare salverebbe lo
  // spostamento della singola tavola invece di quello della stanza — il contrario di quel che la
  // riga promette (rilievo della revisione, 2026-09-18).
  const bloccato = occupato || !alberoPronto;
  const [aperta, setAperta] = useState<string | null>(null);
  const [daEliminare, setDaEliminare] = useState<Planimetria | null>(null);
  const [nuovaAperta, setNuovaAperta] = useState(false);
  const [nomeNuova, setNomeNuova] = useState('');
  // Le bozze dei due nomi che si leggono nella scheda: quello della stanza (vale per tutte le sue
  // tavole) e quello della versione, che dice che cosa mostra questa tavola in particolare.
  const [bozzaStanza, setBozzaStanza] = useState<string | null>(null);
  const [bozzaVersione, setBozzaVersione] = useState<{ nome: string; etichetta: string } | null>(null);

  const gruppi = useMemo(() => {
    const inOrdine = ordine
      ? [
          ...ordine.map((k) => planimetrie.find((p) => p.chiave === k)).filter((p): p is Planimetria => !!p),
          ...planimetrie.filter((p) => !ordine.includes(p.chiave)),
        ]
      : planimetrie;
    return raggruppaPlanimetrie(inOrdine, albero);
  }, [ordine, planimetrie, albero]);

  // Il trascinamento è a puntatore e non `draggable`: l'HTML5 drag-and-drop col dito non parte, e
  // questa scheda si usa sul tablet mentre si gioca.
  const righe = useRef(new Map<string, HTMLLIElement>());
  const [trascinato, setTrascinato] = useState<string | null>(null);
  const [sopra, setSopra] = useState<number | null>(null);
  /** L'indice della stanza sotto il puntatore: l'ultima il cui bordo alto è già stato superato. */
  const indiceSotto = (y: number): number | null => {
    let trovato: number | null = null;
    gruppi.forEach((g, i) => { const el = righe.current.get(g.id); if (el && y >= el.getBoundingClientRect().top) trovato = i; });
    return trovato;
  };

  const esegui = async (azione: () => Promise<unknown>, messaggio: string) => {
    setOccupato(true);
    try { await azione(); await onCambiato(); notifica('success', messaggio); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Operazione non riuscita.'); setOrdine(null); }
    finally { setOccupato(false); }
  };

  /** Salva l'ordine piatto che i gruppi disegnano: il server lo riscrive da 0 per ogni genitore. */
  const salvaOrdine = (nuovi: GruppoPlanimetrie[], messaggio: string) => {
    const chiavi = chiaviInOrdine(nuovi);
    setOrdine(chiavi);
    void esegui(() => riordinaMappe(`dungeon-${dungeonChiave}`, chiavi), messaggio);
  };

  const legaArea = (p: Planimetria, area: string) =>
    esegui(() => aggiornaMappa(p.chiave, { entita: area ? { tipo: 'area', chiave: area } : null }),
      area ? `«${nomeSenzaPalazzo(p.nome)}» legata all’area scelta.` : `«${nomeSenzaPalazzo(p.nome)}» non è più legata a un’area.`);

  const totale = planimetrie.reduce((s, p) => s + p.n, 0);
  const presi = planimetrie.reduce((s, p) => s + (p.presi ?? 0), 0);
  const senzaArea = gruppi.filter((g) => g.aree.length === 0).length;

  return (
    <div className="flex flex-col gap-2.5" aria-label="Planimetrie del Palazzo">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 font-display text-[15px] uppercase leading-none">Stanze · {gruppi.length}</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="chip text-[11px]" title="Le tavole dell’atlante: più di una per stanza quando l’estrazione ne ha trovate diverse inquadrature.">{planimetrie.length} planimetrie</span>
          {senzaArea > 0 && <span className="chip text-[11px]" title="Una stanza senza area della guida non compare nell’elenco delle aree del Palazzo.">{senzaArea} senza area</span>}
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi" disabled={occupato} onClick={() => { setNomeNuova(''); setNuovaAperta(true); }} />
        </div>
      </div>
      <p className="m-0 text-[11px] text-text-muted">
        Trascina la maniglia di una stanza (o usa Su/Giù) per l’ordine in cui percorri il Palazzo: le sue planimetrie la seguono. Aprila per metterle in fila e per legarle a un’area.
        {totale > 0 ? ` ${presi}/${totale} raccolti in tutto.` : ' Nessun collezionabile su queste planimetrie.'}
      </p>

      {!alberoPronto && (
        <p className="m-0 flex flex-wrap items-center gap-2 rounded-md bg-white/[0.04] px-3 py-2 text-[12px] text-text-muted" role="status">
          {alberoErrore
            ? <>L’atlante non si è caricato ({alberoErrore}): le planimetrie si vedono, ma finché manca non si sa quali sono la stessa stanza e l’ordine resta bloccato.</>
            : <>Carico l’atlante per raggruppare le planimetrie per stanza: l’ordine si sblocca appena arriva.</>}
          {alberoErrore && <button type="button" className="chip touch text-[11px]" onClick={onRiprovaAlbero}>Riprova</button>}
        </p>
      )}

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
        {gruppi.map((g, i) => {
          const dentro = g.versioni.some((v) => v.planimetria.chiave === sceltaChiave);
          const restano = g.presi === null ? g.totale : g.totale - g.presi;
          const apertaQui = aperta === g.id || (dentro && aperta === null);
          return (
            <li key={g.id} ref={(el) => { if (el) righe.current.set(g.id, el); else righe.current.delete(g.id); }}
              className={`flex flex-col gap-1 rounded-md border px-2 py-1.5 transition-colors ${dentro ? 'border-primary bg-primary-bg' : 'border-border-light bg-white/[0.02]'} ${trascinato === g.id ? 'opacity-50' : ''} ${sopra === i && trascinato && trascinato !== g.id ? 'border-primary' : ''}`}>
              <div className="flex items-center gap-1.5">
                <span role="button" tabIndex={-1} aria-label={`Trascina «${g.nome}» per riordinare`} aria-disabled={bloccato || undefined}
                  title={bloccato ? 'Ordine bloccato: l’atlante non è ancora caricato' : 'Trascina per riordinare'}
                  className={`touch shrink-0 select-none px-1 text-text-muted touch-none ${bloccato ? 'cursor-default opacity-40' : 'cursor-grab'}`}
                  onPointerDown={(e) => { if (bloccato) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setTrascinato(g.id); setSopra(i); }}
                  onPointerMove={(e) => { if (trascinato !== g.id) return; setSopra(indiceSotto(e.clientY)); }}
                  onPointerUp={() => { if (trascinato === g.id && sopra !== null && sopra !== i) salvaOrdine(spostaGruppo(gruppi, g.id, sopra), 'Ordine delle stanze salvato.'); setTrascinato(null); setSopra(null); }}
                  onPointerCancel={() => { setTrascinato(null); setSopra(null); }}>⠿</span>
                <button type="button" className="touch min-w-0 flex-1 text-left" aria-expanded={apertaQui}
                  onClick={() => setAperta(apertaQui ? `chiusa:${g.id}` : g.id)}>
                  <span className="block truncate text-[13px] font-semibold">{i + 1}. {g.nome}</span>
                  <span className="block text-[11px] text-text-muted">
                    {g.versioni.length === 1 ? 'una planimetria' : `${g.versioni.length} planimetrie`}
                    {' · '}
                    {g.totale === 0 ? 'niente da raccogliere' : g.presi === null ? `${g.totale} da raccogliere` : restano > 0 ? `${restano} da prendere su ${g.totale}` : `${g.totale} raccolti · completa`}
                    {g.aree.length > 0 ? ` · ${g.aree.map((a) => a.nome).join(', ')}` : ' · nessuna area'}
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button type="button" className="touch px-1 text-text-muted disabled:opacity-30" disabled={bloccato || i === 0} onClick={() => salvaOrdine(spostaGruppo(gruppi, g.id, i - 1), 'Ordine delle stanze salvato.')} aria-label={`Sposta «${g.nome}» su`}>▲</button>
                  <button type="button" className="touch px-1 text-text-muted disabled:opacity-30" disabled={bloccato || i === gruppi.length - 1} onClick={() => salvaOrdine(spostaGruppo(gruppi, g.id, i + 1), 'Ordine delle stanze salvato.')} aria-label={`Sposta «${g.nome}» giù`}>▼</button>
                  <CorrezioneGuida cosa={`la stanza «${g.nome}»`} compatto modificato={bozzaStanza !== null && bozzaStanza !== g.nome}
                    onSalva={async () => { await aggiornaPresentazioneMappa(g.versioni[0].planimetria.chiave, { gruppoNome: bozzaStanza! }); setBozzaStanza(null); await onCambiato(); }}>
                    {() => <CampoCorrezione etichetta="Nome della stanza" valore={bozzaStanza ?? g.nome} onCambia={setBozzaStanza} />}
                  </CorrezioneGuida>
                  <span aria-hidden className="px-1 text-text-muted">{apertaQui ? '▾' : '▸'}</span>
                </div>
              </div>
              {g.totale > 0 && g.presi !== null && (
                <span className="visore-mappa__progresso h-1.5" role="progressbar" aria-label={`${g.nome}: raccolti`} aria-valuemin={0} aria-valuemax={g.totale} aria-valuenow={g.presi}>
                  <span className="visore-mappa__progresso-barra" style={{ width: `${Math.round((g.presi / g.totale) * 100)}%` }} />
                </span>
              )}

              {/* Le planimetrie della stanza: restano separate, ognuna con i suoi spilli e la sua area. */}
              {apertaQui && (
                <ul className="m-0 flex list-none flex-col gap-1 p-0 pl-4" aria-label={`Planimetrie di ${g.nome}`}>
                  {g.versioni.map((v, j) => {
                    const p = v.planimetria;
                    const scelta = p.chiave === sceltaChiave;
                    const restanoQui = p.presi === null ? p.n : p.n - p.presi;
                    return (
                      <li key={p.chiave} className={`flex flex-col gap-1 rounded border-l-2 px-2 py-1 ${scelta ? 'border-primary bg-primary-bg' : 'border-border-light'}`}>
                        <div className="flex items-center gap-1.5">
                          <button type="button" className="touch min-w-0 flex-1 text-left" onClick={() => onScegli(p.chiave)} aria-pressed={scelta}>
                            <span className="block truncate text-[12px]">{v.etichetta}{p.area ? ' · legata all’area' : ''}</span>
                            <span className="block text-[11px] text-text-muted">
                              {p.n === 0 ? 'niente da raccogliere' : p.presi === null ? `${p.n} da raccogliere` : restanoQui > 0 ? `${restanoQui} da prendere su ${p.n}` : `${p.n} raccolti · completa`}
                            </span>
                          </button>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <button type="button" className="touch px-1 text-text-muted disabled:opacity-30" disabled={bloccato || j === 0} onClick={() => salvaOrdine(spostaVersione(gruppi, g.id, p.chiave, -1), 'Ordine delle planimetrie salvato.')} aria-label={`Sposta «${v.etichetta}» su`}>▲</button>
                            <button type="button" className="touch px-1 text-text-muted disabled:opacity-30" disabled={bloccato || j === g.versioni.length - 1} onClick={() => salvaOrdine(spostaVersione(gruppi, g.id, p.chiave, 1), 'Ordine delle planimetrie salvato.')} aria-label={`Sposta «${v.etichetta}» giù`}>▼</button>
                            <CorrezioneGuida cosa={`la planimetria «${v.etichetta}»`} compatto modificato={!!bozzaVersione}
                              onSalva={async () => { const b = bozzaVersione!; await aggiornaMappa(p.chiave, { nome: b.nome }); await aggiornaPresentazioneMappa(p.chiave, { etichetta: b.etichetta || null }); setBozzaVersione(null); await onCambiato(); }}>
                              {() => { const b = bozzaVersione ?? { nome: nomeSenzaPalazzo(p.nome), etichetta: v.mappa?.gruppoImmagini?.etichetta ?? '' };
                                return <>
                                  <CampoCorrezione etichetta="Nome della planimetria" valore={b.nome} onCambia={(x) => setBozzaVersione({ ...b, nome: x })} />
                                  <CampoCorrezione etichetta="Che cosa mostra (etichetta)" valore={b.etichetta} onCambia={(x) => setBozzaVersione({ ...b, etichetta: x })} />
                                </>; }}
                            </CorrezioneGuida>
                            <Link to={`/guida/mappe/${encodeURIComponent(p.chiave)}/modifica`} className="touch px-1 text-[11px]" title="Modifica immagine e spilli">Editor</Link>
                            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={18} />} titolo="" aria-label={`Elimina «${v.etichetta}» di ${g.nome}`} disabled={occupato} onClick={() => setDaEliminare(p)} />
                          </div>
                        </div>
                        <Selettore etichetta="Area della guida" valore={p.area?.chiave ?? ''} vuoto="— nessuna —"
                          opzioni={aree.map((a) => ({ chiave: a.chiave, nome: `${a.ordine + 1}. ${a.nome}` }))}
                          onCambia={(k) => void legaArea(p, k)} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
        {gruppi.length === 0 && <li className="text-[12px] text-text-muted" role="status">Questo Palazzo non ha ancora planimetrie: aggiungine una.</li>}
      </ul>

      {daEliminare && (
        <div className="flex flex-col gap-2 rounded-md border border-primary bg-primary-bg px-2 py-2 text-[12px]" role="alertdialog" aria-label="Conferma eliminazione">
          <p className="m-0">Elimino «{nomeSenzaPalazzo(daEliminare.nome)}»? Se ne vanno anche i suoi spilli{daEliminare.n > 0 ? `, compresi ${daEliminare.n} collezionabili` : ''}. L’immagine di base resta fra le immagini caricate.</p>
          <div className="flex flex-wrap gap-1.5">
            <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Elimina" disabled={occupato}
              onClick={() => { const p = daEliminare; setDaEliminare(null); setOrdine(null); void esegui(() => eliminaMappa(p.chiave), `«${nomeSenzaPalazzo(p.nome)}» eliminata.`); }} />
            <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={() => setDaEliminare(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
