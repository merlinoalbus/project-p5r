[msg Dummy]
[s]......[n][w][e]

[msg EV_MOVE_57_11_MENU]
[s]>何処に移動しますか?[n][w][e]

[sel EV_MOVE_57_11_SEL top]
[s]5F:ボス前カジノに行く[e]
[s]4F:ボス前カジノに行く[e]
[s]2F:VIP用カジノに行く[e]
[s]1F:一般用カジノに行く[e]
[s]行かない[e]

[msg EV_MOVE_57_11_IPPAN]
[s]>一般用カジノへ移動[n][w][e]

[msg EV_MOVE_57_11_VIP]
[s]>VIP用カジノへ移動[n][w][e]

[msg EV_MOVE_57_11_BOSS]
[s]>ボス前カジノに移動[n][w][e]

[msg EV_MOVE_57_11_BOSS_BATTL]
[s]>ボス戦に移動[n][w][e]

[msg EV_MOVE_57_11_CAN]
[s]>乗るのを止めた[n][w][e]

[msg EV_57_011_SETUMEI]
[s]●やる事説明[n]左側にある扉からルーレットルームへ向かい、[n]ギミックをクリアする事でコインを20万枚入手。[n][w][e]
[s]エレベーターに『ボス前』が追加されます。[n][w][e]

[msg EV_57_011_Balancer]
[s]La bilancia si abbasser稲 per[n]10 milioni di monete.[n][w][e]

[msg D157_011_miniEV_01_mes01 [Ann]]
[s][bup 0 4 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 6165 65535 0]Queste sono le regole? Uhm...[n]"Oscura Dimora"?[n][w][e]

[msg D157_011_miniEV_01_mes02 [Makoto]]
[s][bup 0 6 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Vediamo che dice.[n][w][e]
[s][f 4 10 65535 0 0][f 4 25 1 65535 0 0]"L'obiettivo del gioco 因 fuggire[n]da un labirinto immerso nel buio".[n][w][e]
[s][f 4 10 65535 0 0][f 4 25 1 65535 0 0]"為 possibile smettere in qualsiasi[n]istante e ricominciare. Il gioco[n]termina al traguardo".[n][w][e]

[msg D157_011_miniEV_01_mes03 [Ryuji]]
[s][bup 0 2 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 7177 65535 0]Tutto qui? Non dice niente,[n]solo che c'因 un labirinto[n]e che si sta al buio.[n][w][e]

[msg D157_011_miniEV_01_mes04 [Akechi]]
[s][bup 0 9 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Per scoprire di che si tratta,[n]dovremo entrare e vederlo[n]con i nostri occhi.[n][w][e]

[msg D157_011_miniEV_02_mes01 [Haru]]
[s][bup 0 7 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 3180 65535 0]Oh, queste sono le regole[n]per l'"Arena combattimenti".[n][w][e]

[msg D157_011_miniEV_02_mes02 [Yusuke]]
[s][bup 0 5 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Le leggo a voce alta.[n][w][e]
[s][f 4 10 65535 0 0][f 4 25 1 65535 0 0]"Una serie di duelli in cui si[n]pu韻 contare solo sulla[n]propria abilit稲."[n][w][e]
[s][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Ecco.[n][w][e]

[msg D157_011_miniEV_02_mes03 [Futaba]]
[s][bup 0 8 101 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0][vp 8 2 1 9191 65535 0]為 come il "Nuovo sfidante"[n]di Super Bash Bros![n]Si combatte con chi si presenta![n][w][e]

[msg D157_011_miniEV_02_mes04 [Makoto]]
[s][bup 0 6 100 0 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Suppongo che un processo sia[n]come una battaglia. Ma questa[n]dovrebbe essere pi迂 piacevole.[n][w][e]

[msg D157_011_miniEV_02_mes05 [Morgana]]
[s][bup 0 3 2 65535 0][f 4 10 65535 0 0][f 4 25 1 65535 0 0]Mmm, chiss稲 cosa ci[n]aspetta qui dentro. Quando siete[n]pronti diamo un'occhiata.[n][w][e]

[msg EV_57_011_SAFE_EVENT]
[s]セーフルーム仮処理[n][w][e]
[s]話し合いの結果[n][w][e]
[s][clr 4]女検事の裁判を傍聴する事で[n]認められるのではないか。という流れになる。[clr 27][n][w][e]
[s][clr 4]現実に戻り、膨張することで[n]賭け事を行う事が出来る。[clr 27][n][w][e]

[sel EV_57_011_DEBUG top]
[s]フラグを立てる[e]
[s]立てない[e]

