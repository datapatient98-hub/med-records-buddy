export function getBirthDateFromEgyptNationalId(nationalId: string): Date | null {
  const clean = (nationalId ?? "").replace(/\D/g, "");
  if (clean.length !== 14) return null;

  const centuryCode = clean[0];
  const yy = Number(clean.slice(1, 3));
  const mm = Number(clean.slice(3, 5));
  const dd = Number(clean.slice(5, 7));

  if (!["2", "3"].includes(centuryCode)) return null;
  if (mm < 1 || mm > 12) return null;
  if (dd < 1 || dd > 31) return null;

  const year = (centuryCode === "2" ? 1900 : 2000) + yy;
  const date = new Date(year, mm - 1, dd);

  // validate actual calendar date
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== mm - 1 ||
    date.getDate() !== dd
  ) {
    return null;
  }

  return date;
}

export function getAgeFromDate(date: Date, now = new Date()): number {
  let age = now.getFullYear() - date.getFullYear();
  const m = now.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < date.getDate())) age--;
  return age;
}

export function getAgeFromEgyptNationalId(nationalId: string): number | null {
  const dob = getBirthDateFromEgyptNationalId(nationalId);
  if (!dob) return null;
  const age = getAgeFromDate(dob);
  if (age < 0 || age > 130) return null;
  return age;
}
