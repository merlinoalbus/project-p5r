[msg MSG_DUMMY]
[s]Dummy[n][w][e]

[msg MSG_TEST_EGOL [Igor]]
[s][bup 0 201 0 0 0][f 4 10 65535 0 0][vp 1 0 0 170 0 0]Benvenuto nella Stanza di Velluto...[n]Hai bisogno di qualcosa oggi?[n][w][e]

[msg MSG_TEST_EGOL_common [Igor]]
[s][bup 0 201 0 0 0][f 4 10 65535 0 0][vp 1 0 0 170 0 0]La tua riabilitazione sembra[n]procedere spedita...[n]Cosa ti serve oggi?[n][w][e]

[msg MSG_TEST_EGOL_ALERT [Igor]]
[s][bup 0 201 0 0 0][f 4 10 65535 0 0][vp 8 2 1 55554 65535 0]Sembra che sia scattato un allarme.[n]Pensa bene a cosa fare... per[n]il bene della tua riabilitazione.[n][w][e]

[msg MSG_TEST_EGOL_ALERT_comm [Igor]]
[s][bup 0 201 0 0 0][f 4 10 65535 0 0][vp 8 2 1 55552 65535 0]Vediamo se questo ti porter稲[n]pi迂 vicino al tuo obiettivo.[n][w][e]

[msg MSG_TEST_EGOL_TRUE [Igor]]
[s][bup 0 201 0 0 0][f 4 10 65535 0 0][vp 8 2 1 55501 65535 0]Benvenuto nella Stanza di Velluto.[n]Dimmi di cosa hai bisogno.[n][w][e]

[msg MSG_TEST_EGOL_TRUE_ALERT [Igor]]
[s][bup 0 201 0 0 0][f 4 10 65535 0 0][vp 8 2 1 55502 65535 0]Pare che sia scattato un allarme...[n]Sfrutta quest'opportunit稲.[n][w][e]

[msg MSG_VelvetEndOrGohome_Q [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0][vp 8 2 1 11006 65535 0]Cosa vuoi fare, Prigioniero?[n]Gi稲 in partenza?[n][w][e]

[msg MSG_VelvetEndOrGohome_Q_ [Lavenza]]
[s][bup 0 100 0 0 0][f 4 10 65535 0 0]Sei gi稲 di ritorno?[n][w][e]

[sel SEL_VelvetEnd top]
[s]Devo parlare con Igor.[e]
[s]Voglio tornare indietro.[e]
[s]Ho ancora da fare qui...[e]

[msg MSG_VelvetEndOrGohome_Q__2 [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0][vp 8 2 1 11036 65535 0]Dunque ora cosa farai?[n][w][e]

[msg MSG_VelvetEndOrGohome_Q__3 [Lavenza]]
[s][bup 0 100 0 0 0][f 4 10 65535 0 0]Allora, che farai?[n][w][e]

[msg BED_mes01 [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0][f 4 23 1 200 3 10 0 10][vp 8 2 1 11022 65535 0]Cosa stai facendo, Prigioniero?[n]Non hai tempo[n]per poltrire![n][w][e]

[msg BED_mes01_no_motion [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0][vp 8 2 1 11022 65535 0]Cosa stai facendo, Prigioniero?[n]Non hai tempo[n]per poltrire![n][w][e]

[msg BED_mes02_1 [Voce misteriosa]]
[s][vp 1 0 0 2100 0 0]Ascolta...[n][w][e]
[s][vp 1 0 0 2101 0 0]... ultime...[n]... lascio.[n][w][e]
[s][vp 1 0 0 2102 0 0]Se... voce... raggiunge...[n]probabilmente... non sono...[n][w][e]
[s][vp 1 0 0 2103 0 0]... affidamento... te.[n][w][e]
[s][vp 1 0 0 2104 0 0]... prego... devi...[n][w][e]
[s][vp 1 0 0 2105 0 0]... rovina... [n]... solo... tua...[n][w][e]
[s][vp 1 0 0 2106 0 0]...piano... destino...[n]respingere...[n]... disfatta...[n][w][e]
[s][vp 1 0 0 2107 0 0]... Prescelto...[n][w][e]
[s][vp 1 0 0 2108 0 0]Sfida...[n]... mondo...[n][w][e]

[msg BED_mes02_2 [Voce misteriosa]]
[s][vp 1 0 0 2200 0 0]Ascoltami...[n][w][e]
[s][vp 1 0 0 2201 0 0]Queste... ultime parole[n]... lascio.[n][w][e]
[s][vp 1 0 0 2202 0 0]Se... voce... ti raggiunge...[n]molto probabilmente... pi迂...[n][w][e]
[s][vp 1 0 0 2203 0 0]Devo... su di te...[n][w][e]
[s][vp 1 0 0 2204 0 0]... prego... devi...[n][w][e]
[s][vp 1 0 0 2205 0 0]... rovina... abbatter稲 su... solo... tua...[n][w][e]
[s][vp 1 0 0 2206 0 0]... piano... sfidare...[n]... respingere...[n]disfatta.[n][w][e]
[s][vp 1 0 0 2207 0 0]... Pres...[n][w][e]
[s][vp 1 0 0 2208 0 0]...crudele...salva...questo mondo...[n][w][e]

[msg BED_mes02_3 [Voce misteriosa]]
[s][vp 1 0 0 2300 0 0]Ascoltami...[n][w][e]
[s][vp 1 0 0 2301 0 0]Queste sono le ultime parole[n]che ti lascio.[n][w][e]
[s][vp 1 0 0 2302 0 0]Se la mia voce ti ha raggiunto,[n]probabilmente sono morto.[n][w][e]
[s][vp 1 0 0 2303 0 0]Devo fare affidamento su di te.[n][w][e]
[s][vp 1 0 0 2304 0 0]Ti prego... devi ricordare.[n][w][e]
[s][vp 1 0 0 2305 0 0]La rovina che si abbatter稲[n]su di te 因 solo opera tua...[n][w][e]
[s][vp 1 0 0 2306 0 0]...Un piano per sfidare il destino[n]in modo da respingere la[n]futura disfatta.[n][w][e]
[s][vp 1 0 0 2307 0 0]Sei il Prescelto.[n][w][e]
[s][vp 1 0 0 2308 0 0]Sfida il tuo crudele destino[n]e salva questo mondo...[n][w][e]

[msg bed_mes03_1]
[s]Mi sembra di sentire una voce[n]provenire da qualche parte...[n][w][e]

[msg bed_mes03_2]
[s]Mi 因 sembrato di sentire qualcosa...[n][w][e]
[s]Una voce, che mi avvertiva[n]di un disastro incombente?[n][w][e]
[s]Di chi era quella voce?[n][w][e]

[msg bed_mes03_3 [Lavenza]]
[s][bup 0 100 0 0 0][f 4 10 65535 0 0][vp 8 2 1 55403 65535 0]...C'因 qualcosa che non va?[n][w][e]

[msg bed_mes03_4]
[s]...La voce che ho sentito[n]sembra essere di Lavenza.[n][w][e]

[msg bed_error [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0][f 4 23 1 200 3 10 0 10][vp 8 2 1 11051 65535 0]Ti ho detto che non hai tempo[n]per poltrire! Lavora alla[n]tua riabilitazione, Prigioniero![n][w][e]

[msg bed_error_no_motion [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0][vp 8 2 1 11051 65535 0]Ti ho detto che non hai tempo[n]per poltrire! Lavora alla[n]tua riabilitazione, Prigioniero![n][w][e]

[msg MSG_CAROLINE_BYEBYE [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0][vp 8 2 0 11053 65535 0][f 4 23 1 200 3 10 0 10]Torna indietro e goditi la pausa![n][w][e]

[msg MSG_JUSTINE_BYEBYE [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0][vp 8 2 0 12049 65535 0][f 4 23 1 211 3 10 0 10]Fai ritorno al tuo fugace[n]tempo per riposare...[n][w][e]

[msg MSG_CAROLINE_BYEBYE_SP [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0]Se te ne vai, 因 finita con[n]l'allarme. Sei sicuro?[n][w][e]

[msg MSG_JUSTINE_BYEBYE_SP [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0]Se te ne vai, l'allarme[n]si spegner稲. Sei sicuro?[n][w][e]

[msg MSG_CAROLINE_BYEBYE_SP_N [Justine]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0][vp 8 2 1 11063 65535 0]Chi credi di essere, Prigioniero?!?[n]Andarsene durante un allarme[n]senza neanche un'esecuzione![n][w][e]

[msg MSG_JUSTINE_BYEBYE_SP_NO [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0][vp 8 2 1 12036 65535 0]Sembra uno spreco andarsene[n]senza effettuare esecuzioni. Forse[n]dovremmo lasciare attivo l'allarme.[n][w][e]

[sel SEL_BYEBYE top]
[s]Voglio tornare indietro.[e]
[s]Ho cambiato idea.[e]

[msg MSG_LAVENZA_BYEBYE [Lavenza]]
[s][bup 0 100 1 0 0][f 4 10 65535 0 0]Sono certa che riuscirai a[n]sconfiggere il dio maligno.[n]Buona fortuna.[n][w][e]

[msg MSG_LAVENZA_BYEBYE_P5R [Lavenza]]
[s][bup 0 100 1 0 0][f 4 10 65535 0 0][vp 8 2 1 55425 65535 0]So che puoi superare qualsiasi[n]ostacolo. Buona fortuna.[n][w][e]

[msg MSG_LAVENZA_BYEBYE_SP [Lavenza]]
[s][bup 0 100 1 0 0][f 4 10 65535 0 0][vp 8 2 1 55419 65535 0]Un allarme 因 l'occasione rara di un[n]momento fugace... ma se te ne[n]vai, terminer稲. Ne sei sicuro?[n][w][e]

[msg MSG_LAVENZA_BYEBYE_SP_NO [Lavenza]]
[s][bup 0 100 1 0 0][f 4 10 65535 0 0][vp 8 2 1 55475 65535 0]L'allarme durer稲 finch姻 non[n]eseguirai una fusione, quindi[n]ti prego di tornare.[n][w][e]

[msg MSG_CAROLINE_TUTORIAL_ST [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0][vp 8 2 1 11103 65535 0]Sembri rilassato, nonostante[n]la tua situazione. Credo di poter[n]rispondere a delle tue domande.[n][w][e]

[msg MSG_CAROLINE_TUTORIAL_ST_2 [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0][vp 8 2 1 11103 65535 0]Sembri rilassato, nonostante[n]la tua situazione. Credo di poter[n]rispondere a delle tue domande.[n][w][e]

[msg MSG_CAROLINE_TUTORIAL_00 [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0][f 4 23 1 200 3 10 0 10][vp 8 2 1 11001 65535 0]Questo 因 quanto.[n]C'因 altro,[n]Prigioniero?[n][w][e]

[msg MSG_CAROLINE_TUTORIAL_00_2 [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0][vp 8 2 1 11001 65535 0]Questo 因 quanto.[n]C'因 altro,[n]Prigioniero?[n][w][e]

[msg MSG_JUSTINE_TUTORIAL_STA [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0][f 4 23 1 211 3 10 0 10][vp 8 2 1 12001 65535 0]...Perso tra i pensieri?[n]Se non capisci qualcosa,[n]posso spiegare.[n][w][e]

[msg MSG_JUSTINE_TUTORIAL_STA_2 [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0][vp 8 2 1 12001 65535 0]...Perso tra i pensieri?[n]Se non capisci qualcosa,[n]posso spiegare.[n][w][e]

[msg MSG_JUSTINE_TUTORIAL_01 [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0][f 4 23 1 211 3 10 0 10][vp 8 2 1 12020 65535 0]為 pi迂 o meno tutto... [n]Ma sento che desideri[n]chiedere altro.[n][w][e]

[msg MSG_JUSTINE_TUTORIAL_01_ [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0][vp 8 2 1 12020 65535 0]為 pi迂 o meno tutto... [n]Ma sento che desideri[n]chiedere altro.[n][w][e]

[sel SEL_VELVET_TUTORIAL_02 top]
[s]Cos'因 una Persona?[e]
[s]Cos'因 un Confidente?[e]
[s]Trasformazioni Ombre[e]
[s]Niente[e]

[msg MSG_JUSTINE_TUTORIAL_03 [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0][vp 8 2 1 12068 65535 0]Capisco. D'accordo...[n][w][e]

[msg MSG_VELVET_TUTORIAL_TITL]
[s]Cosa vuoi chiedere?[n][e]

[sel SEL_VELVET_TUTORIAL_04 top]
[s]Cos'因 una Persona?[e]
[s]Cos'因 un Confidente?[e]
[s]Cos'因 un'Ombra?[e]
[s]Ombre e Personae[e]
[s]Trasformazioni Ombre[e]
[s]Maschera Ombre[e]
[s]Cosa sono le Ombre sciagura?[e]

[msg MSG_VELVET_TUTORIAL_05 [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0][vp 8 2 1 11071 65535 0]Nel profondo dell'animo umano[n]risiede un "s姻" dissimile[n]dalla loro consapevolezza.[n][w][e]
[s][f 4 10 65535 0 0]Come una maschera che protegge[n]il loro cuore quando affrontano[n]il mondo esterno.[n][w][e]
[s][f 4 10 65535 0 0]Estrarla consapevolmente e[n]usarla in battaglia viene[n]detto abilit稲 Persona.[n][w][e]
[s][f 4 10 65535 0 0]Le Ombre possono essere[n]sconfitte solo da chi sa[n]evocare la propria Persona.[n][w][e]
[s][f 4 10 65535 0 0]In altre parole, voi[n]siete i loro nemici naturali.[n][w][e]

[msg MSG_VELVET_TUTORIAL_06 [Caroline]]
[s][bup 0 102 2 0 0][f 4 10 65535 0 0][vp 8 2 1 11026 65535 0]Hai gi稲 dimenticato, Prigioniero?[n][w][e]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0]Confidente 因 colui col quale[n]hai stretto un legame basato[n]sulla comunione di credenze.[n][w][e]
[s][f 4 10 65535 0 0]Un forte legame con chi possiede[n]talenti che tu non hai[n]ti doner稲 potere.[n][w][e]
[s][bup 0 102 2 0 0][f 4 10 65535 0 0]Anche il nostro padrone[n]因 un Confidente.[n]Non dimenticartelo![n][w][e]

[msg MSG_VELVET_TUTORIAL_07 [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0][vp 8 2 1 12071 65535 0]Le profondit稲 degli animi umani[n]confluiscono in una dimensione[n]vasta quanto un mare.[n][w][e]
[s][f 4 10 65535 0 0]Non 因 dissimile dal concetto[n]comunemente inteso come[n]"inconscio collettivo".[n][w][e]
[s][f 4 10 65535 0 0]La gente non ci presta attenzione,[n]e l'oscurit稲 dei loro cuori[n]vi prende residenza.[n][w][e]
[s][f 4 10 65535 0 0]Quando una di queste[n]riesce a prender forma,[n]diventa un'Ombra.[n][w][e]
[s][f 4 10 65535 0 0]Le Ombre che vedi nei Palazzi[n]sono per韻 intrappolate, distorte[n]e rese schiave dal Signore.[n][w][e]
[s][f 4 10 65535 0 0]Intrusi come voi[n]non possono sfuggir loro.[n][w][e]

[msg MSG_VELVET_TUTORIAL_08 [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0][vp 8 2 1 11034 65535 0]Solo chi evoca Personae[n]pu韻 interagire con le Ombre,[n]e quindi attaccarle.[n][w][e]
[s][f 4 10 65535 0 0]Questo perch姻 le Personae,[n]in sostanza, sono identiche[n]alle Ombre.[n][w][e]
[s][f 4 10 65535 0 0]Un s姻 nascosto che differisce[n]dal s姻 quotidiano, la natura pi迂[n]profonda, inammissibile dall'Io.[n][w][e]
[s][f 4 10 65535 0 0]In altre parole,[n]la tua Ombra interiore.[n]Se la sai usare, diventa Persona.[n][w][e]
[s][f 4 10 65535 0 0]Chiunque guarda in se stesso,[n]affrontandone i motivi nascosti,[n]ne sente la voce.[n][w][e]

[msg MSG_VELVET_TUTORIAL_09 [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0][vp 8 2 1 12069 65535 0]Le Ombre di un Palazzo tornano[n]alla forma naturale durante le battaglie[n]per scatenare il loro potere.[n][w][e]
[s][f 4 10 65535 0 0]Non cambia la loro forma,[n]quanto piuttosto l'aspetto[n]che hanno prima 因 distorto.[n][w][e]
[s][f 4 10 65535 0 0]Le loro forme naturali sembrano[n]Personae perch姻 non c'因[n]differenza tra di loro.[n][w][e]
[s][f 4 10 65535 0 0]Appaiono come dei e demoni per via[n]delle immagini culturali del potere[n]condivise dall'umanit稲 in generale.[n][w][e]

[msg MSG_VELVET_TUTORIAL_10 [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0][vp 8 2 1 12091 65535 0]La maschera delle Ombre fuori dalla[n]battaglia mostra come siano[n]dominate dalla distorsione.[n][w][e]
[s][f 4 10 65535 0 0]Strappargliela a forza obbligando[n]il corpo a cambiare deve gettarle[n]in una sorpresa totale.[n][w][e]
[s][f 4 10 65535 0 0]Nessun'Ombra pu韻 essere[n]pienamente all'erta dopo[n]averle fatto una cosa simile.[n][w][e]
[s][bup 0 101 1 0 0][f 4 10 65535 0 0]La tua storia violenta deve[n]averti aiutato a trovare un[n]simile metodo.[n][w][e]

[msg MSG_VELVET_TUTORIAL_R01 [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0][vp 8 2 1 12077 65535 0]Un'Ombra sciagura 因[n]un'Ombra aberrante che puoi[n]incontrare di tanto in tanto.[n][w][e]
[s][f 4 10 65535 0 0]Noi riteniamo che siano Ombre[n]ordinarie, trasformate dall'influsso[n]delle emozioni negative delle masse.[n][w][e]
[s][f 4 10 65535 0 0]Quando queste emozioni le fanno[n]esplodere, le Ombre circostanti[n]possono subire una potente eco.[n][w][e]
[s][bup 0 101 3 0 0][f 4 10 65535 0 0]Un tale potere distruttivo pu韻 fare[n]la differenza tra la vittoria e la[n]morte. Non sottovalutarlo.[n][w][e]

[msg MSG_PER_CHK_RE_START [Caroline]]
[s][bup 0 102 0 0 0]Eccoti, Prigioniero![n]Hai fatto i compiti?[n][w][e]

[msg MSG_VELVET_LAV_NO_HELP [Lavenza]]
[s][bup 0 100 0 0 0][f 4 10 65535 0 0][f 4 23 1 211 3 10 0 10]Ombre e Personae...[n][w][e]
[s][f 4 10 65535 0 0]Di certo non serve che[n]te lo spieghi di nuovo.[n]Gi稲 ne conosci la natura.[n][w][e]
[s][bup 0 100 1 0 0][f 4 10 65535 0 0][vp 8 2 1 55458 65535 0]Il fatto che il mio padrone[n]e io siamo qui di nuovo[n]ne 因 la prova.[n][w][e]

[msg MSG_VELVET_LAV_NO_HELP_n [Lavenza]]
[s][bup 0 100 0 0 0][f 4 10 65535 0 0]Ombre e Personae...[n][w][e]
[s][f 4 10 65535 0 0]Di certo non serve che[n]te lo spieghi di nuovo.[n]Gi稲 ne conosci la natura.[n][w][e]
[s][f 4 10 65535 0 0]Il fatto che il mio padrone[n]e io siamo qui di nuovo[n]ne 因 la prova.[n][w][e]

[msg MSG_Discount_100_01 [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0]Sei arrivato...[n]Devo dirti una cosa.[n][w][e]
[s][f 4 10 65535 0 0]Ogni voce del Registro del Prigioniero[n]因 stata riempita con i nomi[n]delle Personae.[n][w][e]
[s][f 4 10 65535 0 0]Il nostro padrone 因 soddisfatto[n]di questi notevoli progressi[n]verso la tua riabilitazione.[n][w][e]
[s][f 4 10 65535 0 0]Ha pertanto concesso di abbassare[n]il costo dell'evocazione[n]al minimo possibile.[n][w][e]

[msg MSG_Discount_100_02 [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0]Ma non pensare che[n]le avrai gratuitamente![n]Il mondo 因 crudele.[n][w][e]
[s][f 4 10 65535 0 0]...Riconosco per韻 i frutti[n]del tuo lavoro.[n]Ben fatto, Prigioniero.[n][w][e]

[msg MSG_Discount_100_03 [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0]Mi stupisco che tu sia stato[n]in grado di ottenere un[n]simile potere.[n][w][e]
[s][f 4 10 65535 0 0]Usa al massimo tale forza[n]per aiutarti nella riabilitazione.[n][w][e]

[msg MSG_Discount_075_01 [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0]Sei arrivato...[n]Devo dirti una cosa.[n][w][e]
[s][f 4 10 65535 0 0]Altri nomi riempiono il Registro,[n]poche righe e l'avrai completato.[n][w][e]
[s][f 4 10 65535 0 0]Il nostro padrone 因 soddisfatto[n]della tua riabilitazione e ti ha[n]concesso un privilegio speciale.[n][w][e]

[msg MSG_Discount_075_02 [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0]Ti faremo uno sconto maggiore[n]quando evochi dal Registro![n]Non male, Prigioniero.[n][w][e]

[msg MSG_Discount_075_03 [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0]Forse sarai in grado di riempire[n]completamente il registro.[n]O persino...[n][w][e]
[s][f 4 10 65535 0 0]Beh, impegnati nella[n]tua riabilitazione.[n][w][e]

[msg MSG_Discount_050_01 [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0]Sei arrivato...[n]Devo dirti una cosa.[n][w][e]
[s][f 4 10 65535 0 0]Le Personae che hai registrato[n]riempiono pi迂 di met稲[n]Registro del Prigioniero.[n][w][e]
[s][f 4 10 65535 0 0]Il nostro padrone 因 soddisfatto[n]della tua riabilitazione e ti ha[n]concesso un privilegio speciale.[n][w][e]

[msg MSG_Discount_050_02 [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0]Ti faremo uno sconto ulteriore[n]quando evochi dal Registro![n]Che ne pensi? Sei soddisfatto?[n][w][e]

[msg MSG_Discount_050_03 [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0]Se aggiungi altri nomi[n]al Registro, il padrone potrebbe[n]concederti ulteriori privilegi.[n][w][e]
[s][f 4 10 65535 0 0]Lavora duro nel completare[n]la tua riabilitazione.[n][w][e]

[msg MSG_Discount_025_01 [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0]Sei arrivato...[n]Devo dirti una cosa.[n][w][e]
[s][f 4 10 65535 0 0]Grazie ai tuoi sforzi giornalieri,[n]il numero di Personae nel Registro[n]del Prigioniero 因 aumentato.[n][w][e]
[s][f 4 10 65535 0 0]Il nostro padrone 因 soddisfatto[n]della tua riabilitazione e ti ha[n]concesso un privilegio speciale.[n][w][e]

[msg MSG_Discount_025_02 [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0]Ti faremo uno sconto sulla[n]evocazione dal Registro del Prigioniero![n]Dimostrati grato, Prigioniero![n][w][e]

[msg MSG_Discount_025_03 [Justine]]
[s][bup 0 101 0 0 0][f 4 10 65535 0 0]Se aggiungi altri nomi[n]al Registro, il padrone potrebbe[n]concederti ulteriori privilegi.[n][w][e]
[s][f 4 10 65535 0 0]Lavora duro nel completare[n]la tua riabilitazione.[n][w][e]

[msg MSG_Discount_Lav_100_01 [Lavenza]]
[s][bup 0 100 4 0 0][f 4 10 65535 0 0]E se...?[n][w][e]
[s][f 4 10 65535 0 0]Ogni pagina del Grimorio[n]delle Personae 因 piena.[n][w][e]
[s][bup 0 100 1 0 0][f 4 10 65535 0 0]Meraviglioso...[n][w][e]
[s][f 4 10 65535 0 0]Come abitante di questa Stanza,[n]因 mio sommo piacere vedere[n]il Grimorio completato.[n][w][e]
[s][f 4 10 65535 0 0]Desidero esprimerti tutto il[n]mio rispetto per i tuoi[n]sforzi, che voglio ricompensare.[n][w][e]
[s][f 4 10 65535 0 0]Applicher韻 il massimo sconto[n]che il mio padrone permette[n]all'evocazione di Personae.[n][w][e]
[s][bup 0 100 0 0 0][f 4 10 65535 0 0]Ti opponi a un dio malefico,[n]ma riuscirai di sicuro a[n]sconfiggerlo con questo potere.[n][w][e]
[s][f 4 10 65535 0 0]A te, che sei il Trickster incarnato,[n]faccio questa richiesta:[n]salva il mondo![n][w][e]

[msg MSG_Discount_Lav_075_01 [Lavenza]]
[s][bup 0 100 0 0 0][f 4 10 65535 0 0]Oh cielo...[n][w][e]
[s][f 4 10 65535 0 0]Solo qualche pagina del Grimorio[n]rimane bianca e vuota ormai.[n][w][e]
[s][f 4 10 65535 0 0]Per mostrarti il rispetto che[n]i tuoi sforzi meritano, concedimi[n]di offrirti una ricompensa.[n][w][e]
[s][f 4 10 65535 0 0]Lo sconto nel ritirare le Personae[n]dal Grimorio sar稲 da adesso[n]ancora maggiore.[n][w][e]
[s][f 4 10 65535 0 0]Forse sarai in grado di[n]riempire questo Grimorio,[n]un giorno.[n][w][e]
[s][f 4 10 65535 0 0]Il tuo nemico 因 quel dio malvagio.[n]Addestra le Personae come vuoi.[n]Non si 因 mai troppo preparati.[n][w][e]
[s][f 4 10 65535 0 0]Ricordatene.[n][w][e]

[msg MSG_Discount_Lav_050_01 [Lavenza]]
[s][bup 0 100 0 0 0][f 4 10 65535 0 0]Oh cielo...[n][w][e]
[s][f 4 10 65535 0 0]A quanto pare ho riempito met稲[n]delle pagine del mio Grimorio[n]delle Personae.[n][w][e]
[s][f 4 10 65535 0 0]Lascia che ti conceda una[n]ricompensa per i tuoi sforzi.[n][w][e]
[s][f 4 10 65535 0 0]Da adesso, lo sconto per ritirare[n]le Personae dal Grimorio[n]sar稲 maggiore.[n][w][e]
[s][f 4 10 65535 0 0]Se registrerai altre[n]Personae nel Grimorio, ti[n]conceder韻 ulteriori benefici.[n][w][e]
[s][f 4 10 65535 0 0]Il tuo nemico 因 quel dio malvagio.[n]Addestra le Personae come vuoi.[n]Non si 因 mai troppo preparati.[n][w][e]
[s][f 4 10 65535 0 0]Ricordatene.[n][w][e]

[msg MSG_Discount_Lav_025_01 [Lavenza]]
[s][bup 0 100 0 0 0][f 4 10 65535 0 0]Oh cielo...[n][w][e]
[s][f 4 10 65535 0 0]Solo ora noto quante Personae[n]sono in questo Grimorio.[n][w][e]
[s][f 4 10 65535 0 0]Lascia che ti conceda una[n]ricompensa per i tuoi sforzi.[n][w][e]
[s][f 4 10 65535 0 0]Da adesso, avrai uno sconto[n]nel ritirare le Personae[n]dal Grimorio.[n][w][e]
[s][f 4 10 65535 0 0]Se registrerai altre[n]Personae nel Grimorio, ti[n]conceder韻 ulteriori benefici.[n][w][e]
[s][f 4 10 65535 0 0]Il tuo nemico 因 quel dio malvagio.[n]Addestra le Personae come vuoi.[n]Non si 因 mai troppo preparati.[n][w][e]
[s][f 4 10 65535 0 0]Ricordatene.[n][w][e]

[msg MSG_Discount_Lav_100_R1 [Lavenza]]
[s][bup 0 100 4 0 0][f 4 10 65535 0 0]E se...?[n][w][e]
[s][f 4 10 65535 0 0]Ogni pagina del Grimorio[n]delle Personae 因 piena.[n][w][e]
[s][bup 0 100 1 0 0][f 4 10 65535 0 0]Meraviglioso...[n][w][e]
[s][f 4 10 65535 0 0]Come abitante di questa Stanza,[n]因 mio sommo piacere vedere[n]il Grimorio completato.[n][w][e]
[s][f 4 10 65535 0 0]Desidero esprimerti tutto il[n]mio rispetto per i tuoi[n]sforzi, che voglio ricompensare.[n][w][e]
[s][f 4 10 65535 0 0]Applicher韻 il massimo sconto[n]che il mio padrone permette[n]all'evocazione di Personae.[n][w][e]
[s][f 4 10 65535 0 0]Non ci sono dubbi. Sei il Trickster[n]pi迂 grande. Sfrutta quel potere per[n]restituirci il nostro vero mondo.[n][w][e]

[msg MSG_Discount_Lav_075_R1 [Lavenza]]
[s][bup 0 100 0 0 0][f 4 10 65535 0 0]Oh cielo...[n][w][e]
[s][f 4 10 65535 0 0]Solo qualche pagina del Grimorio[n]rimane bianca e vuota ormai.[n][w][e]
[s][f 4 10 65535 0 0]Per mostrarti il rispetto che[n]i tuoi sforzi meritano, concedimi[n]di offrirti una ricompensa.[n][w][e]
[s][f 4 10 65535 0 0]Lo sconto nel ritirare le Personae[n]dal Grimorio sar稲 da adesso[n]ancora maggiore.[n][w][e]
[s][f 4 10 65535 0 0]Forse sarai in grado di[n]riempire questo Grimorio,[n]un giorno.[n][w][e]
[s][f 4 10 65535 0 0]Debellare il potere dell'avveramento[n]non sar稲 semplice. Per vincere, devi[n]temprare di pi迂 le tue Personae.[n][w][e]
[s][f 4 10 65535 0 0]Ricordatene.[n][w][e]

[msg MSG_Discount_Lav_050_R1 [Lavenza]]
[s][bup 0 100 0 0 0][f 4 10 65535 0 0]Oh cielo...[n][w][e]
[s][f 4 10 65535 0 0]A quanto pare ho riempito met稲[n]delle pagine del mio Grimorio[n]delle Personae.[n][w][e]
[s][f 4 10 65535 0 0]Lascia che ti conceda una[n]ricompensa per i tuoi sforzi.[n][w][e]
[s][f 4 10 65535 0 0]Da adesso, lo sconto per ritirare[n]le Personae dal Grimorio[n]sar稲 maggiore.[n][w][e]
[s][f 4 10 65535 0 0]Se registrerai altre[n]Personae nel Grimorio, ti[n]conceder韻 ulteriori benefici.[n][w][e]
[s][f 4 10 65535 0 0]Debellare il potere dell'avveramento[n]non sar稲 semplice. Per vincere, devi[n]temprare di pi迂 le tue Personae.[n][w][e]
[s][f 4 10 65535 0 0]Ricordatene.[n][w][e]

[msg MSG_Discount_Lav_025_R1 [Lavenza]]
[s][bup 0 100 0 0 0][f 4 10 65535 0 0]Oh cielo...[n][w][e]
[s][f 4 10 65535 0 0]Solo ora noto quante Personae[n]sono in questo Grimorio.[n][w][e]
[s][f 4 10 65535 0 0]Lascia che ti conceda una[n]ricompensa per i tuoi sforzi.[n][w][e]
[s][f 4 10 65535 0 0]Da adesso, avrai uno sconto[n]nel ritirare le Personae[n]dal Grimorio.[n][w][e]
[s][f 4 10 65535 0 0]Se registrerai altre[n]Personae nel Grimorio, ti[n]conceder韻 ulteriori benefici.[n][w][e]
[s][f 4 10 65535 0 0]Debellare il potere dell'avveramento[n]non sar稲 semplice. Per vincere, devi[n]temprare di pi迂 le tue Personae.[n][w][e]
[s][f 4 10 65535 0 0]Ricordatene.[n][w][e]

[msg MSG_DLC_CHALLENGE_BATTLE [Caroline]]
[s][bup 0 102 0 0 0][f 4 10 65535 0 0]Vuoi cimentarti in una battaglia[n]di prova?[n][w][e]

[sel MSG_DLC_CHALLENGE_BATTLE_2 top]
[s]S淫[e]
[s]No[e]

[msg MSG_TOKUSEI_TutorialEnd [Igor]]
[s][bup 0 201 0 0 0][f 4 10 65535 0 0]Familiarizza con le molteplici[n]sfaccettature del cuore che[n]albergano in te.[n][w][e]
[s]Farlo ti sospinger稲 pi迂 in alto che[n]mai e ti dar稲 forza mentre[n]procedi verso la tua riabilitazione.[n][w][e]
[s]Ora va'. Mi aspetto molto da te.[n][w][e]

