"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { AppInput, AppButton, Alert } from "@/components/ui";
import { AuthShell } from "@/components/layout/AuthShell";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const tValidation = useTranslations("validation");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError(tValidation("passwordMinLength"));
      return;
    }
    if (password !== confirmPassword) {
      setError(tValidation("passwordMismatch"));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <AuthShell title={t("registerSuccessTitle")} subtitle={t("registerSuccessSubtitle")}>
        <Alert type="success">{t("registerSuccessMessage")}</Alert>
        <div className="mt-5 text-center">
          <Link href="/login" className="text-blue-600 hover:text-blue-700 text-sm transition-colors">
            {t("goToLogin")}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("registerTitle")} subtitle={t("registerContinueSubtitle")}>
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
        <AppInput
          label={t("password")}
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <AppInput
          label={t("confirmPassword")}
          type="password"
          name="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <AppButton type="submit" fullWidth loading={loading}>
          {t("signUp")}
        </AppButton>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">
        {t("alreadyRegistered")}{" "}
        <Link href="/login" className="text-blue-600 hover:text-blue-700 transition-colors">
          {t("signIn")}
        </Link>
      </p>
    </AuthShell>
  );
}
