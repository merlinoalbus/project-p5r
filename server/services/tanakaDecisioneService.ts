// ============================================================
// tanakaDecisioneService — la decisione unitaria del listino di Tanaka (L7-TANAKA-TRANSAZIONE, RICEVUTA, RIPRISTINO)
// ============================================================
//
// Fonte: lotti/L7/tanaka-decisione-unitaria.md («Piano completo proposto») e il manifesto Royal `shared/tanakaConfronto.json` (G-034).
// Il piano è quello originale che il confronto mostra: delle 20 offerte correnti, 10 conservano la chiave e prendono i valori Royal
// (nome, categoria, prezzo, grado, oggetto del catalogo), 10 senza riscontro Royal si nascondono (mai cancellate); 8 offerte Royal sono
// nuove. Risultato: esattamente 18 offerte Royal attive. Nessuna riga di acquisto, Diario, Dote o yen cambia: la spesa storica è già
// congelata (utente 030) e le proposte 121 restano com'erano, superate dalla sola decisione confermata.
//
// - `anteprimaPianoTanaka`: il piano riga per riga, i blocchi e la revisione (CAS) su cui l'utente dà il consenso.
// - `confermaPianoTanaka`: il gesto dell'utente. Atomico: rilegge tutto nella transazione e, se una sola cosa è cambiata (offerte,
//   negozio, cataloghi, legami, fotografie, proposte, note, Cestino, dipendenze) o c'è un blocco, rifiuta il piano intero prima di
//   qualunque effetto. Idempotente per operationId: la stessa richiesta restituisce la ricevuta, una diversa con lo stesso id è 409.
// - `ricevuteTanaka`: le decisioni registrate con prima (archivio delle 20 identità precedenti), dopo, piano e stato.
// - `ripristinaPianoTanaka`: il ripristino unitario e conservativo; vale solo se le righe toccate sono ancora esattamente come le ha
//   lasciate la decisione, e se le offerte create non hanno legami, acquisti o effetti del Diario.
// Il consenso è sempre un gesto dell'utente: niente qui lo simula.
// ============================================================

import { createHash } from 'node:crypto';
import manifest from '../../shared/tanakaConfronto.json' with { type: 'json' };
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { jsonCanonico } from './propostePartitaService.js';
import { confrontoTanaka } from './tanakaSnapshotService.js';
import type { AnteprimaPianoTanakaDto, RicevutaTanakaDto, RigaPianoTanakaDto, ValoriOffertaTanaka } from '../../shared/tanakaDecisione.js';

type Riga = Record<string, unknown>;
const sha = (v: unknown): string => createHash('sha256').update(jsonCanonico(v)).digest('hex');
const chiaviCorrenti: readonly string[] = manifest.chiaviCorrenti;
const royalPerChiave = new Map(manifest.royal.map((r) => [r.chiave, r]));
const tutteLeChiavi = [...new Set([...chiaviCorrenti, ...manifest.royal.map((r) => r.chiave)])].sort();
/** Il rilievo del confronto per un'offerta che non c'è (`tanakaSnapshotService`): per le offerte da creare è l'atteso. */
const ASSENZA_ATTESA = 'Offerta assente: nessuna ricreazione automatica.';

/** Vero se il registro c'è (uno schema di prima della 150 non può registrare una decisione). */
function conRegistro(): boolean {
  return !!prepared("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'decisione_tanaka'").get();
}
/** Vero se la tabella c'è nello schema indicato. */
const tabella = (schema: 'main' | 'utente', nome: string): boolean => !!prepared(`SELECT 1 FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(nome);
const segnaposti = (n: number) => Array.from({ length: n }, () => '?').join(',');

/**
 * La fotografia integrale di tutto ciò che il piano tocca o da cui dipende, letta nella transazione: le 28 chiavi di offerta (anche
 * assenti), i legami delle offerte, il negozio, gli oggetti del catalogo citati (Royal e correnti), le proposte pertinenti in ogni stato,
 * le note storiche legate, le voci del Cestino del negozio e gli effetti del Diario che citano le offerte. Nessun dato delle partite.
 */
function fotografia(): Riga {
  const offerte = Object.fromEntries(tutteLeChiavi.map((k) => [k, (prepared('SELECT * FROM articolo WHERE chiave = ?').get(k) as Riga | undefined) ?? null]));
  const legami = prepared(`SELECT * FROM ricompensa_oggetto WHERE fonte_tipo = 'articolo' AND fonte_chiave IN (${segnaposti(tutteLeChiavi.length)}) ORDER BY fonte_chiave, catalogo_chiave`).all(...tutteLeChiavi);
  const negozio = (prepared('SELECT * FROM negozio WHERE chiave = ?').get(manifest.negozio) as Riga | undefined) ?? null;
  const cataloghiCitati = [...new Set([...manifest.royal.map((r) => r.catalogo), ...Object.values(offerte).flatMap((o) => (o && typeof o.catalogo_chiave === 'string' ? [o.catalogo_chiave] : []))])].sort();
  const cataloghi = Object.fromEntries(cataloghiCitati.map((k) => [k, (prepared('SELECT * FROM catalogo_oggetto WHERE chiave = ?').get(k) as Riga | undefined) ?? null]));
  const ricompense = tutteLeChiavi.map((k) => `articolo/${k}`);
  const proposte = tabella('main', 'proposta_abbinamento') ? prepared(`SELECT * FROM proposta_abbinamento WHERE (riga_tipo = 'articolo' AND riga_chiave IN (${segnaposti(tutteLeChiavi.length)}))
    OR (riga_tipo = 'ricompensa' AND riga_chiave IN (${segnaposti(ricompense.length)})) ORDER BY riga_tipo, riga_chiave, gruppo, catalogo_chiave`).all(...tutteLeChiavi, ...ricompense) : [];
  const note = tabella('main', 'nota_storica_legame') ? prepared(`SELECT n.*, l.tipo AS legame_tipo, l.chiave AS legame_chiave FROM nota_storica n JOIN nota_storica_legame l ON l.nota_chiave = n.chiave
    WHERE (l.tipo = 'articolo' AND l.chiave IN (${segnaposti(tutteLeChiavi.length)})) OR (l.tipo = 'catalogo' AND l.chiave IN (${segnaposti(cataloghiCitati.length || 1)})) ORDER BY n.chiave, l.tipo, l.chiave`)
    .all(...tutteLeChiavi, ...(cataloghiCitati.length ? cataloghiCitati : [''])) : [];
  const cestino = tabella('main', 'cestino') ? prepared("SELECT id, uid, tipo, chiave, eliminato_il FROM cestino WHERE (tipo = 'negozio' AND chiave = ?) OR (tipo = 'luogo' AND chiave = ?) ORDER BY id")
    .all(manifest.negozio, String(negozio?.sede_chiave ?? '')) : [];
  const diario = tabella('main', 'voce_effetto') ? prepared(`SELECT uid, voce_uid, tipo, chiave, dati_json FROM voce_effetto WHERE tipo = 'acquisto' AND chiave IN (${segnaposti(tutteLeChiavi.length)}) ORDER BY uid`).all(...tutteLeChiavi) : [];
  return { offerte, legami, negozio, cataloghi, proposte, note, cestino, diario };
}

/** I valori di un'offerta che il piano confronta e scrive. */
function valori(r: Riga | null): ValoriOffertaTanaka | null {
  if (!r) return null;
  return { nome: String(r.nome_it ?? r.nome ?? ''), categoria: String(r.categoria ?? ''), prezzo: typeof r.prezzo === 'number' ? r.prezzo : null,
    condizioniJson: typeof r.condizioni_json === 'string' ? r.condizioni_json : null, catalogo: typeof r.catalogo_chiave === 'string' ? r.catalogo_chiave : null, nascosto: r.nascosto === 1 };
}
/** I valori Royal di un'offerta (manifesto G-034): attiva, con l'oggetto e la categoria del catalogo e il grado come condizione. */
function valoriRoyal(r: (typeof manifest.royal)[number], condizioni: unknown[]): ValoriOffertaTanaka {
  return { nome: r.nome, categoria: r.catalogo.split('/')[0]!, prezzo: r.prezzo, condizioniJson: JSON.stringify(condizioni), catalogo: r.catalogo, nascosto: false };
}

/** Il piano letto adesso: righe, blocchi, conteggi e revisione. Da chiamare dentro una transazione. */
function calcolaPiano(): AnteprimaPianoTanakaDto {
  const confronto = confrontoTanaka();
  const foto = fotografia();
  const offerte = foto.offerte as Record<string, Riga | null>;
  const condizioniRoyal = new Map(confronto.royal.map((r) => [r.chiave, r.condizioni]));
  const righe: RigaPianoTanakaDto[] = [];
  for (const k of chiaviCorrenti) {
    const r = royalPerChiave.get(k);
    const prima = valori(offerte[k] ?? null);
    righe.push(r
      ? { chiave: k, destinazione: 'aggiorna', rapporto: r.rapporto, prima, dopo: valoriRoyal(r, condizioniRoyal.get(k) ?? []) }
      : { chiave: k, destinazione: 'nascondi', rapporto: 'Nessun riscontro nel listino Royal: offerta nascosta, conservata nell’archivio', prima, dopo: prima ? { ...prima, nascosto: true } : null });
  }
  for (const r of manifest.royal) if (!chiaviCorrenti.includes(r.chiave)) {
    righe.push({ chiave: r.chiave, destinazione: 'crea', rapporto: r.rapporto, prima: valori(offerte[r.chiave] ?? null), dopo: valoriRoyal(r, condizioniRoyal.get(r.chiave) ?? []) });
  }
  const blocchi: string[] = [];
  if (!conRegistro()) blocchi.push('Il registro delle decisioni (migrazione 150) non c’è in questo file di gioco.');
  if (!confronto.negozio) blocchi.push('Il negozio di Tanaka non c’è: nessuna ricreazione automatica.');
  // per le 8 offerte da creare l'assenza è l'atteso, non un blocco (il confronto la segnala perché non le ricrea da sé)
  const daCreare = new Set(manifest.royal.filter((r) => !chiaviCorrenti.includes(r.chiave)).map((r) => r.chiave));
  const atteso = (chiave: string, v: string) => daCreare.has(chiave) && v === ASSENZA_ATTESA;
  for (const o of confronto.offerte) for (const v of o.rilievi) if (!atteso(o.chiave, v)) blocchi.push(`${o.chiave}: ${v}`);
  for (const r of confronto.royal) for (const v of r.rilievi) if (!atteso(r.chiave, v)) blocchi.push(`${r.chiave} (Royal): ${v}`);
  for (const r of righe) {
    if (r.destinazione !== 'crea' && !r.prima) blocchi.push(`${r.chiave}: offerta corrente assente.`);
    if (r.destinazione === 'crea' && r.prima) blocchi.push(`${r.chiave}: la chiave della nuova offerta è già occupata; nessun suffisso viene scelto in automatico.`);
  }
  for (const k of new Set(confronto.royal.map((r) => r.catalogo))) if (!(foto.cataloghi as Record<string, Riga | null>)[k]) blocchi.push(`${k}: identità del catalogo assente.`);
  const attiva = conRegistro() ? decisioneAttiva() : null;
  if (attiva) blocchi.push(`La decisione ${attiva} è già applicata: per rifarla, prima ripristinala.`);
  const conteggi = {
    correnti: chiaviCorrenti.length, royal: manifest.royal.length,
    aggiorna: righe.filter((r) => r.destinazione === 'aggiorna').length, crea: righe.filter((r) => r.destinazione === 'crea').length,
    nascondi: righe.filter((r) => r.destinazione === 'nascondi').length,
  };
  const attiveDopo = conteggi.aggiorna + conteggi.crea;
  if (attiveDopo !== manifest.royal.length) blocchi.push(`Il piano lascerebbe ${attiveDopo} offerte attive invece di ${manifest.royal.length}.`);
  const revisionePiano = sha({ versione: 1, confronto: confronto.revisione, foto, righe });
  return { versione: 1, negozio: manifest.negozio, fonte: manifest.fonte, revisioneConfronto: confronto.revisione, revisionePiano, righe,
    conteggi: { ...conteggi, attiveDopo }, blocchi, applicabile: blocchi.length === 0, decisioneAttiva: attiva,
    noteStoriche: (foto.note as Riga[]).map((n) => ({ id: String(n.chiave), testo: String(n.testo), fonte: String(n.fonte), legame: `${String(n.legame_tipo)}:${String(n.legame_chiave)}` })) };
}

/** L'operazione della decisione attiva (confermata e non ripristinata), o null. */
function decisioneAttiva(): string | null {
  return (prepared('SELECT d.operazione_id FROM decisione_tanaka d LEFT JOIN decisione_tanaka_ripristino r ON r.decisione_id = d.operazione_id WHERE r.operazione_id IS NULL ORDER BY d.confermata_il DESC LIMIT 1')
    .get() as { operazione_id: string } | undefined)?.operazione_id ?? null;
}

/** L'anteprima del piano: righe con la destinazione, blocchi, conteggi e la revisione su cui dare il consenso. Sola lettura. */
export function anteprimaPianoTanaka(): AnteprimaPianoTanakaDto {
  return getDb().transaction(() => calcolaPiano())();
}

const identificativo = /^[A-Za-z0-9._:-]{8,80}$/;

/**
 * La conferma dell'utente. Tutto o niente: se la revisione del confronto o del piano non è quella mostrata, o c'è un blocco, 409 e nessun
 * effetto. Con lo stesso operationId e la stessa richiesta restituisce la ricevuta già registrata; con una richiesta diversa, 409.
 */
export function confermaPianoTanaka(r: { operazioneId: string; revisioneConfronto: string; revisionePiano: string }): RicevutaTanakaDto {
  if (!identificativo.test(r.operazioneId)) throw httpErrors.badRequest('operazione-non-valida', 'Identificativo dell’operazione non valido.');
  const id = getDb().transaction(() => {
    if (!conRegistro()) throw httpErrors.conflict('registro-tanaka-assente', 'Il registro delle decisioni Tanaka non c’è in questo file di gioco.');
    const gia = prepared('SELECT revisione_confronto, revisione_piano FROM decisione_tanaka WHERE operazione_id = ?').get(r.operazioneId) as { revisione_confronto: string; revisione_piano: string } | undefined;
    if (gia) {
      if (gia.revisione_confronto !== r.revisioneConfronto || gia.revisione_piano !== r.revisionePiano) throw httpErrors.conflict('operazione-diversa', 'Questo identificativo appartiene a un’altra decisione.');
      return r.operazioneId; // ripetizione della stessa conferma: nessun nuovo effetto
    }
    const piano = calcolaPiano();
    if (piano.revisioneConfronto !== r.revisioneConfronto || piano.revisionePiano !== r.revisionePiano) {
      throw httpErrors.conflict('piano-tanaka-cambiato', 'Il listino, le proposte o i dati collegati sono cambiati dall’anteprima: rileggi il piano. Nessuna offerta è stata modificata.');
    }
    if (!piano.applicabile) throw httpErrors.conflict('piano-tanaka-bloccato', 'Il piano non è applicabile: nessuna offerta è stata modificata.', { blocchi: piano.blocchi });
    const prima = fotografia();
    const adesso = nowIso();
    const offerte = prima.offerte as Record<string, Riga | null>;
    let ordine = (prepared('SELECT COALESCE(MAX(ordine), -1) + 1 AS n FROM articolo WHERE negozio_chiave = ?').get(manifest.negozio) as { n: number }).n;
    for (const riga of piano.righe) {
      const d = riga.dopo!;
      if (riga.destinazione === 'aggiorna') {
        const n = prepared(`UPDATE articolo SET nome = ?, nome_it = NULL, categoria = ?, prezzo = ?, condizioni_json = ?, catalogo_chiave = ?, nascosto = 0, origine = 'utente', updated_at = ?
          WHERE chiave = ? AND negozio_chiave = ? AND updated_at IS ?`).run(d.nome, d.categoria, d.prezzo, d.condizioniJson, d.catalogo, adesso, riga.chiave, manifest.negozio, offerte[riga.chiave]!.updated_at ?? null).changes;
        if (n !== 1) throw httpErrors.conflict('piano-tanaka-cambiato', `${riga.chiave}: l’offerta è cambiata durante la conferma. Nessuna offerta è stata modificata.`);
      } else if (riga.destinazione === 'nascondi') {
        const n = prepared("UPDATE articolo SET nascosto = 1, origine = 'utente', updated_at = ? WHERE chiave = ? AND negozio_chiave = ? AND updated_at IS ?")
          .run(adesso, riga.chiave, manifest.negozio, offerte[riga.chiave]!.updated_at ?? null).changes;
        if (n !== 1) throw httpErrors.conflict('piano-tanaka-cambiato', `${riga.chiave}: l’offerta è cambiata durante la conferma. Nessuna offerta è stata modificata.`);
      } else {
        prepared(`INSERT INTO articolo (chiave, negozio_chiave, ordine, nome, categoria, prezzo, condizioni_json, catalogo_chiave, fonte, origine, nascosto, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'utente', 0, ?)`).run(riga.chiave, manifest.negozio, ordine++, d.nome, d.categoria, d.prezzo, d.condizioniJson, d.catalogo, manifest.fonte, adesso);
      }
    }
    const attive = (prepared('SELECT COUNT(*) AS n FROM articolo WHERE negozio_chiave = ? AND nascosto = 0').get(manifest.negozio) as { n: number }).n;
    if (attive !== manifest.royal.length) throw httpErrors.conflict('piano-tanaka-esito', `Dopo il piano le offerte attive sarebbero ${attive}, non ${manifest.royal.length}: nessuna offerta è stata modificata.`);
    const dopo = fotografia();
    prepared(`INSERT INTO decisione_tanaka (operazione_id, versione, negozio_chiave, revisione_confronto, revisione_piano, piano_json, prima_json, dopo_json, confermata_il)
      VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)`).run(r.operazioneId, manifest.negozio, r.revisioneConfronto, r.revisionePiano, jsonCanonico(piano), jsonCanonico(prima), jsonCanonico(dopo), adesso);
    return r.operazioneId;
  })();
  invalidaCacheDiGioco();
  return ricevuta(id);
}

/** La ricevuta di una decisione: piano mostrato, archivio delle offerte di prima, fotografia di dopo, stato e ripristino. 404 se non c'è. */
export function ricevuta(operazioneId: string): RicevutaTanakaDto {
  const d = conRegistro() ? prepared('SELECT * FROM decisione_tanaka WHERE operazione_id = ?').get(operazioneId) as Riga | undefined : undefined;
  if (!d) throw httpErrors.notFound('decisione-tanaka-non-trovata', 'Decisione Tanaka non trovata.');
  const rip = prepared('SELECT * FROM decisione_tanaka_ripristino WHERE decisione_id = ?').get(operazioneId) as Riga | undefined;
  const prima = JSON.parse(String(d.prima_json)) as Riga;
  return {
    operazioneId, versione: 1, negozio: String(d.negozio_chiave), confermataIl: String(d.confermata_il),
    revisioneConfronto: String(d.revisione_confronto), revisionePiano: String(d.revisione_piano),
    piano: JSON.parse(String(d.piano_json)) as AnteprimaPianoTanakaDto,
    archivio: chiaviCorrenti.map((k) => ({ chiave: k, riga: ((prima.offerte as Record<string, Riga | null>)[k]) ?? null })),
    dopo: JSON.parse(String(d.dopo_json)) as Riga,
    stato: rip ? 'ripristinata' : 'attiva',
    ripristino: rip ? { operazioneId: String(rip.operazione_id), ripristinataIl: String(rip.ripristinata_il) } : null,
    revisioneStato: sha({ decisione: operazioneId, foto: fotografia(), ripristino: rip?.operazione_id ?? null }),
  };
}

/** Le decisioni registrate, dalla più recente: una sola può essere attiva. */
export function ricevuteTanaka(): RicevutaTanakaDto[] {
  if (!conRegistro()) return [];
  return (prepared('SELECT operazione_id FROM decisione_tanaka ORDER BY confermata_il DESC').all() as Array<{ operazione_id: string }>).map((r) => ricevuta(r.operazione_id));
}

/**
 * Il ripristino unitario. Conservativo: le 28 righe devono essere ancora esattamente quelle lasciate dalla decisione (nessuna correzione
 * fatta dopo viene sovrascritta), e le offerte create non devono avere legami, acquisti nelle partite o effetti del Diario. Poi le offerte
 * di prima tornano integralmente (archivio) e le create si tolgono. Idempotente per operationId.
 */
export function ripristinaPianoTanaka(r: { operazioneId: string; decisioneId: string; revisioneStato: string }): RicevutaTanakaDto {
  if (!identificativo.test(r.operazioneId)) throw httpErrors.badRequest('operazione-non-valida', 'Identificativo dell’operazione non valido.');
  getDb().transaction(() => {
    if (!conRegistro()) throw httpErrors.conflict('registro-tanaka-assente', 'Il registro delle decisioni Tanaka non c’è in questo file di gioco.');
    const gia = prepared('SELECT decisione_id FROM decisione_tanaka_ripristino WHERE operazione_id = ?').get(r.operazioneId) as { decisione_id: string } | undefined;
    if (gia) { if (gia.decisione_id !== r.decisioneId) throw httpErrors.conflict('operazione-diversa', 'Questo identificativo appartiene a un altro ripristino.'); return; }
    const d = prepared('SELECT * FROM decisione_tanaka WHERE operazione_id = ?').get(r.decisioneId) as Riga | undefined;
    if (!d) throw httpErrors.notFound('decisione-tanaka-non-trovata', 'Decisione Tanaka non trovata.');
    if (prepared('SELECT 1 FROM decisione_tanaka_ripristino WHERE decisione_id = ?').get(r.decisioneId)) throw httpErrors.conflict('decisione-gia-ripristinata', 'Questa decisione è già stata ripristinata.');
    if (ricevuta(r.decisioneId).revisioneStato !== r.revisioneStato) throw httpErrors.conflict('stato-tanaka-cambiato', 'Il listino è cambiato dalla lettura della ricevuta: rileggila. Nessuna offerta è stata modificata.');
    const prima = JSON.parse(String(d.prima_json)) as { offerte: Record<string, Riga | null> };
    const dopoAtteso = JSON.parse(String(d.dopo_json)) as { offerte: Record<string, Riga | null> };
    const ora = fotografia();
    const offerteOra = ora.offerte as Record<string, Riga | null>;
    const diverse = tutteLeChiavi.filter((k) => jsonCanonico(offerteOra[k] ?? null) !== jsonCanonico(dopoAtteso.offerte[k] ?? null));
    if (diverse.length) throw httpErrors.conflict('ripristino-tanaka-conflitto', 'Alcune offerte sono state corrette dopo la decisione: il ripristino non le sovrascrive.', { offerte: diverse });
    const create = tutteLeChiavi.filter((k) => !prima.offerte[k] && dopoAtteso.offerte[k]);
    const uso: string[] = [];
    for (const k of create) {
      if (prepared("SELECT 1 FROM ricompensa_oggetto WHERE fonte_tipo = 'articolo' AND fonte_chiave = ?").get(k)) uso.push(`${k}: ha risultati collegati`);
      if (tabella('main', 'voce_effetto') && prepared("SELECT 1 FROM voce_effetto WHERE tipo = 'acquisto' AND chiave = ?").get(k)) uso.push(`${k}: è citata da un effetto del Diario`);
      for (const t of ['acquisto_partita', 'acquisto_registrato']) if (tabella('utente', t) && prepared(`SELECT 1 FROM utente.${t} WHERE articolo_chiave = ?`).get(k)) uso.push(`${k}: ha acquisti in una partita`);
    }
    if (uso.length) throw httpErrors.conflict('ripristino-tanaka-in-uso', 'Le nuove offerte sono già usate: il ripristino non toglie dati collegati.', { usi: uso });
    for (const k of tutteLeChiavi) {
      const p = prima.offerte[k];
      if (p) {
        const colonne = Object.keys(p).filter((c) => c !== 'chiave');
        prepared(`UPDATE articolo SET ${colonne.map((c) => `${c} = ?`).join(', ')} WHERE chiave = ?`).run(...colonne.map((c) => p[c] as never), k);
      } else if (dopoAtteso.offerte[k]) prepared('DELETE FROM articolo WHERE chiave = ?').run(k);
    }
    prepared('INSERT INTO decisione_tanaka_ripristino (operazione_id, decisione_id, prima_json, ripristinata_il) VALUES (?, ?, ?, ?)').run(r.operazioneId, r.decisioneId, jsonCanonico(ora), nowIso());
  })();
  invalidaCacheDiGioco();
  return ricevuta(r.decisioneId);
}
