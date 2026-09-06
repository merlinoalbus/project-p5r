import { destinazioneGuida, risolviPercorsoMappa } from './contenutiGuidaService.js';
import type { DestinazioneGuidaDto } from '../../../shared/organizzazioneMappe.js';
import { prepared } from '../../db/dbService.js';
import { httpErrors } from '../../utils/httpError.js';
import { chiaveMappa, idMappa, nomePercorso } from './percorsiMappe.js';
import type { AccessoMondoDto, DestinazioneMondoDto, TipoAccessoMondo } from '../../../shared/accessoMondo.js';

const TABELLE: Record<TipoAccessoMondo, string> = {
  mappa: 'mappa', quartiere: 'quartiere', dungeon: 'dungeon', area: 'dungeon_area',
  luogo: 'luogo', negozio: 'negozio', punto: 'punto_interesse', confidente: 'confidente', articolo: 'articolo',
  attivita: 'attivita',
};

/** Risolve soltanto associazioni registrate, senza scegliere una mappa per somiglianza del nome. */
export function risolviAccessoMondo(tipo: TipoAccessoMondo, chiave: string): AccessoMondoDto {
  const richiesta = { tipo, chiave };
  if (tipo === 'mappa') {
    const risolta = risolviPercorsoMappa(chiave);
    if (risolta.tipo === 'guida') return { entita: richiesta, esito: 'assente', destinazioni: [], guide: [{ area: risolta.area,dungeon:risolta.dungeon,mappaPalazzo:risolta.mappaPalazzo,nome:risolta.nome }] };
    chiave = idMappa(chiave);
  }
  const guide = new Map<string, DestinazioneGuidaDto>();
  const aggiungiGuida = (area: string) => { const d=destinazioneGuida(area); if(d) guide.set(area,d); };
  if (tipo === 'area') aggiungiGuida(chiave);
  if (tipo === 'punto') { const a=prepared('SELECT area_chiave FROM punto_interesse WHERE chiave=?').get(chiave) as { area_chiave: string } | undefined; if(a) aggiungiGuida(a.area_chiave); }
  const filtro = tipo === 'articolo' || tipo === 'negozio' ? ' AND nascosto = 0' : '';
  if (!prepared(`SELECT 1 FROM ${TABELLE[tipo]} WHERE chiave = ?${filtro}`).get(chiave)) {
    throw httpErrors.notFound('luogo-non-trovato', 'L’entità richiesta non esiste o è stata rimossa.');
  }
  const destinazioni = new Map<string, DestinazioneMondoDto>();
  function aggiungi(mappa: string, spillo: number | null, nomeSpillo: string | null,
    criterio: DestinazioneMondoDto['provenienze'][number]['criterio'],
    riferimento: { tipo: TipoAccessoMondo; chiave: string }, centro: DestinazioneMondoDto['centro'] = null) {
    if (!prepared('SELECT 1 FROM mappa WHERE chiave = ?').get(mappa)) return;
    const k = `${mappa}:${spillo ?? ''}`;
    const provenienza = { ...riferimento, criterio };
    const presente = destinazioni.get(k);
    if (presente) {
      if (!presente.provenienze.some(p => p.tipo === provenienza.tipo && p.chiave === provenienza.chiave && p.criterio === criterio)) presente.provenienze.push(provenienza);
      return;
    }
    destinazioni.set(k, { mappa: chiaveMappa(mappa), nomeMappa: nomePercorso(mappa), spillo, nomeSpillo, centro, provenienze: [provenienza] });
  }
  if (tipo === 'mappa') {
    aggiungi(chiave, null, null, 'mappa-diretta', richiesta);
  } else {
    // Un ingresso configurato è una scelta esplicita per il quartiere, non per i suoi negozi.
    const ingresso = tipo === 'quartiere' ? prepared('SELECT mappa_chiave,x,y,zoom FROM quartiere_ingresso WHERE quartiere_chiave = ?').get(chiave) as { mappa_chiave: string; x: number; y: number; zoom: number } | undefined : undefined;
    if (ingresso) {
      aggiungi(ingresso.mappa_chiave, null, null, 'ingresso-quartiere', richiesta, { x: ingresso.x, y: ingresso.y, zoom: ingresso.zoom });
    } else {
      const riferimenti: Array<{ tipo: TipoAccessoMondo; chiave: string }> = [{ tipo, chiave }];
      if (tipo === 'luogo') {
        const n = prepared('SELECT n.chiave FROM luogo l JOIN negozio n ON n.chiave=l.negozio WHERE l.chiave=? AND n.nascosto=0').get(chiave) as { chiave: string } | undefined;
        if (n) riferimenti.push({ tipo: 'negozio', chiave: n.chiave });
      }
      // Un'attività si svolge in un luogo, e la scheda ne registra il quartiere. Dentro quel
      // quartiere il luogo è quello che porta il suo stesso nome — quando ce n'è esattamente uno:
      // altrimenti resta il quartiere, che è comunque un posto sulla mappa.
      if (tipo === 'attivita') {
        const a = prepared('SELECT nome, luogo_chiave FROM attivita WHERE chiave = ?').get(chiave) as { nome: string; luogo_chiave: string | null } | undefined;
        if (a?.luogo_chiave) {
          const cerca = (sql: string) => prepared(sql).all(a.luogo_chiave, a.nome) as Array<{ chiave: string }>;
          // prima il nome uguale, poi il nome contenuto: «Freccette» sta dentro «Penguin Sniper
          // (Freccette e Biliardo)». Vale solo quando il quartiere ne ha esattamente uno.
          const esatti = cerca('SELECT chiave FROM luogo WHERE quartiere_chiave = ? AND lower(nome) = lower(?)');
          const contenuti = esatti.length === 1 ? esatti
            : cerca("SELECT chiave FROM luogo WHERE quartiere_chiave = ? AND lower(nome) LIKE '%' || lower(?) || '%'");
          if (contenuti.length === 1) riferimenti.push({ tipo: 'luogo', chiave: contenuti[0].chiave });
          if (prepared('SELECT 1 FROM quartiere WHERE chiave = ?').get(a.luogo_chiave)) riferimenti.push({ tipo: 'quartiere', chiave: a.luogo_chiave });
        }
      }
      // Un confidente si incontra in luoghi precisi, e il catalogo li elenca: sono quelli, non
      // una somiglianza di nome.
      if (tipo === 'confidente') {
        for (const l of prepared("SELECT chiave FROM luogo WHERE confidenti_json IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(luogo.confidenti_json) WHERE value = ?) ORDER BY chiave").all(chiave) as Array<{ chiave: string }>) {
          riferimenti.push({ tipo: 'luogo', chiave: l.chiave });
        }
      }
      if (tipo === 'articolo') {
        const n = prepared('SELECT a.negozio_chiave FROM articolo a JOIN negozio n ON n.chiave=a.negozio_chiave WHERE a.chiave=? AND n.nascosto=0').get(chiave) as { negozio_chiave: string } | undefined;
        if (n) riferimenti.push({ tipo: 'negozio', chiave: n.negozio_chiave });
      }
      // Il legame luogo.negozio è un riferimento strutturato al catalogo.
      for (const n of riferimenti.filter(r => r.tipo === 'negozio')) {
        for (const l of prepared('SELECT chiave FROM luogo WHERE negozio = ? ORDER BY chiave').all(n.chiave) as Array<{ chiave: string }>) riferimenti.push({ tipo: 'luogo', chiave: l.chiave });
      }
      for (const r of riferimenti) {
        for (const s of prepared('SELECT s.id,s.nome,s.mappa_chiave FROM spillo s JOIN mappa m ON m.chiave=s.mappa_chiave WHERE s.riferimento_tipo=? AND s.riferimento_chiave=? ORDER BY s.mappa_chiave,s.ordine,s.id').all(r.tipo, r.chiave) as Array<{ id: number; nome: string; mappa_chiave: string }>) {
          aggiungi(s.mappa_chiave, s.id, s.nome, 'riferimento-spillo', r);
        }
        for (const m of prepared('SELECT chiave FROM mappa WHERE entita_tipo=? AND entita_chiave=? ORDER BY chiave').all(r.tipo, r.chiave) as Array<{ chiave: string }>) aggiungi(m.chiave, null, null, 'entita-mappa', r);
        for (const m of prepared('SELECT mappa_chiave AS chiave FROM mappa_entita WHERE entita_tipo=? AND entita_chiave=? ORDER BY mappa_chiave').all(r.tipo,r.chiave) as Array<{chiave:string}>) aggiungi(m.chiave,null,null,'entita-mappa',r);
      }
      // Se una mappa contiene già il pin esatto, l'accesso generico alla stessa mappa non è una seconda destinazione.
      for (const [k, d] of destinazioni) {
        if (d.spillo === null && [...destinazioni.values()].some(v => v.mappa === d.mappa && v.spillo !== null)) {
          for (const v of destinazioni.values()) if (v.mappa === d.mappa && v.spillo !== null) v.provenienze.push(...d.provenienze);
          destinazioni.delete(k);
        }
      }
    }
  }
  const elenco = [...destinazioni.values()];
  return { entita: richiesta, esito: elenco.length === 0 ? 'assente' : elenco.length === 1 ? 'unica' : 'multipla', destinazioni: elenco, ...(guide.size?{guide:[...guide.values()]}:{}) };
}
