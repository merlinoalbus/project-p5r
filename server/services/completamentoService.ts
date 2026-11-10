// ============================================================
// completamentoService — trofei con stato per partita; finali, Covo dei Ladri, DLC, meteo, Nuova Partita+, gestione del tempo (Fase 9.1)
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { haTabellaUtente } from '../db/schemaMemo.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { registraEvento } from './storicoService.js';
import { datiGuidaCorretti, type Congelato } from './datiGuida.js';
import type { CompletamentoDto, ConteggioSfidaCovo, TrofeoDto } from '../../shared/types.js';
import { effettiDegliOggetti, effettoDellaFonte, ricompensePerFonte } from './catalogoOggettiLetture.js';
import { CONTATORI, condizioneConTesto, leggiCondizioniSalvate } from '../../shared/condizioniSpillo.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';
import { condizioniDellaGuida, fraseDelleCondizioni } from './condizioni/fraseCondizioni.js';
import { statoDisponibilitaPartita, type StatoDisponibilita } from './disponibilitaService.js';
import { giorniDiGiocoFra } from '../../shared/date.js';
import { RANGO_MASSIMO_CONFIDENTE } from '../../shared/puntiConfidenti.js';
import { registrazioniCompendio } from './fusione/fusioneService.js';
import { fattiPartita } from './cruciverbaService.js';
import { timbriRaccoltiInTutto } from './timbriService.js';

interface RigaTrofeo { chiave: string; ordine: number; nome: string; nome_en: string | null; tipo: TrofeoDto['tipo']; descrizione: string; come: string; mancabile: number | null; fonte: string; verificato: number;
  /** L13 (O7-4, migrazione 313): quando si ottiene, nel vocabolario unico delle condizioni; assente su uno schema di prima. */
  condizioni_json?: string | null }
type SeedCompletamento = Omit<CompletamentoDto, 'trofei' | 'ottenuti'>;

/** Un trofeo come DTO; `mancabile` resta null quando la guida non lo dice, `ottenuto` viene dall'insieme dato. «Quando» è la frase generata
 *  dalle condizioni (L13 O7-4: una sola fonte, nessuna assegnazione automatica: le condizioni non si valutano). */
const dto = (r: RigaTrofeo, ottenuti: Set<string>, nomi = nomiCondizioniMemo()): TrofeoDto => {
  const condizioni = leggiCondizioniSalvate(r.condizioni_json ?? null).map((c) => condizioneConTesto(c, nomi));
  return { chiave: r.chiave, nome: r.nome, nomeEn: r.nome_en, tipo: r.tipo, descrizione: r.descrizione, come: r.come, mancabile: r.mancabile === null ? null : r.mancabile === 1,
    quando: fraseDelleCondizioni(condizioni) ?? null, condizioni, fonte: r.fonte, verificato: r.verificato === 1, ottenuto: ottenuti.has(r.chiave) };
};

/** Le chiavi dei trofei ottenuti nella partita; insieme vuoto senza partita (con partita ne verifica l'esistenza). */
function ottenutiPartita(partitaId: number | undefined): Set<string> {
  if (partitaId === undefined) return new Set();
  verificaPartita(partitaId);
  return new Set((prepared('SELECT trofeo_chiave FROM trofeo_partita WHERE partita_id = ?').all(partitaId) as Array<{ trofeo_chiave: string }>).map((r) => r.trofeo_chiave));
}

/** Trofei (con ottenuti nella partita) e sezioni di consultazione della guida. */
export function completamento(partitaId?: number): Congelato<CompletamentoDto> {
  const seed = datiGuidaCorretti<SeedCompletamento>('completamento');
  if (!seed) throw httpErrors.notFound('completamento-non-disponibile', 'I dati di completamento non sono caricati.');
  const ottenuti = ottenutiPartita(partitaId);
  const nomi = nomiCondizioniMemo();
  const trofei = (prepared('SELECT * FROM trofeo ORDER BY ordine').all() as RigaTrofeo[]).map((r) => dto(r, ottenuti, nomi));
  const premi = ricompensePerFonte('covo');
  // ondata 5 (decisione 21 b, migrazione 258): la sfida che conta i regali dice a che punto è la partita chiesta; L8-03 (migrazione 340):
  // anche quelle che contano un altro stato della partita, letto dallo stesso stato delle condizioni (`statoDisponibilitaPartita`) o dalla
  // tabella che lo tiene; i totali «tutti» si contano nel DB a ogni lettura
  const st = partitaId === undefined || !seed.covo.sfide.some((s) => s.conteggio) ? null : statoDisponibilitaPartita(partitaId);
  const sfide = seed.covo.sfide.map((s) => {
    const p = s.conteggio && st && partitaId !== undefined ? progressoDelConteggio(s.conteggio, st, partitaId) : null;
    return p ? { ...s, progresso: { ...p, raggiunta: p.fatti >= p.obiettivo, unita: unitaDelConteggio(s.conteggio!) } } : s;
  });
  // con la partita, quanti giorni di gioco restano fino a `entro` (negativo se è passato): lo dice il server, l'interfaccia non ricalcola
  const oggi = partitaId === undefined ? null : (prepared('SELECT data_gioco FROM utente.partita WHERE id = ?').pluck().get(partitaId) as string | null | undefined) ?? null;
  const finali = seed.finali.map((f) => ({ ...f, requisiti: condizioniDellaGuida(f.condizioniJson, nomi),
    ...(oggi && f.entro ? { giorniAllEntro: giorniDiGiocoFra(oggi, f.entro) } : {}) }));
  // Ondata 5, lotto F (migrazione 279): il premio che è un oggetto del catalogo ne legge l'effetto dal catalogo, il suo punto unico; un testo
  // del premio (una correzione di prima: la finestra «Modifica» non lo offre più, `registro.ts`) non lo sostituisce
  const effetti = effettiDegliOggetti([...premi.values()].flat().map((o) => o.chiave));
  const covo = { ...seed.covo, sfide, premi: seed.covo.premi.map((p) => {
    const oggetti = premi.get(p.nome) ?? [];
    return { ...p, effetto: effettoDellaFonte(oggetti.length ? null : p.effetto, oggetti, effetti) || null, oggettiRicompensa: oggetti };
  }) };
  return { ...seed, finali, covo, trofei, ottenuti: trofei.filter((t) => t.ottenuto).length };
}

/** Che cosa conta una sfida del Covo, al singolare e al plurale, per la riga «3 di 15 volte in questa partita». */
function unitaDelConteggio(c: ConteggioSfidaCovo): { una: string; tante: string; prima?: string } {
  switch (c.tipo) {
    case 'regali-consegnati': return { una: 'regalo', tante: 'regali' };
    case 'attivita': case 'attivita-del-tipo': return { una: 'volta', tante: 'volte' };
    case 'contatore': {
      // il nome del contatore («Libri letti») dentro la frase: «9 di 40 libri letti in questa partita»
      const nome = CONTATORI.find((x) => x.chiave === c.contatore)?.nome ?? c.contatore;
      const minuscolo = nome.charAt(0).toLocaleLowerCase('it') + nome.slice(1);
      return { una: minuscolo, tante: minuscolo };
    }
    case 'confidenti-al-massimo': return c.quali === 'tutti' ? { una: 'Confidente al rango massimo', tante: 'Confidenti al rango massimo' }
      : c.quali === 'in-relazione' ? { una: 'Confidente romanzabile in relazione e al rango massimo', tante: 'Confidenti romanzabili in relazione e al rango massimo' }
        : { una: 'Confidente romanzabile al rango massimo senza relazione', tante: 'Confidenti romanzabili al rango massimo senza relazione' };
    case 'richieste-completate': return { una: 'Richiesta completata', tante: 'Richieste completate' };
    case 'compendio-registrato': return { una: 'Persona registrata nel Compendio (senza DLC)', tante: 'Persona registrate nel Compendio (senza DLC)' };
    case 'cruciverba-risolti': return { una: 'cruciverba risolto', tante: 'cruciverba risolti' };
    case 'timbri-raccolti': return { una: 'timbro', tante: 'timbri' };
    case 'spesa-negozio': return { una: `yen spesi in ${nomeDelNegozio(c.negozio)}`, tante: `yen spesi in ${nomeDelNegozio(c.negozio)}` };
    // si legge «Persona più alta: livello 23 di 99 in questa partita»: la parola va prima dei numeri
    case 'persona-livello': return { una: '', tante: '', prima: 'Persona più alta: livello' };
  }
}

const nomeDelNegozio = (chiave: string): string => (prepared('SELECT nome FROM negozio WHERE chiave = ?').pluck().get(chiave) as string | undefined) ?? chiave;

/** Vero se la tabella delle partite c'è (uno schema di prima non ce l'ha: il conteggio allora non si dice). */

/**
 * L8-03: a che punto è la partita in quello che la sfida conta, e l'obiettivo. I totali «tutti» si contano nel DB a ogni lettura, mai scritti:
 * le attività `videogioco` (lo stesso criterio del contatore `videogiochi-completati`, `disponibilitaService`), i Confidenti (tutti quelli del
 * DB, al rango massimo `RANGO_MASSIMO_CONFIDENTE`), le Richieste, le Persona del Compendio (`registrazioniCompendio`, la regola dello sconto
 * del Registro). Gli stati sono quelli che leggono le condizioni (`st`) o, dove le condizioni non li leggono, le letture dei servizi che li
 * tengono (cruciverba risolti `fattiPartita`, timbri `timbriRaccoltiInTutto`). Null se il conteggio non si sa dire.
 */
export function progressoDelConteggio(c: ConteggioSfidaCovo, st: StatoDisponibilita, partitaId: number): { fatti: number; obiettivo: number } | null {
  switch (c.tipo) {
    case 'regali-consegnati': return { fatti: regaliConsegnati(partitaId), obiettivo: c.obiettivo };
    case 'attivita': return { fatti: st.attivitaSvolte.get(c.attivita) ?? 0, obiettivo: c.obiettivo };
    case 'attivita-del-tipo': {
      const chiavi = prepared('SELECT chiave FROM attivita WHERE tipo = ?').pluck().all(c.tipoAttivita) as string[];
      return { fatti: chiavi.reduce((n, k) => n + (st.attivitaSvolte.get(k) ?? 0), 0), obiettivo: c.obiettivo };
    }
    case 'contatore': {
      const obiettivo = c.obiettivo ?? (c.contatore === 'videogiochi-completati' ? prepared("SELECT COUNT(*) FROM attivita WHERE tipo = 'videogioco'").pluck().get() as number : null);
      return obiettivo === null ? null : { fatti: st.contatori.get(c.contatore) ?? 0, obiettivo };
    }
    case 'confidenti-al-massimo': {
      // il rango massimo è uno per tutti (`RANGO_MASSIMO_CONFIDENTE`); «tutti» sono tutti i Confidenti del DB, senza esclusioni
      const righe = prepared('SELECT chiave, romanzabile FROM confidente ORDER BY ordine').all() as Array<{ chiave: string; romanzabile: number }>;
      const relazioni = st.relazioniRomantiche ?? new Map<string, string | null>();
      const contati = c.quali === 'tutti' ? righe : righe.filter((r) => r.romanzabile === 1);
      const fatti = contati.filter((r) => (st.ranghiConfidenti.get(r.chiave) ?? 0) >= RANGO_MASSIMO_CONFIDENTE
        && (c.quali === 'tutti' || (c.quali === 'in-relazione') === relazioni.has(r.chiave))).length;
      return { fatti, obiettivo: contati.length };
    }
    case 'richieste-completate': {
      const chiavi = prepared('SELECT chiave FROM richiesta').pluck().all() as string[];
      return { fatti: chiavi.filter((k) => st.richiesteCompletate.has(k)).length, obiettivo: chiavi.length };
    }
    case 'compendio-registrato': {
      // la stessa regola dello sconto del Registro (`registrazioniCompendio`: non DLC e non del gruppo)
      const r = registrazioniCompendio(partitaId);
      return { fatti: r.registrate, obiettivo: r.totale };
    }
    case 'cruciverba-risolti': return { fatti: fattiPartita(partitaId).size, obiettivo: c.obiettivo };
    // L10-02 (377): i timbri dei dedali con un totale, ciascuno entro il suo (le righe per dedalo della partita, utente 070)
    case 'timbri-raccolti': return { fatti: timbriRaccoltiInTutto(partitaId), obiettivo: c.obiettivo };
    case 'spesa-negozio': return { fatti: st.spesaPerNegozio.get(c.negozio) ?? 0, obiettivo: c.obiettivo };
    case 'persona-livello': {
      const fatti = !haTabellaUtente(getDb(), 'persona_posseduta') ? 0 : prepared('SELECT COALESCE(MAX(livello), 0) FROM utente.persona_posseduta WHERE partita_id = ?').pluck().get(partitaId) as number;
      return { fatti, obiettivo: c.obiettivo };
    }
  }
}

/** I regali della partita, tutti: la guida dice «almeno 10 regali totali ai Confidenti» e non esclude nessun regalo, quindi conta anche la
 *  Cartolina spedita (revisione dei lotti D e D2: escluderla era una regola senza fonte). */
function regaliConsegnati(partitaId: number): number {
  if (!haTabellaUtente(getDb(), 'regalo_partita')) return 0;
  return prepared('SELECT COUNT(*) FROM utente.regalo_partita WHERE partita_id = ?').pluck().get(partitaId) as number;
}

/** Segna (o toglie) un trofeo come ottenuto nella partita; evento alla prima spunta. */
export function impostaTrofeo(partitaId: number, chiave: string, ottenuto: boolean): TrofeoDto {
  verificaPartita(partitaId);
  const r = prepared('SELECT * FROM trofeo WHERE chiave = ?').get(chiave) as RigaTrofeo | undefined;
  if (!r) throw httpErrors.notFound('trofeo-non-trovato', `Il trofeo '${chiave}' non esiste.`);
  const adesso = nowIso();
  getDb().transaction(() => {
    const era = !!prepared('SELECT 1 FROM trofeo_partita WHERE partita_id = ? AND trofeo_chiave = ?').get(partitaId, chiave);
    if (ottenuto) prepared('INSERT INTO trofeo_partita (partita_id, trofeo_chiave, updated_at) VALUES (?, ?, ?) ON CONFLICT(partita_id, trofeo_chiave) DO UPDATE SET updated_at = excluded.updated_at').run(partitaId, chiave, adesso);
    else prepared('DELETE FROM trofeo_partita WHERE partita_id = ? AND trofeo_chiave = ?').run(partitaId, chiave);
    if (ottenuto && !era) registraEvento(partitaId, 'trofeo', `Trofeo ottenuto: ${r.nome}`, `${r.tipo.charAt(0).toUpperCase() + r.tipo.slice(1)} · ${r.descrizione}`, { trofeo: chiave });
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  return dto(r, new Set(ottenuto ? [chiave] : []));
}
