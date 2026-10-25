// ============================================================
// CampiEffettoVoce — i campi di un effetto della spunta, ognuno scelto PER NOME (mai chiavi digitate)
// ============================================================
//
// Un effetto cita il suo oggetto con una chiave interna (`makoto/07-30`, `takemi-clinic/…`, il numero di una Persona, la chiave di un
// evento): qui si sceglie da elenchi con ricerca (serviti da `percorso-elenchi` e `percorso-elenchi-effetti`) e la chiave la scrive
// l'app. Il formato dell'effetto non cambia (`EffettoVoce`).
// ============================================================

import { Selettore } from '../shared/Selettore';
import { AnteprimaPersona } from '../shared/AnteprimaPersona';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { RigaDote } from './RigaDote';
import { FilaScelta } from './FilaScelta';
import { CampiAcquistoEffetto, EditorEffettoPescaVoce } from './EditorEffettiVoce';
import { CATEGORIE_LETTURA, type CategoriaLettura } from '../../../shared/effettiAzione';
import { DOTI_SOCIALI, type DoteChiave } from '../../../shared/doti';
import type { EffettoVoce, RichiestaSalvaEffettiVoce } from '../../../shared/effettiVoce';
import { dataGiocoTesto } from '../../utils/dateGioco';
import { breve, conCorrente, opzioniArticoli, opzioniDomande, opzioniStoria, type ElenchiVoce } from '../../utils/opzioniEffetti';

type Righe = RichiestaSalvaEffettiVoce['effetti'];

export type { ElenchiVoce };

const FIN_DOVE = [{ chiave: '', nome: 'Completato' }, ...Array.from({ length: 9 }, (_, i) => ({ chiave: String(i + 1), nome: String(i + 1) }))];

type Turno = Extract<EffettoVoce, { tipo: 'turno' }>;

/** «Doti proprie di questo turno»: di norma il turno dà le Doti dell'attività; qui si dichiarano quelle di questo turno (il secondo turno al Beef Bowl Shop, la sera con Lala). */
export function DotiProprieTurno({ effetto: e, onCambia }: { effetto: Turno; onCambia: (e: Turno) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 testo-13 touch"><input type="checkbox" className="w-5 h-5" checked={e.doti !== undefined}
        onChange={(ev) => onCambia(ev.target.checked ? { ...e, doti: [{ dote: 'perizia', note: 2 }] } : { tipo: 'turno', attivita: e.attivita })} />Doti proprie di questo turno, al posto di quelle dell’attività</label>
      {e.doti?.map((d, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-0"><RigaDote etichetta={`Dote ${i + 1}`} dote={d} onCambia={(nuova) => onCambia({ ...e, doti: e.doti!.map((x, j) => (j === i ? nuova : x)) })} /></div>
          {e.doti!.length > 1 && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" aria-label={`Togli la Dote ${i + 1}`} onClick={() => onCambia({ ...e, doti: e.doti!.filter((_, j) => j !== i) })} />}
        </div>
      ))}
      {e.doti && e.doti.length < 5 && <PulsanteVisivo tono="fantasma" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi una Dote" onClick={() => onCambia({ ...e, doti: [...e.doti!, { dote: 'fascino', note: 2 }] })} />}
    </div>
  );
}

interface Props {
  effetto: EffettoVoce;
  elenchi: ElenchiVoce;
  /** Tutti gli effetti della voce: servono a pesca e Aojiru per i collegamenti fra effetti. */
  righe: Righe;
  onCambia: (e: EffettoVoce) => void;
}

/** I campi dell'effetto, secondo il suo genere. */
export function CampiEffettoVoce({ effetto: e, elenchi, righe, onCambia }: Props) {
  const { azione, effetti } = elenchi;
  switch (e.tipo) {
    case 'dote':
      return <RigaDote etichetta="Dote" dote={{ dote: e.dote, note: e.note }} onCambia={(d) => onCambia({ tipo: 'dote', ...d })} />;
    case 'lettura': {
      const lista = e.categoria === 'libro' ? azione.libri : e.categoria === 'film' ? azione.film : azione.videogiochi;
      return (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-2">
            <Selettore className="min-w-[8rem]" etichetta="Che cosa" valore={e.categoria} opzioni={CATEGORIE_LETTURA.map((c) => ({ chiave: c.chiave, nome: c.nome }))} ricerca="mai"
              onCambia={(v) => { if (v !== e.categoria) onCambia({ ...e, categoria: v as CategoriaLettura, chiave: '' }); }} />
            <Selettore className="min-w-[12rem] flex-1" etichetta="Titolo" valore={e.chiave} opzioni={conCorrente(lista, e.chiave, 'Titolo non più nell’elenco')} onCambia={(v) => onCambia({ ...e, chiave: v })} />
          </div>
          <span className="testo-13 text-text-secondary">Fin dove arriva</span>
          <FilaScelta etichetta="Fin dove arriva" valore={e.almeno === null ? '' : String(e.almeno)} opzioni={FIN_DOVE} onCambia={(v) => onCambia({ ...e, almeno: v === '' ? null : Number(v) })} />
        </div>
      );
    }
    case 'turno':
      return (
        <div className="flex flex-col gap-2">
          <Selettore etichetta="Attività (contata per volte)" valore={e.attivita} opzioni={conCorrente(azione.attivita.filter((a) => a.turni), e.attivita, 'Attività non più nell’elenco')} onCambia={(v) => onCambia({ ...e, attivita: v })} />
          <DotiProprieTurno effetto={e} onCambia={onCambia} />
        </div>
      );
    case 'acquisto': return <CampiAcquistoEffetto effetto={e} righe={righe} onCambia={onCambia} />;
    case 'pesca': return <EditorEffettoPescaVoce effetto={e} righe={righe} onCambia={onCambia} />;
    case 'fortuna':
      return <Selettore etichetta="Dote della Fortuna" valore={e.dote} ricerca="mai" opzioni={DOTI_SOCIALI.map((d) => ({ chiave: d.chiave, nome: d.nome }))} onCambia={(d) => onCambia({ tipo: 'fortuna', dote: d as DoteChiave })} />;
    case 'storia':
      return <Selettore etichetta="Evento di storia" valore={e.evento} opzioni={opzioniStoria(e.evento)} onCambia={(v) => onCambia({ tipo: 'storia', evento: v })} />;
    case 'domanda':
      return <Selettore etichetta="Domanda" valore={String(e.domanda)} opzioni={opzioniDomande(elenchi, e.domanda)} onCambia={(v) => onCambia({ tipo: 'domanda', domanda: Number(v) })} />;
    case 'cruciverba':
      return <Selettore etichetta="Cruciverba" valore={e.data} opzioni={conCorrente(effetti.cruciverba.map((c) => ({ chiave: c.data, nome: dataGiocoTesto(c.data), dettaglio: breve(c.indizio, 50) })), e.data, dataGiocoTesto(e.data))} onCambia={(v) => onCambia({ tipo: 'cruciverba', data: v })} />;
    case 'richiesta':
      return <Selettore etichetta="Richiesta" valore={e.richiesta} opzioni={conCorrente(azione.richieste, e.richiesta, 'Richiesta non più nell’elenco')} onCambia={(v) => onCambia({ tipo: 'richiesta', richiesta: v })} />;
    case 'articolo':
      return <Selettore etichetta="Articolo del negozio" valore={e.articolo} opzioni={conCorrente(opzioniArticoli(effetti), e.articolo, 'Articolo non più nell’elenco')} onCambia={(v) => onCambia({ tipo: 'articolo', articolo: v })} />;
    case 'invito':
      return <Selettore etichetta="Invito del Confidente" valore={e.invito} opzioni={conCorrente(effetti.inviti.map((i) => ({ chiave: i.chiave, nome: i.data ? dataGiocoTesto(i.data) : (i.nota || 'Invito'), dettaglio: i.nota ? breve(i.nota, 40) : undefined, gruppo: i.confidenteNome })), e.invito, 'Invito non più nell’elenco')}
        onCambia={(v) => onCambia({ tipo: 'invito', invito: v })} />;
    case 'persona': {
      const p = effetti.persone.find((x) => x.id === e.persona);
      return (
        <div className="flex flex-wrap items-end gap-2">
          {p && <AnteprimaPersona nome={p.nome} dimensione={44} />}
          <Selettore className="min-w-[12rem] flex-1" etichetta="Persona del compendio" valore={String(e.persona)} opzioni={effetti.persone.map((x) => ({ chiave: String(x.id), nome: x.nome, dettaglio: `${x.arcana} · Lv ${x.livello}` }))} onCambia={(v) => onCambia({ tipo: 'persona', persona: Number(v) })} />
        </div>
      );
    }
  }
}
