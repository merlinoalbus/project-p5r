import { prepared } from '../db/dbService.js';
import { BLOCCHI_GUIDA_CATALOGO, cambiaRiferimentiCatalogoGuida } from '../../shared/riferimentiCatalogoGuida.js';
import { httpErrors } from '../utils/httpError.js';

/** Parte della transazione del gesto: il cestino osserva anche questi cambi puntuali. */
export function trasferisciFontiCatalogo(da: string, a: string | null): void {
  for (const tabella of ['oggetto', 'libro', 'film', 'attivita']) {
    prepared(`UPDATE ${tabella} SET catalogo_chiave = ? WHERE catalogo_chiave = ?`).run(a, da);
  }
  for (const colonna of ['cristallo_chiave', 'anello_chiave']) prepared(`UPDATE trasformazione_oggetto SET ${colonna} = ? WHERE ${colonna} = ?`).run(a, da);
  for (const r of prepared('SELECT chiave,json FROM dati_guida WHERE chiave IN (SELECT value FROM json_each(?)) AND json LIKE ?')
    .all(JSON.stringify(BLOCCHI_GUIDA_CATALOGO), '%"catalogoChiave"%') as Array<{ chiave: string; json: string }>) {
    let guida: unknown;
    try { guida = JSON.parse(r.json) as unknown; } catch {
      throw httpErrors.conflict('riferimenti-guida-non-leggibili', 'Una fonte con riferimenti al catalogo non è leggibile: nessun collegamento viene eliminato.');
    }
    if (cambiaRiferimentiCatalogoGuida(guida, da, a)) prepared('UPDATE dati_guida SET json = ? WHERE chiave = ? AND json = ?')
      .run(JSON.stringify(guida), r.chiave, r.json);
  }
}

/** La categoria deve restare compatibile con ogni sorgente di avanzamento effettivamente collegata. */
export function verificaCategoriaLettura(chiave: string, categoria: unknown): void {
  for (const [tabella, tipo] of [['libro', 'libro'], ['film', 'film'], ['attivita', 'videogioco']]) {
    const collegata = prepared(`SELECT 1 FROM ${tabella} WHERE catalogo_chiave = ?${tabella === 'attivita' ? " AND tipo = 'videogioco'" : ''} LIMIT 1`).get(chiave);
    if (collegata && categoria !== tipo) throw httpErrors.conflict('categoria-lettura-collegata',
      `L’oggetto ha un avanzamento di tipo «${tipo}»: la categoria deve conservarlo. Nessuna categoria o progresso è stato modificato.`);
  }
}

/** Una lettura conserva la sua chiave e il suo avanzamento: non accorpa due progressi distinti. */
export function verificaFontiLetturaFusione(da: string, a: string): void {
  const fonti: Array<{ tipo: string; chiave: string; catalogo: string }> = [];
  for (const [tabella, tipo] of [['libro', 'libro'], ['film', 'film'], ['attivita', 'videogioco']]) {
    for (const r of prepared(`SELECT chiave,catalogo_chiave AS catalogo FROM ${tabella} WHERE catalogo_chiave IN (?,?)${tabella === 'attivita' ? " AND tipo = 'videogioco'" : ''}`)
      .all(da, a) as Array<{ chiave: string; catalogo: string }>) fonti.push({ ...r, tipo });
  }
  if (fonti.length > 1) throw httpErrors.conflict('fusione-letture-distinte',
    'Queste identità hanno letture, visioni o progressi distinti: la fusione non può accorparli.');
  if (fonti.length) {
    const destinazione = prepared('SELECT categoria FROM catalogo_oggetto WHERE chiave = ?').get(a) as { categoria: string } | undefined;
    if (destinazione?.categoria !== fonti[0].tipo) throw httpErrors.conflict('fusione-categoria-lettura', 'La destinazione deve conservare il tipo della lettura collegata.');
  }
}

/** SET NULL conserva il caso dubbio. Le collisioni si dichiarano prima di cancellare l'identità. */
export function preparaProposteSenzaOggetto(chiave: string): void {
  const collisione = prepared(`SELECT 1 FROM proposta_abbinamento p JOIN proposta_abbinamento senza
    ON senza.riga_tipo = p.riga_tipo AND senza.riga_chiave = p.riga_chiave AND senza.gruppo = p.gruppo
    WHERE p.catalogo_chiave = ? AND senza.catalogo_chiave IS NULL LIMIT 1`).get(chiave);
  if (collisione) throw httpErrors.conflict('proposte-senza-candidato-in-conflitto',
    'Eliminazione annullata: una fonte ha già una proposta senza candidato e perderebbe la distinzione fra due proposte. Le proposte e l’oggetto sono conservati.');
  prepared(`UPDATE proposta_abbinamento SET nota = COALESCE(nota || char(10),'') || ?, catalogo_chiave = NULL
    WHERE catalogo_chiave = ?`).run(`Identità rimossa dal catalogo: ${chiave}. Il riferimento può essere ripristinato dal cestino.`, chiave);
}

/** Un costo non può diventare gratuito né mantenere un oggetto inesistente dopo l'eliminazione. */
export function verificaCostiPrimaDiEliminare(chiave: string): void {
  const cita = (v: unknown): boolean => {
    if (!v || typeof v !== 'object') return false;
    if (Array.isArray(v)) return v.some(cita);
    const o = v as Record<string, unknown>;
    return o.chiave === chiave || o.catalogo_chiave === chiave || Object.values(o).some(cita);
  };
  for (const [tabella, colonna, filtro] of [['articolo', 'costo_json', ''], ['proposta_abbinamento', 'modifica_json', " AND stato = 'da-approvare'"]]) {
    for (const r of prepared(`SELECT ${colonna} AS json FROM ${tabella} WHERE ${colonna} IS NOT NULL${filtro}`).all() as Array<{ json: string }>) {
      let valore: unknown;
      try { valore = JSON.parse(r.json) as unknown; } catch {
        if (r.json.includes(chiave)) throw httpErrors.conflict('oggetto-citato-in-costo-illeggibile', 'Un costo o una proposta non leggibile cita l’oggetto. Correggila prima di eliminarlo.');
        continue;
      }
      if (cita(valore)) throw httpErrors.conflict('oggetto-usato-in-costo', 'L’oggetto è citato nel costo di uno scambio o nei dettagli di una proposta da approvare. Correggi quel riferimento prima di eliminarlo.');
    }
  }
}
