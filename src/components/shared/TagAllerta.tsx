// ============================================================
// TagAllerta — il tag di un'allerta meteo del gioco in una giornata (2026-10-12)
// ============================================================
//
// Richiesta dell'utente: «vorrei venisse mostrato un tag con l'allerta meteo quando in quella giornata è presente». Scelte: nella
// scheda del giorno (Partita → Oggi e Guida giorno per giorno) e nel calendario; il tag dice «Solo il nome» — gli effetti
// stanno nel suggerimento al passaggio del mouse, il tag non si tocca. Se l'allerta vale in una fascia sola lo dice
// («Notte torrida · sera»). L'icona è quella di Codex per l'allerta (`ui/allerta-<nome>`, consegna
// `docs/grafica/consegna-2026-10-12-allerte.md`); finché non c'è, il segno d'allarme generico.
// ============================================================

import { AssetImg } from './AssetImg';
import { IconaAzione } from './IconaAzione';
import { ModificaGuida } from '../guida/ModificaGuida';
import { dataGiocoTesto } from '../../utils/dateGioco';
import type { AllertaGiornoDto } from '../../types';

/** Il nome dell'asset dell'icona di un'allerta: `ui/allerta-<chiave>` senza il doppio «allerta» («allerta-polline» → `ui/allerta-polline`). */
const assetAllerta = (chiave: string): string => `ui/allerta-${chiave.replace(/^allerta-/, '')}`;

/** «· sera» o «· giorno» se l'allerta vale in una fascia sola; niente se vale tutto il giorno. */
const fasciaSola = (a: AllertaGiornoDto): string | null => (a.fasce.length === 1 ? (a.fasce[0] === 'sera' ? 'sera' : 'giorno') : null);

/** Il tag di un'allerta: icona, nome e, se vale in una fascia sola, la fascia; gli effetti nel suggerimento. */
export function TagAllerta({ allerta: a, compatto }: { allerta: AllertaGiornoDto; compatto?: boolean }) {
  const fascia = fasciaSola(a);
  return (
    <span className={`chip chip--allerta ${compatto ? 'text-[11px]' : ''}`} title={`${a.nome}${fascia ? ` (solo di ${fascia})` : ''}: ${a.effetti.join(' ')}`}>
      <AssetImg nome={assetAllerta(a.chiave)} alt="" decorativa className="size-4 shrink-0 object-contain" fallback={<IconaAzione chiave="allarme" dimensione={14} />} />
      <span><span className="sr-only">Allerta meteo: </span>{a.nome}{fascia ? <> · <span className="sr-only">solo di </span>{fascia}</> : null}</span>
    </span>
  );
}

/**
 * I tag delle allerte di un giorno, uno per allerta; niente se il giorno non ne ha. Con `modifica` (R11-15/1) accanto a ogni tag c'è la matita
 * per correggere l'allerta di quel giorno e rimetterla com'è nella guida (`ModificaGuida`, tipo `allerta-meteo`); un'allerta corretta lo dice.
 * Senza `modifica` il tag non si tocca (scelta «Solo il nome»): così nelle intestazioni cliccabili e nella pagina Partita non cambia niente.
 */
export function TagAllerte({ allerte, compatto, modifica }: { allerte: readonly AllertaGiornoDto[]; compatto?: boolean; modifica?: { data: string; onSalvato: () => void } }) {
  if (allerte.length === 0) return null;
  if (!modifica) return <>{allerte.map((a) => <TagAllerta key={a.chiave} allerta={a} compatto={compatto} />)}</>;
  return (
    <>
      {allerte.map((a) => (
        <span key={a.chiave} className="inline-flex flex-wrap items-center gap-1">
          <TagAllerta allerta={a} compatto={compatto} />
          {a.modificata && <span className="chip text-[11px]">corretta</span>}
          <ModificaGuida tipo="allerta-meteo" chiave={`${modifica.data}:${a.chiave}`} cosa={`l’allerta «${a.nome}» del ${dataGiocoTesto(modifica.data)}`} soloIcona onSalvato={modifica.onSalvato} />
        </span>
      ))}
    </>
  );
}
