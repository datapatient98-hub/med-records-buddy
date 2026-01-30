import * as React from "react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound, Link as LinkIcon, Shield } from "lucide-react";

type AdminUser = { id: string; email: string | null; created_at: string };

function maskEmail(email: string) {
  const [u, d] = email.split("@");
  if (!u || !d) return email;
  const visible = u.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, u.length - 2))}@${d}`;
}

export default function AdminRecovery() {
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [admins, setAdmins] = React.useState<AdminUser[]>([]);
  const [selectedEmail, setSelectedEmail] = React.useState<string>("");
  const [resetLink, setResetLink] = React.useState<string>("");

  const loadAdmins = async () => {
    setLoading(true);
    setResetLink("");
    try {
      const { data, error } = await supabase.functions.invoke("admin-recovery", {
        body: { action: "list_admins", code: code.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const list = (data?.admins ?? []) as AdminUser[];
      setAdmins(list);
      const firstEmail = list.find((a) => a.email)?.email ?? "";
      setSelectedEmail(firstEmail);
      if (list.length === 0) {
        toast({ title: "لا يوجد Admin", description: "لا يوجد حساب Admin مسجّل حاليًا." });
      }
    } catch (err: any) {
      toast({ title: "تعذر تحميل حسابات Admin", description: err?.message ?? "حدث خطأ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateLink = async () => {
    const em = selectedEmail.trim().toLowerCase();
    if (!em) return;
    setLoading(true);
    setResetLink("");
    try {
      const { data, error } = await supabase.functions.invoke("admin-recovery", {
        body: {
          action: "generate_reset_link",
          code: code.trim(),
          email: em,
          redirectTo: window.location.origin + "/reset-password",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const link = data?.action_link as string | null;
      if (!link) throw new Error("تعذر إنشاء رابط الاسترجاع");
      setResetLink(link);
      toast({ title: "تم إنشاء رابط الاسترجاع" });
    } catch (err: any) {
      toast({ title: "تعذر إنشاء الرابط", description: err?.message ?? "حدث خطأ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(resetLink);
      toast({ title: "تم النسخ" });
    } catch {
      toast({ title: "تعذر النسخ", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">استرجاع حساب Admin</CardTitle>
          <CardDescription>استخدم كود الاسترجاع لإظهار حساب الأدمن وإنشاء رابط إعادة تعيين كلمة المرور.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">كود الاسترجاع</Label>
            <div className="relative">
              <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} className="pr-10" placeholder="اكتب كود الاسترجاع" />
            </div>
          </div>

          <Button className="w-full" onClick={() => void loadAdmins()} disabled={loading || !code.trim()}>
            {loading ? "جاري..." : "عرض حسابات Admin"}
          </Button>

          {admins.length > 0 && (
            <div className="space-y-3 rounded-md border p-4">
              <div className="space-y-2">
                <Label>اختر Admin</Label>
                <Select value={selectedEmail} onValueChange={setSelectedEmail}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر" />
                  </SelectTrigger>
                  <SelectContent>
                    {admins
                      .filter((a) => a.email)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.email as string}>
                          {maskEmail(a.email as string)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" onClick={() => void generateLink()} disabled={loading || !selectedEmail}>
                {loading ? "جاري..." : "إنشاء رابط Reset Password"}
              </Button>

              {resetLink && (
                <div className="space-y-2">
                  <Label>رابط الاسترجاع</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={resetLink} className="text-xs" />
                    <Button type="button" variant="outline" onClick={() => void copyLink()}>
                      نسخ
                    </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                          // Open in same tab to avoid popup/new-tab blocking that prevents completing the recovery flow.
                          window.location.assign(resetLink);
                        }}
                      >
                        <LinkIcon className="h-4 w-4" />
                        فتح
                      </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
