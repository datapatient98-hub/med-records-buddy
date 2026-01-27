import { format } from "date-fns";
import { ar } from "date-fns/locale";

export function fmtDate(v: any) {
  if (!v) return "-";
  try {
    return format(new Date(v), "dd/MM/yyyy HH:mm", { locale: ar });
  } catch {
    return String(v);
  }
}

export function renderValue(v: any) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  return String(v);
}
