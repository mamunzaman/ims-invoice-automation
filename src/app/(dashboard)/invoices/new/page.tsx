import { getCustomers } from "@/lib/actions/customers";
import { getDefaultInvoiceData, createInvoice } from "@/lib/actions/invoices";
import { getBankAccounts } from "@/lib/actions/bank-accounts";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";

export default async function NewInvoicePage() {
  const [customers, defaults, bankAccounts] = await Promise.all([
    getCustomers(),
    getDefaultInvoiceData(),
    getBankAccounts(),
  ]);

  return (
    <InvoiceForm
      mode="create"
      customers={customers}
      defaults={defaults}
      bankAccounts={bankAccounts}
      onSave={createInvoice}
    />
  );
}
