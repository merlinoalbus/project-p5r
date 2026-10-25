import { useState } from 'react';
import type { RegolaPescaDto } from '../../../shared/pesca';
import { EditorRegolaPesca } from './EditorRegolaPesca';
import { PulsanteVisivo, CollegamentoVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

/** Nel rilascio la regola comune della pesca si consulta soltanto: niente correzione (costante di build, come negli altri moduli). */
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

export function FontePescaAttivita({ fonte, onCambiata }: { fonte: { regola: RegolaPescaDto; ruolo: 'visita' | 'obiettivi' }; onCambiata?: () => void | Promise<void> }) {
  const [editor, setEditor] = useState(false);
  const r = fonte.regola, d = r.dati;
  return <section className="flex min-w-0 flex-col gap-2 rounded border border-border p-3 text-sm" aria-label="Fonte della pesca">
    <strong>{r.nome} · {fonte.ruolo === 'visita' ? 'visita' : 'obiettivi della stessa visita'}</strong>
    <p className="m-0">La visita ha un solo turno. Guardiano e Boss sono due obiettivi: tentare non significa catturare. Rango, tentativi, catture e riscossione si registrano come osservazioni della visita.</p>
    {d && <>
      <p className="m-0">Quota: giorno ¥{d.quote.giorno.toLocaleString('it-IT')}, sera ¥{d.quote.sera.toLocaleString('it-IT')}. Esca speciale: {d.costoEscaPunti.toLocaleString('it-IT')} punti pesca.</p>
      <p className="m-0">Perizia osservata alla riscossione finale: {d.beneficioPerizia.note} nota, {d.beneficioPerizia.puntiBase} punti interni base; Fortuna confermata aggiunge {d.beneficioPerizia.bonusFortuna}. Con dati ignoti il registro mostra un intervallo e propone soltanto la parte certa.</p>
      <ul className="m-0 space-y-1 pl-5">{d.vie.map(v => <li key={v.id}>
        <strong>{v.specie === 'guardiano' ? 'Guardiano' : 'Boss'}</strong>: {v.faseTerzoSemestre ? 'terzo semestre avviato' : 'prima del terzo semestre'}, {v.fascia}, {v.meteo === 'normale' ? 'meteo normale' : 'pioggia o neve'}; {v.guardianoPrecedente === 'si' ? 'Guardiano già catturato prima della visita; ' : v.guardianoPrecedente === 'no' ? 'Guardiano non ancora catturato prima della visita; ' : ''}
        comparsa {v.rangoComparsa === null ? 'senza rango stabilito' : `documentata al rango ${v.rangoComparsa}`}; catturabilità documentata al rango {v.rangoCattura}, {v.tentativo === 'primo' ? 'primo' : 'settimo'} tentativo{v.seiCatture ? ', dopo sei catture nella visita' : ''}.
        {v.nota && <p className="m-0 whitespace-pre-line">{v.nota}</p>}
        <span className="flex flex-wrap gap-2">{v.fonti.filter(f => /^https?:\/\//.test(f)).map((f, i) => <a className="touch inline-flex items-center text-primary-testo" key={`${i}:${f}`} href={f} target="_blank" rel="noreferrer">Fonte {i + 1}</a>)}</span>
      </li>)}</ul>
      <p className="m-0 text-text-secondary">Le vie documentate sono sufficienti: un rango inferiore privo di prova resta da verificare.</p>
    </>}
    {r.motivi.map((m, i) => <p role="alert" key={i} className="m-0 text-warning">{m}</p>)}
    <div className="flex flex-wrap gap-2">
      <CollegamentoVisivo icona={<IconaAzione chiave="scheda" dimensione={22} />} titolo="Visite, osservazioni e profili" to="/partita?scheda=progressi#pesca" />
      {!IN_RILASCIO && onCambiata && <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="modifica" dimensione={22} />} titolo="Correggi la regola comune" disabled={r.stato !== 'collegata'} onClick={() => setEditor(true)} />}
    </div>
    {!IN_RILASCIO && editor && onCambiata && <EditorRegolaPesca key={r.chiave} regola={r} onChiudi={() => setEditor(false)} onSalvata={onCambiata} />}
  </section>;
}
