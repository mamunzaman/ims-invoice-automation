import { getTranslations } from "next-intl/server";
import { getCustomers } from "@/lib/actions/customers";
import { CustomersList } from "@/components/customers/CustomersList";
import { PageShell } from "@/components/layout/PageShell";
import { ImsButton } from "@/components/forms/ims";
import { AddIcon } from "@/components/icons/muiIcons";

export default async function CustomersPage() {
  const customers = await getCustomers();
  const t = await getTranslations("customers");
  const tNav = await getTranslations("navigation");

  return (
    <PageShell
      breadcrumbs={[{ label: tNav("customers") }]}
      title={t("title")}
      subtitle={t("subtitle")}
      topActions={
        <ImsButton href="/customers/new" startIcon={<AddIcon />}>
          {t("newCustomer")}
        </ImsButton>
      }
    >
      <CustomersList customers={customers} />
    </PageShell>
  );
}
