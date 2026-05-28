import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import MyTickets from "./pages/MyTickets";
import TicketDetail from "./pages/TicketDetail";
import TicketFeedback from "./pages/TicketFeedback";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Databases from "./pages/Databases";
import Applications from "./pages/Applications";
import Machines from "./pages/Machines";
import FAQ from "./pages/FAQ";
import TenantAdmin from "./pages/TenantAdmin";
import TenantDetail from "./pages/TenantDetail";
import SLADashboard from "./pages/SLADashboard";
import SLAAcknowledge from "./pages/SLAAcknowledge";
import CSATDashboard from "./pages/CSATDashboard";

import SystemSettings from "./pages/SystemSettings";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import RFCExecution from "./pages/RFCExecution";
import ClientRFCPortal from "./pages/ClientRFCPortal";
import RFCApproval from "./pages/RFCApproval";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/my-tickets" element={<MyTickets />} />
            <Route path="/tickets/:ticketId" element={<TicketDetail />} />
            <Route path="/feedback/:ticketId/:token" element={<TicketFeedback />} />
            <Route path="/sla-dashboard" element={<SLADashboard />} />
            <Route path="/sla-acknowledge/:notificationId/:token" element={<SLAAcknowledge />} />
            <Route path="/csat" element={<CSATDashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:clientId" element={<ClientDetail />} />
            <Route path="/databases" element={<Databases />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/machines" element={<Machines />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/admin/tenants" element={<TenantAdmin />} />
            <Route path="/admin/tenants/:tenantId" element={<TenantDetail />} />
            
            <Route path="/system-settings" element={<SystemSettings />} />
            <Route path="/rfc-execution" element={<RFCExecution />} />
            <Route path="/rfc-aprovacao" element={<RFCApproval />} />
            <Route path="/minhas-rfcs" element={<ClientRFCPortal />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
