export const INVOICE_PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

export type InvoicePageSize = (typeof INVOICE_PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_INVOICE_PAGE_SIZE: InvoicePageSize = 20;

export type InvoiceListStatusFilter =
  | "all"
  | "draft"
  | "generated"
  | "paid"
  | "overdue"
  | "archived"
  | "cancelled";

export type InvoiceListSortColumn =
  | "invoice"
  | "customer"
  | "invoiceDate"
  | "paymentDue"
  | "amount"
  | "status"
  | "document";

export type InvoiceListSortDirection = "asc" | "desc";

export type InvoiceListSortState = {
  column: InvoiceListSortColumn;
  direction: InvoiceListSortDirection;
};

export const DEFAULT_INVOICE_LIST_SORT: InvoiceListSortState = {
  column: "invoiceDate",
  direction: "desc",
};

export interface InvoiceListQueryInput {
  page: number;
  pageSize: InvoicePageSize;
  search?: string;
  statusFilter: InvoiceListStatusFilter;
  sort: InvoiceListSortState;
}

export interface InvoiceListQueryResult {
  page: number;
  pageSize: InvoicePageSize;
  totalCount: number;
  totalPages: number;
}

export const ARCHIVED_NOTES_PATTERN = '%"archived":true%';

export function normalizeInvoicePageSize(value: unknown): InvoicePageSize {
  const parsed = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : DEFAULT_INVOICE_PAGE_SIZE;
  return INVOICE_PAGE_SIZE_OPTIONS.includes(parsed as InvoicePageSize)
    ? (parsed as InvoicePageSize)
    : DEFAULT_INVOICE_PAGE_SIZE;
}

export function normalizeInvoiceListPage(page: unknown, totalPages: number): number {
  const parsed = typeof page === "number" ? page : Number.parseInt(String(page ?? "1"), 10);
  const safeTotalPages = Math.max(1, totalPages);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.min(parsed, safeTotalPages);
}

export function parseInvoiceListStatusFilter(value: string | undefined): InvoiceListStatusFilter {
  switch (value) {
    case "draft":
    case "generated":
    case "paid":
    case "overdue":
    case "archived":
    case "cancelled":
      return value;
    default:
      return "all";
  }
}

export function parseInvoiceListSortColumn(value: string | undefined): InvoiceListSortColumn {
  switch (value) {
    case "invoice":
    case "customer":
    case "invoiceDate":
    case "paymentDue":
    case "amount":
    case "status":
    case "document":
      return value;
    default:
      return DEFAULT_INVOICE_LIST_SORT.column;
  }
}

export function parseInvoiceListSortDirection(value: string | undefined): InvoiceListSortDirection {
  return value === "asc" ? "asc" : "desc";
}

export function invoiceListSortToOrderColumn(sort: InvoiceListSortState): string {
  switch (sort.column) {
    case "invoice":
      return "invoice_number";
    case "customer":
      return "notes";
    case "invoiceDate":
      return "invoice_date";
    case "paymentDue":
      return "payment_deadline";
    case "amount":
      return "net_amount";
    case "status":
      return "status";
    case "document":
      return "pdf_url";
    default:
      return "invoice_date";
  }
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildInvoiceListSearchParams(input: {
  page?: number;
  search?: string;
  statusFilter?: InvoiceListStatusFilter;
  sort?: InvoiceListSortState;
}): string {
  const params = new URLSearchParams();

  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }

  const search = input.search?.trim();
  if (search) {
    params.set("q", search);
  }

  if (input.statusFilter && input.statusFilter !== "all") {
    params.set("status", input.statusFilter);
  }

  const sort = input.sort ?? DEFAULT_INVOICE_LIST_SORT;
  if (
    sort.column !== DEFAULT_INVOICE_LIST_SORT.column ||
    sort.direction !== DEFAULT_INVOICE_LIST_SORT.direction
  ) {
    params.set("sort", sort.column);
    params.set("dir", sort.direction);
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}
