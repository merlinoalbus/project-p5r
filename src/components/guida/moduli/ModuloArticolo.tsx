// ============================================================
// ModuloArticolo — l'offerta sceglie un'identità del catalogo, senza copiarne nome o proprietà
// ============================================================
//
// Prezzo, limite d'acquisto, nota e condizioni sono dell'offerta. Le righe storiche senza
// identità restano modificabili a mano; le nuove scelgono un oggetto. Una scelta non più
// disponibile viene segnalata e conservata, mai cancellata durante il caricamento.
// ============================================================

import { Link } from 'react-router-dom';
import { CATEGORIA_OGGETTO } from '../../../../shared/catalogo';
import { SceltaNelCatalogo } from '../../catalogo/SceltaCatalogoOggetto';
import { useCarica } from '../../../hooks/useCarica';
import { getCatalogoOggetti } from '../../../services/api/catalogoOggetti';
import { Selettore } from '../../shared/Selettore';
import { SelettoreIcone } from '../../shared/SelettoreIcone';
import { EditorEffetto } from '../EditorEffetto';
import { NOME_CATEGORIA_ARTICOLO, PERSONAGGI } from '../../../utils/negozi';
import type { EffettoOggetto } from '../../../../shared/effettiOggetto';
import { testoDi, type PropsModulo } from './base';
import { Blocco, Campo, Griglia } from './campi';
import { useNomiPerEffetti } from './nomiPerEffetti';
import { CostoOfferta } from './CostoOfferta';
import { PulsanteVisivo } from '../../shared/PulsanteVisivo';
import { IconaAzione } from '../../shared/IconaAzione';
import { useState } from 'react';
import { TestoNote } from '../../shared/TestoNote';
import { CampoTesto } from '../../shared/Campo';
import { GIORNI_SETTIMANA } from '../../../../shared/condizioniSpillo';
import { descriviRifornimento, type GiornoRifornimento, type RegolaRifornimento, type TipoRifornimento } from '../../../../shared/rifornimento';

const OPZIONI_CATEGORIA = Object.entries(NOME_CATEGORIA_ARTICOLO).map(([chiave, nome]) => ({ chiave, nome }));
const OPZIONI_PER = [{ chiave: 'tutti', nome: 'Tutti' }, ...PERSONAGGI.map((p) => ({ chiave: p, nome: p }))];

/** Il selettore comune risolve anche gli alias; i dati risolti servono solo all'anteprima. */
export function ModuloArticolo({ dati, imposta, disabilitato, nuovo }: PropsModulo) {
  const chiave = testoDi(dati.catalogo_chiave);
  const elenco = useCarica(() => getCatalogoOggetti(), []);
  const catalogo = { oggetti: elenco.dati, caricamento: elenco.caricamento, errore: elenco.errore, onRicarica: () => void elenco.ricarica() };
  const collegato = elenco.dati?.find((o) => o.chiave === chiave);
  const aMano = !chiave && !nuovo && dati._aMano === true;
  const nomi = useNomiPerEffetti(aMano);
  return (
    <div className="flex flex-col gap-3">
      <SceltaNelCatalogo {...catalogo} valore={chiave} disabilitato={disabilitato}
        onScegli={(o) => imposta({ catalogo_chiave: o.chiave, _aMano: false })} />
      {collegato && <div className="flex min-w-0 flex-col gap-1 testo-13">
        <Link className="touch inline-flex items-center self-start" to={collegato.casa}>{collegato.nome}</Link>
        <span className="text-text-muted">{CATEGORIA_OGGETTO[collegato.categoria].nome}</span>
        {collegato.effetto && <p className="m-0 whitespace-pre-wrap"><TestoNote testo={collegato.effetto} daParole="conteggi" /></p>}
      </div>}
      {chiave && !nuovo && <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="chiudi" dimensione={22} />} titolo="Scollega l’oggetto" className="self-start" disabled={disabilitato} onClick={() => imposta({ catalogo_chiave: null, _aMano: true, oggetto_fonte: null, oggetto_chiave: null })} />}
      <p className="m-0 testo-12 text-text-muted">Nome, categoria ed effetto si modificano nel catalogo dell’oggetto. Qui cambi solo la sua offerta nel negozio.</p>
      {aMano && (
        <Griglia>
          <Blocco largo><p className="m-0 testo-13">Questa offerta non ha un oggetto collegato. Puoi conservarne i dati storici o scegliere un’identità dal catalogo; scollegare non copia il nome dell’oggetto.</p></Blocco>
          <Campo nome="nome" etichetta="Nome dell’offerta non collegata" dati={dati} imposta={imposta} disabilitato={disabilitato} max={160} largo />
          <Blocco largo>
            <SelettoreIcone compatto etichetta="Categoria" valore={testoDi(dati.categoria) || 'altro'} opzioni={OPZIONI_CATEGORIA} disabilitato={disabilitato} onCambia={(categoria) => imposta({ categoria })} />
          </Blocco>
          <Blocco largo>
            <fieldset className="regole-editor flex flex-col gap-2">
              <legend>Che cosa fa</legend>
              <EditorEffetto conNessuno valore={(dati.effetto_json as EffettoOggetto | null) ?? null} onCambia={(e) => imposta({ effetto_json: e })} disabilitato={disabilitato} {...nomi} />
            </fieldset>
          </Blocco>
          <Campo nome="statistiche" etichetta="Statistiche" dati={dati} imposta={imposta} disabilitato={disabilitato} max={400} aiuto="Per esempio: Attacco 120 · Precisione 90" largo />
          <Blocco>
            <Selettore etichetta="Per chi" valore={testoDi(dati.per)} vuoto="Non indicato" ricerca="mai" disabilitato={disabilitato} opzioni={OPZIONI_PER} onCambia={(k) => imposta({ per: k || null })} />
          </Blocco>
        </Griglia>
      )}
      <CostoOfferta dati={dati} imposta={imposta} disabilitato={disabilitato} catalogo={catalogo} />
      <Griglia>
        <Campo nome="quantita" etichetta="Pezzi per ciclo" tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} aiuto="Quanti se ne comprano prima del rifornimento. Vuoto = nessun limite dichiarato" />
        <EditorRifornimento valore={(dati.rifornimento_json as RegolaRifornimento | null) ?? null} quantita={typeof dati.quantita === 'number' ? dati.quantita : null}
          nonLeggibile={dati._rifornimentoNonLeggibile === true && dati._rifornimentoModificato !== true}
          disabilitato={disabilitato} onCambia={(r) => imposta({ rifornimento_json: r, _rifornimentoModificato: true })} />
        <Campo nome="nota" etichetta="Nota" tipo="testolungo" dati={dati} imposta={imposta} disabilitato={disabilitato} max={600} largo />
      </Griglia>
    </div>
  );
}

const OPZIONI_RIFORNIMENTO: Array<{ chiave: TipoRifornimento; nome: string }> = [
  { chiave: 'giorno', nome: 'Il giorno dopo' }, { chiave: 'settimana', nome: 'Ogni settimana' }, { chiave: 'mese', nome: 'Il 1° del mese' },
  { chiave: 'pioggia', nome: 'A ogni giorno di pioggia' }, { chiave: 'mai', nome: 'Mai: pezzo unico' }, { chiave: 'consegna', nome: 'Dopo la consegna dell’ordine' },
  { chiave: 'restituzione', nome: 'Alla restituzione del libro' },
];
const OPZIONI_ORIGINE: Array<{ chiave: RegolaRifornimento['origine']; nome: string }> = [
  { chiave: 'guida', nome: 'Dalla guida' }, { chiave: 'fallback-utente', nome: 'Regola dell’utente (la guida tace)' },
];
const OPZIONI_GIORNO = GIORNI_SETTIMANA.map((g) => ({ chiave: g.chiave, nome: g.nome[0]!.toUpperCase() + g.nome.slice(1) }));

/**
 * I giorni di consegna dell'ordine (1-60): il campo si può svuotare e riscrivere; la regola cambia solo con un numero valido, e finché il
 * testo non lo è resta il valore di prima, con l'errore sotto il campo (prima un campo vuoto tornava subito a 1).
 */
function GiorniDiConsegna({ giorni, disabilitato, onCambia }: { giorni: number; disabilitato?: boolean; onCambia: (giorni: number) => void }) {
  const [testo, setTesto] = useState(String(giorni));
  const n = Number(testo);
  const valido = /^\d+$/.test(testo) && n >= 1 && n <= 60;
  return <CampoTesto etichetta="Giorni di consegna" tipo="numero" valore={testo} disabilitato={disabilitato} errore={valido ? undefined : `Da 1 a 60 giorni: resta ${giorni}.`}
    onCambia={(v) => { setTesto(v); const x = Number(v); if (/^\d+$/.test(v) && x >= 1 && x <= 60) onCambia(x); }} />;
}

/**
 * Ondata 5 (decisione 21): la regola di rifornimento dell'offerta, un punto solo (`articolo.rifornimento_json`): quando torna, da dove viene
 * la regola e se va verificata in gioco. Il giorno della settimana solo per «Ogni settimana», i giorni di consegna solo per l'ordine.
 */
function EditorRifornimento({ valore, quantita, nonLeggibile, disabilitato, onCambia }: { valore: RegolaRifornimento | null; quantita: number | null; nonLeggibile?: boolean; disabilitato?: boolean; onCambia: (r: RegolaRifornimento | null) => void }) {
  const cambiaTipo = (tipo: string) => {
    if (!tipo) { onCambia(null); return; }
    const t = tipo as TipoRifornimento;
    onCambia({ tipo: t, origine: valore?.origine ?? 'guida', ...(t === 'settimana' ? { giorno: valore?.giorno ?? 'lunedi' } : {}), ...(t === 'consegna' ? { giorni: valore?.giorni ?? 3 } : {}),
      ...(valore?.daVerificare ? { daVerificare: true } : {}) });
  };
  return (
    <fieldset className="regole-editor campo--largo flex min-w-0 flex-col gap-2">
      <legend>Rifornimento</legend>
      {nonLeggibile && <p className="m-0 testo-12 text-text-muted text-pretty">La regola salvata non è leggibile da questo modulo: resta com’è finché non ne scegli un’altra.</p>}
      <div className="griglia-campi">
        <Blocco><Selettore etichetta="Torna in negozio" valore={valore?.tipo ?? ''} vuoto="Nessuna regola" ricerca="mai" disabilitato={disabilitato} opzioni={OPZIONI_RIFORNIMENTO} onCambia={cambiaTipo} /></Blocco>
        {valore?.tipo === 'settimana' && <Blocco><Selettore etichetta="Giorno del rifornimento" valore={valore.giorno ?? 'lunedi'} ricerca="mai" disabilitato={disabilitato} opzioni={OPZIONI_GIORNO}
          onCambia={(g) => onCambia({ ...valore, giorno: g as GiornoRifornimento })} /></Blocco>}
        {valore?.tipo === 'consegna' && <GiorniDiConsegna giorni={valore.giorni ?? 3} disabilitato={disabilitato} onCambia={(giorni) => onCambia({ ...valore, giorni })} />}
        {valore && <Blocco><Selettore etichetta="Da dove viene la regola" valore={valore.origine} ricerca="mai" disabilitato={disabilitato} opzioni={OPZIONI_ORIGINE}
          onCambia={(o) => onCambia({ ...valore, origine: o as RegolaRifornimento['origine'] })} /></Blocco>}
      </div>
      {valore && <label className="touch flex items-center gap-2 testo-13"><input type="checkbox" className="h-5 w-5" checked={valore.daVerificare === true} disabled={disabilitato}
        onChange={(e) => { const resto: RegolaRifornimento = { ...valore }; delete resto.daVerificare; onCambia(e.target.checked ? { ...resto, daVerificare: true } : resto); }} />Da verificare in gioco</label>}
      {valore && <p className="m-0 testo-12 text-text-muted text-pretty">{descriviRifornimento(valore, quantita)}</p>}
    </fieldset>
  );
}
