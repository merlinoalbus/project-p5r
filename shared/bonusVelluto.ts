// ============================================================
// bonusVelluto — regole numeriche dei bonus della Stanza di Velluto (Fase 4.2), Persona 5 Royal
// ============================================================
//
// Fonti e affidabilità in docs/riferimenti/bonus-velluto.md (censimento del 2026-09-03: Megami Tensei Wiki, wikiwiki.jp/persona5r,
// guide allgamestaff/thegamer/gamerant/neoseeker/dualshockers, pixelflood). Ogni costante porta la propria affidabilità.
// Modulo puro condiviso da backend (costi scontati, DTO) e frontend (calcolatori della Forca e dell'Isolamento).
// ============================================================

export type Affidabilita = 'alta' | 'media' | 'bassa';

// ---- Registro del Prigioniero: sconto per completamento del compendio ----

/** Soglie di completamento (Persona registrate, esclusi i DLC) → sconto sui prezzi di evocazione. Affidabilità alta. */
export const SCONTI_REGISTRO: ReadonlyArray<{ soglia: number; sconto: number }> = [
  { soglia: 25, sconto: 10 },
  { soglia: 50, sconto: 15 },
  { soglia: 75, sconto: 25 },
  { soglia: 100, sconto: 50 },
];

/** Sconto percentuale applicabile dato il completamento percentuale del compendio. */
export function scontoRegistro(percentualeCompletamento: number): number {
  let sconto = 0;
  for (const s of SCONTI_REGISTRO) if (percentualeCompletamento >= s.soglia) sconto = s.sconto;
  return sconto;
}

/** Applica lo sconto a un prezzo (arrotondato all'intero). */
export function prezzoScontato(prezzo: number, sconto: number): number {
  return Math.round(prezzo * (1 - sconto / 100));
}

// ---- Bonus EXP del Confidente sulla fusione (tabella generica, affidabilità media) ----

export const MOLTIPLICATORE_EXP_CONFIDENTE: Readonly<Record<number, number>> = { 0: 1.0, 1: 1.15, 2: 1.3, 3: 1.5, 4: 1.7, 5: 2.0, 6: 2.15, 7: 2.3, 8: 2.5, 9: 2.7, 10: 3.0 };

/** Moltiplicatore EXP della Persona fusa in base al rango del Confidente del suo arcano (0–10). */
export function moltiplicatoreExpConfidente(rango: number): number {
  const r = Math.max(0, Math.min(10, Math.floor(rango)));
  return MOLTIPLICATORE_EXP_CONFIDENTE[r] ?? 1;
}

// ---- Forca / Potenziamento (Gallows) ----

/** Moltiplicatori documentati per rango del Confidente dell'arcano del ricevente (ranghi 1, 5, 10; Igor non al massimo / al massimo). Affidabilità alta. */
export const FORCA_RANGHI_DOCUMENTATI: ReadonlyArray<{ rango: number; igorNonMax: number; igorMax: number }> = [
  { rango: 1, igorNonMax: 1.25, igorMax: 1.5 },
  { rango: 5, igorNonMax: 2.25, igorMax: 2.75 },
  { rango: 10, igorNonMax: 3.5, igorMax: 4.0 },
];

export interface OpzioniForca {
  /** Rango del Confidente dell'arcano del ricevente (0 = nessuno). */
  rangoConfidente: number;
  /** Confidente del Matto (Igor) al rango massimo. */
  igorMax: boolean;
  /** Il sacrificio ha lo stesso arcano del ricevente. */
  stessaArcana: boolean;
  /** Il sacrificio è un Demone del Tesoro. */
  tesoro: boolean;
  /** Allarme delle fusioni attivo: i moltiplicatori sono sostituiti dalla scala fissa 2/3/5/7. */
  allarme: boolean;
  /** Livello attuale del sacrificio maggiore di quello del ricevente: EXP dimezzata. */
  penalitaLivello: boolean;
}

export interface EsitoForca {
  moltiplicatore: number;
  /** Fattori applicati, nell'ordine, con testo esplicativo. */
  fattori: Array<{ nome: string; valore: number; affidabilita: Affidabilita }>;
  /** Valori dei ranghi intermedi interpolati (solo 1, 5 e 10 sono documentati). */
  interpolato: boolean;
  /** Skill trasferite al ricevente. */
  skillTrasferite: string;
}

/** Moltiplicatore EXP della Forca con i fattori applicati. */
export function moltiplicatoreForca(o: OpzioniForca): EsitoForca {
  const fattori: EsitoForca['fattori'] = [];
  let m = 1;
  let interpolato = false;
  if (o.allarme) {
    const base = o.tesoro ? (o.stessaArcana ? 7 : 5) : o.stessaArcana ? 3 : 2;
    fattori.push({ nome: `Allarme delle fusioni (${o.tesoro ? 'Demone del Tesoro' : 'Persona normale'}, ${o.stessaArcana ? 'stesso arcano' : 'arcano diverso'})`, valore: base, affidabilita: 'alta' });
    m = base;
  } else {
    const r = Math.max(0, Math.min(10, o.rangoConfidente));
    let rangoMolt = 1;
    if (r >= 1) {
      const chiave = o.igorMax ? 'igorMax' : 'igorNonMax';
      const doc = FORCA_RANGHI_DOCUMENTATI.find((x) => x.rango === r);
      if (doc) rangoMolt = doc[chiave];
      else {
        const inferiore = [...FORCA_RANGHI_DOCUMENTATI].reverse().find((x) => x.rango < r)!;
        const superiore = FORCA_RANGHI_DOCUMENTATI.find((x) => x.rango > r)!;
        rangoMolt = inferiore[chiave] + ((superiore[chiave] - inferiore[chiave]) * (r - inferiore.rango)) / (superiore.rango - inferiore.rango);
        interpolato = true;
      }
      fattori.push({ nome: `Confidente dell'arcano al rango ${r}${o.igorMax ? ' (Igor al massimo)' : ''}`, valore: Math.round(rangoMolt * 100) / 100, affidabilita: interpolato ? 'media' : 'alta' });
      m *= rangoMolt;
    }
    if (o.tesoro) {
      const v = o.stessaArcana ? 5 : 3;
      fattori.push({ nome: `Demone del Tesoro (${o.stessaArcana ? 'stesso arcano' : 'arcano diverso'})`, valore: v, affidabilita: 'alta' });
      m *= v;
    } else if (o.stessaArcana) {
      fattori.push({ nome: 'Stesso arcano del ricevente', valore: 1.5, affidabilita: 'alta' });
      m *= 1.5;
    }
  }
  if (o.penalitaLivello) {
    fattori.push({ nome: 'Sacrificio di livello superiore al ricevente', valore: 0.5, affidabilita: 'alta' });
    m *= 0.5;
  }
  return { moltiplicatore: Math.round(m * 100) / 100, fattori, interpolato, skillTrasferite: o.allarme ? '1–3 (decise in anticipo dal gioco)' : '1 (casuale)' };
}

/** Bonus statistico garantito in caso di incidente alla Forca (EXP zero). */
export const FORCA_INCIDENTE_BONUS = { sacrificioNormale: 5, unaPersonaCarica: 10, entrambeCariche: 15 } as const;

// ---- Isolamento (Lockdown) ----

/** Giorni di permanenza per il rango delle Gemelle Custodi (tabella wikiwiki.jp; sblocco al rango 3). Affidabilità media. */
export function giorniIsolamento(rangoGemelle: number): number {
  if (rangoGemelle >= 10) return 1;
  if (rangoGemelle >= 7) return 2;
  if (rangoGemelle >= 4) return 3;
  return 4;
}

/** Livello della Persona al deposito → skill di resistenza ottenuta (X = elemento della debolezza). Affidabilità alta. */
export const TIER_RESISTENZA: ReadonlyArray<{ livelloMin: number; livelloMax: number | null; skill: string; chiave: string }> = [
  { livelloMin: 1, livelloMax: 25, skill: 'Schiva X (Dodge)', chiave: 'Dodge' },
  { livelloMin: 26, livelloMax: 33, skill: 'Super schiva X (Evade)', chiave: 'Evade' },
  { livelloMin: 34, livelloMax: 52, skill: 'Resistenza X (Resist)', chiave: 'Resist' },
  { livelloMin: 53, livelloMax: 62, skill: 'Annulla X (Null)', chiave: 'Null' },
  { livelloMin: 63, livelloMax: 74, skill: 'Riflette X (Repel)', chiave: 'Repel' },
  { livelloMin: 75, livelloMax: null, skill: 'Assorbe X (Drain)', chiave: 'Drain' },
];

export function tierResistenza(livello: number): (typeof TIER_RESISTENZA)[number] {
  return TIER_RESISTENZA.find((t) => livello >= t.livelloMin && (t.livelloMax === null || livello <= t.livelloMax)) ?? TIER_RESISTENZA[0];
}

/** Incensi: effetto per applicazione (ogni 2 giorni), prezzo in yen (null = solo scambio con fiori dei Mementos). Affidabilità alta. */
export const INCENSI: ReadonlyArray<{ chiave: string; nome: string; prezzo: number | null; punti: number; statistiche: number; nota: string }> = [
  { chiave: 'base', nome: 'Incenso base (una statistica)', prezzo: 4000, punti: 1, statistiche: 1, nota: 'una versione per ciascuna statistica' },
  { chiave: 'musk', nome: 'Musk (due statistiche)', prezzo: 8000, punti: 1, statistiche: 2, nota: 'coppie fisse: FR+MA, FR+AG, MA+RS, MA+FO, RS+AG' },
  { chiave: 'rasta', nome: 'Rasta Sandalwood (FR, MA, AG)', prezzo: 14000, punti: 1, statistiche: 3, nota: 'dal 1º ottobre' },
  { chiave: 'ambergris', nome: 'Ambergris', prezzo: null, punti: 2, statistiche: 1, nota: 'scambio con 80 fiori dei Mementos' },
  { chiave: 'nirvana', nome: 'Nirvana', prezzo: null, punti: 3, statistiche: 1, nota: 'scambio con 80 fiori dei Mementos, dal 30 ottobre' },
];

/** Giorni per applicazione dell'incenso. */
export const GIORNI_PER_APPLICAZIONE = 2;

/** Punti guadagnati per statistica interessata con un incenso per `giorni` giorni (Allarme: effetto raddoppiato). Affidabilità media. */
export function guadagnoIncenso(incenso: (typeof INCENSI)[number], giorni: number, allarme: boolean): { applicazioni: number; puntiPerStatistica: number; totale: number } {
  const applicazioni = Math.floor(Math.max(0, giorni) / GIORNI_PER_APPLICAZIONE);
  const perStatistica = applicazioni * incenso.punti * (allarme ? 2 : 1);
  return { applicazioni, puntiPerStatistica: perStatistica, totale: perStatistica * incenso.statistiche };
}

/** Giorno di avviso e di perdita della Persona lasciata in isolamento (wikiwiki.jp; il wiki inglese dice «circa 10 giorni»). */
export const ISOLAMENTO_AVVISO = { giornoAvviso: 9, giornoPerdita: 10 } as const;

// ---- Gemelle Custodi (Confidente Forza): sblocchi per rango (Royal). Affidabilità alta ----

export const SBLOCCHI_GEMELLE: ReadonlyArray<{ rango: number; nome: string; effetto: string }> = [
  { rango: 1, nome: 'Ghigliottina di gruppo', effetto: 'fusione con tre o più Persona (ricette speciali)' },
  { rango: 3, nome: 'Isolamento', effetto: 'addestramento con incenso e resistenza contro la debolezza' },
  { rango: 5, nome: 'Trattamento speciale', effetto: 'a pagamento, fusione di Persona sopra il livello del protagonista' },
  { rango: 8, nome: 'Potenziamento della ghigliottina', effetto: 'più combinazioni nella fusione di gruppo' },
  { rango: 10, nome: 'Trattamento VIP', effetto: 'riduce il costo del Trattamento speciale' },
];

export function sblocchiGemelle(rango: number): { ottenuti: typeof SBLOCCHI_GEMELLE; prossimo: (typeof SBLOCCHI_GEMELLE)[number] | null } {
  return { ottenuti: SBLOCCHI_GEMELLE.filter((s) => s.rango <= rango), prossimo: SBLOCCHI_GEMELLE.find((s) => s.rango > rango) ?? null };
}

// ---- Allarme delle fusioni: effetti (testo per l'interfaccia). Affidabilità alta salvo indicato ----

export const EFFETTI_ALLARME: ReadonlyArray<{ area: string; effetto: string; affidabilita: Affidabilita }> = [
  { area: 'Ghigliottina', effetto: 'statistiche extra al risultato, Demoni del Tesoro contati come 5 livelli più alti, skill del risultato possono mutare in versioni potenziate; la Persona fusa diventa «carica» (riusarla nello stesso Allarme rischia l\'incidente).', affidabilita: 'alta' },
  { area: 'Forca', effetto: 'EXP ×2 (arcano diverso) / ×3 (stesso arcano) / ×5 (Demone del Tesoro) / ×7 (Tesoro dello stesso arcano); skill trasferite 1–3; nessun limite giornaliero; l\'incidente azzera l\'EXP ma garantisce +5/+10/+15 punti statistica.', affidabilita: 'alta' },
  { area: 'Sedia elettrica', effetto: 'oggetto della versione potenziata («R», colonna «Con Allarme» nella scheda Persona) garantito.', affidabilita: 'alta' },
  { area: 'Isolamento', effetto: 'effetto dell\'incenso raddoppiato (va acceso durante l\'Allarme).', affidabilita: 'media' },
  { area: 'Rischio', effetto: 'ogni uso ripetuto dello stesso metodo e ogni evocazione dal Registro aumentano la probabilità di incidente; alternare i metodi; uscire dopo almeno un\'operazione azzera l\'Allarme.', affidabilita: 'alta' },
];
