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
  // Le categorie nuove degli articoli in vendita. Quasi tutte hanno già la figura col loro stesso
  // nome — `cura`, `sp`, `battaglia`, `stato`, `esplorazione`, `film`, `dvd`, `cibo` — e non hanno
  // bisogno di stare qui; `libro` e `videogioco` erano già tradotti sopra. Resta l'oggetto chiave,
  // che il file scrive al plurale.
  'oggetto-chiave': 'oggetti-chiave',
  // Le categorie dell'archivio degli equipaggiamenti sono le chiavi inglesi del dataset (`Weapon`,
  // `Gun`, `Protector`, `Accessory`), come per le skill: il nome italiano lo dà la tabella
  // `traduzione`, e qui si dà loro la figura. Un'arma da fuoco e una da mischia condividono la
  // stessa (il pugnale): sono la stessa famiglia nel negozio di Iwai.
  weapon: 'armi', gun: 'armi', protector: 'protezioni', accessory: 'accessori',
};

/** La chiave dell'illustrazione (e della riserva SVG) per una categoria come la scrivono i dati. */
export function chiaveCategoria(categoria: string): string {
  return ALIAS[categoria] ?? categoria;
}
