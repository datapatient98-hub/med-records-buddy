export const APPROVED_DEPARTMENT_NAMES = [
  "العناية العامة",
  "الأطفال",
  "الغسيل الكلوي",
  "حميات حريم",
  "العناية المتوسطة",
  "العزل",
  "حميات رجال",
  "عناية الأمراض التنفسية",
  "الكبد",
  "عناية السموم",
  "الاستقبال",
  "بذل حريم بطن",
  "رجال بذل بطن",
] as const;

export type ApprovedDepartmentName = (typeof APPROVED_DEPARTMENT_NAMES)[number];
