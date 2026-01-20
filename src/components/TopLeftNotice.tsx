import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type NoticeVariant = "success" | "error" | "info";

interface TopLeftNoticeProps {
  title: string;
  description?: string;
  durationMs?: number;
  variant?: NoticeVariant;
  onClose: () => void;
  /** Optional extra content (e.g., unified number/name/department rows) */
  children?: React.ReactNode;
}

export default function TopLeftNotice({
  title,
  description,
  durationMs = 5000,
  variant = "info",
  onClose,
  children,
}: TopLeftNoticeProps) {
  useEffect(() => {
    const t = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs, onClose]);

  const icon =
    variant === "success" ? (
      <CheckCircle2 className="h-6 w-6 text-green" />
    ) : variant === "error" ? (
      <AlertTriangle className="h-6 w-6 text-destructive" />
    ) : (
      <Info className="h-6 w-6 text-primary" />
    );

  return (
    <div className="fixed top-4 left-4 z-50 w-[26rem] animate-in slide-in-from-left duration-300" dir="rtl">
      <Card
        className={cn(
          "shadow-medical-lg border bg-card",
          variant === "success" && "border-green/30",
          variant === "error" && "border-destructive/30",
          variant === "info" && "border-primary/20"
        )}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 rounded-full p-2",
                  variant === "success" && "bg-green/10",
                  variant === "error" && "bg-destructive/10",
                  variant === "info" && "bg-primary/10"
                )}
              >
                {icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-foreground leading-snug">{title}</h3>
                {description ? (
                  <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{description}</p>
                ) : null}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="-mt-1 shrink-0"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {children ? (
            <div className="mt-3 rounded-lg border bg-muted/30 p-4">{children}</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
