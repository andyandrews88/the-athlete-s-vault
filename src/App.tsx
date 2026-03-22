import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import { syncPendingWrites } from "@/lib/offlineQueue";
import { supabase } from "@/integrations/supabase/client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import OfflineIndicator from "@/components/OfflineIndicator";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { Users } from "lucide-react";

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
import ProgrammeSelectPage from "./pages/ProgrammeSelectPage";
import ProgrammeLandingPage from "./components/train/ProgrammeLandingPage";
import AdminProgrammeManager from "./pages/AdminProgrammeManager";
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

const App = () => {
  // Sync offline writes when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      const synced = await syncPendingWrites(supabase);
      if (synced > 0) {
        toast({ title: 'Back online', description: `Synced ${synced} pending write${synced > 1 ? 's' : ''}.` });
      }
    };
    window.addEventListener('online', handleOnline);
    // Also sync on mount in case writes accumulated
    handleOnline();
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <OfflineIndicator />
        <PWAInstallPrompt />
        <PWAUpdatePrompt />
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
            <Route path="/programmes" element={<ProtectedRoute><ProgrammeSelectPage /></ProtectedRoute>} />
            <Route path="/programmes/:slug" element={<ProtectedRoute><ProgrammeLandingPage /></ProtectedRoute>} />
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
    </>
  </QueryClientProvider>
  );
};

export default App;
