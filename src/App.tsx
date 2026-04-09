import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import AuthPage from "./pages/AuthPage";
import Index from "./pages/Index";
import ScanPage from "./pages/ScanPage";
import ReviewPage from "./pages/ReviewPage";
import ContactsPage from "./pages/ContactsPage";
import EditContactPage from "./pages/EditContactPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ScanRoute = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <ScanPage />;
};

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isScanRoute = location.pathname === "/scan";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="h-[100dvh] bg-background flex flex-col max-w-lg mx-auto overflow-hidden">
      {!isScanRoute && <AppHeader />}
      <main className="flex-1 flex flex-col min-h-0">{children}</main>
      {!isScanRoute && <BottomNav />}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<ProtectedLayout><Index /></ProtectedLayout>} />
          <Route path="/scan" element={<ScanRoute />} />
          <Route path="/review" element={<ProtectedLayout><ReviewPage /></ProtectedLayout>} />
          <Route path="/contacts" element={<ProtectedLayout><ContactsPage /></ProtectedLayout>} />
          <Route path="/contacts/:id/edit" element={<ProtectedLayout><EditContactPage /></ProtectedLayout>} />
          <Route path="/settings" element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
