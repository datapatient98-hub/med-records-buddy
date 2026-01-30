import * as React from "react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type ArtifactRow = {
  id: string;
  created_at: string;
  artifact_type: string;
  bytes: number | null;
  storage_bucket: string | null;
  storage_path: string | null;
  run_id: string;
};

function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function BackupArtifactsPanel() {
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<ArtifactRow[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("backup_artifacts")
        .select("id, created_at, artifact_type, bytes, storage_bucket, storage_path, run_id")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setRows((data ?? []) as unknown as ArtifactRow[]);
    } catch (err: any) {
      toast.error(err?.message ?? "تعذر تحميل ملفات النسخ");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const download = async (a: ArtifactRow) => {
    if (!a.storage_bucket || !a.storage_path) {
      toast.error("لا يوجد مسار تخزين لهذا الملف");
      return;
    }
    try {
      const { data, error } = await supabase.storage.from(a.storage_bucket).createSignedUrl(a.storage_path, 60);
      if (error) throw error;
      const url = data?.signedUrl;
      if (!url) throw new Error("تعذر إنشاء رابط تحميل");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(err?.message ?? "تعذر تحميل الملف");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>تحميل النسخ من داخل التطبيق</CardTitle>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? "جاري..." : "تحديث"}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-hidden rounded-b-lg border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">الحجم</TableHead>
                <TableHead className="text-right">المسار</TableHead>
                <TableHead className="text-right">تحميل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{new Date(r.created_at).toLocaleString("ar-EG")}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant="secondary">{r.artifact_type}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatBytes(r.bytes)}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[320px] truncate">{r.storage_path ?? "-"}</TableCell>
                  <TableCell>
                    <Button type="button" size="sm" variant="outline" onClick={() => void download(r)}>
                      تحميل
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    لا توجد ملفات نسخ مسجلة بعد.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
