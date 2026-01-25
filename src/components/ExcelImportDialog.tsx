 import * as React from "react";
 import { useMemo, useRef, useState } from "react";
 import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
 import { FileUp, ArrowRight, CheckCircle } from "lucide-react";
 import { parseFirstSheet } from "@/lib/excel/parseWorkbook";
 import { dedupeExactRows } from "@/lib/excel/exactDedupe";
 import ImportWizardStep from "@/components/ImportWizard/ImportWizardStep";
 import ImportKPICards from "@/components/ImportWizard/ImportKPICards";
 import ImportPreviewTable from "@/components/ImportWizard/ImportPreviewTable";
 import { Separator } from "@/components/ui/separator";
 
 export type ExcelImportPreview = {
   headers: string[];
   toImport: Record<string, unknown>[];
   duplicates: { row: Record<string, unknown>; firstIndex: number; duplicateIndex: number }[];
   errors: { index: number; reason: string; row: Record<string, unknown> }[];
   fileName: string;
 };
 
 type PreviewRow = Record<string, unknown> & { __sourceIndex?: number };
 
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
   const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
   const [errorMessage, setErrorMessage] = useState<string | null>(null);
 
   const counts = useMemo(() => {
     if (!preview) return null;
     return {
       totalRows: preview.toImport.length + preview.duplicates.length + preview.errors.length,
       importRows: preview.toImport.length,
       duplicateRows: preview.duplicates.length,
       errorRows: preview.errors.length,
     };
   }, [preview]);
 
   const reset = () => {
     setPreview(null);
     setCurrentStep(1);
     setErrorMessage(null);
     if (fileInputRef.current) fileInputRef.current.value = "";
   };
 
   const handlePick = () => fileInputRef.current?.click();
 
   const handleFile = async (file: File) => {
     setLoading(true);
     setErrorMessage(null);
     try {
       const parsed = await parseFirstSheet(file);
       const taggedRows: PreviewRow[] = parsed.rows.map((r, i) => ({ ...(r as any), __sourceIndex: i }));
       const { unique, duplicates } = dedupeExactRows(parsed.headers, taggedRows);
 
       const errors: ExcelImportPreview["errors"] = [];
       const toImport = (unique as PreviewRow[]).filter((row, idx) => {
         const reason = props.validateRow?.(row, idx) ?? null;
         if (reason) {
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
       setCurrentStep(2);
     } catch (e: any) {
       console.error("Excel import parse failed:", e);
       setPreview(null);
       setCurrentStep(1);
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
       <DialogContent className="max-w-7xl" dir="rtl">
         <DialogHeader>
           <DialogTitle className="text-2xl">{props.title ?? "استيراد من Excel"}</DialogTitle>
         </DialogHeader>
 
         <div className="grid grid-cols-3 gap-4 py-4">
           <ImportWizardStep number={1} title="رفع الملف" status={currentStep === 1 ? "active" : currentStep > 1 ? "completed" : "pending"} />
           <ImportWizardStep number={2} title="مراجعة البيانات" status={currentStep === 2 ? "active" : currentStep > 2 ? "completed" : "pending"} />
           <ImportWizardStep number={3} title="تأكيد الاستيراد" status={currentStep === 3 ? "active" : "pending"} />
         </div>
 
         <Separator />
 
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
 
         {currentStep === 1 && (
           <div className="space-y-4">
             <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
               <FileUp className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
               <h3 className="mb-2 text-lg font-semibold">اختر ملف Excel للاستيراد</h3>
               <p className="mb-4 text-sm text-muted-foreground">
                 سيتم استيراد كل الصفوف ماعدا المكرر حرفياً (يُحتفظ بنسخة واحدة فقط)
               </p>
               <Button type="button" onClick={handlePick} disabled={loading} size="lg">
                 <FileUp className="ml-2 h-5 w-5" />
                 {loading ? "جاري القراءة..." : "اختيار ملف"}
               </Button>
             </div>
           </div>
         )}
 
         {currentStep === 2 && preview && counts && (
           <div className="space-y-4">
             <div className="rounded-lg border bg-card p-4">
               <div className="mb-3 flex items-center justify-between">
                 <div>
                   <p className="text-sm text-muted-foreground">
                     الملف: <span className="font-medium text-foreground">{preview.fileName}</span>
                   </p>
                   <p className="text-xs text-muted-foreground">عدد الأعمدة: {preview.headers.length}</p>
                 </div>
                 <Button type="button" variant="outline" onClick={reset} size="sm">
                   تغيير الملف
                 </Button>
               </div>
 
               <ImportKPICards
                 totalRows={counts.totalRows}
                 importRows={counts.importRows}
                 duplicateRows={counts.duplicateRows}
                 errorRows={counts.errorRows}
               />
             </div>
 
             <div className="space-y-3">
               <h3 className="text-lg font-semibold">الصفوف التي سيتم استيرادها ({counts.importRows})</h3>
               <ImportPreviewTable
                 headers={preview.headers}
                 rows={preview.toImport as any}
                 rowNumberMode="source"
                 searchable
               />
             </div>
 
             {preview.duplicates.length > 0 && (
               <div className="space-y-3">
                 <h3 className="text-lg font-semibold text-orange">
                   صفوف متطابقة حرفياً (تم تجاهلها) ({preview.duplicates.length})
                 </h3>
                 <ImportPreviewTable
                   headers={preview.headers}
                   rows={preview.duplicates.map((d) => ({ ...(d.row as any), __sourceIndex: d.duplicateIndex })) as any}
                   rowNumberMode="source"
                 />
               </div>
             )}
 
             {preview.errors.length > 0 && (
               <div className="space-y-3">
                 <h3 className="text-lg font-semibold text-pink">
                   صفوف بها أخطاء (سيتم استبعادها) ({preview.errors.length})
                 </h3>
                 <div className="rounded-lg border bg-muted/30 p-4 max-h-[300px] overflow-y-auto">
                   {preview.errors.slice(0, 50).map((e, idx) => (
                     <div key={idx} className="mb-2 text-sm">
                       <span className="font-medium text-destructive">الصف #{e.index + 2}:</span> {e.reason}
                     </div>
                   ))}
                   {preview.errors.length > 50 && (
                     <p className="mt-2 text-xs text-muted-foreground">
                       ...و {preview.errors.length - 50} خطأ إضافي
                     </p>
                   )}
                 </div>
               </div>
             )}
           </div>
         )}
 
         {currentStep === 3 && preview && (
           <div className="space-y-4 py-8 text-center">
             <CheckCircle className="mx-auto h-20 w-20 text-green" />
             <h3 className="text-2xl font-bold text-green">جاهز للاستيراد!</h3>
             <p className="text-lg text-muted-foreground">
               سيتم استيراد <span className="font-bold text-foreground">{preview.toImport.length}</span> صف إلى قاعدة البيانات.
             </p>
           </div>
         )}
 
         <DialogFooter className="gap-2 sm:gap-2">
           <Button
             type="button"
             variant="outline"
             onClick={() => {
               if (currentStep === 2) setCurrentStep(1);
               else if (currentStep === 3) setCurrentStep(2);
               else props.onOpenChange(false);
             }}
           >
             {currentStep === 1 ? "إلغاء" : "رجوع"}
           </Button>
           {currentStep === 2 && (
             <Button type="button" onClick={() => setCurrentStep(3)}>
               <ArrowRight className="ml-2 h-4 w-4" />
               التالي
             </Button>
           )}
           {currentStep === 3 && (
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
           )}
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }