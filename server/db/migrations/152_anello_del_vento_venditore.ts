// ============================================================
// 152 — l'Anello del vento del Venditore ambulante non è il Wind Ring dell'equipaggiamento (L7-NODO scambi/1/offerte/7)
// ============================================================
//
// L'articolo del Venditore ambulante (Central Street, Shibuya; 4.000 ¥, Fascino 5) punta a `accessorio/anello-del-vento-2`, omonimo
// dell'accessorio dell'equipaggiamento `accessorio/anello-del-vento` (Wind Ring, +Garula). Sulle fonti di Royal sono DUE oggetti diversi:
//   - Wind Ring: «+Garula, danno da vento medio a un solo nemico», non in vendita (guida AGS degli accessori: «Sedia elettrica su Kurama
//     Tengu»; GameFAQs e Fandom concordano);
//   - Anello del vento del Venditore ambulante: «Toccata e fuga: lancia in automatico Sukukaja dopo una Staffetta», 4.000 ¥, Fascino 5
//     (stessa guida AGS, «Negozi: Venditore ambulante, Central Street, Shibuya»). Il nome inglese (forse «Wing Ring», da uno snippet di
//     MegaTenWiki non verificabile) NON è nei dati: non è stato riscontrato su una fonte leggibile.
// La guida italiana usa lo stesso nome per i due oggetti. NON si fondono: si documenta la differenza nell'identità del Venditore
// (effetto e descrizione), con la riga di prima in `seed_json` come ogni modifica del catalogo dall'app. Nessun articolo, prezzo, condizione,
// acquisto o legame cambia. Scrive solo se effetto e descrizione sono ancora vuoti. Idempotente. Non tocca `partite.db`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

const CHIAVE = 'accessorio/anello-del-vento-2';
const EFFETTO = 'Toccata e fuga: lancia in automatico Sukukaja dopo una Staffetta';
const DESCRIZIONE = 'Non è il Wind Ring (+Garula), l’accessorio dell’equipaggiamento che si ottiene con la Sedia elettrica su Kurama Tengu: la guida italiana usa lo stesso nome per due oggetti. Questo è l’accessorio del Venditore ambulante (4.000 ¥, Fascino 5).';
const COLONNE = ['categoria', 'sottocategoria', 'nome', 'nomi_altri_json', 'nome_originale', 'effetto', 'descrizione', 'statistiche_json'] as const;

export const migration152: Migration = {
  id: 152,
  name: 'anello_del_vento_venditore',
  up(db) {
    if (!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'catalogo_oggetto'").get()) return;
    const r = db.prepare('SELECT * FROM main.catalogo_oggetto WHERE chiave = ?').get(CHIAVE) as Record<string, unknown> | undefined;
    let esito: string;
    if (!r) esito = 'identità assente';
    else if (r.effetto === EFFETTO && r.descrizione === DESCRIZIONE) esito = 'gia-fatta';
    else if ((r.effetto ?? '') !== '' || (r.descrizione ?? '') !== '') esito = 'saltata: effetto o descrizione già scritti';
    else if (r.fonte_tipo !== 'listino' || r.fonte_chiave !== 'venditore-ambulante/anello-del-vento') esito = 'saltata: non è più l’identità del Venditore ambulante';
    else {
      const copia = (r.seed_json as string | null) ?? (r.origine === 'seed' ? JSON.stringify(Object.fromEntries(COLONNE.map((c) => [c, r[c]]))) : null);
      const x = db.prepare("UPDATE main.catalogo_oggetto SET effetto = ?, descrizione = ?, origine = 'utente', seed_json = ?, updated_at = ? WHERE chiave = ? AND COALESCE(effetto, '') = '' AND COALESCE(descrizione, '') = ''")
        .run(EFFETTO, DESCRIZIONE, copia, new Date().toISOString(), CHIAVE);
      esito = x.changes === 1 ? 'applicata' : 'saltata: cambiata nel frattempo';
    }
    logger.info({ oggetto: CHIAVE, esito }, '[migration152] Anello del vento del Venditore ambulante');
  },
};
