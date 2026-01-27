import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Pencil, Save, Trash2, X } from "lucide-react";

type Props = {
  createdBy: string;
  createdAt: string;
  noteText: string;
  isEditing: boolean;
  editingText: string;
  onStartEdit: () => void;
  onEditingTextChange: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  disableDelete?: boolean;
  disableSave?: boolean;
};

export function NoteCard({
  createdBy,
  createdAt,
  noteText,
  isEditing,
  editingText,
  onStartEdit,
  onEditingTextChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  disableDelete,
  disableSave,
}: Props) {
  return (
    <Card className="border-border hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-sm font-semibold text-foreground">{createdBy}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(createdAt), "yyyy-MM-dd HH:mm")}</p>
          </div>

          <div className="flex items-center gap-1">
            {!isEditing && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onStartEdit}
                className="text-muted-foreground hover:text-foreground"
                type="button"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              disabled={!!disableDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editingText}
              onChange={(e) => onEditingTextChange(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button type="button" className="flex-1" onClick={onSaveEdit} disabled={!!disableSave}>
                <Save className="ml-2 h-4 w-4" />
                حفظ التعديل
              </Button>
              <Button type="button" variant="secondary" onClick={onCancelEdit}>
                <X className="ml-2 h-4 w-4" />
                إلغاء
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap">{noteText}</p>
        )}
      </CardContent>
    </Card>
  );
}
