"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Save,
  Calendar,
  Gauge,
  Stethoscope,
  Clock,
  Settings2,
  Sparkles,
} from "lucide-react";
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

const surgeryColors = [
  { bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)", text: "#60A5FA" },
  { bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.2)", text: "#4ADE80" },
  { bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)", text: "#A78BFA" },
  { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)", text: "#F87171" },
  { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)", text: "#FBBF24" },
  { bg: "rgba(236,72,153,0.1)", border: "rgba(236,72,153,0.2)", text: "#F472B6" },
  { bg: "rgba(6,182,212,0.1)", border: "rgba(6,182,212,0.2)", text: "#22D3EE" },
  { bg: "rgba(168,85,247,0.1)", border: "rgba(168,85,247,0.2)", text: "#C084FC" },
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

  /* Compute slider fill percentage for the gradient track */
  const sliderPercent = ((escalationThreshold - 20) / (90 - 20)) * 100;

  /* Threshold label color */
  const thresholdColor =
    escalationThreshold < 40
      ? "#EF4444"
      : escalationThreshold < 65
      ? "#F59E0B"
      : "#22C55E";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 max-w-3xl"
    >
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/15 to-cyan-500/10 border border-blue-500/20">
          <Settings2 className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure check-in schedules and alert thresholds
          </p>
        </div>
      </div>

      {/* Check-in Schedule */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-emerald-500/15">
              <Calendar className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Check-in Schedule</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select which days post-surgery to send check-in messages
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 mb-6">
            {allDays.map((day) => {
              const isSelected = selectedDays.includes(day);
              return (
                <motion.button
                  key={day}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleDay(day)}
                  className="relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300"
                  style={
                    isSelected
                      ? {
                          background: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
                          color: "#FFFFFF",
                          boxShadow: "0 4px 15px rgba(59,130,246,0.3), 0 0 0 1px rgba(59,130,246,0.2)",
                        }
                      : {
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "#94A3B8",
                        }
                  }
                >
                  Day {day}
                </motion.button>
              );
            })}
          </div>

          <div
            className="flex items-center gap-4 p-4 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <label className="text-sm text-slate-400 font-medium">Daily Check-in Time</label>
            <Input
              type="time"
              value={checkinTime}
              onChange={(e) => setCheckinTime(e.target.value)}
              className="w-36 bg-white/[0.03] border-white/10 rounded-xl text-white focus:border-blue-500/50 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </motion.div>

      {/* Escalation Thresholds */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-amber-500/15">
              <Gauge className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Escalation Settings</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure risk thresholds for automatic doctor alerts
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm text-slate-400">Risk score threshold for doctor alert</label>
                <div
                  className="px-3 py-1 rounded-lg text-sm font-bold"
                  style={{
                    background: `${thresholdColor}15`,
                    color: thresholdColor,
                    border: `1px solid ${thresholdColor}30`,
                  }}
                >
                  {escalationThreshold}
                </div>
              </div>

              {/* Custom Slider */}
              <div className="relative">
                <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="absolute h-full rounded-full transition-all duration-150"
                    style={{
                      width: `${sliderPercent}%`,
                      background: "linear-gradient(90deg, #EF4444 0%, #F59E0B 50%, #22C55E 100%)",
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={20}
                  max={90}
                  value={escalationThreshold}
                  onChange={(e) => setEscalationThreshold(Number(e.target.value))}
                  className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                  style={{ margin: 0 }}
                />
                {/* Thumb indicator */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 pointer-events-none transition-all duration-150"
                  style={{
                    left: `calc(${sliderPercent}% - 10px)`,
                    background: "#0F172A",
                    borderColor: thresholdColor,
                    boxShadow: `0 0 10px ${thresholdColor}40`,
                  }}
                />
              </div>

              <div className="flex justify-between text-xs mt-3">
                <span className="text-red-400/70 font-medium">Sensitive (20)</span>
                <span className="text-amber-400/70 font-medium">Moderate (55)</span>
                <span className="text-emerald-400/70 font-medium">Conservative (90)</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Surgery Types */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-purple-500/15">
              <Stethoscope className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Surgery Types</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Supported surgical procedures in your practice
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {surgeryTypes.map((type, i) => {
              const colorSet = surgeryColors[i % surgeryColors.length];
              return (
                <motion.div
                  key={type}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="px-4 py-2 rounded-xl text-sm font-medium cursor-default transition-all duration-200"
                  style={{
                    background: colorSet.bg,
                    border: `1px solid ${colorSet.border}`,
                    color: colorSet.text,
                  }}
                >
                  {type}
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          onClick={handleSave}
          className="rounded-xl px-8 py-6 text-sm font-semibold text-white border-0 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 hover:translate-y-[-2px]"
          style={{
            background: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
          }}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </motion.div>
    </motion.div>
  );
}
