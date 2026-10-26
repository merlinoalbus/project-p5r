// ============================================================
// Migrazione 284 — nomi, categorie e valori degli accessori secondo la pagina Accessori della guida (chiusura dell'ondata 5)
// ============================================================
//
// Revisione finale dell'ondata 5, rilievo 1 (alto): le righe «Restano» del lotto F elencavano doppioni del catalogo («Collana divina ×3»,
// «Maschera del ladro ×3», «Specchio di rappresaglia», «Distintivo dell'angelo ×2»…) e 47 righe della pagina Accessori [A] senza scheda, «da
// riconciliare: alcuni possono essere nel catalogo con un altro nome». Decisione 21: «Non sono d'accordo nel rimandare attività a fasi
// successive»; prevale il dato Royal della guida italiana, il dato superato resta in una nota storica.
//
// Censimento completo (2026-10-26, le 301 righe di [A] contro ogni scheda, nome, nome alternativo e nome originale; script e risultati nello
// scratchpad della chiusura): i «doppioni» dell'equipaggiamento non sono copie dello stesso oggetto ma schede del vecchio elenco
// dell'equipaggiamento (`fonte = equipaggiamento:N`, con il nome originale inglese) a cui era stato dato il nome italiano di un altro accessorio
// con la stessa abilità. Il nome originale, l'abilità e la statistica le legano senza dubbio alla riga di [A]:
//   1. **nomi** (15 schede, più la scheda «Inspired Hand Mirror» che prende il nome di [A], «Spec. senso spirit.»): Darkness Ring/R «Pendente honu *» → «Anello dell'oscurità»/«R» ([A]: Evita maledizione / Ma +5 e +8, Sedia
//      elettrica su Thanatos); Emperor's Amulet / Charm R «Cintura Umi Sachihiko» → «Portafortuna imperiale»/«Portafort. imperiale R» (Auto-Mataru /
//      Rs +5 e +8); Hades Harp/R «Maschera del ladro» → «Arpa dell'Ade»/«R» (Ann. Soggiogam. / Ag +5 e +8); Koh-i-Noor/R «Collana divina» →
//      «Koh-i-Noor»/«R» (Amplifica sacro / Tutte le stat. +2 e +3); Kugelbein/R «Cintura Hall of fame» → «Kugelbein»/«R» (Auto-Maraku / Rs +5 e
//      +8); Orichalcum/R «Calze contenitive» → «Oricalco»/«R» (Evita att. fisici / Tutte le stat. +6 e +7); Orlov/R «Spec. rappresaglia» →
//      «Orlov»/«R» (Rimonta / Rs +3 e +5); Black Moon R «Portaf. grande colpo» → «Luna nera R» (Discepolo sagace / Fr +8). Gli accessori veri
//      con quei nomi (Pendente honu *, Cintura Umi Sachihiko, Cintura Hall of fame, Calze contenitive, Portaf. grande colpo) li crea la 286;
//      Collana divina (Stoneon), Maschera del ladro (Rocinante) e Spec. rappresaglia (Venditore ambulante, «Specchio di rappresaglia») hanno già
//      la loro scheda. NON si toccano le due schede Crystal Skull/R «Distintivo dell'angelo»: [A] le chiama «Teschio di Cristallo»/«R» e dà il
//      «Distintivo dell'angelo» come accessorio a sé (scambio con Sakai), ma l'offerta di Sakai è stata collegata dall'utente alla scheda Crystal
//      Skull R e la raccomandazione 18, approvata con la decisione 21, tiene l'abbinamento com'è finché non si verifica: spostare un collegamento
//      dell'utente è una sua decisione (scritta nel ROADMAP con la prova della guida);
//   2. **valori** che la pagina dà diversamente, con il dato di prima in una nota storica: Arpa dell'Ade «AG +3» → «AG +5»; Kugelbein senza
//      la statistica → «RS +5»; Fascia capel. bianca R «RS +8» → «RS +5» ([A] dà Rs +5 anche alla R: la regola è che prevale la guida; resta da
//      verificare in gioco, lo dice la nota); Veste haten «per tutti» → «Solo donne» (pagina Protezioni [P]: «Femmine»);
//   3. **apostrofi** mancanti nei nomi venuti dai listini: Anello dell'energia, Strangolino dell'anima, Blocco d'appunti, Frusta dell'eroe,
//      Frusta dell'illusione, Ascia dell'amazzone, Veste dell'Eliseo, Collare dell'armata, Corona d'acqua; «Portafulmini antielettricita» (una
//      lettura sbagliata dell'abbreviazione) → «Portaf. antielettricità» di [A];
//   4. **nomi della guida come nomi alternativi** dove il listino scrive per esteso l'abbreviazione di [A]: Braccial. circolare, bianco e nero,
//      Coll. vento di giada (la ricerca e il censimento li trovano);
//   5. **categorie**: gli accessori di [A] con una categoria che non dice che cos'è l'oggetto (la categoria è una colonna, la chiave resta, come
//      per il Braccialetto della 252): Bracciale confuso e Pend. disperazione («arma»), Collana magnetica e Maschera del ladro («regalo», ma
//      nessun Confidente le riceve), Cintura eccentrica, Cintura del fastidio, Fermaglio per gatti, Batterie portatili e Perla dell'attaccamento
//      («altro»), Corona della salvezza («consumabile», [A]: accessorio a 990.000 ¥ da Tanaka) → «accessorio»;
//   6. **schede di gruppo**: «Fasce colorate» e «Braccialetti tematici» raccoglievano in una scheda quattro accessori che hanno ognuno la sua
//      (le loro offerte di gruppo erano già nascoste dalla 278); «Ambra grigia», «Ambra grigia RS/FR» e «Nirvana» raccoglievano gli incensi
//      di Jose che hanno ognuno la sua scheda con l'offerta, e ripetevano il costo («80 Fiori», riga «Restano» del lotto E): vanno nel Cestino,
//      da cui si rimettono con i loro legami (l'app non ha un comando per mostrare una scheda nascosta del catalogo: il Cestino sì).
// Le identità doppie vere (stesso oggetto in due schede) le unisce la 285; gli accessori senza scheda li crea la 286.
//
// Conservativa: ogni valore si scrive con `scriviColonnaCatalogo` (solo schede della guida mai corrette dall'utente, solo se il valore è quello
// atteso), altrimenti resta e l'audit lo dice. Nessuna voce del Diario e nessun dato delle partite cambia. Idempotente. Audit in
// `dati_guida.audit-284-nomi-degli-accessori`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { conCestino144 } from './cestinoRegistro144.js';
import { partiteCheCitano, vociCheCitano } from './identitaDoppie250.js';
import { notaStoricaTesti, type NotaStoricaTesti } from './testiOndata5.js';
import { FONTE_ACCESSORI, FONTE_PROTEZIONI, improntaDiario, scriviAuditChiusura, scriviColonnaCatalogo, type ColonnaCatalogo, type EsitoColonna } from './chiusuraOndata5.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-284-nomi-degli-accessori';

/** L'elenco scritto: scheda, colonna, valore atteso (uno o più), valore della guida, motivo. */
type Scrittura = { chiave: string; colonna: ColonnaCatalogo; prima: string | null | ReadonlyArray<string | null>; dopo: string | null; motivo: string };
const nome = (chiave: string, prima: string, dopo: string, motivo: string): Scrittura => ({ chiave, colonna: 'nome', prima, dopo, motivo });
const categoria = (chiave: string, prima: string, motivo: string): Scrittura => ({ chiave, colonna: 'categoria', prima, dopo: 'accessorio', motivo });

const SCRITTURE: readonly Scrittura[] = [
  // 1. nomi dell'equipaggiamento secondo [A] (nome originale, abilità e statistica della riga)
  nome('accessorio/pendente-honu', 'Pendente honu *', 'Anello dell\'oscurità', 'Darkness Ring; [A] Evita maledizione / Ma +5, Sedia elettrica su Thanatos'),
  nome('accessorio/pendente-honu-2', 'Pendente honu *', 'Anello dell\'oscurità R', 'Darkness Ring R; [A] Evita maledizione / Ma +8'),
  nome('accessorio/cintura-umi-sachihiko', 'Cintura Umi Sachihiko', 'Portafortuna imperiale', 'Emperor\'s Amulet; [A] Auto-Mataru / Rs +5, Sedia elettrica su Amuleto dell\'Imperatore'),
  nome('accessorio/cintura-umi-sachihiko-2', 'Cintura Umi Sachihiko', 'Portafort. imperiale R', 'Emperor\'s Charm R; [A] Auto-Mataru / Rs +8'),
  nome('accessorio/maschera-del-ladro', 'Maschera del ladro', 'Arpa dell\'Ade', 'Hades Harp; [A] Ann. Soggiogam. / Ag +5, Sedia elettrica su Orfeo'),
  nome('accessorio/maschera-del-ladro-2', 'Maschera del ladro', 'Arpa dell\'Ade R', 'Hades Harp R; [A] Ann. Soggiogam. / Ag +8'),
  nome('accessorio/collana-divina', 'Collana divina', 'Koh-i-Noor', 'Koh-i-Noor; [A] Amplifica sacro / Tutte le stat. +2, Sedia elettrica su Koh-i-Noor'),
  nome('accessorio/collana-divina-2', 'Collana divina', 'Koh-i-Noor R', 'Koh-i-Noor R; [A] Amplifica sacro / Tutte le stat. +3'),
  nome('accessorio/cintura-hall-of-fame', 'Cintura Hall of fame', 'Kugelbein', 'Kugelbein; [A] Auto-Maraku / Rs +5, Sedia elettrica su Atena'),
  nome('accessorio/cintura-hall-of-fame-2', 'Cintura Hall of fame', 'Kugelbein R', 'Kugelbein R; [A] Auto-Maraku / Rs +8'),
  nome('accessorio/calze-contenitive', 'Calze contenitive', 'Oricalco', 'Orichalcum; [A] Evita att. fisici / Tutte le stat. +6, Sedia elettrica su Oricalco'),
  nome('accessorio/calze-contenitive-2', 'Calze contenitive', 'Oricalco R', 'Orichalcum R; [A] Evita att. fisici / Tutte le stat. +7'),
  nome('accessorio/spec-rappresaglia', 'Spec. rappresaglia', 'Orlov', 'Orlov; [A] Rimonta / Rs +3, Sedia elettrica su Orlov'),
  nome('accessorio/spec-rappresaglia-2', 'Spec. rappresaglia', 'Orlov R', 'Orlov R; [A] Rimonta / Rs +5'),
  nome('accessorio/portaf-grande-colpo', 'Portaf. grande colpo', 'Luna nera R', 'Black Moon R; [A] Discepolo sagace / Fr +8, Sedia elettrica su Tsukuyomi'),
  // lo Spec. senso spirit. è un accessorio ([A]: Alito mefitico, 5.000 ¥ da Tanaka): la scheda «accessorio» del listino prende il nome di [A]
  // e diventa quella in cui la 285 unisce le due schede «consumabile» (la riga del vecchio elenco e quella del listino di Tanaka)
  nome('accessorio/inspired-hand-mirror', 'Inspired Hand Mirror', 'Spec. senso spirit.', '[A] Spec. senso spirit. (Alito mefitico, Tanaka, 5.000 ¥)'),
  { chiave: 'accessorio/inspired-hand-mirror', colonna: 'nomi_altri_json', prima: '[]', dopo: '["Inspired Hand Mirror"]', motivo: 'il nome inglese del listino di Tanaka' },
  // 2. valori secondo la guida (il dato di prima nella nota storica)
  { chiave: 'accessorio/maschera-del-ladro', colonna: 'effetto', prima: 'AG +3 / +Ann. Soggiogam.', dopo: 'AG +5 / +Ann. Soggiogam.', motivo: '[A] Arpa dell\'Ade: Ag +5' },
  { chiave: 'accessorio/cintura-hall-of-fame', colonna: 'effetto', prima: '+Auto-Maraku', dopo: '+Auto-Maraku / RS +5', motivo: '[A] Kugelbein: Auto-Maraku / Rs +5' },
  { chiave: 'accessorio/fascia-capel-bianca-r', colonna: 'effetto', prima: '+Ondata vitale (HP +30%) / RS +8', dopo: '+Ondata vitale (HP +30%) / RS +5', motivo: '[A] Fascia capel. bianca R: Ondata vitale / Rs +5' },
  { chiave: 'protezione/veste-haten', colonna: 'statistiche_json', prima: '{"per":"tutti","testo":"Difesa 250, Elusione 19"}', dopo: '{"per":"Solo donne","testo":"Difesa 250, Elusione 19"}', motivo: '[P] Veste haten: Femmine, Difesa 250, Elusione 19' },
  // 3. apostrofi
  nome('accessorio/anello-dell-energia', 'Anello dell energia', 'Anello dell\'energia', '[A] Anello dell’energia'),
  nome('accessorio/strangolino-dell-anima', 'Strangolino dell anima', 'Strangolino dell\'anima', '[A] Strangolino dell’anima'),
  nome('accessorio/blocco-d-appunti', 'Blocco d appunti', 'Blocco d\'appunti', '[A] Blocco d’appunti'),
  nome('arma/frusta-dell-eroe', 'Frusta dell eroe', 'Frusta dell\'eroe', 'apostrofo'),
  nome('arma/frusta-dell-illusione', 'Frusta dell illusione', 'Frusta dell\'illusione', 'apostrofo'),
  nome('arma/ascia-dell-amazzone', 'Ascia dell amazzone', 'Ascia dell\'amazzone', 'apostrofo'),
  nome('protezione/veste-dell-eliseo', 'Veste dell Eliseo', 'Veste dell\'Eliseo', 'apostrofo'),
  nome('protezione/collare-dell-armata', 'Collare dell armata', 'Collare dell\'armata', 'apostrofo'),
  nome('protezione/corona-d-acqua', 'Corona d acqua', 'Corona d\'acqua', 'apostrofo'),
  nome('accessorio/portafulmini-antielettricita', 'Portafulmini antielettricita', 'Portaf. antielettricità', '[A] Portaf. antielettricità (Untouchable, 8.000 ¥)'),
  // 4. il nome di [A] come nome alternativo
  { chiave: 'accessorio/braccialetto-circolare', colonna: 'nomi_altri_json', prima: '[]', dopo: '["Braccial. circolare"]', motivo: '[A] Braccial. circolare' },
  { chiave: 'accessorio/braccialetto-bianco', colonna: 'nomi_altri_json', prima: '[]', dopo: '["Braccial. bianco"]', motivo: '[A] Braccial. bianco' },
  { chiave: 'accessorio/braccialetto-nero', colonna: 'nomi_altri_json', prima: '[]', dopo: '["Braccial. nero"]', motivo: '[A] Braccial. nero' },
  { chiave: 'accessorio/collana-vento-di-giada', colonna: 'nomi_altri_json', prima: '[]', dopo: '["Coll. vento di giada"]', motivo: '[A] Coll. vento di giada' },
  // 5. categorie
  categoria('arma/bracciale-confuso', 'arma', '[A] Bracciale confuso (Pulinpa)'),
  categoria('arma/pend-disperazione', 'arma', '[A] Pend. disperazione (Annulla Disperazione)'),
  categoria('regalo/collana-magnetica', 'regalo', '[A] Collana magnetica (Guarigione rapida); nessun Confidente la riceve'),
  categoria('regalo/maschera-del-ladro', 'regalo', '[A] Maschera del ladro (Ann. Soggiogam.); nessun Confidente la riceve'),
  categoria('altro/cintura-eccentrica', 'altro', '[A] Cintura eccentrica'),
  categoria('altro/cintura-del-fastidio', 'altro', '[A] Cintura del fastidio'),
  categoria('altro/fermaglio-per-gatti', 'altro', '[A] Fermaglio per gatti'),
  categoria('altro/batterie-portatili', 'altro', '[A] Batterie portatili'),
  categoria('altro/perla-dellattaccamento', 'altro', '[A] Perla dell’attaccamento'),
  categoria('consumabile/corona-della-salvezza', 'consumabile', '[A] Corona della salvezza (Salvezza, 990.000 ¥, Tanaka)'),
  { chiave: 'consumabile/corona-della-salvezza', colonna: 'sottocategoria', prima: 'cura', dopo: null, motivo: 'la sottocategoria «cura» è dei consumabili' },
];

/** Le note storiche dei valori superati (la guida prevale, il dato di prima resta come nota sulla fonte). */
const NOTE: readonly NotaStoricaTesti[] = [
  { chiave: 'arpa-dellade-agilita-fonte', fonte: 'Guida italiana: Accessori (Arpa dell’Ade); vecchio elenco dell’equipaggiamento (Hades Harp); decisione 21 dell’utente',
    testo: 'Il vecchio elenco dell’equipaggiamento dava all’Arpa dell’Ade (Hades Harp) «AG +3»; la pagina Accessori della guida italiana dà «Ag +5» (e +8 alla R): vale la guida. È una nota sulla fonte: non cambia la scheda.',
    catalogo: ['accessorio/maschera-del-ladro'], articoli: [] },
  { chiave: 'fascia-capel-bianca-r-resistenza-fonte', fonte: 'Guida italiana: Accessori (Fascia capel. bianca R); vecchio elenco dell’equipaggiamento (White Headband R); decisione 21 dell’utente',
    testo: 'Il vecchio elenco dell’equipaggiamento dava alla Fascia capel. bianca R «RS +8», come crescono le altre varianti R; la pagina Accessori della guida italiana le dà «Rs +5», come alla base: vale la guida finché non si verifica in gioco. È una nota sulla fonte: non cambia la scheda.',
    catalogo: ['accessorio/fascia-capel-bianca-r'], articoli: [] },
  { chiave: 'veste-haten-chi-la-indossa-fonte', fonte: 'Guida italiana: Protezioni (Veste haten); listino dell’app; decisione 21 dell’utente',
    testo: 'Il listino dell’app dava la Veste haten indossabile da tutti; la pagina Protezioni della guida italiana la dà alle «Femmine» (Difesa 250, Elusione 19): vale la guida. È una nota sulla fonte: non cambia la scheda.',
    catalogo: ['protezione/veste-haten'], articoli: [] },
];

/**
 * 6. Le schede di gruppo: una scheda per più oggetti che hanno ognuno la sua, con le offerte vere sulle schede singole. Vanno nel Cestino (si
 * rimettono da lì, con i loro legami), solo se nessuna offerta visibile, nessun regalo, nessuna ricompensa o contenuto, nessuna voce del Diario e
 * nessuna partita le usa. Le tre schede degli incensi di Jose (revisione finale, riga «Restano» del lotto E: «80 Fiori» nelle schede doppie)
 * ripetevano anche il costo in fiori, che vive nelle offerte di Jose delle varianti.
 */
const GRUPPI: ReadonlyArray<{ chiave: string; perche: string }> = [
  { chiave: 'accessorio/fasce-colorate', perche: 'le Fasce rossa, blu, verde e gialla hanno ognuna la sua scheda e la sua offerta' },
  { chiave: 'accessorio/braccialetti-tematici', perche: 'i Braccialetti stelle, circolare, bianco e nero hanno ognuno la sua scheda e la sua offerta' },
  { chiave: 'consumabile/ambra-grigia', perche: 'Ambra grigia MA, AG e FO hanno ognuna la sua scheda e l’offerta di Jose (80 fiori)' },
  { chiave: 'consumabile/ambra-grigia-rs-fr', perche: 'Ambra grigia RS e FR hanno ognuna la sua scheda e l’offerta di Jose (80 fiori)' },
  { chiave: 'consumabile/nirvana', perche: 'Nirvana FO, AG, RS, MA e FR hanno ognuna la sua scheda e l’offerta di Jose' },
];

/** Una scheda di gruppo nel Cestino, con le guardie; l'esito per l'audit (con la scheda com'era). */
function scartaGruppo(db: AppDatabase, g: (typeof GRUPPI)[number]): { chiave: string; esito: string; scheda?: unknown } {
  const r = db.prepare('SELECT * FROM main.catalogo_oggetto WHERE chiave = ?').get(g.chiave) as Record<string, unknown> | undefined;
  if (!r) return { chiave: g.chiave, esito: 'già tolta' };
  if (r.origine !== 'seed' || r.seed_json !== null) return { chiave: g.chiave, esito: 'scheda corretta dall’utente: non toccata' };
  const usi: string[] = [];
  const conta = (sql: string) => db.prepare(sql).pluck().get(g.chiave) as number;
  if (conta('SELECT COUNT(*) FROM main.articolo WHERE catalogo_chiave = ? AND nascosto = 0')) usi.push('offerte visibili');
  if (esisteTabella(db, 'confidente_regalo') && conta('SELECT COUNT(*) FROM main.confidente_regalo WHERE catalogo_chiave = ?')) usi.push('regali');
  if (esisteTabella(db, 'ricompensa_oggetto') && conta('SELECT COUNT(*) FROM main.ricompensa_oggetto WHERE catalogo_chiave = ?')) usi.push('ricompense');
  if (esisteTabella(db, 'voce_oggetto') && conta('SELECT COUNT(*) FROM main.voce_oggetto WHERE catalogo_chiave = ?')) usi.push('contenuti delle voci della guida');
  // ogni altra tabella che punta al catalogo (oggetti delle Persona, letture, attività, ricette, trasformazioni, proposte)
  for (const [tabella, colonna] of [['oggetto', 'catalogo_chiave'], ['attivita', 'catalogo_chiave'], ['libro', 'catalogo_chiave'], ['film', 'catalogo_chiave'],
    ['ricetta_materiale', 'catalogo_chiave'], ['trasformazione_oggetto', 'anello_chiave'], ['trasformazione_oggetto', 'cristallo_chiave'], ['proposta_abbinamento', 'catalogo_chiave']] as const) {
    if (esisteTabella(db, tabella) && (db.prepare(`SELECT COUNT(*) FROM main."${tabella}" WHERE "${colonna}" = ?`).pluck().get(g.chiave) as number)) usi.push(`${tabella}.${colonna}`);
  }
  usi.push(...vociCheCitano(db, g.chiave), ...partiteCheCitano(db, g.chiave));
  if (usi.length) return { chiave: g.chiave, esito: `usata (${usi.join('; ')}): non toccata` };
  // le offerte di gruppo, già nascoste, perdono il collegamento alla scheda (come farebbe la chiave esterna: le migrazioni girano senza), dentro la
  // stessa registrazione del Cestino: il ripristino le ricollega
  conCestino144(db, { tipo: 'oggetto', chiave: g.chiave, nome: String(r.nome), contesto: `Scheda di gruppo: ${g.perche}` }, () => {
    db.prepare('UPDATE main.articolo SET catalogo_chiave = NULL WHERE catalogo_chiave = ? AND nascosto = 1').run(g.chiave);
    db.prepare('DELETE FROM main.catalogo_oggetto WHERE chiave = ?').run(g.chiave);
  });
  return { chiave: g.chiave, esito: `nel Cestino: ${g.perche}`, scheda: r };
}

export const migration284: Migration = {
  id: 284,
  name: 'nomi_e_identita_degli_accessori',
  up(db) {
    if (!db.inTransaction) throw new Error('284: manca la transazione della migrazione; nessuna modifica applicata.');
    if (!esisteTabella(db, 'catalogo_oggetto')) { logger.warn({ migrazione: 284 }, 'catalogo assente: niente da fare'); return; }
    const diarioPrima = improntaDiario(db);
    const esiti: Array<EsitoColonna & { motivo: string }> = SCRITTURE.map((s) => ({ ...scriviColonnaCatalogo(db, s.chiave, s.colonna, s.prima, s.dopo), motivo: s.motivo }));
    const scritte = esiti.filter((e) => e.esito === 'scritto').length;
    // le note dei valori superati, solo se il valore nuovo c'è (scritto ora o già prima)
    const note = NOTE.map((n) => {
      const valore = esiti.find((e) => n.catalogo.includes(e.chiave) && (e.colonna === 'effetto' || e.colonna === 'statistiche_json'));
      return valore && (valore.esito === 'scritto' || valore.esito === 'già conforme') ? { chiave: n.chiave, ...notaStoricaTesti(db, n) } : { chiave: n.chiave, esito: 'valore non scritto: nota non creata', cambiate: 0 };
    });
    const gruppi = esisteTabella(db, 'cestino') ? GRUPPI.map((g) => scartaGruppo(db, g)) : GRUPPI.map((g) => ({ chiave: g.chiave, esito: 'Cestino assente: non toccata' }));
    const gruppiNelCestino = gruppi.filter((g) => g.esito.startsWith('nel Cestino')).length;
    if (improntaDiario(db) !== diarioPrima) throw new Error('284: le voci del Diario sono cambiate; nessuna modifica applicata.');
    const cambiate = scritte + gruppiNelCestino + note.reduce((n, x) => n + x.cambiate, 0);
    if (cambiate) invalidaCacheDiGioco();
    scriviAuditChiusura(db, AUDIT, 284, { conteggi: { scritte, gruppiNelCestino, note: note.filter((n) => n.cambiate > 0).length, nonToccate: esiti.filter((e) => /non toccat|assente/.test(e.esito)).length },
      fonti: [FONTE_ACCESSORI, FONTE_PROTEZIONI], esiti, note, gruppi }, cambiate);
    logger.info({ migrazione: 284, scritte, gruppiNelCestino },'Accessori: nomi, valori, apostrofi e categorie secondo la guida');
  },
};
