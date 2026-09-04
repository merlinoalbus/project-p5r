// ============================================================
// cicliFusione — ricerca dei cicli di fusione X → Y₁ → … → X (Fase 5.5)
// ============================================================
//
// Un ciclo è una sequenza di fusioni a due in cui ogni anello fonde la Persona corrente con un partner
// procurabile (scorta, Registro a pagamento, cattura) e l'ultimo anello rigenera la Persona di partenza.
// In Royal la fusione non trasferisce statistiche: il ciclo serve a ripetere in modo identico una sequenza
// (Persona «gialle» durante l'Allarme, bonus di livello del Confidente a ogni anello, reroll di skill/tratto),
// quindi la ricerca ordina per costo per iterazione (somma delle evocazioni dal Registro), poi per lunghezza.
// ============================================================

import { fondi, type Contesto, type PersonaFusione, type RicettaFusione, type TipoFusione } from './motoreFusione.js';
import { prezzoEvocazione, type Disponibilita } from './alberoFusione.js';

export type ModoPartner = 'scorta' | 'registro' | 'cattura';

export interface AnelloCiclo {
  ingrediente: PersonaFusione;
  partner: PersonaFusione;
  partnerModo: ModoPartner;
  partnerCosto: number;
  risultato: PersonaFusione;
  tipo: TipoFusione;
}

export interface CicloFusione {
  anelli: AnelloCiclo[];
  /** Somma delle evocazioni dal Registro per una iterazione completa. */
  costo: number;
  lunghezza: number;
  evocazioni: number;
  catture: number;
  /** Partner presi dalla scorta (disponibili solo per la prima iterazione). */
  dallaScorta: number;
}

export interface OpzioniCicli {
  /** Numero massimo di anelli (2–5). */
  lunghezzaMax: number;
  /** Numero minimo di anelli (2–lunghezzaMax, default 2). */
  lunghezzaMin?: number;
  /** Ogni partner compare una sola volta lungo la catena (default true): a ogni giro servono Persona diverse. */
  partnerDistinti?: boolean;
  alternative: number;
  /** Ammette partner da catturare (costo 0, ma non ripetibile a piacere). */
  catture: boolean;
  /** Nessun risultato intermedio sopra questo livello (null = nessun limite). */
  livelloMax: number | null;
  /** Ventaglio massimo di partner esaminati per anello (ordinati per costo). */
  ventaglio?: number;
  /** Budget massimo di candidati esaminati in tutta la ricerca (protezione dell'event loop). */
  budget?: number;
}

function modoPartner(p: PersonaFusione, disp: Disponibilita, opz: OpzioniCicli): { modo: ModoPartner; costo: number } | null {
  if (disp.registro.has(p.id)) return { modo: 'registro', costo: prezzoEvocazione(p) };
  if ((disp.scorta.get(p.id) ?? 0) > 0) return { modo: 'scorta', costo: 0 };
  if (opz.catture && !p.speciale && !p.rara && !p.dlc) return { modo: 'cattura', costo: 0 };
  return null;
}

/** Fusioni a due con `persona` come ingrediente, con cache per Persona (il ciclo rivisita gli stessi nodi). */
function fusioniDa(persona: PersonaFusione, ctx: Contesto, cache: Map<number, RicettaFusione[]>): RicettaFusione[] {
  let r = cache.get(persona.id);
  if (!r) {
    r = [];
    for (const altra of ctx.ammesse) {
      if (altra.id === persona.id) continue;
      const ric = fondi(persona, altra, ctx);
      if (ric) r.push(ric);
    }
    cache.set(persona.id, r);
  }
  return r;
}

/** Cicli che partono e tornano a `target`, ordinati per costo per iterazione, poi per lunghezza. */
export function cicliFusione(target: PersonaFusione, ctx: Contesto, disp: Disponibilita, opz: OpzioniCicli): CicloFusione[] {
  const lunghezzaMax = Math.max(2, Math.min(5, opz.lunghezzaMax));
  const lunghezzaMin = Math.max(2, Math.min(lunghezzaMax, opz.lunghezzaMin ?? 2));
  const partnerDistinti = opz.partnerDistinti ?? true;
  const ventaglio = Math.max(5, Math.min(80, opz.ventaglio ?? 40));
  const budget = Math.max(1000, Math.min(200000, opz.budget ?? 40000));
  let esaminatiTotali = 0;
  const cache = new Map<number, RicettaFusione[]>();
  const trovati: CicloFusione[] = [];
  const pieno = (): boolean => trovati.length >= opz.alternative;
  const migliori = (): number => (pieno() ? trovati[trovati.length - 1].costo : Infinity);
  const inserisci = (c: CicloFusione) => {
    trovati.push(c);
    trovati.sort((x, y) => x.costo - y.costo || x.lunghezza - y.lunghezza || x.catture - y.catture);
    if (trovati.length > opz.alternative) trovati.length = opz.alternative;
  };

  const visita = (corrente: PersonaFusione, anelli: AnelloCiclo[], costo: number, visitati: Set<number>) => {
    if (anelli.length >= lunghezzaMax) return;
    // Candidati: fusioni con la corrente, partner procurabile, risultato entro il livello; ordinati per costo del partner.
    const candidati: Array<{ ric: RicettaFusione; partner: PersonaFusione; modo: ModoPartner; costoPartner: number }> = [];
    for (const ric of fusioniDa(corrente, ctx, cache)) {
      const partner = ric.ingredienti[0].id === corrente.id ? ric.ingredienti[1] : ric.ingredienti[0];
      const res = ric.risultato;
      if (res.id !== target.id && visitati.has(res.id)) continue;
      if (res.id !== target.id && res.rara) continue;
      if (partnerDistinti && anelli.some((a) => a.partner.id === partner.id)) continue;
      if (opz.livelloMax !== null && res.livello > opz.livelloMax) continue;
      const m = modoPartner(partner, disp, opz);
      if (!m) continue;
      candidati.push({ ric, partner, modo: m.modo, costoPartner: m.costo });
    }
    candidati.sort((a, b) => a.costoPartner - b.costoPartner || (a.modo === 'registro' ? 0 : 1) - (b.modo === 'registro' ? 0 : 1) || a.ric.risultato.livello - b.ric.risultato.livello);
    let esaminati = 0;
    for (const c of candidati) {
      const costoTot = costo + c.costoPartner;
      // Ordinati per costo: con l'elenco pieno un candidato più caro del peggior ciclo trovato non può migliorare l'insieme
      // (i costi non diminuiscono lungo la catena); a parità di costo può farlo solo se resta più corto del peggiore.
      if (pieno() && (costoTot > migliori() || (costoTot === migliori() && anelli.length + 1 >= trovati[trovati.length - 1].lunghezza))) break;
      if (++esaminatiTotali > budget) return;
      const anello: AnelloCiclo = { ingrediente: corrente, partner: c.partner, partnerModo: c.modo, partnerCosto: c.costoPartner, risultato: c.ric.risultato, tipo: c.ric.tipo };
      if (c.ric.risultato.id === target.id) {
        if (anelli.length + 1 >= lunghezzaMin) {
          const tutti = [...anelli, anello];
          inserisci({
            anelli: tutti, costo: costoTot, lunghezza: tutti.length,
            evocazioni: tutti.filter((a) => a.partnerModo === 'registro').length,
            catture: tutti.filter((a) => a.partnerModo === 'cattura').length,
            dallaScorta: tutti.filter((a) => a.partnerModo === 'scorta').length,
          });
        }
        continue;
      }
      if (esaminati++ >= ventaglio) break;
      visitati.add(c.ric.risultato.id);
      visita(c.ric.risultato, [...anelli, anello], costoTot, visitati);
      visitati.delete(c.ric.risultato.id);
    }
  };

  visita(target, [], 0, new Set([target.id]));
  return trovati;
}
