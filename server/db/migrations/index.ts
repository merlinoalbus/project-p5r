// ============================================================
// migrations/index — registro delle migrazioni dei dati di gioco: import espliciti, array ordinato per id
// ============================================================
//
// Append-only: mai modificare una migrazione già applicata; aggiungerne
// una nuova con id successivo (`index.test.ts` pretende id consecutivi).
// ============================================================

import { migration042 } from './042_contenuti_guida.js';
import { migration040 } from './040_destinazioni_spilli.js';
import { migration039 } from './039_ingressi_quartieri.js';
import type { Migration } from '../migrationRunner.js';
import { migration001 } from './001_compendio.js';
import { migration002 } from './002_partita.js';
import { migration003 } from './003_indici_fusione.js';
import { migration004 } from './004_ranghi_doti_confidenti.js';
import { migration005 } from './005_storico.js';
import { migration006 } from './006_obiettivi.js';
import { migration007 } from './007_piani_salvati.js';
import { migration008 } from './008_carica.js';
import { migration009 } from './009_cicli.js';
import { migration010 } from './010_confidenti_dettaglio.js';
import { migration011 } from './011_domande.js';
import { migration012 } from './012_calendario.js';
import { migration013 } from './013_dungeon.js';
import { migration014 } from './014_richieste.js';
import { migration015 } from './015_citta.js';
import { migration016 } from './016_cruciverba.js';
import { migration017 } from './017_negozi.js';
import { migration018 } from './018_percorso.js';
import { migration019 } from './019_trofei.js';
import { migration020 } from './020_piante.js';
import { migration021 } from './021_origine_immagine.js';
import { migration022 } from './022_piante_citta.js';
import { migration023 } from './023_bonus_statistiche.js';
import { migration024 } from './024_descrizione_persona.js';
import { migration025 } from './025_effetti_azione.js';
import { migration026 } from './026_requisiti_confidenti.js';
import { migration027 } from './027_mappe.js';
import { migration028 } from './028_immagini_spilli.js';
import { migration029 } from './029_condizioni_spilli.js';
import { migration030 } from './030_identita_seed_spilli.js';
import { migration031 } from './031_fascia_partita.js';
import { migration032 } from './032_statistiche_osservate.js';
import { migration033 } from './033_percorso_11_aprile.js';
import { migration034 } from './034_matto_12_aprile.js';
import { migration035 } from './035_catalogo_utente.js';

import { migration038 } from './038_percorsi_mappe.js';
import { migration037 } from './037_sblocco_quartieri.js';
import { migration036 } from './036_condizioni_procedurali.js';

import { migration041 } from './041_posizioni_spilli.js';
import { migration043 } from './043_ruolo_immagine.js';
import { migration044 } from './044_ruolo_emblema.js';
import { migration045 } from './045_presentazione_mancante.js';
import { migration046 } from './046_evidenze_native_spilli.js';
import { migration047 } from './047_progresso_libri.js';
import { migration048 } from './048_progresso_film.js';
import { migration049 } from './049_progresso_videogiochi.js';
import { migration050 } from './050_condizione_segreti_videogiochi.js';
import { migration051 } from './051_catalogo_utente_esteso.js';
import { migration052 } from './052_condizioni_letture_attivita.js';
import { migration053 } from './053_nomi_spilli_in_italiano.js';
import { migration054 } from './054_luoghi_con_la_loro_planimetria.js';
import { migration055 } from './055_catalogo_domande_cruciverba.js';
import { migration056 } from './056_effetti_delle_letture.js';
import { migration057 } from './057_denaro_ed_esperienza.js';
import { migration058 } from './058_articolo_collegato_all_oggetto.js';
import { migration059 } from './059_effetto_dichiarato.js';
import { migration060 } from './060_ladro_in_squadra.js';
import { migration061 } from './061_libro_sblocca_un_luogo.js';
import { migration062 } from './062_i_dodici_che_restavano_prosa.js';
import { migration063 } from './063_segnaposto.js';
import { migration064 } from './064_stati_al_posto_delle_frasi.js';
import { migration065 } from './065_categorie_spillo_e_arrivo.js';
import { migration066 } from './066_partite_in_un_file_a_parte.js';
import { migration067 } from './067_identita_stabile_degli_spilli.js';
import { migration068 } from './068_residui_da_configurare.js';
import { migration069 } from './069_orari_strutturati.js';
import { migration070 } from './070_condizioni_del_negozio_agli_articoli.js';
import { migration071 } from './071_luogo_catalogabile.js';
import { migration072 } from './072_sedi_negozi_attivita.js';
import { migration073 } from './073_collegamenti_libri_videogiochi.js';
import { migration074 } from './074_effetti_dichiarati_letture.js';
import { migration075 } from './075_attivita_strutturate.js';
import { migration076 } from './076_programma_punti.js';
import { migration077 } from './077_timbri_dedalo.js';
import { migration078 } from './078_domanda_tipo_tv.js';
import { migration079 } from './079_immagini_nel_database.js';
import { migration080 } from './080_giorni_luogo_strutturati.js';
import { migration081 } from './081_istantanee_luogo_giorni.js';
import { migration082 } from './082_nome_rivisto_mappa.js';
import { migration083 } from './083_negoziazione_domande.js';
import { migration084 } from './084_negoziazione_senza_contraddizioni.js';
import { migration085 } from './085_nemici_non_raccoglibili.js';
import { migration086 } from './086_effetti_delle_azioni.js';
import { migration087 } from './087_visioni_al_cinema.js';
import { migration088 } from './088_dote_a_ogni_incontro.js';
import { migration089 } from './089_dote_a_ogni_incontro_riparata.js';
import { migration090 } from './090_requisiti_come_eventi.js';
import { migration091 } from './091_allerte_meteo.js';
import { migration092 } from './092_giornata_canone.js';
import { migration093 } from './093_zorro_e_ballerina.js';
import { migration094 } from './094_voce_dei_pin.js';
import { migration095 } from './095_passi_degli_enigmi.js';
import { migration096 } from './096_pulizia_schema.js';
import { migration097 } from './097_atterraggio_palazzi.js';
import { migration098 } from './098_voci_dei_pin.js';
import { migration099 } from './099_aree_dei_dedali.js';
import { migration100 } from './100_trama_dei_memento.js';
import { migration101 } from './101_aree_reali_dei_dedali.js';
import { migration102 } from './102_pezzi_delle_mappe.js';
import { migration103 } from './103_copie_dei_pezzi.js';
import { migration104 } from './104_cestino.js';
import { migration105 } from './105_quiz_delle_attivita.js';
import { migration106 } from './106_ruolo_delle_immagini_caricate.js';
import { migration107 } from './107_ruolo_dalla_gerarchia.js';
import { migration108 } from './108_miniature_delle_immagini.js';
import { migration109 } from './109_aree_del_mondo.js';
import { migration110 } from './110_aree_dei_palazzi.js';
import { migration111 } from './111_carattere_delle_voci.js';
import { migration112 } from './112_voce_boss_finale.js';
import { migration113 } from './113_regola_del_boss.js';
import { migration114 } from './114_planimetria_della_voce.js';
import { migration115 } from './115_luoghi_fonte_unica.js';
import { migration116 } from './116_frase_pin_nativo.js';
import { migration117 } from './117_frase_pin_nativo_in_testa.js';
import { migration118 } from './118_condizioni_uniche.js';
import { migration119 } from './119_requisiti_della_guida.js';
import { migration120 } from './120_snapshot_sblocco_quartieri.js';
import { migration121 } from './121_catalogo_oggetti.js';
import { migration122 } from './122_bonifica_luoghi_condizioni.js';
import { migration123 } from './123_bonifica_condizioni_letture.js';
import { migration124 } from './124_bonifica_condizioni_attivita.js';
import { migration125 } from './125_ricompensa_media.js';
import { migration126 } from './126_fascino_ambulante.js';
import { migration127 } from './127_raccordi_luoghi_approvati.js';
import { migration128 } from './128_ripresa_raccordi_legacy.js';
import { migration129 } from './129_raccordi_panoramiche_quartiere.js';
import { migration130 } from './130_data_ingresso_memento.js';
import { migration131 } from './131_informazioni_makoto.js';
import { migration132 } from './132_raccordi_scambi_catalogo.js';
import { migration133 } from './133_nota_rango_makoto.js';
import { migration134 } from './134_banchi_niijima.js';
import { migration135 } from './135_attivita_confidente.js';
import { migration136 } from './136_aojiru_e_effetti_voce.js';
import { migration137 } from './137_cestino_pin.js';
import { migration138 } from './138_pesca.js';
import { migration139 } from './139_note_storiche.js';
import { migration140 } from './140_aree_dei_luoghi.js';
import { migration141 } from './141_decisione_tanaka.js';
import { migration142 } from './142_tanaka_listino_royal.js';
import { migration143 } from './143_residui_l5.js';
import { migration144 } from './144_abbinamenti_consolidati.js';
import { migration145 } from './145_pin_ann_nel_cestino.js';
import { migration146 } from './146_correzioni_royal_l7.js';
import { migration147 } from './147_aojiru_effetti_consolidati.js';
import { migration148 } from './148_camera_della_vacuita.js';
import { migration149 } from './149_inviti_nel_diario.js';
import { migration150 } from './150_correzioni_l7_residue.js';
import { migration151 } from './151_pin_cancello_shujin.js';
import { migration152 } from './152_anello_del_vento_venditore.js';
import { migration153 } from './153_mansarda_pulita_dalla_voce.js';
import { migration154 } from './154_eventi_storia_dalle_voci.js';
import { migration155 } from './155_eventi_storia_dalle_fonti_royal.js';
import { migration156 } from './156_acquisti_dalle_voci.js';
import { migration157 } from './157_domande_e_cruciverba_dalle_voci.js';
import { migration158 } from './158_niijima_domande_ed_esami_dalle_voci.js';
import { migration159 } from './159_niijima_una_sola_cassa.js';
import { migration160 } from './160_cestino_catalogo.js';
import { migration161 } from './161_ranghi_con_modo.js';
import { migration162 } from './162_vocabolario_elementi.js';
import { migration163 } from './163_disponibilita_strutturata.js';
import { migration164 } from './164_collegamenti_eventi_voci.js';
import { migration165 } from './165_date_eventi_calendario_royal.js';
import { migration166 } from './166_modello_ombra.js';
import { migration167 } from './167_nome_iwai.js';
import { migration168 } from './168_giorno_unico.js';
import { migration169 } from './169_persona_del_gruppo_schema.js';
import { migration170 } from './170_persona_del_gruppo_dati.js';
import { migration171 } from './171_effetto_invito_alle_voci.js';
import { migration172 } from './172_negoziazione_royal.js';
import { migration173 } from './173_ombre_personalita_royal.js';
import { migration174 } from './174_sinonimi_ricerca.js';
import { migration176 } from './176_marcatori_e_piante_archiviati.js';
import { migration175 } from './175_iweleth_confluenza.js';
import { migration177 } from './177_legami_e_presentazione_delle_mappe.js';

/** Registro append-only applicato dal runner in ordine di `id`. */
export const migrations: Migration[] = [
  migration001, migration002, migration003, migration004, migration005, migration006, migration007, migration008, migration009, migration010,
  migration011, migration012, migration013, migration014, migration015, migration016, migration017, migration018, migration019, migration020,
  migration021, migration022, migration023, migration024, migration025, migration026, migration027, migration028, migration029, migration030,
  migration031, migration032, migration033, migration034, migration035, migration036, migration037, migration038, migration039, migration040,
  migration041, migration042, migration043, migration044, migration045, migration046, migration047, migration048, migration049, migration050,
  migration051, migration052, migration053, migration054, migration055, migration056, migration057, migration058, migration059, migration060,
  migration061, migration062, migration063, migration064, migration065, migration066, migration067, migration068, migration069, migration070,
  migration071, migration072, migration073, migration074, migration075, migration076, migration077, migration078, migration079, migration080,
  migration081, migration082, migration083, migration084, migration085, migration086, migration087, migration088, migration089, migration090,
  migration091, migration092, migration093, migration094, migration095, migration096, migration097, migration098, migration099, migration100,
  migration101, migration102, migration103, migration104, migration105, migration106, migration107, migration108, migration109, migration110,
  migration111, migration112, migration113, migration114, migration115, migration116, migration117, migration118, migration119, migration120,
  migration121, migration122, migration123, migration124, migration125, migration126, migration127, migration128, migration129, migration130, migration131, migration132, migration133, migration134, migration135, migration136, migration137, migration138, migration139, migration140, migration141, migration142, migration143, migration144, migration145, migration146, migration147, migration148, migration149, migration150, migration151, migration152, migration153, migration154, migration155, migration156, migration157, migration158, migration159, migration160, migration161, migration162, migration163, migration164, migration165, migration166, migration167, migration168, migration169, migration170, migration171, migration172, migration173, migration174, migration175, migration176, migration177,
];
