import { getLocale, getTranslations } from "next-intl/server";
import { getDashboardStats } from "@/lib/actions/dashboard";
import type { AppLocale } from "@/i18n/routing";
import { PageShell } from "@/components/layout/PageShell";
import { ImsButton } from "@/components/forms/ims";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tInvoice = await getTranslations("invoice");
  const locale = (await getLocale()) as AppLocale;
  const stats = await getDashboardStats();

  return (
    <PageShell
      title={t("title")}
      subtitle={t("overviewSubtitle")}
      topActions={<ImsButton href="/invoices/new">{tInvoice("newInvoice")}</ImsButton>}
    >
      <DashboardOverview stats={stats} locale={locale} />
    </PageShell>
  );
}
