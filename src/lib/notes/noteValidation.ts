import { z } from "zod";

export const createdBySchema = z
  .string()
  .trim()
  .min(1, "يرجى إدخال اسم المُدخل")
  .max(100, "اسم المُدخل طويل جداً");

export const noteTextSchema = z
  .string()
  .trim()
  .min(1, "لا يمكن حفظ ملاحظة فارغة")
  .max(2000, "الملاحظة طويلة جداً (الحد 2000 حرف)");

export const createNoteSchema = z.object({
  createdBy: createdBySchema,
  noteText: noteTextSchema,
});

export const updateNoteSchema = z.object({
  noteText: noteTextSchema,
});
