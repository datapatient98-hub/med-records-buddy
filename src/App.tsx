import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import SetupAdmin from "./pages/SetupAdmin";
import ResetPassword from "./pages/ResetPassword";
import AdminRecovery from "./pages/AdminRecovery";
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
import ProtectedRoute from "@/components/ProtectedRoute";

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
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin-recovery" element={<AdminRecovery />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admission"
                element={
                  <ProtectedRoute>
                    <Admission />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/discharge"
                element={
                  <ProtectedRoute>
                    <Discharge />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/medical-procedures"
                element={
                  <ProtectedRoute>
                    <MedicalProcedures />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/loans"
                element={
                  <ProtectedRoute>
                    <Loans />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/records"
                element={
                  <ProtectedRoute>
                    <Records />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/unified-database"
                element={
                  <ProtectedRoute>
                    <UnifiedDatabase />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/field-settings"
                element={
                  <ProtectedRoute>
                    <FieldSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patient-search"
                element={
                  <ProtectedRoute>
                    <FileReview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/file-review/patient"
                element={
                  <ProtectedRoute>
                    <FileReviewPatient />
                  </ProtectedRoute>
                }
              />
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
