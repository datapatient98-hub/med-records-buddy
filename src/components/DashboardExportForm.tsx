import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CalendarIcon, FileDown } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildDashboardExportWorkbook, type DashboardExportType } from "@/lib/excel/exportDashboardExcel";

type DataType = DashboardExportType;

const DEFAULT_TYPES: DataType[] = ["discharges", "emergencies", "endoscopies", "procedures"];

const LABELS: Record<DataType, string> = {
  discharges: "الخروج",
  emergencies: "الطوارئ",
  endoscopies: "المناظير",
  procedures: "البذل",
};

type ExportMode = "day" | "range";

function toIsoDayStart(d: Date) {
  return `${format(d, "yyyy-MM-dd")}T00:00:00`;
}

function toIsoDayEnd(d: Date) {
  return `${format(d, "yyyy-MM-dd")}T23:59:59.999`;
}

const DATE_COLUMN_BY_TYPE: Record<DataType, string> = {
  discharges: "discharge_date",
  emergencies: "visit_date",
  endoscopies: "procedure_date",
  procedures: "procedure_date",
};

export default function DashboardExportForm(props: {
  defaultDate?: Date;
  defaultTypes?: DataType[];
  onExportSuccess?: () => void;
  compact?: boolean;
}) {
  const { defaultDate = new Date(), defaultTypes = DEFAULT_TYPES, onExportSuccess, compact } = props;

  const [mode, setMode] = React.useState<ExportMode>("day");
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(defaultDate);
  const [rangeFrom, setRangeFrom] = React.useState<Date | undefined>(defaultDate);
  const [rangeTo, setRangeTo] = React.useState<Date | undefined>(defaultDate);
  const [selectedTypes, setSelectedTypes] = React.useState<DataType[]>(defaultTypes);
  const [isExporting, setIsExporting] = React.useState(false);

  const toggleType = (type: DataType) => {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const handleExport = async () => {
    if (mode === "day" && !selectedDate) {
      toast.error("الرجاء اختيار التاريخ أولاً");
      return;
    }
    if (mode === "range") {
      if (!rangeFrom || !rangeTo) {
        toast.error("الرجاء اختيار تاريخ (من) و(إلى)");
        return;
      }
      if (rangeFrom.getTime() > rangeTo.getTime()) {
        toast.error("تاريخ (من) يجب أن يكون قبل أو يساوي (إلى)");
        return;
      }
    }
    if (selectedTypes.length === 0) {
      toast.error("الرجاء اختيار نوع بيانات واحد على الأقل");
      return;
    }

    setIsExporting(true);
    try {
      const exportRange =
        mode === "day"
          ? {
              startDate: selectedDate as Date,
              endDate: selectedDate as Date,
            }
          : {
              startDate: rangeFrom as Date,
              endDate: rangeTo as Date,
            };

      const startIso = toIsoDayStart(exportRange.startDate);
      const endIso = toIsoDayEnd(exportRange.endDate);

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

      const dataByType: Record<DataType, any[]> = {
        discharges: [],
        emergencies: [],
        endoscopies: [],
        procedures: [],
      };

      for (const type of selectedTypes) {
        const dateColumn = mode === "day" ? "created_at" : DATE_COLUMN_BY_TYPE[type];
        const { data, error } = await supabase
          .from(type)
          .select("*")
          .gte(dateColumn, startIso)
          .lte(dateColumn, endIso);
        if (error) throw error;
        dataByType[type] = data || [];
      }

      const { wb, totalAll } = buildDashboardExportWorkbook({
        selectedDate: exportRange.startDate,
        exportAt: new Date(),
        selectedTypes,
        dataByType,
        lookups,
        range:
          mode === "range"
            ? {
                from: exportRange.startDate,
                to: exportRange.endDate,
                // UI label (Arabic) to show in summary.
                modeLabel: "حسب تاريخ الحدث",
              }
            : undefined,
      });

      const labelPart =
        mode === "day"
          ? format(exportRange.startDate, "yyyy-MM-dd")
          : `${format(exportRange.startDate, "yyyy-MM-dd")}_الى_${format(exportRange.endDate, "yyyy-MM-dd")}`;

      const fileName = `تقرير_لوحة_التحكم_${labelPart}.xlsx`;
      const XLSX = await import("xlsx");
      XLSX.writeFile(wb, fileName);

      toast.success("تم تصدير البيانات بنجاح", { description: `تم تصدير ${totalAll} سجل` });
      onExportSuccess?.();
    } catch (error) {
      console.error("Export error:", error);
      toast.error("فشل التصدير", { description: "حدث خطأ أثناء تصدير البيانات. الرجاء المحاولة مرة أخرى." });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={cn("w-full", compact ? "space-y-3" : "space-y-4")}> 
      <Tabs value={mode} onValueChange={(v) => setMode(v as ExportMode)} dir="rtl" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="day">اليوم المطلوب</TabsTrigger>
          <TabsTrigger value="range">من ... إلى</TabsTrigger>
        </TabsList>

        <TabsContent value="day" className={cn(compact ? "pt-3" : "pt-4")}>
      <div className={cn("grid gap-4", "grid-cols-1 md:grid-cols-12")}> 
        {/* Date */}
        <div className={cn("md:col-span-4", compact && "md:col-span-4")}> 
          <Label className="mb-2 block">اليوم المطلوب</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-right font-normal",
                  !selectedDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="ml-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "dd MMMM yyyy", { locale: ar }) : <span>اختر التاريخ</span>}
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

        {/* Types */}
        <div className="md:col-span-6">
          <Label className="mb-2 block">أنواع البيانات</Label>
          <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/20 p-3">
            {(Object.keys(LABELS) as DataType[]).map((type) => (
              <div key={type} className="flex items-center gap-2">
                <Checkbox id={`export-${type}`} checked={selectedTypes.includes(type)} onCheckedChange={() => toggleType(type)} />
                <Label htmlFor={`export-${type}`} className="text-sm font-normal cursor-pointer">
                  {LABELS[type]}
                </Label>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            سيتم تصدير كل ما تم تسجيله في اليوم المختار (وقت التسجيل created_at) • Sheet ملخص + Sheets تفصيلية
          </p>
        </div>

        {/* Button */}
        <div className="md:col-span-2 flex items-end">
          <Button onClick={handleExport} disabled={isExporting || selectedTypes.length === 0} className="w-full">
            <FileDown className="ml-2 h-4 w-4" />
            {isExporting ? "جاري التصدير..." : "تصدير Excel"}
          </Button>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="range" className={cn(compact ? "pt-3" : "pt-4")}>
          <div className={cn("grid gap-4", "grid-cols-1 md:grid-cols-12")}>
            {/* Range From */}
            <div className="md:col-span-3">
              <Label className="mb-2 block">من</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-right font-normal",
                      !rangeFrom && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {rangeFrom ? format(rangeFrom, "dd MMMM yyyy", { locale: ar }) : <span>اختر التاريخ</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={rangeFrom}
                    onSelect={setRangeFrom}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ar}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Range To */}
            <div className="md:col-span-3">
              <Label className="mb-2 block">إلى</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-right font-normal",
                      !rangeTo && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {rangeTo ? format(rangeTo, "dd MMMM yyyy", { locale: ar }) : <span>اختر التاريخ</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={rangeTo}
                    onSelect={setRangeTo}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ar}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Types */}
            <div className="md:col-span-4">
              <Label className="mb-2 block">أنواع البيانات</Label>
              <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/20 p-3">
                {(Object.keys(LABELS) as DataType[]).map((type) => (
                  <div key={type} className="flex items-center gap-2">
                    <Checkbox
                      id={`export-${type}-range`}
                      checked={selectedTypes.includes(type)}
                      onCheckedChange={() => toggleType(type)}
                    />
                    <Label htmlFor={`export-${type}-range`} className="text-sm font-normal cursor-pointer">
                      {LABELS[type]}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                سيتم التصدير حسب تاريخ الحدث لكل نوع (الخروج/الزيارة/الإجراء) داخل النطاق المختار
              </p>
            </div>

            {/* Button */}
            <div className="md:col-span-2 flex items-end">
              <Button onClick={handleExport} disabled={isExporting || selectedTypes.length === 0} className="w-full">
                <FileDown className="ml-2 h-4 w-4" />
                {isExporting ? "جاري التصدير..." : "تصدير Excel"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
