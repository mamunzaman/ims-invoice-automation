import { getTranslations } from "next-intl/server";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { createCustomer } from "@/lib/actions/customers";
import { getCustomerAddressScope } from "@/lib/actions/settings";

export default async function NewCustomerPage() {
  const [addressScope, t, tNav] = await Promise.all([
    getCustomerAddressScope(),
    getTranslations("customers"),
    getTranslations("navigation"),
  ]);

  return (
    <CustomerForm
      addressScope={addressScope}
      onSubmit={createCustomer}
      submitLabel={t("newCustomer")}
      pageTitle={t("newCustomer")}
      pageSubtitle={t("newCustomerSubtitle")}
      breadcrumbs={[
        { label: tNav("customers"), href: "/customers" },
        { label: t("newCustomer") },
      ]}
    />
  );
}
