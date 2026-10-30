// ============================================================
// AtterraggioTokyo — quando un Palazzo compare sulla mappa di Tokyo e dove si atterra toccandolo
// ============================================================
//
// Richiesta dell'utente (2026-10-04): «devi visualizzare l'icona e permettermi di valorizzare per fasce temporali o giorni
// specifici il punto di atterraggio dell'icona della mappa rispetto al mappamondo delle planimetrie». Dall'intestazione del
// Palazzo un pulsante apre una finestra con due parti:
//
// - **Quando compare**: la finestra del Palazzo sulla mappa di Tokyo (dal–al, o senza fine), la stessa che dice l'arco della
//   storia alle condizioni dei pin. Dal L13 (O6-3, una fonte e un editor per le date del Palazzo) qui si legge soltanto: si cambia in
//   «Correggi la scheda», con le altre date del Palazzo;
// - **Atterraggio dalla mappa di Tokyo**: un elenco di regole (sempre, un giorno, da un giorno in poi, dal–al), ognuna con una
//   planimetria del Palazzo e, se serve, il pin d'arrivo su cui centrarla. Vale la prima che copre il giorno della partita:
//   l'ordine si cambia con le frecce, e «Salva le regole» le scrive.
//
// La bozza delle regole nasce all'apertura dai dati della pagina; chiudere la finestra la scarta.
// ============================================================

import { useEffect, useState } from 'react';
import { getMappa, impostaAtterraggiDungeon } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import { ordineGioco } from '../../../shared/condizioniSpillo';
import { dataGiocoConArticolo } from '../../utils/dateGioco';
import { nomeSenzaPalazzo } from '../../utils/gruppiPlanimetrie';
import { opzioniPinArrivo } from '../../utils/pinArrivo';
import type { DungeonDettaglioDto, SpilloDto } from '../../types';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { SelettoreData } from '../shared/SelettoreData';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** Quando vale una regola: sempre, un giorno solo, da un giorno in poi, fra due giorni. */
type Quando = 'sempre' | 'giorno' | 'da' | 'intervallo';
const QUANDO: ReadonlyArray<{ chiave: Quando; nome: string }> = [
  { chiave: 'sempre', nome: 'Sempre' },
  { chiave: 'giorno', nome: 'Un giorno' },
  { chiave: 'da', nome: 'Da un giorno in poi' },
  { chiave: 'intervallo', nome: 'Dal… al…' },
];

/** Una regola nella bozza: le date ci sono sempre (servono ai selettori), conta solo quel che `quando` usa. */
interface RegolaBozza { id: number; quando: Quando; dal: string; al: string; mappa: string; spillo: number | null; spilloNome: string | null }

/** Il primo giorno del calendario di gioco (9 aprile): la data di partenza dove il Palazzo non ne ha una. */
const PRIMO_GIORNO = '04-09';

/** La finestra detta a parole, con le preposizioni apostrofate davanti a 8 e 11: «dall’11 aprile al 2 maggio», «dal 9 maggio», «sempre». */
function testoFinestra(f: { dal: string; al: string | null } | null): string {
  if (!f) return 'sempre';
  return f.al ? `${dataGiocoConArticolo(f.dal, 'da')} ${dataGiocoConArticolo(f.al, 'a')}` : dataGiocoConArticolo(f.dal, 'da');
}

/** Il «quando» di una regola salvata: niente date = sempre, fine assente = da lì in poi, inizio e fine uguali = un giorno. */
function quandoDi(r: { dal: string | null; al: string | null }): Quando {
  if (!r.dal) return 'sempre';
  if (!r.al) return 'da';
  return r.dal === r.al ? 'giorno' : 'intervallo';
}

/** La regola come la vuole il server: le date che il «quando» non usa vanno a null. */
function regolaPerServer(r: RegolaBozza): { dal: string | null; al: string | null; mappa: string; spillo: number | null } {
  const date = r.quando === 'sempre' ? { dal: null, al: null } : r.quando === 'giorno' ? { dal: r.dal, al: r.dal } : r.quando === 'da' ? { dal: r.dal, al: null } : { dal: r.dal, al: r.al };
  return { ...date, mappa: r.mappa, spillo: r.spillo };
}

interface Props {
  dungeon: DungeonDettaglioDto;
  /** Rilegge la scheda del Palazzo dopo un salvataggio. */
  onSalvato: () => Promise<unknown>;
  /** Da 1024 px solo l'icona (intestazione compatta della scheda del Palazzo, R3-41). */
  compatto?: boolean;
}

/** Il pulsante dell'intestazione del Palazzo e la finestra che modifica comparsa e atterraggio sulla mappa di Tokyo. */
// L12 (passo 8): nel rilascio (sola lettura) la finestra del Palazzo e l'atterraggio non si impostano; la condizione è costante di build, `AtterraggioTokyoReale` esce dal bundle
export const AtterraggioTokyo: StrumentoDiModifica<typeof AtterraggioTokyoReale> = IN_RILASCIO ? NienteInRilascio : AtterraggioTokyoReale;
function AtterraggioTokyoReale({ dungeon: d, onSalvato, compatto }: Props) {
  const [aperta, setAperta] = useState(false);
  return (
    <>
      {/* `compatto` (scheda del Palazzo da 1024 px, R3-41): solo l'icona, col testo per chi non vede e nel suggerimento */}
      <PulsanteVisivo tono="secondario" compatto className={compatto ? 'btn-visivo--icona-lg' : undefined} title={compatto ? `Sulla mappa di Tokyo: ${testoFinestra(d.finestra)}` : undefined}
        icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Sulla mappa di Tokyo"
        dettaglio={testoFinestra(d.finestra)} aria-haspopup="dialog" onClick={() => setAperta(true)} />
      {aperta && <FinestraAtterraggio d={d} onSalvato={onSalvato} onChiudi={() => setAperta(false)} />}
    </>
  );
}

/** La finestra modale: si monta all'apertura, così le bozze ripartono ogni volta dai dati della pagina. */
function FinestraAtterraggio({ d, onSalvato, onChiudi }: { d: DungeonDettaglioDto; onSalvato: () => Promise<unknown>; onChiudi: () => void }) {
  const partenzaDal = d.finestra?.dal ?? PRIMO_GIORNO;
  const [regole, setRegole] = useState<RegolaBozza[]>(() => d.atterraggi.map((r, i) => ({
    id: i, quando: quandoDi(r), dal: r.dal ?? partenzaDal, al: r.al ?? r.dal ?? partenzaDal, mappa: r.mappa, spillo: r.spillo, spilloNome: r.spilloNome,
  })));
  const [prossimoId, setProssimoId] = useState(d.atterraggi.length);
  const [occupato, setOccupato] = useState(false);
  // I pin di ogni planimetria scelta in una regola, letti una volta sola: servono al selettore del pin d'arrivo.
  const [pin, setPin] = useState<ReadonlyMap<string, SpilloDto[]>>(new Map());
  const mappeScelte = [...new Set(regole.map((r) => r.mappa))].filter((k) => !pin.has(k));
  const daLeggere = mappeScelte.join('|');
  useEffect(() => {
    if (!daLeggere) return;
    let vivo = true;
    for (const k of daLeggere.split('|')) {
      void getMappa(k).then((m) => { if (vivo) setPin((p) => new Map(p).set(k, m.spilli)); })
        .catch(() => { if (vivo) setPin((p) => new Map(p).set(k, [])); });
    }
    return () => { vivo = false; };
  }, [daLeggere]);

  const regoleCambiate = JSON.stringify(regole.map(regolaPerServer)) !== JSON.stringify(d.atterraggi.map((r) => ({ dal: r.dal, al: r.al, mappa: r.mappa, spillo: r.spillo })));
  // le regole cambiate rispetto a quelle salvate: bozza sporca (la finestra qui si legge soltanto)
  useBozzaSporca('atterraggio-tokyo', `«Sulla mappa di Tokyo» del Palazzo ${d.nome}`, regoleCambiate);
  const rovesciate = regole.filter((r) => r.quando === 'intervallo' && ordineGioco(r.al) < ordineGioco(r.dal)).map((r) => regole.indexOf(r) + 1);
  const opzioniMappa = d.planimetrie.map((p) => ({ chiave: p.chiave, nome: nomeSenzaPalazzo(p.nome) }));
  // dove si atterra oggi: la regola che il server ha scelto per il giorno della partita
  const oggi = d.atterraggio ? `${nomeSenzaPalazzo(d.planimetrie.find((p) => p.chiave === d.atterraggio!.mappa)?.nome ?? d.atterraggio.mappa)}${d.atterraggio.spillo !== null ? `, sul pin «${d.atterraggi.find((r) => r.mappa === d.atterraggio!.mappa && r.spillo === d.atterraggio!.spillo)?.spilloNome ?? d.atterraggio.spillo}»` : ''}` : null;

  // L0 (2026-10-20): la finestra serve anche ai Memento, che si chiamano col loro nome e non «Palazzo»
  const memento = d.tipo === 'mementos';
  const ilPosto = memento ? 'i Memento' : 'il Palazzo';
  const delPosto = memento ? 'dei Memento' : 'del Palazzo';

  /** Cambia una regola della bozza. */
  const cambia = (id: number, patch: Partial<RegolaBozza>) => setRegole((rr) => rr.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  /** Sposta una regola di un posto (-1 su, +1 giù): l'ordine è quello in cui si provano. */
  const sposta = (i: number, verso: -1 | 1) => setRegole((rr) => { const n = [...rr]; [n[i], n[i + verso]] = [n[i + verso], n[i]]; return n; });
  /** Una regola nuova in fondo: vale sempre, sulla prima planimetria, senza pin. */
  const aggiungi = () => {
    if (!opzioniMappa[0]) return;
    setRegole((rr) => [...rr, { id: prossimoId, quando: 'sempre', dal: partenzaDal, al: partenzaDal, mappa: opzioniMappa[0].chiave, spillo: null, spilloNome: null }]);
    setProssimoId((n) => n + 1);
  };
  /** Esegue un salvataggio: rilegge la pagina e lo dice; l'errore del server resta a schermo come notifica. */
  const salva = async (cosa: string, azione: () => Promise<unknown>) => {
    setOccupato(true);
    try { await azione(); await onSalvato(); notifica('success', `${cosa}: salvato.`); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Salvataggio non riuscito.'); }
    finally { setOccupato(false); }
  };

  return (
    <Modal titolo={`Sulla mappa di Tokyo — ${d.nome}`} aperta onChiudi={onChiudi} larga
      azioni={<PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="chiudi" dimensione={20} />} titolo="Chiudi" onClick={onChiudi} />}>
      <div className="flex flex-col gap-5 testo-13">
        <section aria-labelledby="tokyo-quando" className="flex flex-col gap-2">
          <h3 id="tokyo-quando" className="m-0 font-display testo-16 uppercase">Quando compare</h3>
          {/* L13 O6-3: le date {delPosto} hanno un solo editor, «Correggi la scheda»; qui si dice la finestra e dove cambiarla */}
          <p className="m-0 testo-13" data-finestra>L’icona {delPosto} sta sulla mappa di Tokyo <strong>{testoFinestra(d.finestra)}</strong>.</p>
          <p className="m-0 testo-12 text-text-muted">È la stessa finestra che dice l’arco della storia alle condizioni dei pin. Si cambia in «Correggi la scheda» {delPosto}, insieme alle altre sue date.</p>
        </section>

        <section aria-labelledby="tokyo-atterraggio" className="flex flex-col gap-2">
          <h3 id="tokyo-atterraggio" className="m-0 font-display testo-16 uppercase">Atterraggio dalla mappa di Tokyo</h3>
          <p className="m-0 testo-12 text-text-muted">
            Toccando {ilPosto} sulla mappa di Tokyo si apre la planimetria della <strong>prima</strong> regola che copre il giorno della partita, centrata sul pin d’arrivo se c’è.
            Senza partita vale la prima regola «Sempre». Se nessuna regola vale si apre la scheda {delPosto}.
          </p>
          <p className="m-0 testo-12" data-atterraggio-oggi>{oggi ? <>Oggi si atterra su: <strong>{oggi}</strong>.</> : `Oggi nessuna regola vale: si apre la scheda ${delPosto}.`}</p>
          {opzioniMappa.length === 0 ? <p className="m-0 testo-12 text-text-muted">{memento ? 'I Memento non hanno planimetrie: toccandoli si apre la loro scheda.' : 'Questo Palazzo non ha planimetrie: toccandolo si apre la sua scheda.'}</p> : (
            <>
              {regole.length > 0 && (
                <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Regole d’atterraggio, nell’ordine in cui si provano">
                  {regole.map((r, i) => {
                    const pinMappa = pin.get(r.mappa);
                    // finché i pin non sono letti, il pin salvato resta fra le scelte col suo nome
                    const opzioniPin = [{ chiave: '', nome: '— nessuno: la planimetria intera' },
                      ...(pinMappa ? opzioniPinArrivo(pinMappa) : r.spillo !== null ? [{ chiave: String(r.spillo), nome: r.spilloNome ?? `Pin ${r.spillo}` }] : [])];
                    return (
                      <li key={r.id} className="flex flex-col gap-2 rounded-md border border-border-light bg-white/[0.04] p-2" aria-label={`Regola ${i + 1}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display testo-15 tabular-nums" aria-hidden>{i + 1}.</span>
                          <span className="min-w-[170px]">
                            <Selettore etichetta="Quando" ricerca="mai" valore={r.quando} disabilitato={occupato} opzioni={QUANDO.map((q) => ({ chiave: q.chiave, nome: q.nome }))} onCambia={(v) => cambia(r.id, { quando: v as Quando })} />
                          </span>
                          {r.quando !== 'sempre' && <SelettoreData etichetta={r.quando === 'giorno' ? `Regola ${i + 1}, il giorno` : `Regola ${i + 1}, dal`} valore={r.dal} disabilitato={occupato} onCambia={(v) => cambia(r.id, { dal: v })} />}
                          {r.quando === 'intervallo' && <SelettoreData etichetta={`Regola ${i + 1}, al`} valore={r.al} disabilitato={occupato} onCambia={(v) => cambia(r.id, { al: v })} />}
                        </div>
                        <div className="flex flex-wrap items-end gap-2">
                          <span className="min-w-[200px] flex-1">
                            <Selettore etichetta="Planimetria" valore={r.mappa} disabilitato={occupato} opzioni={opzioniMappa} onCambia={(v) => cambia(r.id, { mappa: v, spillo: null, spilloNome: null })} />
                          </span>
                          <span className="min-w-[200px] flex-1">
                            <Selettore etichetta="Pin d’arrivo" valore={r.spillo === null ? '' : String(r.spillo)} disabilitato={occupato} opzioni={opzioniPin}
                              onCambia={(v) => cambia(r.id, { spillo: v ? Number(v) : null, spilloNome: v ? (opzioniPin.find((o) => o.chiave === v)?.nome ?? null) : null })} />
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="su" dimensione={20} />} titolo="Su" aria-label={`Sposta su la regola ${i + 1}`} disabled={occupato || i === 0} onClick={() => sposta(i, -1)} />
                          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="giu" dimensione={20} />} titolo="Giù" aria-label={`Sposta giù la regola ${i + 1}`} disabled={occupato || i === regole.length - 1} onClick={() => sposta(i, 1)} />
                          <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" aria-label={`Togli la regola ${i + 1}`} disabled={occupato} onClick={() => setRegole((rr) => rr.filter((x) => x.id !== r.id))} />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
              {regole.length === 0 && <p className="m-0 testo-12 text-text-muted">{`Nessuna regola: toccando ${ilPosto} si apre la ${memento ? 'loro' : 'sua'} scheda.`}</p>}
              {rovesciate.length > 0 && <p className="m-0 testo-12 text-error-testo" role="alert">{rovesciate.length === 1 ? `Nella regola ${rovesciate[0]}` : `Nelle regole ${rovesciate.join(', ')}`} la fine viene prima dell’inizio.</p>}
              <div className="flex flex-wrap items-center gap-1.5">
                <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una regola" disabled={occupato || regole.length >= 30} onClick={aggiungi} />
                <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva le regole"
                  disabled={occupato || !regoleCambiate || rovesciate.length > 0}
                  onClick={() => void salva('Atterraggio dalla mappa di Tokyo', () => impostaAtterraggiDungeon(d.chiave, regole.map(regolaPerServer)))} />
              </div>
            </>
          )}
        </section>
      </div>
    </Modal>
  );
}
