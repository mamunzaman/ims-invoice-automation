import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { getCustomer, updateCustomer } from "@/lib/actions/customers";
import { getCustomerAddressScope } from "@/lib/actions/settings";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [customer, addressScope, t, tNav, tButtons] = await Promise.all([
    getCustomer(id),
    getCustomerAddressScope(),
    getTranslations("customers"),
    getTranslations("navigation"),
    getTranslations("buttons"),
  ]);
  if (!customer) notFound();

  const boundUpdate = updateCustomer.bind(null, id);

  return (
    <CustomerForm
      initialData={customer}
      addressScope={addressScope}
      onSubmit={boundUpdate}
      submitLabel={tButtons("save")}
      pageTitle={t("editCustomer")}
      pageSubtitle={customer.customer_name}
      breadcrumbs={[
        { label: tNav("customers"), href: "/customers" },
        { label: customer.customer_name, href: `/customers/${id}` },
        { label: tButtons("edit") },
      ]}
    />
  );
}
