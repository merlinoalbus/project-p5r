# L9 blocco G — collegamenti fra i 173 eventi del calendario e le voci del Diario

Analisi dati, 2026-10-24, sola lettura. Decisione dell'utente del 24/10: gli eventi del calendario restano eventi e non diventano voci; qui si prepara solo il **collegamento** evento → voce. Nessuna voce nuova, nessun testo cambiato, nessun commit.

## 1. In breve

- Eventi: **173** (`evento_calendario`: storia 61, sblocco 46, festa 24, scadenza 18, vacanza 11, esame 8, meteo 4, consiglio 1).
- **109 eventi hanno almeno un collegamento certo**, **15 solo collegamenti dubbi**, **49 nessuna voce** (feste, condizioni del giorno, scadenze dei Palazzi senza azione, meteo, eventi di trama non presenti nel Diario).
- Collegamenti: **158**, di cui **134 certi** e **24 dubbi**, su **152 voci distinte** del Diario. Una voce può servire due eventi (es. `8d4502a1` per l'incontro con Ohya e per lo sblocco di Shinjuku).
- **Sei eventi hanno una data da correggere** (la voce giusta è il giorno dopo o prima: ids 26, 41, 47, 75, 115, 137); **uno** descrive un rango 1 che nel Diario non ha voce (id 44, Akechi).
- Base dei dati: copia di p5s del 23/10 19:35Z portata a gioco 146, **998 voci** (255 nel periodo validato 04-01..06-01). I collegamenti **non toccano** le voci: sono una tabella a parte. Prima della migrazione ogni `uid` va riverificato sull'istanza.

## 2. Come ho abbinato

Per ogni evento ho confrontato titolo e dettaglio con le voci della **stessa data** (tipo, riferimento al Confidente o al Palazzo, rango atteso, testo). Le voci che stanno su un'altra data entrano solo se la fonte Royal le conferma.

- **Certa (C)**: la voce descrive esplicitamente l'evento (stesso Palazzo, stessa scena, stesso Confidente con rango atteso uguale, esame della stessa sessione, ecc.). Prova = il testo della voce e la sua data, per i ranghi anche il campo `rango_atteso`.
- **Dubbia (D)**: la voce c'è ma copre solo in parte l'evento, oppure data o contenuto non coincidono del tutto.
- **Nessuna (N)**: non c'è nessuna voce che lo descriva. Non si inventa un collegamento: restano eventi senza voce.

## 3. Esito per tipo di evento

| Tipo | Eventi | Con collegamento certo | Solo dubbi | Nessuna voce |
|---|---:|---:|---:|---:|
| storia | 61 | 46 | 4 | 11 |
| sblocco | 46 | 36 | 5 | 5 |
| festa | 24 | 10 | 2 | 12 |
| scadenza | 18 | 3 | 4 | 11 |
| vacanza | 11 | 6 | 0 | 5 |
| esame | 8 | 8 | 0 | 0 |
| meteo | 4 | 0 | 0 | 4 |
| consiglio | 1 | 0 | 0 | 1 |
| **Totale** | **173** | **109** | **15** | **49** |

Osservazioni:
- Le **scadenze** quasi mai hanno una voce: sono limiti di tempo del Palazzo, non azioni (l'unico ancorato è il giorno della battaglia). Il loro oggetto (il Palazzo) si ricava dal titolo e va collegato per chiave `dungeon:<palazzo>`, non a una voce; lo dichiarano le note delle righe.
- Gli **sblocchi di rango 1** di quasi tutti i Confidenti hanno una voce con `rango_atteso` 1: collegamento certo, con prova diretta. Eccezioni: Akechi (nessuna voce di rango 1, la prima è di rango 3, 13/8) e quattro casi con data diversa (Yoshida, Kawakami, Yusuke, Chihaya).
- Gli **esami** sono tutti collegati: ogni sessione ha la voce «Sostenere gli esami» alla stessa data.

## 4. Collegamenti dubbi e verifica sulle fonti Royal

Verifiche fatte il 24/10 su AllGameStaff (guide dei Confidenti e dei Palazzi) e sul registro dell'Esperto (G-017); la wiki giapponese ha confermato gli sblocchi della pagina «コープ».

| Evento | Dubbio | Esito della verifica | Decisione |
|---|---|---|---|
| **26** Yoshida rango 1 (evento 9/5) | La voce con rango atteso 1 è del 10/5 (`39965e25`); il 9/5 c'è l'avvio (`21884ede`) | AllGameStaff: «Giorno consigliato: 10 maggio»; il 9/5 è la sera dell'incontro | Collego **entrambe** (certe); l'evento va spostato o accompagnato dal 10/5 |
| **41** Kawakami rango 1 (evento 6/6) | Voce con rango atteso 1 l'8/6 (`d9710dea`) | G-017: il 4/6 è lo sblocco, il rango 1 consigliato è l'8/6 | **D**: data dell'evento da correggere (4/6 sblocco, 8/6 rango 1) |
| **47** Yusuke rango 1 (evento 17/6) | Voce con rango atteso 1 il 18/6 (`da3ff27e`) | AllGameStaff: «Giorno consigliato: 18 giugno» | **D**: evento da correggere al 18/6 |
| **75** Chihaya rango 1 (evento 29/7) | Voce con rango atteso 1 il 30/7 (`ab2cb32e`) | AllGameStaff: «Giorno consigliato: 30 luglio»; la wiki dà 6/22 come sblocco | Collego come certa (la voce è quella del rango 1), evento da correggere al 30/7 |
| **115** Primo accesso al Palazzo di Niijima (evento 28/10) | La voce del primo ingresso è del 29/10 (`7dd92df2`) | AllGameStaff, pagina del Palazzo di Sae: primo accesso il 29/10; nessuna traccia del 28/10 | Collego la voce del 29/10 (**certa**, data dell'evento da correggere) e l'interrogatorio di Sae del 28/10 (`34df97d6`) |
| **137** Sconfitta di Shido (evento 18/12) | La voce del boss è del 12/12 (`b7122251`) | AllGameStaff: sezione «12 dicembre» del Palazzo; la guida completa tutto l'11-12 (il 18/12 sono le elezioni). Letto in parte, il resto è dedotto dall'indice | **D**: la sconfitta nel gioco è il 12/12; evento da correggere o chiarire |
| **152** Scontro con Sumire/Cenerentola (evento 9/1) | La voce del 9/1 (`cdf1af20`) | AllGameStaff: «oggi affronteremo il Dottor Maruki» il 9/1, con miniboss Sumire e Cenerentola; la voce nomina Sumire e Cenerentola | Certa |
| **150** Accesso al Palazzo misterioso (2/1) | `09e38fdd` | AllGameStaff: 2/1 («un misterioso nuovo Palazzo») | Certa |
| **44** Akechi rango 1 (10/6) | Nessuna voce | AllGameStaff conferma 10/6; il Diario non ha una voce di rango 1 di Akechi (prime voci: rango 3, 13/8) | **N**: nessun collegamento; segnalato |
| **29** Maruki rango 1 (13/5) | La voce con rango atteso 1 è la presentazione (`0a169ae4`); la seduta in infermeria (`70b20e30`) è un'altra scena | AllGameStaff: si avvia automaticamente il 13/5, all'assemblea | Presentazione **C**, seduta **D** |

Altri dubbi (senza fonte esterna, per il testo della voce):
- id 1 (inizio del gioco): nel Diario c'è solo l'arrivo al Leblanc, non la fuga dal casinò né l'interrogatorio.
- id 12: la voce della Biblioteca è il tutorial; il collegamento resta dubbio.
- id 20 (Golden Week): la voce è il cruciverba a tema, non la festività.
- id 39: banco informazioni e negozio dell'usato di Kichijoji sono tutorial della zona; certo solo freccette/biliardo.
- id 46, 52, 77, 84, 126, 147, 156, 161, 163, 171, 172: la voce copre solo in parte (spiegato nella nota di ogni riga).

## 5. Tabella pronta per una migrazione

Una riga per collegamento: `evento_id` = `evento_calendario.id` (coincide con il numero «evento N» delle voci di `pianoAtomico` R9-20), `voce_uid` = `voce_giornata.uid` completo, `certezza` C o D. Proposta per la migrazione: una tabella a parte `evento_calendario_voce (evento_id, voce_uid, certezza)` con chiave primaria su entrambi i campi; **si applicano le righe C** e le D si lasciano come proposta (nessuna scrittura senza conferma). Nessuna colonna di `voce_giornata` viene toccata.

| evento_id | voce_uid | certezza |
|---|---|---|
| 1 | 31544ff5c418fdbaa2e9b859ec60860f | D |
| 3 | 5468ac4fdc0b91a78724f26822793b6d | C |
| 5 | f3d6ddf19b62f76616e3de65ac00f2b9 | C |
| 5 | 2b0913043ec28f94fdb613548cd98aee | C |
| 6 | e4290542b3376439f92c71b76e18b64e | C |
| 7 | 13c631e03c8cb988f4d6da57c7b52e92 | C |
| 8 | 6fd5031403067e22f9306de902cf57a6 | C |
| 9 | 3a1bfca2ba3cc6ff5f08759d30014ee1 | C |
| 9 | facb16e6353e1aa8b09790829685812f | C |
| 10 | 92228393531757698705e5c4c07c725e | C |
| 11 | e560e452e9081157593f26ccb2a06659 | C |
| 11 | cf1e3b48a741a17e529f490a149efdeb | C |
| 12 | 402239f2465b3a075aa7271a6e5f2093 | C |
| 12 | e3cb2aac14b0afaec030a433f74e59e1 | D |
| 13 | a513390589dcbc75a7ae4ef1aa798d06 | C |
| 13 | 21aecf2c73015fb8f81eca38a7ac87dd | C |
| 14 | cdc7e3a818e612b94efe7853135f7617 | C |
| 15 | 78a1b1f072a57b097259cbc977e2b7fd | C |
| 15 | 23414c504a833d3582e1a4bcad3ea47e | C |
| 16 | 092c31deecc05e43e861a03d539002f9 | C |
| 16 | a15b63cdc169d4f9b2635f12c46748ce | C |
| 19 | 2aa7cc676b5ef4ff3cf4b148e45c0452 | C |
| 20 | dbc62717e37ddc3de3550e097fa19582 | D |
| 22 | eff8f776cfb0355518a8e3af546c3fc7 | C |
| 23 | c4bd6486ad6185335b41f2b2aba3ef27 | C |
| 24 | 419ee48be0f88671ae34670067e3e306 | C |
| 24 | 82a5443617ef8b45dbddce7a2e54fb91 | C |
| 24 | 3ad902f09ee84978956f10b5a8c89137 | C |
| 25 | e7adb0bcac77591a2d811cc5cce4519d | C |
| 26 | 21884ede0c011dee7ebfff5917c8642b | C |
| 26 | 39965e251eb93ff3da77b9e0c67bd556 | C |
| 27 | 5f54d08040ddd8c0ac272b8c63627e64 | C |
| 28 | b290d874136ed3f703a16ec39c190797 | C |
| 29 | 0a169ae427234850192ffd1e6098202d | C |
| 29 | 70b20e307e9ccaf838376492758d1a51 | D |
| 31 | 3fb31dded3f9581173037ce9d1ec9535 | C |
| 31 | 445731a85c54f6d1fa541f10ee8c64d1 | C |
| 33 | c7c5fd272c9fb5fe8c4153a035c1631b | C |
| 34 | f58564c458cdfd51c93c52ddf35a160b | C |
| 35 | 59f76d129dd269dd17302431f261d7b8 | C |
| 36 | fa2b6c8b9e1397c05ed9ce3c042ca299 | C |
| 37 | b9371f8061aedd71262a200b98d18bd0 | C |
| 39 | 010c2a0fb7b8ae58b6ac05bbb7ed4e64 | C |
| 39 | d0c60618ffec2b46c928f95c7fd4ce59 | D |
| 39 | 9b1aeb195fbe7621d0cb98319be2d7dd | D |
| 41 | d9710deaa11167d309c2f43064ffbebf | D |
| 42 | 165b8cb392fae0bd067b6ba34b87a8fb | C |
| 43 | 57f605b58bd16697c586d852e287c986 | C |
| 45 | dfcba17bb113c896146fbf39ee939c37 | C |
| 46 | 6ac23b7a1b4f2483bf627e3db6d8c487 | D |
| 47 | da3ff27e6e6c8e5fed1344f9dfb3cc2f | D |
| 48 | 8d4502a1aa7d55ea54495c46fc2e749f | C |
| 49 | 8d4502a1aa7d55ea54495c46fc2e749f | C |
| 50 | 4237a148aa6029905fb12f288af31b03 | C |
| 50 | b6371951de612d94b6b45001f4e94fa4 | C |
| 51 | 65fdbeab5101e6068310fea982553d22 | C |
| 52 | 87acfa6f8f9981e606e8872fbab662fe | D |
| 52 | 37830a1b40243a7cc51dcdd3a4565223 | D |
| 53 | 5e221a9726928b41f8a6daf4163fca67 | C |
| 54 | 5796b127c3400b50853375829f8cf548 | C |
| 55 | 5fa87613387914bfcd9c03f664602169 | C |
| 57 | 84db8c1baa769193694985b0d8778ced | C |
| 58 | d64fa904303311103b323170025c343d | C |
| 59 | b9e2763b0f65697c7f0b28dc24c3487c | C |
| 61 | e1b37c4d04e08d26194da318f408fe78 | C |
| 62 | 5b09fca76ba29be46db7e39a1450c89f | C |
| 63 | 8d32076e68235ebef75b89f6c0f0c6e4 | C |
| 65 | 73978284d2d06bab2f0cda159e2ebda8 | C |
| 70 | 982f84d182714307b09917e309444dd3 | C |
| 72 | ac258051782e4ec99dc9ab4ac25df650 | C |
| 73 | 242f337cff122dfb7ef5248efbcdcde6 | C |
| 74 | a809b0fe42fa0d6407fab55d67299110 | C |
| 75 | ab2cb32eb1b00dd9204b4a6555dc3f62 | C |
| 76 | f5e781ca22e5ea7a33e5fcf4872f0108 | C |
| 76 | 62284ab35f052e4dc2bb16daf3b09233 | C |
| 77 | c9efdb83a3eeb29a6ceea9a6f6cc2ea2 | D |
| 78 | 3ebaf3766c968bbc52093d6f5045c4d2 | C |
| 81 | 2788df0d25525508cdbdf7df908f0547 | C |
| 83 | 1439b52c0b0f488b0997039e99d72787 | C |
| 84 | 05e55e9c0ad363c5aaded02839902c98 | D |
| 86 | 75c3a10b599608ec8b2ac4fe60ba6d72 | C |
| 88 | c5596e1777497f5d762376c3f8721b7f | C |
| 89 | af278bbbe5e4fe6bacae57de3cfe48bf | C |
| 90 | f8842f2591b4685fd9655865e42a5be7 | C |
| 90 | bf9ce33524dfda248b64bd8a9c44f570 | C |
| 91 | ce581865deadf1178883f9ae46ae54d8 | C |
| 92 | eeb54034359694941a6857a68255500f | C |
| 93 | f50cabbdbbd50127c8fc452c682dbe8a | C |
| 95 | fd2a7b29e9906cabc4d03848d332d5ba | C |
| 98 | aac6fc28c5821e70e4bbfc0e191869b3 | C |
| 98 | d82f0870a6f2a0dc8f1806b8eab75f21 | C |
| 99 | a0228dec7261c99151c28e96823afc62 | C |
| 102 | 8742bcf962a80c28b81ab272ee5d5014 | C |
| 103 | c66a02b66d02f21793e1f8e0d2f08798 | C |
| 104 | 59dd32bc41f9611e11b2dd613b846f7c | C |
| 104 | 9682093aba1354f8705db26fb13d89b4 | C |
| 105 | ec7d9d6c95f57a5f6a7a8d46b78d3f61 | C |
| 109 | a33b29352f63dc0e9067493ec2ce28b0 | C |
| 110 | c0e19947d961b4e0be4899315b4d9756 | C |
| 111 | 1fe5e5e780b422e040df68a2d389b575 | C |
| 113 | 325d5a62f6bf94b2d72009dd36d8e166 | C |
| 114 | 9e5deb62f9607d21dbed9c1cee020619 | C |
| 114 | 942fd4aa49a56c4bf913d1ac6c41b5fa | C |
| 115 | 7dd92df212b81bb87aba6e7a2fa8c874 | C |
| 115 | 34df97d6a9671520b4c4ff874db16953 | C |
| 116 | 7dd92df212b81bb87aba6e7a2fa8c874 | D |
| 118 | d381722e6b831f73ad4af0730fba2781 | C |
| 120 | d26ea0495813e93e62e5940a9912c419 | C |
| 121 | 3a614840b721ed10d2848b469ae3de0f | C |
| 122 | ebe00e6b2fe3f80a827f88f5503165fc | C |
| 122 | 7c0814176b193cad29d15ec00ffe891c | C |
| 124 | dece90bfb20d9d3328f2a6b0ca417590 | C |
| 125 | 279e78034182988c357f4f0b8eeae12c | C |
| 126 | 5b5061191658e83df6da93c38b4cffdf | D |
| 127 | 5b5061191658e83df6da93c38b4cffdf | C |
| 128 | 589d82e823703ee879d72f974fd51139 | C |
| 129 | 7e3a008d1230fb8106094cb8d3d374bb | C |
| 131 | 527cf9832e94e93e855436191e06f8b6 | C |
| 134 | 746682faca7287278d592da846383d15 | C |
| 135 | b7122251a674682657fe627319d36d91 | C |
| 137 | b7122251a674682657fe627319d36d91 | D |
| 140 | 98bedf2016c6b2d5e66550b2cdd49ad8 | C |
| 141 | a0d782331afa7582175440de0d45d966 | C |
| 142 | 8af7b81be0611ac9f25e26ab32c1f8c5 | C |
| 143 | 967b7b1f9e03f04a65130ebc5d213f18 | C |
| 145 | 29ce4ebf3003f64dbcfd12c804b203b7 | C |
| 145 | a65f9e31d7fbb8ad707ecae6f06082db | C |
| 147 | a680d38bf7128952338349bd9439ce11 | D |
| 148 | a7407ed3a16409c9a6abe4cc4edfc223 | C |
| 150 | 09e38fddc12a2cce9d5abec6ffc6e7aa | C |
| 151 | 481b85503f2b06e8cd30259dceb9f74c | C |
| 152 | cdf1af20cff42ec521e2b4620f6f84a3 | C |
| 156 | 505fa6a50ef341af0f8ad4766a896062 | D |
| 157 | ca52617259cbf6097134496547f55792 | C |
| 159 | cf66b722af0a5fb76d1906e89b66bb64 | C |
| 161 | ec77a9cf07c69a7b81dd45a6227905c5 | D |
| 162 | 3db90a97fcbc510f8fb97ca5aa142dd2 | C |
| 162 | c3aff3d5cc749a1452814d60bd576b83 | C |
| 162 | ccbbc79f7f8ecf2423794dc9e9683cc6 | C |
| 162 | 525ed37ba675f84dee6178c4e473365e | C |
| 163 | 3db90a97fcbc510f8fb97ca5aa142dd2 | D |
| 163 | 525ed37ba675f84dee6178c4e473365e | D |
| 164 | 04d94d621b62115d8ac2128f25e0a198 | C |
| 165 | b9dc3d420258d1607347842e7d755c92 | C |
| 166 | 68250d6bd39d47f0edd98f5fc2ce324f | C |
| 167 | 28f29d549a88ebd24e361f72ae1080a7 | C |
| 168 | 7d032c61ed3ce190fd94579fe53b2103 | C |
| 169 | 4d86dfe0bb70820516c9a02f85dac668 | C |
| 169 | 7759dd7222bb6b9e70b72653ab90d470 | C |
| 170 | 2192f1235ff43a2d9ef2253190770a2d | C |
| 171 | 024d22c82c828c8f7b657672827456fb | C |
| 171 | be499cea1de9be10f9aff901301cdd7c | C |
| 171 | 473fc1f030eac6e51d1f159f9842e248 | D |
| 171 | 2b2a94a2027f2821bf08c7de5e6ca5c6 | D |
| 172 | a2d18f766a73721e1ca0685a789ba325 | C |
| 172 | f258337b1af3b4271381a7d16446d1e4 | D |
| 173 | 94483bd6b69211bb7a1de34394deb5bf | C |
| 173 | 3034e42cb18ccc64670f68f115b108b8 | C |

## 6. Tabella per evento (data, tipo, voci con i primi 8 caratteri dell'uid, motivo)

`?` accanto a un uid = collegamento dubbio. `—` = nessuna voce. «Chiave» = `data/ordine` dell'evento nel calendario. Il testo e la data di ogni voce si leggono dal suo `uid` (stesso uid della tabella precedente).

| Evento | Chiave | Tipo | Titolo | Voci | Motivo e prova |
|---|---|---|---|---|---|
| 1 | 04-09/0 | storia | Inizio del gioco | 31544ff5? | Riepilogo del giorno: nel Diario c'è solo l'arrivo al Leblanc e a Yongen-Jaya; fuga dal casinò e interrogatorio di Sae non sono voci |
| 2 | 04-09/1 | vacanza | Nessun tempo libero | — | Condizione del giorno (nessun tempo libero), non un'azione |
| 3 | 04-10/0 | storia | Primo giorno alla Shujin Academy | 5468ac4f | Visita alla Shujin e incontro con preside e Kawakami |
| 4 | 04-10/1 | vacanza | Nessun tempo libero (sera bloccata) | — | Condizione della sera, non un'azione |
| 5 | 04-11/0 | storia | Primo giorno di scuola / scoperta del castello | f3d6ddf1 2b091304 | Primo accesso al Palazzo di Kamoshida; incontro con Ryuji sul tetto |
| 6 | 04-12/0 | storia | Secondo accesso al Palazzo di Kamoshida | e4290542 | Seconda infiltrazione nel Palazzo di Kamoshida |
| 7 | 04-12/1 | sblocco | Confidente Ryuji Sakamoto (Carro) rango 1 | 13c631e0 | Rango 1 di Ryuji (la voce ha rango atteso 1) |
| 8 | 04-15/0 | storia | Salvataggio di Ann nel Palazzo di Kamoshida | 6fd50314 | Salvataggio di Ann nel Palazzo di Kamoshida |
| 9 | 04-15/1 | sblocco | Confidenti Ann Takamaki (Amanti) e Morgana (Mago) rango 1 | 3a1bfca2 facb16e6 | Rango 1 di Ann e di Morgana (voci con rango atteso 1) |
| 10 | 04-16/0 | sblocco | Clinica di Tae Takemi disponibile | 92228393 | Sblocco della Clinica Takemi |
| 11 | 04-17/0 | sblocco | Negozio di softair e crafting in mansarda | e560e452 cf1e3b48 | Negozio softair e tutorial di fabbricazione in mansarda |
| 12 | 04-18/0 | sblocco | Confidente Tae Takemi (Morte) rango 1 / Biblioteca | 402239f2 e3cb2aac? | Rango 1 di Takemi; la voce della Biblioteca è il tutorial (dubbio sul collegamento esatto) |
| 13 | 04-20/0 | storia | Inizio infiltrazione seria nel Palazzo di Kamoshida | a5133905 21aecf2c | Infiltrazione completa nel Palazzo di Kamoshida e Stanza di Velluto (Igor) |
| 14 | 04-22/0 | storia | Invio della lettera di sfida a Kamoshida | cdc7e3a8 | Invio della lettera e confronto: accesso automatico al Palazzo di Kamoshida |
| 15 | 04-25/0 | sblocco | Bagno pubblico e lavanderia disponibili | 78a1b1f0 23414c50 | Lavanderia e bagno pubblico |
| 16 | 04-26/0 | sblocco | Lavoro part-time al fioraio Rafflesia | 092c31de a15b63cd | Sblocco e primo turno al fioraio Rafflesia |
| 17 | 04-29/0 | festa | Giorno festivo in Giappone (Showa Day) | — | Festività, nessuna voce |
| 18 | 05-01/0 | consiglio | Consigliato completare il Palazzo di Kamoshida entro oggi | — | Consiglio sul Palazzo di Kamoshida (oggetto dungeon:kamoshida), nessuna voce di quel giorno |
| 19 | 05-02/0 | storia | Assemblea scolastica: cambio di personalità di Kamoshida | 2aa7cc67 | Assemblea scolastica: scene automatiche a scuola |
| 20 | 05-02/1 | festa | Golden Week (vacanze di primavera giapponesi) | dbc62717? | Golden Week: la voce è il cruciverba «Golden» a tema, non la festività in sé |
| 21 | 05-02/2 | scadenza | Ultimo giorno per rubare il Tesoro di Kamoshida | — | Scadenza del Palazzo di Kamoshida (oggetto dungeon:kamoshida), nessuna voce di quel giorno |
| 22 | 05-03/0 | vacanza | Giorno dedicato ad aiutare Sojiro al Leblanc | eff8f776 | Aiutare Sojiro al Leblanc |
| 23 | 05-05/0 | storia | Formazione ufficiale dei Ladri Fantasma | c4bd6486 | Banchetto della formazione dei Ladri Fantasma |
| 24 | 05-06/0 | sblocco | Confidente Mishima (Luna) rango 1 / primo lavoro Beef Bowl Shop | 419ee48b 82a54436 3ad902f0 | Rango 1 di Mishima e Ore no Beko (domanda e primo turno) |
| 25 | 05-07/0 | sblocco | Accesso ai Memento (Dedalo di Qimranut) | e7adb0bc | Accesso ai Memento (Dedalo di Qimranut) |
| 26 | 05-09/0 | sblocco | Confidente Toranosuke Yoshida (Sole) rango 1 | 21884ede 39965e25 | Avvio di Yoshida il 9/5; il rango 1 è il 10/5 (AllGameStaff «giorno consigliato 10 maggio»): data dell'evento da correggere o duplicare |
| 27 | 05-11/0 | esame | Esami di metà semestre (1a sessione) - inizio | 5f54d080 | Esami di metà semestre, 11 maggio |
| 28 | 05-13/0 | esame | Esami di metà semestre (1a sessione) - fine | b290d874 | Esami di metà semestre, 13 maggio |
| 29 | 05-13/1 | sblocco | Confidente Takuto Maruki (Consigliere) rango 1 | 0a169ae4 70b20e30? | Rango 1 di Maruki il 13/5 (AllGameStaff: si avvia automaticamente alla presentazione); la seduta in infermeria è un'altra scena |
| 30 | 05-14/0 | storia | Risultati esami e introduzione di Yusuke Kitagawa | — | Risultati degli esami e Yusuke: nessuna voce di quel giorno |
| 31 | 05-16/0 | storia | Inizio esplorazione del Palazzo di Madarame | 3fb31dde 445731a8 | Primo accesso e infiltrazione iniziale nel Palazzo di Madarame |
| 32 | 05-18/0 | scadenza | Decisione: rubare il cuore di Madarame entro il 5 giugno | — | Scadenza del Palazzo di Madarame (oggetto dungeon:madarame), nessuna voce di quel giorno |
| 33 | 05-19/0 | sblocco | Confidente Gemelle Custodi (Forza) rango 1 | c7c5fd27 | Rango 1 delle Gemelle Custodi (voce con rango atteso 1) |
| 34 | 05-30/0 | storia | Evento pulizia del parco / primo incontro con Kasumi | f58564c4 | Pulizia del parco e primo incontro con Kasumi |
| 35 | 05-30/1 | sblocco | Confidente Kasumi Yoshizawa (Fede) rango 1 | 59f76d12 | Rango 1 di Kasumi (voce con rango atteso 1) |
| 36 | 05-31/0 | scadenza | Invio della lettera di sfida a Madarame | fa2b6c8b | Lettera di sfida a Madarame con Ryuji |
| 37 | 06-01/0 | storia | Furto del cuore di Madarame | b9371f80 | Tesori e boss finale del Palazzo di Madarame |
| 38 | 06-05/0 | storia | Confessione pubblica di Madarame | — | Confessione pubblica di Madarame: nessuna voce di quel giorno |
| 39 | 06-05/1 | sblocco | Kichijoji (nuova zona) e Stanza di Velluto a Kichijoji | 010c2a0f d0c60618? 9b1aeb19? | Freccette e biliardo di Kichijoji; banco informazioni e negozio dell'usato sono tutorial della zona |
| 40 | 06-05/2 | scadenza | Ultimo giorno per rubare il Tesoro di Madarame | — | Scadenza del Palazzo di Madarame (oggetto dungeon:madarame), nessuna voce di quel giorno |
| 41 | 06-06/0 | sblocco | Confidente Sadayo Kawakami (Temperanza) rango 1 | d9710dea? | Kawakami: l'evento dice 6/6, G-017 dà sblocco il 4/6 e rango 1 consigliato l'8/6; la voce (rango atteso 1) è dell'8/6 |
| 42 | 06-08/0 | sblocco | Abilità Isolamento (allenamento Personae in cella) | 165b8cb3 | Stanza di Velluto: avanzamenti con le Gemelle Custodi (abilità Isolamento) |
| 43 | 06-09/0 | storia | Gita all'emittente e primo incontro con Goro Akechi | 57f605b5 | Gita all'emittente e primo incontro con Akechi |
| 44 | 06-10/0 | sblocco | Confidente Goro Akechi (Giustizia) rango 1 | — | Rango 1 di Akechi il 10/6 (AllGameStaff conferma): nel Diario non c'è nessuna voce di rango 1 di Akechi (la prima è di rango 3, 13/8) |
| 45 | 06-13/0 | storia | Makoto Niijima incarica il gruppo di investigare su Kaneshiro | dfcba17b | Incarico di Makoto nell'aula del consiglio studentesco |
| 46 | 06-15/0 | sblocco | Sistema faccende domestiche di Kawakami | 6ac23b7a? | Faccende di Kawakami: la voce è la visita a casa di rango 3, non lo sblocco del sistema |
| 47 | 06-17/0 | sblocco | Confidente Yusuke Kitagawa (Imperatore) rango 1 | da3ff27e? | Yusuke: l'evento dice 17/6, AllGameStaff dà rango 1 il 18/6 (voce con rango atteso 1): data dell'evento da correggere |
| 48 | 06-18/0 | storia | Scoperta del nome del bersaglio: Junya Kaneshiro | 8d4502a1 | Shinjuku, Crossroads, incontro con Ohya e nome Kaneshiro |
| 49 | 06-18/1 | sblocco | Zona Shinjuku disponibile | 8d4502a1 | Sblocco di Shinjuku (tornelli, Crossroads) |
| 50 | 06-19/0 | storia | Scoperta dell'estensione del Palazzo di Kaneshiro | 4237a148 b6371951 | Forma ed ubicazione del Palazzo di Kaneshiro |
| 51 | 06-20/0 | storia | Kaneshiro ricatta il gruppo; Makoto si unisce | 65fdbeab | Prima infiltrazione nel Palazzo di Kaneshiro |
| 52 | 06-21/0 | sblocco | Zona Shinjuku (fioraio, libreria) e Memento con richieste aperte | 87acfa6f? 37830a1b? | Fioraio e libreria di Shinjuku: l'evento stesso dice che la guida non conferma la data |
| 53 | 06-23/0 | sblocco | Chihaya Mifune disponibile (veggente a Shinjuku) | 5e221a97 | Incontro con la veggente Chihaya a Shinjuku |
| 54 | 06-25/0 | storia | Infiltrazione del Palazzo di Kaneshiro fino al Tesoro | 5796b127 | Infiltrazione fino al Tesoro del Palazzo di Kaneshiro |
| 55 | 06-27/0 | storia | Battaglia contro l'Ombra di Kaneshiro | 5fa87613 | Boss finale del Palazzo di Kaneshiro |
| 56 | 06-30/0 | scadenza | Scadenza pagamento/minaccia Kaneshiro | — | Scadenza Kaneshiro (oggetto dungeon:kaneshiro), nessuna voce di quel giorno |
| 57 | 07-02/0 | sblocco | Confidente Hifumi Togo (Stella) rango 1 | 84db8c1b | Rango 1 di Hifumi (voce con rango atteso 1) |
| 58 | 07-05/0 | sblocco | Confidente Ichiko Ohya (Diavolo) rango 1 | d64fa904 | Rango 1 di Ohya (voce con rango atteso 1; G-017: avvio il 5/7) |
| 59 | 07-07/0 | festa | Tanabata (festa delle stelle) | b9e2763b | Domande in classe a tema Tanabata (Via Lattea, somen) |
| 60 | 07-09/0 | scadenza | Scadenza risveglio del cuore di Kaneshiro | — | Scadenza Kaneshiro (oggetto dungeon:kaneshiro), nessuna voce di quel giorno |
| 61 | 07-09/1 | sblocco | Confidente Sae Niijima (Giudizio) rango 1 | e1b37c4d | Rango 1 di Sae (voce con rango atteso 1) |
| 62 | 07-13/0 | esame | Esami di fine semestre (1a sessione) - inizio | 5b09fca7 | Esami di fine semestre, 13 luglio |
| 63 | 07-15/0 | esame | Esami di fine semestre (1a sessione) - fine | 8d32076e | Esami di fine semestre, 15 luglio |
| 64 | 07-16/0 | storia | Il dottor Maruki propone ai Ladri Fantasma di risvegliare i cuori | — | Proposta di Maruki: nessuna voce di quel giorno (c'è solo l'ultimo esame) |
| 65 | 07-17/0 | festa | Festival estivo | 73978284 | Festival estivo con Kasumi |
| 66 | 07-18/0 | festa | Festival estivo (prosecuzione) | — | Seconda sera del festival: nessuna voce corrispondente |
| 67 | 07-19/0 | storia | Risultati esami | — | Risultati degli esami: nessuna voce (le voci del giorno sono Kawakami e un cruciverba) |
| 68 | 07-21/0 | storia | Rivelazione: Alibaba è Futaba Sakura | — | Rivelazione di Alibaba: nessuna voce di quel giorno |
| 69 | 07-24/0 | scadenza | Medjed minaccia un attacco per il 21 agosto | — | Annuncio di Medjed: nessuna voce corrispondente |
| 70 | 07-24/1 | sblocco | Confidente Sae Niijima (Giudizio) rango 2 | 982f84d1 | Rango 2 di Sae (voce con rango atteso 2) |
| 71 | 07-24/2 | festa | Fine anno scolastico / inizio vacanze estive | — | Inizio vacanze estive (indicativo): nessuna voce |
| 72 | 07-25/0 | storia | Decisione di infiltrarsi nel Palazzo di Futaba | ac258051 | Decisione e infiltrazione iniziale nel Palazzo di Futaba |
| 73 | 07-26/0 | storia | Il ritrovo si sposta al Leblanc; Makoto rango 1 | 242f337c | Rango 1 di Makoto (voce con rango atteso 1); il trasloco del ritrovo non ha voce |
| 74 | 07-27/0 | vacanza | Giornata Memento con pioggia torrenziale | a809b0fe | Giornata nei Memento con le richieste |
| 75 | 07-29/0 | sblocco | Confidente Chihaya Mifune (Fortuna) rango 1 | ab2cb32e | Chihaya rango 1: l'evento dice 29/7, AllGameStaff dà il 30/7 (voce con rango atteso 1): data dell'evento da correggere |
| 76 | 08-01/0 | vacanza | Giornata dedicata al Palazzo di Futaba (Tesoro) | f5e781ca 62284ab3 | Giornata nel Palazzo di Futaba |
| 77 | 08-03/0 | storia | Tappe verso la fermata dei piani di Medjed | c9efdb83? | Camera del Vuoto nel Palazzo di Futaba: l'evento è generico |
| 78 | 08-08/0 | sblocco | Confidente Tae Takemi (Morte) rango massimo (10) | 3ebaf376 | Rango 10 di Takemi (voce con rango atteso 10) |
| 79 | 08-11/0 | festa | Bon (Obon) - periodo estivo | — | Obon: festività non confermata, nessuna voce |
| 80 | 08-14/0 | sblocco | Doti sociali: Fascino al livello massimo | — | Fascino al massimo: nessuna voce corrispondente (oggetto dote:fascino) |
| 81 | 08-15/0 | sblocco | Confidente Iwai (Appeso) rango 1 | 2788df0d | Rango 1 di Iwai (voce con rango atteso 1) |
| 82 | 08-19/0 | scadenza | Termine consigliato per completare il Palazzo di Futaba | — | Termine consigliato Palazzo di Futaba (oggetto dungeon:futaba), nessuna voce di quel giorno |
| 83 | 08-19/1 | sblocco | Confidente Yusuke Kitagawa (Imperatore) rango massimo (10) | 1439b52c | Rango 10 di Yusuke (voce con rango atteso 10) |
| 84 | 08-21/0 | scadenza | Risoluzione della crisi Medjed | 05e55e9c? | Crisi Medjed: la voce è la conversazione con Sojiro su Futaba e Medjed |
| 85 | 08-21/1 | sblocco | Nuovo membro del gruppo (Futaba Sakura) | — | Ingresso di Futaba nel gruppo: nessuna voce di quel giorno |
| 86 | 08-25/0 | sblocco | Confidente Toranosuke Yoshida (Sole) rango massimo (10) | 75c3a10b | Rango 10 di Yoshida (voce con rango atteso 10) |
| 87 | 08-27/0 | festa | Riunione degli amici al Leblanc | — | Riunione al Leblanc: nessuna voce corrispondente |
| 88 | 08-29/0 | festa | Gita in spiaggia con tutto il gruppo | c5596e17 | Gita in spiaggia con la squadra |
| 89 | 08-31/0 | sblocco | Zona Akihabara disponibile | af278bbb | Akihabara e rango 1 di Futaba (voce con rango atteso 1) |
| 90 | 09-01/0 | storia | Ripresa delle lezioni (secondo semestre) | f8842f25 bf9ce335 | Rango 10 di Kawakami (voci con rango atteso 10) |
| 91 | 09-03/0 | storia | Riparazione del laptop di Futaba / Affari loschi di Tanaka | ce581865 | Laptop di Futaba e Affari loschi di Tanaka |
| 92 | 09-07/0 | vacanza | Viaggio scolastico alle Hawaii - inizio | eeb54034 | Viaggio alle Hawaii |
| 93 | 09-11/0 | vacanza | Ritorno dal viaggio alle Hawaii | f50cabbd | Ritorno dalle Hawaii |
| 94 | 09-13/0 | storia | Assemblea scolastica: annuncio della morte del preside | — | Assemblea sul preside: nessuna voce (le voci del giorno sono Sae e il briefing della missione) |
| 95 | 09-15/0 | storia | Primo accesso al Palazzo di Okumura | fd2a7b29 | Primo accesso al Palazzo di Okumura |
| 96 | 09-18/0 | scadenza | Scadenza fissata per il Palazzo di Okumura: 10 ottobre | — | Scadenza del Palazzo di Okumura (oggetto dungeon:okumura), nessuna voce di quel giorno |
| 97 | 09-22/0 | festa | Equinozio d'autunno | — | Equinozio: festività senza voce |
| 98 | 09-24/0 | sblocco | Pesca al Laghetto di Ichigaya disponibile | aac6fc28 d82f0870 | Pesca a Ichigaya e libro che apre Ichigaya |
| 99 | 09-27/0 | sblocco | Confidente Ichiko Ohya (Diavolo) rango massimo (10) | a0228dec | Rango 10 di Ohya (voce con rango atteso 10) |
| 100 | 09-30/0 | storia | Massimizzazione delle doti sociali possibile | — | Massimizzazione delle doti: nessuna voce corrispondente |
| 101 | 10-01/0 | sblocco | Negozi: nuovi articoli dal 1 ottobre | — | Rifornimento dei negozi: nessuna voce corrispondente |
| 102 | 10-03/0 | storia | Evento obbligatorio nel Metaverso con Kasumi | 8742bcf9 | Dungeon sconosciuto con Kasumi (Organismo sintetico malvagio) |
| 103 | 10-04/0 | storia | Prima infiltrazione nel Palazzo di Okumura | c66a02b6 | Prima infiltrazione nel Palazzo di Okumura |
| 104 | 10-10/0 | festa | Giornata dello sport (festa nazionale) | 59dd32bc 9682093a | Giornata dello sport: uscite con Shinya e con Hifumi (come dice il dettaglio dell'evento) |
| 105 | 10-11/0 | scadenza | Scadenza Palazzo di Okumura | ec7d9d6c | Battaglia con l'Ombra di Okumura |
| 106 | 10-11/1 | vacanza | Confinamento serale al Leblanc | — | Confinamento serale: la voce del giorno (Igor) non lo descrive |
| 107 | 10-13/0 | storia | Popolarità dei Ladri Fantasma in calo | — | Calo di popolarità e richiesta di Mishima: nessuna voce di quel giorno |
| 108 | 10-16/0 | vacanza | Serata confinata al Leblanc | — | Serata confinata: nessuna voce corrispondente |
| 109 | 10-17/0 | esame | Esami di metà semestre (2a sessione) - inizio | a33b2935 | Esami di metà semestre, 17 ottobre |
| 110 | 10-19/0 | esame | Esami di metà semestre (2a sessione) - fine | c0e19947 | Esami di metà semestre, 19 ottobre |
| 111 | 10-21/0 | storia | La polizia interroga gli studenti a scuola | 1fe5e5e7 | Interrogatorio della polizia a scuola |
| 112 | 10-22/0 | storia | Intervento televisivo di Akechi | — | Intervento televisivo di Akechi: nessuna voce di quel giorno |
| 113 | 10-25/0 | festa | Festival della Cultura scolastico - primo giorno | 325d5a62 | Festival scolastico, primo giorno |
| 114 | 10-26/0 | festa | Festival della Cultura scolastico - secondo giorno | 9e5deb62 942fd4aa | Festival scolastico, secondo giorno e ospitata di Akechi |
| 115 | 10-28/0 | storia | Primo accesso al Palazzo di Niijima (Casinò) | 7dd92df2 34df97d6 | Primo accesso al Palazzo di Niijima: AllGameStaff dà il 29/10 (voce 7dd92df2), l'evento dice il 28/10; l'interrogatorio di Sae è la voce del 28/10 |
| 116 | 10-29/0 | scadenza | Scadenza annunciata per il Palazzo di Niijima | 7dd92df2? | Scadenza annunciata al primo ingresso nel Palazzo di Niijima (stesso giorno della voce, ma non è l'ingresso) |
| 117 | 10-31/0 | festa | Halloween | — | Halloween: festività senza voce |
| 118 | 10-31/1 | sblocco | Confidente Haru Okumura (Imperatrice) rango 1 | d381722e | Rango 1 di Haru (voce con rango atteso 1) |
| 119 | 11-01/0 | scadenza | Maruki lascerà la scuola il 18 novembre | — | Maruki lascia la scuola il 18/11: nessuna voce di quel giorno |
| 120 | 11-06/0 | sblocco | Confidente Gemelle Custodi (Forza) rango massimo (10) | d26ea049 | Rango 10 delle Gemelle: Stanza di Velluto fino al rango massimo |
| 121 | 11-10/0 | sblocco | Confidente Shinya Oda (Torre) rango massimo (10) | 3a614840 | Rango 10 di Shinya (voce con rango atteso 10) |
| 122 | 11-13/0 | storia | Inizio infiltrazione del Palazzo di Sae Niijima | ebe00e6b 7c081417 | Inizio dell'infiltrazione nel Palazzo di Niijima |
| 123 | 11-13/1 | festa | Inizio della stagione influenzale | — | Stagione influenzale: nessuna voce |
| 124 | 11-14/0 | storia | Infiltrazione finale del Palazzo di Niijima | dece90bf | Infiltrazione finale nel Palazzo di Niijima |
| 125 | 11-17/0 | sblocco | Confidente Futaba Sakura (Eremita) rango massimo (10) | 279e7803 | Rango 10 di Futaba (voce con rango atteso 10) |
| 126 | 11-18/0 | storia | Ultimo giorno di Maruki a scuola | 5b506119? | Ultimo giorno di Maruki a scuola: la voce è il pranzo con Maruki (rango 10) |
| 127 | 11-18/1 | sblocco | Confidente Takuto Maruki (Consigliere) rango massimo (10) | 5b506119 | Rango 10 di Maruki (voce con rango atteso 10) |
| 128 | 11-19/0 | storia | Battaglia finale contro l'Ombra di Sae Niijima | 589d82e8 | Battaglia contro l'Ombra di Sae |
| 129 | 11-20/0 | scadenza | Scadenza finale Palazzo di Niijima / interrogatorio conclusivo | 7e3a008d | Interrogatorio conclusivo di Sae |
| 130 | 11-21/0 | storia | Rivelazione: Shido è il prossimo obiettivo | — | Rivelazione su Shido: nessuna voce di quel giorno |
| 131 | 11-24/0 | storia | Accesso ufficiale al Palazzo di Shido nella Dieta | 527cf983 | Accesso al Palazzo di Shido |
| 132 | 12-03/0 | meteo | Prima nevicata segnalata dalla guida IT | — | Nevicata: nessuna voce |
| 133 | 12-08/0 | festa | Stagione influenzale (dicembre) | — | Stagione influenzale: nessuna voce |
| 134 | 12-11/0 | storia | Giorno principale dell'infiltrazione nel Palazzo di Shido | 746682fa | Giorno principale dell'infiltrazione nel Palazzo di Shido |
| 135 | 12-12/0 | storia | Invio della lettera di sfida a Shido | b7122251 | Lettera e boss del Palazzo di Shido (12/12) |
| 136 | 12-17/0 | scadenza | Termine consigliato per cambiare il cuore di Shido | — | Termine consigliato Palazzo di Shido (oggetto dungeon:shido), nessuna voce di quel giorno |
| 137 | 12-18/0 | storia | Sconfitta di Shido | b7122251? | Sconfitta di Shido: AllGameStaff completa il Palazzo il 12/12; la voce è del 12/12, l'evento dice il 18/12 |
| 138 | 12-18/1 | festa | Elezioni generali (Sousenkyo) | — | Elezioni: festività/riferimento, nessuna voce |
| 139 | 12-18/2 | scadenza | Elezioni: ultimo giorno per cambiare il cuore di Shido | — | Scadenza del Palazzo di Shido (oggetto dungeon:shido), nessuna voce di quel giorno |
| 140 | 12-19/0 | storia | Ritorno a scuola con sessione di studio di gruppo | 98bedf20 | Sessione di studio di gruppo |
| 141 | 12-20/0 | esame | Esami di fine semestre (2a sessione) - inizio | a0d78233 | Esami di fine semestre, 20 dicembre |
| 142 | 12-22/0 | esame | Esami di fine semestre (2a sessione) - fine | 8af7b81b | Esami di fine semestre, 22 dicembre |
| 143 | 12-23/0 | sblocco | Confidente Morgana (Mago) rango massimo (10) | 967b7b1f | Rango 10 di Morgana (voce con rango atteso 10) |
| 144 | 12-24/0 | festa | Vigilia di Natale | — | Vigilia di Natale: nessuna voce corrispondente (le voci del giorno sono Iweleth) |
| 145 | 12-24/1 | storia | Missione «Ruba il cuore del pubblico» - Dedalo di Iweleth | 29ce4ebf a65f9e31 | Dedalo di Iweleth e boss del Tesoro dei Memento |
| 146 | 12-25/0 | festa | Natale | — | Natale: nessuna voce corrispondente |
| 147 | 12-31/0 | festa | Vigilia di Capodanno (Omisoka) | a680d38b? | Vigilia di Capodanno: la voce sono le sequenze narrative finali, non la festa al Leblanc |
| 148 | 01-01/0 | festa | Capodanno (Oshogatsu) | a7407ed3 | Capodanno: appuntamento con Kasumi al Santuario Meiji |
| 149 | 01-01/1 | vacanza | Nessun tempo libero | — | Condizione del giorno, non un'azione |
| 150 | 01-02/0 | storia | Accesso al «Palazzo Misterioso» (Palazzo di Maruki) | 09e38fdd | Accesso al Palazzo misterioso (Palazzo di Maruki): conferma AllGameStaff 2 gennaio |
| 151 | 01-03/0 | vacanza | Nessun tempo libero (3-8 gennaio) | 481b8550 | Incontro obbligatorio con Ann |
| 152 | 01-09/0 | storia | Scontro finale con il dottor Maruki nel suo Palazzo | cdf1af20 | Palazzo di Maruki: la voce nomina Sumire e Cenerentola (AllGameStaff: 9 gennaio) |
| 153 | 01-10/0 | storia | Inizio del terzo semestre | — | Inizio del terzo semestre: nessuna voce corrispondente |
| 154 | 01-12/0 | sblocco | Sumire Yoshizawa entra ufficialmente nel gruppo | — | Ingresso di Sumire nel gruppo: nessuna voce di quel giorno la nomina |
| 155 | 01-20/0 | meteo | Giorno di pioggia segnalato dalla guida IT | — | Giorno di pioggia: nessuna voce |
| 156 | 01-23/0 | sblocco | Possibilità di iniziare una relazione romantica con Sumire | 505fa6a5? | Relazione romantica con Sumire: la voce è l'uscita con Sumire di rango 9 |
| 157 | 01-25/0 | sblocco | Confidente Sumire Yoshizawa (Fede) rango massimo (10) | ca526172 | Rango 10 di Sumire (voce con rango atteso 10) |
| 158 | 01-26/0 | meteo | Allerta «ondata di gelo» (26-27 gennaio) | — | Allerta meteo: nessuna voce |
| 159 | 01-26/1 | storia | Infiltrazione del Palazzo di Maruki per il Tesoro | cf66b722 | Infiltrazione del Palazzo di Maruki per il Tesoro |
| 160 | 01-27/0 | meteo | Allerta «ondata di gelo» - secondo giorno | — | Allerta meteo: nessuna voce |
| 161 | 02-02/0 | scadenza | Scadenza per assicurare il percorso verso il Palazzo finale | ec77a9cf? | Scelta cruciale sul finale: la voce è la scena con Maruki a scelta di dialogo |
| 162 | 02-03/0 | storia | Scontro finale contro il dottor Maruki | 3db90a97 c3aff3d5 ccbbc79f 525ed37b | Le quattro fasi dello scontro finale con Maruki |
| 163 | 02-03/1 | scadenza | Palazzo di Maruki: giorno delle battaglie finali | 3db90a97? 525ed37b? | Scadenza che coincide con il giorno dello scontro finale (prima e ultima fase) |
| 164 | 02-04/0 | storia | Sblocco dell'Arcano finale (Il Mondo) nella Stanza di Velluto | 04d94d62 | Arcano finale (Il Mondo) nella Stanza di Velluto |
| 165 | 02-13/0 | storia | Ripresa della trama dopo il salto temporale | b9dc3d42 | Incontro con Sae dopo il salto temporale |
| 166 | 02-14/0 | festa | San Valentino | 68250d6b | Scena di San Valentino |
| 167 | 02-15/0 | festa | Giri choco (cioccolatini di cortesia) | 28f29d54 | Giri choco |
| 168 | 03-02/0 | storia | Riunione della squadra al Leblanc (epilogo) | 7d032c61 | Riunione al Leblanc (epilogo) |
| 169 | 03-03/0 | storia | Riunione mattutina della squadra e sviluppi narrativi | 4d86dfe0 7759dd72 | Riunione mattutina e messaggio di Sumire |
| 170 | 03-13/0 | storia | Sojiro consiglia di organizzare un appuntamento | 2192f123 | Prenotazione della cena per il giorno dopo |
| 171 | 03-14/0 | festa | White Day | 024d22c8 be499cea 473fc1f0? 2b2a94a2? | White Day: rosa scarlatta e appuntamento; le altre voci sono passaggi dello stesso appuntamento |
| 172 | 03-19/0 | storia | Ultimo giorno per interagire con i Confidenti | a2d18f76 f258337b? | Ultimo giorno per i Confidenti; il saluto finale è un passaggio dello stesso giorno |
| 173 | 03-20/0 | storia | Finale del gioco | 94483bd6 3034e42c | Finale del gioco al Leblanc e filmato finale |

## 7. Cose da sapere per la migrazione

1. **Nessuna scrittura sul Diario.** La tabella dei collegamenti è nuova; `voce_giornata` non cambia, nemmeno nelle 255 voci validate (molti collegamenti toccano date 04-09..06-01: sono letture, non modifiche).
2. **Idempotenza e riverifica.** La migrazione deve controllare che ogni `uid` esista nell'istanza e saltare le righe il cui `uid` manca (la copia usata è del 23/10): un conteggio di righe saltate va nel rapporto.
3. **Quali righe.** Si applicano le **134 certe**; le **24 dubbie** restano proposte, da approvare. Gli eventi senza voce (49) restano eventi senza collegamento: non è un difetto.
4. **Date degli eventi.** Sei eventi hanno la data diversa dalla voce giusta (26, 41, 47, 75, 115, 137): il collegamento c'è, ma la data dell'evento va corretta come dato del calendario (non è lavoro dell'utente: è un dato della guida). Lo chiedo al PM come attività separata di L9/F e non è fatto qui.
5. **Oggetto del collegamento.** Per le voci con `riferimento_tipo`/`riferimento_chiave` (Confidente, Palazzo) il collegamento per chiave all'oggetto si ricava dalla voce; per le scadenze senza voce l'oggetto è il Palazzo indicato nel titolo (note `oggetto dungeon:…`).
6. **Limiti.** Gli abbinamenti sono giudizi miei sul testo delle voci e sulle fonti; i rango atteso sono un dato del Diario, non una prova di data. Il Diario può essere cambiato dall'utente dopo la copia del 23/10.
