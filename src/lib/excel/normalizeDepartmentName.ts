import { normalizeArabicText, normalizeCellValue } from "./normalizeArabic";

/**
 * Normalize department names coming from Excel to match the approved master list.
 * Returns a display (canonical) Arabic name when an alias is recognized.
 */
export function normalizeDepartmentName(raw: unknown): string {
  const trimmed = normalizeCellValue(raw).trim();
  if (!trimmed) return "";

  const key = normalizeArabicText(trimmed);

  // Map common/legacy variants to the canonical display names
  const aliases: Record<string, string> = {
    // Medium care variants (mostly already covered by normalizeArabicText, kept for safety)
    [normalizeArabicText("العنايه المتوسطه")]: "العناية المتوسطة",

    // Legacy shorthand without "ال"
    [normalizeArabicText("عناية عامة")]: "العناية العامة",
    [normalizeArabicText("عناية عامه")]: "العناية العامة",

    // Extra-trim safety (normalizeCellValue already trims, but keep canonical)
    [normalizeArabicText("الكبد")]: "الكبد",
  };

  return aliases[key] ?? trimmed;
}
