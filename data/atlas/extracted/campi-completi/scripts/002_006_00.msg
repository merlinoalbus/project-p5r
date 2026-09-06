[msg DUMMY_MSG]
[s]......[n][w][e]

[msg MSG_LAST_GREETING_place [Morgana]]
[s][bup 0 3 0 0 0][f 4 10 65535 0 0][vp 8 2 1 1171 65535 0]Al momento non hai niente da fare[n]qui, giusto? Su, andiamo[n]da un'altra parte![n][w][e]

[msg MSG_LAST_GREETING_etc [Morgana]]
[s][bup 0 3 0 0 0][f 4 10 65535 0 0][vp 8 2 1 1171 65535 0]Che ti prende? Forza,[n]dobbiamo salutare gli altri![n][w][e]

[msg MSG_Desk_Convini_NOWcast [Morgana]]
[s][bup 0 3 0 0 0][f 4 10 65535 0 0][vp 8 2 1 1184 65535 0]Ci sono un sacco di snack qui...[n]Stanno per fare una festa?[n][w][e]
[s][f 4 10 65535 0 0][vp 1 0 0 0 0 0]Oh, dovremmo farne noi una[n]a missione completata![n][w][e]

[msg MSG_Desk_Convini_EndCast [Morgana]]
[s][bup 0 3 0 0 0][f 4 10 65535 0 0][vp 8 2 1 1168 65535 0]Ci sono un sacco di snack qui...[n]Mi fa quasi venir voglia di[n]tornare a quel sontuoso buffet.[n][w][e]

[msg MND_DESK_CONVENI]
[s][vp 1 0 0 0 0 0]Ci sono un mucchio di snack[n]in questo sacchetto...[n][w][e]

[msg MSG_SportBug [Morgana]]
[s][bup 0 3 3 0 0][f 4 10 65535 0 0][vp 8 2 1 1170 65535 0]Wow, quelle scarpe sono proprio[n]rovinate... Cosa vi fanno fare durante[n]gli allenamenti, qui?[n][w][e]

[msg MND_DESK_SPORTBAG]
[s][vp 1 0 0 0 0 0]C'因 un paio di scarpe da atletica[n]consumate dentro. Sembra abbiano[n]corso un bel po' di chilometri...[n][w][e]

[msg MSG_BLACKBOARD_KFEVT_Maf [Morgana]]
[s][bup 0 3 0 0 0][f 4 10 65535 0 0][vp 8 2 1 1172 65535 0]Ti preoccuperai della lavagna[n]dopo. Ora non c'因 tempo.[n][w][e]

[msg MND_BLACKBOARD_NotOpen]
[s][vp 1 0 0 0 0 0]La lavagna 因 cos淫 pulita...[n][w][e]

[msg MSG_BLACKBOARD_NotOpen [Morgana]]
[s][bup 0 3 11 0 0][f 4 10 65535 0 0][vp 8 2 1 1191 65535 0]Ehi, hai mai sentito il suono[n]delle unghie sulla lavagna?[n][w][e]

[msg MSG_BLACKBOARD [Morgana]]
[s][bup 0 3 0 0 0][f 4 10 65535 0 0][vp 8 2 1 1164 65535 0]Questa 因 la lavagna che[n]usate per le lezioni, giusto?[n][w][e]
[s][f 4 10 65535 0 0][vp 1 0 0 0 0 0]Perch姻 non provi a disegnare il[n]logo dei Ladri Fantasma? Scommetto[n]che verr稲 benissimo![n][w][e]

[sel SEL_BLACKBOARD top]
[s]Ci penso io.[e]
[s]Sembra difficile...[e]

[msg MSG_BLACKBOARD_After [Morgana]]
[s][bup 0 3 0 0 0][f 4 10 65535 0 0][vp 8 2 1 1167 65535 0]Vuoi provare a disegnare[n]il logo dei Ladri Fantasma?[n][w][e]

[sel SEL_BLACKBOARD_After top]
[s]Ci prover韻.[e]
[s]Nah.[e]

[msg MSG_BLACKBOARD_CANCEL [Morgana]]
[s][bup 0 3 3 0 0][f 4 10 65535 0 0][vp 8 2 1 1177 65535 0]Oh, che peccato... Speravo di[n]vederti almeno provare.[n][w][e]

[msg MSG_BLACKBOARD_OK [Morgana]]
[s][bup 0 3 1 0 0][f 4 10 65535 0 0][vp 8 2 1 1181 65535 0]為 questo lo spirito giusto![n][w][e]

[msg MSG_BLACKBOARD_WRITE [Morgana]]
[s][bup 0 3 0 0 0][f 4 10 65535 0 0][vp 1 0 0 0 0 0]Questo 因 un ottimo modo per capire[n]come reagisce la gente. Prova[n]a disegnarlo ancora in futuro.[n][w][e]
[s][f 4 10 65535 0 0][vp 1 0 0 0 0 0]Per ora per韻 cancelliamolo.[n][w][e]

[msg MSG_BLACKBOARD_WRITE_Aft [Morgana]]
[s][bup 0 3 0 0 0][f 4 10 65535 0 0][vp 1 0 0 0 0 0]OK, assicurati che non ne[n]rimanga traccia.[n][w][e]

[msg MSG_BLACKBOARD_Student_0 [Studenti]]
[s][vp 1 0 0 0 0 0]...Che roba 因?[n][w][e]
[s][vp 1 0 0 0 0 0]Sar稲 uno scherzo di quei[n]"ladri fantasma"...[n][w][e]
[s][vp 1 0 0 0 0 0]L'ha disegnato lui?[n]Su chi vuole fare colpo?[n][w][e]
[s][vp 1 0 0 0 0 0]Aspetta, crede davvero[n]che esistano? Che vergogna...[n][w][e]

[msg MSG_BLACKBOARD_Student_0_2 [Studenti]]
[s][vp 1 0 0 0 0 0]為 il logo dei Ladri Fantasma...[n][w][e]
[s][vp 1 0 0 0 0 0]Credevo fossero una farsa, ma[n]forse esistono davvero...[n][w][e]
[s][vp 1 0 0 0 0 0]Alla fine quel logo 因[n]piuttosto figo. L'ha disegnato lui?[n][w][e]
[s][vp 1 0 0 0 0 0]為 un loro fan?[n]Non me lo sarei mai aspettato[n]da un tipo come lui...[n][w][e]

[msg MSG_BLACKBOARD_Student_0_3 [Studenti]]
[s][vp 1 0 0 0 0 0]Wow, 因 il logo dei Ladri Fantasma![n][w][e]
[s][vp 1 0 0 0 0 0]L'avevo visto anche a Shibuya![n]為 proprio figo.[n][w][e]
[s][vp 1 0 0 0 0 0]Spero che non si fermino. Faccio[n]il tifo per loro da sempre![n][w][e]
[s][vp 1 0 0 0 0 0]Non sono incredibili? Ho sentito[n]che stanno davvero facendo strada.[n][w][e]
[s][vp 1 0 0 0 0 0]A proposito, questo disegno[n]因 molto bello.[n][lName] 因 un Phanboy?[n][w][e]

[msg MSG_BLACKBOARD_Student_0_4 [Studenti]]
[s][vp 1 0 0 0 0 0]Oooh, 因 il logo dei Ladri Fantasma![n][w][e]
[s][vp 1 0 0 0 0 0]Lo vedo ovunque di recente.[n]Vorrei poter comprare del[n]merchandise dei Ladri Fantasma![n][w][e]
[s][vp 1 0 0 0 0 0]Solo guardare il loro logo[n]mi fa sentire pi迂 coraggioso.[n]Quei ragazzi sono incredibili![n][w][e]
[s][vp 1 0 0 0 0 0]Ma che figata![n]Devo fare una foto![n][w][e]
[s][vp 1 0 0 0 0 0]L'ha disegnato [lName], vero?[n]為 il miglior disegno[n]che abbia mai visto.[n][w][e]
[s][vp 1 0 0 0 0 0]Sento l'adrenalina scorrermi[n]in corpo! Ottimo lavoro,[n][lName]![n][w][e]

[msg MSG_BLACKBOARD_Student_0_5 [Studenti]]
[s][vp 1 0 0 0 0 0]Eccolo! I Ladri Fantasma![n][w][e]
[s][vp 1 0 0 0 0 0]為 assolutamente perfetto.[n][w][e]
[s][vp 1 0 0 0 0 0]Anche [lName] fa parte del Phandom?[n]Fantastico![n][w][e]
[s][vp 1 0 0 0 0 0]Fa sembrare i Ladri Fantasma[n]delle specie di divinit稲.[n]Combattono per tutti noi![n][w][e]
[s][vp 1 0 0 0 0 0]Vorrei vederli all'opera[n]pi迂 spesso, per韻. Non vedo l'ora![n][w][e]
[s][vp 1 0 0 0 0 0]Dovrebbero darsi una mossa e[n]occuparsi di quel dirigente![n]Basta perdere tempo![n][w][e]
[s][vp 1 0 0 0 0 0]Ladri Fantasma! Ladri Fantasma![n][w][e]

[msg MSG_BLACKBOARD_Student_0_6 [Studenti]]
[s][vp 1 0 0 0 0 0]Ah, i Ladri Fantasma...[n][w][e]
[s][vp 1 0 0 0 0 0]Il presidente Okumura 因 morto per[n]colpa dei Ladri Fantasma, vero?[n][w][e]
[s][vp 1 0 0 0 0 0]Ho sentito che le cose strane[n]che accadono sono opera loro...[n]Ci hanno fregati per bene, eh...[n][w][e]
[s][vp 1 0 0 0 0 0]Ma quello non li guarda[n]i notiziari? Ecco come distruggere[n]il morale...[n][w][e]

[msg MSG_BLACKBOARD_Student_0_7 [Studenti]]
[s][vp 1 0 0 0 0 0]Ugh... Che ci fa questo qui?[n][w][e]
[s][vp 1 0 0 0 0 0]Anche fosse uno scherzo,[n]non voglio vederlo.[n]為 un cazzo di logo terrorista.[n][w][e]
[s][vp 1 0 0 0 0 0]Mi sento male... Che [lName][n]sia DAVVERO pericoloso?[n][w][e]

[msg MSG_BLACKBOARD_Student_0_8 [Studenti]]
[s][vp 1 0 0 0 0 0]Ma che diavolo...[n][w][e]
[s][vp 1 0 0 0 0 0]為 ancora fissato[n]coi Ladri Fantasma?[n][w][e]
[s][vp 1 0 0 0 0 0]Che idiota senza speranza... Vive[n]in un mondo di sogni.[n][w][e]

[msg MSG_BLACKBOARD_Student_0_9 [Studenti]]
[s][vp 1 0 0 0 0 0]Oh, s淫. Sono stati popolari[n]un po'...[n][w][e]
[s][vp 1 0 0 0 0 0]Diamine, questo artista deve proprio[n]adorare i Ladri, eh? Per韻[n]il disegno 因 troppo grande...[n][w][e]
[s][vp 1 0 0 0 0 0]Oh, mi ricordo questo logo![n]I Banditi, giusto? ...Anzi, no,[n]aspetta, com'因 che si chiamavano?[n][w][e]
[s][vp 1 0 0 0 0 0]Chiss稲 cosa stanno facendo adesso.[n]Comunque, ieri...[n][w][e]

[msg MSG_BLACKBOARD_Student_P [Studenti]]
[s][vp 1 0 0 0 0 0]Ehi, perch姻 disegna questa roba?[n]為 coraggioso oppure solo stupido?[n][w][e]
[s][f 4 22 65535 1 41][vp 1 0 0 0 0 0]Ora che ci penso, non 因 quel[n]tizio losco? Ne ha di fegato...[n][w][e]

[msg MSG_BlackBoard_Think01 [Morgana]]
[s][bup 0 3 3 0 0][f 4 10 65535 0 0][vp 8 2 1 1025 65535 0]Pensano che siamo una specie di[n]scherzo... Non credono nemmeno[n]che esistiamo...[n][w][e]

[msg MSG_BlackBoard_Think02 [Morgana]]
[s][bup 0 3 1 0 0][f 4 10 65535 0 0][vp 8 2 1 1183 65535 0]Il nostro nome comincia a[n]essere riconosciuto. Chiss稲[n]cosa accadr稲 ora![n][w][e]

[msg MSG_BlackBoard_Think03 [Morgana]]
[s][bup 0 3 1 0 0][f 4 10 65535 0 0][vp 8 2 1 1183 65535 0]Credo che la nostra fama stia[n]crescendo! Stiamo diventando[n]famosi![n][w][e]

[msg MSG_BlackBoard_Think04 [Morgana]]
[s][bup 0 3 1 0 0][f 4 10 65535 0 0][vp 8 2 1 1184 65535 0]La nostra fama 因 alle stelle![n]Non ci fermiamo![n][w][e]

[msg MSG_BlackBoard_Think05 [Morgana]]
[s][bup 0 3 4 0 0][f 4 10 65535 0 0][vp 8 2 1 1170 65535 0]Non pensavo che avremmo raggiunto[n]tale fama... 為 fantasmagorico![n]Capito? Fantasma-gorico...[n][w][e]

[msg MSG_BlackBoard_Think06 [Morgana]]
[s][bup 0 3 3 0 0][f 4 10 65535 0 0][vp 8 2 1 1044 65535 0]Ci trattano come se fossimo[n]noi i cattivi... Dannazione...[n][w][e]

[msg MSG_BlackBoard_Think07 [Morgana]]
[s][bup 0 3 5 0 0][f 4 10 65535 0 0][vp 8 2 1 1178 65535 0]Ci odiano davvero...[n]Non ce la faccio pi迂...[n][w][e]

[msg MSG_BlackBoard_Think08 [Morgana]]
[s][bup 0 3 2 0 0][f 4 10 65535 0 0][vp 8 2 1 1027 65535 0]Non stanno reagendo bene...[n]C'因 qualcosa che non va...[n][w][e]

[msg MSG_BlackBoard_Think09 [Morgana]]
[s][bup 0 3 3 0 0][f 4 10 65535 0 0][vp 8 2 1 1044 65535 0]Non sembrano molto interessati...[n]Ma immagino sia inevitabile,[n]visto lo stato delle cose.[n][w][e]

[msg MSG_BackBlackBoard_Think [Morgana]]
[s][bup 0 3 4 0 0][f 4 10 65535 0 0][vp 8 2 1 1182 65535 0]Ehi, e questo sarebbe il logo[n]dei Ladri Fantasma?[n][w][e]
[s][bup 0 3 3 0 0][f 4 10 65535 0 0][vp 1 0 0 0 0 0]Sembra stupido...[n][w][e]

[msg MSG_BackBlackBoard_Think_2 [Morgana]]
[s][bup 0 3 0 0 0][f 4 10 65535 0 0][vp 8 2 1 1175 65535 0]Wow, sembra proprio[n]Madarame. Immagino che tutti[n]abbiano visto la conferenza.[n][w][e]

[msg MSG_BackBlackBoard_Think_3 [Morgana]]
[s][bup 0 3 4 0 0][f 4 10 65535 0 0][vp 8 2 1 1178 65535 0]Qui sono tutti con[n]Akechi. L'hanno anche[n]reso pi迂 appariscente...[n][w][e]

[msg MSG_BackBlackBoard_Think_4 [Morgana]]
[s][bup 0 3 0 0 0][f 4 10 65535 0 0][vp 8 2 1 1181 65535 0]La gente comincia a darci[n]supporto! Il logo per韻[n]non 因 granch姻...[n][w][e]

[msg MSG_BackBlackBoard_Think_5 [Morgana]]
[s][bup 0 3 2 0 0][f 4 10 65535 0 0][vp 8 2 1 1165 65535 0]Si respira un'aria davvero[n]elettrizzante. Dobbiamo fare[n]qualcosa, non credi?[n][w][e]

[msg MSG_BackBlackBoard_Think_6 [Morgana]]
[s][bup 0 3 0 0 0][f 4 10 65535 0 0][vp 8 2 1 1181 65535 0]Siamo diventati davvero famosi![n]La gente non vede l'ora[n]della nostra prossima mossa.[n][w][e]

[msg MSG_BackBlackBoard_Think_7 [Morgana]]
[s][bup 0 3 4 0 0][f 4 10 65535 0 0][vp 8 2 1 1163 65535 0]La gente vuole che ci occupiamo[n]di Okumura... Non senti il peso[n]delle aspettative?[n][w][e]

[msg MSG_BackBlackBoard_Think_8 [Morgana]]
[s][bup 0 3 2 0 0][f 4 10 65535 0 0][vp 8 2 1 1178 65535 0]La gente dice che Akechi aveva[n]ragione sul nostro conto. Dobbiamo[n]dimostrare che siamo innocenti.[n][w][e]

[msg MSG_BackBlackBoard_Think_9 [Morgana]]
[s][bup 0 3 2 0 0][f 4 10 65535 0 0][vp 8 2 1 1037 65535 0]Non possiamo lasciare che la gente[n]si prenda gioco di noi cos淫![n][w][e]

[msg MSG_BackBlackBoard_Think_10 [Morgana]]
[s][bup 0 3 2 0 0][f 4 10 65535 0 0][vp 8 2 1 1038 65535 0]Ci trattano ancora come[n]feccia... Ehi, e[n]quello chi dovrebbe essere?[n][w][e]

[msg MSG_BackBlackBoard_Think_11 [Morgana]]
[s][bup 0 3 2 0 0][f 4 10 65535 0 0][vp 8 2 1 1028 65535 0]Sanno tutti cosa sta nascondendo[n]Shido, no? Eppure 因 sul punto di[n]diventare primo ministro...[n][w][e]
[s][f 4 10 65535 0 0][vp 1 0 0 0 0 0]C'因 qualcosa che non va...[n][w][e]

[msg MSG_BackBlackBoard_Think_12 [Morgana]]
[s][bup 0 3 2 0 0][f 4 10 65535 0 0][vp 8 2 1 1189 65535 0]Non pensi che le classe emani[n]un'aura diversa? Forse 因 colpa[n]del potere di Maruki...[n][w][e]

[msg MND_BackCRBoard_Start]
[s][vp 1 0 0 0 0 0]Il programma di questo mese[n]因 scritto sulla lavagna...[n][w][e]

[msg MND_BackCRBoard_04]
[s][vp 1 0 0 0 0 0]Dice che il torneo di pallavolo si[n]terr稲 il 13 aprile.[n][w][e]

[msg MND_BackCRBoard_05]
[s][vp 1 0 0 0 0 0]Dice che gli esami[n]intermedi si terranno[n]dall'11 al 14 maggio.[n][w][e]

[msg MND_BackCRBoard_15]
[s][vp 1 0 0 0 0 0]Dice che gli esami[n]intermedi si terranno[n]dall'11 al 14 maggio.[n][w][e]
[s][vp 1 0 0 0 0 0]Le grandi pulizie si terranno[n]il 30 maggio... credo.[n][w][e]

[msg MND_BackCRBoard_16]
[s][vp 1 0 0 0 0 0]Dice che gli esami[n]intermedi si terranno[n]dall'11 al 14 maggio.[n][w][e]
[s][vp 1 0 0 0 0 0]Le grandi pulizie si terranno[n]il 30 maggio... credo.[n][w][e]

[msg MND_BackCRBoard_06]
[s][vp 1 0 0 0 0 0]Dice che la visita guidata si[n]terr稲 dal 9 al 10 giugno.[n][w][e]

[msg MND_BackCRBoard_07]
[s][vp 1 0 0 0 0 0]Dice che gli esami di fine[n]primo quadrimestre si terranno[n]dal 13 al 16 luglio.[n][w][e]

[msg MND_BackCRBoard_09]
[s][vp 1 0 0 0 0 0]Dice che la gita scolastica si[n]terr稲 dal 7 all'11 settembre.[n][w][e]

[msg MND_BackCRBoard_10]
[s][vp 1 0 0 0 0 0]Dice che gli esami intermedi[n]si terranno dal 17 al 20 ottobre.[n][w][e]

[msg MND_BackCRBoard_11]
[s][vp 1 0 0 0 0 0]Non ci sono eventi speciali[n]in programma questo mese...[n][w][e]

[msg MND_BackCRBoard_12]
[s][vp 1 0 0 0 0 0]Dice che gli esami di fine secondo[n]quadrimestre si terranno[n]dal 20 al 22 dicembre.[n][w][e]

[msg MND_BackCRBoard_13]
[s][vp 1 0 0 0 0 0]Non ci sono eventi particolari[n]in programma...[n][w][e]

[msg MND_BackCRBoard_14]
[s][vp 1 0 0 0 0 0]Dice che gli esami finali dell'ultimo[n]quadrimestre si terranno[n]dal 6 al 9 febbraio.[n][w][e]

[msg MND_KFEVT_COMMON_NG]
[s][vp 1 0 0 0 0 0]Per ora non devo fare[n]niente in particolare qui...[n][w][e]

[msg MSG_E24320100_000_00 [Morgana]]
[s][bup 0 3 0 0 0][f 4 10 65535 0 0][vp 8 2 65535 1156 0 0]Un momento, dovremmo seguire il[n]piano. Come sta andando a Lady Ann?[n][w][e]

