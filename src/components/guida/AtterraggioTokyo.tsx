// ============================================================
// AtterraggioTokyo — quando un Palazzo compare sulla mappa di Tokyo e dove si atterra toccandolo
// ============================================================
//
// Richiesta dell'utente (2026-10-04): «devi visualizzare l'icona e permettermi di valorizzare per fasce temporali o giorni
// specifici il punto di atterraggio dell'icona della mappa rispetto al mappamondo delle planimetrie». Dall'intestazione del
// Palazzo un pulsante apre una finestra con due parti, ognuna con il suo «Salva»:
//
// - **Quando compare**: la finestra del Palazzo sulla mappa di Tokyo (dal–al, o senza fine), la stessa che dice l'arco della
//   storia alle condizioni dei pin;
// - **Atterraggio dalla mappa di Tokyo**: un elenco di regole (sempre, un giorno, da un giorno in poi, dal–al), ognuna con una
//   planimetria del Palazzo e, se serve, il pin d'arrivo su cui centrarla. Vale la prima che copre il giorno della partita:
//   l'ordine si cambia con le frecce.
//
// Le bozze nascono all'apertura dai dati della pagina; chiudere la finestra le scarta.
// ============================================================

import { useEffect, useState } from 'react';
import { getMappa, impostaAtterraggiDungeon, impostaFinestraDungeon } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
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
}

/** Il pulsante dell'intestazione del Palazzo e la finestra che modifica comparsa e atterraggio sulla mappa di Tokyo. */
export function AtterraggioTokyo({ dungeon: d, onSalvato }: Props) {
  const [aperta, setAperta] = useState(false);
  return (
    <>
      <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="mappa" dimensione={20} />} titolo="Sulla mappa di Tokyo"
        dettaglio={testoFinestra(d.finestra)} aria-haspopup="dialog" onClick={() => setAperta(true)} />
      {aperta && <FinestraAtterraggio d={d} onSalvato={onSalvato} onChiudi={() => setAperta(false)} />}
    </>
  );
}

/** La finestra modale: si monta all'apertura, così le bozze ripartono ogni volta dai dati della pagina. */
function FinestraAtterraggio({ d, onSalvato, onChiudi }: { d: DungeonDettaglioDto; onSalvato: () => Promise<unknown>; onChiudi: () => void }) {
  const partenzaDal = d.finestra?.dal ?? PRIMO_GIORNO;
  const [dal, setDal] = useState(partenzaDal);
  const [senzaFine, setSenzaFine] = useState(!d.finestra?.al);
  const [al, setAl] = useState(d.finestra?.al ?? partenzaDal);
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

  const finestraNuova = { dal, al: senzaFine ? null : al };
  const finestraCambiata = !d.finestra || d.finestra.dal !== finestraNuova.dal || d.finestra.al !== finestraNuova.al;
  const finestraRovesciata = finestraNuova.al !== null && ordineGioco(finestraNuova.al) < ordineGioco(finestraNuova.dal);
  const regoleCambiate = JSON.stringify(regole.map(regolaPerServer)) !== JSON.stringify(d.atterraggi.map((r) => ({ dal: r.dal, al: r.al, mappa: r.mappa, spillo: r.spillo })));
  const rovesciate = regole.filter((r) => r.quando === 'intervallo' && ordineGioco(r.al) < ordineGioco(r.dal)).map((r) => regole.indexOf(r) + 1);
  const opzioniMappa = d.planimetrie.map((p) => ({ chiave: p.chiave, nome: nomeSenzaPalazzo(p.nome) }));
  // dove si atterra oggi: la regola che il server ha scelto per il giorno della partita
  const oggi = d.atterraggio ? `${nomeSenzaPalazzo(d.planimetrie.find((p) => p.chiave === d.atterraggio!.mappa)?.nome ?? d.atterraggio.mappa)}${d.atterraggio.spillo !== null ? `, sul pin «${d.atterraggi.find((r) => r.mappa === d.atterraggio!.mappa && r.spillo === d.atterraggio!.spillo)?.spilloNome ?? d.atterraggio.spillo}»` : ''}` : null;

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
      <div className="flex flex-col gap-5 text-[13px]">
        <section aria-labelledby="tokyo-quando" className="flex flex-col gap-2">
          <h3 id="tokyo-quando" className="m-0 font-display text-[16px] uppercase">Quando compare</h3>
          <p className="m-0 text-[12px] text-text-muted">L’icona del Palazzo sta sulla mappa di Tokyo nei giorni della partita dentro questa finestra (ora: {testoFinestra(d.finestra)}). È la stessa finestra che dice l’arco della storia alle condizioni dei pin.</p>
          <div className="flex flex-wrap items-center gap-2">
            <SelettoreData etichetta="Compare dal" valore={dal} onCambia={setDal} disabilitato={occupato} />
            <label className="touch flex items-center gap-1.5 text-[12px]">
              <input type="checkbox" className="h-5 w-5" checked={senzaFine} disabled={occupato} onChange={(e) => setSenzaFine(e.target.checked)} />Senza fine
            </label>
            {!senzaFine && <SelettoreData etichetta="Compare fino al" valore={al} onCambia={setAl} disabilitato={occupato} />}
          </div>
          {finestraRovesciata && <p className="m-0 text-[12px] text-error" role="alert">La fine viene prima dell’inizio.</p>}
          <div>
            <PulsanteVisivo tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Salva quando compare"
              disabled={occupato || !finestraCambiata || finestraRovesciata}
              onClick={() => void salva('Quando compare', () => impostaFinestraDungeon(d.chiave, finestraNuova.dal, finestraNuova.al))} />
          </div>
        </section>

        <section aria-labelledby="tokyo-atterraggio" className="flex flex-col gap-2">
          <h3 id="tokyo-atterraggio" className="m-0 font-display text-[16px] uppercase">Atterraggio dalla mappa di Tokyo</h3>
          <p className="m-0 text-[12px] text-text-muted">
            Toccando il Palazzo sulla mappa di Tokyo si apre la planimetria della <strong>prima</strong> regola che copre il giorno della partita, centrata sul pin d’arrivo se c’è.
            Senza partita vale la prima regola «Sempre». Se nessuna regola vale si apre la scheda del Palazzo.
          </p>
          <p className="m-0 text-[12px]" data-atterraggio-oggi>{oggi ? <>Oggi si atterra su: <strong>{oggi}</strong>.</> : 'Oggi nessuna regola vale: si apre la scheda del Palazzo.'}</p>
          {opzioniMappa.length === 0 ? <p className="m-0 text-[12px] text-text-muted">Questo dungeon non ha planimetrie: toccandolo si apre la sua scheda.</p> : (
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
                          <span className="font-display text-[15px] tabular-nums" aria-hidden>{i + 1}.</span>
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
              {regole.length === 0 && <p className="m-0 text-[12px] text-text-muted">Nessuna regola: toccando il Palazzo si apre la sua scheda.</p>}
              {rovesciate.length > 0 && <p className="m-0 text-[12px] text-error" role="alert">{rovesciate.length === 1 ? `Nella regola ${rovesciate[0]}` : `Nelle regole ${rovesciate.join(', ')}`} la fine viene prima dell’inizio.</p>}
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
