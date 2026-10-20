# Ricognizione L2 — aree e planimetrie del mondo (copia di produzione data/, sola lettura, 2026-10-20)

- Oggi Shibuya si apre in 4 modi diversi (obiettivo L2: uno solo da ogni punto).
- 29 mappe di tipo `luogo` sotto i quartieri → proposta di **23 aree** (alcune mappe sono versioni della stessa area: es. Sottopasso Speciale è una versione).
- Proposta di schema: tabella `area_mondo` (chiave '<quartiere>/<slug>', quartiere_chiave, slug, nome, ordine, planimetria_predefinita, origine, updated_at) + colonne `mappa.area_mondo_chiave`, `mappa.versione_etichetta`, `mappa.versione_ordine`; `luogo.area_chiave`; `quartiere_ingresso.area_chiave`; nuovo `riferimento_tipo` 'area-mondo' per gli 8 pin di passaggio (id 1630-1632, 1625-1626, 1633-1635); elenco di redirect dalle vecchie URL; la regola della migrazione 054 va riscritta.
- Casi ambigui: Shujin su 3 piani; mappe dello staff sotto Tokyo; Sottopasso con planimetria predefinita 001-2-0 e trappola degli alias; 51 luoghi su 93 senza area; 12 aree senza pin di passaggio; 7 luoghi con doppio pin; Aula non collegata; Covo dei Ladri sotto Yongen-Jaya (D2 consigliata: area di Yongen-Jaya, le 5 planimetrie `nativo-rmap-022-*` diventano sue versioni).
- Ripetere la ricognizione di dettaglio sul codice prima di implementare (questa è una sintesi).
