import type { AnyRow, UnifiedHistoryPayload } from "@/components/UnifiedHistory/types";

export type UnifiedVisit = {
  key: string;
  startAt: string | null; // ISO or null
  admission: AnyRow | null;
  admissions: AnyRow[];
  discharges: AnyRow[];
  emergencies: AnyRow[];
  endoscopies: AnyRow[];
  procedures: AnyRow[];
  loans: AnyRow[];
};

function toTime(v: unknown): number {
  if (!v) return 0;
  const t = new Date(String(v)).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function getEventTimeMs(r: AnyRow): number {
  // Prioritize the “real” event times.
  const candidates = [
    r.discharge_date,
    r.procedure_date,
    r.visit_date,
    r.loan_date,
    r.admission_date,
    r.created_at,
    r.updated_at,
  ];
  for (const v of candidates) {
    const t = toTime(v);
    if (t) return t;
  }
  return 0;
}

function getAdmissionStartMs(a: AnyRow): number {
  return toTime(a.admission_date) || toTime(a.created_at) || 0;
}

export function groupHistoryIntoVisits(payload: UnifiedHistoryPayload | null): UnifiedVisit[] {
  if (!payload) return [];

  const admissions = [...(payload.admissions ?? [])].sort((a, b) => getAdmissionStartMs(a) - getAdmissionStartMs(b));

  // If no admissions exist, treat everything as one “visit”.
  if (admissions.length === 0) {
    return [
      {
        key: "no-admissions",
        startAt: null,
        admission: null,
        admissions: [],
        discharges: payload.discharges ?? [],
        emergencies: payload.emergencies ?? [],
        endoscopies: payload.endoscopies ?? [],
        procedures: payload.procedures ?? [],
        loans: payload.loans ?? [],
      },
    ];
  }

  // Build visit “windows” by admission_date: each admission creates an interval [thisAdmission, nextAdmission)
  const windows = admissions.map((a, idx) => {
    const startMs = getAdmissionStartMs(a);
    const next = admissions[idx + 1];
    const endMs = next ? getAdmissionStartMs(next) : Number.POSITIVE_INFINITY;
    return { a, startMs, endMs, idx };
  });

  const makeVisit = (w: (typeof windows)[number]): UnifiedVisit => ({
    key: `visit-${w.idx}-${w.a.id ?? w.startMs}`,
    startAt: w.startMs ? new Date(w.startMs).toISOString() : null,
    admission: w.a,
    admissions: [w.a],
    discharges: [],
    emergencies: [],
    endoscopies: [],
    procedures: [],
    loans: [],
  });

  const visits = windows.map(makeVisit);

  const assignByTime = (r: AnyRow): number => {
    const t = getEventTimeMs(r);
    // Assign to the latest visit whose [start, end) contains the event.
    for (let i = windows.length - 1; i >= 0; i--) {
      const w = windows[i];
      if (t >= w.startMs && t < w.endMs) return i;
    }
    // If event time is before first admission, attach it to first.
    return 0;
  };

  for (const r of payload.discharges ?? []) visits[assignByTime(r)].discharges.push(r);
  for (const r of payload.emergencies ?? []) visits[assignByTime(r)].emergencies.push(r);
  for (const r of payload.endoscopies ?? []) visits[assignByTime(r)].endoscopies.push(r);
  for (const r of payload.procedures ?? []) visits[assignByTime(r)].procedures.push(r);
  for (const r of payload.loans ?? []) visits[assignByTime(r)].loans.push(r);

  return visits;
}
