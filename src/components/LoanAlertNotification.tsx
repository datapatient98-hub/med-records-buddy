import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { format } from "date-fns";

export default function LoanAlertNotification() {
  const [dismissed, setDismissed] = useState(false);
  const [lastCheck, setLastCheck] = useState(Date.now());

  // Fetch unreturned loans
  const { data: unreturnedLoans, refetch } = useQuery({
    queryKey: ["unreturned-loans", lastCheck],
    queryFn: async () => {
      const { data } = await supabase
        .from("file_loans")
        .select("*, admissions(patient_name, unified_number)")
        .eq("is_returned", false);
      return data || [];
    },
  });

  // Auto-refresh every 3 hours
  useEffect(() => {
    const interval = setInterval(() => {
      setLastCheck(Date.now());
      setDismissed(false); // Show again after 3 hours
      refetch();
    }, 3 * 60 * 60 * 1000); // 3 hours

    return () => clearInterval(interval);
  }, [refetch]);

  if (dismissed || !unreturnedLoans || unreturnedLoans.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-2xl mx-4 shadow-2xl border-destructive/50 animate-in fade-in zoom-in duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">تنبيه: ملفات لم تُرجع</h3>
                <p className="text-sm text-muted-foreground">
                  هناك {unreturnedLoans.length} ملف مستعار لم يتم إرجاعه
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {unreturnedLoans.map((loan: any) => (
              <div
                key={loan.id}
                className="p-3 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-foreground">
                      {loan.admissions?.patient_name || "غير محدد"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      الرقم الموحد: {loan.unified_number}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      تاريخ الاستعارة: {format(new Date(loan.loan_date), "yyyy-MM-dd")}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-muted-foreground">مستعار بواسطة</p>
                    <p className="text-sm text-foreground">{loan.borrowed_by}</p>
                    <p className="text-xs text-muted-foreground mt-1">{loan.borrowed_to_department}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border flex justify-end">
            <Button onClick={() => setDismissed(true)} variant="default">
              فهمت، إخفاء
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
