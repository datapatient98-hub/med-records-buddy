import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdmissionSuccessNotificationProps {
  unifiedNumber: string;
  patientName: string;
  departmentName: string;
  onClose: () => void;
}

export default function AdmissionSuccessNotification({
  unifiedNumber,
  patientName,
  departmentName,
  onClose,
}: AdmissionSuccessNotificationProps) {
  // Auto close after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="fixed top-4 left-4 z-50 w-[26rem] animate-in slide-in-from-left duration-300"
      dir="rtl"
    >
      <Card className="shadow-medical-lg border border-green/30 bg-card">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3 gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full p-2 bg-green/10">
                <CheckCircle2 className="h-7 w-7 text-green" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-foreground leading-snug">
                  تم تسجيل المريض بنجاح
                </h3>
                <p className="text-sm text-muted-foreground">
                  تم حفظ بيانات الدخول في النظام
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="-mt-1"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-2.5 rounded-lg border bg-muted/30 p-4">
            <div className="flex justify-between items-center gap-3">
              <span className="text-base font-semibold text-foreground">الرقم الموحد:</span>
              <span dir="ltr" className="text-lg font-extrabold text-foreground">
                {unifiedNumber}
              </span>
            </div>
            <div className="flex justify-between items-center border-t pt-2.5 gap-3">
              <span className="text-base font-semibold text-foreground">اسم المريض:</span>
              <span className="text-lg font-extrabold text-foreground">{patientName}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-2.5 gap-3">
              <span className="text-base font-semibold text-foreground">قسم الدخول:</span>
              <span className="text-lg font-extrabold text-foreground">{departmentName}</span>
            </div>
          </div>

          <div className="mt-3 text-center">
            <p className="text-xs text-muted-foreground">ستُخفى هذه الرسالة تلقائياً بعد 5 ثواني</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
