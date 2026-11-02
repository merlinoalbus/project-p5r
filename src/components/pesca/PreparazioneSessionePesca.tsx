// ============================================================
// RiepilogoSessionePreparata — la visita di pesca preparata, nella finestra «Confermi?» della decisione di una voce («Da applicare»)
// ============================================================
//
// Il modulo unico di prima (`PreparazioneSessionePesca`) non c'è più: dal 01/11 (decisione dell'utente) anche «Da applicare» prepara la
// pesca di una voce con il foglio in tre passi `RegistraVisitaPesca`. Qui resta il riepilogo che la decisione mostra prima della conferma.
// ============================================================

import type { NuovaSessionePesca, SessionePescaDto } from '../../../shared/pesca';
import { dataGiocoTesto } from '../../utils/dateGioco';
import { RiepilogoOsservazionePesca } from './ProfiliPesca';

export function RiepilogoSessionePreparata({ richiesta: r, sessioneFotografata }: { richiesta: NuovaSessionePesca; sessioneFotografata?: SessionePescaDto }) {
  return <div className="flex min-w-0 flex-col gap-2 rounded border border-border p-2 testo-13">
    <strong>{r.scelta.tipo === 'nuova' ? 'Visita da registrare' : 'Registrazione da aggiungere a una visita già segnata'}</strong>
    <span>{dataGiocoTesto(r.momento.giorno)} · {r.momento.fascia} · visita {r.momento.ordineVisita + 1} nella fascia.</span>
    <span>{r.turno.tipo === 'nuovo' ? 'Conta un turno nuovo.' : r.turno.tipo === 'esistente' ? `Si collega al turno ${r.turno.ordine}, già contato: il conteggio non cambia.` : 'È una delle visite già contate prima: il conteggio non cambia.'}</span>
    {/* L7-04: niente firme, uid né id: la visita e le sue fonti si dicono con il momento e con il tipo */}
    <span>Registrata da: {r.fonte.tipo === 'manuale' ? 'dichiarazione a mano' : 'voce del Diario'}.</span>
    {r.scelta.tipo === 'collega' && <>
      {sessioneFotografata?.id === r.scelta.sessioneId ? <div className="flex min-w-0 flex-col gap-1">
        <span>Visita scelta: {sessioneFotografata.nome} · {dataGiocoTesto(sessioneFotografata.momento.giorno)} · {sessioneFotografata.momento.fascia} · visita {sessioneFotografata.momento.ordineVisita + 1} nella fascia.</span>
        <strong>Già registrata da</strong>
        {!sessioneFotografata.fonti.length && <span>Nessuna registrazione attiva.</span>}
        <ul className="m-0 pl-4">{sessioneFotografata.fonti.map(f => <li key={f.id} className="break-words">
          {f.fonte.tipo === 'manuale' ? 'Dichiarazione a mano' : 'Voce del Diario'}{f.orfana ? ' · la voce non c’è più' : ''}
        </li>)}</ul>
      </div> : <p role="alert" className="m-0 text-warning">Non si leggono le registrazioni della visita scelta: rileggi l’anteprima prima di confermare.</p>}
    </>}
    <RiepilogoOsservazionePesca osservazione={r.osservazione} />
  </div>;
}
