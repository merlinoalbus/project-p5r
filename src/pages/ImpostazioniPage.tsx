// ============================================================
// ImpostazioniPage — partite, traduzioni, immagini degli Arcani, informazioni
// ============================================================

import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useConfigStore } from '../stores/configStore';
import { useGlossarioStore } from '../stores/glossarioStore';
import { GestionePartite } from '../components/impostazioni/GestionePartite';
import { TraduzioniEditor } from '../components/impostazioni/TraduzioniEditor';
import { CaratteriEditor } from '../components/impostazioni/CaratteriEditor';
import { ImmaginiCaricate } from '../components/impostazioni/ImmaginiCaricate';
import { ImmagineEntita } from '../components/shared/ImmagineEntita';
import { usePreferenzeStore } from '../stores/preferenzeStore';
import { useAssetStore } from '../stores/assetStore';
import { IntestazionePagina } from '../components/shared/IntestazionePagina';

/** Impostazioni dell'app. */
export function ImpostazioniPage() {
  useDocumentTitle('Impostazioni');
  const config = useConfigStore((s) => s.config);
  const glossario = useGlossarioStore((s) => s.glossario);
  const graficaPredefinita = usePreferenzeStore((s) => s.graficaPredefinita);
  const impostaGrafica = usePreferenzeStore((s) => s.impostaGraficaPredefinita);
  const manifest = useAssetStore((s) => s.manifest);

  return (
    <div className="flex flex-col gap-4">
      <IntestazionePagina titolo="Impostazioni" sottotitolo="Partite, grafica predefinita, caratteri, immagini e traduzioni della tua istanza." />
      <GestionePartite />
      <section className="card flex flex-col gap-3">
        <h2 className="m-0 text-[15px] font-semibold">Grafica</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <span className="touch flex items-center justify-center shrink-0">
            <input type="checkbox" className="w-6 h-6" checked={graficaPredefinita} onChange={(e) => impostaGrafica(e.target.checked)} />
          </span>
          <span className="flex flex-col gap-1">
            <span className="font-semibold text-[14px]">Usa la grafica predefinita in stile Persona 5 Royal</span>
            <span className="text-[13px] text-text-secondary">
              Carte degli Arcani, ritratti dei Confidenti, icone e sfondi inclusi nell'app (cartella <code>public/asset</code>). Le immagini che carichi tu hanno sempre la precedenza; se un elemento grafico manca, l'app mostra il testo. La scelta vale per questo dispositivo.
            </span>
            <span className="text-[12px] text-text-muted">
              {manifest === null ? 'Elenco degli asset in caricamento…' : manifest.totale === 0 ? 'Nessun asset predefinito incluso in questa versione: l\'app usa i segnaposto testuali.' : `${manifest.totale} asset predefiniti disponibili.`}
            </span>
          </span>
        </label>
      </section>
      <CaratteriEditor />
      <section className="card flex flex-col gap-3">
        <h2 className="m-0 text-[15px] font-semibold">Immagini degli Arcani</h2>
        <p className="m-0 text-[13px] text-text-secondary">Tocca una carta per sostituirla con un tuo file: le immagini caricate hanno la precedenza sulla grafica predefinita e vengono usate nel compendio e nei Confidenti.</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {glossario?.arcani.map((a) => (
            <div key={a.chiave} className="flex flex-col items-center gap-1">
              <ImmagineEntita ambito="arcana" chiave={a.chiave} etichetta={a.nome} dimensione={88} forma="carta" modificabile />
              <span className="text-[12px] text-text-secondary">{a.nome}</span>
            </div>
          ))}
        </div>
      </section>
      <ImmaginiCaricate />
      <TraduzioniEditor />
      <section className="card text-[13px] text-text-secondary">
        <h2 className="m-0 mb-1 text-[15px] font-semibold text-text">Informazioni</h2>
        <div>Versione app {config?.appVersion} — {config?.gioco}</div>
        <div>Dati del compendio derivati da chinhodado/persona5_calculator (Apache-2.0) con verifica su aqiu384/megaten-fusion-tool (Unlicense). Persona 5 Royal è di ATLUS/SEGA.</div>
      </section>
    </div>
  );
}
