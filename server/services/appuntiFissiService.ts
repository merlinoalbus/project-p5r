// ============================================================
// appuntiFissiService — gli appunti fissi del Diario e le loro categorie: elenco, aggiunta, modifica, eliminazione, spostamento (2026-10-31, C7;
// categorie 2026-11-02)
// ============================================================
//
// Richiesta dell'utente: «una sorta di clipboard su finestra fluttuante dove possa io inserire e mantenere salvati delle voci che tendono a
// ripetersi nel diario», proposta approvata «Sì, sul server»; poi «voglio poter raggruppare per categorie (chiudibili e apribili) gli Appunti
// Fissi nonchè riordinarli con click e trascina all'interno di gruppi o della lista di Appunti fissi», proposta approvata «Sì, procedi».
// Gli appunti stanno in `utente.appunto_fisso` (migrazione utente 058), le categorie in `utente.categoria_appunti` (067); non sono di una partita.
//
//   - Un appunto sta in un GRUPPO: una categoria (`categoria_id`) o la lista senza categoria (NULL). Il suo `ordine` è il posto nel gruppo, da 0
//     senza buchi; anche le categorie hanno il loro ordine da 0 senza buchi. Un appunto nuovo va in fondo al suo gruppo, una categoria nuova in
//     fondo alle categorie; ogni eliminazione ricompatta.
//   - Lo spostamento è per un elemento solo, con il posto di arrivo (`indice`, contato dopo averlo tolto dal suo gruppo, come `posizione` della
//     giornata): si toglie dal gruppo di partenza, che si ricompatta, e si mette nel gruppo d'arrivo; un posto oltre la fine vale «in fondo».
//     Un appunto o una categoria che non c'è più (un altro dispositivo) è 404, e chi sposta rilegge.
//   - Eliminare una categoria non perde gli appunti: vanno in fondo alla lista senza categoria, nel loro ordine, nella stessa transazione.
//   - I nomi delle categorie sono unici senza distinguere maiuscole né accenti (409 `categoria-esistente`).
// Ogni scrittura è una transazione. Il testo si conserva com'è (anche gli spazi: il blocco delle voci del Diario va tenuto intatto); titolo e
// nome si ripuliscono ai capi (lo schema zod).
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import {
  LIMITE_APPUNTI, LIMITE_CATEGORIE, type AppuntiFissiDto, type AppuntoFissoDto, type CategoriaAppuntiDto, type ModificaAppuntoFisso,
  type NuovoAppuntoFisso, type PostoAppuntoFisso,
} from '../../shared/appuntiFissi.js';

interface RigaAppunto { id: number; titolo: string; testo: string; categoria_id: number | null; ordine: number; creato_il: string; aggiornato_il: string }
interface RigaCategoria { id: number; nome: string; ordine: number; creato_il: string; aggiornato_il: string }

const dto = (r: RigaAppunto): AppuntoFissoDto => ({
  id: r.id, titolo: r.titolo, testo: r.testo, categoriaId: r.categoria_id, ordine: r.ordine, creatoIl: r.creato_il, aggiornatoIl: r.aggiornato_il,
});
const dtoCategoria = (r: RigaCategoria): CategoriaAppuntiDto => ({ id: r.id, nome: r.nome, ordine: r.ordine, creatoIl: r.creato_il, aggiornatoIl: r.aggiornato_il });

const COLONNE = 'id, titolo, testo, categoria_id, ordine, creato_il, aggiornato_il';
// la lista senza categoria prima, poi le categorie per id: la finestra raggruppa da sé, l'ordine dentro il gruppo è quello che conta
const SQL_ELENCO = `SELECT ${COLONNE} FROM utente.appunto_fisso ORDER BY categoria_id IS NOT NULL, categoria_id, ordine, id`;
const SQL_CATEGORIE = 'SELECT id, nome, ordine, creato_il, aggiornato_il FROM utente.categoria_appunti ORDER BY ordine, id';

/** L'appunto `id`, o 404 `appunto-non-trovato`. */
function riga(id: number): RigaAppunto {
  const r = prepared(`SELECT ${COLONNE} FROM utente.appunto_fisso WHERE id = ?`).get(id) as RigaAppunto | undefined;
  if (!r) throw httpErrors.notFound('appunto-non-trovato', `L'appunto fisso ${id} non esiste (forse è stato eliminato da un altro dispositivo).`);
  return r;
}

/** La categoria `id`, o 404 `categoria-non-trovata`. */
function categoria(id: number): RigaCategoria {
  const r = prepared('SELECT id, nome, ordine, creato_il, aggiornato_il FROM utente.categoria_appunti WHERE id = ?').get(id) as RigaCategoria | undefined;
  if (!r) throw httpErrors.notFound('categoria-non-trovata', `La categoria ${id} degli appunti fissi non esiste (forse è stata eliminata da un altro dispositivo).`);
  return r;
}
/** Controlla che il gruppo esista: null (senza categoria) c'è sempre. */
const gruppo = (categoriaId: number | null): void => { if (categoriaId !== null) categoria(categoriaId); };

/** Gli id degli appunti di un gruppo, nel loro ordine. */
const idsDelGruppo = (categoriaId: number | null): number[] =>
  prepared('SELECT id FROM utente.appunto_fisso WHERE categoria_id IS ? ORDER BY ordine, id').pluck().all(categoriaId) as number[];

/** Scrive un gruppo: gli appunti `ids`, in quest'ordine da 0, nella categoria `categoriaId`. Tocca solo le righe che cambiano. */
function scriviGruppo(categoriaId: number | null, ids: readonly number[]): void {
  const aggiorna = prepared('UPDATE utente.appunto_fisso SET categoria_id = ?, ordine = ? WHERE id = ? AND (ordine <> ? OR categoria_id IS NOT ?)');
  ids.forEach((id, i) => aggiorna.run(categoriaId, i, id, i, categoriaId));
}

/** Rimette l'ordine delle categorie da 0 senza buchi, nell'ordine `ids` (di adesso, se manca). */
function scriviCategorie(ids: readonly number[] = prepared('SELECT id FROM utente.categoria_appunti ORDER BY ordine, id').pluck().all() as number[]): void {
  const aggiorna = prepared('UPDATE utente.categoria_appunti SET ordine = ? WHERE id = ? AND ordine <> ?');
  ids.forEach((id, i) => aggiorna.run(i, id, i));
}

/** Toglie l'appunto dal suo gruppo (che si ricompatta) e lo mette nel gruppo `a` al posto `indice` (oltre la fine: in fondo). */
function spostaRiga(r: RigaAppunto, a: number | null, indice: number): void {
  const partenza = idsDelGruppo(r.categoria_id).filter((x) => x !== r.id);
  const arrivo = a === r.categoria_id ? [...partenza] : idsDelGruppo(a);
  arrivo.splice(Math.min(indice, arrivo.length), 0, r.id);
  if (a !== r.categoria_id) scriviGruppo(r.categoria_id, partenza);
  scriviGruppo(a, arrivo);
}

/** Il nome per il confronto: minuscolo e senza accenti («Scuola» e «scuola», «Città» e «citta» sono lo stesso nome). */
const perConfronto = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('it');
/** 409 `categoria-esistente` se un'altra categoria ha già questo nome. */
function nomeLibero(nome: string, tranne?: number): void {
  const n = perConfronto(nome);
  const uguale = (prepared(SQL_CATEGORIE).all() as RigaCategoria[]).find((c) => c.id !== tranne && perConfronto(c.nome) === n);
  if (uguale) throw httpErrors.conflict('categoria-esistente', `C’è già la categoria «${uguale.nome}»: scegli un altro nome.`);
}

/** Le categorie nel loro ordine e tutti gli appunti, ognuno nell'ordine del suo gruppo. */
export function elencoAppuntiFissi(): AppuntiFissiDto {
  return { categorie: (prepared(SQL_CATEGORIE).all() as RigaCategoria[]).map(dtoCategoria), appunti: (prepared(SQL_ELENCO).all() as RigaAppunto[]).map(dto) };
}

/** Un appunto nuovo, in fondo al suo gruppo. 409 `troppi-appunti` oltre il limite, 404 se la categoria non c'è. */
export function creaAppuntoFisso(d: NuovoAppuntoFisso): AppuntoFissoDto {
  return getDb().transaction(() => {
    const n = prepared('SELECT COUNT(*) FROM utente.appunto_fisso').pluck().get() as number;
    if (n >= LIMITE_APPUNTI) throw httpErrors.conflict('troppi-appunti', `Si possono tenere al massimo ${LIMITE_APPUNTI} appunti fissi: eliminane qualcuno prima di aggiungerne altri.`);
    const cat = d.categoriaId ?? null;
    gruppo(cat);
    const ora = nowIso();
    const esito = prepared('INSERT INTO utente.appunto_fisso (titolo, testo, categoria_id, ordine, creato_il, aggiornato_il) VALUES (?, ?, ?, ?, ?, ?)')
      .run(d.titolo, d.testo, cat, idsDelGruppo(cat).length, ora, ora);
    return dto(riga(Number(esito.lastInsertRowid)));
  })();
}

/** Cambia titolo, testo e/o categoria di un appunto (404 se non c'è): una categoria diversa lo porta in fondo a quel gruppo. */
export function modificaAppuntoFisso(id: number, d: ModificaAppuntoFisso): AppuntoFissoDto {
  return getDb().transaction(() => {
    const r = riga(id);
    const titolo = d.titolo ?? r.titolo, testo = d.testo ?? r.testo;
    if (titolo !== r.titolo || testo !== r.testo) prepared('UPDATE utente.appunto_fisso SET titolo = ?, testo = ?, aggiornato_il = ? WHERE id = ?').run(titolo, testo, nowIso(), id);
    if (d.categoriaId !== undefined && d.categoriaId !== r.categoria_id) {
      gruppo(d.categoriaId);
      spostaRiga(r, d.categoriaId, Number.MAX_SAFE_INTEGER);
    }
    return dto(riga(id));
  })();
}

/** Elimina un appunto (404 se non c'è) e ricompatta il suo gruppo. */
export function eliminaAppuntoFisso(id: number): void {
  getDb().transaction(() => {
    const r = riga(id);
    prepared('DELETE FROM utente.appunto_fisso WHERE id = ?').run(id);
    scriviGruppo(r.categoria_id, idsDelGruppo(r.categoria_id));
  })();
}

/** Sposta un appunto nel gruppo e al posto dati (404 se l'appunto o la categoria non ci sono più). Restituisce tutto l'elenco. */
export function spostaAppuntoFisso(id: number, p: PostoAppuntoFisso): AppuntiFissiDto {
  return getDb().transaction(() => {
    const r = riga(id);
    gruppo(p.categoriaId);
    spostaRiga(r, p.categoriaId, p.indice);
    return elencoAppuntiFissi();
  })();
}

/** Una categoria nuova, in fondo alle categorie. 409 `troppe-categorie` oltre il limite, 409 `categoria-esistente` con un nome già usato. */
export function creaCategoriaAppunti(nome: string): CategoriaAppuntiDto {
  return getDb().transaction(() => {
    const n = prepared('SELECT COUNT(*) FROM utente.categoria_appunti').pluck().get() as number;
    if (n >= LIMITE_CATEGORIE) throw httpErrors.conflict('troppe-categorie', `Si possono tenere al massimo ${LIMITE_CATEGORIE} categorie: eliminane qualcuna prima di aggiungerne altre.`);
    nomeLibero(nome);
    const ora = nowIso();
    const esito = prepared('INSERT INTO utente.categoria_appunti (nome, ordine, creato_il, aggiornato_il) VALUES (?, ?, ?, ?)').run(nome, n, ora, ora);
    return dtoCategoria(categoria(Number(esito.lastInsertRowid)));
  })();
}

/** Rinomina una categoria (404 se non c'è, 409 `categoria-esistente` con il nome di un'altra). */
export function rinominaCategoriaAppunti(id: number, nome: string): CategoriaAppuntiDto {
  return getDb().transaction(() => {
    const c = categoria(id);
    if (nome !== c.nome) {
      nomeLibero(nome, id);
      prepared('UPDATE utente.categoria_appunti SET nome = ?, aggiornato_il = ? WHERE id = ?').run(nome, nowIso(), id);
    }
    return dtoCategoria(categoria(id));
  })();
}

/** Elimina una categoria (404 se non c'è): i suoi appunti vanno in fondo alla lista senza categoria, nel loro ordine. Restituisce tutto l'elenco. */
export function eliminaCategoriaAppunti(id: number): AppuntiFissiDto {
  return getDb().transaction(() => {
    categoria(id);
    scriviGruppo(null, [...idsDelGruppo(null), ...idsDelGruppo(id)]);
    prepared('DELETE FROM utente.categoria_appunti WHERE id = ?').run(id);
    scriviCategorie();
    return elencoAppuntiFissi();
  })();
}

/** Sposta una categoria al posto `indice` fra le categorie (oltre la fine: in fondo). Restituisce tutto l'elenco. */
export function spostaCategoriaAppunti(id: number, indice: number): AppuntiFissiDto {
  return getDb().transaction(() => {
    categoria(id);
    const ids = (prepared('SELECT id FROM utente.categoria_appunti ORDER BY ordine, id').pluck().all() as number[]).filter((x) => x !== id);
    ids.splice(Math.min(indice, ids.length), 0, id);
    scriviCategorie(ids);
    return elencoAppuntiFissi();
  })();
}
