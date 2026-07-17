"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { AddIcon, ArrowDownwardIcon, ArrowUpwardIcon } from "@/components/icons/muiIcons";
import { PageShell } from "@/components/layout/PageShell";
import { InvoiceTableRowOverlay } from "@/components/invoices/InvoiceTableRowOverlay";
import {
  ImsButton,
  ImsSelect,
  ImsStatusChip,
  ImsTextField,
  imsCardSx,
  type ImsStatusTone,
} from "@/components/forms/ims";
import { designTokens } from "@/theme/designTokens";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  invoiceCustomerName,
  invoiceCustomerAddress,
  invoicePdfUrl,
  invoiceGoogleDocUrl,
} from "@/lib/invoice-form";
import { getInvoiceDisplayStatus, isInvoiceOverdue } from "@/lib/invoice-display";
import type { InvoiceListStats } from "@/lib/actions/invoices";
import {
  buildInvoiceListSearchParams,
  DEFAULT_INVOICE_LIST_SORT,
  type InvoiceListSortColumn,
  type InvoiceListSortDirection,
  type InvoiceListSortState,
  type InvoiceListStatusFilter,
} from "@/lib/invoices-list-query";
import type { Invoice } from "@/lib/types/database";
import { resolveGenerationStatus } from "@/lib/generation-status";
import { type AppLocale } from "@/i18n/routing";
import { imsColors } from "@/theme/imsTheme";

type SortOption = "newest" | "oldest" | "amount-desc" | "amount-asc";

function sortStateToToolbarValue(sort: InvoiceListSortState): SortOption | "" {
  if (sort.column === "invoiceDate" && sort.direction === "desc") return "newest";
  if (sort.column === "invoiceDate" && sort.direction === "asc") return "oldest";
  if (sort.column === "amount" && sort.direction === "desc") return "amount-desc";
  if (sort.column === "amount" && sort.direction === "asc") return "amount-asc";
  return "";
}

function toolbarValueToSortState(value: SortOption): InvoiceListSortState {
  switch (value) {
    case "oldest":
      return { column: "invoiceDate", direction: "asc" };
    case "amount-desc":
      return { column: "amount", direction: "desc" };
    case "amount-asc":
      return { column: "amount", direction: "asc" };
    default:
      return DEFAULT_INVOICE_LIST_SORT;
  }
}

type PaginationWindowItem =
  | { type: "page"; page: number }
  | { type: "ellipsis"; key: string };

function buildPaginationWindow(currentPage: number, totalPages: number): PaginationWindowItem[] {
  if (totalPages <= 0) return [];
  if (totalPages === 1) return [{ type: "page", page: 1 }];

  const pages = new Set<number>([1, totalPages]);
  for (let pageNumber = currentPage - 2; pageNumber <= currentPage + 2; pageNumber += 1) {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      pages.add(pageNumber);
    }
  }

  const sortedPages = [...pages].sort((a, b) => a - b);
  const items: PaginationWindowItem[] = [];

  sortedPages.forEach((pageNumber, index) => {
    const previousPage = sortedPages[index - 1];
    if (index > 0 && pageNumber - previousPage > 1) {
      items.push({ type: "ellipsis", key: `ellipsis-${previousPage}-${pageNumber}` });
    }
    items.push({ type: "page", page: pageNumber });
  });

  return items;
}

interface InvoicesListProps {
  invoices: Invoice[];
  stats: InvoiceListStats;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  initialSearch: string;
  initialStatusFilter: InvoiceListStatusFilter;
  initialSort: InvoiceListSortState;
}

function displayStatus(
  invoice: Invoice,
  tStatus: ReturnType<typeof useTranslations<"status">>
): { label: string; tone: ImsStatusTone } {
  return getInvoiceDisplayStatus(invoice, {
    archived: tStatus("archived"),
    overdue: tStatus("overdue"),
    cancelled: tStatus("cancelled"),
    draft: tStatus("draft"),
    generated: tStatus("generated"),
    sent: tStatus("sent"),
    paid: tStatus("paid"),
  });
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

function customerSubline(invoice: Invoice): string | null {
  const address = invoiceCustomerAddress(invoice);
  if (address?.trim()) {
    return address.split("\n")[0]?.trim() || null;
  }
  return null;
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <Card sx={imsCardSx}>
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

const INVOICE_TABLE_COLUMNS =
  "150px minmax(240px, 1.5fr) 150px 150px 140px 140px 140px";

/** Keeps all columns readable after Actions removal; scroll horizontally inside the table shell when needed. */
const INVOICE_TABLE_MIN_WIDTH = 1080;

const invoiceTableShellSx = {
  borderRadius: "16px",
  border: `1px solid ${designTokens.border.default}`,
  bgcolor: "#FFFFFF",
  boxShadow: designTokens.shadow.soft,
  overflow: "hidden",
  width: "100%",
  maxWidth: "100%",
} as const;

const invoiceTableToolbarSx = {
  px: { xs: 2, lg: 2.5 },
  pt: { xs: 2, lg: 2.25 },
  pb: { xs: 2, lg: 2.25 },
  bgcolor: "#F7FAF5",
  borderBottom: `1px solid ${designTokens.border.subtle}`,
} as const;

const invoiceTableHeaderRowSx = {
  bgcolor: "#EEF4E9",
  borderBottom: `1px solid ${designTokens.border.subtle}`,
} as const;

const invoiceTableGridSx = {
  display: "grid",
  gridTemplateColumns: INVOICE_TABLE_COLUMNS,
  columnGap: 1.5,
  alignItems: "center",
  px: 2.5,
} as const;

const invoiceTableHeaderCellSx = {
  fontSize: 11,
  fontWeight: 700,
  color: "#475467",
  textTransform: "uppercase" as const,
  letterSpacing: 0.5,
  lineHeight: 1.2,
  minWidth: 0,
  whiteSpace: "nowrap" as const,
};

const invoiceTableDateSx = {
  fontSize: 13,
  lineHeight: 1.4,
  color: imsColors.textMuted,
  minWidth: 0,
  whiteSpace: "nowrap" as const,
};

const invoiceTableBadgeSx = {
  height: 22,
  fontSize: 11,
  fontWeight: 600,
  flexShrink: 0,
  maxWidth: "none",
  whiteSpace: "nowrap",
  "& .MuiChip-label": {
    px: 0.875,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  },
} as const;

const invoiceTableRowSx = {
  position: "relative",
  bgcolor: designTokens.table.row,
  cursor: "pointer",
  transition: `background-color ${designTokens.transition.fast}`,
  borderBottom: `1px solid rgba(90, 120, 80, 0.06)`,
  outline: "none",
  "&:hover, &:focus-within, &[data-actions-open='true']": {
    bgcolor: designTokens.table.rowHover,
  },
  "&:hover .invoice-row-content, &:focus-within .invoice-row-content, &[data-actions-open='true'] .invoice-row-content":
    {
      filter: "blur(2.5px)",
      opacity: 0.42,
    },
  "& .invoice-row-overlay": {
    opacity: 0,
    visibility: "hidden",
    pointerEvents: "none",
  },
  "&:hover .invoice-row-overlay, &:focus-within .invoice-row-overlay, &[data-actions-open='true'] .invoice-row-overlay":
    {
      opacity: 1,
      visibility: "visible",
      pointerEvents: "auto",
    },
  "&:last-of-type": {
    borderBottom: "none",
  },
} as const;

const invoiceTableRowMinHeight = {
  minHeight: 76,
  "@media (max-width: 1024px)": {
    minHeight: 120,
  },
} as const;

const invoiceTableRowContentSx = {
  ...invoiceTableGridSx,
  ...invoiceTableRowMinHeight,
  alignItems: "center",
  py: { xs: 1.75, lg: 1.75 },
  width: "100%",
  transition: `filter ${designTokens.transition.fast}, opacity ${designTokens.transition.fast}`,
  willChange: "filter, opacity",
} as const;

function InvoiceTableBadgeCell({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        minWidth: 140,
        flexShrink: 0,
        overflow: "visible",
        whiteSpace: "nowrap",
        py: 0.25,
      }}
    >
      {children}
    </Box>
  );
}

type TableHeaderAlign = "left" | "center" | "right";

function headerJustifyContent(align: TableHeaderAlign) {
  if (align === "right") return "flex-end";
  if (align === "center") return "center";
  return "flex-start";
}

function InvoiceTableSortHeader({
  label,
  align,
  active,
  direction,
  sortable,
  onSort,
}: {
  label: string;
  align: TableHeaderAlign;
  active: boolean;
  direction: InvoiceListSortDirection;
  sortable: boolean;
  onSort?: () => void;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: headerJustifyContent(align),
        width: "100%",
        minWidth: 0,
      }}
    >
      <Box
        component={sortable ? "button" : "div"}
        type={sortable ? "button" : undefined}
        onClick={sortable ? onSort : undefined}
        aria-label={sortable ? `${label}, sort` : undefined}
        sx={{
          ...invoiceTableHeaderCellSx,
          display: "inline-flex",
          alignItems: "center",
          gap: 0.25,
          border: 0,
          bgcolor: "transparent",
          cursor: sortable ? "pointer" : "default",
          p: 0,
          m: 0,
          font: "inherit",
          color: active ? imsColors.primaryDark : "#475467",
          "&:hover": sortable ? { color: imsColors.textDark } : undefined,
        }}
      >
        <span>{label}</span>
        {active ? (
          direction === "asc" ? (
            <ArrowUpwardIcon sx={{ fontSize: 14, flexShrink: 0 }} />
          ) : (
            <ArrowDownwardIcon sx={{ fontSize: 14, flexShrink: 0 }} />
          )
        ) : null}
      </Box>
    </Box>
  );
}

export function InvoicesList({
  invoices,
  stats,
  page,
  totalCount,
  totalPages,
  initialSearch,
  initialStatusFilter,
  initialSort,
}: InvoicesListProps) {
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("invoice");
  const tStatus = useTranslations("status");
  const tCommon = useTranslations("common");
  const tButtons = useTranslations("buttons");
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [prevInitialSearch, setPrevInitialSearch] = useState(initialSearch);
  const [touchActiveRowId, setTouchActiveRowId] = useState<string | null>(null);

  useEffect(() => {
    if (!touchActiveRowId) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(`[data-invoice-row-id="${touchActiveRowId}"]`)) return;
      if (target.closest('[role="dialog"]')) return;
      setTouchActiveRowId(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [touchActiveRowId]);

  if (initialSearch !== prevInitialSearch) {
    setPrevInitialSearch(initialSearch);
    setSearchInput(initialSearch);
  }

  useEffect(() => {
    const trimmedInput = searchInput.trim();
    const trimmedInitial = initialSearch.trim();
    if (trimmedInput === trimmedInitial) return;

    const timer = window.setTimeout(() => {
      router.push(
        `/invoices${buildInvoiceListSearchParams({
          page: 1,
          search: searchInput,
          statusFilter: initialStatusFilter,
          sort: initialSort,
        })}`
      );
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput, initialSearch, initialStatusFilter, initialSort, router]);

  function navigateList(input: {
    page?: number;
    search?: string;
    statusFilter?: InvoiceListStatusFilter;
    sort?: InvoiceListSortState;
  }) {
    router.push(
      `/invoices${buildInvoiceListSearchParams({
        page: input.page ?? page,
        search: input.search ?? searchInput,
        statusFilter: input.statusFilter ?? initialStatusFilter,
        sort: input.sort ?? initialSort,
      })}`
    );
  }

  function handleColumnSort(column: InvoiceListSortColumn) {
    const nextSort: InvoiceListSortState =
      initialSort.column === column
        ? {
            column,
            direction: initialSort.direction === "asc" ? "desc" : "asc",
          }
        : { column, direction: "asc" };

    navigateList({ page: 1, sort: nextSort });
  }

  const toolbarSortValue = sortStateToToolbarValue(initialSort);
  const sortSelectValue = toolbarSortValue || "header";
  const sortSelectOptions = useMemo(() => {
    const presets = [
      { value: "newest", label: t("sortNewest") },
      { value: "oldest", label: t("sortOldest") },
      { value: "amount-desc", label: t("sortAmountDesc") },
      { value: "amount-asc", label: t("sortAmountAsc") },
    ];
    if (toolbarSortValue === "") {
      return [{ value: "header", label: t("sortLabel") }, ...presets];
    }
    return presets;
  }, [t, toolbarSortValue]);

  const countLabel = t("invoicesCount", { count: totalCount });
  const paginationSummary = t("paginationSummary", { page, totalPages, totalCount });
  const paginationWindow = useMemo(
    () => buildPaginationWindow(page, totalPages),
    [page, totalPages]
  );
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  const tableHeaderCells: Array<{
    key: InvoiceListSortColumn;
    label: string;
    align: TableHeaderAlign;
    sortable: boolean;
  }> = [
    { key: "invoice", label: t("defaultTitle"), align: "left", sortable: true },
    { key: "customer", label: t("customer"), align: "left", sortable: true },
    { key: "invoiceDate", label: t("invoiceDate"), align: "left", sortable: true },
    { key: "paymentDue", label: t("paymentDeadline"), align: "left", sortable: true },
    { key: "amount", label: t("totalAmount"), align: "right", sortable: true },
    { key: "status", label: t("statusLabel"), align: "center", sortable: true },
    { key: "document", label: t("documentColumn"), align: "center", sortable: true },
  ];

  return (
    <PageShell
      breadcrumbs={[{ label: t("title") }]}
      title={t("title")}
      subtitle={t("subtitle")}
      topActions={
        <ImsButton href="/invoices/new" startIcon={<AddIcon />}>
          {tButtons("createInvoice")}
        </ImsButton>
      }
    >
      {stats.total === 0 ? (
        <Card sx={imsCardSx}>
          <CardContent sx={{ p: 4, textAlign: "center" }}>
            <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 1 }}>{t("emptyListTitle")}</Typography>
            <Typography sx={{ fontSize: 14, color: imsColors.textMuted, mb: 2.5 }}>
              {t("emptyListHint")}
            </Typography>
            <ImsButton href="/invoices/new" startIcon={<AddIcon />}>
              {tButtons("createInvoice")}
            </ImsButton>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2.5} sx={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "hidden" }}>
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

          <Card sx={{ ...imsCardSx, ...invoiceTableShellSx, p: 0, bgcolor: "transparent" }}>
            <Box sx={invoiceTableToolbarSx}>
              <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={2}
                sx={{
                  alignItems: { lg: "flex-end" },
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  useFlexGap
                  sx={{ flex: 1, minWidth: 0, flexWrap: "wrap", width: "100%" }}
                >
                  <Box sx={{ flex: "1 1 200px", minWidth: { xs: "100%", sm: 200 }, maxWidth: { lg: 320 } }}>
                    <ImsTextField
                      label={tCommon("search")}
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder={t("searchPlaceholder")}
                    />
                  </Box>
                  <Box sx={{ flex: "1 1 140px", minWidth: { xs: "100%", sm: 140 }, maxWidth: { sm: 200 } }}>
                    <ImsSelect
                      label={t("statusLabel")}
                      value={initialStatusFilter === "all" ? "" : initialStatusFilter}
                      onChange={(value) =>
                        navigateList({
                          page: 1,
                          statusFilter: (value || "all") as InvoiceListStatusFilter,
                        })
                      }
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
                  <Box sx={{ flex: "1 1 140px", minWidth: { xs: "100%", sm: 140 }, maxWidth: { sm: 200 } }}>
                    <ImsSelect
                      label={t("sortLabel")}
                      value={sortSelectValue}
                      onChange={(value) => {
                        if (value === "header") return;
                        navigateList({ page: 1, sort: toolbarValueToSortState(value as SortOption) });
                      }}
                      options={sortSelectOptions}
                    />
                  </Box>
                </Stack>
                <Typography
                  sx={{
                    fontSize: 13,
                    color: imsColors.textMuted,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    pb: { lg: 0.25 },
                  }}
                >
                  {countLabel}
                </Typography>
              </Stack>
            </Box>

            {totalCount === 0 ? (
              <CardContent sx={{ p: 4, textAlign: "center" }}>
                <Typography sx={{ fontWeight: 600, mb: 1 }}>{t("noMatches")}</Typography>
                <Typography sx={{ fontSize: 14, color: imsColors.textMuted, mb: 2 }}>
                  {t("noInvoicesHint")}
                </Typography>
                <ImsButton
                  imsVariant="secondary"
                  onClick={() => {
                    setSearchInput("");
                    navigateList({ page: 1, search: "", statusFilter: "all" });
                  }}
                >
                  {t("resetFilters")}
                </ImsButton>
              </CardContent>
            ) : (
              <>
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: "100%",
                    overflowX: "auto",
                    overflowY: "hidden",
                    bgcolor: "#FFFFFF",
                    WebkitOverflowScrolling: "touch",
                  }}
                >
                  <Box sx={{ minWidth: INVOICE_TABLE_MIN_WIDTH }}>
                    <Box
                      sx={{
                        ...invoiceTableGridSx,
                        ...invoiceTableHeaderRowSx,
                        py: 1.5,
                      }}
                    >
                      {tableHeaderCells.map((cell) =>
                        cell.sortable ? (
                          <InvoiceTableSortHeader
                            key={cell.key}
                            label={cell.label}
                            align={cell.align}
                            active={initialSort.column === cell.key}
                            direction={initialSort.direction}
                            sortable
                            onSort={() => handleColumnSort(cell.key as InvoiceListSortColumn)}
                          />
                        ) : (
                          <Typography
                            key={cell.key}
                            sx={{
                              ...invoiceTableHeaderCellSx,
                              textAlign: cell.align,
                              width: "100%",
                            }}
                          >
                            {cell.label}
                          </Typography>
                        )
                      )}
                    </Box>

                    {invoices.map((invoice) => {
                      const status = displayStatus(invoice, tStatus);
                      const workflow = workflowBadge(invoice, t);
                      const subline = customerSubline(invoice);
                      const overdue = isInvoiceOverdue(invoice);
                      const actionsOpen = touchActiveRowId === invoice.id;

                      return (
                        <Box
                          key={invoice.id}
                          data-invoice-row-id={invoice.id}
                          data-actions-open={actionsOpen ? "true" : undefined}
                          tabIndex={0}
                          onClick={(event) => {
                            const isCoarse =
                              typeof window !== "undefined" &&
                              window.matchMedia("(hover: none), (pointer: coarse)").matches;

                            if (isCoarse) {
                              event.preventDefault();
                              setTouchActiveRowId((current) =>
                                current === invoice.id ? null : invoice.id
                              );
                              return;
                            }

                            router.push(`/invoices/${invoice.id}`);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              router.push(`/invoices/${invoice.id}`);
                            }
                          }}
                          sx={{
                            ...invoiceTableRowSx,
                            ...invoiceTableRowMinHeight,
                          }}
                        >
                          <Box className="invoice-row-content" sx={invoiceTableRowContentSx}>
                            <Typography
                              sx={{
                                fontWeight: 800,
                                fontSize: 14,
                                lineHeight: 1.35,
                                letterSpacing: "-0.01em",
                                color: imsColors.textDark,
                                minWidth: 0,
                              }}
                              noWrap
                            >
                              {invoice.invoice_number}
                            </Typography>

                            <Box sx={{ minWidth: 0, overflow: "hidden", py: 0.125 }}>
                              <Typography
                                sx={{
                                  fontWeight: 600,
                                  fontSize: 13,
                                  lineHeight: 1.35,
                                  color: imsColors.textDark,
                                }}
                                noWrap
                              >
                                {invoiceCustomerName(invoice)}
                              </Typography>
                              {subline ? (
                                <Typography
                                  sx={{
                                    fontSize: 11,
                                    lineHeight: 1.35,
                                    color: imsColors.textMuted,
                                    mt: 0.375,
                                    opacity: 0.92,
                                  }}
                                  noWrap
                                >
                                  {subline}
                                </Typography>
                              ) : null}
                            </Box>

                            <Typography sx={invoiceTableDateSx} noWrap>
                              {formatDate(invoice.invoice_date, locale)}
                            </Typography>

                            <Typography
                              sx={{
                                ...invoiceTableDateSx,
                                color: overdue ? "#b42318" : imsColors.textMuted,
                                fontWeight: overdue ? 600 : 400,
                              }}
                              noWrap
                            >
                              {invoice.payment_deadline
                                ? formatDate(invoice.payment_deadline, locale)
                                : "—"}
                            </Typography>

                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: 13.5,
                                lineHeight: 1.35,
                                textAlign: "right",
                                fontVariantNumeric: "tabular-nums",
                                color: imsColors.textDark,
                                minWidth: 0,
                                pr: 0.5,
                                letterSpacing: "-0.01em",
                                whiteSpace: "nowrap",
                              }}
                              noWrap
                            >
                              {formatCurrency(Number(invoice.net_amount), invoice.currency, locale)}
                            </Typography>

                            <InvoiceTableBadgeCell>
                              <ImsStatusChip
                                tone={status.tone}
                                label={status.label}
                                sx={invoiceTableBadgeSx}
                              />
                            </InvoiceTableBadgeCell>

                            <InvoiceTableBadgeCell>
                              {workflow ? (
                                <ImsStatusChip
                                  tone={workflow.tone}
                                  label={workflow.label}
                                  sx={invoiceTableBadgeSx}
                                />
                              ) : (
                                <Typography
                                  sx={{ fontSize: 12, color: imsColors.textMuted, opacity: 0.75 }}
                                >
                                  —
                                </Typography>
                              )}
                            </InvoiceTableBadgeCell>
                          </Box>

                          <InvoiceTableRowOverlay invoice={invoice} />
                        </Box>
                      );
                    })}
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "stretch", sm: "center" },
                    justifyContent: "space-between",
                    gap: 1.5,
                    px: 2,
                    py: 1.75,
                    borderTop: `1px solid ${imsColors.border}`,
                    bgcolor: "#FFFFFF",
                  }}
                >
                  <Typography sx={{ fontSize: 13, color: imsColors.textMuted }}>
                    {paginationSummary}
                  </Typography>
                  <Stack
                    component="nav"
                    aria-label={t("paginationNav")}
                    direction="row"
                    spacing={0.75}
                    sx={{
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: { xs: "flex-end", sm: "flex-start" },
                    }}
                  >
                    <ImsButton
                      imsVariant="secondary"
                      disabled={!canGoPrevious}
                      onClick={() => navigateList({ page: page - 1 })}
                    >
                      {t("paginationPrevious")}
                    </ImsButton>
                    {paginationWindow.map((item) =>
                      item.type === "ellipsis" ? (
                        <Typography
                          key={item.key}
                          component="span"
                          aria-hidden
                          sx={{
                            px: 0.5,
                            fontSize: 13,
                            color: imsColors.textMuted,
                            userSelect: "none",
                          }}
                        >
                          …
                        </Typography>
                      ) : (
                        <ImsButton
                          key={item.page}
                          imsVariant={item.page === page ? "primary" : "secondary"}
                          disabled={item.page === page}
                          aria-current={item.page === page ? "page" : undefined}
                          aria-label={t("paginationPage", { page: item.page })}
                          onClick={() => navigateList({ page: item.page })}
                          sx={{ minWidth: 36, px: 1 }}
                        >
                          {item.page}
                        </ImsButton>
                      )
                    )}
                    <ImsButton
                      imsVariant="secondary"
                      disabled={!canGoNext}
                      onClick={() => navigateList({ page: page + 1 })}
                    >
                      {t("paginationNext")}
                    </ImsButton>
                  </Stack>
                </Box>
              </>
            )}
          </Card>
        </Stack>
      )}
    </PageShell>
  );
}
