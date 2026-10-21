// G-014: sedi aggiuntive dei set confermati. Nessun riferimento del pin o acquisto viene riscritto.
import type { AppDatabase } from '../dbService.js';

type Riga = Record<string, unknown>;
const CAMPI_OFFERTA = ['nome', 'nome_it', 'categoria', 'per', 'prezzo', 'effetto', 'statistiche', 'quantita', 'condizioni_json',
  'disponibile_dal', 'condizione', 'nota', 'fonte', 'verificato', 'nascosto', 'catalogo_chiave', 'costo_json'] as const;

export function condividiListini121(db: AppDatabase): void {
  const adesso = new Date().toISOString();
  // Solo il duplicato esatto A: le varianti di Akihabara, Sala giochi e bagno pubblico non sono lo stesso listino.
  const canonico = 'distributore-shujin-edificio';
  const duplicato = 'distributore-shujin-cancello-1';
  const n = db.prepare('SELECT chiave,tipo,sede_chiave,listino_condiviso,nascosto,orari_json,eccezione_orari_json,programma_punti_json,confidente_chiave FROM negozio WHERE chiave IN (?,?)').all(canonico, duplicato) as
    Array<{ chiave: string; tipo: string; sede_chiave: string | null; listino_condiviso: string | null; nascosto: number;
      orari_json: string | null; eccezione_orari_json: string | null; programma_punti_json: string | null; confidente_chiave: string | null }>;
  const origine = n.find((r) => r.chiave === duplicato); const destinazione = n.find((r) => r.chiave === canonico);
  if (origine && destinazione && origine.tipo === 'distributore' && destinazione.tipo === 'distributore'
    && origine.sede_chiave !== null && origine.sede_chiave === destinazione.sede_chiave && !destinazione.listino_condiviso
    && origine.nascosto === 0 && destinazione.nascosto === 0 && origine.orari_json === destinazione.orari_json
    && origine.eccezione_orari_json === destinazione.eccezione_orari_json && origine.programma_punti_json === destinazione.programma_punti_json
    && origine.confidente_chiave === destinazione.confidente_chiave
    && (!origine.listino_condiviso || origine.listino_condiviso === canonico)) {
    const articoli = db.prepare('SELECT * FROM articolo WHERE negozio_chiave = ? ORDER BY ordine,chiave');
    const a = articoli.all(duplicato) as Riga[]; const b = articoli.all(canonico) as Riga[];
    const firma = (r: Riga) => JSON.stringify(CAMPI_OFFERTA.map((c) => r[c] ?? null));
    // Corrispondenza biunivoca, non per nome soltanto. Una correzione o un'offerta in più mantiene il listino separato.
    if (a.length > 0 && a.length === b.length && a.every((r) => b.filter((s) => firma(r) === firma(s)).length === 1)
      && b.every((r) => a.filter((s) => firma(r) === firma(s)).length === 1)
      && a.every((r) => !r.articolo_condiviso || b.some((s) => s.chiave === r.articolo_condiviso))) {
      db.prepare('UPDATE negozio SET listino_condiviso = ? WHERE chiave = ? AND listino_condiviso IS NULL').run(canonico, duplicato);
      for (const r of a) db.prepare('UPDATE articolo SET articolo_condiviso = ? WHERE chiave = ? AND articolo_condiviso IS NULL')
        .run(b.find((s) => firma(r) === firma(s))!.chiave, r.chiave);
    }
  }

  const sedi = [
    { area: 'citta/shibuya/central-street', luogo: 'shibuya/distributori-central-street', nome: 'Distributori di Central Street',
      pin: [{ id: 1527, negozio: canonico }, { id: 1768, negozio: 'distributore-shujin-cancello-2' }] },
    { area: 'citta/shibuya/tornello-della-linea-ginza', luogo: 'shibuya/distributore-tornello-ginza', nome: 'Distributore del tornello della linea Ginza',
      pin: [{ id: 1547, negozio: canonico }] },
  ];
  for (const sede of sedi) {
    const area = db.prepare('SELECT quartiere_chiave FROM area WHERE chiave = ?').get(sede.area) as { quartiere_chiave: string | null } | undefined;
    if (area?.quartiere_chiave !== 'shibuya') continue;
    for (const p of sede.pin) {
      const pin = db.prepare(`SELECT s.uid FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave
        WHERE s.id = ? AND s.riferimento_tipo = 'negozio' AND s.riferimento_chiave = ? AND m.area_chiave = ?`).get(p.id, p.negozio, sede.area) as { uid: string | null } | undefined;
      const negozio = db.prepare('SELECT sede_chiave,nascosto FROM negozio WHERE chiave = ?').get(p.negozio) as { sede_chiave: string | null; nascosto: number } | undefined;
      if (!pin?.uid || !negozio || negozio.nascosto) continue;
      // La sola presenza di un distributore nell'Area non dimostra che sia questa sede.
      // Si usa soltanto la chiave attestata; una riga dell'utente o eliminata non viene occupata/ricreata.
      let luogo = sede.luogo;
      {
        const esistente = db.prepare('SELECT area_chiave,quartiere_chiave,tipo,nascosto,origine FROM luogo WHERE chiave = ?').get(luogo) as
          { area_chiave: string | null; quartiere_chiave: string; tipo: string; nascosto: number; origine: string } | undefined;
        if (esistente && (esistente.origine === 'utente' || esistente.area_chiave !== sede.area || esistente.quartiere_chiave !== 'shibuya' || esistente.tipo !== 'distributore' || esistente.nascosto)) continue;
        if (!esistente && db.prepare("SELECT 1 FROM cestino WHERE tipo = 'luogo' AND chiave = ?").get(luogo)) continue;
        if (!esistente) {
          const ordine = (db.prepare("SELECT COALESCE(MAX(ordine),-1)+1 AS n FROM luogo WHERE quartiere_chiave = 'shibuya'").get() as { n: number }).n;
          db.prepare(`INSERT INTO luogo(chiave,quartiere_chiave,ordine,tipo,nome,cosa_offre,area_chiave,condizioni_json,fonte_condizioni_json,fonte,verificato,origine,updated_at)
            VALUES (?,'shibuya',?,'distributore',?,'Bevande dei listini condivisi',?,?,?,'https://www.allgamestaff.it/persona-5-royal/distributori-automatici/',1,'seed',?)`)
            .run(luogo, ordine, sede.nome, sede.area, JSON.stringify([{ tipo: 'quartiere', quartiere: 'shibuya' }]),
              JSON.stringify({ registro: 'G-014', certezza: 'media', nota: 'Sede di un set condiviso, dal pin esistente confermato; il pin non cambia.' }), adesso);
        }
      }
      const r = db.prepare('SELECT chiave FROM luogo WHERE chiave = ? AND area_chiave = ? AND nascosto = 0').get(luogo, sede.area) as { chiave: string } | undefined;
      if (!r || luogo === negozio.sede_chiave) continue;
      luogo = r.chiave;
      db.prepare('INSERT OR IGNORE INTO negozio_luogo_extra(negozio_chiave,luogo_chiave) VALUES (?,?)').run(p.negozio, luogo);
      db.prepare('INSERT OR IGNORE INTO negozio_sede_spillo(spillo_uid,negozio_chiave,luogo_chiave) VALUES (?,?,?)').run(pin.uid, p.negozio, luogo);
    }
  }
}
