import { useState } from "react";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import { nextRedirectUrl } from "@/lib/authRedirect";

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.1 0-.6-.1-1.1-.2-1.7H12z"/>
  </svg>
);

const AppleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M16.365 1.43c0 1.14-.41 2.23-1.21 3.05-.85.86-2.04 1.5-3.13 1.41-.13-1.14.39-2.31 1.16-3.13.85-.92 2.27-1.6 3.18-1.33zm4.4 16.84c-.62 1.38-.91 2-1.7 3.21-1.11 1.69-2.67 3.79-4.6 3.81-1.71.02-2.15-1.12-4.47-1.1-2.32.01-2.81 1.12-4.52 1.1-1.93-.02-3.41-1.92-4.52-3.61-3.1-4.74-3.43-10.3-1.51-13.27 1.36-2.11 3.5-3.34 5.52-3.34 2.05 0 3.34 1.13 5.04 1.13 1.65 0 2.65-1.13 5.03-1.13 1.79 0 3.69 1 5.04 2.71-4.43 2.43-3.71 8.78.69 10.49z"/>
  </svg>
);

interface SocialButtonsProps {
  /** Optional label override, e.g. "Continue with" or "Sign up with" */
  label?: string;
}

const SocialButtons = ({ label = "Continue with" }: SocialButtonsProps) => {
  const [pending, setPending] = useState<"google" | "apple" | null>(null);
  const { toast } = useToast();

  const handleOAuth = async (provider: "google" | "apple") => {
    setPending(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: nextRedirectUrl(),
      });
      if (result.error) {
        toast({
          title: "Sign-in failed",
          description: result.error.message ?? "Please try again.",
          variant: "destructive",
        });
        setPending(null);
        return;
      }
      // If redirected, browser is leaving — keep button disabled
      if (result.redirected) return;
      // Token-based flow succeeded — auth listener will handle navigation
    } catch (err) {
      toast({
        title: "Sign-in failed",
        description: err instanceof Error ? err.message : "Unexpected error.",
        variant: "destructive",
      });
      setPending(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted-foreground uppercase tracking-wider">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => handleOAuth("google")}
        disabled={pending !== null}
        className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-background border border-border text-foreground font-display font-medium text-sm hover:bg-secondary transition-colors disabled:opacity-50"
      >
        <GoogleIcon />
        {pending === "google" ? "Redirecting…" : `${label} Google`}
      </button>

      <button
        type="button"
        onClick={() => handleOAuth("apple")}
        disabled={pending !== null}
        className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-foreground text-background font-display font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        <AppleIcon />
        {pending === "apple" ? "Redirecting…" : `${label} Apple`}
      </button>
    </div>
  );
};

export default SocialButtons;
