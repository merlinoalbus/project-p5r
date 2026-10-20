---
name: feedback-push-pipeline
description: "dopo ogni push su main seguire la pipeline (ci + Build & Push Docker Images) fino all'esito, e dirlo; un push non è un rilascio"
metadata:
  node_type: memory
  type: feedback
  originSessionId: e607dac6-f330-471d-b336-bd3dc2c5c00f
  modified: 2026-10-11T09:20:38.416Z
---

Dopo ogni `git push github main` si segue la pipeline fino in fondo (`gh run list --branch main` poi `gh run watch <id> --exit-status`) e si riporta l'esito: verify (typecheck, lint, `npm audit --omit=dev --audit-level=high`; i test non ci sono più dal 2026-10-18) e Build & Push Docker Images. Solo con la pipeline verde si dice che le modifiche arriveranno all'istanza dell'utente (Watchtower la aggiorna dalle immagini GHCR).

**Why:** dal 2026-10-09 al 2026-10-11 quattro push hanno fallito al gate `npm audit` (proxy-addr 2.0.7, critica) e ho detto all'utente che era tutto pushato; la sua istanza `persona5royal.nasmerlinoalbus.cloud` è rimasta al 4 ottobre. L'utente: «hai pushato senza verificare e non hai seguito la pipeline», «molto molto male».

**How to apply:** il «non fare polling della CI» non vale per questo progetto: è l'utente a chiedere di seguirla. Prima del push lanciare anche `npm audit --omit=dev --audit-level=high` in locale (è nel gate). Mai dire «fatto» o «pushato» senza l'esito della pipeline. Vedi [[project-flusso-di-lavoro-p5r]].

**Mai fermi ad aspettare (2026-10-18):** la pipeline si segue in background (`run_in_background`) mentre si va avanti con il lavoro rimasto; «guai a te se ti fermi ad aspettare le pipeline... quando hai altro lavoro da fare».
