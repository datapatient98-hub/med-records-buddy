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
  // Auto close after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 10000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div 
      className="fixed top-4 left-4 z-50 animate-in slide-in-from-left duration-500"
      dir="rtl"
    >
      <Card className="w-96 shadow-2xl border-green-500/50 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-500/20 rounded-full">
                <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-800 dark:text-green-200">
                  تم الحفظ بنجاح
                </h3>
                <p className="text-sm text-green-700/80 dark:text-green-300/80">
                  تم تسجيل المريض في النظام
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-green-700 hover:text-green-900 dark:text-green-300 dark:hover:text-green-100 -mt-1"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-2.5 bg-white/60 dark:bg-black/20 p-4 rounded-lg border border-green-200/50 dark:border-green-800/50">
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold text-green-900 dark:text-green-100">
                الرقم الموحد:
              </span>
              <span className="text-lg font-bold text-green-800 dark:text-green-200">
                {unifiedNumber}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-green-200/50 dark:border-green-800/50 pt-2.5">
              <span className="text-base font-semibold text-green-900 dark:text-green-100">
                اسم المريض:
              </span>
              <span className="text-lg font-bold text-green-800 dark:text-green-200">
                {patientName}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-green-200/50 dark:border-green-800/50 pt-2.5">
              <span className="text-base font-semibold text-green-900 dark:text-green-100">
                قسم الدخول:
              </span>
              <span className="text-lg font-bold text-green-800 dark:text-green-200">
                {departmentName}
              </span>
            </div>
          </div>

          <div className="mt-3 text-center">
            <p className="text-xs text-green-600/80 dark:text-green-400/80">
              ستُخفى هذه الرسالة تلقائياً بعد 10 ثواني
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
