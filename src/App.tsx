import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import SetupAdmin from "./pages/SetupAdmin";
import Admission from "./pages/Admission";
import Discharge from "./pages/Discharge";
import MedicalProcedures from "./pages/MedicalProcedures";
import FileReview from "./pages/FileReview";
import FileReviewPatient from "./pages/FileReviewPatient";
import Loans from "./pages/Loans";
import Records from "./pages/Records";
import UnifiedDatabase from "./pages/UnifiedDatabase";
import Reports from "./pages/Reports";
import FieldSettings from "./pages/FieldSettings";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "@/components/ErrorBoundary";
import { FieldConfigProvider } from "@/components/FieldConfigProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary>
        <FieldConfigProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/setup" element={<SetupAdmin />} />
              <Route path="/" element={<Dashboard />} />
              <Route path="/admission" element={<Admission />} />
              <Route path="/discharge" element={<Discharge />} />
              <Route path="/medical-procedures" element={<MedicalProcedures />} />
              <Route path="/loans" element={<Loans />} />
              <Route path="/records" element={<Records />} />
              <Route path="/unified-database" element={<UnifiedDatabase />} />
              <Route path="/field-settings" element={<FieldSettings />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/patient-search" element={<FileReview />} />
              <Route path="/file-review/patient" element={<FileReviewPatient />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </FieldConfigProvider>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
