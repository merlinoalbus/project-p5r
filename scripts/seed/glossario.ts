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

/** Doti sociali (per il tracking partita). I titoli dei ranghi arrivano con la fase 6 (fonte: guida italiana). */
export const DOTI_SOCIALI: Array<{ chiave: string; nome: string }> = [
  { chiave: 'conoscenza', nome: 'Conoscenza' },
  { chiave: 'fascino', nome: 'Fascino' },
  { chiave: 'coraggio', nome: 'Coraggio' },
  { chiave: 'gentilezza', nome: 'Gentilezza' },
  { chiave: 'perizia', nome: 'Perizia' },
];

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
