import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  UserPlus,
  LogOut,
  Microscope,
  AlertTriangle,
  Syringe,
  FileArchive,
  Users,
  FileText,
  Database,
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "لوحة التحكم", href: "/", icon: LayoutDashboard },
  { name: "تسجيل دخول", href: "/admission", icon: UserPlus },
  { name: "تسجيل خروج", href: "/discharge", icon: LogOut },
  { name: "المناظير", href: "/endoscopy", icon: Microscope },
  { name: "الطوارئ", href: "/emergency", icon: AlertTriangle },
  { name: "البذل", href: "/procedures", icon: Syringe },
  { name: "الاستعارات", href: "/loans", icon: FileArchive },
  { name: "سجل المرضى", href: "/patients", icon: Users },
  { name: "التقارير", href: "/reports", icon: FileText },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header with Excel Connection Status */}
      <header className="sticky top-0 z-50 border-b border-border bg-card shadow-medical">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">نظام السجلات الطبية</h1>
              <p className="text-xs text-muted-foreground">إدارة السجلات الطبية المتكاملة</p>
            </div>
          </div>
          <ExcelConnectionIndicator />
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="sticky top-16 h-[calc(100vh-4rem)] w-64 border-l border-border bg-card shadow-medical">
          <nav className="space-y-1 p-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-medical"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function ExcelConnectionIndicator() {
  // TODO: Implement actual Excel connection check
  const isConnected = true;

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "h-3 w-3 rounded-full",
          isConnected ? "bg-excel-connected" : "bg-excel-disconnected"
        )}
      />
      <span className="text-sm font-medium text-muted-foreground">
        {isConnected ? "متصل بقاعدة البيانات" : "غير متصل"}
      </span>
    </div>
  );
}