import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import manifest from '../../shared/tanakaConfronto.json' with { type: 'json' };
import type { ConfrontoTanakaDto } from '../../shared/tanakaSnapshot.js';
import type { RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { getDb } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { condizioneSpillo } from '../schemas/mappe.js';
import { rettificaPropostaOggetto } from '../schemas/catalogoOggetti.js';
import { noteStoricheDi } from './noteStoricheService.js';
import { snapshotFonteProposta, type ChiaveProposta } from './snapshotProposteOggetti.js';

type Riga = Record<string, unknown>;
const record = (v: unknown): Riga | null => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Riga : null;
const parse = (v: unknown): unknown => { if (typeof v !== 'string') return undefined; try { return JSON.parse(v) as unknown; } catch { return undefined; } };
function formulaValida(raw: unknown): boolean {
  const v = raw === null ? null : parse(raw);
  if (v === null) return true; // null è esplicito; non si confonde con JSON illeggibile o campo assente.
  return Array.isArray(v) && v.every(c => { const esito = condizioneSpillo.safeParse(c); return esito.success && isDeepStrictEqual(c, esito.data); });
}
const chiavi = new Set([...manifest.chiaviCorrenti, ...manifest.royal.map(r => r.chiave)]);
const foto124 = [{ tipo: 'data', dal: '10-01' }, { tipo: 'articolo', articolo: 'yumenoshima/laptop-rotto' }, { tipo: 'articolo', articolo: 'akiba/set-di-strumenti-da-pc' }];
const sblocco124 = [{ tipo: 'evento', evento: 'laptop-riparato' }];
const gruppi124 = [
  [null, ['black-stone', 'condenser-lens', 'five-inch-nail', 'gemme-elementali', 'inspired-hand-mirror', 'nirvana-ring']],
  ['nero', ['black-robe', 'hercules-anklet', 'heros-eyepatch']],
  ['oscuro', ['atom-match', 'black-kogatana', 'holy-cloth', 'magic-rosary', 'ouija-board', 'retribution-mirror']],
  ['caos', ['crown-of-salvation', 'dispel-ring', 'homunculus', 'model-gun', 'roland-medal']],
] as const;
const grado = (rango: string | null): RequisitoSpillo[] => rango === null || rango === 'iniziale' ? []
  : [{ tipo: 'rango-cliente', negozio: manifest.negozio, rango: rango as 'nero' | 'oscuro' | 'caos' }];

/** La scelta alternativa e la rimozione manuale non devono aggirare la decisione unitaria. */
export function fonteTanaka(p: { riga_tipo: string; riga_chiave: string; modifica_json?: string | null }): boolean {
  const k = p.riga_tipo === 'ricompensa' && p.riga_chiave.startsWith('articolo/') ? p.riga_chiave.slice(9)
    : p.riga_tipo === 'articolo' ? p.riga_chiave : null;
  if (k === null) return false;
  if (chiavi.has(k)) return true;
  const db = getDb();
  if ((db.prepare('SELECT negozio_chiave FROM articolo WHERE chiave = ?').get(k) as Riga | undefined)?.negozio_chiave === manifest.negozio) return true;
  const payloads = [p.modifica_json, ...(db.prepare("SELECT modifica_json FROM proposta_abbinamento WHERE (riga_tipo = 'articolo' AND riga_chiave = ?) OR (riga_tipo = 'ricompensa' AND riga_chiave = ?)").all(k, `articolo/${k}`) as Array<{ modifica_json: string | null }>).map(r => r.modifica_json)];
  return payloads.some(raw => { const m = record(parse(raw)); return m?.negozio === manifest.negozio || record(m?.prima)?.negozio_chiave === manifest.negozio; });
}
export function vietaConfermaTanaka(p: Parameters<typeof fonteTanaka>[0]): void {
  if (fonteTanaka(p)) throw httpErrors.conflict('tanaka-decisione-unitaria-richiesta',
    'Il listino di Tanaka richiede una sola decisione sul confronto completo. Questa proposta individuale non può essere applicata, neppure scegliendo un altro oggetto.');
}

export function confrontoTanaka(): ConfrontoTanakaDto {
  const db = getDb();
  return db.transaction(() => {
    const negozio = db.prepare('SELECT * FROM negozio WHERE chiave = ?').get(manifest.negozio) as Riga | undefined;
    const rapportoRaw = (db.prepare('SELECT json FROM dati_guida WHERE chiave = ?').get('bonifica-condizioni-attivita-124') as Riga | undefined)?.json;
    const rapporto124 = parse(rapportoRaw);
    const rapporto = record(rapporto124);
    const attestata = (voce: string) => rapporto !== null && isDeepStrictEqual(Object.keys(rapporto).sort(), ['convertite', 'escluse', 'giaCorrette'])
      && Array.isArray(rapporto.convertite) && rapporto.convertite.every(v => typeof v === 'string')
      && Array.isArray(rapporto.giaCorrette) && rapporto.giaCorrette.every(v => typeof v === 'string')
      && [...rapporto.convertite, ...rapporto.giaCorrette].filter(v => v === voce).length === 1
      && Array.isArray(rapporto.escluse) && rapporto.escluse.every(v => typeof record(v)?.origine === 'string' && typeof record(v)?.motivo === 'string')
      && !rapporto.escluse.some(v => record(v)?.origine === voce);
    const negozio124 = negozio?.origine === 'seed' && negozio.tipo === 'online' && negozio.sede_chiave === null && negozio.luogo_chiave === null
      && isDeepStrictEqual(parse(negozio.sblocco_json), sblocco124) && attestata(`negozio:${manifest.negozio}`);
    const proposteRaw = db.prepare('SELECT * FROM proposta_abbinamento ORDER BY riga_tipo,riga_chiave,gruppo,catalogo_chiave').all() as Array<Riga & ChiaveProposta>;
    const pertinenti = proposteRaw.filter(fonteTanaka);
    const tutteChiavi = new Set([...chiavi, ...pertinenti.map(p => p.riga_tipo === 'articolo' ? p.riga_chiave : p.riga_chiave.slice(9)),
      ...(db.prepare('SELECT chiave FROM articolo WHERE negozio_chiave = ?').all(manifest.negozio) as Array<{ chiave: string }>).map(r => r.chiave)]);
    const offerte = [...tutteChiavi].sort().map(chiave => {
      const corrente = db.prepare('SELECT * FROM articolo WHERE chiave = ?').get(chiave) as Riga | undefined;
      const collegamenti = db.prepare("SELECT * FROM ricompensa_oggetto WHERE fonte_tipo = 'articolo' AND fonte_chiave = ? ORDER BY catalogo_chiave").all(chiave);
      const rilievi: string[] = [];
      if (!corrente) rilievi.push('Offerta assente: nessuna ricreazione automatica.');
      if (corrente && corrente.negozio_chiave !== manifest.negozio) rilievi.push('Collisione: la chiave appartiene a un altro negozio.');
      if (corrente?.nascosto) rilievi.push('Offerta nascosta: stato conservato.');
      if (corrente && !manifest.chiaviCorrenti.includes(chiave)) rilievi.push('Offerta aggiunta rispetto alle venti originali.');
      if (corrente?.origine !== undefined && corrente.origine !== 'seed') rilievi.push('Personalizzazione corrente: nessuna sostituzione automatica.');
      if (corrente && !formulaValida(corrente.condizioni_json)) rilievi.push('Formula corrente illeggibile o non supportata: conflitto da risolvere.');
      return { chiave, corrente: corrente ?? null, collegamenti, rilievi,
        // F6: la nota storica è un dato legato all'offerta (migrazione 139), solo finché l'offerta è del negozio di Tanaka
        noteStoriche: corrente && corrente.negozio_chiave === manifest.negozio ? noteStoricheDi('articolo', chiave) : [] };
    });
    const royal = manifest.royal.map(r => {
      const catalogoCorrente = db.prepare('SELECT chiave,nome,categoria,nascosto,origine,fonte_tipo,fonte_chiave FROM catalogo_oggetto WHERE chiave = ?').get(r.catalogo) as Riga | undefined;
      const rilievi = [...offerte.find(a => a.chiave === r.chiave)!.rilievi];
      if (!catalogoCorrente) rilievi.push('Identità del catalogo assente.');
      if (catalogoCorrente?.nascosto) rilievi.push('Identità del catalogo nascosta.');
      if (catalogoCorrente && catalogoCorrente.origine !== 'seed') rilievi.push('Identità del catalogo personalizzata: nessuna sostituzione automatica.');
      if (catalogoCorrente && catalogoCorrente.categoria !== r.catalogo.split('/')[0]) rilievi.push('Categoria del catalogo diversa dalla categoria documentata.');
      if (catalogoCorrente && catalogoCorrente.nome !== r.nome) rilievi.push('Il nome corrente del catalogo differisce dal nome proposto: confrontare le identità.');
      const riferite = pertinenti.filter(p => p.riga_tipo === 'articolo' && p.riga_chiave === r.chiave);
      if (!riferite.length) rilievi.push('Proposta originale assente.');
      if (riferite.some(p => p.catalogo_chiave !== r.catalogo)) rilievi.push('Identità proposta diversa dal manifest Royal.');
      if (riferite.some(p => p.stato !== 'da-approvare')) rilievi.push('Proposta già gestita: non viene riaperta.');
      if (!negozio124) rilievi.push('Sblocco e provenienza del negozio non attestati dalla bonifica124.');
      if (!negozio || !formulaValida(negozio.condizioni_json) || !formulaValida(negozio.sblocco_json)) rilievi.push('Formula del negozio assente, illeggibile o non supportata.');
      return { ...r, condizioni: grado(r.grado), catalogoCorrente: catalogoCorrente ?? null, rilievi, noteStoriche: noteStoricheDi('articolo', r.chiave) };
    });
    const proposte: ConfrontoTanakaDto['proposte'] = pertinenti.map(p => {
      const salvato = record(parse(p.fonte_snapshot_json));
      const versione = salvato?.versione;
      const fonteCorrente = versione === 1 || versione === 2 ? snapshotFonteProposta(db, p, versione) : null;
      const rilievi: string[] = [];
      let riconciliazione: ConfrontoTanakaDto['proposte'][number]['riconciliazione'] = 'conflitto';
      const m = record(parse(p.modifica_json));
      const payload = rettificaPropostaOggetto.safeParse(m);
      const payloadValido = p.modifica_json === null || (payload.success && isDeepStrictEqual(m, payload.data));
      const fonteSalvata = record(salvato?.fonte);
      const fonteAttuale = record(record(fonteCorrente)?.fonte);
      const strutturaValida = salvato && isDeepStrictEqual(Object.keys(salvato).sort(), ['collegamenti', 'fonte', 'versione'])
        && Array.isArray(salvato.collegamenti) && (salvato.fonte === null || fonteSalvata !== null);
      const formuleValide = (salvato?.fonte === null || formulaValida(fonteSalvata?.condizioni_json))
        && (record(fonteCorrente)?.fonte === null || formulaValida(fonteAttuale?.condizioni_json));
      if (!payloadValido) rilievi.push('Payload storico illeggibile o non supportato: conservato senza applicazione.');
      if (!formuleValide) rilievi.push('Formula storica o corrente illeggibile o non supportata: conservata senza semplificarla.');
      if (fonteCorrente !== null && strutturaValida && formuleValide && payloadValido) {
        const corrente = record(fonteCorrente)!;
        const vecchia = record(salvato.fonte);
        const attuale = record(corrente.fonte);
        const r = offerte.find(a => a.chiave === p.riga_chiave)?.corrente;
        if (salvato.fonte === null && corrente.fonte === null && isDeepStrictEqual(salvato, fonteCorrente) && m?.azione === 'crea') riconciliazione = 'creazione-da-riconciliare';
        else if (isDeepStrictEqual(salvato, fonteCorrente)) riconciliazione = 'coincidente';
        else {
          const gruppo = gruppi124.find(([, slugs]) => slugs.some(s => `${manifest.negozio}/${s}` === p.riga_chiave));
          const dopo = gruppo ? grado(gruppo[0]) : null;
          const prima = record(m?.prima);
          // La v1 non fotografa l'origine: la prima completa121 deve provarla, oltre alla riga corrente.
          if (versione === 1 && p.riga_tipo === 'articolo' && vecchia && attuale && r?.origine === 'seed' && negozio124 && gruppo && dopo
            && prima?.chiave === p.riga_chiave && prima.origine === 'seed' && prima.negozio_chiave === manifest.negozio
            && Object.entries(vecchia).every(([k, v]) => Object.hasOwn(prima, k) && isDeepStrictEqual(prima[k], v))
            && isDeepStrictEqual(parse(vecchia.condizioni_json), [...foto124, ...dopo])
            && isDeepStrictEqual(parse(attuale.condizioni_json), dopo)
            && attestata(`articolo:${p.riga_chiave}`)
            && isDeepStrictEqual({ ...salvato, fonte: { ...vecchia, condizioni_json: attuale.condizioni_json } }, fonteCorrente)) {
            riconciliazione = 'rettifica-124-provata';
          }
        }
      }
      if (riconciliazione === 'conflitto') rilievi.push('Fotografia assente, invalida, non riconosciuta o cambiamenti non interamente attribuibili alla bonifica124.');
      if (riconciliazione === 'creazione-da-riconciliare') rilievi.push('Fonte assente: la coincidenza non convalida il vecchio payload di creazione. Usare la candidata documentale separata.');
      if (p.stato !== 'da-approvare') rilievi.push('Stato già gestito conservato, senza riapertura.');
      return { tuple: [p.riga_tipo, p.riga_chiave, p.gruppo, p.catalogo_chiave], stato: String(p.stato),
        modificaRaw: typeof p.modifica_json === 'string' ? p.modifica_json : null, fotografiaRaw: p.fonte_snapshot_json,
        fonteCorrente, riconciliazione, rilievi };
    });
    const dati = { versione: 1 as const, negozio: negozio ?? null, rapporto124: rapporto124 ?? { illeggibile: rapportoRaw ?? null }, offerte, royal, proposte };
    return { ...dati, revisione: createHash('sha256').update(JSON.stringify(dati)).digest('hex') };
  })();
}
