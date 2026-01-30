import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCard from "@/components/StatsCard";
import { ClipboardList, DoorOpen, FileText, Stethoscope, Syringe, Truck } from "lucide-react";

type Props = {
  counts: {
    admissions: number;
    discharges: number;
    emergencies: number;
    endoscopies: number;
    procedures: number;
    loans: number;
  };
};

export default function ReportsSummary({ counts }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>ملخص الفترة</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatsCard title="الدخول" value={counts.admissions} icon={<DoorOpen className="h-4 w-4" />} />
          <StatsCard title="الخروج" value={counts.discharges} icon={<FileText className="h-4 w-4" />} />
          <StatsCard title="الطوارئ" value={counts.emergencies} icon={<Stethoscope className="h-4 w-4" />} />
          <StatsCard title="المناظير" value={counts.endoscopies} icon={<ClipboardList className="h-4 w-4" />} />
          <StatsCard title="الإجراءات" value={counts.procedures} icon={<Syringe className="h-4 w-4" />} />
          <StatsCard title="الاستعارات" value={counts.loans} icon={<Truck className="h-4 w-4" />} />
        </div>
      </CardContent>
    </Card>
  );
}
