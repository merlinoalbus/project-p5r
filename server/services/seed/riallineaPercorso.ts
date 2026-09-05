import type { AppDatabase } from '../../db/dbService.js';
import type { PercorsoSeed } from '../../../shared/seed.js';

type AzioneSeed = PercorsoSeed['giorni'][number]['azioni'][number];

interface Voce { data: string; indice: number; azione: AzioneSeed }
interface Spunta { partita_id: number; data: string; indice: number; effetti_json: string | null; updated_at: string }

/** Prima di sostituire il percorso: identità esatte e conservazione delle spunte ambigue nell'agenda. */
export function riallineaPercorso(db: AppDatabase, percorso: PercorsoSeed): void {
  const vecchie: Voce[] = (db.prepare('SELECT data, azioni_json FROM giorno_percorso').all() as Array<{ data: string; azioni_json: string }>).flatMap(g =>
    (JSON.parse(g.azioni_json) as AzioneSeed[]).map((azione, indice) => ({ data: g.data, indice, azione })));
  const nuove: Voce[] = percorso.giorni.flatMap(g => g.azioni.map((azione, indice) => ({ data: g.data, indice, azione })));
  const identita = (v: Voce) => `${v.data}/${v.indice}`;
  const stessa = (a: AzioneSeed, b: AzioneSeed) => a.azione === b.azione && a.rangoAtteso === b.rangoAtteso && JSON.stringify(a.riferimento) === JSON.stringify(b.riferimento);
  const destinazioni = new Map<string, Voce>();
  const occupate = new Set<string>();
  for (const g of percorso.giorni) {
    const prima = vecchie.filter(v => v.data === g.data);
    if (JSON.stringify(prima.map(v => v.azione)) !== JSON.stringify(g.azioni)) continue;
    for (const v of prima) { destinazioni.set(identita(v), v); occupate.add(identita(v)); }
  }
  // Prima il testo identico nello stesso giorno, poi il testo identico spostato di data. Mai usare somiglianze del testo o la sola posizione.
  for (const criterio of [
    (a: Voce, b: Voce) => a.data === b.data && stessa(a.azione, b.azione),
    (a: Voce, b: Voce) => stessa(a.azione, b.azione),
  ]) {
    const disponibili = nuove.filter(n => !occupate.has(identita(n)));
    const residue = vecchie.filter(v => !destinazioni.has(identita(v)));
    for (const v of residue) {
      const candidate = disponibili.filter(n => criterio(v, n));
      if (candidate.length !== 1) continue;
      const n = candidate[0];
      if (residue.filter(o => criterio(o, n)).length !== 1) continue;
      destinazioni.set(identita(v), n);
      occupate.add(identita(n));
    }
  }
  const spunte = db.prepare('SELECT partita_id, data, indice, effetti_json, updated_at FROM azione_partita').all() as Spunta[];
  if (!spunte.length) return;
  // Le FK delle date di destinazione vengono soddisfatte dall'upsert successivo nella stessa transazione.
  db.pragma('defer_foreign_keys = ON');
  db.prepare('DELETE FROM azione_partita').run();
  const inserisci = db.prepare('INSERT INTO azione_partita (partita_id, data, indice, effetti_json, updated_at) VALUES (?, ?, ?, ?, ?)');
  for (const s of spunte) {
    const chiave = `${s.data}/${s.indice}`;
    const n = destinazioni.get(chiave);
    if (n) { inserisci.run(s.partita_id, n.data, n.indice, s.effetti_json, s.updated_at); continue; }
    const a = vecchie.find(v => identita(v) === chiave)?.azione;
    const avviso = 'Conservata dal percorso precedente: la guida è cambiata e la corrispondenza non è univoca. Riaprendola si annullano gli eventuali effetti originari; una nuova spunta sarà solo personale.';
    const id = db.prepare(`INSERT INTO azione_utente (partita_id, data, fascia, tipo, azione, riferimento_tipo, riferimento_chiave, rango_atteso, note, ordine, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(s.partita_id, s.data, a?.fascia ?? 'giorno', a?.tipo ?? 'altro', a?.azione ?? `Azione del percorso precedente (${s.data}, posizione ${s.indice + 1})`, a?.riferimento?.tipo ?? null, a?.riferimento?.chiave ?? null, a?.rangoAtteso ?? null, [a?.note, avviso].filter(Boolean).join('\n'), s.indice, s.updated_at, s.updated_at).lastInsertRowid;
    db.prepare('INSERT INTO azione_utente_partita (partita_id, azione_utente_id, fatta_at, effetti_json) VALUES (?, ?, ?, ?)').run(s.partita_id, id, s.updated_at, s.effetti_json);
  }
}
