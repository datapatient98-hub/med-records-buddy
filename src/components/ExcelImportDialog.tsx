import { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileUp } from "lucide-react";
import { parseFirstSheet } from "@/lib/excel/parseWorkbook";
import { dedupeExactRows } from "@/lib/excel/exactDedupe";
import { normalizeCellValue } from "@/lib/excel/normalizeArabic";

export type ExcelImportPreview = {
  headers: string[];
  toImport: Record<string, unknown>[];
  duplicates: { row: Record<string, unknown>; firstIndex: number; duplicateIndex: number }[];
  errors: { index: number; reason: string; row: Record<string, unknown> }[];
  fileName: string;
};

function PreviewTable({ headers, rows }: { headers: string[]; rows: Record<string, unknown>[] }) {
  const shownHeaders = headers.slice(0, 30); // safety for very wide sheets

  return (
    <div className="rounded-md border">
      <div className="h-[50vh] w-full overflow-auto">
        <div className="min-w-[900px]">
          <Table>
            <TableHeader>
              <TableRow>
                {shownHeaders.map((h) => (
                  <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 200).map((r, idx) => (
                <TableRow key={idx}>
                  {shownHeaders.map((h) => (
                    <TableCell key={h} className="whitespace-nowrap">
                      {normalizeCellValue(r[h])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="px-3 py-2 text-xs text-muted-foreground" dir="rtl">
        عرض أول {Math.min(200, rows.length)} صف (من {rows.length})
      </div>
    </div>
  );
}

export default function ExcelImportDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  validateRow?: (row: Record<string, unknown>, index: number) => string | null;
  onConfirm: (preview: ExcelImportPreview) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ExcelImportPreview | null>(null);
  const [activeTab, setActiveTab] = useState<"import" | "duplicates" | "errors">("import");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const counts = useMemo(() => {
    if (!preview) return null;
    return {
      columns: preview.headers.length,
      importRows: preview.toImport.length,
      duplicateRows: preview.duplicates.length,
      errorRows: preview.errors.length,
    };
  }, [preview]);

  const reset = () => {
    setPreview(null);
    setActiveTab("import");
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePick = () => fileInputRef.current?.click();

  const handleFile = async (file: File) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const parsed = await parseFirstSheet(file);
      const { unique, duplicates } = dedupeExactRows(parsed.headers, parsed.rows);

      const errors: ExcelImportPreview["errors"] = [];
      const toImport = unique.filter((row, idx) => {
        const reason = props.validateRow?.(row, idx) ?? null;
        if (reason) {
          errors.push({ index: idx, reason, row });
          return false;
        }
        return true;
      });

      setPreview({
        headers: parsed.headers,
        toImport,
        duplicates,
        errors,
        fileName: file.name,
      });
    } catch (e: any) {
      console.error("Excel import parse failed:", e);
      setPreview(null);
      setActiveTab("import");
      setErrorMessage(
        "تعذر قراءة ملف Excel. تأكد أن الملف .xlsx أو .xls وغير محمي بكلمة مرور، وأن أول صف يحتوي على عناوين الأعمدة."
      );
    } finally {
      setLoading(false);
    }
  };

  const canConfirm = !!preview && preview.toImport.length > 0 && !loading;

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open) reset();
        props.onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-6xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>{props.title ?? "استيراد من Excel"}</DialogTitle>
        </DialogHeader>

        {errorMessage && (
          <Alert>
            <AlertTitle>فشل الاستيراد</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {preview ? (
                <div className="flex flex-wrap gap-3">
                  <span>الملف: <span className="font-medium text-foreground">{preview.fileName}</span></span>
                  {counts && (
                    <>
                      <span>عدد الأعمدة: <span className="font-medium text-foreground">{counts.columns}</span></span>
                      <span>صفوف للاستيراد: <span className="font-medium text-foreground">{counts.importRows}</span></span>
                      <span>مكرر (متطابق): <span className="font-medium text-foreground">{counts.duplicateRows}</span></span>
                      <span>أخطاء: <span className="font-medium text-foreground">{counts.errorRows}</span></span>
                    </>
                  )}
                </div>
              ) : (
                "اختر ملف Excel للمعاينة قبل التأكيد"
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={handlePick} disabled={loading}>
                <FileUp className="ml-2 h-4 w-4" />
                {loading ? "جاري القراءة..." : "اختيار ملف"}
              </Button>
              {preview && (
                <Button type="button" variant="ghost" onClick={reset} disabled={loading}>
                  تغيير الملف
                </Button>
              )}
            </div>
          </div>

          {preview && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="import">صفوف سيتم استيرادها</TabsTrigger>
                <TabsTrigger value="duplicates">صفوف متطابقة (تم تجاهلها)</TabsTrigger>
                <TabsTrigger value="errors">صفوف بها أخطاء</TabsTrigger>
              </TabsList>

              <TabsContent value="import" className="mt-4">
                <PreviewTable headers={preview.headers} rows={preview.toImport} />
              </TabsContent>

              <TabsContent value="duplicates" className="mt-4">
                <PreviewTable headers={preview.headers} rows={preview.duplicates.map((d) => d.row)} />
              </TabsContent>

              <TabsContent value="errors" className="mt-4">
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    سيتم استبعاد هذه الصفوف من الاستيراد.
                  </div>
                  <div className="rounded-md border">
                    <ScrollArea className="h-[45vh]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>السبب</TableHead>
                            <TableHead>الصف</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.errors.slice(0, 200).map((e, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-destructive">{e.reason}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">#{e.index + 2}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
            إغلاق
          </Button>
          <Button
            type="button"
            disabled={!canConfirm}
            onClick={async () => {
              if (!preview) return;
              setLoading(true);
              setErrorMessage(null);
              try {
                await props.onConfirm(preview);
                props.onOpenChange(false);
              } catch (e: any) {
                console.error("Excel import confirm failed:", e);
                const msg =
                  (typeof e?.message === "string" && e.message) ||
                  "حدث خطأ أثناء الاستيراد. راجع البيانات وحاول مرة أخرى.";
                setErrorMessage(msg);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "جاري الاستيراد..." : "تأكيد الاستيراد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
