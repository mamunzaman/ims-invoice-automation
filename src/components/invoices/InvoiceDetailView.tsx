"use client";

import { Alert, Box, Grid, Stack, Typography } from "@mui/material";
import { useLocale, useTranslations } from "next-intl";
import {
  AccountBalanceOutlinedIcon,
  CalendarMonthOutlinedIcon,
  InfoOutlinedIcon,
  PersonOutlineOutlinedIcon,
} from "@/components/icons/muiIcons";
import {
  ImsCard,
  ImsInfoField,
  ImsMetricCard,
  ImsPageHeader,
} from "@/components/forms/ims";
import { InvoiceDetailActions } from "@/components/invoices/InvoiceDetailActions";
import { InvoiceDetailDocuments } from "@/components/invoices/InvoiceDetailDocuments";
import { InvoiceDetailTimeline } from "@/components/invoices/InvoiceDetailTimeline";
import {
  invoiceCustomerAddress,
  invoiceCustomerName,
  invoiceDocumentUrls,
  invoiceNotesMeta,
  invoiceServiceDescription,
} from "@/lib/invoice-form";
import {
  formatPaymentDeadlineLabel,
  getInvoiceDisplayStatus,
  getPaymentStatusChip,
} from "@/lib/invoice-display";
import { resolveInvoiceRegisterDisplay } from "@/lib/invoice-generation-steps";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice } from "@/lib/types/database";
import { type AppLocale } from "@/i18n/routing";
import { imsColors } from "@/theme/imsTheme";

interface InvoiceDetailViewProps {
  invoice: Invoice;
}

export function InvoiceDetailView({ invoice }: InvoiceDetailViewProps) {
  const t = useTranslations("invoiceDetail");
  const tInvoice = useTranslations("invoice");
  const tStatus = useTranslations("status");
  const tBank = useTranslations("bankAccounts");
  const tPayment = useTranslations("paymentStatus");
  const locale = useLocale() as AppLocale;

  const meta = invoiceNotesMeta(invoice);
  const documents = invoiceDocumentUrls(invoice);
  const {
    googleDocUrl,
    pdfDownloadHref,
    docxDownloadHref,
    pdfGenerated,
    docxGenerated,
    pdfSavedInDropbox,
    docxSavedInDropbox,
    dropboxPdfPath,
    dropboxDocxPath,
  } = documents;
  const status = getInvoiceDisplayStatus(invoice, {
    archived: tStatus("archived"),
    overdue: tStatus("overdue"),
    cancelled: tStatus("cancelled"),
    draft: tStatus("draft"),
    generated: tStatus("generated"),
    sent: tStatus("sent"),
    paid: tStatus("paid"),
  });
  const paymentChip = getPaymentStatusChip(invoice.payment_status, {
    unpaid: tPayment("unpaid"),
    paid: tPayment("paid"),
    pending: tPayment("pending"),
  });
  const customerName = invoiceCustomerName(invoice);
  const customerAddress = invoiceCustomerAddress(invoice);
  const serviceDescription = invoiceServiceDescription(invoice) || "—";
  const invoiceYear = invoice.invoice_date
    ? new Date(invoice.invoice_date).getFullYear()
    : new Date().getFullYear();
  const registerDisplay = resolveInvoiceRegisterDisplay(meta.generation_steps);
  const mainAmount = invoice.is_small_business ? invoice.net_amount : invoice.gross_amount;
  const hasBankInfo = Boolean(meta.bank_name || meta.iban || meta.bic || meta.account_holder);

  return (
    <Box sx={{ maxWidth: 1440, mx: "auto", width: "100%" }}>
      <Stack spacing={2.5}>
        <ImsPageHeader
          backHref="/invoices"
          backLabel={t("backToInvoices")}
          title={`${tInvoice("invoiceNumber")} ${invoice.invoice_number}`}
          status={status}
          meta={[
            {
              icon: <CalendarMonthOutlinedIcon sx={{ fontSize: 18, color: imsColors.textMuted }} />,
              label: tInvoice("invoiceDate"),
              value: formatDate(invoice.invoice_date, locale),
            },
            {
              icon: <PersonOutlineOutlinedIcon sx={{ fontSize: 18, color: imsColors.textMuted }} />,
              label: tInvoice("customer"),
              value: customerName,
            },
          ]}
          actions={<InvoiceDetailActions invoice={invoice} />}
        />

        <Grid container spacing={2.5} sx={{ alignItems: "flex-start" }}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={2.5}>
              <ImsCard title={t("overview.title")}>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Stack spacing={2}>
                      <ImsInfoField label={tInvoice("invoiceNumber")} value={invoice.invoice_number} />
                      <ImsInfoField
                        label={tInvoice("servicePeriod")}
                        value={invoice.service_period || "—"}
                      />
                      <ImsInfoField
                        label={tInvoice("paymentDeadline")}
                        value={
                          invoice.payment_deadline
                            ? formatPaymentDeadlineLabel(invoice.payment_deadline, locale, (days) =>
                                t("inDays", { days })
                              )
                            : "—"
                        }
                      />
                      <ImsInfoField
                        label={tInvoice("paymentTerms")}
                        value={meta.payment_terms || "—"}
                      />
                      {invoice.is_small_business ? (
                        <Alert
                          icon={<InfoOutlinedIcon fontSize="inherit" />}
                          severity="success"
                          sx={{
                            bgcolor: imsColors.primaryLight,
                            color: imsColors.primaryDark,
                            border: `1px solid ${imsColors.border}`,
                            borderRadius: "14px",
                            "& .MuiAlert-icon": { color: imsColors.primary },
                          }}
                        >
                          {invoice.small_business_notice || t("overview.smallBusinessNotice")}
                        </Alert>
                      ) : null}
                    </Stack>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <Stack spacing={2}>
                      <ImsInfoField
                        label={t("overview.customerRecipient")}
                        value={[customerName, customerAddress, meta.customer_country]
                          .filter(Boolean)
                          .join("\n")}
                        emphasize
                      />
                      <ImsInfoField
                        label={tInvoice("serviceDescription")}
                        value={serviceDescription}
                      />
                    </Stack>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <ImsMetricCard
                      label={t("overview.invoiceAmount")}
                      value={formatCurrency(mainAmount, invoice.currency, locale)}
                      tone="primary"
                      size="lg"
                      statusChip={paymentChip ?? undefined}
                      footer={
                        <Stack spacing={0.75}>
                          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                            <Typography sx={{ fontSize: 13, color: imsColors.textMuted }}>
                              {tInvoice("amountNet")}
                            </Typography>
                            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                              {formatCurrency(Number(invoice.net_amount), invoice.currency, locale)}
                            </Typography>
                          </Stack>
                          {!invoice.is_small_business ? (
                            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                              <Typography sx={{ fontSize: 13, color: imsColors.textMuted }}>
                                {t("overview.vatAmount")}
                              </Typography>
                              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                                {formatCurrency(
                                  Number(invoice.vat_amount),
                                  invoice.currency,
                                  locale
                                )}
                              </Typography>
                            </Stack>
                          ) : null}
                        </Stack>
                      }
                    />
                  </Grid>
                </Grid>
              </ImsCard>

              <ImsCard title={tInvoice("bankDetails")}>
                {hasBankInfo ? (
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <ImsInfoField
                        icon={
                          <AccountBalanceOutlinedIcon
                            sx={{ fontSize: 16, color: imsColors.textMuted }}
                          />
                        }
                        label={tBank("bankName")}
                        value={meta.bank_name || "—"}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <ImsInfoField
                        icon={
                          <AccountBalanceOutlinedIcon
                            sx={{ fontSize: 16, color: imsColors.textMuted }}
                          />
                        }
                        label={tBank("iban")}
                        value={meta.iban || "—"}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <ImsInfoField
                        icon={
                          <AccountBalanceOutlinedIcon
                            sx={{ fontSize: 16, color: imsColors.textMuted }}
                          />
                        }
                        label={tBank("bic")}
                        value={meta.bic || "—"}
                      />
                    </Grid>
                    {meta.account_holder ? (
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <ImsInfoField
                          icon={
                            <PersonOutlineOutlinedIcon
                              sx={{ fontSize: 16, color: imsColors.textMuted }}
                            />
                          }
                          label={t("overview.accountHolder")}
                          value={meta.account_holder}
                        />
                      </Grid>
                    ) : null}
                  </Grid>
                ) : (
                  <Typography sx={{ fontSize: 14, color: imsColors.textMuted, fontStyle: "italic" }}>
                    {t("notProvided")}
                  </Typography>
                )}
              </ImsCard>

              <InvoiceDetailDocuments
                googleDocUrl={googleDocUrl}
                pdfDownloadHref={pdfDownloadHref}
                docxDownloadHref={docxDownloadHref}
                pdfGenerated={pdfGenerated}
                docxGenerated={docxGenerated}
                pdfSavedInDropbox={pdfSavedInDropbox}
                docxSavedInDropbox={docxSavedInDropbox}
                generatedAt={invoice.generated_at}
                dropboxPdfPath={dropboxPdfPath}
                dropboxDocxPath={dropboxDocxPath}
                invoiceYear={invoiceYear}
                invoiceNumber={invoice.invoice_number}
                registerStatus={registerDisplay.status}
                registerErrorMessage={
                  registerDisplay.status === "failed" ? invoice.generation_error : null
                }
                workflowComplete={
                  invoice.workflow_status === "completed" ||
                  invoice.generation_status === "COMPLETED"
                }
              />
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <InvoiceDetailTimeline invoice={invoice} documents={documents} />
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}
