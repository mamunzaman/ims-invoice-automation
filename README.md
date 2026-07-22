# IMS Invoice Automation

> Professional multilingual invoice management SaaS built with Next.js, Supabase, n8n, Google Docs, Dropbox, and Material UI.

## ✨ Features

- 📄 Professional invoice management (EN/DE)
- 👥 Customer directory
- 📝 Google Docs template-based document generation
- 📑 Automatic PDF and DOCX export
- 📦 Dropbox as final document storage and archive
- 📋 Yearly invoice register synchronization
- ⚡ n8n workflow automation with live progress timeline
- 🔄 Supabase-backed real-time generation status
- 🔐 Secure PDF/DOCX downloads (server-side Dropbox access)
- 🩺 Automation health checks and system log
- 💳 Multiple bank accounts
- 🏢 German invoice support (§19 UStG)
- 🎨 Modern Material UI design system

---

## 🛠 Tech Stack

- Next.js (App Router)
- TypeScript
- Material UI
- Supabase / PostgreSQL
- n8n
- Google Docs API (template & generation)
- Dropbox API (final PDF/DOCX storage & downloads)

---

## 📸 Application Screenshots

### Invoice management

![Invoice management list](docs/screenshots/invoice-management-list.jpg)

*Browse, search, and manage invoices in a clean desktop SaaS table with status, amounts, and row actions.*

### Create invoice

![Create invoice form](docs/screenshots/create-invoice-form.jpg)

*Structured invoice form with customer, service period, line items, VAT options, and bank account selection.*

### Live generation progress

![Invoice generation progress](docs/screenshots/invoice-generation-progress.jpg)

*Step-by-step generation timeline while n8n creates Google Docs, exports PDF/DOCX, archives to Dropbox, and updates the yearly register.*

### Customer directory

![Customer list](docs/screenshots/customer-list.jpg)

*Searchable customer list for bill-to contacts used across invoice creation and administration.*

### Automation health

![Automation health settings](docs/screenshots/automation-health-settings.jpg)

*App settings health checks for Supabase, n8n, Dropbox, and related services with a persisted system log.*

## n8n Automation Workflow

The workflow validates invoice data, generates PDF and DOCX from a Google Docs template, prepares Dropbox folders, uploads the archive files, synchronizes the yearly invoice register, and reports generation status back to the app (Supabase).

[![Complete IMS n8n automation workflow](docs/screenshots/n8n-workflow-overview.png)](docs/screenshots/n8n-workflow-overview.png)

> Click the image to view the complete workflow in full resolution.

---

## 🚀 Local Development

```bash
git clone https://github.com/mamunzaman/ims-invoice-automation.git

cd ims-invoice-automation

npm install

npm run dev
```

---

## 🔐 Environment Variables

Create a `.env.local` file using `.env.example`.

Notable variables:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- `N8N_INVOICE_WEBHOOK_URL` / `N8N_INVOICE_SECRET` — invoice generation webhook
- `N8N_HEALTH_WEBHOOK_URL` — automation health check
- `DROPBOX_ACCESS_TOKEN` — server-only token for secure PDF/DOCX downloads via `/api/invoices/[id]/download/pdf|docx` (never `NEXT_PUBLIC_*`)
  - Local: set in `.env.local`, then restart `npm run dev`
  - Production: set in your hosting dashboard, then redeploy

---

## 📌 Status

Current Version

**v0.1.0**

Current Features

- Invoice & customer management
- Google Docs template generation
- PDF & DOCX export
- Dropbox archive & secure downloads
- Yearly invoice register sync
- Live generation progress timeline
- Supabase real-time generation status
- Automation health settings
- Multilingual UI (EN/DE)

Planned

- Email Sending
- Recurring Invoices
- Payment Tracking
- Analytics Dashboard
- Company Branding

---

## 📄 License

MIT
