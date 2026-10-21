// Il documento preliminare originale non è disponibile: questo è un NUOVO censimento.
// L'input privato vive solo nel database dell'utente, mai nel manifest pubblico.
import { createHash } from 'node:crypto';
import manifestJson from '../../../shared/l7-fonti-ricostruite.json' with { type: 'json' };
import { inputImprontaCatalogo, type AuditCatalogo, type FonteAuditCatalogo, type RiferimentoAuditCatalogo } from '../../../shared/auditCatalogo.js';
import type { AppDatabase } from '../dbService.js';
import { donatoreOggetto121 } from './premiOggetti121.js';

type Riga = Record<string, unknown>;
interface FontePrima { tipo: string; chiave: string; input: unknown; tabella?: string; venditore?: string }
interface Manifest { schemaVersion: number; originePacchetto: unknown; campiPerTipo: Record<string, string[]>; fonti: Array<{ tipo: string; chiave: string; impronta: string }> }
const manifest: Manifest = manifestJson;
const riga = (x: unknown): Riga => x && typeof x === 'object' && !Array.isArray(x) ? x as Riga : {};
const testo = (x: unknown): string => typeof x === 'string' ? x : '';
const idFonte = (tipo: string, chiave: string): string => JSON.stringify([tipo, chiave]);
const norm = (s: string): string => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’`´]/g, "'").replace(/\s+/g, ' ').trim();
function json(x: unknown): unknown { try { return typeof x === 'string' ? JSON.parse(x) as unknown : null; } catch { return null; } }
const TABELLE = [
  ['equipaggiamento', 'oggetto', 'id'], ['libro', 'libro', 'chiave'], ['film', 'film', 'chiave'],
  ['videogioco', 'attivita', 'chiave'], ['articolo', 'articolo', 'chiave'], ['regalo', 'confidente_regalo', ''],
  ['voce', 'punto_interesse', 'chiave'], ['richiesta', 'richiesta', 'chiave'], ['esame', 'esame', 'chiave'], ['domanda', 'domanda', 'id'],
] as const;
const chiaveRiga = (tipo: string, r: Riga, campo: string): string => tipo === 'regalo' ? `${r.confidente_chiave}/${r.ordine}` : String(r[campo]);
const haTabella = (db: AppDatabase, nome: string): boolean => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(nome);
function blocchiGuida(db: AppDatabase): Map<string, unknown> {
  return new Map((db.prepare("SELECT chiave,json FROM dati_guida WHERE chiave IN ('oggetti-guida','sfide','completamento','jose')").all() as Array<{ chiave: string; json: string }>).map((r) => [r.chiave, json(r.json)]));
}
function alPercorso(blocchi: ReadonlyMap<string, unknown>, percorso: string): unknown {
  const [blocco, ...parti] = percorso.split('/');
  return parti.reduce<unknown>((v, k) => Array.isArray(v) ? v[Number(k)] : riga(v)[k], blocchi.get(blocco));
}

/** Da chiamare prima di ALTER/UPDATE: nessun input viene ricostruito dai dati già convertiti. */
export function censisciFontiCatalogo121(db: AppDatabase): FontePrima[] {
  const fonti: FontePrima[] = [];
  for (const [tipo, tabella, campo] of TABELLE) {
    for (const input of db.prepare(`SELECT * FROM ${tabella}${tipo === 'videogioco' ? " WHERE tipo='videogioco'" : ''}`).all() as Riga[]) {
      fonti.push({ tipo, chiave: chiaveRiga(tipo, input, campo), input, tabella });
    }
  }
  if (haTabella(db, 'esame_premi')) for (const r of db.prepare('SELECT chiave,json FROM esame_premi').all() as Array<{ chiave: string; json: string }>) {
    fonti.push({ tipo: 'esame-premi', chiave: r.chiave, input: json(r.json) ?? { jsonNonLeggibile: r.json } });
  }
  const blocchi = blocchiGuida(db);
  const diagnosticoSezione = (percorso: string, valore: unknown): void => {
    const stato = valore === undefined ? 'assente' : Array.isArray(valore) && !valore.length ? 'vuota' : 'formato-non-valido';
    const padre = percorso.slice(0, percorso.lastIndexOf('/'));
    fonti.push({ tipo: 'sezione-guida', chiave: percorso, input: {
      stato, valore: valore ?? null, ...(valore === undefined ? { contenitore: alPercorso(blocchi, padre) ?? null } : {}),
    } });
  };
  const elenco = (tipo: string, percorso: string, venditore?: string): void => {
    const v = alPercorso(blocchi, percorso);
    if (!Array.isArray(v) || !v.length) { diagnosticoSezione(percorso, v); return; }
    v.forEach((input: unknown, i: number) => fonti.push({ tipo, chiave: `${percorso}/${i}`, input, venditore }));
  };
  for (const [tipo, percorso] of [
    ['guida-consumabile', 'oggetti-guida/consumabili'], ['guida-chiave', 'oggetti-guida/chiaveEMateriali'],
    ['guida-abito', 'oggetti-guida/abiti/elenco'], ['ricetta', 'oggetti-guida/fabbricazione/ricette'],
    ['premio-sfida', 'sfide/battaglieSfida/elenco'], ['premio-sfida', 'sfide/bossSegreti'],
    ['premio-covo', 'completamento/covo/premi'], ['jose', 'jose/scambi'],
  ]) elenco(tipo, percorso);
  const scambi = alPercorso(blocchi, 'oggetti-guida/scambi');
  if (Array.isArray(scambi) && scambi.length) scambi.forEach((s: unknown, i: number) => {
    elenco('guida-scambio', `oggetti-guida/scambi/${i}/offerte`, testo(riga(s).venditore));
  });
  else diagnosticoSezione('oggetti-guida/scambi', scambi);
  for (const f of [...fonti]) if (['guida-consumabile', 'guida-chiave'].includes(f.tipo) && /^Dono di /.test(testo(riga(f.input).dove))) {
    fonti.push({ tipo: 'dono-guida', chiave: f.chiave, input: f.input });
  }
  // Una radice JSON non leggibile non può scomparire perché non possiede gli array attesi.
  for (const r of db.prepare("SELECT chiave,json FROM dati_guida WHERE chiave IN ('oggetti-guida','sfide','completamento','jose')").all() as Array<{ chiave: string; json: string }>) {
    const v = blocchi.get(r.chiave);
    if (!v || typeof v !== 'object' || Array.isArray(v)) fonti.push({ tipo: 'blocco-guida-non-leggibile', chiave: r.chiave, input: { json: r.json } });
  }
  for (const chiave of ['oggetti-guida', 'sfide', 'completamento', 'jose']) if (!blocchi.has(chiave)) {
    fonti.push({ tipo: 'blocco-guida-assente', chiave, input: { stato: 'assente' } });
  }
  return fonti;
}

/** Le relazioni sono osservate, non dedotte per somiglianza di nomi. */
export function salvaAuditCatalogo121(db: AppDatabase, prima: FontePrima[]): void {
  if (manifest.schemaVersion !== 1) throw new Error('Manifest del censimento M7 non riconosciuto.');
  const campiPerTipo: Record<string, string[]> = { ...manifest.campiPerTipo };
  const pubbliche = new Map(manifest.fonti.map((f) => [idFonte(f.tipo, f.chiave), f]));
  if (pubbliche.size !== manifest.fonti.length) throw new Error('Il manifest M7 contiene identità sorgente duplicate.');
  const risultati = new Map<string, AuditCatalogo['risultatiConFonti'][number]>();
  const aggiungi = (tipo: string, chiave: string, catalogo: unknown, dati: unknown): RiferimentoAuditCatalogo => {
    const ref = { id: idFonte(tipo, chiave), tipo, chiave, catalogo: typeof catalogo === 'string' ? catalogo : null };
    if (!risultati.has(ref.id)) risultati.set(ref.id, { ...ref, fonti: [], fontiContesto: [], dati });
    return ref;
  };
  const cataloghi = new Map<string, RiferimentoAuditCatalogo>();
  for (const r of db.prepare('SELECT * FROM catalogo_oggetto').all() as Riga[]) cataloghi.set(testo(r.chiave), aggiungi('catalogo', testo(r.chiave), r.chiave, r));
  const dirette = new Map<string, RiferimentoAuditCatalogo>();
  for (const [tipo, tabella, campo] of TABELLE.slice(0, 6)) for (const r of db.prepare(`SELECT * FROM ${tabella}${tipo === 'videogioco' ? " WHERE tipo='videogioco'" : ''}`).all() as Riga[]) {
    if (typeof r.catalogo_chiave === 'string') {
      const k = chiaveRiga(tipo, r, campo);
      dirette.set(idFonte(tipo, k), aggiungi(`fonte-${tipo}`, k, r.catalogo_chiave, { tabella, chiave: k, catalogo_chiave: r.catalogo_chiave }));
    }
  }
  const perFonte = new Map<string, RiferimentoAuditCatalogo[]>();
  const indicizza = (k: string, ref: RiferimentoAuditCatalogo): void => { const a = perFonte.get(k) ?? []; a.push(ref); perFonte.set(k, a); };
  for (const [tabella, campi, tipoFonte, campoFonte] of [
    ['voce_oggetto', ['voce_chiave', 'catalogo_chiave'], 'voce', 'voce_chiave'],
    ['ricetta_materiale', ['ricetta', 'catalogo_chiave'], 'ricetta', 'ricetta'],
    ['ricompensa_oggetto', ['fonte_tipo', 'fonte_chiave', 'catalogo_chiave'], '', 'fonte_chiave'],
  ] as const) for (const r of db.prepare(`SELECT * FROM ${tabella}`).all() as Riga[]) {
    const ref = aggiungi(tabella, JSON.stringify(campi.map((k) => r[k])), r.catalogo_chiave, r);
    indicizza(idFonte(tipoFonte || testo(r.fonte_tipo), testo(r[campoFonte])), ref);
  }
  const proposte = new Map<string, RiferimentoAuditCatalogo[]>();
  for (const r of db.prepare('SELECT * FROM proposta_abbinamento').all() as Riga[]) {
    const ref = aggiungi('proposta', JSON.stringify([r.riga_tipo, r.riga_chiave, r.gruppo, r.catalogo_chiave]), r.catalogo_chiave, r);
    const k = idFonte(testo(r.riga_tipo), testo(r.riga_chiave)); const a = proposte.get(k) ?? []; a.push(ref); proposte.set(k, a);
  }
  for (const tabella of ['trasformazione_oggetto', 'negozio_luogo_extra', 'negozio_sede_spillo']) {
    if (haTabella(db, tabella)) for (const r of db.prepare(`SELECT * FROM ${tabella}`).all() as Riga[]) {
      // Queste relazioni non hanno un'unica identità catalogo: entrambi gli estremi restano nei dati.
      aggiungi(tabella, JSON.stringify(Object.entries(r).sort(([a], [b]) => a < b ? -1 : 1)), null, r);
    }
  }
  const articoli = db.prepare('SELECT * FROM articolo').all() as Riga[];
  for (const r of articoli) if (r.articolo_condiviso != null || r.costo_json != null) aggiungi('offerta-strutturata', testo(r.chiave), r.catalogo_chiave, {
    chiave: r.chiave, articolo_condiviso: r.articolo_condiviso, costo_json: r.costo_json,
  });
  for (const r of db.prepare('SELECT chiave,listino_condiviso FROM negozio WHERE listino_condiviso IS NOT NULL').all() as Riga[]) aggiungi('listino-condiviso', testo(r.chiave), null, r);
  const guidaDopo = blocchiGuida(db);
  const viste = new Set<string>();
  const fonti: FonteAuditCatalogo[] = prima.map((f) => {
    const id = idFonte(f.tipo, f.chiave);
    if (viste.has(id)) throw new Error('Il censimento M7 contiene identità sorgente duplicate.');
    viste.add(id);
    // Tipi diagnostici nuovi sono interamente improntati e dichiarati assenti dal manifest.
    const campi = campiPerTipo[f.tipo] ?? ['*']; campiPerTipo[f.tipo] = campi;
    const impronta = createHash('sha256').update(JSON.stringify(inputImprontaCatalogo(f.input, campi))).digest('hex');
    const pubblica = pubbliche.get(id);
    const r = riga(f.input);
    let legami: RiferimentoAuditCatalogo[] = [];
    let prop = proposte.get(id) ?? [];
    let contesto: RiferimentoAuditCatalogo[] = [];
    let aggregata = false;
    let esclusione = '';
    if (f.tipo === 'sezione-guida' && r.stato === 'vuota') esclusione = 'Sezione presente con array vuoto: nessuna riga sorgente da convertire. Il diagnostico non rappresenta un oggetto.';
    const diretta = dirette.get(id);
    if (diretta) legami.push(diretta);
    if (f.tipo === 'articolo') {
      const offerta = risultati.get(idFonte('offerta-strutturata', f.chiave));
      if (offerta) legami.push({ id: offerta.id, tipo: offerta.tipo, chiave: offerta.chiave, catalogo: offerta.catalogo });
    }
    if (['guida-consumabile', 'guida-chiave', 'guida-abito'].includes(f.tipo)) {
      const k = riga(alPercorso(guidaDopo, f.chiave)).catalogoChiave;
      if (typeof k === 'string') legami.push(aggiungi('guida', f.chiave, k, { percorso: f.chiave, catalogoChiave: k }));
    }
    if (f.tipo === 'voce') {
      legami = perFonte.get(id) ?? [];
      aggregata = true;
      const d = json(r.dettagli_json);
      if (d && typeof d === 'object' && !Array.isArray(d) && (riga(d).contenuto == null || riga(d).contenuto === '')) esclusione = 'La fonte non dichiara un campo contenuto non vuoto; nessun oggetto dedotto da descrizioni o istruzioni.';
    }
    if (f.tipo === 'richiesta' || f.tipo === 'esame' || f.tipo === 'premio-sfida' || f.tipo === 'premio-covo' || f.tipo === 'ricetta') {
      const tipo = f.tipo === 'premio-sfida' ? 'sfida' : f.tipo === 'premio-covo' ? 'covo' : f.tipo;
      const k = f.tipo === 'ricetta' ? testo(r.attrezzo) : f.tipo === 'premio-covo' ? testo(r.nome) : f.tipo === 'premio-sfida' ? testo(r.chiave) : f.chiave;
      legami = perFonte.get(idFonte(tipo, k)) ?? [];
      prop = [...(proposte.get(idFonte('ricompensa', `${tipo}/${k}`)) ?? []), ...(f.tipo === 'ricetta' ? proposte.get(idFonte('ricetta', k)) ?? [] : [])];
      aggregata = true;
      if (f.tipo === 'richiesta' && Array.isArray(json(r.ricompense_json)) && (json(r.ricompense_json) as unknown[]).length === 0) esclusione = 'La lista delle ricompense è vuota.';
    }
    if (f.tipo === 'dono-guida') {
      const donatore = donatoreOggetto121(testo(r.dove));
      const k = riga(alPercorso(guidaDopo, f.chiave)).catalogoChiave;
      if (donatore && typeof k === 'string') legami = (perFonte.get(idFonte('confidente', donatore)) ?? []).filter((l) => l.catalogo === k);
    }
    if (f.tipo === 'domanda') {
      const premio = testo(r.ricompensa).trim();
      if (!premio) esclusione = 'Nessuna ricompensa dichiarata dalla domanda.';
      else if (/^(?:Conoscenza|Fascino|Coraggio|Gentilezza|Perizia)\s*\+\s*\d+$/i.test(premio)) esclusione = 'La ricompensa dichiara soltanto punti di una Dote sociale, non un oggetto.';
    }
    if (f.tipo === 'jose' || f.tipo === 'guida-scambio') {
      // Il generatore non salva una FK alla riga dell'offerta JSON. Il venditore è solo contesto.
      const venditori: Record<string, string> = { 'mercante sakai': 'mercante-sakai', 'gachapon di akihabara ("l\'uomo avido")': 'gachapon-akihabara' };
      const negozio = f.tipo === 'jose' ? 'jose' : venditori[norm(f.venditore ?? '')];
      if (negozio) {
        const chiavi = new Set(articoli.filter((a) => a.negozio_chiave === negozio).map((a) => testo(a.chiave)));
        contesto = [...risultati.values()].filter((v) => v.tipo === 'fonte-articolo' && chiavi.has(v.chiave)
          || v.tipo === 'proposta' && testo(riga(v.dati).riga_tipo) === 'articolo' && (chiavi.has(testo(riga(v.dati).riga_chiave)) || testo(riga(v.dati).riga_chiave).startsWith(`${negozio}/`)))
          .map(({ id: k, tipo, chiave, catalogo }) => ({ id: k, tipo, chiave, catalogo }));
      }
      aggregata = true;
    }
    // Avere una relazione a livello fonte non prova che tutti i suoi sottoelementi siano coperti.
    const esclusa = !!esclusione && legami.length === 0 && prop.length === 0;
    const haIdentita = legami.some((l) => l.catalogo !== null);
    const decisione = !esclusa && (aggregata || prop.length > 0 || !haIdentita);
    const motivo = esclusa ? esclusione : f.tipo === 'sezione-guida'
      ? `Sezione attesa ${r.stato === 'assente' ? 'assente' : 'in formato non valido'}: verificare la fonte. Il diagnostico non rappresenta una riga oggetto.`
      : f.tipo.startsWith('blocco-guida-') ? 'Blocco guida richiesto assente o non leggibile: verificare la fonte; nessun oggetto o valore predefinito è stato creato.' : aggregata
      ? 'Risultati osservati a livello di fonte o venditore. I singoli contenuti, le quantità e le esclusioni interne non sono riconciliati uno per uno: verifica ancora aperta.'
      : prop.length ? 'La fonte ha proposte da esaminare; un candidato non equivale a una scelta approvata.'
        : haIdentita ? 'Riferimento diretto della fonte osservato dopo M7; non certifica identità semantica, dati della partita o comportamento operativo.'
          : 'Nessun collegamento o proposta attribuibile alla fonte. Formato, applicabilità o identità richiedono una decisione; nessun valore è stato inventato.';
    const riferimenti = [...legami];
    for (const l of legami) if (l.catalogo && cataloghi.has(l.catalogo)) riferimenti.push(cataloghi.get(l.catalogo)!);
    // Un candidato è provenienza proposta, non un collegamento già scelto.
    for (const p of prop) if (p.catalogo && cataloghi.has(p.catalogo)) contesto.push(cataloghi.get(p.catalogo)!);
    const unici = (a: RiferimentoAuditCatalogo[]) => [...new Map(a.map((v) => [v.id, v])).values()];
    return { id, tipo: f.tipo, chiave: f.chiave, input: f.input, impronta, fontePubblicaHash: pubblica?.impronta ?? null,
      nuova: !pubblica, mutata: !!pubblica && pubblica.impronta !== impronta, granularita: 'fonte',
      esito: esclusa ? 'esclusa' : aggregata || !haIdentita && !prop.length ? 'da-verificare' : prop.length ? 'proposta' : 'collegata',
      motivo, decisione, sottoelementiNonRiconciliati: aggregata && !esclusa, risultati: unici(riferimenti), proposte: prop, contestoRisultati: unici(contesto) };
  });
  for (const f of fonti) {
    for (const ref of [...f.risultati, ...f.proposte]) risultati.get(ref.id)!.fonti.push(f.id);
    for (const ref of f.contestoRisultati) risultati.get(ref.id)!.fontiContesto.push(f.id);
  }
  const audit: AuditCatalogo = { schemaVersion: 1, ricostruzione: true, creatoIl: new Date().toISOString(), campiPerTipo,
    canonicalizzazione: 'json-chiavi-ordinate-v1', originePacchetto: manifest.originePacchetto, fonti,
    manifestAssenti: manifest.fonti.filter((f) => !viste.has(idFonte(f.tipo, f.chiave))), risultatiConFonti: [...risultati.values()],
    limiti: [
      'Nuovo censimento ricostruito: non è il documento preliminare l7-proposte.json, che non è disponibile.',
      'Il manifest pubblico contiene soltanto identità e impronte del pacchetto di riferimento; il runtime può avere fonti nuove o corrette.',
      'La granularità è la fonte. Risultati aggregati non attestano copertura integrale dei singoli contenuti; le relative decisioni rimangono aperte.',
      'Le righe di output senza fonti attribuite restano elencate: possono derivare dalle regole esplicite della migrazione o da una provenienza ancora da riconciliare.',
      'Questo snapshot non certifica runtime, preservazione dei dati della partita né approvazione delle proposte. Non viene riscritto dalle successive decisioni dell’utente.',
    ] };
  db.prepare("INSERT INTO dati_guida(chiave,json) VALUES ('audit-catalogo-121',?) ON CONFLICT(chiave) DO UPDATE SET json=excluded.json").run(JSON.stringify(audit));
}
