// ============================================================
// equipaggiamentoL4 — le righe della guida per la migrazione 357 (L4-03): armi a distanza, armi da mischia e protezioni senza scheda
// ============================================================
//
// Dati trascritti dalle tabelle delle pagine d'inventario della guida italiana (rapporto N §2.1, censimento per nome): ogni valore ha la sua
// riga nella guida, niente è stimato. Colonne: nome come nella guida; per chi (il personaggio delle armi, «Chi può indossarla» delle
// protezioni); Attacco o Difesa; Precisione o Elusione; Colpi (solo armi a distanza); Effetto (vuoto dove la guida scrive «–»); prezzo e
// sblocco dell'Untouchable dove la guida dà il negozio; la reperibilità a parole dove non c'è un negozio. Le date della guida sono
// mese/giorno («Giovedì 12/22» = 22 dicembre). Nessun import da `server/services/`.
// ============================================================

export const FONTE_ARMI_DISTANZA = 'https://www.allgamestaff.it/persona-5-royal/armi-a-distanza/';
export const FONTE_ARMI_MISCHIA = 'https://www.allgamestaff.it/persona-5-royal/armi-da-mischia/';
export const FONTE_PROTEZIONI = 'https://www.allgamestaff.it/persona-5-royal/protezioni/';

/** Lo sblocco di un'offerta dell'Untouchable: «a partire dall'arco del Palazzo di …» o «da <giorno>». */
export type Sblocco = 'kamoshida' | 'madarame' | 'kaneshiro' | 'futaba' | 'okumura' | 'niijima' | 'shido' | '12-22' | '01-09' | '01-13';

export interface RigaArma {
  chiave: string; nome: string; per: string; attacco: number; precisione: number; colpi: number | null; effetto: string;
  /** L'offerta dell'Untouchable, se la guida la dà. */
  negozio: { prezzo: number; sblocco: Sblocco } | null;
  /** La reperibilità a parole, quando non c'è un negozio (o quando c'è altro oltre al negozio). */
  descrizione: string;
}
export interface RigaProtezione {
  chiave: string; nome: string; per: string; difesa: number; elusione: number; effetto: string;
  negozio: { prezzo: number; sblocco: Sblocco } | null; descrizione: string;
}

const PREDEFINITA = (chi: string) => `Arma a distanza predefinita di ${chi}`;
const AUTO = 'Disponibile automaticamente dal 2 gennaio';
const d = (chiave: string, nome: string, per: string, attacco: number, precisione: number, colpi: number, effetto: string, negozio: RigaArma['negozio'], descrizione = ''): RigaArma =>
  ({ chiave: `arma-da-fuoco/${chiave}`, nome, per, attacco, precisione, colpi, effetto, negozio, descrizione });
const u = (prezzo: number, sblocco: Sblocco) => ({ prezzo, sblocco });

/** Le 54 armi a distanza senza scheda: le 53 assenti di N §2.1 e l'Eliminatore di Haru (prima una sola riga per due armi diverse). */
export const ARMI_DISTANZA: readonly RigaArma[] = [
  d('tkachev', 'Tkachev', 'Solo Joker', 50, 92, 8, '', null, 'Dono di Ryuji (12 aprile)'),
  d('antisommossa-e', 'Antisommossa E', 'Solo Joker', 104, 85, 4, 'Folgorazione potente', null, 'Dono di Iwai (6 maggio)'),
  d('levinson-m31', 'Levinson M31', 'Solo Ryuji', 60, 92, 3, '', null, PREDEFINITA('Ryuji')),
  d('granelli-m3', 'Granelli M3', 'Solo Ryuji', 70, 90, 3, '', u(4200, 'kamoshida')),
  d('bianchi-sbas', 'Bianchi SBAS', 'Solo Ryuji', 106, 85, 3, '', u(10400, 'madarame')),
  d('fuochi-dartificio', 'Fuochi d’artificio', 'Solo Ryuji', 130, 85, 3, '', u(15400, 'kaneshiro')),
  d('fuoco-infernale', 'Fuoco infernale', 'Solo Ryuji', 160, 85, 3, '', u(21000, 'futaba')),
  d('passepartout', 'Passepartout', 'Solo Ryuji', 190, 85, 3, '', u(27600, 'okumura')),
  d('furia', 'Furia', 'Solo Ryuji', 220, 85, 3, '', u(34600, 'niijima')),
  d('calamita', 'Calamità', 'Solo Ryuji', 250, 85, 3, '', u(43000, 'shido')),
  d('kiraihou', 'Kiraihou', 'Solo Ryuji', 290, 85, 3, '', u(52400, '12-22')),
  d('fionda', 'Fionda', 'Solo Morgana', 40, 94, 5, '', null, PREDEFINITA('Morgana')),
  d('arcofionda', 'Arcofionda', 'Solo Morgana', 50, 92, 5, '', u(4200, 'kamoshida')),
  d('shrike', 'Shrike', 'Solo Morgana', 86, 90, 5, '', u(10400, 'madarame')),
  d('comet-3', 'Comet 3', 'Solo Morgana', 110, 90, 5, '', u(15400, 'kaneshiro')),
  d('luce-del-nord', 'Luce del nord', 'Solo Morgana', 140, 90, 5, '', u(21000, 'futaba')),
  d('stella-cadente', 'Stella cadente', 'Solo Morgana', 170, 90, 5, '', u(27600, 'okumura')),
  d('assassino-di-stelle', 'Assassino di stelle', 'Solo Morgana', 200, 90, 5, '', u(34600, 'niijima')),
  d('pietrasogno', 'Pietrasogno', 'Solo Morgana', 230, 90, 5, '', u(43000, 'shido')),
  d('utopia', 'Utopia', 'Solo Morgana', 270, 90, 5, '', u(52400, '12-22')),
  d('mitragl-leggera-finta', 'Mitragl. leggera finta', 'Solo Ann', 45, 94, 12, '', null, PREDEFINITA('Ann')),
  d('sterlidge', 'Sterlidge', 'Solo Ann', 55, 93, 12, '', u(3800, 'kamoshida')),
  d('soldato', 'Soldato', 'Solo Ann', 91, 90, 12, '', u(9600, 'madarame')),
  d('mitragl-dassalto', 'Mitragl. d’assalto', 'Solo Ann', 115, 90, 12, '', u(14200, 'kaneshiro')),
  d('perforacranio', 'Perforacranio', 'Solo Ann', 120, 90, 12, 'Soggiogamento debole', null, 'Esecuzione: Sedia elettrica su Succube'),
  d('tarantula', 'Tarantula', 'Solo Ann', 145, 90, 12, '', u(19200, 'futaba')),
  d('nessuna-pieta', 'Nessuna pietà', 'Solo Ann', 175, 90, 12, '', u(25400, 'okumura')),
  d('smg-occidentale', 'SMG occidentale', 'Solo Ann', 205, 90, 12, '', u(32000, 'niijima')),
  d('h-renhappou', 'H. Renhappou', 'Solo Ann', 235, 90, 12, '', u(39600, 'shido')),
  d('phantom-killer', 'Phantom Killer', 'Solo Ann', 275, 90, 12, '', u(48200, '12-22')),
  d('fucile-dassalto-finto', 'Fucile d’assalto finto', 'Solo Yusuke', 75, 75, 10, '', null, PREDEFINITA('Yusuke')),
  d('assalto-nero', 'Assalto nero', 'Solo Yusuke', 101, 75, 10, '', u(10600, 'madarame')),
  d('assalto-pesante', 'Assalto pesante', 'Solo Yusuke', 125, 75, 10, '', u(15800, 'kaneshiro')),
  d('fucile-ribelle', 'Fucile ribelle', 'Solo Yusuke', 155, 75, 10, '', u(21400, 'futaba')),
  d('annihilator', 'Annihilator', 'Solo Yusuke', 185, 75, 10, '', u(28000, 'okumura')),
  d('ar-x', 'AR-X', 'Solo Yusuke', 215, 75, 10, '', u(35400, 'niijima')),
  d('hizutsu', 'Hizutsu', 'Solo Yusuke', 245, 75, 10, '', u(43800, 'shido')),
  d('ryuraihou', 'Ryuraihou', 'Solo Yusuke', 285, 75, 10, '', u(53400, '12-22')),
  d('revolver-finto', 'Revolver finto', 'Solo Makoto', 115, 75, 6, '', null, PREDEFINITA('Makoto')),
  d('peacemaker', 'Peacemaker', 'Solo Makoto', 135, 75, 6, '', u(14200, 'kaneshiro')),
  d('ling-xing', 'Ling Xing', 'Solo Makoto', 165, 75, 6, '', u(19200, 'futaba')),
  d('wildborn', 'Wildborn', 'Solo Makoto', 195, 75, 6, '', u(25400, 'okumura')),
  d('battesimo', 'Battesimo', 'Solo Makoto', 225, 75, 6, '', u(32000, 'niijima')),
  d('orochi', 'Orochi', 'Solo Makoto', 255, 75, 6, '', u(39600, 'shido')),
  d('crepuscolo', 'Crepuscolo', 'Solo Makoto', 295, 75, 6, '', u(48200, '12-22')),
  d('lanciagranate-finto', 'Lanciagranate finto', 'Solo Haru', 176, 70, 1, '', u(24200, 'okumura'), PREDEFINITA('Haru')),
  d('bruciatore', 'Bruciatore', 'Solo Haru', 200, 70, 1, '', u(28000, 'okumura')),
  d('brucia-citta', 'Brucia città', 'Solo Haru', 230, 70, 1, '', u(35400, 'niijima')),
  d('eliminatore', 'Eliminatore', 'Solo Haru', 260, 70, 1, '', u(43800, 'shido')),
  d('inferno', 'Inferno', 'Solo Haru', 300, 70, 1, '', u(53400, '12-22')),
  d('moebius', 'Moebius', 'Solo Akechi', 195, 85, 5, '', null, 'Arma a distanza predefinita di Akechi (dall’arco del Palazzo di Niijima)'),
  d('mauser', 'Mauser', 'Solo Akechi', 305, 85, 5, '', null, AUTO),
  d('fucile-di-guerra-finto', 'Fucile di guerra finto', 'Solo Kasumi', 130, 85, 10, '', null, PREDEFINITA('Kasumi')),
  d('roosevelt', 'Roosevelt', 'Solo Kasumi', 295, 90, 10, '', null, AUTO),
];

const m = (chiave: string, nome: string, per: string, attacco: number, precisione: number, effetto: string, descrizione: string): RigaArma =>
  ({ chiave: `arma/${chiave}`, nome, per, attacco, precisione, colpi: null, effetto, negozio: null, descrizione });
const INIZIALE = (chi: string) => `Arma iniziale di ${chi}`;
const FORZIERE = (dove: string) => `Forziere: ${dove}`;

/** Le 15 armi da mischia senza scheda (le 17 assenti di N §2.1 meno le due varianti di nome già presenti, che ricevono il nome della guida come alias). */
export const ARMI_MISCHIA: readonly RigaArma[] = [
  m('coltello-ribelle', 'Coltello ribelle', 'Solo Joker', 38, 96, '', INIZIALE('Joker')),
  m('pugnale-dargento', 'Pugnale d’argento', 'Solo Joker', 58, 98, '', FORZIERE('Palazzo di Kamoshida (Edificio ovest 1P)')),
  m('coltello-del-supporto', 'Coltello del supporto', 'Solo Joker', 148, 98, 'Ma +3', FORZIERE('Palazzo di Futaba (Camera del Santuario)')),
  m('bastone-normale', 'Bastone normale', 'Solo Ryuji', 44, 92, '', INIZIALE('Ryuji')),
  m('mazza-del-giudizio', 'Mazza del giudizio', 'Solo Ryuji', 72, 93, 'Confusione debole', FORZIERE('Palazzo di Kamoshida (Edificio est 3P)')),
  m('stella-della-gang', 'Stella della gang', 'Solo Ryuji', 130, 93, 'Paura debole', FORZIERE('Palazzo di Kaneshiro (Corridoio dei banchieri)')),
  m('sciabola-lunare', 'Sciabola lunare', 'Solo Morgana', 90, 99, '', FORZIERE('Palazzo di Madarame (Stanza della mostra SP)')),
  m('sciabola-animale', 'Sciabola animale', 'Solo Morgana', 142, 98, 'Riduce danno maledetto (basso)', FORZIERE('Palazzo di Futaba (Camera del rigetto)')),
  m('frusta-di-cuoio', 'Frusta di cuoio', 'Solo Ann', 36, 94, '', INIZIALE('Ann')),
  m('frusta-del-reo', 'Frusta del reo', 'Solo Ann', 64, 99, '', FORZIERE('Palazzo di Kamoshida (Edificio est, dépendance)')),
  m('katana', 'Katana', 'Solo Yusuke', 78, 94, '', INIZIALE('Yusuke')),
  m('tirapugni-in-ottone', 'Tirapugni in ottone', 'Solo Makoto', 102, 94, '', INIZIALE('Makoto')),
  m('sciabola-seghettata', 'Sciabola seghettata', 'Solo Akechi', 280, 95, '', AUTO),
  m('stocco', 'Stocco', 'Solo Kasumi', 280, 95, '', AUTO),
  m('stocco-decisivo', 'Stocco decisivo', 'Solo Kasumi', 344, 95, 'Rs +5', FORZIERE('Palazzo di Maruki (Auditorium)')),
];

/** «Chi può indossarla» della guida → il «per» delle schede d'equipaggiamento (Unisex, Solo uomini, Solo donne, Solo Morgana per «Felini»). */
const U = 'Unisex', M = 'Solo uomini', F = 'Solo donne', G = 'Solo Morgana';
const p = (chiave: string, nome: string, per: string, difesa: number, elusione: number, effetto: string, descrizione: string, negozio: RigaProtezione['negozio'] = null): RigaProtezione =>
  ({ chiave: `protezione/${chiave}`, nome, per, difesa, elusione, effetto, negozio, descrizione });
const LAVA = (da: string) => `Lavatrice: lavando «${da}»`;
const LAVA_CESTA = (da: string, quando: string) => `Lavatrice: lavando «${da}»; si trova anche nella Cesta di vestiti (${quando})`;
const SPORCA = (dove: string) => `Da lavare in lavatrice. ${dove}`;
const PRED = (chi: string) => `Protezione predefinita di ${chi}`;

/** Le 99 protezioni senza scheda di N §2.1. */
export const PROTEZIONI: readonly RigaProtezione[] = [
  p('attrezzatura-spettrale', 'Attrezzatura spettrale', U, 10, 1, '', SPORCA('Forzieri: Palazzo di Kamoshida (Edificio est 2P e 3P), Dedali di Qimranut e Aiyatsbus; negoziazione: Incubo')),
  p('arm-pesante-sporca', 'Arm. pesante sporca', M, 10, 1, '', SPORCA('Forzieri: Palazzo di Kamoshida (Edificio est, dépendance), Dedali di Qimranut e Aiyatsbus; negoziazione: Berith')),
  p('yorishiro-sporco', 'Yorishiro sporco', M, 10, 1, '', SPORCA('Forzieri: Dedalo di Chemdah; negoziazione: Shiki-Ouji')),
  p('arm-da-uomo-sporca', 'Arm. da uomo sporca', M, 10, 1, '', SPORCA('Forzieri: Dedalo di Kaitul; negoziazione: Take-Minakata')),
  p('soprab-lupo-sporco', 'Soprab. lupo sporco', M, 10, 1, '', SPORCA('Forzieri: Dedalo di Akzeriyyuth; negoziazione: Anubis')),
  p('armatura-nera-sporca', 'Armatura nera sporca', M, 10, 1, '', SPORCA('Forzieri: Dedalo di Adyeshach; negoziazione: Girimekhala')),
  p('pell-maculata-sporca', 'Pell. maculata sporca', M, 10, 1, '', SPORCA('Forzieri: Dedalo di Sheriruth; negoziazione: Ose')),
  p('pelliccia-di-scimmia', 'Pelliccia di scimmia', M, 10, 1, '', SPORCA('Negoziazione: Hanuman')),
  p('armatura-del-fulmine', 'Armatura del fulmine', M, 10, 1, '', SPORCA('Forzieri: Dedalo di Da’at; negoziazione: Thor')),
  p('veste-da-danza-sporca', 'Veste da danza sporca', M, 10, 1, '', SPORCA('Negoziazione: Macabre')),
  p('arm-sporca-da-donna', 'Arm. sporca da donna', F, 10, 1, '', SPORCA('Forzieri: Dedali di Qimranut e Aiyatsbus; negoziazione: Angelo')),
  p('cheongsam-sporco', 'Cheongsam sporco', F, 10, 1, '', SPORCA('Forzieri: Dedalo di Chemdah; negoziazione: Hua Po')),
  p('attrezzatura-orchessa', 'Attrezzatura orchessa', F, 10, 1, '', SPORCA('Forzieri: Dedalo di Kaitul; negoziazione: Yaksini')),
  p('attrezzatura-divina-sporca', 'Attrezzatura divina sporca', F, 10, 1, '', SPORCA('Forzieri: Dedalo di Akzeriyyuth; negoziazione: Iside')),
  p('armatura-astrale-sporca', 'Armatura astrale sporca', F, 10, 1, '', SPORCA('Forzieri: Dedalo di Adyeshach; negoziazione: Lilim')),
  p('veste-truffatore-sporca', 'Veste truffatore sporca', F, 10, 1, '', SPORCA('Forzieri: Dedalo di Sheriruth; negoziazione: Skadi')),
  p('regalia-sporca', 'Regalia sporca', F, 10, 1, '', SPORCA('Negoziazione: Kali')),
  p('veste-da-ribelle-sporca', 'Veste da ribelle sporca', F, 10, 1, '', SPORCA('Forzieri: Dedalo di Da’at; negoziazione: Lilith')),
  p('armatura-scura-sporca', 'Armatura scura sporca', F, 10, 1, '', SPORCA('Negoziazione: Scathach')),
  p('stivali-sporchi', 'Stivali sporchi', G, 10, 1, '', SPORCA('Forzieri: Dedali di Qimranut e Aiyatsbus; negoziazione: Cait Sith')),
  p('armatura-dellanziano', 'Armatura dell’anziano', G, 10, 1, '', SPORCA('Forzieri: Dedalo di Chemdah; negoziazione: Koropokguru')),
  p('armatura-felina-sporca', 'Armatura felina sporca', G, 10, 1, '', SPORCA('Forzieri: Dedalo di Kaitul; negoziazione: Nekomata')),
  p('pelle-serpente-sporca', 'Pelle serpente sporca', G, 10, 1, '', SPORCA('Forzieri: Dedalo di Akzeriyyuth; negoziazione: Naga')),
  p('manto-di-piume-sporco', 'Manto di piume sporco', G, 10, 1, '', SPORCA('Forzieri: Dedalo di Adyeshach; negoziazione: Wakinyan')),
  p('corno-sporco', 'Corno sporco', G, 10, 1, '', SPORCA('Forzieri: Dedalo di Sheriruth; negoziazione: Unicorno')),
  p('criniera-leone-sporca', 'Criniera leone sporca', G, 10, 1, '', SPORCA('Negoziazione: Barong')),
  p('collare-dorato-sporco', 'Collare dorato sporco', G, 10, 1, '', SPORCA('Forzieri: Dedalo di Da’at; negoziazione: Abaddon')),
  p('arm-a-scaglie-sporca', 'Arm. a scaglie sporca', G, 10, 1, '', SPORCA('Negoziazione: Fafnir')),
  p('maglietta-con-stampa', 'Maglietta con stampa', M, 21, 8, '', PRED('Ryuji')),
  p('maglietta-nera', 'Maglietta nera', M, 22, 6, '', PRED('Joker')),
  p('fazzoletto-da-collo', 'Fazzoletto da collo', G, 22, 10, '', PRED('Morgana')),
  p('giacca-da-baseball', 'Giacca da baseball', F, 23, 6, '', PRED('Ann')),
  p('collare-commemorativo', 'Collare commemorativo', G, 24, 14, 'Resiste Amnesia', '', u(2200, 'kamoshida')),
  p('camicia-elegante', 'Camicia elegante', M, 54, 12, '', PRED('Yusuke')),
  p('armatura-della-guardia', 'Armatura della guardia', M, 55, 7, 'Resiste Sonno', FORZIERE('Palazzo di Kamoshida (Sala centrale)')),
  p('pigiama-vecchio', 'Pigiama vecchio', U, 57, 15, 'Resiste Sonno', LAVA('Attrezzatura spettrale')),
  p('coll-da-gatto-vecc', 'Coll. da gatto vecc.', G, 59, 14, 'Ma +1', LAVA('Stivali sporchi')),
  p('manto-angelico-vecchio', 'Manto angelico vecchio', F, 60, 11, 'Evita magia (basso)', LAVA('Arm. sporca da donna')),
  p('giacca-da-duca-vecchia', 'Giacca da duca vecchia', M, 64, 6, '+10 HP', LAVA('Arm. pesante sporca')),
  p('pigiama-del-succube', 'Pigiama del succube', U, 68, 15, 'Annulla Sonno', LAVA('Attrezzatura spettrale')),
  p('coll-cavaliere-felino', 'Coll. cavaliere felino', G, 70, 14, 'Ma +3', LAVA('Stivali sporchi')),
  p('manto-dellangelo', 'Manto dell’angelo', F, 71, 11, 'Evita magia (medio)', LAVA('Arm. sporca da donna')),
  p('vestito-zen', 'Vestito zen', U, 86, 12, 'Ag +3', FORZIERE('Palazzo di Madarame (Sala del Tesoro)')),
  p('sciarpa-mitica-vecchia', 'Sciarpa mitica vecchia', G, 86, 15, 'Ag +1', LAVA_CESTA('Armatura dell’anziano', 'dopo la scadenza del Palazzo di Madarame')),
  p('maglione-a-collo-alto', 'Maglione a collo alto', F, 88, 12, '', PRED('Makoto')),
  p('cheongsam-vecchio', 'Cheongsam vecchio', F, 88, 12, 'Ag +1', LAVA_CESTA('Cheongsam sporco', 'dopo la scadenza del Palazzo di Madarame')),
  p('vest-spettrale-vecc', 'Vest. spettrale vecc.', M, 94, 7, 'Riduce danno fisico (basso)', LAVA_CESTA('Yorishiro sporco', 'dopo la scadenza del Palazzo di Madarame')),
  p('sciarpa-mitica', 'Sciarpa mitica', G, 102, 15, 'Ag +3', LAVA('Armatura dell’anziano')),
  p('cheongsam-fatato', 'Cheongsam fatato', F, 104, 12, 'Ag +3', LAVA('Cheongsam sporco')),
  p('top-rosa', 'Top rosa', F, 108, 12, '', PRED('Haru')),
  p('armatura-vecchia', 'Armatura vecchia', G, 109, 16, 'Evita psicocinesi (medio)', LAVA_CESTA('Armatura felina sporca', 'durante l’arco del Palazzo di Kaneshiro')),
  p('vestito-degli-shikigami', 'Vestito degli shikigami', M, 110, 7, 'Riduce danno fisico (medio)', LAVA('Yorishiro sporco')),
  p('grembiule-imp-vecchio', 'Grembiule imp. vecchio', F, 111, 13, '+10 HP', LAVA_CESTA('Attrezzatura orchessa', 'durante l’arco del Palazzo di Kaneshiro')),
  p('haori-vecchio', 'Haori vecchio', M, 118, 8, 'Rs +1', LAVA_CESTA('Arm. da uomo sporca', 'durante l’arco del Palazzo di Kaneshiro')),
  p('maglietta-larga', 'Maglietta larga', F, 128, 19, '', PRED('Futaba')),
  p('armatura-nekomata', 'Armatura Nekomata', G, 129, 16, 'Evita psicocinesi (alto)', LAVA('Armatura felina sporca')),
  p('veste-dellodio', 'Veste dell’odio', F, 129, 12, 'Previene morte istantanea da Maledizione', FORZIERE('Palazzo di Futaba (Camera del Santuario)')),
  p('grembiule-impetuoso', 'Grembiule impetuoso', F, 132, 13, '+30 HP', LAVA('Attrezzatura orchessa')),
  p('sciarpa-serp-vecchia', 'Sciarpa serp. vecchia', G, 134, 18, 'Rs +1', LAVA_CESTA('Pelle serpente sporca', 'durante l’arco del Palazzo di Futaba')),
  p('veste-vecchia', 'Veste vecchia', F, 137, 15, '+10 SP', LAVA_CESTA('Attrezzatura divina sporca', 'durante l’arco del Palazzo di Futaba')),
  p('haori-disonorato', 'Haori disonorato', M, 140, 8, 'Rs +5', LAVA('Arm. da uomo sporca')),
  p('manto-vecchio', 'Manto vecchio', M, 146, 10, '+10 SP', LAVA_CESTA('Soprab. lupo sporco', 'durante l’arco del Palazzo di Futaba')),
  p('sciarpa-del-serpente', 'Sciarpa del serpente', G, 158, 18, 'Rs +5', LAVA('Pelle serpente sporca')),
  p('veste-arcana', 'Veste arcana', F, 161, 15, '+30 SP', LAVA('Attrezzatura divina sporca')),
  p('vecchia-sciarpa-vistosa', 'Vecchia sciarpa vistosa', G, 161, 19, 'Riduce danno elettrico (basso)', LAVA_CESTA('Manto di piume sporco', 'durante l’arco del Palazzo di Okumura')),
  p('vecchia-canottiera', 'Vecchia canottiera', F, 164, 16, 'Resiste Soggiogamento', LAVA_CESTA('Armatura astrale sporca', 'durante l’arco del Palazzo di Okumura')),
  p('camicia-formale', 'Camicia formale', M, 168, 23, '', PRED('Akechi')),
  p('sacra-sindone-reale', 'Sacra sindone reale', U, 171, 10, '+30 SP', LAVA('Soprab. lupo sporco')),
  p('vecchia-veste-mimetica', 'Vecchia veste mimetica', M, 174, 11, 'Riflette attacchi fisici (basso)', LAVA_CESTA('Armatura nera sporca', 'durante l’arco del Palazzo di Okumura')),
  p('sciarpa-vistosa', 'Sciarpa vistosa', G, 189, 19, 'Riduce danno elettrico (medio)', LAVA('Manto di piume sporco')),
  p('collare-puro-vecchio', 'Collare puro vecchio', G, 190, 20, 'Fo +1', LAVA_CESTA('Corno sporco', 'durante l’arco del Palazzo di Niijima')),
  p('canottiera-diavoletto', 'Canottiera diavoletto', F, 193, 16, 'Annulla Soggiogamento', LAVA('Armatura astrale sporca')),
  p('vecchia-calzamaglia', 'Vecchia calzamaglia', F, 194, 17, 'Rs +1', LAVA_CESTA('Veste truffatore sporca', 'durante l’arco del Palazzo di Niijima')),
  p('veste-mimetica', 'Veste mimetica', M, 205, 11, 'Riflette attacchi fisici (medio)', LAVA('Armatura nera sporca')),
  // la guida ha due «Veste vecchia» diverse (una femminile, una maschile): la seconda ha la chiave con «maschile»
  p('veste-vecchia-maschile', 'Veste vecchia', M, 206, 12, 'Fr +1', LAVA_CESTA('Pell. maculata sporca', 'durante l’arco del Palazzo di Niijima')),
  p('sciarpa-leone-vecchia', 'Sciarpa leone vecchia', G, 221, 22, 'Evita att. fisici (basso)', LAVA_CESTA('Criniera leone sporca', 'durante l’arco del Palazzo di Shido')),
  p('collare-puro', 'Collare puro', G, 224, 20, 'Fo +6', LAVA('Corno sporco')),
  p('khamrai-tao-vecchio', 'Khamrai Tao vecchio', F, 226, 19, 'Riduce danno fuoco (basso)', LAVA_CESTA('Regalia sporca', 'durante l’arco del Palazzo di Shido')),
  p('calzamaglia-nera-divina', 'Calzamaglia nera divina', F, 228, 17, 'Rs +6', LAVA('Veste truffatore sporca')),
  p('gilet-primate-vecchio', 'Gilet primate vecchio', M, 240, 14, 'Ag +1', LAVA_CESTA('Pelliccia di scimmia', 'durante l’arco del Palazzo di Shido')),
  p('canottiera-leggera', 'Canottiera leggera', F, 241, 20, '', PRED('Kasumi')),
  p('veste-leopardata', 'Veste leopardata', M, 243, 12, 'Fr +6', LAVA('Pell. maculata sporca')),
  p('sciarpa-del-leone', 'Sciarpa del leone', G, 259, 22, 'Evita att. fisici (medio)', LAVA('Criniera leone sporca')),
  p('khamrai-tao', 'Khamrai Tao', F, 265, 19, 'Riduce danno fuoco (alto)', LAVA('Regalia sporca')),
  p('canottiera-del-caos', 'Canottiera del caos', M, 266, 20, '', 'Protezione predefinita di Akechi (dal Palazzo di Maruki)'),
  p('gilet-primate', 'Gilet primate', M, 282, 14, 'Ag +6', LAVA('Pelliccia di scimmia')),
  p('sciarpa-infin-vecchia', 'Sciarpa infin. vecchia', G, 291, 23, '+10 HP', LAVA('Collare dorato sporco')),
  p('bikini-peccam-vecchio', 'Bikini peccam. vecchio', F, 298, 20, '+10 SP', LAVA('Veste da ribelle sporca')),
  p('sciarpa-drago-vecchia', 'Sciarpa drago vecchia', G, 301, 23, 'Riduce danno fisico (basso)', LAVA_CESTA('Arm. a scaglie sporca', 'durante l’arco del Palazzo di Maruki')),
  p('sciarpa-senza-fondo', 'Sciarpa senza fondo', G, 305, 23, '+50 HP', LAVA('Collare dorato sporco')),
  p('vestito-dorato', 'Vestito dorato', F, 306, 19, 'Ag +5', FORZIERE('Palazzo di Maruki (Ala ricerca)')),
  p('veste-da-strega-vecchia', 'Veste da strega vecchia', F, 307, 20, 'Ma +1', LAVA_CESTA('Armatura scura sporca', 'durante l’arco del Palazzo di Maruki')),
  p('bikini-pecaminoso', 'Bikini pecaminoso', F, 311, 20, '+50 SP', LAVA('Veste da ribelle sporca')),
  p('biancheria-vecchia', 'Biancheria vecchia', M, 316, 15, '+10 HP', LAVA('Armatura del fulmine')),
  p('sciarpa-del-drago', 'Sciarpa del drago', G, 318, 23, 'Riduce danno fisico (alto)', LAVA('Arm. a scaglie sporca')),
  p('veste-strega-adorab', 'Veste strega adorab.', F, 324, 20, 'Ma +8', LAVA('Armatura scura sporca')),
  p('calzam-nera-vecchia', 'Calzam. nera vecchia', M, 326, 15, 'Ma +1', LAVA_CESTA('Veste da danza sporca', 'durante l’arco del Palazzo di Maruki')),
  p('biancheria-fortunata', 'Biancheria fortunata', M, 330, 15, '+50 HP', LAVA('Armatura del fulmine')),
  p('calzamaglia-della-morte', 'Calzamaglia della morte', M, 345, 15, 'Ma +8', LAVA('Veste da danza sporca')),
];

/**
 * Le armi a distanza che la scheda aveva come «arma» (mischia): 19 righe della pagina, 18 schede (l'Eliminatore compare due volte, e la
 * seconda riga è l'arma di Haru, nuova). Il rapporto d'analisi N §2.1 ne contava 20, per differenza fra le 190 schede «arma» e le armi da
 * mischia della guida; qui si riclassifica solo una scheda che ha la sua riga, per nome, fra le armi a distanza della pagina: sono 18. La colonna `categoria` passa ad «arma-da-fuoco», la chiave resta. La Replica d'arma resta materiale:
 * la guida la mette fra le armi di Joker, ma il suo uso è la trasmutazione e la scheda la tratta come tale.
 */
export const ARMI_DA_RICLASSIFICARE: readonly string[] = [
  'arma/governance', 'arma/makaronov', 'arma/falco-delle-sabbie', 'arma/eliminatore', 'arma/pistola-cremisi', 'arma/paradisiaco', 'arma/cocito',
  'arma/pistolapide', 'arma/jig-227', 'arma/inversione', 'arma/falco', 'arma/balalaika', 'arma/star-h', 'arma/senza-limiti', 'arma/milkor',
  'arma/sirius', 'arma/cinque-rosso', 'arma/ragazza-gialla',
];

/** I nomi della guida di schede già presenti con un altro nome (varianti, abbreviazioni, un abito unico per due versioni): si aggiungono agli altri nomi. */
export const ALIAS: ReadonlyArray<{ chiave: string; nome: string }> = [
  { chiave: 'protezione/haori-di-turno-di-notte', nome: 'Haori turno di notte' },
  { chiave: 'arma/coltello-per-scuoiare-pro', nome: 'Colt. per scuoiare pro' },
  { chiave: 'arma/pugno-acciaio', nome: 'Pugno d’acciaio' },
  { chiave: 'altro/costume-da-trish-v1-e-v2', nome: 'Costume da Trish v1' },
  { chiave: 'altro/costume-da-trish-v1-e-v2', nome: 'Costume da Trish v2' },
  { chiave: 'altro/uniforme-da-agente-ombra', nome: 'Uniforme Agente Ombra' },
];
