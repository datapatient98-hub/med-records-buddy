import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { MessageSquare, Plus, Trash2 } from "lucide-react";

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
  const [noteText, setNoteText] = useState("");
  const [createdBy, setCreatedBy] = useState("");

  // Fetch notes for this admission
  const { data: notes, isLoading } = useQuery({
    queryKey: ["notes", admissionId],
    queryFn: async () => {
      if (!admissionId) return [];
      const { data } = await supabase
        .from("notes")
        .select("*")
        .eq("admission_id", admissionId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!admissionId && open,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!admissionId || !noteText.trim() || !createdBy.trim()) {
        throw new Error("يرجى ملء جميع الحقول");
      }

      const { error } = await supabase.from("notes").insert([
        {
          admission_id: admissionId,
          note_text: noteText.trim(),
          created_by: createdBy.trim(),
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
          <Card className="bg-muted/30 border-primary/20">
            <CardContent className="p-4 space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">الملاحظة</label>
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="اكتب الملاحظة هنا..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">اسم المُدخل</label>
                  <Input
                    value={createdBy}
                    onChange={(e) => setCreatedBy(e.target.value)}
                    placeholder="اسمك"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => addNoteMutation.mutate()}
                    disabled={addNoteMutation.isPending || !noteText.trim() || !createdBy.trim()}
                    className="w-full"
                  >
                    <Plus className="ml-2 h-4 w-4" />
                    إضافة ملاحظة
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes List */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              السجل ({notes?.length || 0})
            </h3>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
            ) : notes && notes.length > 0 ? (
              notes.map((note: any) => (
                <Card key={note.id} className="border-border hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {note.created_by}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(note.created_at), "yyyy-MM-dd HH:mm")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteNoteMutation.mutate(note.id)}
                        disabled={deleteNoteMutation.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {note.note_text}
                    </p>
                  </CardContent>
                </Card>
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
