/**
 * In-app ID upload card.
 *
 * Uploads a government-issued ID photo to the private `id-documents` bucket
 * under the user's folder, then records a `verification_requests` row
 * ({ user_id, document_url, status: 'pending' }) for manual review. When the
 * request is approved, a DB trigger flips `profiles.verified` +
 * `profiles.verification_status`.
 *
 * Files are stored at: id-documents/{user_id}/{filename}
 * RLS ensures only the owner (and service role) can read them.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Check, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

const IDUploadCard = ({ onComplete }: { onComplete?: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const online = useOnlineStatus();
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!user) return;
    if (!online) {
      toast({
        title: "You're offline",
        description: "Connect to the internet to upload your ID.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({
        title: "File too large",
        description: "Please choose an image under 8 MB.",
        variant: "destructive",
      });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image (JPG, PNG, or HEIC).",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${user.id}/id-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("id-documents")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setBusy(false);
      toast({
        title: "Couldn't upload your ID",
        description: uploadError.message,
        variant: "destructive",
      });
      return;
    }

    // Record (or reset) the verification request for review.
    const { error: reqError } = await supabase
      .from("verification_requests")
      .upsert(
        {
          user_id: user.id,
          document_url: path,
          status: "pending",
          reviewed_at: null,
          reviewed_by: null,
          rejection_reason: null,
        },
        { onConflict: "user_id" },
      );

    setBusy(false);

    if (reqError) {
      toast({
        title: "Couldn't submit for review",
        description: reqError.message,
        variant: "destructive",
      });
      return;
    }

    setFileName(file.name);
    toast({
      title: "Submitted for review ✈️",
      description: "We'll notify you once your ID is reviewed (usually within 24h).",
    });
    onComplete?.();
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="id-upload-heading"
      className="glass-card p-5 space-y-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Upload className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 id="id-upload-heading" className="text-sm font-display font-semibold">
            Upload your ID
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Upload a photo of your government-issued ID for review. Once approved,
            you'll be able to message professionals.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary border border-border">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            fileName ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"
          }`}
        >
          {fileName ? <Check className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate">
            {fileName ?? "Driver's license or passport"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Clear, well-lit photo. Under 8 MB.
          </p>
        </div>
        <input
          id="id-document"
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant={fileName ? "outline" : "default"}
          size="sm"
          disabled={busy}
          onClick={() => document.getElementById("id-document")?.click()}
          className="flex-shrink-0 text-xs h-8"
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : fileName ? (
            "Replace"
          ) : (
            "Choose"
          )}
        </Button>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground text-center">
        <ShieldCheck className="w-3 h-3" />
        Your documents are encrypted and only visible to you and our verification team.
      </p>
    </motion.section>
  );
};

export default IDUploadCard;
