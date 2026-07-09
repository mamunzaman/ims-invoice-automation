import type { AppLocale } from "@/i18n/routing";

/** Future-ready email translation helper. */
export function emailTranslation(
  locale: AppLocale,
  key: "invoiceCreatedSubject" | "invoiceCreatedBody" | "passwordResetSubject" | "passwordResetBody",
  values?: Record<string, string>
): string {
  const messages = locale === "de" ? deEmails : enEmails;
  let text = messages[key];
  if (values) {
    Object.entries(values).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
  }
  return text;
}

const enEmails = {
  invoiceCreatedSubject: "Invoice {number} created",
  invoiceCreatedBody: "Your invoice {number} has been created.",
  passwordResetSubject: "Reset your password",
  passwordResetBody: "Use the link below to reset your password.",
};

const deEmails = {
  invoiceCreatedSubject: "Rechnung {number} erstellt",
  invoiceCreatedBody: "Ihre Rechnung {number} wurde erstellt.",
  passwordResetSubject: "Passwort zurücksetzen",
  passwordResetBody: "Nutzen Sie den Link unten, um Ihr Passwort zurückzusetzen.",
};
