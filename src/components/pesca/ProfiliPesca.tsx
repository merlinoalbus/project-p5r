import type { BeneficioPescaDto, EsitoProfiloPescaDto, OsservazionePesca, PuntoValutazionePesca } from '../../../shared/pesca';
import { IntervalloPesca } from './CampiPesca';

const ESITO: Record<EsitoProfiloPescaDto['esito'], string> = {
  'prerequisito-mancante': 'Prerequisito documentato mancante', 'via-documentata': 'Via documentata', 'da-verificare': 'Da verificare',
};
const COMPARSA: Record<EsitoProfiloPescaDto['comparsa'], string> = {
  documentata: 'Comparsa documentata per questo contesto', 'da-verificare': 'Comparsa da verificare', 'non-prevista': 'Comparsa non prevista dalla via documentata',
};
const TENTATIVO: Record<EsitoProfiloPescaDto['tentativo'], string> = {
  pianificabile: 'Percorso pianificabile', tentabile: 'Tentativo disponibile per la via documentata', esaurito: 'Tentativi esauriti',
  'gia-catturato': 'Già catturato in questa visita', 'da-verificare': 'Possibilità del prossimo tentativo da verificare',
};
const specie = (v: string) => v === 'guardiano' ? 'Guardiano di Ichigaya' : v === 'boss' ? 'Boss di Ichigaya' : 'Altro pesce';
const osservato = (v: boolean | null) => v === null ? 'Non noto' : v ? 'Sì' : 'No';

export function ProfiliSessionePesca({ punto, profili, profiliPianificazione }: { punto: PuntoValutazionePesca; profili: EsitoProfiloPescaDto[]; profiliPianificazione: EsitoProfiloPescaDto[] }) {
  if (!profili.length && !profiliPianificazione.length) return null;
  return <div className="flex min-w-0 flex-col gap-2">
    <strong>{punto.tipo === 'prossimo-tentativo' ? `Prossimo tentativo dopo ${punto.consumati} già consumati` : 'Pianificazione: tentativi già consumati non noti'}</strong>
    <ProfiliPesca profili={profili} />
    {punto.tipo === 'prossimo-tentativo' && <details><summary className="touch cursor-pointer">Percorso pianificabile, distinto dal prossimo tentativo</summary><p className="m-0 text-xs text-text-secondary">Le vie della guida non provano che il pesce sia presente ora.</p><ProfiliPesca profili={profiliPianificazione} /></details>}
  </div>;
}

/** Gli esiti provengono dal valutatore comune: nessuna soglia viene ricostruita nel browser. */
export function ProfiliPesca({ profili }: { profili: EsitoProfiloPescaDto[] }) {
  return <div className="flex min-w-0 flex-col gap-2">{profili.map(p => <section className="flex min-w-0 flex-col gap-1 rounded border border-border p-2 text-[13px]" key={p.specie} aria-label={`Profilo ${specie(p.specie)}`}>
    <div className="flex flex-wrap items-center gap-2"><strong>{specie(p.specie)}</strong><span className={`chip ${p.esito === 'via-documentata' ? 'chip--attivo' : ''}`}>{ESITO[p.esito]}</span></div>
    <span>{COMPARSA[p.comparsa]}</span>
    <span>Cattura: {p.catturabilita === 'via-documentata' ? 'via sufficiente documentata' : p.catturabilita === 'prerequisito-mancante' ? 'prerequisito documentato mancante' : 'da verificare'}.</span>
    <span>{TENTATIVO[p.tentativo]}{p.tentativiResidui !== null ? ` · tentativi residui ${p.tentativiResidui}` : ''}.</span>
    {!!p.necessita.length && <ul className="m-0 pl-4">{p.necessita.map((s, i) => <li key={i}>{s}</li>)}</ul>}
    {!!p.incertezze.length && <ul className="m-0 pl-4 text-warning">{p.incertezze.map((s, i) => <li key={i}>{s}</li>)}</ul>}
    <details><summary className="touch cursor-pointer">Vie considerate e fonti</summary><ul className="m-0 flex list-none flex-col gap-2 p-0">{p.vie.map(v => <li key={v.id} className="flex min-w-0 flex-col gap-1 border-t border-border pt-1">
      <span>{v.descrizione}</span><span className="text-text-secondary">{v.esito === 'soddisfatta' ? 'Predicati della via soddisfatti' : v.esito === 'non-applicabile' ? 'Via non applicabile a questo contesto' : 'Via non dimostrata dai dati noti'}</span>
      {v.fonti.map((f, i) => /^https?:\/\//.test(f) ? <a className="touch break-all text-primary-testo" href={f} target="_blank" rel="noreferrer" key={i}>Fonte {i + 1}</a> : <span className="break-words text-text-secondary" key={i}>{f}</span>)}
    </li>)}</ul></details>
  </section>)}</div>;
}

export function BeneficiPesca({ benefici }: { benefici: BeneficioPescaDto[] }) {
  return <ul className="m-0 flex list-none flex-col gap-2 p-0">{benefici.map(b => <li key={`${b.causa}:${b.tipo}:${b.chiave}`} className="flex min-w-0 flex-col gap-1 rounded border border-border p-2 text-[13px]">
    <strong>{b.tipo === 'dote' ? 'Beneficio Perizia' : b.tipo === 'yen' ? 'Quota d’ingresso' : 'Punti pesca'}</strong>
    <span>Importo ricostruibile: <IntervalloPesca minimo={b.intervallo.minimo} massimo={b.intervallo.massimo} unita={b.unita === 'punti-interni' ? 'punti interni' : b.unita === 'yen' ? 'yen' : 'punti pesca'} />.</span>
    <span>Già attribuito con prova: {b.attribuito.toLocaleString('it-IT')}. Differenza certa da rivedere: {b.deltaCerto > 0 ? '+' : ''}{b.deltaCerto.toLocaleString('it-IT')}.</span>
    {b.residuoIgnoto && <span className="text-warning">Rimane una parte non determinabile dai dati dichiarati.</span>}
    <span className="text-text-secondary">{b.motivo}</span>
  </li>)}</ul>;
}

/** Mostra i fatti che si stanno confermando, anche quando sono ancora ignoti. */
export function RiepilogoOsservazionePesca({ osservazione: o }: { osservazione: OsservazionePesca }) {
  return <div className="flex min-w-0 flex-col gap-1 text-[13px]">
    <span>Rango Perizia osservato: {o.rangoPeriziaOsservato ?? 'non noto'}. Tentativi consumati: {o.tentativiConsumati ?? 'non noti'}.</span>
    <span>Meteo: {o.meteo ?? 'non noto'}; allerta gelo: {osservato(o.allertaGelo)}. Terzo semestre in corso: {osservato(o.faseTerzoSemestre)}.</span>
    <span>Boilie sospetto posseduto: {osservato(o.escaSpecialePosseduta)}. Quota pagata: {osservato(o.quota.pagata)}.</span>
    <span>Catture: {o.catture === null ? 'esiti non noti' : o.catture.length === 0 ? 'nessuna dichiarata' : o.catture.length}.</span>
    {o.catture !== null && !!o.catture.length && <ul className="m-0 pl-4">{o.catture.map(c => <li key={c.id}>{specie(c.specie)} · tentativo {c.tentativo ?? 'non noto'} · ordine osservato {c.posizione ?? 'non noto'}</li>)}</ul>}
    <span>Finale: {o.finale.tipo === 'ignoto' ? 'non noto' : o.finale.tipo === 'uscita-dopo-riscossione' ? 'uscita dopo riscossione finale' : 'uscita senza riscossione finale'}. Ripresa dopo riscossione: {osservato(o.finale.ripresaDopoRiscossione)}.</span>
    <span>Perizia: {o.perizia.esito === 'ignota' ? 'riconoscimento non noto' : o.perizia.esito === 'ricevuta' ? 'beneficio riconosciuto' : 'beneficio non riconosciuto'}. Fortuna: {osservato(o.fortuna.attiva)} nella stessa data.</span>
  </div>;
}
