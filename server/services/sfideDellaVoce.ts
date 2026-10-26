// ============================================================
// sfideDellaVoce — gli yen di un articolo segnato su una voce GIÀ spuntata (L13, decisioni 2, 18 e 19)
// ============================================================
//
// Alla spunta gli yen di un articolo li decide un punto solo (`motoreDiario.yenDellEffetto` con `scartaYenDeiTurni`): l'acquisto segnato si
// paga; già comprato si paga solo se a segnarlo era un'altra voce spuntata (un acquisto ripetuto nel gioco: Katsu il 06-05 e l'11-13); la sfida
// di un turno della stessa voce che compra quell'articolo (la Big Bang Burger) si paga una volta sola, dall'articolo. Dalla decisione 19 un
// articolo si segna anche fuori dalla spunta, su una voce già spuntata (salvataggio della guida, approvazione dell'elenco del passato): lì il
// turno ha già mosso i suoi yen, e la regola si legge da ciò che è in vigore. Qui le letture comuni, perché salvataggio, approvazione e
// anteprima dell'approvazione dicano la stessa cosa della spunta.
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { normalizzaEffettoVoce, eEffettoDiStato } from '../../shared/effettiVoce.js';
import { yenDellaSfidaDelTurno } from './attivitaService.js';
import { effettiConYenGiaNelSaldo, yenAutomaticoAttivo, yenFuoriRegistro } from './yenAutomaticiService.js';
import { statoGiaVero } from './effettiDiStatoService.js';

/** Un turno con la sfida di un articolo, registrato dalla spunta della voce: `effettoUid` dell'effetto «turno» (null per le spunte di prima
 *  delle ricevute per effetto, lette dalla fotografia della spunta). */
export interface SfidaDellaVoce { attivita: string; ordine: number; articolo: string; importo: number; motivo: string; effettoUid: string | null }

const causaTurno = (s: Pick<SfidaDellaVoce, 'attivita' | 'ordine'>) => ({ tipo: 'turno' as const, chiave: `${s.attivita}:${s.ordine}` });

function leggi(json: string, cosa: string): unknown {
  try { return JSON.parse(json) as unknown; }
  catch { throw httpErrors.conflict('registro-yen-illeggibile', `${cosa} non è leggibile: gli yen della voce non si possono ricavare.`); }
}
/** I turni con esito di una porzione degli effetti (la parte legacy della ricevuta, o la fotografia della spunta). */
function turniConEsito(x: unknown): Array<{ attivita: string; ordine: number; esito: { chiave: string; nome: string } }> {
  const turni = x && typeof x === 'object' ? (x as { turni?: unknown }).turni : undefined;
  if (!Array.isArray(turni)) return [];
  return turni.flatMap((t) => {
    const v = t as { attivita?: unknown; ordine?: unknown; esito?: { chiave?: unknown; nome?: unknown } | null } | null;
    return v && typeof v.attivita === 'string' && typeof v.ordine === 'number' && Number.isSafeInteger(v.ordine) && v.esito && typeof v.esito.chiave === 'string'
      ? [{ attivita: v.attivita, ordine: v.ordine, esito: { chiave: v.esito.chiave, nome: typeof v.esito.nome === 'string' ? v.esito.nome : v.esito.chiave } }] : [];
  });
}

/** I turni della spunta della voce nella partita che pagano la sfida di un articolo: dalle ricevute in vigore e dalla fotografia della spunta. */
export function sfideDellaVoce(p: number, voceUid: string): SfidaDellaVoce[] {
  const out = new Map<string, SfidaDellaVoce>();
  const aggiungi = (effettoUid: string | null, porzione: unknown): void => {
    for (const t of turniConEsito(porzione)) {
      const chiave = `${t.attivita}:${t.ordine}`;
      if (out.get(chiave)?.effettoUid) continue;
      const y = yenDellaSfidaDelTurno(t.attivita, t.esito);
      if (y) out.set(chiave, { attivita: t.attivita, ordine: t.ordine, articolo: y.articolo, importo: y.importo, motivo: y.motivo, effettoUid });
    }
  };
  for (const r of prepared('SELECT effetto_uid, ricevuta_json FROM utente.effetto_applicato WHERE partita_id = ? AND voce_uid = ? AND annullato_il IS NULL').all(p, voceUid) as Array<{ effetto_uid: string; ricevuta_json: string }>) {
    const ricevuta = leggi(r.ricevuta_json, 'La ricevuta dell’effetto');
    aggiungi(r.effetto_uid, ricevuta && typeof ricevuta === 'object' ? (ricevuta as { legacy?: unknown }).legacy : undefined);
  }
  const spunta = prepared('SELECT effetti_json FROM utente.spunta_voce_partita WHERE partita_id = ? AND voce_uid = ?').get(p, voceUid) as { effetti_json: string | null } | undefined;
  if (spunta?.effetti_json) aggiungi(null, leggi(spunta.effetti_json, 'La fotografia della spunta'));
  return [...out.values()];
}

/** Vero se un turno della voce ha già pagato con i suoi yen (movimento in vigore, o in coda nel gesto) la sfida che compra l'articolo: allora
 *  l'articolo non scala niente (decisione 2: lo stesso acquisto si paga una volta). */
export function turnoHaPagatoLArticolo(p: number, voceUid: string, articolo: string): boolean {
  return sfideDellaVoce(p, voceUid).some((s) => s.articolo === articolo && yenAutomaticoAttivo(p, causaTurno(s)));
}

/** I turni della voce la cui sfida (l'articolo) non è pagata da nessuno: né dal turno né dall'articolo, per esempio dopo aver tolto l'articolo.
 *  Solo quelli con il loro effetto e i cui yen non erano già nel saldo da prima (il turno di una spunta di prima non si paga di nuovo). */
export function sfideNonPagate(p: number, voceUid: string, articolo: string): SfidaDellaVoce[] {
  return sfideDellaVoce(p, voceUid).filter((s) => s.articolo === articolo && s.effettoUid !== null && !yenAutomaticoAttivo(p, causaTurno(s))
    && !yenFuoriRegistro(p, causaTurno(s)) && !yenFuoriRegistro(p, { tipo: 'voce', chiave: `${voceUid}:${s.effettoUid}` }));
}

/** Vero se un'altra voce spuntata della partita ha segnato lo stesso articolo (`effetto_stato_voce`): un acquisto ripetuto nel gioco, che si paga. */
export function altraVoceHaLArticolo(p: number, articolo: string, voceUid: string): boolean {
  return !!prepared("SELECT 1 FROM utente.effetto_stato_voce WHERE partita_id = ? AND tipo = 'articolo' AND chiave = ? AND voce_uid <> ?").get(p, articolo, voceUid);
}

/**
 * L'anteprima dell'approvazione di un articolo dell'elenco del passato: gli yen che «Applica alla partita» scalerà (0 se nessuno), con le
 * stesse regole di `motoreDiario.applicaStatoDelPassato` → `yenDellArticoloSuVoceSpuntata`: niente se erano già nel saldo da prima (decisione
 * 18) o fuori registro, se un turno della voce ha pagato la sfida, se l'articolo risulta già comprato e nessun'altra voce lo ha segnato (lo
 * stesso acquisto, già pagato); altrimenti prezzo × copie (il saldo non scende mai sotto zero).
 */
export function yenPrevistiApprovando(p: number, voceUid: string, effettoUid: string, configurazione: unknown): number {
  const e = normalizzaEffettoVoce(configurazione);
  if (!e || e.tipo !== 'articolo' || !eEffettoDiStato(e)) return 0;
  const causa = { tipo: 'voce' as const, chiave: `${voceUid}:${effettoUid}` };
  if (yenFuoriRegistro(p, causa) || effettiConYenGiaNelSaldo(p, voceUid, [{ uid: effettoUid, tipo: 'articolo', chiave: null }]).has(effettoUid)) return 0;
  if (turnoHaPagatoLArticolo(p, voceUid, e.articolo)) return 0;
  if (statoGiaVero(p, e) && !altraVoceHaLArticolo(p, e.articolo, voceUid)) return 0;
  const prezzo = (prepared('SELECT prezzo FROM main.articolo WHERE chiave = ?').get(e.articolo) as { prezzo: number | null } | undefined)?.prezzo ?? null;
  return prezzo != null && prezzo > 0 ? prezzo * (e.quantita ?? 1) : 0;
}
