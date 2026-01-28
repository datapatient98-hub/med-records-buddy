import * as React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function OldFileNotice({
  unifiedNumber,
  internalNumber,
  lastSeenAt,
}: {
  unifiedNumber: string;
  internalNumber: number | null;
  lastSeenAt?: string | null;
}) {
  return (
    <Alert>
      <AlertDescription className="text-sm leading-relaxed" dir="rtl">
        <div className="font-bold text-foreground">⚠️ ملف قديم</div>
        <div className="mt-1 text-muted-foreground">
          الرقم الموحد: <span className="font-semibold text-foreground" dir="ltr">{unifiedNumber || "-"}</span>
          {" "}— الرقم الداخلي ثابت: <span className="font-black text-foreground" dir="ltr">{internalNumber ?? "سيُنشأ عند أول خروج"}</span>
          {lastSeenAt ? (
            <>
              {" "}— آخر تسجيل: <span className="font-semibold text-foreground">{new Date(lastSeenAt).toLocaleString("ar-EG")}</span>
            </>
          ) : null}
        </div>
        <div className="mt-1 text-muted-foreground">
          بيانات المريض الشخصية <span className="font-semibold">مقفولة</span> (لا تعديل) — أكمل فقط بيانات الزيارة/الحجز الحالية ثم احفظ.
        </div>
      </AlertDescription>
    </Alert>
  );
}
