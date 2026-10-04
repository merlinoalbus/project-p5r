// ============================================================
// descrizioni/fusione — le rotte di /api/fusione: motore di fusione, eredità delle skill, piani, cicli, Stanza di Velluto
// ============================================================

import type { DescrizioniArea } from '../tipi.js';

/**
 * Le descrizioni delle rotte di `server/routes/fusione.ts` (servizio `fusione/fusioneService`). Regola comune del contesto: con
 * `partita` valgono i DLC posseduti della partita (404 `partita-non-trovata` se non esiste) e l'elenco `dlc` si ignora; senza partita
 * valgono i DLC elencati in `dlc`, oppure i soli contenuti base. Con una partita i costi tengono conto dello sconto del Registro.
 */
export const DESCRIZIONI_FUSIONE: DescrizioniArea = {
  'GET /api/fusione/fondi': {
    sommario: 'Fusione diretta di due Persona (A + B), con il motivo quando non è possibile',
    descrizione: 'Applica le regole di Persona 5 Royal: ricetta speciale a due ingredienti, Demone del Tesoro con una Persona normale, arcani diversi o stesso arcano. Se la fusione non dà risultato (la stessa Persona due volte, un DLC non posseduto, Giudizio con Giustizia, Forza, Carro o Morte, livello fuori scala…) risponde comunque 200 con `ricetta: null` e il `motivo` in italiano. Con una partita il costo è scontato secondo il Registro e `bonusConfidente` riporta il rango del Confidente dell\'arcano risultante con il moltiplicatore di esperienza.',
    risposta: '`EsitoFusioneDto` (a, b, ricetta o null, motivo, dlcPosseduti, sconto, bonusConfidente)',
    errori: [[404, 'persona-non-trovata'], [404, 'partita-non-trovata']],
  },
  'GET /api/fusione/ricette/:personaId': {
    sommario: 'Fusione inversa: le ricette che producono una Persona',
    descrizione: 'Tutte le coppie (o la ricetta speciale) che danno la Persona nel contesto dei DLC. `livelloMax` tiene solo le ricette con risultato e ingredienti entro quel livello; `limite` (predefinito 500) taglia l\'elenco restituito, mentre `totale` (dopo il filtro) e `totaleSenzaFiltri` contano sempre tutto. Con una partita i costi sono scontati secondo il Registro.',
    risposta: '`RicetteFusioneDto` (persona, totale, totaleSenzaFiltri, ricette, dlcPosseduti, livelloMax, sconto)',
    errori: [[404, 'persona-non-trovata'], [404, 'partita-non-trovata']],
  },
  'GET /api/fusione/con/:personaId': {
    sommario: 'Le fusioni in cui una Persona fa da ingrediente',
    descrizione: 'Tutte le fusioni a due che usano la Persona come ingrediente, con il risultato, nel contesto dei DLC. Stessi filtri delle ricette: `livelloMax` su risultato e ingredienti, `limite` (predefinito 500) sull\'elenco restituito, con i totali prima e dopo il filtro. Con una partita i costi sono scontati secondo il Registro.',
    risposta: '`RicetteFusioneDto` (persona, totale, totaleSenzaFiltri, ricette, dlcPosseduti, livelloMax, sconto)',
    errori: [[404, 'persona-non-trovata'], [404, 'partita-non-trovata']],
  },
  'GET /api/fusione/piani/:personaId': {
    sommario: 'Piani di fusione ricorsivi (alberi) per ottenere una Persona, con scorta e Registro della partita',
    descrizione: 'Ogni nodo del piano si ottiene dalla scorta della partita (costo 0, un esemplare si usa una volta), dal Registro (prezzo di evocazione), per cattura (se `catture`, predefinito vero) o per fusione di due figli. Il costo del piano è la somma delle evocazioni, scontata con il Registro. Predefiniti: `profondita` 3, `alternative` 3, `slotFortunato` falso. Il livello massimo è `livelloMax`, oppure con `limitaLivello` e una partita il livello del protagonista. `skill` (fino a 4) sono le skill che il bersaglio deve avere, propagate lungo la catena; un tratto non si può chiedere. Se nessun piano è possibile `piani` è vuoto e `motivo` ne dà codice e testo (`non-fondibile`, `skill-non-ereditabili`, `skill-senza-fonte`, `limite-livello`).',
    risposta: '`PianiFusioneDto` (persona, piani con radice `NodoPianoDto`, opzioni, skillRichieste, sconto, disponibilita, motivo)',
    errori: [[404, 'persona-non-trovata'], [404, 'partita-non-trovata'], [404, 'skill-non-trovata'], [400, 'skill-tratto']],
  },
  'GET /api/fusione/eredita': {
    sommario: 'Analisi dell\'eredità delle skill per la fusione A + B',
    descrizione: 'Calcola il risultato di A + B e le skill che può ereditare: tipo di eredità del risultato, numero di slot, candidate con il motivo per cui sono o non sono ereditabili, tratti. Per ogni ingrediente, se la partita ne ha un esemplare in scorta con skill registrate si usano le sue (il più alto di livello); altrimenti le skill al livello `livelloA` / `livelloB`, o al livello base. Se A + B non produce alcun risultato risponde 400 `fusione-impossibile`.',
    risposta: '`EreditaFusioneDto` (risultato, tipo, ingredienti con le skill, slot, slotScelti, candidate `SkillEreditaDto`, tratti)',
    errori: [[400, 'fusione-impossibile'], [404, 'persona-non-trovata'], [404, 'partita-non-trovata']],
  },
  'GET /api/fusione/cerca-skill': {
    sommario: 'Ricette che fanno ereditare tutte le skill desiderate (fino a 4)',
    descrizione: 'Cerca fra le ricette del risultato indicato (`risultato`) o, senza, di ogni Persona ammessa che non sia un Demone del Tesoro, quelle in cui il risultato riceve tutte le skill di `skill` (ereditate dagli ingredienti o apprese da sé). Gli ingredienti contano con le skill della scorta se posseduti nella partita, altrimenti con quelle del livello base. `livelloMax` filtra risultato e ingredienti. Le ricette sono ordinate per costo e livello, `limite` (predefinito 200) taglia l\'elenco; `perRisultato` riassume ogni Persona ottenibile con il numero di ricette e il costo minimo. I costi qui non sono scontati.',
    risposta: '`RicercaSkillDto` (skill, risultato, totale, ricette, perRisultato)',
    errori: [[404, 'skill-non-trovata'], [404, 'persona-non-trovata'], [404, 'partita-non-trovata']],
  },
  'GET /api/fusione/cicli/:personaId': {
    sommario: 'Cicli di fusione X → … → X con partner procurabili nella partita',
    descrizione: 'Sequenze di fusioni a due in cui ogni anello fonde la Persona corrente con un partner (dalla scorta, dal Registro a pagamento o, se `catture`, per cattura) e l\'ultimo anello rigenera la Persona di partenza: servono a ripetere una sequenza (bonus di livello del Confidente a ogni anello, reroll di skill e tratto). Predefiniti: `lunghezza` massima 3, `lunghezzaMin` 2, `partnerDistinti` vero, `alternative` 5, `catture` falso. Il livello massimo è `livelloMax`, oppure con `limitaLivello` e una partita il livello del protagonista. Ordinati per costo per iterazione, scontato con il Registro.',
    risposta: '`CicliFusioneDto` (persona, cicli con anelli `AnelloCicloDto`, opzioni, sconto, disponibilita, inScorta)',
    errori: [[404, 'persona-non-trovata'], [404, 'partita-non-trovata']],
  },
  'GET /api/fusione/velluto': {
    sommario: 'Stato della Stanza di Velluto per una partita: Registro, sconto, Allarme, Gemelle, ranghi per arcano',
    descrizione: 'Per la partita indicata (obbligatoria): completamento del compendio personale (Persona non DLC registrate) e sconto del Registro che ne deriva, Allarme di fusione attivo o no, rango del Confidente delle Gemelle (Forza) con gli sblocchi ottenuti e il prossimo, e per ogni arcano il Confidente di rango più alto con il moltiplicatore di esperienza della fusione.',
    risposta: '`VellutoDto` (partitaId, compendio, sconto, allarmeAttivo, gemelle, arcani)',
    errori: [[404, 'partita-non-trovata']],
  },
};
