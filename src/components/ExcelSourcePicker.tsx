import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PersistedExcelSourceKey, usePersistentExcelSource } from "@/hooks/usePersistentExcelSource";
import { cn } from "@/lib/utils";
import { FileSpreadsheet, Trash2 } from "lucide-react";

type Props = {
  title: string;
  requiredFileName: string;
  sourceKey: PersistedExcelSourceKey;
  className?: string;
};

export default function ExcelSourcePicker({
  title,
  requiredFileName,
  sourceKey,
  className,
}: Props) {
  const source = usePersistentExcelSource(sourceKey);

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            اسم الملف المطلوب: <span className="font-mono">{requiredFileName}</span>
          </p>

          {source.hasSource ? (
            <div className="pt-1 text-xs">
              <div className="text-foreground">
                المختار: <span className="font-mono">{source.meta.fileName}</span>
              </div>
              {source.meta.updatedAt ? (
                <div className="text-muted-foreground">آخر تحديث: {new Date(source.meta.updatedAt).toLocaleString("ar-EG")}</div>
              ) : null}
            </div>
          ) : (
            <div className="pt-1 text-xs text-muted-foreground">لم يتم اختيار ملف بعد.</div>
          )}

          {!source.canPersistHandle ? (
            <p className="pt-2 text-xs text-muted-foreground">
              ملاحظة: متصفحك لا يدعم حفظ اختيار الملف تلقائيًا، ستحتاج لاختياره مرة أخرى عند اللزوم.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => source.pick()}
            disabled={!source.isReady}
          >
            اختيار الملف
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="justify-between"
            onClick={() => source.clear()}
            disabled={!source.isReady || !source.hasSource}
          >
            <span>مسح</span>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
