// ============================================================
// TraduzioniEditor — consultazione e modifica delle rese italiane
// ============================================================

import { useState } from 'react';
import { aggiornaTraduzione, getAmbitiTraduzioni, getTraduzioni, ripristinaTraduzione } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { useGlossarioStore } from '../../stores/glossarioStore';
import { notifica } from '../../stores/notificationStore';
import { PageState } from '../shared/PageState';
import { CampoRicerca } from '../shared/CampoRicerca';
import type { TraduzioneDto } from '../../types';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

const NOMI_AMBITO: Record<string, string> = {
  arcana: 'Arcani', elementoSkill: 'Elementi delle skill', elementoAffinita: 'Elementi delle affinità', affinita: 'Codici di affinità',
  tipoEredita: 'Tipi di eredità', colonnaEredita: 'Colonne di eredità', statistica: 'Statistiche', tipoOggetto: 'Categorie di oggetti',
  vincoloOggetto: 'Vincoli degli oggetti', areaMementos: 'Aree di Mementos', doteSociale: 'Doti sociali', notaPersona: 'Note delle Persona',
  fonteEsclusiva: 'Fonti esclusive', effettoSkill: 'Effetti delle skill', descrizioneOggetto: 'Descrizioni degli oggetti',
  negoziazione: 'Titoli di negoziazione', fonteCarta: 'Fonti delle carte abilità',
  skill: 'Nomi delle skill', persona: 'Nomi delle Persona', oggetto: 'Nomi dell’equipaggiamento', termine: 'Termini di gioco',
};

/** Editor: scegli l'ambito, cerca, modifica in linea, ripristina il testo del seed. */
export function TraduzioniEditor() {
  const ambiti = useCarica(() => getAmbitiTraduzioni(), []);
  const [ambito, setAmbito] = useState('arcana');
  const [q, setQ] = useState('');
  const [soloUtente, setSoloUtente] = useState(false);
  const voci = useCarica(() => getTraduzioni({ ambito, q: q.trim() || undefined, soloUtente: soloUtente || undefined }), [ambito, q, soloUtente]);
  const [inModifica, setInModifica] = useState<TraduzioneDto | null>(null);
  const [testo, setTesto] = useState('');
  const ricaricaGlossario = useGlossarioStore((s) => s.ricarica);

  const applica = async (t: TraduzioneDto, nuovo?: string) => {
    try {
      const agg = nuovo === undefined ? await ripristinaTraduzione(t.ambito, t.chiave) : await aggiornaTraduzione(t.ambito, t.chiave, nuovo);
      voci.imposta((voci.dati ?? []).map((v) => (v.chiave === agg.chiave ? agg : v)));
      setInModifica(null);
      void ricaricaGlossario();
      void ambiti.ricarica();
      notifica('success', nuovo === undefined ? 'Testo del seed ripristinato.' : 'Traduzione salvata.');
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Operazione fallita.');
    }
  };

  return (
    <section className="card flex flex-col gap-3">
      <h2 className="m-0 text-[15px] font-semibold">Traduzioni</h2>
      <p className="m-0 text-[13px] text-text-secondary">Le rese italiane dei termini di gioco. Le voci modificate da te non vengono mai sovrascritte dagli aggiornamenti del dataset; "Ripristina" riporta il testo del seed.</p>
      <div className="flex flex-wrap gap-2 items-center">
        <select className="form-input w-auto min-w-[220px]" value={ambito} onChange={(e) => setAmbito(e.target.value)} aria-label="Ambito">
          {(ambiti.dati ?? []).map((a) => (
            <option key={a.ambito} value={a.ambito}>{NOMI_AMBITO[a.ambito] ?? a.ambito} ({a.voci}{a.modificate ? `, ${a.modificate} mod.` : ''})</option>
          ))}
        </select>
        <CampoRicerca valore={q} onCambia={setQ} segnaposto="Cerca chiave o testo…" />
        <button type="button" className={`chip touch ${soloUtente ? 'chip--attivo' : ''}`} onClick={() => setSoloUtente((v) => !v)} aria-pressed={soloUtente}>Solo modificate</button>
      </div>
      <PageState isLoading={voci.caricamento} error={voci.errore} onRetry={() => void voci.ricarica()}>
        <ul className="m-0 p-0 list-none divide-y divide-border-light max-h-[60vh] overflow-y-auto">
          {(voci.dati ?? []).map((t) => (
            <li key={t.chiave} className="py-2 flex flex-col gap-1">
              <div className="text-[12px] text-text-muted break-words">{t.chiave}</div>
              {inModifica?.chiave === t.chiave ? (
                <div className="flex gap-2 items-start">
                  <textarea className="form-input min-h-[44px]" value={testo} onChange={(e) => setTesto(e.target.value)} autoFocus />
                  <button type="button" className="btn btn-primary btn-sm" disabled={!testo.trim()} onClick={() => void applica(t, testo.trim())}>Salva</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setInModifica(null)}>Annulla</button>
                </div>
              ) : (
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="flex-1 text-[14px]">{t.testo}</span>
                  {t.fonte === 'utente' && <span className="chip chip--attivo">modificata</span>}
                  <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo="Modifica" onClick={() => { setInModifica(t); setTesto(t.testo); }} />
                  {t.fonte === 'utente' && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="ricalcola" dimensione={20} />} titolo="Ripristina" onClick={() => void applica(t)} />}
                </div>
              )}
            </li>
          ))}
          {voci.dati && voci.dati.length === 0 && <li className="py-3 text-[13px] text-text-muted">Nessuna voce.</li>}
        </ul>
      </PageState>
    </section>
  );
}
