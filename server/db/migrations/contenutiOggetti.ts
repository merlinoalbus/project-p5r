// Estrazione conservativa per le future conversioni e per bonifiche esplicitamente delimitate.
// Non modifica i testi e non è un automatismo del normale salvataggio delle voci.
import { contenutoNominativo121 } from './contenutiOggetti121.js';

export interface LocatoreContenuto { campo: string; inizio: number; fine: number; testo: string }
export interface ParteContenuto {
  nome: string; categoria?: string; quantita: number | null; nota: string | null;
  locatori: LocatoreContenuto[]; ordine: number; daVerificare: boolean;
}
export interface LacunaContenuto { campo: string; motivo: string; locatori?: LocatoreContenuto[] }
export interface ContenutiVoce { parti: ParteContenuto[]; lacune: LacunaContenuto[] }
interface Voce { tipo: string; nome: string; dettagli_json: unknown }
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’`´]/g, "'").replace(/\s+/g, ' ').trim();

function segmenti(testo: string): Array<{ testo: string; inizio: number; fine: number }> {
  const out: Array<{ testo: string; inizio: number; fine: number }> = [];
  let parentesi = 0; let inizio = 0;
  for (let i = 0; i <= testo.length; i++) {
    const c = testo[i];
    if (c === '(') parentesi++;
    if (c === ')') parentesi = Math.max(0, parentesi - 1);
    if (i === testo.length || (parentesi === 0 && [',', ';', '\n'].includes(c))) {
      const raw = testo.slice(inizio, i); const trim = raw.trim();
      if (trim) { const a = inizio + raw.indexOf(trim); out.push({ testo: trim, inizio: a, fine: a + trim.length }); }
      inizio = i + 1;
    }
  }
  return out;
}

/** N nome è quantitativo solo se il resto è un nome già attestato e il nome intero non lo è. */
export function selezionaContenutiVoce(voce: Voce, nomeAttestato: (nome: string) => boolean = () => false): ContenutiVoce {
  const out: ContenutiVoce = { parti: [], lacune: [] };
  let dati: Record<string, unknown>;
  try {
    const v: unknown = typeof voce.dettagli_json === 'string' ? JSON.parse(voce.dettagli_json) : voce.dettagli_json;
    if (!v || typeof v !== 'object' || Array.isArray(v)) return { parti: [], lacune: [{ campo: 'dettagli', motivo: 'assente-o-non-supportato' }] };
    dati = v as Record<string, unknown>;
  } catch { return { parti: [], lacune: [{ campo: 'dettagli', motivo: 'json-malformato' }] }; }
  const aggiungi = (testo: string, campo: string, base = 0, notaCategoria?: string) => {
    for (const segmento of segmenti(testo)) {
      const originale = segmento.testo;
      const locatore = { campo, inizio: base + segmento.inizio, fine: base + segmento.fine, testo: originale };
      if (/^(?:nessun[oa]?|niente|ornamenti?|tavola dei semi)\.?$/i.test(originale)
        || /^[\d.,]+\s*(?:pe\b|yen\b|¥|monete\b)/i.test(originale)) continue;
      if (/^(?:forziere\b|puoi\b|si (?:può|possono)\b|sconfigg|farm|torna\b)/i.test(originale)) {
        out.lacune.push({ campo, motivo: 'riferimento-indiretto-o-istruzione', locatori: [locatore] }); continue;
      }
      const note = [...originale.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]);
      if (notaCategoria) note.push(notaCategoria);
      let nome = originale.replace(/\([^)]*\)/g, '').trim().replace(/\.$/, '');
      const iniziale = /^(\d+)\s*(?:[x×]\s*|unit[aà]\s+di\s+)/i.exec(nome);
      const finale = /\s*[x×]\s*(\d+)$/i.exec(nome);
      const nudo = !iniziale && !finale ? /^(\d+)\s+(.+)$/.exec(nome) : null;
      let quantita: number | null = null;
      if (iniziale) { quantita = Number(iniziale[1]); nome = nome.slice(iniziale[0].length).trim(); }
      else if (finale) { quantita = Number(finale[1]); nome = nome.slice(0, finale.index).trim(); }
      else if (nudo && !nomeAttestato(nome) && nomeAttestato(nudo[2])) { quantita = Number(nudo[1]); nome = nudo[2]; }
      if (quantita !== null && (!Number.isSafeInteger(quantita) || quantita < 1 || quantita > 999999)) {
        out.lacune.push({ campo, motivo: 'quantita-fuori-intervallo', locatori: [locatore] }); continue;
      }
      let categoria = /carta abilit[aà]/i.test(note.join(' ')) ? 'carta-abilita' : /\blibro\b/i.test(note.join(' ')) ? 'libro'
        : /\baccessorio\b/i.test(note.join(' ')) ? 'accessorio' : /armatura|protezione/i.test(note.join(' ')) ? 'protezione'
          : /\barma\b/i.test(note.join(' ')) ? 'arma' : /oggetto chiave/i.test(note.join(' ')) ? 'chiave'
            : /materiale/i.test(note.join(' ')) ? 'materiale' : /consumabile/i.test(note.join(' ')) ? 'consumabile' : undefined;
      if (/^carta abilit[aà]\s+/i.test(nome)) { categoria = 'carta-abilita'; nome = nome.replace(/^carta abilit[aà]\s+/i, ''); }
      // Le alternative e le differenze di versione restano visibili; non diventano un nome nuovo arbitrario.
      const alternativa = /\s(?:\/|oppure|o)\s|\bversione\b|\bpoi\b|\bforziere\b/i.test(originale);
      if (!nome || /\s(?:\/|oppure)\s/.test(nome)) { out.lacune.push({ campo, motivo: 'alternativa-non-risolta', locatori: [locatore] }); continue; }
      out.parti.push({ nome, categoria, quantita, nota: note.join(' · ') || null, locatori: [locatore], ordine: out.parti.length,
        daVerificare: alternativa || !!(nudo && quantita === null) });
    }
  };
  const contenuto = typeof dati.contenuto === 'string' ? dati.contenuto : '';
  let cursore = 0;
  const farming = /^Tecnica di farming Yen, non un punto fisico unico\.?$/i.test(contenuto.trim());
  if (farming) out.lacune.push({ campo: 'contenuto', motivo: 'istruzione-farming-non-oggetto',
    locatori: [{ campo: 'contenuto', inizio: 0, fine: contenuto.length, testo: contenuto }] });
  // Si mantiene il selettore strutturale delle voci già supportate: nomi e categorie non dedotti dalla strategia.
  for (const selezione of farming ? [] : contenutoNominativo121(voce)) {
    const indice = contenuto.indexOf(selezione, cursore);
    if (indice >= 0) { aggiungi(selezione, 'contenuto', indice); cursore = indice + selezione.length; }
    else if (selezione.startsWith(voce.nome) && voce.nome) {
      const categoria = /\(([^)]*)\)$/.exec(selezione)?.[1];
      aggiungi(voce.nome, 'nome', 0, categoria);
    } else {
      // Il selettore storico può aggiungere una categoria a una sottostringa reale del contenuto.
      const nome = selezione.replace(/\s*\((?:oggetto chiave|accessorio)\)$/, '');
      const a = contenuto.indexOf(nome);
      if (a >= 0) aggiungi(nome, 'contenuto', a, /\(([^)]*)\)$/.exec(selezione)?.[1]);
      else {
        const n = voce.nome.indexOf(nome);
        if (n >= 0) aggiungi(nome, 'nome', n, /\(([^)]*)\)$/.exec(selezione)?.[1]);
        else out.lacune.push({ campo: 'contenuto', motivo: 'locatore-non-dimostrato' });
      }
    }
  }
  if (['boss', 'miniboss'].includes(voce.tipo)) {
    const premio = /\bricompensa\s*:\s*/i.exec(contenuto);
    if (premio) {
      const inizio = premio.index + premio[0].length;
      const diretto = contenuto.slice(inizio).split(/\s*\+\s*forziere\b/i)[0];
      aggiungi(diretto, 'contenuto', inizio);
    }
  }
  for (const campo of ['ricompensa', 'bottino_oggetto']) {
    const v = dati[campo];
    if (typeof v === 'string') aggiungi(v, campo);
    else if (Array.isArray(v)) for (const [i, x] of v.entries()) {
      if (typeof x === 'string') aggiungi(x, `${campo}[${i}]`);
      else out.lacune.push({ campo: `${campo}[${i}]`, motivo: 'formato-non-supportato' });
    }
    else if (v != null) out.lacune.push({ campo, motivo: 'formato-non-supportato' });
  }
  const unite = new Map<string, ParteContenuto>();
  for (const parte of out.parti) {
    const k = `${parte.categoria ?? ''}\0${norm(parte.nome)}`; const prima = unite.get(k);
    if (!prima) { unite.set(k, parte); continue; }
    const stessaAttestazione = prima.locatori.some((a) => parte.locatori.some((b) => a.campo === b.campo && a.inizio === b.inizio && a.fine === b.fine));
    if (stessaAttestazione) continue;
    const campoBase = (c: string) => c.replace(/\[\d+\]$/, '');
    const stessoCampo = prima.locatori.some((a) => parte.locatori.some((b) => campoBase(a.campo) === campoBase(b.campo)));
    if (stessoCampo && new Set(prima.locatori.map((l) => campoBase(l.campo))).size > 1) {
      // Un totale già riconciliato fra due campi non può essere incrementato da una terza attestazione.
      prima.quantita = null; prima.daVerificare = true;
    } else if (stessoCampo && prima.quantita !== null && parte.quantita !== null) {
      const somma = prima.quantita + parte.quantita;
      prima.quantita = Number.isSafeInteger(somma) && somma <= 999999 ? somma : null;
      if (prima.quantita === null) prima.daVerificare = true;
    } else if (prima.quantita !== parte.quantita || (stessoCampo && prima.quantita === null)) { prima.quantita = null; prima.daVerificare = true; }
    // Campi diversi attestano lo stesso premio: non sommare automaticamente.
    prima.locatori.push(...parte.locatori); prima.daVerificare ||= parte.daVerificare;
    prima.nota = [...new Set([prima.nota, parte.nota].filter(Boolean))].join(' · ') || null;
  }
  return { parti: [...unite.values()], lacune: out.lacune };
}

/** Una categoria omessa non è un secondo premio: riconcilia soltanto dopo una risoluzione per FK certa. */
export function riconciliaContenutiPerIdentita(contenuti: ContenutiVoce, candidati: (p: ParteContenuto) => readonly string[]): ContenutiVoce {
  const esclusi = new Set<ParteContenuto>();
  for (const a of contenuti.parti) for (const b of contenuti.parti) {
    if (a === b || norm(a.nome) !== norm(b.nome) || a.categoria === b.categoria) continue;
    if (!a.locatori.some((x) => b.locatori.some((y) => x.campo !== y.campo))) continue;
    const ca = candidati(a), cb = candidati(b);
    if (ca.length === 1 && cb.length === 1) continue; // identità uguali si uniscono sotto; diverse restano distinte.
    esclusi.add(a); esclusi.add(b);
  }
  const gruppi = new Map<string, ParteContenuto>();
  for (const parte of contenuti.parti) {
    if (esclusi.has(parte)) {
      contenuti.lacune.push({ campo: parte.locatori[0].campo, motivo: 'attestazioni-fra-campi-con-identita-ambigua', locatori: parte.locatori }); continue;
    }
    const c = candidati(parte); const key = c.length === 1 ? `fk:${c[0]}` : `nome:${parte.categoria ?? ''}:${norm(parte.nome)}`;
    const prima = gruppi.get(key);
    if (!prima) { gruppi.set(key, parte); continue; }
    const campiPrima = new Set(prima.locatori.map((l) => l.campo.replace(/\[\d+\]$/, '')));
    const altroCampo = parte.locatori.every((l) => !campiPrima.has(l.campo.replace(/\[\d+\]$/, '')));
    if (altroCampo) {
      if (prima.quantita !== parte.quantita) { prima.quantita = null; prima.daVerificare = true; }
    } else if (campiPrima.size > 1 || new Set(parte.locatori.map((l) => l.campo.replace(/\[\d+\]$/, ''))).size > 1) {
      // Sovrapposizione parziale: non è dimostrato quali porzioni siano lo stesso premio.
      prima.quantita = null;
    } else if (prima.quantita !== null && parte.quantita !== null) {
      const totale = prima.quantita + parte.quantita;
      prima.quantita = Number.isSafeInteger(totale) && totale <= 999999 ? totale : null;
    } else prima.quantita = null;
    prima.locatori.push(...parte.locatori); prima.daVerificare ||= parte.daVerificare || prima.quantita === null;
    prima.nota = [...new Set([prima.nota, parte.nota].filter(Boolean))].join(' · ') || null;
  }
  return { parti: [...gruppi.values()], lacune: contenuti.lacune };
}
