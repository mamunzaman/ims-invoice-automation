"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { deleteCustomer } from "@/lib/actions/customers";
import { AppIconButton } from "@/components/ui";
import { cn } from "@/lib/cn";

function EyeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

export function DeleteCustomerButton({
  id,
  stayOnPage = false,
  variant = "button",
}: {
  id: string;
  stayOnPage?: boolean;
  variant?: "button" | "icon";
}) {
  const router = useRouter();
  const t = useTranslations("customers");
  const tVal = useTranslations("validation");
  const tButtons = useTranslations("buttons");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t("confirmDelete"))) return;
    setError("");
    setLoading(true);
    const result = await deleteCustomer(id);
    if (!result.success) {
      setError(result.errors?.[0] || tVal("deleteFailed"));
      setLoading(false);
      return;
    }
    if (!stayOnPage) {
      router.push("/customers");
    }
    router.refresh();
    setLoading(false);
  }

  if (variant === "icon") {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <AppIconButton
          label={t("deleteCustomer")}
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          disabled={loading}
          className="text-gray-400 hover:text-red-600 hover:bg-red-50 focus:ring-red-400"
          icon={<TrashIcon />}
        />
        {error && <p className="sr-only">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="text-sm text-red-600 hover:underline disabled:opacity-50"
      >
        {tButtons("delete")}
      </button>
    </div>
  );
}

export function CustomerActions({
  id,
  variant = "buttons",
  stayOnPage = false,
  className,
}: {
  id: string;
  variant?: "buttons" | "icons";
  stayOnPage?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const t = useTranslations("customers");
  const tButtons = useTranslations("buttons");

  if (variant === "icons") {
    return (
      <div
        className={cn("flex items-center gap-0.5", className)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <AppIconButton
          label={t("viewCustomer")}
          size="sm"
          variant="ghost"
          className="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
          icon={<EyeIcon />}
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/customers/${id}`);
          }}
        />
        <AppIconButton
          label={t("editCustomerAction")}
          size="sm"
          variant="ghost"
          className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          icon={<PencilIcon />}
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/customers/${id}/edit`);
          }}
        />
        <DeleteCustomerButton id={id} stayOnPage={stayOnPage} variant="icon" />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Link href={`/customers/${id}`}>
        <span className="text-sm text-gray-600 hover:text-blue-600">{tButtons("view")}</span>
      </Link>
      <Link href={`/customers/${id}/edit`}>
        <span className="text-sm text-gray-600 hover:text-gray-900">{tButtons("edit")}</span>
      </Link>
      <DeleteCustomerButton id={id} stayOnPage={stayOnPage} />
    </div>
  );
}
