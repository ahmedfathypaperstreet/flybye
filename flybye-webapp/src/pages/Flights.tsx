import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Plane, Plus, Trash2, Loader2, Clock, MapPin, Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updatePresenceFromFlight } from "@/lib/presence";
import type { Tables } from "@/integrations/supabase/types";

type Flight = Tables<"flights">;

const Flights = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [flightNumber, setFlightNumber] = useState("");
  const [departureAirport, setDepartureAirport] = useState("");
  const [arrivalAirport, setArrivalAirport] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [hasLayover, setHasLayover] = useState(false);
  const [layoverAirport, setLayoverAirport] = useState("");
  const [layoverDuration, setLayoverDuration] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const fetchFlights = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("flights")
      .select("*")
      .eq("user_id", user.id)
      .order("departure_time", { ascending: true });

    if (error) console.error("Error fetching flights:", error);
    setFlights(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchFlights();
  }, [user]);

  const resetForm = () => {
    setFlightNumber("");
    setDepartureAirport("");
    setArrivalAirport("");
    setDepartureTime("");
    setArrivalTime("");
    setHasLayover(false);
    setLayoverAirport("");
    setLayoverDuration("");
  };

  const handleAdd = async () => {
    if (!user || !departureAirport || !arrivalAirport || !departureTime || !arrivalTime) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const newFlight = {
      user_id: user.id,
      flight_number: flightNumber.trim().toUpperCase() || null,
      departure_airport: departureAirport.trim().toUpperCase(),
      arrival_airport: arrivalAirport.trim().toUpperCase(),
      departure_time: new Date(departureTime).toISOString(),
      arrival_time: new Date(arrivalTime).toISOString(),
      layover_airport: hasLayover ? layoverAirport.trim().toUpperCase() || null : null,
      layover_duration_minutes: hasLayover ? parseInt(layoverDuration) || null : null,
    };
    const { error } = await supabase.from("flights").insert(newFlight);

    if (!error) {
      // Mirror the active leg into profile presence so discovery can surface us.
      await updatePresenceFromFlight(user.id, newFlight);
    }

    setSaving(false);
    if (error) {
      toast({ title: "Error adding flight", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Flight added ✈️" });
      resetForm();
      setShowForm(false);
      fetchFlights();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("flights").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting flight", description: error.message, variant: "destructive" });
    } else {
      setFlights((prev) => prev.filter((f) => f.id !== id));
    }
  };

  const isPast = (time: string) => new Date(time) < new Date();

  if (authLoading || loading) {
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold">My Flights</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your upcoming itineraries</p>
            </div>
            <Button
              onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
              variant={showForm ? "outline" : "default"}
              className="gap-1.5"
            >
              {showForm ? "Cancel" : <><Plus className="w-4 h-4" /> Add</>}
            </Button>
          </div>

          {/* Add Flight Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="glass-card p-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Flight Number (optional)</Label>
                    <Input
                      placeholder="e.g. AA 1234"
                      value={flightNumber}
                      onChange={(e) => setFlightNumber(e.target.value)}
                      maxLength={10}
                      className="bg-secondary border-border uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">From *</Label>
                      <Input
                        placeholder="LAX"
                        value={departureAirport}
                        onChange={(e) => setDepartureAirport(e.target.value)}
                        maxLength={10}
                        className="bg-secondary border-border uppercase"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">To *</Label>
                      <Input
                        placeholder="NRT"
                        value={arrivalAirport}
                        onChange={(e) => setArrivalAirport(e.target.value)}
                        maxLength={10}
                        className="bg-secondary border-border uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Departure *</Label>
                      <Input
                        type="datetime-local"
                        value={departureTime}
                        onChange={(e) => setDepartureTime(e.target.value)}
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Arrival *</Label>
                      <Input
                        type="datetime-local"
                        value={arrivalTime}
                        onChange={(e) => setArrivalTime(e.target.value)}
                        className="bg-secondary border-border"
                      />
                    </div>
                  </div>

                  {/* Layover toggle */}
                  <div className="flex items-center justify-between py-2">
                    <Label className="text-sm font-medium">Has a layover?</Label>
                    <Switch checked={hasLayover} onCheckedChange={setHasLayover} />
                  </div>

                  <AnimatePresence>
                    {hasLayover && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-2 gap-3 overflow-hidden"
                      >
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Layover Airport</Label>
                          <Input
                            placeholder="DXB"
                            value={layoverAirport}
                            onChange={(e) => setLayoverAirport(e.target.value)}
                            maxLength={10}
                            className="bg-secondary border-border uppercase"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Duration (min)</Label>
                          <Input
                            type="number"
                            placeholder="180"
                            value={layoverDuration}
                            onChange={(e) => setLayoverDuration(e.target.value)}
                            min={0}
                            className="bg-secondary border-border"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button onClick={handleAdd} disabled={saving} className="w-full gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plane className="w-4 h-4" /> Add Flight</>}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Flight List */}
          {flights.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <Plane className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-display font-semibold text-lg mb-1">No flights yet</h3>
              <p className="text-sm text-muted-foreground">Add your upcoming flights to connect with travelers at your layover airports.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {flights.map((flight, idx) => {
                const past = isPast(flight.departure_time);
                return (
                  <motion.div
                    key={flight.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`glass-card p-4 ${past ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        {/* Route */}
                        <div className="flex items-center gap-2">
                          <span className="airport-tag text-xs">
                            <MapPin className="w-3 h-3" />
                            {flight.departure_airport}
                          </span>
                          <Plane className="w-3.5 h-3.5 text-primary" />
                          {flight.layover_airport && (
                            <>
                              <span className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                                {flight.layover_airport}
                              </span>
                              <Plane className="w-3.5 h-3.5 text-primary" />
                            </>
                          )}
                          <span className="airport-tag text-xs">
                            <MapPin className="w-3 h-3" />
                            {flight.arrival_airport}
                          </span>
                        </div>

                        {/* Details row */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {flight.flight_number && (
                            <span className="font-medium text-foreground">{flight.flight_number}</span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {format(new Date(flight.departure_time), "MMM d, yyyy")}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(flight.departure_time), "HH:mm")}
                          </span>
                        </div>

                        {/* Layover info */}
                        {flight.layover_airport && flight.layover_duration_minutes && (
                          <p className="text-xs text-accent">
                            ⏱ {Math.floor(flight.layover_duration_minutes / 60)}h{flight.layover_duration_minutes % 60 > 0 ? ` ${flight.layover_duration_minutes % 60}m` : ""} layover at {flight.layover_airport}
                          </p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(flight.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Flights;
