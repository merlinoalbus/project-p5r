# G-021 · Negoziazione di P5R — dettaglio del confronto (allegato del registro)

Fonte di riferimento: raccolta di **joyce-chen**, foglio **Royal** `data/persona-5-royal-questions.xlsx`
(https://github.com/joyce-chen/persona5-negotiation, pagina https://joyce-chen.github.io/persona5-negotiation/royal):
277 domande × 3 risposte × 4 personalità. Il file dell'app (`server/db/dati/negoziazione-domande.json`) viene invece dalla pagina di
**Persona 5 base** (`index.md`) e dal documento Google, tradotti dall'app.
Abbinamento domanda per domanda fatto sul senso (domanda + tre risposte), 229/230 abbinate (218 certezza alta); copie di lavoro nel mio
scratchpad: `neg-mappa.json`, `neg-diff.json`.
Sigle: Cu = Cupa, Ir = Irritabile, Ti = Timida, Gi = Giocosa · B = buona, P = passabile, C = cattiva · «—» = nessun dato nella fonte.
**Testo italiano**: nessuna fonte italiana riporta le domande della negoziazione come appaiono nel gioco (la guida allgamestaff non ha un elenco:
solo 8 risposte d'esempio). Le rese qui sotto sono **rese fedeli dell'Esperto, non il testo del gioco**, e vanno marcate così nell'app.

## 1. Numeri
| | Valore |
|---|---|
| Domande nella fonte Royal | 277 (1.714 esiti noti su 3.324 celle) |
| Domande nell'app | 230 (642 esiti) — 9 sono doppioni di un'altra domanda dell'app |
| Esiti dell'app uguali a Royal | 423 |
| Esiti dell'app **diversi** da Royal | **86** (sez. 3) |
| Esiti contraddittori nell'app (due esiti per la stessa personalità sulla stessa risposta, quelli che la migrazione 084 risolve col peggiore) | 24, di cui 21 risolti da Royal |
| Esiti di Royal **che mancano** nell'app (sulle domande presenti) | **979** |
| Esiti solo nell'app (Royal non ha dato) | 51 (da tenere, marcati «solo da P5») |
| Risposte dell'app che non corrispondono a una risposta Royal | 49 (resa diversa della frase: P5 contro P5R) |
| Domande Royal che mancano nell'app | 58, di cui **49 davvero nuove** (sez. 2) e 9 doppioni/varianti già presenti |
| Domande senza nessuna risposta «buona»: oggi nell'app / in Royal | 52 / 10 (corretto: prima avevo scritto 55, per un errore di conteggio sulle risposte contraddittorie) |
| Domanda dell'app senza corrispondente in Royal | 1: A156 «Hai messo a soqquadro questo posto… Occhio per occhio» (da tenere, marcata «solo P5») |
Regola di correzione proposta: per ogni domanda, gli esiti si prendono da **Royal**; dove Royal non dà un esito e l'app sì, resta quello dell'app
marcato «solo P5 (non verificato in Royal)». La fonte stessa avverte che una parte degli esiti di Royal viene ancora dall'originale e non è
confermata (nel foglio non è distinguibile): certezza **media** sui singoli esiti, **alta** sull'elenco delle domande.

## 2. Le 49 domande di Royal che mancano nell'app (resa fedele, non testo del gioco)
| R | Domanda (resa) | Risposta 1 | Risposta 2 | Risposta 3 |
|---|---|---|---|---|
| 2 | Dopo avermi affrontato così… anche tu sei quel tipo di umano? | Non è il mio stile. [Cu=P, Ir=B] | Che c'è di male? [Ir=C, Ti=B] | E allora? [Cu=B, Ir=B] |
| 11 | Ma prima fai qualcosa di divertente. Che cosa sai fare? | Le imitazioni. [Ir=B] | Le facce buffe. [Ir=C, Ti=B] | Niente. [Cu=B] |
| 22 | Sarà questo che gli umani chiamano «proposta di matrimonio»…? | Mi stupisce che tu lo sappia. [Cu=C, Ir=P, Gi=B] | No, non lo è. [Cu=C, Ir=B] | È una leggenda. [Cu=B, Ir=C] |
| 31 | Mi… consideri un ciarlatano? | Non lo penso. [Cu=C] | Ti considero un nemico. [—] | Non lo sei? [—] |
| 37 | Costringermi a prostrarmi, io che cerco solo il tuo bene… Esiste qualcosa di più irragionevole? | Chiedo scusa. [Cu=P] | Non voglio la salvezza. [Ir=B] | Stai zitto. [Ir=C] |
| 43 | Ehi, non hai fame? Facciamo una pausa e andiamo a mangiare da qualche parte? | Cosa prendiamo? [Gi=B] | Sì. [Ti=B] | Non è il momento. [Ir=B, Gi=B] |
| 48 | Ehi, ho i capelli schiacciati? Sono strani? | Sono carini. [Ti=B] | Sono strani. [—] | Chi se ne importa? [—] |
| 53 | …Ehi, non serve tutto questo, no? Lasciamo perdere il dramma e andiamo a mangiare qualcosa. Ci hai pensato anche tu, vero? Dai, dove mi porteresti? | Un costoso ristorante francese. [Cu=C] | Un locale di ramen affollato. [Cu=P] | Dove vorresti andare? [Cu=B] |
| 56 | Che ne dici se vivessimo insieme? In che tipo di posto vorresti abitare? | Non posso vivere con te. [Cu=C, Ir=B] | Vicino a un minimarket. [Cu=P, Gi=B] | Ma di che parli? [Cu=B, Ir=P] |
| 61 | Come ho fatto a perdere contro di te? Voglio dire… nell'aspetto vinco io, ho. | Hai ragione. [Gi=P] | No, vinco io. [Gi=B] | Conta il cuore. [—] |
| 64 | Gli umani parlano davanti a un bicchiere, no? Che ne dici? Diamine, ti offro un giro, ragazzo. | Smettila di scherzare. [Ir=B, Ti=C, Gi=C] | Paghi davvero? [Gi=B] | Sono minorenne. [Cu=B, Ir=B, Gi=C] |
| 66 | Non posso deludere i miei fan, ho. …Hai capito cosa intendo, no? | Faccio il tifo per te. [Ti=B, Gi=B] | Dimmi. [—] | Non hai fan. [—] |
| 68 | Non ti odio. No, non provo affatto quel sentimento… | Davvero? [Cu=B] | Troppo tardi. [Ir=B] | Allora teniamoci per mano. [Ir=C, Ti=B, Gi=B] |
| 69 | Non temo né la morte, né te. | Nella tua situazione? [Gi=B] | Sei tosto. [Ir=B, Ti=B] | Non sforzarti. [Ti=B, Gi=P] |
| 71 | Direi che oggi le donne sono davvero più socievoli, trovano tante cose divertenti da fare fuori casa. | Verissimo. [Cu=P, Ir=B, Ti=B] | Anche gli uomini sono socievoli. [Cu=P, Ir=B] | Davvero? [Cu=B] |
| 78 | Non fa differenza se mi uccidi tu o se muoio un po' più tardi, caro. | Esatto. [Ir=B] | Non è vero. [Cu=C] | Manca ancora tanto. [—] |
| 81 | Morire da sola non è così male, caro, ma la vera tragedia non è vivere da soli? | Non credo. [—] | Forse hai ragione. [Cu=B, Ir=P] | Stare soli è un lusso. [Gi=B] |
| 84 | Avrei fatto un gran colpo, vissuto da celebrità… Dov'è che ho sbagliato? | Non hai sbagliato niente. [—] | Hai sognato troppo in grande. [Cu=C] | È il tuo carattere. [—] |
| 87 | Mi chiedo come sarebbero andate le cose fra noi se le circostanze fossero state diverse. | Non saremmo stati nemici. [Cu=P] | Ci saremmo sposati. [—] | Non sarebbe cambiato niente. [Cu=B, Gi=P] |
| 88 | Mi chiedo come sarebbero andate le cose fra noi se le circostanze fossero state diverse? (seconda versione) | Saremmo usciti insieme. [—] | Ci saremmo sposati. [—] | Non sarebbe cambiato niente. [Cu=B] |
| 89 | Mi chiedo se non sia ora di lasciare questo lavoro. | Tieni duro. [Cu=C] | Buona idea. [—] | E poi? [Cu=B] |
| 110 | Penso che dovrei comportarmi più da nonna. Come posso farlo per te? | Preparami un pasto fatto in casa. [Ti=B, Gi=B] | Sgridami ogni tanto. [Ir=B] | Non devi fare niente. [Cu=B] |
| 117 | Non è un vivaio di umani insolenti? Come vedi questo tuo mondo? | Pieno di adulti corrotti. [Ir=B] | Pieno di posti dove fare acquisti. [—] | Mi sembra normale. [—] |
| 125 | Non è un modo di pensare un po'… antiquato? | Già. [—] | Per niente. [—] | È per il tuo bene. [Gi=B] |
| 126 | Non è un modo di pensare un po'… antiquato? (seconda versione) | Scusa. [—] | È per il tuo bene. [Gi=B] | È senza tempo. [Cu=B] |
| 129 | Pare che i Figli dell'Uomo abbiano rinnegato la parola di nostro Padre. Dimmi, che valore hai trovato? | Me ne sono accorto. [Ir=B, Ti=P] | Posso cavarmela da solo. [Ir=B] | Trovalo tu per me. [—] |
| 144 | …Forse chiamo la polizia. Forse gli dico che sei stato peggio di quanto sei stato davvero! | Chiamala. Ti sfido. [Ir=B, Gi=B] | Perdonami. [Cu=B, Gi=B] | Era legittima difesa. [Cu=P, Ir=B, Ti=C] |
| 153 | Il cuore mi batte così forte. Che cos'è questa sensazione? | Stai bene? [—] | Te lo stai inventando. [Cu=B] | È amore. [—] |
| 154 | Il mio oroscopo diceva che oggi avrei avuto «difficoltà nelle relazioni». | Pare che si sia avverato. [Ir=C, Ti=P] | È solo un oroscopo. [Ir=B, Ti=B] | Come va la tua fortuna in amore? [Cu=B, Ir=P, Gi=B] |
| 173 | Certi anziani si rifiutano di usare i posti riservati agli anziani. Che ne pensi? | Nessun problema. [Cu=B] | Non dovrebbero sforzarsi. [Ir=B] | Saranno giovani dentro. [Gi=B] |
| 179 | Vale a dire che siamo fratelli. Non c'è motivo di combattere. | Lascia fuori i miei genitori. [Gi=P] | Forse hai ragione. [Ir=P] | Ma tu sei un'Ombra. [Cu=B] |
| 180 | Quel potere viene da nostro Padre. Non è giusto ricambiarlo del favore? | Non ci avevo mai pensato. [Ir=P, Gi=B] | Questo potere è tutto mio. [Ir=P] | Non lo so. [Cu=B, Ir=P] |
| 192 | A dirti la hee-verità, è tutta una recita, ho. Come pensi che io sia davvero, ho? | Non riesco a immaginarlo. [Cu=B] | Non m'interessa. [—] | Vai bene così. [Cu=B, Ti=B] |
| 193 | Vedermi come un nemico significa attirarsi l'ira di nostro Padre. Il futuro dell'uomo è nelle tue mani. | Lascia il futuro a me. [Cu=P, Gi=B] | Mi serve la tua guida. [Ir=B, Ti=B] | Non capisco. [Cu=B] |
| 194 | Oggi ho quella che voi umani chiamate «serata fra ragazze». | Smettila di prendermi in giro. [Ir=B, Gi=C] | Dovrei andarci io al posto tuo? [Cu=C, Gi=B] | Ragazze…? [Cu=B, Gi=B] |
| 200 | Beh, sono ancora qui… Quel tipo mi fa proprio aspettare. | La vita non è una favola. [—] | Aspetta ancora un po'. [Gi=P] | Non lo incontrerai mai. [—] |
| 202 | Beh, a essere sinceri… qui nessuno ti vuole. Lo capisci, vero? | Lo so. [Ir=B] | Non lo sapevo. [Ir=P, Gi=B] | Chi se ne importa? [Cu=B] |
| 205 | Che cosa cercavi, venendo fin qui in un posto del genere? | Un'avventura emozionante. [—] | Una caccia al tesoro. [Gi=C] | Una strage. [—] |
| 209 | Cosa dovrei mettermi secondo te? Lo ammetto, voglio attirare un po' l'attenzione. | La divisa del liceo. [Ir=B, Gi=B] | Un kimono. [Ti=B] | Niente. [Ir=P, Gi=P] |
| 220 | Che cosa racconterai ai tuoi figli di questa roba? | È stata una battaglia sofferta. [Ir=B, Ti=P] | È stata una vittoria facile. [Cu=C] | Dimenticherò che è successo. [Cu=B, Ti=P, Gi=B] |
| 224 | Alla resa dei conti, non sei riuscito a farmi niente! | Avrei potuto. [Cu=P, Ir=B, Ti=P, Gi=P] | Come fai a dirlo? [Cu=B, Ti=P, Gi=B] | Che cosa vuoi che faccia? [Cu=B, Ti=B, Gi=B] |
| 228 | Dove dovrei andare? Voglio qualcosa di buono, ho! | Un posto senza fila. [Cu=C] | Un posto con i bagni all'occidentale. [Cu=B, Gi=B] | Non sopravviverai. [—] |
| 230 | Perché ti interesso tanto, comunque? | Se ti fa piacere. [Ir=B] | […] [—] | […] [—] |
| 241 | Saresti disposto a spendere tempo e soldi per rivedere persone che non senti da anni? | Credo di sì. [Cu=C] | Che seccatura. [Ir=B] | Nessuno mi invita alle rimpatriate. [Ir=C] |
| 261 | Devi essere uno di quei teppisti di cui sento parlare. Vai male a scuola? | Ho tutti dieci. [Ir=B, Gi=P] | Non vanno benissimo… [Cu=B, Ir=B] | Almeno sono popolare. [Ir=C, Gi=B] |
| 262 | Sei nuovo? Ti hanno hee-assunto, ho? | Sì! Piacere di conoscerti! [Cu=P, Gi=B] | Sono uno studente trasferito. [—] | No. [Cu=B] |
| 271 | Ci stai provando con me, vero? Non pensi di farlo nel modo sbagliato? | Non c'è niente di sbagliato. [Cu=C, Ti=B, Gi=B] | Allora qual è il modo giusto? [Cu=B, Ti=C] | Non ci sto provando. [—] |
| 272 | Ti è andata bene che ero io. Nel mondo reale non puoi fare cose del genere, vero? | Esatto. [Cu=C, Ir=B, Ti=B] | Scelgo i miei bersagli con cura. [Cu=P, Ti=C] | Faccio sul serio. [Ir=B, Ti=C] |
| 273 | Mi stai mostrando la tua forza, vero? Ti ho letto nel hee-pensiero, ho. | Hai frainteso. [—] | Ma che diavolo dici? [—] | Fammi tuo apprendista. [Cu=P] |
(«ho», «hee-» sono i tic verbali di Jack Frost/Jack-o'-Lantern e simili, resi come nell'app.)
Doppioni o varianti già nell'app, da non aggiungere: R18 (= R17), R41 (= R188), R98 (= R99), R163 (= R162), R165 (= R164), R195 (= R116),
R266 (= R106), R196 (variante dentro A101), R103 (variante dentro A218).

## 3. Gli 86 esiti dell'app diversi da Royal (vale Royal)
Correzione: due righe dell'elenco qui sotto, A19 «Non ho tempo./Chiedo scusa.» (Cu) e A142 «Tanto non sono maturo.» (Gi), sono **esiti
contraddittori** già nell'app (Cu: P e B; Gi: C e B): Royal dà Cu = C e Gi = C. Restano da correggere ma si contano fra le 24 contraddizioni.
Formato: A<domanda dell'app> · «risposta come nell'app» · personalità: app → **Royal**.
A0 «Che tipo di ragazza è?» Ti: B → **P** · A1 «Il mio futuro… (Puzzi di sudore.)» Ti: B → **C** · A11 «Ti stai sforzando troppo.» Ir: B → **P**, Gi: B → **P** ·
A13 «Vivi in fretta, muori giovane.» Gi: P → **B** · A14 «È per migliorare me stesso.» Cu: P → **B** · A16 «Sono più giovane di te./La giovinezza.» Ir: P → **B** ·
A16 «So chiacchierare meglio./La fortuna.» Ti: B → **C** · A17 «La mamma aspetterà./Dopo che ho finito…» Ir: B → **P** · A19 «Non ho tempo./Chiedo scusa.» Cu: B → **C** ·
A19 «Ti sei fatto un'idea sbagliata.» Cu: C → **B** · A24 «Ci vorrebbe un po' a spiegarlo…» Cu: B → **P** · A25 «Mi sembravi utile.» Cu: B → **P** ·
A25 «Nessun motivo particolare.» Ti: P → **C** · A29 «Hai un fidanzato?» Gi: P → **B** · A30 «Quanto vuoi?» Gi: B → **C** · A40 «La mia intelligenza./Lo studio.» Ti: B → **P** ·
A41 «Voglio un autografo.» Cu: C → **P** · A49 «Non ne ho./Mi dispiace.» Gi: B → **C** · A49 «Fattelo da solo.» Ir: C → **B** · A50 «Un viaggio all'inferno.» Cu: B → **P** ·
A57 «Sono qui per ritrovare me stesso./Mi andava.» Cu: B → **C** · A65 «Non ho fatto niente di male.» Ir: P → **B** · A69 «Dammi qualcosa.» Gi: P → **B** ·
A69 «Striscia davanti a me.» Ir: P → **B**, Gi: B → **C** · A70 «Chi se ne importa delle idol?» Ir: P → **B** · A73 «Hai ragione.» Ir: B → **C** · A73 «Non mi importa.» Gi: B → **P** ·
A75 «Non voglio figli.» Gi: P → **B** · A78 «Non scherzare./Non prendermi in giro.» Ir: C → **B** · A78 «Resisti./Vale anche per me.» Ir: P → **C** ·
A78 «Ordiniamo qualcosa?…» Cu: P → **C**, Ir: B → **P** · A80 «Gli umani sono potenti.» Ir: P → **B** · A81 «Ti mangio in umido./Vado fiero di averti…» Ir: P → **B** ·
A82 «Non ci ho pensato./Devo togliermi le scarpe?» Ir: P → **C** · A84 «Nessuno, davvero.» Cu: P → **C** · A85 «Ti educherò io./Non proprio.» Ir: P → **B** ·
A89 «Sì, parecchio.» Cu: B → **P**, Gi: C → **B** · A89 «Stai zitto.» Gi: B → **C** · A90 «Ma no, hai stravinto.» Cu: P → **C** · A91 «Sul serio!?» Cu: P → **B** ·
A99 «Preferisco il rispetto reciproco.» Cu: C → **B** · A100 «Una star?» Cu: P → **B** · A100 «Non succederà mai.» Ir: C → **B** · A106 «Non ci si può fare niente.» Cu: B → **C** ·
A108 «Io amo un'altra persona.» Cu: B → **P** · A109 «Da bambini è facile./Non è poi così male…» Ir: B → **P** · A114 «Hai ragione.» Gi: C → **B** · A116 «Hamburger.» Ti: P → **B** ·
A120 «Subito dopo di te, ragazzino.» Ti: B → **P**, Gi: C → **B** · A123 «È noiosissimo./Hai ragione.» Cu: P → **B** · A124 «Ti annoi?/Hai tempo da perdere?» Ir: B → **C** ·
A126 «L'età non c'entra.» Ti: B → **P** · A127 «Scusa…/Chiedo scusa.» Cu: B → **C**, Ir: B → **P** · A127 «Non è un mio problema./Come se mi importasse.» Cu: C → **P** ·
A131 «Sì.» Cu: C → **P** · A132 «Non lo sapevo.» Cu: C → **B**, Ti: C → **B** · A132 «Bella, eh?» Ti: C → **P** · A137 «Ehm, a casa va tutto bene?» Ti: B → **P** ·
A142 «Tanto non sono maturo.» Gi: B → **C** · A144 «Non mi pare ingiusto.» Ir: P → **B** · A150 «D'accordo, ti trito!/Ti trito.» Ir: P → **C** · A164 «I miracoli non esistono.» Cu: P → **C** ·
A173 «Sarebbe una seccatura.» Ir: P → **C** · A173 «Reggerei quel peso.» Ir: C → **B** · A177 «Non ci stavo provando neanch'io.» Gi: C → **B** · A183 «Stai zitto!» Cu: P → **B** ·
A185 «Dammi tutto quello che hai./Mi serve il tuo aiuto.» Gi: B → **P** · A194 «Non è priva di senso.» Ti: P → **B**, Gi: B → **P** · A194 «Ci sono altri modi di vivere.» Cu: B → **P** ·
A195 «Continuerò a vincere.» Ir: P → **B** · A197 «Perché vedo un nemico.» Gi: B → **P** · A203 «Fai paura.» Cu: B → **P** · A206 «In una palestra infernale.» Ir: P → **C** ·
A207 «Il destino ci ha fatti incontrare.» Gi: B → **P** · A207 «Non esiste niente del genere.» Ir: P → **B** · A209 «Prima mi diverto un po'.» Ir: P → **B** · A212 «Va bene./Scusa.» Gi: C → **B** ·
A219 «Che peccato…» Cu: B → **P** · A221 «Troppo tardi per i rimpianti./Non è troppo tardi.» Gi: B → **C** · A221 «Non avevi speranze.» Cu: B → **C**.
(Elenco completo con la frase inglese di riferimento in `neg-diff.json`, campo `errori`.)

## 4. Le 8 risposte d'esempio delle 4 carte (testo italiano del gioco, dalla guida allgamestaff)
Le frasi delle carte vengono dalla guida italiana (AGS sistema-di-battaglia/, «Personalità dei nemici e scelte corrette»): **sono testo del gioco
in italiano**, e non compaiono fra le risposte dell'app solo perché l'app ha tradotto da sé dall'inglese. Verifica su Royal:
| Carta | Frase della guida | Risposta Royal | Esito Royal per quella personalità | Verdetto |
|---|---|---|---|---|
| Giocosa | «È per l'automiglioramento» | «It's for self-improvement.» (R247) | Gi = **B** (B per tutte e 4) | giusta |
| Giocosa | «Devo togliermi le scarpe?» | «Should I take off my shoes?» (R236) | Gi = **B** | giusta |
| Timida | «In realtà sono un ragazzino» | «I'm secretly a kid.» (R20) | Ti = **P** | **sbagliata**: è passabile (buona per Ir e Gi) |
| Timida | «Non ce n'è bisogno» | «No need to worry.» (R243) | Ti = **B** | giusta (abbinamento probabile) |
| Irritabile | «Perché? Non è così?» | non trovata in Royal | — | non verificabile |
| Irritabile | «Senza impegno?» | «No strings attached?» (R101) | Ir = **—** (B per Cu e Gi) | non verificabile per Irritabile |
| Cupa | «Non ho preoccupazioni» | «I have no worries.» (R52) | Cu = **B** | giusta: è **l'app** a non avere l'esito (manca, sez. 1) |
| Cupa | «Non è priva di significato» | «It's not meaningless.» (R15) | Cu = **B** | giusta |
Proposta per le carte: tenere le frasi della guida che Royal conferma (sono il testo del gioco) e sostituire le altre con esempi verificati in
Royal. Timida → al posto di «In realtà sono un ragazzino»: «I want to be a kid forever.» (R34: Ti=B, Cu=C, Ir=P, Gi=P), resa «Voglio restare
bambino per sempre.»; Irritabile → al posto di «Perché? Non è così?» e «Senza impegno?»: «Making excuses?» (R3: Ir=B, Cu=P), resa «Cerchi scuse?».
Le rese inglesi sono marcate (non testo del gioco) finché non si trova la frase italiana originale.

## 5. Personalità delle Ombre della Battaglia che ne sono prive (75)
Fonte: dati estratti dal gioco Royal (aqiu384, `roy-enemy-data.json`, campo «trait»: Gloomy = Cupa, Irritable = Irritabile, Timid = Timida,
Upbeat = Giocosa); abbinamento per Persona e area del Palazzo. 69 trovate univoche, 2 corrette per nome, 4 non negoziabili.
| Palazzo | Ombra (Persona) → personalità |
|---|---|
| Kaneshiro | Amante geloso (Leanan Sidhe) **Irritabile** · Collana della Regina **Giocosa** · Dama cannibale (Yaksini) **Irritabile** · Demone Acque Furibondo (Sui-Ki) **Cupa** · Demone della battaglia (Rakshasa) **Irritabile** · Demone solenne (Oni) **Giocosa** · Equino saggio (Orobas) **Timida** · Guardiano bicefalo (Orthrus) **Cupa** · Vendicatore sconfitto (Take-Minakata) **Cupa** · Fango pulsante (Black Ooze; oggi scritto «Melma nera», maschera e Ombra scambiate) **Timida** · Maestra degli scherzi (High Pixie; oggi «Pixie superiore», scambiate) **Irritabile** |
| Futaba | Babbuino cantilenante (Thoth) **Irritabile** · Donna serpente strisciante (Lamia) **Cupa** · Giudice delle anime (Anubis) **Irritabile** · Ladro delle tavole (Anzu) **Irritabile** · Messo del letargo (Sandman) **Giocosa** · Pietra di Scone **Giocosa** · Signora del passaggio (Isis) **Timida** · Uomo serpente (Naga) **Cupa** · Uomogufo minaccioso (Andras) **Timida** |
| Okumura (nome dell'Ombra assente nei dati: tra parentesi il nome inglese del gioco) | Arahabaki («Awakened God») **Cupa** · Belphegor («Ambassador of Filth») **Irritabile** · Decarabia («Vicious Pentagram») **Cupa** · Girimehkala («Rebellious Elephant») **Cupa** · Kaiwan («Wishless Star») **Timida** · Koh-i-Noor **Giocosa** · Kumbhanda («Life-Draining Spirit») **Irritabile** · Lilim («Woman Who Brings Ruin») **Cupa** · Mithras («Dark Sun») **Cupa** · Mothman («Vampire Moth») **Timida** · Thunderbird («Storm-Invoking Ptarmigan») **Giocosa** · 4 Servobot (MDL-CH, MDL-DM, MDL-WKR, secondo modello): **non risultano** fra le Ombre negoziabili (assenti dai dati) |
| Niijima | Avvoltoio arrogante (Jatayu) **Giocosa** · Bestia inespressiva (Unicorn) **Timida** · Giudice finale (Norn) **Giocosa** · Guerriera dell'oltretomba (Valkyrie) **Irritabile** · Guerriero divino (Power) **Giocosa** · Leopardo crudele (Ose) **Irritabile** · Orlov **Giocosa** · Pachiderma benevolo (Ganesha) **Giocosa** · Pavida signora dell'ombra (Skadi) **Timida** · Ragazza di montagna (Kikuri-Hime) **Timida** · Regina di Mezzanotte (Queen Mab) **Cupa** · Sacrificio lamentoso (Kushinada) **Cupa** · Strega del sabba (Rangda) **Cupa** |
| Shido | Agile re delle scimmie (Hanuman) **Giocosa** · Amuleto dell'Imperatore **Giocosa** · Bellezza distruttiva (Parvati) **Timida** · Capro nero (Baphomet) **Timida** · Demonessa sanguinaria (Dakini) **Giocosa** · Dio-uccello furente (Garuda) **Irritabile** · Furia nera (Kali) **Irritabile** · Leone danzante (Barong) **Timida** · Mastino dell'Ade (Cerberus) **Irritabile** · Oratore del Mare (Forneus) **Cupa** · Re infedele dei sogni (Oberon) **Irritabile** · Re saggio infuriato (Atavaka) **Irritabile** · Regina degli scandali (Titania) **Timida** · Signore delle nevi (King Frost) **Giocosa** · Stella egocentrica (Narcissus) **Timida** · Suonatrice di vina (Sarasvati) **Timida** |
| Maruki | Araldo della depravazione (Belial) **Cupa** · Ballerino mortale (Macabre) **Cupa** · Dio-leone deformato (Chimera) **Giocosa** · Generale necromante (Nebiros) **Timida** · Malvagio drago vorace (Fafnir) **Irritabile** · Organismo sintetico malvagio (Byakhee) **Cupa** · Oricalco **Giocosa** · Orsacchiotto assassino (Bugs) **Irritabile** · Sbruffone edonista (Dionysus) **Giocosa** · Teschio dei sogni (Loa) **Giocosa** |
| Memento | Orlov (Sheriruth; oggi «-») **Giocosa** |
Nota: i Demoni del Tesoro (Collana della Regina, Pietra di Scone, Koh-i-Noor, Orlov, Amuleto dell'Imperatore, Oricalco) hanno una personalità nei
dati, ma nel gioco non si negoziano come le altre Ombre: va verificato prima di collegarli alle domande (certezza media).
