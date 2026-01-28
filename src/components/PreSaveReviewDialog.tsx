import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type KV = { label: string; value: React.ReactNode };

function Row({ label, value }: KV) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <span className="text-sm font-bold text-foreground text-left" dir="ltr">
        {value || "—"}
      </span>
    </div>
  );
}

export default function PreSaveReviewDialog({
  open,
  onOpenChange,
  title,
  description,
  fixed,
  visit,
  confirmLabel = "تأكيد الحفظ",
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  fixed: KV[];
  visit: KV[];
  confirmLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description ?? "راجع البيانات سريعاً قبل الحفظ."}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card/50 p-4">
            <div className="text-sm font-extrabold">بيانات ثابتة (مقفولة)</div>
            <div className="mt-3 space-y-2">
              {fixed.map((kv) => (
                <Row key={kv.label} {...kv} />
              ))}
            </div>
          </div>

          <Separator />

          <div className="rounded-lg border bg-card/50 p-4">
            <div className="text-sm font-extrabold">بيانات الزيارة الحالية</div>
            <div className="mt-3 space-y-2">
              {visit.map((kv) => (
                <Row key={kv.label} {...kv} />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            رجوع
          </Button>
          <Button type="button" onClick={onConfirm} disabled={loading}>
            {loading ? "جاري الحفظ..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
