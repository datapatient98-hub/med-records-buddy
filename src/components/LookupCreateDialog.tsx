import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export type LookupCreateType =
  | "department"
  | "diagnosis"
  | "doctor"
  | "governorate"
  | "occupation"
  | "station"
  | "district"
  | "hospital";

const typeMeta: Record<
  LookupCreateType,
  { table: string; title: string; placeholder: string; queryKey: string }
> = {
  department: {
    table: "departments",
    title: "إضافة قسم",
    placeholder: "اسم القسم",
    queryKey: "departments",
  },
  diagnosis: {
    table: "diagnoses",
    title: "إضافة تشخيص",
    placeholder: "اسم التشخيص",
    queryKey: "diagnoses",
  },
  doctor: {
    table: "doctors",
    title: "إضافة طبيب",
    placeholder: "اسم الطبيب",
    queryKey: "doctors",
  },
  governorate: {
    table: "governorates",
    title: "إضافة محافظة",
    placeholder: "اسم المحافظة",
    queryKey: "governorates",
  },
  occupation: {
    table: "occupations",
    title: "إضافة مهنة",
    placeholder: "اسم المهنة",
    queryKey: "occupations",
  },
  station: {
    table: "stations",
    title: "إضافة محطة",
    placeholder: "اسم المحطة",
    queryKey: "stations",
  },
  district: {
    table: "districts",
    title: "إضافة مركز/حي",
    placeholder: "اسم المركز/الحي",
    queryKey: "districts",
  },
  hospital: {
    table: "hospitals",
    title: "إضافة مستشفى",
    placeholder: "اسم المستشفى",
    queryKey: "hospitals",
  },
};

interface LookupCreateDialogProps {
  open: boolean;
  type: LookupCreateType;
  onOpenChange: (open: boolean) => void;
  /** Optional context for certain types (e.g., district governorate). */
  context?: {
    governorate_id?: string;
  };
  /** Callback when item is created, returns the created item. */
  onCreated?: (item: { id: string; name: string }) => void;
}

export default function LookupCreateDialog({
  open,
  type,
  onOpenChange,
  context,
  onCreated,
}: LookupCreateDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const meta = useMemo(() => typeMeta[type], [type]);

  const handleClose = () => {
    setName("");
    onOpenChange(false);
  };

  const handleSave = async () => {
    const clean = name.trim();
    if (!clean) {
      toast({
        title: "خطأ",
        description: "من فضلك اكتب الاسم أولاً",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("يجب تسجيل الدخول أولاً قبل الإضافة/الحذف.");
      }

      const payload: Record<string, any> = { name: clean };
      if (type === "district" && context?.governorate_id) {
        payload.governorate_id = context.governorate_id;
      }

      const { data, error } = await supabase
        .from(meta.table as any)
        .insert([payload])
        .select("id, name")
        .single();
      if (error) throw error;

      // With strict RLS, some failures can manifest as "no row returned".
      // Ensure we really got the created row back.
      if (!(data as any)?.id) {
        throw new Error("تعذر الإضافة. تأكد من وجود صلاحية لإدارة القوائم.");
      }

      await queryClient.invalidateQueries({ queryKey: [meta.queryKey] });
      toast({ title: "تمت الإضافة", description: `تم إضافة: ${clean}` });
      
      // Call onCreated callback with the new item
      if (data && onCreated && "id" in (data as any) && "name" in (data as any)) {
        onCreated({ id: (data as any).id as string, name: (data as any).name as string });
      }
      
      handleClose();
    } catch (e: any) {
      toast({
        title: "تعذر الحفظ",
        description: e?.message ?? "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">الاسم</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={meta.placeholder}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">بعد الحفظ سيتم تحديث القائمة تلقائياً.</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
            إلغاء
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

