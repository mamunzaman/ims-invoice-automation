import { getInvoices } from "@/lib/actions/invoices";
import { InvoicesList } from "@/components/invoices/InvoicesList";

export default async function InvoicesPage() {
  const invoices = await getInvoices();
  return <InvoicesList invoices={invoices} />;
}
