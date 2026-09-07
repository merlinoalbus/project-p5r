// ============================================================
// sezioniGuida — le sezioni della Guida: percorso, titolo, descrizione, icona di riserva e chiave dell'asset `guida/<chiave>` (consegna 11.6)
// ============================================================

import type { ReactNode } from 'react';
import { IconBolt, IconBook, IconHome, IconMask, IconStar } from '../shared/icons';
import { IconFilm, IconMappa } from '../shared/iconeGuida';

export interface SezioneGuida {
  chiave: string;
  to: string;
  titolo: string;
  descrizione: string;
  icona: ReactNode;
}

const DIM = 30;

/** Ordine di visualizzazione nell'indice della Guida. */
export const SEZIONI_GUIDA: SezioneGuida[] = [
  { chiave: 'percorso', to: '/guida/percorso', titolo: 'Guida giorno per giorno', descrizione: 'Cosa fare oggi, di giorno e di sera: Confidenti, Palazzi, Doti, acquisti, avvisi sulle scadenze; giorno corrente e azioni spuntabili', icona: <IconStar size={DIM} /> },
  { chiave: 'domande', to: '/guida/domande', titolo: 'Domande in classe ed esami', descrizione: 'Risposte corrette per data, prossime domande, spunta «fatta»', icona: <IconBook size={DIM} /> },
  { chiave: 'cruciverba', to: '/guida/cruciverba', titolo: 'Cruciverba di Leblanc', descrizione: '38 cruciverba con indizio e risposta (+1 nota di Conoscenza), spunta «risolto»', icona: <IconBook size={DIM} /> },
  { chiave: 'calendario', to: '/guida/calendario', titolo: 'Calendario di gioco', descrizione: 'Meteo, eventi, scadenze dei Palazzi, consigli per settimana', icona: <IconStar size={DIM} /> },
  { chiave: 'mappe', to: '/guida/mappe', titolo: 'Mappe', descrizione: 'Tokyo, quartieri e aree dei Palazzi: mappe a livelli con spilli, collezionabili raccolti, negozi ed editor', icona: <IconMappa size={DIM} /> },
  { chiave: 'dungeon', to: '/guida/dungeon', titolo: 'Palazzi', descrizione: 'Aree, punti di interesse, boss e mappe interattive con avanzamento; il Dedalo di Iweleth sta qui, i Memento hanno la loro pagina', icona: <IconMask size={DIM} /> },
  { chiave: 'richieste', to: '/guida/richieste', titolo: 'Richieste dei Mementos', descrizione: '33 Richieste con bersaglio, debolezze, ricompense e stato; fiori e timbri di Jose', icona: <IconBook size={DIM} /> },
  { chiave: 'battaglia', to: '/guida/battaglia', titolo: 'Aiuto in battaglia', descrizione: 'Debolezze delle Ombre per area, negoziazione, danno tecnico, Staffetta, Speciali, Mietitore e Demoni del Tesoro', icona: <IconBolt size={DIM} /> },
  { chiave: 'citta', to: '/guida/citta', titolo: 'La città', descrizione: 'Quartieri e luoghi: negozi, ristoranti, attività, Confidenti, orari e sblocchi', icona: <IconHome size={DIM} /> },
<<<<<<< HEAD
  { chiave: 'negozi', to: '/guida/negozi', titolo: 'Negozi e inventario', descrizione: '47 negozi e 499 articoli: armi, protezioni, accessori, oggetti, regali e cibo con prezzi, sblocchi e acquisti per partita', icona: <IconBolt size={DIM} /> },
  { chiave: 'libri', to: '/guida/libri', titolo: 'Libri', descrizione: '46 libri con avanzamento per sessioni; bonus e luoghi si sbloccano al completamento', icona: <IconBook size={DIM} /> },
  { chiave: 'attivita', to: '/guida/attivita', titolo: 'Attività e Doti sociali', descrizione: 'Mini-giochi, lavori, studio, libri e film con le note delle Doti; libri letti e film visti per partita', icona: <IconStar size={DIM} /> },
  { chiave: 'completamento', to: '/guida/completamento', titolo: 'Trofei e finali', descrizione: '53 trofei con spunta per partita, condizioni dei finali, DLC, effetti del meteo, Nuova Partita+ e regole del tempo', icona: <IconStar size={DIM} /> },
  { chiave: 'covo', to: '/guida/covo', titolo: 'Covo dei Ladri', descrizione: 'L’area bonus di Royal: 52 sfide che danno Medaglie P e 36 voci di catalogo che le spendono, con prezzi e sblocchi', icona: <IconMask size={DIM} /> },
  { chiave: 'film', to: '/guida/film', titolo: 'Film e DVD', descrizione: '18 film al cinema e 12 DVD: periodi, Doti, luoghi, sessioni e rivisioni registrate per partita', icona: <IconFilm size={DIM} /> },
  { chiave: 'videogiochi', to: '/guida/videogiochi', titolo: 'Videogiochi', descrizione: '7 giochi con round, Doti e completamento registrato per partita', icona: <IconStar size={DIM} /> },
  { chiave: 'sfide', to: '/guida/sfide', titolo: 'Battaglie Sfida, boss segreti e tratti', descrizione: '7 Battaglie Sfida, Jose, Gemelle Custodi e Lavenza, Magnate, 90 tratti delle Persona in italiano', icona: <IconMask size={DIM} /> },
  { chiave: 'personaggi', to: '/guida/personaggi', titolo: 'Personaggi', descrizione: 'Il cast senza spoiler: Ladri Fantasma, Stanza di Velluto, Confidenti e terzo semestre, con Persona, armi e ruolo in battaglia', icona: <IconMask size={DIM} /> },
  { chiave: 'oggetti', to: '/guida/oggetti', titolo: 'Oggetti, materiali e fabbricazione', descrizione: '247 consumabili, oggetti chiave e materiali, ricette degli attrezzi, personalizzazione delle armi, abiti e lavanderia, scambi', icona: <IconBook size={DIM} /> },
  { chiave: 'confidenti', to: '/partita?scheda=confidenti', titolo: 'Confidenti', descrizione: 'Risposte migliori, abilità e regali per ogni Confidente', icona: <IconStar size={DIM} /> },
];
