export const stripHtml = (input: string) => input.replace(/<[^>]*>/g, " ");

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export const normalizeArabicText = (value: string) => {
  return value
    .toString()
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
};

export const normalizeCellValue = (v: unknown) => {
  if (v === null || v === undefined) return "";

  // SheetJS may give numbers for large digit strings (scientific notation in source Excel)
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "";
    return String(Math.trunc(v));
  }

  let s = String(v);

  // Handle strings like 3.0605E+13
  if (/e\+?\d+$/i.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) return String(Math.trunc(n));
  }

  // Clean HTML-ish values (diagnosis column in template)
  if (s.includes("<") && s.includes(">")) {
    s = stripHtml(s);
  }

  // Normalize whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s;
};
