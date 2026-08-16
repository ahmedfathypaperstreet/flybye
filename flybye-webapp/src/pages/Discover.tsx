import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Plane, Loader2, LayoutGrid, Map as MapIcon, ShieldCheck, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import ConnectionCard from "@/components/ConnectionCard";
import TerminalMap from "@/components/TerminalMap";
import { useTravelers } from "@/hooks/useTravelers";
import { useNearbyFlyers } from "@/hooks/useNearbyFlyers";
import { useVerificationStatus } from "@/hooks/useVerificationStatus";
import { useToast } from "@/hooks/use-toast";
import { Users } from "lucide-react";

const Discover = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { travelers, loading, refresh } = useTravelers();
  const { userAirport, nearbyCount, loading: nearbyLoading } = useNearbyFlyers();
  const { verified: isVerified } = useVerificationStatus();
  const [view, setView] = useState<"cards" | "map">("cards");
  const [messagingId, setMessagingId] = useState<string | null>(null);

  const requireVerification = () => {
    toast({
      title: "Verify your ID to message",
      description: "Identity verification keeps the community safe. Takes about a minute.",
      action: (
        <button
          onClick={() => navigate("/profile")}
          className="text-xs font-display font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground"
        >
          Verify
        </button>
      ) as any,
    });
  };

  const handleMessage = async (profileId: string) => {
    if (!isVerified) {
      requireVerification();
      return;
    }
    if (messagingId) return;
    setMessagingId(profileId);
    const { data, error } = await supabase.rpc("get_or_create_conversation", {
      other: profileId,
    });
    setMessagingId(null);
    if (error || !data) {
      toast({
        title: "Couldn't start conversation",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
      return;
    }
    navigate(`/chat/${data}`);
  };


  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-10 text-center max-w-md"
          >
            <Plane className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold mb-2">Sign in to discover</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Create an account to connect with verified professionals at your terminal.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate("/signup")}
                className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm"
              >
                Get started
              </button>
              <button
                onClick={() => navigate("/login")}
                className="px-8 py-3 rounded-xl glass font-display font-semibold text-sm"
              >
                Log in
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-8 px-4 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-2xl font-display font-bold">Discover</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Professionals in your terminal right now
          </p>
        </motion.div>

        {/* Verify-to-connect banner — shown to unverified users */}
        {!isVerified && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm mb-3"
          >
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/10 border border-accent/30 text-left hover:bg-accent/15 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-display font-semibold text-foreground">
                  Browse mode — verify to message
                </p>
                <p className="text-xs text-muted-foreground">
                  See who's traveling near you. Verify your ID to message.
                </p>
              </div>
              <ShieldCheck className="w-4 h-4 text-accent flex-shrink-0" />
            </button>
          </motion.div>
        )}

        {/* Nearby flyers banner */}
        {!nearbyLoading && userAirport && nearbyCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm mb-4"
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <Users className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-display font-semibold text-foreground">
                  {nearbyCount}+ professional{nearbyCount !== 1 ? "s" : ""} at {userAirport}
                </p>
                <p className="text-xs text-muted-foreground">
                  Active in your terminal right now
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Cards / Map toggle */}
        <div className="w-full max-w-sm mb-4 flex items-center justify-center">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl glass">
            <button
              onClick={() => setView("cards")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-display font-semibold transition-colors ${
                view === "cards"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cards
            </button>
            <button
              onClick={() => setView("map")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-display font-semibold transition-colors ${
                view === "map"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Map
            </button>
          </div>
        </div>

        {view === "map" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm"
          >
            <TerminalMap iata={userAirport} />
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Tap the expand icon for fullscreen.
            </p>
          </motion.div>
        )}

        {view === "cards" && (
          <div className="w-full max-w-5xl">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              </div>
            ) : travelers.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-muted-foreground">
                    {travelers.length} verified professional{travelers.length !== 1 ? "s" : ""} at your terminal
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {travelers.map((traveler, i) => (
                    <ConnectionCard
                      key={traveler.id}
                      profile={traveler}
                      index={i}
                      canMessage={isVerified}
                      onMessage={() => handleMessage(traveler.id)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card flex flex-col items-center justify-center py-16 px-6 max-w-sm mx-auto"
              >
                <MapPin className="w-14 h-14 text-muted-foreground mb-4" />
                <h3 className="text-lg font-display font-bold mb-2">No verified professionals at your terminal right now.</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Add an upcoming itinerary so we know where you are — new travelers arrive every hour.
                </p>
                <button
                  onClick={refresh}
                  className="mt-6 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-display font-bold text-sm"
                >
                  Refresh
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Discover;
