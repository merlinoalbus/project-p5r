// Conversione dei cataloghi di L7. Solo la migrazione 121 usa questo modulo.
import type { AppDatabase } from '../dbService.js';
import { separaNomi121 } from './contenutiOggetti121.js';
import { riconciliaContenutiPerIdentita, selezionaContenutiVoce, type LacunaContenuto } from './contenutiOggetti.js';
import { salvaSnapshotProposta, snapshotFonteProposta, type ChiaveProposta } from './snapshotProposte121.js';
import { donatoreOggetto121, FONTE_PREMI_ESAMI_121, PREMI_ESAMI_121, premioSfida121 } from './premiOggetti121.js';
import { scambiJose121 } from './scambiJose121.js';
import { FONTE_GACHAPON_121, scambiGachapon121 } from './scambiGachapon121.js';
import { nodiCatalogoGuida } from './riferimentiCatalogoGuida121.js';

type Riga = Record<string, unknown>;
interface Oggetto {
  chiave: string; categoria: string; nome: string; nomi: string[]; fonte: string; fonteChiave: string;
}
const testo = (x: unknown): string => typeof x === 'string' ? x.trim() : '';
const record = (x: unknown): Riga => x && typeof x === 'object' && !Array.isArray(x) ? x as Riga : {};
const elenco = (x: unknown): Riga[] => Array.isArray(x) ? x.map(record) : [];
const norm = (x: string): string => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’`´]/g, "'").replace(/\s+/g, ' ').trim();
const slug121 = (x: string): string => norm(x).replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function json(x: unknown): unknown { try { return typeof x === 'string' ? JSON.parse(x) as unknown : null; } catch { return null; } }
const categoriaArticolo = (c: string): string => ['cura', 'sp', 'battaglia', 'stato', 'esplorazione'].includes(c) ? 'consumabile'
  : c === 'oggetto-chiave' ? 'chiave' : c === 'dvd' ? 'film' : c === 'abito' ? 'altro' : c;

/** Una sola ricerca per origine evita doppioni anche se si riesegue il corpo della migrazione. */
export function popolaCatalogo121(db: AppDatabase): void {
  const adesso = new Date().toISOString();
  const oggetti: Oggetto[] = [];
  const perFonte = new Map<string, Oggetto>();
  const perNome = new Map<string, Oggetto[]>();
  const registra = (o: Oggetto) => {
    oggetti.push(o); perFonte.set(`${o.fonte}\0${o.fonteChiave}`, o);
    for (const n of new Set([o.nome, ...o.nomi].map(norm))) {
      const v = perNome.get(n) ?? []; v.push(o); perNome.set(n, v);
    }
  };
  for (const r of db.prepare('SELECT * FROM catalogo_oggetto ORDER BY chiave').all() as Riga[]) {
    registra({ chiave: testo(r.chiave), categoria: testo(r.categoria), nome: testo(r.nome),
      nomi: Array.isArray(json(r.nomi_altri_json)) ? (json(r.nomi_altri_json) as unknown[]).filter((n): n is string => typeof n === 'string') : [],
      fonte: testo(r.fonte_tipo), fonteChiave: testo(r.fonte_chiave) });
  }
  // Ogni sorgente conserva direttamente la propria identità, anche dopo una fusione esplicita.
  const perChiave = new Map(oggetti.map((o) => [o.chiave, o]));
  for (const [tabella, fonte, chiave] of [['oggetto', 'equipaggiamento', 'id'], ['libro', 'libro', 'chiave'], ['film', 'film', 'chiave'], ['attivita', 'videogioco', 'chiave'], ['articolo', 'listino', 'chiave']]) {
    for (const r of db.prepare(`SELECT ${chiave} AS fonte,catalogo_chiave FROM ${tabella} WHERE catalogo_chiave IS NOT NULL${tabella === 'attivita' ? " AND tipo = 'videogioco'" : ''}`).all() as Array<{ fonte: string | number; catalogo_chiave: string }>) {
      const o = perChiave.get(r.catalogo_chiave);
      if (!o) throw new Error('Una sorgente punta a un’identità assente: nessun oggetto viene ricreato automaticamente.');
      perFonte.set(`${fonte}\0${r.fonte}`, o);
    }
  }
  const inserisci = db.prepare(`INSERT INTO catalogo_oggetto
    (chiave,categoria,sottocategoria,nome,nomi_altri_json,nome_originale,effetto,descrizione,statistiche_json,fonte_tipo,fonte_chiave,nascosto,updated_at)
    VALUES (@chiave,@categoria,@sottocategoria,@nome,@nomi,@originale,@effetto,@descrizione,@statistiche,@fonte,@fonteChiave,@nascosto,@adesso)`);
  const crea = (categoria: string, nome: string, fonte: string, fonteChiave: string, dati: {
    altri?: string[]; originale?: string; effetto?: string; descrizione?: string; statistiche?: Riga; sottocategoria?: string; nascosto?: number;
  } = {}): Oggetto => {
    const gia = perFonte.get(`${fonte}\0${fonteChiave}`);
    if (gia) return gia;
    const base = `${categoria}/${slug121(nome) || 'oggetto'}`;
    let chiave = base;
    for (let n = 2; oggetti.some((o) => o.chiave === chiave); n++) chiave = `${base}-${n}`;
    const nomi = [...new Set([...(dati.altri ?? []), ...(dati.originale ? [dati.originale] : [])].filter((n) => n && n !== nome))];
    inserisci.run({ chiave, categoria, nome, nomi: JSON.stringify(nomi), originale: dati.originale || null, effetto: dati.effetto ?? '',
      descrizione: dati.descrizione ?? '', statistiche: dati.statistiche ? JSON.stringify(dati.statistiche) : null,
      sottocategoria: dati.sottocategoria ?? null, fonte, fonteChiave, nascosto: dati.nascosto === 1 ? 1 : 0, adesso });
    const o = { chiave, categoria, nome, nomi, fonte, fonteChiave }; registra(o); return o;
  };
  const trova = (nome: string, categoria?: string): Oggetto[] => {
    const candidati = (perNome.get(norm(nome)) ?? []).filter((o) => !categoria || o.categoria === categoria
      || (categoria === 'consumabile' && o.categoria === 'cibo') || (categoria === 'cibo' && o.categoria === 'consumabile'));
    // Le identità provvisorie dei venti articoli di Tanaka servono a mantenere il listino com'è, non a rendere ambigua la guida.
    const fuoriTanaka = candidati.filter((o) => o.fonte !== 'listino' || !o.fonteChiave.startsWith('tanaka-affari-loschi/'));
    return fuoriTanaka.length ? fuoriTanaka : candidati;
  };
  const traduzioni = new Map((db.prepare('SELECT ambito,chiave,testo FROM traduzione').all() as Array<{ ambito: string; chiave: string; testo: string }>).map((r) => [`${r.ambito}\0${r.chiave}`, r.testo]));
  const traduci = (ambito: string, nome: string) => traduzioni.get(`${ambito}\0${nome}`) ?? nome;
  for (const r of db.prepare('SELECT * FROM oggetto ORDER BY id').all() as Riga[]) {
    const categorie: Record<string, string> = { Weapon: 'arma', Gun: 'arma-da-fuoco', Protector: 'protezione', Accessory: 'accessorio' };
    const o = crea(categorie[testo(r.categoria)] ?? 'altro', traduci('oggetto', testo(r.nome)), 'equipaggiamento', String(r.id), {
      originale: testo(r.nome), effetto: traduci('descrizioneOggetto', testo(r.descrizione)),
      statistiche: { per: traduci('vincoloOggetto', testo(r.vincolo)) || null },
    });
    db.prepare('UPDATE oggetto SET catalogo_chiave = ? WHERE id = ? AND catalogo_chiave IS NULL').run(o.chiave, r.id);
  }
  const blocco = (chiave: string) => record(json((db.prepare('SELECT json FROM dati_guida WHERE chiave = ?').get(chiave) as { json: string } | undefined)?.json));
  const guida = blocco('oggetti-guida');
  const guidaPrima = JSON.stringify(guida);
  const nodiGuida = nodiCatalogoGuida(guida);
  for (const { fonte, nodo } of nodiGuida) if (typeof nodo.catalogoChiave === 'string') {
    const o = perChiave.get(nodo.catalogoChiave);
    if (!o) throw new Error('Un riferimento della guida punta a un’identità assente: occorre correggerlo prima della conversione.');
    perFonte.set(`guida\0${fonte}`, o);
  }
  for (const r of elenco(guida.consumabili)) {
    const nome = testo(r.nome); if (!nome) continue;
    crea('consumabile', nome, 'guida', `consumabili/${nome}`, { originale: testo(r.nomeEn), effetto: testo(r.effetto),
      sottocategoria: testo(r.categoria), descrizione: [testo(r.dove), typeof r.prezzo === 'number' ? `Prezzo citato nella pagina Oggetti: ${r.prezzo.toLocaleString('it-IT')} ¥.` : ''].filter(Boolean).join('\n') });
  }
  for (const r of elenco(guida.chiaveEMateriali)) {
    const nome = testo(r.nome); if (!nome) continue;
    crea(r.tipo === 'materiale' ? 'materiale' : 'chiave', nome, 'guida', `chiave-e-materiali/${nome}`, {
      originale: testo(r.nomeEn), effetto: testo(r.uso), descrizione: testo(r.dove),
    });
  }
  // L'archivio precedente offriva anche gli abiti della guida: il selettore nuovo non deve perderli.
  // Il piano li mantiene come sezione; nel catalogo sono «altro / abito», senza inventare una categoria ulteriore.
  for (const r of elenco(record(guida.abiti).elenco)) {
    const nome = testo(r.nome); if (!nome) continue;
    crea('altro', nome, 'guida', `abiti/${nome}`, { sottocategoria: 'abito', descrizione: testo(r.dove), statistiche: { per: testo(r.per) || null } });
  }
  for (const [tabella, fonte, categoria] of [['libro', 'libro', 'libro'], ['film', 'film', 'film'], ['attivita', 'videogioco', 'videogioco']]) {
    const righe = db.prepare(`SELECT * FROM ${tabella}${tabella === 'attivita' ? " WHERE tipo = 'videogioco'" : ''} ORDER BY ordine`).all() as Riga[];
    for (const r of righe) {
      const o = crea(categoria, testo(r.nome_it) || testo(r.nome), fonte, testo(r.chiave), {
      altri: [testo(r.nome)], descrizione: testo(r.dettagli),
      sottocategoria: fonte === 'film' ? testo(r.dove) : undefined,
      statistiche: { effetti: json(r.effetti_json) ?? [], sessioni: r.sessioni ?? null }, nascosto: r.nascosto === 1 ? 1 : 0,
      });
      db.prepare(`UPDATE ${tabella} SET catalogo_chiave = ? WHERE chiave = ? AND catalogo_chiave IS NULL`).run(o.chiave, r.chiave);
    }
  }
  for (const { fonte, nodo } of nodiGuida) {
    const o = perFonte.get(`guida\0${fonte}`);
    if (!o) throw new Error('Una riga della guida non ha un’identità dopo la conversione.');
    if (nodo.catalogoFonte == null) nodo.catalogoFonte = fonte;
    if (nodo.catalogoChiave == null) nodo.catalogoChiave = o.chiave;
  }
  if (JSON.stringify(guida) !== guidaPrima) db.prepare("UPDATE dati_guida SET json = ? WHERE chiave = 'oggetti-guida'").run(JSON.stringify(guida));

  const proposta = db.prepare(`INSERT OR IGNORE INTO proposta_abbinamento
    (riga_tipo,riga_chiave,catalogo_chiave,quantita,motivo,certezza,gruppo,nota,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  const proponi = (tipo: string, riga: string, candidati: Oggetto[], motivo: string, quantita: number | null = 1, certezza = 'da-verificare', gruppo = '', nota: string | null = null) => {
    if (!candidati.length) proposta.run(tipo, riga, null, quantita, motivo, certezza, gruppo, nota, adesso);
    for (const o of candidati) proposta.run(tipo, riga, o.chiave, quantita, motivo, certezza, gruppo, nota, adesso);
  };
  type QuantitaCollegata = { quantita: number; ordine: number; nota: string | null };
  const accumula = (righe: Map<string, QuantitaCollegata>, chiave: string, parte: QuantitaCollegata) => {
    const precedente = righe.get(chiave);
    const quantita = (precedente?.quantita ?? 0) + parte.quantita;
    if (!Number.isSafeInteger(quantita) || quantita <= 0) throw new Error('Quantità del contenuto fuori intervallo: nessun dato viene convertito.');
    righe.set(chiave, { quantita, ordine: Math.min(precedente?.ordine ?? parte.ordine, parte.ordine),
      nota: [...new Set([precedente?.nota, parte.nota].filter(Boolean))].join(' · ') || null });
  };
  // I riferimenti già per chiave hanno precedenza. Gli equipaggiamenti venduti non si fondono per somiglianza.
  for (const r of db.prepare('SELECT * FROM articolo ORDER BY negozio_chiave,ordine,chiave').all() as Riga[]) {
    if (r.catalogo_chiave != null) continue;
    const nome = testo(r.nome_it) || testo(r.nome); if (!nome) continue;
    const categoria = categoriaArticolo(testo(r.categoria));
    // G-034: nessuna resa italiana anticipata di Tanaka, neppure attraverso un alias inglese esatto.
    if (r.negozio_chiave === 'tanaka-affari-loschi') {
      const o = crea(categoria, nome, 'listino', testo(r.chiave), { altri: [testo(r.nome)], effetto: testo(r.effetto),
        statistiche: { per: r.per ?? null, testo: r.statistiche ?? null } });
      db.prepare('UPDATE articolo SET catalogo_chiave = ? WHERE chiave = ? AND catalogo_chiave IS NULL').run(o.chiave, r.chiave);
      continue;
    }
    const fonti: Record<string, string> = { equipaggiamento: 'equipaggiamento', guida: 'guida', libri: 'libro', film: 'film', videogiochi: 'videogioco' };
    const precedente = perFonte.get(`${fonti[testo(r.oggetto_fonte)] ?? ''}\0${testo(r.oggetto_chiave)}`);
    // Decisione delegata 21 ottobre: il solo nome non dimostra identità fra vendita e itemizzazione.
    // Un collegamento strutturato già scelto resta; nessun nuovo abbinamento al dataset per omonimia.
    let candidati = precedente ? [precedente] : trova(nome, categoria).filter((o) => o.fonte !== 'equipaggiamento');
    if (!precedente && !candidati.length && categoria === 'arma') candidati = trova(nome, 'arma-da-fuoco').filter((o) => o.fonte !== 'equipaggiamento');
    if (candidati.length > 1) {
      proponi('articolo', testo(r.chiave), candidati, 'Più oggetti hanno lo stesso nome: scegli quale è venduto qui.');
      continue;
    }
    const o = candidati[0] ?? crea(categoria, nome, 'listino', testo(r.chiave), {
      altri: [testo(r.nome), testo(r.nome_it)].filter(Boolean), effetto: testo(r.effetto),
      statistiche: { per: r.per ?? null, testo: r.statistiche ?? null },
    });
    db.prepare('UPDATE articolo SET catalogo_chiave = ? WHERE chiave = ? AND catalogo_chiave IS NULL').run(o.chiave, r.chiave);
  }
  for (const r of db.prepare('SELECT * FROM confidente_regalo ORDER BY confidente_chiave,ordine').all() as Riga[]) {
    if (r.catalogo_chiave != null) continue;
    const nome = testo(r.nome); if (!nome) continue;
    const candidati = trova(nome);
    if (candidati.length > 1) { proponi('regalo', `${r.confidente_chiave}/${r.ordine}`, candidati, 'Nome presente in più categorie: l’abbinamento del regalo richiede conferma.'); continue; }
    const o = candidati[0] ?? crea('regalo', nome, 'guida', `regalo/${nome}`, { descrizione: [testo(r.dove), testo(r.costo)].filter(Boolean).join(' · ') });
    db.prepare('UPDATE confidente_regalo SET catalogo_chiave = ? WHERE confidente_chiave = ? AND ordine = ? AND catalogo_chiave IS NULL').run(o.chiave, r.confidente_chiave, r.ordine);
  }
  for (const r of elenco(record(guida.fabbricazione).ricette)) {
    const ricetta = testo(r.attrezzo); if (!ricetta) continue;
    const prodotti = trova(ricetta);
    if (!prodotti.length) prodotti.push(crea('consumabile', ricetta, 'guida', `fabbricazione/${ricetta}`, { effetto: testo(r.effetto) }));
    const quantitaProdotta = typeof r.prodotti === 'number' && Number.isSafeInteger(r.prodotti) && r.prodotti > 0 ? r.prodotti : null;
    if (prodotti.length === 1) db.prepare('INSERT OR IGNORE INTO ricompensa_oggetto(fonte_tipo,fonte_chiave,catalogo_chiave,quantita,ordine,nota) VALUES (?,?,?,?,0,?)')
      .run('ricetta', ricetta, prodotti[0].chiave, quantitaProdotta, testo(r.effetto) || null);
    else proponi('ricompensa', `ricetta/${ricetta}`, prodotti, 'Risultato della fabbricazione con più corrispondenze.', quantitaProdotta, 'da-verificare', '', testo(r.effetto) || null);
    const materiali = new Map<string, QuantitaCollegata>();
    for (const [ordine, m] of elenco(r.materiali).entries()) {
      const nome = testo(m.nome); if (!nome) continue;
      const candidati = trova(nome, 'materiale');
      const alternative = candidati.length ? candidati : trova(nome);
      if (!alternative.length) candidati.push(crea('materiale', nome, 'guida', `materiale-ricetta/${nome}`));
      const quantita = typeof m.quantita === 'number' && Number.isSafeInteger(m.quantita) && m.quantita > 0 ? m.quantita : null;
      if (quantita === null) {
        proponi('ricetta', ricetta, candidati.length ? candidati : alternative,
          'La fonte non indica una quantità valida del materiale: scegli l’identità e indica la quantità prima di confermare.', null, 'da-verificare', norm(nome));
        continue;
      }
      if (candidati.length === 1) accumula(materiali, candidati[0].chiave, { quantita, ordine, nota: null });
      else proponi('ricetta', ricetta, alternative, 'Materiale della ricetta da abbinare.', quantita, 'da-verificare', norm(nome));
    }
    for (const [chiave, m] of materiali) db.prepare('INSERT OR IGNORE INTO ricetta_materiale(ricetta,catalogo_chiave,quantita) VALUES (?,?,?)').run(ricetta, chiave, m.quantita);
  }

  // I testi non si riscrivono. Si separano quantità e note solo per costruire i legami nuovi.
  const parti = (valore: unknown): Array<{ nome: string; quantita: number; nota: string | null; categoria?: string }> => {
    const testi = (Array.isArray(valore) ? valore : [valore]).filter((v): v is string => typeof v === 'string' && !!v.trim());
    const fuori = separaNomi121(testi);
    const singole = fuori.flatMap((pezzo) => {
      const originale = pezzo.trim();
      if (!originale || /^[\d.,]+\s*(?:pe\b|yen\b|¥)/i.test(originale)) return [];
      const nota = [...originale.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]).join(' · ') || null;
      let nome = originale.replace(/\([^)]*\)/g, '').trim();
      const iniziale = /^(\d+)\s*[x×]\s*/i.exec(nome); const finale = /\s*[x×]\s*(\d+)$/i.exec(nome);
      const quantita = Number(iniziale?.[1] ?? finale?.[1] ?? 1);
      nome = nome.replace(/^\d+\s*[x×]\s*/i, '').replace(/\s*[x×]\s*\d+$/i, '').trim();
      if (!nome || !Number.isSafeInteger(quantita) || quantita <= 0) return [];
      const categoria = /carta abilità/i.test(nota ?? '') ? 'carta-abilita' : /\blibro\b/i.test(nota ?? '') ? 'libro'
        : /\baccessorio\b/i.test(nota ?? '') ? 'accessorio' : /\barmatura\b|\bprotezione\b/i.test(nota ?? '') ? 'protezione'
          : /\barma\b/i.test(nota ?? '') ? 'arma' : /oggetto chiave/i.test(nota ?? '') ? 'chiave'
            : /materiale/i.test(nota ?? '') ? 'materiale' : /consumabile/i.test(nota ?? '') ? 'consumabile' : undefined;
      return [{ nome, quantita, nota, categoria }];
    });
    const unite = new Map<string, (typeof singole)[number]>();
    for (const parte of singole) {
      const k = `${parte.categoria ?? ''}\0${norm(parte.nome)}`;
      const precedente = unite.get(k);
      if (!precedente) unite.set(k, parte);
      else {
        const quantita = precedente.quantita + parte.quantita;
        if (!Number.isSafeInteger(quantita)) throw new Error('Quantità del contenuto fuori intervallo: la migrazione non modifica i dati.');
        unite.set(k, { ...precedente, quantita, nota: [...new Set([precedente.nota, parte.nota].filter(Boolean))].join(' · ') || null });
      }
    }
    return [...unite.values()];
  };
  const contenuti = db.prepare(`SELECT p.chiave,p.tipo,p.nome,p.fonte,p.dettagli_json,a.dungeon_chiave
    FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave
    ORDER BY p.chiave`).all() as Riga[];
  const residuiVoci: Array<{ voce: string; lacune: LacunaContenuto[] }> = [];
  for (const r of contenuti) {
    const protetto = ['kamoshida', 'madarame'].includes(testo(r.dungeon_chiave)) || r.fonte === 'utente';
    const certi = new Map<string, QuantitaCollegata>();
    const gruppiPropostiV2 = new Set<string>();
    const contenuto = riconciliaContenutiPerIdentita(selezionaContenutiVoce({ tipo: testo(r.tipo), nome: testo(r.nome), dettagli_json: r.dettagli_json }, (nome) => perNome.has(norm(nome))),
      (parte) => trova(parte.nome, parte.categoria).map((o) => o.chiave));
    if (contenuto.lacune.length && r.tipo !== 'volonta') residuiVoci.push({ voce: testo(r.chiave), lacune: contenuto.lacune });
    // «volonta» è il tipo strutturale della raccolta del Seme. I nomi, anche incompleti
    // o distinti soltanto dal luogo/colore, restano quelli della voce senza inventare equivalenze.
    if (r.tipo === 'volonta' && testo(r.nome)) {
      const o = crea('chiave', testo(r.nome), 'guida', `seme/${r.chiave}`, { sottocategoria: 'seme' });
      if (protetto) proponi('voce', testo(r.chiave), [o], 'Seme della voce strutturata: collegamento da confermare sul lavoro da preservare.', 1, 'certa', 'seme');
      else db.prepare('INSERT OR IGNORE INTO voce_oggetto(voce_chiave,catalogo_chiave,quantita,ordine) VALUES (?,?,1,0)').run(r.chiave, o.chiave);
      continue;
    }
    for (const parte of contenuto.parti) {
      const ordine = parte.ordine;
      const candidati = trova(parte.nome, parte.categoria);
      // G-034: un nome del contenuto non già presente non autorizza una traduzione o una fusione.
      // La nuova identità conserva il nome attestato e la provenienza; sui Palazzi protetti resta proposta.
      if (!candidati.length && !parte.daVerificare) candidati.push(crea(parte.categoria ?? 'altro', parte.nome,
        'guida', `contenuto/${r.chiave}/${ordine}`, { descrizione: parte.nota ?? '' }));
      const nota = [parte.nota, `Attestazioni: ${JSON.stringify(parte.locatori)}`].filter(Boolean).join('\n');
      if (protetto || candidati.length !== 1 || parte.quantita === null || parte.daVerificare) {
        const gruppo = `${parte.categoria ?? ''}:${norm(parte.nome)}`;
        proponi('voce', testo(r.chiave), candidati,
          parte.quantita === null ? 'La fonte nomina il contenuto senza una quantità numerica: indica una quantità verificata prima di collegarlo.'
            : protetto ? 'Contenuto del lavoro da preservare: anche l’abbinamento esatto richiede il tuo sì. Il testo della voce resta invariato.'
              : 'Contenuto o variante da verificare: scegli l’oggetto prima di collegarlo.',
          parte.quantita, candidati.length === 1 && !parte.daVerificare ? 'certa' : 'da-verificare', gruppo, nota);
        gruppiPropostiV2.add(gruppo);
      } else accumula(certi, candidati[0].chiave, { quantita: parte.quantita, ordine, nota });
    }
    // Alias diversi possono risolvere la stessa identità: la PK non deve scartare il secondo quantitativo.
    for (const [chiave, parte] of certi) db.prepare('INSERT OR IGNORE INTO voce_oggetto(voce_chiave,catalogo_chiave,quantita,ordine,nota) VALUES (?,?,?,?,?)')
      .run(r.chiave, chiave, parte.quantita, parte.ordine, parte.nota);
    for (const gruppo of gruppiPropostiV2) {
      for (const p of db.prepare("SELECT * FROM proposta_abbinamento WHERE riga_tipo = 'voce' AND riga_chiave = ? AND gruppo = ? AND fonte_snapshot_json IS NULL").all(r.chiave, gruppo) as ChiaveProposta[]) {
        salvaSnapshotProposta(db, p, snapshotFonteProposta(db, p, 2));
      }
    }
  }
  db.prepare("INSERT OR IGNORE INTO dati_guida(chiave,json) VALUES ('audit-contenuti-voci-121',?)")
    .run(JSON.stringify({ versione: 1, fonti: residuiVoci }));
  const ricompensa = db.prepare('INSERT OR IGNORE INTO ricompensa_oggetto(fonte_tipo,fonte_chiave,catalogo_chiave,quantita,ordine,nota) VALUES (?,?,?,?,?,?)');
  for (const r of db.prepare('SELECT * FROM richiesta ORDER BY ordine').all() as Riga[]) {
    const premi = json(r.ricompense_json);
    if (!Array.isArray(premi)) continue;
    // Unica rettifica testuale autorizzata da G-034, con confronto dell'intero valore storico.
    const vecchio = "Venture Saber / Spadone dell'impresa (arma) - nome italiano non confermato da Allgamestaff";
    const nuovi = premi.map((p) => r.chiave === 'lo-zio-ingordo' && p === vecchio ? 'Sciabola del rischio (arma per Mona)' : p);
    if (nuovi.some((p, i) => p !== premi[i])) {
      db.prepare('UPDATE richiesta SET ricompense_json = ?, note = ? WHERE chiave = ? AND ricompense_json = ?')
        .run(JSON.stringify(nuovi), [testo(r.note), `G-034: testo precedente della ricompensa: ${vecchio}.`].filter(Boolean).join('\n'), r.chiave, r.ricompense_json);
    }
    const certi = new Map<string, QuantitaCollegata>();
    // Un indice per contenuto distinto, non per frase: una frase può premiare con più oggetti nuovi.
    for (const [ordine, parte] of parti(nuovi).entries()) {
      const candidati = trova(parte.nome, parte.categoria);
      if (!candidati.length) candidati.push(crea(parte.categoria ?? 'altro', parte.nome, 'guida', `ricompensa/${r.chiave}/${ordine}`, {
        descrizione: parte.nota ?? '',
      }));
      if (candidati.length === 1) accumula(certi, candidati[0].chiave, { ...parte, ordine });
      else proponi('ricompensa', `richiesta/${r.chiave}`, candidati, 'Ricompensa con più corrispondenze nel catalogo.', parte.quantita, 'da-verificare', `${parte.categoria ?? ''}:${norm(parte.nome)}`, parte.nota);
    }
    for (const [chiave, parte] of certi) ricompensa.run('richiesta', r.chiave, chiave, parte.quantita, parte.ordine, parte.nota);
  }

  // I premi restano legami: non segnano ottenimenti, ranghi, esiti d'esame o disponibilità.
  const collegaPremi = (tipo: string, fonte: string, premi: Array<{ testo: string; nota: string | null; effetto?: string }>) => {
    const certi = new Map<string, QuantitaCollegata>();
    let ordine = 0;
    for (const premio of premi) for (const parte of parti(premio.testo)) {
      const candidati = trova(parte.nome, parte.categoria);
      if (!candidati.length) candidati.push(crea(parte.categoria ?? 'altro', parte.nome, 'guida', `premio/${tipo}/${fonte}/${ordine}`, {
        descrizione: parte.nota ?? '', effetto: premio.effetto ?? '',
      }));
      const nota = [...new Set([premio.nota, parte.nota].filter(Boolean))].join(' · ') || null;
      if (candidati.length === 1) accumula(certi, candidati[0].chiave, { quantita: parte.quantita, ordine, nota });
      else proponi('ricompensa', `${tipo}/${fonte}`, candidati, 'Premio con più corrispondenze nel catalogo: scegli l’identità.',
        parte.quantita, 'da-verificare', `${parte.categoria ?? ''}:${norm(parte.nome)}`, nota);
      ordine++;
    }
    for (const [chiave, p] of certi) ricompensa.run(tipo, fonte, chiave, p.quantita, p.ordine, p.nota);
  };
  const esamiPresenti = new Set((db.prepare('SELECT chiave FROM esame').all() as Array<{ chiave: string }>).map((e) => e.chiave));
  for (const p of PREMI_ESAMI_121) {
    if (!esamiPresenti.has(p.esame)) continue;
    collegaPremi('esame', p.esame, [{ testo: `${p.nome} (accessorio)`, effetto: p.effetto,
      nota: `Da Sojiro dopo risultati eccellenti; ritiro ${p.periodo}. ${FONTE_PREMI_ESAMI_121}` }]);
  }
  const confidentiPresenti = new Set((db.prepare('SELECT chiave FROM confidente').all() as Array<{ chiave: string }>).map((c) => c.chiave));
  for (const [campo, prefisso] of [['consumabili', 'consumabili'], ['chiaveEMateriali', 'chiave-e-materiali']]) {
    for (const [ordine, r] of elenco(guida[campo]).entries()) {
      const donatore = donatoreOggetto121(testo(r.dove));
      const oggetto = perFonte.get(`guida\0${prefisso}/${testo(r.nome)}`);
      if (!donatore || !oggetto || !confidentiPresenti.has(donatore)) continue;
      ricompensa.run('confidente', donatore, oggetto.chiave, 1, ordine, [testo(r.dove), testo(r.fonte)].filter(Boolean).join('\n'));
    }
  }
  const covo = record(blocco('completamento').covo);
  const premiFinali: Readonly<Record<string, string>> = {
    'Velo invisibile (ricompensa finale)': 'accessorio', 'Lettera dei Reali (ricompensa finale)': 'chiave',
  };
  for (const r of elenco(covo.premi)) {
    const categoria = premiFinali[testo(r.nome)]; if (!categoria) continue;
    const nome = testo(r.nome).replace(/ \(ricompensa finale\)$/, '');
    collegaPremi('covo', testo(r.nome), [{ testo: `${nome} (${categoria === 'chiave' ? 'oggetto chiave' : categoria})`, effetto: testo(r.effetto),
      nota: [testo(r.sblocco), testo(r.effetto), testo(covo.fonte)].filter(Boolean).join('\n') }]);
  }
  const sfide = blocco('sfide');
  for (const s of elenco(record(sfide.battaglieSfida).elenco)) {
    const premi = (Array.isArray(s.ricompense) ? s.ricompense : []).flatMap((v: unknown) => {
      const premio = premioSfida121(testo(v));
      return premio ? [{ ...premio, nota: [premio.nota, testo(s.fonte)].filter(Boolean).join(' · ') }] : [];
    });
    collegaPremi('sfida', testo(s.chiave), premi);
  }
  for (const s of elenco(sfide.bossSegreti)) {
    const premi = (Array.isArray(s.ricompense) ? s.ricompense : []).map(testo)
      .filter((v) => v && !/^(?:Trofeo|Premio)\b|^~?[\d.,]+\s*(?:PE\b|¥|yen\b)/i.test(v))
      .map((v) => ({ testo: v, nota: [testo(s.quando), ...((Array.isArray(s.requisiti) ? s.requisiti : []).map(testo)), testo(s.fonte)].filter(Boolean).join('\n') }));
    collegaPremi('sfida', testo(s.chiave), premi);
  }
  // Le domande correnti premiano soltanto Doti/punti: nessuna identità inventata dal loro testo.

  // Jose: la fonte completa diventa un normale listino. Nessun contatore di fiori o stato dei dedali nuovo.
  const jose = blocco('jose');
  if (Object.keys(jose).length && !db.prepare("SELECT 1 FROM cestino WHERE tipo = 'negozio' AND chiave = 'jose'").get()) {
    const scambi = scambiJose121(jose.scambi);
    if (scambi.length) {
      db.prepare(`INSERT OR IGNORE INTO negozio(chiave,ordine,nome,luogo,tipo,gestore,note,fonte,origine,updated_at)
        VALUES ('jose',(SELECT COALESCE(MAX(ordine),-1)+1 FROM negozio),'Jose','Memento','oggetti','Jose',?,?,'seed',?)`)
        .run('Scambi in fiori. Le aperture effettive dei dedali si segnano in Partita → Progressi; non sono dedotte dalla data.',
          'https://www.allgamestaff.it/persona-5-royal/negozi-speciali/', adesso);
      const visibile = db.prepare("SELECT 1 FROM negozio WHERE chiave = 'jose' AND nascosto = 0").get();
      if (visibile) {
        const precedenti = db.prepare("SELECT * FROM articolo WHERE negozio_chiave = 'jose' ORDER BY ordine,chiave").all() as Riga[];
        const ordineIniziale = precedenti.reduce((n, a) => Math.max(n, Number(a.ordine) + 1), 0);
        const inserisciOfferta = db.prepare(`INSERT INTO articolo
          (chiave,negozio_chiave,ordine,nome,categoria,prezzo,catalogo_chiave,costo_json,condizioni_json,nota,fonte,verificato,origine,updated_at)
          VALUES (?,'jose',?,?,?,NULL,?,?,?,?,?,1,'seed',?)`);
        for (const [ordine, s] of scambi.entries()) {
          const chiave = `jose/${slug121(s.nome)}`;
          const esistenti = precedenti.filter((a) => a.chiave === chiave || norm(testo(a.nome_it) || testo(a.nome)) === norm(s.nome));
          let candidati = trova(s.nome, s.categoria);
          if (!candidati.length) candidati = [crea(s.categoria, s.nome, 'guida', `jose/${s.nome}`, { effetto: s.effetto })];
          if (esistenti.length) {
            // Prezzi, costi, condizioni, visibilità e acquisti preesistenti restano dell'utente.
            for (const a of esistenti) if (a.catalogo_chiave == null) proponi('articolo', testo(a.chiave), candidati,
              'Offerta di Jose già presente: conferma soltanto l’identità, mantenendo costo e requisiti attuali.');
            continue;
          }
          inserisciOfferta.run(chiave, ordineIniziale + ordine, candidati.length === 1 ? '' : s.nome, s.categoria,
            candidati.length === 1 ? candidati[0].chiave : null, JSON.stringify({ tipo: 'fiori', importo: s.fiori }),
            JSON.stringify(s.condizioni), `Indicazioni originali della fonte: ${s.requisito}. ${s.effetto}`,
            'https://www.allgamestaff.it/persona-5-royal/negozi-speciali/', adesso);
          if (candidati.length > 1) proponi('articolo', chiave, candidati, 'Più identità corrispondono allo scambio di Jose: scegli l’oggetto ricevuto.');
        }
      }
    }
  }

  // Sakai: conserva i quattro articoli storici e aggiunge soltanto le finestre mancanti dalla guida.
  const sakai = elenco(guida.scambi).find((s) => norm(testo(s.venditore)) === 'mercante sakai');
  const negozioSakai = db.prepare("SELECT chiave FROM negozio WHERE chiave = 'mercante-sakai'").get();
  if (sakai && negozioSakai) {
    const ordineIniziale = (db.prepare("SELECT COALESCE(MAX(ordine),-1)+1 AS n FROM articolo WHERE negozio_chiave = 'mercante-sakai'").get() as { n: number }).n;
    const inserisciScambio = db.prepare(`INSERT INTO articolo
      (chiave,negozio_chiave,ordine,nome,categoria,prezzo,effetto,condizioni_json,catalogo_chiave,costo_json,nota,fonte,verificato,origine,updated_at)
      VALUES (?,'mercante-sakai',?,?,?,NULL,?,?,?,?,?,?,1,'seed',?)`);
    for (const [ordine, scambio] of elenco(sakai.offerte).entries()) {
      const ricevi = parti(scambio.ricevi)[0]; const dai = parti(scambio.dai)[0];
      const date = /^(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})$/.exec(testo(scambio.note));
      if (!ricevi || !dai || !date) continue;
      const dal = `${date[1].padStart(2, '0')}-${date[2].padStart(2, '0')}`;
      const al = `${date[3].padStart(2, '0')}-${date[4].padStart(2, '0')}`;
      let ricevuti = trova(ricevi.nome, ricevi.categoria);
      if (!ricevuti.length) ricevuti = [crea(ricevi.categoria ?? 'altro', ricevi.nome, 'guida', `sakai/ricevi/${slug121(ricevi.nome)}`, { effetto: ricevi.nota ?? '' })];
      let ceduti = trova(dai.nome, dai.categoria);
      if (!ceduti.length) ceduti = [crea(dai.categoria ?? 'altro', dai.nome, 'guida', `sakai/dai/${slug121(dai.nome)}`, { descrizione: 'Oggetto richiesto dal Mercante Sakai per uno scambio.' })];
      const costo = ceduti.length === 1 ? JSON.stringify({ tipo: 'oggetti', oggetti: [{ chiave: ceduti[0].chiave, quantita: dai.quantita }] }) : null;
      const base = `mercante-sakai/${slug121(ricevi.nome)}`;
      const esistente = db.prepare("SELECT * FROM articolo WHERE negozio_chiave = 'mercante-sakai' AND (chiave = ? OR nome = ?) ORDER BY chiave").all(base, ricevi.nome) as Riga[];
      let chiave: string;
      if (esistente.length === 1) {
        const a = esistente[0]; chiave = testo(a.chiave);
        // Costi strutturati mancanti: non si sostituiscono costi già corretti e non si riscrivono prezzo/condizioni/nome.
        if (a.costo_json == null && costo !== null) db.prepare('UPDATE articolo SET costo_json = ? WHERE chiave = ? AND costo_json IS NULL').run(costo, chiave);
      } else if (esistente.length > 1) {
        // Più righe dell'utente non sono un invito a fonderle o a sceglierne una.
        for (const a of esistente) proponi('articolo', testo(a.chiave), ricevuti, 'Più righe del listino corrispondono allo scambio di Sakai: verifica il legame senza cambiarne i dati.');
        continue;
      } else {
        chiave = base;
        const condizioni = JSON.stringify([{ tipo: 'intervallo', dal, al }]);
        inserisciScambio.run(chiave, ordineIniziale + ordine, ricevi.nome, ricevuti[0].categoria, ricevi.nota,
          condizioni, ricevuti.length === 1 ? ricevuti[0].chiave : null, costo,
          `Scambio: ${dai.quantita > 1 ? `${dai.quantita} × ` : ''}${dai.nome}. ${testo(scambio.note)}.`, testo(sakai.fonte), adesso);
      }
      if (ricevuti.length > 1) proponi('articolo', chiave, ricevuti, 'Oggetto ricevuto da Sakai presente più volte nel catalogo: scegli quale collegare.');
      if (ceduti.length > 1) {
        for (const o of ceduti) db.prepare(`INSERT OR IGNORE INTO proposta_abbinamento
          (riga_tipo,riga_chiave,catalogo_chiave,quantita,motivo,certezza,gruppo,modifica_json,updated_at) VALUES ('articolo',?,?,?,?,?,?,?,?)`)
          .run(chiave, o.chiave, dai.quantita, `Costo dello scambio di Sakai: «${dai.nome}» ha più corrispondenze. Confermare cambia solo il costo, non l’oggetto ricevuto.`,
            'da-verificare', `costo/${norm(dai.nome)}`, JSON.stringify({ azione: 'collega', ruolo: 'costo', quantita: dai.quantita }), adesso);
      }
    }
  }

  // I baratti mancanti sono proposte di nuove offerte: la capsula casuale da 500 yen resta invariata.
  const gachapon = elenco(guida.scambi).find((s) => testo(s.venditore) === 'Gachapon di Akihabara ("L\'Uomo avido")');
  if (gachapon && db.prepare("SELECT 1 FROM negozio WHERE chiave = 'gachapon-akihabara' AND nascosto = 0").get()) {
    const aggiungiProposta = db.prepare(`INSERT OR IGNORE INTO proposta_abbinamento
      (riga_tipo,riga_chiave,catalogo_chiave,quantita,motivo,certezza,gruppo,modifica_json,updated_at)
      VALUES ('articolo',?,?,1,?,?,'baratto-gachapon',?,?)`);
    for (const s of scambiGachapon121(gachapon.offerte)) {
      const chiave = `gachapon-akihabara/scambio-${slug121(s.capsula)}`;
      if (db.prepare('SELECT 1 FROM articolo WHERE chiave = ?').get(chiave)) continue;
      let capsule = trova(s.capsula);
      if (!capsule.length) capsule = [crea('materiale', s.capsula, 'guida', `gachapon/capsula/${s.capsula}`, { altri: [s.nomeFonte],
        descrizione: 'Gacha da cedere all’Uomo avido di Akihabara; non è la capsula casuale acquistata dalla macchina.' })];
      const ricevuti: Array<{ chiave: string; quantita: number; nota: string | null }> = [];
      for (const risultato of s.risultati) {
        let candidati = trova(risultato.nome, risultato.categoria);
        if (!candidati.length) candidati = [crea(risultato.categoria, risultato.nome, 'guida', `gachapon/risultato/${risultato.nome}`)];
        if (candidati.length === 1) ricevuti.push({ chiave: candidati[0].chiave, quantita: 1, nota: risultato.nota });
        else proponi('ricompensa', `articolo/${chiave}`, candidati,
          'Risultato del baratto Gachapon da abbinare dopo aver confermato la creazione dell’offerta. Nessun acquisto viene segnato.',
          1, 'da-verificare', norm(risultato.nome), risultato.nota);
      }
      const nota = `${s.originale}\n${s.capsula === 'Mothman muschiato'
        ? 'Guida AGS: cinque Repliche d’arma, poi Balsamo vitale; sono alternative. La spunta non conta gli scambi né sceglie il premio.'
        : 'Gli oggetti ricevuti sono simultanei in un solo baratto, non acquisti separati.'}`;
      for (const capsula of capsule) aggiungiProposta.run(chiave, capsula.chiave,
        'Baratto della guida assente dal listino: confermare crea una sola offerta, distinta dalla capsula casuale da 500 yen. Non applica la spunta né consuma oggetti.',
        capsule.length === 1 && ricevuti.length === s.risultati.length ? 'certa' : 'da-verificare',
        JSON.stringify({ azione: 'crea', negozio: 'gachapon-akihabara', nome_offerta: `Scambio: ${s.capsula}`,
          costo: { tipo: 'oggetti', oggetti: [{ chiave: capsula.chiave, quantita: 1 }] }, ricevuti, nota_offerta: nota,
          fonte: FONTE_GACHAPON_121, condizioni: [] }), adesso);
    }
  }

  // G-013: i valori già corretti non vengono riscritti. Una correzione dell'utente resta proposta.
  for (const [chiave, prezzo] of [['chiesa-kanda/vino-della-grazia', 14000], ['chiesa-kanda/ceneri-del-pentimento', 12000]] as const) {
    const a = db.prepare('SELECT * FROM articolo WHERE chiave = ?').get(chiave) as Riga | undefined;
    if (!a || a.prezzo === prezzo || a.nascosto === 1) continue;
    if (a.origine === 'seed' && a.seed_json == null && [3000, 4000].includes(Number(a.prezzo))) {
      db.prepare("UPDATE articolo SET prezzo = ?,seed_json = ?,origine = 'utente',updated_at = ? WHERE chiave = ? AND prezzo IS ?")
        .run(prezzo, JSON.stringify(a), adesso, chiave, a.prezzo ?? null);
    } else proposta.run('articolo', chiave, a.catalogo_chiave ?? null, 1, 'G-013: prezzo della guida italiana; il valore corrente è conservato finché non confermi.', 'certa', 'prezzo-kanda', null, adesso);
    if (a.origine !== 'seed' || a.seed_json != null || ![3000, 4000].includes(Number(a.prezzo))) db.prepare(`UPDATE proposta_abbinamento SET modifica_json = ?
      WHERE riga_tipo = 'articolo' AND riga_chiave = ? AND gruppo = 'prezzo-kanda' AND catalogo_chiave IS ?`)
      .run(JSON.stringify({ azione: 'collega', prezzo, prima: a }), chiave, a.catalogo_chiave ?? null);
  }
  const mascotte = 'tokobushiya/set-di-mascotte-locali';
  if (!db.prepare('SELECT 1 FROM articolo WHERE chiave = ?').get(mascotte)
    && db.prepare("SELECT 1 FROM negozio WHERE chiave = 'tokobushiya' AND nascosto = 0").get()) {
    const noti = trova('Set di mascotte locali', 'regalo');
    const o = noti.length === 1 ? noti[0] : crea('regalo', 'Set di mascotte locali', 'listino', mascotte);
    db.prepare(`INSERT INTO articolo(chiave,negozio_chiave,ordine,nome,categoria,prezzo,condizioni_json,catalogo_chiave,fonte,verificato,origine,updated_at)
      VALUES (?,'tokobushiya',(SELECT COALESCE(MAX(ordine),-1)+1 FROM articolo WHERE negozio_chiave='tokobushiya'),'', 'regalo',3600,?,?,?,1,'seed',?)`)
      .run(mascotte, JSON.stringify([{ tipo: 'data', dal: '09-02' }]), o.chiave, 'https://www.allgamestaff.it/persona-5-royal/regali/', adesso);
  }
  const katsu = db.prepare("SELECT * FROM articolo WHERE chiave = 'friggitoria-hagoromo/katsu-a-pezzettoni'").get() as Riga | undefined;
  if (katsu) {
    const attuali = json(katsu.condizioni_json);
    const attese = [{ tipo: 'quartiere', quartiere: 'kichijoji' }, { tipo: 'data', dal: '06-05' },
      { tipo: 'giorno-settimana', giorni: ['domenica'] }, { tipo: 'fascia', fascia: 'sera' }];
    const contiene = (condizioni: unknown[], c: unknown): boolean => condizioni.some((v) => JSON.stringify(v) === JSON.stringify(c)
      || (record(v).tipo === 'gruppo' && record(v).modo === 'tutte' && Array.isArray(record(v).condizioni) && contiene(record(v).condizioni as unknown[], c)));
    const mancanti = Array.isArray(attuali) ? attese.filter((c) => !contiene(attuali, c)) : attese;
    proposta.run('articolo', katsu.chiave, katsu.catalogo_chiave ?? null, 1,
      mancanti.length ? 'G-033: domenica sera, certezza bassa. Condizioni da confrontare prima di confermare; nessuna condizione è modificata dalla migrazione.'
        : 'G-033: le condizioni attese sono già presenti, nessuna modifica necessaria. Disponibilità domenica sera da verificare per la certezza bassa della fonte.',
      'da-verificare', 'hagoromo-domenica-sera', null, adesso);
    if (Array.isArray(attuali) && mancanti.length) db.prepare(`UPDATE proposta_abbinamento SET modifica_json = ?
      WHERE riga_tipo = 'articolo' AND riga_chiave = ? AND gruppo = 'hagoromo-domenica-sera' AND catalogo_chiave IS ?`)
      .run(JSON.stringify({ azione: 'collega', condizioni: [...attuali, ...mancanti], prima: katsu }), katsu.chiave, katsu.catalogo_chiave ?? null);
    const n = db.prepare("SELECT * FROM negozio WHERE chiave = 'friggitoria-hagoromo'").get() as Riga | undefined;
    if (n && typeof n.orari === 'string' && n.orari.trim()) {
      const nota = `Indicazione storica di Hagoromo: ${n.orari}. La disponibilità del Katsu è dichiarata sull’articolo (G-033, da verificare).`;
      db.prepare('UPDATE negozio SET note = ?,orari = NULL,updated_at = ? WHERE chiave = ? AND orari = ?')
        .run([testo(n.note), nota].filter(Boolean).join('\n'), adesso, n.chiave, n.orari);
    }
  }

  // Informazione attestata: trasformazioni di Jose, senza quantità/costo o possesso inventati.
  for (const [dungeon, cristallo, anello] of [
    ['kamoshida', 'Cristallo della lussuria', 'Anello della lussuria'], ['madarame', 'Cristallo della vanità', 'Anello della vanità'],
    ['kaneshiro', 'Cristallo della gola', 'Anello della gola'], ['futaba', 'Cristallo dell’ira', 'Anello dell’ira'],
    ['okumura', 'Cristallo dell’avarizia', 'Anello dell’avarizia'], ['niijima', 'Cristallo dell’invidia', 'Anello dell’invidia'],
    ['shido', 'Cristallo della boria', 'Anello della superbia'], ['maruki', 'Cristallo del dolore', 'Anello della tristezza'],
  ]) {
    if (!db.prepare('SELECT 1 FROM dungeon WHERE chiave = ?').get(dungeon)) continue;
    const identita = (nome: string, ruolo: string) => {
      const noti = trova(nome, 'accessorio');
      return noti.length === 1 ? noti[0] : crea('accessorio', nome, 'guida', `jose-trasformazione/${dungeon}/${ruolo}`);
    };
    db.prepare(`INSERT OR IGNORE INTO trasformazione_oggetto(dungeon_chiave,cristallo_chiave,anello_chiave,solo_ng_plus,fonte)
      VALUES (?,?,?,?,?)`).run(dungeon, identita(cristallo, 'cristallo').chiave, identita(anello, 'anello').chiave, dungeon === 'maruki' ? 1 : 0,
        'https://www.allgamestaff.it/persona-5-royal/accessori/');
  }

  // Varianti nominate della guida: proposte, mai deduplica delle offerte o dei loro acquisti/requisiti.
  for (const [precedente, nomeGuida] of [
    ['portafortuna-a-croce', 'Portafortuna croce'], ['portafortuna-a-teschio', 'Portafortuna teschio'],
    ['specchio-del-rimbalzo', 'Specchio del rimbotto'],
  ]) {
    const articolo = db.prepare("SELECT catalogo_chiave FROM articolo WHERE negozio_chiave = 'venditore-ambulante' AND chiave = ?").get(`venditore-ambulante/${precedente}`) as { catalogo_chiave: string | null } | undefined;
    if (!articolo?.catalogo_chiave) continue;
    const candidati = trova(nomeGuida, 'accessorio').filter((o) => o.chiave !== articolo.catalogo_chiave);
    proponi('catalogo', articolo.catalogo_chiave, candidati,
      `La guida del Venditore Ambulante usa «${nomeGuida}». Possibile doppione: verifica le identità prima di unirle. Le offerte, i prezzi, i requisiti e gli acquisti restano distinti.`,
      1, 'da-verificare', 'variante-guida-venditore');
  }

  // Disponibilità di L5/L7: solo condizioni mancanti. Le correzioni dell'utente vanno in proposta, non si sovrascrivono.
  const conCondizioni = db.prepare('SELECT * FROM articolo WHERE nascosto = 0 ORDER BY chiave').all() as Riga[];
  const condizioniDaAggiungere = (a: Riga): Riga[] => {
    if (a.chiave === 'negozio-scolastico/panino-con-yakisoba') return [{ tipo: 'giorno-settimana', giorni: ['venerdi'] }];
    if (['taisho-store/natto-rugiadoso', 'panetteria-yon-germain/sandwich-inzuppato', 'prossimo-asso/frullato-iperproteico'].includes(testo(a.chiave))) return [{ tipo: 'piove' }];
    if (a.negozio_chiave === 'distributore-shibuya-sottopasso') return [
      { tipo: 'meteo', condizione: 'senza-allerta', allerta: 'ondata-di-calore' },
      { tipo: 'meteo', condizione: 'senza-allerta', allerta: 'notte-torrida' },
    ];
    return [];
  };
  const implica = (salvate: unknown[], cercata: Riga): boolean => salvate.some((c) => {
    const r = record(c);
    if (r.tipo === cercata.tipo) {
      if (r.tipo === 'piove') return true;
      if (r.tipo === 'meteo') return r.condizione === cercata.condizione && r.allerta === cercata.allerta;
      if (r.tipo === 'giorno-settimana') return Array.isArray(r.giorni) && r.giorni.length === 1 && r.giorni[0] === 'venerdi';
    }
    return r.tipo === 'gruppo' && r.modo === 'tutte' && Array.isArray(r.condizioni) && implica(r.condizioni, cercata);
  });
  for (const a of conCondizioni) {
    const attuali = json(a.condizioni_json);
    if (a.condizioni_json != null && testo(a.condizioni_json) !== '' && !Array.isArray(attuali)) continue; // JSON errato: non si butta via per aggiungere una regola
    const condizioni = Array.isArray(attuali) ? attuali as unknown[] : [];
    const mancanti = condizioniDaAggiungere(a).filter((c) => !implica(condizioni, c));
    if (!mancanti.length) continue;
    const nuove = [...condizioni, ...mancanti];
    if (a.origine === 'utente') {
      if (typeof a.catalogo_chiave === 'string') db.prepare(`INSERT OR IGNORE INTO proposta_abbinamento
        (riga_tipo,riga_chiave,catalogo_chiave,quantita,motivo,certezza,gruppo,modifica_json,updated_at) VALUES ('articolo',?,?,1,?,'certa','disponibilita',?,?)`)
        .run(a.chiave, a.catalogo_chiave, 'La guida indica una disponibilità aggiuntiva, ma questa riga è stata corretta: si applica solo con il tuo sì.',
          JSON.stringify({ azione: 'collega', condizioni: nuove, prima: a }), adesso);
    } else db.prepare('UPDATE articolo SET condizioni_json = ?, seed_json = COALESCE(seed_json,?), updated_at = ? WHERE chiave = ? AND condizioni_json IS ?')
      .run(JSON.stringify(nuove), JSON.stringify(a), adesso, a.chiave, a.condizioni_json ?? null);
  }

  // G-034: si cambia soltanto il costo discordante noto di Shinya, non i valori eventualmente corretti dall'utente.
  const shinya = db.prepare("SELECT costo,nota FROM confidente_regalo WHERE confidente_chiave = 'shinya' AND ordine = 1 AND nome = 'Modellino di moto'").get() as { costo: string | null; nota: string | null } | undefined;
  if (shinya?.costo === '3.600-4.800 yen (fonti discordanti)') {
    db.prepare("UPDATE confidente_regalo SET costo = '4.800 yen', nota = ?, seed_json = COALESCE(seed_json,?) WHERE confidente_chiave = 'shinya' AND ordine = 1 AND costo = ? AND nome = 'Modellino di moto'")
      .run([shinya.nota, `G-034: costo precedente: ${shinya.costo}.`].filter(Boolean).join('\n'),
        JSON.stringify({ versione: 1, tipo: 'costo-regalo', confidente: 'shinya', ordine: 1, nome: 'Modellino di moto', costo: shinya.costo }), shinya.costo);
  }
  // Nascondere una voce della biblioteca o un'offerta non significa eliminare l'identità venduta altrove.
  // Solo nuove identità della migrazione: una riesecuzione non riapre oggetti poi nascosti dall'utente.
  db.prepare(`UPDATE catalogo_oggetto SET nascosto = 0 WHERE nascosto = 1 AND origine = 'seed' AND seed_json IS NULL AND updated_at = ?
    AND EXISTS (SELECT 1 FROM articolo a JOIN negozio n ON n.chiave = a.negozio_chiave
      WHERE a.catalogo_chiave = catalogo_oggetto.chiave AND a.nascosto = 0 AND n.nascosto = 0)`).run(adesso);

  // G-034: il confronto Tanaka è dato della proposta, non un aggiornamento del listino corrente.
  const tanaka = db.prepare("SELECT * FROM articolo WHERE negozio_chiave = 'tanaka-affari-loschi' ORDER BY ordine").all() as Riga[];
  if (tanaka.length) {
    const proposteTanaka = db.prepare(`INSERT OR IGNORE INTO proposta_abbinamento
      (riga_tipo,riga_chiave,catalogo_chiave,quantita,motivo,certezza,modifica_json,updated_at)
      VALUES ('articolo',?,?,1,?,?,?,?)`);
    const offerteRoyal: Array<{ precedente?: string; nome: string; prezzo: number; categoria: string; rango?: string; possibile?: boolean }> = [
      { precedente: 'five-inch-nail', nome: 'Chiodo ossidato', prezzo: 5000, categoria: 'consumabile', possibile: true },
      { precedente: 'inspired-hand-mirror', nome: 'Spec. senso spirit.', prezzo: 5000, categoria: 'consumabile', possibile: true },
      { precedente: 'gemme-elementali', nome: 'Magatama infernale', prezzo: 6000, categoria: 'consumabile' },
      { nome: 'Magatama ciclonico', prezzo: 6000, categoria: 'consumabile' },
      { nome: 'Magatama del gelo', prezzo: 6000, categoria: 'consumabile' },
      { nome: 'Magatama elettrico', prezzo: 6000, categoria: 'consumabile' },
      { nome: 'Magatama divino', prezzo: 6000, categoria: 'consumabile', rango: 'nero' },
      { nome: 'Magatama esplosivo', prezzo: 6000, categoria: 'consumabile', rango: 'nero' },
      { precedente: 'black-robe', nome: 'Veste nera', prezzo: 500, categoria: 'materiale', rango: 'nero' },
      { nome: 'Spec. spirit. oscuro', prezzo: 5000, categoria: 'consumabile', rango: 'nero' },
      { precedente: 'black-kogatana', nome: 'Kogatana nera', prezzo: 1000, categoria: 'materiale', rango: 'oscuro' },
      { precedente: 'holy-cloth', nome: 'Sacra Sindone', prezzo: 10000, categoria: 'consumabile', rango: 'oscuro' },
      { precedente: 'ouija-board', nome: 'Tavola Ouija', prezzo: 10000, categoria: 'consumabile', rango: 'oscuro' },
      { nome: 'Fotocamera spirituale', prezzo: 5000, categoria: 'consumabile', rango: 'oscuro' },
      { precedente: 'model-gun', nome: "Replica d'arma", prezzo: 1000, categoria: 'materiale', rango: 'caos' },
      { precedente: 'homunculus', nome: 'Homunculus', prezzo: 5000, categoria: 'consumabile', rango: 'caos' },
      { precedente: 'crown-of-salvation', nome: 'Corona della salvezza', prezzo: 990000, categoria: 'accessorio', rango: 'caos' },
      { nome: 'Maschera sorridente', prezzo: 5000, categoria: 'consumabile', rango: 'caos' },
    ];
    const conserva = new Set(offerteRoyal.flatMap((o) => o.precedente ? [`tanaka-affari-loschi/${o.precedente}`] : []));
    for (const a of tanaka) {
      // La tabella approvata elenca precisamente questi dieci nomi; eventuali aggiunte dell'utente non si nascondono.
      const daNascondere = ['nirvana-ring', 'black-stone', 'condenser-lens', 'hercules-anklet', 'heros-eyepatch',
        'magic-rosary', 'atom-match', 'retribution-mirror', 'dispel-ring', 'roland-medal'];
      if (conserva.has(testo(a.chiave)) || !daNascondere.some((s) => a.chiave === `tanaka-affari-loschi/${s}`)) continue;
      const o = perFonte.get(`listino\0${a.chiave}`);
      if (o) proposteTanaka.run(a.chiave, o.chiave, 'G-034: questo nome non compare nel listino Royal. Proposta: nasconderlo, non cancellarlo; gli acquisti restano.',
        'da-verificare', JSON.stringify({ azione: 'nascondi', prima: a }), adesso);
    }
    for (const [ordine, offerta] of offerteRoyal.entries()) {
      const a = offerta.precedente ? tanaka.find((r) => r.chiave === `tanaka-affari-loschi/${offerta.precedente}`) : undefined;
      if (offerta.precedente && !a) continue; // un articolo eliminato dall'utente non si ricrea come correzione
      const noti = trova(offerta.nome, offerta.categoria).filter((o) => o.fonte !== 'listino' || !o.fonteChiave.startsWith('tanaka-affari-loschi/'));
      const o = noti.find((o) => o.fonte === 'guida') ?? (noti.length === 1 ? noti[0] : undefined)
        ?? crea(offerta.categoria, offerta.nome, 'guida', `tanaka-royal/${slug121(offerta.nome)}`);
      const condizioni = (Array.isArray(json((a ?? tanaka[0]).condizioni_json)) ? json((a ?? tanaka[0]).condizioni_json) as unknown[] : [])
        .filter((c) => record(c).tipo !== 'rango-cliente');
      if (offerta.rango) condizioni.push({ tipo: 'rango-cliente', negozio: 'tanaka-affari-loschi', rango: offerta.rango });
      const chiave = a ? testo(a.chiave) : `tanaka-affari-loschi/${slug121(offerta.nome)}`;
      const motivo = offerta.possibile ? 'G-034: corrispondenza possibile dal nome inglese, non certa. Controlla nome, prezzo e grado affiancati prima di confermare.'
        : offerta.precedente === 'homunculus' ? 'G-034: il negozio Royal indica 5.000 ¥, non i 120.000 della pagina Oggetti. Il valore precedente rimane nella nota.'
          : `G-034: ${a ? 'abbinamento proposto' : 'nuovo oggetto in vendita proposto'} dal listino Royal; nessuna variazione prima del tuo sì.`;
      proposteTanaka.run(chiave, o.chiave, motivo, offerta.possibile ? 'da-verificare' : 'probabile', JSON.stringify({
        azione: a ? 'collega' : 'crea', prezzo: offerta.prezzo, condizioni, negozio: 'tanaka-affari-loschi', ordine,
        categoria: o.categoria, prima: a ?? null,
      }), adesso);
    }
  }
}
