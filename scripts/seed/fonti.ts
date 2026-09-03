// ============================================================
// Fonti del dataset — repository, commit fissati, file, licenze
// ============================================================
//
// I commit sono FISSATI (non `master`) così il download è riproducibile:
// aggiornare il dataset significa cambiare qui lo SHA, rilanciare
// `seed:scarica` + `seed:normalizza` + `seed:verifica` e rivedere il
// report di verifica incrociata.
// ============================================================

/** Descrizione di una fonte remota da cui scaricare file grezzi. */
export interface Fonte {
  /** Identificativo breve, usato come nome di cartella in data/seed/sorgenti/. */
  id: string;
  proprietario: string;
  repository: string;
  commit: string;
  /** Data del commit (informativa). */
  dataCommit: string;
  licenza: string;
  /** Percorsi dei file nel repository. */
  file: string[];
}

/** Fonte primaria: dati Royal completi + logica di fusione (Apache-2.0). */
export const FONTE_CHINHODADO: Fonte = {
  id: 'chinhodado',
  proprietario: 'chinhodado',
  repository: 'persona5_calculator',
  commit: '802422dad1f5b9eee441e594e738aceaeb9e5a85',
  dataCommit: '2024-04-07',
  licenza: 'Apache-2.0',
  file: [
    'data/PersonaDataRoyal.ts',
    'data/SkillDataRoyal.ts',
    'data/ItemDataRoyal.ts',
    'data/Data5Royal.ts',
    'src/FusionCalculator.ts',
    'src/DataUtil.ts',
    'LICENSE',
  ],
};

/** Fonte di verifica: dataset indipendente (Unlicense). */
export const FONTE_AQIU384: Fonte = {
  id: 'aqiu384',
  proprietario: 'aqiu384',
  repository: 'megaten-fusion-tool',
  commit: 'e93dd1c87ca453de8fae8165bdbef220732feabc',
  dataCommit: '2026-08-26',
  licenza: 'Unlicense',
  file: [
    'src/app/p5/data/roy-demon-data.json',
    'src/app/p5/data/skill-data.json',
    'src/app/p5/data/roy-skill-data.json',
    'src/app/p5/data/roy-fusion-chart.json',
    'src/app/p5/data/roy-element-chart.json',
    'src/app/p5/data/roy-special-recipes.json',
    'src/app/p5/data/roy-demon-unlocks.json',
    'src/app/p5/data/roy-fusion-prereqs.json',
    'src/app/p5/data/roy-party-data.json',
    'src/app/p5/data/roy-enemy-data.json',
    'src/app/p5/data/roy-accessories.json',
    'src/app/p5/data/comp-config.json',
    'src/app/compendium/data/skill-effects.json',
    'LICENSE.md',
  ],
};

export const FONTI: Fonte[] = [FONTE_CHINHODADO, FONTE_AQIU384];

/** URL raw di un file a un commit fissato. */
export function urlRaw(fonte: Fonte, percorso: string): string {
  return `https://raw.githubusercontent.com/${fonte.proprietario}/${fonte.repository}/${fonte.commit}/${percorso}`;
}
