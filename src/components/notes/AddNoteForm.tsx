import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

type Props = {
  noteText: string;
  createdBy: string;
  onNoteTextChange: (v: string) => void;
  onCreatedByChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  isSubmitting?: boolean;
};

export function AddNoteForm({
  noteText,
  createdBy,
  onNoteTextChange,
  onCreatedByChange,
  onSubmit,
  disabled,
  isSubmitting,
}: Props) {
  return (
    <Card className="bg-muted/30 border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">الملاحظة</label>
          <Textarea
            value={noteText}
            onChange={(e) => onNoteTextChange(e.target.value)}
            placeholder="اكتب الملاحظة هنا..."
            rows={3}
            className="resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">اسم المُدخل</label>
            <Input value={createdBy} onChange={(e) => onCreatedByChange(e.target.value)} placeholder="اسمك" />
          </div>
          <div className="flex items-end">
            <Button
              onClick={onSubmit}
              disabled={!!disabled || !!isSubmitting}
              className="w-full"
              type="button"
            >
              <Plus className="ml-2 h-4 w-4" />
              إضافة ملاحظة
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
