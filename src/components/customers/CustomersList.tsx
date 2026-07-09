"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AppStatCard,
  AppCard,
  AppCardBody,
  AppToolbar,
  AppToolbarGroup,
  AppSearch,
  AppFilter,
  AppBadge,
  AppButton,
  AppEmptyState,
} from "@/components/ui";
import { CustomerActions } from "@/components/customers/CustomerActions";
import type { Customer } from "@/lib/types/database";

type SortOption = "newest" | "name-asc" | "company-asc";

interface CustomersListProps {
  customers: Customer[];
}

function getInitials(customer: Customer): string {
  const source = customer.company_name?.trim() || customer.customer_name.trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase() || "?";
}

function avatarColor(id: string): string {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function computeStats(customers: Customer[]) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const withEmail = customers.filter((c) => c.customer_email?.trim()).length;
  const countries = new Set(
    customers.map((c) => c.country?.trim()).filter(Boolean)
  ).size;
  const newThisMonth = customers.filter(
    (c) => new Date(c.created_at) >= monthStart
  ).length;

  return {
    total: customers.length,
    withEmail,
    countries,
    newThisMonth,
  };
}

function MailIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

export function CustomersList({ customers }: CustomersListProps) {
  const router = useRouter();
  const t = useTranslations("customers");
  const tCommon = useTranslations("common");
  const tInvoice = useTranslations("invoice");
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

  const stats = useMemo(() => computeStats(customers), [customers]);

  const countryOptions = useMemo(() => {
    const countries = [...new Set(customers.map((c) => c.country?.trim()).filter(Boolean))] as string[];
    return countries.sort((a, b) => a.localeCompare(b, "de")).map((c) => ({ value: c, label: c }));
  }, [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = customers.filter((c) => {
      if (countryFilter && (c.country?.trim() || "") !== countryFilter) return false;
      if (!q) return true;
      const haystack = [
        c.customer_name,
        c.company_name,
        c.customer_email,
        c.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    list = [...list].sort((a, b) => {
      if (sort === "name-asc") {
        return a.customer_name.localeCompare(b.customer_name, "de");
      }
      if (sort === "company-asc") {
        const ac = a.company_name || "";
        const bc = b.company_name || "";
        return ac.localeCompare(bc, "de");
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return list;
  }, [customers, search, countryFilter, sort]);

  const countLabel = t("customersCount", { count: filtered.length });

  if (customers.length === 0) {
    return (
      <AppCard className="shadow-sm">
        <AppCardBody>
          <AppEmptyState
            icon={<UsersIcon />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              <Link href="/customers/new">
                <AppButton leadingIcon={<span className="text-lg leading-none">+</span>}>
                  {t("newCustomer")}
                </AppButton>
              </Link>
            }
          />
        </AppCardBody>
      </AppCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AppStatCard label={t("totalCustomers")} value={stats.total} tone="blue" />
        <AppStatCard label={t("withEmail")} value={stats.withEmail} tone="green" />
        <AppStatCard label={t("countries")} value={stats.countries} />
        <AppStatCard label={t("newThisMonth")} value={stats.newThisMonth} tone="amber" />
      </div>

      <AppCard className="shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100/80 bg-slate-50/40">
          <AppToolbar>
            <AppToolbarGroup className="flex-1 min-w-0">
              <AppSearch
                value={search}
                onChange={setSearch}
                placeholder={t("searchExtendedPlaceholder")}
                className="w-full sm:max-w-xs"
              />
              <AppFilter
                label={t("countryFilter")}
                value={countryFilter}
                onChange={setCountryFilter}
                options={countryOptions}
                allLabel={t("allCountries")}
              />
              <AppFilter
                label={t("sortLabel")}
                value={sort}
                onChange={(v) => setSort(v as SortOption)}
                showAllOption={false}
                options={[
                  { value: "newest", label: t("sortNewest") },
                  { value: "name-asc", label: t("sortNameAsc") },
                  { value: "company-asc", label: t("sortCompanyAsc") },
                ]}
              />
            </AppToolbarGroup>
            <p className="text-sm text-gray-500 whitespace-nowrap shrink-0">{countLabel}</p>
          </AppToolbar>
        </div>

        {filtered.length === 0 ? (
          <AppCardBody>
            <AppEmptyState
              title={t("noMatches")}
              description={t("noMatchesHint")}
              action={
                <AppButton
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setCountryFilter("");
                  }}
                >
                  {tInvoice("resetFilters")}
                </AppButton>
              }
            />
          </AppCardBody>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100/80 text-left">
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t("columnCustomer")}
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t("columnContact")}
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t("columnLocation")}
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t("columnPaymentTerms")}
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-gray-500 text-right">
                      {tCommon("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((customer) => (
                    <tr
                      key={customer.id}
                      onClick={() => router.push(`/customers/${customer.id}`)}
                      className="group cursor-pointer transition-colors hover:bg-blue-50/40"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(customer.id)}`}
                          >
                            {getInitials(customer)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {customer.customer_name}
                            </p>
                            {customer.company_name && (
                              <p className="text-sm text-gray-500 truncate">
                                {customer.company_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {customer.customer_email ? (
                          <div className="flex items-center gap-2 text-gray-600 min-w-0">
                            <MailIcon />
                            <span className="truncate">{customer.customer_email}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {customer.city || customer.country ? (
                          <AppBadge tone="gray">
                            {[customer.city, customer.country].filter(Boolean).join(", ")}
                          </AppBadge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {customer.default_payment_terms_days != null ? (
                          <AppBadge tone="blue">
                            {t("paymentTermsDays", { days: customer.default_payment_terms_days })}
                          </AppBadge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <CustomerActions
                          id={customer.id}
                          variant="icons"
                          stayOnPage
                          className="opacity-70 group-hover:opacity-100 transition-opacity"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map((customer) => (
                <div
                  key={customer.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors"
                >
                  <Link
                    href={`/customers/${customer.id}`}
                    className="flex items-start gap-3"
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(customer.id)}`}
                    >
                      {getInitials(customer)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{customer.customer_name}</p>
                      {customer.company_name && (
                        <p className="text-sm text-gray-500">{customer.company_name}</p>
                      )}
                      {customer.customer_email && (
                        <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-600">
                          <MailIcon />
                          <span className="truncate">{customer.customer_email}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(customer.city || customer.country) && (
                          <AppBadge tone="gray">
                            {[customer.city, customer.country].filter(Boolean).join(", ")}
                          </AppBadge>
                        )}
                        {customer.default_payment_terms_days != null && (
                          <AppBadge tone="blue">
                            {t("paymentTermsDays", { days: customer.default_payment_terms_days })}
                          </AppBadge>
                        )}
                      </div>
                    </div>
                  </Link>
                  <div className="mt-3 pt-3 border-t border-slate-100/80 flex justify-end">
                    <CustomerActions id={customer.id} variant="icons" stayOnPage />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </AppCard>
    </div>
  );
}
