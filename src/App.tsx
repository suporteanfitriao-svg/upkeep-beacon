import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ViewModeProvider } from "@/hooks/useViewMode";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { OwnerRoute } from "@/components/OwnerRoute";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";
import { CleanerRoute } from "@/components/CleanerRoute";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { PWAUpdateModal } from "@/components/pwa/PWAUpdateModal";
import { usePWAUpdate } from "@/hooks/usePWAUpdate";
import { MobileAdminLayoutWrapper } from "@/components/layout/MobileAdminLayoutWrapper";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Team from "./pages/Team";
import Properties from "./pages/Properties";
import Inspections from "./pages/Inspections";
import Inventory from "./pages/Inventory";
import Help from "./pages/Help";
import Manutencao from "./pages/Manutencao";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import SuperAdmin from "./pages/SuperAdmin";
import Settings from "./pages/Settings";
import Install from "./pages/Install";
import CleaningHistory from "./pages/CleaningHistory";
import Pricing from "./pages/Pricing";
import Checkout from "./pages/Checkout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Disable automatic refetch interval - use realtime subscriptions instead
      refetchInterval: false,
      // Refetch on window focus only when stale (TanStack Query v5: boolean=true behaves as "if stale")
      refetchOnWindowFocus: true,
      // Keep data fresh for 2 minutes before considering stale
      staleTime: 2 * 60 * 1000, // 2 minutes
      // Cache data for 5 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Component to handle PWA updates with visual modal
function PWAUpdateHandler() {
  const { showUpdateModal, isUpdating, performUpdate } = usePWAUpdate();
  
  return (
    <PWAUpdateModal
      isOpen={showUpdateModal}
      onUpdate={performUpdate}
      isUpdating={isUpdating}
    />
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <InstallPrompt />
      <PWAUpdateHandler />
      <BrowserRouter>
        <AuthProvider>
          <ViewModeProvider>
            <Routes>
              <Route path="/landing" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              {/* REGRA: Páginas de pricing e checkout - públicas */}
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/checkout" element={<Checkout />} />
              {/* REGRA MENU FIXO: Rotas com layout persistente mobile */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <OnboardingGuard>
                      <SubscriptionGuard>
                        <MobileAdminLayoutWrapper>
                          <Index />
                        </MobileAdminLayoutWrapper>
                      </SubscriptionGuard>
                    </OnboardingGuard>
                  </ProtectedRoute>
                }
              />
              {/* REGRA: Rotas bloqueadas para Anfitrião - apenas Owner/Admin */}
              <Route
                path="/equipe"
                element={
                  <OwnerRoute>
                    <Team />
                  </OwnerRoute>
                }
              />
              <Route
                path="/propriedades"
                element={
                  <OwnerRoute>
                    <Properties />
                  </OwnerRoute>
                }
              />
              <Route
                path="/inspecoes"
                element={
                  <AdminRoute>
                    <MobileAdminLayoutWrapper>
                      <Inspections />
                    </MobileAdminLayoutWrapper>
                  </AdminRoute>
                }
              />
              <Route
                path="/inventario"
                element={
                  <AdminRoute>
                    <MobileAdminLayoutWrapper>
                      <Inventory />
                    </MobileAdminLayoutWrapper>
                  </AdminRoute>
                }
              />
              <Route
                path="/ajuda"
                element={
                  <ProtectedRoute>
                    <Help />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manutencao"
                element={
                  <AdminRoute>
                    <MobileAdminLayoutWrapper>
                      <Manutencao />
                    </MobileAdminLayoutWrapper>
                  </AdminRoute>
                }
              />
              <Route
                path="/minha-conta"
                element={
                  <ProtectedRoute>
                    <MobileAdminLayoutWrapper>
                      <Profile />
                    </MobileAdminLayoutWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mensagens"
                element={
                  <CleanerRoute>
                    <Messages />
                  </CleanerRoute>
                }
              />
              {/* REGRA: Onboarding bloqueado para Anfitrião - apenas Owner/Admin */}
              <Route
                path="/onboarding"
                element={
                  <OwnerRoute>
                    <Onboarding />
                  </OwnerRoute>
                }
              />
              <Route
                path="/super-admin"
                element={
                  <SuperAdminRoute>
                    <SuperAdmin />
                  </SuperAdminRoute>
                }
              />
              {/* REGRA: Configurações bloqueadas para Anfitrião - apenas Owner/Admin */}
              <Route
                path="/configuracoes"
                element={
                  <OwnerRoute>
                    <Settings />
                  </OwnerRoute>
                }
              />
              <Route path="/install" element={<Install />} />
              <Route
                path="/historico-limpezas"
                element={
                  <ProtectedRoute>
                    <MobileAdminLayoutWrapper>
                      <CleaningHistory />
                    </MobileAdminLayoutWrapper>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ViewModeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
