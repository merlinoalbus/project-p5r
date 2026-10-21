import type { AppDatabase } from '../dbService.js';

/** Elenco approvato esplicitamente dall'utente il21ottobre; sei seed nella127, due personali tramite CAS. */
export const RACCORDI_L5 = [
  { id: 268, nome: 'Ferramenta', tipo: 'negozio', nativo: 81, indice: 10, mappa: 'nativo-rmap-007-1-0', quartiere: 'akihabara', area: 'citta/akihabara/electric-town', luogo: 'akihabara/akiba-electronics', nomeLuogo: 'Negozio di elettronica Akiba', tipoLuogo: 'negozio' },
  { id: 269, nome: 'Distributori di capsule', tipo: 'negozio', nativo: 78, indice: 11, mappa: 'nativo-rmap-007-1-0', quartiere: 'akihabara', area: 'citta/akihabara/electric-town', luogo: 'akihabara/gachapon-akihabara', nomeLuogo: 'Gachapon di Akihabara', tipoLuogo: 'negozio' },
  { id: 360, nome: 'Panini al vapore', tipo: 'ristorante', nativo: 106, indice: 10, mappa: 'nativo-rmap-005-1-0', quartiere: 'kichijoji', area: 'citta/kichijoji/quartiere-dello-shopping', luogo: 'kichijoji/houraku', nomeLuogo: 'Street food cinese Houraku', tipoLuogo: 'ristorante' },
  { id: 363, nome: 'Alimentari importati', tipo: 'negozio', nativo: 107, indice: 13, mappa: 'nativo-rmap-005-1-0', quartiere: 'kichijoji', area: 'citta/kichijoji/quartiere-dello-shopping', luogo: 'kichijoji/mealport', nomeLuogo: "Verdura d'importazione MealPort", tipoLuogo: 'negozio' },
  { id: 1561, nome: 'Casalinghi', tipo: 'negozio', nativo: 75, indice: 8, mappa: 'nativo-rmap-006-1-0', quartiere: 'shinjuku', area: 'citta/shinjuku/quartiere-a-luci-rosse', luogo: 'shinjuku/mran-mran', nomeLuogo: 'Negozio di articoli vari Mran Mran', tipoLuogo: 'negozio' },
  { id: 1562, nome: 'Fioraio', tipo: 'negozio', nativo: 63, indice: 9, mappa: 'nativo-rmap-006-1-0', quartiere: 'shinjuku', area: 'citta/shinjuku/quartiere-a-luci-rosse', luogo: 'shinjuku/fioraio-sukebe', nomeLuogo: 'Fioraio Sukebe', tipoLuogo: 'negozio' },
] as const;

type Riga = Record<string, unknown>;
function record(v: unknown): Riga | null { return v && typeof v === 'object' && !Array.isArray(v) ? v as Riga : null; }
function json(v: unknown): unknown {
  if (typeof v !== 'string') return undefined;
  try { return JSON.parse(v) as unknown; } catch { return undefined; }
}

/** Stesse vie strutturali del lettore dei luoghi: riferimento diretto, listino/sede-pin e associazioni mappa. */
function collocazioni(db: AppDatabase, luogo: string, mappaProposta: string): { luoghi: Array<{ pin: number | null; mappa: string; area: string | null }>; areaProposta: string | null; negozi: Set<string>; mappe: Set<string>; sediPin: Set<string> } {
  const mappe = new Map((db.prepare('SELECT chiave, area_chiave, genitore_chiave, entita_tipo, entita_chiave FROM main.mappa').all() as Array<{ chiave: string; area_chiave: string | null; genitore_chiave: string | null; entita_tipo: string | null; entita_chiave: string | null }>).map((m) => [m.chiave, m]));
  const negozi = new Map((db.prepare('SELECT chiave, sede_chiave, listino_condiviso FROM main.negozio').all() as Array<{ chiave: string; sede_chiave: string | null; listino_condiviso: string | null }>).map((n) => [n.chiave, n]));
  const sediPin = new Map((db.prepare('SELECT spillo_uid, negozio_chiave, luogo_chiave FROM main.negozio_sede_spillo').all() as Array<{ spillo_uid: string; negozio_chiave: string; luogo_chiave: string }>).map((s) => [s.spillo_uid, s]));
  const sedeListino = (chiave: string): string | null => {
    const visti = new Set<string>();
    let n = negozi.get(chiave);
    while (n?.listino_condiviso && !visti.has(n.chiave)) { visti.add(n.chiave); n = negozi.get(n.listino_condiviso); }
    return n && !visti.has(n.chiave) ? n.sede_chiave : null;
  };
  const areaMappa = (chiave: string): string | null => {
    const visti = new Set<string>();
    let m = mappe.get(chiave);
    let area: string | null = null;
    while (m) {
      if (visti.has(m.chiave)) return null;
      visti.add(m.chiave);
      if (m.area_chiave) {
        if (area !== null && area !== m.area_chiave) return null;
        if (!db.prepare('SELECT 1 FROM main.area WHERE chiave=?').get(m.area_chiave)) return null;
        area = m.area_chiave;
      }
      if (m.genitore_chiave === null) return area;
      m = mappe.get(m.genitore_chiave);
    }
    return null;
  };
  const pertinenti = new Set([...negozi].filter(([k, n]) => n.sede_chiave === luogo || sedeListino(k) === luogo).map(([k]) => k));
  for (const r of db.prepare('SELECT negozio_chiave FROM main.negozio_luogo_extra WHERE luogo_chiave=?').all(luogo) as Array<{ negozio_chiave: string }>) pertinenti.add(r.negozio_chiave);
  let aggiunti: boolean;
  do { aggiunti = false; for (const [k, n] of negozi) if (!pertinenti.has(k) && n.listino_condiviso && pertinenti.has(n.listino_condiviso)) { pertinenti.add(k); aggiunti = true; } } while (aggiunti);
  const out: Array<{ pin: number | null; mappa: string; area: string | null }> = [];
  for (const p of db.prepare('SELECT id, uid, mappa_chiave, riferimento_tipo, riferimento_chiave FROM main.spillo WHERE mappa_chiave IS NOT NULL').all() as Array<{ id: number; uid: string | null; mappa_chiave: string; riferimento_tipo: string | null; riferimento_chiave: string | null }>) {
    let sede: string | null = null;
    if (p.riferimento_tipo === 'luogo' || p.riferimento_tipo === 'attivita') sede = p.riferimento_chiave;
    if (p.riferimento_tipo === 'negozio' && p.riferimento_chiave) {
      const confermata = p.uid ? sediPin.get(p.uid) : undefined;
      sede = confermata?.negozio_chiave === p.riferimento_chiave ? confermata.luogo_chiave : sedeListino(p.riferimento_chiave);
    }
    if (sede === luogo) out.push({ pin: p.id, mappa: p.mappa_chiave, area: areaMappa(p.mappa_chiave) });
    else if (sede === null && p.riferimento_tipo === 'negozio' && p.riferimento_chiave && pertinenti.has(p.riferimento_chiave)) out.push({ pin: p.id, mappa: p.mappa_chiave, area: null });
  }
  const associazioni = [...(db.prepare('SELECT mappa_chiave, entita_tipo, entita_chiave FROM main.mappa_entita').all() as Array<{ mappa_chiave: string; entita_tipo: string | null; entita_chiave: string | null }>),
    ...[...mappe.values()].map(m => ({ mappa_chiave: m.chiave, entita_tipo: m.entita_tipo, entita_chiave: m.entita_chiave }))];
  for (const m of associazioni) {
    const sede = m.entita_tipo === 'luogo' || m.entita_tipo === 'attivita' ? m.entita_chiave : m.entita_tipo === 'negozio' && m.entita_chiave ? sedeListino(m.entita_chiave) : null;
    if (sede === luogo) out.push({ pin: null, mappa: m.mappa_chiave, area: areaMappa(m.mappa_chiave) });
    else if (sede === null && m.entita_tipo === 'negozio' && m.entita_chiave && pertinenti.has(m.entita_chiave)) out.push({ pin: null, mappa: m.mappa_chiave, area: null });
  }
  const mappePertinenti = new Set<string>();
  for (const c of [{ mappa: mappaProposta }, ...out]) {
    let m = mappe.get(c.mappa);
    while (m && !mappePertinenti.has(m.chiave)) { mappePertinenti.add(m.chiave); m = m.genitore_chiave ? mappe.get(m.genitore_chiave) : undefined; }
  }
  return { luoghi: out, areaProposta: areaMappa(mappaProposta), negozi: pertinenti, mappe: mappePertinenti, sediPin: new Set([...sediPin].filter(([, s]) => s.luogo_chiave === luogo).map(([uid]) => uid)) };
}

/** Solo i sei seed approvati; qualsiasi variante o storia incerta resta esplicita nel rendiconto. */
export function applicaRaccordiLuoghiL5(db: AppDatabase): void {
  db.transaction(() => {
    const audit = 'raccordi-luoghi-l5-approvati';
    if (db.prepare('SELECT 1 FROM main.dati_guida WHERE chiave = ?').get(audit)) return;
    const esiti: Array<{ id: number; luogo: string; esito: string; motivo: string }> = [];
    const registri = (db.prepare('SELECT registro_json FROM main.cestino').all() as Array<{ registro_json: string }>).map((r) => json(r.registro_json));
    for (const proposta of RACCORDI_L5) {
      const esito = (stato: string, motivo: string) => esiti.push({ id: proposta.id, luogo: proposta.luogo, esito: stato, motivo });
      const pin = db.prepare('SELECT * FROM main.spillo WHERE id = ?').get(proposta.id) as Riga | undefined;
      const luogo = db.prepare('SELECT * FROM main.luogo WHERE chiave = ?').get(proposta.luogo) as Riga | undefined;
      const mappa = db.prepare('SELECT origine, area_chiave, genitore_chiave FROM main.mappa WHERE chiave = ?').get(proposta.mappa) as Riga | undefined;
      const area = db.prepare('SELECT origine, quartiere_chiave FROM main.area WHERE chiave = ?').get(proposta.area) as Riga | undefined;
      const nativo = record(json(pin?.nativo_json));
      if (!pin || !luogo) { esito('esclusa', 'Pin o luogo assente: non ricreati.'); continue; }
      if (pin.origine !== 'seed' || pin.seed_identita_json !== null || pin.nome !== proposta.nome || pin.tipo !== proposta.tipo
        || pin.mappa_chiave !== proposta.mappa || pin.area_guida_chiave !== null
        || nativo?.tipoNativo !== proposta.nativo || nativo.indicePin !== proposta.indice || nativo.daVerificare !== false
        || luogo.origine !== 'seed' || luogo.seed_json !== null || luogo.nascosto !== 0 || luogo.nome !== proposta.nomeLuogo
        || luogo.tipo !== proposta.tipoLuogo || luogo.quartiere_chiave !== proposta.quartiere
        || mappa?.origine !== 'seed' || mappa.area_chiave !== proposta.area || mappa.genitore_chiave !== `citta-${proposta.quartiere}`
        || area?.origine !== 'seed' || area.quartiere_chiave !== proposta.quartiere) {
        esito('conflitto', 'Identità, provenienza o contesto diversi dall’elenco approvato: nessuna modifica.'); continue;
      }
      const giaCollegato = pin.riferimento_tipo === 'luogo' && pin.riferimento_chiave === proposta.luogo;
      if ((!giaCollegato && (pin.riferimento_tipo !== null || pin.riferimento_chiave !== null))
        || (luogo.area_chiave !== null && luogo.area_chiave !== proposta.area)) {
        esito('conflitto', 'Riferimento o Area già diversi: scelta corrente preservata.'); continue;
      }
      if (giaCollegato && luogo.area_chiave === proposta.area) { esito('gia-collegata', 'Pin e Area già corrispondenti: nessuna modifica.'); continue; }
      const contesto = collocazioni(db, proposta.luogo, proposta.mappa);
      const altreCollocazioni = contesto.luoghi.filter((c) => c.pin !== proposta.id);
      if (contesto.areaProposta !== proposta.area) { esito('conflitto', 'Catena della planimetria proposta non risolvibile o con Aree discordanti.'); continue; }
      if (altreCollocazioni.some((c) => c.pin !== null && c.mappa === proposta.mappa)) {
        esito('conflitto', 'Un altro pin della stessa planimetria cita già il luogo: nessun duplicato.'); continue;
      }
      if (altreCollocazioni.some((c) => c.area === null || c.area !== proposta.area)) {
        esito('conflitto', 'Altra collocazione strutturata in Area diversa, anche tramite attività, negozio o mappa: legami preservati.'); continue;
      }
      const storiaIncerta = registri.some((r) => {
        if (!Array.isArray(r)) return true;
        const sequenze = new Set<number>();
        return r.some((v) => {
        const passo = record(v);
        if (!passo || !Number.isSafeInteger(passo.seq) || Number(passo.seq) < 0 || sequenze.has(Number(passo.seq))
          || typeof passo.tabella !== 'string' || !passo.tabella || !['D', 'U', 'I'].includes(String(passo.op))
          || ((passo.op === 'D' || passo.op === 'U') && !record(passo.prima))
          || ((passo.op === 'I' || passo.op === 'U') && !record(passo.dopo))) return true;
        sequenze.add(Number(passo.seq));
        const struttura = db.prepare('SELECT name, pk FROM pragma_table_info(?, ?) ORDER BY pk').all(passo.tabella, 'main') as Array<{ name: string; pk: number }>;
        if (!struttura.length) return true;
        const primarie = struttura.filter(c => c.pk > 0).map(c => c.name);
        const identita = primarie.length ? primarie : ['rowid'];
        return ['prima', 'dopo'].some((campo) => {
          const immagine = record(passo[campo]);
          if (passo[campo] !== undefined && passo[campo] !== null && !immagine) return true;
          if (immagine && identita.some(k => !Object.hasOwn(immagine, k) || (immagine[k] !== null && typeof immagine[k] !== 'string' && typeof immagine[k] !== 'number'))) return true;
          return (passo.tabella === 'spillo' && (immagine?.id === proposta.id || (!!pin.uid && immagine?.uid === pin.uid)))
            || (passo.tabella === 'luogo' && immagine?.chiave === proposta.luogo)
            || (passo.tabella === 'spillo' && ((['luogo', 'attivita'].includes(String(immagine?.riferimento_tipo)) && immagine?.riferimento_chiave === proposta.luogo)
              || (immagine?.riferimento_tipo === 'negozio' && contesto.negozi.has(String(immagine.riferimento_chiave))) || contesto.sediPin.has(String(immagine?.uid))))
            || (passo.tabella === 'negozio' && (contesto.negozi.has(String(immagine?.chiave)) || immagine?.sede_chiave === proposta.luogo))
            || (passo.tabella === 'negozio_luogo_extra' && immagine?.luogo_chiave === proposta.luogo)
            || (passo.tabella === 'negozio_sede_spillo' && (immagine?.luogo_chiave === proposta.luogo || contesto.negozi.has(String(immagine?.negozio_chiave))))
            || ((passo.tabella === 'mappa_entita' || passo.tabella === 'mappa') && (immagine?.entita_chiave === proposta.luogo
              || (immagine?.entita_tipo === 'negozio' && contesto.negozi.has(String(immagine.entita_chiave)))
              || (passo.tabella === 'mappa' && (immagine?.chiave === proposta.mappa || contesto.mappe.has(String(immagine?.chiave))))))
            || (passo.tabella === 'area' && immagine?.chiave === proposta.area);
        });
      }); });
      if (storiaIncerta) { esito('conflitto', 'Fotografia pertinente nel cestino o registro non leggibile: storia preservata.'); continue; }
      // Aggiornamenti stretti: non passano dal normalizzatore della categoria dei pin e non alterano gli altri campi.
      if (!giaCollegato && db.prepare("UPDATE main.spillo SET riferimento_tipo = 'luogo', riferimento_chiave = ? WHERE id = ? AND riferimento_tipo IS NULL AND riferimento_chiave IS NULL AND origine = 'seed'")
        .run(proposta.luogo, proposta.id).changes !== 1) throw new Error('127: riferimento cambiato, transazione annullata.');
      if (luogo.area_chiave === null && db.prepare("UPDATE main.luogo SET area_chiave = ? WHERE chiave = ? AND area_chiave IS NULL AND origine = 'seed'")
        .run(proposta.area, proposta.luogo).changes !== 1) throw new Error('127: Area cambiata, transazione annullata.');
      esito('collegata', 'Riferimento e Area approvati applicati; tutti gli altri campi conservati.');
    }
    db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(audit, JSON.stringify({ versione: 1, elenco: 'otto-raccordi-l5-v1', esiti }));
  })();
}
