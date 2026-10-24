import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DefinizioneRegolaPesca, RegolaPescaDto, ViaRegolaPesca } from '../../../shared/pesca';
import { salvaRegolaPesca } from '../../services/api/pesca';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { AvvisoBozzaRipristinata } from '../shared/AvvisoBozzaRipristinata';
import { leggiBozzaPersistente, scartaBozzaPersistente, useBozzaPersistente } from '../../utils/bozzeSporche';

const righe = (s: string) => s.split('\n').map(v => v.trim()).filter(Boolean);
const urlValido = (s: string) => { try { return ['https:', 'http:'].includes(new URL(s).protocol); } catch { return false; } };
type ViaBozza = Omit<ViaRegolaPesca, 'fonti'> & { fontiTesto: string };
// i campi in un ordine fisso (lo stesso di `viaValida`): il confronto fra bozza e partenza è sul JSON e una copia ritrovata non deve risultare diversa solo per l'ordine
const inBozza = (v: ViaRegolaPesca): ViaBozza => ({
  id: v.id, specie: v.specie, faseTerzoSemestre: v.faseTerzoSemestre, fascia: v.fascia, meteo: v.meteo, guardianoPrecedente: v.guardianoPrecedente,
  rangoComparsa: v.rangoComparsa, rangoCattura: v.rangoCattura, tentativo: v.tentativo, seiCatture: v.seiCatture, fontiTesto: v.fonti.join('\n'), nota: v.nota,
});

/** I campi del modulo come si scrivono: i valori di partenza di una bozza e quel che si tiene in sessionStorage. */
interface StatoRegola { nome: string; fonti: string; numeri: { giorno: string; sera: string; esca: string; base: string; bonus: string }; vie: ViaBozza[] }
const bozzaDa = (regola: RegolaPescaDto): StatoRegola => ({
  nome: regola.nome, fonti: regola.dati?.fonti.join('\n') ?? '',
  numeri: {
    giorno: String(regola.dati?.quote.giorno ?? ''), sera: String(regola.dati?.quote.sera ?? ''),
    esca: String(regola.dati?.costoEscaPunti ?? ''), base: String(regola.dati?.beneficioPerizia.puntiBase ?? ''),
    bonus: String(regola.dati?.beneficioPerizia.bonusFortuna ?? ''),
  },
  vie: regola.dati?.vie.map(inBozza) ?? [],
});
const unoDi = <T,>(x: unknown, ammessi: readonly T[]): x is T => (ammessi as readonly unknown[]).includes(x);
const rangoDi = (x: unknown): boolean => typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= 5;
/** Una via ritrovata: ogni campo ha il tipo e i valori ammessi (come le scelte del modulo), altrimenti null. */
function viaValida(x: unknown): ViaBozza | null {
  if (typeof x !== 'object' || x === null) return null;
  const v = x as Record<string, unknown>;
  if (typeof v.id !== 'string' || typeof v.nota !== 'string' || typeof v.fontiTesto !== 'string' || typeof v.faseTerzoSemestre !== 'boolean' || typeof v.seiCatture !== 'boolean') return null;
  if (!unoDi(v.specie, ['guardiano', 'boss'] as const) || !unoDi(v.fascia, ['giorno', 'sera'] as const) || !unoDi(v.meteo, ['normale', 'pioggia-neve'] as const)) return null;
  if (!unoDi(v.guardianoPrecedente, ['si', 'no', 'indifferente'] as const) || !unoDi(v.tentativo, ['primo', 'settimo'] as const)) return null;
  if (!rangoDi(v.rangoCattura) || !(v.rangoComparsa === null || rangoDi(v.rangoComparsa))) return null;
  return { id: v.id, specie: v.specie, faseTerzoSemestre: v.faseTerzoSemestre, fascia: v.fascia, meteo: v.meteo, guardianoPrecedente: v.guardianoPrecedente,
    rangoComparsa: v.rangoComparsa as ViaBozza['rangoComparsa'], rangoCattura: v.rangoCattura as ViaBozza['rangoCattura'], tentativo: v.tentativo, seiCatture: v.seiCatture, fontiTesto: v.fontiTesto, nota: v.nota };
}
/** Una bozza ritrovata vale solo con forma e tipi giusti (nome, fonti, i cinque numeri come testo, al massimo 100 vie valide). */
function validaBozzaRegola(dati: unknown): StatoRegola | null {
  if (typeof dati !== 'object' || dati === null) return null;
  const d = dati as Record<string, unknown>;
  const n = d.numeri as Record<string, unknown> | null;
  if (typeof d.nome !== 'string' || typeof d.fonti !== 'string' || typeof n !== 'object' || n === null || !Array.isArray(d.vie) || d.vie.length > 100) return null;
  if (typeof n.giorno !== 'string' || typeof n.sera !== 'string' || typeof n.esca !== 'string' || typeof n.base !== 'string' || typeof n.bonus !== 'string') return null;
  const vie = d.vie.map(viaValida);
  if (vie.some((v) => v === null)) return null;
  return { nome: d.nome, fonti: d.fonti, numeri: { giorno: n.giorno, sera: n.sera, esca: n.esca, base: n.base, bonus: n.bonus }, vie: vie as ViaBozza[] };
}

/** Modifica la fonte canonica della guida; nessuna attribuzione alla partita avviene salvando. */
export function EditorRegolaPesca({ regola, onChiudi, onSalvata }: { regola: RegolaPescaDto; onChiudi: () => void; onSalvata: () => void | Promise<void> }) {
  const [fotografia] = useState(() => ({ chiave: regola.chiave, revisione: regola.revisione }));
  const chiaveBozza = `regola-pesca:${regola.chiave}`;
  // i valori della regola e, se c'è, la copia ritrovata in sessionStorage (pagina ricaricata): vale solo se la revisione della regola è la stessa di allora
  const [avvio] = useState(() => {
    const partenza = bozzaDa(regola);
    const salvata = leggiBozzaPersistente(chiaveBozza, { chiave: regola.chiave, revisione: regola.revisione }, validaBozzaRegola);
    return { partenza, corrente: salvata ?? partenza, ripristinata: salvata !== null };
  });
  const [ripristinata, setRipristinata] = useState(avvio.ripristinata);
  const [nome, setNome] = useState(avvio.corrente.nome);
  const [fonti, setFonti] = useState(avvio.corrente.fonti);
  const [numeri, setNumeri] = useState(avvio.corrente.numeri);
  const [vie, setVie] = useState<ViaBozza[]>(avvio.corrente.vie);
  const [occupato, setOccupato] = useState(false), [salvata, setSalvata] = useState(false), [errore, setErrore] = useState<string | null>(null);
  const [conferma, setConferma] = useState(false);
  const blocco = useRef(false), viva = useRef(true);
  // la bozza com'era all'apertura (i valori della regola, non la copia ritrovata) è il metro per capire se c'è qualcosa di non salvato (per «Aggiorna» e la chiusura della scheda del browser)
  const statoCorrente = useMemo<StatoRegola>(() => ({ nome, fonti, numeri, vie }), [nome, fonti, numeri, vie]);
  const sporca = !salvata && JSON.stringify(statoCorrente) !== JSON.stringify(avvio.partenza);
  useBozzaPersistente(chiaveBozza, 'regola della pesca', statoCorrente, { chiave: fotografia.chiave, revisione: fotografia.revisione }, { sporca });
  /** Chiude scartando la bozza (anche la copia in sessionStorage). */
  const chiudi = () => { scartaBozzaPersistente(chiaveBozza); onChiudi(); };
  /** «Scarta» sulla bozza ripristinata: i campi tornano com'è la regola e la copia si cancella (la conferma resta da dare). */
  const scarta = () => {
    const p = avvio.partenza;
    scartaBozzaPersistente(chiaveBozza);
    setNome(p.nome); setFonti(p.fonti); setNumeri(p.numeri); setVie(p.vie); setConferma(false); setRipristinata(false);
  };
  useLayoutEffect(() => { viva.current = true; return () => { viva.current = false; }; }, []);
  const cambia = () => { setConferma(false); setErrore(null); };
  const modificaVia = (i: number, patch: Partial<ViaBozza>) => { cambia(); setVie(v => v.map((x, j) => j === i ? { ...x, ...patch } : x)); };
  const fontiRegola = righe(fonti);
  const valoriNumerici = Object.values(numeri);
  const validi = valoriNumerici.every(s => /^\d+$/.test(s) && Number.isSafeInteger(Number(s)) && Number(s) <= 1_000_000)
    && Number(numeri.base) + Number(numeri.bonus) <= 999;
  const valido = regola.stato === 'collegata' && nome.trim().length > 0 && nome.trim().length <= 200 && validi
    && fontiRegola.length > 0 && fontiRegola.length <= 50 && fontiRegola.every(urlValido)
    && vie.length > 0 && vie.length <= 100 && new Set(vie.map(v => v.id)).size === vie.length
    && vie.every(v => v.id.trim().length > 0 && v.id.length <= 100 && v.nota.length <= 4000
      && righe(v.fontiTesto).length > 0 && righe(v.fontiTesto).length <= 50 && righe(v.fontiTesto).every(f => fontiRegola.includes(f)));
  const fonteCambiata = fotografia.chiave !== regola.chiave || fotografia.revisione !== regola.revisione;
  const disabilitato = occupato || salvata || fonteCambiata || regola.stato !== 'collegata';
  const salva = async () => {
    if (blocco.current || disabilitato || !valido || !conferma) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    let acquisita = false;
    const dati: DefinizioneRegolaPesca = {
      versione: 1, quote: { giorno: Number(numeri.giorno), sera: Number(numeri.sera) }, costoEscaPunti: Number(numeri.esca),
      beneficioPerizia: { note: 1, puntiBase: Number(numeri.base), bonusFortuna: Number(numeri.bonus) }, fonti: fontiRegola,
      vie: vie.map(v => { const { fontiTesto, ...resto } = v; return { ...resto, fonti: righe(fontiTesto) }; }),
    };
    try {
      await salvaRegolaPesca(fotografia.chiave, { nome: nome.trim(), dati, revisioneAttesa: fotografia.revisione });
      acquisita = true;
      scartaBozzaPersistente(chiaveBozza);
      if (!viva.current) return;
      setSalvata(true); await onSalvata();
    } catch (e) {
      if (viva.current) setErrore(`${acquisita ? 'Regola salvata, ma aggiornamento della vista non riuscito. ' : ''}${e instanceof Error ? e.message : 'Salvataggio non riuscito.'}`);
    } finally { blocco.current = false; if (viva.current) setOccupato(false); }
  };
  return <Modal aperta larga titolo="Regola della pesca" onChiudi={() => { if (!occupato) chiudi(); }} azioni={<>
    <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={chiudi}>{salvata ? 'Chiudi' : 'Annulla'}</button>
    <button type="button" className="btn btn-primary touch" disabled={disabilitato || !valido || !conferma} onClick={() => void salva()}>Salva la regola</button>
  </>}>
    <div className="flex min-w-0 flex-col gap-3 text-sm">
      <p className="m-0">Questa è la fonte comune delle due attività di Ichigaya. Il salvataggio aggiorna la guida. Le visite già registrate conservano la fotografia dei costi e del beneficio applicabili alla visita; le loro osservazioni rimangono conservate. Ogni attribuzione alla partita richiede una proposta e una decisione esplicita.</p>
      {ripristinata && sporca && <AvvisoBozzaRipristinata onScarta={scarta} />}
      {regola.motivi.map((m, i) => <p key={i} role="alert" className="m-0 text-warning">{m}</p>)}
      {fonteCambiata && !salvata && <p role="alert" className="m-0 text-warning">La fonte è cambiata mentre la bozza era aperta. Il salvataggio è bloccato; la bozza resta visibile con la sua revisione originale. Annulla e riapri la regola per leggere i dati aggiornati.</p>}
      <fieldset disabled={disabilitato} className="m-0 min-w-0 space-y-3 border-0 p-0">
        <label className="flex flex-col gap-1">Nome<input className="form-input touch" value={nome} maxLength={200} onChange={e => { cambia(); setNome(e.target.value); }} /></label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {([['giorno', 'Quota di giorno (yen)'], ['sera', 'Quota di sera (yen)'], ['esca', 'Costo esca speciale (punti pesca)'], ['base', 'Perizia: punti interni base per 1 nota'], ['bonus', 'Fortuna: punti interni aggiuntivi']] as const).map(([k, etichetta]) => <label key={k} className="flex flex-col gap-1">{etichetta}<input type="number" className="form-input touch" min={0} max={1000000} step={1} value={numeri[k]} onChange={e => { cambia(); setNumeri(n => ({ ...n, [k]: e.target.value })); }} /></label>)}
        </div>
        <label className="flex flex-col gap-1">Fonti della regola (un indirizzo per riga)<textarea className="form-input min-h-24" value={fonti} onChange={e => { cambia(); setFonti(e.target.value); }} /></label>
        {vie.map((v, i) => <fieldset key={i} className="min-w-0 space-y-2 rounded border border-border p-3">
          <legend>Via documentata {i + 1}</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1">Chiave<input className="form-input touch" maxLength={100} value={v.id} onChange={e => modificaVia(i, { id: e.target.value })} /></label>
            <Selettore etichetta="Specie" valore={v.specie} disabilitato={disabilitato} opzioni={[{ chiave: 'guardiano', nome: 'Guardiano' }, { chiave: 'boss', nome: 'Boss' }]} onCambia={specie => modificaVia(i, { specie: specie as ViaRegolaPesca['specie'] })} />
            <Selettore etichetta="Fase" valore={String(v.faseTerzoSemestre)} disabilitato={disabilitato} opzioni={[{ chiave: 'false', nome: 'Prima del terzo semestre' }, { chiave: 'true', nome: 'Terzo semestre avviato' }]} onCambia={fase => modificaVia(i, { faseTerzoSemestre: fase === 'true' })} />
            <Selettore etichetta="Fascia" valore={v.fascia} disabilitato={disabilitato} opzioni={[{ chiave: 'giorno', nome: 'Giorno' }, { chiave: 'sera', nome: 'Sera' }]} onCambia={fascia => modificaVia(i, { fascia: fascia as ViaRegolaPesca['fascia'] })} />
            <Selettore etichetta="Meteo" valore={v.meteo} disabilitato={disabilitato} opzioni={[{ chiave: 'normale', nome: 'Normale' }, { chiave: 'pioggia-neve', nome: 'Pioggia o neve' }]} onCambia={meteo => modificaVia(i, { meteo: meteo as ViaRegolaPesca['meteo'] })} />
            <Selettore etichetta="Guardiano catturato prima della visita" valore={v.guardianoPrecedente} disabilitato={disabilitato} opzioni={[{ chiave: 'si', nome: 'Sì' }, { chiave: 'no', nome: 'No' }, { chiave: 'indifferente', nome: 'Non richiesto da questa via' }]} onCambia={guardianoPrecedente => modificaVia(i, { guardianoPrecedente: guardianoPrecedente as ViaRegolaPesca['guardianoPrecedente'] })} />
            <Selettore etichetta="Rango che documenta la comparsa" valore={v.rangoComparsa === null ? '' : String(v.rangoComparsa)} vuoto="Non stabilito" disabilitato={disabilitato} opzioni={[1, 2, 3, 4, 5].map(n => ({ chiave: String(n), nome: String(n) }))} onCambia={rango => modificaVia(i, { rangoComparsa: rango === '' ? null : Number(rango) as ViaRegolaPesca['rangoComparsa'] })} />
            <Selettore etichetta="Rango che documenta la catturabilità" valore={String(v.rangoCattura)} disabilitato={disabilitato} opzioni={[1, 2, 3, 4, 5].map(n => ({ chiave: String(n), nome: String(n) }))} onCambia={rango => modificaVia(i, { rangoCattura: Number(rango) as ViaRegolaPesca['rangoCattura'] })} />
            <Selettore etichetta="Tentativo" valore={v.tentativo} disabilitato={disabilitato} opzioni={[{ chiave: 'primo', nome: 'Primo' }, { chiave: 'settimo', nome: 'Settimo' }]} onCambia={tentativo => modificaVia(i, { tentativo: tentativo as ViaRegolaPesca['tentativo'] })} />
            <label className="flex items-center gap-2 touch"><input type="checkbox" checked={v.seiCatture} onChange={e => modificaVia(i, { seiCatture: e.target.checked })} />Richiede sei catture nella visita</label>
          </div>
          <label className="flex flex-col gap-1">Fonti della via (indirizzi presenti nelle fonti della regola)<textarea className="form-input min-h-20" value={v.fontiTesto} onChange={e => modificaVia(i, { fontiTesto: e.target.value })} /></label>
          <label className="flex flex-col gap-1">Nota<textarea className="form-input min-h-20" maxLength={4000} value={v.nota} onChange={e => modificaVia(i, { nota: e.target.value })} /></label>
          <button type="button" className="btn btn-ghost touch" onClick={() => { cambia(); setVie(x => x.filter((_, j) => i !== j)); }}>Rimuovi questa via dalla bozza</button>
        </fieldset>)}
        <button type="button" className="btn btn-secondary touch" disabled={vie.length >= 100} onClick={() => { cambia(); setVie(x => [...x, { id: '', specie: 'guardiano', faseTerzoSemestre: false, fascia: 'giorno', meteo: 'normale', guardianoPrecedente: 'indifferente', rangoComparsa: null, rangoCattura: 1, tentativo: 'primo', seiCatture: false, fontiTesto: '', nota: '' }]); }}>Aggiungi una via alla bozza</button>
        {!valido && <p role="alert" className="m-0 text-warning">Completa nome, numeri interi non negativi, fonti e almeno una via con chiave distinta. Ogni fonte della via deve comparire nella regola; base e bonus non possono superare complessivamente 999 punti interni.</p>}
        <label className="flex items-center gap-2 touch"><input type="checkbox" checked={conferma} onChange={e => setConferma(e.target.checked)} />Confermo la modifica della fonte comune della guida.</label>
      </fieldset>
      {salvata && <p role="status" className="m-0">Regola salvata.</p>}
      {errore && <p role="alert" className="m-0 text-error">{errore} La bozza rimane visibile; nessun nuovo invio automatico.</p>}
    </div>
  </Modal>;
}
