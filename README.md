# Rechnungsverwaltung (IMS Automation)

Web app for creating and managing German invoices with Supabase and n8n automation.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth + Database)
- n8n Webhook (Google Docs + PDF generation)

## Features

- User registration, login, logout, password reset
- Dashboard with invoice statistics
- Customer management (CRUD)
- Invoice management with German labels
- Default invoice settings
- n8n webhook integration for document generation
- Row Level Security per user

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_initial_schema.sql` via the SQL Editor
3. Enable Email auth in Authentication → Providers
4. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/update-password`

### 3. Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `N8N_INVOICE_WEBHOOK_URL` | n8n webhook endpoint |
| `N8N_INVOICE_SECRET` | Secret sent as `x-invoice-secret` header |

### 4. n8n Webhook

Create a webhook workflow that:

1. Accepts POST with header `x-invoice-secret`
2. Receives JSON invoice payload
3. Returns JSON:

```json
{
  "status": "success",
  "google_doc_url": "https://docs.google.com/...",
  "pdf_url": "https://...",
  "invoice_number": "RE-2026-001"
}
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Login |
| `/register` | Registration |
| `/reset-password` | Password reset |
| `/dashboard` | Overview stats |
| `/customers` | Customer list |
| `/customers/new` | Add customer |
| `/customers/[id]/edit` | Edit customer |
| `/invoices` | Invoice list |
| `/invoices/new` | Create invoice |
| `/invoices/[id]` | View/edit invoice |
| `/settings` | Default invoice settings |

## Database Tables

- `profiles` — user settings and sender data
- `customers` — customer records
- `invoices` — invoice records
- `invoice_logs` — n8n webhook logs

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```
