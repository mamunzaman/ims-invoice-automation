import { getCustomers } from "@/lib/actions/customers";
import { getDefaultInvoiceData, createInvoice } from "@/lib/actions/invoices";
import { getBankAccounts } from "@/lib/actions/bank-accounts";
import { getTechnicalErrorsDisplaySetting } from "@/lib/actions/app-settings";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";

export default async function NewInvoicePage() {
  const [customers, defaults, bankAccounts, technicalErrorsDisplay] = await Promise.all([
    getCustomers(),
    getDefaultInvoiceData(),
    getBankAccounts(),
    getTechnicalErrorsDisplaySetting(),
  ]);

  return (
    <InvoiceForm
      mode="create"
      customers={customers}
      defaults={defaults}
      bankAccounts={bankAccounts}
      technicalErrorsDisplay={technicalErrorsDisplay}
      onSave={createInvoice}
    />
  );
}
