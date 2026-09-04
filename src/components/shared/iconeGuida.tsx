// ============================================================
// Icone SVG di riserva per meteo, fasce della giornata, mappe e categorie (usate quando l'asset manca)
// ============================================================

import type { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function base({ size = 16, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest,
  };
}

/** Sole a raggi. */
export function IconSole(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

/** Luna crescente con una stella. */
export function IconLuna(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
      <path d="M18 3l.6 1.6L20 5l-1.4.5L18 7l-.6-1.5L16 5l1.4-.4z" />
    </svg>
  );
}

/** Nuvola. */
export function IconNuvola(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M7 18h10a4 4 0 0 0 .6-7.9A6 6 0 0 0 6.2 9.3 4.4 4.4 0 0 0 7 18z" />
    </svg>
  );
}

/** Nuvola con gocce. */
export function IconPioggia(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M7 15h10a4 4 0 0 0 .6-7.9A6 6 0 0 0 6.2 6.3 4.4 4.4 0 0 0 7 15z" />
      <path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3" />
    </svg>
  );
}

/** Fiocco di neve. */
export function IconNeve(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 2v20M4 6l16 12M20 6 4 18M8.5 4.5 12 7l3.5-2.5M8.5 19.5 12 17l3.5 2.5M3 10.5 6 12l-3 1.5M21 10.5 18 12l3 1.5" />
    </svg>
  );
}

/** Nuvola con fulmine. */
export function IconTemporale(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M7 14h10a4 4 0 0 0 .6-7.9A6 6 0 0 0 6.2 5.3 4.4 4.4 0 0 0 7 14z" />
      <path d="M13 14l-2 4h3l-2 4" />
    </svg>
  );
}

/** Linee di nebbia. */
export function IconNebbia(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 9h16M3 13h18M5 17h14" />
    </svg>
  );
}

/** Termometro. */
export function IconTermometro(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z" />
      <path d="M12 9v6" />
    </svg>
  );
}

/** Fiore (polline). */
export function IconPolline(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </svg>
  );
}

/** Spirale (tifone). */
export function IconTifone(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 12a3 3 0 1 0 3-3 5 5 0 1 0-5 5 7 7 0 1 0 7-7 9 9 0 1 0-9 9" />
    </svg>
  );
}

/** Mappa piegata con spillo. */
export function IconMappa(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

/** Sacchetto della spesa. */
export function IconNegozio(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

/** Cuore (cura). */
export function IconCuore(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  );
}

/** Goccia (SP). */
export function IconGoccia(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />
    </svg>
  );
}

/** Scudo (battaglia / stato). */
export function IconScudo(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
    </svg>
  );
}

/** Bussola (esplorazione). */
export function IconBussola(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5 13.5 13.5 8.5 15.5l2-5z" />
    </svg>
  );
}

/** Valigetta (lavoro). */
export function IconValigetta(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" />
    </svg>
  );
}

/** Pellicola (film). */
export function IconFilm(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </svg>
  );
}

/** Controller (mini-giochi). */
export function IconGioco(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M6 9h12a4 4 0 0 1 4 4v2a3 3 0 0 1-5.2 2L15 15H9l-1.8 2A3 3 0 0 1 2 15v-2a4 4 0 0 1 4-4z" />
      <path d="M8 12v3M6.5 13.5h3M16 13h.01M18 12h.01" />
    </svg>
  );
}

/** Libro aperto (modificatore «libro» delle Doti, letture). */
export function IconLibro(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 5.5A2 2 0 0 1 5 4h4.5a3 3 0 0 1 2.5 1.3A3 3 0 0 1 14.5 4H19a2 2 0 0 1 2 2v12.5a1 1 0 0 1-1 1h-5.5a2.5 2.5 0 0 0-2.1 1.1.5.5 0 0 1-.8 0A2.5 2.5 0 0 0 9.5 19.5H4a1 1 0 0 1-1-1z" />
      <path d="M12 6.5v13" />
      <path d="M6.5 8.5h3M6.5 11.5h3M14.5 8.5h3M14.5 11.5h3" />
    </svg>
  );
}

/** Stella a cinque punte (Doti sociali). */
export function IconStella(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
    </svg>
  );
}

/** Due persone (Confidenti). */
export function IconPersone(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="9" cy="8" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.6" /><path d="M15.5 14.2A5.5 5.5 0 0 1 21.5 20" />
    </svg>
  );
}

/** Carte sovrapposte (scorta di Persona). */
export function IconCarte(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="6" width="11" height="15" rx="1.5" /><path d="M8 3.5h10.5A1.5 1.5 0 0 1 20 5v13" />
    </svg>
  );
}

/** Bersaglio (obiettivi). */
export function IconBersaglio(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

/** Blocco degli appunti (piani). */
export function IconAppunti(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="5" y="4" width="14" height="17" rx="1.5" /><path d="M9 2.5h6v3H9z" /><path d="M8.5 11h7M8.5 15h5" />
    </svg>
  );
}

/** Frecce in cerchio (cicli). */
export function IconCiclo(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M20 12a8 8 0 0 1-13.7 5.6" /><path d="M4 12a8 8 0 0 1 13.7-5.6" /><path d="M17 3v3.5h-3.5M7 21v-3.5h3.5" />
    </svg>
  );
}

/** Orologio (storico). */
export function IconOrologio(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" />
    </svg>
  );
}

/** Barre di riepilogo. */
export function IconRiepilogo(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

/** Elenco puntato (tutti). */
export function IconElenco(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1.2" fill="currentColor" /><circle cx="4.5" cy="12" r="1.2" fill="currentColor" /><circle cx="4.5" cy="18" r="1.2" fill="currentColor" />
    </svg>
  );
}

/** Cerchio vuoto (aperto). */
export function IconCerchio(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

/** Spunta in cerchio (raggiunto, seleziona). */
export function IconSpunta(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16.5 9.5" />
    </svg>
  );
}

/** Croce in cerchio (annullato, deseleziona). */
export function IconAnnullaCerchio(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  );
}

/** Pacco regalo. */
export function IconRegalo(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="9" width="18" height="12" rx="1.5" /><path d="M3 13h18M12 9v12" /><path d="M12 9c-2.5 0-4.5-1-4.5-2.8S9.5 3.5 12 9c2.5-5.5 4.5-4.4 4.5-2.8S14.5 9 12 9z" />
    </svg>
  );
}

/** Porta con freccia (uscita insieme). */
export function IconUscita(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M13 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H13" /><path d="M16 8l4 4-4 4M10 12h10" />
    </svg>
  );
}

/** Freccia indietro (annulla l’ultimo). */
export function IconIndietro(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M9 14 4 9l5-5" /><path d="M4 9h9.5a6.5 6.5 0 0 1 0 13H10" />
    </svg>
  );
}

/** Lucchetto aperto (sbloccato). */
export function IconLucchettoAperto(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="4" y="11" width="16" height="10" rx="1.5" /><path d="M8 11V7.5a4 4 0 0 1 7.6-1.7" /><circle cx="12" cy="16" r="1.2" fill="currentColor" />
    </svg>
  );
}

/** Lucchetto chiuso (bloccato). */
export function IconLucchettoChiuso(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="4" y="11" width="16" height="10" rx="1.5" /><path d="M8 11V7.5a4 4 0 0 1 8 0V11" /><circle cx="12" cy="16" r="1.2" fill="currentColor" />
    </svg>
  );
}

/** Matita (modifica, note). */
export function IconMatita(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z" /><path d="M13.5 6.5l3 3" />
    </svg>
  );
}

/** Fumetto (SMS). */
export function IconMessaggio(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-5 4v-4H5.5A1.5 1.5 0 0 1 4 14.5z" /><path d="M8 8.5h8M8 12h5" />
    </svg>
  );
}

/** Medaglia (primo agli esami). */
export function IconMedaglia(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="14.5" r="5" /><path d="M8.5 10 6 3h4l2 4.5L14 3h4l-2.5 7" /><path d="M12 12.3l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 14.4l2-.3z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Podio (fra i primi dieci). */
export function IconPodio(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 21h18" /><rect x="9" y="8" width="6" height="13" /><rect x="3" y="12" width="6" height="9" /><rect x="15" y="15" width="6" height="6" /><path d="M12 3.5l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 5.6l2-.3z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Ampolla (come ottenere una Persona). */
export function IconRicetta(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M10 3h4M10.5 3v6L5 18.5A2 2 0 0 0 6.7 21.5h10.6a2 2 0 0 0 1.7-3L13.5 9V3" /><path d="M7.5 15.5h9" />
    </svg>
  );
}

/** Ramificazione (albero del piano). */
export function IconAlbero(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="6" cy="5" r="2.2" /><circle cx="18" cy="5" r="2.2" /><circle cx="12" cy="19" r="2.2" /><path d="M6 7.2V10a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7.2M12 13v3.8" />
    </svg>
  );
}

/** Freccia in cerchio (ricalcola, riapri). */
export function IconRicalcola(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v4.5h-4.5" />
    </svg>
  );
}

/** Cestino (elimina). */
export function IconCestino(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.8 12.2A1.5 1.5 0 0 0 8.8 20.5h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7" /><path d="M10 11v6M14 11v6" />
    </svg>
  );
}

/** Scintille (evoca dal Registro). */
export function IconEvoca(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8zM5 15l.6 1.6L7.2 17.2l-1.6.6L5 19.4l-.6-1.6L2.8 17.2l1.6-.6z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Triangolo di avvio (esegui). */
export function IconGioca(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Sirena (Allarme della Stanza di Velluto). */
export function IconAllarme(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M6 19v-6a6 6 0 0 1 12 0v6" /><path d="M3.5 19h17M12 4V2M4.5 7.5 3 6M19.5 7.5 21 6" /><path d="M12 10a3 3 0 0 0-3 3v2" />
    </svg>
  );
}

/** Freccia in alto a destra (apri la scheda). */
export function IconApri(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

/** Maschera (Persona dello stesso arcano). */
export function IconMaschera(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3.5 8.5C3.5 6 7 4.5 12 4.5s8.5 1.5 8.5 4c0 5-3 10-8.5 11.5C6.5 18.5 3.5 13.5 3.5 8.5z" /><path d="M7.5 10.5c1-1 2.5-1 3.5 0M13 10.5c1-1 2.5-1 3.5 0M9 15c1.5 1.2 4.5 1.2 6 0" />
    </svg>
  );
}

/** Freccia in basso (carica altri). */
export function IconAltro(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 4v14M6 12l6 6 6-6" />
    </svg>
  );
}

/** Imbuto: pannello dei filtri (chiave azione «filtri»). */
export function IconFiltro(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 5h16l-6 8v6l-4-2v-4z" />
    </svg>
  );
}

/** Lente con «+»: ingrandisci. */
export function IconZoomPiu(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /><path d="M11 8v6M8 11h6" />
    </svg>
  );
}

/** Lente con «−»: riduci. */
export function IconZoomMeno(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /><path d="M8 11h6" />
    </svg>
  );
}

/** Quattro frecce verso gli angoli: adatta alla finestra. */
export function IconAdatta(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" /><path d="M4 4l5 5M20 4l-5 5M20 20l-5-5M4 20l5-5" />
    </svg>
  );
}
