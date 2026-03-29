import "@/index.css";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import LandingPage from "@/pages/LandingPage";
import CreateEvent from "@/pages/CreateEvent";
import CelebrationExperience from "@/pages/CelebrationExperience";
import Dashboard from "@/pages/Dashboard";

function App() {
  return (
    <div className="App min-h-screen bg-[#0A0F1F]">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/create" element={<CreateEvent />} />
          <Route path="/celebrate/:eventId" element={<CelebrationExperience />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;
