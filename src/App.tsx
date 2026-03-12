import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Index from "./pages/Index";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Sales from "./pages/Sales";
import Finance from "./pages/Finance";
import CallTracking from "./pages/CallTracking";
import CallList from "./pages/CallList";
import AdFundPayment from "./pages/AdFundPayment";
import MetaLead from "./pages/MetaLead";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedDashboard({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: ("admin" | "manager" | "member" | "client")[] }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedDashboard><Dashboard /></ProtectedDashboard>} />
            <Route path="/leads" element={<ProtectedDashboard><Leads /></ProtectedDashboard>} />
            <Route path="/sales" element={<ProtectedDashboard><Sales /></ProtectedDashboard>} />
            <Route path="/finance" element={<ProtectedDashboard><Finance /></ProtectedDashboard>} />
            <Route path="/call-tracking" element={<ProtectedDashboard><CallTracking /></ProtectedDashboard>} />
            <Route path="/call-list" element={<ProtectedDashboard><CallList /></ProtectedDashboard>} />
            <Route path="/analytics" element={<ProtectedDashboard allowedRoles={["admin"]}><Analytics /></ProtectedDashboard>} />
            <Route path="/settings" element={<ProtectedDashboard allowedRoles={["admin"]}><Settings /></ProtectedDashboard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
