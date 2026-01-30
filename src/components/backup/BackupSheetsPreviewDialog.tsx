import * as React from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type PreviewPayload = {
  range?: string;
  rows?: unknown[][];
  ok?: boolean;
};

export default function BackupSheetsPreviewDialog({ open, onOpenChange }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [preview, setPreview] = React.useState<PreviewPayload | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setPreview(null);
    try {
      // Reuse the connection-test function because it already has auth + service-account access.
      const { data, error } = await supabase.functions.invoke("backup-connection-test");
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const p = (data as any)?.sheets?.preview as PreviewPayload | null | undefined;
      if (!p) throw new Error("لم يتم استلام بيانات الشيت");
      setPreview(p);
    } catch (err: any) {
      toast.error(err?.message ?? "تعذر تحميل سجل الشيت");
      setPreview({ ok: false, range: "Backups!A1:G50", rows: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const rows = (preview?.rows ?? []) as unknown[][];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>سجل Google Sheet داخل التطبيق</DialogTitle>
          <DialogDescription>
            ده عرض مباشر لآخر الصفوف من الشيت باستخدام الحساب الخدمي — مناسب لو google.com محجوب عندك.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground font-mono">range: {preview?.range ?? "-"}</div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? "جاري..." : "تحديث"}
          </Button>
        </div>

        <div className="border rounded-lg overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-muted z-10">
              <TableRow>
                <TableHead className="text-right">الوقت</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">run_id</TableHead>
                <TableHead className="text-right">الملف</TableHead>
                <TableHead className="text-right">الحجم</TableHead>
                <TableHead className="text-right">drive_file_id</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(1).map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell className="whitespace-nowrap">{String(r?.[0] ?? "-")}</TableCell>
                  <TableCell className="whitespace-nowrap">{String(r?.[1] ?? "-")}</TableCell>
                  <TableCell className="font-mono text-xs">{String(r?.[2] ?? "-")}</TableCell>
                  <TableCell className="font-mono text-xs">{String(r?.[3] ?? "-")}</TableCell>
                  <TableCell className="whitespace-nowrap">{String(r?.[4] ?? "-")}</TableCell>
                  <TableCell className="font-mono text-xs">{String(r?.[5] ?? "-")}</TableCell>
                </TableRow>
              ))}
              {rows.length <= 1 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {loading ? "جاري التحميل..." : "لا توجد بيانات في النطاق المعروض."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
