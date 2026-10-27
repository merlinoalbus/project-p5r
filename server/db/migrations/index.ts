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
// 175: «Iweleth esiste solo come dedalo dei Memento» — decisione confermata dall'utente il 24/10, dopo la verifica sulle guide Royal (lotti/L11/iweleth-maruki-fonti-royal-2026-10-24.md); la migrazione, già applicata, non si tocca.
import { migration175 } from './175_iweleth_confluenza.js';
import { migration177 } from './177_legami_e_presentazione_delle_mappe.js';
import { migration178 } from './178_correzioni_guida.js';
import { migration179 } from './179_contatore_palestra.js';
import { migration180 } from './180_contatore_studio.js';
import { migration181 } from './181_fusioni_velluto_registrano_la_persona.js';
import { migration182 } from './182_date_confidenti_royal.js';
import { migration183 } from './183_scadenze_palazzi_royal.js';
import { migration184 } from './184_frasi_di_orari_e_sblocco_tolte.js';
import { migration185 } from './185_attivita_royal.js';
import { migration186 } from './186_affinita_persona_fotografia.js';
import { migration187 } from './187_copie_di_nomi_e_condizioni_tolte.js';
import { migration188 } from './188_frasi_di_sblocco_dei_quartieri_tolte.js';
import { migration189 } from './189_giorno_unico_toglie_le_vecchie_tabelle.js';
import { migration190 } from './190_cestino_inviti.js';
import { migration191 } from './191_esami_domande_in_un_solo_posto.js';
import { migration192 } from './192_aree_museo_senza_virgola.js';
import { migration193 } from './193_luogo_quando_tolto.js';
import { migration194 } from './194_articolo_disponibile_dal_tolto.js';
import { migration195 } from './195_cruciverba_hacker_doppione_nel_cestino.js';
import { migration196 } from './196_voce_13_novembre_sera_katsu.js';
import { migration197 } from './197_correzioni_royal_diario_hagoromo.js';
import { migration198 } from './198_esame_correggibile.js';
import { migration199 } from './199_calendario_correggibile.js';
import { migration200 } from './200_voce_14_novembre_arena_royal.js';
import { migration201 } from './201_voce_19_novembre_senza_moloch_kasumi.js';
import { migration202 } from './202_dettagli_attivita_senza_ripetizioni.js';
import { migration203 } from './203_attivita_colonne_di_prosa_tolte.js';
import { migration204 } from './204_voci_da_rivedere_chiuse.js';
import { migration205 } from './205_maruki_scadenza_nota_gfinity.js';
import { migration206 } from './206_invito_makoto_4_agosto.js';
import { migration207 } from './207_voci_infiltrazioni_certe.js';
import { migration208 } from './208_pagine_ammuffite_note_storiche.js';
import { migration209 } from './209_ombra_correggibile.js';
import { migration210 } from './210_pianta_quartiere_archiviata.js';
import { migration211 } from './211_eventi_calendario_chiave_della_fonte.js';
import { migration212 } from './212_regali_correggibili.js';
import { migration213 } from './213_persona_e_skill_correggibili.js';
import { migration214 } from './214_attivita_takemi_senza_effetto_proprio.js';
import { migration215 } from './215_nome_it_tolto.js';
import { migration216 } from './216_condizioni_sblocco_mancanti.js';
import { migration217 } from './217_compendio_correggibile.js';
import { migration218 } from './218_frasi_di_sblocco_di_luoghi_e_attivita_tolte.js';
import { migration219 } from './219_voci_infiltrazioni_multiple.js';
import { migration220 } from './220_pagine_ammuffite_dal_primo_settembre.js';
import { migration221 } from './221_confidenti_e_calendario_correggibili.js';
import { migration223 } from './223_negoziazione_correggibile.js';
import { migration224 } from './224_dedalo_correggibile.js';
import { migration225 } from './225_ombra_luoghi_e_voci_correggibili.js';
import { migration226 } from './226_oggetto_compendio_correggibile.js';
import { migration227 } from './227_luoghi_e_note_correggibili.js';
import { migration222 } from './222_testi_sospetti_okumura_e_note_palazzi.js';
import { migration228 } from './228_nota_taiheido_condizione_vera.js';
import { migration229 } from './229_big_bang_burger_frase_di_sblocco_come_nota.js';
import { migration230 } from './230_capienza_iniziale_scorta.js';
import { migration231 } from './231_curry_leblanc_dote.js';
import { migration232 } from './232_testi_visibili_puliti.js';
import { migration233 } from './233_esiti_delle_attivita.js';
import { migration234 } from './234_voci_collegate_agli_esiti.js';
import { migration235 } from './235_richieste_strutturate_e_candidature.js';
import { migration236 } from './236_proposte_da_completare.js';
import { migration237 } from './237_proposte_da_completare_append_only.js';
import { migration238 } from './238_proposte_conversione_l13_4b.js';
import { migration239 } from './239_televendite_set_alternativi.js';
import { migration240 } from './240_operazioni_voci_diario.js';
import { migration241 } from './241_televendite_voci_domeniche.js';
import { migration242 } from './242_rifornimento_degli_articoli.js';
import { migration243 } from './243_regole_di_rifornimento.js';
import { migration244 } from './244_distributori_allerta_caldo.js';
import { migration245 } from './245_finestre_e_condizioni_dei_negozi.js';
import { migration246 } from './246_note_di_rifornimento.js';
import { migration247 } from './247_doppioni_dei_listini.js';
import { migration248 } from './248_offerte_dall_elenco_dei_negozi.js';
import { migration249 } from './249_frequenze_nelle_descrizioni.js';
import { migration250 } from './250_identita_doppie_unite.js';
import { migration251 } from './251_regali_righe_composte_sciolte.js';
import { migration252 } from './252_braccialetto_dargento_regalo.js';
import { migration253 } from './253_gemme_elementali_separate.js';
import { migration255 } from './255_reazione_dei_regali.js';
import { migration256 } from './256_reazioni_dei_regali.js';
import { migration257 } from './257_copie_dei_regali.js';
import { migration258 } from './258_benefattore_conteggio.js';
// Ondata 5, lotto E (prezzi): blocco 260-269
import { migration260 } from './260_prezzo_per_fascia_degli_articoli.js';
import { migration261 } from './261_costi_in_monete_e_punti.js';
import { migration262 } from './262_big_bang_burger_prezzo_di_sera.js';
import { migration263 } from './263_offerte_mancanti_dei_prezzi_orfani.js';
import { migration264 } from './264_note_storiche_dei_prezzi_discordanti.js';
import { migration265 } from './265_prezzi_tolti_dalle_descrizioni.js';
import { migration266 } from './266_prezzi_copiati_di_libri_e_videogiochi.js';
import { migration267 } from './267_abbonamento_di_scarlet_nei_dvd.js';
import { migration268 } from './268_prezzi_copiati_negli_effetti.js';
// Ondata 5, lotto F (testi degli effetti, decisione 21): blocco 270-279
import { migration270 } from './270_effetti_copiati_negli_articoli.js';
import { migration271 } from './271_traduzioni_copiate_dell_equipaggiamento.js';
import { migration272 } from './272_testi_degli_effetti_secondo_la_guida.js';
import { migration273 } from './273_distintivi_e_tessere_dei_minigiochi.js';
import { migration274 } from './274_premi_della_sfida_big_bang_burger.js';
import { migration275 } from './275_statistiche_dell_equipaggiamento.js';
import { migration276 } from './276_nomi_delle_abilita_negli_effetti.js';
import { migration277 } from './277_collana_cremisi_di_37_gradi.js';
import { migration278 } from './278_accessori_e_offerte_senza_effetto.js';
import { migration279 } from './279_copie_in_prosa_degli_effetti.js';
// Ondata 5, lotto G (lotteria): blocco 280-289
import { migration280 } from './280_lotteria_chiosco_e_biglietti.js';
import { migration281 } from './281_proposte_della_lotteria.js';
import { migration282 } from './282_vincita_di_sojiro.js';
import { migration283 } from './283_premi_delle_sfide_come_oggetti.js';
// Chiusura dell'ondata 5 (correzioni delle verifiche finali): i numeri rimasti liberi nei blocchi dei lotti C, D ed E (254, 259, 269: il runner
// applica solo gli id oltre l'ultimo applicato, un buco non si potrebbe più riempire) e, di seguito, 284-287
import { migration254 } from './254_sconto_dei_negozi.js';
import { migration259 } from './259_rifornimento_dei_servizi.js';
import { migration269 } from './269_sconto_di_takemi.js';
import { migration284 } from './284_nomi_e_identita_degli_accessori.js';
import { migration285 } from './285_identita_doppie_della_chiusura.js';
import { migration286 } from './286_accessori_mancanti_della_guida.js';
import { migration287 } from './287_ricompense_e_regali_senza_copie.js';
// Ondata 5, lotto F-bis (oggetti con effetti rilevanti per l'app, decisioni 21 e 22): 288-297, subito dopo la chiusura (nel ramo del lotto
// erano 300-309; rinumerate all'integrazione perché il registro resti consecutivo: un buco 288-299 non si potrebbe più riempire)
import { migration288 } from './288_libri_con_effetti_strutturati.js';
import { migration289 } from './289_concimare_la_pianta.js';
import { migration290 } from './290_fabbricazione_degli_strumenti.js';
import { migration291 } from './291_dvd_lettore_e_noleggi_di_scarlet.js';
import { migration292 } from './292_chihaya_pietra_sacra_e_affinita.js';
import { migration293 } from './293_diner_e_bistecca_nostalgica.js';
import { migration294 } from './294_caffe_e_curry_con_i_prodotti.js';
import { migration295 } from './295_doni_dei_confidenti_raccolti_e_vaschetta.js';
import { migration296 } from './296_incensi_e_oggetti_delle_fusioni.js';
import { migration297 } from './297_aojiru_dote_assorbita.js';
// 2026-10-27: le domande, i quiz in TV e il cruciverba delle voci che non li citavano (risposte nel riquadro «Il gioco dà»)
import { migration298 } from './298_risposte_di_domande_e_cruciverba_nelle_voci.js';
import { migration299 } from './299_bonus_si_no_della_fabbricazione.js';
// 2026-10-27 (revisione di «bonus sì/no»): le ricette delle bombe, la fabbricazione di Kawakami, le voci con lo strumento
import { migration300 } from './300_bombe_e_fabbricazione_di_kawakami.js';

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
  migration121, migration122, migration123, migration124, migration125, migration126, migration127, migration128, migration129, migration130, migration131, migration132, migration133, migration134, migration135, migration136, migration137, migration138, migration139, migration140, migration141, migration142, migration143, migration144, migration145, migration146, migration147, migration148, migration149, migration150, migration151, migration152, migration153, migration154, migration155, migration156, migration157, migration158, migration159, migration160, migration161, migration162, migration163, migration164, migration165, migration166, migration167, migration168, migration169, migration170, migration171, migration172, migration173, migration174, migration175, migration176, migration177, migration178, migration179, migration180, migration181, migration182, migration183, migration184, migration185, migration186, migration187, migration188, migration189, migration190, migration191, migration192, migration193, migration194, migration195, migration196, migration197, migration198, migration199, migration200, migration201, migration202, migration203, migration204, migration205, migration206, migration207, migration208, migration209, migration210, migration211, migration212, migration213, migration214, migration215, migration216, migration217, migration218, migration219, migration220, migration221, migration222, migration223, migration224, migration225, migration226, migration227, migration228, migration229, migration230, migration231, migration232, migration233, migration234, migration235, migration236, migration237, migration238, migration239, migration240, migration241, migration242, migration243, migration244, migration245, migration246, migration247, migration248, migration249,
  migration250, migration251, migration252, migration253, migration254,
  migration255, migration256, migration257, migration258, migration259,
  migration260, migration261, migration262, migration263, migration264, migration265, migration266, migration267, migration268, migration269,
  migration270, migration271, migration272, migration273, migration274, migration275, migration276, migration277, migration278, migration279,
  migration280, migration281, migration282, migration283, migration284, migration285, migration286, migration287, migration288, migration289,
  migration290, migration291, migration292, migration293, migration294, migration295, migration296, migration297, migration298, migration299,
  migration300,
];
