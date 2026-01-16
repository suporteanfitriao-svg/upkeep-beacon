import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { usePWAUpdate } from "@/hooks/usePWAUpdate";
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Refetch data every 30 seconds for near-realtime updates
      refetchInterval: 30000,
      // Refetch when window regains focus
      refetchOnWindowFocus: true,
      // Keep data fresh
      staleTime: 10000, // 10 seconds
    },
  },
});

// Component to handle PWA updates
function PWAUpdateHandler() {
  usePWAUpdate();
  return null;
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
          <Routes>
            <Route path="/landing" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/equipe"
              element={
                <AdminRoute>
                  <Team />
                </AdminRoute>
              }
            />
            <Route
              path="/propriedades"
              element={
                <AdminRoute>
                  <Properties />
                </AdminRoute>
              }
            />
            <Route
              path="/inspecoes"
              element={
                <AdminRoute>
                  <Inspections />
                </AdminRoute>
              }
            />
            <Route
              path="/inventario"
              element={
                <AdminRoute>
                  <Inventory />
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
                  <Manutencao />
                </AdminRoute>
              }
            />
            <Route
              path="/minha-conta"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mensagens"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/onboarding"
              element={
                <AdminRoute>
                  <Onboarding />
                </AdminRoute>
              }
            />
            <Route
              path="/super-admin"
              element={
                <AdminRoute>
                  <SuperAdmin />
                </AdminRoute>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route path="/install" element={<Install />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
