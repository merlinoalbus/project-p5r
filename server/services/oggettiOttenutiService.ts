// ============================================================
// oggettiOttenutiService — gli oggetti del catalogo ottenuti in una partita (L13, ondata 3, decisioni 1 e 3)
// ============================================================
//
// Il registro degli oggetti ottenuti ha due fonti, e una lettura sola (questa), che il giocatore vede in Partita → Squadra e denaro:
//   - le voci del Diario spuntate con l'effetto «oggetto ricevuto»: una riga per voce ed effetto (`utente.oggetto_ottenuto_partita`, scritta
//     dalla spunta e tolta togliendola, `effettiDiStatoService`);
//   - le Richieste completate (decisione 3: le ricompense di una Richiesta le applica solo la Richiesta completata): i suoi oggetti del catalogo
//     (`ricompensa_oggetto`, fonte «richiesta»), una volta sola per Richiesta, finché è completata nella partita; togliendo il completamento non
//     ci sono più. Si leggono dallo stato completato e non si copiano in un'altra tabella: un dato in un solo punto, nessuna copia da tenere
//     allineata quando la Richiesta si corregge, nessun doppio se la si completa da una voce e poi a mano;
//   - Ondata 5 (lotto G): i turni delle attività registrati con un esito che dà oggetti (la sfida della Big Bang Burger vinta: il distintivo e i
//     panini), una riga per oggetto del turno (`utente.oggetto_esito_turno`, scritta registrando il turno e tolta togliendolo,
//     `oggettiDegliEsitiService`).
//   - Ondata 5 (lotto F-bis): i doni dei Confidenti che la partita ha meritato, dal rango e dal giorno (`doniConfidenti`, regola scritta dalla
//     migrazione 295): letti dallo stato, come le Richieste, mai copiati.
// Le copie dello stesso oggetto si sommano nei totali. Ondata 5 (lotto F-bis): accanto, le copie USATE (`consumo_oggetto_partita`, utente 054:
// turni con un esito che consuma e incensi dell'Isolamento; 2026-10-28, utente 055: copie restituite o vendute da una voce), con la loro origine, e per ogni oggetto le cifre delle copie (comprate, regalate,
// cedute, rimaste) dalla stessa lettura della scelta dell'esito e di «Regala» (`dettaglioCopie`). Sola lettura: nessuna scrittura, anche nel rilascio.
// ============================================================

import { prepared } from '../db/dbService.js';
import { verificaPartita } from './verificaPartita.js';
import { catalogoOggettiDisponibile } from './catalogoOggettiLetture.js';
import { esitiDellAttivita } from './esitiAttivitaService.js';
import type { OggettiOttenutiDto, OggettoConsumatoDto, OggettoOttenutoDto } from '../../shared/types.js';
import { doniConfidentiOttenuti } from './doniConfidenti.js';
import { consumiDellaPartita } from './consumiOggettiService.js';
import { dettaglioCopie } from './copieOggetti.js';

/** Gli oggetti ottenuti nella partita: le righe per origine (in ordine di giorno, poi le Richieste) e i totali per oggetto. */
export function oggettiOttenutiPartita(partitaId: number): OggettiOttenutiDto {
  verificaPartita(partitaId);
  const catalogo = catalogoOggettiDisponibile();
  const nome = catalogo ? 'c.nome' : 'NULL';
  const categoria = catalogo ? 'c.categoria' : 'NULL';
  const unisciCatalogo = (colonna: string) => (catalogo ? `LEFT JOIN main.catalogo_oggetto c ON c.chiave = ${colonna}` : '');
  const daVoci = prepared(`SELECT o.catalogo_chiave, o.quantita, o.voce_uid, v.data, v.azione, ${nome} AS nome, ${categoria} AS categoria
    FROM utente.oggetto_ottenuto_partita o LEFT JOIN main.voce_giornata v ON v.uid = o.voce_uid ${unisciCatalogo('o.catalogo_chiave')}
    WHERE o.partita_id = ? ORDER BY v.data IS NULL, v.data, v.fascia = 'sera', v.ordine, o.creato_il, o.effetto_uid`).all(partitaId) as
    Array<{ catalogo_chiave: string; quantita: number; voce_uid: string; data: string | null; azione: string | null; nome: string | null; categoria: string | null }>;
  const daRichieste = catalogo ? prepared(`SELECT ro.catalogo_chiave, COALESCE(ro.quantita, 1) AS quantita, r.chiave, r.nome AS richiesta_nome, c.nome, c.categoria
    FROM utente.richiesta_partita rp JOIN main.richiesta r ON r.chiave = rp.richiesta_chiave
    JOIN main.ricompensa_oggetto ro ON ro.fonte_tipo = 'richiesta' AND ro.fonte_chiave = r.chiave ${unisciCatalogo('ro.catalogo_chiave')}
    WHERE rp.partita_id = ? AND rp.stato = 'completata' ORDER BY r.ordine, ro.ordine, ro.catalogo_chiave`).all(partitaId) as
    Array<{ catalogo_chiave: string; quantita: number; chiave: string; richiesta_nome: string; nome: string | null; categoria: string | null }> : [];
  // i turni con un esito che dà oggetti: il nome dell'attività e dell'esito si leggono da dove vivono (l'esito tolto dall'elenco resta con la chiave)
  const daTurni = prepared("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'oggetto_esito_turno'").get()
    ? prepared(`SELECT o.catalogo_chiave, o.quantita, o.attivita_chiave, o.ordine, o.esito_chiave, a.nome AS attivita_nome, ${nome} AS nome, ${categoria} AS categoria
      FROM utente.oggetto_esito_turno o LEFT JOIN main.attivita a ON a.chiave = o.attivita_chiave ${unisciCatalogo('o.catalogo_chiave')}
      WHERE o.partita_id = ? ORDER BY o.creato_il, o.attivita_chiave, o.ordine, o.catalogo_chiave`).all(partitaId) as
      Array<{ catalogo_chiave: string; quantita: number; attivita_chiave: string; ordine: number; esito_chiave: string; attivita_nome: string | null; nome: string | null; categoria: string | null }>
    : [];
  const nomeEsito = (attivita: string, esito: string): string => esitiDellAttivita(attivita)?.esiti?.esiti.find((e) => e.chiave === esito)?.nome ?? esito;
  // i doni dei Confidenti valutati una volta sola per tutta la lettura: le righe e le copie di ogni oggetto (revisione di O11-1, prestazioni)
  const doni = doniConfidentiOttenuti(partitaId);
  const righe: OggettoOttenutoDto[] = [
    ...daVoci.map((o): OggettoOttenutoDto => ({ catalogoChiave: o.catalogo_chiave, nome: o.nome ?? o.catalogo_chiave, categoria: o.categoria, quantita: o.quantita,
      origine: { tipo: 'voce', voceUid: o.voce_uid, giorno: o.data, testo: o.azione } })),
    ...daRichieste.map((o): OggettoOttenutoDto => ({ catalogoChiave: o.catalogo_chiave, nome: o.nome ?? o.catalogo_chiave, categoria: o.categoria, quantita: o.quantita,
      origine: { tipo: 'richiesta', chiave: o.chiave, nome: o.richiesta_nome } })),
    ...daTurni.map((o): OggettoOttenutoDto => ({ catalogoChiave: o.catalogo_chiave, nome: o.nome ?? o.catalogo_chiave, categoria: o.categoria, quantita: o.quantita,
      origine: { tipo: 'turno', attivita: o.attivita_chiave, attivitaNome: o.attivita_nome ?? o.attivita_chiave, ordine: o.ordine, esitoNome: nomeEsito(o.attivita_chiave, o.esito_chiave) } })),
    // Ondata 5 (lotto F-bis): i doni dei Confidenti meritati adesso (rango e giorno)
    ...doni.map((d): OggettoOttenutoDto => {
      const s = scheda(d.catalogo);
      return { catalogoChiave: d.catalogo, nome: s.nome, categoria: s.categoria, quantita: d.quantita, origine: { tipo: 'confidente', confidente: d.confidente, nome: nomeConfidente(d.confidente) } };
    }),
  ];
  const totali = new Map<string, OggettiOttenutiDto['totali'][number]>();
  for (const r of righe) {
    const t = totali.get(r.catalogoChiave);
    if (t) t.quantita += r.quantita;
    else totali.set(r.catalogoChiave, { catalogoChiave: r.catalogoChiave, nome: r.nome, categoria: r.categoria, quantita: r.quantita, consumate: 0 });
  }
  // Ondata 5 (lotto F-bis): le copie usate, con la loro origine; un oggetto usato che la partita non ha ricevuto (comprato: il concime, gli
  // incensi, i materiali) compare comunque nei totali. Un Isolamento si annulla da qui (l'uso di un turno si toglie togliendo il turno)
  // 2026-10-28: le copie restituite o vendute da una voce del Diario (utente 055), con il testo della voce; si annullano togliendo la spunta
  const voceDi = (uid: string | null): string | null => (uid ? (prepared('SELECT azione FROM main.voce_giornata WHERE uid = ?').pluck().get(uid) as string | undefined) ?? null : null);
  const origineConsumo = (c: ReturnType<typeof consumiDellaPartita>[number]): string => {
    if (c.fonte === 'isolamento') return 'Isolamento nella Stanza di Velluto';
    if (c.fonte === 'voce') { const v = voceDi(c.voceUid); const modo = c.modo === 'venduto' ? 'Venduto' : 'Restituito'; return v ? `${modo} · ${v.length > 80 ? `${v.slice(0, 79).trimEnd()}…` : v}` : modo; }
    return `${nomeAttivita(c.attivita!)} · ${nomeEsito(c.attivita!, c.esito!)}`;
  };
  const consumi: OggettoConsumatoDto[] = consumiDellaPartita(partitaId).map((c) => ({ id: c.id, catalogoChiave: c.catalogo, quantita: c.quantita, annullabile: c.fonte === 'isolamento',
    origine: origineConsumo(c) }));
  for (const c of consumi) {
    const t = totali.get(c.catalogoChiave);
    if (t) t.consumate += c.quantita;
    else { const s = scheda(c.catalogoChiave); totali.set(c.catalogoChiave, { catalogoChiave: c.catalogoChiave, nome: s.nome, categoria: s.categoria, quantita: 0, consumate: c.quantita }); }
  }
  // Rilievo della revisione (R2): le cifre di ogni oggetto vengono dalla stessa lettura delle copie della scelta dell'esito e di «Regala»
  // (`dettaglioCopie`): comprate, regalate, cedute negli scambi e quelle che restano; mai un «×0» accanto a una copia usata che si era comprata
  for (const t of totali.values()) {
    const d = dettaglioCopie(partitaId, t.catalogoChiave, doni);
    t.comprate = d.comprate; t.regalate = d.regalate; t.cedute = d.cedute; t.disponibili = d.disponibili;
  }
  return { righe, totali: [...totali.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'it')), consumi };
}

/** Nome e categoria di una scheda del catalogo (la chiave, se il catalogo non c'è o l'oggetto non c'è più). */
function scheda(chiave: string): { nome: string; categoria: string | null } {
  const r = catalogoOggettiDisponibile() ? prepared('SELECT nome, categoria FROM main.catalogo_oggetto WHERE chiave = ?').get(chiave) as { nome: string; categoria: string } | undefined : undefined;
  return { nome: r?.nome ?? chiave, categoria: r?.categoria ?? null };
}
const nomeConfidente = (chiave: string): string => (prepared('SELECT nome FROM main.confidente WHERE chiave = ?').pluck().get(chiave) as string | undefined) ?? chiave;
const nomeAttivita = (chiave: string): string => (prepared('SELECT nome FROM main.attivita WHERE chiave = ?').pluck().get(chiave) as string | undefined) ?? chiave;
