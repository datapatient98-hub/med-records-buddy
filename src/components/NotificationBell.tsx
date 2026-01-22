import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Count: unreturned loans (badge)
  const { data: unreturnedCount } = useQuery({
    queryKey: ["unreturned-loans-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("file_loans")
        .select("id", { count: "exact", head: true })
        .eq("is_returned", false);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  // List: latest loans (shows return status)
  const { data: latestLoans } = useQuery({
    queryKey: ["loans-notifications-latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("file_loans")
        .select("id, unified_number, borrowed_by, borrowed_to_department, loan_date, return_date, is_returned, admissions(patient_name)")
        .order("loan_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const notificationCount = unreturnedCount ?? 0;
  const hasItems = (latestLoans?.length ?? 0) > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="الإشعارات"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {notificationCount > 9 ? "9+" : notificationCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="end"
        dir="rtl"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">الإشعارات</h3>
          {notificationCount > 0 && (
              <Badge variant="secondary">غير مُرجع: {notificationCount}</Badge>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {!hasItems ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>لا توجد إشعارات جديدة</p>
            </div>
          ) : (
            <div className="divide-y">
              {latestLoans?.map((loan: any) => (
                <Card
                  key={loan.id}
                  className="border-0 rounded-none hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => {
                    navigate("/loans");
                    setOpen(false);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-destructive/10 rounded-full">
                        <Bell className="h-4 w-4 text-destructive" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm text-foreground">ملف استعارة</p>
                          {loan.is_returned ? (
                            <Badge variant="secondary">تم الإرجاع</Badge>
                          ) : (
                            <Badge variant="destructive">لم يُرجع</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {loan.admissions?.patient_name} - {loan.unified_number}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          مستعار من: {loan.borrowed_by}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          تاريخ الاستعارة:{" "}
                          {format(new Date(loan.loan_date), "yyyy-MM-dd")}
                        </p>
                        {loan.is_returned && loan.return_date && (
                          <p className="text-xs text-muted-foreground">
                            تاريخ الإرجاع: {format(new Date(loan.return_date), "yyyy-MM-dd")}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {hasItems && (
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                navigate("/loans");
                setOpen(false);
              }}
            >
              عرض جميع الملفات المستعارة
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
