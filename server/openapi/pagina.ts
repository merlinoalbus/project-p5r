// ============================================================
// pagina — la documentazione consultabile: Swagger UI servita dall'istanza, senza rete esterna
// ============================================================
//
// L'app si usa anche dove internet non c'è (tablet in casa, istanza sul NAS): l'interfaccia di Swagger arriva
// dal pacchetto `swagger-ui-dist` installato con il backend, non da una CDN. La pagina è nostra (titolo in
// italiano, documento `/api/openapi.json`); i file statici (script, fogli di stile) li serve
// `express.static` sotto `/api/docs/`.
//
// «Prova» (Try it out) è permesso solo per le GET: la pagina parla con l'istanza vera, e una POST o una
// DELETE di prova cambierebbe i dati della partita.
// ============================================================

import path from 'node:path';
import { createRequire } from 'node:module';

/** La cartella dei file statici di Swagger UI dentro `node_modules`. */
export const CARTELLA_SWAGGER_UI = path.dirname(createRequire(import.meta.url).resolve('swagger-ui-dist/package.json'));

/** La pagina HTML della documentazione: carica Swagger UI dai file serviti in `/api/docs/` e legge `/api/openapi.json`. */
export function paginaDocumentazione(): string {
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>API di project-p5r</title>
  <link rel="stylesheet" href="/api/docs/swagger-ui.css">
  <link rel="icon" type="image/png" href="/api/docs/favicon-32x32.png">
  <style>
    body { margin: 0; }
    .swagger-ui .topbar { display: none; }
    /* Sul telefono il nome dell'area, la sua descrizione e la freccia non stanno su una riga: la descrizione va sotto,
       a tutta larghezza, invece di ridursi a una colonna di una parola per riga. */
    @media (max-width: 640px) {
      .swagger-ui .opblock-tag { flex-wrap: wrap; row-gap: 4px; }
      .swagger-ui .opblock-tag small { order: 3; flex: 1 1 100%; padding: 0; }
      .swagger-ui .opblock-tag > a.nostyle { flex: 1 1 auto; }
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/api/docs/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/api/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      docExpansion: 'none',
      filter: true,
      defaultModelsExpandDepth: 0,
      supportedSubmitMethods: ['get'],
      presets: [SwaggerUIBundle.presets.apis],
      layout: 'BaseLayout',
    });
  </script>
</body>
</html>`;
}
