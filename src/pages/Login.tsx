import * as React from "react";

import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Lock, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname ?? "/";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [resetLoading, setResetLoading] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;

      toast({ title: "تم تسجيل الدخول" });
      navigate(from, { replace: true });
    } catch (err: any) {
      toast({ title: "خطأ في تسجيل الدخول", description: err?.message ?? "حدث خطأ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const em = email.trim();
    if (!em) {
      toast({ title: "اكتب البريد الإلكتروني أولاً", variant: "destructive" });
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(em, {
        // User will land on /reset-password with a recovery session.
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      toast({ title: "تم إرسال رابط إعادة تعيين كلمة المرور", description: "افتح الإيميل واتبع الخطوات." });
    } catch (err: any) {
      toast({ title: "تعذر إرسال رابط إعادة التعيين", description: err?.message ?? "حدث خطأ", variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Database className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
          <CardDescription>ادخل بحساب المسؤول/الموظف</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pr-10"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "جاري..." : "دخول"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void handleResetPassword()}
              disabled={resetLoading}
            >
              {resetLoading ? "جاري الإرسال..." : "نسيت كلمة المرور"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <button type="button" className="text-primary hover:underline" onClick={() => navigate("/setup")}
              >
                إنشاء حساب Admin أول مرة
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
