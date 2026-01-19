import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "لوحة التحكم", href: "/", icon: Home },
  { name: "تسجيل دخول", href: "/admission", icon: UserPlus },
  { name: "تسجيل خروج", href: "/discharge", icon: LogOut },
  { name: "الإجراءات الطبية", href: "/medical-procedures", icon: Microscope },
  { name: "الاستعارات", href: "/loans", icon: FileArchive },
  { name: "سجل المرضى", href: "/records", icon: Users },
  { name: "التقارير", href: "/reports", icon: FileText },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Search by unified number or name
    const { data } = await supabase
      .from("admissions")
      .select("*")
      .or(`unified_number.ilike.%${searchQuery}%,patient_name.ilike.%${searchQuery}%`)
      .limit(1)
      .single();

    if (data) {
      navigate(`/patient/${data.id}`);
    }
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
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-8 hidden md:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="بحث بالرقم الموحد أو الاسم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50 border-border"
              />
            </div>
          </form>


          {/* Right Side - Excel Status & Theme Toggle */}
          <div className="flex items-center gap-4">
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