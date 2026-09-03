// ============================================================
// seed:scarica — download riproducibile dei file grezzi delle fonti
// ============================================================
//
// Scarica ogni file di `FONTI` al commit fissato in data/seed/sorgenti/<id>/…
// e scrive manifest.json con URL, sha256, dimensione e data di download.
// Se un file esiste già con lo stesso hash del manifest non viene riscaricato
// e il manifest non viene toccato (idempotente: `git status` resta pulito);
// con `--forza` si riscarica tutto.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { FONTI, urlRaw, type Fonte } from './fonti.js';
import { DIR_SORGENTI, FILE_MANIFEST, percorsoSorgente } from './percorsi.js';

/** Voce del manifest per un singolo file scaricato. */
export interface VoceManifest {
  fonte: string;
  percorso: string;
  url: string;
  sha256: string;
  byte: number;
  scaricatoIl: string;
}

/** Manifest complessivo dei download. */
export interface Manifest {
  generatoIl: string;
  fonti: Array<Pick<Fonte, 'id' | 'proprietario' | 'repository' | 'commit' | 'dataCommit' | 'licenza'>>;
  file: VoceManifest[];
}

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function leggiManifest(): Manifest | null {
  if (!fs.existsSync(FILE_MANIFEST)) return null;
  return JSON.parse(fs.readFileSync(FILE_MANIFEST, 'utf-8')) as Manifest;
}

async function scaricaFile(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`download fallito ${res.status} ${res.statusText}: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Esegue il download di tutte le fonti e restituisce il manifest aggiornato. */
export async function scaricaTutto(forza = false): Promise<Manifest> {
  const precedente = leggiManifest();
  const voci: VoceManifest[] = [];
  let scaricati = 0;
  for (const fonte of FONTI) {
    for (const percorso of fonte.file) {
      const destinazione = percorsoSorgente(fonte.id, percorso);
      const url = urlRaw(fonte, percorso);
      const vocePrecedente = precedente?.file.find((v) => v.fonte === fonte.id && v.percorso === percorso);
      if (!forza && vocePrecedente && fs.existsSync(destinazione)) {
        const attuale = sha256(fs.readFileSync(destinazione));
        if (attuale === vocePrecedente.sha256 && vocePrecedente.url === url) {
          voci.push(vocePrecedente);
          console.log(`= ${fonte.id}/${percorso} (invariato)`);
          continue;
        }
      }
      const buf = await scaricaFile(url);
      fs.mkdirSync(path.dirname(destinazione), { recursive: true });
      fs.writeFileSync(destinazione, buf);
      voci.push({ fonte: fonte.id, percorso, url, sha256: sha256(buf), byte: buf.length, scaricatoIl: new Date().toISOString() });
      scaricati++;
      console.log(`↓ ${fonte.id}/${percorso} (${buf.length} byte)`);
    }
  }
  // Idempotenza: se nessun file è stato riscaricato e le fonti sono le stesse,
  // il manifest resta byte-per-byte identico (nessun nuovo timestamp).
  const fontiAttuali = FONTI.map(({ id, proprietario, repository, commit, dataCommit, licenza }) => ({ id, proprietario, repository, commit, dataCommit, licenza }));
  if (precedente && scaricati === 0 && JSON.stringify(precedente.fonti) === JSON.stringify(fontiAttuali) && precedente.file.length === voci.length) {
    console.log('manifest invariato');
    return precedente;
  }
  const manifest: Manifest = {
    generatoIl: new Date().toISOString(),
    fonti: FONTI.map(({ id, proprietario, repository, commit, dataCommit, licenza }) => ({ id, proprietario, repository, commit, dataCommit, licenza })),
    file: voci,
  };
  fs.mkdirSync(DIR_SORGENTI, { recursive: true });
  fs.writeFileSync(FILE_MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

const eseguitoDirettamente = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (eseguitoDirettamente) {
  scaricaTutto(process.argv.includes('--forza'))
    .then((m) => console.log(`manifest: ${m.file.length} file, ${FILE_MANIFEST}`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
