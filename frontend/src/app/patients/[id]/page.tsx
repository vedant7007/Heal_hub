"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  ArrowLeft, MessageSquare, Phone, Calendar, Send, Clock, Activity,
  Pill, ChevronDown, ChevronUp, Bot, User, Mic, Image, FileText,
  AlertTriangle, Heart, Shield, Stethoscope, TrendingUp,
} from "lucide-react";
import { getPatient, sendMessage, callPatient } from "@/lib/api";
import { Patient, CheckIn, Message } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import Link from "next/link";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart,
} from "recharts";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const statusColors: Record<string, string> = {
  green: "#22C55E", yellow: "#EAB308", red: "#EF4444", critical: "#EF4444",
};

const statusGradients: Record<string, string> = {
  green: "from-emerald-500/20 to-emerald-500/5",
  yellow: "from-amber-500/20 to-amber-500/5",
  red: "from-red-500/20 to-red-500/5",
  critical: "from-red-600/30 to-red-500/5",
};

const statusGlow: Record<string, string> = {
  green: "shadow-[0_0_20px_rgba(34,197,94,0.3)]",
  yellow: "shadow-[0_0_20px_rgba(234,179,8,0.3)]",
  red: "shadow-[0_0_20px_rgba(239,68,68,0.3)]",
  critical: "shadow-[0_0_30px_rgba(239,68,68,0.5)]",
};

const tabItems = [
  { value: "timeline", label: "Timeline", icon: Clock },
  { value: "symptoms", label: "Symptoms", icon: Activity },
  { value: "conversations", label: "Chat", icon: MessageSquare },
  { value: "medicines", label: "Medicines", icon: Pill },
];

/* ------------------------------------------------------------------ */
/*  Risk Score Gauge (SVG half-circle)                                 */
/* ------------------------------------------------------------------ */
function RiskGauge({ score, size = 160, strokeWidth = 12 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const progress = (score / 100) * circumference;
  const gaugeColor = score >= 70 ? "#EF4444" : score >= 40 ? "#EAB308" : "#22C55E";
  const glowColor = score >= 70 ? "rgba(239,68,68,0.4)" : score >= 40 ? "rgba(234,179,8,0.4)" : "rgba(34,197,94,0.4)";

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
        <defs>
          <filter id="gaugeGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke="#1E293B"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <motion.path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke={gaugeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          filter="url(#gaugeGlow)"
          style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
        />
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center">
        <motion.span
          className="text-3xl font-bold text-white"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] text-[#64748B] uppercase tracking-wider">Risk Score</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Circular Progress Ring (for medicine adherence)                     */
/* ------------------------------------------------------------------ */
function ProgressRing({ percent, size = 52, strokeWidth = 5, color }: { percent: number; size?: number; strokeWidth?: number; color: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1E293B" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
        {percent}%
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Symptom Pill                                                       */
/* ------------------------------------------------------------------ */
const symptomColorMap: Record<string, string> = {
  fever: "bg-red-500/20 text-red-400 border-red-500/30",
  pain: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  swelling: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  bleeding: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  nausea: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  infection: "bg-red-600/20 text-red-500 border-red-600/30",
  dizziness: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  default: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

function SymptomPill({ symptom }: { symptom: string }) {
  const key = Object.keys(symptomColorMap).find((k) => symptom.toLowerCase().includes(k)) || "default";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${symptomColorMap[key]}`}>
      {symptom}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Message Type Icon                                                  */
/* ------------------------------------------------------------------ */
function MessageTypeIcon({ type }: { type: string }) {
  if (type === "voice") return <Mic className="w-3 h-3" />;
  if (type === "image") return <Image className="w-3 h-3" />;
  return <FileText className="w-3 h-3" />;
}

/* ------------------------------------------------------------------ */
/*  Custom Recharts Tooltip                                            */
/* ------------------------------------------------------------------ */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0F172A]/95 backdrop-blur-xl border border-[#334155] rounded-xl p-3 shadow-2xl">
      <p className="text-xs font-medium text-white mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[#94A3B8]">{entry.name}:</span>
          <span className="font-medium text-white">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */
export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("timeline");
  const [expandedCheckins, setExpandedCheckins] = useState<Set<string>>(new Set());

  const id = params.id as string;

  useEffect(() => {
    if (!localStorage.getItem("healhub_token")) {
      router.push("/login");
      return;
    }
    loadPatient();
  }, [id]);

  const loadPatient = async () => {
    try {
      const res = await getPatient(id);
      setPatient(res.data);
    } catch {
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!msgText.trim()) return;
    setSending(true);
    try {
      await sendMessage(id, msgText);
      toast.success("Message sent!");
      setMsgText("");
      loadPatient();
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleCall = async () => {
    try {
      await callPatient(id);
      toast.success("Call initiated!");
    } catch {
      toast.error("Call failed");
    }
  };

  const toggleCheckin = (checkinId: string) => {
    setExpandedCheckins((prev) => {
      const next = new Set(prev);
      if (next.has(checkinId)) next.delete(checkinId);
      else next.add(checkinId);
      return next;
    });
  };

  /* ----- Loading State ----- */
  if (loading || !patient) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="h-24 bg-[#1E293B]/60 rounded-2xl"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    );
  }

  const checkins = (patient.checkins || []) as CheckIn[];
  const conversations = (patient.conversations || []) as Message[];
  const color = statusColors[patient.current_status];
  const initials = patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  /* Pain chart data */
  const painData = checkins
    .filter((c) => c.pain_score !== null)
    .reverse()
    .map((c) => ({
      day: `Day ${c.day_number}`,
      pain: c.pain_score,
      risk: c.ai_assessment?.risk_score || 0,
    }));

  /* Collect all symptoms */
  const allSymptoms = Array.from(new Set(checkins.flatMap((c) => c.symptoms_detected || [])));

  /* Latest assessment */
  const latestCheckin = checkins[0];
  const assessment = latestCheckin?.ai_assessment;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">
      {/* ============================================================= */}
      {/*  BACK BUTTON                                                   */}
      {/* ============================================================= */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-[#94A3B8] hover:text-white hover:bg-white/5 transition-all">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
          </Button>
        </Link>
      </motion.div>

      {/* ============================================================= */}
      {/*  HEADER CARD                                                   */}
      {/* ============================================================= */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <Card className={`relative overflow-hidden bg-gradient-to-br ${statusGradients[patient.current_status]} backdrop-blur-xl border-[#334155]/50 p-6 ${statusGlow[patient.current_status]}`}>
          {/* Decorative gradient orb */}
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-20" style={{ backgroundColor: color }} />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Left: Avatar + Info */}
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <motion.div
                className={`relative w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white ${patient.current_status === "critical" ? "animate-pulse-glow" : ""}`}
                style={{
                  background: `linear-gradient(135deg, ${color}40, ${color}15)`,
                  border: `2px solid ${color}50`,
                  boxShadow: `0 0 20px ${color}20`,
                }}
                whileHover={{ scale: 1.05 }}
              >
                {initials}
                {/* Online indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0F172A]" style={{ backgroundColor: color }} />
              </motion.div>

              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">{patient.name}</h1>
                <p className="text-sm text-[#94A3B8] mt-0.5">
                  {patient.surgery_type} <span className="text-[#475569] mx-1">|</span> {patient.gender}
                </p>
                <p className="text-xs text-[#64748B] mt-0.5 flex items-center gap-1">
                  <Stethoscope className="w-3 h-3" />
                  {patient.surgery_date ? format(new Date(patient.surgery_date), "dd MMM yyyy") : "N/A"} <span className="text-[#475569] mx-1">|</span> {patient.hospital}
                </p>
              </div>
            </div>

            {/* Right: Status + Stats */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Status Badge */}
              <motion.div whileHover={{ scale: 1.05 }}>
                <Badge
                  className={`text-sm px-5 py-1.5 font-semibold uppercase tracking-wider ${patient.current_status === "critical" ? "animate-pulse-glow" : ""}`}
                  style={{
                    backgroundColor: `${color}20`,
                    color,
                    border: `1px solid ${color}50`,
                    boxShadow: `0 0 15px ${color}30`,
                  }}
                >
                  {patient.current_status === "critical" && <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />}
                  {patient.current_status}
                </Badge>
              </motion.div>

              {/* Mini stat cards */}
              <div className="flex items-center gap-2">
                {[
                  { label: "Age", value: `${patient.age}y`, icon: Heart },
                  { label: "Day", value: `${patient.days_since_surgery}`, icon: Calendar },
                  { label: "Risk", value: `${patient.risk_score}`, icon: Shield, color },
                ].map((stat) => (
                  <motion.div
                    key={stat.label}
                    className="flex flex-col items-center px-3 py-2 rounded-xl bg-[#0F172A]/40 backdrop-blur-sm border border-[#334155]/50 min-w-[60px]"
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(15,23,42,0.6)" }}
                  >
                    <stat.icon className="w-3 h-3 mb-0.5" style={{ color: stat.color || "#64748B" }} />
                    <span className="text-sm font-bold text-white" style={{ color: stat.color }}>{stat.value}</span>
                    <span className="text-[9px] text-[#64748B] uppercase tracking-wider">{stat.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ============================================================= */}
      {/*  MAIN LAYOUT                                                   */}
      {/* ============================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* =========================================================== */}
        {/*  LEFT: TABS AREA                                             */}
        {/* =========================================================== */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Custom Tab Triggers */}
            <div className="flex items-center gap-1 p-1 bg-[#0F172A]/60 backdrop-blur-sm border border-[#334155]/50 rounded-2xl">
              {tabItems.map((tab) => {
                const isActive = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex-1 justify-center ${
                      isActive ? "text-white" : "text-[#64748B] hover:text-[#94A3B8]"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r from-[#3B82F6]/20 to-[#06B6D4]/20 border border-[#3B82F6]/30 rounded-xl"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <tab.icon className="w-4 h-4 relative z-10" />
                    <span className="relative z-10 hidden sm:inline">{tab.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTabUnderline"
                        className="absolute -bottom-0.5 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] rounded-full"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* ======================================================= */}
            {/*  TIMELINE TAB                                            */}
            {/* ======================================================= */}
            <TabsContent value="timeline" className="mt-5">
              {checkins.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-[#64748B]">
                  <Clock className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm">No check-ins yet</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical gradient line */}
                  <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-[#3B82F6]/60 via-[#334155]/40 to-transparent rounded-full" />

                  <div className="space-y-3">
                    {checkins.map((c, i) => {
                      const cColor = statusColors[c.ai_assessment?.risk_level || "green"];
                      const checkinKey = c.id || String(i);
                      const isExpanded = expandedCheckins.has(checkinKey);
                      const hasDetails = (c.responses && c.responses.length > 0) || c.ai_assessment?.reasoning;

                      return (
                        <motion.div
                          key={checkinKey}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06, duration: 0.4 }}
                        >
                          <div
                            className="relative flex items-start gap-4 cursor-pointer group"
                            onClick={() => hasDetails && toggleCheckin(checkinKey)}
                          >
                            {/* Day circle on timeline */}
                            <div className="relative z-10 flex-shrink-0">
                              <motion.div
                                className="w-[46px] h-[46px] rounded-full flex items-center justify-center text-[11px] font-bold border-2"
                                style={{
                                  backgroundColor: `${cColor}15`,
                                  borderColor: `${cColor}50`,
                                  color: cColor,
                                  boxShadow: `0 0 12px ${cColor}20`,
                                }}
                                whileHover={{ scale: 1.1 }}
                              >
                                D{c.day_number}
                              </motion.div>
                            </div>

                            {/* Content card */}
                            <Card
                              className="flex-1 bg-[#1E293B]/60 backdrop-blur-sm border-[#334155]/50 p-4 hover:bg-[#1E293B]/80 transition-all duration-300 group-hover:border-l-2"
                              style={{ borderLeftColor: isExpanded || undefined ? cColor : undefined, borderLeftWidth: isExpanded ? 3 : undefined }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <p className="text-sm font-semibold text-white">Day {c.day_number}</p>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] uppercase tracking-wider border-[#334155]/70"
                                    style={{ color: cColor, borderColor: `${cColor}40` }}
                                  >
                                    {c.type}
                                  </Badge>
                                  {c.pain_score !== null && (
                                    <span className="text-xs text-[#64748B] flex items-center gap-1">
                                      <Activity className="w-3 h-3" /> Pain: <span className="text-white font-medium">{c.pain_score}/10</span>
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-[#475569]">
                                    {c.created_at ? format(new Date(c.created_at), "dd MMM, HH:mm") : ""}
                                  </span>
                                  {hasDetails && (
                                    isExpanded ? <ChevronUp className="w-4 h-4 text-[#475569]" /> : <ChevronDown className="w-4 h-4 text-[#475569]" />
                                  )}
                                </div>
                              </div>

                              {/* Symptom pills */}
                              {c.symptoms_detected?.length > 0 && (
                                <div className="flex gap-1.5 mt-2.5 flex-wrap">
                                  {c.symptoms_detected.map((s) => (
                                    <SymptomPill key={s} symptom={s} />
                                  ))}
                                </div>
                              )}

                              {/* Expandable details */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-3 pt-3 border-t border-[#334155]/50 space-y-2">
                                      {c.responses?.map((r, ri) => (
                                        <div key={ri} className="flex gap-2">
                                          <span className="text-[10px] text-[#475569] font-medium shrink-0 mt-0.5">Q:</span>
                                          <div>
                                            {r.question && <p className="text-xs text-[#64748B] italic">{r.question}</p>}
                                            <p className="text-sm text-[#CBD5E1]">{r.answer}</p>
                                          </div>
                                        </div>
                                      ))}
                                      {c.ai_assessment?.reasoning && (
                                        <div className="mt-2 p-2.5 rounded-lg bg-[#0F172A]/50 border border-[#334155]/30">
                                          <div className="flex items-center gap-1.5 mb-1">
                                            <Bot className="w-3 h-3 text-[#3B82F6]" />
                                            <span className="text-[10px] font-semibold text-[#3B82F6] uppercase tracking-wider">AI Analysis</span>
                                          </div>
                                          <p className="text-xs text-[#94A3B8]">{c.ai_assessment.reasoning}</p>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </Card>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ======================================================= */}
            {/*  SYMPTOMS TAB                                            */}
            {/* ======================================================= */}
            <TabsContent value="symptoms" className="mt-5 space-y-5">
              {/* Risk Gauge + Symptoms summary row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gauge card */}
                <Card className="bg-[#1E293B]/60 backdrop-blur-sm border-[#334155]/50 p-5 flex flex-col items-center justify-center">
                  <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Current Risk</h4>
                  <RiskGauge score={patient.risk_score} />
                  <Badge
                    className="mt-3 text-[10px] uppercase tracking-wider"
                    style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
                  >
                    {patient.current_status}
                  </Badge>
                </Card>

                {/* Symptoms summary card */}
                <Card className="bg-[#1E293B]/60 backdrop-blur-sm border-[#334155]/50 p-5">
                  <h4 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">Detected Symptoms</h4>
                  {allSymptoms.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {allSymptoms.map((s) => (
                        <SymptomPill key={s} symptom={s} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#475569]">No symptoms detected</p>
                  )}
                  <div className="mt-4 pt-3 border-t border-[#334155]/30">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#64748B]">Total Check-ins</span>
                      <span className="text-white font-medium">{checkins.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1.5">
                      <span className="text-[#64748B]">Avg Pain Score</span>
                      <span className="text-white font-medium">
                        {painData.length > 0
                          ? (painData.reduce((sum, d) => sum + (d.pain || 0), 0) / painData.length).toFixed(1)
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Chart */}
              <Card className="bg-[#1E293B]/60 backdrop-blur-sm border-[#334155]/50 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-[#94A3B8] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#3B82F6]" />
                    Pain & Risk Over Time
                  </h3>
                </div>
                {painData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={painData}>
                      <defs>
                        <linearGradient id="painGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.3} />
                      <XAxis
                        dataKey="day" stroke="#475569" tick={{ fontSize: 11, fill: "#64748B" }}
                        axisLine={{ stroke: "#334155" }} tickLine={false}
                      />
                      <YAxis
                        stroke="#475569" domain={[0, 10]} tick={{ fontSize: 11, fill: "#64748B" }}
                        axisLine={false} tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone" dataKey="pain" stroke="#EF4444" strokeWidth={2.5}
                        fill="url(#painGradient)" name="Pain Score"
                        dot={{ fill: "#EF4444", stroke: "#0F172A", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: "#EF4444", strokeWidth: 2, fill: "#0F172A" }}
                        animationDuration={1500}
                      />
                      <Area
                        type="monotone" dataKey="risk" stroke="#EAB308" strokeWidth={2}
                        fill="url(#riskGradient)" name="Risk Score" strokeDasharray="5 5"
                        dot={{ fill: "#EAB308", stroke: "#0F172A", strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 5, stroke: "#EAB308", strokeWidth: 2, fill: "#0F172A" }}
                        animationDuration={1500}
                        animationBegin={300}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-[#475569]">
                    <Activity className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">No symptom data yet</p>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* ======================================================= */}
            {/*  CONVERSATIONS TAB                                       */}
            {/* ======================================================= */}
            <TabsContent value="conversations" className="mt-5">
              <Card className="bg-[#0F172A]/60 backdrop-blur-sm border-[#334155]/50 rounded-2xl overflow-hidden">
                {/* Chat header */}
                <div className="px-5 py-3 border-b border-[#334155]/50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Conversation History</p>
                    <p className="text-[10px] text-[#475569]">{conversations.length} messages</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="p-4 max-h-[500px] overflow-y-auto space-y-4">
                  {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[#475569]">
                      <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-sm">No conversations yet</p>
                    </div>
                  ) : (
                    conversations.map((msg, i) => {
                      const isAI = msg.role === "ai";
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.3 }}
                          className={`flex ${isAI ? "justify-start" : "justify-end"}`}
                        >
                          <div className={`flex items-end gap-2 max-w-[80%] ${isAI ? "" : "flex-row-reverse"}`}>
                            {/* Avatar */}
                            <div
                              className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                                isAI
                                  ? "bg-gradient-to-br from-[#3B82F6] to-[#06B6D4]"
                                  : "bg-gradient-to-br from-[#8B5CF6] to-[#EC4899]"
                              }`}
                            >
                              {isAI ? <Bot className="w-3.5 h-3.5 text-white" /> : <User className="w-3.5 h-3.5 text-white" />}
                            </div>

                            {/* Bubble */}
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-sm ${
                                isAI
                                  ? "bg-gradient-to-br from-[#3B82F6]/25 to-[#06B6D4]/15 text-white rounded-bl-md border border-[#3B82F6]/20"
                                  : "bg-[#1E293B]/80 text-[#F8FAFC] rounded-br-md border border-[#334155]/50"
                              }`}
                            >
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                {msg.content_type && msg.content_type !== "text" && (
                                  <span className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full ${
                                    isAI ? "bg-[#3B82F6]/20 text-[#60A5FA]" : "bg-[#475569]/30 text-[#94A3B8]"
                                  }`}>
                                    <MessageTypeIcon type={msg.content_type} />
                                    {msg.content_type}
                                  </span>
                                )}
                                <span className="text-[10px] text-[#475569]">
                                  {msg.timestamp ? format(new Date(msg.timestamp), "dd MMM, HH:mm") : ""}
                                </span>
                                {msg.language && msg.language !== "en" && (
                                  <span className="text-[9px] text-[#475569] uppercase">{msg.language}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* ======================================================= */}
            {/*  MEDICINES TAB                                           */}
            {/* ======================================================= */}
            <TabsContent value="medicines" className="mt-5">
              {!patient.medicines?.length ? (
                <div className="flex flex-col items-center justify-center py-16 text-[#475569]">
                  <Pill className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No medicines listed</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {patient.medicines.map((med, i) => {
                    const pct = med.total_count > 0 ? Math.round((med.taken_count / med.total_count) * 100) : 0;
                    const ringColor = pct >= 80 ? "#22C55E" : pct >= 50 ? "#EAB308" : "#EF4444";
                    const bgTint = pct >= 80 ? "from-emerald-500/5" : pct >= 50 ? "from-amber-500/5" : "from-red-500/5";

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1, duration: 0.4 }}
                      >
                        <Card className={`bg-gradient-to-br ${bgTint} to-transparent bg-[#1E293B]/60 backdrop-blur-sm border-[#334155]/50 p-4 hover:bg-[#1E293B]/80 transition-all duration-300`}>
                          <div className="flex items-center gap-4">
                            {/* Progress ring */}
                            <ProgressRing percent={pct} color={ringColor} />

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Pill className="w-3.5 h-3.5 flex-shrink-0" style={{ color: ringColor }} />
                                <p className="text-sm font-semibold text-white truncate">{med.name}</p>
                              </div>
                              <p className="text-xs text-[#64748B] mt-0.5">{med.dosage}</p>
                              <p className="text-[11px] text-[#475569] mt-0.5">{med.frequency}</p>
                            </div>

                            {/* Count */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-[#64748B]">
                                <span className="text-white font-medium">{med.taken_count}</span>/{med.total_count}
                              </p>
                              <p className="text-[10px] text-[#475569]">doses</p>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* =========================================================== */}
        {/*  RIGHT: SIDE PANEL                                           */}
        {/* =========================================================== */}
        <div className="space-y-4">

          {/* ---- AI Assessment ---- */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
            <Card className="relative overflow-hidden bg-[#1E293B]/60 backdrop-blur-sm border-[#334155]/50 p-5">
              {/* Gradient top border */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#3B82F6] via-[#06B6D4] to-[#8B5CF6]" />

              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#3B82F6]/30 to-[#06B6D4]/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-[#3B82F6]" />
                </div>
                <h3 className="text-sm font-semibold text-white">AI Assessment</h3>
              </div>

              {assessment ? (
                <div className="space-y-4">
                  {/* Mini gauge */}
                  <div className="flex justify-center">
                    <RiskGauge score={assessment.risk_score} size={130} strokeWidth={10} />
                  </div>

                  {/* Status badge */}
                  <div className="flex justify-center">
                    <Badge
                      className="text-[10px] uppercase tracking-wider font-semibold"
                      style={{
                        backgroundColor: `${statusColors[assessment.risk_level] || "#22C55E"}20`,
                        color: statusColors[assessment.risk_level] || "#22C55E",
                        border: `1px solid ${statusColors[assessment.risk_level] || "#22C55E"}40`,
                      }}
                    >
                      {assessment.risk_level?.toUpperCase()} RISK
                    </Badge>
                  </div>

                  {/* Reasoning */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Reasoning</p>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: statusColors[assessment.risk_level] ? `${statusColors[assessment.risk_level]}CC` : "#CBD5E1" }}
                    >
                      {assessment.reasoning}
                    </p>
                  </div>

                  {/* Recommended Action */}
                  {assessment.recommended_action && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-[#3B82F6]/10 to-[#06B6D4]/5 border border-[#3B82F6]/20">
                      <p className="text-[10px] font-semibold text-[#3B82F6] uppercase tracking-wider mb-1">Recommended Action</p>
                      <p className="text-sm text-[#CBD5E1] leading-relaxed">{assessment.recommended_action}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-[#475569]">
                  <Bot className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No assessment available</p>
                </div>
              )}
            </Card>
          </motion.div>

          {/* ---- Quick Actions ---- */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
            <Card className="bg-[#1E293B]/60 backdrop-blur-sm border-[#334155]/50 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white mb-1">Quick Actions</h3>

              {/* Send Message */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    className="w-full bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:from-[#2563EB] hover:to-[#1D4ED8] text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-blue-500/30 hover:scale-[1.02]"
                    size="sm"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" /> Send Message
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1E293B] border-[#334155]">
                  <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-[#3B82F6]" /> Send WhatsApp Message
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input
                      placeholder="Type your message..."
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                      className="bg-[#0F172A] border-[#334155] focus:border-[#3B82F6] transition-colors"
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={sending}
                      className="w-full bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] hover:from-[#2563EB] hover:to-[#0891B2] text-white shadow-lg shadow-blue-500/20"
                    >
                      <Send className="w-4 h-4 mr-2" /> {sending ? "Sending..." : "Send"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Call Patient */}
              <Button
                onClick={handleCall}
                className="w-full bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803D] text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:shadow-emerald-500/30 hover:scale-[1.02]"
                size="sm"
              >
                <Phone className="w-4 h-4 mr-2" /> Call Patient
              </Button>

              {/* Schedule Visit */}
              <Button
                className="w-full bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white shadow-lg shadow-purple-500/20 transition-all duration-300 hover:shadow-purple-500/30 hover:scale-[1.02]"
                size="sm"
              >
                <Calendar className="w-4 h-4 mr-2" /> Schedule Visit
              </Button>
            </Card>
          </motion.div>

          {/* ---- Patient Info ---- */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
            <Card className="bg-[#1E293B]/60 backdrop-blur-sm border-[#334155]/50 p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-[#64748B]" /> Patient Info
              </h3>
              <div className="space-y-2.5">
                {[
                  { label: "Phone", value: patient.phone },
                  { label: "Language", value: patient.language_preference?.toUpperCase() },
                  ...(patient.family_contacts?.map((fc) => ({ label: fc.relation, value: fc.name })) || []),
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#334155]/30 last:border-0">
                    <span className="text-xs text-[#64748B] capitalize">{item.label}</span>
                    <span className="text-sm text-white font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
