import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import RowDetailsDialog from "@/components/RowDetailsDialog";
import UnifiedHistoryRecordCard from "@/components/UnifiedHistory/UnifiedHistoryRecordCard";
import type { AnyRow, ColumnDef } from "@/components/UnifiedHistory/types";

type Tone = "primary" | "cyan" | "green" | "orange" | "purple" | "pink";

const toneClasses: Record<Tone, { wrap: string; title: string; dot: string }> = {
  primary: {
    wrap: "border-primary/20 bg-primary/5",
    title: "text-primary",
    dot: "bg-primary",
  },
  cyan: {
    wrap: "border-cyan/20 bg-cyan/5",
    title: "text-cyan",
    dot: "bg-cyan",
  },
  green: {
    wrap: "border-green/20 bg-green/5",
    title: "text-green",
    dot: "bg-green",
  },
  orange: {
    wrap: "border-orange/20 bg-orange/5",
    title: "text-orange",
    dot: "bg-orange",
  },
  purple: {
    wrap: "border-purple/20 bg-purple/5",
    title: "text-purple",
    dot: "bg-purple",
  },
  pink: {
    wrap: "border-pink/20 bg-pink/5",
    title: "text-pink",
    dot: "bg-pink",
  },
};

export default function UnifiedHistorySection({
  title,
  tone,
  rows,
  columns,
  emptyMessage = "لا يوجد",
}: {
  title: string;
  tone: Tone;
  rows: AnyRow[];
  columns: ColumnDef[];
  emptyMessage?: string;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<AnyRow | null>(null);
  const t = toneClasses[tone];

  return (
    <section className="space-y-3">
      <div className={`rounded-lg border p-4 ${t.wrap}`}>
        <div className="flex items-center justify-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${t.dot}`} aria-hidden />
          <h3 className={`text-lg font-extrabold text-center ${t.title}`}>{title}</h3>
          <span className="text-sm font-semibold text-muted-foreground">({rows.length})</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="border">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground font-semibold">{emptyMessage}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((r, idx) => (
            <UnifiedHistoryRecordCard
              key={r.id ?? idx}
              row={r}
              columns={columns}
              onOpenDetails={(row) => {
                setDetailsRow(row);
                setDetailsOpen(true);
              }}
            />
          ))}

          <RowDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} row={detailsRow} title="تفاصيل السجل" />
        </div>
      )}
    </section>
  );
}
