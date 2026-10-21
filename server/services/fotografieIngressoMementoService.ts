import { getDb, type AppDatabase } from '../db/dbService.js';
import { normalizzaRequisitoSpillo } from '../../shared/condizioniSpillo.js';
import type {
  CampoConfrontatoL26Dto, CampoFotografiaL26, FormulaFotografiaL26, FotografieIngressoMementoDto,
  RigaIngressoMementoDto, SeedIngressoMementoDto,
} from '../../shared/fotografieIngressoMemento.js';

const CHIAVE = 'mementos/ingresso-mementos';
const FONTE = 'https://www.allgamestaff.it/persona-5-royal/richieste-nei-memento/';
type Riga = Record<string, unknown>;
type Atteso = { campo: CampoFotografiaL26; valore: string | number | null; fonte: CampoConfrontatoL26Dto['fonteAtteso'] };
const pubblico = (campo: CampoFotografiaL26, valore: string | number | null): Atteso => ({ campo, valore, fonte: 'pacchetto-pubblico-93' });
const baseline = (campo: CampoFotografiaL26): Atteso => ({ campo, valore: null, fonte: 'baseline-regia-122' });
// Manifest puntuale: i nuovi campi NULL non erano presenti nel pacchetto pubblico 93.
// Baseline comunicata dalla Regia PRIMA di 61ccb6ef; non è una prova dei dati successivi al rilascio.
const LUOGO: readonly Atteso[] = [
  pubblico('chiave', CHIAVE), pubblico('origine', 'seed'), pubblico('nascosto', 0), pubblico('tipo', 'trasporto'),
  pubblico('quartiere_chiave', 'mementos'), baseline('area_chiave'),
  pubblico('sblocco', 'dopo il primo Palazzo (Kamoshida)'), pubblico('fonte', FONTE),
  pubblico('quando', null), pubblico('giorni', null), pubblico('giorni_json', '[]'),
  pubblico('condizioni_json', '[{"tipo":"data","dal":"05-09"}]'), baseline('orari_json'),
  pubblico('note', null), baseline('fonte_condizioni_json'),
];
const QUARTIERE: readonly Atteso[] = [
  pubblico('chiave', 'mementos'), pubblico('sblocco', null), pubblico('sblocco_data', null), pubblico('fonte', FONTE),
  baseline('condizioni_json'), baseline('condizioni_guida_json'), baseline('fonte_condizioni_json'), baseline('fonte_condizioni_guida_json'),
];
const oggetto = (x: unknown): x is Riga => x !== null && typeof x === 'object' && !Array.isArray(x);

function confronta(riga: Riga, attesi: readonly Atteso[]): CampoConfrontatoL26Dto[] {
  return attesi.map(({ campo, valore, fonte }) => {
    const v = riga[campo];
    const stato = !Object.hasOwn(riga, campo) ? 'assente' : v === null ? 'null'
      : typeof v !== 'string' && typeof v !== 'number' ? 'non-supportato' : v === valore ? 'coincide' : 'diverso';
    return { campo, stato, attesoNull: valore === null, fonteAtteso: fonte };
  });
}

function formula(riga: Riga): FormulaFotografiaL26 {
  if (!Object.hasOwn(riga, 'condizioni_json')) return 'assente';
  const raw = riga.condizioni_json;
  if (raw === null) return 'null';
  if (typeof raw !== 'string') return 'non-supportata';
  let valore: unknown;
  try { valore = JSON.parse(raw) as unknown; } catch { return 'json-malformato'; }
  if (!Array.isArray(valore)) return 'non-supportata';
  if (valore.length === 1 && oggetto(valore[0]) && Object.keys(valore[0]).length === 2
      && valore[0].tipo === 'data' && Object.hasOwn(valore[0], 'dal')) {
    if (valore[0].dal === '05-09') return 'esatta-05-09';
    if (valore[0].dal === '05-07') return 'esatta-05-07';
  }
  // Soltanto riconoscimento: nessun risultato normalizzato sostituisce la fotografia.
  // Una profondità illeggibile non deve far saltare l'intero censimento o diventare una formula vuota.
  try { return valore.every(v => normalizzaRequisitoSpillo(v) !== null) ? 'altra-formula-supportata' : 'non-supportata'; }
  catch { return 'non-supportata'; }
}

function seed(riga: Riga): SeedIngressoMementoDto {
  const base: SeedIngressoMementoDto = {
    stato: 'campo-assente', identitaDa: 'riga-proprietaria', chiaveInterna: 'non-esaminabile',
    campi: [], formula: 'assente', proprietaNonProiettate: 0,
  };
  if (!Object.hasOwn(riga, 'seed_json')) return base;
  const raw = riga.seed_json;
  if (raw === null) return { ...base, stato: 'null' };
  if (typeof raw !== 'string') return { ...base, stato: 'tipo-non-supportato' };
  let valore: unknown;
  try { valore = JSON.parse(raw) as unknown; } catch { return { ...base, stato: 'json-malformato' }; }
  if (!oggetto(valore)) return { ...base, stato: 'radice-non-oggetto' };
  const consentiti = new Set<string>(LUOGO.map(c => c.campo));
  return {
    ...base, stato: 'oggetto',
    chiaveInterna: !Object.hasOwn(valore, 'chiave') ? 'assente' : typeof valore.chiave !== 'string' ? 'non-supportata'
      : valore.chiave === CHIAVE ? 'coincide' : 'contraddittoria',
    campi: confronta(valore, LUOGO), formula: formula(valore),
    proprietaNonProiettate: Object.keys(valore).filter(c => !consentiti.has(c)).length,
  };
}

/** Solo SELECT/PRAGMA di lettura su main; nessun log, cache, apertura DB, partita o mutazione. */
export function fotografieIngressoMemento(db: AppDatabase = getDb()): FotografieIngressoMementoDto {
  return db.transaction((): FotografieIngressoMementoDto => {
    const copertura: FotografieIngressoMementoDto['copertura'] = {
      stato: 'leggibile', righeTroncate: false, registriEsaminati: 0, passiEsaminati: 0,
      passiPertinenti: 0, latiPertinenti: 0, radiciIlleggibili: 0, passiNonRiconoscibili: 0,
      fotografieIlleggibili: 0, fotografieParziali: 0,
    };
    const colonne = (tabella: 'luogo' | 'quartiere' | 'cestino'): Set<string> => new Set(
      (db.prepare(`PRAGMA main.table_info("${tabella}")`).all() as Array<{ name: string }>).map(c => c.name),
    );
    function leggi(tabella: 'luogo' | 'quartiere', chiave: string, attesi: readonly Atteso[]): { dto: RigaIngressoMementoDto; riga: Riga } {
      const disponibili = colonne(tabella);
      const dto: RigaIngressoMementoDto = { stato: 'tabella-assente', campi: [], formula: 'assente' };
      if (!disponibili.size) { copertura.stato = 'incerta'; return { dto, riga: {} }; }
      if (!disponibili.has('chiave')) { copertura.stato = 'incerta'; return { dto: { ...dto, stato: 'schema-non-supportato' }, riga: {} }; }
      const selezione: string[] = attesi.map(c => c.campo);
      if (tabella === 'luogo') selezione.push('seed_json');
      // Identificatori solo dalle allowlist; colonne mancanti non vengono inventate come NULL.
      const sql = selezione.filter(c => disponibili.has(c)).map(c => `"${c}"`).join(', ');
      const riga = db.prepare(`SELECT ${sql} FROM main."${tabella}" WHERE chiave = ?`).get(chiave) as Riga | undefined;
      if (!riga) return { dto: { ...dto, stato: 'riga-assente' }, riga: {} };
      return { dto: { stato: 'presente', campi: confronta(riga, attesi), formula: formula(riga) }, riga };
    }
    function misuraFormula(f: FormulaFotografiaL26): void {
      if (f === 'json-malformato' || f === 'non-supportata') { copertura.fotografieIlleggibili++; copertura.stato = 'incerta'; }
    }
    function misuraSeed(s: SeedIngressoMementoDto): void {
      if (['json-malformato', 'radice-non-oggetto', 'tipo-non-supportato'].includes(s.stato)
          || s.chiaveInterna === 'contraddittoria' || s.chiaveInterna === 'non-supportata') {
        copertura.fotografieIlleggibili++; copertura.stato = 'incerta';
      }
      if (s.stato === 'oggetto' && s.campi.some(c => c.stato === 'assente')) copertura.fotografieParziali++;
      misuraFormula(s.formula);
    }
    const luogo = leggi('luogo', CHIAVE, LUOGO);
    const quartiere = leggi('quartiere', 'mementos', QUARTIERE);
    const fotografiaSeed = seed(luogo.riga);
    if (luogo.dto.stato !== 'presente') fotografiaSeed.identitaDa = 'proprietario-non-disponibile';
    misuraSeed(fotografiaSeed);
    misuraFormula(luogo.dto.formula);
    misuraFormula(quartiere.dto.formula);
    const cestino: FotografieIngressoMementoDto['cestino'] = { stato: 'presente', lati: [] };
    const campiCestino = colonne('cestino');
    if (!campiCestino.size) { cestino.stato = 'tabella-assente'; copertura.stato = 'incerta'; }
    else if (!campiCestino.has('id') || !campiCestino.has('registro_json')) {
      cestino.stato = 'schema-non-supportato'; copertura.stato = 'incerta';
    } else {
      // Un registro alla volta; mai UID, nomi, riepilogo, contesto o cestino delle partite.
      for (const row of db.prepare('SELECT registro_json FROM main.cestino ORDER BY id').iterate() as Iterable<{ registro_json: unknown }>) {
        copertura.registriEsaminati++;
        let passi: unknown;
        try { passi = typeof row.registro_json === 'string' ? JSON.parse(row.registro_json) as unknown : null; }
        catch { passi = null; }
        if (!Array.isArray(passi)) { copertura.radiciIlleggibili++; copertura.stato = 'incerta'; continue; }
        const sequenze = new Set<number>();
        for (const [indice, p] of passi.entries()) {
          copertura.passiEsaminati++;
          const op = oggetto(p) ? p.op : null;
          if (!oggetto(p) || !Number.isSafeInteger(p.seq) || Number(p.seq) < 0 || sequenze.has(Number(p.seq)) || typeof p.tabella !== 'string' || !p.tabella
              || (op !== 'D' && op !== 'U' && op !== 'I')) {
            copertura.passiNonRiconoscibili++; copertura.stato = 'incerta'; continue;
          }
          sequenze.add(Number(p.seq));
          const struttura = db.prepare('SELECT name, pk FROM pragma_table_info(?, ?) ORDER BY pk').all(p.tabella, 'main') as Array<{ name: string; pk: number }>;
          if (!struttura.length) { copertura.passiNonRiconoscibili++; copertura.stato = 'incerta'; continue; }
          const primarie = struttura.filter(c => c.pk > 0).map(c => c.name);
          const identita = primarie.length ? primarie : ['rowid'];
          const lati = (op === 'D' ? ['prima'] : op === 'I' ? ['dopo'] : ['prima', 'dopo']) as Array<'prima' | 'dopo'>;
          const malformato = (op === 'D' && Object.hasOwn(p, 'dopo')) || (op === 'I' && Object.hasOwn(p, 'prima'))
            || lati.some(lato => {
              const riga = p[lato];
              return !oggetto(riga) || identita.some(c => !Object.hasOwn(riga, c)
                || (typeof riga[c] !== 'string' && !(typeof riga[c] === 'number' && Number.isSafeInteger(riga[c]))))
                || (p.tabella === 'luogo' && (typeof riga.chiave !== 'string' || !riga.chiave));
            });
          if (malformato) { copertura.passiNonRiconoscibili++; copertura.stato = 'incerta'; }
          if (p.tabella !== 'luogo') continue;
          let pertinente = false;
          for (const lato of lati) {
            const riga = p[lato];
            if (!oggetto(riga) || riga.chiave !== CHIAVE) continue;
            pertinente = true;
            const s = seed(riga), f = formula(riga);
            misuraSeed(s); misuraFormula(f);
            cestino.lati.push({ registro: copertura.registriEsaminati, passo: indice + 1, operazione: op, lato,
              campi: confronta(riga, LUOGO), formula: f, seed: s });
            copertura.latiPertinenti++;
          }
          if (pertinente) copertura.passiPertinenti++;
        }
      }
    }
    return {
      versione: 1, versioneSchemaGioco: (db.prepare('PRAGMA main.user_version').get() as { user_version: number }).user_version,
      ambito: 'L26', confronto: 'pubblico-93-e-baseline-122-pre-61ccb6ef',
      corrente: { luogo: luogo.dto, quartiere: quartiere.dto }, seed: fotografiaSeed, cestino, copertura,
    };
  })();
}
