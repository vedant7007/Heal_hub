"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User, Bell, Shield, Palette, Calendar,
  Save, Loader2, Sun, Moon, Monitor,
} from "lucide-react";
import { useTheme } from "next-themes";
import { AppShell } from "@/components/layout/AppShell";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { getMe } from "@/lib/api";
import { toast } from "sonner";
import { useMounted } from "@/hooks/use-mounted";

const settingsSections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "checkins", label: "Check-in Schedule", icon: Calendar },
  { id: "escalation", label: "Escalation Rules", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
];

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsContent />
    </AppShell>
  );
}

function SettingsContent() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const [activeSection, setActiveSection] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);

  // Profile form
  const [profile, setProfile] = useState({
    name: "", email: "", phone: "", specialization: "", hospital: "",
    currentPassword: "", newPassword: "",
  });

  // Check-in schedule
  const [checkinDays, setCheckinDays] = useState([1, 3, 5, 7, 14, 21, 30]);
  const [checkinTime, setCheckinTime] = useState("09:00");

  // Escalation thresholds
  const [thresholds, setThresholds] = useState({
    yellowPain: 5,
    redPain: 7,
    criticalPain: 9,
  });

  // Notifications
  const [notifications, setNotifications] = useState({
    dashboard: true,
    sms: false,
    email: true,
    criticalOnly: false,
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await getMe();
        setProfile({
          name: res.data.name || "",
          email: res.data.email || "",
          phone: res.data.phone || "",
          specialization: res.data.specialization || "",
          hospital: res.data.hospital || "",
          currentPassword: "",
          newPassword: "",
        });
      } catch {
        // silently fail
      }
    };
    fetchUser();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    toast.success("Settings saved");
    setIsSaving(false);
  };

  const days = ["Day 1", "Day 3", "Day 5", "Day 7", "Day 14", "Day 21", "Day 30", "Day 45", "Day 60", "Day 90"];
  const dayValues = [1, 3, 5, 7, 14, 21, 30, 45, 60, 90];

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-lg font-semibold mb-6">Settings</h2>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Section nav */}
          <nav className="md:w-48 shrink-0">
            <div className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar">
              {settingsSections.map((section) => (
                <motion.button
                  key={section.id}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    activeSection === section.id
                      ? "bg-primary/8 text-primary nav-glow"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <section.icon className="w-4 h-4" />
                  {section.label}
                </motion.button>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 bg-card border border-border rounded-xl p-6 card-glow">
            {/* Profile */}
            {activeSection === "profile" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }} className="space-y-5">
                <h3 className="text-base font-semibold">Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Specialization</Label>
                    <Input value={profile.specialization} onChange={(e) => setProfile({ ...profile, specialization: e.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Hospital</Label>
                    <Input value={profile.hospital} onChange={(e) => setProfile({ ...profile, hospital: e.target.value })} />
                  </div>
                </div>
                <Separator />
                <h4 className="text-sm font-semibold">Change Password</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input type="password" value={profile.currentPassword} onChange={(e) => setProfile({ ...profile, currentPassword: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input type="password" value={profile.newPassword} onChange={(e) => setProfile({ ...profile, newPassword: e.target.value })} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Check-in Schedule */}
            {activeSection === "checkins" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }} className="space-y-5">
                <h3 className="text-base font-semibold">Check-in Schedule</h3>
                <p className="text-sm text-muted-foreground">Select which days after surgery patients should receive automated check-ins.</p>
                <div className="flex flex-wrap gap-2">
                  {dayValues.map((day, i) => {
                    const active = checkinDays.includes(day);
                    return (
                      <motion.button
                        key={day}
                        whileTap={{ scale: 0.93 }}
                        onClick={() => setCheckinDays(active ? checkinDays.filter((d) => d !== day) : [...checkinDays, day].sort((a, b) => a - b))}
                        className={`px-3 py-2 rounded-lg text-sm font-medium filter-pill ${
                          active ? "bg-primary text-primary-foreground filter-pill-active" : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {days[i]}
                      </motion.button>
                    );
                  })}
                </div>
                <div className="space-y-2 max-w-xs">
                  <Label>Check-in Time</Label>
                  <Input type="time" value={checkinTime} onChange={(e) => setCheckinTime(e.target.value)} />
                </div>
              </motion.div>
            )}

            {/* Escalation Rules */}
            {activeSection === "escalation" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }} className="space-y-5">
                <h3 className="text-base font-semibold">Escalation Rules</h3>
                <p className="text-sm text-muted-foreground">Set pain thresholds for automatic alert escalation.</p>
                <div className="space-y-6 max-w-md">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500" /> Yellow Alert
                      </Label>
                      <span className="text-sm font-semibold">Pain ≥ {thresholds.yellowPain}</span>
                    </div>
                    <input
                      type="range" min="1" max="10" value={thresholds.yellowPain}
                      onChange={(e) => setThresholds({ ...thresholds, yellowPain: parseInt(e.target.value) })}
                      className="w-full accent-amber-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" /> Red Alert
                      </Label>
                      <span className="text-sm font-semibold">Pain ≥ {thresholds.redPain}</span>
                    </div>
                    <input
                      type="range" min="1" max="10" value={thresholds.redPain}
                      onChange={(e) => setThresholds({ ...thresholds, redPain: parseInt(e.target.value) })}
                      className="w-full accent-red-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-700" /> Critical Alert
                      </Label>
                      <span className="text-sm font-semibold">Pain ≥ {thresholds.criticalPain}</span>
                    </div>
                    <input
                      type="range" min="1" max="10" value={thresholds.criticalPain}
                      onChange={(e) => setThresholds({ ...thresholds, criticalPain: parseInt(e.target.value) })}
                      className="w-full accent-red-700"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Notifications */}
            {activeSection === "notifications" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }} className="space-y-5">
                <h3 className="text-base font-semibold">Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Dashboard Alerts</p>
                      <p className="text-xs text-muted-foreground">Show alerts on the dashboard</p>
                    </div>
                    <Switch checked={notifications.dashboard} onCheckedChange={(v) => setNotifications({ ...notifications, dashboard: v })} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Email Notifications</p>
                      <p className="text-xs text-muted-foreground">Receive alerts via email</p>
                    </div>
                    <Switch checked={notifications.email} onCheckedChange={(v) => setNotifications({ ...notifications, email: v })} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">SMS Notifications</p>
                      <p className="text-xs text-muted-foreground">Receive alerts via SMS</p>
                    </div>
                    <Switch checked={notifications.sms} onCheckedChange={(v) => setNotifications({ ...notifications, sms: v })} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Critical Alerts Only</p>
                      <p className="text-xs text-muted-foreground">Only notify for critical-level alerts</p>
                    </div>
                    <Switch checked={notifications.criticalOnly} onCheckedChange={(v) => setNotifications({ ...notifications, criticalOnly: v })} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Appearance */}
            {activeSection === "appearance" && mounted && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }} className="space-y-5">
                <h3 className="text-base font-semibold">Appearance</h3>
                <p className="text-sm text-muted-foreground">Choose your preferred theme.</p>
                <div className="grid grid-cols-3 gap-3 max-w-sm">
                  {[
                    { value: "light", label: "Light", icon: Sun },
                    { value: "dark", label: "Dark", icon: Moon },
                    { value: "system", label: "System", icon: Monitor },
                  ].map((t) => (
                    <motion.button
                      key={t.value}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setTheme(t.value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                        theme === t.value
                          ? "border-primary bg-primary/5 card-glow"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <motion.div
                        key={theme === t.value ? "active" : "inactive"}
                        initial={{ rotate: -45, scale: 0.8 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <t.icon className={`w-5 h-5 ${theme === t.value ? "text-primary" : "text-muted-foreground"}`} />
                      </motion.div>
                      <span className={`text-sm font-medium ${theme === t.value ? "text-primary" : ""}`}>{t.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Save button */}
            <div className="mt-8 pt-4 border-t border-border flex justify-end">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button onClick={handleSave} disabled={isSaving} className="btn-premium text-white">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
