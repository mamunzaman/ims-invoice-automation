import { cn } from "@/lib/cn";

export interface AppTableColumn<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  hideBelow?: "sm" | "md" | "lg";
}

interface AppTableProps<T> {
  columns: AppTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  className?: string;
}

const HIDE_BELOW: Record<NonNullable<AppTableColumn<unknown>["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

const ALIGN: Record<NonNullable<AppTableColumn<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function AppTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
  className,
}: AppTableProps<T>) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100/80 text-left text-slate-500">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-6 py-3.5 text-xs font-semibold uppercase tracking-wide",
                  col.align && ALIGN[col.align],
                  col.hideBelow && HIDE_BELOW[col.hideBelow]
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-b border-slate-50 last:border-0 transition-colors",
                onRowClick && "hover:bg-slate-50/70 cursor-pointer"
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-6 py-3.5 text-slate-700",
                    col.align && ALIGN[col.align],
                    col.hideBelow && HIDE_BELOW[col.hideBelow],
                    col.className
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
