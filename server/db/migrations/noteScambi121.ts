// Archivio conservativo della copia degli scambi: dopo M7 si consulta il listino del negozio.
import type { AppDatabase } from '../dbService.js';

type Riga = Record<string, unknown>;
const testo = (v: unknown): string => typeof v === 'string' ? v.trim() : '';
function record(v: unknown): Riga | null { return v && typeof v === 'object' && !Array.isArray(v) ? v as Riga : null; }
function json(v: unknown): unknown { try { return typeof v === 'string' ? JSON.parse(v) as unknown : null; } catch { return null; } }

/** Congelata nella migrazione: nessuna ricerca per somiglianza, nessun negozio ricreato. */
export function conservaNoteScambi121(db: AppDatabase): void {
  const guida = record(json((db.prepare("SELECT json FROM dati_guida WHERE chiave = 'oggetti-guida'").get() as { json: string } | undefined)?.json));
  const fonti: Readonly<Record<string, string>> = {
    'Mercante Sakai': 'mercante-sakai', 'Venditore Ambulante': 'venditore-ambulante',
    'Gachapon di Akihabara ("L\'Uomo avido")': 'gachapon-akihabara',
    'Affari Loschi di Tanaka': 'tanaka-affari-loschi', Jose: 'jose',
  };
  if (!Array.isArray(guida?.scambi)) return;
  const leggi = db.prepare('SELECT * FROM negozio WHERE chiave = ?');
  const salva = db.prepare('UPDATE negozio SET note = ?,seed_json = ?,updated_at = ? WHERE chiave = ? AND note IS ? AND seed_json IS ?');
  for (const valore of guida.scambi) {
    const s = record(valore); if (!s) continue;
    const chiave = fonti[testo(s.venditore)];
    if (!chiave) throw new Error('Venditore degli scambi non collegato a un negozio: la conversione non nasconde le indicazioni della guida.');
    const negozio = leggi.get(chiave) as Riga | undefined; if (!negozio) continue;
    const marcatore = 'Indicazioni della guida precedente — Scambi (archivio)';
    const offerte = (Array.isArray(s.offerte) ? s.offerte : []).flatMap((v: unknown) => {
      const o = record(v); if (!o) return [];
      return [`Ricevi: ${testo(o.ricevi)} · Dai: ${testo(o.dai)}${testo(o.note) ? ` · ${testo(o.note)}` : ''}`];
    });
    const blocco = [marcatore, 'Testo originale conservato come nota. Per costi e requisiti correnti fa fede il listino; questa nota non registra acquisti né collega automaticamente oggetti.',
      testo(s.dove), testo(s.quando), ...offerte, testo(s.fonte)].filter(Boolean).join('\n');
    const aggiungi = (nota: unknown) => testo(nota).includes(marcatore) ? String(nota) : [typeof nota === 'string' ? nota : '', blocco].filter(Boolean).join('\n\n');
    const nota = aggiungi(negozio.note);
    // Si estende solo una copia già presente: crearla qui trasformerebbe una riga dell'utente in una riga ripristinabile alla guida.
    // Senza copia, la prima eventuale modifica futura fotograferà la nota migrata insieme agli altri valori correnti.
    const precedente = record(json(negozio.seed_json));
    const snapshot = precedente ? JSON.stringify({ ...precedente, note: aggiungi(precedente.note) }) : negozio.seed_json;
    if (nota === negozio.note && snapshot === negozio.seed_json) continue;
    salva.run(nota, snapshot ?? null, new Date().toISOString(), chiave, negozio.note ?? null, negozio.seed_json ?? null);
  }
}
