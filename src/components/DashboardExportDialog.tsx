 import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileSpreadsheet } from "lucide-react";
import DashboardExportForm from "@/components/DashboardExportForm";
 
 interface DashboardExportDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export default function DashboardExportDialog({ open, onOpenChange }: DashboardExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            تصدير بيانات لوحة التحكم
          </DialogTitle>
          <DialogDescription>اختر اليوم والأنواع المطلوبة لتصدير ملف Excel احترافي.</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <DashboardExportForm onExportSuccess={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}