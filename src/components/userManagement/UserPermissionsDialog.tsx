import * as React from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { PERMISSION_FIELDS, type PermissionKey, type TriState } from "@/components/userManagement/permissionFields";

type Template = { id: string; name: string; description?: string | null };
type Overrides = Partial<Record<PermissionKey, TriState>>;

function triStateLabel(v: TriState) {
  if (v === null) return "وراثة من القالب";
  return v ? "سماح" : "منع";
}

function TriStateSelect({ value, onChange }: { value: TriState; onChange: (v: TriState) => void }) {
  return (
    <Select value={value === null ? "inherit" : value ? "allow" : "deny"} onValueChange={(v) => onChange(v === "inherit" ? null : v === "allow")}>
      <SelectTrigger className="h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="inherit">وراثة من القالب</SelectItem>
        <SelectItem value="allow">سماح</SelectItem>
        <SelectItem value="deny">منع</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default function UserPermissionsDialog({
  open,
  onOpenChange,
  user,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: { id: string; email: string | null; role: string | null; template_id?: string | null };
  onSaved: () => void;
}) {
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [templateId, setTemplateId] = React.useState<string | null>(user.template_id ?? null);
  const [overrides, setOverrides] = React.useState<Overrides>({});

  React.useEffect(() => {
    if (!open) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: templatesRes, error: tmplErr }, { data: accessRes, error: accessErr }] = await Promise.all([
          supabase.functions.invoke("admin-users", { body: { action: "templates" } }),
          supabase.functions.invoke("admin-users", { body: { action: "get_user_access", user_id: user.id } }),
        ]);
        if (tmplErr) throw tmplErr;
        if (accessErr) throw accessErr;

        if (!mounted) return;
        setTemplates((templatesRes?.templates ?? []) as Template[]);
        setTemplateId(accessRes?.template_id ?? null);

        const o: Overrides = {};
        const raw = (accessRes?.overrides ?? {}) as any;
        for (const f of PERMISSION_FIELDS) {
          const v = raw?.[f.key];
          o[f.key] = v === true ? true : v === false ? false : null;
        }
        setOverrides(o);
      } catch (err: any) {
        toast({ title: "تعذر تحميل الصلاحيات", description: err?.message ?? "حدث خطأ", variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [open, user.id]);

  React.useEffect(() => {
    if (!open) return;
    setTemplateId(user.template_id ?? null);
  }, [open, user.template_id]);

  const grouped = React.useMemo(() => {
    const groups = {
      pages: PERMISSION_FIELDS.filter((f) => f.group === "pages"),
      ops: PERMISSION_FIELDS.filter((f) => f.group === "ops"),
      special: PERMISSION_FIELDS.filter((f) => f.group === "special"),
    };
    return groups;
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = { action: "update_user_access", user_id: user.id, template_id: templateId, overrides: {} };
      for (const f of PERMISSION_FIELDS) {
        (payload.overrides as any)[f.key] = overrides[f.key] ?? null;
      }

      const { data, error } = await supabase.functions.invoke("admin-users", { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "تم حفظ الصلاحيات" });
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast({ title: "تعذر حفظ الصلاحيات", description: err?.message ?? "حدث خطأ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>تخصيص صلاحيات المستخدم</DialogTitle>
          <DialogDescription>
            المستخدم: <span className="font-mono">{user.email ?? user.id}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-sm text-muted-foreground">جاري التحميل...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>قالب الصلاحيات</Label>
                <Select value={templateId ?? "none"} onValueChange={(v) => setTemplateId(v === "none" ? null : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر قالب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون قالب (الافتراضي = منع)</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {templateId ? (
                  <div className="text-xs text-muted-foreground">
                    {templates.find((t) => t.id === templateId)?.description ?? ""}
                  </div>
                ) : null}
              </div>

              <div className="rounded-md border p-3 text-sm">
                <div className="font-semibold">طريقة العمل</div>
                <div className="text-muted-foreground mt-1">
                  كل صلاحية لها 3 حالات: <span className="font-medium">وراثة</span> من القالب / <span className="font-medium">سماح</span> / <span className="font-medium">منع</span>.
                </div>
              </div>
            </div>

            <Separator />

            <section className="space-y-3">
              <div className="font-semibold">الصفحات</div>
              <div className="grid gap-3 md:grid-cols-2">
                {grouped.pages.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <div className="text-sm">{f.label}</div>
                    <TriStateSelect
                      value={(overrides[f.key] ?? null) as TriState}
                      onChange={(v) => setOverrides((prev) => ({ ...prev, [f.key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <div className="font-semibold">العمليات (CRUD)</div>
              <div className="grid gap-3 md:grid-cols-2">
                {grouped.ops.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <div className="text-sm">{f.label}</div>
                    <TriStateSelect
                      value={(overrides[f.key] ?? null) as TriState}
                      onChange={(v) => setOverrides((prev) => ({ ...prev, [f.key]: v }))}
                    />
                    {f.hint ? <div className="text-xs text-muted-foreground">{f.hint}</div> : null}
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <div className="font-semibold">صلاحيات خاصة</div>
              <div className="grid gap-3 md:grid-cols-2">
                {grouped.special.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <div className="text-sm">{f.label}</div>
                    <TriStateSelect
                      value={(overrides[f.key] ?? null) as TriState}
                      onChange={(v) => setOverrides((prev) => ({ ...prev, [f.key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </section>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                إلغاء
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              ملاحظة: "وراثة" تعني الاعتماد على القالب. لو مفيش قالب، فالوراثة = منع.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
