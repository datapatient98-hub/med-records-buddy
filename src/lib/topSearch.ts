type SupabaseLike = {
  from: (table: string) => any;
};

function isLikelyNumber(v: string) {
  return /^[0-9]+$/.test((v ?? "").trim());
}

async function firstUnifiedNumberFromAdmissions(db: SupabaseLike, q: string) {
  const { data, error } = await db
    .from("admissions")
    .select("unified_number")
    .or(
      [
        `unified_number.eq.${q}`,
        // الاسم حرفي
        `patient_name.eq.${q}`,
        // الرقم القومي / الهاتف
        `national_id.eq.${q}`,
        `phone.eq.${q}`,
      ].join(","),
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.unified_number as string | undefined) ?? null;
}

async function firstUnifiedNumberFromInternalNumber(db: SupabaseLike, internalNumber: number) {
  const [loansRes, procRes, endoRes, emerRes, disRes] = await Promise.all([
    db.from("file_loans").select("unified_number").eq("internal_number", internalNumber).limit(1).maybeSingle(),
    db.from("procedures").select("unified_number").eq("internal_number", internalNumber).limit(1).maybeSingle(),
    db.from("endoscopies").select("unified_number").eq("internal_number", internalNumber).limit(1).maybeSingle(),
    db.from("emergencies").select("unified_number").eq("internal_number", internalNumber).limit(1).maybeSingle(),
    db.from("discharges").select("admission_id").eq("internal_number", internalNumber).limit(1).maybeSingle(),
  ]);

  for (const res of [loansRes, procRes, endoRes, emerRes]) {
    if (res.error) throw res.error;
    const un = (res.data?.unified_number as string | undefined) ?? null;
    if (un) return un;
  }

  if (disRes.error) throw disRes.error;
  const admissionId = (disRes.data?.admission_id as string | undefined) ?? null;
  if (!admissionId) return null;

  const { data: adm, error: admErr } = await db.from("admissions").select("unified_number").eq("id", admissionId).maybeSingle();
  if (admErr) throw admErr;
  return (adm?.unified_number as string | undefined) ?? null;
}

/**
 * Returns the matching unified_number (or null).
 * Search order: unified_number/name/national_id/phone then internal_number.
 */
export async function findUnifiedNumberForTopSearch(db: SupabaseLike, rawQuery: string) {
  const q = (rawQuery ?? "").trim();
  if (!q) return null;

  // First: admissions (covers unified/name/national/phone)
  const unFromAdmissions = await firstUnifiedNumberFromAdmissions(db, q);
  if (unFromAdmissions) return unFromAdmissions;

  // Then: internal number
  if (isLikelyNumber(q)) {
    const n = Number(q);
    if (Number.isFinite(n)) {
      const unFromInternal = await firstUnifiedNumberFromInternalNumber(db, n);
      if (unFromInternal) return unFromInternal;
    }
  }

  return null;
}

export async function fetchUnifiedHistoryPayload(db: SupabaseLike, unifiedNumber: string) {
  const un = (unifiedNumber ?? "").trim();
  if (!un) throw new Error("Missing unified number");

  // Get admissions for unified number (needed to resolve discharges)
  const { data: admissions, error: admErr } = await db
    .from("admissions")
    .select("*")
    .eq("unified_number", un)
    .order("created_at", { ascending: false });
  if (admErr) throw admErr;

  const admissionIds = (admissions ?? []).map((a: any) => a?.id).filter(Boolean);

  const [disRes, emerRes, endoRes, procRes, loansRes] = await Promise.all([
    admissionIds.length
      ? db.from("discharges").select("*").in("admission_id", admissionIds).order("discharge_date", { ascending: false })
      : Promise.resolve({ data: [], error: null } as any),
    db.from("emergencies").select("*").eq("unified_number", un).order("created_at", { ascending: false }),
    db.from("endoscopies").select("*").eq("unified_number", un).order("created_at", { ascending: false }),
    db.from("procedures").select("*").eq("unified_number", un).order("created_at", { ascending: false }),
    db.from("file_loans").select("*").eq("unified_number", un).order("loan_date", { ascending: false }),
  ]);

  if (disRes.error) throw disRes.error;
  if (emerRes.error) throw emerRes.error;
  if (endoRes.error) throw endoRes.error;
  if (procRes.error) throw procRes.error;
  if (loansRes.error) throw loansRes.error;

  return {
    unified_number: un,
    admissions: admissions ?? [],
    discharges: disRes.data ?? [],
    emergencies: emerRes.data ?? [],
    endoscopies: endoRes.data ?? [],
    procedures: procRes.data ?? [],
    loans: loansRes.data ?? [],
  };
}
