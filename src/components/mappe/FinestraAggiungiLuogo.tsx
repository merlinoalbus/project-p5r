// ============================================================
// FinestraAggiungiLuogo — «Aggiungi luogo» e «Posiziona» (L5 F5, M §4.4, R5-18)
// ============================================================
//
// Passo 1 («Aggiungi luogo»): un luogo che esiste nel quartiere (prima quelli senza pin) o un luogo nuovo (nome, tipo, che cosa offre,
// orari se la guida li dà). Passo 2: il tocco sul punto della planimetria (la stessa immagine e lo stesso gesto della finestra d'ingresso
// di L2), con la versione dell'area se ce n'è più d'una. Salva con `POST /api/luoghi/posiziona`, che crea (se nuovo) il luogo, il pin
// collegato e l'area in una volta. «Posiziona» di un luogo senza pin fa solo il passo 2. Sotto i 768 px la finestra è un foglio dal basso.
// L5-06: è il solo ingresso per creare un luogo dal quartiere e dall'area (dall'editor della mappa resta il luogo da un pin). Dall'area la planimetria è già data; dal quartiere (`aree`) il quartiere è quello della
// pagina e l'area si sceglie al passo 2, facoltativa: senza area (o senza il punto) il luogo nuovo nasce nel quartiere, da collocare o da
// posizionare dopo (`POST /api/catalogo/luogo`).
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { urlLuogo } from '../../utils/citta';
import { creaElementoCatalogo, getArea, getQuartiere, posizionaLuogo } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { useImmagineMappa } from '../../hooks/useImmagineMappa';
import { notifica } from '../../stores/notificationStore';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { SceltaPunto } from './SceltaPunto';
import { CampiLuogo } from '../guida/moduli/CampiLuogo';
import { luogoHaSegno } from '../../../shared/tipiLuogo';
import type { OrariNegozio } from '../../../shared/orariNegozio';
import type { PlanimetriaAreaDto } from '../../types';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

type Planimetria = Pick<PlanimetriaAreaDto, 'chiave' | 'nome' | 'etichetta' | 'immagineUrl' | 'asset'>;

interface Props {
  /** Il quartiere (chiave) e il suo nome: i luoghi che esistono si scelgono fra i suoi. */
  quartiere: string;
  /** Dall'area: le sue versioni su cui si posiziona, la prima è quella proposta. */
  planimetrie?: ReadonlyArray<Planimetria>;
  /** Dal quartiere (L5-06): le sue aree, una delle quali si sceglie (facoltativa) al passo 2. */
  aree?: ReadonlyArray<{ slug: string; nome: string }>;
  /** Dall'area: la sua chiave, per un luogo nuovo creato senza il punto (un genere che non ha segno sulla mappa). */
  areaChiave?: string;
  /** «Posiziona»: il luogo è già scelto, resta solo il punto. */
  luogo?: { chiave: string; nome: string } | null;
  onChiudi: () => void;
  /** Dopo il salvataggio: chi apre la finestra rilegge. */
  onFatto: () => void;
}

/** La finestra di «Aggiungi luogo» (due passi) o di «Posiziona» (il solo punto). */
// L12 (passo 8): nel rilascio (sola lettura) la finestra non esiste; la condizione è costante di build, `FinestraAggiungiLuogoReale` esce dal bundle
export const FinestraAggiungiLuogo: StrumentoDiModifica<typeof FinestraAggiungiLuogoReale> = IN_RILASCIO ? NienteInRilascio : FinestraAggiungiLuogoReale;
function FinestraAggiungiLuogoReale({ quartiere, planimetrie: planimetrieDellArea, aree, areaChiave, luogo = null, onChiudi, onFatto }: Props) {
  const dalQuartiere = aree !== undefined;
  const [passo, setPasso] = useState<1 | 2>(luogo ? 2 : 1);
  // dal quartiere si crea (i luoghi che esistono si collocano con «Colloca» e si posizionano dalla loro area)
  const [modo, setModo] = useState<'esistente' | 'nuovo'>(dalQuartiere ? 'nuovo' : 'esistente');
  // L5-06: dal quartiere l'area (slug) è facoltativa; '' = nessuna, il luogo resta da collocare
  const [areaScelta, setAreaScelta] = useState('');
  const areaLetta = useCarica(() => (dalQuartiere && areaScelta ? getArea(quartiere, areaScelta) : Promise.resolve(null)), [dalQuartiere, quartiere, areaScelta]);
  const planimetrie: ReadonlyArray<Planimetria> = planimetrieDellArea ?? areaLetta.dati?.planimetrie ?? [];
  const [esistente, setEsistente] = useState(luogo?.chiave ?? '');
  // L3: il genere di posto si sceglie, non si propone: un luogo «negozio» o «distributore» nasce col suo punto vendita, e un genere già
  // scelto per chi non lo cambia creerebbe negozi senza volerlo
  const [nuovo, setNuovo] = useState<{ nome: string; tipo: string | null; cosaOffre: string }>({ nome: '', tipo: null, cosaOffre: '' });
  const [orari, setOrari] = useState<OrariNegozio | null>(null);
  const [mappaScelta, setMappa] = useState(planimetrie[0]?.chiave ?? '');
  // la versione scelta, o la prima dell'area (dal quartiere le planimetrie arrivano con l'area scelta)
  const mappa = planimetrie.some((p) => p.chiave === mappaScelta) ? mappaScelta : planimetrie[0]?.chiave ?? '';
  const [punto, setPunto] = useState<{ x: number; y: number } | null>(null);
  const [occupato, setOccupato] = useState(false);
  const navigate = useNavigate();
  // del luogo già scelto conta la chiave: con un luogo non si legge il quartiere
  const chiaveLuogo = luogo?.chiave;
  const q = useCarica(() => (chiaveLuogo !== undefined ? Promise.resolve(null) : getQuartiere(quartiere)), [quartiere, chiaveLuogo]);
  const planimetria = planimetrie.find((p) => p.chiave === mappa) ?? null;
  const src = useImmagineMappa(planimetria);
  // prima i luoghi senza pin (quelli da posizionare), poi gli altri
  // (solo quelli il cui genere ha un segno che porta al luogo: gli altri non si posizionano con un pin)
  const luoghi = [...(q.dati?.luoghi ?? [])].filter((l) => luogoHaSegno(l.tipo)).sort((a, b) => Number(!!a.pin) - Number(!!b.pin));
  const nomeScelto = luogo?.nome ?? (modo === 'nuovo' ? nuovo.nome.trim() : luoghi.find((l) => l.chiave === esistente)?.nome ?? '');
  const passo1Pronto = modo === 'esistente' ? !!esistente : nuovo.nome.trim().length > 0 && nuovo.tipo !== null;

  // un genere di posto il cui segno non può citare un luogo (Altro e Punto di interesse fanno una «Nota», `luogoHaSegno`): il luogo nuovo
  // si crea senza il punto, nell'area (`creaSpillo` lo rifiuterebbe con «riferimento-non-ammesso»); quelli che esistono non si posizionano
  const segnoAmmesso = modo !== 'nuovo' || nuovo.tipo === null || luogoHaSegno(nuovo.tipo);
  /** Un luogo nuovo si crea anche senza il punto: dal quartiere (nell'area scelta, o da collocare) e per un genere senza segno. */
  const senzaPunto = modo === 'nuovo' && (!segnoAmmesso || (dalQuartiere && !punto));
  /** L'area scelta dal quartiere non si è letta: il luogo non nasce fuori dall'area senza dirlo. */
  const areaNonLetta = dalQuartiere && !!areaScelta && !areaLetta.caricamento && !areaLetta.dati;

  /** Salva: il luogo (nuovo o esistente), il pin sul punto e l'area della planimetria; dal quartiere, senza punto, il solo luogo. */
  const salva = async () => {
    if (!senzaPunto && (!punto || !mappa)) return;
    setOccupato(true);
    try {
      if (senzaPunto) {
        const c = await creaElementoCatalogo('luogo', { nome: nuovo.nome.trim(), tipo: nuovo.tipo ?? 'altro', cosa_offre: nuovo.cosaOffre.trim(), orari_json: orari,
          quartiere_chiave: quartiere, area_chiave: areaChiave ?? areaLetta.dati?.chiave ?? null });
        // una frase vera per ogni caso: da collocare (senza area), nell'area da posizionare, nell'area senza pin (genere senza segno)
        const nellArea = areaChiave !== undefined || !!areaLetta.dati;
        notifica('success', !nellArea ? `«${c.nome}» è nel quartiere, da collocare in un’area.`
          : segnoAmmesso ? `«${c.nome}» è nell’area, da posizionare sulla sua planimetria.` : `«${c.nome}» è nell’area, senza pin.`);
        onFatto();
        onChiudi();
        navigate(urlLuogo(c.chiave), { state: { apriPosto: c.puntoVendita ?? true } });
        return;
      }
      if (!punto) return;
      const l = await posizionaLuogo({
        ...(luogo || modo === 'esistente' ? { luogo: luogo?.chiave ?? esistente } : { nuovo: { nome: nuovo.nome.trim(), tipo: nuovo.tipo ?? 'altro', cosaOffre: nuovo.cosaOffre.trim(), orari } }),
        mappa, x: punto.x, y: punto.y,
      });
      notifica('success', `«${l.nome}» è sulla planimetria.`);
      onFatto();
      onChiudi();
      // L3: un luogo nuovo si apre; se nasce per vendere, sul suo primo punto vendita, dove si scrive il listino
      if (!luogo && modo === 'nuovo') navigate(urlLuogo(l.chiave), { state: { apriPosto: l.listini[0]?.chiave ?? true } });
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
        {passo === 2 && !luogo && <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="indietro" dimensione={22} />} titolo="Indietro" disabled={occupato} onClick={() => { setPasso(1); setPunto(null); }} />}
        {passo === 1
          ? <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="esegui" dimensione={22} />} titolo={dalQuartiere ? 'Avanti: dove sta' : 'Avanti: il punto'} disabled={!passo1Pronto} onClick={() => setPasso(2)} />
          : senzaPunto
            ? <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="esegui" dimensione={22} />} titolo="Crea il luogo" disabled={occupato || areaLetta.caricamento || areaNonLetta} onClick={() => void salva()} />
            : <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="mappa" dimensione={22} />} titolo="Posiziona" disabled={occupato || !punto || !mappa} onClick={() => void salva()} />}
      </>}>
      {passo === 1 ? (
        <div className="flex flex-col gap-3 testo-13">
          {/* dal quartiere si crea soltanto: un luogo che esiste si colloca con «Colloca» e si posiziona dalla sua area */}
          {!dalQuartiere && <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Quale luogo">
            <button type="button" role="radio" aria-checked={modo === 'esistente'} className={`chip touch ${modo === 'esistente' ? 'chip--attivo' : ''}`} onClick={() => setModo('esistente')}>Un luogo che esiste</button>
            <button type="button" role="radio" aria-checked={modo === 'nuovo'} className={`chip touch ${modo === 'nuovo' ? 'chip--attivo' : ''}`} onClick={() => setModo('nuovo')}>Nuovo luogo</button>
          </div>}
          {modo === 'esistente'
            ? <Selettore className="selettore--in-linea" etichetta="Luogo" valore={esistente} segnaposto="Scegli il luogo…" ricerca="sempre" disabilitato={q.caricamento}
              opzioni={luoghi.map((l) => ({ chiave: l.chiave, nome: l.nome, dettaglio: l.pin ? 'ha già un pin' : 'da posizionare' }))} onCambia={setEsistente} />
            // L13 (O7-5): i campi del luogo nuovo sono quelli del modulo del luogo (`CampiLuogo`), non una copia
            : <div className="griglia-campi">
              <CampiLuogo valore={{ ...nuovo, orari }} onCambia={(p) => {
                if (p.orari !== undefined) setOrari(p.orari);
                setNuovo((n) => ({ nome: p.nome ?? n.nome, tipo: p.tipo ?? n.tipo, cosaOffre: p.cosaOffre ?? n.cosaOffre }));
              }} />
            </div>}
        </div>
      ) : (
        <div className="flex flex-col gap-2 testo-13">
          {/* L5-06: dal quartiere l'area si sceglie qui; senza, il luogo nuovo nasce da collocare */}
          {dalQuartiere && <Selettore className="selettore--in-linea" etichetta="Area" valore={areaScelta} ricerca="sempre" disabilitato={occupato}
            vuoto="Nessuna per ora"
            opzioni={aree.map((a) => ({ chiave: a.slug, nome: a.nome }))} onCambia={(k) => { setAreaScelta(k); setPunto(null); setMappa(''); }} />}
          {!segnoAmmesso
            ? <p className="m-0 text-text-secondary">Questo genere di posto non ha un segno sulla mappa che porti al luogo: {dalQuartiere && !areaScelta ? 'il luogo nasce da collocare' : 'il luogo nasce nell’area, senza pin'}.</p>
            : dalQuartiere && !areaScelta
              ? <p className="m-0 text-text-secondary">Senza area il luogo nasce da collocare: l’area e il segno sulla mappa si danno dopo.</p>
              : <p className="m-0 text-text-secondary">Tocca il punto dove sta {nomeScelto ? `«${nomeScelto}»` : 'il luogo'}: lì nasce il suo pin{dalQuartiere && modo === 'nuovo' ? '; senza il punto il luogo nasce nell’area, da posizionare' : ''}.</p>}
          {segnoAmmesso && planimetrie.length > 1 && (
            <Selettore className="selettore--in-linea" etichetta="Planimetria" valore={mappa} ricerca="mai"
              opzioni={planimetrie.map((p) => ({ chiave: p.chiave, nome: p.etichetta ?? p.nome }))} onCambia={(k) => { setMappa(k); setPunto(null); }} />
          )}
          {areaNonLetta && <p role="alert" className="m-0 testo-13 text-error-testo">L’area non si è letta: riprova a sceglierla, o scegli «Nessuna per ora».</p>}
          {segnoAmmesso && !areaNonLetta && (!dalQuartiere || areaScelta) && (areaLetta.caricamento
            ? <p className="m-0 text-text-muted" role="status">Caricamento delle planimetrie dell’area…</p>
            : src
              ? <SceltaPunto src={src} alt={`Planimetria ${planimetria?.etichetta ?? planimetria?.nome ?? ''}`} punto={punto} onPunto={setPunto} disabilitato={occupato} />
              : <p className="m-0 text-text-muted">{planimetria ? 'Questa planimetria non ha un’immagine da toccare: caricala dall’editor.' : 'Quest’area non ha planimetrie.'}</p>)}
        </div>
      )}
    </Modal>
  );
}
