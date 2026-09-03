// ============================================================
// Glossario italiano — rese ufficiali/curate dei termini di gioco
// ============================================================
//
// Le chiavi sono i valori canonici del dataset (inglese); i valori sono
// la resa italiana mostrata nell'app. Fonti: localizzazione italiana di
// Persona 5 Royal (guide allgamestaff.it e pixelflood.it fornite
// dall'utente) e convenzioni della serie. Modificabili poi dall'app
// tramite la tabella `traduzione`.
// ============================================================

/** Arcani nell'ordine canonico della tabella di fusione. */
export const ARCANI: Array<{ chiave: string; nome: string; numero: number | null }> = [
  { chiave: 'Fool', nome: 'Matto', numero: 0 },
  { chiave: 'Magician', nome: 'Mago', numero: 1 },
  { chiave: 'Priestess', nome: 'Papessa', numero: 2 },
  { chiave: 'Empress', nome: 'Imperatrice', numero: 3 },
  { chiave: 'Emperor', nome: 'Imperatore', numero: 4 },
  { chiave: 'Hierophant', nome: 'Ierofante', numero: 5 },
  { chiave: 'Lovers', nome: 'Amanti', numero: 6 },
  { chiave: 'Chariot', nome: 'Carro', numero: 7 },
  { chiave: 'Justice', nome: 'Giustizia', numero: 8 },
  { chiave: 'Hermit', nome: 'Eremita', numero: 9 },
  { chiave: 'Fortune', nome: 'Fortuna', numero: 10 },
  { chiave: 'Strength', nome: 'Forza', numero: 11 },
  { chiave: 'Hanged', nome: 'Appeso', numero: 12 },
  { chiave: 'Death', nome: 'Morte', numero: 13 },
  { chiave: 'Temperance', nome: 'Temperanza', numero: 14 },
  { chiave: 'Devil', nome: 'Diavolo', numero: 15 },
  { chiave: 'Tower', nome: 'Torre', numero: 16 },
  { chiave: 'Star', nome: 'Stella', numero: 17 },
  { chiave: 'Moon', nome: 'Luna', numero: 18 },
  { chiave: 'Sun', nome: 'Sole', numero: 19 },
  { chiave: 'Judgement', nome: 'Giudizio', numero: 20 },
  { chiave: 'Faith', nome: 'Fede', numero: null },
  { chiave: 'Councillor', nome: 'Consigliere', numero: null },
  { chiave: 'World', nome: 'Mondo', numero: 21 },
];

/** Elementi delle skill (chiave `element` del dataset). */
export const ELEMENTI_SKILL: Record<string, string> = {
  phys: 'Fisico',
  gun: 'Arma da fuoco',
  fire: 'Fuoco',
  ice: 'Ghiaccio',
  electric: 'Elettricità',
  wind: 'Vento',
  psy: 'Psichico',
  nuclear: 'Nucleare',
  bless: 'Sacro',
  curse: 'Oscurità',
  almighty: 'Quasi-divino',
  ailment: 'Alterazione',
  healing: 'Guarigione',
  support: 'Supporto',
  passive: 'Passiva',
  trait: 'Tratto',
};

/** Ordine e nomi degli elementi delle affinità (array `elems` del dataset). */
export const ELEMENTI_AFFINITA: Array<{ chiave: string; nome: string; sigla: string }> = [
  { chiave: 'phys', nome: 'Fisico', sigla: 'Fis' },
  { chiave: 'gun', nome: 'Arma da fuoco', sigla: 'Arm' },
  { chiave: 'fire', nome: 'Fuoco', sigla: 'Fuo' },
  { chiave: 'ice', nome: 'Ghiaccio', sigla: 'Ghi' },
  { chiave: 'electric', nome: 'Elettricità', sigla: 'Ele' },
  { chiave: 'wind', nome: 'Vento', sigla: 'Ven' },
  { chiave: 'psy', nome: 'Psichico', sigla: 'Psi' },
  { chiave: 'nuclear', nome: 'Nucleare', sigla: 'Nuc' },
  { chiave: 'bless', nome: 'Sacro', sigla: 'Sac' },
  { chiave: 'curse', nome: 'Oscurità', sigla: 'Osc' },
];

/** Codici di affinità. */
export const AFFINITA: Record<string, { nome: string; sigla: string }> = {
  '-': { nome: 'Normale', sigla: '—' },
  wk: { nome: 'Debole', sigla: 'Deb' },
  rs: { nome: 'Resiste', sigla: 'Res' },
  nu: { nome: 'Annulla', sigla: 'Ann' },
  rp: { nome: 'Riflette', sigla: 'Rif' },
  ab: { nome: 'Assorbe', sigla: 'Ass' },
};

/** Tipi di eredità delle skill (chiave `inherits` del dataset). */
export const TIPI_EREDITA: Record<string, string> = {
  Physical: 'Fisico',
  Fire: 'Fuoco',
  Ice: 'Ghiaccio',
  Electric: 'Elettricità',
  Wind: 'Vento',
  Psy: 'Psichico',
  Nuclear: 'Nucleare',
  Bless: 'Sacro',
  Curse: 'Oscurità',
  Healing: 'Guarigione',
  Ailment: 'Alterazione',
  Almighty: 'Quasi-divino',
};

/** Colonne della matrice di eredità (ordine del dataset chinhodado). */
export const COLONNE_EREDITA: Array<{ chiave: string; nome: string }> = [
  { chiave: 'phys', nome: 'Fisico' },
  { chiave: 'gun', nome: 'Arma da fuoco' },
  { chiave: 'fire', nome: 'Fuoco' },
  { chiave: 'ice', nome: 'Ghiaccio' },
  { chiave: 'electric', nome: 'Elettricità' },
  { chiave: 'wind', nome: 'Vento' },
  { chiave: 'psy', nome: 'Psichico' },
  { chiave: 'nuclear', nome: 'Nucleare' },
  { chiave: 'bless', nome: 'Sacro' },
  { chiave: 'curse', nome: 'Oscurità' },
  { chiave: 'healing', nome: 'Guarigione' },
  { chiave: 'ailment', nome: 'Alterazione' },
];

/** Statistiche (ordine dell'array `stats`: St, Ma, En, Ag, Lu). */
export const STATISTICHE: Array<{ chiave: string; nome: string; sigla: string }> = [
  { chiave: 'forza', nome: 'Forza', sigla: 'FR' },
  { chiave: 'magia', nome: 'Magia', sigla: 'MA' },
  { chiave: 'resistenza', nome: 'Resistenza', sigla: 'RS' },
  { chiave: 'agilita', nome: 'Agilità', sigla: 'AG' },
  { chiave: 'fortuna', nome: 'Fortuna', sigla: 'FO' },
];

/** Categorie degli oggetti da esecuzione (prima parte di `type` in ItemDataRoyal). */
export const TIPI_OGGETTO: Record<string, string> = {
  Accessory: 'Accessorio',
  Weapon: 'Arma da mischia',
  Gun: 'Arma a distanza',
  Protector: 'Protezione',
};

/** Vincoli d'uso degli oggetti (seconda parte di `type`, senza "only"). */
export const VINCOLI_OGGETTO: Record<string, string> = {
  Joker: 'Solo Joker',
  Morgana: 'Solo Morgana',
  Ryuji: 'Solo Ryuji',
  Ann: 'Solo Ann',
  Yusuke: 'Solo Yusuke',
  Makoto: 'Solo Makoto',
  Haru: 'Solo Haru',
  Akechi: 'Solo Akechi',
  Kasumi: 'Solo Kasumi',
  Women: 'Solo donne',
  Men: 'Solo uomini',
  Unisex: 'Unisex',
};

/** Aree di Mementos (chiave `area` del dataset) — "Dedalo di …" nella localizzazione italiana. */
export const AREE_MEMENTOS: Record<string, string> = {
  Qimranut: 'Dedalo di Qimranut',
  Aiyatsbus: 'Dedalo di Aiyatsbus',
  Chemdah: 'Dedalo di Chemdah',
  Kaitul: 'Dedalo di Kaitul',
  Akzeriyyuth: 'Dedalo di Akzeriyyuth',
  Adyeshach: 'Dedalo di Adyeshach',
  Sheriruth: 'Dedalo di Sheriruth',
  Iweleth: 'Dedalo di Iweleth',
  "Da'at": "Dedalo di Da'at",
};

/**
 * Doti sociali con i 5 ranghi (titolo italiano e soglia di punti per raggiungerlo).
 * Fonti: https://www.allgamestaff.it/persona-5-royal/doti-sociali/ (titoli e soglie) e Megami Tensei Wiki,
 * pagina "Social Stats", tabella Persona 5 Royal (soglie identiche). Il rango 1 parte da 0 punti.
 * Note visualizzate → punti: 1 nota = 2, 2 note = 3, 3 note = 5 (7 con libri specifici); moltiplicatore ×1,5
 * (lettura della fortuna di Chihaya) arrotondato per difetto, massimo 10.
 */
export const DOTI_SOCIALI: Array<{ chiave: string; nome: string; ranghi: Array<{ rango: number; nome: string; soglia: number }> }> = [
  { chiave: 'conoscenza', nome: 'Conoscenza', ranghi: [{ rango: 1, nome: 'Ignorante', soglia: 0 }, { rango: 2, nome: 'Diligente', soglia: 34 }, { rango: 3, nome: 'Studioso', soglia: 82 }, { rango: 4, nome: 'Dotto', soglia: 126 }, { rango: 5, nome: 'Erudito', soglia: 192 }] },
  { chiave: 'fascino', nome: 'Fascino', ranghi: [{ rango: 1, nome: 'Indifferente', soglia: 0 }, { rango: 2, nome: 'Interessante', soglia: 6 }, { rango: 3, nome: 'Affascinante', soglia: 52 }, { rango: 4, nome: 'Carismatico', soglia: 92 }, { rango: 5, nome: 'Irresistibile', soglia: 132 }] },
  { chiave: 'coraggio', nome: 'Coraggio', ranghi: [{ rango: 1, nome: 'Pavido', soglia: 0 }, { rango: 2, nome: 'Audace', soglia: 11 }, { rango: 3, nome: 'Coraggioso', soglia: 38 }, { rango: 4, nome: 'Temerario', soglia: 68 }, { rango: 5, nome: 'Cuor di leone', soglia: 113 }] },
  { chiave: 'gentilezza', nome: 'Gentilezza', ranghi: [{ rango: 1, nome: 'Inoffensivo', soglia: 0 }, { rango: 2, nome: 'Gentile', soglia: 14 }, { rango: 3, nome: 'Empatico', soglia: 47 }, { rango: 4, nome: 'Altruista', soglia: 92 }, { rango: 5, nome: 'Angelico', soglia: 136 }] },
  { chiave: 'perizia', nome: 'Perizia', ranghi: [{ rango: 1, nome: 'Incapace', soglia: 0 }, { rango: 2, nome: 'Decente', soglia: 12 }, { rango: 3, nome: 'Bravo', soglia: 34 }, { rango: 4, nome: 'Asso', soglia: 60 }, { rango: 5, nome: 'Migliore', soglia: 87 }] },
];

/** Punti assegnati per numero di note visualizzate (stadio normale) e con libri a resa maggiorata. */
export const PUNTI_PER_NOTE: Record<1 | 2 | 3, number> = { 1: 2, 2: 3, 3: 5 };
export const PUNTI_TRE_NOTE_LIBRO = 7;
export const MOLTIPLICATORE_FORTUNA = 1.5;

/** Note di disponibilità delle Persona (campo `note` del dataset). */
export const NOTE_PERSONA: Record<string, string> = {
  'Only available after 1/12': 'Disponibile solo dopo il 12/1',
  'Only available on NG+': 'Disponibile solo in Nuova Partita +',
};

/** Fonti esclusive delle skill (campo `unique`) che NON sono Persona del compendio. */
export const FONTI_ESCLUSIVE: Record<string, string> = {
  Enemies: 'Solo nemici',
  'Ring of Envy': "Anello dell'Invidia",
  'Ring of Gluttony': 'Anello della Gola',
  'Ring of Greed': "Anello dell'Avidità",
  'Ring of Lust': 'Anello della Lussuria',
  'Ring of Pride': 'Anello della Superbia',
  'Ring of Sorrow': 'Anello della Tristezza',
  'Ring of Vanity': 'Anello della Vanità',
  'Ring of Wrath': "Anello dell'Ira",
};

/** Luoghi delle uscite con le Gemelle Custodi (prefisso "CJ" del campo `card`). */
export const LUOGHI_GEMELLE: Record<string, string> = {
  'Art Museum': "Museo d'arte",
  BBB: 'Big Bang Burger',
  Beach: 'Spiaggia',
  Church: 'Chiesa',
  Gym: 'Palestra',
  Leblanc: 'Leblanc',
  'Maid Cafe': 'Maid café',
  'Sky Tree': 'Sky Tree',
  Theater: 'Cinema',
  'Destiny Land': 'Destiny Land',
  'Underground Mall': 'Centro commerciale sotterraneo',
  Aquarium: 'Acquario',
};

/** Tipi di Battaglia Sfida (campo `card`: "<tipo> <punteggio>"). */
export const BATTAGLIE_SFIDA: Record<string, string> = {
  Trial: 'Sfida Prova',
  Chain: 'Sfida Catena',
  Technician: 'Sfida Tecnica',
  'Full Moon': 'Sfida Luna Piena',
  'Foggy Day': 'Sfida Giorno di Nebbia',
  Trickster: 'Sfida Trickster',
};

/**
 * Traduce una fonte carta del dataset ("Jazz 1/15 Foggy Day 50", "CJ Gym Trickster 50",
 * "L Leblanc", "Network Fusion", "Ring of Lust", "Trial 20"). Restituisce null se un
 * frammento non è riconosciuto (il normalizzatore lo tratta come errore).
 */
export function traduciFonteCarta(fonte: string): string | null {
  const parti: string[] = [];
  let resto = fonte.trim();
  while (resto.length > 0) {
    let m: RegExpMatchArray | null;
    if ((m = resto.match(/^Jazz (\d+)(?:\s|$)/))) {
      parti.push(`Jazz Club, visita n. ${m[1]}`);
    } else if ((m = resto.match(/^Jazz ((?:\d{1,2}\/\d{1,2}\s?)+)/))) {
      const date = m[1].trim().split(/\s+/).map((d) => d.split('/').reverse().join('/'));
      parti.push(`Jazz Club il ${date.join(' o il ')}`);
    } else if ((m = resto.match(/^CJ (Art Museum|BBB|Beach|Church|Gym|Leblanc|Maid Cafe|Sky Tree|Theater|Destiny Land|Underground Mall|Aquarium)/))) {
      parti.push(`uscita con le Gemelle Custodi: ${LUOGHI_GEMELLE[m[1]]}`);
    } else if ((m = resto.match(/^L Leblanc/))) {
      parti.push('Lavenza al Leblanc');
    } else if ((m = resto.match(/^(Trial|Chain|Technician|Full Moon|Foggy Day|Trickster) (\d+|\?\?\?)/))) {
      parti.push(`${BATTAGLIE_SFIDA[m[1]]} ${m[2] === '???' ? '(punteggio da verificare)' : `(punteggio ${m[2]})`}`);
    } else if ((m = resto.match(/^Network Fusion/))) {
      parti.push('Fusione in rete');
    } else if ((m = resto.match(/^Fusion Mutation/))) {
      parti.push('Mutazione da fusione');
    } else if ((m = resto.match(/^Ring of \w+/)) && FONTI_ESCLUSIVE[m[0]]) {
      parti.push(FONTI_ESCLUSIVE[m[0]]);
    } else {
      return null;
    }
    resto = resto.slice(m[0].length).trim();
  }
  return parti.join('; ');
}

/** I 23 Confidenti di Persona 5 Royal (fonte: guida allgamestaff.it), con l'arcano canonico. */
/**
 * Confidenti con i punti necessari per il passaggio di rango (indice 0 = 1→2 … indice 8 = 9→10).
 * 0 = passaggio non legato ai punti (storia, richiesta, dote sociale, automatico); array assente = progressione
 * senza punti (storia, richieste di Mishima, fusioni delle Gemelle). Fonti: guida Steam 2877810456 e
 * walkthrough aqiu384 (121/122 celle concordi; Akechi 6→7 = 55 da aqiu384, Steam riporta 0). Vedi docs/riferimenti/confidenti-punti.md.
 */
export const CONFIDENTI: Array<{ chiave: string; nome: string; arcana: string; puntiPerRango?: number[] }> = [
  { chiave: 'igor', nome: 'Igor', arcana: 'Fool' },
  { chiave: 'morgana', nome: 'Morgana', arcana: 'Magician' },
  { chiave: 'makoto', nome: 'Makoto Niijima', arcana: 'Priestess', puntiPerRango: [0, 0, 15, 20, 20, 20, 30, 20, 55] },
  { chiave: 'haru', nome: 'Haru Okumura', arcana: 'Empress', puntiPerRango: [0, 0, 14, 28, 15, 20, 40, 22, 20] },
  { chiave: 'yusuke', nome: 'Yusuke Kitagawa', arcana: 'Emperor', puntiPerRango: [0, 0, 25, 15, 25, 20, 26, 22, 35] },
  { chiave: 'sojiro', nome: 'Sojiro Sakura', arcana: 'Hierophant', puntiPerRango: [0, 30, 40, 43, 20, 20, 14, 0, 40] },
  { chiave: 'ann', nome: 'Ann Takamaki', arcana: 'Lovers', puntiPerRango: [0, 35, 25, 20, 35, 45, 30, 67, 35] },
  { chiave: 'ryuji', nome: 'Ryuji Sakamoto', arcana: 'Chariot', puntiPerRango: [0, 20, 30, 20, 30, 45, 45, 60, 60] },
  { chiave: 'akechi', nome: 'Goro Akechi', arcana: 'Justice', puntiPerRango: [0, 0, 23, 40, 0, 55, 0, 0, 0] },
  { chiave: 'futaba', nome: 'Futaba Sakura', arcana: 'Hermit', puntiPerRango: [0, 0, 10, 15, 26, 21, 0, 30, 35] },
  { chiave: 'chihaya', nome: 'Chihaya Mifune', arcana: 'Fortune', puntiPerRango: [0, 0, 15, 15, 15, 30, 20, 46, 21] },
  { chiave: 'gemelle', nome: 'Gemelle Custodi (Caroline e Justine)', arcana: 'Strength' },
  { chiave: 'iwai', nome: 'Munehisa Iwai', arcana: 'Hanged', puntiPerRango: [0, 5, 15, 25, 40, 40, 0, 25, 40] },
  { chiave: 'takemi', nome: 'Tae Takemi', arcana: 'Death', puntiPerRango: [0, 0, 11, 20, 11, 11, 0, 42, 36] },
  { chiave: 'kawakami', nome: 'Sadayo Kawakami', arcana: 'Temperance', puntiPerRango: [0, 20, 37, 0, 11, 37, 0, 0, 0] },
  { chiave: 'ohya', nome: 'Ichiko Ohya', arcana: 'Devil', puntiPerRango: [0, 0, 12, 15, 25, 22, 0, 21, 38] },
  { chiave: 'shinya', nome: 'Shinya Oda', arcana: 'Tower', puntiPerRango: [0, 0, 11, 14, 20, 25, 0, 0, 30] },
  { chiave: 'hifumi', nome: 'Hifumi Togo', arcana: 'Star', puntiPerRango: [0, 0, 10, 14, 14, 22, 0, 30, 30] },
  { chiave: 'mishima', nome: 'Yuuki Mishima', arcana: 'Moon' },
  { chiave: 'yoshida', nome: 'Toranosuke Yoshida', arcana: 'Sun', puntiPerRango: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { chiave: 'sae', nome: 'Sae Niijima', arcana: 'Judgement' },
  { chiave: 'kasumi', nome: 'Kasumi Yoshizawa', arcana: 'Faith', puntiPerRango: [0, 15, 51, 20, 0, 0, 55, 40, 80] },
  { chiave: 'maruki', nome: 'Takuto Maruki', arcana: 'Councillor', puntiPerRango: [0, 0, 28, 42, 32, 28, 60, 30, 0] },
];
