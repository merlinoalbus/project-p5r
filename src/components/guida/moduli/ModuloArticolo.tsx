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
        {collegato.effetto && <p className="m-0 whitespace-pre-wrap">{collegato.effetto}</p>}
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
        <Campo nome="quantita" etichetta="Quante se ne possono comprare" tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} aiuto="Vuoto = nessun limite dichiarato" />
        <Campo nome="nota" etichetta="Nota" tipo="testolungo" dati={dati} imposta={imposta} disabilitato={disabilitato} max={600} />
      </Griglia>
    </div>
  );
}
