---
name: reference-recupero-produzione
description: "Come si leggono e si recuperano i dati di produzione di project-p5r (ssh, container, WAL) senza scrivere senza permesso"
metadata:
  node_type: memory
  type: reference
  originSessionId: e607dac6-f330-471d-b336-bd3dc2c5c00f
  modified: 2026-10-16T21:50:41.484Z
---

Produzione: `ssh -i <chiave locale> root@<server di produzione>` (indirizzo e chiave omessi: repository pubblico) (BatchMode). Container `project_p5r_be` (utente
`appuser`, `/app` con `"type":"module"`: script CommonJS come `.cjs`; `better-sqlite3` si trova solo da `/app` o con
`NODE_PATH=/app/node_modules`; per togliere file copiati con `docker cp` serve `docker exec -u 0`), volume
`persona5royal_project_p5r_data` → `/data` (`gioco.db`, `partite.db`, `backups/`), porta interna 3101. Il sito è dietro Cloudflare
Access: niente login, si verifica dal server (fetch nel container).

Recupero del 2026-10-16 (tre aree di Madarame): fotografie con l'API di backup (sola lettura) + file grezzi db e `-wal`; lo stato di
un istante prima si ricostruisce riapplicando i frame del WAL fino a un commit su una COPIA (prova: tutto il WAL = stato attuale).
Script in scratchpad della sessione e8.. (wal.cjs, stato.cjs, confronta-contenuto.cjs). Uno stop del container fa il checkpoint e
svuota il WAL: le copie grezze vanno prese prima. Scrivere in produzione solo dopo il «sì» esplicito dell'utente, con BE fermo e
copia di sicurezza. Vedi [[feedback-prove-sui-dati-reali]] e [[project-flusso-di-lavoro-p5r]].
