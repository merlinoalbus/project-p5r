// ============================================================
// 353 — i testi dei luoghi che ripetevano le offerte (L2-07, lotto «Macchine e fine del listino condiviso»)
// ============================================================
//
// Un dato, un punto di modifica (DECISIONI §2, AD9): ciò che un punto vendita vende sta nelle sue righe `articolo`. `luogo.cosa_offre`, `luogo.note` e
// `negozio.note` ne ripetevano elenchi, prezzi, numero di macchine, rifornimento e chiusura col caldo. Quelle parti si tolgono; l'originale va nell'archivio
// delle frasi (`dati_guida.archivio-frasi-l11`, colonne `luogo.cosa_offre`, `luogo.note`, `negozio.note`). Ciò che dice altro resta: le date delle novità di
// Akihabara, l'indagine alla sala giochi, che le fonti non attribuiscono i pin di Shinjuku (passa da `cosa_offre` alla nota: non è merce).
//
// Controllati uno per uno i luoghi del censimento (rapporto X, A-Q9: testi con il nome di un oggetto del catalogo, un numero di macchine o un prezzo) e
// le note dei negozi che citano le proprie offerte. `CAMBI` è ciò che si toglie, `TENUTI` ciò che resta e perché; entrambi finiscono nel verbale.
//
// Guardia per identità: un testo cambia solo se è ancora esattamente quello atteso, altrimenti si salta e lo si annota. Dove la riga ha una fotografia
// (`seed_json`) con il testo atteso, la fotografia passa al testo nuovo: «Ripristina» non rimette ciò che si è tolto. L'originale resta nell'archivio.
// Idempotente. Verbale: `dati_guida.audit-l2-07-testi-che-ripetono-offerte`. Non scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere } from './archivioL1.js';
import { allineaFotografia, allineaPinDelLuogo, fotografa, scriviVerbale, verificaFotografia, type EsitoL2, type RegolaImpronta } from './attrezziL2.js';

const errore = (motivo: string): never => { throw new Error(`353: ${motivo}; nessuna modifica applicata.`); };

interface Cambio { tabella: 'luogo' | 'negozio'; chiave: string; colonna: 'cosa_offre' | 'note'; atteso: string | null; nuovo: string | null; ripete: string }

const luogo = (chiave: string, colonna: Cambio['colonna'], atteso: string | null, nuovo: string | null, ripete: string): Cambio => ({ tabella: 'luogo', chiave, colonna, atteso, nuovo, ripete });

const AKIHABARA = 'akihabara/distributori-akihabara';
const SHINJUKU = 'shinjuku/distributori-shinjuku';
const TABACCAIO = 'yongen-jaya/distributore-tabaccaio';
const SHUJIN = 'shujin-academy/distributori-shujin';
const NON_ATTRIBUITI = 'Le fonti non dicono quale pin sia quale macchina.';

export const CAMBI: readonly Cambio[] = [
  luogo(AKIHABARA, 'cosa_offre', '6 distributori con bevande esclusive, incluse bevande con effetti di potenziamento/penalità in battaglia (es. Curry alla fragola, Locusta alla maionese, Miso di stella marina, Bevanda energetica, Strano boccone, Salsa rancida).',
    'Bevande esclusive, anche con effetti di potenziamento o penalità in battaglia.', 'numero delle macchine e nomi delle offerte'),
  luogo(AKIHABARA, 'note', 'Rifornimento settimanale (lunedì); nuove bevande dal 1° settembre e dal 10 ottobre; esauriti durante ondate di calore.',
    'Nuove bevande dal 1° settembre e dal 10 ottobre.', 'rifornimento e caldo, già regole delle offerte; le date non sono attribuite a un prodotto e restano'),
  luogo('kichijoji/distributori-kichijoji', 'cosa_offre', 'Tre distributori automatici nella zona dello shopping.', '', 'numero delle macchine e Area'),
  luogo(SHINJUKU, 'cosa_offre', `Tre distributori automatici: uno con Second Maid, Manta, Earl Green e Ultimate Amazake; due con Dr. Salt NEO, Arginade e Acqua della rinascita. ${NON_ATTRIBUITI}`, '', 'assortimento delle tre macchine; la frase sui pin passa alla nota'),
  luogo(SHINJUKU, 'note', null, NON_ATTRIBUITI, 'nessuna: riceve la frase sui pin, che non è merce'),
  luogo(TABACCAIO, 'cosa_offre', 'Bevande: Nastea, 1UP, Starvicks (130¥ ciascuna).', '', 'offerte e prezzi'),
  luogo(TABACCAIO, 'note', 'Rifornito settimanalmente ogni lunedì. Esaurito durante allerta ondata di calore.', null, 'rifornimento e caldo, già regole delle offerte'),
  luogo(SHUJIN, 'cosa_offre', 'Distributori dell\'edificio principale e del cortile.', '', 'i nomi dei punti vendita della sede (l\'originale è in archivio dalla 347)'),
  luogo(SHUJIN, 'note', 'Rifornimento settimanale, esauriti durante ondate di calore.', null, 'rifornimento e caldo, già regole delle offerte'),
  luogo('shibuya/sala-giochi-shibuya', 'cosa_offre', 'Distributore automatico con bevande curative (Dr. Salt NEO 210¥, Creatura-cura sonno 200¥, Arginade, Acqua della rinascita); luogo dell\'indagine sul cheater Nejima collegata al Confidente Shinya.',
    'Luogo dell\'indagine sul cheater Nejima collegata al Confidente Shinya.', 'offerte e prezzi del distributore della sala'),
  luogo('yongen-jaya/bagno-pubblico', 'cosa_offre', 'Aumenta la dote Fascino, in particolare nei giorni di pioggia. Distributori automatici con Arginade e Acqua della rinascita a prezzo ridotto (100¥).',
    'Aumenta la dote Fascino, in particolare nei giorni di pioggia.', 'offerte e prezzi di `distributore-yongen-bagno`'),
  luogo('kanda-jinbocho/nagiuri', 'cosa_offre', 'Libri speciali con requisiti di lettura: Pagine ammuffite, Spadaccino provetto, Chiamami Capo, Casanova spregiudicato, Rivelazioni eroiche, Come fare karakuri, Comprendere il cuore.',
    'Libri speciali con requisiti di lettura.', 'elenco dei titoli'),
  luogo('shibuya/rafflesia', 'cosa_offre', 'Balsamo vegetale e materiali botanici; lavoro part-time come commesso/a (preparazione bouquet).',
    'Materiali botanici; lavoro part-time come commesso/a (preparazione bouquet).', 'il nome di un\'offerta'),
  luogo('shibuya/taiheido', 'cosa_offre', 'Libri vari (narrativa, saggistica, guide su attività e sblocco luoghi). Elenco parziale: La pulizia del cuore, Storia di Buchiko, Arte della persuasione, Minaccia Medjed, Vague, Eredità dell\'Impiccato, Luoghi della movida, Incontri spettrali, Un acquario al giorno, Vedetta lacustre, Santuari di Tokyo, Cieli notturni, Esplorando Nakano, Esperto a biliardo.',
    'Libri vari (narrativa, saggistica, guide su attività e sblocco luoghi).', 'elenco dei titoli'),
  luogo('shibuya/scarlet', 'cosa_offre', 'Noleggio DVD in abbonamento annuale (un DVD alla volta). 12 titoli: Bubbly Hills 90210, Wraith, Guy McVer, The X Folders, Betty la grezza, I.C.U., Prison Escape, The Running Dead, Casalinghe disparate, Doctor Mouse, 31, Tee. Ogni DVD dà +2 punti a una dote sociale (Fascino/Gentilezza/Perizia/Coraggio); +3 con libro "Anima da cineasta".',
    'Noleggio DVD in abbonamento annuale (un DVD alla volta). Ogni DVD dà +2 punti a una dote sociale (Fascino/Gentilezza/Perizia/Coraggio); +3 con libro "Anima da cineasta".', 'elenco dei titoli'),
  luogo('shibuya/prossimo-asso', 'cosa_offre', 'Attrezzature sportive e da pesca; vendita del libro "Esperto a biliardo".', 'Attrezzature sportive e da pesca.', 'il nome di un\'offerta'),
  luogo('shinjuku/hinokuniya', 'cosa_offre', 'Libri specializzati: Enciclopedia floreale, La scienza del baseball, Anima da cineasta, L\'ABC dell\'artigianato, Maestro a freccette, Lo zen della pesca, Segreti di gioco.', 'Libri specializzati.', 'elenco dei titoli'),
  luogo('shujin-academy/biblioteca-shujin', 'cosa_offre', 'Prestito gratuito di libri: Il magnifico ladro, La leggenda dei pirati, Zorro il fuorilegge, La ballerina seducente, La papessa illusoria, L\'urlo di Cthulhu, Lettura rapida, Vestito di ceneri, Donna nel buio, L\'eroe con l\'arco.',
    'Prestito gratuito di libri.', 'elenco dei titoli'),
  { tabella: 'negozio', chiave: 'friggitoria-hagoromo', colonna: 'note', atteso: 'Friggitoria aperta solo la domenica sera. Unico articolo (Katsu a pezzettoni), venduto solo di domenica sera\nIndicazione storica di Hagoromo: Domenica sera. La disponibilità del Katsu è dichiarata sull’articolo (confermata dalla fonte Royal).',
    nuovo: 'Friggitoria aperta solo la domenica sera.\nIndicazione storica di Hagoromo: Domenica sera. La disponibilità del Katsu è dichiarata sull’articolo (confermata dalla fonte Royal).', ripete: 'l\'offerta e la sua condizione; la nota storica resta' },
];

/** Citano un oggetto, un prezzo o una macchina, ma non ripetono un'offerta del luogo. */
export const TENUTI: ReadonlyArray<{ chiave: string; motivo: string }> = [
  { chiave: 'asakusa/tokyo-skytree', motivo: 'nota: il libro che sblocca il luogo, che non vende niente' },
  { chiave: 'harajuku/harajuku-hangout', motivo: 'nota: discordanza fra le fonti sullo sblocco, il libro è citato per quello' },
  { chiave: 'harajuku/takenoko-street', motivo: 'nota: il libro che sblocca il luogo, che non vende niente' },
  { chiave: 'ichigaya/laghetto-ichigaya', motivo: 'pesci per esca, costi e premi: nessun punto vendita nel luogo' },
  { chiave: 'shibuya/protein-lovers', motivo: 'il prezzo è il costo dell\'attività, non un\'offerta; lo sposta eventualmente il lotto delle attività' },
  { chiave: 'shibuya/taiheido', motivo: 'solo `note`: corrispondenze libro-luogo, che nessun altro dato dice' },
  { chiave: 'shibuya/triple-seven', motivo: '«snack» è una descrizione generica, e il resto parla del lavoro' },
  { chiave: 'shibuya/rocinante', motivo: '«snack» è una descrizione generica' },
  { chiave: 'shibuya/kiyasuku', motivo: '«snack» è una descrizione generica' },
  { chiave: 'yongen-jaya/super-muramasa', motivo: '«snack» è una descrizione generica' },
  { chiave: 'yongen-jaya/venditore-patate-dolci', motivo: '«snack» è una descrizione generica' },
  { chiave: 'yongen-jaya/leblanc', motivo: 'i libri citati sbloccati dalla soffitta non sono offerte del luogo' },
  { chiave: 'yongen-jaya/negozio-usato-yumenoshima', motivo: 'il lettore DVD è un esempio di una categoria da fonte secondaria, segnalato come tale nella nota' },
  { chiave: 'negozio leblanc', motivo: 'il rango che sblocca ogni ricetta' },
  { chiave: 'negozio tsurukame-diamond', motivo: 'la guida non dà una data per l\'Anello del cuore' },
  { chiave: 'negozio tempio-kichijoji', motivo: 'dove e con chi si medita' },
  { chiave: 'negozio lotteria-shibuya', motivo: 'quale dei tre banchi, e come la guida divide i prodotti' },
  { chiave: 'negozio chihaya-shinjuku', motivo: 'il rango della lettura e le altre letture' },
  { chiave: 'negozio diner-shibuya', motivo: 'l\'effetto in Gentilezza della Bistecca' },
  { chiave: 'negozio distributore-shujin-edificio', motivo: 'il piano della macchina' },
  { chiave: 'negozio distributore-shujin-edificio-2', motivo: 'il piano della macchina' },
  { chiave: 'negozio u-distributore-di-kichijoji-1', motivo: 'dove sta la macchina' },
];

const REGOLE: readonly RegolaImpronta[] = [
  { tabella: 'luogo', senzaColonne: ['cosa_offre', 'note', 'updated_at'], conFotografiaDi: CAMBI.filter((c) => c.tabella === 'luogo').map((c) => c.chiave) },
  { tabella: 'negozio', senzaColonne: ['note', 'updated_at'], conFotografiaDi: CAMBI.filter((c) => c.tabella === 'negozio').map((c) => c.chiave) },
  { tabella: 'articolo', senzaColonne: [] },
  { tabella: 'spillo', senzaColonne: ['descrizione', 'updated_at'] },
];

export const migration353: Migration = {
  id: 353,
  name: 'testi_che_ripetono_offerte',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!['luogo', 'negozio', 'articolo', 'spillo', 'dati_guida'].every((t) => esisteTabella(db, t))) return;

    const adesso = new Date().toISOString();
    const esiti: EsitoL2[] = [];
    const prima = fotografa(db, REGOLE);
    for (const c of CAMBI) {
      const voce = `${c.tabella}.${c.colonna} di ${c.chiave}`;
      const riga = db.prepare(`SELECT ${c.colonna} AS testo FROM main.${c.tabella} WHERE chiave = ?`).get(c.chiave) as { testo: string | null } | undefined;
      if (!riga) { esiti.push({ voce, esito: 'saltata', motivo: 'riga assente' }); continue; }
      if (riga.testo === c.nuovo) { esiti.push({ voce, esito: 'gia-fatta' }); continue; }
      if (riga.testo !== c.atteso) { esiti.push({ voce, esito: 'saltata', motivo: 'il testo non è più quello atteso' }); continue; }
      if (c.atteso !== null) archiviaSenzaSovrascrivere(db, 'L2-07 · 353', `${c.tabella}.${c.colonna}`, { [c.chiave]: c.atteso });
      db.prepare(`UPDATE main.${c.tabella} SET ${c.colonna} = ?, updated_at = ? WHERE chiave = ? AND ${c.colonna} IS ?`).run(c.nuovo, adesso, c.chiave, c.atteso);
      allineaFotografia(db, c.tabella, c.chiave, c.colonna, c.atteso, c.nuovo, esiti);
      if (c.tabella === 'luogo' && c.colonna === 'cosa_offre' && c.atteso !== null && c.nuovo !== null) allineaPinDelLuogo(db, adesso, 'L2-07 · 353', c.chiave, c.atteso, c.nuovo, esiti);
      esiti.push({ voce, esito: 'applicata', motivo: c.ripete });
    }

    const anomalia = verificaFotografia(db, REGOLE, prima, new Set());
    if (anomalia) errore(anomalia);
    if (scriviVerbale(db, 'audit-l2-07-testi-che-ripetono-offerte', 'L2-07 · 353', esiti, { tenuti: TENUTI })) logger.info({ migrazione: 'L2-07-353', tolti: esiti.filter((e) => e.esito === 'applicata').length, tenuti: TENUTI.length }, 'testi che ripetevano le offerte tolti con archivio');
  },
};
