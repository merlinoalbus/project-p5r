// ============================================================
// cestino — le parole del cestino (2026-10-16): che cosa c'è dentro, perché una riga non è tornata, dove si trova
// ============================================================
//
// Richiesta dell'utente: «Cestino con ripristino» per le aree dei Palazzi, le voci della guida, le planimetrie e le aree dei
// dedali, in Impostazioni. Ogni conferma di eliminazione di quegli elementi dice dove finiscono (`NEL_CESTINO`), con le stesse
// parole ovunque; la sezione del cestino usa i nomi dei tipi e dei motivi.
// ============================================================

import type { ContenutoCestinoDto, MotivoSaltataCestinoDto, TipoCestino, VoceCestinoUnificatoDto } from '../types';

/** La frase delle conferme di eliminazione: dove finisce l'elemento e come tornarlo indietro. */
export const NEL_CESTINO = 'Finisce nel cestino (Impostazioni → Cestino): da lì la rimetti com’era.';

/** Il nome di un tipo di elemento del cestino. */
export const NOME_TIPO_CESTINO: Record<TipoCestino, string> = {
  area: 'Infiltrazione',
  voce: 'Voce della guida',
  mappa: 'Planimetria',
  pin: 'Pin',
  'area-dedalo': 'Area del dedalo',
  // L2: un'Area del mondo (Central Street, il Sottopasso…) con le sue planimetrie; `area` qui sopra è l'infiltrazione di un Palazzo
  'area-fisica': 'Area',
  luogo: 'Luogo',
  negozio: 'Negozio',
  // L6: una Richiesta dei Mementos
  richiesta: 'Richiesta',
  oggetto: 'Oggetto',
  'voce-diario': 'Voce del Diario',
  partita: 'Partita',
  'fonte-acquisto': 'Registrazione d’acquisto',
  'fonte-pesca': 'Fonte della visita di pesca',
  'sessione-pesca': 'Visita di pesca',
  'osservazione-pesca': 'Osservazione di pesca',
  'persona-scorta': 'Persona della scorta',
  articolo: 'Articolo del negozio',
  libro: 'Libro',
  film: 'Film',
  attivita: 'Attività',
  domanda: 'Domanda',
  cruciverba: 'Cruciverba',
};

/**
 * Perché delle righe non sono tornate com'erano, detto all'utente dopo «N etichetta» — al singolare per una sola. Le frasi
 * concordano solo nel numero, non nel genere: l'etichetta può essere «pin», «planimetria», «voci della guida»…
 */
const MOTIVO_SALTATA_CESTINO: Record<MotivoSaltataCestinoDto, readonly [uno: string, molti: string]> = {
  // «le modifiche restano», non «resta com'è»: dopo un'area rimessa al suo posto l'ordine delle vicine si rinumera, e di una riga
  // spostata dopo resta lo spostamento (l'ordine relativo), non il numero
  'cambiata-dopo': ['con modifiche fatte dopo l’eliminazione: le modifiche restano', 'con modifiche fatte dopo l’eliminazione: le modifiche restano'],
  'non-esiste-piu': ['che nel frattempo non c’è più', 'che nel frattempo non ci sono più'],
  'legame-mancante': ['che punta a qualcosa eliminato dopo: non torna', 'che puntano a qualcosa eliminato dopo: non tornano'],
};

/** Il motivo per `quante` righe saltate. */
export function motivoSaltata(motivo: MotivoSaltataCestinoDto, quante: number): string {
  return MOTIVO_SALTATA_CESTINO[motivo][quante === 1 ? 0 : 1];
}

/**
 * Che cosa si è portato via un elemento, con le parole di chi gioca (UX2-12, 2026-10-20). Il server conta le righe tabella per
 * tabella («1 nome di prima di una mappa», «1 percorso di una mappa», «1 immagine miniatura»): qui restano solo le cose che si
 * riconoscono — aree, planimetrie, pin, immagini, voci… — e i segni delle partite in un conto solo; i dettagli interni (nomi di
 * prima, percorsi, miniature, legami) si tacciono. In ordine di importanza, non di numero.
 */
const PAROLE_CONTENUTO: ReadonlyArray<{ tabelle: readonly string[]; uno: string; molti: string }> = [
  { tabelle: ['dungeon_area'], uno: 'infiltrazione', molti: 'infiltrazioni' },
  { tabelle: ['area'], uno: 'area', molti: 'aree' },
  { tabelle: ['area_dedalo'], uno: 'area del dedalo', molti: 'aree del dedalo' },
  { tabelle: ['mappa'], uno: 'planimetria', molti: 'planimetrie' },
  { tabelle: ['punto_interesse'], uno: 'voce della guida', molti: 'voci della guida' },
  { tabelle: ['spillo'], uno: 'pin', molti: 'pin' },
  { tabelle: ['quartiere_ingresso'], uno: 'ingresso del quartiere', molti: 'ingressi dei quartieri' },
  { tabelle: ['pezzo_mappa'], uno: 'pezzo ritagliato', molti: 'pezzi ritagliati' },
  { tabelle: ['immagine', 'spillo_immagine'], uno: 'immagine', molti: 'immagini' },
  { tabelle: ['richiesta'], uno: 'Richiesta', molti: 'Richieste' },
  { tabelle: ['punto_partita', 'spillo_partita', 'spunta_voce_partita', 'timbri_dedalo_partita'], uno: 'segno nelle partite', molti: 'segni nelle partite' },
  { tabelle: ['voce_giornata'], uno: 'voce del Diario', molti: 'voci del Diario' },
  { tabelle: ['acquisto_partita'], uno: 'presenza d’acquisto precedente', molti: 'presenze d’acquisto precedenti' },
  { tabelle: ['acquisto_registrato'], uno: 'consumazione', molti: 'consumazioni' },
  { tabelle: ['acquisto_provenienza'], uno: 'fonte d’acquisto', molti: 'fonti d’acquisto' },
  { tabelle: ['pesca_sessione'], uno: 'visita di pesca', molti: 'visite di pesca' },
  { tabelle: ['pesca_osservazione'], uno: 'osservazione di pesca', molti: 'osservazioni di pesca' },
  { tabelle: ['pesca_cattura'], uno: 'cattura', molti: 'catture' },
  { tabelle: ['pesca_provenienza'], uno: 'fonte della visita di pesca', molti: 'fonti delle visite di pesca' },
  { tabelle: ['pesca_fatto_fonte'], uno: 'fonte di un fatto di pesca', molti: 'fonti dei fatti di pesca' },
  { tabelle: ['pesca_acquisto_esca'], uno: 'acquisto di esche', molti: 'acquisti di esche' },
  { tabelle: ['punti_pesca_partita'], uno: 'saldo di punti pesca', molti: 'saldi di punti pesca' },
  { tabelle: ['movimento_punti_pesca'], uno: 'movimento di punti pesca', molti: 'movimenti di punti pesca' },
  { tabelle: ['pesca_quota_storica'], uno: 'raccordo a una visita precedente', molti: 'raccordi a visite precedenti' },
  { tabelle: ['turno_partita'], uno: 'turno d’attività', molti: 'turni d’attività' },
  { tabelle: ['da_applicare'], uno: 'proposta da applicare', molti: 'proposte da applicare' },
  { tabelle: ['effetto_applicato'], uno: 'ricevuta degli effetti', molti: 'ricevute degli effetti' },
];

/** Il contenuto di un elemento del cestino detto per chi gioca: l'elemento stesso escluso (la sua riga c'è sempre), i dettagli
 *  interni tolti, le tabelle della stessa cosa sommate. */
export function contenutoLeggibile(v: Pick<VoceCestinoUnificatoDto, 'tipo' | 'chiave' | 'contenuto'>): Array<{ etichetta: string; quante: number }> {
  const conti = new Map(v.contenuto.map((c: ContenutoCestinoDto) => [c.tabella, c.quante]));
  // la riga dell'elemento non è «quel che si porta via»: un'area eliminata non «si porta via 1 area»
  const radice = radiceCestino(v);
  if (radice !== null && conti.has(radice)) conti.set(radice, (conti.get(radice) ?? 1) - 1);
  return PAROLE_CONTENUTO
    .map((p) => ({ p, quante: p.tabelle.reduce((s, t) => s + (conti.get(t) ?? 0), 0) }))
    .filter((x) => x.quante > 0)
    .map(({ p, quante }) => ({ etichetta: quante === 1 ? p.uno : p.molti, quante }));
}

/** La tabella dell'elemento stesso, per tipo (la stessa regola del server). */
const RADICE_CESTINO: Record<Exclude<TipoCestino, 'osservazione-pesca'>, string> = { area: 'dungeon_area', voce: 'punto_interesse', mappa: 'mappa', pin: 'spillo', 'area-dedalo': 'area_dedalo', 'area-fisica': 'area', luogo: 'luogo', negozio: 'negozio', richiesta: 'richiesta', oggetto: 'catalogo_oggetto', 'voce-diario': 'voce_giornata', partita: 'partita', 'fonte-acquisto': 'acquisto_provenienza', 'fonte-pesca': 'pesca_provenienza', 'sessione-pesca': 'pesca_sessione', 'persona-scorta': 'persona_posseduta', articolo: 'articolo', libro: 'libro', film: 'film', attivita: 'attivita', domanda: 'domanda', cruciverba: 'cruciverba' };

/** Le due osservazioni autonome condividono il tipo Cestino, non la tabella radice. */
function radiceCestino(v: Pick<VoceCestinoUnificatoDto, 'tipo' | 'chiave'>): string | null {
  if (v.tipo !== 'osservazione-pesca') return RADICE_CESTINO[v.tipo];
  if (/^fatto:[0-9a-f]{32}$/.test(v.chiave)) return 'pesca_fatto_fonte';
  if (/^esca:[0-9a-f]{32}$/.test(v.chiave)) return 'pesca_acquisto_esca';
  // Un'identità sconosciuta non giustifica sottrarre righe dal riepilogo.
  return null;
}

/** Come si presenta un elemento: «Area di Shibuya: Sottopasso» (il posto da cui viene, se c'è), poi «con 2 planimetrie e 1 pin». */
export function descrizioneElementoCestino(v: Pick<VoceCestinoUnificatoDto, 'tipo' | 'chiave' | 'nome' | 'contesto' | 'contenuto'>): { titolo: string; con: string | null } {
  const radice = radiceCestino(v);
  const tipo = v.tipo === 'osservazione-pesca' && radice === 'pesca_fatto_fonte' ? 'Fatto di pesca'
    : v.tipo === 'osservazione-pesca' && radice === 'pesca_acquisto_esca' ? 'Acquisto di esche' : NOME_TIPO_CESTINO[v.tipo];
  // il contesto è il posto (il quartiere, il Palazzo, il dedalo) o una nota come «fusa in …»: solo un nome diventa «di <posto>»
  const posto = v.contesto && !/[«»]/.test(v.contesto) ? v.contesto : null;
  const parti = contenutoLeggibile(v).map((c) => `${c.quante.toLocaleString('it-IT')} ${c.etichetta}`);
  const con = parti.length === 0 ? null : parti.length === 1 ? `con ${parti[0]}` : `con ${parti.slice(0, -1).join(', ')} e ${parti.at(-1)}`;
  return { titolo: `${tipo}${posto ? ` di ${posto}` : ''}: ${v.nome}`, con };
}
