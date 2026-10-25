import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { RicompensaOggettoDto, DatiLegameOggettoDto, RiferimentoOggettoDto } from '../../types';
import { impostaLegameOggetto } from '../../services/api/catalogoOggetti';
import { notifica } from '../../stores/notificationStore';
import { SceltaCatalogoOggetto } from './SceltaCatalogoOggetto';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { NienteInRilascio, type StrumentoDiModifica } from '../shared/SoloPreparazione';

// costante di build, nello stesso modulo perché il bundler tolga il ramo di modifica (vedi utils/modalita.ts)
const IN_RILASCIO = import.meta.env.VITE_MODALITA === 'rilascio';

type Props = { contenuto: readonly RicompensaOggettoDto[]; onCambiato: () => Promise<void>; disabilitato?: boolean }
  & ({ voce: string; fonte?: never } | { voce?: never; fonte: { tipo: 'ricompensa'; chiave: string } });

/** Il punto di modifica del legame; non riscrive dettagli.contenuto e non segna raccolte. */
// L12 (passo 8): nel rilascio (sola lettura) i legami della voce non si modificano; la condizione è costante di build, `ContenutoDellaVoceReale` esce dal bundle
export const ContenutoDellaVoce: StrumentoDiModifica<typeof ContenutoDellaVoceReale> = IN_RILASCIO ? NienteInRilascio : ContenutoDellaVoceReale;
function ContenutoDellaVoceReale({ voce, fonte, contenuto, onCambiato, disabilitato }: Props) {
  const target = fonte ?? { tipo: 'voce' as const, chiave: voce ?? '' };
  const [aperto, setAperto] = useState(false);
  const [scelto, setScelto] = useState<RiferimentoOggettoDto | null>(null);
  const [precedente, setPrecedente] = useState<string | undefined>();
  const [quantita, setQuantita] = useState<number | null>(1);
  const [nota, setNota] = useState('');
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const bloccato = occupato || disabilitato;
  const azzera = () => { setScelto(null); setPrecedente(undefined); setQuantita(1); setNota(''); setErrore(null); };
  const scrivi = async (corpo: DatiLegameOggettoDto) => {
    if (bloccato) return;
    setOccupato(true); setErrore(null);
    try { await impostaLegameOggetto(corpo); }
    catch (e) { setErrore(e instanceof Error ? e.message : 'Contenuto non aggiornato.'); setOccupato(false); return; }
    azzera();
    notifica('success', corpo.togli ? 'Collegamento tolto. Testo e avanzamento invariati.' : 'Contenuto collegato. Testo e avanzamento invariati.');
    try { await onCambiato(); }
    catch { notifica('warning', 'Collegamento salvato. Ricarica la vista per vedere il contenuto aggiornato.'); }
    finally { setOccupato(false); }
  };
  return <div className="flex min-w-0 flex-col gap-2">
    <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="modifica" dimensione={22} />} titolo={aperto ? 'Chiudi modifica contenuto' : 'Collega o modifica il contenuto'} className="self-start" disabled={bloccato} aria-expanded={aperto} onClick={() => { setAperto((v) => !v); azzera(); }} />
    {aperto && <div className="flex min-w-0 flex-col gap-3 border border-border p-2">
      <p className="m-0 testo-12 text-text-muted">{fonte ? 'Questi sono i risultati collegati del baratto. Non modificano costo, acquisti o testo originale; usa la nota per distinguere un premio alternativo.' : 'Questi sono gli oggetti collegati alla voce, non il testo della guida. Quantità e nota del legame non modificano pin o spunte.'}</p>
      {errore && <p role="alert" className="m-0 testo-13 text-error">{errore}</p>}
      {contenuto.map((o) => <div key={o.chiave} className="flex min-w-0 flex-wrap items-center gap-2 testo-13">
        <span className="min-w-0 flex-1">{o.quantita} × <Link to={o.casa} className="touch inline-flex items-center">{o.nome}</Link>{o.nota && <span className="block text-text-muted">{o.nota}</span>}</span>
        <PulsanteVisivo icona={<IconaAzione chiave="modifica" dimensione={22} />} titolo="Modifica" disabled={bloccato} onClick={() => { setScelto(o); setPrecedente(o.chiave); setQuantita(o.quantita); setNota(o.nota ?? ''); setErrore(null); }} />
        <PulsanteVisivo tono="fantasma" icona={<IconaAzione chiave="chiudi" dimensione={22} />} titolo="Togli collegamento" disabled={bloccato} onClick={() => void scrivi({ riga_tipo: target.tipo, riga_chiave: target.chiave, catalogo_chiave: o.chiave, togli: true })} />
      </div>)}
      <SceltaCatalogoOggetto valore={scelto?.chiave ?? ''} disabilitato={bloccato} etichetta={precedente ? 'Oggetto del contenuto da modificare' : 'Oggetto da collegare'}
        escludi={precedente ? contenuto.filter((o) => o.chiave !== precedente).map((o) => o.chiave) : undefined}
        onScegli={(o) => { setScelto(o); if (!precedente) { const attuale = contenuto.find((x) => x.chiave === o.chiave); setQuantita(attuale?.quantita ?? 1); setNota(attuale?.nota ?? ''); } }} />
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="editor-mappa__campo">Quantità<input className="form-input" type="number" min={1} max={999999} step={1} value={quantita ?? ''} disabled={bloccato} onChange={(e) => setQuantita(e.target.value === '' ? null : Number(e.target.value))} /></label>
        <label className="editor-mappa__campo">Nota del collegamento<textarea className="form-input" rows={2} maxLength={6000} value={nota} disabled={bloccato} onChange={(e) => setNota(e.target.value)} /></label>
      </div>
      {precedente && scelto && precedente !== scelto.chiave && <p className="m-0 testo-13">Il salvataggio sostituisce soltanto il collegamento che stai modificando con «{scelto.nome}».</p>}
      <div className="flex flex-wrap gap-2">
        <PulsanteVisivo tono="primario" icona={<IconaAzione chiave="registra" dimensione={22} />} titolo={occupato ? 'Salvataggio…' : precedente ? 'Salva il collegamento' : 'Collega l’oggetto'} disabled={bloccato || !scelto || quantita === null || !Number.isSafeInteger(quantita) || quantita < 1 || quantita > 999999} onClick={() => { if (scelto && quantita !== null) void scrivi({ riga_tipo: target.tipo, riga_chiave: target.chiave, catalogo_chiave: scelto.chiave, precedente_catalogo_chiave: precedente, quantita, nota: nota.trim() || null }); }} />
        {precedente && <PulsanteVisivo tono="secondario" compatto icona={<IconaAzione chiave="annulla" dimensione={20} />} titolo="Annulla la modifica" disabled={bloccato} onClick={azzera} />}
      </div>
    </div>}
  </div>;
}
