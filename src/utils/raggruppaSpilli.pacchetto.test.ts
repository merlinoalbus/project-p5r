// ============================================================
// L'invariante dei bersagli, provato sulle mappe vere del pacchetto
// ============================================================
//
// La regola del raggruppamento è stata rifatta sei volte, e ogni volta il rilievo è arrivato da
// una misura fatta a mano sul pacchetto: «su 7.036 casi, 79 finiscono addosso a un'altra nube»,
// «381 su 2.439 lasciano il pin a meno di 46 px». Rifare quella misura a mano a ogni giro è il
// modo per sbagliarla: qui la si fa girare come test, con lo stesso codice che usa il componente.
//
// **L'invariante è uno solo**: due bersagli resi non distano mai meno di DISTANZA_MINIMA_SPILLI,
// a ogni larghezza e a ogni ingrandimento, né nel visore né nell'editor.

import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { inquadraturaMappa } from './inquadraturaMappa';
import { raggruppaSpilli, ALTEZZA_GOCCIA, DISTANZA_MINIMA_SPILLI, type Gruppo } from './raggruppaSpilli';
import type { SpilloDto } from '../types';

const PACCHETTO = resolve(__dirname, '../../pacchetto/gioco.db');
/** Le tre larghezze della verifica, con la tela che il visore ha davvero a ciascuna. */
const FORMATI = [
  { nome: 'telefono', w: 359, h: 420 },
  { nome: 'tablet', w: 752, h: 560 },
  { nome: 'monitor', w: 940, h: 843 },
];
const INGRANDIMENTI = [1, 1.5, 3, 8];

interface Riga { chiave: string; larghezza: number; altezza: number }

function spilliDi(db: Database.Database, mappa: string): SpilloDto[] {
  const righe = db.prepare('SELECT id, nome, tipo, x, y FROM spillo WHERE mappa_chiave = ? ORDER BY id').all(mappa) as { id: number; nome: string; tipo: string; x: number; y: number }[];
  return righe.map((r) => ({
    id: r.id, nome: r.nome, tipo: r.tipo, tipoNome: r.tipo, x: r.x, y: r.y,
    mappaChiave: mappa, colore: '#888', descrizione: '', riferimento: null, collezionabile: false,
    ordine: 0, origine: 'seed', raccolto: false, dettaglio: null, condizioni: [], immagini: [], updatedAt: '',
  } as unknown as SpilloDto));
}

/** Il centro del bersaglio di ogni cosa resa: la goccia è ancorata alla punta, la pastiglia no. */
function centriResi(singoli: SpilloDto[], gruppi: Gruppo[], inq: { pan: { x: number; y: number }; zoom: number; nat: { w: number; h: number } }) {
  const perSchermo = (x: number, y: number) => ({ x: inq.pan.x + (x / 100) * inq.nat.w * inq.zoom, y: inq.pan.y + (y / 100) * inq.nat.h * inq.zoom });
  const out = singoli.map((s) => { const p = perSchermo(s.x, s.y); return { chi: s.nome, x: p.x, y: p.y - ALTEZZA_GOCCIA / 2 }; });
  for (const g of gruppi) {
    const p = perSchermo(g.x, g.y);
    out.push({ chi: `+${g.spilli.length}`, x: p.x + (g.scosto?.x ?? 0), y: p.y + (g.scosto?.y ?? 0) });
  }
  return out;
}

describe.skipIf(!existsSync(PACCHETTO))('i bersagli delle mappe del pacchetto', () => {
  const db = existsSync(PACCHETTO) ? new Database(PACCHETTO, { readonly: true }) : null;
  const mappe = (db?.prepare('SELECT chiave, larghezza, altezza FROM mappa WHERE larghezza > 0 AND altezza > 0').all() ?? []) as Riga[];

  it('sono più di duecento, e con gli spilli dentro: altrimenti questo test non prova niente', () => {
    expect(mappe.length).toBeGreaterThan(200);
    const conSpilli = mappe.filter((m) => spilliDi(db!, m.chiave).length >= 2);
    expect(conSpilli.length).toBeGreaterThan(150);
  });

  it('non ci sono mai due bersagli più vicini di un bersaglio — nel visore', () => {
    const guasti: string[] = [];
    for (const m of mappe) {
      const spilli = spilliDi(db!, m.chiave);
      if (spilli.length < 2) continue;
      const nat = { w: m.larghezza, h: m.altezza };
      for (const f of FORMATI) {
        const fit = inquadraturaMappa(nat, { w: f.w, h: f.h }, null, spilli);
        for (const k of INGRANDIMENTI) {
          const zoom = fit.zoom * k;
          const pan = k === 1 ? fit.pan : { x: f.w / 2 - (nat.w / 2) * zoom, y: f.h / 2 - (nat.h / 2) * zoom };
          const inq = { pan, zoom, nat, dim: { w: f.w, h: f.h } };
          const { singoli, gruppi } = raggruppaSpilli(spilli, inq, { selezionatoId: null, editor: false });
          const c = centriResi(singoli, gruppi, inq);
          for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
            const d = Math.hypot(c[i].x - c[j].x, c[i].y - c[j].y);
            if (d < DISTANZA_MINIMA_SPILLI - 0.001) guasti.push(`${m.chiave} ${f.nome} ×${k}: ${c[i].chi} ↔ ${c[j].chi} = ${d.toFixed(1)}`);
          }
        }
      }
    }
    expect(guasti.slice(0, 10)).toEqual([]);
  });

  it('non ci sono mai due bersagli più vicini di un bersaglio — nell’editor, con un pin selezionato', () => {
    const guasti: string[] = [];
    for (const m of mappe) {
      const spilli = spilliDi(db!, m.chiave);
      if (spilli.length < 2) continue;
      const nat = { w: m.larghezza, h: m.altezza };
      for (const f of FORMATI) {
        const fit = inquadraturaMappa(nat, { w: f.w, h: f.h }, null, spilli);
        const inq = { pan: fit.pan, zoom: fit.zoom, nat, dim: { w: f.w, h: f.h } };
        // ogni spillo, a turno, è quello che si sta trascinando
        for (const sel of spilli) {
          const { singoli, gruppi } = raggruppaSpilli(spilli, inq, { selezionatoId: sel.id, editor: true });
          const c = centriResi(singoli, gruppi, inq);
          for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
            const d = Math.hypot(c[i].x - c[j].x, c[i].y - c[j].y);
            if (d < DISTANZA_MINIMA_SPILLI - 0.001) guasti.push(`${m.chiave} ${f.nome} sel=${sel.id}: ${c[i].chi} ↔ ${c[j].chi} = ${d.toFixed(1)}`);
          }
        }
      }
    }
    expect(guasti.slice(0, 10)).toEqual([]);
  });
});
