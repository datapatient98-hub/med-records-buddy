import { ReactNode, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  UserPlus,
  LogOut,
  Microscope,
  AlertTriangle,
  Syringe,
  FileArchive,
  Users,
  FileText,
  Database,
  Search,
  Home,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import UnifiedPatientHistoryDialog, {
  type UnifiedHistoryPayload,
} from "@/components/UnifiedPatientHistoryDialog";
import { findUnifiedNumberForTopSearch, fetchUnifiedHistoryPayload } from "@/lib/topSearch";

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "لوحة التحكم", href: "/", icon: Home },
  { name: "تسجيل دخول", href: "/admission", icon: UserPlus },
  { name: "تسجيل خروج", href: "/discharge", icon: LogOut },
  { name: "الإجراءات الطبية", href: "/medical-procedures", icon: Microscope },
  { name: "الاستعارات", href: "/loans", icon: FileArchive },
  { name: "مراجعة الملفات", href: "/patient-search", icon: AlertTriangle },
  { name: "سجل المرضى", href: "/records", icon: Users },
  { name: "قاعدة البيانات الموحدة", href: "/unified-database", icon: Database },
  { name: "التقارير", href: "/reports", icon: FileText },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const lastSearchedRef = useRef<string>("");
  const [topSearchLoading, setTopSearchLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPayload, setHistoryPayload] = useState<UnifiedHistoryPayload | null>(null);
  const [noResultOpen, setNoResultOpen] = useState(false);
  const [noResultQuery, setNoResultQuery] = useState("");

  const shouldShowHeaderSearch = useMemo(() => {
    // Keep header search visible everywhere (it is the primary navigation tool).
    return true;
  }, [location.pathname]);

  const runTopSearch = async (qRaw: string) => {
    const q = (qRaw ?? "").trim();
    if (!q) return;
    if (lastSearchedRef.current === q) return;

    lastSearchedRef.current = q;
    setTopSearchLoading(true);
    try {
      const unifiedNumber = await findUnifiedNumberForTopSearch(supabase, q);
      if (!unifiedNumber) {
        setHistoryOpen(false);
        setHistoryPayload(null);
        setNoResultQuery(q);
        setNoResultOpen(true);
        return;
      }

      const payload = await fetchUnifiedHistoryPayload(supabase, unifiedNumber);
      setHistoryPayload(payload);
      setHistoryOpen(true);
      setNoResultOpen(false);
    } finally {
      setTopSearchLoading(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runTopSearch(searchQuery);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-16 items-center justify-between px-6">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <Database className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-lg font-bold text-foreground">نظام السجلات الطبية</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                مستشفى حميات دمنهور شعار
              </p>
            </div>
          </div>

          {/* Search Bar */}
          {shouldShowHeaderSearch && (
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl mx-8 hidden md:flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">بحث</span>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="الاسم (حرفي) / الرقم الموحد / الداخلي / القومي / الهاتف"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => runTopSearch(searchQuery)}
                  className="pl-10 bg-background border-border focus-visible:ring-2 focus-visible:ring-primary/40"
                />
              </div>
              <Button type="submit" variant="default" disabled={topSearchLoading}>
                {topSearchLoading ? "جاري..." : "بحث"}
              </Button>
            </form>
          )}


          {/* Right Side - Notifications, Excel Status & Theme Toggle */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ExcelConnectionIndicator />
            <ThemeToggle />
          </div>
        </div>

        {/* Navigation Links */}
        <div className="border-t border-border bg-card">
          <nav className="container px-6">
            <div className="flex items-center gap-1 overflow-x-auto">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap border-b-2",
                      isActive
                        ? "border-primary text-primary bg-primary/10"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-6 py-6">
        {children}
      </main>

      {/* Top search dialogs */}
      <UnifiedPatientHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} payload={historyPayload} />

      <Dialog open={noResultOpen} onOpenChange={setNoResultOpen}>
        <DialogContent className="max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>نتيجة البحث</DialogTitle>
            <DialogDescription>إشعار بنتيجة البحث في النظام.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-foreground font-semibold">لا توجد بيانات لهذا الرقم/النص</p>
            <p className="text-sm text-muted-foreground">المدخل: <span className="font-mono">{noResultQuery || "-"}</span></p>
            <p className="text-sm text-muted-foreground">
              جرّب التأكد من: الاسم الحرفي، الرقم الموحد، الرقم الداخلي، الرقم القومي، أو رقم الهاتف.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExcelConnectionIndicator() {
  // TODO: Implement actual Excel connection check
  const isConnected = true;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50">
      <div
        className={cn(
          "h-2.5 w-2.5 rounded-full animate-pulse",
          isConnected ? "bg-excel-connected" : "bg-excel-disconnected"
        )}
      />
      <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
        {isConnected ? "متصل" : "غير متصل"}
      </span>
    </div>
  );
}