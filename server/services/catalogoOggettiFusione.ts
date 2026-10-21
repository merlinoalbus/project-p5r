// Una fusione esplicita è reversibile dal cestino, comprese le associazioni e i riferimenti delle partite.
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { conCestino } from './cestinoService.js';
import { nomiAltriOggetto, rigaOggetto } from './catalogoOggettiLetture.js';
import { normalizzaCostoScambio, normalizzaNomeOggetto } from '../../shared/catalogo.js';
import { rettificaPropostaOggetto } from '../schemas/catalogoOggetti.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { isDeepStrictEqual } from 'node:util';
import { trasferisciFontiCatalogo, verificaFontiLetturaFusione } from './catalogoOggettiRiferimenti.js';
import { fontiPropostePrimaDellaFusione, invalidaSnapshotDopoFusione } from './snapshotProposteOggetti.js';

type Riga = Record<string, unknown>;
const LETTURE = new Set(['libro', 'film', 'videogioco']);

function trasferisciContenuti(da: string, a: string): void {
  const profili = [
    { tabella: 'voce_oggetto', chiavi: ['voce_chiave'], campi: ['voce_chiave', 'quantita', 'ordine', 'nota'] },
    { tabella: 'ricompensa_oggetto', chiavi: ['fonte_tipo', 'fonte_chiave'], campi: ['fonte_tipo', 'fonte_chiave', 'quantita', 'ordine', 'nota'] },
    { tabella: 'ricetta_materiale', chiavi: ['ricetta'], campi: ['ricetta', 'quantita'] },
  ];
  for (const p of profili) {
    const righe = prepared(`SELECT * FROM ${p.tabella} WHERE catalogo_chiave = ?`).all(da) as Riga[];
    const dove = p.chiavi.map((c) => `${c} = ?`).join(' AND ');
    for (const r of righe) {
      const valoriChiave = p.chiavi.map((c) => r[c]);
      const esistente = prepared(`SELECT * FROM ${p.tabella} WHERE catalogo_chiave = ? AND ${dove}`).get(a, ...valoriChiave) as Riga | undefined;
      if (esistente) {
        if (p.tabella === 'ricompensa_oggetto' && r.fonte_tipo === 'articolo' && r.nota !== esistente.nota) {
          throw httpErrors.conflict('fusione-risultati-alternativi', 'Il baratto distingue risultati con note diverse: sistemali dal listino prima di fondere le identità.');
        }
        if (esistente.quantita !== r.quantita) throw httpErrors.conflict('fusione-quantita-diverse',
          'Le due identità hanno quantità diverse nello stesso contenuto o materiale. Correggi il legame prima della fusione; nessun dato è stato cambiato.',
          { tabella: p.tabella, fonte: valoriChiave.join(' / '), prima: r.quantita, altra: esistente.quantita });
        // I due nomi descrivevano lo stesso contenuto: non si raddoppia la quantità. Le due note restano.
        if (p.campi.includes('nota') && r.nota && r.nota !== esistente.nota) {
          const nota = [...new Set([esistente.nota, r.nota].filter((n): n is string => typeof n === 'string' && n.length > 0))].join('\n');
          prepared(`UPDATE ${p.tabella} SET nota = ? WHERE catalogo_chiave = ? AND ${dove}`).run(nota, a, ...valoriChiave);
        }
      } else prepared(`INSERT INTO ${p.tabella}(catalogo_chiave,${p.campi.join(',')}) VALUES (?,${p.campi.map(() => '?').join(',')})`)
        .run(a, ...p.campi.map((c) => r[c]));
      prepared(`DELETE FROM ${p.tabella} WHERE catalogo_chiave = ? AND ${dove}`).run(da, ...valoriChiave);
    }
  }
}

function trasferisciCosti(da: string, a: string): void {
  for (const r of prepared('SELECT chiave,costo_json FROM articolo WHERE costo_json IS NOT NULL').all() as Array<{ chiave: string; costo_json: string }>) {
    const citaOrigine = r.costo_json.includes(JSON.stringify(da));
    let costo: unknown;
    try { costo = JSON.parse(r.costo_json) as unknown; } catch {
      if (citaOrigine) throw httpErrors.conflict('fusione-costo-non-leggibile', 'Uno scambio che cita l’oggetto non è leggibile: nessun dato è stato cambiato.');
      continue;
    }
    const c = costo && typeof costo === 'object' && !Array.isArray(costo) ? costo as Record<string, unknown> : null;
    if (c?.tipo !== 'oggetti' || !Array.isArray(c.oggetti)) {
      if (citaOrigine) throw httpErrors.conflict('fusione-costo-non-valido', 'Uno scambio cita l’oggetto in una struttura non valida. Correggilo prima di fondere; nessun dato è stato cambiato.');
      continue;
    }
    if (!c.oggetti.some((v: unknown) => v && typeof v === 'object' && (v as Riga).chiave === da)) continue;
    const uniti = new Map<string, number>();
    for (const valore of c.oggetti as unknown[]) {
      const v = valore && typeof valore === 'object' ? valore as Riga : {};
      if (typeof v.chiave !== 'string' || typeof v.quantita !== 'number' || !Number.isSafeInteger(v.quantita) || v.quantita < 1) {
        throw httpErrors.conflict('fusione-costo-non-valido', 'Uno scambio che cita l’oggetto ha un costo non valido. Correggilo prima di fondere; nessun dato è stato cambiato.');
      }
      const chiave = v.chiave === da ? a : v.chiave;
      const quantita = (uniti.get(chiave) ?? 0) + v.quantita;
      if (!Number.isSafeInteger(quantita)) throw httpErrors.conflict('fusione-costo-fuori-intervallo', 'La quantità dello scambio supera l’intervallo consentito.');
      uniti.set(chiave, quantita);
    }
    prepared('UPDATE articolo SET costo_json = ?,updated_at = ? WHERE chiave = ? AND costo_json = ?')
      .run(JSON.stringify({ ...c, oggetti: [...uniti].map(([chiave, quantita]) => ({ chiave, quantita })) }), nowIso(), r.chiave, r.costo_json);
  }
}

/** Solo riferimenti tipizzati nello snapshot ripristinabile, mai testi o registri del cestino. */
function trasferisciSnapshotArticoli(da: string, a: string): void {
  for (const r of prepared('SELECT chiave,seed_json FROM articolo WHERE seed_json IS NOT NULL').all() as Array<{ chiave: string; seed_json: string }>) {
    let snapshot: Riga;
    try {
      const v = JSON.parse(r.seed_json) as unknown;
      if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('snapshot non oggetto');
      snapshot = v as Riga;
    } catch {
      if (r.seed_json.includes(da)) throw httpErrors.conflict('snapshot-articolo-illeggibile', 'Uno snapshot non leggibile cita l’oggetto: correggi il riferimento prima della fusione.');
      continue;
    }
    let cambiato = false;
    if (snapshot.catalogo_chiave === da) { snapshot.catalogo_chiave = a; cambiato = true; }
    if (snapshot.oggetto_fonte === 'catalogo' && snapshot.oggetto_chiave === da) { snapshot.oggetto_chiave = a; cambiato = true; }
    const costo = normalizzaCostoScambio(snapshot.costo_json);
    if (!costo && typeof snapshot.costo_json === 'string' && snapshot.costo_json.includes(JSON.stringify(da))) throw httpErrors.conflict('snapshot-costo-illeggibile', 'Il costo in uno snapshot non è leggibile: nessuna fusione applicata.');
    if (costo?.tipo === 'oggetti' && costo.oggetti.some((o) => o.chiave === da)) {
      const componenti = new Map<string, number>();
      for (const o of costo.oggetti) { const k = o.chiave === da ? a : o.chiave; componenti.set(k, (componenti.get(k) ?? 0) + o.quantita); }
      const nuovo = normalizzaCostoScambio({ tipo: 'oggetti', oggetti: [...componenti].map(([chiave, quantita]) => ({ chiave, quantita })) });
      if (!nuovo) throw httpErrors.conflict('snapshot-costo-fuori-intervallo', 'La fusione supererebbe i limiti del costo originale di un articolo.');
      snapshot.costo_json = JSON.stringify(nuovo); cambiato = true;
    }
    if (cambiato) prepared('UPDATE articolo SET seed_json = ? WHERE chiave = ? AND seed_json = ?').run(JSON.stringify(snapshot), r.chiave, r.seed_json);
  }
}

/** Anche i riferimenti interni alle rettifiche seguono la fusione nel registro reversibile. */
function trasferisciRiferimentiDelleProposte(da: string, a: string): void {
  const righe = prepared('SELECT riga_tipo,riga_chiave,gruppo,catalogo_chiave,modifica_json FROM proposta_abbinamento WHERE modifica_json IS NOT NULL').all() as Array<{
    riga_tipo: string; riga_chiave: string; gruppo: string; catalogo_chiave: string | null; modifica_json: string;
  }>;
  const costoTrasferito = (valore: unknown) => {
    const c = normalizzaCostoScambio(valore);
    if (!c) throw httpErrors.conflict('fusione-proposta-non-valida', 'Una proposta che cita l’oggetto contiene un costo non valido. Gestiscila prima della fusione.');
    if (c.tipo !== 'oggetti') return c;
    const uniti = new Map<string, number>();
    for (const o of c.oggetti) { const k = o.chiave === da ? a : o.chiave; uniti.set(k, (uniti.get(k) ?? 0) + o.quantita); }
    const out = normalizzaCostoScambio({ tipo: 'oggetti', oggetti: [...uniti].map(([chiave, quantita]) => ({ chiave, quantita })) });
    if (!out) throw httpErrors.conflict('fusione-proposta-fuori-intervallo', 'La fusione supererebbe i limiti del costo di una proposta. Nessuna proposta viene cambiata.');
    return out;
  };
  for (const r of righe) {
    const citaOrigine = r.modifica_json.includes(da);
    let grezzi: Record<string, unknown>;
    try { grezzi = JSON.parse(r.modifica_json) as Record<string, unknown>; } catch {
      if (citaOrigine) throw httpErrors.conflict('fusione-proposta-non-valida', 'Una proposta che cita l’oggetto non è leggibile.');
      continue;
    }
    const esito = rettificaPropostaOggetto.safeParse(grezzi);
    if (!esito.success) {
      if (citaOrigine) throw httpErrors.conflict('fusione-proposta-non-valida', 'Una proposta che cita l’oggetto non è compatibile: gestiscila prima della fusione.');
      continue;
    }
    const m = esito.data;
    let cambiato = false;
    if (m.costo?.tipo === 'oggetti' && m.costo.oggetti.some((o) => o.chiave === da)) { grezzi.costo = costoTrasferito(m.costo); cambiato = true; }
    if (m.ricevuti?.some((o) => o.chiave === da)) {
      const uniti = new Map<string, (typeof m.ricevuti)[number]>();
      for (const o of m.ricevuti) {
        const chiave = o.chiave === da ? a : o.chiave; const prima = uniti.get(chiave);
        if (prima && prima.nota !== o.nota) throw httpErrors.conflict('fusione-risultati-alternativi', 'La proposta distingue risultati con note diverse: non posso sommare premi alternativi.');
        if (prima && prima.quantita !== o.quantita) throw httpErrors.conflict('fusione-quantita-diverse', 'La proposta ha quantità diverse per lo stesso risultato: correggile prima di fondere.');
        uniti.set(chiave, { ...o, chiave });
      }
      grezzi.ricevuti = [...uniti.values()];
      cambiato = true;
    }
    if (m.prima?.catalogo_chiave === da) { grezzi.prima = { ...m.prima, catalogo_chiave: a }; cambiato = true; }
    const primaCosto = normalizzaCostoScambio(m.prima?.costo_json);
    if (!primaCosto && typeof m.prima?.costo_json === 'string' && m.prima.costo_json.includes(JSON.stringify(da))) {
      throw httpErrors.conflict('fusione-proposta-non-valida', 'Lo snapshot di una proposta cita l’oggetto in un costo non valido.');
    }
    if (primaCosto?.tipo === 'oggetti' && primaCosto.oggetti.some((o) => o.chiave === da)) {
      grezzi.prima = { ...(grezzi.prima as Record<string, unknown>), costo_json: JSON.stringify(costoTrasferito(primaCosto)) };
      cambiato = true;
    }
    if (!cambiato) continue;
    if (!rettificaPropostaOggetto.safeParse(grezzi).success) throw httpErrors.conflict('fusione-proposta-fuori-intervallo', 'La fusione produrrebbe una proposta incompatibile: nessuna modifica applicata.');
    prepared(`UPDATE proposta_abbinamento SET modifica_json = ?,updated_at = ?
      WHERE riga_tipo = ? AND riga_chiave = ? AND gruppo = ? AND catalogo_chiave IS ? AND modifica_json = ?`)
      .run(JSON.stringify(grezzi), nowIso(), r.riga_tipo, r.riga_chiave, r.gruppo, r.catalogo_chiave, r.modifica_json);
  }
}

function stessaRettifica(prima: unknown, altra: unknown): boolean {
  if (prima === null && altra === null) return true;
  if (typeof prima !== 'string' || typeof altra !== 'string') return false;
  try { return isDeepStrictEqual(JSON.parse(prima) as unknown, JSON.parse(altra) as unknown); } catch { return false; }
}

function trasferisciProposte(da: string, a: string): void {
  const righe = prepared('SELECT * FROM proposta_abbinamento WHERE catalogo_chiave = ?').all(da) as Riga[];
  const leggiDestinazione = prepared('SELECT quantita,modifica_json,stato FROM proposta_abbinamento WHERE riga_tipo = ? AND riga_chiave = ? AND gruppo = ? AND catalogo_chiave = ?');
  for (const r of righe) {
    const esistente = leggiDestinazione.get(r.riga_tipo, r.riga_chiave, r.gruppo, a) as Riga | undefined;
    const pendente = esistente && (esistente.stato === 'da-approvare' || r.stato === 'da-approvare');
    if (pendente && esistente.stato !== 'scartata' && r.stato !== 'scartata'
      && (esistente.quantita !== r.quantita || !stessaRettifica(esistente.modifica_json, r.modifica_json))) {
      throw httpErrors.conflict('fusione-proposte-incompatibili', 'Le due identità hanno proposte dello stesso gruppo con quantità o rettifiche diverse. Gestiscile prima di fondere; nessuna proposta viene persa.');
    }
    prepared(`INSERT INTO proposta_abbinamento(riga_tipo,riga_chiave,gruppo,catalogo_chiave,quantita,motivo,certezza,stato,modifica_json,fonte_snapshot_json,nota,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(riga_tipo,riga_chiave,gruppo,catalogo_chiave) DO UPDATE SET
      quantita = CASE WHEN proposta_abbinamento.stato = 'scartata' AND excluded.stato <> 'scartata' THEN excluded.quantita ELSE quantita END,
      modifica_json = CASE WHEN proposta_abbinamento.stato = 'scartata' AND excluded.stato <> 'scartata' THEN excluded.modifica_json ELSE modifica_json END,
      fonte_snapshot_json = CASE WHEN proposta_abbinamento.stato = 'scartata' AND excluded.stato <> 'scartata' THEN excluded.fonte_snapshot_json ELSE fonte_snapshot_json END,
      motivo = CASE WHEN proposta_abbinamento.stato = 'scartata' AND excluded.stato <> 'scartata' THEN excluded.motivo ELSE motivo END,
      certezza = CASE WHEN proposta_abbinamento.stato = 'scartata' AND excluded.stato <> 'scartata' THEN excluded.certezza ELSE certezza END,
      stato = CASE WHEN excluded.riga_tipo = 'catalogo' AND excluded.riga_chiave = excluded.catalogo_chiave THEN 'scartata'
        WHEN proposta_abbinamento.stato = 'confermata' OR excluded.stato = 'confermata' THEN 'confermata'
        WHEN proposta_abbinamento.stato = 'da-approvare' OR excluded.stato = 'da-approvare' THEN 'da-approvare' ELSE 'scartata' END,
      nota = CASE WHEN excluded.nota IS NULL THEN nota WHEN nota IS NULL OR nota = excluded.nota THEN excluded.nota ELSE nota || char(10) || excluded.nota END,
      updated_at = excluded.updated_at`).run(r.riga_tipo, r.riga_chiave, r.gruppo, a, r.quantita, r.motivo, r.certezza,
        r.riga_tipo === 'catalogo' && r.riga_chiave === a ? 'scartata' : r.stato, r.modifica_json, r.fonte_snapshot_json, r.nota, nowIso());
  }
  prepared('DELETE FROM proposta_abbinamento WHERE catalogo_chiave = ?').run(da);
}

/** `dopo` serve alla conferma: anche il cambio di stato delle proposte si annulla rimettendo la fusione dal cestino. */
export function fondiOggetti(da: string, a: string, dopo?: () => void): void {
  if (da === a) throw httpErrors.badRequest('fusione-stesso-oggetto', 'Scegli due oggetti diversi.');
  const origine = rigaOggetto(da, true); const destinazione = rigaOggetto(a);
  verificaFontiLetturaFusione(da, a);
  if (origine.sottocategoria === 'seme' && (destinazione.categoria !== 'chiave' || (destinazione.sottocategoria !== null && destinazione.sottocategoria !== 'seme'))) {
    throw httpErrors.conflict('fusione-seme-incompatibile', 'La destinazione deve conservare la classificazione di Seme del Palazzo.');
  }
  const letturaOrigine = LETTURE.has(origine.fonte_tipo);
  const letturaDestinazione = LETTURE.has(destinazione.fonte_tipo);
  if (letturaOrigine && (destinazione.categoria !== origine.fonte_tipo || (letturaDestinazione
    && (destinazione.fonte_tipo !== origine.fonte_tipo || destinazione.fonte_chiave !== origine.fonte_chiave)))) {
    throw httpErrors.conflict('fusione-letture-distinte', 'Le due identità hanno letture, visioni o progressi distinti: non si fondono perdendo un avanzamento.');
  }
  conCestino({ tipo: 'oggetto', chiave: da, nome: origine.nome, contesto: `Fuso in «${destinazione.nome}»` }, () => getDb().transaction(() => {
    const fontiPrima = fontiPropostePrimaDellaFusione(getDb());
    trasferisciContenuti(da, a);
    trasferisciCosti(da, a);
    trasferisciSnapshotArticoli(da, a);
    prepared('UPDATE articolo SET catalogo_chiave = ? WHERE catalogo_chiave = ?').run(a, da);
    prepared('UPDATE confidente_regalo SET catalogo_chiave = ? WHERE catalogo_chiave = ?').run(a, da);
    // I nomi storici e le date di consegna restano: si sposta soltanto il riferimento all'identità.
    prepared('UPDATE regalo_partita SET catalogo_chiave = ? WHERE catalogo_chiave = ?').run(a, da);
    trasferisciRiferimentiDelleProposte(da, a);
    trasferisciProposte(da, a);
    const nomi = new Map<string, string>();
    for (const nome of [...nomiAltriOggetto(destinazione.nomi_altri_json), origine.nome, ...nomiAltriOggetto(origine.nomi_altri_json), origine.nome_originale]) {
      if (nome && normalizzaNomeOggetto(nome) !== normalizzaNomeOggetto(destinazione.nome) && !nomi.has(normalizzaNomeOggetto(nome))) nomi.set(normalizzaNomeOggetto(nome), nome);
    }
    if (nomi.size > 60) throw httpErrors.conflict('fusione-troppi-alias', 'La fusione supererebbe i 60 nomi alternativi ammessi dal catalogo. Riduci gli alias prima di fondere: nessun nome viene scartato automaticamente.');
    prepared('UPDATE catalogo_oggetto SET nomi_altri_json = ?,nome_originale = COALESCE(nome_originale,?),updated_at = ? WHERE chiave = ?')
      .run(JSON.stringify([...nomi.values()]), origine.nome_originale, nowIso(), a);
    // I riferimenti alle fonti originarie seguono la fusione e tornano indietro col cestino.
    trasferisciFontiCatalogo(da, a);
    if (origine.sottocategoria === 'seme') prepared("UPDATE catalogo_oggetto SET sottocategoria = 'seme' WHERE chiave = ?").run(a);
    prepared('DELETE FROM catalogo_oggetto WHERE chiave = ?').run(da);
    if (letturaOrigine && !letturaDestinazione) prepared('UPDATE catalogo_oggetto SET fonte_tipo = ?,fonte_chiave = ?,updated_at = ? WHERE chiave = ?')
      .run(origine.fonte_tipo, origine.fonte_chiave, nowIso(), a);
    // Le altre fusioni che partivano dall'identità eliminata non devono restare azioni pendenti in errore.
    // Anche questo cambiamento è registrato dal cestino e torna indietro col ripristino.
    prepared("UPDATE proposta_abbinamento SET stato = 'scartata',updated_at = ? WHERE riga_tipo = 'catalogo' AND riga_chiave = ? AND stato = 'da-approvare'").run(nowIso(), da);
    dopo?.();
    invalidaSnapshotDopoFusione(getDb(), fontiPrima);
  })());
  invalidaCacheDiGioco();
}
