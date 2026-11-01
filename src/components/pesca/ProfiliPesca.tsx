import { nomeSpeciePesca, type BeneficioPescaDto, type EsitoProfiloPescaDto, type OsservazionePesca, type PuntoValutazionePesca } from '../../../shared/pesca';
import { urlHttp } from '../../../shared/urlHttp';
import { IntervalloPesca } from './CampiPesca';

/** Nel rilascio i collegamenti alle fonti delle vie non si mostrano (D10, L7-01). */
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

// L7 (F9): gli esiti del valutatore detti con le parole di chi gioca («la guida dice…»), non con quelle delle prove («via documentata»)
const ESITO: Record<EsitoProfiloPescaDto['esito'], string> = {
  'prerequisito-mancante': 'Manca un requisito della guida', 'via-documentata': 'Si può prendere', 'da-verificare': 'Non si sa',
};
const COMPARSA: Record<EsitoProfiloPescaDto['comparsa'], string> = {
  documentata: 'Secondo la guida compare in queste condizioni', 'da-verificare': 'Non si sa se compare', 'non-prevista': 'Secondo la guida non compare in queste condizioni',
};
const TENTATIVO: Record<EsitoProfiloPescaDto['tentativo'], string> = {
  pianificabile: 'Da preparare per una visita', tentabile: 'Puoi tentare adesso', esaurito: 'Tentativi finiti',
  'gia-catturato': 'Già catturato in questa visita', 'da-verificare': 'Non si sa se il prossimo tentativo può riuscire',
};
const specie = nomeSpeciePesca;
const osservato = (v: boolean | null) => v === null ? 'Non noto' : v ? 'Sì' : 'No';

export function ProfiliSessionePesca({ punto, profili, profiliPianificazione }: { punto: PuntoValutazionePesca; profili: EsitoProfiloPescaDto[]; profiliPianificazione: EsitoProfiloPescaDto[] }) {
  if (!profili.length && !profiliPianificazione.length) return null;
  return <div className="flex min-w-0 flex-col gap-2">
    <strong>{punto.tipo === 'prossimo-tentativo' ? `Prossimo tentativo, dopo ${punto.consumati} già fatti` : 'Per preparare la visita (tentativi già fatti non noti)'}</strong>
    <ProfiliPesca profili={profili} />
    {punto.tipo === 'prossimo-tentativo' && <details><summary className="touch cursor-pointer">Per preparare una visita, a parte il prossimo tentativo</summary><p className="m-0 text-xs text-text-secondary">La guida dice quando il pesce può comparire, non che ci sia adesso.</p><ProfiliPesca profili={profiliPianificazione} /></details>}
  </div>;
}

/** Gli esiti provengono dal valutatore comune: nessuna soglia viene ricostruita nel browser. */
export function ProfiliPesca({ profili }: { profili: EsitoProfiloPescaDto[] }) {
  return <div className="flex min-w-0 flex-col gap-2">{profili.map(p => <section className="flex min-w-0 flex-col gap-1 rounded border border-border p-2 testo-13" key={p.specie} aria-label={`Profilo ${specie(p.specie)}`}>
    <div className="flex flex-wrap items-center gap-2"><strong>{specie(p.specie)}</strong><span className={`chip ${p.esito === 'via-documentata' ? 'chip--attivo' : ''}`}>{ESITO[p.esito]}</span></div>
    <span>{COMPARSA[p.comparsa]}</span>
    <span>Cattura: {p.catturabilita === 'via-documentata' ? 'possibile secondo la guida' : p.catturabilita === 'prerequisito-mancante' ? 'manca un requisito della guida' : 'non si sa'}.</span>
    <span>{TENTATIVO[p.tentativo]}{p.tentativiResidui !== null ? ` · tentativi rimasti ${p.tentativiResidui}` : ''}.</span>
    {!!p.necessita.length && <ul className="m-0 pl-4">{p.necessita.map((s, i) => <li key={i}>{s}</li>)}</ul>}
    {!!p.incertezze.length && <ul className="m-0 pl-4 text-warning">{p.incertezze.map((s, i) => <li key={i}>{s}</li>)}</ul>}
    <details><summary className="touch cursor-pointer">Che cosa dice la guida</summary><ul className="m-0 flex list-none flex-col gap-2 p-0">{p.vie.map(v => <li key={v.id} className="flex min-w-0 flex-col gap-1 border-t border-border pt-1">
      <span>{v.descrizione}</span><span className="text-text-secondary">{v.esito === 'soddisfatta' ? 'Condizioni rispettate' : v.esito === 'non-applicabile' ? 'Non vale in queste condizioni' : 'Non si sa con quello che hai segnato'}</span>
      {!IN_RILASCIO && v.fonti.map((f, i) => { const href = urlHttp(f); return href ? <a className="touch break-all text-primary-testo" href={href} target="_blank" rel="noreferrer" key={i}>Fonte {i + 1}</a> : <span className="break-words text-text-secondary" key={i}>{f}</span>; })}
    </li>)}</ul></details>
  </section>)}</div>;
}

export function BeneficiPesca({ benefici }: { benefici: BeneficioPescaDto[] }) {
  return <ul className="m-0 flex list-none flex-col gap-2 p-0">{benefici.map(b => <li key={`${b.causa}:${b.tipo}:${b.chiave}`} className="flex min-w-0 flex-col gap-1 rounded border border-border p-2 testo-13">
    <strong>{b.tipo === 'dote' ? 'Perizia' : b.tipo === 'yen' ? 'Quota d’ingresso' : 'Punti pesca'}</strong>
    <span>Quanto vale: <IntervalloPesca minimo={b.intervallo.minimo} massimo={b.intervallo.massimo} unita={b.unita === 'punti-interni' ? 'punti di Perizia' : b.unita === 'yen' ? 'yen' : 'punti pesca'} />.</span>
    <span>Già contato: {b.attribuito.toLocaleString('it-IT')}. Da approvare di sicuro: {b.deltaCerto > 0 ? '+' : ''}{b.deltaCerto.toLocaleString('it-IT')}.</span>
    {b.residuoIgnoto && <span className="text-warning">Una parte non si può calcolare con quello che hai segnato.</span>}
    <span className="text-text-secondary">{b.motivo}</span>
  </li>)}</ul>;
}

/** Mostra i fatti che si stanno confermando, anche quando sono ancora ignoti. */
export function RiepilogoOsservazionePesca({ osservazione: o }: { osservazione: OsservazionePesca }) {
  return <div className="flex min-w-0 flex-col gap-1 testo-13">
    <span>Rango Perizia: {o.rangoPeriziaOsservato ?? 'non noto'}. Tentativi fatti: {o.tentativiConsumati ?? 'non noti'}.</span>
    <span>Meteo: {o.meteo ?? 'non noto'}; allerta gelo: {osservato(o.allertaGelo)}. Terzo semestre in corso: {osservato(o.faseTerzoSemestre)}.</span>
    <span>Boilie sospetto posseduto: {osservato(o.escaSpecialePosseduta)}. Quota pagata: {osservato(o.quota.pagata)}.</span>
    <span>Catture: {o.catture === null ? 'non note' : o.catture.length === 0 ? 'nessuna' : o.catture.length}.</span>
    {o.catture !== null && !!o.catture.length && <ul className="m-0 pl-4">{o.catture.map(c => <li key={c.id}>{specie(c.specie)} · tentativo {c.tentativo ?? 'non noto'} · ordine {c.posizione ?? 'non noto'}</li>)}</ul>}
    <span>Fine della visita: {o.finale.tipo === 'ignoto' ? 'non nota' : o.finale.tipo === 'uscita-dopo-riscossione' ? 'uscito dopo aver riscosso' : 'uscito senza riscuotere'}. Ripreso a pescare dopo aver riscosso: {osservato(o.finale.ripresaDopoRiscossione)}.</span>
    <span>Perizia: {o.perizia.esito === 'ignota' ? 'non si sa se è arrivata' : o.perizia.esito === 'ricevuta' ? 'arrivata' : 'non arrivata'}. Fortuna quel giorno: {osservato(o.fortuna.attiva)}.</span>
  </div>;
}
