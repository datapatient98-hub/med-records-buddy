import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
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

type PreviewRow = Record<string, unknown> & { __sourceIndex?: number };

const PreviewTable = React.forwardRef<
  HTMLDivElement,
  { headers: string[]; rows: PreviewRow[]; rowNumberMode?: "preview" | "source" }
>(function PreviewTable({ headers, rows, rowNumberMode = "preview" }, ref) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  const scrollToStart = () => {
    const s = scrollRef.current;
    const b = bottomRef.current;
    if (!s || !b) return;
    s.scrollLeft = 0;
    b.scrollLeft = 0;
  };

  const scrollToEnd = () => {
    const s = scrollRef.current;
    const b = bottomRef.current;
    if (!s || !b) return;
    const end = Math.max((s.scrollWidth ?? 0) - (s.clientWidth ?? 0), 0);
    s.scrollLeft = end;
    b.scrollLeft = end;
  };

  const syncBottom = () => {
    const s = scrollRef.current;
    const b = bottomRef.current;
    if (!s || !b) return;
    b.scrollLeft = s.scrollLeft;
  };

  const syncTop = () => {
    const s = scrollRef.current;
    const b = bottomRef.current;
    if (!s || !b) return;
    s.scrollLeft = b.scrollLeft;
  };

  // Update scroll width whenever content changes (headers/rows) or container resizes.
  useEffect(() => {
    const update = () => setScrollWidth(scrollRef.current?.scrollWidth ?? 0);
    const t = window.setTimeout(update, 0);
    window.addEventListener("resize", update);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", update);
    };
  }, [headers, rows.length]);

  return (
    <div ref={ref} className="rounded-md border">
      {/* Use LTR for predictable horizontal scrollbar behavior, keep cells right-aligned */}
      <div ref={scrollRef} className="h-[55vh] w-full overflow-auto" dir="ltr" onScroll={syncBottom}>
        <div className="min-w-max" dir="ltr">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="whitespace-nowrap text-right">#</TableHead>
                {headers.map((h) => (
                  <TableHead key={h} className="whitespace-nowrap text-right">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 200).map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                    {rowNumberMode === "source" ? Number(r.__sourceIndex ?? idx) + 2 : idx + 1}
                  </TableCell>
                  {headers.map((h) => (
                    <TableCell key={h} className="whitespace-nowrap text-right text-sm">
                      {normalizeCellValue(r[h])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Bottom horizontal scrollbar (synced) */}
      <div className="border-t bg-muted/30 px-3 py-2" dir="ltr">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={scrollToStart}>
            للبداية
          </Button>
          <div
            ref={bottomRef}
            className="h-3 flex-1 overflow-x-auto overflow-y-hidden"
            onScroll={syncTop}
            aria-label="شريط تمرير أفقي"
          >
            <div style={{ width: Math.max(scrollWidth, 1) }} className="h-1" />
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={scrollToEnd}>
            للنهاية
          </Button>
        </div>
      </div>

      <div className="px-3 py-2 text-xs text-muted-foreground" dir="rtl">
        عرض أول {Math.min(200, rows.length)} صف (من {rows.length})
      </div>
    </div>
  );
});

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

      // Tag each row with its original index in the sheet so errors/preview numbers match Excel.
      const taggedRows: PreviewRow[] = parsed.rows.map((r, i) => ({ ...(r as any), __sourceIndex: i }));

      // Rule #1: remove exact (literal) duplicate rows and keep only one copy.
      const { unique, duplicates } = dedupeExactRows(parsed.headers, taggedRows);

      const errors: ExcelImportPreview["errors"] = [];
      const toImport = (unique as PreviewRow[]).filter((row, idx) => {
        const reason = props.validateRow?.(row, idx) ?? null;
        if (reason) {
          // Use original row index from the sheet (0-based), display will add +2 (header row).
          errors.push({ index: Number(row.__sourceIndex ?? idx), reason, row });
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
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">
                  {preview ? (
                    <span>
                      الملف: <span className="font-medium text-foreground">{preview.fileName}</span>
                    </span>
                  ) : (
                    "اختر ملف Excel للمعاينة قبل التأكيد"
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  القاعدة: سيتم استيراد كل الصفوف، مع تجاهل الصفوف المتطابقة حرفياً (سيتم الاحتفاظ بنسخة واحدة فقط).
                </div>
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

            {counts && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Card>
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground">الأعمدة</div>
                    <div className="text-lg font-semibold text-foreground">{counts.columns}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground">سيتم استيرادها</div>
                    <div className="text-lg font-semibold text-foreground">{counts.importRows}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground">مكرر حرفياً</div>
                    <div className="text-lg font-semibold text-foreground">{counts.duplicateRows}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground">أخطاء</div>
                    <div className="text-lg font-semibold text-foreground">{counts.errorRows}</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {preview && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="import">صفوف سيتم استيرادها</TabsTrigger>
                <TabsTrigger value="duplicates">صفوف متطابقة (تم تجاهلها)</TabsTrigger>
                <TabsTrigger value="errors">صفوف بها أخطاء</TabsTrigger>
              </TabsList>

              <TabsContent value="import" className="mt-4">
                <PreviewTable headers={preview.headers} rows={preview.toImport as any} rowNumberMode="source" />
              </TabsContent>

              <TabsContent value="duplicates" className="mt-4">
                <PreviewTable
                  headers={preview.headers}
                  rows={preview.duplicates.map((d) => ({ ...(d.row as any), __sourceIndex: d.duplicateIndex })) as any}
                  rowNumberMode="source"
                />
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
