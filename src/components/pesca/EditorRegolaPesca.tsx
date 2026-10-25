import { useLayoutEffect, useRef, useState } from 'react';
import type { DefinizioneRegolaPesca, RegolaPescaDto, ViaRegolaPesca } from '../../../shared/pesca';
import { salvaRegolaPesca } from '../../services/api/pesca';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

const righe = (s: string) => s.split('\n').map(v => v.trim()).filter(Boolean);
const urlValido = (s: string) => { try { return ['https:', 'http:'].includes(new URL(s).protocol); } catch { return false; } };
type ViaBozza = Omit<ViaRegolaPesca, 'fonti'> & { fontiTesto: string };
const inBozza = (v: ViaRegolaPesca): ViaBozza => { const { fonti, ...resto } = v; return { ...resto, fontiTesto: fonti.join('\n') }; };

/** Modifica la fonte canonica della guida; nessuna attribuzione alla partita avviene salvando. */
// L12 (passo 8): nel rilascio (sola lettura) l'editor delle regole non esiste; la condizione è costante di build, `EditorRegolaPescaReale` esce dal bundle
export const EditorRegolaPesca: StrumentoDiModifica<typeof EditorRegolaPescaReale> = IN_RILASCIO ? NienteInRilascio : EditorRegolaPescaReale;
function EditorRegolaPescaReale({ regola, onChiudi, onSalvata }: { regola: RegolaPescaDto; onChiudi: () => void; onSalvata: () => void | Promise<void> }) {
  const [fotografia] = useState(() => ({ chiave: regola.chiave, revisione: regola.revisione }));
  const [nome, setNome] = useState(regola.nome);
  const [fonti, setFonti] = useState(regola.dati?.fonti.join('\n') ?? '');
  const [numeri, setNumeri] = useState(() => ({
    giorno: String(regola.dati?.quote.giorno ?? ''), sera: String(regola.dati?.quote.sera ?? ''),
    esca: String(regola.dati?.costoEscaPunti ?? ''), base: String(regola.dati?.beneficioPerizia.puntiBase ?? ''),
    bonus: String(regola.dati?.beneficioPerizia.bonusFortuna ?? ''),
  }));
  const [vie, setVie] = useState<ViaBozza[]>(() => regola.dati?.vie.map(inBozza) ?? []);
  const [occupato, setOccupato] = useState(false), [salvata, setSalvata] = useState(false), [errore, setErrore] = useState<string | null>(null);
  const [conferma, setConferma] = useState(false);
  const blocco = useRef(false), viva = useRef(true);
  // la bozza com'era all'apertura è il metro per capire se c'è qualcosa di non salvato (per «Aggiorna» e la chiusura della scheda del browser)
  const statoBozza = JSON.stringify({ nome, fonti, numeri, vie });
  const [statoIniziale] = useState(statoBozza);
  useBozzaSporca('editor-regola-pesca', 'regola della pesca', !salvata && statoBozza !== statoIniziale);
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
      if (!viva.current) return;
      setSalvata(true); await onSalvata();
    } catch (e) {
      if (viva.current) setErrore(`${acquisita ? 'Regola salvata, ma aggiornamento della vista non riuscito. ' : ''}${e instanceof Error ? e.message : 'Salvataggio non riuscito.'}`);
    } finally { blocco.current = false; if (viva.current) setOccupato(false); }
  };
  return <Modal aperta larga titolo="Regola della pesca" onChiudi={() => { if (!occupato) onChiudi(); }} azioni={<>
    {salvata
      ? <PulsanteVisivo icona={<IconaAzione chiave="chiudi" dimensione={22} />} titolo="Chiudi" disabled={occupato} onClick={onChiudi} />
      : <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={onChiudi}>Annulla</button>}
    <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo="Salva la regola" disabled={disabilitato || !valido || !conferma} onClick={() => void salva()} />
  </>}>
    <div className="flex min-w-0 flex-col gap-3 text-sm">
      <p className="m-0">Questa è la fonte comune delle due attività di Ichigaya. Il salvataggio aggiorna la guida. Le visite già registrate conservano la fotografia dei costi e del beneficio applicabili alla visita; le loro osservazioni rimangono conservate. Ogni attribuzione alla partita richiede una proposta e una decisione esplicita.</p>
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
          <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="elimina" dimensione={22} />} titolo="Rimuovi questa via dalla bozza" onClick={() => { cambia(); setVie(x => x.filter((_, j) => i !== j)); }} />
        </fieldset>)}
        <PulsanteVisivo icona={<IconaAzione chiave="piu" dimensione={22} />} titolo="Aggiungi una via alla bozza" disabled={vie.length >= 100} onClick={() => { cambia(); setVie(x => [...x, { id: '', specie: 'guardiano', faseTerzoSemestre: false, fascia: 'giorno', meteo: 'normale', guardianoPrecedente: 'indifferente', rangoComparsa: null, rangoCattura: 1, tentativo: 'primo', seiCatture: false, fontiTesto: '', nota: '' }]); }} />
        {!valido && <p role="alert" className="m-0 text-warning">Completa nome, numeri interi non negativi, fonti e almeno una via con chiave distinta. Ogni fonte della via deve comparire nella regola; base e bonus non possono superare complessivamente 999 punti interni.</p>}
        <label className="flex items-center gap-2 touch"><input type="checkbox" checked={conferma} onChange={e => setConferma(e.target.checked)} />Confermo la modifica della fonte comune della guida.</label>
      </fieldset>
      {salvata && <p role="status" className="m-0">Regola salvata.</p>}
      {errore && <p role="alert" className="m-0 text-error">{errore} La bozza rimane visibile; nessun nuovo invio automatico.</p>}
    </div>
  </Modal>;
}
