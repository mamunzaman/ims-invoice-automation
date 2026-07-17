// n8n Code node — paste before "Respond to Webhook".
// Upstream must run n8n/dropbox-create-shared-links.code.js so dropbox_*_url values are
// absolute https://www.dropbox.com/s/... shared links (not local paths).

const invoiceNumber = $json.invoice_number;
const googleDocId = $json.google_doc_id;
const googleDocUrl = $json.google_doc_url;
const pdfFileId = $json.pdf_file_id;
const pdfUrl = $json.pdf_url;
const docxFileId = $json.docx_file_id;
const docxUrl = $json.docx_url;
const dropboxPdfUrl = $json.dropbox_pdf_url;
const dropboxDocxUrl = $json.dropbox_docx_url;

return {
  json: {
    success: true,
    workflow_status: "completed",
    invoice_number: invoiceNumber,
    google_doc_id: googleDocId,
    google_doc_url: googleDocUrl,
    pdf_file_id: pdfFileId,
    pdf_url: pdfUrl,
    docx_file_id: docxFileId || null,
    docx_url: docxUrl || null,
    dropbox_pdf_url: dropboxPdfUrl || null,
    dropbox_docx_url: dropboxDocxUrl || null,
    steps: [
      { key: "received", label: "Invoice data received", status: "completed" },
      { key: "validated", label: "Data validated", status: "completed" },
      { key: "copy_template", label: "Google Docs template copied", status: "completed" },
      { key: "replace_placeholders", label: "Placeholders replaced", status: "completed" },
      {
        key: "google_doc_created",
        label: "Google Docs invoice created",
        status: "completed",
        url: googleDocUrl,
      },
      { key: "export_pdf", label: "PDF exported", status: "completed" },
      { key: "export_docx", label: "DOCX exported", status: docxUrl ? "completed" : "skipped" },
      {
        key: "pdf_drive_upload",
        label: "PDF saved to Google Drive",
        status: "completed",
        url: pdfUrl,
      },
      {
        key: "docx_drive_upload",
        label: "DOCX saved to Google Drive",
        status: docxUrl ? "completed" : "skipped",
        url: docxUrl || undefined,
      },
      {
        key: "dropbox_folders",
        label: "Dropbox archive folders prepared",
        status: dropboxPdfUrl || dropboxDocxUrl ? "completed" : "skipped",
      },
      {
        key: "dropbox_pdf",
        label: "PDF archived in Dropbox",
        status: dropboxPdfUrl ? "completed" : "skipped",
        url: dropboxPdfUrl || undefined,
      },
      {
        key: "dropbox_docx",
        label: "DOCX archived in Dropbox",
        status: dropboxDocxUrl ? "completed" : "skipped",
        url: dropboxDocxUrl || undefined,
      },
      { key: "invoice_saved", label: "Invoice status saved", status: "completed" },
    ],
  },
};
