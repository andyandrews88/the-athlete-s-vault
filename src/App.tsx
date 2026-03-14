import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { BookOpen, Users } from "lucide-react";

import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import OnboardingFlow from "./pages/OnboardingFlow";
import AuditFlow from "./pages/AuditFlow";
import AuditResults from "./pages/AuditResults";
import HomeDashboard from "./pages/HomeDashboard";
import PricingPage from "./pages/PricingPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminClientProfile from "./pages/AdminClientProfile";
import TrainPage from "./pages/TrainPage";
import LifestylePage from "./pages/LifestylePage";
import NutritionPage from "./pages/NutritionPage";
import ProgressPage from "./pages/ProgressPage";
import StubPage from "./pages/stubs/StubPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TopBar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/onboarding" element={<ProtectedRoute><OnboardingFlow /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute><AuditFlow /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute><AuditResults /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><HomeDashboard /></ProtectedRoute>} />
          <Route path="/train" element={<ProtectedRoute><TrainPage /></ProtectedRoute>} />
          <Route path="/lifestyle" element={<ProtectedRoute><LifestylePage /></ProtectedRoute>} />
          <Route path="/nutrition" element={<ProtectedRoute><NutritionPage /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><StubPage icon={TrendingUp} name="Progress" /></ProtectedRoute>} />
          <Route path="/library" element={<ProtectedRoute><StubPage icon={BookOpen} name="Library" /></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute><StubPage icon={Users} name="Community" /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><StubPage icon={Users} name="Profile" /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><StubPage icon={Users} name="Settings" /></ProtectedRoute>} />
          <Route path="/referral" element={<ProtectedRoute><StubPage icon={Users} name="Refer a Friend" /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/client/:userId" element={<AdminRoute><AdminClientProfile /></AdminRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomNav />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
