"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { AppInput, AppButton, Alert } from "@/components/ui";
import { AuthShell } from "@/components/layout/AuthShell";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const tValidation = useTranslations("validation");
  const configError = searchParams.get("error") === "config";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(tValidation("loginFailed"));
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : tValidation("configurationError"));
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t("appTitle")} subtitle={t("loginContinueSubtitle")}>
      {configError && (
        <Alert type="error">{t("supabaseConfigDetail")}</Alert>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
          autoComplete="current-password"
        />
        <AppButton type="submit" fullWidth loading={loading}>
          {t("signIn")}
        </AppButton>
      </form>
      <div className="mt-5 text-center text-sm space-y-2">
        <Link href="/reset-password" className="text-blue-600 hover:text-blue-700 transition-colors block">
          {t("forgotPassword")}
        </Link>
        <p className="text-slate-500">
          {t("noAccount")}{" "}
          <Link href="/register" className="text-blue-600 hover:text-blue-700 transition-colors">
            {t("signUp")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
