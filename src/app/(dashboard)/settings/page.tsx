import { getSettings } from "@/lib/actions/settings";
import { getBankAccounts } from "@/lib/actions/bank-accounts";
import {
  getInvoiceAdminSettings,
  getInvoiceNumberingPreview,
} from "@/lib/actions/invoice-admin";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const [profile, bankAccounts, invoiceAdminSettings, numberingPreview] = await Promise.all([
    getSettings(),
    getBankAccounts(),
    getInvoiceAdminSettings(),
    getInvoiceNumberingPreview(),
  ]);

  return (
    <SettingsForm
      profile={profile}
      bankAccounts={bankAccounts}
      invoiceAdminSettings={invoiceAdminSettings}
      numberingPreview={numberingPreview}
    />
  );
}
