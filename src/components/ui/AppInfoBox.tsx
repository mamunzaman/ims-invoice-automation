import { cn } from "@/lib/cn";

type InfoTone = "info" | "warning" | "success";

const TONES: Record<InfoTone, string> = {
  info: "bg-blue-50/80 border-blue-100/80 text-blue-800",
  warning: "bg-amber-50/80 border-amber-100/80 text-amber-800",
  success: "bg-emerald-50/80 border-emerald-100/80 text-emerald-800",
};

interface AppInfoBoxProps {
  children: React.ReactNode;
  tone?: InfoTone;
  className?: string;
}

export function AppInfoBox({
  children,
  tone = "info",
  className,
}: AppInfoBoxProps) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-xs leading-relaxed",
        TONES[tone],
        className
      )}
    >
      {children}
    </div>
  );
}
