import { useLayoutEffect, useRef, useState } from 'react';
import type { DefinizioneRegolaPesca, RegolaPescaDto, ViaRegolaPesca } from '../../../shared/pesca';
import { salvaRegolaPesca } from '../../services/api/pesca';
import { FinestraModifica } from '../shared/FinestraModifica';
import { Selettore } from '../shared/Selettore';
import { useBozzaSporca } from '../../utils/bozzeSporche';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';
import { Campo, CampoTesto, SezioneCampi, SezioneRipiegata } from '../shared/Campo';
import { CampoElenco } from '../guida/moduli/campi';
import { notifica } from '../../stores/notificationStore';
import { useIdStabili } from '../../hooks/useIdStabili';
import { formattaYen } from '../../utils/letture';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

// L8-06: era l'editor più lungo dell'app (13,6 schermate a 1280 px). Ora la `FinestraModifica` comune: le fonti della regola una volta sola e
// ripiegate, ogni via una riga con il suo riepilogo e un pannello aperto per volta, la chiave tecnica fra gli avanzati. Il corpo salvato è lo
// stesso: tutta la bozza resta nello stato, anche dei pannelli chiusi.
//
// L13 (O7-5, censimento del 25/10): le fonti di una via si scelgono a tessere fra quelle della regola (un indirizzo copiato male bloccava il
// salvataggio senza dire quale). Una fonte della via che la regola non ha più resta visibile col suo motivo e si toglie con un tocco.
const pulite = (fonti: readonly string[]) => fonti.map(v => v.trim()).filter(Boolean);
const urlValido = (s: string) => { try { return ['https:', 'http:'].includes(new URL(s).protocol); } catch { return false; } };
/** Il sito di un indirizzo: quanto basta per riconoscere la fonte sulla riga, senza ripetere l'indirizzo intero in ogni via. */
const sitoDi = (s: string) => { try { return new URL(s).hostname.replace(/^www\./, ''); } catch { return s; } };
type ViaBozza = ViaRegolaPesca;
const inBozza = (v: ViaRegolaPesca): ViaBozza => ({ ...v, fonti: [...v.fonti] });
type Numeri = Record<'giorno' | 'sera' | 'esca' | 'base' | 'bonus', string>;

/** Che cosa dice la riga chiusa di una via: quale pesce e quando, poi quota della sua fascia, meteo (se conta), rango e tentativo documentati. */
function riepilogoVia(v: ViaBozza, numeri: Numeri): { nome: string; resto: string } {
  const quota = numeri[v.fascia];
  return {
    nome: `${v.specie === 'guardiano' ? 'Guardiano' : 'Boss'} · ${v.faseTerzoSemestre ? 'terzo semestre avviato' : 'prima del terzo semestre'}`,
    resto: [
      `${v.fascia === 'giorno' ? 'Giorno' : 'Sera'}${/^\d+$/.test(quota) ? ` ${formattaYen(Number(quota))}` : ''}`,
      v.meteo === 'pioggia-neve' ? 'Pioggia o neve' : '',
      `rango ${v.rangoCattura}`, `${v.tentativo} tentativo`,
    ].filter(Boolean).join(' · '),
  };
}

/** Modifica la fonte canonica della guida; nessuna attribuzione alla partita avviene salvando. */
// L12 (passo 8): nel rilascio (sola lettura) l'editor delle regole non esiste; la condizione è costante di build, `EditorRegolaPescaReale` esce dal bundle
export const EditorRegolaPesca: StrumentoDiModifica<typeof EditorRegolaPescaReale> = IN_RILASCIO ? NienteInRilascio : EditorRegolaPescaReale;
function EditorRegolaPescaReale({ regola, onChiudi, onSalvata }: { regola: RegolaPescaDto; onChiudi: () => void; onSalvata: () => void | Promise<void> }) {
  const [fotografia] = useState(() => ({ chiave: regola.chiave, revisione: regola.revisione }));
  const [nome, setNome] = useState(regola.nome);
  const [fonti, setFonti] = useState<string[]>(() => [...(regola.dati?.fonti ?? [])]);
  const [numeri, setNumeri] = useState<Numeri>(() => ({
    giorno: String(regola.dati?.quote.giorno ?? ''), sera: String(regola.dati?.quote.sera ?? ''),
    esca: String(regola.dati?.costoEscaPunti ?? ''), base: String(regola.dati?.beneficioPerizia.puntiBase ?? ''),
    bonus: String(regola.dati?.beneficioPerizia.bonusFortuna ?? ''),
  }));
  const [vie, setVie] = useState<ViaBozza[]>(() => regola.dati?.vie.map(inBozza) ?? []);
  // le vie hanno uno stato loro (i selettori): la chiave è un id stabile, non l'indice (`useIdStabili`)
  const chiaviVie = useIdStabili(vie.length);
  // il pannello aperto: uno per volta; «ultima» è la via appena aggiunta, che nasce aperta (il suo id si conosce solo al giro dopo)
  const [scelta, setScelta] = useState<number | 'ultima' | null>(null);
  const idAperta = scelta === 'ultima' ? chiaviVie.ids[chiaviVie.ids.length - 1] : scelta;
  // le tessere delle fonti del pannello aperto: chieste con «Cambia», si richiudono cambiando pannello
  const [sceltaFonti, setSceltaFonti] = useState(false);
  const alternaVia = (id: number) => { setSceltaFonti(false); setScelta(idAperta === id ? null : id); };
  const [occupato, setOccupato] = useState(false), [salvata, setSalvata] = useState(false), [errore, setErrore] = useState<string | null>(null);
  const [conferma, setConferma] = useState(false);
  const blocco = useRef(false), viva = useRef(true);
  // la bozza com'era all'apertura è il metro per capire se c'è qualcosa di non salvato (per «Aggiorna» e la chiusura della scheda del browser)
  const statoBozza = JSON.stringify({ nome, fonti, numeri, vie });
  const [statoIniziale] = useState(statoBozza);
  const sporca = !salvata && statoBozza !== statoIniziale;
  useBozzaSporca('editor-regola-pesca', 'regola della pesca', sporca);
  useLayoutEffect(() => { viva.current = true; return () => { viva.current = false; }; }, []);
  const cambia = () => { setConferma(false); setErrore(null); };
  const modificaVia = (i: number, patch: Partial<ViaBozza>) => { cambia(); setVie(v => v.map((x, j) => j === i ? { ...x, ...patch } : x)); };
  const fontiRegola = pulite(fonti);
  /** Mette o toglie la fonte `f` dalla via `i`. */
  const alternaFonteVia = (i: number, f: string) => modificaVia(i, { fonti: vie[i]!.fonti.includes(f) ? vie[i]!.fonti.filter(x => x !== f) : [...vie[i]!.fonti, f] });
  const valoriNumerici = Object.values(numeri);
  const validi = valoriNumerici.every(s => /^\d+$/.test(s) && Number.isSafeInteger(Number(s)) && Number(s) <= 1_000_000)
    && Number(numeri.base) + Number(numeri.bonus) <= 999;
  const fontiRegolaValide = fontiRegola.length > 0 && fontiRegola.length <= 50 && fontiRegola.every(urlValido);
  const chiaveDoppia = (v: ViaBozza) => vie.filter(x => x.id === v.id).length > 1;
  /** Una via a posto: sulla riga chiusa si vede quale va ancora completata. */
  const viaValida = (v: ViaBozza) => v.id.trim().length > 0 && v.id.length <= 100 && !chiaveDoppia(v) && v.nota.length <= 4000
    && pulite(v.fonti).length > 0 && pulite(v.fonti).length <= 50 && pulite(v.fonti).every(f => fontiRegola.includes(f));
  const valido = regola.stato === 'collegata' && nome.trim().length > 0 && nome.trim().length <= 200 && validi
    && fontiRegolaValide && vie.length > 0 && vie.length <= 100 && vie.every(viaValida);
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
      notifica('success', 'Regola salvata.');
      if (!viva.current) return;
      setSalvata(true); await onSalvata();
      if (viva.current) onChiudi();
    } catch (e) {
      if (viva.current) setErrore(`${acquisita ? 'Regola salvata, ma aggiornamento della vista non riuscito. ' : ''}${e instanceof Error ? e.message : 'Salvataggio non riuscito.'} La bozza rimane visibile; nessun nuovo invio automatico.`);
    } finally { blocco.current = false; if (viva.current) setOccupato(false); }
  };
  return <FinestraModifica titolo="Regola della pesca" onChiudi={onChiudi} onSalva={salva} titoloSalva="Salva la regola"
    salvabile={!disabilitato && valido && conferma} occupato={occupato} sporca={sporca} errore={errore}
    azioniExtra={<label className="flex items-center gap-2 touch testo-13"><input type="checkbox" checked={conferma} disabled={disabilitato} onChange={e => setConferma(e.target.checked)} />Confermo la modifica della fonte comune</label>}>
    <p className="m-0 testo-13 text-text-secondary">Fonte comune delle due attività di Ichigaya: le visite già registrate non cambiano.</p>
    {regola.motivi.map((m, i) => <p key={i} role="alert" className="m-0 text-warning">{m}</p>)}
    {fonteCambiata && !salvata && <p role="alert" className="m-0 text-warning">La fonte è cambiata mentre la bozza era aperta. Il salvataggio è bloccato; la bozza resta visibile con la sua revisione originale. Annulla e riapri la regola per leggere i dati aggiornati.</p>}
    <fieldset disabled={disabilitato} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
      <SezioneCampi titolo="Quote e beneficio">
        <CampoTesto largo etichetta="Nome" valore={nome} massimo={200} disabilitato={disabilitato} onCambia={v => { cambia(); setNome(v); }} />
        {/* l'etichetta comune è testo: la nota si dice a parole («per nota»), il ♪ resta accanto da vedere */}
        {([['giorno', 'Quota di giorno in yen'], ['sera', 'Quota di sera in yen'], ['esca', 'Costo esca speciale in punti pesca'], ['base', 'Perizia: punti interni base per nota (♪)'], ['bonus', 'Fortuna: punti interni aggiuntivi']] as const).map(([k, etichetta]) =>
          <CampoTesto key={k} etichetta={etichetta} tipo="numero" valore={numeri[k]} disabilitato={disabilitato} onCambia={v => { cambia(); setNumeri(n => ({ ...n, [k]: v })); }} />)}
      </SezioneCampi>
      <SezioneRipiegata titolo="Fonti della regola" riepilogo={fontiRegola.length ? fontiRegola.map(sitoDi).join(' · ') : 'Nessuna'} aperta={!fontiRegolaValide}>
        <CampoElenco etichetta="Indirizzi" voci={fonti} lungo={false} max={2000} disabilitato={disabilitato} onCambia={v => { cambia(); setFonti(v); }} />
      </SezioneRipiegata>
      <section className="flex min-w-0 flex-col gap-2" aria-label="Vie documentate">
        <h3 className="finestra-sezione__titolo m-0">Vie documentate · {vie.length}</h3>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {vie.map((v, i) => {
            const id = chiaviVie.ids[i]!;
            const qui = idAperta === id;
            const r = riepilogoVia(v, numeri);
            const idPannello = `via-regola-${id}`;
            const fontiVia = pulite(v.fonti);
            const orfane = fontiVia.filter(f => !fontiRegola.includes(f));
            const tutte = orfane.length === 0 && fontiRegola.every(f => fontiVia.includes(f));
            // le stesse fonti si riassumono; le tessere con gli indirizzi interi solo se si chiede di cambiarle o se c'è qualcosa che non torna
            const tessere = sceltaFonti || orfane.length > 0 || fontiVia.length === 0;
            return <li key={id} className="flex min-w-0 flex-col gap-3 rounded-md border border-border p-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 flex-1 testo-13">
                  <strong className="block font-semibold">{r.nome}</strong>
                  <span className="block text-text-secondary">{r.resto}{!viaValida(v) && <span className="text-warning"> · da completare</span>}</span>
                </span>
                <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave={qui ? 'chiudi' : 'modifica'} dimensione={20} />} titolo={qui ? 'Chiudi' : 'Modifica'} aria-expanded={qui} aria-controls={qui ? idPannello : undefined}
                  aria-label={`${qui ? 'Chiudi' : 'Modifica'} la via ${i + 1}: ${r.nome}`} onClick={() => alternaVia(id)} />
              </div>
              {qui && <div id={idPannello} className="flex min-w-0 flex-col gap-3">
                <div className="griglia-campi">
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
                <Campo etichetta="Fonti della via" aiuto={tessere ? (fontiRegola.length ? 'Tocca le fonti della regola che documentano questa via.' : 'Aggiungi prima le fonti della regola.') : undefined}>
                  {tessere
                    ? <div className="flex min-w-0 flex-col gap-1.5">
                      {fontiRegola.map(f => <button key={f} type="button" className={`chip touch min-w-0 justify-start text-left break-all ${v.fonti.includes(f) ? 'chip--attivo' : ''}`} aria-pressed={v.fonti.includes(f)} disabled={disabilitato} onClick={() => alternaFonteVia(i, f)}>{f}</button>)}
                      {/* una fonte della via che la regola non ha più (cambiata o tolta sopra): si vede col perché e si toglie, non sparisce in silenzio */}
                      {orfane.map(f => <div key={f} className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border border-warning p-2">
                        <span className="min-w-0 flex-1 break-all testo-13">{f} <span className="text-warning">· non è fra le fonti della regola</span></span>
                        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" aria-label={`Togli ${f} dalle fonti della via ${i + 1}`} disabled={disabilitato}
                          onClick={() => modificaVia(i, { fonti: v.fonti.filter(x => x.trim() !== f) })} />
                      </div>)}
                    </div>
                    : <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="min-w-0 flex-1 testo-13">{tutte ? 'Tutte le fonti della regola' : fontiVia.map(sitoDi).join(' · ')}</span>
                      <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Cambia" aria-label={`Cambia le fonti della via ${i + 1}`} disabled={disabilitato} onClick={() => setSceltaFonti(true)} />
                    </div>}
                </Campo>
                <CampoTesto etichetta="Nota" tipo="lungo" valore={v.nota} massimo={4000} disabilitato={disabilitato} onCambia={nota => modificaVia(i, { nota })} />
                <SezioneRipiegata titolo="Avanzati" riepilogo="Chiave tecnica della via" aperta={v.id.trim().length === 0 || chiaveDoppia(v)}>
                  <CampoTesto etichetta="Chiave" valore={v.id} massimo={100} disabilitato={disabilitato} onCambia={chiave => modificaVia(i, { id: chiave })} />
                </SezioneRipiegata>
                <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Rimuovi questa via dalla bozza" onClick={() => { cambia(); setScelta(null); chiaviVie.togli(i); setVie(x => x.filter((_, j) => i !== j)); }} />
              </div>}
            </li>;
          })}
        </ul>
        <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una via alla bozza" disabled={vie.length >= 100} onClick={() => { cambia(); setSceltaFonti(false); chiaviVie.aggiungi(); setScelta('ultima'); setVie(x => [...x, { id: '', specie: 'guardiano', faseTerzoSemestre: false, fascia: 'giorno', meteo: 'normale', guardianoPrecedente: 'indifferente', rangoComparsa: null, rangoCattura: 1, tentativo: 'primo', seiCatture: false, fonti: [], nota: '' }]); }} />
      </section>
      {!valido && <p role="alert" className="m-0 testo-13 text-warning">Completa nome, numeri interi non negativi, fonti e almeno una via con chiave distinta. Ogni fonte della via deve comparire nella regola; base e bonus non possono superare complessivamente 999 punti interni.</p>}
    </fieldset>
  </FinestraModifica>;
}
