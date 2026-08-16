import { motion } from "framer-motion";
import {
  MapPin,
  BadgeCheck,
  Briefcase,
  Handshake,
  GraduationCap,
  Users,
  MessageCircle,
  Lock,
} from "lucide-react";
import type { DiscoverProfile } from "@/hooks/useTravelers";

const intentConfig: Record<string, { icon: typeof Briefcase; label: string }> = {
  hiring: { icon: Briefcase, label: "Hiring" },
  partnerships: { icon: Handshake, label: "Open to partnerships" },
  mentorship: { icon: GraduationCap, label: "Mentorship" },
  networking: { icon: Users, label: "Open to networking" },
};

interface Props {
  profile: DiscoverProfile;
  index?: number;
  /** Start (or resume) a direct conversation with this professional. */
  onMessage: () => void;
  /** When false, the message action is gated behind ID verification. */
  canMessage: boolean;
}

const ConnectionCard = ({ profile, index = 0, onMessage, canMessage }: Props) => {
  const intent = profile.intent ? intentConfig[profile.intent] : null;
  const Icon = intent?.icon ?? Briefcase;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3) }}
      className="glass-card overflow-hidden flex flex-col"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={profile.photo}
          alt={profile.name}
          className="w-full h-full object-cover object-center"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent" />
        {profile.airport && (
          <div className="absolute top-2.5 left-2.5 airport-tag text-[11px]">
            <MapPin className="w-3 h-3" />
            {profile.airport}
          </div>
        )}
        {profile.verified && (
          <div className="absolute top-2.5 right-2.5 verified-badge">
            <BadgeCheck className="w-3 h-3" />
            Verified
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-display font-bold text-base leading-snug">{profile.name}</h3>

        {(profile.role || profile.company) && (
          <p className="mt-1 text-xs text-foreground/80 leading-snug">
            {[profile.role, profile.company].filter(Boolean).join(" · ")}
          </p>
        )}

        {profile.industry && (
          <span className="mt-2 inline-block w-fit px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-[11px] font-medium">
            {profile.industry}
          </span>
        )}

        {intent && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="w-3.5 h-3.5 text-accent" />
            {intent.label}
          </p>
        )}

        {profile.bio && (
          <p className="mt-2 text-xs text-foreground/75 line-clamp-2 leading-relaxed">
            {profile.bio}
          </p>
        )}

        <div className="mt-4 pt-3 border-t border-border">
          <button
            onClick={onMessage}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-display font-bold hover:opacity-90 transition-opacity"
          >
            {canMessage ? (
              <>
                <MessageCircle className="w-4 h-4" />
                Message
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Verify to message
              </>
            )}
          </button>
        </div>
      </div>
    </motion.article>
  );
};

export default ConnectionCard;
