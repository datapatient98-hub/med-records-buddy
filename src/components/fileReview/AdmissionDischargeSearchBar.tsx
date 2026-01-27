import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export function AdmissionDischargeSearchBar() {
  const navigate = useNavigate();
  const [q, setQ] = React.useState("");

  const go = () => {
    const v = (q ?? "").trim();
    if (!v) return;
    navigate(`/file-review/patient?q=${encodeURIComponent(v)}`);
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        بحث سريع (قومي / داخلي / موحد) — يفتح صفحة دخول/خروج (الأحدث فقط)
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                go();
              }
            }}
            placeholder="اكتب الرقم القومي أو الداخلي أو الموحد"
            className="pl-10"
          />
        </div>
        <Button type="button" onClick={go}>
          بحث
        </Button>
        <Button type="button" variant="secondary" onClick={() => setQ("")}
        >
          مسح
        </Button>
      </div>
    </div>
  );
}
