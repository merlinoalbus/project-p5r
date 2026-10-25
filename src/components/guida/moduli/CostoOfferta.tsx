import { Link } from 'react-router-dom';
import { LIMITI_COSTO_OGGETTO, normalizzaCostoScambio } from '../../../../shared/catalogo';
import { SceltaNelCatalogo, type StatoSceltaCatalogo } from '../../catalogo/SceltaCatalogoOggetto';
import { Selettore } from '../../shared/Selettore';
import { jsonDi, testoDi, type Dati } from './base';
import { Campo } from './campi';
import { PulsanteVisivo } from '../../shared/PulsanteVisivo';
import { IconaAzione } from '../../shared/IconaAzione';

interface Props { dati: Dati; imposta: (patch: Dati) => void; disabilitato: boolean; catalogo: StatoSceltaCatalogo }
interface ComponenteCosto { chiave: string; quantita: number | null }

/** I componenti si aggiungono per chiave; una modifica della sola nota non riscrive il costo. */
export function CostoOfferta({ dati, imposta, disabilitato, catalogo }: Props) {
  const tipo = testoDi(dati._tipoCosto);
  const originaleIlleggibile = dati._costoIniziale != null && !normalizzaCostoScambio(dati._costoIniziale);
  const raw = jsonDi<Record<string, unknown> | null>(dati.costo_json, null);
  const righe = Array.isArray(raw?.oggetti) ? raw.oggetti as ComponenteCosto[] : [];
  const modifica = (costo: unknown) => imposta({ costo_json: costo, _costoModificato: true });
  const opzioni = [{ chiave: 'yen', nome: 'Yen' }, { chiave: 'fiori', nome: 'Fiori' }, { chiave: 'oggetti', nome: 'Oggetti da cedere' },
    ...(originaleIlleggibile ? [{ chiave: 'non-leggibile', nome: 'Conserva il costo salvato non leggibile' }] : [])];
  return <fieldset disabled={disabilitato} className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
    <legend className="mb-2 testo-14 font-semibold">Costo dell’offerta</legend>
    <Selettore etichetta="Come si paga" valore={tipo} opzioni={opzioni} ricerca="mai" disabilitato={disabilitato} onCambia={(v) => {
      if (v === 'non-leggibile') imposta({ _tipoCosto: v, costo_json: dati._costoIniziale, _costoModificato: false });
      else if (v === 'yen' || v === 'fiori' || v === 'oggetti') imposta({ _tipoCosto: v, _costoModificato: true,
        costo_json: v === 'yen' ? null : v === 'fiori' ? { tipo: v, importo: null } : { tipo: v, oggetti: [] } });
    }} />
    {tipo === 'yen' && <Campo nome="prezzo" etichetta="Prezzo in yen" tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} aiuto="Vuoto = costo non indicato; zero = gratis" />}
    {tipo === 'fiori' && <label className="editor-mappa__campo">Fiori da cedere
      <input className="form-input" type="number" min={0} max={LIMITI_COSTO_OGGETTO.fiori} step={1} value={testoDi(raw?.importo)} disabled={disabilitato}
        onChange={(e) => modifica({ tipo: 'fiori', importo: e.target.value === '' ? null : Number(e.target.value) })} />
    </label>}
    {tipo === 'oggetti' && <>
      {righe.map((r, indice) => {
        const oggetto = catalogo.oggetti?.find((o) => o.chiave === r.chiave);
        return <div key={r.chiave} className="flex min-w-0 flex-wrap items-end gap-2 border border-border p-2">
          <div className="min-w-0 flex-1 testo-13">{oggetto
            ? <Link className="touch inline-flex items-center" to={oggetto.casa}>{oggetto.nome}</Link>
            : <span>{catalogo.caricamento ? 'Caricamento dell’oggetto…' : 'Oggetto non disponibile nel catalogo: il riferimento salvato resta invariato'}</span>}</div>
          <label className="editor-mappa__campo w-28">Quantità
            <input className="form-input" type="number" min={1} max={LIMITI_COSTO_OGGETTO.quantita} step={1} value={r.quantita ?? ''} disabled={disabilitato}
              onChange={(e) => modifica({ tipo: 'oggetti', oggetti: righe.map((o, i) => i === indice ? { ...o, quantita: e.target.value === '' ? null : Number(e.target.value) } : o) })} />
          </label>
          <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="elimina" dimensione={22} />} titolo="Togli" disabled={disabilitato} onClick={() => modifica({ tipo: 'oggetti', oggetti: righe.filter((_, i) => i !== indice) })} />
        </div>;
      })}
      {righe.length < LIMITI_COSTO_OGGETTO.componenti && <SceltaNelCatalogo {...catalogo} valore="" etichetta="Aggiungi un oggetto da cedere" disabilitato={disabilitato}
        escludi={righe.map((r) => r.chiave)} onScegli={(o) => modifica({ tipo: 'oggetti', oggetti: [...righe, { chiave: o.chiave, quantita: 1 }] })} />}
    </>}
    {tipo === 'non-leggibile' && <p role="alert" className="m-0 testo-13 text-warning">Il costo salvato non è leggibile e non viene trattato come gratis. Scegli come si paga per sostituirlo esplicitamente; altrimenti resta invariato.</p>}
    {dati._costoModificato === true && dati.costo_json != null && !normalizzaCostoScambio(dati.costo_json)
      && <p role="alert" className="m-0 testo-13 text-error">Completa il numero di fiori oppure aggiungi almeno un oggetto con una quantità intera positiva.</p>}
  </fieldset>;
}
