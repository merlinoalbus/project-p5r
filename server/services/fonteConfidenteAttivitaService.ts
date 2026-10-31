import { prepared } from '../db/dbService.js';
import type { FonteConfidenteAttivitaDto } from '../../shared/types.js';
import { campiAutonomiAttivitaConfidente } from '../../shared/attivitaConfidente.js';
import { requisitiDelConfidente } from './requisitiConfidentiService.js';
import { requisitoBloccante, valuta, type RigaRequisito } from './semaforiService.js';
import type { StatoDisponibilita } from './disponibilitaService.js';
import { dotiIncontro } from './dotiIncontroConfidente.js';
import { t } from './traduzioniService.js';
import { disponibilitaConfidente } from './disponibilitaStrutturataService.js';

const NOME_GIORNO = { lun: 'Lunedì', mar: 'Martedì', mer: 'Mercoledì', gio: 'Giovedì', ven: 'Venerdì', sab: 'Sabato', dom: 'Domenica', festivi: 'festivi' } as const;

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
  // N-1: la disponibilità si legge dalla fonte strutturata (R9-01), non dal testo libero; il testo resta nelle note
  const disp = prepared('SELECT note FROM confidente_disponibilita WHERE confidente_chiave = ?').get(chiave) as { note: string } | undefined;
  const struttura = disp ? disponibilitaConfidente(chiave) : null;
  const giorni = struttura ? struttura.struttura.giorni.map(g => NOME_GIORNO[g]) : null;
  const fasce = struttura ? struttura.struttura.fasce.map(f => (f === 'sera' ? 'sera' : 'giorno')) : null;
  const luogo = struttura ? (struttura.luoghi.length ? struttura.luoghi.map(l => l.nome).join(', ') : struttura.struttura.motivoSenzaLuogo) : '';
  const fonteIlleggibile = false;
  const avvisiFonte = disp ? [] : ['La disponibilità del Confidente non è registrata nella fonte.'];
  const rangoAttuale = st ? st.ranghiConfidenti.get(chiave) ?? 0 : null;
  const passo = rangoAttuale !== null && rangoAttuale < 10 ? ranghi.find(q => q.rango === rangoAttuale + 1) : null;
  const semafori = st && passo ? (prepared('SELECT * FROM confidente_requisito WHERE confidente_chiave = ? AND rango = ? ORDER BY indice').all(chiave, passo.rango) as RigaRequisito[]).map(q => valuta(q, st)) : null;
  const bloccanti = semafori?.filter(requisitoBloccante) ?? [];
  return { ...base, stato: campiIncompatibili.length || fonteIlleggibile ? 'conflitto' : 'collegato', avvio: ranghi.find(q => q.rango === 1) ?? null, rangoAttuale,
    disponibilitaFonte: disp && giorni !== null && fasce !== null ? { giorni, fasce, luogo, note: disp.note } : null,
    prossimoPasso: passo ? { rango: passo.rango, requisiti: passo.requisiti, disponibilitaRequisiti: semafori && !campiIncompatibili.length && !fonteIlleggibile
      ? { stato: bloccanti.some(q => q.stato === 'rosso') ? 'bloccato' : bloccanti.some(q => q.stato === 'grigio') ? 'ignoto' : 'disponibile', requisiti: semafori } : null } : null,
    dotiPerPassaggio: dotiIncontro(chiave),
    avvisi: [
      ...avvisiFonte,
      ...(campiIncompatibili.length ? ['L’attività conserva campi autonomi incompatibili: correggili esplicitamente dal modulo.'] : []),
      'I semafori riguardano i requisiti del rango, non garantiscono la disponibilità di un incontro. Consulta il passo, le fasce e le avvertenze del Confidente.',
      'Le Doti indicate spettano ai passaggi di rango, non automaticamente alle uscite semplici o intermedie. Con la spunta della voce del passaggio nel Diario arrivano nel promemoria «Applica»; alzando il rango da Partita → Confidenti un avviso le ricorda, da segnare nelle Doti.',
    ] };
}
