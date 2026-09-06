import { schedeContenutiGuida } from './mappeService.js';
import { prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { chiaveMappa, idMappa, nomePercorso } from './percorsiMappe.js';
import type { ContenutiMappaDto, DestinazioneGuidaDto, PuntoGuidaMappaDto, RisoluzioneMappaDto } from '../../../shared/organizzazioneMappe.js';

export function destinazioneGuida(area: string): DestinazioneGuidaDto | null {
  const r = prepared('SELECT a.chiave,a.dungeon_chiave,COALESCE(g.nome,a.nome) nome FROM dungeon_area a LEFT JOIN guida_mappa g ON g.area_chiave=a.chiave WHERE a.chiave=?').get(area) as { chiave: string; dungeon_chiave: string; nome: string } | undefined;
  if (!r) return null;
  const radici = prepared("SELECT chiave FROM mappa WHERE entita_tipo='dungeon' AND entita_chiave=?").all(r.dungeon_chiave) as Array<{ chiave: string }>;
  if (radici.length !== 1) return null;
  return { area, dungeon: r.dungeon_chiave, mappaPalazzo: chiaveMappa(radici[0].chiave), nome: r.nome };
}

export function risolviPercorsoMappa(chiave: string): RisoluzioneMappaDto {
  const guida = prepared('SELECT area_chiave FROM guida_alias WHERE chiave=?').get(chiave) as { area_chiave: string } | undefined;
  if (guida) {
    const d = destinazioneGuida(guida.area_chiave);
    if (d) return { tipo: 'guida', ...d };
  }
  const mappa = idMappa(chiave);
  if (!prepared('SELECT 1 FROM mappa WHERE chiave=?').get(mappa)) throw httpErrors.notFound('mappa-non-trovata','La mappa o il contenuto richiesto non esiste.');
  return { tipo: 'mappa', mappa: chiaveMappa(mappa) };
}

export function contenutiMappa(chiave: string, partitaId?:number): ContenutiMappaDto {
  const schede=schedeContenutiGuida(partitaId);
  const mappa = idMappa(chiave);
  const m = prepared('SELECT entita_tipo,entita_chiave FROM mappa WHERE chiave=?').get(mappa) as { entita_tipo: string; entita_chiave: string } | undefined;
  if (!m) throw httpErrors.notFound('mappa-non-trovata','La mappa richiesta non esiste.');
  const aree = prepared(`SELECT a.*,COALESCE(g.nome,a.nome) nome_visibile,COALESCE(g.note,'') note
    FROM dungeon_area a LEFT JOIN guida_mappa g ON g.area_chiave=a.chiave
    WHERE (?='dungeon' AND a.dungeon_chiave=?) OR EXISTS(SELECT 1 FROM mappa_entita e WHERE e.mappa_chiave=? AND e.entita_tipo='area' AND e.entita_chiave=a.chiave)
    ORDER BY a.ordine,a.chiave`).all(m.entita_tipo,m.entita_chiave,mappa) as Array<{ chiave: string; nome_visibile: string; descrizione: string; note: string }>;
  return { mappa: chiaveMappa(mappa), aree: aree.map(a => ({ chiave: a.chiave, nome: a.nome_visibile, descrizione: a.descrizione, note: a.note,
    collegamenti: (prepared("SELECT id FROM spillo WHERE area_guida_chiave=? AND ruolo_guida='sezione' ORDER BY ordine,id").all(a.chiave) as Array<{id:number}>).map(s=>schede.get(s.id)!),
    punti: (prepared("SELECT id,nome,descrizione,tipo,riferimento_tipo,riferimento_chiave,collezionabile,solo_posizione,ruolo_guida FROM spillo WHERE area_guida_chiave=? AND ruolo_guida='punto' ORDER BY ordine,id").all(a.chiave) as Array<{ id: number; nome: string; descrizione: string; tipo: string; riferimento_tipo: string | null; riferimento_chiave: string | null; collezionabile: number; solo_posizione: number; ruolo_guida: 'punto' | 'sezione' }>).map((s): PuntoGuidaMappaDto => ({ scheda:schede.get(s.id),id:s.id,nome:s.nome,descrizione:s.descrizione,tipo:s.tipo,riferimento:s.riferimento_tipo&&s.riferimento_chiave?{tipo:s.riferimento_tipo,chiave:s.riferimento_chiave}:null,collezionabile:s.collezionabile===1,soloPosizione:s.solo_posizione===1,ruolo:s.ruolo_guida })).concat((prepared(`SELECT p.chiave,p.nome,p.descrizione,p.tipo,p.esauribile FROM punto_interesse p WHERE p.area_chiave=? AND NOT EXISTS(SELECT 1 FROM spillo s WHERE s.area_guida_chiave=p.area_chiave AND s.riferimento_tipo='punto' AND s.riferimento_chiave=p.chiave) ORDER BY p.ordine,p.chiave`).all(a.chiave) as Array<{chiave:string;nome:string;descrizione:string;tipo:string;esauribile:number}>).map((p):PuntoGuidaMappaDto=>({id:'punto:'+p.chiave,nome:p.nome,descrizione:p.descrizione,tipo:p.tipo,riferimento:{tipo:'punto',chiave:p.chiave},collezionabile:p.esauribile===1,soloPosizione:false,ruolo:'punto'}))),
    mappe: (prepared("SELECT m.chiave FROM mappa_entita e JOIN mappa m ON m.chiave=e.mappa_chiave WHERE e.entita_tipo='area' AND e.entita_chiave=? ORDER BY m.ordine,m.chiave").all(a.chiave) as Array<{ chiave: string }>).map(x => ({ chiave: chiaveMappa(x.chiave), nome: nomePercorso(x.chiave) })) })) };
}
