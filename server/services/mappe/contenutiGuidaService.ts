// ============================================================
// contenutiGuidaService — le sezioni della guida dei Palazzi viste da una mappa: destinazioni, percorsi e contenuti
// ============================================================
//
// Una vecchia mappa d'area (alias in `guida_alias`) oggi è una sezione della guida dentro la mappa del suo
// Palazzo: qui si risolve dove porta un percorso e si compone l'elenco dei contenuti della guida di una
// mappa (aree, collegamenti, punti con i passi degli Enigmi, planimetrie di ogni area).
// ============================================================

import { schedeContenutiGuida } from './mappeService.js';
import { prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { verificaPartita } from '../verificaPartita.js';
import { chiaveMappa, idMappa, nomePercorso } from './percorsiMappe.js';
import { casaDellaMappa, casaDelPalazzo, conCasaSchedaPalazzi, contestoAree, type RigaPerCasa } from './casaMappa.js';
import type { ContenutiMappaDto, DestinazioneGuidaDto, PuntoGuidaMappaDto, RisoluzioneMappaDto } from '../../../shared/organizzazioneMappe.js';
import { categoriaSpillo, spilloPerPunto } from '../../../shared/spilli.js';

/**
 * Dove si apre la sezione di guida di un'infiltrazione: la mappa del suo Palazzo, il nome (quello dell'infiltrazione: da L3 il nome
 * della sezione in `guida_mappa` non si legge più, R3-09) e la casa — la scheda del Palazzo sull'infiltrazione,
 * `/guida/dungeon/<k>?infiltrazione=<i>` (L3 §3.2); per i Memento, che non hanno scheda di Palazzo, il visore com'era (R3-12). Null se
 * l'infiltrazione non esiste o se il Palazzo non ha esattamente una mappa radice.
 */
export function destinazioneGuida(area: string): DestinazioneGuidaDto | null {
  const r = prepared("SELECT a.chiave,a.dungeon_chiave,a.nome,d.tipo FROM dungeon_area a JOIN dungeon d ON d.chiave=a.dungeon_chiave WHERE a.chiave=?").get(area) as { chiave: string; dungeon_chiave: string; nome: string; tipo: string } | undefined;
  if (!r) return null;
  const radici = prepared("SELECT chiave FROM mappa WHERE entita_tipo='dungeon' AND entita_chiave=?").all(r.dungeon_chiave) as Array<{ chiave: string }>;
  if (radici.length !== 1) return null;
  const mappaPalazzo = chiaveMappa(radici[0].chiave);
  // la scheda del Palazzo solo con la casa di L3 accesa (FUN3-1); altrimenti, come per i Memento, il visore com'era
  const casa = r.tipo === 'palazzo' && conCasaSchedaPalazzi() ? `${casaDelPalazzo(r.dungeon_chiave)}?infiltrazione=${encodeURIComponent(area)}` : `/guida/mappe/${encodeURIComponent(mappaPalazzo)}?area=${encodeURIComponent(area)}`;
  return { area, dungeon: r.dungeon_chiave, mappaPalazzo, nome: r.nome, casa };
}

/**
 * Che cosa apre un percorso di mappa: se è l'alias di una vecchia mappa d'area con una destinazione valida, la sezione di
 * guida; altrimenti la mappa con quella chiave (404 se non esiste).
 */
export function risolviPercorsoMappa(chiave: string): RisoluzioneMappaDto {
  const guida = prepared('SELECT area_chiave FROM guida_alias WHERE chiave=?').get(chiave) as { area_chiave: string } | undefined;
  if (guida) {
    const d = destinazioneGuida(guida.area_chiave);
    if (d) return { tipo: 'guida', ...d };
  }
  const mappa = idMappa(chiave);
  const riga = prepared('SELECT * FROM mappa WHERE chiave=?').get(mappa) as RigaPerCasa | undefined;
  if (!riga) throw httpErrors.notFound('mappa-non-trovata','La mappa o il contenuto richiesto non esiste.');
  // L2: la casa della mappa a cui porta la chiave (o l'alias): un alias vecchio di una versione apre l'Area su quella versione
  return { tipo: 'mappa', mappa: chiaveMappa(mappa), casa: casaDellaMappa(riga, contestoAree()) };
}

/**
 * I contenuti della guida di una mappa: le infiltrazioni di tutto il Palazzo se è la sua mappa radice, altrimenti quelle che toccano
 * l'Area della planimetria (L3, `infiltrazione_area`). Per ognuna: i collegamenti (elementi «sezione»), i punti — gli elementi «punto»
 * della guida più le voci che nessun elemento della guida rappresenta già, con i passi degli Enigmi dentro — e le sue planimetrie.
 * Con la partita le schede portano anche il suo stato.
 */
export function contenutiMappa(chiave: string, partitaId?:number): ContenutiMappaDto {
  // come prima: una partita che non esiste è un 404 anche se la mappa non c'è
  if (partitaId) verificaPartita(partitaId);
  const mappa = idMappa(chiave);
  const m = prepared('SELECT entita_tipo,entita_chiave FROM mappa WHERE chiave=?').get(mappa) as { entita_tipo: string; entita_chiave: string } | undefined;
  if (!m) throw httpErrors.notFound('mappa-non-trovata','La mappa richiesta non esiste.');
  // L3: le infiltrazioni di una planimetria sono quelle della sua Area (`infiltrazione_area`), col loro nome (R3-09); le note della
  // sezione di guida restano quelle di `guida_mappa`, che è contenuto della guida e non un legame
  const aree = prepared(`SELECT a.*,a.nome nome_visibile,COALESCE(g.note,'') note
    FROM dungeon_area a LEFT JOIN guida_mappa g ON g.area_chiave=a.chiave
    WHERE (?='dungeon' AND a.dungeon_chiave=?) OR EXISTS(SELECT 1 FROM mappa x JOIN infiltrazione_area ia ON ia.area_chiave=x.area_chiave WHERE x.chiave=? AND ia.infiltrazione_chiave=a.chiave)
    ORDER BY a.ordine,a.chiave`).all(m.entita_tipo,m.entita_chiave,mappa) as Array<{ chiave: string; nome_visibile: string; descrizione: string; note: string }>;
  // le schede servono solo per gli elementi delle aree di questa mappa
  const schede = schedeContenutiGuida(partitaId, aree.map((a) => a.chiave));
  return { mappa: chiaveMappa(mappa), aree: aree.map(a => ({ chiave: a.chiave, nome: a.nome_visibile, descrizione: a.descrizione, note: a.note,
    collegamenti: (prepared("SELECT id FROM spillo WHERE area_guida_chiave=? AND ruolo_guida='sezione' ORDER BY ordine,id").all(a.chiave) as Array<{id:number}>).map(s=>schede.get(s.id)!),
    punti: conPassiDentro((prepared("SELECT id,nome,descrizione,tipo,riferimento_tipo,riferimento_chiave,collezionabile,solo_posizione,ruolo_guida FROM spillo WHERE area_guida_chiave=? AND ruolo_guida='punto' ORDER BY ordine,id").all(a.chiave) as Array<{ id: number; nome: string; descrizione: string; tipo: string; riferimento_tipo: string | null; riferimento_chiave: string | null; collezionabile: number; solo_posizione: number; ruolo_guida: 'punto' | 'sezione' }>).map((s): PuntoGuidaMappaDto => ({ scheda:schede.get(s.id),id:s.id,nome:s.nome,descrizione:s.descrizione,tipo:s.tipo,riferimento:s.riferimento_tipo&&s.riferimento_chiave?{tipo:s.riferimento_tipo,chiave:s.riferimento_chiave}:null,collezionabile:s.collezionabile===1,soloPosizione:s.solo_posizione===1,ruolo:s.ruolo_guida })).concat((prepared(`SELECT p.chiave,p.nome,p.descrizione,p.tipo,p.esauribile FROM punto_interesse p WHERE p.area_chiave=? AND NOT EXISTS(SELECT 1 FROM spillo s WHERE s.area_guida_chiave=p.area_chiave AND s.riferimento_tipo='punto' AND s.riferimento_chiave=p.chiave) ORDER BY p.ordine,p.chiave`).all(a.chiave) as Array<{chiave:string;nome:string;descrizione:string;tipo:string;esauribile:number}>).map((p):PuntoGuidaMappaDto=>({id:'punto:'+p.chiave,nome:p.nome,descrizione:p.descrizione,tipo:p.tipo,riferimento:{tipo:'punto',chiave:p.chiave},collezionabile:p.esauribile===1&&categoriaSpillo(spilloPerPunto(p.tipo))==='consumabile',soloPosizione:false,ruolo:'punto'})))),
    // le planimetrie dell'infiltrazione: tutte quelle delle sue aree, nell'ordine dei legami e delle versioni (L3 §1.2)
    mappe: (prepared("SELECT m.chiave FROM infiltrazione_area ia JOIN mappa m ON m.area_chiave=ia.area_chiave WHERE ia.infiltrazione_chiave=? ORDER BY ia.ordine,ia.area_chiave,m.versione_ordine,m.chiave").all(a.chiave) as Array<{ chiave: string }>).map(x => ({ chiave: chiaveMappa(x.chiave), nome: nomePercorso(x.chiave) })) })) };
}

/**
 * I passi di un Enigma (095) stanno subito sotto di lui, nel loro ordine, con `contenitore` = l'id del suo elemento: così l'elenco
 * dei contenuti della guida li mostra dentro l'Enigma, come la scheda del Palazzo. Un passo il cui Enigma non è fra gli elementi
 * resta dov'è, senza contenitore.
 */
function conPassiDentro(punti: PuntoGuidaMappaDto[]): PuntoGuidaMappaDto[] {
  /** La chiave della voce della guida a cui l'elemento rimanda, o null se non rimanda a una voce. */
  const chiaveDi = (p: PuntoGuidaMappaDto) => (p.riferimento?.tipo === 'punto' ? p.riferimento.chiave : null);
  const idPerChiave = new Map<string, PuntoGuidaMappaDto['id']>();
  for (const p of punti) { const k = chiaveDi(p); if (k && !idPerChiave.has(k)) idPerChiave.set(k, p.id); }
  const righe = idPerChiave.size === 0 ? [] : prepared(`SELECT chiave, contenitore_chiave, ordine FROM punto_interesse WHERE chiave IN (${[...idPerChiave.keys()].map(() => '?').join(',')})`).all(...idPerChiave.keys()) as Array<{ chiave: string; contenitore_chiave: string | null; ordine: number }>;
  const info = new Map(righe.map((r) => [r.chiave, r]));
  /** L'id dell'elemento del suo Enigma, se la voce è un passo e l'Enigma è fra gli elementi; altrimenti null. */
  const contenitoreDi = (p: PuntoGuidaMappaDto) => { const k = chiaveDi(p); const c = k ? info.get(k)?.contenitore_chiave ?? null : null; return c !== null && idPerChiave.has(c) ? idPerChiave.get(c)! : null; };
  const passiPer = new Map<PuntoGuidaMappaDto['id'], PuntoGuidaMappaDto[]>();
  const cima: PuntoGuidaMappaDto[] = [];
  for (const p of punti) {
    const c = contenitoreDi(p);
    if (c === null) cima.push({ ...p, contenitore: null });
    else passiPer.set(c, [...(passiPer.get(c) ?? []), { ...p, contenitore: c }]);
  }
  /** L'ordine della voce nella guida, per mettere i passi nel loro ordine (0 se l'elemento non è una voce). */
  const ordineDi = (p: PuntoGuidaMappaDto) => info.get(chiaveDi(p) ?? '')?.ordine ?? 0;
  return cima.flatMap((p) => [p, ...(passiPer.get(p.id) ?? []).sort((a, b) => ordineDi(a) - ordineDi(b))]);
}
