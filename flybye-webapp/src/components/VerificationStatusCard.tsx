/**
 * ID verification status card.
 *
 * Shown on the Profile page. Reads `profiles.verification_status` (+ `verified`)
 * via `useVerificationStatus` and renders a clear pill + helper text. When the
 * user is unverified or was rejected, it surfaces the ID upload flow
 * (uploads to `id-documents` and records a `verification_requests` row).
 */
import { motion } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  useVerificationStatus,
  type VerificationState,
} from "@/hooks/useVerificationStatus";
import IDUploadCard from "./IDUploadCard";

interface PresentationCopy {
  label: string;
  description: string;
  Icon: typeof ShieldCheck;
  pillClass: string;
  iconClass: string;
}

const COPY: Record<VerificationState, PresentationCopy> = {
  none: {
    label: "Not verified",
    description:
      "Verify your government-issued ID to unlock messaging. Takes about a minute.",
    Icon: ShieldQuestion,
    pillClass: "bg-muted text-muted-foreground border-border",
    iconClass: "text-muted-foreground",
  },
  pending: {
    label: "Under review",
    description:
      "We've received your ID and are reviewing it. This usually takes under 24 hours.",
    Icon: Clock,
    pillClass: "bg-accent/15 text-accent-foreground border-accent/30",
    iconClass: "text-accent",
  },
  approved: {
    label: "Verified ✓",
    description:
      "Your identity is verified. Other professionals can see your verified badge, and you can message.",
    Icon: ShieldCheck,
    pillClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    iconClass: "text-emerald-400",
  },
  rejected: {
    label: "Verification rejected",
    description:
      "We couldn't verify your ID. Please upload a clearer photo to try again.",
    Icon: ShieldAlert,
    pillClass: "bg-destructive/15 text-destructive border-destructive/30",
    iconClass: "text-destructive",
  },
};

const VerificationStatusCard = () => {
  const { state, loading, refresh } = useVerificationStatus();

  const copy = COPY[state];
  const { Icon } = copy;
  const showUpload = state === "none" || state === "rejected";

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="verification-status-heading"
      className="glass-card p-5 space-y-4"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${copy.pillClass}`}
        >
          <Icon className={`w-5 h-5 ${copy.iconClass}`} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2
              id="verification-status-heading"
              className="text-sm font-display font-semibold"
            >
              ID Verification
            </h2>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${copy.pillClass}`}
            >
              {copy.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {copy.description}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
          aria-label="Check verification status now"
          title="Check now"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {showUpload && (
        <div className="pt-2">
          <IDUploadCard onComplete={refresh} />
        </div>
      )}

      {state === "none" && (
        <div className="pt-2 border-t border-border/50">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">No ID? You can still browse.</strong> See who's
            traveling through your airports — but you'll need to verify before you can message.
          </p>
        </div>
      )}
    </motion.section>
  );
};

export default VerificationStatusCard;
