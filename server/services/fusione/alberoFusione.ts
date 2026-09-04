// ============================================================
// alberoFusione — piani di fusione ricorsivi verso una Persona bersaglio (Fase 2)
// ============================================================
//
// Un piano è un albero: la radice è il bersaglio; ogni nodo è ottenuto in uno di questi modi:
//   - 'scorta'    → la Persona è già nella scorta della partita (costo 0; ogni esemplare si usa una sola volta);
//   - 'registro'  → si evoca dal Registro del Prigioniero (compendio personale), prezzo 27·L² + 126·L + 2147;
//   - 'cattura'   → si negozia con l'Ombra (Persona normale con livello ≤ livello del protagonista), costo 0 yen ma segnalata;
//   - 'fusione'   → si fonde con due ingredienti (figli), ognuno a sua volta un piano.
// Nel gioco la fusione in sé è gratuita: il costo di un piano è la somma dei prezzi di evocazione delle foglie 'registro'.
// Ricerca: stima ottimistica h(p) per programmazione dinamica (ignorando il consumo della scorta), poi ricerca in profondità
// con potatura (branch-and-bound) sulle N migliori alternative, tenendo conto che un esemplare della scorta si usa una volta.
// Vincoli: profondità massima, livello massimo del risultato di ogni fusione (livello del protagonista), DLC del contesto.
// ============================================================

import { costoFusione, fondi, ricettaSpeciale, ricettePer, type Contesto, type PersonaFusione, type RicettaFusione, type TipoFusione } from './motoreFusione.js';
import { elementoEreditabile, skillAlLivello, skillPerId, slotEreditabili, tipoEredita, type SkillEredita } from './eredita.js';

export type ModoNodo = 'scorta' | 'registro' | 'cattura' | 'fusione';

export interface NodoPiano {
  persona: PersonaFusione;
  modo: ModoNodo;
  /** Costo in yen di questo sottoalbero (somma delle evocazioni dal Registro). */
  costo: number;
  /** Solo per 'fusione'. */
  tipo?: TipoFusione;
  figli: NodoPiano[];
  /** Skill richieste che questo nodo deve portare al genitore (propagazione a catena). */
  skillPortate: number[];
  /** Skill richieste che il nodo non ha innate ma apprende salendo di livello (soddisfatte con l'allenamento). */
  skillDaLivello: number[];
}

export interface Piano {
  radice: NodoPiano;
  costo: number;
  profondita: number;
  /** Numero di Persona da catturare. */
  catture: number;
  /** Numero di evocazioni dal Registro. */
  evocazioni: number;
  /** Numero di fusioni da eseguire. */
  fusioni: number;
}

export interface Disponibilita {
  /** id Persona → numero di esemplari nella scorta. */
  scorta: Map<number, number>;
  /** id Persona registrate nel Registro (evocabili a pagamento). */
  registro: Set<number>;
  /** id Persona → skill effettivamente possedute dagli esemplari in scorta (unione), per la propagazione. */
  skillScorta?: Map<number, Set<number>>;
}

export interface OpzioniAlbero {
  /** Profondità massima di fusioni (1 = solo una fusione fra due foglie). */
  profondita: number;
  /** Numero di piani alternativi da restituire. */
  alternative: number;
  /** Ammette foglie 'cattura' (Persona normali con livello ≤ livelloMax). */
  catture: boolean;
  /** Livello massimo del protagonista: nessuna fusione può produrre (né usare in cattura) Persona sopra questo livello; null = nessun limite. */
  livelloMax: number | null;
  /** Ricette esaminate per nodo (ordinate per stima ottimistica). */
  ampiezza?: number;
  /** Skill che il bersaglio deve avere: ogni fusione deve poterle ereditare e le foglie devono possederle. */
  skill?: number[];
  /** Conta anche lo slot assegnato a caso dal gioco (ottimistico); predefinito: solo gli slot a scelta. */
  slotFortunato?: boolean;
}

const INFINITO = Number.POSITIVE_INFINITY;

/** Prezzo di evocazione dal Registro. */
export function prezzoEvocazione(p: PersonaFusione): number {
  return costoFusione([p]);
}

interface Ricerca {
  ctx: Contesto;
  disp: Disponibilita;
  opz: OpzioniAlbero;
  ricette: Map<number, RicettaFusione[]>;
  /** stima ottimistica per (persona, profondità residua). */
  stima: Map<string, number>;
  /** skill raggiungibili per (persona, profondità residua): innate/scorta più quelle ereditabili a catena. */
  raggiungibili: Map<string, Set<number>>;
  /** cache delle skill innate al livello base. */
  innate: Map<number, SkillEredita[]>;
}

function ricetteDi(r: Ricerca, p: PersonaFusione): RicettaFusione[] {
  let lista = r.ricette.get(p.id);
  if (!lista) {
    lista = ricettePer(p, r.ctx).filter((x) => r.opz.livelloMax === null || x.risultato.livello <= r.opz.livelloMax);
    r.ricette.set(p.id, lista);
  }
  return lista;
}

// ---- Propagazione delle skill a catena ----

function innateDi(r: Ricerca, p: PersonaFusione): SkillEredita[] {
  let s = r.innate.get(p.id);
  if (!s) { s = skillAlLivello(p.id, p.livello); r.innate.set(p.id, s); }
  return s;
}

/** Skill possedute da p come foglia nel modo dato. */
function skillFoglia(r: Ricerca, p: PersonaFusione, modo: ModoNodo): Set<number> {
  if (modo === 'scorta') {
    const s = r.disp.skillScorta?.get(p.id);
    if (s && s.size > 0) return s;
  }
  return new Set(innateDi(r, p).map((s) => s.id));
}

/** Skill che p può avere al termine di un piano entro `prof` fusioni (innate, dalla scorta, o ereditabili a catena). */
function raggiungibili(r: Ricerca, p: PersonaFusione, prof: number, inCorso: Set<number>): Set<number> {
  const chiave = `${p.id}|${prof}`;
  const nota = r.raggiungibili.get(chiave);
  if (nota) return nota;
  const out = new Set<number>(innateDi(r, p).map((s) => s.id));
  for (const s of r.disp.skillScorta?.get(p.id) ?? []) out.add(s);
  // Skill apprese salendo di livello: soddisfano la richiesta con l'allenamento.
  for (const s of skillAlLivello(p.id, 99)) out.add(s.id);
  if (prof > 0 && !inCorso.has(p.id) && !p.rara) {
    inCorso.add(p.id);
    const tipo = tipoEredita(p.id);
    for (const ric of ricetteDi(r, p)) {
      for (const ing of ric.ingredienti) {
        for (const sid of raggiungibili(r, ing, prof - 1, inCorso)) {
          if (out.has(sid)) continue;
          const sk = r.innate.get(ing.id)?.find((x) => x.id === sid) ?? skillInfo(sid);
          if (sk && !sk.unica && elementoEreditabile(tipo, sk.elemento)) out.add(sid);
        }
      }
    }
    inCorso.delete(p.id);
  }
  if (inCorso.size === 0) r.raggiungibili.set(chiave, out);
  return out;
}

function skillInfo(id: number): SkillEredita | null {
  return skillPerId(id);
}

/**
 * Ripartisce le skill richieste (non innate del risultato) fra gli ingredienti che possono portarle.
 * Restituisce null se una skill non è ereditabile dal risultato o non è raggiungibile da alcun ingrediente,
 * oppure se il numero da ereditare supera gli slot.
 */
function ripartisciSkill(r: Ricerca, p: PersonaFusione, ric: RicettaFusione, richieste: Set<number>, prof: number): { perIngrediente: Set<number>[]; daLivello: number[] } | null {
  if (richieste.size === 0) return { perIngrediente: ric.ingredienti.map(() => new Set<number>()), daLivello: [] };
  const innate = new Set(innateDi(r, p).map((s) => s.id));
  const apprese = new Set(skillAlLivello(p.id, 99).map((s) => s.id));
  const tipo = tipoEredita(p.id);
  const perIngrediente = ric.ingredienti.map(() => new Set<number>());
  const daLivello: number[] = [];
  const reach = ric.ingredienti.map((ing) => raggiungibili(r, ing, prof, new Set()));
  let daEreditare = 0;
  for (const sid of richieste) {
    if (innate.has(sid)) continue;
    if (apprese.has(sid)) { daLivello.push(sid); continue; }
    const sk = skillInfo(sid);
    if (!sk || sk.unica || !elementoEreditabile(tipo, sk.elemento)) return null;
    // Preferisci l'ingrediente che la possiede già come innata/scorta, poi quello con meno richieste.
    let scelto = -1;
    for (let i = 0; i < ric.ingredienti.length; i++) {
      if (!reach[i].has(sid)) continue;
      const innataIng = skillFoglia(r, ric.ingredienti[i], 'scorta').has(sid);
      if (scelto < 0 || (innataIng && !skillFoglia(r, ric.ingredienti[scelto], 'scorta').has(sid)) || (innataIng === skillFoglia(r, ric.ingredienti[scelto], 'scorta').has(sid) && perIngrediente[i].size < perIngrediente[scelto].size)) scelto = i;
    }
    if (scelto < 0) return null;
    perIngrediente[scelto].add(sid);
    daEreditare++;
  }
  // Slot: dal totale delle skill degli ingredienti (innate/scorta più quelle che porteranno, max 8 ciascuno).
  const totale = ric.ingredienti.reduce((tot, ing, i) => tot + Math.min(8, new Set([...skillFoglia(r, ing, 'scorta'), ...perIngrediente[i]]).size), 0);
  const slot = slotEreditabili(totale);
  const disponibili = r.opz.slotFortunato ? slot : Math.max(0, slot - 1);
  if (daEreditare > disponibili) return null;
  return { perIngrediente, daLivello };
}

/** Costo della foglia più economica disponibile per p (senza considerare il consumo della scorta), o INFINITO. */
function costoFoglia(r: Ricerca, p: PersonaFusione, scortaUsata?: Map<number, number>): { modo: ModoNodo; costo: number } | null {
  const inScorta = (r.disp.scorta.get(p.id) ?? 0) - (scortaUsata?.get(p.id) ?? 0);
  if (inScorta > 0) return { modo: 'scorta', costo: 0 };
  if (r.disp.registro.has(p.id)) return { modo: 'registro', costo: prezzoEvocazione(p) };
  if (r.opz.catture && !p.speciale && !p.rara && (r.opz.livelloMax === null || p.livello <= r.opz.livelloMax)) return { modo: 'cattura', costo: 0 };
  return null;
}

/** Stima ottimistica (limite inferiore) del costo per ottenere p entro `prof` fusioni, ignorando il consumo della scorta. */
function stima(r: Ricerca, p: PersonaFusione, prof: number, inCorso: Set<number>): number {
  const chiave = `${p.id}|${prof}`;
  const nota = r.stima.get(chiave);
  if (nota !== undefined) return nota;
  let migliore = costoFoglia(r, p)?.costo ?? INFINITO;
  if (prof > 0 && migliore > 0 && !inCorso.has(p.id)) {
    inCorso.add(p.id);
    for (const ric of ricetteDi(r, p)) {
      let tot = 0;
      for (const ing of ric.ingredienti) {
        tot += stima(r, ing, prof - 1, inCorso);
        if (tot >= migliore) break;
      }
      if (tot < migliore) migliore = tot;
      if (migliore === 0) break;
    }
    inCorso.delete(p.id);
  }
  // Solo i valori calcolati fuori da un ciclo di ricorsione sono definitivi.
  if (inCorso.size === 0) r.stima.set(chiave, migliore);
  return migliore;
}

interface Parziale {
  nodo: NodoPiano;
  scortaUsata: Map<number, number>;
}

/** Tutti i piani per p entro `prof` fusioni con costo < `limite`, dato l'uso corrente della scorta; ordinati per costo. */
function piani(r: Ricerca, p: PersonaFusione, prof: number, scortaUsata: Map<number, number>, limite: number, antenati: Set<number>, quanti: number, richieste: Set<number> = new Set()): Parziale[] {
  const esiti: Parziale[] = [];
  const foglia = costoFoglia(r, p, scortaUsata);
  const portate = [...richieste];
  if (foglia && foglia.costo < limite) {
    // La foglia deve possedere le skill richieste (innate o, dalla scorta, quelle registrate); quelle apprese
    // salendo di livello sono ammesse e segnalate.
    const possedute = skillFoglia(r, p, foglia.modo);
    const apprese = richieste.size > 0 ? new Set(skillAlLivello(p.id, 99).map((s) => s.id)) : new Set<number>();
    const daLivello = portate.filter((sid) => !possedute.has(sid) && apprese.has(sid));
    if (portate.every((sid) => possedute.has(sid) || apprese.has(sid))) {
      const usata = new Map(scortaUsata);
      if (foglia.modo === 'scorta') usata.set(p.id, (usata.get(p.id) ?? 0) + 1);
      esiti.push({ nodo: { persona: p, modo: foglia.modo, costo: foglia.costo, figli: [], skillPortate: portate, skillDaLivello: daLivello }, scortaUsata: usata });
      if (foglia.costo === 0 && foglia.modo === 'scorta' && daLivello.length === 0) return esiti; // già in scorta con tutto: nessuna fusione può fare meglio
    }
  }
  if (prof === 0 || antenati.has(p.id)) return esiti;
  const ampiezza = r.opz.ampiezza ?? 12;
  const candidate = ricetteDi(r, p)
    .filter((ric) => !ric.ingredienti.some((i) => antenati.has(i.id) || i.id === p.id))
    .map((ric) => ({ ric, h: ric.ingredienti.reduce((tot, i) => tot + stima(r, i, prof - 1, new Set()), 0) }))
    .filter((c) => c.h < limite)
    .sort((a, b) => a.h - b.h)
    .slice(0, richieste.size > 0 ? Math.max(ampiezza, 40) : ampiezza);
  const antenatiFigli = new Set(antenati).add(p.id);
  let soglia = limite;
  for (const { ric, h } of candidate) {
    if (h >= soglia) break;
    const ripartizione = ripartisciSkill(r, p, ric, richieste, prof - 1);
    if (!ripartizione) continue;
    // Combina i piani degli ingredienti in sequenza (2 per le fusioni normali, anche 3–6 per le ricette speciali),
    // propagando la scorta consumata dai precedenti.
    let combinazioni: Array<{ figli: NodoPiano[]; costo: number; scortaUsata: Map<number, number> }> = [{ figli: [], costo: 0, scortaUsata }];
    for (const [indice, ing] of ric.ingredienti.entries()) {
      const prossime: typeof combinazioni = [];
      for (const c of combinazioni) {
        for (const pi of piani(r, ing, prof - 1, c.scortaUsata, soglia - c.costo, antenatiFigli, quanti, ripartizione.perIngrediente[indice])) {
          const costo = c.costo + pi.nodo.costo;
          if (costo >= soglia) continue;
          prossime.push({ figli: [...c.figli, pi.nodo], costo, scortaUsata: pi.scortaUsata });
        }
      }
      prossime.sort((x, y) => x.costo - y.costo);
      combinazioni = prossime.slice(0, Math.max(quanti, 4));
      if (combinazioni.length === 0) break;
    }
    for (const c of combinazioni) {
      esiti.push({ nodo: { persona: p, modo: 'fusione', tipo: ric.tipo, costo: c.costo, figli: c.figli, skillPortate: portate, skillDaLivello: ripartizione.daLivello }, scortaUsata: c.scortaUsata });
    }
    esiti.sort((a, b) => a.nodo.costo - b.nodo.costo);
    if (esiti.length > quanti) esiti.length = quanti;
    if (esiti.length === quanti) soglia = Math.min(soglia, esiti[esiti.length - 1].nodo.costo + 1);
  }
  return esiti;
}

function riepilogo(nodo: NodoPiano): { profondita: number; catture: number; evocazioni: number; fusioni: number } {
  if (nodo.modo !== 'fusione') return { profondita: 0, catture: nodo.modo === 'cattura' ? 1 : 0, evocazioni: nodo.modo === 'registro' ? 1 : 0, fusioni: 0 };
  const figli = nodo.figli.map(riepilogo);
  return {
    profondita: 1 + Math.max(...figli.map((f) => f.profondita)),
    catture: figli.reduce((t, f) => t + f.catture, 0),
    evocazioni: figli.reduce((t, f) => t + f.evocazioni, 0),
    fusioni: 1 + figli.reduce((t, f) => t + f.fusioni, 0),
  };
}

/** Firma strutturale per scartare piani identici (stessi modi, stesse Persona, stesse skill portate). */
function firma(nodo: NodoPiano): string {
  const skill = nodo.skillPortate.length ? `[${[...nodo.skillPortate].sort((a, b) => a - b).join('+')}]` : '';
  return nodo.modo === 'fusione' ? `${nodo.persona.id}${skill}(${nodo.figli.map(firma).sort().join(',')})` : `${nodo.persona.id}:${nodo.modo}${skill}`;
}

/**
 * Migliori piani per ottenere `target`. Il bersaglio già in scorta restituisce il solo piano 'scorta'.
 * Le Persona rare non hanno piani (non si fondono: solo scorta/registro); una speciale ha come unica fusione la sua ricetta.
 */
export function pianiFusione(target: PersonaFusione, ctx: Contesto, disp: Disponibilita, opz: OpzioniAlbero): Piano[] {
  const r: Ricerca = { ctx, disp, opz: { ...opz, profondita: Math.max(0, Math.min(6, opz.profondita)) }, ricette: new Map(), stima: new Map(), raggiungibili: new Map(), innate: new Map() };
  const grezzi = piani(r, target, r.opz.profondita, new Map(), INFINITO, new Set(), Math.max(1, opz.alternative), new Set(opz.skill ?? []));
  const visti = new Set<string>();
  const out: Piano[] = [];
  for (const g of grezzi.sort((a, b) => a.nodo.costo - b.nodo.costo)) {
    const f = firma(g.nodo);
    if (visti.has(f)) continue;
    visti.add(f);
    const ri = riepilogo(g.nodo);
    out.push({ radice: g.nodo, costo: g.nodo.costo, ...ri });
    if (out.length >= opz.alternative) break;
  }
  // A pari costo: meno catture, meno fusioni.
  return out.sort((a, b) => a.costo - b.costo || a.catture - b.catture || a.fusioni - b.fusioni);
}

/** Verifica di coerenza: ogni nodo 'fusione' del piano è riproducibile con il motore. */
export function pianoCoerente(nodo: NodoPiano, ctx: Contesto): boolean {
  if (nodo.modo !== 'fusione') return true;
  if (!nodo.figli.every((f) => pianoCoerente(f, ctx))) return false;
  if (nodo.figli.length === 2) {
    const r = fondi(nodo.figli[0].persona, nodo.figli[1].persona, ctx);
    return !!r && r.risultato.id === nodo.persona.id;
  }
  // Ricetta speciale a più ingredienti: l'insieme dei figli deve coincidere con la ricetta.
  const speciale = ricettaSpeciale(nodo.persona, ctx);
  if (!speciale) return false;
  const attesi = speciale.ingredienti.map((i) => i.id).sort((x, y) => x - y).join(',');
  const figli = nodo.figli.map((f) => f.persona.id).sort((x, y) => x - y).join(',');
  return attesi === figli;
}
