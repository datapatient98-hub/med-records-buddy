import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fmtDate, renderValue } from "@/components/UnifiedHistory/format";
import type { AnyRow, ColumnDef } from "@/components/UnifiedHistory/types";

export default function UnifiedHistoryRecordCard({
  row,
  columns,
  onOpenDetails,
}: {
  row: AnyRow;
  columns: ColumnDef[];
  onOpenDetails: (row: AnyRow) => void;
}) {
  return (
    <Card className="border bg-card">
      <CardContent className="p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {columns.map((c) => {
            const value = c.isDate ? fmtDate(row[c.key]) : renderValue(row[c.key]);
            return (
              <div key={c.key} className="rounded-md bg-muted/20 p-3">
                <div className="text-xs font-bold text-muted-foreground text-center">{c.label}</div>
                <div className="mt-1 text-sm font-semibold text-foreground text-center break-words">
                  {value}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-center">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenDetails(row)}>
            عرض التفاصيل
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
