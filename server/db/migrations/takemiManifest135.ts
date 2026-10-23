// Fotografia integrale della riga pubblica di pacchetto/gioco.db, schema93. Nessun dato dell'istanza.
export const ATTIVITA_TAKEMI_93 = {
  chiave: 'esperimenti-clinici-takemi', ordine: 18, nome: 'Esperimenti clinici di Tae Takemi', tipo: 'altro',
  luogo: 'Yongen-Jaya, ambulatorio Takemi', luogo_chiave: 'yongen-jaya', fascia: 'sera', costo: 0,
  sblocco: "Legato al Confidente dell'Eremita (Takemi)",
  doti_json: '[{"dote":"coraggio","note":null,"condizione":"Partecipare ai test aumenta il Coraggio e il rango del Confidente; quantita non specificata dalla fonte"}]',
  altri_effetti: null, regole: '', premi: null, paga: null,
  fonte: 'https://www.allgamestaff.it/persona-5-royal/../come-aumentare-il-coraggio-in-persona-5-royal/',
  verificato: 1, sessioni: 1, origine: 'seed', nascosto: 0, seed_json: null, updated_at: null,
  condizioni_json: '[{"tipo":"confidente","confidente":"takemi","rango":1}]',
  sede_chiave: 'yongen-jaya/clinica-takemi', effetti_json: '[]', paga_yen: null, paga_massima: null,
  dettagli: 'Note sulle Doti: Coraggio: Partecipare ai test aumenta il Coraggio e il rango del Confidente; quantita non specificata dalla fonte',
  tracciamento: 'nessuno',
} as const;

// Colonne assenti nella93: ogni valore è attestato dall'append indicata, non dedotto dalla base.
// 105: quiz_json TEXT NULL; UPDATE del solo lavoro-triple-seven. 121: catalogo_chiave NULL;
// il popolamento riguarda le letture/videogiochi. 135: FK nuova nullable, senza ricostruzioni per nome.
export const ATTIVITA_TAKEMI_PRIMA_135 = { ...ATTIVITA_TAKEMI_93, quiz_json: null, catalogo_chiave: null, confidente_chiave: null };
export const SPIEGAZIONE_TAKEMI = 'I test fanno parte della progressione di Tae Takemi; requisiti, disponibilità e Doti per rango si consultano nella sua scheda. Le uscite semplici non attribuiscono automaticamente una Dote.';
export const ATTIVITA_TAKEMI_DOPO_135 = { ...ATTIVITA_TAKEMI_PRIMA_135, confidente_chiave: 'takemi', fascia: null, condizioni_json: '[]', sblocco: null, dettagli: SPIEGAZIONE_TAKEMI };
export const IDENTITA_TAKEMI_93 = { chiave: 'takemi', nome: 'Tae Takemi', arcana: 'Death', ordine: 13 };
export const BENEFICIO_TAKEMI_RAW_93 = '[{"effetto":{"famiglia":"dote","dote":"coraggio","note":1}}]';
export const BENEFICI_TAKEMI_93 = Array.from({ length: 7 }, (_, i) => ({ confidente_chiave: 'takemi', verso_rango: i + 1, effetti_json: BENEFICIO_TAKEMI_RAW_93 }));
export const FONTI_TAKEMI_135 = [
  'https://www.allgamestaff.it/persona-5-royal/guida-rango-confidente-di-tae-takemi-morte/',
  'https://gamefaqs.gamespot.com/ps4/260936-persona-5-royal/faqs/78212/death',
] as const;
