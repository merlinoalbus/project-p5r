import type { Migration } from '../migrationRunner.js';
import type { RequisitoSpillo } from '../../../shared/condizioniSpillo.js';

type Riga = Record<string, unknown>;
interface Rettifica { chiave: string; negozio: string; frase: string; prima: RequisitoSpillo[]; dopo: RequisitoSpillo[] }
const lettura = (chiave: string): RequisitoSpillo => ({ tipo: 'lettura', categoria: 'libro', chiave });
const mansarda: RequisitoSpillo = { tipo: 'evento', evento: 'mansarda-pulita' };
const libriPrecedenti = ['spadaccino-provetto', 'chiamami-capo', 'casanova-spregiudicato', 'rivelazioni-eroiche', 'come-fare-karakuri'];
const cuore = (altri: boolean): RequisitoSpillo[] => [
  { tipo: 'data', dal: '09-01' }, lettura('pagine-ammuffite'),
  { tipo: 'gruppo', modo: 'tutte', condizioni: [...libriPrecedenti, ...(altri ? [] : ['comprendere-il-cuore'])].map(lettura) },
];
const offertaMansardaPrima: RequisitoSpillo[] = [
  { tipo: 'data', dal: '04-18' }, { tipo: 'data', dal: '11-25' },
  { tipo: 'gruppo', modo: 'almeno-una', condizioni: [
    { tipo: 'non', condizione: mansarda },
    { tipo: 'gruppo', modo: 'tutte', condizioni: [mansarda, { tipo: 'data', dal: '04-18' }] },
  ] },
];
const offertaMansardaDopo: RequisitoSpillo[] = [
  { tipo: 'data', dal: '04-18' }, { tipo: 'data', dal: '11-25' }, { tipo: 'non', condizione: mansarda },
];

/** Formule intere attestate nel pacchetto pubblico e nel censimento corrente; nessuna rimozione ricorsiva generica. */
const RETTIFICHE: Rettifica[] = [
  { chiave: 'libreria-nagiuri/comprendere-il-cuore', negozio: 'libreria-nagiuri',
    frase: 'dopo aver letto tutti gli altri libri di Jinbocho', prima: cuore(false), dopo: cuore(true) },
  { chiave: 'hinokuniya/anima-da-cineasta', negozio: 'hinokuniya',
    frase: 'dopo essere andati al cinema o aver visto un DVD almeno una volta',
    prima: [{ tipo: 'quartiere', quartiere: 'shinjuku' }, { tipo: 'contatore', cosa: 'film-completati', almeno: 1 }],
    dopo: [{ tipo: 'quartiere', quartiere: 'shinjuku' }, { tipo: 'contatore', cosa: 'film-con-una-visione', almeno: 1 }] },
  ...['il-pensiero-sociale', 'esplorando-yoncha-4'].map((slug): Rettifica => ({
    chiave: `libreria-taiheido/${slug}`, negozio: 'libreria-taiheido',
    frase: 'solo se la mansarda del Leblanc non viene pulita (altrimenti si ottiene dopo aver pulito la mansarda del Leblanc, dal 18 aprile)',
    prima: offertaMansardaPrima, dopo: offertaMansardaDopo,
  })),
];

/** Contratto dello snapshot parziale scritto da catalogoService.CAMPI.articolo. */
const CAMPI_SNAPSHOT_ARTICOLO = new Set(['condizioni_json', 'negozio_chiave', 'nome', 'nome_it', 'categoria', 'per', 'prezzo', 'quantita',
  'oggetto_fonte', 'oggetto_chiave', 'catalogo_chiave', 'costo_json', 'effetto_json', 'effetto', 'statistiche', 'nota', 'verificato']);

function canonico(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(canonico);
  if (!x || typeof x !== 'object') return x;
  return Object.fromEntries(Object.entries(x).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => [k, canonico(v)]));
}
const uguale = (a: unknown, b: unknown): boolean => JSON.stringify(canonico(a)) === JSON.stringify(canonico(b));
function oggetto(x: unknown): Riga | null { return x && typeof x === 'object' && !Array.isArray(x) ? x as Riga : null; }
function decodifica(x: unknown): unknown {
  if (typeof x !== 'string') return undefined;
  try { return JSON.parse(x) as unknown; } catch { return undefined; }
}

export const migration123: Migration = {
  id: 123,
  name: 'bonifica_condizioni_letture',
  up(db) {
    const convertite: string[] = [];
    const escluse: Array<{ origine: string; motivo: string }> = [];
    const perChiave = new Map(RETTIFICHE.map((r) => [r.chiave, r]));
    const rettifica = (r: Riga, origine: string): Riga => {
      const c = typeof r.chiave === 'string' ? perChiave.get(r.chiave) : undefined;
      if (!c) return r;
      if (r.origine !== 'seed' || r.negozio_chiave !== c.negozio || r.condizione !== c.frase) {
        escluse.push({ origine, motivo: 'provenienza o frase diverse: dati preservati' }); return r;
      }
      const condizioni = decodifica(r.condizioni_json);
      if (uguale(condizioni, c.dopo)) return r;
      if (!uguale(condizioni, c.prima)) {
        escluse.push({ origine, motivo: 'formula diversa o illeggibile: dati preservati' }); return r;
      }
      convertite.push(origine);
      return { ...r, condizioni_json: JSON.stringify(c.dopo) };
    };
    const conSeed = (r: Riga, origine: string): Riga => {
      let dopo = rettifica(r, origine);
      if (typeof r.seed_json !== 'string') return dopo;
      const seed = oggetto(decodifica(r.seed_json));
      const c = typeof r.chiave === 'string' ? perChiave.get(r.chiave) : undefined;
      if (!seed || !c) {
        escluse.push({ origine: `${origine}/seed`, motivo: 'snapshot non riconosciuto: preservato' }); return dopo;
      }
      let nuovoSeed = seed;
      if ('chiave' in seed && 'origine' in seed && 'condizione' in seed) {
        if (seed.chiave !== r.chiave) {
          escluse.push({ origine: `${origine}/seed`, motivo: 'identità snapshot diversa: preservato' }); return dopo;
        }
        nuovoSeed = rettifica(seed, `${origine}/seed`);
      } else {
        // Nascondi/Correggi salvano solo i campi scrivibili, non chiave/origine/frase.
        // L'identità proviene dal contenitore attestato; non si inserisce nello snapshot.
        const parziale = Object.keys(seed).every((k) => CAMPI_SNAPSHOT_ARTICOLO.has(k));
        const contenitoreAttestato = (r.origine === 'seed' || r.origine === 'utente') && r.condizione === c.frase && r.negozio_chiave === c.negozio;
        if (!parziale || !contenitoreAttestato || seed.negozio_chiave !== c.negozio) {
          escluse.push({ origine: `${origine}/seed`, motivo: 'snapshot parziale non attestato: preservato' }); return dopo;
        }
        const condizioni = decodifica(seed.condizioni_json);
        if (!uguale(condizioni, c.dopo)) {
          if (!uguale(condizioni, c.prima)) {
            escluse.push({ origine: `${origine}/seed`, motivo: 'formula snapshot diversa o illeggibile: preservata' }); return dopo;
          }
          nuovoSeed = { ...seed, condizioni_json: JSON.stringify(c.dopo) };
          convertite.push(`${origine}/seed`);
        }
      }
      if (nuovoSeed !== seed) dopo = { ...dopo, seed_json: JSON.stringify(nuovoSeed) };
      return dopo;
    };
    const aggiorna = db.prepare('UPDATE main.articolo SET condizioni_json = ?, seed_json = ? WHERE chiave = ? AND condizioni_json IS ? AND seed_json IS ?');
    for (const c of RETTIFICHE) {
      const r = db.prepare('SELECT * FROM main.articolo WHERE chiave = ?').get(c.chiave) as Riga | undefined;
      if (!r) { escluse.push({ origine: `articolo:${c.chiave}`, motivo: 'riga assente: non ricreata' }); continue; }
      const dopo = conSeed(r, `articolo:${c.chiave}`);
      if (dopo !== r) aggiorna.run(dopo.condizioni_json, dopo.seed_json ?? null, c.chiave, r.condizioni_json, r.seed_json);
    }
    // Visita mirata delle sole immagini articolo del registro. L'audit storico 121 non viene toccato.
    const haRegistro = (db.prepare('PRAGMA main.table_info(cestino)').all() as Array<{ name: string }>).some((c) => c.name === 'registro_json');
    if (haRegistro) for (const r of db.prepare('SELECT id, registro_json FROM main.cestino').all() as Array<{ id: number; registro_json: string }>) {
      const passi = decodifica(r.registro_json);
      if (!Array.isArray(passi)) { escluse.push({ origine: `cestino:${r.id}`, motivo: 'registro illeggibile: preservato' }); continue; }
      let cambiato = false;
      for (const [i, p] of passi.entries()) {
        const passo = oggetto(p);
        if (passo?.tabella !== 'articolo') continue;
        for (const campo of ['prima', 'dopo'] as const) {
          const immagine = oggetto(passo[campo]);
          if (!immagine || typeof immagine.chiave !== 'string' || !perChiave.has(immagine.chiave)) continue;
          const dopo = conSeed(immagine, `cestino:${r.id}/passo:${i}/${campo}`);
          if (dopo !== immagine) { passo[campo] = dopo; cambiato = true; }
        }
      }
      if (cambiato) db.prepare('UPDATE main.cestino SET registro_json = ? WHERE id = ? AND registro_json = ?').run(JSON.stringify(passi), r.id, r.registro_json);
    }
    // Solo nell'istanza: conteggi e motivi, mai payload o impronte personali nel repository o nei log.
    db.prepare('INSERT INTO main.dati_guida(chiave,json) VALUES (?,?) ON CONFLICT(chiave) DO NOTHING')
      .run('bonifica-condizioni-letture-123', JSON.stringify({ convertite, escluse }));
  },
};
