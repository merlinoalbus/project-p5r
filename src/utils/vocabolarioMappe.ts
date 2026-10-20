// ============================================================
// vocabolarioMappe — come si chiamano le mappe intorno a quella aperta (L0, 2026-10-20; L2, 2026-10-20)
// ============================================================
//
// Le parole seguono le gerarchie: Città → Quartiere → Area → Planimetria nel mondo, Palazzo → Area → Planimetria nei Palazzi.
// «Luogo» è solo l'attività (Untouchable, Diner), e non nomina più una zona né una mappa.
//
// L2: nei menu e negli elenchi i posti si chiamano col loro nome o col nome del loro livello, mai «Mappa»/«Mappe» (decisione
// dell'utente: «chiamandolo con il suo nome… e non con mappa che si confonde con le mappe»). Nel mondo una mappa che sta in
// un'Area è una **Planimetria**, qualunque sia il suo tipo tecnico (`luogo` o `area`): lo dice `nomeTipoMappa`.
// ============================================================

import { NOME_TIPO_MAPPA, type TipoMappa } from '../../shared/spilli';

/** Il nome del livello di una mappa, per il chip del visore e gli elenchi: «Planimetria» se sta in un'Area del mondo (L2, R2-39),
 *  altrimenti quello del suo tipo («Città», «Quartiere», «Palazzo»…). */
export function nomeTipoMappa(mappa: { tipo: TipoMappa; area?: unknown }): string {
  return mappa.area ? 'Planimetria' : NOME_TIPO_MAPPA[mappa.tipo];
}

/** L5 §4.4b (M9): il gesto che apre l'editor porta il nome di quel che modifica: «Modifica illustrazione» per la città e i quartieri,
 *  «Modifica planimetria» per il resto (come `MappaIncorporata`). */
export function titoloModificaMappa(mappa: { tipo: TipoMappa; area?: unknown }): string {
  return !mappa.area && (mappa.tipo === 'citta' || mappa.tipo === 'quartiere') ? 'Modifica illustrazione' : 'Modifica planimetria';
}

/** Il testo alternativo dell'immagine di una mappa nel visore (L2, M17): «Planimetria di Central Street» per una planimetria (di
 *  un'Area o di un Palazzo), «Illustrazione di Shibuya» per la città e i quartieri, il solo nome per il resto. Mai «Mappa: …». */
export function descrizioneImmagineMappa(mappa: { tipo: TipoMappa; nome: string; area?: { nome: string; versioneEtichetta?: string | null } | null }): string {
  // due versioni della stessa Area non hanno lo stesso testo: «Planimetria di Sottopasso · planimetria completa» (condizione di Stesura)
  if (mappa.area) return mappa.area.versioneEtichetta ? `Planimetria di ${mappa.area.nome} · ${mappa.area.versioneEtichetta}` : `Planimetria di ${mappa.area.nome}`;
  if (mappa.tipo === 'citta' || mappa.tipo === 'quartiere') return `Illustrazione di ${mappa.nome}`;
  if (mappa.tipo === 'area' || mappa.tipo === 'luogo') return `Planimetria di ${mappa.nome}`;
  return mappa.nome;
}

/** Il nome di ciò che una mappa contiene, per l'elenco delle sue figlie (L2, M12/M16): i quartieri nella città, le aree in un
 *  quartiere, le planimetrie altrove. */
export function nomeFiglieMappa(tipo: TipoMappa): string {
  return tipo === 'citta' ? 'Quartieri' : tipo === 'quartiere' ? 'Aree' : 'Planimetrie';
}

/** L'intestazione delle mappe vicine (figlie e genitore) di una mappa del tipo dato, nel pannello del visore. */
export function titoloMappeVicine(tipo: TipoMappa): string {
  switch (tipo) {
    case 'citta': return 'Quartieri';
    case 'quartiere': return 'Aree';
    // un'area del mondo: accanto ha le aree vicine (e il quartiere sopra), non «planimetrie e mappe collegate» (M18b)
    case 'luogo': return 'Aree vicine';
    case 'palazzo':
    case 'area': return 'Planimetrie';
    case 'dedalo': return 'Dedali';
    default: return 'Posti collegati';
  }
}

/** Il nome delle mappe che stanno accanto a una mappa del tipo dato (stesso genitore): il selettore del pannello cambia fra loro. */
export function titoloMappeSorelle(tipo: TipoMappa): string {
  switch (tipo) {
    case 'quartiere': return 'Quartieri';
    case 'luogo': return 'Aree';
    case 'area': return 'Planimetrie';
    case 'palazzo': return 'Palazzi';
    case 'dedalo': return 'Dedali';
    default: return 'Posti';
  }
}

/** Il nome per i lettori di schermo del gruppo delle mappe accanto («Altri quartieri», «Altre aree»…), accordato per genere. */
export function etichettaMappeSorelle(tipo: TipoMappa): string {
  switch (tipo) {
    case 'quartiere': return 'Altri quartieri';
    case 'luogo': return 'Altre aree';
    case 'area': return 'Altre planimetrie';
    case 'palazzo': return 'Altri Palazzi';
    case 'dedalo': return 'Altri dedali';
    default: return 'Altri posti';
  }
}
