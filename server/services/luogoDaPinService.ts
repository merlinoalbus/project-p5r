// L5: crea un luogo e collega il pin esistente con una sola transazione e una precondizione fresca.
import { createHash } from 'node:crypto';
import type { ZodType } from 'zod';
import type { AnteprimaLuogoDaPinDto, LuogoCreatoDaPinDto, LuogoNuovoDaPin } from '../../shared/luogoDaPin.js';
import type { TipoSpillo } from '../../shared/spilli.js';
import { getDb, nowIso } from '../db/dbService.js';
import { bodyAnteprimaLuogoDaPin, bodyCreaLuogoDaPin } from '../schemas/luoghi.js';
import { httpErrors } from '../utils/httpError.js';
import { creaElemento } from './catalogoService.js';
import { casaDelLuogo } from './luoghiService.js';
import { fotografiaCanonicaLuogoDaPin, fotografiaLuogoDaPin, chiaveLuogoDaPin, type FotografiaLuogoDaPin } from './mappe/fotografiaLuogoDaPin.js';

function richiesta<T>(schema: ZodType<T>, dati: unknown): T {
  const r = schema.safeParse(dati);
  if (!r.success) throw httpErrors.badRequest('validation-error', 'La richiesta di creazione dal pin non è valida.', { issues: r.error.issues });
  return r.data;
}

function impronta(foto: FotografiaLuogoDaPin, nuovo: LuogoNuovoDaPin): string {
  return createHash('sha256').update(fotografiaCanonicaLuogoDaPin({ versione: 'luogo-da-pin-1', foto, nuovo,
    chiave: chiaveLuogoDaPin(String(foto.quartiere.chiave), nuovo.nome) })).digest('hex');
}

/** Sola lettura coerente. Nessuna prenotazione di chiavi o memorizzazione della fotografia. */
export function anteprimaLuogoDaPin(id: number, dati: unknown): AnteprimaLuogoDaPinDto {
  const { nuovo } = richiesta(bodyAnteprimaLuogoDaPin, dati);
  const db = getDb();
  return db.transaction((): AnteprimaLuogoDaPinDto => {
    const f = fotografiaLuogoDaPin(db, id, nuovo);
    return {
      nuovo,
      spillo: { id: f.pin.id, uid: f.pin.uid, nome: f.pin.nome, tipo: f.pin.tipo as TipoSpillo, mappa: { chiave: String(f.mappa.chiave), nome: String(f.mappa.nome) } },
      quartiere: { chiave: String(f.quartiere.chiave), nome: String(f.quartiere.nome) },
      area: { chiave: String(f.area.chiave), slug: String(f.area.slug), nome: String(f.area.nome) },
      luogoPrevisto: { ...nuovo, chiave: chiaveLuogoDaPin(String(f.quartiere.chiave), nuovo.nome) },
      luoghiEsistenti: f.luoghi.map(l => {
        const a = f.aree.find(a => a.chiave === l.area_chiave);
        return { chiave: String(l.chiave), nome: String(l.nome), tipo: String(l.tipo), nascosto: l.nascosto === 1,
          area: a ? { chiave: String(a.chiave), nome: String(a.nome) } : null, casa: l.nascosto === 1 ? null : casaDelLuogo(String(l.chiave)) };
      }),
      revisioneRaccordoAttesa: impronta(f, nuovo),
    };
  })();
}

/** Una sola TX: ogni errore, compresa la divergenza del creatore ordinario, annulla entrambe le scritture. */
export function creaLuogoDaPin(id: number, dati: unknown): LuogoCreatoDaPinDto {
  const { nuovo, revisioneRaccordoAttesa } = richiesta(bodyCreaLuogoDaPin, dati);
  const db = getDb();
  return db.transaction((): LuogoCreatoDaPinDto => {
    const foto = fotografiaLuogoDaPin(db, id, nuovo);
    if (impronta(foto, nuovo) !== revisioneRaccordoAttesa) {
      throw httpErrors.conflict('luogo-da-pin-precondizione-cambiata', 'Il pin, il contesto, i luoghi o gli stati sono cambiati. Rileggi l’anteprima prima di creare il luogo.');
    }
    const chiave = chiaveLuogoDaPin(String(foto.quartiere.chiave), nuovo.nome);
    const attesi = { chiave, quartiere_chiave: foto.quartiere.chiave, area_chiave: foto.area.chiave,
      nome: nuovo.nome, tipo: nuovo.tipo, cosa_offre: nuovo.cosaOffre, orari_json: nuovo.orari === null ? null : JSON.stringify(nuovo.orari),
      condizioni_json: '[]', origine: 'utente', nascosto: 0 };
    const creato = creaElemento('luogo', { quartiere_chiave: attesi.quartiere_chiave, area_chiave: attesi.area_chiave,
      nome: attesi.nome, tipo: attesi.tipo, cosa_offre: attesi.cosa_offre, orari_json: attesi.orari_json, condizioni_json: attesi.condizioni_json });
    const riga = db.prepare('SELECT * FROM luogo WHERE chiave = ?').get(creato.chiave) as Record<string, unknown> | undefined;
    if (!riga || creato.chiave !== chiave || fotografiaCanonicaLuogoDaPin(Object.fromEntries(Object.keys(attesi).map(k => [k, riga[k]]))) !== fotografiaCanonicaLuogoDaPin(attesi)) {
      throw httpErrors.conflict('luogo-da-pin-creazione-diversa', 'Il creatore ha prodotto una chiave o dati diversi dall’anteprima: nessuna creazione è stata applicata.');
    }
    const esito = db.prepare(`UPDATE spillo SET riferimento_tipo = 'luogo', riferimento_chiave = ?, updated_at = ?
      WHERE id = ? AND uid = ? AND origine = 'utente' AND riferimento_tipo IS NULL AND riferimento_chiave IS NULL`).run(chiave, nowIso(), id, foto.pin.uid);
    if (esito.changes !== 1) throw httpErrors.conflict('luogo-da-pin-precondizione-cambiata', 'Il riferimento del pin è cambiato: nessuna parte della creazione è stata applicata.');
    // Niente riletture o costruzione del dettaglio dopo COMMIT: questa è già la ricevuta del successo.
    // creaElemento ha invalidato le cache nella TX (solo memoria); non serve un effetto fallibile dopo commit.
    return { esito: 'creato-collegato', luogo: { chiave, nome: nuovo.nome }, spillo: { id, uid: foto.pin.uid, mappaChiave: foto.pin.mappa_chiave } };
  }).immediate();
}
