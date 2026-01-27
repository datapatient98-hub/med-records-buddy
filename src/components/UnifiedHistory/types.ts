export type AnyRow = Record<string, any>;

export type ColumnDef = { key: string; label: string; isDate?: boolean };

export type UnifiedHistoryPayload = {
  unified_number: string;
  admissions: AnyRow[];
  discharges: AnyRow[];
  emergencies: AnyRow[];
  endoscopies: AnyRow[];
  procedures: AnyRow[];
  loans: AnyRow[];
};
