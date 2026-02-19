import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Index from "./pages/Index";
import LoginAdmin from "./pages/LoginAdmin";
import LoginManager from "./pages/LoginManager";
import LoginMember from "./pages/LoginMember";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Sales from "./pages/Sales";
import Finance from "./pages/Finance";
import CallTracking from "./pages/CallTracking";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedDashboard({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: ("admin" | "manager" | "member")[] }) {
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
            <Route path="/login/admin" element={<LoginAdmin />} />
            <Route path="/login/manager" element={<LoginManager />} />
            <Route path="/login/member" element={<LoginMember />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedDashboard><Dashboard /></ProtectedDashboard>} />
            <Route path="/leads" element={<ProtectedDashboard><Leads /></ProtectedDashboard>} />
            <Route path="/sales" element={<ProtectedDashboard><Sales /></ProtectedDashboard>} />
            <Route path="/finance" element={<ProtectedDashboard><Finance /></ProtectedDashboard>} />
            <Route path="/call-tracking" element={<ProtectedDashboard><CallTracking /></ProtectedDashboard>} />
            <Route path="/analytics" element={<ProtectedDashboard><Analytics /></ProtectedDashboard>} />
            <Route path="/settings" element={<ProtectedDashboard allowedRoles={["admin"]}><Settings /></ProtectedDashboard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
