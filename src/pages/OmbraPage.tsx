// ============================================================
// OmbraPage — la scheda di un'Ombra: Persona e cattura, debolezze dal compendio, dove si incontra, negoziazione (L8, B8, R8-06, R8-07d, R8-15b, R8-28)
// ============================================================
//
// Pensata per la battaglia, dal telefono: in alto la Persona con la piastrella che la cattura (un tocco, la strada unica del compendio), poi le
// debolezze, poi dove si incontra e se lo si può ancora raggiungere, poi la personalità con il collegamento alla sua negoziazione. Le affinità
// vengono dalla Persona del compendio; solo le 4 eccezioni di G-019 e le non reclutabili ne hanno di proprie, dichiarate.
// ============================================================

import { Link, useParams } from 'react-router-dom';
import { getOmbra } from '../services/api';
import { useCarica } from '../hooks/useCarica';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCatturaPersona } from '../hooks/useCatturaPersona';
import { usePartitaStore } from '../stores/partitaStore';
import { PageState } from '../components/shared/PageState';
import { IntestazioneScheda } from '../components/shared/IntestazioneScheda';
import { MenuModifica } from '../components/shared/MenuModifica';
import { CollegamentoVisivo } from '../components/shared/PulsanteVisivo';
import { IconaAzione } from '../components/shared/IconaAzione';
import { AffinitaGriglia } from '../components/compendio/AffinitaGriglia';
import { ModificaGuida } from '../components/guida/ModificaGuida';
import { AvvisoTogliPersona, PiastrelleCattura } from '../components/guida/PiastrelleCattura';
import { NOME_PERSONALITA } from '../../shared/elementi';
import type { OmbraDettaglioDto, OmbraLuogoDto } from '../../shared/ombre';
import { TitoloSezione } from '../components/shared/TitoloSezione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

/** Il percorso di un luogo: «Palazzo › infiltrazione» o «Memento › dedalo › aree». */
const percorso = (l: OmbraLuogoDto): string => [l.dungeonNome, l.infiltrazione?.nome, l.areeDedalo.length > 0 ? l.areeDedalo.map((a) => a.nome).join(', ') : null].filter(Boolean).join(' › ');

/** Da dove viene una riga di luogo, per la matita (R11-17/1): per esteso nel nome accessibile, in breve accanto alla matita quando il posto ha più righe. */
const FONTE_LUOGO = { battaglia: 'dalla guida alla Battaglia', voce: 'da una voce Persona della guida', utente: 'aggiunto da te' } as const;
const FONTE_BREVE = { battaglia: 'Battaglia', voce: 'Voce', utente: 'Tuo' } as const;

/** I luoghi d'incontro: ognuno un collegamento alla guida del posto; un Palazzo concluso è sparito dopo il furto (R8-15b). Ogni riga di luogo si corregge dalla sua matita (R11-17/1). */
function Luoghi({ o, onSalvato }: { o: OmbraDettaglioDto; onSalvato: () => void }) {
  return (
    <section className="card flex flex-col gap-1.5" aria-label="Dove si incontra">
      <TitoloSezione variante="display">Dove si incontra</TitoloSezione>
      {o.raggiungibilita && <p className="m-0 testo-13" role="status">{o.raggiungibilita.testo}</p>}
      {o.luoghi.length === 0
        ? <p className="m-0 testo-13 text-text-muted">La guida non dice dove si incontra.</p>
        : (
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {o.luoghi.map((l) => (
              <li key={`${l.dungeon}|${l.infiltrazione?.chiave ?? ''}`} className="flex flex-wrap items-center gap-x-2">
                <Link to={l.casa} className={`touch inline-flex min-h-11 items-center testo-13 ${l.raggiungibile === false ? 'opacity-60' : ''}`}>{percorso(l)}</Link>
                {l.raggiungibile === false && <span className="chip testo-12" title={l.motivoNonRaggiungibile}>Non più raggiungibile: il Palazzo è sparito</span>}
                {l.righe.map((r) => (
                  <span key={r.id} className="inline-flex items-center gap-0.5">
                    {l.righe.length > 1 && <span className="testo-12 text-text-muted">{FONTE_BREVE[r.fonte]}</span>}
                    <ModificaGuida tipo="ombra-luogo" chiave={String(r.id)} soloIcona onSalvato={onSalvato}
                      cosa={`il luogo d’incontro «${percorso(l)}» di «${o.nome}» (${FONTE_LUOGO[r.fonte]})`} />
                  </span>
                ))}
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}

export function OmbraPage() {
  const { chiave = '' } = useParams();
  const attiva = usePartitaStore((s) => s.attiva);
  const partitaId = attiva?.id ?? null;
  const dati = useCarica(() => getOmbra(chiave, partitaId ?? undefined), [chiave, partitaId]);
  const cattura = useCatturaPersona(partitaId);
  const o = dati.dati;
  useDocumentTitle(o ? o.nome : 'Ombra');
  return (
    <PageState isLoading={dati.caricamento && !o} error={dati.errore} onRetry={() => void dati.ricarica()}>
      {o && (
        <div className="flex flex-col gap-3">
          {/* L11 · R11-15/4: un solo punto di modifica dell'Ombra (nome, personalità, livello, negoziabilità, note, affinità proprie), con «Ripristina» ai valori della guida */}
          <IntestazioneScheda ripiego="/guida/battaglia" titolo={o.nome}
            chip={o.origine === 'utente' ? <span className="chip testo-12">corretta</span> : undefined}
            azioni={IN_RILASCIO ? undefined : <MenuModifica cosa={`l’Ombra «${o.nome}»`}>
              <ModificaGuida tipo="ombra" chiave={o.chiave} cosa={`l’Ombra «${o.nome}»`} etichetta="Testi della guida" onSalvato={() => void dati.ricarica()} />
            </MenuModifica>}>
            <p className="m-0 testo-13 text-text-secondary">{`${o.persona ? `Maschera ${o.persona.nomeIt}` : o.macheraNota ? `Maschera ${o.macheraNota}, non reclutabile` : 'Non reclutabile'}${o.livello !== null ? ` · livello ${o.livello}` : ''}${o.nomiAltri.length > 0 ? ` · detta anche ${o.nomiAltri.join(', ')}` : ''}`}</p>
          </IntestazioneScheda>
          <section className="card flex flex-col gap-2" aria-label="Persona e cattura">
            <TitoloSezione variante="display">Persona</TitoloSezione>
            {o.persona ? (
              <div className="flex flex-wrap items-start gap-3">
                <div className="w-[104px] shrink-0">
                  <PiastrelleCattura aria-label={`Cattura di ${o.nome}`} partitaId={partitaId} catturate={cattura.catturate} occupata={cattura.occupata} onTocca={cattura.tocca}
                    voci={[{ chiave: o.chiave, persona: o.persona, etichetta: o.persona.nomeIt, ombra: o.chiave, catturabile: o.catturabile }]} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1 testo-13">
                  <span>{!partitaId ? 'Attiva una partita per segnare la cattura.'
                    : cattura.catturate === null ? 'Leggo il compendio…'
                    : cattura.catturate.has(o.persona.id) ? 'Registrata nel compendio della partita.' : o.catturabile ? 'Non ancora registrata: tocca la piastrella quando l’hai catturata.' : 'Non registrata: si ottiene dal compendio o per fusione.'}</span>
                  <Link to={`/compendio/persona/${o.persona.id}`} className="touch inline-flex min-h-11 items-center">Scheda del compendio</Link>
                </div>
              </div>
            ) : <p className="m-0 testo-13 text-text-muted">Quest’Ombra non è reclutabile: non ha una Persona da catturare.</p>}
            {cattura.daTogliere?.persona && <AvvisoTogliPersona nome={cattura.daTogliere.persona.nomeIt} occupato={cattura.occupata !== null} onConferma={cattura.conferma} onAnnulla={cattura.annulla} />}
            {o.persona && !o.catturabile && <p className="m-0 testo-12 text-text-muted">L’incontro non espone la cattura: la Persona si registra dal compendio o per fusione.</p>}
          </section>
          <section className="card flex flex-col gap-2" aria-label="Debolezze">
            <TitoloSezione variante="display">Debolezze</TitoloSezione>
            {o.affinita.length > 0 ? <AffinitaGriglia affinita={o.affinita} /> : <p className="m-0 testo-13 text-text-muted">La guida non dice a cosa sia debole.</p>}
            {o.affinitaProprie && <p className="m-0 testo-12 text-text-muted">Alcune affinità sono proprie dell’Ombra: nel gioco sono diverse da quelle della sua Persona{o.persona ? '; le altre vengono dal compendio' : ''}.</p>}
          </section>
          <Luoghi o={o} onSalvato={() => void dati.ricarica()} />
          <section className="card flex flex-col gap-1.5" aria-label="Negoziazione">
            <TitoloSezione variante="display">Negoziazione</TitoloSezione>
            {o.personalita === 'sconosciuta'
              ? <p className="m-0 testo-13 text-text-muted">La personalità di quest’Ombra non è nota: nessun umore da proporre.</p>
              : o.negoziabile === false
                ? <p className="m-0 testo-13 text-text-muted">Personalità {NOME_PERSONALITA[o.personalita].toLowerCase()}, ma quest’Ombra non si negozia.</p>
                : (
                  <div className="flex flex-wrap items-center gap-2 testo-13">
                    <span>Personalità <strong>{NOME_PERSONALITA[o.personalita]}</strong></span>
                    <CollegamentoVisivo to={`/guida/battaglia?scheda=negoziazione&ombra=${encodeURIComponent(o.chiave)}`} tono="secondario" compatto icona={<IconaAzione chiave="dettagli" dimensione={20} />}
                      titolo="Negoziazione" dettaglio={`per ${NOME_PERSONALITA[o.personalita].toLowerCase()}`} />
                  </div>
                )}
          </section>
          {o.voci.length > 0 && (
            <section className="card flex flex-col gap-1" aria-label="Voci della guida">
              <TitoloSezione variante="display">Nella guida</TitoloSezione>
              <ul className="m-0 flex list-none flex-wrap gap-x-3 p-0 testo-12">
                {o.voci.map((v) => (
                  <li key={v.chiave} className="flex items-center">
                    <Link to={`/guida/dungeon/${v.dungeon}?${v.dungeon === 'mementos' ? 'area' : 'infiltrazione'}=${encodeURIComponent(v.infiltrazione)}`} className="touch inline-flex min-h-11 items-center">{v.nome}</Link>
                    {/* R11-17/1: quale Ombra descrive la voce (se è un'altra, la voce passa alla sua pagina) */}
                    <ModificaGuida tipo="ombra-voce" chiave={v.chiave} soloIcona cosa={`la voce «${v.nome}»: quale Ombra descrive`} onSalvato={() => void dati.ricarica()} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {o.note && <p className="m-0 testo-12 text-text-muted">{o.note}</p>}
        </div>
      )}
    </PageState>
  );
}
