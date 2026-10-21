import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { selezionaContenutiVoce } from './contenutiOggetti.js';
import { snapshotFonteProposta } from '../../services/snapshotProposteOggetti.js';
import { ammettiQuantitaIgnotaVoce125 } from './quantitaProposte125.js';

const VOCE = 'madarame-06-sala-del-tesoro-atrio/4';
const OGGETTO = 'carta-abilita/media';
const FONTE = `contenuto/${VOCE}/ricompensa/0`;
const AUDIT = 'audit-bonifica-catalogo-125';
type Riga = Record<string, unknown>;
const norm = (s: unknown) => typeof s === 'string' ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() : '';
function record(v: unknown): Riga { return v && typeof v === 'object' && !Array.isArray(v) ? v as Riga : {}; }

function bonifica(db: AppDatabase): void {
  // Un eventuale rapporto precedente non viene sovrascritto né usato per riapplicare una scelta.
  if (db.prepare('SELECT 1 FROM dati_guida WHERE chiave = ?').get(AUDIT)) return;
  const conclude = (esito: string, motivo: string) => db.prepare('INSERT INTO dati_guida(chiave,json) VALUES (?,?)').run(AUDIT,
    JSON.stringify({ versione: 1, migrazione: 125, voce: VOCE, campo: 'ricompensa', esito, motivo, catalogo: esito === 'proposta-creata' ? OGGETTO : null }));
  const v = db.prepare(`SELECT p.tipo,p.nome,p.dettagli_json,a.dungeon_chiave FROM punto_interesse p
    JOIN dungeon_area a ON a.chiave=p.area_chiave WHERE p.chiave=?`).get(VOCE) as Riga | undefined;
  if (!v) { conclude('esclusa', 'Fonte assente: non ricreata.'); return; }
  if (v.tipo !== 'miniboss' || v.dungeon_chiave !== 'madarame') { conclude('conflitto', 'Tipo o collocazione della fonte diversi dall’attestazione.'); return; }
  let dettagli: Riga;
  try { dettagli = record(JSON.parse(String(v.dettagli_json))); }
  catch { conclude('conflitto', 'Dettagli illeggibili: nessun testo modificato.'); return; }
  if (dettagli.ricompensa !== 'Carta abilità Media.') { conclude('esclusa', 'Ricompensa corrente diversa: nessuna correzione applicata.'); return; }
  if (db.prepare('SELECT 1 FROM voce_oggetto WHERE voce_chiave=?').get(VOCE)
    || db.prepare("SELECT 1 FROM proposta_abbinamento WHERE riga_tipo='voce' AND riga_chiave=?").get(VOCE)) {
    conclude('conflitto', 'Collegamenti o proposte di qualsiasi stato già presenti: scelta preservata.'); return;
  }
  const skill = db.prepare('SELECT nome,elemento FROM skill WHERE id=304').get() as Riga | undefined;
  if (skill?.nome !== 'Media' || skill.elemento !== 'healing') { conclude('conflitto', 'La skill di riferimento non coincide con Media/Guarigione.'); return; }
  const estratti = selezionaContenutiVoce({ tipo: String(v.tipo), nome: String(v.nome), dettagli_json: v.dettagli_json });
  const media = estratti.parti.filter((p) => p.nome === 'Media' && p.categoria === 'carta-abilita'
    && p.locatori.some((l) => l.campo === 'ricompensa' && l.testo === dettagli.ricompensa));
  if (media.length !== 1 || media[0].daVerificare || media[0].quantita !== null) {
    conclude('conflitto', 'Attestazione della carta non univoca o quantità cambiata.'); return;
  }
  const identita = db.prepare('SELECT chiave,nome,categoria,nomi_altri_json,fonte_tipo,fonte_chiave,nascosto FROM catalogo_oggetto').all() as Riga[];
  let gia: Riga | undefined;
  for (const o of identita) {
    let alias: unknown;
    try { alias = JSON.parse(String(o.nomi_altri_json)); }
    catch { conclude('conflitto', 'Alias del catalogo illeggibili: assenza dell’identità non dimostrata.'); return; }
    if (!Array.isArray(alias)) { conclude('conflitto', 'Formato alias inatteso: assenza dell’identità non dimostrata.'); return; }
    const pertinente = o.chiave === OGGETTO || o.fonte_chiave === FONTE || [o.nome, ...alias].some((n) => norm(n) === 'media');
    if (!pertinente) continue;
    if (gia || o.chiave !== OGGETTO || o.categoria !== 'carta-abilita' || o.nome !== 'Media'
      || o.fonte_tipo !== 'guida' || o.fonte_chiave !== FONTE || o.nascosto !== 0) {
      conclude('conflitto', 'Identità omonima, nascosta o provenienza diversa: nessun oggetto ricreato o fuso.'); return;
    }
    gia = o;
  }
  for (const c of db.prepare('SELECT registro_json FROM cestino').all() as Array<{ registro_json: string }>) {
    let passi: unknown;
    try { passi = JSON.parse(c.registro_json); }
    catch { conclude('conflitto', 'Registro del cestino illeggibile: impossibile escludere una precedente eliminazione.'); return; }
    if (!Array.isArray(passi)) { conclude('conflitto', 'Registro del cestino non riconosciuto.'); return; }
    for (const passo of passi) {
      const p = record(passo); const prima = record(p.prima);
      let nomiPrecedenti: unknown = [];
      if (p.tabella === 'catalogo_oggetto' && prima.nomi_altri_json != null) {
        try { nomiPrecedenti = JSON.parse(String(prima.nomi_altri_json)); }
        catch { conclude('conflitto', 'Alias storici illeggibili: precedente eliminazione non escludibile.'); return; }
        if (!Array.isArray(nomiPrecedenti)) { conclude('conflitto', 'Alias storici non riconosciuti.'); return; }
      }
      if (p.tabella === 'catalogo_oggetto' && (prima.chiave === OGGETTO || prima.fonte_chiave === FONTE
        || (prima.categoria === 'carta-abilita' && [prima.nome, ...(nomiPrecedenti as unknown[])].some((n) => norm(n) === 'media')))) {
        conclude('conflitto', 'Identità presente nella storia del cestino: nessuna ricreazione automatica.'); return;
      }
    }
  }
  const ora = new Date().toISOString();
  if (!gia) db.prepare(`INSERT INTO catalogo_oggetto(chiave,categoria,nome,fonte_tipo,fonte_chiave,descrizione,updated_at)
    VALUES (?,'carta-abilita','Media','guida',?,?,?)`).run(OGGETTO, FONTE,
      'Carta attestata nel campo ricompensa della voce di Madarame. Abilità di riferimento: Media (skill 304); distinta da Mediarama. Quantità non dichiarata.', ora);
  const p = { riga_tipo: 'voce', riga_chiave: VOCE };
  db.prepare(`INSERT INTO proposta_abbinamento(riga_tipo,riga_chiave,catalogo_chiave,quantita,motivo,certezza,gruppo,nota,fonte_snapshot_json,updated_at)
    VALUES ('voce',?,?,NULL,?,'certa','ricompensa-media-125',?,?,?)`).run(VOCE, OGGETTO,
      'Ricompensa strutturata omessa dalla conversione: Carta Media. Il collegamento al lavoro da preservare richiede il tuo sì e una quantità verificata.',
      `Fonte: ricompensa della voce; skill 304. Attestazioni: ${JSON.stringify(media[0].locatori)}`,
      JSON.stringify(snapshotFonteProposta(db, p, 2)), ora);
  conclude('proposta-creata', 'Identità attestata disponibile; collegamento e quantità lasciati alla conferma esplicita.');
}

export const migration125: Migration = {
  id: 125, name: 'Ricompensa Carta Media: proposta conservativa sul Palazzo protetto',
  up(db) { db.transaction(() => { ammettiQuantitaIgnotaVoce125(db); bonifica(db); })(); },
};
