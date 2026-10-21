// Dati e riconoscimenti congelati della sola M7: mai interpretare la prosa a runtime.
export const PREMI_ESAMI_121 = [
  { esame: 'esame-1', nome: 'Cintura resistente', effetto: 'Aumenta automaticamente la Difesa quando comincia lo scontro.', periodo: '20–27 maggio' },
  { esame: 'esame-2', nome: 'Specchio del damerino', effetto: 'Contrattacco: può riflettere un attacco fisico (15%).', periodo: '19–26 luglio' },
  { esame: 'esame-3', nome: 'Pendente del Leblanc', effetto: 'Immunità allo stato Sonno.', periodo: '24–31 ottobre' },
  { esame: 'esame-4', nome: 'Intimo del capo', effetto: 'Stoicismo: sopravvive con 1 HP al colpo fatale, una volta nello scontro.', periodo: '22–23 dicembre' },
] as const;
export const FONTE_PREMI_ESAMI_121 = 'https://www.allgamestaff.it/persona-5-royal/interrogazioni-esami-risposte/';

const DONATORI_121: Readonly<Record<string, string>> = {
  Morgana: 'morgana', Makoto: 'makoto', Haru: 'haru', Yusuke: 'yusuke', Sojiro: 'sojiro', Ann: 'ann',
  Ryuji: 'ryuji', Futaba: 'futaba', Chihaya: 'chihaya', Lavenza: 'gemelle', Iwai: 'iwai', Takemi: 'takemi',
  Kawakami: 'kawakami', Ohya: 'ohya', Shinya: 'shinya', Hifumi: 'hifumi', Mishima: 'mishima',
  Yoshida: 'yoshida', Sae: 'sae', Sumire: 'kasumi',
};
/** Solo la dichiarazione esplicita del donatore, non una menzione di requisiti/abilità. */
export function donatoreOggetto121(dove: string): string | null {
  const nome = /^Dono di (.+?)(?=,| al Rango| \(| durante |$)/.exec(dove)?.[1];
  return nome ? DONATORI_121[nome] ?? null : null;
}

/** Livello e punteggio qualificano il premio, non fanno parte dell'identità dell'oggetto. */
export function premioSfida121(testo: string): { testo: string; nota: string } | null {
  const parti = /^((?:Lv (?:\d+|\?{3}) - )?[\d.]+ pt):\s+(.+)$/.exec(testo);
  return parti ? { testo: parti[2], nota: parti[1] } : null;
}
