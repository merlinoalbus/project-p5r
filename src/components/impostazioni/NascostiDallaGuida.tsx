// ============================================================
// NascostiDallaGuida — le righe della guida nascoste dagli elenchi, nel Cestino, con il ripristino in un tocco (R10-23/4)
// ============================================================
//
// Era la pagina «Rimossi»: «Nascondi dagli elenchi» toglie la riga da ogni elenco ma non dai dati, e il comando per rimetterla stava nel
// modulo di quella riga, che non si vedeva più. Ora sta nel Cestino di Impostazioni, accanto a ciò che si è eliminato: è un ripristino,
// non una superficie di approvazione. Una sola lettura per tutti i tipi (`GET /api/impostazioni/cestino/nascosti`); «Rimetti negli
// elenchi» è lo stesso gesto di sempre (`PUT /api/catalogo/:tipo/:chiave/nascosta`).
// ============================================================

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useCarica } from '../../hooks/useCarica';
import { getNascostiDallaGuida, getNegozi, nascondiElementoCatalogo } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NOME_TIPO_CATALOGO } from '../../utils/catalogo';
import { TIPI_CATALOGO } from '../../../shared/types';

/** «Nascosti dalla guida»: le righe nascoste di ogni tipo, raggruppate per tipo, ciascuna con «Rimetti negli elenchi». */
export function NascostiDallaGuida() {
  const elenco = useCarica(() => getNascostiDallaGuida(), []);
  const negozi = useCarica(() => getNegozi(), []);
  const righe = elenco.dati ?? [];
  /** Il nome del negozio di un articolo, dalla sua chiave; se non è fra quelli caricati resta la chiave. */
  const nomeNegozio = (chiave: unknown) => negozi.dati?.find((n) => n.chiave === chiave)?.nome ?? (typeof chiave === 'string' ? chiave : '');
  const ripristina = (tipo: (typeof TIPI_CATALOGO)[number], chiave: string, nome: string) => {
    void nascondiElementoCatalogo(tipo, chiave, false)
      .then(() => { notifica('success', `«${nome}» è di nuovo negli elenchi.`); void elenco.ricarica(); })
      .catch((err: unknown) => notifica('error', err instanceof Error ? err.message : 'Ripristino fallito.'));
  };
  // Con `#nascosti` nell'indirizzo la pagina scorre fino a qui. Le sezioni sopra si caricano dopo e spostano la pagina: finché l'utente non
  // scorre da sé (rotella, tocco, tastiera) o non passano alcuni secondi, a ogni cambio di altezza si scorre di nuovo alla sezione.
  const { hash, key } = useLocation();
  const sezione = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = sezione.current;
    if (hash !== '#nascosti' || !el) return;
    const vai = () => el.scrollIntoView?.({ block: 'start' });
    vai();
    let attivo = true;
    const basta = () => { attivo = false; osservatore?.disconnect(); };
    const osservatore = typeof ResizeObserver === 'function' && el.parentElement ? new ResizeObserver(() => { if (attivo) vai(); }) : null;
    if (el.parentElement) osservatore?.observe(el.parentElement);
    const fine = window.setTimeout(basta, 4000);
    const eventi = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
    for (const e of eventi) window.addEventListener(e, basta, { passive: true, once: true });
    return () => { window.clearTimeout(fine); basta(); for (const e of eventi) window.removeEventListener(e, basta); };
  }, [hash, key]);
  return (
    <section ref={sezione} id="nascosti" className="card flex flex-col gap-3" aria-labelledby="titolo-nascosti">
      <div className="flex flex-col gap-1">
        <h2 id="titolo-nascosti" className="m-0 testo-15 font-semibold">Nascosti dalla guida{elenco.dati ? <span className="text-text-muted"> · {righe.length}</span> : null}</h2>
        <p className="m-0 testo-13 text-text-secondary">Le righe che hai nascosto dagli elenchi restano nei dati: qui le rimetti con un tocco.</p>
      </div>
      {elenco.errore && <p role="alert" className="m-0 testo-13 text-error">{elenco.errore}</p>}
      {elenco.caricamento && !elenco.dati && <p role="status" className="m-0 testo-13">Un attimo…</p>}
      {elenco.dati && righe.length === 0 && <p className="m-0 testo-13 text-text-muted">Nessuna riga nascosta.</p>}
      {TIPI_CATALOGO.map((tipo) => {
        const delTipo = righe.filter((r) => r.tipo === tipo);
        if (delTipo.length === 0) return null;
        return (
          <section key={tipo} className="flex flex-col gap-1" aria-label={`${NOME_TIPO_CATALOGO[tipo].plurale} nascosti`}>
            <h3 className="m-0 testo-14 font-semibold">{NOME_TIPO_CATALOGO[tipo].plurale}<span className="text-text-muted"> · {delTipo.length}</span></h3>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {delTipo.map((e) => (
                <li key={`${tipo}:${e.chiave}`} className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 flex-1 break-words testo-13">{e.nome}{tipo === 'articolo' && e.dati.negozio_chiave ? <span className="text-text-muted"> · {nomeNegozio(e.dati.negozio_chiave)}</span> : null}</span>
                  <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Rimetti negli elenchi" onClick={() => ripristina(tipo, e.chiave, e.nome)} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </section>
  );
}
