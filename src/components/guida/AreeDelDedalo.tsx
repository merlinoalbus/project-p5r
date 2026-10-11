// ============================================================
// AreeDelDedalo — le aree di un dedalo dei Memento con i loro elementi: Dedalo → Aree → Elementi (099)
// ============================================================
//
// Richiesta dell'utente (2026-10-11): «devo poter definire in ogni Dedalo delle aree... e in quelle aree devo poter modificare
// gli elementi... i dettagli dell'area e le cose da vedere o da fare... ogni elemento deve avere uno stato... solo quando tutti
// gli elementi di un'area sono in stato completato l'area deve risultare completata. un dedalo diventa completato se tutte le
// sue aree sono completate.» Al posto degli «obiettivi del dedalo» (timbri e Richieste del dedalo intero) ci sono le sue aree:
// ognuna con nome e dettagli modificabili, i suoi timbri (−/+ e il totale), le sue Richieste (stato e area) e le sue voci della
// guida (`GuidaDellArea`, dove ogni voce si segna). Un'area completata porta la ✓ e si chiude; si aggiungono, si spostano e si
// eliminano aree; le Richieste rimaste senza area stanno in fondo, «da collocare».
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { aggiornaAreaDedalo, collocaRichiesta, creaAreaDedalo, eliminaAreaDedalo, impostaStatoRichiesta, impostaTimbri, spostaAreaDedalo } from '../../services/api';
import { notifica } from '../../stores/notificationStore';
import { LIMITI_GUIDA } from '../../../shared/limitiGuida';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { Selettore } from '../shared/Selettore';
import { CampoCorrezione, CorrezioneGuida } from './CorrezioneGuida';
import { GuidaDellArea } from './GuidaDellArea';
import { SpuntaCompletata, TestoCompletata } from './PlanimetriePalazzo';
import type { AreaDedaloDto, AreaDungeonDto, PuntoInteresseDto, RichiestaDelDedaloDto, StatoPunto, StatoRichiesta } from '../../types';

/** La chiave che nel selettore dell'area di una Richiesta vale «nessuna area». */
const DA_COLLOCARE = '';

interface Props {
  /** Il dedalo (l'area dei Memento) con le sue aree e le sue voci. */
  dedalo: AreaDungeonDto & { dedalo: NonNullable<AreaDungeonDto['dedalo']> };
  partitaId: number | null;
  cambiaStato: (p: PuntoInteresseDto, stato: StatoPunto | null) => Promise<boolean>;
  onPuntoAggiornato: (p: PuntoInteresseDto) => void;
  /** I timbri raccolti in un'area sono cambiati (dalla risposta del server). */
  onTimbri: (areaDedalo: string, raccolti: number) => void;
  /** Lo stato di una Richiesta nella partita è cambiato (dalla risposta del server). */
  onRichiesta: (chiave: string, stato: StatoRichiesta | null) => void;
  /** Rilegge la scheda (area aggiunta, corretta, spostata o eliminata; Richiesta collocata; voci cambiate). */
  onRicarica: () => Promise<void>;
}

/** Il totale dei timbri scritto nel modulo: vuoto = nessun timbro, altrimenti un intero fra 0 e il tetto. */
function timbriDalTesto(testo: string): number | null {
  const t = testo.trim();
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isInteger(n) || n < 0 || n > LIMITI_GUIDA.areaDedalo.timbri) throw new Error(`Il totale dei timbri è un numero intero da 0 a ${LIMITI_GUIDA.areaDedalo.timbri} (vuoto = l’area non ha timbri).`);
  return n;
}

/**
 * Le aree di un dedalo: il conteggio degli elementi e la barra del dedalo (con una partita), la ✓ quando è completato, ogni area
 * con i suoi elementi e i suoi comandi, le Richieste da collocare e «Aggiungi un'area».
 */
export function AreeDelDedalo({ dedalo, partitaId, cambiaStato, onPuntoAggiornato, onTimbri, onRichiesta, onRicarica }: Props) {
  const { aree, daCollocare, obiettivi, completato } = dedalo.dedalo;
  // chi è in volo: i timbri di un'area, una Richiesta o un'area; gli altri pulsanti restano vivi
  const [occupati, setOccupati] = useState<Record<string, boolean>>({});
  const [nuova, setNuova] = useState<string | null>(null);
  /** Segna o libera l'operazione in corso su una chiave. */
  const occupa = (k: string, v: boolean) => setOccupati((o) => ({ ...o, [k]: v }));
  /** Esegue un'operazione su una chiave tenendola occupata; l'errore va in notifica. */
  const esegui = async (k: string, fai: () => Promise<unknown>, errore: string) => {
    occupa(k, true);
    try { await fai(); } catch (err) { notifica('error', err instanceof Error ? err.message : errore); } finally { occupa(k, false); }
  };
  const fatti = obiettivi.fatti ?? 0;
  const opzioniArea = [{ chiave: DA_COLLOCARE, nome: '— da collocare —' }, ...aree.map((a) => ({ chiave: a.chiave, nome: a.nome }))];

  /** Una Richiesta, nell'area o da collocare: nome, stato, i comandi dello stato e l'area in cui sta. */
  const richiesta = (r: RichiestaDelDedaloDto, area: string) => (
    <li key={r.chiave} className={`flex flex-col gap-1 py-1.5 text-[13px] ${r.stato === 'completata' ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/guida/richieste?dedalo=${encodeURIComponent(dedalo.chiave)}`} className={`touch inline-flex min-w-0 flex-1 items-center ${r.stato === 'completata' ? 'line-through' : ''}`}>{r.nome}</Link>
        {r.stato && <span className={`chip shrink-0 text-[11px] ${r.stato === 'completata' ? '' : 'chip--attivo'}`}>{r.stato}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {partitaId && r.stato !== 'accettata' && r.stato !== 'completata' && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="accettata" dimensione={20} />} titolo="Accettata" disabled={!!occupati[r.chiave]}
          onClick={() => void esegui(r.chiave, async () => onRichiesta(r.chiave, (await impostaStatoRichiesta(partitaId, r.chiave, 'accettata')).stato), 'Aggiornamento fallito.')} />}
        {partitaId && r.stato !== 'completata' && <button type="button" className="btn btn-primary btn-sm touch" disabled={!!occupati[r.chiave]}
          onClick={() => void esegui(r.chiave, async () => onRichiesta(r.chiave, (await impostaStatoRichiesta(partitaId, r.chiave, 'completata')).stato), 'Aggiornamento fallito.')}>Completata</button>}
        {partitaId && r.stato && <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="riapri" dimensione={20} />} titolo="Riapri" disabled={!!occupati[r.chiave]}
          onClick={() => void esegui(r.chiave, async () => onRichiesta(r.chiave, (await impostaStatoRichiesta(partitaId, r.chiave, null)).stato), 'Aggiornamento fallito.')} />}
        <span className="min-w-[160px]">
          <Selettore compatto etichetta={`Area di ${r.nome}`} valore={area} opzioni={opzioniArea} disabilitato={!!occupati[r.chiave]}
            onCambia={(k) => { if (k !== area) void esegui(r.chiave, async () => { await collocaRichiesta(r.chiave, k || null); await onRicarica(); notifica('success', k ? `«${r.nome}» in ${aree.find((a) => a.chiave === k)?.nome ?? 'un’altra area'}.` : `«${r.nome}» è da collocare.`); }, 'Richiesta non spostata.'); }} />
        </span>
      </div>
    </li>
  );

  /** I timbri di un'area: «x su N» e, con una partita, «−» e «+» entro il totale. */
  const timbri = (a: AreaDedaloDto, t: NonNullable<AreaDedaloDto['timbri']>) => {
    const raccolti = t.raccolti ?? 0;
    const chiave = `timbri:${a.chiave}`;
    /** Porta i timbri raccolti a `n`, entro 0 e il totale. */
    const cambia = (n: number) => {
      const valore = Math.min(Math.max(n, 0), t.totale);
      if (!partitaId || valore === raccolti) return;
      void esegui(chiave, async () => onTimbri(a.chiave, (await impostaTimbri(partitaId, a.chiave, valore)).raccolti), 'Aggiornamento fallito.');
    };
    return (
      <section className="flex flex-col gap-1 rounded-md bg-white/[0.04] px-2 py-1.5" aria-label={`Timbri di ${a.nome}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <strong>Timbri</strong>
          <span className="tabular-nums text-text-secondary">{partitaId ? `${raccolti} su ${t.totale}` : `${t.totale} da raccogliere`}</span>
        </div>
        {partitaId && (
          <div className="flex items-center gap-2" role="group" aria-label={`Timbri raccolti in ${a.nome}`}>
            <button type="button" className="btn btn-ghost touch !px-3" disabled={!!occupati[chiave] || raccolti === 0} onClick={() => cambia(raccolti - 1)} aria-label={`Togli un timbro in ${a.nome}`}>−</button>
            <span className="min-w-[3ch] text-center font-display text-[19px] tabular-nums" aria-live="polite">{raccolti}</span>
            <button type="button" className="btn btn-ghost touch !px-3" disabled={!!occupati[chiave] || raccolti >= t.totale} onClick={() => cambia(raccolti + 1)} aria-label={`Aggiungi un timbro in ${a.nome}`}>+</button>
            <span className="text-[12px] text-text-muted">su {t.totale}</span>
          </div>
        )}
      </section>
    );
  };

  /** Un'area del dedalo: intestazione col conteggio e la ✓, dettagli, comandi, timbri, Richieste e voci della guida. */
  const area = (a: AreaDedaloDto, i: number) => {
    const voci = dedalo.punti.filter((p) => p.areaDedalo === a.chiave);
    const altre = aree.filter((x) => x.chiave !== a.chiave).map((x) => ({ chiave: x.chiave, nome: x.nome }));
    const vuota = a.elementi.totale === 0;
    return (
      <li key={a.chiave} className="rounded-lg border border-border-light bg-white/[0.02]">
        {/* un'area completata si chiude da sola: restano in vista quelle da fare */}
        <details open={a.completata !== true} className="group">
          <summary className="touch flex cursor-pointer items-center gap-2 px-2.5 py-2" aria-label={`Area ${i + 1}: ${a.nome}${a.completata ? ' (completata)' : ''}`}>
            <span className="w-5 shrink-0 text-right font-display text-[15px] leading-tight text-text-muted">{i + 1}</span>
            <span className="min-w-0 flex-1 text-[14px] font-semibold leading-tight">{a.nome}{a.completata && <>{' '}<SpuntaCompletata dimensione={13} /><TestoCompletata /></>}</span>
            <span className="shrink-0 text-[11px] tabular-nums text-text-muted">
              {vuota ? (a.completata ? 'nessun elemento · completata' : 'nessun elemento') : a.elementi.fatti === null ? `${a.elementi.totale} elementi` : `${a.elementi.fatti}/${a.elementi.totale}`}
            </span>
          </summary>
          <div className="flex flex-col gap-2 px-2.5 pb-2.5">
            {a.descrizione && <p className="m-0 whitespace-pre-wrap text-[12px] text-text-secondary">{a.descrizione}</p>}
            <div className="flex flex-wrap items-center gap-1.5">
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="su" dimensione={20} />} titolo="Su" aria-label={`Sposta su l’area ${a.nome}`} disabled={!!occupati[a.chiave] || i === 0}
                onClick={() => void esegui(a.chiave, async () => { await spostaAreaDedalo(a.chiave, -1); await onRicarica(); }, 'Spostamento non riuscito.')} />
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="giu" dimensione={20} />} titolo="Giù" aria-label={`Sposta giù l’area ${a.nome}`} disabled={!!occupati[a.chiave] || i === aree.length - 1}
                onClick={() => void esegui(a.chiave, async () => { await spostaAreaDedalo(a.chiave, 1); await onRicarica(); }, 'Spostamento non riuscito.')} />
              <CorrezioneGuida key={a.chiave} cosa={`l’area «${a.nome}»`} compatto etichetta="Modifica area"
                iniziale={() => ({ nome: a.nome, descrizione: a.descrizione, timbri: a.timbri ? String(a.timbri.totale) : '' })}
                onSalva={async (b) => { await aggiornaAreaDedalo(a.chiave, { nome: b.nome, descrizione: b.descrizione, timbriTotale: timbriDalTesto(b.timbri) }); await onRicarica(); }}
                elimina={{ avviso: 'Se ne va per tutte le partite: le sue voci con quel che ne avevano segnato, e i suoi timbri. Le sue Richieste restano nel dedalo, da collocare.', onElimina: async () => { await eliminaAreaDedalo(a.chiave); await onRicarica(); } }}>
                {(b, cambia) => <>
                  <CampoCorrezione etichetta="Nome" valore={b.nome} massimo={LIMITI_GUIDA.areaDedalo.nome} onCambia={(v) => cambia({ nome: v })} />
                  <label className="flex min-w-[140px] flex-col gap-1 text-[12px]">
                    Timbri dell’area (vuoto = nessuno)
                    <input className="form-input" inputMode="numeric" value={b.timbri} maxLength={3} onChange={(e) => cambia({ timbri: e.target.value })} />
                  </label>
                  <CampoCorrezione etichetta="Dettagli dell’area" valore={b.descrizione} multilinea massimo={LIMITI_GUIDA.areaDedalo.descrizione} onCambia={(v) => cambia({ descrizione: v })} />
                </>}
              </CorrezioneGuida>
            </div>
            {a.timbri && timbri(a, a.timbri)}
            {a.richieste.length > 0 && (
              <section className="flex flex-col gap-1" aria-label={`Richieste di ${a.nome}`}>
                <strong className="text-[13px]">Richieste · {a.richieste.length}</strong>
                <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0">{a.richieste.map((r) => richiesta(r, a.chiave))}</ul>
              </section>
            )}
            <GuidaDellArea key={a.chiave} area={{ ...dedalo, punti: voci }} planimetrie={[]} partitaId={partitaId} mappaAperta={null}
              cambiaStato={cambiaStato} onPuntoAggiornato={onPuntoAggiornato} onRicarica={onRicarica} areaDedalo={{ chiave: a.chiave, nome: a.nome, altre }} />
          </div>
        </details>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-2" role="group" aria-label={`Aree di ${dedalo.nome}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 flex items-center gap-1.5 font-display text-[15px] uppercase leading-none">Aree del dedalo{completato && <><SpuntaCompletata dimensione={14} /><TestoCompletata /></>}</h3>
        <span className="text-[11px] tabular-nums text-text-muted">{partitaId ? `${fatti}/${obiettivi.totale} elementi` : `${aree.length === 1 ? '1 area' : `${aree.length} aree`} · ${obiettivi.totale} elementi`}</span>
      </div>
      {partitaId && obiettivi.totale > 0 && (
        <span className="visore-mappa__progresso h-1.5" role="progressbar" aria-label={`Elementi di ${dedalo.nome}`} aria-valuemin={0} aria-valuemax={obiettivi.totale} aria-valuenow={fatti}>
          <span className="visore-mappa__progresso-barra" style={{ width: `${Math.round((fatti / obiettivi.totale) * 100)}%` }} />
        </span>
      )}
      <p className="m-0 text-[11px] text-text-muted">Gli elementi di un’area sono le sue voci, le sue Richieste e i suoi timbri: l’area è completata quando lo sono tutti, il dedalo quando lo sono tutte le sue aree.</p>
      {aree.length === 0 && <p className="m-0 text-[12px] text-text-muted" role="status">Questo dedalo non ha ancora aree: aggiungine una qui sotto.</p>}
      <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-label={`Elenco delle aree di ${dedalo.nome}`}>{aree.map(area)}</ol>
      {daCollocare.length > 0 && (
        <section className="flex flex-col gap-1 rounded-md border border-dashed border-border-light px-2 py-1.5" aria-label="Richieste da collocare">
          <strong className="text-[13px]">Richieste da collocare · {daCollocare.length}</strong>
          <p className="m-0 text-[11px] text-text-muted">Non stanno in nessuna area e non contano finché non ne scegli una.</p>
          <ul className="m-0 flex list-none flex-col divide-y divide-border-light p-0">{daCollocare.map((r) => richiesta(r, DA_COLLOCARE))}</ul>
        </section>
      )}
      {nuova === null
        ? <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi un’area" className="self-start" onClick={() => setNuova('')} />
        : (
          <form className="flex flex-wrap items-end gap-2 rounded-md bg-white/[0.04] px-2 py-2"
            onSubmit={(e) => { e.preventDefault(); const nome = nuova.trim(); if (!nome) return; void esegui('nuova', async () => { await creaAreaDedalo(dedalo.chiave, { nome }); setNuova(null); await onRicarica(); notifica('success', `Area «${nome}» aggiunta a ${dedalo.nome}.`); }, 'Area non aggiunta.'); }}>
            <CampoCorrezione etichetta="Nuova area" valore={nuova} massimo={LIMITI_GUIDA.areaDedalo.nome} onCambia={setNuova} />
            <div className="flex gap-1.5">
              <PulsanteVisivo type="submit" tono="primario" compatto icona={<IconaAzione chiave="registra" dimensione={20} />} titolo="Aggiungi" disabled={!nuova.trim() || !!occupati.nuova} />
              <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla" onClick={() => setNuova(null)} />
            </div>
          </form>
        )}
    </div>
  );
}
