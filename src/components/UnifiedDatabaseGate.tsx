import { ReactNode, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function UnifiedDatabaseGate({
  code,
  children,
}: {
  code: string;
  children: ReactNode;
}) {
  const key = useMemo(() => `gate_unified_database_${code}`, [code]);
  const [entered, setEntered] = useState("");
  const [isAllowed, setIsAllowed] = useState(() => sessionStorage.getItem(key) === "1");

  if (isAllowed) return <>{children}</>;

  return (
    <div className="min-h-[50vh] grid place-items-center">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">دخول قاعدة البيانات</h1>
          <p className="text-sm text-muted-foreground">اكتب الكود لفتح الصفحة.</p>
        </div>

        <Input value={entered} onChange={(e) => setEntered(e.target.value)} placeholder="اكتب الكود هنا..." />

        <Button
          className="w-full"
          onClick={() => {
            if (entered === code) {
              sessionStorage.setItem(key, "1");
              setIsAllowed(true);
            }
          }}
        >
          فتح
        </Button>
      </Card>
    </div>
  );
}
