import { supabase } from "@/integrations/supabase/client";

export type ExcelSourceKey = "excel_source_admissions" | "excel_source_discharges" | "excel_source_services";

async function getAuthHeader(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? `Bearer ${token}` : null;
}

function functionUrl(name: string) {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return `${base}/functions/v1/${name}`;
}

export async function uploadExcelSourceFile(args: { key: ExcelSourceKey; file: File }) {
  const auth = await getAuthHeader();
  if (!auth) throw new Error("يجب تسجيل الدخول أولاً");

  const url = new URL(functionUrl("excel-source-file"));
  url.searchParams.set("key", args.key);
  url.searchParams.set("file_name", args.file.name);

  const resp = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    body: await args.file.arrayBuffer(),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error((data as any)?.error || "تعذر رفع الملف");

  return data as { ok: true; bucket: string; path: string; fileName: string };
}

export async function getExcelSourceSignedUrl(args: { key: ExcelSourceKey; expiresIn?: number }) {
  const auth = await getAuthHeader();
  if (!auth) throw new Error("يجب تسجيل الدخول أولاً");

  const resp = await fetch(functionUrl("excel-source-file"), {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "signed_url", key: args.key, expires_in: args.expiresIn ?? 60 }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error((data as any)?.error || "تعذر إنشاء رابط تحميل");
  if (!(data as any)?.signedUrl) throw new Error("تعذر إنشاء رابط تحميل");

  return data as { ok: true; bucket: string; path: string; signedUrl: string; expiresIn: number };
}
