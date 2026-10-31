import { useLayoutEffect, useRef, useState } from 'react';
import type { DefinizioneRegolaPesca, RegolaPescaDto, ViaRegolaPesca } from '../../../shared/pesca';
import { salvaRegolaPesca } from '../../services/api/pesca';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';
import { Campo, CampoTesto } from '../shared/Campo';
import { CampoElenco } from '../guida/moduli/campi';
import { CHIUDI_SENZA_SALVARE, conferma as chiediConferma } from '../../stores/confermaStore';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

// L13 (O7-5, censimento del 25/10: textarea «un indirizzo per riga»): le fonti della regola sono righe con il loro campo, «Aggiungi» e
// «Togli» (`CampoElenco`); le fonti di una via si scelgono a tessere fra quelle della regola (prima si riscrivevano a mano, e un
// indirizzo copiato male bloccava il salvataggio senza dire quale). Una fonte della via che la regola non ha più resta visibile col
// suo motivo e si toglie con un tocco. Il corpo salvato è lo stesso: elenchi di indirizzi ripuliti, righe vuote tolte.
const pulite = (fonti: readonly string[]) => fonti.map(v => v.trim()).filter(Boolean);
const urlValido = (s: string) => { try { return ['https:', 'http:'].includes(new URL(s).protocol); } catch { return false; } };
type ViaBozza = ViaRegolaPesca;
const inBozza = (v: ViaRegolaPesca): ViaBozza => ({ ...v, fonti: [...v.fonti] });

/** Modifica la fonte canonica della guida; nessuna attribuzione alla partita avviene salvando. */
// L12 (passo 8): nel rilascio (sola lettura) l'editor delle regole non esiste; la condizione è costante di build, `EditorRegolaPescaReale` esce dal bundle
export const EditorRegolaPesca: StrumentoDiModifica<typeof EditorRegolaPescaReale> = IN_RILASCIO ? NienteInRilascio : EditorRegolaPescaReale;
function EditorRegolaPescaReale({ regola, onChiudi, onSalvata }: { regola: RegolaPescaDto; onChiudi: () => void; onSalvata: () => void | Promise<void> }) {
  const [fotografia] = useState(() => ({ chiave: regola.chiave, revisione: regola.revisione }));
  const [nome, setNome] = useState(regola.nome);
  const [fonti, setFonti] = useState<string[]>(() => [...(regola.dati?.fonti ?? [])]);
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
  const fontiRegola = pulite(fonti);
  /** Mette o toglie la fonte `f` dalla via `i`. */
  const alternaFonteVia = (i: number, f: string) => modificaVia(i, { fonti: vie[i]!.fonti.includes(f) ? vie[i]!.fonti.filter(x => x !== f) : [...vie[i]!.fonti, f] });
  /** Chiude chiedendo conferma se la bozza ha modifiche non salvate (non durante un salvataggio). */
  const chiudi = async () => {
    if (occupato) return;
    if (!salvata && statoBozza !== statoIniziale && !(await chiediConferma(CHIUDI_SENZA_SALVARE))) return;
    onChiudi();
  };
  const valoriNumerici = Object.values(numeri);
  const validi = valoriNumerici.every(s => /^\d+$/.test(s) && Number.isSafeInteger(Number(s)) && Number(s) <= 1_000_000)
    && Number(numeri.base) + Number(numeri.bonus) <= 999;
  const valido = regola.stato === 'collegata' && nome.trim().length > 0 && nome.trim().length <= 200 && validi
    && fontiRegola.length > 0 && fontiRegola.length <= 50 && fontiRegola.every(urlValido)
    && vie.length > 0 && vie.length <= 100 && new Set(vie.map(v => v.id)).size === vie.length
    && vie.every(v => v.id.trim().length > 0 && v.id.length <= 100 && v.nota.length <= 4000
      && pulite(v.fonti).length > 0 && pulite(v.fonti).length <= 50 && pulite(v.fonti).every(f => fontiRegola.includes(f)));
  const fonteCambiata = fotografia.chiave !== regola.chiave || fotografia.revisione !== regola.revisione;
  const disabilitato = occupato || salvata || fonteCambiata || regola.stato !== 'collegata';
  const salva = async () => {
    if (blocco.current || disabilitato || !valido || !conferma) return;
    blocco.current = true; setOccupato(true); setErrore(null);
    let acquisita = false;
    const dati: DefinizioneRegolaPesca = {
      versione: 1, quote: { giorno: Number(numeri.giorno), sera: Number(numeri.sera) }, costoEscaPunti: Number(numeri.esca),
      beneficioPerizia: { note: 1, puntiBase: Number(numeri.base), bonusFortuna: Number(numeri.bonus) }, fonti: fontiRegola,
      vie: vie.map(v => ({ ...v, fonti: pulite(v.fonti) })),
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
  return <Modal aperta larga titolo="Regola della pesca" onChiudi={() => void chiudi()} azioni={<>
    {salvata
      ? <PulsanteVisivo icona={<IconaAzione chiave="chiudi" dimensione={22} />} titolo="Chiudi" disabled={occupato} onClick={onChiudi} />
      : <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="annulla" dimensione={22} />} titolo="Annulla" disabled={occupato} onClick={() => void chiudi()} />}
    <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo="Salva la regola" disabled={disabilitato || !valido || !conferma} onClick={() => void salva()} />
  </>}>
    <div className="flex min-w-0 flex-col gap-3 text-sm">
      <p className="m-0">Questa è la fonte comune delle due attività di Ichigaya. Il salvataggio aggiorna la guida. Le visite già registrate conservano la fotografia dei costi e del beneficio applicabili alla visita; le loro osservazioni rimangono conservate. Ogni attribuzione alla partita richiede una proposta e una decisione esplicita.</p>
      {regola.motivi.map((m, i) => <p key={i} role="alert" className="m-0 text-warning">{m}</p>)}
      {fonteCambiata && !salvata && <p role="alert" className="m-0 text-warning">La fonte è cambiata mentre la bozza era aperta. Il salvataggio è bloccato; la bozza resta visibile con la sua revisione originale. Annulla e riapri la regola per leggere i dati aggiornati.</p>}
      <fieldset disabled={disabilitato} className="m-0 min-w-0 space-y-3 border-0 p-0">
        <CampoTesto etichetta="Nome" valore={nome} massimo={200} disabilitato={disabilitato} onCambia={v => { cambia(); setNome(v); }} />
        <div className="griglia-campi">
          {/* l'etichetta comune è testo: la nota si dice a parole («per nota»), il ♪ resta accanto da vedere */}
          {([['giorno', 'Quota di giorno in yen'], ['sera', 'Quota di sera in yen'], ['esca', 'Costo esca speciale in punti pesca'], ['base', 'Perizia: punti interni base per nota (♪)'], ['bonus', 'Fortuna: punti interni aggiuntivi']] as const).map(([k, etichetta]) =>
            <CampoTesto key={k} etichetta={etichetta} tipo="numero" valore={numeri[k]} disabilitato={disabilitato} onCambia={v => { cambia(); setNumeri(n => ({ ...n, [k]: v })); }} />)}
        </div>
        <CampoElenco etichetta="Fonti della regola (indirizzi)" voci={fonti} lungo={false} max={2000} disabilitato={disabilitato} onCambia={v => { cambia(); setFonti(v); }} />
        {vie.map((v, i) => <fieldset key={i} className="regole-editor min-w-0 space-y-2">
          <legend>Via documentata {i + 1}</legend>
          <div className="griglia-campi">
            <CampoTesto etichetta="Chiave" valore={v.id} massimo={100} disabilitato={disabilitato} onCambia={id => modificaVia(i, { id })} />
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
          <Campo etichetta="Fonti della via" aiuto={fontiRegola.length ? 'Tocca le fonti della regola che documentano questa via.' : 'Aggiungi prima le fonti della regola.'}>
            <div className="flex min-w-0 flex-col gap-1.5">
              {fontiRegola.map(f => <button key={f} type="button" className={`chip touch min-w-0 justify-start text-left break-all ${v.fonti.includes(f) ? 'chip--attivo' : ''}`} aria-pressed={v.fonti.includes(f)} disabled={disabilitato} onClick={() => alternaFonteVia(i, f)}>{f}</button>)}
              {/* una fonte della via che la regola non ha più (cambiata o tolta sopra): si vede col perché e si toglie, non sparisce in silenzio */}
              {pulite(v.fonti).filter(f => !fontiRegola.includes(f)).map(f => <div key={f} className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border border-warning p-2">
                <span className="min-w-0 flex-1 break-all testo-13">{f} <span className="text-warning">· non è fra le fonti della regola</span></span>
                <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" aria-label={`Togli ${f} dalle fonti della via ${i + 1}`} disabled={disabilitato}
                  onClick={() => modificaVia(i, { fonti: v.fonti.filter(x => x.trim() !== f) })} />
              </div>)}
            </div>
          </Campo>
          <CampoTesto etichetta="Nota" tipo="lungo" valore={v.nota} massimo={4000} disabilitato={disabilitato} onCambia={nota => modificaVia(i, { nota })} />
          <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="elimina" dimensione={22} />} titolo="Rimuovi questa via dalla bozza" onClick={() => { cambia(); setVie(x => x.filter((_, j) => i !== j)); }} />
        </fieldset>)}
        <PulsanteVisivo icona={<IconaAzione chiave="piu" dimensione={22} />} titolo="Aggiungi una via alla bozza" disabled={vie.length >= 100} onClick={() => { cambia(); setVie(x => [...x, { id: '', specie: 'guardiano', faseTerzoSemestre: false, fascia: 'giorno', meteo: 'normale', guardianoPrecedente: 'indifferente', rangoComparsa: null, rangoCattura: 1, tentativo: 'primo', seiCatture: false, fonti: [], nota: '' }]); }} />
        {!valido && <p role="alert" className="m-0 text-warning">Completa nome, numeri interi non negativi, fonti e almeno una via con chiave distinta. Ogni fonte della via deve comparire nella regola; base e bonus non possono superare complessivamente 999 punti interni.</p>}
        <label className="flex items-center gap-2 touch"><input type="checkbox" checked={conferma} onChange={e => setConferma(e.target.checked)} />Confermo la modifica della fonte comune della guida.</label>
      </fieldset>
      {salvata && <p role="status" className="m-0">Regola salvata.</p>}
      {errore && <p role="alert" className="m-0 text-error-testo">{errore} La bozza rimane visibile; nessun nuovo invio automatico.</p>}
    </div>
  </Modal>;
}
