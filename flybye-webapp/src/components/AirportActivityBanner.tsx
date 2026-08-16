/**
 * Reusable banner showing how many other travelers are active at the user's
 * current airport. Designed to be useful even for *unverified* users — gives
 * them a sense of community and a reason to complete verification.
 */
import { motion } from "framer-motion";
import { Users, Plane } from "lucide-react";
import { useNearbyFlyers } from "@/hooks/useNearbyFlyers";

interface Props {
  /** Optional CTA shown to the right (e.g. "Verify to connect"). */
  cta?: React.ReactNode;
  variant?: "compact" | "full";
}

const AirportActivityBanner = ({ cta, variant = "full" }: Props) => {
  const { userAirport, nearbyCount, loading } = useNearbyFlyers();

  if (loading || !userAirport) return null;

  if (variant === "compact") {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs">
        <Users className="w-3.5 h-3.5 text-primary" />
        <span className="font-display font-semibold text-foreground">
          {nearbyCount}+ at {userAirport}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full"
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
        <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
          <Plane className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-display font-semibold text-foreground">
            {nearbyCount > 0
              ? `${nearbyCount}+ traveler${nearbyCount !== 1 ? "s" : ""} at ${userAirport}`
              : `You're flying through ${userAirport}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {nearbyCount > 0
              ? "Active travelers in your area right now"
              : "Be the first one here today"}
          </p>
        </div>
        {cta && <div className="flex-shrink-0">{cta}</div>}
      </div>
    </motion.div>
  );
};

export default AirportActivityBanner;
