// ============================================================
// moduli — un modulo per ogni tipo del catalogo (più «videogioco», un'attività col tipo fissato): definizione + componente
// ============================================================

import type { TipoModulo } from '../../../utils/catalogo';
import type { ModuloCompleto } from './base';
import * as def from './definizioni';
import { ModuloArticolo } from './ModuloArticolo';
import { ModuloAttivita } from './ModuloAttivita';
import { ModuloFilm } from './ModuloFilm';
import { ModuloCruciverba, ModuloDomanda } from './ModuloGenerico';
import { ModuloLibro } from './ModuloLibro';
import { ModuloLuogo } from './ModuloLuogo';
import { ModuloNegozio } from './ModuloNegozio';

export const MODULI: Record<TipoModulo, ModuloCompleto> = {
  negozio: { ...def.negozio, Componente: ModuloNegozio },
  articolo: { ...def.articolo, Componente: ModuloArticolo },
  libro: { ...def.libro, Componente: ModuloLibro },
  film: { ...def.film, Componente: ModuloFilm },
  attivita: { ...def.attivita, Componente: ModuloAttivita },
  videogioco: { ...def.videogioco, Componente: ModuloAttivita },
  luogo: { ...def.luogo, Componente: ModuloLuogo },
  domanda: { ...def.domanda, Componente: ModuloDomanda },
  cruciverba: { ...def.cruciverba, Componente: ModuloCruciverba },
};
export type { Dati, DefinizioneModulo, ModuloCompleto, PropsModulo } from './base';
