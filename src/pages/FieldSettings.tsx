import * as React from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFieldConfig } from "@/components/FieldConfigProvider";
import { FIELD_DEFINITIONS, type FieldDefinition, type ModuleKey } from "@/lib/fieldConfig";
import { ArrowRight, RotateCcw, Settings, Plus, Pencil, Trash2, Download, Upload, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import ExcelSourcesSettings from "@/components/ExcelSourcesSettings";
import BackupCenterTab from "@/components/backup/BackupCenterTab";

type LookupItem = {
  id: string;
  name: string;
};

type LookupTable = {
  table: string;
  label: string;
};

// Lookup tables per module
const MODULE_LOOKUPS: Record<string, LookupTable[]> = {
  admission: [
    { table: "departments", label: "الأقسام" },
    { table: "doctors", label: "الأطباء" },
    { table: "diagnoses", label: "التشخيصات" },
    { table: "governorates", label: "المحافظات" },
    { table: "districts", label: "المراكز/الأحياء" },
    { table: "stations", label: "المحطات" },
    { table: "occupations", label: "المهن" },
  ],
  discharge: [
    { table: "departments", label: "أقسام الخروج" },
    { table: "doctors", label: "أطباء الخروج" },
    { table: "diagnoses", label: "تشخيصات الخروج" },
    { table: "hospitals", label: "المستشفيات" },
    { table: "exit_statuses", label: "حالات الخروج" },
  ],
  endoscopy: [
    { table: "departments", label: "قسم المناظير" },
    { table: "doctors", label: "الأطباء" },
    { table: "diagnoses", label: "التشخيصات" },
    { table: "exit_statuses", label: "حالات الخروج" },
  ],
  procedures: [
    { table: "departments", label: "الأقسام" },
    { table: "doctors", label: "الأطباء" },
    { table: "diagnoses", label: "التشخيصات" },
  ],
};

function groupBy<T, K extends string>(items: T[], getKey: (t: T) => K) {
  return items.reduce((acc, item) => {
    const k = getKey(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

function LookupManager({ table, label }: { table: string; label: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [editItem, setEditItem] = React.useState<LookupItem | null>(null);
  const [deleteItem, setDeleteItem] = React.useState<LookupItem | null>(null);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table as any).select("*").order("name");
      if (error) throw error;
      return ((data ?? []) as unknown) as LookupItem[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from(table as any).insert({ name }).select().single();
      if (error) throw error;
      return (data as unknown) as LookupItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success("تم الإضافة بنجاح");
      setAddDialogOpen(false);
      setNewName("");
    },
    onError: (error: any) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase.from(table as any).update({ name }).eq("id", id).select().single();
      if (error) throw error;
      return (data as unknown) as LookupItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success("تم التعديل بنجاح");
      setEditItem(null);
      setNewName("");
    },
    onError: (error: any) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success("تم الحذف بنجاح");
      setDeleteItem(null);
    },
    onError: (error: any) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const handleExport = () => {
    if (!items.length) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(items.map((item) => ({ الاسم: item.name })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, label);
    XLSX.writeFile(workbook, `${label}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("تم التصدير بنجاح");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const names = jsonData
        .map((row) => row["الاسم"] || row["name"] || row["Name"])
        .filter((name) => name && typeof name === "string" && name.trim());

      if (!names.length) {
        toast.error("لم يتم العثور على بيانات صالحة في الملف");
        return;
      }

      const { error } = await supabase.from(table as any).insert(names.map((name) => ({ name })));
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: [table] });
      toast.success(`تم استيراد ${names.length} سجل بنجاح`);
    } catch (error: any) {
      toast.error(`خطأ في الاستيراد: ${error.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`بحث في ${label}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="ml-1 h-3 w-3" />
            إضافة
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="ml-1 h-3 w-3" />
            تصدير
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="ml-1 h-3 w-3" />
            استيراد
          </Button>
          <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground text-sm">جاري التحميل...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              {search ? "لا توجد نتائج" : "لا توجد بيانات"}
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted z-10">
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-center w-[80px]">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-sm">{item.name}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditItem(item);
                              setNewName(item.name);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteItem(item)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة {label}</DialogTitle>
            <DialogDescription>أدخل اسم العنصر الجديد</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">الاسم</Label>
              <Input
                id="add-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`أدخل اسم ${label}`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={() => addMutation.mutate(newName)} disabled={!newName.trim() || addMutation.isPending}>
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل {label}</DialogTitle>
            <DialogDescription>قم بتعديل اسم العنصر</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">الاسم</Label>
              <Input
                id="edit-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`أدخل اسم ${label}`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              إلغاء
            </Button>
            <Button
              onClick={() => editItem && updateMutation.mutate({ id: editItem.id, name: newName })}
              disabled={!newName.trim() || updateMutation.isPending}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "{deleteItem?.name}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ModuleEditor({ module, title, description }: { module: ModuleKey; title: string; description: string }) {
  const { getRule, setRule } = useFieldConfig();
  const items = React.useMemo(() => FIELD_DEFINITIONS.filter((d) => d.module === module), [module]);
  const grouped = React.useMemo(() => groupBy(items, (d) => (d.group || "أخرى") as string), [items]);
  const groups = React.useMemo(() => Object.keys(grouped), [grouped]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {groups.map((g) => (
          <div key={g} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{g}</div>
              <div className="text-xs text-muted-foreground">إظهار / إلزام</div>
            </div>
            <Separator />
            <div className="space-y-2">
              {grouped[g].map((f: FieldDefinition) => {
                const rule = getRule(module, f.key);
                return (
                  <div key={f.key} className="flex items-center justify-between gap-4 rounded-md border bg-card/50 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{f.label}</div>
                      <div className="text-xs text-muted-foreground">{f.key}</div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">إظهار</span>
                        <Switch checked={rule.visible} onCheckedChange={(v) => setRule(module, f.key, { visible: v })} />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">إلزام</span>
                        <Switch
                          checked={rule.required}
                          disabled={!rule.visible}
                          onCheckedChange={(v) => setRule(module, f.key, { required: v })}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ModuleSettings({ module, title, description }: { module: ModuleKey; title: string; description: string }) {
  const lookups = MODULE_LOOKUPS[module] || [];
  
  return (
    <div className="space-y-4">
      <Tabs defaultValue="fields" dir="rtl" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fields">إدارة الحقول</TabsTrigger>
          <TabsTrigger value="data">إدارة البيانات الأساسية</TabsTrigger>
        </TabsList>
        
        <TabsContent value="fields" className="pt-4">
          <ModuleEditor module={module} title={title} description={description} />
        </TabsContent>
        
        <TabsContent value="data" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>البيانات الأساسية</CardTitle>
              <CardDescription>إدارة {title} - إضافة وتعديل وحذف واستيراد/تصدير</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {lookups.map((lookup) => (
                <div key={lookup.table} className="space-y-2">
                  <h4 className="text-sm font-semibold">{lookup.label}</h4>
                  <LookupManager table={lookup.table} label={lookup.label} />
                </div>
              ))}
              {lookups.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  لا توجد بيانات أساسية لهذا القسم
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function FieldSettings() {
  const navigate = useNavigate();
  const { reset } = useFieldConfig();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">إدارة الحقول</h1>
            <p className="text-sm text-muted-foreground">تحكم في إظهار الحقول وجعلها إلزامية لكل نموذج.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowRight className="ml-2 h-4 w-4" />
              رجوع
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                reset();
              }}
            >
              <RotateCcw className="ml-2 h-4 w-4" />
              إعادة ضبط
            </Button>
          </div>
        </div>

        <Tabs defaultValue="admission" dir="rtl" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
            <TabsTrigger value="admission">الدخول</TabsTrigger>
            <TabsTrigger value="discharge">الخروج</TabsTrigger>
            <TabsTrigger value="endoscopy">المناظير</TabsTrigger>
            <TabsTrigger value="procedures">البذل/الاستقبال/الكلي</TabsTrigger>
            <TabsTrigger value="excel-sources">مصادر الإكسل</TabsTrigger>
            <TabsTrigger value="backup">النسخ الاحتياطي</TabsTrigger>
          </TabsList>

          <TabsContent value="admission" className="pt-4">
            <ModuleSettings 
              module="admission" 
              title="إعدادات الدخول" 
              description="إدارة الحقول والبيانات الأساسية لصفحة تسجيل الدخول" 
            />
          </TabsContent>

          <TabsContent value="discharge" className="pt-4">
            <ModuleSettings 
              module="discharge" 
              title="إعدادات الخروج" 
              description="إدارة الحقول والبيانات الأساسية لصفحة تسجيل الخروج" 
            />
          </TabsContent>

          <TabsContent value="endoscopy" className="pt-4">
            <ModuleSettings 
              module="endoscopy" 
              title="إعدادات المناظير" 
              description="إدارة الحقول والبيانات الأساسية لنموذج المناظير" 
            />
          </TabsContent>
          
          <TabsContent value="procedures" className="pt-4">
            <ModuleSettings 
              module="procedures" 
              title="إعدادات الإجراءات (بذل/استقبال/كلي)" 
              description="إدارة الحقول والبيانات الأساسية لنموذج الإجراءات الطبية" 
            />
          </TabsContent>

          <TabsContent value="excel-sources" className="pt-4">
            <ExcelSourcesSettings />
          </TabsContent>

          <TabsContent value="backup" className="pt-4">
            <BackupCenterTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
