import { motion, useInView } from "framer-motion";
import {
  Shield,
  MapPin,
  Clock,
  ChevronRight,
  CheckCircle,
  Globe,
  Users,
  Handshake,
  Briefcase,
  Zap,
  ArrowRight,
  Star,
  Quote,
  Plane,
} from "lucide-react";
import Logo from "@/components/Logo";
import {
  AirportSilhouette,
  PlaneTakeoffScene,
  CoupleAtTerminal,
  BoardingPassScene,
  SkylineScene,
} from "@/components/Illustrations";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import heroBg from "@/assets/hero-bg.jpg";
import ProfileCard from "@/components/ProfileCard";
import FeatureCard from "@/components/FeatureCard";
import Navbar from "@/components/Navbar";

const MOCK_PROFILES = [
  {
    name: "Sarah Lindqvist",
    role: "VP Product",
    company: "Northwind Labs",
    industry: "SaaS",
    photo: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=500&fit=crop",
    airport: "LAX",
    status: "3h Layover",
    verified: true,
    destination: "Tokyo NRT",
    intent: "Hiring" as const,
  },
  {
    name: "Marcus Chen",
    role: "Founder",
    company: "Relay Freight",
    industry: "Logistics",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=face",
    airport: "JFK",
    status: "Departing 6pm",
    verified: true,
    destination: "London LHR",
    intent: "Partnerships" as const,
  },
  {
    name: "Aisha Rahman",
    role: "Investment Associate",
    company: "Meridian Capital",
    industry: "Finance",
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop",
    airport: "DXB",
    status: "5h Layover",
    verified: false,
    destination: "Paris CDG",
    intent: "Networking" as const,
  },
];

const FEATURES = [
  {
    icon: Shield,
    title: "Identity Verified",
    description: "Every profile is ID-verified. Real professionals, no anonymous accounts.",
  },
  {
    icon: MapPin,
    title: "Terminal Discovery",
    description: "See which professionals are in your terminal or lounge right now.",
  },
  {
    icon: Clock,
    title: "Layover Windows",
    description: "Surface people whose layover overlaps yours — down to the hour.",
  },
  {
    icon: Plane,
    title: "Route Overlap",
    description: "Find peers heading to the same city, conference or client.",
  },
];

const STATS = [
  { value: "120+", label: "Airports", icon: Globe },
  { value: "50K+", label: "Professionals", icon: Users },
  { value: "12K+", label: "Connections made", icon: Handshake },
  { value: "98%", label: "Verified", icon: Shield },
];

const SHOWCASE_FEATURES = [
  {
    icon: Briefcase,
    title: "Relevance, not proximity alone",
    description:
      "FlyBye reads your itinerary and surfaces professionals in your terminal whose industry, role and intent actually line up with yours.",
    color: "primary" as const,
  },
  {
    icon: Zap,
    title: "Meet before the boarding call",
    description:
      "Know when a connection is nearby — at the gate area, the lounge or the coffee bar — with enough time for a real conversation.",
    color: "accent" as const,
  },
  {
    icon: Globe,
    title: "A network that travels",
    description:
      "Hiring, raising, partnering or looking for a mentor: every layover becomes a room full of people worth meeting.",
    color: "primary" as const,
  },
];

const CountUpStat = ({
  value,
  label,
  icon: Icon,
  index,
}: {
  value: string;
  label: string;
  icon: typeof Globe;
  index: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.12, ease: "easeOut" }}
      className="text-center group"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={isInView ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: index * 0.12 + 0.1, type: "spring", stiffness: 200 }}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors"
      >
        <Icon className="w-6 h-6 text-primary" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, scale: 0.5 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.4, delay: index * 0.12 + 0.2, type: "spring", stiffness: 150 }}
        className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground"
      >
        {value}
      </motion.p>
      <p className="text-sm text-muted-foreground mt-1 font-medium">{label}</p>
    </motion.div>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const showcaseRef = useRef(null);
  const showcaseInView = useInView(showcaseRef, { once: true, margin: "-100px" });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        </div>
        {/* Airport silhouette at bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 z-[1] opacity-60">
          <AirportSilhouette className="w-full" />
        </div>

        <div className="relative z-10 container mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12 sm:pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="airport-tag mx-auto w-fit mb-4 sm:mb-6 text-xs sm:text-sm">
              <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              The career network for people in transit
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight mb-4 sm:mb-6 leading-tight">
              Meet peers <span className="text-gradient">at your terminal</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-8 sm:mb-10 px-2">
              Turn layovers into career connections. Meet verified peers in your terminal, lounge or on your
              route — before the boarding call.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/discover")}
                className="px-8 py-4 rounded-lg bg-primary text-primary-foreground font-display font-bold text-base glow-primary"
              >
                Start Connecting
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                className="px-8 py-4 rounded-lg glass font-display font-normal text-base text-foreground"
              >
                How it works
              </motion.button>
            </div>
          </motion.div>

          {/* Profile Cards Preview */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-12 sm:mt-20 flex justify-center gap-3 sm:gap-4 md:gap-6 overflow-x-auto pb-4 px-2 snap-x snap-mandatory scrollbar-hide"
          >
            {MOCK_PROFILES.map((profile, i) => (
              <ProfileCard key={profile.name} profile={profile} index={i} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section id="stats" className="py-10 sm:py-16 border-y border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-12">
            {STATS.map((stat, i) => (
              <CountUpStat key={stat.label} {...stat} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Skyline divider */}
      <div className="relative overflow-hidden">
        <SkylineScene className="w-full opacity-50" />
      </div>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24 relative">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-3 sm:mb-4">
              Built for <span className="text-gradient">professional travel</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">
              Every feature designed around the hours professionals spend in transit.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {FEATURES.map((feature, i) => (
              <FeatureCard key={feature.title} feature={feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Showcase Features — alternating layout */}
      <section ref={showcaseRef} className="py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent" />

        {/* Decorative couple illustration */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.4 }}
          viewport={{ once: true }}
          className="absolute right-0 top-20 hidden lg:block"
        >
          <CoupleAtTerminal className="w-64 opacity-50" />
        </motion.div>
        <div className="container mx-auto px-4 sm:px-6 relative">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-3 sm:mb-4">
              Why professionals <span className="text-gradient">choose FlyBye</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">
              Every layover is a room full of people worth meeting.
            </p>
          </motion.div>

          <div className="space-y-14 sm:space-y-20 md:space-y-28">
            {SHOWCASE_FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              const isEven = i % 2 === 0;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: isEven ? -60 : 60 }}
                  animate={showcaseInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.7, delay: i * 0.2, ease: "easeOut" }}
                  className={`flex flex-col ${isEven ? "md:flex-row" : "md:flex-row-reverse"} items-center gap-6 sm:gap-10 md:gap-16`}
                >
                  {/* Icon block */}
                  <motion.div
                    initial={{ scale: 0.8, rotate: -10 }}
                    animate={showcaseInView ? { scale: 1, rotate: 0 } : {}}
                    transition={{ duration: 0.6, delay: i * 0.2 + 0.1, type: "spring", stiffness: 120 }}
                    className="relative shrink-0"
                  >
                    <div
                      className={`w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-3xl flex items-center justify-center ${
                        feature.color === "accent"
                          ? "bg-accent/10 border border-accent/20"
                          : "bg-primary/10 border border-primary/20"
                      }`}
                    >
                      <Icon
                        className={`w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 ${
                          feature.color === "accent" ? "text-accent" : "text-primary"
                        }`}
                      />
                    </div>
                    {/* Decorative glow */}
                    <div
                      className={`absolute -inset-4 rounded-3xl blur-2xl opacity-20 -z-10 ${
                        feature.color === "accent" ? "bg-accent" : "bg-primary"
                      }`}
                    />
                  </motion.div>

                  {/* Text */}
                  <div className={`text-center ${isEven ? "md:text-left" : "md:text-right"} max-w-lg`}>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-display font-bold mb-2 sm:mb-3 text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-4 sm:mb-5">
                      {feature.description}
                    </p>
                    <motion.button
                      whileHover={{ x: isEven ? 6 : -6 }}
                      className={`inline-flex items-center gap-2 font-display font-semibold ${
                        feature.color === "accent" ? "text-accent" : "text-primary"
                      }`}
                    >
                      Learn more <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent" />
        <div className="container mx-auto px-4 sm:px-6 relative">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-3 sm:mb-4">
              Trusted by <span className="text-gradient">travelers</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">
              Deals, hires and partnerships that started in a terminal.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "Priya K.",
                role: "Head of BD, Fintech",
                photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face",
                rating: 5,
                text: "A four-hour layover at Changi turned into a distribution partnership. We had coffee at the lounge and signed six weeks later.",
                airport: "SIN",
              },
              {
                name: "James T.",
                role: "Engineering Director",
                photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
                rating: 5,
                text: "I fly weekly. FlyBye is the only reason that dead time is now pipeline — I've hired two engineers I first met at the gate.",
                airport: "LAX",
              },
              {
                name: "Sofia R.",
                role: "Founder, Climate Tech",
                photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face",
                rating: 5,
                text: "Met an investor at Heathrow between flights. Verified profiles meant I knew exactly who I was sitting down with.",
                airport: "LHR",
              },
            ].map((testimonial, i) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                whileHover={{ y: -4 }}
                className="glass-card p-5 sm:p-6 flex flex-col group"
              >
                <Quote className="w-8 h-8 text-primary/30 mb-3 shrink-0" />

                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: testimonial.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>

                <p className="text-sm sm:text-base text-foreground/90 leading-relaxed mb-5 flex-1">
                  "{testimonial.text}"
                </p>

                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <img src={testimonial.photo} alt={testimonial.name} className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-sm text-foreground truncate">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                  <span className="airport-tag text-xs shrink-0">
                    <MapPin className="w-3 h-3" />
                    {testimonial.airport}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-16 sm:py-24 relative overflow-hidden">
        {/* Boarding pass illustration */}
        <motion.div
          initial={{ opacity: 0, rotate: -8 }}
          whileInView={{ opacity: 0.5, rotate: -5 }}
          viewport={{ once: true }}
          className="absolute left-0 top-16 hidden lg:block"
        >
          <BoardingPassScene className="w-72 opacity-40" />
        </motion.div>

        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-4">
              Three steps to <span className="text-gradient">your next meeting</span>
            </h2>
          </motion.div>

          <div className="max-w-2xl mx-auto space-y-4 sm:space-y-8">
            {[
              {
                step: "01",
                title: "Build your professional profile",
                desc: "Role, company, industry and what you're open to — verified with a passport or ID scan.",
              },
              { step: "02", title: "Add your itinerary", desc: "Flights, layovers and travel dates stay private until you connect." },
              {
                step: "03",
                title: "Connect & meet",
                desc: "See who's in your terminal, send a connection request and meet before boarding.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="glass-card p-4 sm:p-6 flex items-start gap-4 sm:gap-6"
              >
                <span className="text-2xl sm:text-3xl font-display font-bold text-primary">{item.step}</span>
                <div>
                  <h3 className="text-lg sm:text-xl font-display font-semibold mb-1">{item.title}</h3>
                  <p className="text-muted-foreground text-sm sm:text-base">{item.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground ml-auto mt-1 flex-shrink-0 hidden sm:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 relative overflow-hidden">
        {/* Takeoff scene behind CTA */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30">
          <PlaneTakeoffScene className="w-full max-w-2xl" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-8 sm:p-12 md:p-16 text-center max-w-3xl mx-auto glow-primary"
          >
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-accent mx-auto mb-4 sm:mb-6" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-3 sm:mb-4">
              Your next connection is two terminals away
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mb-6 sm:mb-8 max-w-md mx-auto">
              Join thousands of verified professionals turning layovers into partnerships, hires and deals.
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/discover")}
              className="px-8 sm:px-10 py-3.5 sm:py-4 rounded-lg bg-primary text-primary-foreground font-display font-bold text-base"
            >
              Create your profile
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
          <Logo size="sm" />
          <div className="flex flex-wrap justify-center gap-6 sm:gap-8 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Safety
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 FlyBye</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
