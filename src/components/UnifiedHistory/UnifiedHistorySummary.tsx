import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnifiedHistorySummary({
  unifiedNumber,
  totalRecords,
}: {
  unifiedNumber: string;
  totalRecords: number;
}) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-center text-xl">ملخص السجل</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border bg-card p-4 text-center">
            <div className="text-sm font-semibold text-muted-foreground">الرقم الموحد</div>
            <div className="mt-1 text-lg font-extrabold text-foreground">{unifiedNumber || "-"}</div>
          </div>
          <div className="rounded-md border bg-card p-4 text-center">
            <div className="text-sm font-semibold text-muted-foreground">إجمالي السجلات</div>
            <div className="mt-1 text-lg font-extrabold text-foreground">{totalRecords}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
