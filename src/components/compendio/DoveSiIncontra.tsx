// ============================================================
// DoveSiIncontra — nella scheda di una Persona: le Ombre che la portano, dove si incontrano e se è registrata nella partita (L8, R8-05, R8-07)
// ============================================================
//
// Una sola fonte, quella delle Ombre (`GET /api/compendio/ombre?persona=`): lo stesso «dove si incontra» della Battaglia, dei dedali e della pagina
// Ombra, con un Palazzo concluso dichiarato non più raggiungibile (R8-15b). La registrazione è la strada unica del compendio: un tocco la fa, togliere
// chiede la conferma di sempre. La Persona si registra a mano anche se nessuna Ombra si cattura dall'incontro (fusione, Babau/Bugs).
// ============================================================

import { Link } from 'react-router-dom';
import { getOmbre } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { useCatturaPersona } from '../../hooks/useCatturaPersona';
import { AvvisoTogliPersona, PiastrelleCattura } from '../guida/PiastrelleCattura';
import { NOME_PERSONALITA } from '../../../shared/elementi';
import type { OmbraLuogoDto } from '../../../shared/ombre';
import { TitoloSezione } from '../shared/TitoloSezione';

interface Props {
  persona: { id: number; nome: string; nomeIt: string };
  partitaId: number | null;
}

const percorso = (l: OmbraLuogoDto): string => [l.dungeonNome, l.infiltrazione?.nome, l.areeDedalo.length > 0 ? l.areeDedalo.map((a) => a.nome).join(', ') : null].filter(Boolean).join(' › ');

/** La sezione «Dove si incontra» con le Ombre, i luoghi e la registrazione nella partita. */
export function DoveSiIncontra({ persona, partitaId }: Props) {
  const ombre = useCarica(() => getOmbre({ persona: persona.id, partita: partitaId ?? undefined }), [persona.id, partitaId]);
  const cattura = useCatturaPersona(partitaId);
  const elenco = ombre.dati ?? [];
  // l'incontro da cui si cattura, se ce n'è uno: il server controlla la sua catturabilità; altrimenti la registrazione è a mano
  const daIncontro = elenco.find((o) => o.catturabile);
  const registrata = cattura.catturate?.has(persona.id) ?? null;
  return (
    <section className="card flex flex-col gap-2" aria-label="Dove si incontra">
      <TitoloSezione>Dove si incontra</TitoloSezione>
      <div className="flex flex-wrap items-start gap-3">
        <div className="w-[104px] shrink-0">
          <PiastrelleCattura aria-label={`Registrazione di ${persona.nomeIt}`} partitaId={partitaId} catturate={cattura.catturate} occupata={cattura.occupata} onTocca={cattura.tocca}
            voci={[{ chiave: `persona-${persona.id}`, persona, etichetta: persona.nomeIt, ...(daIncontro ? { ombra: daIncontro.chiave } : {}) }]} />
        </div>
        <p className="m-0 min-w-0 flex-1 testo-13" role="status">
          {!partitaId ? 'Attiva una partita per vedere se è registrata.' : registrata === null ? 'Leggo il compendio…' : registrata ? 'Registrata nel compendio della partita.' : 'Non registrata nel compendio della partita: tocca la piastrella per registrarla.'}
        </p>
      </div>
      {cattura.daTogliere?.persona && <AvvisoTogliPersona nome={cattura.daTogliere.persona.nomeIt} occupato={cattura.occupata !== null} onConferma={cattura.conferma} onAnnulla={cattura.annulla} />}
      {ombre.errore && <p className="m-0 testo-12 text-error" role="alert">{ombre.errore}</p>}
      {!ombre.errore && elenco.length === 0 && !ombre.caricamento && <p className="m-0 testo-13 text-text-muted">La guida non ha Ombre con questa Persona: si ottiene per fusione o la si registra dal compendio.</p>}
      {elenco.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {elenco.map((o) => (
            <li key={o.chiave} className="flex flex-col gap-0.5 testo-13">
              <span className="flex flex-wrap items-center gap-x-2">
                <Link to={o.casa} className="touch inline-flex min-h-11 items-center font-semibold">{o.nome}</Link>
                <span className="chip testo-12">{NOME_PERSONALITA[o.personalita]}</span>
                {!o.catturabile && <span className="testo-12 text-text-muted">non si cattura dall’incontro</span>}
              </span>
              {o.luoghi.length === 0
                ? <span className="testo-12 text-text-muted">La guida non dice dove si incontra.</span>
                : o.luoghi.map((l) => (
                  <span key={`${l.dungeon}|${l.infiltrazione?.chiave ?? ''}`} className="flex flex-wrap items-center gap-x-2">
                    <Link to={l.casa} className={`touch inline-flex min-h-11 items-center testo-12 ${l.raggiungibile === false ? 'opacity-60' : ''}`}>{percorso(l)}</Link>
                    {l.raggiungibile === false && <span className="chip testo-12" title={l.motivoNonRaggiungibile}>Non più raggiungibile: il Palazzo è sparito</span>}
                  </span>
                ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
