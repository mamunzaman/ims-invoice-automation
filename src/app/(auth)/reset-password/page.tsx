"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { AppInput, AppButton, Alert } from "@/components/ui";
import { AuthShell } from "@/components/layout/AuthShell";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <AuthShell title={t("resetTitle")} subtitle={t("resetContinueSubtitle")}>
      {success ? (
        <Alert type="success">{t("resetEmailSent")}</Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert type="error">{error}</Alert>}
          <AppInput
            label={t("email")}
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <AppButton type="submit" fullWidth loading={loading}>
            {t("sendLink")}
          </AppButton>
        </form>
      )}
      <div className="mt-5 text-center">
        <Link href="/login" className="text-blue-600 hover:text-blue-700 text-sm transition-colors">
          {t("backToLogin")}
        </Link>
      </div>
    </AuthShell>
  );
}
