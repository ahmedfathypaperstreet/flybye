import { Link, useLocation } from "react-router-dom";
import { Instagram, Twitter, Linkedin, Mail, MapPin } from "lucide-react";
import Logo from "@/components/Logo";

const Footer = () => {
  const location = useLocation();

  // Hide footer on chat detail pages for distraction-free messaging
  if (location.pathname.startsWith("/chat/")) return null;

  const product = [
    { label: "How it works", to: "/#how-it-works" },
    { label: "Safety", to: "/#features" },
    { label: "Testimonials", to: "/#testimonials" },
    { label: "Discover", to: "/discover" },
  ];

  const legal = [
    { label: "Terms of Service", to: "/terms" },
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Community Guidelines", to: "/community-guidelines" },
    { label: "Acceptable Use", to: "/acceptable-use" },
    { label: "Cookie Policy", to: "/cookie-policy" },
    { label: "Safety Tips", to: "/safety-tips" },
    { label: "Law Enforcement", to: "/law-enforcement" },
  ];

  return (
    <footer className="border-t border-border bg-card/40 mt-20">
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand */}
          <div className="md:col-span-4">
            <Logo size="md" />
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              Meet verified travelers at your terminal. Make layovers human again.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a href="https://instagram.com/flybye" aria-label="Instagram" className="p-2 rounded-lg text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://x.com/flybye" aria-label="X" className="p-2 rounded-lg text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com/company/flybye" aria-label="LinkedIn" className="p-2 rounded-lg text-muted-foreground hover:text-primary transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">Product</h3>
            <ul className="space-y-2.5">
              {product.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">Legal</h3>
            <ul className="space-y-2.5">
              {legal.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">Contact</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                <a href="mailto:support@flybye.com" className="hover:text-primary transition-colors">support@flybye.com</a>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                <a href="mailto:legal@flybye.com" className="hover:text-primary transition-colors">legal@flybye.com</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <span>FlyBye LLC<br />New York, NY, USA</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-10 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">
            <strong className="text-foreground">Important notice:</strong> FlyBye does <strong>not</strong> conduct
            criminal background checks on its users. Identity verification confirms a user's
            government-issued ID matches a selfie, but does not guarantee character, intent, or safety.
            You are solely responsible for your interactions with other users. Always meet in public,
            well-lit areas inside the terminal, tell someone your plans, and trust your instincts. By
            using FlyBye you acknowledge and accept these risks.
          </p>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© 2026 FlyBye LLC. All rights reserved.</p>
          <p>Made for travelers, by travelers. ✈️</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
