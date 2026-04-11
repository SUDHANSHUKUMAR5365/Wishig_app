import "@/index.css";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { GoogleOAuthProvider } from "@react-oauth/google";
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";
import CreateEvent from "@/pages/CreateEvent";
import CelebrationExperience from "@/pages/CelebrationExperience";
import Dashboard from "@/pages/Dashboard";
import AdminPage from "@/pages/AdminPage";
import ProfilePage from "@/pages/ProfilePage";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  return (
    <div className="App min-h-screen bg-[#0A0F1F]">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/create" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
          <Route path="/celebrate/:eventId" element={<CelebrationExperience />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
