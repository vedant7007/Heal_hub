"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Save } from "lucide-react";
import { toast } from "sonner";

const defaultDays = [1, 3, 5, 7, 14, 21, 30];
const allDays = [1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60, 90];

const surgeryTypes = [
  "Knee Replacement",
  "Hip Replacement",
  "Appendectomy",
  "Cardiac Bypass",
  "ACL Reconstruction",
  "Gallbladder Removal",
  "Hernia Repair",
  "C-Section",
];

export default function SettingsPage() {
  const router = useRouter();
  const [selectedDays, setSelectedDays] = useState<number[]>(defaultDays);
  const [checkinTime, setCheckinTime] = useState("10:00");
  const [escalationThreshold, setEscalationThreshold] = useState(60);

  useEffect(() => {
    if (!localStorage.getItem("healhub_token")) {
      router.push("/login");
    }
  }, []);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleSave = () => {
    toast.success("Settings saved!");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Check-in Schedule */}
      <Card className="bg-[#1E293B] border-[#334155] p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Check-in Schedule</h3>
        <p className="text-xs text-[#94A3B8] mb-3">Select which days post-surgery to send check-in messages</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {allDays.map((day) => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedDays.includes(day)
                  ? "bg-[#3B82F6] text-white"
                  : "bg-[#0F172A] text-[#94A3B8] border border-[#334155] hover:border-[#3B82F6]/50"
              }`}
            >
              Day {day}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-[#94A3B8]">Check-in Time:</label>
          <Input
            type="time"
            value={checkinTime}
            onChange={(e) => setCheckinTime(e.target.value)}
            className="w-32 bg-[#0F172A] border-[#334155]"
          />
        </div>
      </Card>

      {/* Escalation Thresholds */}
      <Card className="bg-[#1E293B] border-[#334155] p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Escalation Settings</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-[#94A3B8]">Risk score threshold for doctor alert</label>
              <span className="text-sm text-white font-medium">{escalationThreshold}</span>
            </div>
            <input
              type="range"
              min={20}
              max={90}
              value={escalationThreshold}
              onChange={(e) => setEscalationThreshold(Number(e.target.value))}
              className="w-full accent-[#3B82F6]"
            />
            <div className="flex justify-between text-xs text-[#64748B] mt-1">
              <span>Sensitive (20)</span>
              <span>Moderate (55)</span>
              <span>Conservative (90)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Surgery Types */}
      <Card className="bg-[#1E293B] border-[#334155] p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Surgery Types</h3>
        <div className="flex flex-wrap gap-2">
          {surgeryTypes.map((type) => (
            <Badge key={type} variant="outline" className="border-[#334155] text-[#94A3B8] px-3 py-1">
              {type}
            </Badge>
          ))}
        </div>
      </Card>

      <Button onClick={handleSave} className="bg-[#3B82F6] hover:bg-[#2563EB]">
        <Save className="w-4 h-4 mr-2" /> Save Settings
      </Button>
    </motion.div>
  );
}
