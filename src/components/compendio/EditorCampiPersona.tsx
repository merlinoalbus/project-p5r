// ============================================================
// EditorCampiPersona — i controlli della finestra «Modifica» della Persona (L11 · R11-15/3)
// ============================================================
//
// Le skill con i livelli: ogni riga è una skill scelta dall'elenco (per nome, mai scritta a mano), con come si impara (Innata, un livello da 1 a 99 e,
// per le forme del gruppo, risveglio, rango o 3ª forma). Il valore resta quello del registro (testi «nome @ livello»; `skillPersonaLogica`).
// L'Arcano si sceglie per nome italiano. Le regole che collegano i campi a `campiPersona.ts`.
// ============================================================

import { getGlossario, getSkills } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import type { CampoCorrezioneDto, ValoreCampoCorrezione } from '../../types';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { Selettore } from '../shared/Selettore';
import { Blocco } from '../guida/moduli/campi';
import { MODI_SENZA_LIVELLO, NOMI_MODO, RIGA_VUOTA, leggiSkill, problemaSkill, scriviSkill, type Modo, type RigaSkill } from './skillPersonaLogica';

/** L'editor delle skill di una Persona. `delGruppo`: le forme del gruppo possono impararle anche con risveglio, rango o 3ª forma. */
export function CampoSkillPersona({ valore, imposta, occupato, delGruppo }: { valore: ValoreCampoCorrezione | undefined; imposta: (v: string[]) => void; occupato: boolean; delGruppo: boolean }) {
  const skill = useCarica(() => getSkills(), []);
  const voci = Array.isArray(valore) ? valore : [];
  const righe = voci.map(leggiSkill);
  const nomi = new Map((skill.dati ?? []).map((s) => [s.nome, s.nomeIt]));
  const nomeDi = (n: string) => nomi.get(n) ?? n;
  const opzioniSkill = (skill.dati ?? []).map((s) => ({ chiave: s.nome, nome: s.nomeIt, dettaglio: s.nomeIt !== s.nome ? s.nome : undefined }));
  /** Una forma che ha già un modo particolare lo conserva anche se non è del gruppo. */
  const modiAmmessi = (r: RigaSkill): Modo[] => (delGruppo || MODI_SENZA_LIVELLO.includes(r.modo) ? ['livello', 'iniziale', ...MODI_SENZA_LIVELLO] : ['livello', 'iniziale']);
  const cambia = (i: number, nuova: RigaSkill) => imposta(righe.map((r, j) => scriviSkill(j === i ? nuova : r)));
  const problema = problemaSkill(voci, nomeDi);
  return (
    <fieldset className="regole-editor flex min-w-0 flex-col gap-2 sm:col-span-2">
      <legend>Skill e livelli a cui si imparano</legend>
      {skill.errore && <p role="alert" className="m-0 text-[12px] text-error">Elenco delle skill non caricato: {skill.errore}</p>}
      {righe.length === 0 && <p className="m-0 text-[12px] text-text-muted">Nessuna skill.</p>}
      {righe.map((r, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <span className="chip mb-2 shrink-0" aria-hidden>{i + 1}</span>
          <div className="min-w-[200px] flex-[3]">
            <Selettore etichetta={`Skill ${i + 1}`} valore={r.nome} ricerca="sempre" disabilitato={occupato || skill.caricamento} segnaposto="Scegli la skill…"
              opzioni={r.nome === '' || nomi.has(r.nome) ? opzioniSkill : [{ chiave: r.nome, nome: r.nome }, ...opzioniSkill]}
              onCambia={(k) => cambia(i, { ...r, nome: k })} />
          </div>
          <div className="min-w-[150px] flex-1">
            <Selettore etichetta={`Come si impara (skill ${i + 1})`} valore={r.modo} ricerca="mai" disabilitato={occupato}
              opzioni={modiAmmessi(r).map((m) => ({ chiave: m, nome: NOMI_MODO[m] }))}
              onCambia={(k) => cambia(i, { ...r, modo: k as Modo, livello: k === 'livello' ? r.livello : null })} />
          </div>
          {r.modo === 'livello' && (
            <label className="editor-mappa__campo w-[96px] shrink-0">
              Livello
              <input className="form-input min-h-11" type="number" inputMode="numeric" min={1} max={99} step={1} disabled={occupato}
                value={r.livello ?? ''} aria-label={`Livello a cui impara la skill ${i + 1}`}
                onChange={(e) => cambia(i, { ...r, livello: e.target.value === '' ? null : Number(e.target.value) })} />
            </label>
          )}
          <button type="button" className="btn btn-ghost btn-sm touch" disabled={occupato} onClick={() => imposta(voci.filter((_, j) => j !== i))}
            aria-label={`Togli la skill ${r.nome ? nomeDi(r.nome) : i + 1}`}>Togli</button>
        </div>
      ))}
      <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una skill"
        disabled={occupato || voci.length >= 60} onClick={() => imposta([...voci, scriviSkill(RIGA_VUOTA)])} />
      {problema && <p role="alert" className="m-0 text-[12px] text-error">{problema}</p>}
    </fieldset>
  );
}

/** L'Arcano scelto per nome italiano (il registro dà la chiave dell'Arcano). */
export function CampoArcanoPersona({ campo, valore, imposta, occupato }: { campo: CampoCorrezioneDto; valore: ValoreCampoCorrezione | undefined; imposta: (v: string) => void; occupato: boolean }) {
  const glossario = useCarica(() => getGlossario(), []);
  const nomi = new Map((glossario.dati?.arcani ?? []).map((a) => [a.chiave, a.nome]));
  const opzioni = (campo.opzioni ?? []).map((o) => ({ chiave: o.chiave, nome: nomi.get(o.chiave) ?? o.nome }));
  return (
    <Blocco>
      <Selettore etichetta="Arcano" valore={typeof valore === 'string' ? valore : ''} ricerca="mai" disabilitato={occupato} opzioni={opzioni} onCambia={imposta} />
    </Blocco>
  );
}
