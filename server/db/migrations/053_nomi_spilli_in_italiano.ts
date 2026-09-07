// ============================================================
// 053 — i nomi degli spilli non ancora identificati, in italiano
// ============================================================
//
// **Duecentottanta spilli su 1617 si presentano in giapponese.** L'estrazione, quando non riesce a
// dire che cos'è un pin, scrive onestamente «Da identificare» e ci mette accanto il nome che il
// gioco dà allo sprite, che è la traccia da seguire per identificarlo. Il nome però è quello
// interno, in giapponese — «Da identificare: «ミニマップ：自分用アイコン» (tipo 28)» — e in un'app
// che è tutta in italiano finisce sotto gli occhi di chi gioca: alla Shujin Academy, sulle tre
// planimetriche dei piani, sono sei spilli su venti.
//
// Dodici sono peggio ancora: il nome arriva come stringa esadecimale
// (`837d83438370838c83585f...`), cioè i byte Shift-JIS del nome mai decodificati.
//
// Qui si **traduce il nome, non si decide il significato**. Lo spillo resta di tipo `nota` e resta
// «Da identificare»: dire che cos'è vuole le prove del pipeline dell'atlante (vedi
// `docs/CODEX-SEMANTICA-PIN.md`), e quelle non le dà una traduzione. Cambia solo che la traccia si
// legge: «Da identificare (tipo 28) — minimappa: icona del giocatore».
//
// I nomi nativi sono **troncati** dalla tabella del gioco a sedici caratteri (l'esadecimale a
// trentadue byte, che tronca perfino a metà carattere): la resa italiana lo rispecchia e non
// completa parole che il dato non ha.
//
// Come per la 052, la traduzione si rifà a ogni avvio sulle righe del seed: quando l'atlante verrà
// rigenerato con i nomi già risolti — è la strada giusta, ed è di chi cura l'estrazione — queste
// righe non troveranno più niente da tradurre e la migrazione diventerà un giro a vuoto.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type Database from 'better-sqlite3';

/** I nomi nativi che compaiono negli spilli non identificati, con la loro resa italiana.
 *
 * Ognuno è il nome dello sprite nella tabella delle parti del gioco. La resa traduce alla lettera:
 * `ミニマップ` è «minimappa», `自分用アイコン` «icona per sé stessi» cioè l'icona che segna il
 * giocatore, `目的地` «destinazione», `認知ロックポ` è `認知ロックポイント` troncato («punto di
 * blocco cognitivo»), `チェック` «punto da esaminare», `ベルベット` «Velluto».
 *
 * L'ultimo è la stringa esadecimale: sono i byte Shift-JIS di `マイパレス_アイテム配置したとき`
 * — «il mio palazzo», che in italiano il gioco chiama Covo dei Ladri, «quando è stato posizionato
 * un oggetto». */
export const NOMI_NATIVI: Record<string, string> = {
  'ミニマップ：自分用アイコン': 'minimappa: icona del giocatore',
  'ミニマップ：目的地・認知ロックポ': 'minimappa: destinazione, punto di blocco cognitivo',
  'ミニマップ：チェック': 'minimappa: punto da esaminare',
  'ミニマップ：ベルベット': 'minimappa: Velluto',
  '837d83438370838c83585f8341834383658380947a927582b582bd82c682ab82': 'Covo dei Ladri: quando è stato posizionato un oggetto',
};

const FORMA = /^Da identificare: «(.+)» \(tipo (\d+)\)$/;

/** «Da identificare: «<nativo>» (tipo N)» → «Da identificare (tipo N) — <resa italiana>».
 *
 * Restituisce `null` quando non c'è niente da fare: la riga non ha quella forma, oppure il nome
 * nativo non è fra quelli che sappiamo tradurre — e allora si lascia com'è, che è l'unica cosa
 * onesta da fare con un nome che non si è capito. */
export function nomeSpilloTradotto(nome: string): string | null {
  const m = FORMA.exec(nome);
  if (!m) return null;
  const resa = NOMI_NATIVI[m[1]];
  return resa ? `Da identificare (tipo ${m[2]}) — ${resa}` : null;
}

/** Traduce i nomi degli spilli del seed; quelli che hai scritto tu restano come li hai scritti. */
export function traduciNomiSpilli(db: Database.Database): number {
  const colonne = (db.prepare('PRAGMA table_info(spillo)').all() as Array<{ name: string }>).map((c) => c.name);
  if (!colonne.includes('nome')) return 0;
  const conOrigine = colonne.includes('origine');
  const righe = db.prepare(`SELECT id, nome FROM spillo WHERE nome LIKE 'Da identificare: %'${conOrigine ? " AND origine = 'seed'" : ''}`).all() as Array<{ id: number; nome: string }>;
  const aggiorna = db.prepare('UPDATE spillo SET nome = ? WHERE id = ?');
  let fatti = 0;
  for (const r of righe) {
    const nuovo = nomeSpilloTradotto(r.nome);
    if (!nuovo) continue;
    aggiorna.run(nuovo, r.id);
    fatti += 1;
  }
  return fatti;
}

export const migration053: Migration = {
  id: 53,
  name: 'nomi_spilli_in_italiano',
  up(db) {
    traduciNomiSpilli(db);
  },
};
