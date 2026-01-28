import * as React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type DashboardAlertSeverity = "info" | "warn" | "error";

export type DashboardAlertItem = {
  id: string;
  title: string;
  description: string;
  severity: DashboardAlertSeverity;
};

function severityToVariant(severity: DashboardAlertSeverity) {
  if (severity === "error") return "destructive" as const;
  return "default" as const;
}

export default function DashboardAlertBar({
  items,
}: {
  items: DashboardAlertItem[];
}) {
  const visible = items.filter((i) => i.description?.trim());
  if (!visible.length) return null;

  return (
    <section aria-label="تنبيهات لوحة التحكم" className="space-y-2">
      {visible.map((item) => (
        <Alert
          key={item.id}
          variant={severityToVariant(item.severity)}
          className={
            item.severity === "warn"
              ? "border border-border bg-muted text-foreground"
              : undefined
          }
        >
          <AlertTitle className="text-sm">{item.title}</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            {item.description}
          </AlertDescription>
        </Alert>
      ))}
    </section>
  );
}
