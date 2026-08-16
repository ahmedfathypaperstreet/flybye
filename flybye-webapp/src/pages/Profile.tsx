import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Camera, MapPin, Save, Loader2, Linkedin, Building2, Briefcase } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import VerificationStatusCard from "@/components/VerificationStatusCard";
import type { Database } from "@/integrations/supabase/types";

type NetworkingIntent = Database["public"]["Enums"]["networking_intent"];

const INTENT_OPTIONS: { value: NetworkingIntent; label: string }[] = [
  { value: "hiring", label: "Hiring" },
  { value: "partnerships", label: "Partnerships" },
  { value: "mentorship", label: "Mentorship" },
  { value: "networking", label: "Networking" },
];

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [intent, setIntent] = useState<NetworkingIntent | "">("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [homeAirport, setHomeAirport] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "display_name, role, company, industry, intent, linkedin_url, bio, avatar_url, home_airport",
        )
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setDisplayName(data.display_name ?? "");
        setRole(data.role ?? "");
        setCompany(data.company ?? "");
        setIndustry(data.industry ?? "");
        setIntent((data.intent as NetworkingIntent | null) ?? "");
        setLinkedinUrl(data.linkedin_url ?? "");
        setBio(data.bio ?? "");
        setAvatarUrl(data.avatar_url ?? "");
        setHomeAirport(data.home_airport ?? "");
      }
      if (error) console.error("Error fetching profile:", error);
      setLoadingProfile(false);
    };

    fetchProfile();
  }, [user]);

  const handleAvatarSelect = async (file: File) => {
    if (!user) return;
    if (file.size > MAX_AVATAR_BYTES) {
      toast({
        title: "File too large",
        description: "Please choose an image under 5 MB.",
        variant: "destructive",
      });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image (JPG, PNG, or WEBP).",
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setUploadingAvatar(false);
      toast({
        title: "Couldn't upload photo",
        description: uploadError.message,
        variant: "destructive",
      });
      return;
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(pub.publicUrl);
    setUploadingAvatar(false);
    toast({ title: "Photo uploaded ✓", description: "Save your profile to keep it." });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        role: role.trim() || null,
        company: company.trim() || null,
        industry: industry.trim() || null,
        intent: intent || null,
        linkedin_url: linkedinUrl.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        home_airport: homeAirport.trim().toUpperCase() || null,
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      toast({ title: "Error saving profile", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated ✈️", description: "Your changes have been saved." });
    }
  };

  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-12 px-4 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-display font-bold">Edit Profile</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Show fellow professionals who you are and what you're looking for
            </p>
          </div>

          {/* ID verification status */}
          <VerificationStatusCard />

          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-border bg-secondary group"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingAvatar ? (
                  <Loader2 className="w-6 h-6 animate-spin text-foreground" />
                ) : (
                  <Camera className="w-6 h-6 text-foreground" />
                )}
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAvatarSelect(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="text-xs font-display font-semibold text-primary hover:underline disabled:opacity-50"
            >
              {uploadingAvatar ? "Uploading…" : "Upload a photo"}
            </button>
          </div>

          {/* Form */}
          <div className="glass-card p-6 space-y-5">
            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm font-medium">Display Name</Label>
              <Input
                id="displayName"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={60}
                className="bg-secondary border-border"
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Role / Title
                </span>
              </Label>
              <Input
                id="role"
                placeholder="e.g. Product Lead"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                maxLength={80}
                className="bg-secondary border-border"
              />
            </div>

            {/* Company */}
            <div className="space-y-2">
              <Label htmlFor="company" className="text-sm font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Company
                </span>
              </Label>
              <Input
                id="company"
                placeholder="e.g. Acme Inc."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                maxLength={80}
                className="bg-secondary border-border"
              />
            </div>

            {/* Industry */}
            <div className="space-y-2">
              <Label htmlFor="industry" className="text-sm font-medium">Industry</Label>
              <Input
                id="industry"
                placeholder="e.g. Fintech, Healthcare, SaaS"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                maxLength={80}
                className="bg-secondary border-border"
              />
            </div>

            {/* Intent */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">I'm here for</Label>
              <Select
                value={intent}
                onValueChange={(v) => setIntent(v as NetworkingIntent)}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select what you're looking for" />
                </SelectTrigger>
                <SelectContent>
                  {INTENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* LinkedIn */}
            <div className="space-y-2">
              <Label htmlFor="linkedin" className="text-sm font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Linkedin className="w-3.5 h-3.5" /> LinkedIn URL
                </span>
              </Label>
              <Input
                id="linkedin"
                placeholder="https://linkedin.com/in/you"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell other professionals about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={400}
                rows={3}
                className="bg-secondary border-border resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{bio.length}/400</p>
            </div>

            {/* Home Airport */}
            <div className="space-y-2">
              <Label htmlFor="homeAirport" className="text-sm font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Home Airport
                </span>
              </Label>
              <Input
                id="homeAirport"
                placeholder="e.g. LAX, JFK, LHR"
                value={homeAirport}
                onChange={(e) => setHomeAirport(e.target.value)}
                maxLength={10}
                className="bg-secondary border-border uppercase"
              />
            </div>
          </div>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 text-sm font-display font-semibold glow-primary"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Profile
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
