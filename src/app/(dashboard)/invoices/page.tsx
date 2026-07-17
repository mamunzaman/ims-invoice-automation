import { redirect } from "next/navigation";
import {
  getInvoiceListStats,
  getInvoicePageSizeSetting,
  getInvoicesPaginated,
} from "@/lib/actions/invoices";
import { InvoicesList } from "@/components/invoices/InvoicesList";
import {
  buildInvoiceListSearchParams,
  DEFAULT_INVOICE_LIST_SORT,
  parseInvoiceListSortColumn,
  parseInvoiceListSortDirection,
  parseInvoiceListStatusFilter,
} from "@/lib/invoices-list-query";

interface InvoicesPageProps {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    sort?: string;
    dir?: string;
  }>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams;
  const pageSize = await getInvoicePageSizeSetting();
  const statusFilter = parseInvoiceListStatusFilter(params.status);
  const sort = {
    column: parseInvoiceListSortColumn(params.sort ?? DEFAULT_INVOICE_LIST_SORT.column),
    direction: parseInvoiceListSortDirection(params.dir ?? DEFAULT_INVOICE_LIST_SORT.direction),
  };
  const search = params.q?.trim() ?? "";
  const requestedPage = Number.parseInt(params.page ?? "1", 10);

  const [listResult, stats] = await Promise.all([
    getInvoicesPaginated({
      page: Number.isFinite(requestedPage) ? requestedPage : 1,
      pageSize,
      search,
      statusFilter,
      sort,
    }),
    getInvoiceListStats(),
  ]);

  const normalizedRequested = Number.isFinite(requestedPage) && requestedPage >= 1 ? requestedPage : 1;
  if (normalizedRequested !== listResult.page) {
    redirect(
      `/invoices${buildInvoiceListSearchParams({
        page: listResult.page,
        search,
        statusFilter,
        sort,
      })}`
    );
  }

  return (
    <InvoicesList
      invoices={listResult.invoices}
      stats={stats}
      page={listResult.page}
      pageSize={listResult.pageSize}
      totalCount={listResult.totalCount}
      totalPages={listResult.totalPages}
      initialSearch={search}
      initialStatusFilter={statusFilter}
      initialSort={sort}
    />
  );
}
