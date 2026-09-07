// ============================================================
// categorie — le chiavi dei dati ricondotte alla figura che le illustra
// ============================================================
//
// Il database dice `arma`, `protezione`, `accessorio`, `regalo`, `materiale`, `abito` — al
// **singolare**, perché lì è la categoria di un articolo; il percorso dice `libro` e `lavoro`; le
// attività dicono `mini-gioco` e `videogioco`. Le illustrazioni invece si chiamano al plurale,
// come la sezione che intitolano: `ui/categoria-armi`, `ui/categoria-libri`.
//
// Senza questa tabella le 143 armi, le 62 protezioni e i 72 accessori del catalogo restavano sul
// cartiglio rosso di riserva **anche dopo** che l'illustrazione giusta era stata consegnata:
// l'asset c'era, la chiave non lo trovava, e `ui/categoria-arma` non esisterà mai perché il file
// si chiama `categoria-armi`. Si traduce qui, una volta sola, e chi disegna ha un nome solo da
// produrre per soggetto invece di uno per sinonimo.
// ============================================================

const ALIAS: Record<string, string> = {
  arma: 'armi', protezione: 'protezioni', accessorio: 'accessori', regalo: 'regali', materiale: 'materiali', abito: 'abiti',
  libro: 'libri', lettura: 'libri', lavoro: 'lavori', 'mini-gioco': 'minigiochi', videogioco: 'minigiochi',
  ambulante: 'misto', consumabile: 'oggetti',
};

/** La chiave dell'illustrazione (e della riserva SVG) per una categoria come la scrivono i dati. */
export function chiaveCategoria(categoria: string): string {
  return ALIAS[categoria] ?? categoria;
}
