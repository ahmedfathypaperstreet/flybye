import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, User, Handshake, Menu, X, Compass, Shield, MapPin, Plane } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";

const Navbar = () => {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const close = () => setOpen(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 glass"
      >
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo size="md" />
          </Link>

          {/* Desktop middle links */}
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#features" className="hover:text-foreground transition-colors">Safety</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Testimonials</a>
          </div>

          {/* Desktop right nav */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? null : user ? (
              <>
                <Link
                  to="/discover"
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive("/discover") ? "text-primary" : "text-foreground hover:text-primary"}`}
                >
                  <Compass className="w-4 h-4" />
                  Discover
                </Link>
                <Link
                  to="/flights"
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive("/flights") ? "text-primary" : "text-foreground hover:text-primary"}`}
                >
                  <Plane className="w-4 h-4" />
                  Flights
                </Link>
                <Link
                  to="/matches"
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive("/matches") ? "text-primary" : "text-foreground hover:text-primary"}`}
                >
                  <Handshake className="w-4 h-4" />
                  Connections
                </Link>
                <Link
                  to="/profile"
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive("/profile") ? "text-primary" : "text-foreground hover:text-primary"}`}
                >
                  <User className="w-4 h-4" />
                  Profile
                </Link>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-display font-semibold"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg text-foreground hover:text-primary transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
              onClick={close}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-card border-l border-border flex flex-col md:hidden"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <Link to="/" onClick={close} className="flex items-center gap-2">
                  <Plane className="w-5 h-5 text-primary" />
                  <span className="font-display font-bold text-lg">FlyBye</span>
                </Link>
                <button
                  onClick={close}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer links */}
              <div className="flex-1 overflow-y-auto py-4 px-3">
                {/* Info links */}
                <div className="mb-4">
                  <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Explore
                  </p>
                  {[
                    { label: "How it works", href: "#how-it-works", icon: Compass },
                    { label: "Features", href: "#features", icon: Shield },
                    { label: "Testimonials", href: "#testimonials", icon: MapPin },
                  ].map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={close}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      {item.label}
                    </a>
                  ))}
                </div>

                {loading ? null : user ? (
                  <>
                    <div className="border-t border-border my-3" />
                    <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Your Account
                    </p>
                    {[
                      { label: "Discover", to: "/discover", icon: Compass },
                      { label: "Flights", to: "/flights", icon: Plane },
                      { label: "Connections", to: "/matches", icon: Handshake },
                      { label: "Profile", to: "/profile", icon: User },
                    ].map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={close}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          isActive(item.to)
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    ))}
                  </>
                ) : null}
              </div>

              {/* Drawer footer */}
              <div className="px-4 py-4 border-t border-border">
                {loading ? null : user ? (
                  <button
                    onClick={() => {
                      signOut();
                      close();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      to="/login"
                      onClick={close}
                      className="w-full text-center px-4 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/signup"
                      onClick={close}
                      className="w-full text-center px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-display font-semibold"
                    >
                      Sign up
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
