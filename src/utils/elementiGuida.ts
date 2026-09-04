// ============================================================
// elementiGuida — dal nome italiano di un elemento scritto nella guida («Tuono», «Maledizione (dimezza)») alla chiave canonica dell'elemento
// ============================================================

const CORRISPONDENZE: Array<[RegExp, string]> = [
  // «Fisico», «Danno fisico», «Danni fisici», «Attacchi fisici»
  [/(^|\s)fisic/i, 'phys'],
  [/^(arma|armi|pistol|proiettil|sparo|fuoco d'arma)/i, 'gun'],
  [/^(fuoco|fiamm|ign)/i, 'fire'],
  [/^(ghiacc|gelo|freddo|glaci)/i, 'ice'],
  [/^(tuono|elettr|fulmin|scarica)/i, 'electric'],
  [/^(vento|aria|raffic)/i, 'wind'],
  [/^(psi|psichic|mental)/i, 'psy'],
  [/^(nucle|atomic)/i, 'nuclear'],
  [/^(sacro|benedi|luce|santo|divino(?!-))/i, 'bless'],
  [/^(maledi|oscur|tenebr|buio)/i, 'curse'],
  [/^(quasi-divin|quasidivin|onnipot)/i, 'almighty'],
];

/** Chiave dell'elemento (`fire`, `curse`, …) riconosciuta dal testo della guida; null se non è un elemento. */
export function chiaveElementoDaTesto(testo: string): string | null {
  const base = testo.replace(/\(.*?\)/g, '').trim();
  for (const [re, chiave] of CORRISPONDENZE) if (re.test(base)) return chiave;
  return null;
}
