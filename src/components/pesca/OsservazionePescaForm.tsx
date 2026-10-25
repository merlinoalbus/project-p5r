import { useEffect, useState } from 'react';
import type { OsservazionePesca, SpeciePesca } from '../../../shared/pesca';
import { getFortuna } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { usePartitaStore } from '../../stores/partitaStore';
import { fortunaDelConsumo } from '../../utils/fortunaConsumo';
import { Selettore } from '../shared/Selettore';
import { MeteoOsservatoPesca, NumeroOsservatoPesca, RangoPeriziaOsservato, SceltaOsservata } from './CampiPesca';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

const id = () => crypto.randomUUID().replaceAll('-', '');
const SPECIE: Array<{ chiave: SpeciePesca; nome: string }> = [
  { chiave: 'guardiano', nome: 'Guardiano di Ichigaya' }, { chiave: 'boss', nome: 'Boss di Ichigaya' }, { chiave: 'altro', nome: 'Altro pesce' },
];

/** Dati osservati della visita: nessun premio, cattura o rango è dedotto dal contatore. */
export function OsservazionePescaForm({ valore: o, onCambia, disabilitato = false, partitaId }: {
  valore: OsservazionePesca; onCambia: (v: OsservazionePesca) => void; disabilitato?: boolean;
  /** Con la partita, la Fortuna della Perizia si legge dal suo stato (`leggiFortuna`) invece di chiederla: per una nuova visita. */
  partitaId?: number;
}) {
  const [specie, setSpecie] = useState<SpeciePesca | ''>('');
  const cambia = (v: Partial<OsservazionePesca>) => onCambia({ ...o, ...v });
  const fortuna = useCarica(() => (partitaId === undefined ? Promise.resolve(null) : getFortuna(partitaId)), [partitaId]);
  const oggi = usePartitaStore((s) => (partitaId !== undefined && s.attiva?.id === partitaId ? s.attiva.dataGioco : null));
  // La Fortuna di quel giorno sulla Perizia: dallo stato della partita. Un valore già dichiarato non si riscrive mai.
  const dalloStato = partitaId === undefined ? null : fortunaDelConsumo(fortuna.dati, o.fortuna.giorno, 'perizia', oggi);
  useEffect(() => {
    if (!disabilitato && partitaId !== undefined && o.fortuna.attiva === null && dalloStato !== null) onCambia({ ...o, fortuna: { ...o.fortuna, attiva: dalloStato } });
  }, [disabilitato, partitaId, o, dalloStato, onCambia]);
  return <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0" disabled={disabilitato}>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <RangoPeriziaOsservato valore={o.rangoPeriziaOsservato} disabilitato={disabilitato}
        onCambia={r => cambia({ rangoPeriziaOsservato: r, provenienzaRango: r === null ? 'ignoto' : 'dichiarato' })} />
      <NumeroOsservatoPesca etichetta="Tentativi già consumati nella visita" valore={o.tentativiConsumati} massimo={7} disabilitato={disabilitato} onCambia={tentativiConsumati => cambia({ tentativiConsumati })} />
      <MeteoOsservatoPesca valore={o.meteo} disabilitato={disabilitato} onCambia={meteo => cambia({ meteo })} />
      <SceltaOsservata etichetta="Allerta ondata di gelo osservata" valore={o.allertaGelo} disabilitato={disabilitato} onCambia={allertaGelo => cambia({ allertaGelo })} />
      <SceltaOsservata etichetta="Boilie sospetto posseduto nella visita" valore={o.escaSpecialePosseduta} disabilitato={disabilitato} onCambia={escaSpecialePosseduta => cambia({ escaSpecialePosseduta })} />
      <SceltaOsservata etichetta="Terzo semestre già in corso nella visita" valore={o.faseTerzoSemestre} disabilitato={disabilitato} onCambia={faseTerzoSemestre => cambia({ faseTerzoSemestre })} />
    </div>
    <p className="m-0 testo-12 text-text-secondary">Lascia ignoti i dati che non hai osservato. Possedere o usare un’esca non registra un acquisto; il rango di oggi non ricostruisce quello di una visita passata.</p>
    <Selettore etichetta="Esiti delle catture" valore={o.catture === null ? 'ignoti' : 'osservati'} disabilitato={disabilitato}
      opzioni={[{ chiave: 'ignoti', nome: 'Non conosco gli esiti' }, { chiave: 'osservati', nome: 'Dichiaro gli esiti osservati' }]}
      onCambia={v => cambia({ catture: v === 'ignoti' ? null : [] })} />
    {o.catture !== null && <div className="flex min-w-0 flex-col gap-2 rounded border border-border p-2">
      {!o.catture.length && <p className="m-0">Nessuna cattura dichiarata per questa visita.</p>}
      <ul className="m-0 flex min-w-0 list-none flex-col gap-3 p-0">{o.catture.map(c => <li key={c.id} className="flex min-w-0 flex-col gap-2 border-b border-border pb-2">
        <Selettore etichetta="Pesce catturato" valore={c.specie} opzioni={SPECIE} disabilitato={disabilitato}
          onCambia={v => cambia({ catture: o.catture!.map(x => x.id === c.id ? { ...x, specie: v as SpeciePesca } : x) })} />
        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
          <NumeroOsservatoPesca etichetta="Numero del tentativo della cattura" valore={c.tentativo} minimo={1} massimo={7} disabilitato={disabilitato}
            onCambia={tentativo => cambia({ catture: o.catture!.map(x => x.id === c.id ? { ...x, tentativo } : x) })} />
          <NumeroOsservatoPesca etichetta="Posizione nell’ordine osservato della visita" valore={c.posizione} disabilitato={disabilitato}
            onCambia={posizione => cambia({ catture: o.catture!.map(x => x.id === c.id ? { ...x, posizione } : x) })} />
        </div>
        <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli questa cattura dalla dichiarazione" className="self-start" disabled={disabilitato} onClick={() => cambia({ catture: o.catture!.filter(x => x.id !== c.id) })} />
      </li>)}</ul>
      <div className="flex min-w-0 flex-wrap items-end gap-2">
        <Selettore etichetta="Cattura da aggiungere" valore={specie} vuoto="Scegli il pesce osservato" opzioni={SPECIE} disabilitato={disabilitato} onCambia={v => setSpecie(v as SpeciePesca | '')} />
        <PulsanteVisivo icona={<IconaAzione chiave="piu" dimensione={22} />} titolo="Aggiungi la cattura" disabled={disabilitato || !specie} onClick={() => {
          if (!specie) return;
          cambia({ catture: [...o.catture!, { id: id(), specie, tentativo: null, posizione: null }] }); setSpecie('');
        }} />
      </div>
    </div>}
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <SceltaOsservata etichetta="Quota d’ingresso effettivamente pagata" valore={o.quota.pagata} disabilitato={disabilitato} onCambia={pagata => cambia({ quota: { pagata } })} />
      <Selettore etichetta="Come è terminata la visita" valore={o.finale.tipo} disabilitato={disabilitato}
        opzioni={[{ chiave: 'ignoto', nome: 'Non lo so' }, { chiave: 'uscita-dopo-riscossione', nome: 'Uscita dopo la riscossione finale' }, { chiave: 'uscita-senza-riscossione', nome: 'Uscita senza riscossione finale' }]}
        onCambia={v => cambia({ finale: { ...o.finale, tipo: v as OsservazionePesca['finale']['tipo'], riscossioneUid: v === 'uscita-dopo-riscossione' ? o.finale.riscossioneUid ?? id() : null } })} />
      <SceltaOsservata etichetta="Hai ripreso a pescare dopo una riscossione?" valore={o.finale.ripresaDopoRiscossione} disabilitato={disabilitato}
        onCambia={ripresaDopoRiscossione => cambia({ finale: { ...o.finale, ripresaDopoRiscossione } })} />
      <Selettore etichetta="Beneficio Perizia effettivamente riconosciuto" valore={o.perizia.esito} disabilitato={disabilitato}
        opzioni={[{ chiave: 'ignota', nome: 'Non lo so' }, { chiave: 'ricevuta', nome: 'Ricevuto' }, { chiave: 'non-ricevuta', nome: 'Non ricevuto' }]}
        onCambia={v => cambia({ perizia: { esito: v as OsservazionePesca['perizia']['esito'] } })} />
      {partitaId === undefined
        ? <SceltaOsservata etichetta="Fortuna sulla Perizia attiva nella data della visita" valore={o.fortuna.attiva} disabilitato={disabilitato}
          onCambia={attiva => cambia({ fortuna: { ...o.fortuna, attiva } })} />
        : <p className="m-0 testo-13">Fortuna sulla Perizia in quel giorno: <strong>{o.fortuna.attiva === null ? 'non nota (la partita non la ricorda)' : o.fortuna.attiva ? 'accesa' : 'non accesa'}</strong>. La leggo dalla partita, non devi dirmela.</p>}
    </div>
    <p className="m-0 testo-12 text-text-secondary">Una cattura non prova il beneficio finale. Le Doti si applicano dal pulsante sulla voce; nessun saldo cambia con questa sola dichiarazione.</p>
  </fieldset>;
}
