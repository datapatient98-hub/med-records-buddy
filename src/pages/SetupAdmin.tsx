import * as React from "react";

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Lock, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function SetupAdmin() {
  const navigate = useNavigate();

  const [sessionEmail, setSessionEmail] = React.useState<string | null>(null);
  const [checkingSession, setCheckingSession] = React.useState(true);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    // Subscribe first
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSessionEmail(session?.user?.email ?? null);
      setCheckingSession(false);
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSessionEmail(data.session?.user?.email ?? null);
      })
      .finally(() => {
        if (!mounted) return;
        setCheckingSession(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const em = email.trim();
    if (!em) return;
    if (password.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "خطأ", description: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("bootstrap-admin", {
        body: { email: em, password },
      });

      // If admin already exists, backend returns 400 with { error: "Admin already exists" }
      // Treat that as a non-fatal state and redirect to /login.
      if (error) {
        const msg = (error as any)?.message ?? "";
        const status = (error as any)?.context?.status;
        const body = (error as any)?.context?.body;
        const bodyErr =
          typeof body === "string"
            ? body
            : body && typeof body === "object"
              ? String((body as any).error ?? "")
              : "";

        const alreadyExists =
          status === 400 &&
          (msg.includes("Admin already exists") || bodyErr.includes("Admin already exists"));

        if (alreadyExists) {
          toast({
            title: "الأدمن موجود بالفعل",
            description: "تم إعداد حساب Admin مسبقًا. انتقل لتسجيل الدخول.",
          });
          navigate("/login", { replace: true });
          return;
        }

        throw error;
      }

      if (data?.error) {
        const msg = String(data.error);
        if (msg.includes("Admin already exists")) {
          toast({
            title: "الأدمن موجود بالفعل",
            description: "تم إعداد حساب Admin مسبقًا. انتقل لتسجيل الدخول.",
          });
          navigate("/login", { replace: true });
          return;
        }
        throw new Error(msg);
      }

      // Auto sign-in to avoid losing the credentials / confusion.
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: em, password });
      if (signInErr) {
        toast({ title: "تم إنشاء Admin", description: "تم إنشاء الحساب، لكن تعذر تسجيل الدخول تلقائيًا. جرّب من صفحة تسجيل الدخول.", variant: "destructive" });
        navigate("/login", { replace: true });
        return;
      }

      toast({ title: "تم إنشاء Admin وتسجيل الدخول" });
      navigate("/", { replace: true });
    } catch (err: any) {
      toast({ title: "تعذر إنشاء Admin", description: err?.message ?? "حدث خطأ", variant: "destructive" });
    } finally {
      setLoading(false);
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
          <CardTitle className="text-2xl">إعداد المسؤول (Admin)</CardTitle>
          <CardDescription>
            يتم استخدام هذا مرة واحدة لإنشاء أول حساب Admin.
            {sessionEmail ? " أنت مسجّل دخول بالفعل." : ""}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {checkingSession ? (
            <div className="text-center text-sm text-muted-foreground">جاري التحقق...</div>
          ) : sessionEmail ? (
            <div className="space-y-3">
              <div className="rounded-md border bg-card p-4 text-sm">
                <div className="font-semibold">لا تحتاج لإنشاء Admin جديد</div>
                <div className="text-muted-foreground mt-1">
                  أنت مسجّل دخول بالحساب: <span className="font-mono">{sessionEmail}</span>
                </div>
              </div>

              <Button className="w-full" onClick={() => navigate("/unified-database", { replace: true })}>
                فتح إدارة المستخدمين والصلاحيات
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/login", { replace: true });
                }}
              >
                تسجيل خروج
              </Button>
            </div>
          ) : (
          <form onSubmit={handleCreate} className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="confirm">تأكيد كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pr-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "جاري الإنشاء..." : "إنشاء Admin"}
            </Button>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
