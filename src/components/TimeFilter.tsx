import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type TimeRange = "day" | "week" | "month" | "quarter";

interface TimeFilterProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

export default function TimeFilter({ value, onChange }: TimeFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="اختر الفترة" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="day">اليوم</SelectItem>
        <SelectItem value="week">الأسبوع</SelectItem>
        <SelectItem value="month">الشهر</SelectItem>
        <SelectItem value="quarter">3 أشهر</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function getTimeRangeDates(range: TimeRange): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case "day":
      start.setHours(0, 0, 0, 0);
      break;
    case "week":
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      start.setMonth(start.getMonth() - 1);
      break;
    case "quarter":
      start.setMonth(start.getMonth() - 3);
      break;
  }

  return { start, end };
}
