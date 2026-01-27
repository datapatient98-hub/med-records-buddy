 import * as React from "react";
 import { Button } from "@/components/ui/button";
 import { Calendar } from "@/components/ui/calendar";
 import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
 import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
 import { Checkbox } from "@/components/ui/checkbox";
 import { Label } from "@/components/ui/label";
 import { CalendarIcon, FileSpreadsheet } from "lucide-react";
 import { format } from "date-fns";
 import { ar } from "date-fns/locale";
 import { cn } from "@/lib/utils";
 import { supabase } from "@/integrations/supabase/client";
 import * as XLSX from "xlsx";
 import { toast } from "sonner";
 
 type DataType = "admissions" | "discharges" | "emergencies" | "endoscopies" | "procedures" | "file_loans";
 
 interface DashboardExportDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export default function DashboardExportDialog({ open, onOpenChange }: DashboardExportDialogProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [selectedTypes, setSelectedTypes] = React.useState<DataType[]>([
     "admissions",
     "discharges",
     "emergencies",
     "endoscopies",
     "procedures",
     "file_loans",
   ]);
  const [isExporting, setIsExporting] = React.useState(false);
 
   const dataTypeLabels: Record<DataType, string> = {
     admissions: "الحجوزات (Admissions)",
     discharges: "الخروج (Discharges)",
     emergencies: "الطوارئ (Emergencies)",
     endoscopies: "المناظير (Endoscopies)",
     procedures: "البذل (Procedures)",
     file_loans: "الاستعارات (File Loans)",
   };
 
   const toggleType = (type: DataType) => {
     setSelectedTypes((prev) =>
       prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
     );
   };
 
   const handleExport = async () => {
     if (!selectedDate) {
       toast.error("الرجاء اختيار التاريخ أولاً");
       return;
     }
     if (selectedTypes.length === 0) {
       toast.error("الرجاء اختيار نوع بيانات واحد على الأقل");
       return;
     }
 
     setIsExporting(true);
     try {
       const targetDate = format(selectedDate, "yyyy-MM-dd");
       const wb = XLSX.utils.book_new();
 
       // Summary stats
       const summary: any = {};
 
       // Fetch each type
       for (const type of selectedTypes) {
         const { data, error } = await supabase
          .from(type)
           .select("*")
           .gte("created_at", `${targetDate}T00:00:00`)
           .lt("created_at", `${targetDate}T23:59:59`);
 
         if (error) throw error;
         summary[type] = data?.length || 0;
 
         if (data && data.length > 0) {
           const ws = XLSX.utils.json_to_sheet(data);
           XLSX.utils.book_append_sheet(wb, ws, dataTypeLabels[type as DataType].split(" ")[0]);
         }
       }
 
       // Add summary sheet first
       const summaryData = [
         ["تقرير لوحة التحكم - ملخص البيانات"],
         [],
         ["التاريخ:", format(selectedDate, "dd MMMM yyyy", { locale: ar })],
         ["تاريخ التصدير:", format(new Date(), "dd MMMM yyyy HH:mm", { locale: ar })],
         [],
         ["نوع البيانات", "العدد"],
       ];
 
       selectedTypes.forEach((type) => {
         summaryData.push([dataTypeLabels[type], summary[type] || 0]);
       });
 
       summaryData.push(
         [],
        ["الإجمالي الكلي:", selectedTypes.reduce((acc, type) => acc + (summary[type] || 0), 0)]
       );
 
       const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
       
       // Set column widths
       wsSummary["!cols"] = [{ wch: 30 }, { wch: 15 }];
       
       // Insert summary sheet at the beginning
       XLSX.utils.book_append_sheet(wb, wsSummary, "الملخص");
 
       // Download
       const fileName = `تقرير_لوحة_التحكم_${format(selectedDate, "yyyy-MM-dd")}.xlsx`;
       XLSX.writeFile(wb, fileName);
 
       toast.success("تم تصدير البيانات بنجاح", {
        description: `تم تصدير ${selectedTypes.reduce((acc, type) => acc + (summary[type] || 0), 0)} سجل`,
       });
       onOpenChange(false);
     } catch (error) {
       console.error("Export error:", error);
       toast.error("فشل التصدير", {
         description: "حدث خطأ أثناء تصدير البيانات. الرجاء المحاولة مرة أخرى.",
       });
     } finally {
       setIsExporting(false);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-[500px]" dir="rtl">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <FileSpreadsheet className="h-5 w-5" />
             تصدير بيانات لوحة التحكم
           </DialogTitle>
           <DialogDescription>
             اختر التاريخ وأنواع البيانات المطلوب تصديرها إلى ملف Excel
           </DialogDescription>
         </DialogHeader>
 
         <div className="space-y-6 py-4">
           {/* Date Picker */}
           <div className="space-y-2">
             <Label>التاريخ المطلوب</Label>
             <Popover>
               <PopoverTrigger asChild>
                 <Button
                   variant="outline"
                   className={cn(
                     "w-full justify-start text-right font-normal",
                     !selectedDate && "text-muted-foreground"
                   )}
                 >
                   <CalendarIcon className="ml-2 h-4 w-4" />
                   {selectedDate ? (
                     format(selectedDate, "dd MMMM yyyy", { locale: ar })
                   ) : (
                     <span>اختر التاريخ</span>
                   )}
                 </Button>
               </PopoverTrigger>
               <PopoverContent className="w-auto p-0" align="start">
                 <Calendar
                   mode="single"
                   selected={selectedDate}
                   onSelect={setSelectedDate}
                   initialFocus
                   className="pointer-events-auto"
                   locale={ar}
                 />
               </PopoverContent>
             </Popover>
           </div>
 
           {/* Data Type Selection */}
           <div className="space-y-3">
             <Label>أنواع البيانات المطلوبة</Label>
             <div className="space-y-2 border rounded-lg p-4 bg-muted/20">
               {(Object.keys(dataTypeLabels) as DataType[]).map((type) => (
                 <div key={type} className="flex items-center space-x-2 space-x-reverse">
                   <Checkbox
                     id={type}
                     checked={selectedTypes.includes(type)}
                     onCheckedChange={() => toggleType(type)}
                   />
                   <Label
                     htmlFor={type}
                     className="text-sm font-normal cursor-pointer flex-1"
                   >
                     {dataTypeLabels[type]}
                   </Label>
                 </div>
               ))}
             </div>
             <p className="text-xs text-muted-foreground">
               اختر نوع بيانات واحد أو أكثر • سيتم إنشاء Sheet منفصل لكل نوع
             </p>
           </div>
         </div>
 
         <DialogFooter className="gap-2">
           <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
             إلغاء
           </Button>
           <Button onClick={handleExport} disabled={isExporting || selectedTypes.length === 0}>
             {isExporting ? "جاري التصدير..." : "تصدير Excel"}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }