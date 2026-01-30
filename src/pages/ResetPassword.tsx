import * as React from "react";

import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    // When coming from the reset link, Supabase creates a recovery session.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setReady(!!data.session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    if (pw !== pw2) {
      toast({ title: "خطأ", description: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;

      toast({ title: "تم تحديث كلمة المرور" });
      navigate("/login", { replace: true });
    } catch (err: any) {
      toast({ title: "تعذر تحديث كلمة المرور", description: err?.message ?? "حدث خطأ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">تعيين كلمة مرور جديدة</CardTitle>
          <CardDescription>
            {ready
              ? "اكتب كلمة مرور جديدة ثم احفظ."
              : "افتح الرابط من الإيميل أولاً ثم أعد المحاولة."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">كلمة المرور الجديدة</Label>
              <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="pr-3" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw2">تأكيد كلمة المرور</Label>
              <Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="pr-3" />
            </div>
            <Button type="submit" className="w-full" disabled={!ready || loading}>
              {loading ? "جاري الحفظ..." : "حفظ كلمة المرور"}
            </Button>

            <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/login")}>
              رجوع لتسجيل الدخول
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
