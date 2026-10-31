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
import { utente028 } from './028_acquisti_e_proposte.js';
import { utente029 } from './029_pesca.js';
import { utente030 } from './030_continuita_acquisti.js';
import { utente031 } from './031_yen_solo_promemoria.js';
import { utente032 } from './032_fortuna_della_partita.js';
import { utente033 } from './033_aojiru_proposte_gia_nel_saldo.js';
import { utente034 } from './034_fortuna_da_voce.js';
import { utente035 } from './035_regalo_con_punti_e_acquisto.js';
import { utente036 } from './036_effetti_di_stato_della_voce.js';
import { utente037 } from './037_letture_complete_dall_avanzamento.js';
import { utente038 } from './038_proposte_effetto_senza_fortuna.js';
import { utente039 } from './039_evento_legato_alla_voce.js';
import { utente040 } from './040_piazzamento_esami.js';
import { utente041 } from './041_punti_cronologici.js';
import { utente042 } from './042_spillo_partita_dei_pin_condivisi_tolti.js';
import { utente043 } from './043_toglie_lettura_partita.js';
import { utente044 } from './044_toglie_requisito_partita.js';
import { utente045 } from './045_proprietario_delle_partite.js';
import { utente046 } from './046_oggetti_e_sblocchi_dalla_voce.js';
import { utente047 } from './047_yen_delle_richieste_completate.js';
import { utente048 } from './048_yen_automatici.js';
import { utente049 } from './049_yen_fuori_registro.js';
import { utente050 } from './050_censimento_stati_voce.js';
import { utente051 } from './051_registro_acquisti.js';
import { utente052 } from './052_regali_ripetibili.js';
// Ondata 5, lotto G (lotteria e premi delle sfide): il trofeo e gli oggetti dati da un turno con il suo esito
import { utente053 } from './053_premi_degli_esiti.js';
// Ondata 5, lotto F-bis (oggetti con effetti rilevanti per l'app): il registro dei consumi (nel ramo del lotto era la 055, con la 054 creduta
// riservata; nessun lotto dell'ondata la usa, quindi all'integrazione è la 054: il registro resta consecutivo)
import { utente054 } from './054_consumi_degli_oggetti.js';
// 2026-10-28 (effetto della voce «oggetto restituito o venduto»): il registro dei consumi accoglie le uscite dalle voci
import { utente055 } from './055_uscite_degli_oggetti.js';
// 2026-10-29 (l'uscita di un oggetto che la partita non possiede non si propone): il registro del censimento accoglie «nulla-da-togliere»
import { utente056 } from './056_censimento_nulla_da_togliere.js';
// 2026-10-31 (L13, ondata 7, O7-2): il piazzamento agli esami accoglie «sopra la media» (premio Fascino +2 della guida)
import { utente057 } from './057_piazzamento_sopra_la_media.js';
// 2026-10-31 (C7, appunti fissi del Diario in una finestra fluttuante): la tabella degli appunti, non legata a una partita
import { utente058 } from './058_appunti_fissi.js';
// 2026-10-31 (L13, ondata 10, O10-2: «a», la relazione romantica come dato della partita): `confidente_partita.relazione_romantica`
import { utente059 } from './059_relazione_romantica.js';
// 2026-10-31 (L13, ondata 11, O11-1: «Sì, in automatico», i doni «se fidanzata» dalla relazione della partita): il giorno d'inizio della relazione
import { utente060 } from './060_relazione_romantica_dal.js';
// 2026-10-31 (Scaffale con lo scatolone del Leblanc: impostazioni «Salvataggio di P5» e «Pacchetti DLC posseduti»): `partita.salvataggio_p5`
import { utente061 } from './061_salvataggio_p5.js';
// 2026-10-31 (R12-01/7: il turno del + di un'attività dà le sue Doti con il promemoria «Applica», come la spunta di una voce): la causa «turno»
import { utente062 } from './062_proposte_dei_turni.js';
// 2026-10-31 (provenienza dei turni in Partita → Progressi): il legame esplicito turno → voce del Diario
import { utente063 } from './063_turno_della_voce.js';

export const migrazioniUtente: Migration[] = [utente001, utente002, utente003, utente004, utente005, utente006, utente007, utente008, utente009, utente010, utente011, utente012, utente013, utente014, utente015, utente016, utente017, utente018, utente019, utente020, utente021, utente022, utente023, utente024, utente025, utente026, utente027, utente028, utente029, utente030, utente031, utente032, utente033, utente034, utente035, utente036, utente037, utente038, utente039, utente040, utente041, utente042, utente043, utente044, utente045, utente046, utente047, utente048, utente049, utente050, utente051, utente052, utente053, utente054, utente055, utente056, utente057, utente058, utente059, utente060, utente061, utente062, utente063];
