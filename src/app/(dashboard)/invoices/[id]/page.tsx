import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getInvoice } from "@/lib/actions/invoices";
import { getCustomers } from "@/lib/actions/customers";
import { getBankAccounts } from "@/lib/actions/bank-accounts";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { InvoiceStatusActions } from "@/components/invoices/InvoiceActions";
import { GenerationTimeline } from "@/components/invoices/GenerationTimeline";
import { DocumentActionCard } from "@/components/invoices/DocumentActionCard";
import { updateInvoice } from "@/lib/actions/invoices";
import { formatCurrency, formatDate } from "@/lib/utils";
import { resolveGenerationStatus } from "@/lib/generation-status";
import {
  invoiceCustomerName,
  invoiceCustomerAddress,
  invoiceServiceDescription,
  invoiceNotesMeta,
  invoicePdfUrl,
  invoiceGoogleDocUrl,
  invoiceGenerationSteps,
} from "@/lib/invoice-form";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("invoice");
  const tBank = await getTranslations("bankAccounts");
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  const meta = invoiceNotesMeta(invoice);
  const pdfUrl = invoicePdfUrl(invoice);
  const googleDocUrl = invoiceGoogleDocUrl(invoice);
  const generationSteps = invoiceGenerationSteps(invoice);
  const generationStatus = resolveGenerationStatus(invoice);

  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("invoice_logs")
    .select("*")
    .eq("invoice_id", id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (invoice.status === "draft") {
    const [customers, bankAccounts] = await Promise.all([
      getCustomers(),
      getBankAccounts(),
    ]);
    const boundUpdate = updateInvoice.bind(null, id);

    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t("invoiceNumber")} {invoice.invoice_number}
            </h1>
            <div className="mt-1">
              <StatusBadge status={invoice.status} />
            </div>
          </div>
        </div>
        <InvoiceForm
          mode="edit"
          invoiceId={id}
          initialData={invoice}
          customers={customers}
          bankAccounts={bankAccounts}
          onSave={boundUpdate}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("invoiceNumber")} {invoice.invoice_number}
          </h1>
          <div className="mt-1">
            <StatusBadge status={invoice.status} />
          </div>
        </div>
        <InvoiceStatusActions id={id} currentStatus={invoice.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title={t("invoiceDetails")} />
            <CardBody>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">{t("invoiceNumber")}</dt>
                  <dd className="font-medium">{invoice.invoice_number}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t("invoiceDate")}</dt>
                  <dd className="font-medium">{formatDate(invoice.invoice_date)}</dd>
                </div>
                {invoice.service_period && (
                  <div>
                    <dt className="text-gray-500">{t("servicePeriod")}</dt>
                    <dd className="font-medium">{invoice.service_period}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-500">{t("amountNet")}</dt>
                  <dd className="font-medium text-lg">
                    {formatCurrency(Number(invoice.net_amount), invoice.currency)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">{t("customer")}</dt>
                  <dd className="font-medium whitespace-pre-line">
                    {invoiceCustomerName(invoice)}
                    {invoiceCustomerAddress(invoice) && `\n${invoiceCustomerAddress(invoice)}`}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">{t("serviceDescription")}</dt>
                  <dd className="font-medium whitespace-pre-line">{invoiceServiceDescription(invoice)}</dd>
                </div>
                {invoice.payment_deadline && (
                  <div>
                    <dt className="text-gray-500">{t("paymentDeadline")}</dt>
                    <dd className="font-medium">{formatDate(invoice.payment_deadline)}</dd>
                  </div>
                )}
                {meta.payment_terms && (
                  <div className="sm:col-span-2">
                    <dt className="text-gray-500">{t("paymentTerms")}</dt>
                    <dd className="font-medium">{meta.payment_terms}</dd>
                  </div>
                )}
                {invoice.is_small_business && (
                  <div className="sm:col-span-2">
                    <dd className="text-sm text-gray-600 italic">{t("smallBusiness")}</dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>

          {(meta.bank_name || meta.iban) && (
            <Card>
              <CardHeader title={t("bankDetails")} />
              <CardBody>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {meta.bank_name && (
                    <div>
                      <dt className="text-gray-500">{tBank("bankName")}</dt>
                      <dd className="font-medium">{meta.bank_name}</dd>
                    </div>
                  )}
                  {meta.iban && (
                    <div>
                      <dt className="text-gray-500">{tBank("iban")}</dt>
                      <dd className="font-medium">{meta.iban}</dd>
                    </div>
                  )}
                  {meta.bic && (
                    <div>
                      <dt className="text-gray-500">{tBank("bic")}</dt>
                      <dd className="font-medium">{meta.bic}</dd>
                    </div>
                  )}
                </dl>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {generationStatus && (
            <div className="space-y-4">
              <GenerationTimeline
                steps={generationSteps}
                googleDocUrl={googleDocUrl}
                pdfUrl={pdfUrl}
              />
              <DocumentActionCard googleDocUrl={googleDocUrl} pdfUrl={pdfUrl} />
            </div>
          )}

          {logs && logs.length > 0 && (
            <Card>
              <CardHeader title={t("workflowLog")} />
              <CardBody>
                <ul className="space-y-3 text-sm">
                  {logs.map((log) => (
                    <li key={log.id} className="border-b border-gray-50 pb-2 last:border-0">
                      <div className="flex justify-between">
                        <span className="font-medium">{log.status}</span>
                        <span className="text-gray-400 text-xs">
                          {new Date(log.created_at).toLocaleString("de-DE")}
                        </span>
                      </div>
                      {log.error_message && (
                        <p className="text-red-600 text-xs mt-1">{log.error_message}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          <Link href="/invoices">
            <Button variant="ghost" className="w-full">
              {t("backToList")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
