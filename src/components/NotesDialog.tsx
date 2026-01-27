import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { AddNoteForm } from "@/components/notes/AddNoteForm";
import { NoteCard } from "@/components/notes/NoteCard";
import { createNoteSchema, updateNoteSchema } from "@/lib/notes/noteValidation";

interface NotesDialogProps {
  admissionId: string | null;
  patientName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NotesDialog({
  admissionId,
  patientName,
  open,
  onOpenChange,
}: NotesDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = React.useState("");
  const [createdBy, setCreatedBy] = React.useState("");

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingText, setEditingText] = React.useState("");

  type NoteRow = Tables<"notes">;

  // Fetch notes for this admission
  const { data: notes, isLoading } = useQuery({
    queryKey: ["notes", admissionId],
    queryFn: async () => {
      if (!admissionId) return [];
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("admission_id", admissionId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!admissionId && open,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!admissionId) throw new Error("لا يوجد سجل دخول مرتبط");

      const parsed = createNoteSchema.safeParse({
        createdBy,
        noteText,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "يرجى التحقق من المدخلات");

      const { error } = await supabase.from("notes").insert([
        {
          admission_id: admissionId,
          note_text: parsed.data.noteText,
          created_by: parsed.data.createdBy,
        },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", admissionId] });
      setNoteText("");
      toast({ title: "تم الحفظ", description: "تمت إضافة الملاحظة بنجاح" });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل حفظ الملاحظة",
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, noteText }: { noteId: string; noteText: string }) => {
      const parsed = updateNoteSchema.safeParse({ noteText });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "يرجى التحقق من المدخلات");

      const { error } = await supabase
        .from("notes")
        .update({
          note_text: parsed.data.noteText,
          updated_at: new Date().toISOString(),
        })
        .eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", admissionId] });
      setEditingId(null);
      setEditingText("");
      toast({ title: "تم الحفظ", description: "تم تعديل الملاحظة" });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل تعديل الملاحظة",
        variant: "destructive",
      });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", admissionId] });
      toast({ title: "تم الحذف", description: "تم حذف الملاحظة" });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل حذف الملاحظة",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MessageSquare className="h-6 w-6 text-primary" />
            ملاحظات الحالة {patientName && `- ${patientName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[60vh] px-1">
          {/* Add New Note Form */}
          <AddNoteForm
            noteText={noteText}
            createdBy={createdBy}
            onNoteTextChange={setNoteText}
            onCreatedByChange={setCreatedBy}
            onSubmit={() => addNoteMutation.mutate()}
            isSubmitting={addNoteMutation.isPending}
            disabled={!admissionId || addNoteMutation.isPending || !noteText.trim() || !createdBy.trim()}
          />

          {/* Notes List */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              السجل ({notes?.length || 0})
            </h3>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
            ) : notes && notes.length > 0 ? (
              (notes as NoteRow[]).map((note) => (
                <NoteCard
                  key={note.id}
                  createdBy={note.created_by}
                  createdAt={note.created_at}
                  noteText={note.note_text}
                  isEditing={editingId === note.id}
                  editingText={editingId === note.id ? editingText : ""}
                  onStartEdit={() => {
                    setEditingId(note.id);
                    setEditingText(String(note.note_text ?? ""));
                  }}
                  onEditingTextChange={setEditingText}
                  onSaveEdit={() => updateNoteMutation.mutate({ noteId: note.id, noteText: editingText })}
                  onCancelEdit={() => {
                    setEditingId(null);
                    setEditingText("");
                  }}
                  onDelete={() => deleteNoteMutation.mutate(note.id)}
                  disableDelete={deleteNoteMutation.isPending}
                  disableSave={updateNoteMutation.isPending}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد ملاحظات حتى الآن
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
