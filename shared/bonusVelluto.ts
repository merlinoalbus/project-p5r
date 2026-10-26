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
const SCONTI_REGISTRO: ReadonlyArray<{ soglia: number; sconto: number }> = [
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

const MOLTIPLICATORE_EXP_CONFIDENTE: Readonly<Record<number, number>> = { 0: 1.0, 1: 1.15, 2: 1.3, 3: 1.5, 4: 1.7, 5: 2.0, 6: 2.15, 7: 2.3, 8: 2.5, 9: 2.7, 10: 3.0 };

/** Moltiplicatore EXP della Persona fusa in base al rango del Confidente del suo arcano (0–10). */
export function moltiplicatoreExpConfidente(rango: number): number {
  const r = Math.max(0, Math.min(10, Math.floor(rango)));
  return MOLTIPLICATORE_EXP_CONFIDENTE[r] ?? 1;
}

// ---- Bonus di livello alla fusione (Ghigliottina): la Persona creata nasce sopra il livello base ----

/**
 * Livelli extra della Persona appena fusa in funzione del rango del Confidente del Matto (fase di gioco) e del rango del
 * Confidente del suo arcano (tabella omoteura.com, affidabilità media: intervalli osservati, non formula). Rango arcano 0 → +0.
 * Il bonus vale solo per la Persona creata: usata come materiale conta di nuovo il livello base della sua specie.
 */
export function bonusLivelliFusione(rangoMatto: number, rangoArcano: number): { min: number; max: number; affidabilita: Affidabilita } {
  const r = Math.max(0, Math.min(10, Math.floor(rangoArcano)));
  if (r === 0) return { min: 0, max: 0, affidabilita: 'media' };
  const m = Math.max(0, Math.min(10, Math.floor(rangoMatto)));
  let min: number;
  let max: number;
  if (m <= 5) {
    // Fase 1 (Matto 1–5): ranghi 1–3 → +1…+2, 4+ → +2
    [min, max] = r <= 3 ? [1, 2] : [2, 2];
  } else if (m <= 9) {
    // Fase 2 (Matto 6–9)
    [min, max] = r <= 2 ? [1, 1] : r <= 4 ? [2, 2] : r <= 6 ? [3, 3] : [4, 4];
  } else {
    // Fase 3 (Matto 10)
    [min, max] = r <= 2 ? [1, 2] : r <= 5 ? [2, 3] : r <= 8 ? [4, 5] : [5, 6];
  }
  return { min, max, affidabilita: 'media' };
}

/** Punti statistica casuali aggiunti alla Persona fusa durante l'Allarme (senza incidente). Affidabilità alta (game8, omoteura). */
const PUNTI_ALLARME_FUSIONE = 15;

/** Punti dell'Allarme in base a quante Persona «cariche» (gialle) sono fra gli ingredienti: 15 / 20 / 25 (wikiwiki.jp 合体警報). Affidabilità alta. */
export function puntiAllarmeFusione(cariche: number): number {
  return cariche >= 2 ? 25 : cariche === 1 ? 20 : PUNTI_ALLARME_FUSIONE;
}

// ---- Forca / Potenziamento (Gallows) ----

/** Moltiplicatori documentati per rango del Confidente dell'arcano del ricevente (ranghi 1, 5, 10; Igor non al massimo / al massimo). Affidabilità alta. */
const FORCA_RANGHI_DOCUMENTATI: ReadonlyArray<{ rango: number; igorNonMax: number; igorMax: number }> = [
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
    if (r >= 1) {
      const chiave = o.igorMax ? 'igorMax' : 'igorNonMax';
      const doc = FORCA_RANGHI_DOCUMENTATI.find((x) => x.rango === r);
      let rangoMolt: number;
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
const TIER_RESISTENZA: ReadonlyArray<{ livelloMin: number; livelloMax: number | null; skill: string; chiave: string }> = [
  { livelloMin: 1, livelloMax: 25, skill: 'Schiva X (Dodge)', chiave: 'Dodge' },
  { livelloMin: 26, livelloMax: 33, skill: 'Super schiva X (Evade)', chiave: 'Evade' },
  { livelloMin: 34, livelloMax: 52, skill: 'Resistenza X (Resist)', chiave: 'Resist' },
  { livelloMin: 53, livelloMax: 62, skill: 'Annulla X (Null)', chiave: 'Null' },
  { livelloMin: 63, livelloMax: 74, skill: 'Riflette X (Repel)', chiave: 'Repel' },
  { livelloMin: 75, livelloMax: null, skill: 'Assorbe X (Drain)', chiave: 'Drain' },
];

/** La fascia di `TIER_RESISTENZA` che comprende il livello; fuori da ogni fascia (livello sotto 1) vale la prima. */
export function tierResistenza(livello: number): (typeof TIER_RESISTENZA)[number] {
  return TIER_RESISTENZA.find((t) => livello >= t.livelloMin && (t.livelloMax === null || livello <= t.livelloMax)) ?? TIER_RESISTENZA[0];
}

/** Incensi: la REGOLA di ogni famiglia, effetto per applicazione (ogni 2 giorni) e quante statistiche alza. Nomi in italiano con l'originale
 *  inglese. Affidabilità alta. Ondata 5 (lotto F-bis): il prezzo non sta più qui (era una copia di quello del listino): lo dicono le offerte di
 *  Mantra Ganda e di Jose degli oggetti del catalogo (`INCENSI_DEL_CATALOGO`), lette dal server (`incensiDellaPartita`); dove e quando si
 *  comprano lo dicono le stesse offerte. */
export const INCENSI: ReadonlyArray<{ chiave: string; nome: string; nomeOriginale: string; punti: number; statistiche: number }> = [
  { chiave: 'base', nome: 'Incenso semplice (una statistica)', nomeOriginale: 'Incense', punti: 1, statistiche: 1 },
  { chiave: 'musk', nome: 'Muschio (due statistiche)', nomeOriginale: 'Musk', punti: 1, statistiche: 2 },
  { chiave: 'rasta', nome: 'Sandalo rasta (FR, MA, AG)', nomeOriginale: 'Rasta Sandalwood', punti: 1, statistiche: 3 },
  { chiave: 'ambergris', nome: 'Ambra grigia', nomeOriginale: 'Ambergris', punti: 2, statistiche: 1 },
  { chiave: 'nirvana', nome: 'Nirvana', nomeOriginale: 'Nirvana', punti: 3, statistiche: 1 },
];

type StatIncenso = 'forza' | 'magia' | 'resistenza' | 'agilita' | 'fortuna';
/**
 * Ondata 5 (lotto F-bis, censimento 27: «legare INCENSI al catalogo, prezzo dall'articolo, consumo dal registro»): ogni incenso del catalogo con
 * la sua famiglia e le statistiche che alza. Le statistiche sono quelle del nome dell'oggetto (Incenso FR = Forza, Muschio MA-RS = Magia e
 * Resistenza), cioè l'identità dell'oggetto, non un dato copiato da un'altra tabella. Le righe composte del catalogo («Ambra grigia» con tre
 * statistiche, «Ambra grigia RS/FR», «Nirvana» con tutte) dicono che cosa vende Jose in un Dedalo e non quale statistica alza la copia che si
 * brucia: non sono qui (si sceglie l'oggetto singolo). «Muschio FR-FO» e «Muschio FR-RS» sono tesori dei Palazzi (non in vendita),
 * «Incenso Nirvana FO» è la stessa scheda di «Nirvana FO» trovata in un Palazzo.
 */
export const INCENSI_DEL_CATALOGO: ReadonlyArray<{ oggetto: string; incenso: string; statistiche: readonly StatIncenso[] }> = [
  { oggetto: 'materiale/incenso-fr', incenso: 'base', statistiche: ['forza'] },
  { oggetto: 'materiale/incenso-ma', incenso: 'base', statistiche: ['magia'] },
  { oggetto: 'materiale/incenso-rs', incenso: 'base', statistiche: ['resistenza'] },
  { oggetto: 'materiale/incenso-ag', incenso: 'base', statistiche: ['agilita'] },
  { oggetto: 'materiale/incenso-fo', incenso: 'base', statistiche: ['fortuna'] },
  { oggetto: 'materiale/muschio-fr-ma', incenso: 'musk', statistiche: ['forza', 'magia'] },
  { oggetto: 'materiale/muschio-fr-ag', incenso: 'musk', statistiche: ['forza', 'agilita'] },
  { oggetto: 'materiale/muschio-ma-rs', incenso: 'musk', statistiche: ['magia', 'resistenza'] },
  { oggetto: 'materiale/muschio-ma-fo', incenso: 'musk', statistiche: ['magia', 'fortuna'] },
  { oggetto: 'materiale/muschio-rs-ag', incenso: 'musk', statistiche: ['resistenza', 'agilita'] },
  { oggetto: 'altro/muschio-fr-fo', incenso: 'musk', statistiche: ['forza', 'fortuna'] },
  { oggetto: 'altro/muschio-fr-rs', incenso: 'musk', statistiche: ['forza', 'resistenza'] },
  { oggetto: 'materiale/sandalo-rasta', incenso: 'rasta', statistiche: ['forza', 'magia', 'agilita'] },
  { oggetto: 'consumabile/ambra-grigia-fr', incenso: 'ambergris', statistiche: ['forza'] },
  { oggetto: 'consumabile/ambra-grigia-ma', incenso: 'ambergris', statistiche: ['magia'] },
  { oggetto: 'consumabile/ambra-grigia-rs', incenso: 'ambergris', statistiche: ['resistenza'] },
  { oggetto: 'consumabile/ambra-grigia-ag', incenso: 'ambergris', statistiche: ['agilita'] },
  { oggetto: 'consumabile/ambra-grigia-fo', incenso: 'ambergris', statistiche: ['fortuna'] },
  { oggetto: 'consumabile/nirvana-fr', incenso: 'nirvana', statistiche: ['forza'] },
  { oggetto: 'consumabile/nirvana-ma', incenso: 'nirvana', statistiche: ['magia'] },
  { oggetto: 'consumabile/nirvana-rs', incenso: 'nirvana', statistiche: ['resistenza'] },
  { oggetto: 'consumabile/nirvana-ag', incenso: 'nirvana', statistiche: ['agilita'] },
  { oggetto: 'consumabile/nirvana-fo', incenso: 'nirvana', statistiche: ['fortuna'] },
  { oggetto: 'altro/incenso-nirvana-fo', incenso: 'nirvana', statistiche: ['fortuna'] },
];

/** Giorni per applicazione dell'incenso. */
const GIORNI_PER_APPLICAZIONE = 2;

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

/** Gli sblocchi delle Gemelle già ottenuti al rango dato e il primo ancora da ottenere (null se sono tutti ottenuti). */
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
