export type TableKey = "admissions" | "discharges" | "emergencies" | "endoscopies" | "procedures" | "file_loans";

export type SelectableRecord = {
  table: TableKey;
  id: string;
  unified_number?: string | null;
  patient_name?: string | null;
  internal_number?: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snapshot: any;
};
