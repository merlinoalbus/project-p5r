// ============================================================
// azioniStrutturateService — collegamenti ed effetti di un'azione della giornata: verifica e nomi
// ============================================================
//
// Un'azione della guida (corretta dall'utente) o dell'utente si classifica e si collega come ogni altra
// (richiesta dell'utente, 2026-09-30: «devo poter modificare al 100% gli eventi della guida»): tipo,
// collegamento a un Confidente, un Palazzo, una richiesta, un libro, un film, un'attività, un negozio o
// una Dote, rango atteso ed effetti della spunta. Qui si verifica che ciò a cui punta esista (un
// collegamento a vuoto non si salva: la spunta non saprebbe che cosa fare) e si danno i nomi per
// l'interfaccia (`riferimentoTesto`, `produceTesto`).
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { t } from './traduzioniService.js';
import { eTracciamentoAttivita, tracciamentoPerTipo } from '../../shared/attivita.js';
import { descriviEffettoAzione, normalizzaEffettiAzione, TIPI_RIFERIMENTO_AZIONE, type EffettoAzione, type NomiEffettiAzione } from '../../shared/effettiAzione.js';
import type { ConfidentePartitaDto, ElenchiAzioneDto, RiferimentoAzioneDto, StatoAzioneDto } from '../../shared/types.js';

const TIPI_RIFERIMENTO = new Set<string>(TIPI_RIFERIMENTO_AZIONE.map((r) => r.chiave));

/** Il minimo di un'azione (della guida o dell'utente) che stato e mappa leggono. */
export interface AzioneClassificata { tipo: string; riferimento: { tipo: string; chiave: string } | null; rangoAtteso: number | null }

/** Stato dell'azione nella partita (12.4): per gli incontri con un Confidente valuta i semafori del rango atteso (o del prossimo). */
export function statoAzione(a: AzioneClassificata, conf: Map<string, ConfidentePartitaDto>): StatoAzioneDto {
  if (a.tipo !== 'confidente' || a.riferimento?.tipo !== 'confidente') return { tipo: 'neutra', motivo: null };
  const c = conf.get(a.riferimento.chiave);
  if (!c) return { tipo: 'neutra', motivo: null };
  const atteso = a.rangoAtteso ?? null;
  if (atteso !== null && c.rango >= atteso) return { tipo: 'neutra', motivo: `rango ${atteso} già raggiunto` };
  if (!c.sbloccato && (atteso ?? 1) > 1) return { tipo: 'bloccata', motivo: 'Confidente non ancora sbloccato nella partita' };
  const obiettivo = atteso ?? c.rango + 1;
  // Solo il semaforo del rango obiettivo: un rango senza requisiti e libero (non si ripiega sul rango successivo).
  const sem = c.semafori.find((s) => s.rango === obiettivo);
  if (!sem || sem.requisiti.length === 0) return { tipo: 'neutra', motivo: null };
  const rossi = sem.requisiti.filter((r) => r.stato === 'rosso');
  if (rossi.length > 0) return { tipo: 'bloccata', motivo: rossi.map((r) => (r.dettaglio ? `${r.testo} (${r.dettaglio})` : r.testo)).join(' · ') };
  if (sem.pronto || sem.requisiti.every((r) => r.stato === 'verde')) return { tipo: 'consigliata', motivo: `requisiti del rango ${sem.rango} soddisfatti` };
  // le avvertenze (`bloccante: false`) non sono «da confermare»: si controllano nel gioco e non fermano niente
  const grigi = sem.requisiti.filter((r) => r.stato === 'grigio' && r.bloccante !== false);
  return { tipo: 'neutra', motivo: grigi.length > 0 ? `da confermare: ${grigi.map((r) => r.testo).join(' · ')}` : null };
}

/** Mappa (e spillo) del luogo dell'azione: Palazzo → `dungeon-<k>`, richiesta → Mementos, negozio/Confidente → spillo del luogo in città. */
export function mappaAzione(a: AzioneClassificata): { chiave: string; spilloId: number | null } | null {
  const r = a.riferimento;
  const mappaEsiste = (chiave: string) => !!prepared('SELECT 1 FROM mappa WHERE chiave = ?').get(chiave);
  if (r?.tipo === 'dungeon') return mappaEsiste(`dungeon-${r.chiave}`) ? { chiave: `dungeon-${r.chiave}`, spilloId: null } : null;
  if (r?.tipo === 'richiesta' || a.tipo === 'richiesta') return mappaEsiste('dungeon-mementos') ? { chiave: 'dungeon-mementos', spilloId: null } : null;
  if (r?.tipo === 'negozio') {
    const s = prepared(`SELECT id, mappa_chiave FROM spillo WHERE (riferimento_tipo = 'negozio' AND riferimento_chiave = ?)
      OR (riferimento_tipo = 'luogo' AND riferimento_chiave IN (SELECT sede_chiave FROM negozio WHERE chiave = ? AND sede_chiave IS NOT NULL)) ORDER BY id LIMIT 1`).get(r.chiave, r.chiave) as { id: number; mappa_chiave: string } | undefined;
    return s ? { chiave: s.mappa_chiave, spilloId: s.id } : null;
  }
  if (r?.tipo === 'confidente') {
    const s = prepared(`SELECT s.id, s.mappa_chiave FROM spillo s WHERE (s.riferimento_tipo = 'confidente' AND s.riferimento_chiave = ?)
      OR (s.riferimento_tipo = 'luogo' AND s.riferimento_chiave IN (SELECT chiave FROM luogo WHERE confidenti_json LIKE ?)) ORDER BY s.id LIMIT 1`).get(r.chiave, `%"${r.chiave}"%`) as { id: number; mappa_chiave: string } | undefined;
    return s ? { chiave: s.mappa_chiave, spilloId: s.id } : null;
  }
  return null;
}

/** Il nome dell'elemento collegato, come lo scrive la guida («Tae Takemi - Morte»); 400 se il collegamento non esiste. */
export function nomeRiferimento(rif: { tipo: string; chiave: string }): string {
  if (!TIPI_RIFERIMENTO.has(rif.tipo)) throw httpErrors.badRequest('riferimento-non-valido', `Non si collega un'azione a «${rif.tipo}».`);
  const riga = ((): { nome: string } | undefined => {
    switch (rif.tipo as RiferimentoAzioneDto['tipo']) {
      case 'confidente': {
        const c = prepared('SELECT nome, arcana FROM confidente WHERE chiave = ?').get(rif.chiave) as { nome: string; arcana: string } | undefined;
        return c ? { nome: `${c.nome} - ${t('arcana', c.arcana)}` } : undefined;
      }
      case 'dungeon': return prepared('SELECT nome FROM dungeon WHERE chiave = ?').get(rif.chiave) as { nome: string } | undefined;
      case 'richiesta': return prepared('SELECT nome FROM richiesta WHERE chiave = ?').get(rif.chiave) as { nome: string } | undefined;
      case 'libro': return prepared('SELECT COALESCE(nome_it, nome) AS nome FROM libro WHERE chiave = ? AND nascosto = 0').get(rif.chiave) as { nome: string } | undefined;
      case 'film': return prepared('SELECT COALESCE(nome_it, nome) AS nome FROM film WHERE chiave = ? AND nascosto = 0').get(rif.chiave) as { nome: string } | undefined;
      case 'attivita': return prepared('SELECT nome FROM attivita WHERE chiave = ? AND nascosto = 0').get(rif.chiave) as { nome: string } | undefined;
      case 'negozio': return prepared('SELECT nome FROM negozio WHERE chiave = ? AND nascosto = 0').get(rif.chiave) as { nome: string } | undefined;
      case 'dote': return prepared('SELECT nome FROM dote_sociale WHERE chiave = ?').get(rif.chiave) as { nome: string } | undefined;
    }
  })();
  if (!riga) throw httpErrors.badRequest('riferimento-inesistente', `Il collegamento «${rif.tipo}: ${rif.chiave}» non esiste nella guida.`);
  return riga.nome;
}

/** Effetti validi e che puntano a elementi esistenti; 400 con il motivo altrimenti (una voce storta non si butta in silenzio). */
export function verificaEffetti(grezzi: unknown[]): EffettoAzione[] {
  const produce = normalizzaEffettiAzione(grezzi);
  if (produce.length !== grezzi.length) throw httpErrors.badRequest('effetto-non-valido', 'Uno degli effetti non è valido: controlla Dote e note (1–3), la lettura o il turno.');
  for (const e of produce) {
    if (e.tipo === 'lettura') {
      const esiste = e.categoria === 'libro' ? prepared('SELECT 1 FROM libro WHERE chiave = ? AND nascosto = 0').get(e.chiave)
        : e.categoria === 'film' ? prepared('SELECT 1 FROM film WHERE chiave = ? AND nascosto = 0').get(e.chiave)
          : prepared("SELECT 1 FROM attivita WHERE chiave = ? AND tipo = 'videogioco' AND nascosto = 0").get(e.chiave);
      if (!esiste) throw httpErrors.badRequest('effetto-inesistente', `La lettura «${e.chiave}» non esiste nella guida.`);
    } else if (e.tipo === 'turno') {
      const a = prepared('SELECT tipo, tracciamento FROM attivita WHERE chiave = ? AND nascosto = 0').get(e.attivita) as { tipo: string; tracciamento: string } | undefined;
      if (!a) throw httpErrors.badRequest('effetto-inesistente', `L'attività «${e.attivita}» non esiste nella guida.`);
      if ((eTracciamentoAttivita(a.tracciamento) ? a.tracciamento : tracciamentoPerTipo(a.tipo)) !== 'svolta') {
        throw httpErrors.badRequest('effetto-non-valido', `L'attività «${e.attivita}» non si conta per volte: non ha turni.`);
      }
    }
  }
  return produce;
}

/** I nomi di libri, film, videogiochi e attività per descrivere gli effetti: una lettura per richiesta. */
export function nomiEffetti(): NomiEffettiAzione {
  const mappa = (sql: string) => Object.fromEntries((prepared(sql).all() as Array<{ chiave: string; nome: string }>).map((r) => [r.chiave, r.nome]));
  return {
    libri: mappa('SELECT chiave, COALESCE(nome_it, nome) AS nome FROM libro'),
    film: mappa('SELECT chiave, COALESCE(nome_it, nome) AS nome FROM film'),
    videogiochi: mappa("SELECT chiave, nome FROM attivita WHERE tipo = 'videogioco'"),
    attivita: mappa('SELECT chiave, nome FROM attivita'),
  };
}

export function testoEffetti(produce: EffettoAzione[], nomi: NomiEffettiAzione): string[] {
  return produce.map((e) => descriviEffettoAzione(e, nomi));
}

/** Gli elenchi da cui la finestra dell'azione sceglie collegamento ed effetti: gli stessi elementi che `nomeRiferimento` e
 *  `verificaEffetti` accettano (le attività con i turni sono quelle contate per volte). */
export function elenchiAzione(): ElenchiAzioneDto {
  const voci = (sql: string) => prepared(sql).all() as Array<{ chiave: string; nome: string; dettaglio?: string | null }>;
  const pulite = (r: Array<{ chiave: string; nome: string; dettaglio?: string | null }>) => r.map((x) => ({ chiave: x.chiave, nome: x.nome, ...(x.dettaglio ? { dettaglio: x.dettaglio } : {}) }));
  const attivita = prepared('SELECT chiave, nome, tipo, tracciamento FROM attivita WHERE nascosto = 0 ORDER BY ordine').all() as Array<{ chiave: string; nome: string; tipo: string; tracciamento: string }>;
  return {
    confidenti: (prepared('SELECT chiave, nome, arcana FROM confidente ORDER BY ordine').all() as Array<{ chiave: string; nome: string; arcana: string }>).map((c) => ({ chiave: c.chiave, nome: c.nome, dettaglio: t('arcana', c.arcana) })),
    dungeon: pulite(voci('SELECT chiave, nome FROM dungeon ORDER BY ordine')),
    richieste: pulite(voci('SELECT chiave, nome, committente AS dettaglio FROM richiesta ORDER BY ordine')),
    libri: pulite(voci('SELECT chiave, COALESCE(nome_it, nome) AS nome, dove AS dettaglio FROM libro WHERE nascosto = 0 ORDER BY ordine')),
    film: pulite(voci("SELECT chiave, COALESCE(nome_it, nome) AS nome, CASE dove WHEN 'cinema' THEN 'Cinema' ELSE 'DVD' END AS dettaglio FROM film WHERE nascosto = 0 ORDER BY ordine")),
    videogiochi: attivita.filter((a) => a.tipo === 'videogioco').map((a) => ({ chiave: a.chiave, nome: a.nome })),
    attivita: attivita.map((a) => ({ chiave: a.chiave, nome: a.nome, turni: (eTracciamentoAttivita(a.tracciamento) ? a.tracciamento : tracciamentoPerTipo(a.tipo)) === 'svolta' })),
    negozi: pulite(voci('SELECT chiave, nome, luogo AS dettaglio FROM negozio WHERE nascosto = 0 ORDER BY ordine')),
    doti: pulite(voci('SELECT chiave, nome FROM dote_sociale ORDER BY ordine')),
  };
}
