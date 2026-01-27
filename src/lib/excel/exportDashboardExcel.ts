import * as XLSX from "xlsx";
import { format } from "date-fns";

export type DashboardExportType = "discharges" | "emergencies" | "endoscopies" | "procedures";

type LookupMaps = {
  departments: Record<string, string>;
  doctors: Record<string, string>;
  diagnoses: Record<string, string>;
  governorates: Record<string, string>;
  districts: Record<string, string>;
  stations: Record<string, string>;
  occupations: Record<string, string>;
  hospitals: Record<string, string>;
};

function toDisplayDate(value: unknown) {
  if (!value) return "";
  try {
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    return format(d, "yyyy-MM-dd HH:mm");
  } catch {
    return String(value);
  }
}

function autoWidth(ws: XLSX.WorkSheet, rows: Record<string, unknown>[]) {
  const headerKeys = rows.length ? Object.keys(rows[0]) : [];
  const widths = headerKeys.map((k) => {
    const headerLen = k.length;
    const maxLen = rows.reduce((acc, r) => {
      const v = r[k];
      const s = v == null ? "" : String(v);
      return Math.max(acc, s.length);
    }, headerLen);
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ws as any)["!cols"] = widths;

  // Freeze header row + enable filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ws as any)["!freeze"] = { xSplit: 0, ySplit: 1 };
  if (headerKeys.length) {
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    range.s.r = 0;
    range.e.r = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ws as any)["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: headerKeys.length - 1, r: 0 } }) };
  }
}

function mapCommonFields(row: Record<string, unknown>, lookups: LookupMaps) {
  const departmentId = (row["department_id"] as string) || (row["discharge_department_id"] as string) || (row["transferred_from_department_id"] as string);
  const diagnosisId = (row["diagnosis_id"] as string) || (row["discharge_diagnosis_id"] as string);
  const doctorId = (row["doctor_id"] as string) || (row["discharge_doctor_id"] as string);
  const governorateId = row["governorate_id"] as string;
  const districtId = row["district_id"] as string;
  const stationId = row["station_id"] as string;
  const occupationId = row["occupation_id"] as string;
  const hospitalId = row["hospital_id"] as string;

  return {
    "الرقم الموحد": row["unified_number"],
    "اسم المريض": row["patient_name"],
    "الرقم القومي": row["national_id"],
    "الهاتف": row["phone"],
    "النوع": row["gender"],
    "السن": row["age"],
    "الحالة الاجتماعية": row["marital_status"],
    "المحافظة": governorateId ? lookups.governorates[governorateId] || governorateId : "",
    "المنطقة": districtId ? lookups.districts[districtId] || districtId : "",
    "المركز/النقطة": stationId ? lookups.stations[stationId] || stationId : "",
    "العنوان": row["address_details"],
    "الوظيفة": occupationId ? lookups.occupations[occupationId] || occupationId : "",
    "القسم": departmentId ? lookups.departments[departmentId] || departmentId : "",
    "التشخيص": diagnosisId ? lookups.diagnoses[diagnosisId] || diagnosisId : "",
    "الطبيب": doctorId ? lookups.doctors[doctorId] || doctorId : "",
    "المستشفى": hospitalId ? lookups.hospitals[hospitalId] || hospitalId : "",
  };
}

export function buildDashboardExportWorkbook(args: {
  selectedDate: Date;
  exportAt: Date;
  selectedTypes: DashboardExportType[];
  // raw table rows keyed by type
  dataByType: Record<DashboardExportType, any[]>;
  lookups: LookupMaps;
  range?: {
    from: Date;
    to: Date;
    /** Arabic label describing how the range was interpreted (e.g. حسب تاريخ الحدث) */
    modeLabel?: string;
  };
}) {
  const { selectedDate, exportAt, selectedTypes, dataByType, lookups, range } = args;
  const wb = XLSX.utils.book_new();

  const summaryRows: (string | number)[][] = [
    ["تقرير لوحة التحكم - ملخص البيانات"],
    [],
    range
      ? [
          "الفترة:",
          `${format(range.from, "yyyy-MM-dd")} → ${format(range.to, "yyyy-MM-dd")}`,
        ]
      : ["اليوم:", format(selectedDate, "yyyy-MM-dd")],
    ...(range?.modeLabel ? [["طريقة التصفية:", range.modeLabel]] : []),
    ["تاريخ التصدير:", format(exportAt, "yyyy-MM-dd HH:mm")],
    [],
    ["نوع البيانات", "العدد"],
  ];

  const totals: Record<DashboardExportType, number> = {
    discharges: 0,
    emergencies: 0,
    endoscopies: 0,
    procedures: 0,
  };

  const labels: Record<DashboardExportType, string> = {
    discharges: "الخروج",
    emergencies: "الطوارئ",
    endoscopies: "المناظير",
    procedures: "البذل",
  };

  // Detailed sheets
  for (const type of selectedTypes) {
    const rows = (dataByType[type] || []).slice().sort((a, b) => {
      const ad = new Date(a?.created_at || 0).getTime();
      const bd = new Date(b?.created_at || 0).getTime();
      return bd - ad;
    });
    totals[type] = rows.length;

    const mapped = rows.map((r) => {
      // Discharges sometimes come with nested admissions() from older query patterns.
      const admission = r?.admissions || r?.admission;
      const base = { ...(admission || {}), ...(r || {}) };

      const common = mapCommonFields(base, lookups);
      const createdAt = toDisplayDate(base["created_at"]);

      if (type === "discharges") {
        return {
          ...common,
          "تاريخ الخروج": toDisplayDate(base["discharge_date"]),
          "حالة الخروج": base["discharge_status"],
          "مصدر التمويل": base["finance_source"],
          "رقم داخلي": base["internal_number"],
          "تاريخ التسجيل": createdAt,
        };
      }

      if (type === "emergencies") {
        return {
          ...common,
          "تاريخ الزيارة": toDisplayDate(base["visit_date"]),
          "رقم داخلي": base["internal_number"],
          "تاريخ التسجيل": createdAt,
        };
      }

      if (type === "endoscopies") {
        return {
          ...common,
          "تاريخ الإجراء": toDisplayDate(base["procedure_date"]),
          "تاريخ الدخول": toDisplayDate(base["admission_date"]),
          "تاريخ الخروج": toDisplayDate(base["discharge_date"]),
          "حالة الخروج": base["discharge_status"] || base["discharge_status_other"],
          "رقم داخلي": base["internal_number"],
          "تاريخ التسجيل": createdAt,
        };
      }

      // procedures
      return {
        ...common,
        "نوع الإجراء": base["procedure_type"],
        "حالة الإجراء": base["procedure_status"],
        "تاريخ الإجراء": toDisplayDate(base["procedure_date"]),
        "رقم داخلي": base["internal_number"],
        "تاريخ التسجيل": createdAt,
      };
    });

    // Always create a sheet even if empty (professional expectation)
    const ws = XLSX.utils.json_to_sheet(mapped);
    autoWidth(ws, mapped);
    XLSX.utils.book_append_sheet(wb, ws, labels[type]);
  }

  // Summary sheet first
  for (const type of selectedTypes) summaryRows.push([labels[type], totals[type] || 0]);
  const totalAll = selectedTypes.reduce((acc, t) => acc + (totals[t] || 0), 0);
  summaryRows.push([], ["الإجمالي الكلي:", totalAll]);
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (wsSummary as any)["!cols"] = [{ wch: 28 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "الملخص");

  // Put summary first
  const sheets = wb.SheetNames;
  const summaryName = sheets.pop();
  if (summaryName) wb.SheetNames = [summaryName, ...sheets];

  return { wb, totalAll };
}
