import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Admission from "./pages/Admission";
import Discharge from "./pages/Discharge";
import MedicalProcedures from "./pages/MedicalProcedures";
import Loans from "./pages/Loans";
import Layout from "./components/Layout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/admission" element={<Admission />} />
            <Route path="/discharge" element={<Discharge />} />
            <Route path="/endoscopy" element={<MedicalProcedures />} />
            <Route path="/emergency" element={<MedicalProcedures />} />
            <Route path="/procedures" element={<MedicalProcedures />} />
            <Route path="/loans" element={<Loans />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
