import * as React from "react";

import { Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export default function LoanSuggestInput({
  value,
  onValueChange,
  suggestions,
  placeholder,
  listId,
  onAdd,
  onManage,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  listId: string;
  onAdd?: () => void;
  onManage?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Input
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
        className="pr-20"
      />

      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <div className="absolute inset-y-0 right-2 flex items-center gap-1">
        {onManage && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              onManage();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onManage();
              }
            }}
            className="h-7 w-7 rounded-sm border border-border hover:bg-accent flex items-center justify-center cursor-pointer select-none"
            aria-label="تعديل القائمة"
            title="تعديل القائمة"
          >
            <Pencil className="h-3.5 w-3.5 text-foreground" />
          </span>
        )}

        {onAdd && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              onAdd();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onAdd();
              }
            }}
            className="h-7 w-7 rounded-sm border border-primary/20 hover:bg-primary/10 flex items-center justify-center cursor-pointer select-none"
            aria-label="إضافة جديد"
            title="إضافة جديد"
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
          </span>
        )}
      </div>
    </div>
  );
}
