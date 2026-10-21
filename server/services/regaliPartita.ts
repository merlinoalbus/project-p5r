// La chiave identifica il regalo; nome e data della consegna restano quelli storici.
import { nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { nomiAltriOggetto } from './catalogoOggettiLetture.js';

export type SceltaRegalo = string | { catalogo: string };
export interface RegaloDellaPartita { confidente: string; nome: string; catalogo: string | null }

/** Compatibilità durante la preparazione di M7 e con un file delle partite ancora precedente alla 026. */
function chiaviDisponibili(): boolean {
  return !!prepared("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'catalogo_oggetto'").get()
    && (prepared('PRAGMA utente.table_info(regalo_partita)').all() as Array<{ name: string }>).some((c) => c.name === 'catalogo_chiave');
}

/** Solo nomi esatti attestati per quel Confidente: nessuna somiglianza e nessuna scelta fra omonimi. */
function nomiDeiRegali(confidente?: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const righe = prepared(`SELECT g.confidente_chiave,g.nome AS nome_storico,c.chiave,c.nome,c.nomi_altri_json
    FROM confidente_regalo g JOIN catalogo_oggetto c ON c.chiave = g.catalogo_chiave
    ${confidente === undefined ? '' : 'WHERE g.confidente_chiave = ?'}`).all(...(confidente === undefined ? [] : [confidente])) as Array<{
      confidente_chiave: string; nome_storico: string; chiave: string; nome: string; nomi_altri_json: string;
    }>;
  for (const r of righe) for (const nome of [r.nome_storico, r.nome, ...nomiAltriOggetto(r.nomi_altri_json)]) {
    const indice = JSON.stringify([r.confidente_chiave, nome]);
    const chiavi = out.get(indice) ?? new Set<string>(); chiavi.add(r.chiave); out.set(indice, chiavi);
  }
  return out;
}

function chiaveUnivoca(nomi: Map<string, Set<string>>, confidente: string, nome: string): string | null {
  const chiavi = nomi.get(JSON.stringify([confidente, nome]));
  return chiavi?.size === 1 ? [...chiavi][0] : null;
}

/** Dopo 026 vale il riferimento salvato. Un riferimento scollegato non viene reinterpretato per nome. */
export function regaliDellaPartita(partita: number, confidente?: string): RegaloDellaPartita[] {
  const conChiavi = chiaviDisponibili();
  const righe = prepared(`SELECT confidente_chiave,regalo,${conChiavi ? 'catalogo_chiave' : 'NULL AS catalogo_chiave'}
    FROM regalo_partita WHERE partita_id = ?${confidente === undefined ? '' : ' AND confidente_chiave = ?'} ORDER BY fatto_at`)
    .all(partita, ...(confidente === undefined ? [] : [confidente])) as Array<{ confidente_chiave: string; regalo: string; catalogo_chiave: string | null }>;
  return righe.map((r) => ({ confidente: r.confidente_chiave, nome: r.regalo,
    catalogo: r.catalogo_chiave }));
}

/** Si usa nella transazione del gesto esistente; non aggiunge punti né eventi allo storico. */
export function scriviRegaloPartita(partita: number, confidente: string, scelta: SceltaRegalo, fatto: boolean): void {
  const conChiavi = chiaviDisponibili();
  const nomeLegacy = typeof scelta === 'string' ? scelta.trim() : null;
  if (nomeLegacy !== null && !nomeLegacy) throw httpErrors.badRequest('regalo-vuoto', 'Indica il nome del regalo.');
  if (!conChiavi) {
    if (nomeLegacy === null) throw httpErrors.conflict('catalogo-non-disponibile', 'Il catalogo dei regali non è ancora disponibile.');
    if (fatto) prepared('INSERT OR IGNORE INTO regalo_partita (partita_id,confidente_chiave,regalo,fatto_at) VALUES (?,?,?,?)').run(partita, confidente, nomeLegacy, nowIso());
    else prepared('DELETE FROM regalo_partita WHERE partita_id = ? AND confidente_chiave = ? AND regalo = ?').run(partita, confidente, nomeLegacy);
    return;
  }

  const nomi = nomiDeiRegali(confidente);
  const righe = prepared('SELECT regalo,catalogo_chiave FROM regalo_partita WHERE partita_id = ? AND confidente_chiave = ?')
    .all(partita, confidente) as Array<{ regalo: string; catalogo_chiave: string | null }>;
  // Il riferimento già salvato prevale su un'associazione della guida cambiata nel frattempo.
  const storica = nomeLegacy === null ? undefined : righe.find((r) => r.regalo === nomeLegacy);
  const catalogo = typeof scelta === 'string' ? storica ? storica.catalogo_chiave : chiaveUnivoca(nomi, confidente, nomeLegacy!) : scelta.catalogo;
  const oggetto = catalogo === null ? undefined : prepared('SELECT chiave,nome,nascosto FROM catalogo_oggetto WHERE chiave = ?').get(catalogo) as { chiave: string; nome: string; nascosto: number } | undefined;
  const nome = nomeLegacy ?? oggetto?.nome ?? '';
  const equivalenti = righe.filter((r) => catalogo !== null
    ? r.catalogo_chiave === catalogo
    : r.regalo === nome && r.catalogo_chiave === null);

  if (!fatto) {
    // Se la guida è cambiata, il vecchio comando per nome può ancora togliere la propria riga storica.
    const daTogliere = nomeLegacy !== null ? righe.filter((r) => equivalenti.includes(r) || r.regalo === nomeLegacy) : equivalenti;
    for (const r of daTogliere) prepared('DELETE FROM regalo_partita WHERE partita_id = ? AND confidente_chiave = ? AND regalo = ?').run(partita, confidente, r.regalo);
    return;
  }
  if (equivalenti.length) {
    // Una consegna già registrata resta identica: data, nome storico e collegamento.
    return;
  }
  if (catalogo !== null && !oggetto) throw httpErrors.notFound('oggetto-non-trovato', 'L’oggetto del regalo non è più nel catalogo.');
  if (oggetto?.nascosto === 1) throw httpErrors.conflict('oggetto-nascosto', 'Ripristina l’oggetto nel catalogo prima di registrare una nuova consegna.');
  if (righe.some((r) => r.regalo === nome)) throw httpErrors.conflict('regalo-omonimo', 'Esiste già una consegna con questo nome ma un riferimento diverso: non viene sovrascritta.');
  prepared('INSERT INTO regalo_partita (partita_id,confidente_chiave,regalo,catalogo_chiave,fatto_at) VALUES (?,?,?,?,?)')
    .run(partita, confidente, nome, catalogo, nowIso());
}
