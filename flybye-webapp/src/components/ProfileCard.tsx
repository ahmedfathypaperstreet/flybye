import { motion } from "framer-motion";
import { MapPin, BadgeCheck, Plane, Briefcase, Handshake, GraduationCap, Users } from "lucide-react";

type NetworkingIntent = "Hiring" | "Partnerships" | "Mentorship" | "Networking";

interface Profile {
  name: string;
  role: string;
  company: string;
  industry?: string;
  photo: string;
  airport: string;
  status: string;
  verified: boolean;
  destination: string;
  intent?: NetworkingIntent;
}

const intentConfig: Record<NetworkingIntent, { icon: typeof Briefcase; label: string; className: string }> = {
  Hiring: {
    icon: Briefcase,
    label: "Hiring",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  Partnerships: {
    icon: Handshake,
    label: "Partnerships",
    className: "bg-accent/15 text-accent border-accent/30",
  },
  Mentorship: {
    icon: GraduationCap,
    label: "Mentorship",
    className: "bg-secondary text-secondary-foreground border-border",
  },
  Networking: {
    icon: Users,
    label: "Open to networking",
    className: "bg-secondary text-secondary-foreground border-border",
  },
};

const ProfileCard = ({ profile, index }: { profile: Profile; index: number }) => {
  const intent = profile.intent ? intentConfig[profile.intent] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.15 }}
      whileHover={{ y: -6 }}
      className="glass-card overflow-hidden w-48 sm:w-64 md:w-72 flex-shrink-0 snap-center"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={profile.photo}
          alt={`${profile.name}, ${profile.role}`}
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

        {/* Airport tag */}
        <div className="absolute top-3 left-3 airport-tag text-xs">
          <MapPin className="w-3 h-3" />
          {profile.airport}
        </div>

        {profile.verified && (
          <div className="absolute top-3 right-3 verified-badge">
            <BadgeCheck className="w-3 h-3" />
            Verified
          </div>
        )}

        {intent && (
          <div
            className={`absolute bottom-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${intent.className}`}
          >
            <intent.icon className="w-3 h-3" />
            {intent.label}
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-display font-bold text-sm sm:text-base leading-snug">{profile.name}</h3>
          <span className="text-xs text-primary font-medium shrink-0 mt-0.5">{profile.status}</span>
        </div>
        <p className="text-xs sm:text-sm text-foreground/80 mb-2 leading-snug">
          {profile.role} · {profile.company}
        </p>
        {profile.industry && (
          <span className="inline-block mb-2 px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-[11px] font-medium">
            {profile.industry}
          </span>
        )}
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
          <Plane className="w-3.5 h-3.5" />
          <span>→ {profile.destination}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfileCard;
