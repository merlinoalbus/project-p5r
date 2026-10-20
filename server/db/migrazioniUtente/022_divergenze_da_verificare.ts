// ============================================================
// utente 022 — le divergenze fra pin e voci, conservate «da verificare» (L4 «Avanzamento unico», lotti/L4/modifiche.md §1.2, §2.2)
// ============================================================
//
// Da L4 un pin con almeno una voce che conta (permanente o rigenerabile, `shared/caratteriVoce.ts`) non ha più uno stato suo: è fatto
// quando lo sono le sue voci. Prima lo stato del pin (`spillo_partita.raccolto`) e quello delle voci (`punto_partita`) potevano
// divergere: un pin segnato con una voce non segnata. Decisione dell'utente (2026-10-20): **nessuna scrittura automatica** — né la
// voce si segna, né il pin si riapre. La divergenza si conserva in `divergenza_partita` (una riga per pin e voce non fatta), il pin
// si mostra fatto con «Da verificare» e la voce non segnata con «Da verificare», finché l'utente non sceglie «Segna la voce» o
// «Togli il fatto al pin».
// La regola di «fatta» è quella di L4 (§1.3): una voce rigenerabile è fatta se è segnata lei; una permanente se è segnata lei o
// un'altra voce permanente dello stesso **oggetto** (le voci permanenti unite da pin in comune, a catena, dentro lo stesso Palazzo).
// Le voci descrittive (racconto) tengono il segno e non contano: un pin di sole voci descrittive (o senza voci, o di sole voci senza
// carattere: dedali e Persona) tiene il suo stato e non dà divergenze.
// Il caso inverso (voce segnata, pin con `raccolto = 0`) non si registra: con la lettura di prima (l'una o l'altro) e con quella di L4
// (dalle voci) il pin risultava e risulta fatto.
// Nessuna riga di `punto_partita` né di `spillo_partita` cambia. Idempotente (`INSERT OR IGNORE`). Il file delle partite non ha
// chiavi esterne verso quello di gioco: un pin o una voce che spariscono lasciano la riga orfana (`RIFERIMENTI_PARTITE`).
// Nota (§8.11, NR4-1, 2026-10-20): dopo questa migrazione la regola è cambiata — ogni pin tiene il suo stato e la voce lo calcola dai
// suoi pin (utente 023 per i pin condivisi dai rigenerabili). Le righe scritte qui restano: il pin «da verificare» ha la voce «in
// corso k/N» e tiene il chip finché l'utente non fa uno dei due gesti.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { sqlCarattereVoce } from '../../../shared/caratteriVoce.js';

export const utente022: Migration = {
  id: 22,
  name: 'divergenze_da_verificare',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS utente.divergenza_partita (
      partita_id  INTEGER NOT NULL,
      spillo_uid  TEXT NOT NULL,
      voce_chiave TEXT NOT NULL,
      rilevata_il TEXT NOT NULL,
      PRIMARY KEY (partita_id, spillo_uid, voce_chiave)
    )`);
    const c = (schema: string, tabella: string) => !!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(tabella);
    if (!c('main', 'punto_interesse') || !c('main', 'spillo_voce') || !c('main', 'spillo') || !c('main', 'dungeon_area') || !c('utente', 'spillo_partita') || !c('utente', 'punto_partita')) return;
    const conColonna = (db.prepare('PRAGMA main.table_info(punto_interesse)').all() as Array<{ name: string }>).some((x) => x.name === 'carattere');
    const conDedalo = (db.prepare('PRAGMA main.table_info(punto_interesse)').all() as Array<{ name: string }>).some((x) => x.name === 'area_dedalo_chiave');
    if (!conDedalo) return;
    // i legami pin ↔ voce che contano, con il carattere della voce e il Palazzo
    const legami = db.prepare(`SELECT s.uid AS spillo, sv.spillo_id AS id, sv.voce_chiave AS voce, ${sqlCarattereVoce('p', conColonna)} AS carattere, a.dungeon_chiave AS palazzo
      FROM main.spillo_voce sv JOIN main.spillo s ON s.id = sv.spillo_id JOIN main.punto_interesse p ON p.chiave = sv.voce_chiave JOIN main.dungeon_area a ON a.chiave = p.area_chiave
      WHERE s.uid IS NOT NULL`).all() as Array<{ spillo: string; id: number; voce: string; carattere: string | null; palazzo: string }>;
    const contano = legami.filter((l) => l.carattere === 'permanente' || l.carattere === 'rigenerabile');
    // gli oggetti permanenti: componenti connesse del grafo voci permanenti ↔ pin, per Palazzo (unione e ricerca)
    const padre = new Map<string, string>();
    const radice = (x: string): string => { let r = x; while (padre.get(r) !== r) r = padre.get(r)!; let y = x; while (y !== r) { const p = padre.get(y)!; padre.set(y, r); y = p; } return r; };
    const unisci = (a: string, b: string) => { const ra = radice(a), rb = radice(b); if (ra !== rb) padre.set(ra < rb ? rb : ra, ra < rb ? ra : rb); };
    const nodoVoce = (l: { voce: string }) => `v:${l.voce}`;
    const nodoPin = (l: { id: number; palazzo: string }) => `p:${l.palazzo}:${l.id}`;
    for (const l of contano) if (l.carattere === 'permanente') { for (const n of [nodoVoce(l), nodoPin(l)]) if (!padre.has(n)) padre.set(n, n); unisci(nodoVoce(l), nodoPin(l)); }
    const segnate = db.prepare('SELECT partita_id AS partita, punto_chiave AS voce FROM utente.punto_partita').all() as Array<{ partita: number; voce: string }>;
    const segnatePer = new Map<number, Set<string>>();
    const oggettiFattiPer = new Map<number, Set<string>>();
    for (const s of segnate) {
      (segnatePer.get(s.partita) ?? segnatePer.set(s.partita, new Set()).get(s.partita)!).add(s.voce);
      const n = `v:${s.voce}`;
      if (padre.has(n)) (oggettiFattiPer.get(s.partita) ?? oggettiFattiPer.set(s.partita, new Set()).get(s.partita)!).add(radice(n));
    }
    const fatta = (partita: number, l: { voce: string; carattere: string | null }) => l.carattere === 'permanente'
      ? !!oggettiFattiPer.get(partita)?.has(radice(`v:${l.voce}`))
      : !!segnatePer.get(partita)?.has(l.voce);
    const perPin = new Map<string, typeof contano>();
    for (const l of contano) (perPin.get(l.spillo) ?? perPin.set(l.spillo, []).get(l.spillo)!).push(l);
    const raccolti = db.prepare('SELECT partita_id AS partita, spillo_uid AS spillo FROM utente.spillo_partita WHERE raccolto = 1').all() as Array<{ partita: number; spillo: string }>;
    const inserisci = db.prepare('INSERT OR IGNORE INTO utente.divergenza_partita (partita_id, spillo_uid, voce_chiave, rilevata_il) VALUES (?, ?, ?, ?)');
    const adesso = new Date().toISOString();
    const righe: Array<{ partita: number; spillo: string; voce: string }> = [];
    for (const r of raccolti) {
      const voci = perPin.get(r.spillo);
      if (!voci) continue;
      for (const v of new Map(voci.map((x) => [x.voce, x])).values()) {
        if (fatta(r.partita, v)) continue;
        if (inserisci.run(r.partita, r.spillo, v.voce, adesso).changes > 0) righe.push({ partita: r.partita, spillo: r.spillo, voce: v.voce });
      }
    }
    // il caso inverso, solo contato (nessuna riga): voce che conta segnata, pin con raccolto = 0 esplicito
    const zero = db.prepare('SELECT partita_id AS partita, spillo_uid AS spillo FROM utente.spillo_partita WHERE raccolto = 0').all() as Array<{ partita: number; spillo: string }>;
    const inversi = zero.filter((r) => (perPin.get(r.spillo) ?? []).some((v) => fatta(r.partita, v))).length;
    logger.info({ divergenze: righe.length, pin: new Set(righe.map((r) => `${r.partita}:${r.spillo}`)).size, inversi, righe }, 'migrazione utente 022: divergenze pin/voci conservate «da verificare»');
  },
};
