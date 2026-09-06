[sel START_CHECK_SEL top]
[s]Andiamo![e]
[s]Forse pi迂 tardi.[e]

[msg START_CHECK_mes01 [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Il bersaglio 因 pi迂 avanti.[n]Che facciamo, Joker?[n][w][e]

[msg START_OK_mes01 [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Va bene. Preparatevi![n][w][e]

[msg START_NG_mes01 [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Va bene.[n][w][e]

[msg QUEST_FLOOR_BACK_mes01 [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Vuoi tornare indietro?[n][w][e]

[msg QUEST_FLOOR_BACK_mes02 [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Vuoi andare via, Joker?[n][w][e]

[sel QUEST_FLOOR_BACK_SEL top]
[s]Andiamo via[e]
[s]Annulla[e]

[sel QUEST_EXIT_SEL top]
[s]Proseguiamo.[e]
[s]Torniamo all'ingresso.[e]

[msg DUNGEON_EXIT_01_PC02_mes [Ryuji]]
[s][bup 0 2 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 7045 65535 0]Beh, a posto. E adesso?[n]Vuoi continuare a esplorare?[n][w][e]

[msg DUNGEON_EXIT_01_PC03_mes [Morgana]]
[s][bup 0 3 1 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 1172 65535 0]為 fatta![n]Ora che si fa?[n]Continuiamo a esplorare?[n][w][e]

[msg DUNGEON_EXIT_01_PC04_mes [Ann]]
[s][bup 0 4 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 6019 65535 0]為 andata bene! Adesso che[n]si fa? Esploriamo ancora?[n][w][e]

[msg DUNGEON_EXIT_01_PC05_mes [Yusuke]]
[s][bup 0 5 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 4087 65535 0]Un'incredibile capacit稲 di[n]comando... Bene, e adesso?[n]Vuoi continuare a esplorare?[n][w][e]

[msg DUNGEON_EXIT_01_PC06_mes [Makoto]]
[s][bup 0 6 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 2045 65535 0]Un altro caso risolto. E adesso?[n]Proseguiamo l'esplorazione?[n][w][e]

[msg DUNGEON_EXIT_01_PC07_mes [Futaba]]
[s][bup 0 8 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 9196 65535 0]Ben fatto. La battaglia 因 andata [n]bene! Qual 因 la prossima mossa?[n]Esploriamo ancora?[n][w][e]

[msg DUNGEON_EXIT_01_PC08_mes [Haru]]
[s][bup 0 7 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 3048 65535 0]Sono felice che sia andata bene![n]Per韻 che si fa adesso?[n]Vuoi continuare a esplorare?[n][w][e]

[msg DUNGEON_EXIT_01_PC09_mes [Akechi]]
[s][bup 0 9 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 8162 65535 0]Non mi aspettavo niente di meno[n]dai Ladri Fantasma. Che si fa ora?[n]Vuoi continuare a esplorare?[n][w][e]

[msg DUNGEON_EXIT_01_PC10_mes [[sumi 10 0]]]
[s][bup 0 10 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Ottimo lavoro! Continuiamo[n]a esplorare?[n][w][e]

[msg D_EXIT_OK_01_PC02_mes [Ryuji]]
[s][bup 0 2 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Torniamo indietro?[n][w][e]

[msg D_EXIT_OK_01_PC03_mes [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Ricevuto.[n][w][e]

[msg D_EXIT_OK_01_PC04_mes [Ann]]
[s][bup 0 4 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Bene, andiamo.[n][w][e]

[msg D_EXIT_OK_01_PC05_mes [Yusuke]]
[s][bup 0 5 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Mmm, capisco.[n][w][e]

[msg D_EXIT_OK_01_PC06_mes [Makoto]]
[s][bup 0 6 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Ci riorganizziamo. Capito.[n][w][e]

[msg D_EXIT_OK_01_PC07_mes [Futaba]]
[s][bup 0 8 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Ah, ci si riorganizza?[n][w][e]

[msg D_EXIT_OK_01_PC08_mes [Haru]]
[s][bup 0 7 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]OK. Dopotutto, 因 stato stancante.[n][w][e]

[msg D_EXIT_OK_01_PC09_mes [Akechi]]
[s][bup 0 9 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Per oggi ci fermiamo qui?[n][w][e]

[msg D_EXIT_OK_01_PC10_mes [[sumi 10 0]]]
[s][bup 0 10 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Va bene, riorganizziamoci.[n][w][e]

[msg D_EXIT_OK_02_PC02_mes [Ryuji]]
[s][bup 0 2 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]OK, torniamo indietro.[n][w][e]

[msg D_EXIT_OK_02_PC03_mes [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Mmm, 因 un buon momento[n]per andare via.[n][w][e]

[msg D_EXIT_OK_02_PC04_mes [Ann]]
[s][bup 0 4 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Riorganizziamoci.[n][w][e]

[msg D_EXIT_OK_02_PC05_mes [Yusuke]]
[s][bup 0 5 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Mmm, scelta saggia.[n][w][e]

[msg D_EXIT_OK_02_PC06_mes [Makoto]]
[s][bup 0 6 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Andiamo, allora.[n][w][e]

[msg D_EXIT_OK_02_PC07_mes [Futaba]]
[s][bup 0 8 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Si torna![n][w][e]

[msg D_EXIT_OK_02_PC08_mes [Haru]]
[s][bup 0 7 104 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Ah, stiamo andando via?[n][w][e]

[msg D_EXIT_OK_02_PC09_mes [Akechi]]
[s][bup 0 9 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Va bene.[n][w][e]

[msg D_EXIT_OK_02_PC10_mes [[sumi 10 0]]]
[s][bup 0 10 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Certo, torniamo indietro.[n][w][e]

[msg D_EXIT_OK_03_PC02_mes [Ryuji]]
[s][bup 0 2 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]OK, andiamo.[n][w][e]

[msg D_EXIT_OK_03_PC03_mes [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Certo. 為 importante sapere[n]quando ritirarsi.[n][w][e]

[msg D_EXIT_OK_03_PC04_mes [Ann]]
[s][bup 0 4 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]OK, andiamo![n][w][e]

[msg D_EXIT_OK_03_PC05_mes [Yusuke]]
[s][bup 0 5 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Incamminiamoci.[n][w][e]

[msg D_EXIT_OK_03_PC06_mes [Makoto]]
[s][bup 0 6 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Ricevuto.[n][w][e]

[msg D_EXIT_OK_03_PC07_mes [Futaba]]
[s][bup 0 8 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]OK, andiamo via![n][w][e]

[msg D_EXIT_OK_03_PC08_mes [Haru]]
[s][bup 0 7 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Fai strada.[n][w][e]

[msg D_EXIT_OK_03_PC09_mes [Akechi]]
[s][bup 0 9 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Sembra un buon momento[n]per fermarsi.[n][w][e]

[msg D_EXIT_OK_03_PC10_mes [[sumi 10 0]]]
[s][bup 0 10 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Ricevuto. Andiamo![n][w][e]

[msg D_EXIT_GOTO_SAFE_PC02_me [Ryuji]]
[s][bup 0 2 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Dovremmo discutere di[n]una strategia, no?[n][w][e]

[msg D_EXIT_GOTO_SAFE_PC03_me [Morgana]]
[s][bup 0 3 2 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Capito. Aspettiamo.[n][w][e]

[msg D_EXIT_GOTO_SAFE_PC04_me [Ann]]
[s][bup 0 4 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]OK. Dovremmo tenere una[n]riunione strategica.[n][w][e]

[msg D_EXIT_GOTO_SAFE_PC05_me [Yusuke]]
[s][bup 0 5 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]S淫, prima esaminiamo le[n]opzioni a nostra disposizione.[n][w][e]

[msg D_EXIT_GOTO_SAFE_PC06_me [Makoto]]
[s][bup 0 6 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]S淫, ripassiamo la nostra strategia.[n]Quando vuoi, Mona.[n][w][e]

[msg D_EXIT_GOTO_SAFE_PC07_me [Futaba]]
[s][bup 0 8 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Benissimo. Prego, Mona.[n][w][e]

[msg D_EXIT_GOTO_SAFE_PC08_me [Haru]]
[s][bup 0 7 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]OK. Facciamo una pausa.[n][w][e]

[msg D_EXIT_GOTO_SAFE_PC09_me [Akechi]]
[s][bup 0 9 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Potrebbe essere la cosa migliore.[n]Conto su di te.[n][w][e]

[msg D_EXIT_GOTO_SAFE_PC10_me [[sumi 10 0]]]
[s][bup 0 10 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Pausa? Va bene.[n][w][e]

[msg D_EXIT_CANCEL_PC02_mes [Ryuji]]
[s][bup 0 2 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]OK. Pronto a entrare in azione.[n][w][e]

[msg D_EXIT_CANCEL_PC03_mes [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Certo. Possiamo guadagnare ancora.[n][w][e]

[msg D_EXIT_CANCEL_PC04_mes [Ann]]
[s][bup 0 4 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]S淫, proseguiamo ancora[n]un altro po'.[n][w][e]

[msg D_EXIT_CANCEL_PC05_mes [Yusuke]]
[s][bup 0 5 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Va bene. Devono esserci[n]altri posti da esplorare.[n][w][e]

[msg D_EXIT_CANCEL_PC06_mes [Makoto]]
[s][bup 0 6 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Bene. Posso continuare.[n][w][e]

[msg D_EXIT_CANCEL_PC07_mes [Futaba]]
[s][bup 0 8 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Ricevuto. Verr韻 con te![n][w][e]

[msg D_EXIT_CANCEL_PC08_mes [Haru]]
[s][bup 0 7 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Certo, posso continuare![n][w][e]

[msg D_EXIT_CANCEL_PC09_mes [Akechi]]
[s][bup 0 9 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Capisco. Ti accompagner韻.[n][w][e]

[msg D_EXIT_CANCEL_PC10_mes [[sumi 10 0]]]
[s][bup 0 10 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]D'accordo, proseguiamo![n][w][e]

[msg D_AREA0_TARGET_MORE_mes [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Quanti bersagli ci sono ancora[n]in quest'area? [clr 2][var 0][clr 27]? D'accordo,[n]qual 因 la prossima mossa, Joker?[n][w][e]

[msg D_AREA0_TARGET_NONE_mes [Morgana]]
[s][bup 0 3 0 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Non ci sono altri bersagli in[n]quest'area. Qual 因 la nostra[n]prossima mossa, Joker?[n][w][e]

