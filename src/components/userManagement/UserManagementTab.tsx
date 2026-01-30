import * as React from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

type Role = "admin" | "backup_manager" | "doctor" | "nurse" | "records_clerk";

type AdminListUser = {
  id: string;
  email: string | null;
  created_at: string;
  role: Role | null;
  template?: string | null;
};

function roleLabel(role: Role | null) {
  switch (role) {
    case "admin":
      return "Admin";
    case "backup_manager":
      return "Backup Manager";
    case "doctor":
      return "Doctor";
    case "nurse":
      return "Nurse";
    case "records_clerk":
      return "Records Clerk";
    default:
      return "-";
  }
}

export default function UserManagementTab() {
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [checking, setChecking] = React.useState(true);

  const [users, setUsers] = React.useState<AdminListUser[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(false);

  const [newEmail, setNewEmail] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [newRole, setNewRole] = React.useState<Role>("records_clerk");
  const [creating, setCreating] = React.useState(false);

  const checkAdmin = React.useCallback(async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "me" } });
      if (error) throw error;
      setIsAdmin(!!data?.is_admin);
    } catch {
      setIsAdmin(false);
    } finally {
      setChecking(false);
    }
  }, []);

  const loadUsers = React.useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "list" } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setUsers((data?.users ?? []) as AdminListUser[]);
    } catch (err: any) {
      toast({ title: "تعذر تحميل المستخدمين", description: err?.message ?? "حدث خطأ", variant: "destructive" });
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  React.useEffect(() => {
    void checkAdmin();
  }, [checkAdmin]);

  React.useEffect(() => {
    if (isAdmin) void loadUsers();
  }, [isAdmin, loadUsers]);

  const createUser = async () => {
    const em = newEmail.trim();
    if (!em) return;
    if (newPassword.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "create", email: em, password: newPassword, role: newRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "تم إنشاء المستخدم" });
      setNewEmail("");
      setNewPassword("");
      setNewRole("records_clerk");
      await loadUsers();
    } catch (err: any) {
      toast({ title: "تعذر إنشاء المستخدم", description: err?.message ?? "حدث خطأ", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (checking) {
    return (
      <Card className="border">
        <CardContent className="p-6 text-center text-muted-foreground">جاري التحقق من صلاحياتك...</CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="border">
        <CardContent className="p-6 text-center space-y-2">
          <div className="font-semibold">هذه الصفحة للمسؤول فقط</div>
          <div className="text-sm text-muted-foreground">سجّل الدخول بحساب Admin لعرض وإضافة المستخدمين.</div>
          <div>
            <Button variant="outline" onClick={checkAdmin}>
              إعادة التحقق
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border">
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="newEmail">البريد الإلكتروني</Label>
              <Input id="newEmail" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPass">كلمة المرور</Label>
              <Input id="newPass" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label>الدور</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="backup_manager">Backup Manager</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="records_clerk">Records Clerk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={createUser} disabled={creating}>
              {creating ? "جاري الإنشاء..." : "إضافة مستخدم"}
            </Button>
            <Button variant="outline" onClick={loadUsers} disabled={loadingUsers}>
              {loadingUsers ? "جاري..." : "تحديث القائمة"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">البريد الإلكتروني</TableHead>
              <TableHead className="text-right">الدور</TableHead>
              <TableHead className="text-right">السياسة</TableHead>
              <TableHead className="text-right">تاريخ الإنشاء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.email ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "admin" ? "destructive" : "outline"}>{roleLabel(u.role)}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.template ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString("ar-EG")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
