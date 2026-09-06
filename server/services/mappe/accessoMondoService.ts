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
  let ripiego = false;
  function aggiungi(mappa: string, spillo: number | null, nomeSpillo: string | null,
    criterio: DestinazioneMondoDto['provenienze'][number]['criterio'],
    riferimento: { tipo: TipoAccessoMondo; chiave: string }, centro: DestinazioneMondoDto['centro'] = null) {
    // Un accesso trovato solo allargando al posto dichiarato va detto per quello che è: porta nel
    // quartiere o nel Palazzo giusto, non sul punto esatto.
    if (ripiego && criterio === 'entita-mappa') criterio = 'posto-dichiarato';
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
        // Un'attività dichiara dove si svolge, e quel campo è l'unica associazione registrata che
        // abbia: si usa quella. Cercare il luogo per somiglianza del nome — «Freccette» dentro
        // «Penguin Sniper (Freccette e Biliardo)» — porterebbe al posto giusto per caso e a quello
        // sbagliato al primo nome che cambia, e contraddirebbe il contratto di questa funzione.
        const a = prepared('SELECT luogo_chiave FROM attivita WHERE chiave = ?').get(chiave) as { luogo_chiave: string | null } | undefined;
        if (a?.luogo_chiave) {
          if (prepared('SELECT 1 FROM luogo WHERE chiave = ?').get(a.luogo_chiave)) riferimenti.push({ tipo: 'luogo', chiave: a.luogo_chiave });
          else if (prepared('SELECT 1 FROM quartiere WHERE chiave = ?').get(a.luogo_chiave)) riferimenti.push({ tipo: 'quartiere', chiave: a.luogo_chiave });
        }
      }
      // Un confidente si incontra in luoghi precisi, e il catalogo li elenca: sono quelli, non
      // una somiglianza di nome.
      if (tipo === 'confidente') {
        for (const l of prepared("SELECT chiave FROM luogo WHERE confidenti_json IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(luogo.confidenti_json) WHERE value = ?) ORDER BY chiave").all(chiave) as Array<{ chiave: string }>) {
          riferimenti.push({ tipo: 'luogo', chiave: l.chiave });
        }
      }
      // Un punto di interesse sta in un'area della guida, e l'area — quando una planimetria la
      // dichiara — è un posto sulla mappa. È un'associazione registrata, non una somiglianza: il
      // punto porta dove porta la sua area. I pin che riferiscono i punti hanno tutti
      // `mappa_chiave` nullo, quindi senza questo passo un punto non arriverebbe da nessuna parte.
      if (tipo === 'punto') {
        const a = prepared('SELECT area_chiave FROM punto_interesse WHERE chiave = ?').get(chiave) as { area_chiave: string | null } | undefined;
        if (a?.area_chiave) riferimenti.push({ tipo: 'area', chiave: a.area_chiave });
      }
      if (tipo === 'articolo') {
        const n = prepared('SELECT a.negozio_chiave FROM articolo a JOIN negozio n ON n.chiave=a.negozio_chiave WHERE a.chiave=? AND n.nascosto=0').get(chiave) as { negozio_chiave: string } | undefined;
        if (n) riferimenti.push({ tipo: 'negozio', chiave: n.negozio_chiave });
      }
      // singola area non ha una planimetria propria — succede per trecentonove punti — arrivare
      // al Palazzo giusto è comunque arrivare nel posto, e da lì la mappa d'insieme mostra dove.
      for (const a of [...riferimenti].filter(r => r.tipo === 'area')) {
        const d = prepared('SELECT dungeon_chiave FROM dungeon_area WHERE chiave = ?').get(a.chiave) as { dungeon_chiave: string | null } | undefined;
        if (d?.dungeon_chiave && !riferimenti.some(r => r.tipo === 'dungeon' && r.chiave === d.dungeon_chiave)) {
          riferimenti.push({ tipo: 'dungeon', chiave: d.dungeon_chiave });
        }
      }
      // un quartiere del catalogo. Nove negozi non hanno un luogo che li ospiti — un venditore
      // ambulante, un negozio dentro un Palazzo, uno online — e senza questo passo resterebbero
      // irraggiungibili pur avendo un indirizzo scritto.
      for (const n of [...riferimenti].filter(r => r.tipo === 'negozio')) {
        const d = prepared('SELECT luogo_chiave FROM negozio WHERE chiave = ?').get(n.chiave) as { luogo_chiave: string | null } | undefined;
        if (d?.luogo_chiave && prepared('SELECT 1 FROM quartiere WHERE chiave = ?').get(d.luogo_chiave)
            && !riferimenti.some(r => r.tipo === 'quartiere' && r.chiave === d.luogo_chiave)) {
          riferimenti.push({ tipo: 'quartiere', chiave: d.luogo_chiave });
        }
      }
      // il suo pin la destinazione precisa vince comunque — il passo più sotto toglie l'accesso
      // generico quando sulla stessa mappa c'è già il pin esatto — ma dove il pin manca è meglio
      // arrivare al quartiere giusto che non arrivare affatto.
      for (const l of [...riferimenti].filter(r => r.tipo === 'luogo')) {
        const q = prepared('SELECT quartiere_chiave FROM luogo WHERE chiave = ?').get(l.chiave) as { quartiere_chiave: string | null } | undefined;
        if (q?.quartiere_chiave && !riferimenti.some(r => r.tipo === 'quartiere' && r.chiave === q.quartiere_chiave)) {
          riferimenti.push({ tipo: 'quartiere', chiave: q.quartiere_chiave });
        }
      }
      // Il legame luogo.negozio è un riferimento strutturato al catalogo.
      for (const n of riferimenti.filter(r => r.tipo === 'negozio')) {
        for (const l of prepared('SELECT chiave FROM luogo WHERE negozio = ? ORDER BY chiave').all(n.chiave) as Array<{ chiave: string }>) riferimenti.push({ tipo: 'luogo', chiave: l.chiave });
      }
      const cerca = () => {
        for (const r of riferimenti) {
          for (const s of prepared('SELECT s.id,s.nome,s.mappa_chiave FROM spillo s JOIN mappa m ON m.chiave=s.mappa_chiave WHERE s.riferimento_tipo=? AND s.riferimento_chiave=? ORDER BY s.mappa_chiave,s.ordine,s.id').all(r.tipo, r.chiave) as Array<{ id: number; nome: string; mappa_chiave: string }>) {
            aggiungi(s.mappa_chiave, s.id, s.nome, 'riferimento-spillo', r);
          }
          for (const m of prepared('SELECT chiave FROM mappa WHERE entita_tipo=? AND entita_chiave=? ORDER BY chiave').all(r.tipo, r.chiave) as Array<{ chiave: string }>) aggiungi(m.chiave, null, null, 'entita-mappa', r);
          for (const m of prepared('SELECT mappa_chiave AS chiave FROM mappa_entita WHERE entita_tipo=? AND entita_chiave=? ORDER BY mappa_chiave').all(r.tipo,r.chiave) as Array<{chiave:string}>) aggiungi(m.chiave,null,null,'entita-mappa',r);
        }
      };
      cerca();
      // Solo se le associazioni dirette non hanno portato da nessuna parte si allarga al posto
      // che l'entità dichiara: il quartiere di un luogo o di un negozio, il Palazzo di un'area.
      // Allargare sempre aggiungerebbe una seconda destinazione generica accanto al pin esatto,
      // che è il contrario di quello che serve — arrivare nel punto giusto.
      if (destinazioni.size === 0) {
        ripiego = true;
        // Un'area appartiene a un Palazzo, e ogni Palazzo la sua mappa d'insieme ce l'ha.
        for (const a of [...riferimenti].filter(r => r.tipo === 'area')) {
          const d = prepared('SELECT dungeon_chiave FROM dungeon_area WHERE chiave = ?').get(a.chiave) as { dungeon_chiave: string | null } | undefined;
          if (d?.dungeon_chiave && !riferimenti.some(r => r.tipo === 'dungeon' && r.chiave === d.dungeon_chiave)) {
            riferimenti.push({ tipo: 'dungeon', chiave: d.dungeon_chiave });
          }
        }
        // Un negozio dichiara dove sta, e in quarantatré casi su quarantasette quel campo è un
        // quartiere del catalogo: nove negozi non hanno un luogo che li ospiti — un venditore
        // ambulante, uno dentro un Palazzo, uno online — e senza questo resterebbero irraggiungibili.
        for (const n of [...riferimenti].filter(r => r.tipo === 'negozio')) {
          const d = prepared('SELECT luogo_chiave FROM negozio WHERE chiave = ?').get(n.chiave) as { luogo_chiave: string | null } | undefined;
          if (d?.luogo_chiave && prepared('SELECT 1 FROM quartiere WHERE chiave = ?').get(d.luogo_chiave)
              && !riferimenti.some(r => r.tipo === 'quartiere' && r.chiave === d.luogo_chiave)) {
            riferimenti.push({ tipo: 'quartiere', chiave: d.luogo_chiave });
          }
        }
        // Un luogo sta in un quartiere, e il quartiere una mappa ce l'ha sempre.
        for (const l of [...riferimenti].filter(r => r.tipo === 'luogo')) {
          const q = prepared('SELECT quartiere_chiave FROM luogo WHERE chiave = ?').get(l.chiave) as { quartiere_chiave: string | null } | undefined;
          if (q?.quartiere_chiave && !riferimenti.some(r => r.tipo === 'quartiere' && r.chiave === q.quartiere_chiave)) {
            riferimenti.push({ tipo: 'quartiere', chiave: q.quartiere_chiave });
          }
        }
        cerca();
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
