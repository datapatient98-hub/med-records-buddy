 import * as React from "react";
 import { useNavigate } from "react-router-dom";
 import Layout from "@/components/Layout";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Input } from "@/components/ui/input";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { ArrowRight, Download, Upload, Pencil, Trash2, Plus, Search } from "lucide-react";
 import { toast } from "sonner";
 import * as XLSX from "xlsx";
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
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { Label } from "@/components/ui/label";
 
 type LookupTable = {
   table: string;
   label: string;
   icon?: string;
 };
 
 const LOOKUP_TABLES: LookupTable[] = [
   { table: "departments", label: "الأقسام" },
   { table: "doctors", label: "الأطباء" },
   { table: "diagnoses", label: "التشخيصات" },
   { table: "governorates", label: "المحافظات" },
   { table: "districts", label: "المراكز/الأحياء" },
   { table: "stations", label: "المحطات" },
   { table: "occupations", label: "المهن" },
   { table: "hospitals", label: "المستشفيات" },
   { table: "exit_statuses", label: "حالات الخروج" },
 ];
 
 type LookupItem = {
   id: string;
   name: string;
   governorate_id?: string;
 };
 
 function TableManager({ table, label }: { table: string; label: string }) {
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
 
   const addMutation = useMutation<LookupItem, Error, string>({
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
 
   const updateMutation = useMutation<LookupItem, Error, { id: string; name: string }>({
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
 
   const deleteMutation = useMutation<void, Error, string>({
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
     const worksheet = XLSX.utils.json_to_sheet(
       items.map((item) => ({ الاسم: item.name }))
     );
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
     <div className="space-y-4">
       <div className="flex flex-wrap items-center justify-between gap-3">
         <div className="relative flex-1 min-w-[200px]">
           <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input
             placeholder={`بحث في ${label}...`}
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="pr-10"
           />
         </div>
         <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
             <Plus className="ml-2 h-4 w-4" />
             إضافة
           </Button>
           <Button variant="outline" size="sm" onClick={handleExport}>
             <Download className="ml-2 h-4 w-4" />
             تصدير
           </Button>
           <Button
             variant="outline"
             size="sm"
             onClick={() => fileInputRef.current?.click()}
           >
             <Upload className="ml-2 h-4 w-4" />
             استيراد
           </Button>
           <input
             type="file"
             ref={fileInputRef}
             accept=".xlsx,.xls"
             className="hidden"
             onChange={handleImport}
           />
         </div>
       </div>
 
       <Card>
         <CardContent className="p-0">
           {isLoading ? (
             <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
           ) : filteredItems.length === 0 ? (
             <div className="p-8 text-center text-muted-foreground">
               {search ? "لا توجد نتائج" : "لا توجد بيانات"}
             </div>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead className="text-right">الاسم</TableHead>
                   <TableHead className="text-center w-[100px]">الإجراءات</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filteredItems.map((item) => (
                   <TableRow key={item.id}>
                     <TableCell className="font-medium">{item.name}</TableCell>
                     <TableCell className="text-center">
                       <div className="flex items-center justify-center gap-2">
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => {
                             setEditItem(item);
                             setNewName(item.name);
                           }}
                         >
                           <Pencil className="h-4 w-4" />
                         </Button>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => setDeleteItem(item)}
                         >
                           <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                       </div>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           )}
         </CardContent>
       </Card>
 
       {/* Add Dialog */}
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
             <Button
               onClick={() => addMutation.mutate(newName)}
               disabled={!newName.trim() || addMutation.isPending}
             >
               إضافة
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* Edit Dialog */}
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
               onClick={() =>
                 editItem && updateMutation.mutate({ id: editItem.id, name: newName })
               }
               disabled={!newName.trim() || updateMutation.isPending}
             >
               حفظ
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* Delete Confirmation */}
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
 
 export default function MasterDataManagement() {
   const navigate = useNavigate();
 
   return (
     <Layout>
       <div className="space-y-6">
         <div className="flex items-center justify-between">
           <div>
             <h1 className="text-3xl font-bold">إدارة البيانات الأساسية</h1>
             <p className="text-sm text-muted-foreground">
               إضافة وتعديل وحذف واستيراد/تصدير بيانات الحقول
             </p>
           </div>
           <Button variant="outline" onClick={() => navigate(-1)}>
             <ArrowRight className="ml-2 h-4 w-4" />
             رجوع
           </Button>
         </div>
 
         <Tabs defaultValue="departments" dir="rtl" className="w-full">
           <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
             {LOOKUP_TABLES.slice(0, 5).map((t) => (
               <TabsTrigger key={t.table} value={t.table}>
                 {t.label}
               </TabsTrigger>
             ))}
           </TabsList>
           <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mt-2">
             {LOOKUP_TABLES.slice(5).map((t) => (
               <TabsTrigger key={t.table} value={t.table}>
                 {t.label}
               </TabsTrigger>
             ))}
           </TabsList>
 
           {LOOKUP_TABLES.map((t) => (
             <TabsContent key={t.table} value={t.table} className="pt-4">
               <TableManager table={t.table} label={t.label} />
             </TabsContent>
           ))}
         </Tabs>
       </div>
     </Layout>
   );
 }