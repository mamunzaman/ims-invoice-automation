# Project Status

## Completed Features

- [x] Global design tokens + premium layered background system
- [x] Duplicate invoice creates fresh editable draft (workflow/document fields cleared)
- [x] Global IMS design system components
- [x] Invoice detail page unified with shared components
- [x] Multilingual support (en/de) via next-intl
- [x] Live invoice generation progress modal with DB polling
- [x] lint/typecheck/build clean
- [x] Invoice service period validation UX (field highlight, focus, German message)
- [x] Duplicate draft generation uses same progress modal as new invoice
- [x] Generation state flow: draft until n8n success; failed webhook keeps draft editable
- [x] Friendly invoice generation error messages + technical details (dev)
- [x] Profile vs App settings navigation (sidebar Profile, account menu, /settings/app)
- [x] n8n generation response handling (Google Doc + PDF required; DOCX/Dropbox optional; 13-step timeline)
- [x] Invoice detail timeline i18n keys aligned (en/de `invoiceDetail.timeline`)
- [x] Invoice generation success logs use dev-only `console.debug` (no false red errors)
- [x] Canonical 11-step generation progress (Dropbox archive, no Google Drive storage steps)
- [x] Duplicate invoice amount fix (persist + generate use saved DB amounts)
- [x] Invoice list table grid alignment (desktop SaaS layout)
- [x] Generation success popup PDF/DOCX links use absolute Dropbox URLs only (no localhost)
- [x] Invoice detail documents + timeline use Dropbox URLs and canonical 13-step metadata
- [x] Invoice detail PDF/DOCX cards support Dropbox paths via server download API
- [x] PDF/DOCX buttons use Dropbox shared URLs only (no local download proxy)
- [x] Dropbox shared URLs persisted on invoice columns + notes; promoted from generation steps
- [x] Generate route: ambiguous n8n/network errors no longer mark invoice FAILED (polling can recover)
- [x] n8n webhook 30s AbortController timeout (unconfirmed errors stay processing)
- [x] Unconfirmed generate API + InvoiceForm: skip technical error, let poll continue
- [x] Configurable invoice list pagination (`invoice_page_size` 20/50/100; server-side Supabase `range()`)
- [x] App Settings application status: live service checks + invoice generation activity
- [x] App Settings health check UX: loading state, persisted snapshot + last checked, failure keeps last result
- [x] App Settings system log: persisted health-check history (20 entries) in invoice_settings JSONB
- [x] Reusable `HealthSystemLog` component for health-check log presentation
- [x] Invoice detail Documents: PDF/DOCX download via shared URL or secure Dropbox path endpoint; exactly 3 cards
- [x] Invoices list table: horizontal scroll at narrow widths; all columns kept; no viewport overflow
- [x] Invoice table row overlay actions (hover/focus/touch; no Actions column / three-dot menu)
- [x] Opaque SaaS dropdown menus (theme + ImsSelect; no translucent glass bleed)

## In Progress

- None

## Pending Tasks

- [ ] Manual test: opaque dropdowns (Profile, Settings, Customers, Invoices, invoice form)
- [ ] Manual test: invoice row overlay (desktop hover, keyboard, touch, confirm dialogs)
- [ ] Manual test: invoices list responsiveness (1440 / 1024 / 768 / 390)
- [ ] Manual test: invoice detail Documents cards (download links, no duplicate DOCX, Google Docs empty state)
- [ ] Set `DROPBOX_ACCESS_TOKEN` (Next.js + n8n) and add n8n shared-link Code node
- [ ] Regenerate one test invoice to backfill shared URLs for existing path-only rows
- [ ] Migrate `CustomersList` filter toolbar to MUI IMS components
- [ ] Draft invoice edit header → `PageShell` / `ImsPageHeader`
- [ ] Run SQL migrations in Supabase (`001`–`005`, incl. `005_profiles_invoice_settings.sql`)
- [ ] Wire App settings values into runtime (n8n mode, abuse limits, export formats, notifications)

## Last Update

2026-07-17 — Dropdown menus: solid opaque panels via theme tokens + shared ImsSelect MenuProps
