import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";
import ConnectionBanner from "@/components/ConnectionBanner";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Discover from "./pages/Discover.tsx";
import Profile from "./pages/Profile.tsx";
import Flights from "./pages/Flights.tsx";
import Matches from "./pages/Matches.tsx";
import Chat from "./pages/Chat.tsx";
import NotFound from "./pages/NotFound.tsx";
import Terms from "./pages/Terms.tsx";
import Privacy from "./pages/Privacy.tsx";
import CommunityGuidelines from "./pages/CommunityGuidelines.tsx";
import AcceptableUse from "./pages/AcceptableUse.tsx";
import CookiePolicy from "./pages/CookiePolicy.tsx";
import SafetyTips from "./pages/SafetyTips.tsx";
import LawEnforcement from "./pages/LawEnforcement.tsx";
import OAuthConsent from "./pages/OAuthConsent.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ConnectionBanner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/flights" element={<Flights />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/chat/:conversationId" element={<Chat />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/community-guidelines" element={<CommunityGuidelines />} />
            <Route path="/acceptable-use" element={<AcceptableUse />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            <Route path="/safety-tips" element={<SafetyTips />} />
            <Route path="/law-enforcement" element={<LawEnforcement />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
