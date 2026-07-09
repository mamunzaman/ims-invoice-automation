# Next Task

## Current Goal

End-to-end test invoice generation: confirm live progress modal updates through all `generation_status` steps via n8n.

## Verify

1. `/invoices/new` — click **Rechnung erstellen** → modal opens immediately
2. Timeline advances: PENDING → VALIDATING → COPYING_TEMPLATE → … → COMPLETED
3. Success buttons: Google Docs, PDF, Zur Ergebnisansicht; auto-navigate after ~1s
4. Simulate failure — error message + Erneut versuchen / Zur Rechnung / Schließen
5. Existing result page (`InvoiceGenerationSuccess`) still works after completion
