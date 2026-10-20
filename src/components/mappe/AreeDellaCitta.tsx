// ============================================================
// AreeDellaCitta — in fondo a La città: le aree agganciate a Tokyo e le planimetrie ancora da collocare (L2, R2-27)
// ============================================================
//
// «Area riservata allo staff» non sta in nessuna fonte leggibile (G-002): per decisione dell'utente è un'area della città, marcata
// «Da verificare», e lui deciderà se tenerla («Tieni» toglie il segno) o toglierla («Rimuovi», con conferma: va nel cestino).
// Le planimetrie del mondo rimaste senza area (dopo la 109 nessuna) hanno «Colloca»: un quartiere, un'area esistente o nuova,
// un'etichetta. Le due sezioni compaiono solo se c'è qualcosa da mostrare.
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../shared/Modal';
import { Selettore } from '../shared/Selettore';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { AnteprimaMappa } from './AnteprimaMappa';
import { aggiornaAreaMondo, collocaPlanimetria, eliminaAreaMondo, getAreeCitta, getDaCollocare, getQuartiere, isApiError } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { notifica } from '../../stores/notificationStore';
import { NEL_CESTINO } from '../../utils/cestino';
import type { AreaRiassuntoDto, MappaDaCollocareDto, QuartiereRiassuntoDto } from '../../types';

/** Le due sezioni: «Aree della città» (se ce ne sono) e «Planimetrie da collocare» (se ce ne sono), richiudibile. */
export function AreeDellaCitta({ quartieri }: { quartieri: QuartiereRiassuntoDto[] }) {
  const aree = useCarica(getAreeCitta, []);
  const sciolte = useCarica(getDaCollocare, []);
  const [daRimuovere, setDaRimuovere] = useState<AreaRiassuntoDto | null>(null);
  const [riepilogo, setRiepilogo] = useState<string | null>(null);
  const [daCollocare, setDaCollocare] = useState<MappaDaCollocareDto | null>(null);
  const [occupato, setOccupato] = useState(false);

  const tieni = async (a: AreaRiassuntoDto) => {
    setOccupato(true);
    try { await aggiornaAreaMondo('tokyo', a.slug, { daVerificare: false }); notifica('success', `${a.nome}: tenuta.`); await aree.ricarica(); }
    catch (err) { notifica('error', err instanceof Error ? err.message : 'Area non aggiornata.'); }
    finally { setOccupato(false); }
  };
  const rimuovi = async (conferma: boolean) => {
    if (!daRimuovere) return;
    setOccupato(true);
    try {
      await eliminaAreaMondo('tokyo', daRimuovere.slug, conferma);
      notifica('success', `${daRimuovere.nome} è nel cestino.`);
      setDaRimuovere(null); setRiepilogo(null);
      await aree.ricarica();
    } catch (err) {
      if (isApiError(err, 'area-con-contenuti')) setRiepilogo(err.message);
      else notifica('error', err instanceof Error ? err.message : 'Area non rimossa.');
    } finally { setOccupato(false); }
  };

  return (
    <>
      {(aree.dati?.length ?? 0) > 0 && <section className="flex flex-col gap-2" aria-label="Aree della città">
        <h2 className="m-0 font-display text-[17px] uppercase leading-none">Aree della città</h2>
        <p className="m-0 text-[13px] text-text-secondary">Posti di Tokyo che nessuna fonte colloca in un quartiere.</p>
        <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 md:grid-cols-2">
          {aree.dati!.map((a) => (
            <li key={a.slug} className="card flex flex-wrap items-center gap-3 p-2">
              <AnteprimaMappa mappa={{ ...a.illustrazione, nome: a.nome }} className="h-[72px] w-24" sizes="96px" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-1.5">
                  <Link to={a.casa} className="touch inline-flex items-center font-semibold">{a.nome}</Link>
                  {a.daVerificare && <span className="chip chip--attivo text-[11px]">Da verificare</span>}
                </span>
                <span className="text-[12px] text-text-muted">{a.numeroPlanimetrie === 1 ? '1 planimetria' : `${a.numeroPlanimetrie} planimetrie`} · {a.numeroSpilli === 1 ? '1 pin' : `${a.numeroSpilli} pin`}</span>
              </span>
              {a.daVerificare && <span className="flex flex-wrap gap-1.5">
                <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="accettata" dimensione={20} />} titolo="Tieni" disabled={occupato} onClick={() => void tieni(a)} />
                <PulsanteVisivo tono="pericolo" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Rimuovi" disabled={occupato} onClick={() => { setRiepilogo(null); setDaRimuovere(a); }} />
              </span>}
            </li>
          ))}
        </ul>
      </section>}

      {(sciolte.dati?.length ?? 0) > 0 && <details className="card flex flex-col gap-2" aria-label="Planimetrie da collocare">
        <summary className="touch cursor-pointer font-semibold">Planimetrie da collocare ({sciolte.dati!.length})</summary>
        <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
          {sciolte.dati!.map((m) => (
            <li key={m.chiave} className="flex flex-wrap items-center gap-3">
              <AnteprimaMappa mappa={m} className="h-12 w-16" sizes="64px" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{m.nome}</span>
                <span className="text-[12px] text-text-muted">{m.genitoreNome ?? 'senza genitore'} · {m.numeroSpilli === 1 ? '1 pin' : `${m.numeroSpilli} pin`}</span>
              </span>
              <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="seleziona" dimensione={20} />} titolo="Colloca" onClick={() => setDaCollocare(m)} />
            </li>
          ))}
        </ul>
      </details>}

      <Modal titolo={daRimuovere ? `Rimuovere ${daRimuovere.nome}?` : ''} aperta={!!daRimuovere} onChiudi={() => setDaRimuovere(null)}
        azioni={<>
          <button type="button" className="btn btn-secondary touch" onClick={() => setDaRimuovere(null)}>Annulla</button>
          <button type="button" className="btn btn-danger touch" disabled={occupato} onClick={() => void rimuovi(riepilogo !== null)}>{riepilogo ? 'Rimuovi tutto' : 'Rimuovi'}</button>
        </>}>
        <div className="flex flex-col gap-2 text-[14px]">
          <p className="m-0">Si rimuovono l’area e le sue planimetrie.</p>
          {riepilogo && <p className="m-0 text-warning" role="alert">{riepilogo}</p>}
          <p className="m-0 text-text-secondary">{NEL_CESTINO}</p>
        </div>
      </Modal>
      {daCollocare && <CollocaPlanimetria mappa={daCollocare} quartieri={quartieri} onChiudi={() => setDaCollocare(null)}
        onCollocata={async () => { setDaCollocare(null); await sciolte.ricarica(); }} />}
    </>
  );
}

/** La finestra «Colloca»: il quartiere, poi un'area esistente o una nuova (col nome), e l'etichetta della versione. */
function CollocaPlanimetria({ mappa, quartieri, onChiudi, onCollocata }: { mappa: MappaDaCollocareDto; quartieri: QuartiereRiassuntoDto[]; onChiudi: () => void; onCollocata: () => Promise<void> }) {
  const [quartiere, setQuartiere] = useState(quartieri[0]?.chiave ?? '');
  const [area, setArea] = useState('');
  const [nuova, setNuova] = useState('');
  const [etichetta, setEtichetta] = useState('');
  const [occupato, setOccupato] = useState(false);
  const dettaglio = useCarica(() => (quartiere ? getQuartiere(quartiere) : Promise.resolve(null)), [quartiere]);
  const NUOVA = '__nuova__';
  const pronto = !!quartiere && (area === NUOVA ? !!nuova.trim() : !!area) && !occupato;
  const salva = async () => {
    if (!pronto) return;
    setOccupato(true);
    try {
      await collocaPlanimetria({ mappa: mappa.chiave, quartiere, ...(area === NUOVA ? { nuova: { nome: nuova.trim() } } : { area }), etichetta: etichetta.trim() || undefined });
      notifica('success', `${mappa.nome} collocata.`);
      await onCollocata();
    } catch (err) {
      notifica('error', err instanceof Error ? err.message : 'Planimetria non collocata.');
    } finally { setOccupato(false); }
  };
  return (
    <Modal titolo={`Colloca ${mappa.nome}`} aperta onChiudi={onChiudi}
      azioni={<>
        <button type="button" className="btn btn-secondary touch" onClick={onChiudi}>Annulla</button>
        <button type="button" className="btn btn-primary touch" disabled={!pronto} onClick={() => void salva()}>Colloca</button>
      </>}>
      <div className="flex flex-col gap-3">
        <Selettore etichetta="Quartiere" valore={quartiere} opzioni={quartieri.map((q) => ({ chiave: q.chiave, nome: q.nome }))} onCambia={(k) => { setQuartiere(k); setArea(''); }} />
        <Selettore etichetta="Area" valore={area} segnaposto="Scegli un’area" disabilitato={!dettaglio.dati}
          opzioni={[...(dettaglio.dati?.aree ?? []).map((a) => ({ chiave: a.slug, nome: a.nome })), { chiave: NUOVA, nome: 'Un’area nuova…' }]} onCambia={setArea} />
        {area === NUOVA && <label className="flex flex-col gap-1 text-[13px] font-semibold">Nome dell’area nuova
          <input className="form-input touch" value={nuova} maxLength={80} onChange={(e) => setNuova(e.target.value)} />
        </label>}
        <label className="flex flex-col gap-1 text-[13px] font-semibold">Etichetta della planimetria (facoltativa)
          <input className="form-input touch" value={etichetta} maxLength={80} onChange={(e) => setEtichetta(e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}
