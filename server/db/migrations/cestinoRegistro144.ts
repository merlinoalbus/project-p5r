// ============================================================
// Copia congelata del registratore del Cestino (stato del 23/10/2026), ristretta al file di gioco
// ============================================================
//
// Le migrazioni non importano i servizi vivi (F5, F1 della verifica del 23/10): questo modulo riproduce `conCestino` di
// `server/services/cestinoService.ts` com'era quando la migrazione 144 è stata scritta, senza importare niente da `server/services/`.
//
// Come il servizio, per la durata dell'operazione crea trigger temporanei che annotano ogni riga toccata (DELETE, UPDATE, INSERT,
// cascate comprese, BLOB in base64), poi mette in `main.cestino` l'elemento con il suo registro; con un errore non resta niente.
// Differenza voluta rispetto al servizio vivo: i trigger sono creati soltanto sulle tabelle di `main` (il file di gioco). Una
// migrazione di gioco non scrive MAI nello schema `utente` (le partite): il registro non ha mai passi di `utente`, quindi
// `utente.cestino_partite` non si tocca e `con_partite` resta 0. Il formato della riga del Cestino e del registro è identico,
// perché il ripristino lo fa l'app con il suo codice.
// Non modificarla: il servizio vivo è l'altro file.
// ============================================================

import { randomBytes } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';

type Operazione = 'D' | 'U' | 'I';
type Valore = string | number | null | { $blob: string };
type Riga = Record<string, Valore>;
interface Passo { seq: number; tabella: string; op: Operazione; prima?: Riga; dopo?: Riga }

export interface ElementoCestino144 { tipo: 'oggetto'; chiave: string; nome: string; contesto?: string }

const virgolette = (nome: string): string => `"${nome.replace(/"/g, '""')}"`;
const stringa = (testo: string): string => `'${testo.replace(/'/g, "''")}'`;

function serializza(v: unknown): Valore {
  if (v === null || v === undefined) return null;
  if (Buffer.isBuffer(v)) return { $blob: v.toString('base64') };
  if (typeof v === 'bigint') return Number(v);
  return v as string | number;
}
const stesso = (a: Valore | undefined, b: Valore | undefined): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const uguali = (a: Riga, b: Riga, colonne: readonly string[]): boolean => colonne.every((c) => stesso(a[c], b[c]));

/** Le tabelle del file di gioco da registrare (non il Cestino stesso). */
function tabelleDiGioco(db: AppDatabase): string[] {
  return (db.prepare("SELECT name FROM main.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as Array<{ name: string }>)
    .map((r) => r.name).filter((t) => t !== 'cestino');
}

/** Le colonne di una tabella e quelle della sua chiave primaria (nell'ordine della chiave); senza chiave il rowid fa da chiave. */
function strutturaTabella(db: AppDatabase, tabella: string): { colonne: string[]; chiave: string[] } | null {
  if (!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type='table' AND name=?").get(tabella)) return null;
  const info = db.prepare("SELECT name, pk FROM pragma_table_info(?, 'main') ORDER BY cid").all(tabella) as Array<{ name: string; pk: number }>;
  if (info.length === 0) return null;
  const chiave = info.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => c.name);
  if (chiave.length === 0) return { colonne: ['rowid', ...info.map((c) => c.name)], chiave: ['rowid'] };
  return { colonne: info.map((c) => c.name), chiave };
}

/** Quante righe di ogni tabella se ne sono andate davvero: una riga cancellata e poi reinserita con la stessa chiave non è tolta. */
function riepilogo(db: AppDatabase, passi: readonly Passo[]): Record<string, number> {
  const via = new Map<string, Map<string, boolean>>();
  for (const p of passi) {
    if (p.op === 'U') continue;
    const s = strutturaTabella(db, p.tabella);
    const riga = (p.op === 'D' ? p.prima : p.dopo)!;
    const chiave = (s?.chiave ?? Object.keys(riga)).map((c) => JSON.stringify(riga[c] ?? null)).join('|');
    if (!via.has(p.tabella)) via.set(p.tabella, new Map());
    via.get(p.tabella)!.set(chiave, p.op === 'D');
  }
  const conti: Record<string, number> = {};
  for (const [tabella, righe] of via) {
    const n = [...righe.values()].filter(Boolean).length;
    if (n) conti[tabella] = n;
  }
  return conti;
}

/**
 * Esegue `opera` registrando ogni riga che tocca nel file di gioco e mette nel Cestino l'elemento con il registro.
 * Va chiamata dentro la transazione della migrazione (diventa un punto di salvataggio annidato).
 */
export function conCestino144<T>(db: AppDatabase, elemento: ElementoCestino144, opera: () => T): T {
  const passi: Array<Omit<Passo, 'seq'>> = [];
  const colonne = new Map<string, string[]>();
  db.function('cestino_registra', { varargs: true }, (...argomenti: unknown[]) => {
    const [, tabella, op] = argomenti as [string, string, Operazione];
    const nomi = colonne.get(tabella)!;
    const riga = (da: number): Riga => Object.fromEntries(nomi.map((c, i) => [c, serializza(argomenti[da + i])]));
    if (op === 'D') passi.push({ tabella, op, prima: riga(3) });
    else if (op === 'I') passi.push({ tabella, op, dopo: riga(3) });
    else {
      const prima = riga(3), dopo = riga(3 + nomi.length);
      if (!uguali(prima, dopo, nomi)) passi.push({ tabella, op, prima, dopo });
    }
    return null;
  });
  const ricorsivi = db.pragma('recursive_triggers', { simple: true }) as number;
  db.pragma('recursive_triggers = ON');
  try {
    return db.transaction(() => {
      const trigger: string[] = [];
      try {
        tabelleDiGioco(db).forEach((tabella, i) => {
          const nomi = strutturaTabella(db, tabella)!.colonne;
          colonne.set(tabella, nomi);
          const vecchie = nomi.map((c) => `old.${virgolette(c)}`).join(', ');
          const nuove = nomi.map((c) => `new.${virgolette(c)}`).join(', ');
          const su = `main.${virgolette(tabella)}`;
          const chiama = (op: Operazione, valori: string) => `SELECT cestino_registra('main', ${stringa(tabella)}, '${op}', ${valori});`;
          for (const [op, quando, valori] of [['D', 'DELETE', vecchie], ['U', 'UPDATE', `${vecchie}, ${nuove}`], ['I', 'INSERT', nuove]] as const) {
            const nome = `cestino144_${i}_${op}`;
            db.exec(`CREATE TEMP TRIGGER ${nome} AFTER ${quando} ON ${su} BEGIN ${chiama(op, valori)} END`);
            trigger.push(nome);
          }
        });
        const esito = opera();
        for (const nome of trigger.splice(0)) db.exec(`DROP TRIGGER temp.${nome}`);
        const gioco: Passo[] = passi.map((p, seq) => ({ ...p, seq }));
        db.prepare('INSERT INTO main.cestino (uid, tipo, chiave, nome, contesto, riepilogo_json, registro_json, con_partite, vicini_json, eliminato_il) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, ?)')
          .run(randomBytes(16).toString('hex'), elemento.tipo, elemento.chiave, elemento.nome, elemento.contesto ?? '', JSON.stringify(riepilogo(db, gioco)), JSON.stringify(gioco),
            new Date().toISOString());
        return esito;
      } finally {
        // con un errore la transazione si annulla e i trigger con lei; si tolgono comunque, per non lasciarli mai attivi
        for (const nome of trigger) db.exec(`DROP TRIGGER IF EXISTS temp.${nome}`);
      }
    })();
  } finally {
    db.pragma(`recursive_triggers = ${ricorsivi ? 'ON' : 'OFF'}`);
  }
}
