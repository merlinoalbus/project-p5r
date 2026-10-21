import { isDeepStrictEqual } from 'node:util';
import { getDb, type AppDatabase } from '../db/dbService.js';
import type { CampoScambioCensimento, CensimentoScambiCatalogoDto, DestinazioneScambioCensimento, IdentitaCatalogoScambio,
  NodoScambioCensimento, PropostaScambioCensimento, RaccordoScambioCensimento, SezioneScambiCensimento } from '../../shared/censimentoScambiCatalogo.js';
import { casaOggetto, eCategoriaOggetto, normalizzaCostoScambio } from '../../shared/catalogo.js';
import { condizioneSpillo } from '../schemas/mappe.js';
import { rettificaPropostaOggetto } from '../schemas/catalogoOggetti.js';
import { costoOggetto } from './catalogoOggettiLetture.js';
import { snapshotPropostaCoincide, type ChiaveProposta } from './snapshotProposteOggetti.js';
import { esitoFonteScambio132, fotografiaFonteScambio132, leggiBlocchiScambiRaw, leggiRegistroScambi132,
  MANIFEST_SCAMBI_132, nodoManifestScambi132, parseScambi132, type BlocchiScambiRaw } from './raccordiScambiCatalogoRegistro.js';

type Riga = Record<string, unknown>;
const record = (v: unknown): Riga | null => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Riga : null;
const CAMPI_JOSE = ['nome', 'effetto', 'costo', 'requisito', 'fonte'] as const;
const CAMPI_VENDITORE = ['venditore', 'fonte'] as const;
const CAMPI_OFFERTA = ['ricevi', 'dai', 'note', 'fonte'] as const;
const vuoto = (): RaccordoScambioCensimento => ({ statoFonte: 'fuori-manifest', disposizione: null, relazione: null,
  rilievi: [], fontiComplete: [], destinazioni: [] });

function campo(r: Riga | null, chiave: string): CampoScambioCensimento {
  if (!r || !Object.hasOwn(r, chiave)) return { stato: 'assente', valore: null };
  const v = r[chiave];
  if (v === null) return { stato: 'null', valore: null };
  if (typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v))) return { stato: 'valido', valore: v };
  // Mai restituire un oggetto inatteso: potrebbe contenere blocchi estranei all'allowlist.
  return { stato: 'non-supportato', valore: null };
}
function nodo(v: unknown, percorso: string, campi: readonly string[]): NodoScambioCensimento {
  const r = record(v);
  return { percorso, uid: typeof r?.uid === 'string' ? r.uid : null, stato: r ? 'valido' : 'non-supportato',
    campi: Object.fromEntries(campi.map((k) => [k, campo(r, k)])), raccordo: vuoto() };
}

const testo = (v: unknown): string | null => typeof v === 'string' ? v : null;
const numero = (v: unknown): number | null => typeof v === 'number' && Number.isFinite(v) ? v : null;
function condizioni(v: unknown): DestinazioneScambioCensimento['condizioni'] {
  if (v === null) return { stato: 'null', valore: null };
  const parsed = parseScambi132(v);
  if (!parsed.leggibile) return { stato: typeof v === 'string' ? 'malformate' : 'non-supportate', valore: null };
  if (!Array.isArray(parsed.valore)) return { stato: 'non-supportate', valore: null };
  const elenco = parsed.valore.map((c: unknown) => condizioneSpillo.safeParse(c));
  if (elenco.some((c) => !c.success) || elenco.some((c, i) => c.success && !isDeepStrictEqual(c.data, (parsed.valore as unknown[])[i]))) {
    return { stato: 'non-supportate', valore: null };
  }
  return { stato: 'valide', valore: elenco.flatMap((c) => c.success ? [c.data] : []) };
}

/** Stato commerciale corrente per le sole chiavi letterali: non approva identità, costo, formula o risultato. */
function lettureDestinazioni(db: AppDatabase) {
  const chiavi = [...new Set(MANIFEST_SCAMBI_132.nodi.flatMap((n) => n.destinazioni.map((d) => d.articolo)))];
  const disponibile = !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='catalogo_oggetto'").get();
  const articoli = new Map<string, Riga>(disponibile ? (db.prepare(`SELECT a.*,n.nome AS negozio_nome,n.nascosto AS negozio_nascosto
    FROM articolo a LEFT JOIN negozio n ON n.chiave=a.negozio_chiave
    WHERE a.chiave IN (SELECT value FROM json_each(?))`).all(JSON.stringify(chiavi)) as Riga[])
    .map((r) => [String(r.chiave), r]) : []);
  const risultati = disponibile ? db.prepare(`SELECT * FROM ricompensa_oggetto WHERE fonte_tipo='articolo'
    AND fonte_chiave IN (SELECT value FROM json_each(?)) ORDER BY fonte_chiave,ordine,catalogo_chiave`).all(JSON.stringify(chiavi)) as Riga[] : [];
  const proposte = disponibile ? db.prepare(`SELECT * FROM proposta_abbinamento
    WHERE (riga_tipo='articolo' AND riga_chiave IN (SELECT value FROM json_each(?)))
      OR (riga_tipo='ricompensa' AND riga_chiave IN (SELECT value FROM json_each(?)))
      OR (riga_tipo='catalogo' AND gruppo='variante-guida-venditore')
    ORDER BY riga_tipo,riga_chiave,gruppo,catalogo_chiave`).all(JSON.stringify(chiavi), JSON.stringify(chiavi.map((k) => `articolo/${k}`))) as Riga[] : [];
  // La provenienza per chiave della riga resta consultabile anche dopo la fusione, senza ricostruire nomi equivalenti.
  const chiaviCatalogo = [...new Set([...articoli.values()].flatMap((a) => typeof a.catalogo_chiave === 'string' ? [a.catalogo_chiave] : [])
    .concat(risultati.flatMap((r) => typeof r.catalogo_chiave === 'string' ? [r.catalogo_chiave] : []),
      proposte.flatMap((p) => [p.catalogo_chiave, ...(p.riga_tipo === 'catalogo' ? [p.riga_chiave] : [])].filter((k): k is string => typeof k === 'string'))))];
  const cataloghi = new Map<string, Riga>(disponibile ? (db.prepare(`SELECT chiave,nome,categoria,nascosto,fonte_tipo,fonte_chiave FROM catalogo_oggetto
    WHERE chiave IN (SELECT value FROM json_each(?)) OR (fonte_tipo='listino' AND fonte_chiave IN (SELECT value FROM json_each(?)))`)
    .all(JSON.stringify(chiaviCatalogo), JSON.stringify(chiavi)) as Riga[]).map((r) => [String(r.chiave), r]) : []);
  const identita = (chiave: string): IdentitaCatalogoScambio => {
    const r = cataloghi.get(chiave); const valida = r && typeof r.nome === 'string' && eCategoriaOggetto(r.categoria) && (r.nascosto === 0 || r.nascosto === 1);
    return { chiave, stato: !r ? 'assente' : valida ? 'presente' : 'non-supportata', nome: testo(r?.nome), categoria: testo(r?.categoria),
      casa: valida ? casaOggetto(chiave) : null, nascosto: r?.nascosto === 0 ? false : r?.nascosto === 1 ? true : null };
  };
  function proposta(p: Riga): PropostaScambioCensimento {
    const parsed = p.modifica_json === null ? null : parseScambi132(p.modifica_json);
    const m = parsed?.leggibile ? rettificaPropostaOggetto.safeParse(parsed.valore) : null;
    let snapshot: PropostaScambioCensimento['snapshot'] = 'non-supportato';
    const rawSnapshot = parseScambi132(p.fonte_snapshot_json);
    const versioneSnapshot = record(rawSnapshot.valore)?.versione;
    if (rawSnapshot.leggibile && (versioneSnapshot === 1 || versioneSnapshot === 2)) {
      try { snapshot = snapshotPropostaCoincide(db, p as unknown as ChiaveProposta) ? 'coincidente' : 'non-coincidente'; }
      catch { snapshot = 'non-supportato'; }
    }
    return { rigaTipo: p.riga_tipo as PropostaScambioCensimento['rigaTipo'], rigaChiave: String(p.riga_chiave), gruppo: String(p.gruppo),
      catalogoChiave: testo(p.catalogo_chiave), catalogo: typeof p.catalogo_chiave === 'string' ? identita(p.catalogo_chiave) : null,
      stato: ['da-approvare', 'confermata', 'scartata'].includes(String(p.stato)) ? p.stato as PropostaScambioCensimento['stato'] : 'non-supportato',
      quantita: numero(p.quantita), motivo: testo(p.motivo),
      modificaStato: p.modifica_json === null ? 'assente' : parsed && !parsed.leggibile ? 'malformata'
        : m?.success && isDeepStrictEqual(m.data, parsed?.valore) ? 'valida' : 'non-supportata',
      azione: m?.success ? m.data.azione : null, snapshot };
  }
  const dtoProposte = new Map(proposte.map((p) => [p, proposta(p)]));
  return (d: { articolo: string; ruolo: DestinazioneScambioCensimento['ruolo'] }, raccordoDocumentale: boolean,
    sorelle: readonly string[]): DestinazioneScambioCensimento => {
    const r = articoli.get(d.articolo); const negozioAtteso = d.articolo.slice(0, d.articolo.indexOf('/'));
    const identitaSorelle = new Set([...cataloghi.values()].filter((c) =>
      c.fonte_tipo === 'listino' && sorelle.includes(String(c.fonte_chiave))
      || sorelle.some((k) => articoli.get(k)?.catalogo_chiave === c.chiave)).map((c) => String(c.chiave)));
    const selezionate = proposte.filter((p) => p.riga_tipo === 'articolo' && p.riga_chiave === d.articolo
      || p.riga_tipo === 'ricompensa' && p.riga_chiave === `articolo/${d.articolo}`
      || p.riga_tipo === 'catalogo' && sorelle.length > 1 && identitaSorelle.has(String(p.riga_chiave))
        && (p.catalogo_chiave === null || identitaSorelle.has(String(p.catalogo_chiave))));
    const costoRaw = parseScambi132(r?.costo_json); const costoNormalizzato = normalizzaCostoScambio(r?.costo_json);
    const costo = typeof r?.costo_json === 'string' && costoRaw.leggibile && costoNormalizzato
      && isDeepStrictEqual(costoRaw.valore, costoNormalizzato) ? costoOggetto(r.costo_json) : null;
    return { chiave: d.articolo, ruolo: d.ruolo, raccordoDocumentale,
      stato: !r ? 'assente' : r.negozio_chiave !== negozioAtteso ? 'negozio-diverso'
        : r.nascosto === 1 || r.negozio_nascosto === 1 ? 'nascosta' : 'presente',
      negozio: testo(r?.negozio_chiave), negozioNome: testo(r?.negozio_nome), casa: r && typeof r.negozio_chiave === 'string'
        ? `/guida/negozi/${encodeURIComponent(r.negozio_chiave)}` : null,
      catalogo: typeof r?.catalogo_chiave === 'string' ? identita(r.catalogo_chiave) : null,
      prezzo: numero(r?.prezzo), prezzoDaVerificare: !!r && r.prezzo !== null && (numero(r.prezzo) === null || !Number.isSafeInteger(r.prezzo) || Number(r.prezzo) < 0),
      costo, costoDaVerificare: !!r && r.costo_json !== null && costo === null,
      condizioneLegacy: testo(r?.condizione),
      condizioni: condizioni(r?.condizioni_json),
      risultati: risultati.filter((v) => v.fonte_chiave === d.articolo).map((v) => ({ catalogo: identita(String(v.catalogo_chiave)),
        quantita: numero(v.quantita), nota: testo(v.nota), valido: typeof v.quantita === 'number' && Number.isSafeInteger(v.quantita) && v.quantita > 0
          && (v.nota === null || typeof v.nota === 'string') })),
      proposte: selezionate.map((p) => dtoProposte.get(p)!),
    };
  };
}

function raccordiCorrenti(db: AppDatabase, blocchi: BlocchiScambiRaw) {
  const letto = leggiRegistroScambi132(db); const registrati = new Map(letto.registro?.nodi.map((n) => [n.percorso, n]));
  const destinazione = lettureDestinazioni(db);
  return { letto, raccordo(percorso: string): RaccordoScambioCensimento {
    const n = nodoManifestScambi132(percorso); if (!n) return vuoto();
    const r = registrati.get(percorso); const corrente = fotografiaFonteScambio132(blocchi, n);
    const statoFonte: RaccordoScambioCensimento['statoFonte'] = letto.stato === 'assente' ? 'registro-assente'
      : letto.stato === 'non-supportato' || !r ? 'registro-non-supportato'
        : !isDeepStrictEqual(corrente, r.fonte) ? 'cambiata-dopo-registrazione'
          : esitoFonteScambio132(corrente, n) === 'fonte-coincidente' ? 'coincidente' : 'diversa-dal-manifest';
    const sorelle = n.destinazioni.some((d) => d.ruolo === 'variante-non-equiparata') ? n.destinazioni.map((d) => d.articolo) : [];
    return { statoFonte, disposizione: n.disposizione, relazione: n.relazione, rilievi: n.rilievi, fontiComplete: n.fontiComplete,
      destinazioni: n.destinazioni.map((d) => destinazione(d, statoFonte === 'coincidente', sorelle)) };
  } };
}
function sezione(r: Riga | null, percorso: string, campi: readonly string[], proprieta: 'scambi' | 'offerte'): SezioneScambiCensimento {
  const base = { percorso, motivo: null, righe: [] };
  if (!r || !Object.hasOwn(r, proprieta)) return { ...base, stato: 'assente' };
  const v = r[proprieta];
  if (v === null) return { ...base, stato: 'null' };
  if (!Array.isArray(v)) return { ...base, stato: 'non-supportato', motivo: 'La sezione attesa non è un array.' };
  return { ...base, stato: v.length ? 'valido' : 'vuoto', righe: v.map((x, i) => nodo(x, `${percorso}/${i}`, campi)) };
}

/** Un'unica fotografia di lettura; niente cache, log del corpo, partite o blocchi restituiti integralmente. */
export function censimentoScambiCatalogo(): CensimentoScambiCatalogoDto {
  const db = getDb();
  return db.transaction((): CensimentoScambiCatalogoDto => {
    const blocchi = leggiBlocchiScambiRaw(db); const raccordi = raccordiCorrenti(db, blocchi);
    const righe = [...blocchi].flatMap(([chiave, b]) => b.presente ? [{ chiave, json: b.json }] : []);
    function leggi(chiave: string, campi: readonly string[]): { radice: Riga | null; sezione: SezioneScambiCensimento } {
      const r = righe.find((x) => x.chiave === chiave); const percorso = `${chiave}/scambi`;
      if (!r) return { radice: null, sezione: { percorso, stato: 'assente', motivo: 'Blocco assente.', righe: [] } };
      let v: unknown;
      try {
        if (typeof r.json !== 'string') return { radice: null, sezione: { percorso, stato: 'non-supportato', motivo: 'Il blocco non contiene testo JSON.', righe: [] } };
        v = JSON.parse(r.json) as unknown;
      } catch { return { radice: null, sezione: { percorso, stato: 'malformato', motivo: 'JSON del blocco illeggibile; il contenuto non viene esposto.', righe: [] } }; }
      const radice = record(v);
      if (!radice) return { radice: null, sezione: { percorso, stato: v === null ? 'null' : 'non-supportato', motivo: 'La radice non è un oggetto.', righe: [] } };
      return { radice, sezione: sezione(radice, percorso, campi, 'scambi') };
    }
    const jose = leggi('jose', CAMPI_JOSE);
    const guida = leggi('oggetti-guida', CAMPI_VENDITORE);
    const originali = Array.isArray(guida.radice?.scambi) ? guida.radice.scambi : [];
    jose.sezione.righe = jose.sezione.righe.map((r) => ({ ...r, raccordo: raccordi.raccordo(r.percorso) }));
    const gruppiGuida = guida.sezione.righe.map((r, i) => {
      const offerte = sezione(record(originali[i]), `${r.percorso}/offerte`, CAMPI_OFFERTA, 'offerte');
      return { ...r, offerte: { ...offerte, righe: offerte.righe.map((o) => ({ ...o, raccordo: raccordi.raccordo(o.percorso) })) } };
    });
    const presenti = new Set([...jose.sezione.righe.map((r) => r.percorso), ...gruppiGuida.flatMap((g) => g.offerte.righe.map((r) => r.percorso))]);
    const mancanti = MANIFEST_SCAMBI_132.nodi.filter((n) => !presenti.has(n.percorso));
    return { versione: 1, completo: true, significatoCompletezza: 'nessun-taglio-delle-righe-proiettate', jose: jose.sezione,
      guida: { ...guida.sezione, righe: gruppiGuida },
      registroRaccordi: { stato: raccordi.letto.stato, nodiAttesi: 97, nodiRegistrati: raccordi.letto.registro?.nodi.length ?? 0,
        percorsiMancanti: mancanti.map((n) => n.percorso) },
      fontiMancanti: mancanti.map((n) => ({ ...nodo(undefined, n.percorso, n.gruppo === null ? CAMPI_JOSE : CAMPI_OFFERTA),
        raccordo: raccordi.raccordo(n.percorso) })),
    };
  })();
}
