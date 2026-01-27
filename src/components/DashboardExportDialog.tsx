 import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CalendarIcon, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildDashboardExportWorkbook, type DashboardExportType } from "@/lib/excel/exportDashboardExcel";
 
type DataType = DashboardExportType;
 
 interface DashboardExportDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export default function DashboardExportDialog({ open, onOpenChange }: DashboardExportDialogProps) {
 const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
 const [selectedTypes, setSelectedTypes] = React.useState<DataType[]>([
   "discharges",
   "emergencies",
   "endoscopies",
   "procedures",
 ]);
  const [isExporting, setIsExporting] = React.useState(false);
 
   const dataTypeLabels: Record<DataType, string> = {
      discharges: "الخروج",
      emergencies: "الطوارئ",
      endoscopies: "المناظير",
      procedures: "البذل",
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
        const startIso = `${targetDate}T00:00:00`;
        const endIso = `${targetDate}T23:59:59.999`;

        // Lookups for nicer Arabic exports
        const [deps, docs, diags, govs, dists, stations, occs, hosps] = await Promise.all([
          supabase.from("departments").select("id,name"),
          supabase.from("doctors").select("id,name"),
          supabase.from("diagnoses").select("id,name"),
          supabase.from("governorates").select("id,name"),
          supabase.from("districts").select("id,name"),
          supabase.from("stations").select("id,name"),
          supabase.from("occupations").select("id,name"),
          supabase.from("hospitals").select("id,name"),
        ]);

        const lookups = {
          departments: Object.fromEntries((deps.data || []).map((r) => [r.id, r.name])),
          doctors: Object.fromEntries((docs.data || []).map((r) => [r.id, r.name])),
          diagnoses: Object.fromEntries((diags.data || []).map((r) => [r.id, r.name])),
          governorates: Object.fromEntries((govs.data || []).map((r) => [r.id, r.name])),
          districts: Object.fromEntries((dists.data || []).map((r) => [r.id, r.name])),
          stations: Object.fromEntries((stations.data || []).map((r) => [r.id, r.name])),
          occupations: Object.fromEntries((occs.data || []).map((r) => [r.id, r.name])),
          hospitals: Object.fromEntries((hosps.data || []).map((r) => [r.id, r.name])),
        };

        // Fetch per type (created_at = “وقت التسجيل” وهو الأنسب لعبارة: اللي اتسجل في اليوم)
        const dataByType: Record<DataType, any[]> = {
          discharges: [],
          emergencies: [],
          endoscopies: [],
          procedures: [],
        };

        for (const type of selectedTypes) {
          const { data, error } = await supabase
            .from(type)
            .select("*")
            .gte("created_at", startIso)
            .lte("created_at", endIso);
          if (error) throw error;
          dataByType[type] = data || [];
        }

        const { wb, totalAll } = buildDashboardExportWorkbook({
          selectedDate,
          exportAt: new Date(),
          selectedTypes,
          dataByType,
          lookups,
        });

        const fileName = `تقرير_لوحة_التحكم_${format(selectedDate, "yyyy-MM-dd")}.xlsx`;
        const XLSX = await import("xlsx");
        XLSX.writeFile(wb, fileName);

        toast.success("تم تصدير البيانات بنجاح", {
          description: `تم تصدير ${totalAll} سجل`,
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
                    className={cn("p-3 pointer-events-auto")}
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
                سيتم تصدير كل ما تم تسجيله في اليوم المختار • Sheet ملخص + Sheets تفصيلية
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