import { prepared } from '../db/dbService.js';
import type { FonteConfidenteAttivitaDto } from '../../shared/types.js';
import { campiAutonomiAttivitaConfidente } from '../../shared/attivitaConfidente.js';
import { requisitiDelConfidente } from './requisitiConfidentiService.js';
import { requisitoBloccante, valuta, type RigaRequisito } from './semaforiService.js';
import type { StatoDisponibilita } from './disponibilitaService.js';
import { dotiIncontro } from './dotiIncontroConfidente.js';
import { t } from './traduzioniService.js';

/** Proiezione della fonte corrente: nessun calendario o requisito risalvato nell'attività. */
export function fonteConfidenteAttivita(r: Record<string, unknown>, st: StatoDisponibilita | null = null): FonteConfidenteAttivitaDto | null {
  if (r.confidente_chiave == null) return null;
  const chiave = String(r.confidente_chiave);
  const c = prepared('SELECT nome, arcana FROM confidente WHERE chiave = ?').get(chiave) as { nome: string; arcana: string } | undefined;
  const campiIncompatibili = campiAutonomiAttivitaConfidente(r, true);
  const base: FonteConfidenteAttivitaDto = { stato: 'non-risolto', chiave, nome: c?.nome ?? null, arcana: c?.arcana ?? null, arcanaNome: c ? t('arcana', c.arcana) : null,
    casa: `/confidenti/${encodeURIComponent(chiave)}`, disponibilitaFonte: null, avvio: null, rangoAttuale: null,
    prossimoPasso: null, dotiPerPassaggio: [], campiIncompatibili, avvisi: [] };
  if (!c) return { ...base, avvisi: ['Il Confidente collegato non esiste: correggi il collegamento.'] };
  const ranghi = requisitiDelConfidente(chiave).ranghi;
  const disp = prepared('SELECT giorni_json,fasce_json,luogo,note FROM confidente_disponibilita WHERE confidente_chiave = ?').get(chiave) as { giorni_json: string; fasce_json: string; luogo: string; note: string } | undefined;
  const elenco = (raw: unknown): string[] | null => { try { if (typeof raw !== 'string') return null; const x: unknown = JSON.parse(raw); return Array.isArray(x) && x.every(v => typeof v === 'string') ? x as string[] : null; } catch { return null; } };
  const giorni = disp ? elenco(disp.giorni_json) : null;
  const fasce = disp ? elenco(disp.fasce_json) : null;
  const fonteIlleggibile = !!disp && (giorni === null || fasce === null);
  const avvisiFonte = disp ? [
    ...(giorni === null ? ['I giorni nella fonte Confidente non sono leggibili: correggili nella fonte. Nessun calendario è stato ricostruito.'] : []),
    ...(fasce === null ? ['Le fasce nella fonte Confidente non sono leggibili: correggile nella fonte. Nessun calendario è stato ricostruito.'] : []),
  ] : ['La disponibilità del Confidente non è registrata nella fonte.'];
  const rangoAttuale = st ? st.ranghiConfidenti.get(chiave) ?? 0 : null;
  const passo = rangoAttuale !== null && rangoAttuale < 10 ? ranghi.find(q => q.rango === rangoAttuale + 1) : null;
  const semafori = st && passo ? (prepared('SELECT * FROM confidente_requisito WHERE confidente_chiave = ? AND rango = ? ORDER BY indice').all(chiave, passo.rango) as RigaRequisito[]).map(q => valuta(q, st)) : null;
  const bloccanti = semafori?.filter(requisitoBloccante) ?? [];
  return { ...base, stato: campiIncompatibili.length || fonteIlleggibile ? 'conflitto' : 'collegato', avvio: ranghi.find(q => q.rango === 1) ?? null, rangoAttuale,
    disponibilitaFonte: disp && giorni !== null && fasce !== null ? { giorni, fasce, luogo: disp.luogo, note: disp.note } : null,
    prossimoPasso: passo ? { rango: passo.rango, requisiti: passo.requisiti, disponibilitaRequisiti: semafori && !campiIncompatibili.length && !fonteIlleggibile
      ? { stato: bloccanti.some(q => q.stato === 'rosso') ? 'bloccato' : bloccanti.some(q => q.stato === 'grigio') ? 'ignoto' : 'disponibile', requisiti: semafori } : null } : null,
    dotiPerPassaggio: dotiIncontro(chiave),
    avvisi: [
      ...avvisiFonte,
      ...(campiIncompatibili.length ? ['L’attività conserva campi autonomi incompatibili: correggili esplicitamente dal modulo.'] : []),
      'I semafori riguardano i requisiti del rango, non garantiscono la disponibilità di un incontro. Consulta il passo, le fasce e le avvertenze del Confidente.',
      'Le Doti indicate spettano ai passaggi di rango, non automaticamente alle uscite semplici o intermedie. Si segnano a mano nelle Doti.',
    ] };
}
