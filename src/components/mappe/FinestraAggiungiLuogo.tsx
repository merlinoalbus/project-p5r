// ============================================================
// FinestraAggiungiLuogo — «Aggiungi luogo» e «Posiziona» (L5 F5, M §4.4, R5-18)
// ============================================================
//
// Passo 1 («Aggiungi luogo»): un luogo che esiste nel quartiere (prima quelli senza pin) o un luogo nuovo (nome, tipo, che cosa offre,
// orari se la guida li dà). Passo 2: il tocco sul punto della planimetria (la stessa immagine e lo stesso gesto della finestra d'ingresso
// di L2), con la versione dell'area se ce n'è più d'una. Salva con `POST /api/luoghi/posiziona`, che crea (se nuovo) il luogo, il pin
// collegato e l'area in una volta. «Posiziona» di un luogo senza pin fa solo il passo 2. Sotto i 768 px la finestra è un foglio dal basso.
// ============================================================

import { useState } from 'react';
import { getQuartiere, posizionaLuogo } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { useImmagineMappa } from '../../hooks/useImmagineMappa';
import { notifica } from '../../stores/notificationStore';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { SelettoreIcone, type OpzioneIcone } from '../shared/SelettoreIcone';
import { IconaSpillo } from './IconaSpillo';
import { SceltaPunto } from './SceltaPunto';
import { OrariEditor } from '../guida/OrariEditor';
import { TIPI_LUOGO } from '../../../shared/tipiLuogo';
import { ORARI_SEMPRE, type OrariNegozio } from '../../../shared/orariNegozio';
import type { PlanimetriaAreaDto } from '../../types';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';

const OPZIONI_TIPO: OpzioneIcone[] = TIPI_LUOGO.map((t) => ({ chiave: t.chiave, nome: t.nome, icona: <IconaSpillo tipo={t.icona} dimensione={28} /> }));

interface Props {
  /** Il quartiere (chiave) e il suo nome: i luoghi che esistono si scelgono fra i suoi. */
  quartiere: string;
  /** Le versioni dell'area su cui si posiziona, la prima è quella proposta. */
  planimetrie: ReadonlyArray<Pick<PlanimetriaAreaDto, 'chiave' | 'nome' | 'etichetta' | 'immagineUrl' | 'asset'>>;
  /** «Posiziona»: il luogo è già scelto, resta solo il punto. */
  luogo?: { chiave: string; nome: string } | null;
  onChiudi: () => void;
  /** Dopo il salvataggio: chi apre la finestra rilegge. */
  onFatto: () => void;
}

/** La finestra di «Aggiungi luogo» (due passi) o di «Posiziona» (il solo punto). */
export function FinestraAggiungiLuogo({ quartiere, planimetrie, luogo = null, onChiudi, onFatto }: Props) {
  const [passo, setPasso] = useState<1 | 2>(luogo ? 2 : 1);
  const [modo, setModo] = useState<'esistente' | 'nuovo'>('esistente');
  const [esistente, setEsistente] = useState(luogo?.chiave ?? '');
  const [nuovo, setNuovo] = useState({ nome: '', tipo: 'negozio', cosaOffre: '' });
  const [orari, setOrari] = useState<OrariNegozio | null>(null);
  const [mappa, setMappa] = useState(planimetrie[0]?.chiave ?? '');
  const [punto, setPunto] = useState<{ x: number; y: number } | null>(null);
  const [occupato, setOccupato] = useState(false);
  const q = useCarica(() => (luogo ? Promise.resolve(null) : getQuartiere(quartiere)), [quartiere, luogo?.chiave]);
  const planimetria = planimetrie.find((p) => p.chiave === mappa) ?? null;
  const src = useImmagineMappa(planimetria);
  // prima i luoghi senza pin (quelli da posizionare), poi gli altri
  const luoghi = [...(q.dati?.luoghi ?? [])].sort((a, b) => Number(!!a.pin) - Number(!!b.pin));
  const nomeScelto = luogo?.nome ?? (modo === 'nuovo' ? nuovo.nome.trim() : luoghi.find((l) => l.chiave === esistente)?.nome ?? '');
  const passo1Pronto = modo === 'esistente' ? !!esistente : nuovo.nome.trim().length > 0;

  /** Salva: il luogo (nuovo o esistente), il pin sul punto e l'area della planimetria. */
  const salva = async () => {
    if (!punto || !mappa) return;
    setOccupato(true);
    try {
      const l = await posizionaLuogo({
        ...(luogo || modo === 'esistente' ? { luogo: luogo?.chiave ?? esistente } : { nuovo: { nome: nuovo.nome.trim(), tipo: nuovo.tipo, cosaOffre: nuovo.cosaOffre.trim(), orari } }),
        mappa, x: punto.x, y: punto.y,
      });
      notifica('success', `«${l.nome}» è sulla planimetria.`);
      onFatto();
      onChiudi();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Posizionamento non riuscito.');
    } finally {
      setOccupato(false);
    }
  };

  return (
    <Modal titolo={luogo ? `Posiziona «${luogo.nome}»` : 'Aggiungi luogo'} aperta onChiudi={onChiudi} larga
      azioni={<>
        <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={onChiudi}>Annulla</button>
        {passo === 2 && !luogo && <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="indietro" dimensione={22} />} titolo="Indietro" disabled={occupato} onClick={() => setPasso(1)} />}
        {passo === 1
          ? <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="esegui" dimensione={22} />} titolo="Avanti: il punto" disabled={!passo1Pronto} onClick={() => setPasso(2)} />
          : <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="mappa" dimensione={22} />} titolo="Posiziona" disabled={occupato || !punto || !mappa} onClick={() => void salva()} />}
      </>}>
      {passo === 1 ? (
        <div className="flex flex-col gap-3 testo-13">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Quale luogo">
            <button type="button" role="radio" aria-checked={modo === 'esistente'} className={`chip touch ${modo === 'esistente' ? 'chip--attivo' : ''}`} onClick={() => setModo('esistente')}>Un luogo che esiste</button>
            <button type="button" role="radio" aria-checked={modo === 'nuovo'} className={`chip touch ${modo === 'nuovo' ? 'chip--attivo' : ''}`} onClick={() => setModo('nuovo')}>Nuovo luogo</button>
          </div>
          {modo === 'esistente'
            ? <Selettore className="selettore--in-linea" etichetta="Luogo" valore={esistente} segnaposto="Scegli il luogo…" ricerca="sempre" disabilitato={q.caricamento}
              opzioni={luoghi.map((l) => ({ chiave: l.chiave, nome: l.nome, dettaglio: l.pin ? 'ha già un pin' : 'da posizionare' }))} onCambia={setEsistente} />
            : <div className="flex flex-col gap-2">
              <label className="editor-mappa__campo">Nome del luogo<input className="form-input" maxLength={160} value={nuovo.nome} onChange={(e) => setNuovo({ ...nuovo, nome: e.target.value })} /></label>
              <SelettoreIcone compatto etichetta="Tipo" valore={nuovo.tipo} opzioni={OPZIONI_TIPO} onCambia={(tipo) => setNuovo({ ...nuovo, tipo })} />
              <label className="editor-mappa__campo">Che cosa offre<textarea className="form-input" rows={2} maxLength={600} value={nuovo.cosaOffre} onChange={(e) => setNuovo({ ...nuovo, cosaOffre: e.target.value })} /></label>
              <label className="flex items-center gap-2 testo-13 touch">
                <input type="checkbox" className="h-5 w-5" checked={orari === null} onChange={(e) => setOrari(e.target.checked ? null : { ...ORARI_SEMPRE })} />
                La guida non indica orari: vale la regola dell’app (giorno e sera)
              </label>
              {orari && <OrariEditor valore={orari} onCambia={setOrari} />}
            </div>}
        </div>
      ) : (
        <div className="flex flex-col gap-2 testo-13">
          <p className="m-0 text-text-secondary">Tocca il punto dove sta {nomeScelto ? `«${nomeScelto}»` : 'il luogo'}: lì nasce il suo pin.</p>
          {planimetrie.length > 1 && (
            <Selettore className="selettore--in-linea" etichetta="Planimetria" valore={mappa} ricerca="mai"
              opzioni={planimetrie.map((p) => ({ chiave: p.chiave, nome: p.etichetta ?? p.nome }))} onCambia={(k) => { setMappa(k); setPunto(null); }} />
          )}
          {src
            ? <SceltaPunto src={src} alt={`Planimetria ${planimetria?.etichetta ?? planimetria?.nome ?? ''}`} punto={punto} onPunto={setPunto} disabilitato={occupato} />
            : <p className="m-0 text-text-muted">Questa planimetria non ha un’immagine da toccare: caricala dall’editor.</p>}
        </div>
      )}
    </Modal>
  );
}
