import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/actions/customers";
import { formatCustomerAddress } from "@/lib/utils";
import {
  AppPage,
  PageHeader,
  AppButton,
  AppCard,
  AppCardHeader,
  AppCardBody,
} from "@/components/ui";
import { CustomerActions } from "@/components/customers/CustomerActions";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const address = formatCustomerAddress(customer);

  return (
    <AppPage>
      <PageHeader
        title={customer.customer_name}
        subtitle={customer.company_name || undefined}
        breadcrumbs={[
          { label: "Kunden", href: "/customers" },
          { label: customer.customer_name },
        ]}
        actions={<CustomerActions id={customer.id} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AppCard>
          <AppCardHeader title="Kontakt" />
          <AppCardBody>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Ansprechpartner</dt>
                <dd className="font-medium">{customer.contact_person || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">E-Mail</dt>
                <dd className="font-medium">{customer.customer_email || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Telefon</dt>
                <dd className="font-medium">{customer.customer_phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">USt-IdNr.</dt>
                <dd className="font-medium">{customer.customer_vat_number || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Website</dt>
                <dd className="font-medium">
                  {customer.website ? (
                    <a
                      href={customer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {customer.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          </AppCardBody>
        </AppCard>

        <AppCard>
          <AppCardHeader title="Adresse" />
          <AppCardBody>
            <p className="text-sm whitespace-pre-line">{address || "—"}</p>
          </AppCardBody>
        </AppCard>

        <AppCard>
          <AppCardHeader title="Rechnungsstandards" />
          <AppCardBody>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Standard-Währung</dt>
                <dd className="font-medium">{customer.default_currency || "EUR"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Zahlungsziel (Tage)</dt>
                <dd className="font-medium">
                  {customer.default_payment_terms_days ?? "—"}
                </dd>
              </div>
            </dl>
          </AppCardBody>
        </AppCard>

        {customer.notes && (
          <AppCard>
            <AppCardHeader title="Notizen" />
            <AppCardBody>
              <p className="text-sm whitespace-pre-line">{customer.notes}</p>
            </AppCardBody>
          </AppCard>
        )}
      </div>

      <div>
        <Link href="/customers">
          <AppButton variant="ghost">Zurück zur Liste</AppButton>
        </Link>
      </div>
    </AppPage>
  );
}
