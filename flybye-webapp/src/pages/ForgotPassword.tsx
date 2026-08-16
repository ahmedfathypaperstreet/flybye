import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { CloudOff } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const online = useOnlineStatus();
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!online) {
      toast({
        title: "You're offline",
        description: "Reconnect to send a reset link.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="flex items-center gap-2 justify-center mb-10">
          <Logo size="lg" />
        </Link>

        <div className="glass-card p-8">
          {sent ? (
            <div className="text-center">
              <h1 className="text-2xl font-display font-bold mb-2">Check your email</h1>
              <p className="text-muted-foreground text-sm mb-6">
                We sent a password reset link to <strong className="text-foreground">{email}</strong>
              </p>
              <Link to="/login" className="text-primary hover:underline text-sm font-medium">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-display font-bold text-center mb-2">Reset password</h1>
              <p className="text-muted-foreground text-center mb-8 text-sm">
                Enter your email and we'll send you a reset link
              </p>

              <form onSubmit={handleReset} className="space-y-5">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !online}
                  title={!online ? "You're offline — connect to send a link" : undefined}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!online ? "Offline — try again later" : loading ? "Sending…" : "Send reset link"}
                </button>

                {!online && (
                  <p className="flex items-center gap-1.5 text-xs text-destructive justify-center">
                    <CloudOff className="w-3.5 h-3.5" />
                    Connect to the internet to request a reset link.
                  </p>
                )}
              </form>

              <Link
                to="/login"
                className="flex items-center gap-1 justify-center text-sm text-muted-foreground hover:text-foreground mt-6"
              >
                <ArrowLeft className="w-3 h-3" /> Back to sign in
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
