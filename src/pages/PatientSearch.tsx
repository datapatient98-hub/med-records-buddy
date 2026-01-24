 import { useState } from "react";
 import Layout from "@/components/Layout";
 import { Input } from "@/components/ui/input";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { useToast } from "@/hooks/use-toast";
 import { supabase } from "@/integrations/supabase/client";
 import { Search, User, FileText, Activity, Microscope, Syringe, FileArchive } from "lucide-react";
 import { Badge } from "@/components/ui/badge";
 import { Separator } from "@/components/ui/separator";
 
 export default function PatientSearch() {
   const { toast } = useToast();
   const [searchQuery, setSearchQuery] = useState("");
   const [searchResults, setSearchResults] = useState<any>(null);
   const [loading, setLoading] = useState(false);
 
   const handleSearch = async () => {
     if (!searchQuery.trim()) {
       toast({
         title: "خطأ",
         description: "الرجاء إدخال رقم موحد أو اسم للبحث",
         variant: "destructive",
       });
       return;
     }
 
     setLoading(true);
     try {
       // Search in admissions by unified_number or patient_name
       const { data: admissions, error: admError } = await supabase
         .from("admissions")
         .select("*, departments(name), doctors(name), diagnoses(name)")
         .or(`unified_number.eq.${searchQuery},patient_name.ilike.%${searchQuery}%`)
         .order("created_at", { ascending: false });
 
       if (admError) throw admError;
 
       if (!admissions || admissions.length === 0) {
         toast({
           title: "لم يتم العثور على نتائج",
           description: "لا توجد بيانات للرقم أو الاسم المدخل",
           variant: "destructive",
         });
         setSearchResults(null);
         return;
       }
 
       // Get first admission to search related records
       const firstAdmission = admissions[0];
 
       // Get discharges
       const { data: discharges } = await supabase
         .from("discharges")
         .select("*, discharge_department:departments(name), discharge_doctor:doctors(name), discharge_diagnosis:diagnoses(name)")
         .eq("admission_id", firstAdmission.id)
         .order("discharge_date", { ascending: false });
 
       // Get procedures
       const { data: procedures } = await supabase
         .from("procedures")
         .select("*, departments(name), doctors(name), diagnoses(name)")
         .eq("unified_number", firstAdmission.unified_number)
         .order("procedure_date", { ascending: false });
 
       // Get file loans
       const { data: loans } = await supabase
         .from("file_loans")
         .select("*")
         .eq("unified_number", firstAdmission.unified_number)
         .order("loan_date", { ascending: false });
 
       setSearchResults({
         patient: firstAdmission,
         admissions,
         discharges: discharges || [],
         procedures: procedures || [],
         loans: loans || [],
       });
     } catch (error: any) {
       toast({
         title: "خطأ في البحث",
         description: error.message,
         variant: "destructive",
       });
     } finally {
       setLoading(false);
     }
   };
 
   return (
     <Layout>
       <div className="space-y-6">
         <div>
           <h2 className="text-3xl font-bold text-foreground">البحث عن مريض</h2>
           <p className="text-muted-foreground">ابحث بالرقم الموحد أو الاسم لعرض جميع بيانات المريض</p>
         </div>
 
         {/* Search Section */}
         <Card className="shadow-lg border-border">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Search className="h-5 w-5" />
               بحث
             </CardTitle>
             <CardDescription>أدخل الرقم الموحد أو اسم المريض</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="flex gap-2">
               <Input
                 placeholder="الرقم الموحد أو اسم المريض"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                 className="flex-1"
               />
               <Button onClick={handleSearch} disabled={loading}>
                 <Search className="ml-2 h-4 w-4" />
                 {loading ? "جاري البحث..." : "بحث"}
               </Button>
             </div>
           </CardContent>
         </Card>
 
         {/* Results */}
         {searchResults && (
           <div className="space-y-6">
             {/* Patient Info */}
             <Card className="shadow-lg border-border">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <User className="h-5 w-5 text-primary" />
                   بيانات المريض
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="grid gap-4 md:grid-cols-4">
                   <div className="p-3 rounded-lg bg-secondary/50">
                     <p className="text-xs text-muted-foreground">الرقم الموحد</p>
                     <p className="font-semibold">{searchResults.patient.unified_number}</p>
                   </div>
                   <div className="p-3 rounded-lg bg-secondary/50">
                     <p className="text-xs text-muted-foreground">اسم المريض</p>
                     <p className="font-semibold">{searchResults.patient.patient_name}</p>
                   </div>
                   <div className="p-3 rounded-lg bg-secondary/50">
                     <p className="text-xs text-muted-foreground">الرقم القومي</p>
                     <p className="font-semibold">{searchResults.patient.national_id}</p>
                   </div>
                   <div className="p-3 rounded-lg bg-secondary/50">
                     <p className="text-xs text-muted-foreground">النوع</p>
                     <p className="font-semibold">{searchResults.patient.gender}</p>
                   </div>
                   <div className="p-3 rounded-lg bg-secondary/50">
                     <p className="text-xs text-muted-foreground">السن</p>
                     <p className="font-semibold">{searchResults.patient.age}</p>
                   </div>
                   <div className="p-3 rounded-lg bg-secondary/50">
                     <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                     <p className="font-semibold">{searchResults.patient.phone}</p>
                   </div>
                   <div className="p-3 rounded-lg bg-secondary/50">
                     <p className="text-xs text-muted-foreground">الحالة الاجتماعية</p>
                     <p className="font-semibold">{searchResults.patient.marital_status}</p>
                   </div>
                   <div className="p-3 rounded-lg bg-secondary/50">
                     <p className="text-xs text-muted-foreground">العنوان</p>
                     <p className="font-semibold">{searchResults.patient.address_details || "-"}</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
 
             {/* Admissions */}
             {searchResults.admissions.length > 0 && (
               <Card className="shadow-lg border-border">
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <FileText className="h-5 w-5 text-blue-500" />
                     سجلات الدخول ({searchResults.admissions.length})
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-3">
                     {searchResults.admissions.map((adm: any, idx: number) => (
                       <div key={adm.id} className="p-4 rounded-lg border border-border">
                         <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                             <Badge variant="outline">#{adm.internal_number}</Badge>
                             <Badge variant={adm.admission_status === "محجوز" ? "default" : "secondary"}>
                               {adm.admission_status}
                             </Badge>
                           </div>
                           <p className="text-sm text-muted-foreground">
                             {new Date(adm.admission_date).toLocaleString("ar-EG")}
                           </p>
                         </div>
                         <div className="grid gap-2 md:grid-cols-3 text-sm">
                           <p><span className="text-muted-foreground">القسم:</span> {adm.departments?.name || "-"}</p>
                           <p><span className="text-muted-foreground">التشخيص:</span> {adm.diagnoses?.name || "-"}</p>
                           <p><span className="text-muted-foreground">الطبيب:</span> {adm.doctors?.name || "-"}</p>
                         </div>
                         {idx < searchResults.admissions.length - 1 && <Separator className="mt-3" />}
                       </div>
                     ))}
                   </div>
                 </CardContent>
               </Card>
             )}
 
             {/* Discharges */}
             {searchResults.discharges.length > 0 && (
               <Card className="shadow-lg border-border">
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <Activity className="h-5 w-5 text-green-500" />
                     سجلات الخروج ({searchResults.discharges.length})
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-3">
                     {searchResults.discharges.map((discharge: any) => (
                       <div key={discharge.id} className="p-4 rounded-lg border border-border">
                         <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                             <Badge variant="outline">#{discharge.internal_number}</Badge>
                             <Badge>{discharge.discharge_status}</Badge>
                           </div>
                           <p className="text-sm text-muted-foreground">
                             {new Date(discharge.discharge_date).toLocaleString("ar-EG")}
                           </p>
                         </div>
                         <div className="grid gap-2 md:grid-cols-3 text-sm">
                           <p><span className="text-muted-foreground">القسم:</span> {discharge.discharge_department?.name || "-"}</p>
                           <p><span className="text-muted-foreground">التشخيص:</span> {discharge.discharge_diagnosis?.name || "-"}</p>
                           <p><span className="text-muted-foreground">الطبيب:</span> {discharge.discharge_doctor?.name || "-"}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                 </CardContent>
               </Card>
             )}
 
             {/* Procedures */}
             {searchResults.procedures.length > 0 && (
               <Card className="shadow-lg border-border">
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <Syringe className="h-5 w-5 text-purple-500" />
                     الإجراءات الطبية ({searchResults.procedures.length})
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-3">
                     {searchResults.procedures.map((proc: any) => (
                       <div key={proc.id} className="p-4 rounded-lg border border-border">
                         <div className="flex items-center justify-between mb-2">
                           <Badge variant="secondary">{proc.procedure_type || "بذل"}</Badge>
                           <p className="text-sm text-muted-foreground">
                             {new Date(proc.procedure_date).toLocaleString("ar-EG")}
                           </p>
                         </div>
                         <div className="grid gap-2 md:grid-cols-3 text-sm">
                           <p><span className="text-muted-foreground">القسم:</span> {proc.departments?.name || "-"}</p>
                           <p><span className="text-muted-foreground">التشخيص:</span> {proc.diagnoses?.name || "-"}</p>
                           <p><span className="text-muted-foreground">الطبيب:</span> {proc.doctors?.name || "-"}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                 </CardContent>
               </Card>
             )}
 
             {/* File Loans */}
             {searchResults.loans.length > 0 && (
               <Card className="shadow-lg border-border">
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <FileArchive className="h-5 w-5 text-orange-500" />
                     إعارة الملفات ({searchResults.loans.length})
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-3">
                     {searchResults.loans.map((loan: any) => (
                       <div key={loan.id} className="p-4 rounded-lg border border-border">
                         <div className="flex items-center justify-between mb-2">
                           <Badge variant={loan.is_returned ? "secondary" : "destructive"}>
                             {loan.is_returned ? "تم الإرجاع" : "لم يتم الإرجاع"}
                           </Badge>
                           <p className="text-sm text-muted-foreground">
                             {new Date(loan.loan_date).toLocaleString("ar-EG")}
                           </p>
                         </div>
                         <div className="grid gap-2 md:grid-cols-2 text-sm">
                           <p><span className="text-muted-foreground">المستعير:</span> {loan.borrowed_by}</p>
                           <p><span className="text-muted-foreground">القسم:</span> {loan.borrowed_to_department}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                 </CardContent>
               </Card>
             )}
           </div>
         )}
       </div>
     </Layout>
   );
 }