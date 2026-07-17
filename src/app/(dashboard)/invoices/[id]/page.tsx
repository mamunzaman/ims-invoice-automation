import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getInvoice } from "@/lib/actions/invoices";
import { getCustomers } from "@/lib/actions/customers";
import { getBankAccounts } from "@/lib/actions/bank-accounts";
import { getTechnicalErrorsDisplaySetting } from "@/lib/actions/app-settings";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { InvoiceDetailView } from "@/components/invoices/InvoiceDetailView";
import { StatusBadge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("invoice");
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  if (invoice.status === "draft") {
    const [customers, bankAccounts, technicalErrorsDisplay] = await Promise.all([
      getCustomers(),
      getBankAccounts(),
      getTechnicalErrorsDisplaySetting(),
    ]);

    return (
      <div key={invoice.id}>
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
          key={invoice.id}
          mode="edit"
          invoiceId={invoice.id}
          initialData={invoice}
          customers={customers}
          bankAccounts={bankAccounts}
          technicalErrorsDisplay={technicalErrorsDisplay}
        />
      </div>
    );
  }

  return <InvoiceDetailView invoice={invoice} />;
}
