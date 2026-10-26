// ============================================================
// Dati di rifornimento dell'Ondata 5 (Lotto B; decisione 21 dell'utente) — le regole della guida articolo per articolo e l'audit comune
// ============================================================
//
// Fonti (guida italiana, prevale il dato Royal; lette il 2026-10-26):
//   [N] Elenco dei negozi        — colonne «Quantità» e «Rifornimento» di ogni negozio;
//   [O] Oggetti                  — «1 al giorno», «1 alla settimana», «solo nei giorni di pioggia» (Jose, Prossimo asso, Fiorista);
//   [S] Negozi speciali          — Tanaka: «tre giorni per essere consegnati», «una sola copia per ogni oggetto alla volta», quattro oggetti
//                                  a una sola unità; Jose, Takemi, Untouchable: nessun limite indicato;
//   [D] Distributori automatici  — 2 pezzi (raramente 1, senza dire quali), rifornimento il lunedì: decisione 21, «distributori a 2 pezzi da
//                                  verificare».
// Lettura delle colonne di [N]: quantità e rifornimento indicati → la regola; quantità 1 senza rifornimento («–») → pezzo unico (`mai`);
// nessuna delle due → la guida tace, vale la regola dell'utente (`fallback-utente`: il segno vale fino al cambio di giornata, nessun limite).
// Dove [N] tace ma [O] dà la quantità, vale [O] (Sughero 2 a settimana; Frullato iperproteico 1 al giorno di pioggia). Dove le due pagine si
// contraddicono vale [N], con la nota storica (migrazione 246).
// ============================================================

import type { AppDatabase } from '../dbService.js';
import type { RegolaRifornimento } from '../../../shared/rifornimento.js';
import { esisteTabella } from './pulizieL11.js';

/** La regola di un articolo: i pezzi per ciclo (null = nessun limite) e il rifornimento. */
export interface RegolaArticolo { q: number | null; r: RegolaRifornimento }

const guida = (r: Omit<RegolaRifornimento, 'origine'>, q: number | null): RegolaArticolo => ({ q, r: { ...r, origine: 'guida' } });
export const GIORNO = (q: number): RegolaArticolo => guida({ tipo: 'giorno' }, q);
export const LUNEDI = (q: number): RegolaArticolo => guida({ tipo: 'settimana', giorno: 'lunedi' }, q);
export const DOMENICA = (q: number): RegolaArticolo => guida({ tipo: 'settimana', giorno: 'domenica' }, q);
export const MESE = (q: number): RegolaArticolo => guida({ tipo: 'mese' }, q);
export const PIOGGIA = (q: number): RegolaArticolo => guida({ tipo: 'pioggia' }, q);
export const UNICO: RegolaArticolo = guida({ tipo: 'mai' }, 1);
export const RESTITUZIONE: RegolaArticolo = guida({ tipo: 'restituzione' }, 1);
export const CONSEGNA_TANAKA: RegolaArticolo = guida({ tipo: 'consegna', giorni: 3 }, 1);
export const DISTRIBUTORE: RegolaArticolo = guida({ tipo: 'settimana', giorno: 'lunedi', daVerificare: true }, 2);
export const FALLBACK_UTENTE: RegolaArticolo = { q: null, r: { tipo: 'giorno', origine: 'fallback-utente' } };

/** Le regole articolo per articolo ([N], salvo dove è indicata un'altra pagina). */
export const REGOLE_ARTICOLI: Readonly<Record<string, RegolaArticolo>> = {
  // Yongen-Jaya
  'yumenoshima/gomitolo-di-seta': LUNEDI(3), 'yumenoshima/fibbia-di-latta': LUNEDI(3), 'yumenoshima/pergamena-spessa': LUNEDI(3), 'yumenoshima/cuoio-conciato': LUNEDI(3),
  'yumenoshima/mercurio': LUNEDI(1), 'yumenoshima/lettore-dvd': UNICO, 'yumenoshima/famidrive': UNICO, 'yumenoshima/gambla-goemon': UNICO, 'yumenoshima/laptop-rotto': UNICO,
  'yumenoshima/kogatana-nera': MESE(1),
  'super-muramasa/confezione-di-frutta-primaverile': LUNEDI(1), 'super-muramasa/dango-lunare': LUNEDI(1),
  'venditore-patate-dolci/beni-azuma': GIORNO(1), 'venditore-patate-dolci/yaki-imo-leggendario': LUNEDI(1),
  // Aoyama-Itchome
  'negozio-scolastico/panino-con-yakisoba': LUNEDI(1), 'negozio-scolastico/pane-autunnale': LUNEDI(1),
  // Shibuya, centro commerciale sotterraneo
  'body-chop/profumo-di-design': MESE(1), 'body-chop/set-aromi-pregiati': MESE(1), 'body-chop/rossetto-cremisi': MESE(1),
  'body-chop/olio-del-recupero': LUNEDI(1), 'body-chop/aroma-rinfrescante': LUNEDI(1),
  '37-gradi-celsius/anello-del-respiro': MESE(1), '37-gradi-celsius/anello-dell-energia': MESE(1), '37-gradi-celsius/anello-della-vitalita': MESE(1),
  '37-gradi-celsius/strangolino-dei-chakra': MESE(1), '37-gradi-celsius/strangolino-della-mente': MESE(1), '37-gradi-celsius/strangolino-dell-anima': MESE(1),
  'taisho-store/flan-al-te-matcha': MESE(1), 'taisho-store/tartufi': MESE(1), 'taisho-store/castella': MESE(1),
  'taisho-store/natto-rugiadoso': PIOGGIA(1), 'taisho-store/crostatina-angelo': LUNEDI(1),
  'tsurukame-diamond/anello-del-cuore': MESE(1), 'tsurukame-diamond/braccialetto-d-argento': MESE(1),
  'tsurukame-diamond/fascia-rossa': MESE(1), 'tsurukame-diamond/fascia-blu': MESE(1), 'tsurukame-diamond/fascia-verde': MESE(1), 'tsurukame-diamond/fascia-gialla': MESE(1),
  'tsurukame-diamond/braccialetto-stelle': GIORNO(3), 'tsurukame-diamond/braccialetto-circolare': GIORNO(3), 'tsurukame-diamond/braccialetto-bianco': GIORNO(3), 'tsurukame-diamond/braccialetto-nero': GIORNO(3),
  'high-sense/copertina': MESE(1), 'high-sense/vaso-di-vetro': MESE(1), 'high-sense/ventaglio-sakura': MESE(1),
  'prossimo-asso/proteine-d-importazione': MESE(1), 'prossimo-asso/pesi-da-polso': MESE(1), 'prossimo-asso/occhiali-da-sole-sportivi': MESE(1),
  // [O]: «solo nei giorni di pioggia, 1 al giorno»
  'prossimo-asso/frullato-iperproteico': PIOGGIA(1),
  'prossimo-asso/esperto-a-biliardo': UNICO,
  'fiorista-rafflesia/balsamo-vegetale': LUNEDI(2),
  // [O] (pagina dei materiali): «2 a settimana»; [N] non indica quantità
  'fiorista-rafflesia/sughero': LUNEDI(2),
  // Shibuya, sottopasso e Central Street
  'chiosco-kiyasuku/wafer-dei-ladri': GIORNO(3),
  'panetteria-yon-germain/sandwich-inzuppato': PIOGGIA(1), 'panetteria-yon-germain/melon-pan': LUNEDI(1),
  'discount-rocinante/snack': MESE(1), 'discount-rocinante/maschera-del-ladro': LUNEDI(3), 'discount-rocinante/lotto-estivo-s': LUNEDI(1),
  'discount-rocinante/wafer-dei-ladri': GIORNO(3), 'discount-rocinante/set-noodle-istantanei': MESE(1), 'discount-rocinante/multivitaminico': MESE(1),
  'big-bang-burger/panino-terrestre': GIORNO(1),
  'triple-seven/soba-calmante': LUNEDI(1), 'triple-seven/agodashi-oden': LUNEDI(1), 'triple-seven/cioccolato-osechi': LUNEDI(1), 'triple-seven/wafer-dei-ladri': GIORNO(3),
  // Shinjuku
  'fioraio-sukebe/cestino-di-fiori': MESE(1), 'fioraio-sukebe/mini-cactus': MESE(1), 'fioraio-sukebe/bagno-di-rose': MESE(1),
  // Akihabara
  'akiba/sabbia-ferrea': GIORNO(3), 'akiba/lente-condensante': GIORNO(3), 'akiba/foglio-d-alluminio': GIORNO(2), 'akiba/foglio-di-alluminio': GIORNO(2), 'akiba/fosforo-rosso': GIORNO(2),
  'akiba/cesta-di-vestiti': UNICO, 'akiba/set-di-strumenti-da-pc': UNICO,
  // Kanda, Kichijoji
  'chiesa-kanda/acqua-battesimale': DOMENICA(2), 'chiesa-kanda/acqua-benedetta': DOMENICA(2), 'chiesa-kanda/vino-della-grazia': DOMENICA(1), 'chiesa-kanda/ceneri-del-pentimento': DOMENICA(1),
  'vestiti-usati-kichijoji/spray-supremo': MESE(3), 'vestiti-usati-kichijoji/cintura-di-idaten': UNICO, 'vestiti-usati-kichijoji/cesta-di-vestiti': GIORNO(1),
  'stoneon/roccia-nera': MESE(3), 'stoneon/collana-cremisi': GIORNO(1), 'stoneon/collana-del-ghiaccio': GIORNO(1), 'stoneon/collana-vento-di-giada': GIORNO(1),
  'stoneon/collana-fulmine-viola': GIORNO(1), 'stoneon/collana-nucleare': GIORNO(1), 'stoneon/collana-psicocinetica': GIORNO(1), 'stoneon/collana-divina': GIORNO(1), 'stoneon/collana-della-notte': GIORNO(1),
  // Jose, [O]: limiti al giorno
  'jose/goccia-dellanima': GIORNO(5), 'jose/anima-da-masticare': GIORNO(1), 'jose/kit-energetico-s': GIORNO(2), 'jose/kit-energetico-l': GIORNO(1),
  'jose/pane-per-lanima': GIORNO(1), 'jose/soma': GIORNO(1), 'jose/idaten-ofuda': GIORNO(5), 'jose/kongou-ofuda': GIORNO(5), 'jose/rasetsu-ofuda': GIORNO(5),
  // Tanaka, [S]: i quattro oggetti a una sola unità
  'tanaka-affari-loschi/spec-spirit-oscuro': UNICO, 'tanaka-affari-loschi/fotocamera-spirituale': UNICO, 'tanaka-affari-loschi/maschera-sorridente': UNICO,
  'tanaka-affari-loschi/crown-of-salvation': UNICO,
  // Leblanc: le ricette sono premi del Confidente, una volta sola; il curry si prepara ogni volta (regola dell'utente)
  'leblanc/principi-del-caffe': UNICO, 'leblanc/maestria-del-caffe': UNICO, 'leblanc/precetti-del-curry': UNICO, 'leblanc/maestria-del-curry': UNICO,
};

/** Le regole di un negozio intero, per gli articoli che non ne hanno una propria. */
export const REGOLE_NEGOZI: Readonly<Record<string, RegolaArticolo>> = {
  'u-biblioteca-scolastica': RESTITUZIONE,
  'libreria-taiheido': UNICO, hinokuniya: UNICO, 'libreria-nagiuri': UNICO, 'super-baron': UNICO,
  'mran-mran': MESE(1), akindo: MESE(1), tokobushiya: MESE(1),
  'negozio-palazzo-niijima': UNICO,
  // [S]: una copia per ogni oggetto alla volta, consegna in tre giorni
  'tanaka-affari-loschi': CONSEGNA_TANAKA,
  // un set per domenica, già modellato con le alternative (decisione 20); il baratto di Sakai è uno per offerta
  'home-shopping-tv': UNICO, 'mercante-sakai': UNICO,
};

/** Servizi, non merce (Penguin Sniper, Tempio di Kichijoji): nessuna regola e nessuna etichetta. */
export const NEGOZI_SENZA_REGOLA: ReadonlySet<string> = new Set(['penguin-sniper', 'tempio-kichijoji']);

/** Il periodo del Diario validato dall'utente (04-01…05-31): nessuna di queste migrazioni scrive sulle sue voci. */
export const PERIODO_VALIDATO = { dal: '04-01', al: '05-31' } as const;

/** Un'esecuzione in più nell'audit di `dati_guida` (un oggetto per giro, i giri di prima restano). */
export function scriviAudit(db: AppDatabase, chiave: string, migrazione: number, esecuzione: Record<string, unknown>): void {
  if (!esisteTabella(db, 'dati_guida')) return;
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(chiave) as string | undefined;
  const esecuzioni = vecchio ? (JSON.parse(vecchio) as { esecuzioni?: unknown[] }).esecuzioni ?? [] : [];
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(chiave, JSON.stringify({ migrazione, decisione: 'L13-21', esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }] }));
}

/** L'impronta delle voci del Diario (righe ed effetti): le migrazioni del Lotto B non la cambiano. */
export function improntaDiario(db: AppDatabase): string {
  if (!esisteTabella(db, 'voce_giornata')) return '';
  const voci = db.prepare('SELECT * FROM main.voce_giornata ORDER BY uid').all();
  const effetti = esisteTabella(db, 'voce_effetto') ? db.prepare('SELECT * FROM main.voce_effetto ORDER BY voce_uid, ordine').all() : [];
  return JSON.stringify([voci, effetti]);
}
