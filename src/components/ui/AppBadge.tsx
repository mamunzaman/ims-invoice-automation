import { cn } from "@/lib/cn";

export type AppBadgeTone =
  | "gray"
  | "blue"
  | "green"
  | "amber"
  | "red"
  | "purple";

const TONES: Record<AppBadgeTone, string> = {
  gray: "bg-slate-100/90 text-slate-600 ring-1 ring-slate-200/60",
  blue: "bg-blue-50/90 text-blue-700 ring-1 ring-blue-100",
  green: "bg-emerald-50/90 text-emerald-700 ring-1 ring-emerald-100",
  amber: "bg-amber-50/90 text-amber-700 ring-1 ring-amber-100",
  red: "bg-red-50/90 text-red-700 ring-1 ring-red-100",
  purple: "bg-violet-50/90 text-violet-700 ring-1 ring-violet-100",
};

interface AppBadgeProps {
  children: React.ReactNode;
  tone?: AppBadgeTone;
  dot?: boolean;
  className?: string;
}

export function AppBadge({
  children,
  tone = "gray",
  dot = false,
  className,
}: AppBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        TONES[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}
