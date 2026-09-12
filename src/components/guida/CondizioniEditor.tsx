// ============================================================
// CondizioniEditor — stati della partita, combinati in E / O / NON, per ogni elemento dell'app
// ============================================================
//
// Una riga è una condizione: **stato → operatore → valori**, tre scelte da elenchi chiusi
// (`shared/statiPartita.ts`). Un blocco è un gruppo: **TUTTE** (E) o **ALMENO UNA** (O), con
// dentro righe e altri blocchi, a qualsiasi profondità; la levetta **NON** nega una riga o un
// blocco. L'elenco di primo livello è un TUTTE implicito.
//
// Non c'è nulla da scrivere: i nomi vengono dalla Guida (con la ricerca dentro l'elenco), i numeri
// si muovono con più e meno. Una riga nuova nasce già valida — «Data di gioco dal 18 aprile» — e
// si cambia sul posto; così non esiste mai una condizione «incompleta» salvata a metà.
//
// Lo stesso componente serve a spilli, articoli, negozi, attività, libri e film: la richiesta
// dell'utente (2026-09-11) è che le condizioni siano una cosa sola in tutta l'app.
// ============================================================

import { useMemo, useState } from 'react';
import { ARCHI_STORIA, CONTATORI, DOTI_CONDIZIONE, EVENTI_STORIA, GIORNI_NEL_MESE, GIORNI_SETTIMANA, MESI_GIOCO, PALAZZI_CONDIZIONE, RANGHI_CLIENTE, STAGIONI, dataLeggibile, descriviRequisitoSpillo, nascondeIlPin, nomePalazzo, ordineGioco, type NomiCondizioni, type RequisitoSpillo } from '../../../shared/condizioniSpillo';
import { STATI_PARTITA, costruisciCondizione, definizioneStato, scomponiCondizione, valorePredefinito, type CampoCondizione, type SceltaCondizione, type TipoCampo, type ValoriCondizione } from '../../../shared/statiPartita';
import { useCarica } from '../../hooks/useCarica';
import { getConfidenti, getDungeons, getQuartieri, getRichieste } from '../../services/api/compendio';
import { getElenchiRegole, type ElenchiRegole } from '../../services/api/condizioni';
import { ELENCHI_VUOTI, nomiDaElenchi, type ElenchiCondizioni } from '../../utils/condizioniSpillo';
import { Selettore, type OpzioneSelettore as OpzioneRicerca } from '../shared/Selettore';
import { IconaAzione } from '../shared/IconaAzione';

/** La condizione con cui nasce una riga nuova: valida, e la più comune. */
const NUOVA: RequisitoSpillo = { tipo: 'data', dal: '04-18' };
const MODO_NOME = { tutte: 'TUTTE', 'almeno-una': 'ALMENO UNA' } as const;
const MODO_SPIEGA = { tutte: 'devono valere tutte', 'almeno-una': 'basta che ne valga una' } as const;

interface Elenchi { base: ElenchiCondizioni; extra: ElenchiRegole }

/** Le voci offerte per ogni tipo di campo: dalla Guida quando dipendono dai dati, fisse altrimenti. */
function opzioniPer(tipo: TipoCampo, e: Elenchi): OpzioneRicerca[] {
  switch (tipo) {
    case 'fascia': return [{ chiave: 'giorno', nome: 'giorno' }, { chiave: 'sera', nome: 'sera' }];
    case 'stagione': return STAGIONI.map((s) => ({ chiave: s.chiave, nome: s.nome }));
    case 'quartiere': return e.base.quartieri.filter((q) => q.sbloccoData != null).map((q) => ({ chiave: q.chiave, nome: q.nome, dettaglio: `dal ${dataLeggibile(q.sbloccoData!)}` }));
    case 'arco': return ARCHI_STORIA.map((d) => ({ chiave: d, nome: nomePalazzo(d) }));
    case 'palazzo': { const p = e.base.dungeon.filter((d) => d.tipo === 'palazzo'); return (p.length ? p : PALAZZI_CONDIZIONE).map((d) => ({ chiave: d.chiave, nome: d.nome })); }
    case 'dote': return DOTI_CONDIZIONE.map((d) => ({ chiave: d.chiave, nome: d.nome }));
    case 'confidente': return e.base.confidenti.map((c) => ({ chiave: c.chiave, nome: c.nome, dettaglio: c.arcana }));
    case 'membro': return e.extra.squadra;
    case 'richiesta': return e.base.richieste.map((r) => ({ chiave: r.chiave, nome: r.nome }));
    case 'libro': return e.extra.letture.filter((l) => l.categoria === 'libro');
    case 'film': return e.extra.letture.filter((l) => l.categoria === 'film');
    case 'articolo': return e.extra.articoli.map((a) => ({ chiave: a.chiave, nome: a.nome, gruppo: a.gruppo }));
    case 'attivita': return e.extra.attivita;
    case 'negozio-con-gradi': return e.extra.negozi.filter((n) => n.programma === 'rango-cliente');
    case 'negozio-con-punti': return e.extra.negozi.filter((n) => n.programma === 'manuale');
    case 'rango-cliente': return RANGHI_CLIENTE.map((r) => ({ chiave: r.chiave, nome: r.nome, dettaglio: r.spesa ? `da ¥${r.spesa.toLocaleString('it-IT')}` : undefined }));
    case 'evento': return e.extra.eventi.length ? e.extra.eventi : EVENTI_STORIA.map((x) => ({ chiave: x.chiave, nome: x.nome }));
    case 'contatore': return e.extra.contatori.length ? e.extra.contatori : CONTATORI.map((x) => ({ chiave: x.chiave, nome: x.nome }));
    case 'arcano': return e.extra.arcani;
    case 'persona': return e.extra.persone;
    case 'abilita': return e.extra.abilita;
    default: return [];
  }
}

/** I valori di partenza di uno stato: primo elemento dell'elenco per le chiavi, predefiniti per il resto. */
function valoriIniziali(campi: CampoCondizione[], e: Elenchi): ValoriCondizione {
  const v: ValoriCondizione = {};
  for (const c of campi) {
    const fisso = valorePredefinito(c.tipo);
    v[c.nome] = fisso === '' ? (opzioniPer(c.tipo, e)[0]?.chiave ?? '') : fisso;
  }
  return v;
}

/** Giorno e mese del calendario di gioco; i giorni offerti sono quelli del mese scelto (niente 31 aprile). */
function SelettoreData({ etichetta, valore, onCambia, disabilitato }: { etichetta: string; valore: string; onCambia: (v: string) => void; disabilitato?: boolean }) {
  const [mese, giorno] = valore.split('-');
  const giorni = Array.from({ length: GIORNI_NEL_MESE[mese] ?? 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  const cambiaMese = (nuovoMese: string) => {
    const massimo = GIORNI_NEL_MESE[nuovoMese] ?? 31;
    onCambia(`${nuovoMese}-${String(Math.min(Number(giorno), massimo)).padStart(2, '0')}`);
  };
  return (
    <span className="condizione-data" role="group" aria-label={etichetta}>
      <Selettore compatto ricerca="mai" etichetta={`${etichetta}: giorno`} valore={giorno} disabilitato={disabilitato} opzioni={giorni.map((g) => ({ chiave: g, nome: String(Number(g)) }))} onCambia={(g) => onCambia(`${mese}-${g}`)} />
      <Selettore compatto ricerca="mai" etichetta={`${etichetta}: mese`} valore={mese} disabilitato={disabilitato} opzioni={MESI_GIOCO.map((m) => ({ chiave: m.numero, nome: m.nome }))} onCambia={cambiaMese} />
    </span>
  );
}

/** Un numero che si muove con più e meno: niente da digitare. */
function Contatore({ etichetta, valore, min, max, passo = 1, onCambia, disabilitato }: { etichetta: string; valore: number; min: number; max: number; passo?: number; onCambia: (v: number) => void; disabilitato?: boolean }) {
  return (
    <span className="condizione-numero" role="group" aria-label={etichetta}>
      <button type="button" className="touch" aria-label={`${etichetta}: meno`} disabled={disabilitato || valore - passo < min} onClick={() => onCambia(Math.max(min, valore - passo))}><IconaAzione chiave="meno" dimensione={16} /></button>
      <span className="condizione-numero__valore" aria-live="polite">{valore}</span>
      <button type="button" className="touch" aria-label={`${etichetta}: più`} disabled={disabilitato || valore + passo > max} onClick={() => onCambia(Math.min(max, valore + passo))}><IconaAzione chiave="piu" dimensione={16} /></button>
    </span>
  );
}

function Campo({ campo, valori, onCambia, elenchi, disabilitato }: { campo: CampoCondizione; valori: ValoriCondizione; onCambia: (nome: string, v: string | number | string[]) => void; elenchi: Elenchi; disabilitato?: boolean }) {
  const v = valori[campo.nome];
  switch (campo.tipo) {
    case 'data': return <SelettoreData etichetta={campo.etichetta} valore={typeof v === 'string' ? v : '04-18'} onCambia={(x) => onCambia(campo.nome, x)} disabilitato={disabilitato} />;
    case 'giorni': {
      const scelti = Array.isArray(v) ? v : [];
      return (
        <span className="condizione-giorni" role="group" aria-label={campo.etichetta}>
          {GIORNI_SETTIMANA.map((g) => (
            <label key={g.chiave} className={`chip chip--icona touch ${scelti.includes(g.chiave) ? 'chip--attivo' : ''}`}>
              <input type="checkbox" className="sr-only" disabled={disabilitato} checked={scelti.includes(g.chiave)} onChange={(e) => onCambia(campo.nome, e.target.checked ? [...scelti, g.chiave] : scelti.filter((x) => x !== g.chiave))} />
              {g.nome.slice(0, 3)}
            </label>
          ))}
        </span>
      );
    }
    case 'rango5': return <Contatore etichetta={campo.etichetta} valore={typeof v === 'number' ? v : 1} min={1} max={5} onCambia={(x) => onCambia(campo.nome, x)} disabilitato={disabilitato} />;
    case 'rango10': return <Contatore etichetta={campo.etichetta} valore={typeof v === 'number' ? v : 1} min={1} max={10} onCambia={(x) => onCambia(campo.nome, x)} disabilitato={disabilitato} />;
    case 'volte': return <Contatore etichetta={campo.etichetta} valore={typeof v === 'number' ? v : 1} min={1} max={999} onCambia={(x) => onCambia(campo.nome, x)} disabilitato={disabilitato} />;
    case 'almeno': return <Contatore etichetta={campo.etichetta} valore={typeof v === 'number' ? v : 1} min={1} max={9999} onCambia={(x) => onCambia(campo.nome, x)} disabilitato={disabilitato} />;
    case 'punti': return <Contatore etichetta={campo.etichetta} valore={typeof v === 'number' ? v : 50} min={10} max={999990} passo={10} onCambia={(x) => onCambia(campo.nome, x)} disabilitato={disabilitato} />;
    default: return <Selettore ricerca="sempre" etichetta={campo.etichetta} valore={typeof v === 'string' ? v : ''} opzioni={opzioniPer(campo.tipo, elenchi)} onCambia={(x) => onCambia(campo.nome, x)} disabilitato={disabilitato} />;
  }
}

const OPZIONI_STATO: OpzioneRicerca[] = STATI_PARTITA.map((s) => ({ chiave: s.chiave, nome: s.nome, gruppo: s.gruppo }));

/** Una condizione semplice: stato, operatore, valori. Ogni cambio produce subito la condizione nuova. */
function Riga({ condizione, negata, onCambia, onRimuovi, elenchi, nomi, disabilitato, perSpillo }: { condizione: RequisitoSpillo; negata: boolean; onCambia: (c: RequisitoSpillo) => void; onRimuovi: () => void; elenchi: Elenchi; nomi: NomiCondizioni; disabilitato?: boolean; perSpillo?: boolean }) {
  const salvata = scomponiCondizione(condizione) ?? { stato: 'data-gioco', operatore: 'dal', valori: { dal: '04-18' } };
  const def = definizioneStato(salvata.stato) ?? STATI_PARTITA[0];
  // L'operatore scelto vive anche qui: «tra il 18 aprile e il 18 aprile» e «solo il 18 aprile» sono
  // la stessa condizione salvata, ma chi ha appena scelto «tra» deve vedere i due campi.
  const [opScelto, setOpScelto] = useState<string | null>(null);
  const operatore = def.operatori.find((o) => o.chiave === (opScelto ?? salvata.operatore)) ?? def.operatori[0];
  // I campi dell'operatore in uso che la condizione salvata non ha (l'«al» di un «tra» appena scelto) partono dal valore che c'è.
  const valoriBase = valoriIniziali(operatore.campi, elenchi);
  if (operatore.chiave === 'tra' && typeof salvata.valori.dal === 'string' && salvata.valori.al === undefined) valoriBase.al = salvata.valori.dal;
  const scelta: SceltaCondizione = { stato: salvata.stato, operatore: operatore.chiave, valori: { ...valoriBase, ...salvata.valori } };
  const avvolgi = (c: RequisitoSpillo): RequisitoSpillo => (negata ? { tipo: 'non', condizione: c } : c);
  const applica = (s: SceltaCondizione) => { const c = costruisciCondizione(s); if (c) onCambia(avvolgi(c)); };
  const cambiaStato = (chiave: string) => {
    const d = definizioneStato(chiave); if (!d) return;
    const op = d.operatori[0];
    setOpScelto(null);
    applica({ stato: d.chiave, operatore: op.chiave, valori: valoriIniziali(op.campi, elenchi) });
  };
  const cambiaOperatore = (chiave: string) => {
    const op = def.operatori.find((o) => o.chiave === chiave); if (!op) return;
    setOpScelto(op.chiave);
    // i valori già scelti restano se il nuovo operatore ha gli stessi campi (dal → tra tiene «dal»)
    applica({ stato: def.chiave, operatore: op.chiave, valori: { ...valoriIniziali(op.campi, elenchi), ...Object.fromEntries(Object.entries(scelta.valori).filter(([k]) => op.campi.some((c) => c.nome === k))) } });
  };
  const cambiaValore = (nome: string, v: string | number | string[]) => {
    const valori = { ...scelta.valori, [nome]: v };
    // Un periodo resta sempre valido: se l'inizio supera la fine, la fine lo segue (e viceversa).
    if (def.chiave === 'data-gioco' && operatore.chiave === 'tra' && typeof valori.dal === 'string' && typeof valori.al === 'string' && ordineGioco(valori.dal) > ordineGioco(valori.al)) {
      if (nome === 'dal') valori.al = valori.dal; else valori.dal = valori.al;
    }
    applica({ ...scelta, valori });
  };
  const testo = descriviRequisitoSpillo(condizione, nomi);
  return (
    <div className={`condizione-riga ${negata ? 'condizione-riga--negata' : ''}`} role="group" aria-label={`Condizione: ${negata ? 'non ' : ''}${testo}`}>
      <button type="button" className={`condizione-non touch ${negata ? 'condizione-non--attivo' : ''}`} aria-pressed={negata} disabled={disabilitato} title={negata ? 'Negata: vale quando NON è così' : 'Nega questa condizione'} onClick={() => onCambia(negata ? condizione : { tipo: 'non', condizione })}>NON</button>
      <Selettore etichetta="Stato" valore={def.chiave} opzioni={OPZIONI_STATO} onCambia={cambiaStato} disabilitato={disabilitato} className="condizione-stato" />
      {def.operatori.length > 1
        ? <Selettore compatto className="condizione-operatore" etichetta="Operatore" valore={operatore.chiave} disabilitato={disabilitato} opzioni={def.operatori.map((o) => ({ chiave: o.chiave, nome: o.nome }))} onCambia={cambiaOperatore} />
        : <span className="condizione-operatore condizione-operatore--fisso">{operatore.nome}</span>}
      {operatore.campi.map((c) => <Campo key={c.nome} campo={c} valori={scelta.valori} onCambia={cambiaValore} elenchi={elenchi} disabilitato={disabilitato} />)}
      {perSpillo && nascondeIlPin(condizione.tipo) && <span className="condizione-presenza" title="Se non vale, lo spillo sparisce dalla mappa" aria-label="Condizione di presenza: se non vale, lo spillo sparisce dalla mappa">presenza</span>}
      <span className="condizione-origine" title={`Si legge da: ${def.origine}`}>{def.origine}</span>
      <button type="button" className="condizione-togli touch" aria-label={`Togli la condizione: ${testo}`} title="Togli" disabled={disabilitato} onClick={onRimuovi}><IconaAzione chiave="chiudi" dimensione={16} /></button>
    </div>
  );
}

interface PropsBlocco { condizioni: RequisitoSpillo[]; modo: 'tutte' | 'almeno-una'; onCambia: (c: RequisitoSpillo[]) => void; onCambiaModo?: (m: 'tutte' | 'almeno-una') => void; negato?: boolean; onNega?: () => void; onRimuovi?: () => void; profondita: number; elenchi: Elenchi; nomi: NomiCondizioni; disabilitato?: boolean; perSpillo?: boolean }

/** Un gruppo E/O con le sue righe e i suoi sottogruppi. Al primo livello è il TUTTE implicito. */
function Blocco({ condizioni, modo, onCambia, onCambiaModo, negato, onNega, onRimuovi, profondita, elenchi, nomi, disabilitato, perSpillo }: PropsBlocco) {
  const sostituisci = (i: number, c: RequisitoSpillo) => onCambia(condizioni.map((v, j) => (j === i ? c : v)));
  const rimuovi = (i: number) => onCambia(condizioni.filter((_, j) => j !== i));
  const aggiungi = (c: RequisitoSpillo) => onCambia([...condizioni, c]);
  const radice = profondita === 0;
  const pieno = condizioni.length >= 20;
  return (
    <div className={`condizioni-blocco condizioni-blocco--${modo} ${negato ? 'condizioni-blocco--negato' : ''} ${radice ? 'condizioni-blocco--radice' : ''}`} role="group" aria-label={radice ? 'Elenco delle condizioni' : `Gruppo ${negato ? 'NON ' : ''}${MODO_NOME[modo]}`}>
      <div className="condizioni-blocco__testa">
        {!radice && onNega && <button type="button" className={`condizione-non touch ${negato ? 'condizione-non--attivo' : ''}`} aria-pressed={negato} disabled={disabilitato} title={negato ? 'Gruppo negato' : 'Nega il gruppo'} onClick={onNega}>NON</button>}
        {onCambiaModo
          ? <button type="button" className="condizioni-blocco__modo touch" disabled={disabilitato} title={`Cambia in ${MODO_NOME[modo === 'tutte' ? 'almeno-una' : 'tutte']}`} onClick={() => onCambiaModo(modo === 'tutte' ? 'almeno-una' : 'tutte')}>{MODO_NOME[modo]}<span className="condizioni-blocco__spiega">{MODO_SPIEGA[modo]}</span></button>
          : <span className="condizioni-blocco__modo condizioni-blocco__modo--fisso">{MODO_NOME[modo]}<span className="condizioni-blocco__spiega">{condizioni.length === 0 ? 'nessuna condizione: sempre disponibile' : MODO_SPIEGA[modo]}</span></span>}
        {onRimuovi && <button type="button" className="condizione-togli touch" aria-label="Togli il gruppo" disabled={disabilitato} onClick={onRimuovi}><IconaAzione chiave="chiudi" dimensione={16} /></button>}
      </div>
      <div className="condizioni-blocco__corpo">
        {condizioni.map((c, i) => {
          const negata = c.tipo === 'non';
          const dentro = negata ? c.condizione : c;
          if (dentro.tipo === 'gruppo') {
            const g = dentro;
            const scrivi = (nuovo: RequisitoSpillo) => sostituisci(i, negata ? { tipo: 'non', condizione: nuovo } : nuovo);
            return <Blocco key={`${i}:gruppo`} condizioni={g.condizioni} modo={g.modo} onCambia={(cs) => (cs.length ? scrivi({ ...g, condizioni: cs }) : rimuovi(i))} onCambiaModo={(m) => scrivi({ ...g, modo: m })} negato={negata} onNega={() => sostituisci(i, negata ? g : { tipo: 'non', condizione: g })} onRimuovi={() => rimuovi(i)} profondita={profondita + 1} elenchi={elenchi} nomi={nomi} disabilitato={disabilitato} perSpillo={perSpillo} />;
          }
          return <Riga key={i} condizione={dentro} negata={negata} onCambia={(nuova) => sostituisci(i, nuova)} onRimuovi={() => rimuovi(i)} elenchi={elenchi} nomi={nomi} disabilitato={disabilitato} perSpillo={perSpillo} />;
        })}
      </div>
      <div className="condizioni-blocco__azioni">
        <button type="button" className="btn btn-sm touch" disabled={disabilitato || pieno} onClick={() => aggiungi(NUOVA)}><IconaAzione chiave="piu" dimensione={14} /> condizione</button>
        {profondita < 4 && <>
          <button type="button" className="btn btn-sm touch" disabled={disabilitato || pieno} onClick={() => aggiungi({ tipo: 'gruppo', modo: 'tutte', condizioni: [NUOVA] })}><IconaAzione chiave="piu" dimensione={14} /> gruppo TUTTE</button>
          <button type="button" className="btn btn-sm touch" disabled={disabilitato || pieno} onClick={() => aggiungi({ tipo: 'gruppo', modo: 'almeno-una', condizioni: [NUOVA] })}><IconaAzione chiave="piu" dimensione={14} /> gruppo ALMENO UNA</button>
        </>}
      </div>
    </div>
  );
}

interface Props { condizioni: RequisitoSpillo[]; onCambia: (r: RequisitoSpillo[]) => void; elenchi?: ElenchiCondizioni; disabilitato?: boolean; /** Nell'editor delle mappe: segna le condizioni di presenza, che nascondono il pin. */ perSpillo?: boolean }

export function CondizioniEditor({ condizioni, onCambia, elenchi, disabilitato, perSpillo }: Props) {
  const dati = useCarica(async () => {
    const [extra, base] = await Promise.all([
      getElenchiRegole(),
      elenchi ? Promise.resolve(elenchi) : Promise.all([getConfidenti(), getQuartieri(), getRichieste(), getDungeons()]).then(([confidenti, quartieri, richieste, dungeon]) => ({ confidenti, quartieri, richieste: richieste.richieste, dungeon })),
    ]);
    return { extra, base } as Elenchi;
  }, []);
  const [aperto, setAperto] = useState(condizioni.length > 0);
  const nomi = useMemo<NomiCondizioni>(() => {
    if (!dati.dati) return {};
    const e = dati.dati;
    const mappa = (o: Array<{ chiave: string; nome: string }>) => Object.fromEntries(o.map((x) => [x.chiave, x.nome]));
    return { ...nomiDaElenchi(e.base ?? ELENCHI_VUOTI), articoli: mappa(e.extra.articoli), letture: mappa(e.extra.letture), attivita: mappa(e.extra.attivita), negozi: mappa(e.extra.negozi), squadra: mappa(e.extra.squadra) };
  }, [dati.dati]);
  return (
    <fieldset disabled={disabilitato} className="condizioni-editor">
      <legend className="condizioni-editor__titolo">
        <button type="button" className="touch" aria-expanded={aperto || condizioni.length > 0} onClick={() => setAperto((v) => !v)}>
          Condizioni
          <span className="condizioni-editor__conteggio">{condizioni.length === 0 ? 'nessuna: sempre disponibile' : `${condizioni.length} di primo livello`}</span>
        </button>
      </legend>
      {(aperto || condizioni.length > 0) && (dati.errore
        ? <p role="alert" className="m-0 text-[13px]">{dati.errore} <button type="button" className="btn btn-sm touch" onClick={() => void dati.ricarica()}>Riprova</button></p>
        : dati.dati
          ? <Blocco condizioni={condizioni} modo="tutte" onCambia={onCambia} profondita={0} elenchi={dati.dati} nomi={nomi} disabilitato={disabilitato} perSpillo={perSpillo} />
          : <p className="m-0 text-[13px] text-text-muted">Caricamento degli elenchi…</p>)}
    </fieldset>
  );
}
