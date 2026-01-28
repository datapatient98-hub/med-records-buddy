import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { downloadDeletionAuditExcel } from "@/lib/excel/exportDeletionAuditExcel";

type DeletionAuditRow = {
  deleted_at: string;
  deleted_by: string | null;
  reason: string;
  unified_number: string | null;
  patient_name: string | null;
  internal_number: number | null;
  table_name: string;
  record_id: string | null;
  record_snapshot: unknown;
};

type Filters = {
  from: string; // yyyy-mm-dd
  to: string; // yyyy-mm-dd
  unified: string;
  actor: string;
  table: string;
};

function toIsoStartOfDay(dateYmd: string) {
  return new Date(`${dateYmd}T00:00:00`).toISOString();
}

function toIsoStartOfNextDay(dateYmd: string) {
  const d = new Date(`${dateYmd}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

export function DeletionAuditTab() {
  const [filters, setFilters] = React.useState<Filters>({
    from: "",
    to: "",
    unified: "",
    actor: "",
    table: "",
  });

  const query = useQuery({
    queryKey: ["deletion_audit", filters],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from("deletion_audit")
        .select(
          "deleted_at, deleted_by, reason, unified_number, patient_name, internal_number, table_name, record_id, record_snapshot",
        )
        .order("deleted_at", { ascending: false })
        .limit(500);

      if (filters.from) q = q.gte("deleted_at", toIsoStartOfDay(filters.from));
      if (filters.to) q = q.lt("deleted_at", toIsoStartOfNextDay(filters.to));
      if (filters.unified.trim()) q = q.ilike("unified_number", `%${filters.unified.trim()}%`);
      if (filters.actor.trim()) q = q.ilike("deleted_by", `%${filters.actor.trim()}%`);
      if (filters.table.trim()) q = q.eq("table_name", filters.table.trim());

      const { data, error } = (await q) as { data: DeletionAuditRow[] | null; error: any };
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = query.data ?? [];

  const exportExcel = () => {
    downloadDeletionAuditExcel({
      fileName: `deletion_audit_${filters.from || "all"}_${filters.to || "all"}.xlsx`,
      rows,
      exportedAt: new Date(),
    });
  };

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="border">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <div className="text-sm font-bold">سجل المحذوفات</div>
              <div className="text-xs text-muted-foreground">يعرض آخر 500 عملية (مع الفلترة)</div>
            </div>
            <Button type="button" variant="secondary" onClick={exportExcel} disabled={!rows.length}>
              تصدير Excel
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">من تاريخ</Label>
              <Input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
              <Input type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">الرقم الموحد</Label>
              <Input
                value={filters.unified}
                onChange={(e) => setFilters((p) => ({ ...p, unified: e.target.value }))}
                placeholder="بحث بالرقم الموحد"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">اسم المنفّذ</Label>
              <Input
                value={filters.actor}
                onChange={(e) => setFilters((p) => ({ ...p, actor: e.target.value }))}
                placeholder="مثال: د/أحمد"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">الجدول</Label>
              <Input
                value={filters.table}
                onChange={(e) => setFilters((p) => ({ ...p, table: e.target.value }))}
                placeholder="مثال: admissions"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              النتائج: <span className="font-semibold text-foreground">{rows.length}</span>
              {query.isFetching ? <span className="text-muted-foreground"> — جاري التحميل...</span> : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setFilters({
                  from: "",
                  to: "",
                  unified: "",
                  actor: "",
                  table: "",
                })
              }
            >
              مسح الفلاتر
            </Button>
          </div>

          <Separator />

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 pr-1">
              {!rows.length ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  {query.isFetching ? "جاري التحميل..." : "لا يوجد نتائج."}
                </div>
              ) : (
                rows.map((r) => (
                  <div key={r.deleted_at + (r.record_id ?? "")} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-foreground">
                        {r.patient_name || "-"}
                        {r.internal_number != null ? (
                          <span className="text-muted-foreground"> — داخلي: {r.internal_number}</span>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">{new Date(r.deleted_at).toLocaleString()}</div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      الرقم الموحد: <span className="font-mono text-foreground">{r.unified_number ?? ""}</span>
                      <span className="text-muted-foreground"> • </span>
                      الجدول: <span className="font-mono text-foreground">{r.table_name}</span>
                      <span className="text-muted-foreground"> • </span>
                      المنفّذ: <span className="text-foreground">{r.deleted_by || "-"}</span>
                    </div>
                    <div className="mt-1 text-xs">
                      <span className="text-muted-foreground">السبب: </span>
                      <span className="text-foreground">{r.reason}</span>
                    </div>
                    {r.record_id ? <div className="mt-1 text-[11px] text-muted-foreground font-mono">ID: {r.record_id}</div> : null}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
