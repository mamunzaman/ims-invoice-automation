"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { AddIcon } from "@/components/icons/muiIcons";
import { PageShell } from "@/components/layout/PageShell";
import { InvoiceRowActionsMenu } from "@/components/invoices/InvoiceRowActionsMenu";
import {
  ImsButton,
  ImsSelect,
  ImsStatusChip,
  ImsTextField,
  imsCardSx,
  type ImsStatusTone,
} from "@/components/forms/ims";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  invoiceCustomerName,
  invoiceCustomerAddress,
  invoicePdfUrl,
  invoiceGoogleDocUrl,
} from "@/lib/invoice-form";
import { isInvoiceArchived } from "@/lib/invoice-lifecycle";
import type { Invoice, InvoiceStatus } from "@/lib/types/database";
import { resolveGenerationStatus } from "@/lib/generation-status";
import { type AppLocale } from "@/i18n/routing";
import { imsColors } from "@/theme/imsTheme";

type StatusFilter =
  | "all"
  | "draft"
  | "generated"
  | "paid"
  | "overdue"
  | "archived"
  | "cancelled";
type SortOption = "newest" | "oldest" | "amount-desc" | "amount-asc";

interface InvoicesListProps {
  invoices: Invoice[];
}

function isOverdue(invoice: Invoice): boolean {
  if (!invoice.payment_deadline) return false;
  if (invoice.status === "paid" || invoice.status === "cancelled" || invoice.status === "draft") {
    return false;
  }
  const deadline = new Date(invoice.payment_deadline);
  deadline.setHours(23, 59, 59, 999);
  return deadline < new Date();
}

function displayStatus(
  invoice: Invoice,
  tStatus: ReturnType<typeof useTranslations<"status">>
): { label: string; tone: ImsStatusTone } {
  if (isInvoiceArchived(invoice)) {
    return { label: tStatus("archived"), tone: "gray" };
  }
  if (isOverdue(invoice)) {
    return { label: tStatus("overdue"), tone: "red" };
  }
  if (invoice.status === "cancelled") {
    return { label: tStatus("cancelled"), tone: "red" };
  }

  const map: Record<InvoiceStatus, { label: string; tone: ImsStatusTone }> = {
    draft: { label: tStatus("draft"), tone: "gray" },
    generated: { label: tStatus("generated"), tone: "green" },
    sent: { label: tStatus("sent"), tone: "amber" },
    paid: { label: tStatus("paid"), tone: "green" },
    cancelled: { label: tStatus("cancelled"), tone: "red" },
  };

  return map[invoice.status];
}

function workflowBadge(
  invoice: Invoice,
  tInvoice: ReturnType<typeof useTranslations<"invoice">>
): { label: string; tone: ImsStatusTone } | null {
  if (invoicePdfUrl(invoice)) return { label: tInvoice("workflowPdf"), tone: "green" };
  if (invoiceGoogleDocUrl(invoice)) return { label: tInvoice("workflowDocs"), tone: "neutral" };
  if (invoice.status === "draft") return { label: tInvoice("draft"), tone: "gray" };

  const generationStatus = resolveGenerationStatus(invoice);
  if (generationStatus === "COMPLETED") return { label: tInvoice("workflowDone"), tone: "green" };
  if (generationStatus === "FAILED") return { label: tInvoice("workflowError"), tone: "red" };
  if (generationStatus && generationStatus !== "PENDING") {
    return { label: tInvoice("workflowInProgress"), tone: "amber" };
  }

  if (invoice.workflow_status === "completed") return { label: tInvoice("workflowDone"), tone: "green" };
  if (invoice.workflow_status === "failed") return { label: tInvoice("workflowError"), tone: "red" };
  if (invoice.status === "generated" || invoice.status === "sent") {
    return { label: tInvoice("workflowPending"), tone: "amber" };
  }
  return null;
}

function computeStats(invoices: Invoice[]) {
  const draft = invoices.filter((i) => i.status === "draft").length;
  const generated = invoices.filter((i) => i.status === "generated").length;
  const totalAmount = invoices
    .filter((i) => i.status !== "cancelled")
    .reduce((sum, i) => sum + Number(i.net_amount), 0);

  return { total: invoices.length, draft, generated, totalAmount };
}

function matchesStatusFilter(invoice: Invoice, filter: StatusFilter): boolean {
  if (filter === "all") return !isInvoiceArchived(invoice);
  if (filter === "archived") return isInvoiceArchived(invoice);
  if (isInvoiceArchived(invoice)) return false;
  if (filter === "draft") return invoice.status === "draft";
  if (filter === "generated") return invoice.status === "generated";
  if (filter === "paid") return invoice.status === "paid";
  if (filter === "overdue") return isOverdue(invoice);
  if (filter === "cancelled") return invoice.status === "cancelled";
  return true;
}

function customerSubline(invoice: Invoice): string | null {
  const address = invoiceCustomerAddress(invoice);
  if (address?.trim()) {
    return address.split("\n")[0]?.trim() || null;
  }
  return null;
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <Card sx={{ ...imsCardSx, borderRadius: "16px" }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Typography sx={{ fontSize: 12.5, color: imsColors.textMuted, mb: 0.75 }}>{label}</Typography>
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 700,
            color: accent ? imsColors.primary : imsColors.textDark,
            lineHeight: 1.1,
          }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function InvoicesList({ invoices }: InvoicesListProps) {
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("invoice");
  const tStatus = useTranslations("status");
  const tCommon = useTranslations("common");
  const tButtons = useTranslations("buttons");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortOption>("newest");

  const stats = useMemo(() => computeStats(invoices), [invoices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = invoices.filter((inv) => {
      if (!matchesStatusFilter(inv, statusFilter)) return false;
      if (!q) return true;
      const haystack = [
        inv.invoice_number,
        invoiceCustomerName(inv),
        invoiceCustomerAddress(inv),
        String(inv.net_amount),
        formatCurrency(Number(inv.net_amount), inv.currency, locale),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    list = [...list].sort((a, b) => {
      if (sort === "oldest") {
        return new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime();
      }
      if (sort === "amount-desc") return Number(b.net_amount) - Number(a.net_amount);
      if (sort === "amount-asc") return Number(a.net_amount) - Number(b.net_amount);
      return new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime();
    });

    return list;
  }, [invoices, search, statusFilter, sort, locale]);

  const countLabel = t("invoicesCount", { count: filtered.length });

  const tableHeaders = [
    t("defaultTitle"),
    t("customer"),
    t("invoiceDate"),
    t("paymentDeadline"),
    t("totalAmount"),
    t("statusLabel"),
    t("documentColumn"),
    tCommon("actions"),
  ];

  return (
    <PageShell
      breadcrumbs={[{ label: t("title") }]}
      title={t("title")}
      subtitle={t("subtitle")}
      topActions={
        <ImsButton component={Link} href="/invoices/new" startIcon={<AddIcon />}>
          {tButtons("createInvoice")}
        </ImsButton>
      }
    >
      {invoices.length === 0 ? (
        <Card sx={{ ...imsCardSx, borderRadius: "18px" }}>
          <CardContent sx={{ p: 4, textAlign: "center" }}>
            <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 1 }}>{t("emptyListTitle")}</Typography>
            <Typography sx={{ fontSize: 14, color: imsColors.textMuted, mb: 2.5 }}>
              {t("emptyListHint")}
            </Typography>
            <ImsButton component={Link} href="/invoices/new" startIcon={<AddIcon />}>
              {tButtons("createInvoice")}
            </ImsButton>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2.5}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, lg: 3 }}>
              <StatCard label={t("statsTotal")} value={stats.total} />
            </Grid>
            <Grid size={{ xs: 6, lg: 3 }}>
              <StatCard label={t("statsDrafts")} value={stats.draft} />
            </Grid>
            <Grid size={{ xs: 6, lg: 3 }}>
              <StatCard label={t("statsGenerated")} value={stats.generated} accent />
            </Grid>
            <Grid size={{ xs: 6, lg: 3 }}>
              <StatCard
                label={t("statsAmount")}
                value={formatCurrency(stats.totalAmount, "EUR", locale)}
                accent
              />
            </Grid>
          </Grid>

          <Card sx={{ ...imsCardSx, borderRadius: "18px", overflow: "hidden" }}>
            <Box sx={{ p: 2, borderBottom: `1px solid ${imsColors.border}`, bgcolor: "#fafbfc" }}>
              <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={2}
                sx={{ alignItems: { lg: "flex-end" }, justifyContent: "space-between" }}
              >
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ flex: 1, minWidth: { sm: 220 }, maxWidth: { lg: 320 } }}>
                    <ImsTextField
                      label={tCommon("search")}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t("searchPlaceholder")}
                    />
                  </Box>
                  <Box sx={{ minWidth: { sm: 160 } }}>
                    <ImsSelect
                      label={t("statusLabel")}
                      value={statusFilter === "all" ? "" : statusFilter}
                      onChange={(value) => setStatusFilter((value || "all") as StatusFilter)}
                      options={[
                        { value: "", label: tCommon("all") },
                        { value: "draft", label: tStatus("draft") },
                        { value: "generated", label: tStatus("generated") },
                        { value: "paid", label: tStatus("paid") },
                        { value: "overdue", label: tStatus("overdue") },
                        { value: "archived", label: tStatus("archived") },
                        { value: "cancelled", label: tStatus("cancelled") },
                      ]}
                    />
                  </Box>
                  <Box sx={{ minWidth: { sm: 160 } }}>
                    <ImsSelect
                      label={t("sortLabel")}
                      value={sort}
                      onChange={(value) => setSort(value as SortOption)}
                      options={[
                        { value: "newest", label: t("sortNewest") },
                        { value: "oldest", label: t("sortOldest") },
                        { value: "amount-desc", label: t("sortAmountDesc") },
                        { value: "amount-asc", label: t("sortAmountAsc") },
                      ]}
                    />
                  </Box>
                </Stack>
                <Typography sx={{ fontSize: 13, color: imsColors.textMuted, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {countLabel}
                </Typography>
              </Stack>
            </Box>

            {filtered.length === 0 ? (
              <CardContent sx={{ p: 4, textAlign: "center" }}>
                <Typography sx={{ fontWeight: 600, mb: 1 }}>{t("noMatches")}</Typography>
                <Typography sx={{ fontSize: 14, color: imsColors.textMuted, mb: 2 }}>
                  {t("noInvoicesHint")}
                </Typography>
                <ImsButton
                  imsVariant="secondary"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                >
                  {t("resetFilters")}
                </ImsButton>
              </CardContent>
            ) : (
              <>
                <Box sx={{ display: { xs: "none", lg: "block" } }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "#fafbfc" }}>
                          {tableHeaders.map((head, i) => (
                              <TableCell
                                key={head}
                                align={i >= 4 && i !== 6 ? "right" : "left"}
                                sx={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: imsColors.textMuted,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.4,
                                  borderBottom: `1px solid ${imsColors.border}`,
                                  py: 1.25,
                                }}
                              >
                                {head}
                              </TableCell>
                            )
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filtered.map((invoice) => {
                          const status = displayStatus(invoice, tStatus);
                          const workflow = workflowBadge(invoice, t);
                          return (
                            <TableRow
                              key={invoice.id}
                              hover
                              onClick={() => router.push(`/invoices/${invoice.id}`)}
                              sx={{
                                cursor: "pointer",
                                "&:hover": { bgcolor: imsColors.primaryLight },
                                "& td": { borderBottom: `1px solid ${imsColors.border}` },
                              }}
                            >
                              <TableCell sx={{ py: 1.75 }}>
                                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                                  {invoice.invoice_number}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 1.75, maxWidth: 200 }}>
                                <Typography sx={{ fontWeight: 500, fontSize: 13 }} noWrap>
                                  {invoiceCustomerName(invoice)}
                                </Typography>
                                {customerSubline(invoice) ? (
                                  <Typography sx={{ fontSize: 11.5, color: imsColors.textMuted }} noWrap>
                                    {customerSubline(invoice)}
                                  </Typography>
                                ) : null}
                              </TableCell>
                              <TableCell sx={{ py: 1.75, fontSize: 13, color: imsColors.textMuted }}>
                                {formatDate(invoice.invoice_date, locale)}
                              </TableCell>
                              <TableCell sx={{ py: 1.75, fontSize: 13 }}>
                                {invoice.payment_deadline ? (
                                  <Typography
                                    sx={{
                                      fontSize: 13,
                                      color: isOverdue(invoice) ? "#b42318" : imsColors.textMuted,
                                      fontWeight: isOverdue(invoice) ? 600 : 400,
                                    }}
                                  >
                                    {formatDate(invoice.payment_deadline, locale)}
                                  </Typography>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell align="right" sx={{ py: 1.75, fontWeight: 600, fontSize: 13 }}>
                                {formatCurrency(Number(invoice.net_amount), invoice.currency, locale)}
                              </TableCell>
                              <TableCell sx={{ py: 1.75 }}>
                                <ImsStatusChip tone={status.tone} label={status.label} />
                              </TableCell>
                              <TableCell sx={{ py: 1.75 }}>
                                {workflow ? (
                                  <ImsStatusChip tone={workflow.tone} label={workflow.label} />
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell align="right" sx={{ py: 1.75 }}>
                              <InvoiceRowActionsMenu invoice={invoice} />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                <Stack spacing={0} sx={{ display: { xs: "block", lg: "none" } }}>
                  {filtered.map((invoice) => {
                    const status = displayStatus(invoice, tStatus);
                    const workflow = workflowBadge(invoice, t);
                    return (
                      <Box
                        key={invoice.id}
                        sx={{
                          p: 2,
                          borderBottom: `1px solid ${imsColors.border}`,
                          "&:hover": { bgcolor: imsColors.primaryLight },
                        }}
                      >
                        <Link href={`/invoices/${invoice.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                          <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2 }}>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 600 }}>{invoice.invoice_number}</Typography>
                              <Typography sx={{ fontSize: 13, color: imsColors.textMuted }} noWrap>
                                {invoiceCustomerName(invoice)}
                              </Typography>
                            </Box>
                            <Typography sx={{ fontWeight: 600, flexShrink: 0 }}>
                              {formatCurrency(Number(invoice.net_amount), invoice.currency, locale)}
                            </Typography>
                          </Stack>
                          <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: "wrap" }}>
                            <ImsStatusChip tone={status.tone} label={status.label} />
                            {workflow ? <ImsStatusChip tone={workflow.tone} label={workflow.label} /> : null}
                          </Stack>
                        </Link>
                        <Box sx={{ mt: 1.25, display: "flex", justifyContent: "flex-end" }}>
                          <InvoiceRowActionsMenu invoice={invoice} />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </>
            )}
          </Card>
        </Stack>
      )}
    </PageShell>
  );
}
