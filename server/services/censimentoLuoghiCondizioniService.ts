import { getDb } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { entitaDellaRadice } from './mappe/alberoMappe.js';
import type {
  AreaCensimentoDto, AreaGuidaCensimentoDto, ArticoloCensimentoDto, AttivitaCensimentoDto, CensimentoLuoghiCondizioniDto, DestinazioneSpilloCensimentoDto,
  JsonCensimentoCondizioniDto, LuogoCensimentoDto, MappaCensimentoDto, NegozioCensimentoDto,
  PinCensimentoDto, QuartiereCensimentoDto, SedeExtraCensimentoDto, SedePinCensimentoDto,
} from '../../shared/censimentoLuoghiCondizioni.js';

/** Allowlist statica: mai SELECT *, snapshot, descrizioni, immagini o tabelle delle partite. */
const CAMPI = {
  luogo: ['chiave', 'nome', 'tipo', 'quartiere_chiave', 'area_chiave', 'sblocco', 'quando', 'condizioni_json', 'orari_json', 'note', 'fonte', 'origine', 'nascosto', 'solo_eventi_confidente', 'fonte_condizioni_json'],
  negozio: ['chiave', 'nome', 'tipo', 'condizioni_json', 'sblocco_json', 'luogo', 'luogo_chiave', 'sede_chiave', 'orari_json', 'eccezione_orari_json', 'note', 'fonte', 'origine', 'nascosto', 'listino_condiviso'],
  attivita: ['chiave', 'nome', 'tipo', 'sblocco', 'condizioni_json', 'luogo', 'luogo_chiave', 'sede_chiave', 'fascia', 'fonte', 'origine', 'nascosto'],
  articolo: ['chiave', 'nome', 'negozio_chiave', 'disponibile_dal', 'condizioni_json', 'nota', 'fonte', 'origine', 'nascosto', 'catalogo_chiave', 'articolo_condiviso'],
  quartiere: ['chiave', 'nome', 'sblocco_data', 'fonte', 'condizioni_json', 'condizioni_guida_json', 'fonte_condizioni_json', 'fonte_condizioni_guida_json'],
  area: ['chiave', 'nome', 'quartiere_chiave', 'dungeon_chiave', 'citta_chiave', 'origine'],
  mappa: ['chiave', 'nome', 'tipo', 'origine', 'area_chiave', 'genitore_chiave'],
  spillo: ['id', 'uid', 'nome', 'tipo', 'origine', 'mappa_chiave', 'area_guida_chiave', 'ruolo_guida', 'riferimento_tipo', 'riferimento_chiave', 'condizioni_json'],
  negozio_luogo_extra: ['negozio_chiave', 'luogo_chiave'],
  negozio_sede_spillo: ['spillo_uid', 'negozio_chiave', 'luogo_chiave'],
  dungeon_area: ['chiave', 'nome', 'dungeon_chiave'],
  spillo_destinazione: ['spillo_id', 'mappa_chiave', 'spillo_arrivo_id'],
} as const;
type Tabella = keyof typeof CAMPI;

function jsonGrezzo(raw: unknown, presente: boolean): JsonCensimentoCondizioniDto {
  if (!presente) return { raw: null, stato: 'colonna-assente', valore: null };
  if (raw === null) return { raw: null, stato: 'null', valore: null };
  if (typeof raw !== 'string') {
    // Il contenuto inatteso non viene serializzato o incluso nell'errore/log.
    throw httpErrors.conflict('censimento-tipo-inatteso', 'Una colonna JSON non contiene testo: censimento interrotto senza modificare i dati.');
  }
  try { return { raw, stato: 'valido', valore: JSON.parse(raw) as unknown }; }
  catch { return { raw, stato: 'malformato', valore: null }; }
}

/** Fotografia coerente in una transazione deferred con sole letture su main. Non apre DB, non usa cache, non scrive log. */
export function censimentoLuoghiCondizioni(): CensimentoLuoghiCondizioniDto {
  const db = getDb();
  return db.transaction((): CensimentoLuoghiCondizioniDto => {
    const schema: CensimentoLuoghiCondizioniDto['schema'] = [];
    function leggi<T>(tabella: Tabella): T[] {
      const colonne = new Set((db.prepare(`PRAGMA main.table_info("${tabella}")`).all() as Array<{ name: string }>).map((c) => c.name));
      const campi: readonly string[] = CAMPI[tabella];
      const colonneAssenti = campi.filter((c) => !colonne.has(c));
      if (!colonne.size) {
        schema.push({ tabella, presente: false, colonneAssenti, righe: 0 });
        return [];
      }
      // Identificatori esclusivamente dall'allowlist; una colonna non ancora migrata è dichiarata, mai confusa con NULL SQL.
      const proiezione = campi.map((c) => colonne.has(c) ? `"${c}"` : `NULL AS "${c}"`).join(', ');
      const righe = db.prepare(`SELECT ${proiezione} FROM main."${tabella}" ORDER BY 1`).all() as Array<Record<string, unknown>>;
      schema.push({ tabella, presente: true, colonneAssenti, righe: righe.length });
      for (const r of righe) {
        for (const campo of campi.filter((c) => c.endsWith('_json'))) r[campo] = jsonGrezzo(r[campo], colonne.has(campo));
      }
      return righe as T[];
    }

    const versioneSchemaGioco = (db.prepare('PRAGMA main.user_version').get() as { user_version: number }).user_version;
    const luoghi = leggi<LuogoCensimentoDto>('luogo');
    const negozi = leggi<NegozioCensimentoDto>('negozio');
    const attivita = leggi<AttivitaCensimentoDto>('attivita');
    const articoli = leggi<ArticoloCensimentoDto>('articolo');
    const quartieri = leggi<QuartiereCensimentoDto>('quartiere');
    const aree = leggi<AreaCensimentoDto>('area');
    const mappe = leggi<MappaCensimentoDto>('mappa');
    const pinGrezzi = leggi<Omit<PinCensimentoDto, 'contesto' | 'contestoGuida' | 'luogoRisolto' | 'luoghiAssociati' | 'riferimento' | 'anomalieLegami'>>('spillo');
    const sediExtra = leggi<SedeExtraCensimentoDto>('negozio_luogo_extra');
    const sediPin = leggi<SedePinCensimentoDto>('negozio_sede_spillo');
    const areeGuida = leggi<AreaGuidaCensimentoDto>('dungeon_area');
    const destinazioniSpilli = leggi<DestinazioneSpilloCensimentoDto>('spillo_destinazione');
    const perChiave = <T extends { chiave: string }>(righe: T[]): Map<string, T> => new Map(righe.map((r) => [r.chiave, r]));
    const l = perChiave(luoghi), n = perChiave(negozi), a = perChiave(aree), m = perChiave(mappe);
    const att = perChiave(attivita);
    const guida = perChiave(areeGuida);
    const destinazioni = new Map<string, Map<string, { nome: string }>>([
      ['luogo', l], ['negozio', n], ['attivita', att], ['area', a], ['mappa', m], ['quartiere', perChiave(quartieri)], ['articolo', perChiave(articoli)],
    ]);

    function contestoMappa(chiave: string | null): PinCensimentoDto['contesto'] {
      const visti = new Set<string>();
      let corrente = chiave;
      let area: string | null = null;
      while (corrente && !visti.has(corrente)) {
        visti.add(corrente);
        const r = m.get(corrente);
        if (!r) break;
        area ??= r.area_chiave;
        const quartiere = (r.area_chiave ? a.get(r.area_chiave)?.quartiere_chiave : null)
          ?? ((radice) => (radice?.tipo === 'quartiere' ? radice.chiave : null))(entitaDellaRadice({ chiave: r.chiave, tipo: r.tipo ?? '' }));
        if (quartiere) return { area_chiave: area, quartiere_chiave: quartiere };
        corrente = r.genitore_chiave;
      }
      return { area_chiave: area, quartiere_chiave: null };
    }

    const pin: PinCensimentoDto[] = pinGrezzi.map((p) => {
      const contesto = contestoMappa(p.mappa_chiave);
      const contestoGuida = p.area_guida_chiave ? { dungeon_area_chiave: p.area_guida_chiave,
        dungeon_chiave: guida.get(p.area_guida_chiave)?.dungeon_chiave ?? null, nome: guida.get(p.area_guida_chiave)?.nome ?? null } : null;
      let luogoRisolto: PinCensimentoDto['luogoRisolto'] = null;
      const associati = new Set<string>();
      const anomalieLegami: PinCensimentoDto['anomalieLegami'] = [];
      const tipo = p.riferimento_tipo, chiave = p.riferimento_chiave;
      if (chiave && (tipo === 'luogo' || tipo === 'attivita')) {
        if (l.has(chiave)) luogoRisolto = { chiave, via: tipo === 'luogo' ? 'riferimento-luogo' : 'riferimento-attivita-luogo', negozio: null };
        else if (tipo === 'attivita') {
          const sede = att.get(chiave)?.sede_chiave;
          if (sede && l.has(sede)) luogoRisolto = { chiave: sede, via: 'sede-attivita', negozio: null };
        }
      } else if (chiave && tipo === 'negozio') {
        let listino = chiave;
        const visti = new Set<string>();
        while (n.get(listino)?.listino_condiviso) {
          if (visti.has(listino)) { anomalieLegami.push('ciclo-listino'); break; }
          visti.add(listino); listino = n.get(listino)!.listino_condiviso!;
        }
        if (!n.has(listino)) anomalieLegami.push('listino-assente');
        const legamePin = sediPin.find((s) => s.spillo_uid === p.uid);
        const valido = legamePin && legamePin.negozio_chiave === chiave && l.has(legamePin.luogo_chiave)
          && p.mappa_chiave !== null && m.get(p.mappa_chiave)?.area_chiave != null
          && m.get(p.mappa_chiave)?.area_chiave === l.get(legamePin.luogo_chiave)?.area_chiave;
        if (legamePin && !valido) anomalieLegami.push('sede-pin-incoerente');
        if (!anomalieLegami.includes('ciclo-listino') && n.has(listino)) {
          const sede = valido ? legamePin.luogo_chiave : n.get(listino)?.sede_chiave;
          if (sede && l.has(sede)) luogoRisolto = { chiave: sede, via: valido ? 'sede-pin' : listino === chiave ? 'sede-negozio' : 'sede-listino', negozio: listino };
        }
        for (const extra of sediExtra) {
          if (extra.negozio_chiave === chiave || extra.negozio_chiave === listino) associati.add(extra.luogo_chiave);
        }
      }
      if (luogoRisolto) associati.add(luogoRisolto.chiave);
      const indice = tipo ? destinazioni.get(tipo) : undefined;
      // Il vecchio riferimento attivita può riferirsi direttamente a luogo: corrispondenza strutturale già usata dal visore.
      const riferimento = chiave && tipo ? { tipo, chiave,
        nome: (tipo === 'attivita' ? l.get(chiave)?.nome : undefined) ?? indice?.get(chiave)?.nome ?? null,
        esiste: tipo === 'attivita' && l.has(chiave) ? true : indice ? indice.has(chiave) : null } : null;
      return { ...p, contesto, contestoGuida, luogoRisolto, luoghiAssociati: [...associati].sort(), riferimento, anomalieLegami };
    });
    return { versione: 1, versioneSchemaGioco, completo: true, limiteRighe: null, schema,
      luoghi, negozi, attivita, articoli, quartieri, aree, mappe, pin, sediExtra, sediPin, areeGuida, destinazioniSpilli };
  }).deferred();
}
