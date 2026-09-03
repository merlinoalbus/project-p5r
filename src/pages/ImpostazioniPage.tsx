// ============================================================
// ImpostazioniPage — partite, traduzioni, immagini degli Arcani, informazioni
// ============================================================

import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useConfigStore } from '../stores/configStore';
import { useGlossarioStore } from '../stores/glossarioStore';
import { GestionePartite } from '../components/impostazioni/GestionePartite';
import { TraduzioniEditor } from '../components/impostazioni/TraduzioniEditor';
import { ImmagineEntita } from '../components/shared/ImmagineEntita';

/** Impostazioni dell'app. */
export function ImpostazioniPage() {
  useDocumentTitle('Impostazioni');
  const config = useConfigStore((s) => s.config);
  const glossario = useGlossarioStore((s) => s.glossario);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="m-0 text-2xl font-bold">Impostazioni</h1>
      <GestionePartite />
      <section className="card flex flex-col gap-3">
        <h2 className="m-0 text-[15px] font-semibold">Immagini degli Arcani</h2>
        <p className="m-0 text-[13px] text-text-secondary">Carica le carte generate (vedi <code>docs/grafica/prompt-immagini.md</code>): vengono usate nel compendio e nei Confidenti.</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {glossario?.arcani.map((a) => (
            <div key={a.chiave} className="flex flex-col items-center gap-1">
              <ImmagineEntita ambito="arcana" chiave={a.chiave} etichetta={a.nome} dimensione={72} forma="carta" modificabile />
              <span className="text-[12px] text-text-secondary">{a.nome}</span>
            </div>
          ))}
        </div>
      </section>
      <TraduzioniEditor />
      <section className="card text-[13px] text-text-secondary">
        <h2 className="m-0 mb-1 text-[15px] font-semibold text-text">Informazioni</h2>
        <div>Versione app {config?.appVersion} — {config?.gioco}</div>
        <div>Dati del compendio derivati da chinhodado/persona5_calculator (Apache-2.0) con verifica su aqiu384/megaten-fusion-tool (Unlicense). Persona 5 Royal è di ATLUS/SEGA.</div>
      </section>
    </div>
  );
}
