import * as React from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useFieldConfig } from "@/components/FieldConfigProvider";
import { FIELD_DEFINITIONS, type FieldDefinition, type ModuleKey } from "@/lib/fieldConfig";
import { ArrowRight, RotateCcw, Settings } from "lucide-react";

function groupBy<T, K extends string>(items: T[], getKey: (t: T) => K) {
  return items.reduce((acc, item) => {
    const k = getKey(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="admission">الدخول</TabsTrigger>
            <TabsTrigger value="discharge">الخروج</TabsTrigger>
            <TabsTrigger value="procedures">الإجراءات</TabsTrigger>
          </TabsList>

          <TabsContent value="admission" className="pt-4">
            <ModuleEditor module="admission" title="حقول الدخول" description="تظهر/تُخفى وتصبح إلزامية داخل صفحة تسجيل الدخول." />
          </TabsContent>

          <TabsContent value="discharge" className="pt-4">
            <ModuleEditor module="discharge" title="حقول الخروج" description="تظهر/تُخفى وتصبح إلزامية داخل صفحة تسجيل الخروج." />
          </TabsContent>

          <TabsContent value="procedures" className="pt-4 space-y-4">
            <ModuleEditor module="procedures" title="حقول الإجراءات (بذل/استقبال/كلي)" description="تنطبق على نموذج الإجراءات الطبية (غير المناظير)." />
            <ModuleEditor module="endoscopy" title="حقول المناظير" description="تنطبق على نموذج المناظير داخل الإجراءات الطبية." />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
