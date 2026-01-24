import * as React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    const msg = error instanceof Error ? error.message : String(error);
    return { hasError: true, message: msg };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Keep minimal logs; helps pinpoint the component stack.
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground grid place-items-center px-4" dir="rtl">
        <div className="w-full max-w-2xl rounded-lg border bg-card p-6 space-y-4">
          <h1 className="text-lg font-bold">حدث خطأ في الصفحة</h1>
          <p className="text-sm text-muted-foreground">
            {this.state.message || "حدث خطأ غير متوقع"}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => window.location.reload()}>
              إعادة تحميل
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                this.setState({ hasError: false, message: undefined });
              }}
            >
              محاولة المتابعة
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            تم تسجيل تفاصيل الخطأ في الكونسول لتحديد السبب بسرعة.
          </p>
        </div>
      </div>
    );
  }
}
