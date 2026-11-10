// ============================================================
// requisitiNota359 — l'elenco chiuso delle 189 righe di `confidente_requisito` per la migrazione 359 (L7-02)
// ============================================================
//
// Per ogni riga: il testo com'era (guardia per identità) e l'esito, letto a mano riga per riga il 9/11:
//   - `generato`: la frase ripete la condizione (anche con il nome del rango di una Dote o con «non si avvia prima»): la frase si genera, la nota è vuota;
//   - `nota`: racconta altro: resta il solo testo che informa, senza ripetere la data o il nome della Richiesta;
//   - `avviso`: la frase È il dato (tipo `avviso`), resta com'è.
// ============================================================

export type EsitoRequisito = 'generato' | 'nota' | 'avviso';
export interface RigaEsito { confidente: string; rango: number; indice: number; testo: string; esito: EsitoRequisito; nota?: string }

export const chiaveRequisito = (confidente: string, rango: number, indice: number): string => `${confidente}|${rango}|${indice}`;

/** Il valore che la colonna `testo` deve avere dopo la migrazione. */
export const notaDellEsito = (e: RigaEsito): string => (e.esito === 'generato' ? '' : e.esito === 'avviso' ? e.testo : e.nota as string);

const g = (confidente: string, rango: number, indice: number, testo: string): RigaEsito => ({ confidente, rango, indice, testo, esito: 'generato' });
const n = (confidente: string, rango: number, indice: number, testo: string, nota: string): RigaEsito => ({ confidente, rango, indice, testo, esito: 'nota', nota });
const a = (confidente: string, rango: number, indice: number, testo: string): RigaEsito => ({ confidente, rango, indice, testo, esito: 'avviso' });

// le frasi che ricorrono identiche
const APERTO = 'L\'evento si svolge all\'aperto.';
const TRAMA_FISSA = 'Evento di trama a data fissa.';
const TRAMA_AUTOMATICA = 'Avanzamento automatico di trama.';
const SCATTA = 'Il rango scatta automaticamente in quella data.';
const CONSEGNA = 'Va consegnata alle Gemelle.';
const PALAZZO_SHIDO = 'Si attiva automaticamente durante il Palazzo.';
const INTERROGATORIO = 'Interrogatorio, evento di trama.';

const PIOGGIA_ANN = 'Evento all\'aperto: non disponibile nei giorni di pioggia';
const MAI_PIOGGIA = 'Non è mai disponibile in caso di pioggia.';
const MAI_FUTABA = 'Futaba non è mai disponibile in caso di pioggia.';
const MAI_YOSHIDA = 'Yoshida non è disponibile se piove.';
const APERTO_SHINYA = 'Non deve piovere: l\'evento si svolge all\'aperto';

const NON_PRIMA_TRAMA = (data: string): string => `Non prima del ${data} (evento di trama fissato)`;
const NON_PRIMA_SCATTA = (data: string): string => `Non prima del ${data}: il rango scatta automaticamente in quella data`;
const NON_PRIMA_SAE = (data: string): string => `Non prima del ${data} (avanzamento automatico di trama)`;
const NON_PRIMA_INTERROGATORIO = 'Non prima del 20 novembre (interrogatorio, evento di trama)';
const COMPLETA_NIIJIMA = 'Completare il Palazzo di Niijima';

export const ESITI_REQUISITI: readonly RigaEsito[] = [
  // Akechi
  n('akechi', 1, 0, 'Disponibile dal 10 giugno: il Confidente si sblocca automaticamente durante l\'evento della trama (programma televisivo).', 'Il Confidente si sblocca automaticamente durante l\'evento della trama (programma televisivo).'),
  g('akechi', 3, 0, 'Conoscenza al rango 3 (Studioso)'),
  g('akechi', 3, 1, 'Fascino al rango 3 (Affascinante)'),
  g('akechi', 4, 0, 'Non deve piovere: l\'avanzamento al Rango 4 non è disponibile con la pioggia.'),
  g('akechi', 6, 0, 'Non avviabile prima del 3 settembre'),
  g('akechi', 7, 0, 'Non avviabile prima del 2 novembre'),
  g('akechi', 7, 1, 'Conoscenza al rango 4 (Dotto)'),
  n('akechi', 8, 0, 'Bisogna VINCERE il duello uno contro uno con Akechi nei Memento: se si perde il Confidente non avanza e occorre chiedergli la rivincita.', 'Se si perde il duello il Confidente non avanza e occorre chiedergli la rivincita.'),
  n('akechi', 9, 0, 'Si attiva automaticamente durante il Palazzo di Shido', PALAZZO_SHIDO),
  n('akechi', 10, 0, 'Si attiva automaticamente durante il Palazzo di Shido', PALAZZO_SHIDO),
  // Ann
  n('ann', 1, 0, 'Disponibile dal 15 aprile, quando Ann entra nel gruppo dopo la sconfitta del Capitano della Guardia nel Palazzo di Kamoshida', 'Ann entra nel gruppo dopo la sconfitta del Capitano della Guardia nel Palazzo di Kamoshida.'),
  g('ann', 2, 0, 'Non avviabile prima del 6 maggio'),
  g('ann', 2, 1, 'Gentilezza al Rango 2 (Gentile)'),
  n('ann', 3, 0, PIOGGIA_ANN, APERTO),
  n('ann', 4, 0, PIOGGIA_ANN, APERTO),
  n('ann', 5, 0, PIOGGIA_ANN, APERTO),
  n('ann', 7, 0, PIOGGIA_ANN, APERTO),
  n('ann', 9, 0, PIOGGIA_ANN, APERTO),
  n('ann', 10, 0, PIOGGIA_ANN, APERTO),
  // Chihaya
  g('chihaya', 1, 0, 'Completare la richiesta dei Mementos "Un fidanzato violento" prima di poter far salire il Rango Confidente'),
  g('chihaya', 1, 1, MAI_PIOGGIA),
  n('chihaya', 1, 2, 'Bisogna comprare da Chihaya la Pietra Sacra per 100.000 yen: senza l\'acquisto il Confidente non si sviluppa.', 'Costa 100.000 yen: senza l\'acquisto il Confidente non si sviluppa.'),
  g('chihaya', 2, 0, MAI_PIOGGIA),
  g('chihaya', 3, 0, MAI_PIOGGIA),
  g('chihaya', 4, 0, MAI_PIOGGIA),
  g('chihaya', 5, 0, MAI_PIOGGIA),
  g('chihaya', 6, 0, MAI_PIOGGIA),
  g('chihaya', 7, 0, MAI_PIOGGIA),
  n('chihaya', 8, 0, 'Completare la richiesta dei Mementos "Smascheriamo i ciarlatani" (sbloccata durante l\'evento intermedio di Rango 7.5) prima di avviare il Rango 8', 'La Richiesta si sblocca durante l\'evento intermedio di Rango 7.5.'),
  g('chihaya', 8, 1, MAI_PIOGGIA),
  g('chihaya', 9, 0, MAI_PIOGGIA),
  g('chihaya', 10, 0, MAI_PIOGGIA),
  // Futaba
  n('futaba', 1, 0, 'Disponibile dal 31 agosto: il confidente si sblocca quando Futaba invita il protagonista ad Akihabara dopo l\'incontro al Leblanc con Sojiro', 'Il Confidente si sblocca quando Futaba invita il protagonista ad Akihabara dopo l\'incontro al Leblanc con Sojiro.'),
  g('futaba', 1, 1, MAI_FUTABA),
  g('futaba', 2, 0, 'Gentilezza al rango 4 (Altruista)'),
  g('futaba', 2, 1, MAI_FUTABA),
  g('futaba', 3, 0, MAI_FUTABA),
  a('futaba', 4, 0, 'L\'evento del Rango 4 richiede che la scuola sia aperta: non è disponibile durante le chiusure scolastiche.'),
  g('futaba', 4, 1, MAI_FUTABA),
  g('futaba', 5, 0, MAI_FUTABA),
  g('futaba', 6, 0, MAI_FUTABA),
  g('futaba', 7, 0, MAI_FUTABA),
  n('futaba', 8, 0, 'Completare la richiesta dei Mementos "E una figlia o un buono pasto?" (sbloccata al rango 7)', 'La Richiesta si sblocca al Rango 7.'),
  g('futaba', 8, 1, MAI_FUTABA),
  g('futaba', 9, 0, MAI_FUTABA),
  g('futaba', 10, 0, MAI_FUTABA),
  // Gemelle
  n('gemelle', 1, 0, 'Disponibile dal 18 maggio, quando si ottiene l\'accesso alla Stanza di Velluto durante l\'infiltrazione del Palazzo di Madarame', 'Si ottiene l\'accesso alla Stanza di Velluto durante l\'infiltrazione del Palazzo di Madarame.'),
  n('gemelle', 1, 1, 'Consegnare alle Gemelle una Persona Jack Frost che conosca Mabufu.', CONSEGNA),
  n('gemelle', 2, 0, 'Consegnare alle Gemelle una Persona Ame-no-Uzume che conosca Frei.', CONSEGNA),
  n('gemelle', 3, 0, 'Consegnare alle Gemelle una Persona Flauros che conosca Tarukaja.', CONSEGNA),
  n('gemelle', 4, 0, 'Consegnare alle Gemelle una Persona Phoenix che conosca Counter.', CONSEGNA),
  n('gemelle', 5, 0, 'Consegnare alle Gemelle una Persona Setanta che conosca Rakukaja.', CONSEGNA),
  n('gemelle', 6, 0, 'Consegnare alle Gemelle una Persona Neko Shogun che conosca Dekaja.', CONSEGNA),
  n('gemelle', 7, 0, 'Consegnare alle Gemelle una Persona Lachesis che conosca Tetraja.', CONSEGNA),
  n('gemelle', 8, 0, 'Consegnare alle Gemelle una Persona Hecatoncheires che conosca Masukunda.', CONSEGNA),
  n('gemelle', 9, 0, 'Consegnare alle Gemelle una Persona Bugs che conosca Samarecarm.', CONSEGNA),
  n('gemelle', 10, 0, 'Consegnare alle Gemelle una Persona Seth che conosca High Counter.', CONSEGNA),
  // Haru
  g('haru', 1, 0, 'Disponibile dal 31 ottobre (sblocco del confidente)'),
  g('haru', 1, 1, MAI_PIOGGIA),
  g('haru', 2, 0, MAI_PIOGGIA),
  g('haru', 3, 0, MAI_PIOGGIA),
  g('haru', 4, 0, 'Perizia al rango massimo (Migliore)'),
  g('haru', 4, 1, MAI_PIOGGIA),
  g('haru', 5, 0, MAI_PIOGGIA),
  g('haru', 6, 0, MAI_PIOGGIA),
  g('haru', 7, 0, MAI_PIOGGIA),
  g('haru', 8, 0, MAI_PIOGGIA),
  g('haru', 9, 0, 'Non avviabile prima del 25 novembre'),
  g('haru', 9, 1, MAI_PIOGGIA),
  g('haru', 10, 0, MAI_PIOGGIA),
  // Hifumi
  g('hifumi', 1, 0, 'Disponibile dal 25 giugno'),
  g('hifumi', 1, 1, 'Fascino al rango 3 (Affascinante)'),
  g('hifumi', 4, 0, 'Non deve piovere'),
  g('hifumi', 6, 0, 'Non deve piovere'),
  g('hifumi', 8, 0, 'Conoscenza al rango 5 (Erudito)'),
  g('hifumi', 8, 1, 'Completare la richiesta "La mamma manager" nei Mementos'),
  // Igor
  n('igor', 1, 0, 'Dal 12 aprile: la sera, tornati a casa, il sogno nella Stanza di Velluto avvia il Confidente al rango 1 (soluzione settimana 1)', 'La sera, tornati a casa, il sogno nella Stanza di Velluto avvia il Confidente al Rango 1.'),
  n('igor', 2, 0, NON_PRIMA_TRAMA('20 aprile'), TRAMA_FISSA),
  n('igor', 3, 0, NON_PRIMA_TRAMA('5 maggio'), TRAMA_FISSA),
  g('igor', 4, 0, 'Aver sconfitto il boss finale del Palazzo di Madarame'),
  n('igor', 5, 0, 'Non prima dell\'11 giugno (evento di trama fissato)', TRAMA_FISSA),
  g('igor', 6, 0, 'Aver sconfitto il boss del Palazzo di Kaneshiro'),
  n('igor', 7, 0, NON_PRIMA_TRAMA('22 agosto'), TRAMA_FISSA),
  n('igor', 9, 0, 'Non prima dell\'11 ottobre (evento di trama fissato)', TRAMA_FISSA),
  n('igor', 10, 0, NON_PRIMA_TRAMA('24 dicembre'), TRAMA_FISSA),
  // Iwai
  g('iwai', 1, 0, 'Coraggio al rango 4 (Temerario)'),
  n('iwai', 4, 0, 'Non deve piovere: l\'evento del rango 4 si svolge all\'aperto', APERTO),
  n('iwai', 8, 0, 'Serve Coraggio al rango massimo per superare l\'evento intermedio che precede il rango 8.', 'Serve per superare l\'evento intermedio che precede il Rango 8.'),
  g('iwai', 8, 1, 'Aver completato la richiesta dei Mementos "Affari loschi nell\'ombra"'),
  n('iwai', 9, 0, 'Non deve piovere: l\'evento del rango 9 si svolge all\'aperto', APERTO),
  // Kasumi
  n('kasumi', 1, 0, 'Disponibile dal 30 maggio (evento automatico dell\'iniziativa scolastica di pulizia del parco)', 'Evento automatico dell\'iniziativa scolastica di pulizia del parco.'),
  g('kasumi', 6, 0, 'Non avviabile prima del 13 gennaio'),
  n('kasumi', 6, 1, 'Il limite dei cinque ranghi cade solo se il Confidente del Consigliere, Takuto Maruki, è stato sviluppato completamente.', 'Il limite dei cinque ranghi cade solo con il Consigliere sviluppato completamente.'),
  g('kasumi', 7, 0, 'Non avviabile prima del 14 gennaio'),
  g('kasumi', 8, 0, 'Non avviabile prima del 16 gennaio'),
  g('kasumi', 9, 0, 'Non avviabile prima del 18 gennaio'),
  // Kawakami
  n('kawakami', 1, 0, 'Confidente disponibile solo dopo l\'evento di sblocco: il 3 giugno parte l\'Operazione Guardia MAIDica, il 4 giugno si parla con Kawakami a scuola ottenendo i contatti', 'Disponibile solo dopo l\'evento di sblocco: il 3 giugno parte l\'Operazione Guardia MAIDica, il 4 giugno si parla con Kawakami a scuola ottenendo i contatti.'),
  n('kawakami', 1, 1, 'Coraggio al rango 3 (Coraggioso): senza questo livello non è possibile chiamare Kawakami', 'Senza questo livello non è possibile chiamare Kawakami.'),
  n('kawakami', 1, 2, 'Occorre pagare i 5.000 yen della chiamata al servizio di cameriere.', 'La chiamata al servizio di cameriere costa 5.000 yen.'),
  g('kawakami', 9, 0, 'Completare la richiesta dei Mementos "Le fatiche di una maid in cattedra"'),
  // Makoto
  g('makoto', 1, 0, 'Conoscenza al rango 3 (Studioso)'),
  n('makoto', 2, 0, 'Non deve piovere: l\'evento del rango 2 si svolge all\'aperto', APERTO),
  n('makoto', 6, 0, 'Fascino al rango massimo 5 (Irresistibile): senza di esso il Confidente resta bloccato al rango 5', 'Senza di esso il Confidente resta bloccato al Rango 5.'),
  n('makoto', 9, 0, 'Non deve piovere: l\'evento del rango 9 si svolge all\'aperto', APERTO),
  // Maruki
  n('maruki', 1, 0, 'Disponibile dal 13 maggio: il confidente si avvia automaticamente durante l\'assemblea scolastica in cui Maruki viene presentato come terapista della scuola.', 'Il Confidente si avvia automaticamente durante l\'assemblea scolastica in cui Maruki viene presentato come terapista della scuola.'),
  n('maruki', 3, 0, 'Non avviabile nei giorni di pioggia (incontro nell\'area dell\'Edificio Sportivo della Shujin Academy).', 'L\'incontro si svolge nell\'area dell\'Edificio Sportivo della Shujin Academy.'),
  n('maruki', 6, 0, 'Non avviabile prima del 20 settembre: con Maruki non si può superare il rango 5 fino a quella data.', 'Con Maruki non si può superare il Rango 5 fino a quella data.'),
  n('maruki', 10, 0, 'Si attiva automaticamente il 18 novembre, a condizione che l\'evento del rango 9 sia già stato completato.', 'Si attiva automaticamente in quella data, se l\'evento del Rango 9 è già stato completato.'),
  // Mishima
  n('mishima', 1, 0, 'Disponibile dal 6 maggio: e la data di sblocco del Confidente, quando Mishima viene a parlarci dopo uno scambio di messaggi con gli alleati', 'Mishima viene a parlarci dopo uno scambio di messaggi con gli alleati.'),
  n('mishima', 3, 0, 'Non deve piovere: l\'evento di rango 3 si svolge all\'aperto', APERTO),
  n('mishima', 6, 0, 'Non deve piovere: l\'evento di rango 6 si svolge all\'aperto (Parco Inokashira)', 'L\'evento si svolge all\'aperto, al Parco Inokashira.'),
  n('mishima', 7, 0, 'Non deve piovere: l\'evento di rango 7 si svolge all\'aperto (parco di Akihabara)', 'L\'evento si svolge all\'aperto, al parco di Akihabara.'),
  n('mishima', 8, 0, 'Non deve piovere: l\'evento di rango 8 si svolge all\'aperto', APERTO),
  n('mishima', 10, 0, 'Non deve piovere: l\'evento di rango 10 si svolge all\'aperto (parco)', 'L\'evento si svolge all\'aperto, al parco.'),
  // Morgana
  g('morgana', 1, 0, 'Disponibile dal 15 aprile (data di sblocco del Confidente)'),
  n('morgana', 2, 0, NON_PRIMA_SCATTA('22 aprile'), SCATTA),
  n('morgana', 3, 0, NON_PRIMA_SCATTA('1 giugno'), SCATTA),
  g('morgana', 3, 1, 'Sconfiggere il boss finale del Palazzo di Madarame'),
  n('morgana', 4, 0, NON_PRIMA_SCATTA('20 giugno'), SCATTA),
  n('morgana', 5, 0, NON_PRIMA_SCATTA('27 giugno'), SCATTA),
  n('morgana', 5, 1, 'Sconfiggere il boss del Palazzo di Kaneshiro, poi andare a dormire', 'Dopo il boss bisogna andare a dormire.'),
  n('morgana', 6, 0, NON_PRIMA_SCATTA('25 luglio'), SCATTA),
  n('morgana', 7, 0, NON_PRIMA_SCATTA('29 agosto'), SCATTA),
  n('morgana', 8, 0, NON_PRIMA_SCATTA('17 settembre'), SCATTA),
  n('morgana', 9, 0, NON_PRIMA_SCATTA('6 ottobre'), SCATTA),
  g('morgana', 9, 1, 'Superare il combattimento finale nel Palazzo di Okumura'),
  n('morgana', 10, 0, NON_PRIMA_SCATTA('23 dicembre'), SCATTA),
  // Ohya
  g('ohya', 1, 0, 'dal 5 luglio'),
  g('ohya', 4, 0, 'L\'evento di Rango 4 non è disponibile se piove: serve una giornata senza pioggia.'),
  n('ohya', 8, 0, 'Completare la richiesta dei Mementos "Lottare per la libertà di stampa" (sbloccata al Rango 7.5 chiedendo a Ohya il nome del suo capo, Shinpei Honjo).', 'La Richiesta si sblocca al Rango 7.5 chiedendo a Ohya il nome del suo capo, Shinpei Honjo.'),
  g('ohya', 10, 0, 'L\'evento di Rango 10 non è disponibile se piove: serve una giornata senza pioggia.'),
  // Ryuji
  n('ryuji', 1, 0, 'Disponibile dal 12 aprile: il Confidente si sblocca automaticamente durante la storia principale', 'Il Confidente si sblocca automaticamente durante la storia principale.'),
  n('ryuji', 2, 0, 'Non deve piovere: l\'evento di Rango 2 si svolge all\'aperto', APERTO),
  n('ryuji', 3, 0, 'Non deve piovere: l\'evento di Rango 3 si svolge all\'aperto', APERTO),
  g('ryuji', 3, 1, 'Aver completato il Palazzo di Kamoshida'),
  g('ryuji', 5, 0, 'Non avviabile prima del 6 maggio'),
  n('ryuji', 6, 0, 'Non deve piovere: l\'evento di Rango 6 si svolge all\'aperto', APERTO),
  n('ryuji', 8, 0, 'Non deve piovere: l\'evento di Rango 8 si svolge all\'aperto', APERTO),
  // Sae
  g('sae', 1, 0, 'Disponibile dal 9 luglio'),
  g('sae', 1, 1, 'Completare il Palazzo di Kaneshiro'),
  n('sae', 2, 0, NON_PRIMA_SAE('24 luglio'), TRAMA_AUTOMATICA),
  n('sae', 3, 0, NON_PRIMA_SAE('22 agosto'), TRAMA_AUTOMATICA),
  g('sae', 3, 1, 'Completare il Palazzo di Futaba'),
  n('sae', 4, 0, NON_PRIMA_SAE('13 settembre'), TRAMA_AUTOMATICA),
  n('sae', 5, 0, NON_PRIMA_SAE('12 ottobre'), TRAMA_AUTOMATICA),
  g('sae', 5, 1, 'Completare il Palazzo di Okumura'),
  n('sae', 6, 0, NON_PRIMA_SAE('28 ottobre'), TRAMA_AUTOMATICA),
  n('sae', 7, 0, NON_PRIMA_INTERROGATORIO, INTERROGATORIO),
  g('sae', 7, 1, COMPLETA_NIIJIMA),
  n('sae', 8, 0, NON_PRIMA_INTERROGATORIO, INTERROGATORIO),
  g('sae', 8, 1, COMPLETA_NIIJIMA),
  n('sae', 9, 0, NON_PRIMA_INTERROGATORIO, INTERROGATORIO),
  g('sae', 9, 1, COMPLETA_NIIJIMA),
  n('sae', 10, 0, NON_PRIMA_INTERROGATORIO, INTERROGATORIO),
  g('sae', 10, 1, COMPLETA_NIIJIMA),
  // Shinya
  g('shinya', 1, 0, 'Disponibile dal 5 settembre'),
  g('shinya', 1, 1, 'Prima visita a Nejima nei Memento (I vincenti non imbrogliano)'),
  n('shinya', 7, 0, APERTO_SHINYA, APERTO),
  n('shinya', 8, 0, APERTO_SHINYA, APERTO),
  g('shinya', 9, 0, 'Completare la richiesta dei Mementos "Una madre aggressiva"'),
  n('shinya', 9, 1, APERTO_SHINYA, APERTO),
  // Sojiro
  g('sojiro', 1, 0, 'Aver completato il Palazzo di Kamoshida'),
  g('sojiro', 3, 0, 'Aver preparato il caffè al Leblanc almeno una volta'),
  n('sojiro', 5, 0, 'Non disponibile prima del 22 agosto (scadenza del Palazzo di Futaba)', 'È la scadenza del Palazzo di Futaba.'),
  g('sojiro', 7, 0, 'Gentilezza al massimo (Rango 5 - Angelico)'),
  g('sojiro', 9, 0, 'Completare la richiesta dei Mementos "Lo zio ingordo"'),
  // Takemi
  g('takemi', 1, 0, 'dal 18 aprile'),
  g('takemi', 2, 0, 'Coraggio al rango 2 (Audace)'),
  g('takemi', 6, 0, 'L\'evento di rango 6 non è disponibile quando piove'),
  g('takemi', 8, 0, 'Fascino al rango 4 (Carismatico)'),
  n('takemi', 8, 1, 'Completare la richiesta dei Mementos "Medicina amara" (si sblocca durante l\'evento di rango 7.5)', 'La Richiesta si sblocca durante l\'evento di Rango 7.5.'),
  n('takemi', 8, 2, 'L’evento del rango 7.5 non è disponibile quando piove', 'L’evento del rango 7.5 non è disponibile quando piove'),
  g('takemi', 9, 0, 'L\'evento di rango 9 non è disponibile quando piove'),
  // Yoshida
  g('yoshida', 1, 0, MAI_YOSHIDA),
  n('yoshida', 1, 1, 'Sbloccare il Confidente parlando in Piazza della Stazione di Shibuya con l\'Oratore di strada (Yoshida)', 'Si sblocca parlando in Piazza della Stazione di Shibuya con l\'Oratore di strada.'),
  g('yoshida', 2, 0, MAI_YOSHIDA),
  g('yoshida', 3, 0, MAI_YOSHIDA),
  g('yoshida', 4, 0, MAI_YOSHIDA),
  g('yoshida', 5, 0, MAI_YOSHIDA),
  g('yoshida', 6, 0, MAI_YOSHIDA),
  g('yoshida', 7, 0, MAI_YOSHIDA),
  g('yoshida', 8, 0, MAI_YOSHIDA),
  g('yoshida', 9, 0, MAI_YOSHIDA),
  g('yoshida', 10, 0, MAI_YOSHIDA),
  // Yusuke (la «indicazione dell'utente» del rango 1 è una provenienza, non un'informazione per chi gioca: resta in archivio)
  g('yusuke', 1, 0, 'Rango 1: si sblocca a partire dal 18 giugno (indicazione dell\'utente, 2026-09-05).'),
  n('yusuke', 4, 0, 'Non deve piovere: l\'evento del Rango 4 si svolge all\'aperto (parco)', 'L\'evento si svolge all\'aperto, al parco.'),
  g('yusuke', 6, 0, 'Perizia al Rango 4 (Asso)'),
  n('yusuke', 6, 1, 'Non deve piovere: l\'evento del Rango 6 si svolge all\'aperto (vecchia casa di Madarame)', 'L\'evento si svolge all\'aperto, nella vecchia casa di Madarame.'),
  n('yusuke', 9, 0, 'Non deve piovere: l\'evento del Rango 9 si svolge all\'aperto', APERTO),
];

/** La sola riga di `confidente_requisito_guida` diversa dalla copia di lavoro (Hifumi rango 1: la guida dà il 28 giugno, la copia il 25), classificata a parte. */
export const ESITI_GUIDA_DIVERSI: readonly RigaEsito[] = [
  g('hifumi', 1, 0, 'Disponibile dal 28 giugno'),
];
