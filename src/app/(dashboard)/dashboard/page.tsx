import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { formatCurrency } from "@/lib/utils";
import type { AppLocale } from "@/i18n/routing";
import {
  AppPage,
  PageHeader,
  AppButton,
  AppStatCard,
  AppCard,
  AppCardBody,
} from "@/components/ui";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tInvoice = await getTranslations("invoice");
  const locale = (await getLocale()) as AppLocale;
  const stats = await getDashboardStats();

  const cards = [
    { label: t("totalInvoices"), value: stats.totalInvoices, tone: "default" as const },
    { label: t("paidInvoices"), value: stats.paidInvoices, tone: "green" as const },
    { label: t("openInvoices"), value: stats.openInvoices, tone: "amber" as const },
    { label: t("draftInvoices"), value: stats.draftInvoices, tone: "default" as const },
  ];

  return (
    <AppPage>
      <PageHeader
        title={t("title")}
        subtitle={t("overviewSubtitle")}
        actions={
          <Link href="/invoices/new">
            <AppButton>{tInvoice("newInvoice")}</AppButton>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <AppStatCard
            key={card.label}
            label={card.label}
            value={card.value}
            tone={card.tone}
          />
        ))}
      </div>

      <AppStatCard
        label={t("amountThisMonth")}
        value={formatCurrency(stats.totalAmountThisMonth, "EUR", locale)}
        tone="blue"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/invoices">
          <AppCard className="hover:border-blue-200 transition-colors cursor-pointer">
            <AppCardBody>
              <p className="font-medium text-gray-900">{t("manageInvoicesTitle")}</p>
              <p className="text-sm text-gray-500 mt-1">{t("manageInvoicesDesc")}</p>
            </AppCardBody>
          </AppCard>
        </Link>
        <Link href="/customers">
          <AppCard className="hover:border-blue-200 transition-colors cursor-pointer">
            <AppCardBody>
              <p className="font-medium text-gray-900">{t("manageCustomersTitle")}</p>
              <p className="text-sm text-gray-500 mt-1">{t("manageCustomersDesc")}</p>
            </AppCardBody>
          </AppCard>
        </Link>
      </div>
    </AppPage>
  );
}
