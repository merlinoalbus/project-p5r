[msg GOTO_D03_EXIT_NG_mes01 [Ryuji]]
[s][bup 0 2 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 7018 65535 0]Yo, prima dovremmo esaminare[n]meglio questa roba.[n][w][e]

[sel START_CHECK_SEL top]
[s]Vai all'ultima Safe Room[e]
[s]Inizia qui l'infiltrazione[e]
[s]Non entrare per ora[e]

[msg START_CHECK_MES [Morgana]]
[s][bup 0 3 0 65535 0]Allora, da dove vuoi[n]cominciare a esplorare?[n][w][e]

[msg START_CHECK_MES_NEXT [Morgana]]
[s][bup 0 3 0 65535 0]Scegli bene la[n]posizione di partenza.[n][w][e]

[sel DUNGEON_EXIT_SEL top]
[s]*Speciale[e]
[s]Torna nel mondo reale[e]
[s]Non andartene ancora[e]

[sel DUNGEON_EXIT_154_SEL top]
[s]Raggiungi la citt稲[e]
[s]Torna nel mondo reale[e]
[s]Non andartene ancora[e]

[sel DUNGEON_EXIT_155_SEL top]
[s]Raggiungi la citt稲[e]
[s]Torna nel mondo reale[e]
[s]Non andartene ancora[e]

[msg D01_EXIT_MES [Navigatore del Metaverso]]
[s]Ritorno al mondo reale dal[n]Palazzo di Kamoshida. Grazie[n]per il lavoro svolto.[n][w][e]

[msg D02_EXIT_MES [Navigatore del Metaverso]]
[s]Ritorno al mondo reale dal[n]Palazzo di Madarame. Grazie[n]per il lavoro svolto.[n][w][e]

[msg D03_EXIT_MES [Navigatore del Metaverso]]
[s]Ritorno al mondo reale dal[n]Palazzo di Kaneshiro. Grazie[n]per il lavoro svolto.[n][w][e]

[msg D04_EXIT_MES [Navigatore del Metaverso]]
[s]Ritorno al mondo reale dal[n]Palazzo di Futaba. Grazie[n]per il lavoro svolto.[n][w][e]

[msg D05_EXIT_MES [Navigatore del Metaverso]]
[s]Ritorno al mondo reale dal[n]Palazzo di Okumura. Grazie[n]per il lavoro svolto.[n][w][e]

[msg D06_EXIT_MES [Navigatore del Metaverso]]
[s]Ritorno al mondo reale dal[n]Palazzo di Niijima. Grazie[n]per il lavoro svolto.[n][w][e]

[msg D07_EXIT_MES [Navigatore del Metaverso]]
[s]Ritorno al mondo reale dal[n]Palazzo di Shido. Grazie[n]per il lavoro svolto.[n][w][e]

[msg D08_EXIT_MES [Navigatore del Metaverso]]
[s]Ritorno al mondo reale[n]dai Memento. Grazie[n]per il lavoro svolto.[n][w][e]

[msg D10_EXIT_MES [Navigatore del Metaverso]]
[s]Ritorno al mondo reale dal[n]Palazzo di Maruki. Grazie[n]per il lavoro svolto.[n][w][e]

[msg DUNGEON_ROUTE_COMP_PC03_ [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 1185 65535 0]Abbiamo trovato la strada[n]per il Tesoro... Vuoi andare[n]via da qui?[n][w][e]

[msg DUNGEON_ROUTE_COMP_PC04_ [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 1174 65535 0]Credo non ci resti che[n]prepararci per il Giorno del[n]Destino... Torniamo indietro?[n][w][e]

[msg DUNGEON_EXIT_NOT_01_PC02 [Ryuji]]
[s][bup 0 2 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Gi稲 torniamo indietro?[n]Non abbiamo combinato niente...[n][w][e]

[msg DUNGEON_EXIT_NOT_01_PC03 [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Qualcosa non va, Joker? Non[n]abbiamo ancora fatto nulla.[n][w][e]

[msg DUNGEON_EXIT_NOT_01_PC04 [Ann]]
[s][bup 0 4 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Eh? Vuoi gi稲 andare a casa?[n]Ma non abbiamo fatto niente.[n][w][e]

[msg DUNGEON_EXIT_NOT_01_PC05 [Yusuke]]
[s][bup 0 5 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Qual 因 il problema? Oggi non abbiamo[n]ancora esplorato nulla.[n][w][e]

[msg DUNGEON_EXIT_NOT_01_PC06 [Makoto]]
[s][bup 0 6 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Che succede? Vuoi tornare[n]anche se non abbiamo ancora[n]fatto niente?[n][w][e]

[msg DUNGEON_EXIT_NOT_01_PC07 [Futaba]]
[s][bup 0 8 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Eh? Andiamo a casa, Joker?[n]In pratica non abbiamo[n]fatto niente, oggi.[n][w][e]

[msg DUNGEON_EXIT_NOT_01_PC08 [Haru]]
[s][bup 0 7 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Che hai, Joker?[n]Oggi non siamo ancora riusciti[n]a combinare niente.[n][w][e]

[msg DUNGEON_EXIT_NOT_01_PC09 [Akechi]]
[s][bup 0 9 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Mmm? Desideri tornare? Ma non[n]abbiamo ancora risolto nulla[n]per oggi.[n][w][e]

[msg DUNGEON_EXIT_NOT_01_PC10 [[sumi 10 0]]]
[s][bup 0 10 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Uh, torniamo indietro? Ho come[n]l'impressione di non aver[n]fatto granch姻, oggi...[n][w][e]

[msg DUNGEON_EXIT_01_PC02_mes [Ryuji]]
[s][bup 0 2 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 7072 65535 0]Che c'因? Vuoi che torniamo[n]e ci riorganizziamo?[n][w][e]

[msg DUNGEON_EXIT_01_PC03_mes [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 1059 65535 0]Mmm? Vuoi ritirarti, Joker?[n][w][e]

[msg DUNGEON_EXIT_01_PC04_mes [Ann]]
[s][bup 0 4 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 6072 65535 0]Qualcosa non va? Vuoi[n]andartene da qui?[n][w][e]

[msg DUNGEON_EXIT_01_PC05_mes [Yusuke]]
[s][bup 0 5 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 4072 65535 0]Vuoi che ci riorganizziamo, Joker?[n][w][e]

[msg DUNGEON_EXIT_01_PC06_mes [Makoto]]
[s][bup 0 6 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 2120 65535 0]Mmm? Vuoi tornare indietro?[n][w][e]

[msg DUNGEON_EXIT_01_PC07_mes [Futaba]]
[s][bup 0 8 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 9136 65535 0]Non sarebbe una cattiva idea[n]tornare a casa e riorganizzarci.[n][w][e]

[msg DUNGEON_EXIT_01_PC08_mes [Haru]]
[s][bup 0 7 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 3001 65535 0]為 il momento di ritirarsi?[n][w][e]

[msg DUNGEON_EXIT_01_PC09_mes [Akechi]]
[s][bup 0 9 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 8130 65535 0]Oh? Ci stiamo ritirando?[n][w][e]

[msg DUNGEON_EXIT_01_PC10_mes [[sumi 10 0]]]
[s][bup 0 10 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 57089 65535 0]Oh, dobbiamo riorganizzarci?[n][w][e]

[msg DUNGEON_EXIT_01_PC11_mes [Akechi]]
[s][bup 0 9 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 8130 65535 0]Oh? Ci stiamo ritirando?[n][w][e]

[msg ATD_EXIT_REMIND_FLOWER_V [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 53101 65535 0]Jose ha detto che i fiori[n]scompaiono quando[n]abbandoni i Memento...[n][w][e]
[s][f 4 10 65535 0 0][f 4 25 1 65535 0 0]......[n][w][e]

[msg ATD_EXIT_REMIND_FLOWER_V_2 [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 53101 65535 0]Jose ha detto che i fiori[n]scompaiono quando[n]abbandoni i Memento...[n][w][e]
[s][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Finora hai raccolto [clr 2][var 0][clr 27] fiori.[n]Vuoi davvero andartene?[n][w][e]

[msg ATD_EXIT_REMIND_FLOWER_V_3 [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 1185 65535 0]Mmh? Stiamo tornando indietro?[n][w][e]
[s][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Al momento hai [clr 2][var 0][clr 27] fiori.[n]Andandotene, spariranno.[n][w][e]

[msg ATD_EXIT_CABLE_VANISHED_ [Morgana]]
[s][bup 0 3 2 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 1185 65535 0]Abbiamo fatto tutto ci韻 di cui[n]avevamo bisogno. Finiamo qui[n]per oggi?[n][w][e]

[msg ATD_EXIT_CANCEL_CABLE_VA [Morgana]]
[s][bup 0 3 2 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 1035 65535 0]D'accordo. Esploriamo[n]ancora un po'.[n][w][e]

[msg D_EXIT_OK_01_PC02_mes [Ryuji]]
[s][bup 0 2 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 7050 65535 0]OK, muoviamoci.[n][w][e]

[msg D_EXIT_OK_01_PC03_mes [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 1049 65535 0]Mmm, per oggi rientriamo.[n][w][e]

[msg D_EXIT_OK_01_PC04_mes [Ann]]
[s][bup 0 4 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 6049 65535 0]OK, andiamo.[n][w][e]

[msg D_EXIT_OK_01_PC05_mes [Yusuke]]
[s][bup 0 5 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 4049 65535 0]Mmm, molto bene. Rientriamo.[n][w][e]

[msg D_EXIT_OK_01_PC06_mes [Makoto]]
[s][bup 0 6 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 2049 65535 0]OK, per oggi fermiamoci qui.[n][w][e]

[msg D_EXIT_OK_01_PC07_mes [Futaba]]
[s][bup 0 8 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 9050 65535 0]OK, andiamo a casa![n][w][e]

[msg D_EXIT_OK_01_PC08_mes [Haru]]
[s][bup 0 7 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 3049 65535 0]Molto bene. Andiamo a casa.[n][w][e]

[msg D_EXIT_OK_01_PC09_mes [Akechi]]
[s][bup 0 9 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 8035 65535 0]Buona idea. In tal caso,[n]andiamocene da qui.[n][w][e]

[msg D_EXIT_OK_01_PC10_mes [[sumi 10 0]]]
[s][bup 0 10 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 57066 65535 0]Capito. Torniamo indietro, dunque?[n][w][e]

[msg D_EXIT_OK_01_PC11_mes [Akechi]]
[s][bup 0 9 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 8138 65535 0]Buona idea. In tal caso,[n]andiamocene da qui.[n][w][e]

[sel DUNGEON_EXIT_151_EX_SEL top]
[s]*Speciale[e]
[s]Attiva il [clr 6]Navigatore del Metaverso[clr 27][e]
[s]Non attivare il Navi[e]

[msg DUNGEON_EXIT_D01_EX_mes [Ryuji]]
[s][bup 0 2 0 65535 0]Se usiamo quel navigatore[n]qui intorno, dovrebbe riportarci[n]nel mondo reale.[n][w][e]

[msg D_EXIT_OK_D01_EX_mes [Ryuji]]
[s][bup 0 2 0 65535 0]Grande, ha funzionato![n][w][e]

[msg D_EXIT_NG_D01_EX_mes [Ryuji]]
[s][bup 0 2 0 65535 0]Che stai facendo?[n]Andiamocene da qui![n][w][e]

[msg D_EXIT_CANCEL_PC02_mes [Ryuji]]
[s][bup 0 2 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 7080 65535 0]OK. Posso continuare,[n]se 因 questo che vuoi.[n][w][e]

[msg D_EXIT_CANCEL_PC03_mes [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 1096 65535 0]Bene. Allora continuiamo[n]a esplorare.[n][w][e]

[msg D_EXIT_CANCEL_PC04_mes [Ann]]
[s][bup 0 4 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 6096 65535 0]OK, allora guardiamo ancora[n]un po' in giro.[n][w][e]

[msg D_EXIT_CANCEL_PC05_mes [Yusuke]]
[s][bup 0 5 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 4052 65535 0]Concordo. Penso che ci siano[n]altri posti da scoprire.[n][w][e]

[msg D_EXIT_CANCEL_PC06_mes [Makoto]]
[s][bup 0 6 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 2081 65535 0]Giusto. Proseguiamo.[n][w][e]

[msg D_EXIT_CANCEL_PC07_mes [Futaba]]
[s][bup 0 8 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 9130 65535 0]Ricevuto. Guardiamo un altro[n]po' in giro.[n][w][e]

[msg D_EXIT_CANCEL_PC08_mes [Haru]]
[s][bup 0 7 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 3051 65535 0]Mm-hm. Bene, torniamo alla[n]nostra esplorazione.[n][w][e]

[msg D_EXIT_CANCEL_PC09_mes [Akechi]]
[s][bup 0 9 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 8070 65535 0]Molto bene, proseguiamo[n]ancora un po'.[n][w][e]

[msg D_EXIT_CANCEL_PC10_mes [[sumi 10 0]]]
[s][bup 0 10 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 57163 65535 0]S淫. Andiamo ancora un po'[n]avanti.[n][w][e]

[msg D_EXIT_CANCEL_PC11_mes [Akechi]]
[s][bup 0 9 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 8137 65535 0]Molto bene. Ma non abbassiamo[n]la guardia.[n][w][e]

[msg ALERT_MAX_EXIT_mes00 [Morgana]]
[s][bup 0 3 4 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 1039 65535 0]Ngh, si mette male! Qui il[n]livello di allerta 因 troppo alto![n][w][e]
[s][bup 0 3 2 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Se continuiamo a esplorare,[n]rischieremo seriamente la vita.[n][w][e]
[s]Dobbiamo ritirarci, Joker![n][w][e]

[msg ALERT_MAX_EXIT_mes01 [Ryuji]]
[s][bup 0 2 104 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 7044 65535 0]A-Aspetta un attimo. Forse[n]potremmo continuare ancora un...[n][w][e]

[msg ALERT_MAX_EXIT_mes02 [Morgana]]
[s][bup 0 3 3 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 1082 65535 0]Il numero di Ombre 因[n]in rapido aumento! Dobbiamo[n]andarcene! Presto![n][w][e]

[msg D_EXIT_NG_ACTIVE_01_PC02 [Ryuji]]
[s][bup 0 2 104 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 7041 65535 0]Che dici, coso?!? Abbiamo gi稲[n]mandato la lettera di sfida![n][w][e]
[s][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Tutto quel duro lavoro andr稲[n]in fumo se non rubiamo[n]oggi il Tesoro![n][w][e]

[msg D_EXIT_NG_ACTIVE_01_PC03 [Morgana]]
[s][bup 0 3 4 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 1040 65535 0]Cosa? Ma quando parlo[n]mi ascolti o no?[n][w][e]
[s][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Se non prendiamo oggi il Tesoro,[n]tutto quello che abbiamo fatto[n]finora sar稲 stato invano![n][w][e]

[msg D_EXIT_NG_ACTIVE_01_PC04 [Ann]]
[s][bup 0 4 104 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 6039 65535 0]No! Proprio no![n]Neanche per idea![n][w][e]
[s][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Se non prendiamo il Tesoro[n]oggi, getteremo al vento tutti[n]i nostri preparativi![n][w][e]

[msg D_EXIT_NG_ACTIVE_01_PC05 [Yusuke]]
[s][bup 0 5 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 4104 65535 0]Vuoi tornare indietro...? Ahah,[n]di solito non scherzi[n]durante le missioni.[n][w][e]
[s][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Rimettiamoci all'opera, Joker.[n][w][e]

[msg D_EXIT_NG_ACTIVE_01_PC06 [Makoto]]
[s][bup 0 6 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 2043 65535 0]Su, non lamentarti.[n]Sei o non sei il nostro leader?[n][w][e]
[s][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Dobbiamo prendere il Tesoro[n]oggi, a qualunque costo![n][w][e]

[msg D_EXIT_NG_ACTIVE_01_PC07 [Futaba]]
[s][bup 0 8 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]OK, andiamo a casa...[n][w][e]
[s][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 9100 65535 0]Ehi... Scherzavo.[n]Adesso non si torna indietro.[n][w][e]

[msg D_EXIT_NG_ACTIVE_01_PC08 [Haru]]
[s][bup 0 7 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Pensavo non potessimo tirarci[n]indietro dopo la lettera di sfida...[n][w][e]
[s][bup 0 7 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 3136 65535 0]Non preoccuparti, Joker. Hai[n]tutto il nostro appoggio![n][w][e]

[msg D_EXIT_NG_ACTIVE_01_PC09 [Akechi]]
[s][bup 0 9 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 8112 65535 0]Vuoi andartene dopo che siamo[n]arrivati fin qui? Non 因 da te.[n][w][e]
[s][bup 0 9 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Oggi, per韻, dovremmo provarci.[n]Ti dar韻 il mio aiuto.[n][w][e]

[msg D_EXIT_NG_ACTIVE_01_PC10 [[sumi 10 0]]]
[s][bup 0 10 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 57118 65535 0]Pensavo non si potesse pi迂 tornare[n]indietro una volta inviata[n]la lettera di sfida, no?[n][w][e]
[s][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Andiamo, Joker.[n]Anch'io ce la metter韻 tutta.[n][w][e]

[msg D_EXIT_NG_ACTIVE_01_PC11 [Akechi]]
[s][bup 0 9 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 8018 65535 0]Abbiamo fatto tutta questa[n]strada. Non possiamo mollare[n]adesso.[n][w][e]
[s][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Facciamola finita.[n][w][e]

[msg SAFEROOM_EXIT_PC03_mes [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Vuoi davvero tornare[n]indietro, Joker?[n][w][e]

[msg SAFEROOM_EXIT_PC07_mes [Futaba]]
[s][bup 0 8 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Torniamo sul serio a casa, Joker?[n][w][e]

[msg D01_04_e166_015_mes01 [Ryuji]]
[s][bup 0 2 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 7103 65535 0]OK, ora dobbiamo solo rubare[n]il Tesoro che salter稲 fuori,[n]no? Finalmente 因 il momento.[n][w][e]

[msg D01_04_e166_015_mes02 [Ann]]
[s][bup 0 4 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Ma prima dobbiamo mandare la[n]lettera di sfida. Quando lo faremo?[n][w][e]

[msg D01_04_e166_015_mes03 [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Aspettiamo. Per ora ritiriamoci,[n]ne parleremo pi迂 a fondo[n]al ritrovo.[n][w][e]
[s][bup 0 3 1 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 1030 65535 0]Oh, e bel lavoro![n][w][e]

[msg D02_MISSION_POINT_PC03_m [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 1172 65535 0]Dovremmo andarcene e[n]cercare di disattivare i sistemi[n]di sicurezza del cortile.[n][w][e]

[msg D02_04_e210_240_mes01 [Ryuji]]
[s][bup 0 2 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 7153 65535 0]Sono ancora un po' preoccupato...[n]ma possiamo farcela.[n][w][e]

[msg D02_04_e210_240_mes02 [Yusuke]]
[s][bup 0 5 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 4076 65535 0]Non immagino neanche cosa possa[n]essere il Tesoro di Madarame...[n][w][e]

[msg D02_04_e210_240_mes03 [Ann]]
[s][bup 0 4 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Qualunque cosa sia, lo ruberemo[n]di sicuro. Oh, oggi siete stati[n]tutti bravissimi![n][w][e]

[msg D03_FIRST_END_PC03_mes [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 1172 65535 0]La porta cognitiva 因 chiusa.[n]Dobbiamo tornare indietro?[n][w][e]

[msg D06_FIRST_END_PC06_mes [Makoto]]
[s][bup 0 6 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 2118 65535 0]Per ora dobbiamo tornare[n]nel mondo reale.[n][w][e]

[msg D07_FIRST_END_PC03_mes [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 1174 65535 0]Va bene, Joker! Ritirata![n][w][e]

[msg D01_EXIT_NG_EV01_mes01 [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Dove vai, Joker?[n][w][e]
[s]Non abbiamo gi稲 controllato a fondo[n]quelle celle? Addentriamoci di pi迂[n]nel castello.[n][w][e]

[msg D01_EXIT_NG_EV01_mes02 [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Per arrivarci dovremo passare per[n]la sala d'ingresso, ma...[n]la porta non era chiusa?[n][w][e]
[s]Sar稲 impossibile, a meno di non[n]trovare un'altra strada che conduca[n]al primo piano di quella sala.[n][w][e]

[msg D07_DUNGEON_EXIT_SC_mes0 [Ryuji]]
[s][bup 0 2 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Dai, siamo arrivati fin qui.[n]Almeno prima proviamo a dare[n]un'altra occhiata in giro.[n][w][e]

[sel D_VELVET_IN_SEL top]
[s]Lasciami entrare in cella.[e]
[s]Non voglio entrare.[e]

[msg D_VELVET_IN_QUIET_01 [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 0 12002 65535 0]A quanto pare, vuoi essere[n]imprigionato. Posso esaudire[n]il tuo desiderio...[n][w][e]

[msg D_VELVET_IN_QUIET_OK [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Molto bene. Sar韻 lieta di[n]esaudire il tuo desiderio...[n][w][e]

[msg D_VELVET_IN_QUIET_NO [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]...Continua la tua lotta.[n][w][e]

[msg D_VELVET_IN_LOUD_01 [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Che c'因, Prigioniero?[n]Desideri tornare in prigione?[n][w][e]

[msg D_VELVET_IN_LOUD_OK [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Eheheh. Ti rimetter韻 al[n]tuo posto![n][w][e]

[msg D_VELVET_IN_LOUD_NO [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Continua a lottare, Prigioniero.[n][w][e]

[msg D_VELVET_IN_LAST_01 [Lavenza]]
[s][bup 0 100 0 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Ti condurr韻 dal mio padrone...[n][w][e]

[sel D_VELVET_IN_LAST_SEL top]
[s]Voglio prepararmi.[e]
[s]Non voglio entrare.[e]

[msg D_VELVET_IN_LAST_OK [Lavenza]]
[s][bup 0 100 0 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Allora entra, per favore.[n][w][e]

[msg D_VELVET_IN_LAST_NO [Lavenza]]
[s][bup 0 100 0 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Molto bene. Io e il mio padrone[n]veglieremo su di te.[n][w][e]

