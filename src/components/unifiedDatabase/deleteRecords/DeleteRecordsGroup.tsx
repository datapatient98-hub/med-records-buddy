import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { SelectableRecord } from "./types";
import { keyOf } from "./utils";

export function DeleteRecordsGroup({
  title,
  rows,
  selected,
  setSelected,
}: {
  title: string;
  rows: SelectableRecord[];
  selected: Record<string, boolean>;
  setSelected: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  if (!rows.length) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            setSelected((prev) => {
              const next = { ...prev };
              const allSelected = rows.every((r) => !!next[keyOf(r)]);
              for (const r of rows) next[keyOf(r)] = !allSelected;
              return next;
            });
          }}
        >
          تحديد/إلغاء الكل
        </Button>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <label key={keyOf(r)} className="flex items-start gap-3 rounded-md border border-border p-3">
            <Checkbox
              checked={!!selected[keyOf(r)]}
              onCheckedChange={(v) => setSelected((p) => ({ ...p, [keyOf(r)]: !!v }))}
              className="mt-1"
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">
                {r.patient_name || "-"}
                {r.internal_number != null ? <span className="text-muted-foreground"> — داخلي: {r.internal_number}</span> : null}
              </div>
              <div className="text-xs text-muted-foreground font-mono truncate">{r.unified_number || ""}</div>
              <div className="text-xs text-muted-foreground truncate">ID: {r.id}</div>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}
