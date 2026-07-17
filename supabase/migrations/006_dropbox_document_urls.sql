-- Persist Dropbox shared document URLs on invoices (first-class columns + notes metadata)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS dropbox_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS dropbox_docx_url TEXT;

COMMENT ON COLUMN invoices.dropbox_pdf_url IS 'Public Dropbox shared link for archived PDF';
COMMENT ON COLUMN invoices.dropbox_docx_url IS 'Public Dropbox shared link for archived DOCX';
