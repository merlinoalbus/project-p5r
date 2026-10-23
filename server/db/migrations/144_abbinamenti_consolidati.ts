// ============================================================
// 144 — gli abbinamenti del catalogo consolidati (BON-07, piano approvato dall'utente il 23/10: niente pannello «Abbinamenti da approvare»)
// ============================================================
//
// Delle 87 proposte di abbinamento 121 ancora da approvare, 28 sono quelle di Tanaka (superate dal listino Royal, migrazione 142). Le altre 59
// si dividono così (conti verificati su una copia dei dati di p5s allo schema 143: confermate 37, fuse 3, offerte nascoste 3):
//   - 22 «certe» (6 baratti del Gachapon, la disponibilità del Sandwich inzuppato, 15 contenuti di forzieri e semi dei Palazzi, uno dei quali
//     con la quantità indicata a parte): si applicano;
//   - 15 risolte dalle fonti Royal (AllGameStaff «Negozi speciali», «Scambi e venditori nascosti», «Elenco dei negozi», catalogo di Persona 5 Royal):
//       · Katsu a pezzettoni: la guida dice «Domenica sera», 150 ¥, ed è proprio quello che l'offerta ha già: si conferma il legame;
//       · Catena di perline nei forzieri e nella ricompensa della Mamma manager: è il consumabile che ripristina tutti gli HP (la guida dei
//         consumabili la dà per «Forzieri (vari Palazzi e Dedali), Richieste»); l'arma omonima nasce dal listino di un negozio, non dai forzieri;
//       · Veste nera e Kogatana nera nei forzieri: materiali «mutageno» della Trasmutazione di Royal (non l'armatura/arma dei listini);
//       · costo dello scambio di Sakai: «Razione militare» e «Crostatina angelo» sono i consumabili della guida (non il materiale del distributore
//         del negozio né il regalo del Taisho Store);
//   - 3 doppioni del catalogo del Venditore Ambulante (la guida scrive «Portafortuna croce», «Portafortuna teschio», «Specchio del rimbotto»):
//     le identità vecchie si fondono nelle nuove con il gesto di fusione del catalogo (Cestino reversibile), e le tre offerte vecchie, che
//     ripetevano le nuove con lo stesso prezzo e le stesse condizioni, si nascondono (mai cancellate).
// Restano da approvare 5 proposte che le fonti non risolvono (Distintivo dell'angelo e Maschera del ladro di Sakai): domande all'utente.
//
// I conti tornano così: 22 + 15 confermate + 3 fusioni + 5 che restano = 45. Le altre 14 sono le ALTERNATIVE SCARTATE: ogni conferma
// mette `scartata` le proposte dello stesso gruppo che puntavano a un altro oggetto (`marca`, come il gesto manuale: per esempio per il costo
// «Razione militare» restano scartati il materiale e il regalo omonimi). 45 + 14 = 59.
//
// Ogni conferma applica le stesse operazioni e gli stessi controlli del gesto manuale (fonte cambiata dopo la proposta ⇒ si ferma e la
// proposta resta com'è, annotata nel log): nessun dato viene sovrascritto alla cieca. Le operazioni sono una COPIA CONGELATA dei servizi
// (`abbinamentiCatalogo144.ts`, `cestinoRegistro144.ts`): la migrazione non importa niente da `server/services/` e dà sempre lo stesso risultato
// anche se i servizi cambiano.
//
// Nessun avanzamento delle partite cambia e questa migrazione NON scrive mai nello schema `utente`. Il gesto vivo della fusione sposterebbe
// anche `regalo_partita.catalogo_chiave` dalla vecchia identità alla nuova; qui no. I regali delle partite nascono da `confidente_regalo`
// (chiave scelta fra i regali dei Confidenti) e nessun regalo dei Confidenti punta alle tre chiavi fuse (`accessorio/portafortuna-a-croce`,
// `accessorio/portafortuna-a-teschio`, `accessorio/specchio-del-rimbalzo`: sono accessori del Venditore Ambulante): quindi non esistono
// righe di `regalo_partita` da spostare. Il lettore dei regali (`regaliPartita.ts`) restituisce la chiave salvata così com'è e non risolve
// gli alias: se in futuro una partita avesse una di queste chiavi, la tabella `oggetto` del Cestino (`main.cestino`, chiave = identità fusa,
// contesto «Fuso in «…»») è l'unica traccia della fusione. Sulla copia dei dati di p5s (23/10) `utente.regalo_partita` ha 0 righe in totale e
// `utente.cestino_partite` 0: la scelta non cambia niente oggi.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { confermaProposta144, confermaPropostaConQuantita144, type TipoProposta144 } from './abbinamentiCatalogo144.js';

/** [tipo, riga, gruppo, oggetto scelto] — esattamente le proposte verificate, non una regola generale. */
const DA_CONFERMARE: ReadonlyArray<readonly [TipoProposta144, string, string, string]> = [
  // 15 risolte dalle fonti Royal
  ['articolo', 'friggitoria-hagoromo/katsu-a-pezzettoni', 'hagoromo-domenica-sera', 'consumabile/katsu-a-pezzettoni'],
  ['articolo', 'mercante-sakai/la-fattorizzazione', 'costo/razione militare', 'consumabile/razione-militare'],
  ['articolo', 'mercante-sakai/mazza-fervente', 'costo/crostatina angelo', 'consumabile/crostatina-angelo'],
  ['ricompensa', 'richiesta/la-mamma-manager', ':catena di perline', 'consumabile/catena-di-perline'],
  ['voce', 'futaba-07-camera-del-rigetto-chamber-of-rejection/5', ':catena di perline', 'consumabile/catena-di-perline'],
  ['voce', 'futaba-09-camera-del-santuario-chamber-of-sanctuary/0', ':veste nera', 'materiale/veste-nera'],
  ['voce', 'iweleth-09-cammino-per-il-santo-graal-parte-i/0', ':catena di perline', 'consumabile/catena-di-perline'],
  ['voce', 'madarame-06-sala-del-tesoro-atrio/7', ':catena di perline', 'consumabile/catena-di-perline'],
  ['voce', 'maruki-07-sala-di-controllo/4', ':catena di perline', 'consumabile/catena-di-perline'],
  ['voce', 'maruki-09-sala-visite/3', ':catena di perline', 'consumabile/catena-di-perline'],
  ['voce', 'niijima-13-oscura-dimora/2', ':kogatana nera', 'materiale/kogatana-nera'],
  ['voce', 'okumura-10-produzione-armamenti/4', ':catena di perline', 'consumabile/catena-di-perline'],
  ['voce', 'shido-01-passaggio-centrale-sala-d-ingresso/2', ':kogatana nera', 'materiale/kogatana-nera'],
  ['voce', 'shido-11-corridoio-mezzavia-babordo/0', ':catena di perline', 'consumabile/catena-di-perline'],
  ['voce', 'shido-14-sala-macchine/2', ':catena di perline', 'consumabile/catena-di-perline'],
  // 22 certe
  ['articolo', 'gachapon-akihabara/scambio-decarabia-addobbato', 'baratto-gachapon', 'materiale/decarabia-addobbato'],
  ['articolo', 'gachapon-akihabara/scambio-die-soujou', 'baratto-gachapon', 'materiale/die-soujou'],
  ['articolo', 'gachapon-akihabara/scambio-kin-ki-kink', 'baratto-gachapon', 'materiale/kin-ki-kink'],
  ['articolo', 'gachapon-akihabara/scambio-minidominazione', 'baratto-gachapon', 'materiale/minidominazione'],
  ['articolo', 'gachapon-akihabara/scambio-mothman-muschiato', 'baratto-gachapon', 'materiale/mothman-muschiato'],
  ['articolo', 'gachapon-akihabara/scambio-strumento-girimehkala', 'baratto-gachapon', 'altro/strumento-girimehkala'],
  ['articolo', 'panetteria-yon-germain/sandwich-inzuppato', 'disponibilita', 'consumabile/sandwich-inzuppato'],
  ['voce', 'kamoshida-01-cancello-del-castello-ingresso-recupero-1-seme-della-bramosia', 'seme', 'chiave/recupero-1-seme-della-bramosia'],
  ['voce', 'kamoshida-13-tetto-seme-della-bramosia', 'seme', 'chiave/recupero-2-seme-della-bramosia'],
  ['voce', 'kamoshida-15-torre-centrale-recupero-3-seme-della-bramosia', 'seme', 'chiave/recupero-3-seme-della-bramosia'],
  ['voce', 'madarame-06-sala-del-tesoro-atrio/2', ':perlina rigenerante', 'consumabile/perlina-rigenerante'],
  ['voce', 'madarame-06-sala-del-tesoro-atrio/5', 'arma:yuibitachi', 'arma/yuibitachi'],
  ['voce', 'madarame-06-sala-del-tesoro-atrio/7', ':fiala delle vertigini s', 'consumabile/fiala-delle-vertigini-s'],
  ['voce', 'madarame-nelle-profondita-del-museo-apri-forziere', ':hiranya', 'consumabile/hiranya'],
  ['voce', 'madarame-nelle-profondita-del-museo-apri-forziere-2', ':perlina', 'consumabile/perlina'],
  ['voce', 'madarame-nelle-profondita-del-museo-depreda-forziere', ':roccia nera', 'materiale/roccia-nera'],
  ['voce', 'madarame-nelle-profondita-del-museo-depreda-forziere-2', ':goccia dell\'anima', 'consumabile/goccia-dellanima'],
  ['voce', 'madarame-nelle-profondita-del-museo-depreda-forziere-3', ':acqua battesimale', 'consumabile/acqua-battesimale'],
  ['voce', 'madarame-nelle-profondita-del-museo-raccogli-seme-della-vanita-blu', 'seme', 'chiave/raccogli-seme-della-vanita-blu'],
  ['voce', 'madarame-nelle-profondita-del-museo-seme-vanita-verde', 'seme', 'chiave/seme-vanita-verde'],
  ['voce', 'madarame-scopri-dove-il-tesoro-seme-della-vanita-rosso', 'seme', 'chiave/seme-della-vanita-rosso'],
];

/**
 * La proposta senza quantità: la ricompensa del miniboss di Madarame è «Carta abilità Media.» (una carta, testo della voce), quindi la quantità
 * è 1: è lo stesso gesto «scegli l'oggetto con la quantità» del vecchio pannello, con la quantità che la fonte attesta.
 */
const CON_QUANTITA: ReadonlyArray<readonly [TipoProposta144, string, string, string, number]> = [
  ['voce', 'madarame-06-sala-del-tesoro-atrio/4', 'ricompensa-media-125', 'carta-abilita/media', 1],
];

/** I 3 doppioni del catalogo: [identità vecchia, identità della guida Royal] e l'offerta vecchia del Venditore Ambulante che ripeteva la nuova. */
const FUSIONI: ReadonlyArray<readonly [string, string, string, string]> = [
  ['accessorio/portafortuna-a-croce', 'accessorio/portafortuna-croce', 'venditore-ambulante/portafortuna-a-croce', 'venditore-ambulante/portafortuna-croce'],
  ['accessorio/portafortuna-a-teschio', 'accessorio/portafortuna-teschio', 'venditore-ambulante/portafortuna-a-teschio', 'venditore-ambulante/portafortuna-teschio'],
  ['accessorio/specchio-del-rimbalzo', 'accessorio/specchio-del-rimbotto', 'venditore-ambulante/specchio-del-rimbalzo', 'venditore-ambulante/specchio-del-rimbotto'],
];

export const migration144: Migration = {
  id: 144,
  name: 'abbinamenti_consolidati',
  up(db) {
    const tabella = (n: string) => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(n);
    if (!tabella('proposta_abbinamento') || !tabella('catalogo_oggetto') || !tabella('voce_oggetto')) { logger.warn('[migration144] schema del catalogo incompleto: nessun abbinamento toccato'); return; }
    const stato = db.prepare('SELECT stato FROM main.proposta_abbinamento WHERE riga_tipo = ? AND riga_chiave = ? AND gruppo = ? AND catalogo_chiave = ?');
    const esito = { confermate: 0, giaApplicate: 0, ferme: [] as string[], fuse: 0, offerteNascoste: 0 };
    for (const [riga_tipo, riga_chiave, gruppo, catalogo_chiave] of DA_CONFERMARE) {
      const p = stato.get(riga_tipo, riga_chiave, gruppo, catalogo_chiave) as { stato: string } | undefined;
      if (!p) continue; // non c'è su questa istanza (o è già stata ristrutturata): niente da fare
      if (p.stato === 'confermata') { esito.giaApplicate++; continue; }
      if (p.stato !== 'da-approvare') continue; // scartata dall'utente: non si riapre
      try {
        confermaProposta144(db, { riga_tipo, riga_chiave, gruppo, catalogo_chiave });
        esito.confermate++;
      } catch (e) {
        esito.ferme.push(`${riga_tipo}:${riga_chiave}#${gruppo}`);
        logger.warn({ riga_tipo, riga_chiave, gruppo, catalogo_chiave, errore: e instanceof Error ? e.message : String(e) }, '[migration144] proposta non applicata, lasciata com\'è');
      }
    }
    for (const [riga_tipo, riga_chiave, gruppo, catalogo_chiave, quantita] of CON_QUANTITA) {
      const p = stato.get(riga_tipo, riga_chiave, gruppo, catalogo_chiave) as { stato: string } | undefined;
      if (!p || p.stato !== 'da-approvare') { if (p?.stato === 'confermata') esito.giaApplicate++; continue; }
      try {
        confermaPropostaConQuantita144(db, { riga_tipo, riga_chiave, gruppo, catalogo_chiave }, quantita);
        esito.confermate++;
      } catch (e) {
        esito.ferme.push(`${riga_tipo}:${riga_chiave}#${gruppo}`);
        logger.warn({ riga_tipo, riga_chiave, gruppo, catalogo_chiave, errore: e instanceof Error ? e.message : String(e) }, '[migration144] proposta non applicata, lasciata com\'è');
      }
    }
    // doppioni del catalogo: fusione con il gesto del catalogo (reversibile dal Cestino) e offerta ripetuta nascosta
    const adesso = new Date().toISOString();
    for (const [da, a, offertaVecchia, offertaNuova] of FUSIONI) {
      const p = db.prepare("SELECT gruppo, stato FROM main.proposta_abbinamento WHERE riga_tipo = 'catalogo' AND riga_chiave = ? AND catalogo_chiave = ?").get(da, a) as { gruppo: string; stato: string } | undefined;
      if (!p || p.stato !== 'da-approvare') continue;
      try {
        confermaProposta144(db, { riga_tipo: 'catalogo', riga_chiave: da, gruppo: p.gruppo, catalogo_chiave: a });
        esito.fuse++;
      } catch (e) {
        esito.ferme.push(`catalogo:${da}`);
        logger.warn({ da, a, errore: e instanceof Error ? e.message : String(e) }, '[migration144] fusione non applicata, lasciata com\'è');
        continue;
      }
      // la vecchia offerta ripeteva la nuova (stesso negozio, stesso prezzo, stessa identità dopo la fusione): si nasconde
      const vecchia = db.prepare('SELECT * FROM main.articolo WHERE chiave = ?').get(offertaVecchia) as Record<string, unknown> | undefined;
      const nuova = db.prepare('SELECT * FROM main.articolo WHERE chiave = ?').get(offertaNuova) as Record<string, unknown> | undefined;
      if (vecchia && nuova && vecchia.nascosto === 0 && vecchia.negozio_chiave === nuova.negozio_chiave && vecchia.prezzo === nuova.prezzo
        && vecchia.catalogo_chiave === nuova.catalogo_chiave && vecchia.condizioni_json === nuova.condizioni_json) {
        esito.offerteNascoste += db.prepare("UPDATE main.articolo SET nascosto = 1, seed_json = COALESCE(seed_json, ?), origine = 'utente', updated_at = ? WHERE chiave = ?")
          .run(JSON.stringify(vecchia), adesso, offertaVecchia).changes;
      }
    }
    logger.info({ ...esito }, '[migration144] abbinamenti consolidati');
  },
};
