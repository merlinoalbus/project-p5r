// ============================================================
// CondizioniSpillo — condizioni di visibilità di uno spillo: elenco con semafori nel visore e costruttore nell'editor (Fase 15.22)
// ============================================================
//
// Nel visore, con una partita attiva, ogni condizione porta il semaforo del server (verde/rosso); senza partita si legge il testo.
// Nell'editor il costruttore offre solo condizioni calcolabili dall'app: tipo scelto da un elenco, parametri da selettori (mai testo
// libero), così non si possono inserire condizioni che l'app non saprebbe valutare.
// ============================================================

import { useState } from 'react';
import type { CondizioneSpilloDto, DisponibilitaDto, SemaforoRequisitoDto } from '../../types';
import { DOTI_CONDIZIONE, GIORNI_NEL_MESE, GIORNI_SETTIMANA, MESI_GIOCO, PALAZZI_CONDIZIONE, SCELTE_CONDIZIONE, STAGIONI, dataSbloccoQuartiere, dataValida, descriviRequisitoSpillo, ordineGioco, type RequisitoSpillo, type SceltaCondizione } from '../../../shared/condizioniSpillo';
import { nomiDaElenchi, type ElenchiCondizioni } from '../../utils/condizioniSpillo';
import { IconaAzione } from '../shared/IconaAzione';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';

const COLORE: Record<SemaforoRequisitoDto['stato'], string> = { verde: 'bg-success', rosso: 'bg-error', grigio: 'bg-text-muted' };
const NOME_STATO: Record<SemaforoRequisitoDto['stato'], string> = { verde: 'soddisfatta', rosso: 'non soddisfatta', grigio: 'non verificabile' };

/** Condizioni dello spillo nel visore: con la partita i semafori del server, altrimenti il solo testo. */
export function CondizioniSpilloElenco({ condizioni, disponibilita, compatto }: { condizioni: CondizioneSpilloDto[]; disponibilita?: DisponibilitaDto; compatto?: boolean }) {
  if (condizioni.length === 0) return null;
  const testo = compatto ? 'text-[11px]' : 'text-[12px]';
  return (
    <div className={`flex flex-col gap-0.5 ${testo}`} role="group" aria-label="Condizioni di visibilità">
      <span className="flex items-center gap-1 text-text-muted uppercase tracking-wide text-[10px]"><IconaAzione chiave="bloccato" dimensione={12} />Visibile solo</span>
      <ul className="m-0 p-0 list-none flex flex-col gap-0.5">
        {condizioni.map((c, i) => {
          const esito = disponibilita?.requisiti[i];
          return (
            <li key={`${c.tipo}-${i}`} className="flex items-start gap-1.5">
              {esito && <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${COLORE[esito.stato]}`} role="img" aria-label={`Condizione ${NOME_STATO[esito.stato]}`} title={NOME_STATO[esito.stato]} />}
              <span className="min-w-0 flex-1">
                <span className="block">{c.testo}</span>
                {esito && esito.stato !== 'verde' && <span className="block text-text-muted">{esito.dettaglio}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Giorno e mese del calendario di gioco; i giorni offerti sono quelli del mese scelto (niente 31 aprile). */
function SelettoreData({ etichetta, valore, onCambia }: { etichetta: string; valore: string; onCambia: (v: string) => void }) {
  const [mese, giorno] = valore.split('-');
  const giorni = Array.from({ length: GIORNI_NEL_MESE[mese] ?? 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  const cambiaMese = (nuovoMese: string) => {
    const massimo = GIORNI_NEL_MESE[nuovoMese] ?? 31;
    onCambia(`${nuovoMese}-${String(Math.min(Number(giorno), massimo)).padStart(2, '0')}`);
  };
  return (
    <span className="flex gap-1 items-center">
      <select className="form-input" value={giorno} onChange={(e) => onCambia(`${mese}-${e.target.value}`)} aria-label={`${etichetta}: giorno`}>
        {giorni.map((g) => <option key={g} value={g}>{Number(g)}</option>)}
      </select>
      <select className="form-input" value={mese} onChange={(e) => cambiaMese(e.target.value)} aria-label={`${etichetta}: mese`}>
        {MESI_GIOCO.map((m) => <option key={m.numero} value={m.numero}>{m.nome}</option>)}
      </select>
    </span>
  );
}

interface PropsEditor {
  condizioni: RequisitoSpillo[];
  onCambia: (condizioni: RequisitoSpillo[]) => void;
  elenchi: ElenchiCondizioni;
  disabilitato?: boolean;
}

/** Costruttore delle condizioni nell'editor: elenco con rimozione e aggiunta guidata per tipo. */
export function CondizioniSpilloEditor({ condizioni, onCambia, elenchi, disabilitato }: PropsEditor) {
  const [scelta, setScelta] = useState<SceltaCondizione>('data');
  const [dal, setDal] = useState('04-18');
  const [al, setAl] = useState('04-18');
  const [dungeon, setDungeon] = useState(PALAZZI_CONDIZIONE[0].chiave as string);
  const [dote, setDote] = useState<string>(DOTI_CONDIZIONE[0].chiave);
  const [rangoDote, setRangoDote] = useState(2);
  const [confidente, setConfidente] = useState('');
  const [rangoConfidente, setRangoConfidente] = useState(1);
  const [richiesta, setRichiesta] = useState('');
  const [giorni, setGiorni] = useState<string[]>(['domenica']);
  const [stagione, setStagione] = useState<string>(STAGIONI[0].chiave);
  const [quartiere, setQuartiere] = useState('');
  const nomi = nomiDaElenchi(elenchi);
  const palazzi = elenchi.dungeon.filter((d) => d.tipo === 'palazzo');
  // solo i quartieri con una data di sblocco nella Guida: gli altri (Confidenti, libri) l'app non saprebbe valutarli
  const quartieriDatati = elenchi.quartieri.filter((q) => dataSbloccoQuartiere(q.sblocco) !== null);
  const confidenteScelto = confidente || elenchi.confidenti[0]?.chiave || '';
  const richiestaScelta = richiesta || elenchi.richieste[0]?.chiave || '';
  const quartiereScelto = quartieriDatati.some((q) => q.chiave === quartiere) ? quartiere : quartieriDatati[0]?.chiave || '';

  // il periodo segue il calendario di gioco (aprile → marzo): la fine non può precedere l'inizio
  const periodoInvertito = scelta === 'intervallo' && dataValida(dal) && dataValida(al) && ordineGioco(dal) > ordineGioco(al);
  const costruisci = (): RequisitoSpillo | null => {
    switch (scelta) {
      case 'data': return dataValida(dal) ? { tipo: 'data', dal } : null;
      case 'intervallo': return dataValida(dal) && dataValida(al) && !periodoInvertito ? { tipo: 'intervallo', dal, al } : null;
      case 'palazzo': return { tipo: 'palazzo', dungeon };
      case 'dote': return { tipo: 'dote', dote, rango: rangoDote };
      case 'confidente': return confidenteScelto ? { tipo: 'confidente', confidente: confidenteScelto, rango: rangoConfidente } : null;
      case 'richiesta': return richiestaScelta ? { tipo: 'richiesta', richiesta: richiestaScelta } : null;
      case 'piove': return { tipo: 'piove' };
      case 'non-piove': return { tipo: 'meteo', condizione: 'non-piove' };
      case 'fascia-giorno': return { tipo: 'fascia', fascia: 'giorno' };
      case 'fascia-sera': return { tipo: 'fascia', fascia: 'sera' };
      case 'giorno-settimana': return giorni.length > 0 && giorni.length < 7 ? { tipo: 'giorno-settimana', giorni: GIORNI_SETTIMANA.map((g) => g.chiave).filter((g) => giorni.includes(g)) } : null;
      case 'stagione': return { tipo: 'stagione', stagione };
      case 'quartiere': return quartiereScelto ? { tipo: 'quartiere', quartiere: quartiereScelto } : null;
    }
  };
  const nuova = costruisci();
  const doppione = nuova !== null && condizioni.some((c) => JSON.stringify(c) === JSON.stringify(nuova));
  const aggiungi = () => { if (nuova && !doppione) onCambia([...condizioni, nuova]); };

  return (
    <fieldset className="m-0 p-0 border-0 flex flex-col gap-1.5" disabled={disabilitato}>
      <legend className="text-[12px] text-text-secondary">Condizioni di visibilità</legend>
      {condizioni.length === 0
        ? <span className="text-[12px] text-text-muted">Nessuna condizione: lo spillo è sempre visibile.</span>
        : (
          <ul className="m-0 p-0 list-none flex flex-col gap-1" aria-label="Condizioni dello spillo">
            {condizioni.map((c, i) => (
              <li key={`${c.tipo}-${i}`} className="flex items-center gap-2 text-[12px]">
                <span className="chip chip--bloccata flex-1 min-w-0 truncate">{descriviRequisitoSpillo(c, nomi)}</span>
                <button type="button" className="visore-mappa__azione-testo touch" onClick={() => onCambia(condizioni.filter((_, j) => j !== i))} aria-label={`Togli la condizione: ${descriviRequisitoSpillo(c, nomi)}`}>Togli</button>
              </li>
            ))}
          </ul>
        )}
      <div className="flex flex-col gap-1 editor-mappa__condizione">
        <label className="editor-mappa__campo">Nuova condizione
          <select className="form-input" value={scelta} onChange={(e) => setScelta(e.target.value as SceltaCondizione)}>
            {SCELTE_CONDIZIONE.map((s) => <option key={s.chiave} value={s.chiave}>{s.nome}</option>)}
          </select>
        </label>
        {(scelta === 'data' || scelta === 'intervallo') && <SelettoreData etichetta="Dal" valore={dal} onCambia={setDal} />}
        {scelta === 'intervallo' && <SelettoreData etichetta="Al" valore={al} onCambia={setAl} />}
        {scelta === 'palazzo' && (
          <select className="form-input" value={dungeon} onChange={(e) => setDungeon(e.target.value)} aria-label="Palazzo">
            {(palazzi.length > 0 ? palazzi : PALAZZI_CONDIZIONE).map((p) => <option key={p.chiave} value={p.chiave}>{p.nome}</option>)}
          </select>
        )}
        {scelta === 'dote' && (
          <span className="flex gap-1">
            <select className="form-input" value={dote} onChange={(e) => setDote(e.target.value)} aria-label="Dote">
              {DOTI_CONDIZIONE.map((d) => <option key={d.chiave} value={d.chiave}>{d.nome}</option>)}
            </select>
            <select className="form-input w-auto" value={rangoDote} onChange={(e) => setRangoDote(Number(e.target.value))} aria-label="Rango della Dote">
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Rango {n}</option>)}
            </select>
          </span>
        )}
        {scelta === 'confidente' && (
          <span className="flex gap-1">
            <select className="form-input" value={confidenteScelto} onChange={(e) => setConfidente(e.target.value)} aria-label="Confidente">
              {elenchi.confidenti.map((c) => <option key={c.chiave} value={c.chiave}>{c.nome}</option>)}
            </select>
            <select className="form-input w-auto" value={rangoConfidente} onChange={(e) => setRangoConfidente(Number(e.target.value))} aria-label="Rango del Confidente">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Rango {n}</option>)}
            </select>
          </span>
        )}
        {scelta === 'richiesta' && (
          <select className="form-input" value={richiestaScelta} onChange={(e) => setRichiesta(e.target.value)} aria-label="Richiesta dei Mementos">
            {elenchi.richieste.map((r) => <option key={r.chiave} value={r.chiave}>{r.nome}</option>)}
          </select>
        )}
        {scelta === 'giorno-settimana' && (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Giorni della settimana">
            {GIORNI_SETTIMANA.map((g) => (
              <label key={g.chiave} className={`chip chip--icona touch ${giorni.includes(g.chiave) ? 'chip--attivo' : ''}`}>
                <input type="checkbox" className="sr-only" checked={giorni.includes(g.chiave)} onChange={(e) => setGiorni((prev) => (e.target.checked ? [...prev, g.chiave] : prev.filter((x) => x !== g.chiave)))} />
                {g.nome}
              </label>
            ))}
          </div>
        )}
        {scelta === 'stagione' && (
          <select className="form-input" value={stagione} onChange={(e) => setStagione(e.target.value)} aria-label="Stagione">
            {STAGIONI.map((s) => <option key={s.chiave} value={s.chiave}>{s.nome}</option>)}
          </select>
        )}
        {scelta === 'quartiere' && (
          <select className="form-input" value={quartiereScelto} onChange={(e) => setQuartiere(e.target.value)} aria-label="Quartiere">
            {quartieriDatati.map((q) => <option key={q.chiave} value={q.chiave}>{q.nome} · {descriviRequisitoSpillo({ tipo: 'data', dal: dataSbloccoQuartiere(q.sblocco)! })}</option>)}
          </select>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="carica-altri" dimensione={20} />} titolo="Aggiungi condizione" dettaglio={nuova ? descriviRequisitoSpillo(nuova, nomi) : 'scegli i valori'} disabled={disabilitato || !nuova || doppione} onClick={aggiungi} />
          {doppione && <span className="text-[11px] text-text-muted">Condizione già presente.</span>}
          {periodoInvertito && <span className="text-[11px] text-text-muted">La data di fine precede quella di inizio: il calendario di gioco va da aprile a marzo.</span>}
        </div>
      </div>
    </fieldset>
  );
}
