import type { UnifiedHistoryPayload } from "@/components/UnifiedPatientHistoryDialog";
import type { SelectableRecord, TableKey } from "./types";

export function keyOf(r: SelectableRecord) {
  return `${r.table}:${r.id}`;
}

export function pickPatientName(p: UnifiedHistoryPayload | null) {
  return (
    p?.admissions?.[0]?.patient_name ??
    p?.emergencies?.[0]?.patient_name ??
    p?.endoscopies?.[0]?.patient_name ??
    p?.procedures?.[0]?.patient_name ??
    null
  );
}

export function sanitizeJson(v: unknown) {
  try {
    return JSON.parse(JSON.stringify(v ?? {}));
  } catch {
    return {};
  }
}

export function buildSelectable(payload: UnifiedHistoryPayload | null): SelectableRecord[] {
  if (!payload) return [];

  const unified = payload.unified_number;
  const defaultName = pickPatientName(payload);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRow = (table: TableKey, r: any): SelectableRecord => ({
    table,
    id: String(r?.id ?? ""),
    unified_number: r?.unified_number ?? unified ?? null,
    patient_name: r?.patient_name ?? defaultName ?? null,
    internal_number: typeof r?.internal_number === "number" ? r.internal_number : null,
    snapshot: r,
  });

  const out: SelectableRecord[] = [];
  for (const r of payload.admissions ?? []) out.push(mapRow("admissions", r));
  for (const r of payload.discharges ?? []) out.push(mapRow("discharges", r));
  for (const r of payload.emergencies ?? []) out.push(mapRow("emergencies", r));
  for (const r of payload.endoscopies ?? []) out.push(mapRow("endoscopies", r));
  for (const r of payload.procedures ?? []) out.push(mapRow("procedures", r));
  for (const r of payload.loans ?? []) out.push(mapRow("file_loans", r));
  return out.filter((r) => !!r.id);
}
