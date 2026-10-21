// ============================================================
// Registro delle migrazioni delle partite (schema «utente», file partite.db)
// ============================================================
//
// Append-only, id consecutivi da 1. La numerazione è separata da quella dei dati di gioco:
// i due file si versionano ciascuno con il proprio `user_version`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { utente001 } from './001_schema_partite.js';
import { utente002 } from './002_spilli_raccolti_per_uid.js';
import { utente003 } from './003_timbri_dedalo.js';
import { utente004 } from './004_eventi_calcolati.js';
import { utente005 } from './005_giornata_modificabile.js';
import { utente006 } from './006_boss_segnato_dal_raccolto.js';
import { utente007 } from './007_effetti_delle_azioni.js';
import { utente008 } from './008_effetti_delle_azioni_utente.js';
import { utente009 } from './009_incontri_con_i_confidenti.js';
import { utente010 } from './010_incontri_piu_passaggi.js';
import { utente011 } from './011_incontro_punti_prima.js';
import { utente012 } from './012_conferme_come_eventi.js';
import { utente013 } from './013_meteo_della_partita.js';
import { utente014 } from './014_ordine_della_giornata.js';
import { utente015 } from './015_giornata_canone.js';
import { utente016 } from './016_indici_delle_partite.js';
import { utente017 } from './017_boss_non_piu_automatico.js';
import { utente018 } from './018_timbri_nelle_aree_dei_dedali.js';
import { utente019 } from './019_catture_nel_compendio.js';
import { utente020 } from './020_timbri_senza_totale.js';
import { utente021 } from './021_cestino_delle_partite.js';
import { utente022 } from './022_divergenze_da_verificare.js';
import { utente023 } from './023_stato_del_pin_per_infiltrazione.js';
import { utente024 } from './024_cascata_delle_tabelle_di_l4.js';
import { utente025 } from './025_inviti_della_partita.js';
import { utente026 } from './026_regali_per_catalogo.js';
import { utente027 } from './027_sessione_videogioco.js';

export const migrazioniUtente: Migration[] = [utente001, utente002, utente003, utente004, utente005, utente006, utente007, utente008, utente009, utente010, utente011, utente012, utente013, utente014, utente015, utente016, utente017, utente018, utente019, utente020, utente021, utente022, utente023, utente024, utente025, utente026, utente027];
