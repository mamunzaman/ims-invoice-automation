# Project Status

## Completed Features

- [x] Multilingual support (en/de) via next-intl
- [x] Language switcher in user profile menu
- [x] Locale persistence: cookie + localStorage + profile.language
- [x] Invoice language field (separate from app UI) passed to n8n as `invoice_language`
- [x] Locale-aware dates and currency formatting
- [x] Invoice administration: lifecycle actions, settings admin, document health
- [x] Live invoice generation progress modal with DB polling
- [x] App-wide IMS green design system
- [x] lint/typecheck/build clean

## In Progress

- None

## Pending Tasks

- [ ] Run SQL migrations in Supabase (`001`–`004`)
- [ ] Translate remaining legacy components (`InvoiceListActions`, `customers/[id]` detail page)
- [ ] Server action error strings → translation keys (full coverage)
- [ ] End-to-end verify invoice generation with n8n (live modal + status steps)

## Last Update

2026-07-09 — Live invoice generation progress modal with Supabase polling
