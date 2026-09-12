// ============================================================
// ModuloArticolo — prima si sceglie l'oggetto; se non c'è, si inserisce a mano con categoria a tessere ed effetto dichiarato
// ============================================================
//
// Con un oggetto collegato nome, categoria, effetto e statistiche vengono da lui e qui non si
// digitano: resta il prezzo, la quantità, il destinatario, la nota e le condizioni di sblocco
// (che dal 2026-09 stanno sull'articolo, non sul negozio). Senza collegamento si scrive tutto, e
// l'effetto si dichiara per famiglia. Un collegamento salvato che l'archivio non ha più si
// segnala e si conserva: non si scollega in silenzio.
// ============================================================

import { Selettore } from '../../shared/Selettore';
import { SelettoreIcone } from '../../shared/SelettoreIcone';
import { EditorEffetto } from '../EditorEffetto';
import { SceltaOggetto } from '../SceltaOggetto';
import { NOME_CATEGORIA_ARTICOLO, PERSONAGGI } from '../../../utils/negozi';
import type { EffettoOggetto } from '../../../../shared/effettiOggetto';
import type { OggettoSelezionabileDto } from '../../../types';
import { numeroDi, testoDi, type PropsModulo } from './base';
import { Blocco, Campo, Griglia } from './campi';
import { useNomiPerEffetti } from './nomiPerEffetti';

const OPZIONI_CATEGORIA = Object.entries(NOME_CATEGORIA_ARTICOLO).map(([chiave, nome]) => ({ chiave, nome }));
const OPZIONI_PER = [{ chiave: 'tutti', nome: 'Tutti' }, ...PERSONAGGI.map((p) => ({ chiave: p, nome: p }))];

export function ModuloArticolo({ dati, imposta, disabilitato, nuovo }: PropsModulo) {
  const collegato = (dati._collegato as OggettoSelezionabileDto | null) ?? null;
  const aMano = dati._aMano === true;
  const nomi = useNomiPerEffetti(aMano && !collegato);
  return (
    <div className="flex flex-col gap-3">
      <SceltaOggetto collegato={collegato} aMano={aMano} disabilitato={disabilitato}
        collegamento={nuovo ? undefined : { fonte: (dati.oggetto_fonte as string | null) ?? null, chiave: (dati.oggetto_chiave as string | null) ?? null }}
        onArchivio={(o) => { if (o && !collegato) imposta({ _collegato: o }); }}
        onCollega={(o) => imposta({ _collegato: o, _aMano: false, oggetto_fonte: o.fonte, oggetto_chiave: o.chiave, nome: o.nome, categoria: o.categoria, prezzo: numeroDi(dati.prezzo) ?? o.prezzo })}
        onScollega={() => imposta({ _collegato: null, _aMano: true, oggetto_fonte: null, oggetto_chiave: null })}
        onAMano={() => imposta({ _aMano: true, oggetto_fonte: null, oggetto_chiave: null })} />
      {aMano && !collegato && (
        <Griglia>
          <Campo nome="nome" etichetta="Nome dell'articolo" dati={dati} imposta={imposta} disabilitato={disabilitato} max={160} largo />
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
        </Griglia>
      )}
      <Griglia>
        <Campo nome="prezzo" etichetta="Prezzo in yen" tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} />
        <Campo nome="quantita" etichetta="Quante se ne possono comprare" tipo="numero" dati={dati} imposta={imposta} disabilitato={disabilitato} aiuto="Vuoto = nessun limite dichiarato" />
        <Blocco>
          <Selettore etichetta="Per chi" valore={testoDi(dati.per)} vuoto="Non indicato" ricerca="mai" disabilitato={disabilitato} opzioni={OPZIONI_PER} onCambia={(k) => imposta({ per: k || null })} />
        </Blocco>
        <Campo nome="nota" etichetta="Nota" tipo="testolungo" dati={dati} imposta={imposta} disabilitato={disabilitato} max={600} />
      </Griglia>
    </div>
  );
}
