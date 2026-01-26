import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { APPROVED_DEPARTMENT_NAMES } from "@/lib/departments/approvedDepartments";

export default function ApprovedDepartmentsInstaller() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      // Supabase requires a filter for delete; this matches all rows.
      const deleteRes = await supabase
        .from("departments")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (deleteRes.error) throw deleteRes.error;

      const insertRes = await supabase
        .from("departments")
        .insert(APPROVED_DEPARTMENT_NAMES.map((name) => ({ name })));

      if (insertRes.error) throw insertRes.error;

      return { deleted: deleteRes.count ?? null, inserted: APPROVED_DEPARTMENT_NAMES.length };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast({
        title: "تم تثبيت الأقسام المعتمدة",
        description: `تم تسجيل ${APPROVED_DEPARTMENT_NAMES.length} قسم.`,
      });
      setOpen(false);
    },
    onError: (err: any) => {
      const msg = String(err?.message ?? "");
      toast({
        title: "تعذر تثبيت الأقسام",
        description:
          msg.includes("foreign key")
            ? "لا يمكن حذف الأقسام لأن هناك سجلات مرتبطة بها حالياً. امسح/انقل السجلات أولاً ثم أعد المحاولة."
            : msg || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>تثبيت الأقسام المعتمدة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          هذا الإجراء سيحذف كل الأقسام الحالية ويضيف فقط قائمة الأقسام المعتمدة (13 قسم).
        </p>

        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={mutation.isPending}>
              تثبيت الأقسام المعتمدة
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الإجراء</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف جميع الأقسام الحالية واستبدالها بالقائمة المعتمدة.
                <br />
                لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={mutation.isPending}>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                disabled={mutation.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  mutation.mutate();
                }}
              >
                {mutation.isPending ? "جارٍ التثبيت..." : "نعم، نفّذ"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
