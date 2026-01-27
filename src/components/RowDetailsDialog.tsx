import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AnyRow = Record<string, any>;

function defaultFormatValue(key: string, value: any) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "نعم" : "لا";

  const k = (key ?? "").toLowerCase();
  if (k.includes("date") || k.includes("_at")) {
    try {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString("ar-EG");
      }
    } catch {
      // ignore
    }
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

export default function RowDetailsDialog({
  open,
  onOpenChange,
  row,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: AnyRow | null;
  title: string;
  description?: string;
}) {
  const entries = useMemo(() => {
    const r = row ?? {};
    return Object.keys(r)
      .sort()
      .map((k) => [k, (r as any)[k]] as const);
  }, [row]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description ?? "تفاصيل كاملة لكل الحقول."}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-auto rounded-lg border bg-card p-3">
          <div className="grid gap-2 md:grid-cols-2">
            {entries.map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-3 rounded-md bg-secondary/30 px-3 py-2">
                <div className="text-sm text-muted-foreground break-all">{k}</div>
                <div className="text-sm font-medium text-foreground break-all text-right">
                  {defaultFormatValue(k, v)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
