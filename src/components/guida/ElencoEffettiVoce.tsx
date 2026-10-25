// ============================================================
// ElencoEffettiVoce — TUTTI gli effetti della spunta di una voce, in un solo elenco (L13, ondata 4a)
// ============================================================
//
// Richiesta dell'utente (2026-10-25): due acquisti nella stessa voce stavano uno nel riquadro «Spuntando succede» («Articolo comprato») e
// uno negli «Effetti aggiuntivi» («Articolo del negozio»), e il riepilogo ne mostrava uno solo. Ora non c'è più un effetto «principale»
// con un editor suo e degli «aggiuntivi» ripiegati con un altro: ogni effetto è una scheda dello stesso elenco, con la sua frase, «Modifica»
// (i campi di `CampiEffettoVoce`, l'UNICO editor di ogni tipo di effetto) e «Togli», nell'ordine in cui la spunta li applica; sotto, un
// solo «Aggiungi un effetto» con il menu a icone di tutti i tipi. L'effetto che corrisponde a tipo e «Quale» porta il segno «segue Quale»:
// cambiando «Quale» si aggiorna da solo (vedi `cambiaCollegamento`). Niente UID visibili, niente frecce (l'ordine non conta per l'utente;
// gli articoli di un negozio, che si riordinano, stanno negli «Acquisti da questo negozio»).
// ============================================================

import { useState } from 'react';
import { motivoYenGiaStrutturati, type DatoConYen, type EffettoVoce } from '../../../shared/effettiVoce';
import { CATEGORIA_EFFETTO, MENU_EFFETTI as MENU, effettoNuovo } from '../../utils/effettiDellaVoce';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaAzione } from '../shared/IconaAzione';
import { IconaCategoria } from './IconaCategoria';
import { CampiEffettoVoce } from './CampiEffettoVoce';
import type { ElenchiVoce } from '../../utils/opzioniEffetti';
import { effettoCompleto, type CampiStrutturati } from '../../utils/azioneStrutturata';
import { NOME_FAMIGLIA_EFFETTO, fraseEffetto, indiceDelCollegamento, type NomiEffetti, type RigaEffetto } from '../../utils/effettoAutomatico';

type Tipo = EffettoVoce['tipo'];

/** Gli yen che film, attività e Richieste portano già, dagli elenchi dell'editor (il server li calcola con `yenDeiDati`). */
const yenDelDato = (el: ElenchiVoce, tipo: DatoConYen, chiave: string): number | undefined =>
  (tipo === 'film' ? el.azione.film : tipo === 'attivita' ? el.azione.attivita : el.azione.richieste).find((x) => x.chiave === chiave)?.yen;

/** Gli effetti di una spunta già fatta che compaiono come «Applica» sulla voce (`creaPropostaEffettoStorico`); gli stati valgono dalla prossima spunta. */
const CON_APPLICA = 'Doti, letture, turni, Aojiru, pesca e yen';

interface Props {
  valore: CampiStrutturati;
  onCambia: (v: CampiStrutturati) => void;
  elenchi: ElenchiVoce;
  nomi: NomiEffetti;
  /** Gli effetti che un'altra parte della finestra mostra già (gli articoli del negozio della voce): qui non compaiono una seconda volta. */
  altrove?: (r: RigaEffetto) => boolean;
  /** La voce è spuntata nella partita aperta. */
  fatta?: boolean;
}

/** L'elenco unico degli effetti, con «Aggiungi un effetto»: vedi l'intestazione del file. */
export function ElencoEffettiVoce({ valore, onCambia, elenchi, nomi, altrove, fatta }: Props) {
  const righe = valore.effettiVoce ?? [];
  const collegato = indiceDelCollegamento(righe, valore.tipo, valore.riferimento);
  const visibili = righe.map((r, i) => ({ r, i })).filter(({ r }) => !altrove?.(r));
  const [menu, setMenu] = useState(false);
  /** Indice (nella lista completa) della scheda aperta in modifica: una sola alla volta. */
  const [inModifica, setInModifica] = useState<number | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const imposta = (effettiVoce: RigaEffetto[]) => { setErrore(null); onCambia({ ...valore, effettiVoce }); };
  const cambia = (i: number, effetto: EffettoVoce) => imposta(righe.map((r, j) => (j === i ? { ...r, effetto } : r)));
  const togli = (i: number) => {
    const uid = righe[i]?.uid;
    if (uid && righe.some((r) => (r.effetto.tipo === 'acquisto' && r.effetto.sostituisceDoti.includes(uid)) || (r.effetto.tipo === 'pesca' && [...r.effetto.sostituisceTurni, ...r.effetto.sostituisceDoti].includes(uid)))) {
      setErrore('Questo effetto è indicato come sostituito da un acquisto Aojiru o da una sessione di pesca. Rivedi prima quel collegamento.');
      return;
    }
    setInModifica((m) => (m === null ? null : m === i ? null : m > i ? m - 1 : m));
    imposta(righe.filter((_, j) => j !== i));
  };
  const aggiungi = (t: Tipo) => {
    setMenu(false);
    setInModifica(righe.length);
    imposta([...righe, { uid: null, effetto: effettoNuovo(t) }]);
  };

  // L13 (decisione 2): un effetto «yen» accanto a un dato che porta già i suoi yen si segnala SUBITO, con la stessa regola del server
  const motivoYen = motivoYenGiaStrutturati(righe.map((r) => r.effetto), { riferimento: valore.riferimento, yenDi: (tipo, chiave) => yenDelDato(elenchi, tipo, chiave) });
  return (
    <div className="flex flex-col gap-2">
      {motivoYen && <p role="alert" className="m-0 rounded border border-warning p-2 testo-13 text-warning">{motivoYen}</p>}
      {visibili.length === 0 && <p className="m-0 testo-13 text-text-muted">{righe.length === 0 ? 'Nessun effetto: la spunta registra solo che l’hai fatta.' : 'Nessun altro effetto.'}</p>}
      {visibili.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Effetti della spunta">
          {visibili.map(({ r, i }) => {
            const completo = effettoCompleto(r.effetto);
            const editing = inModifica === i || !completo;
            const nome = NOME_FAMIGLIA_EFFETTO[r.effetto.tipo];
            return (
              <li key={r.uid ?? `nuovo-${i}`} className="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-bg-tertiary p-2">
                <div className="flex min-w-0 flex-wrap items-start gap-2">
                  <IconaCategoria categoria={CATEGORIA_EFFETTO[r.effetto.tipo]} dimensione={32} />
                  <div className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-display testo-13 uppercase tracking-wide text-primary-testo">{nome}</span>
                      {i === collegato && <span className="chip testo-12" title="Cambiando «Quale» questo effetto si aggiorna da solo">segue «Quale»</span>}
                    </span>
                    <span className="testo-13 break-words">{completo ? fraseEffetto(r.effetto, nomi) : 'Da scegliere qui sotto.'}</span>
                  </div>
                  <span className="flex shrink-0 gap-1">
                    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="modifica" dimensione={20} />} titolo={editing && completo ? 'Chiudi' : 'Modifica'}
                      aria-label={`${editing && completo ? 'Chiudi' : 'Modifica'}: ${nome}`} disabled={!completo} onClick={() => setInModifica(inModifica === i ? null : i)} />
                    <PulsanteVisivo tono="fantasma" compatto icona={<IconaAzione chiave="elimina" dimensione={20} />} titolo="Togli" aria-label={`Togli: ${nome}`} onClick={() => togli(i)} />
                  </span>
                </div>
                {editing && <CampiEffettoVoce effetto={r.effetto} elenchi={elenchi} righe={righe} onCambia={(e) => cambia(i, e)} />}
              </li>
            );
          })}
        </ul>
      )}
      {errore && <p role="alert" className="m-0 text-error-testo testo-12">{errore}</p>}
      {righe.length < 100 && (
        <div className="flex flex-col gap-2">
          <PulsanteVisivo tono="secondario" compatto className="self-start" icona={<IconaAzione chiave="piu" dimensione={20} />} titolo="Aggiungi un effetto" attivo={menu} aria-expanded={menu} onClick={() => setMenu((m) => !m)} />
          {menu && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Che effetto aggiungere">
              {MENU.map((m) => (
                <PulsanteVisivo key={m.tipo} tono="secondario" disposizione="colonna" icona={<IconaCategoria categoria={m.categoria} dimensione={40} />} titolo={NOME_FAMIGLIA_EFFETTO[m.tipo]} onClick={() => aggiungi(m.tipo)} />
              ))}
            </div>
          )}
        </div>
      )}
      {fatta && <p className="m-0 testo-12 text-text-secondary">Questa voce è già spuntata: {CON_APPLICA} aggiunti o cambiati compaiono come pulsante «Applica» sulla voce; gli altri effetti (articoli, oggetti, eventi, domande, sblocchi…) valgono dalla prossima spunta. Le ricevute della spunta già fatta non cambiano.</p>}
    </div>
  );
}
