import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import OfflineIndicator from "@/components/OfflineIndicator";
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
import AdminClientsPage from "./pages/AdminClientsPage";
import AdminWorkoutBuilder from "./pages/AdminWorkoutBuilder";
import AdminLibraryPage from "./pages/AdminLibraryPage";
import AdminBusinessDashboard from "./pages/AdminBusinessDashboard";
import LibraryPage from "./pages/LibraryPage";
import TrainPage from "./pages/TrainPage";
import LifestylePage from "./pages/LifestylePage";
import NutritionPage from "./pages/NutritionPage";
import ProgressPage from "./pages/ProgressPage";
import MyCoachingPage from "./pages/MyCoachingPage";
import CommunityPage from "./pages/CommunityPage";
import AIChatPage from "./pages/AIChatPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import StubPage from "./pages/stubs/StubPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <OfflineIndicator />
        <PWAInstallPrompt />
        <AppLayout>
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
            <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
            <Route path="/library" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/referral" element={<ProtectedRoute><StubPage icon={Users} name="Refer a Friend" /></ProtectedRoute>} />
            <Route path="/my-coaching" element={<ProtectedRoute><MyCoachingPage /></ProtectedRoute>} />
            <Route path="/ai" element={<ProtectedRoute><AIChatPage /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/client/:userId" element={<AdminRoute><AdminClientProfile /></AdminRoute>} />
            <Route path="/admin/clients" element={<AdminRoute><AdminClientsPage /></AdminRoute>} />
            <Route path="/admin/workout-builder" element={<AdminRoute><AdminWorkoutBuilder /></AdminRoute>} />
            <Route path="/admin/library" element={<AdminRoute><AdminLibraryPage /></AdminRoute>} />
            <Route path="/admin/business" element={<AdminRoute><AdminBusinessDashboard /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
