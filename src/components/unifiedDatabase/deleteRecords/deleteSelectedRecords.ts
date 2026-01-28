import { supabase } from "@/integrations/supabase/client";
import type { SelectableRecord, TableKey } from "./types";

export async function deleteSelectedRecords(selected: SelectableRecord[]) {
  const byTable = new Map<TableKey, string[]>();
  for (const it of selected) {
    const list = byTable.get(it.table) ?? [];
    list.push(it.id);
    byTable.set(it.table, list);
  }

  const admissionIds = byTable.get("admissions") ?? [];
  if (admissionIds.length) {
    // Clean dependent rows to avoid FK errors
    await supabase.from("discharges").delete().in("admission_id", admissionIds);
    await supabase.from("notes").delete().in("admission_id", admissionIds);
    await supabase.from("file_loans").delete().in("admission_id", admissionIds);
    await supabase.from("procedures").delete().in("admission_id", admissionIds);
    await supabase.from("endoscopies").delete().in("admission_id", admissionIds);
    await supabase.from("emergencies").delete().in("admission_id", admissionIds);
    await supabase.from("admissions").delete().in("id", admissionIds);
  }

  const delById = async (table: Exclude<TableKey, "admissions">, column: string = "id") => {
    const ids = byTable.get(table) ?? [];
    if (!ids.length) return;
    // Supabase client generics can get too deep with dynamic table names.
    // Use a narrowed, runtime-safe call.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = (supabase as any).from(table).delete().in(column, ids);
    const { error } = (await q) as { error?: any };
    if (error) throw error;
  };

  await delById("discharges");
  await delById("emergencies");
  await delById("endoscopies");
  await delById("procedures");
  await delById("file_loans");
}
