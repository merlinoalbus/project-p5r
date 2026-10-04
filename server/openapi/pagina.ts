// ============================================================
// pagina — la documentazione consultabile: Swagger UI servita dall'istanza, senza rete esterna
// ============================================================
//
// L'app si usa anche dove internet non c'è (tablet in casa, istanza sul NAS): l'interfaccia di Swagger arriva
// dal pacchetto `swagger-ui-dist` installato con il backend, non da una CDN. La pagina è nostra (titolo in
// italiano, documento `/api/openapi.json`); i file statici (script, fogli di stile) li serve
// `express.static` sotto `/api/docs/`.
//
// «Prova» (Try it out) parla con l'istanza vera, quindi è spento due volte:
// - per ogni metodo diverso da GET (`supportedSubmitMethods`): una POST, una PUT o una DELETE di prova cambierebbe i dati;
// - per le GET che non sono semplici letture o pesano troppo per una pagina, quelle con `senzaProva` nel registro (gli
//   scaricamenti di database e istanza lasciano una copia nella cartella d'appoggio; l'esportazione delle mappe supera i 10 MB).
//   Un plugin toglie il pulsante a quelle operazioni, e il `requestInterceptor` rifiuta comunque la richiesta se partisse.
// ============================================================

import path from 'node:path';
import { createRequire } from 'node:module';

/** La cartella dei file statici di Swagger UI dentro `node_modules`. */
export const CARTELLA_SWAGGER_UI = path.dirname(createRequire(import.meta.url).resolve('swagger-ui-dist/package.json'));

/**
 * La pagina HTML della documentazione: carica Swagger UI dai file serviti in `/api/docs/` e legge `/api/openapi.json`.
 * `senzaProva` sono le operazioni da non eseguire, come «get /api/mappe/esporta» (percorso in sintassi OpenAPI).
 */
export function paginaDocumentazione(senzaProva: readonly string[]): string {
  // JSON dentro uno <script>: «<» diventa <, così nessun testo può chiudere il tag
  const elenco = JSON.stringify(senzaProva).replace(/</g, '\\u003c');
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
    // Le operazioni che non si provano da qui (registro delle descrizioni, campo «senzaProva»).
    var SENZA_PROVA = new Set(${elenco});
    // Il percorso del documento a cui corrisponde un indirizzo: «/api/mappe/esporta?radice=x» → «/api/mappe/esporta».
    var vietata = function (metodo, url) {
      var percorso = new URL(url, location.origin).pathname;
      return Array.from(SENZA_PROVA).some(function (voce) {
        var parti = voce.split(' ');
        if (parti[0] !== String(metodo).toLowerCase()) return false;
        // segmento per segmento: «{param}» vale un segmento qualunque, il punto è un punto
        var modello = new RegExp('^' + parti[1].split('/').map(function (s) { return /^\\{.+\\}$/.test(s) ? '[^/]+' : s.replace(/\\./g, '\\\\.'); }).join('/') + '$');
        return modello.test(percorso);
      });
    };
    // Toglie «Try it out» alle operazioni vietate. Il componente \`operation\` riceve l'operazione come mappa immutabile
    // (\`path\`, \`method\`, \`allowTryItOut\` già calcolato dai metodi ammessi): basta rimettere \`allowTryItOut\` a falso lì dentro.
    // Non si avvolge \`OperationContainer\`: è un contenitore collegato allo stato, e avvolto perderebbe le sue proprietà.
    var SenzaProvaPlugin = function () {
      return {
        wrapComponents: {
          operation: function (Originale, sistema) {
            return function (props) {
              var op = props.operation;
              var chiave = op && op.get ? String(op.get('method')) + ' ' + String(op.get('path')) : '';
              return sistema.React.createElement(Originale, SENZA_PROVA.has(chiave) ? Object.assign({}, props, { operation: op.set('allowTryItOut', false) }) : props);
            };
          },
        },
      };
    };
    window.ui = SwaggerUIBundle({
      url: '/api/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      docExpansion: 'none',
      filter: true,
      defaultModelsExpandDepth: 0,
      supportedSubmitMethods: ['get'],
      plugins: [SenzaProvaPlugin],
      // riserva: se una richiesta vietata partisse lo stesso, non arriva al server
      requestInterceptor: function (req) {
        if (vietata(req.method, req.url)) throw new Error('Questa operazione non si prova dalla documentazione: vedi la sua descrizione.');
        return req;
      },
      presets: [SwaggerUIBundle.presets.apis],
      layout: 'BaseLayout',
    });
  </script>
</body>
</html>`;
}
