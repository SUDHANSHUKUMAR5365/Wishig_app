import "@/index.css";
import "@/App.css";
import { useEffect } from "react";
import { BrowserRouter, MemoryRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { onForegroundMessage } from "@/lib/firebase";
import { Capacitor } from "@capacitor/core";
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";
import CreateEvent from "@/pages/CreateEvent";
import CelebrationExperience from "@/pages/CelebrationExperience";
import Dashboard from "@/pages/Dashboard";
import AdminPage from "@/pages/AdminPage";
import ProfilePage from "@/pages/ProfilePage";
import PremiumPage from "@/pages/PremiumPage";
import SupportPage from "@/pages/SupportPage";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  const navigate = useNavigate();

  // Android hardware back button — go back if history exists, else exit app
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let App;
    import('@capacitor/app').then(({ App: CapApp }) => {
      App = CapApp;
      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          navigate(-1);
        } else {
          App.exitApp();
        }
      });
    }).catch(() => {});
    return () => {
      if (App) App.removeAllListeners().catch(() => {});
    };
  }, [navigate]);

  useEffect(() => {
    const unsub = onForegroundMessage(({ title, body }) => {
      toast(title, { description: body });
    });
    return unsub;
  }, []);

  return (
    <div className="App min-h-screen bg-[#0A0F1F]">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/create" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
        <Route path="/celebrate/:eventId" element={<CelebrationExperience />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/premium" element={<ProtectedRoute><PremiumPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
      </Routes>
      <Toaster position="top-center" richColors />
    </div>
  );
}

const Router = Capacitor.isNativePlatform() ? MemoryRouter : BrowserRouter;

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
