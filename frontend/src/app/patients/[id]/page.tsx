"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MessageSquare, Phone, Bot, UserRound,
  Send, Image, Mic, Calendar, Pill, FileText, Activity,
  TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle2, Shield,
} from "lucide-react";
import Link from "next/link";
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Area, AreaChart, BarChart, Bar,
} from "recharts";
import { format } from "date-fns";
import { AppShell } from "@/components/layout/AppShell";
import { PageWrapper, staggerContainer, staggerItem } from "@/components/shared/PageWrapper";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  getPatient, getCheckins, setHandoffMode, doctorReply,
  callPatient,
} from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";
import type { Patient, CheckIn, Message } from "@/types";

const statusConfig: Record<string, { color: string; bg: string; label: string; dot: string }> = {
  green: { color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800", label: "GREEN", dot: "bg-emerald-500 glow-green" },
  yellow: { color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800", label: "YELLOW", dot: "bg-amber-500 glow-yellow" },
  red: { color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800", label: "RED", dot: "bg-red-500 glow-red" },
  critical: { color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800", label: "CRITICAL", dot: "bg-red-600 pulse-critical" },
};

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AppShell>
      <PatientDetailContent id={id} />
    </AppShell>
  );
}

function PatientDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [patientRes, checkinsRes] = await Promise.all([
        getPatient(id),
        getCheckins(id),
      ]);
      setPatient(patientRes.data);
      setCheckins(checkinsRes.data || []);
    } catch {
      toast.error("Failed to load patient");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const socket = getSocket();
    socket.on("new_message", (data: { patient_id: string }) => {
      if (data.patient_id === id) fetchData();
    });
    socket.on("new_checkin", (data: { patient_id: string }) => {
      if (data.patient_id === id) fetchData();
    });
    return () => { socket.off("new_message"); socket.off("new_checkin"); };
  }, [id, fetchData]);

  // Poll every 3s when in doctor mode for real-time feel
  useEffect(() => {
    if (patient?.mode !== "doctor") return;
    const interval = setInterval(() => fetchData(), 3000);
    return () => clearInterval(interval);
  }, [patient?.mode, fetchData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [patient?.conversations]);

  const handleHandoff = async (mode: "ai" | "doctor") => {
    try {
      await setHandoffMode(id, mode);
      toast.success(mode === "doctor" ? "You took over the conversation" : "Conversation handed to AI");
      fetchData();
    } catch {
      toast.error("Failed to change mode");
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    try {
      await doctorReply(id, message);
      setMessage("");
      fetchData();
    } catch {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleCall = async () => {
    try {
      await callPatient(id);
      toast.success("Calling patient...");
    } catch {
      toast.error("Failed to initiate call");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 skeleton" />
        <div className="h-40 skeleton" />
        <div className="h-10 skeleton" />
        <div className="h-96 skeleton" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Patient not found</p>
        <Button variant="outline" onClick={() => router.push("/patients")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Patients
        </Button>
      </div>
    );
  }

  const status = statusConfig[patient.current_status] || statusConfig.green;
  const conversations = patient.conversations || [];
  const isDoctorMode = patient.mode === "doctor";
  const recovery = 100 - (patient.risk_score || 0);

  // Build chart data from checkins
  const painData = checkins
    .filter((c) => c.pain_score !== null)
    .map((c) => ({ day: `Day ${c.day_number}`, pain: c.pain_score, date: format(new Date(c.created_at), "MMM d") }))
    .reverse();

  const symptomCounts: Record<string, number> = {};
  checkins.forEach((c) => c.symptoms_detected?.forEach((s) => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; }));
  const symptomData = Object.entries(symptomCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const latestCheckin = checkins[0];
  const aiAssessment = latestCheckin?.ai_assessment;

  return (
    <PageWrapper>
      <div className="space-y-4">
        {/* Back button */}
        <Link href="/patients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Patients
        </Link>

        {/* Patient Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-card border border-border rounded-xl p-5 card-glow gradient-border"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold shrink-0 avatar-glow"
            >
              {patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{patient.name}</h1>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${status.bg} ${status.color}`}>
                  <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {patient.age} years · {patient.gender} · {patient.language_preference}
              </p>
              <p className="text-sm text-muted-foreground">
                {patient.surgery_type} · Day {patient.days_since_surgery} of recovery
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {patient.phone} · {patient.hospital}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("conversations")}>
                  <MessageSquare className="w-4 h-4 mr-1.5" /> Chat
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button variant="outline" size="sm" onClick={handleCall}>
                  <Phone className="w-4 h-4 mr-1.5" /> Call
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  variant={isDoctorMode ? "default" : "outline"}
                  size="sm"
                  className={isDoctorMode ? "btn-premium text-white" : ""}
                  onClick={() => handleHandoff(isDoctorMode ? "ai" : "doctor")}
                >
                  {isDoctorMode ? <Bot className="w-4 h-4 mr-1.5" /> : <UserRound className="w-4 h-4 mr-1.5" />}
                  {isDoctorMode ? "Hand to AI" : "Take Over"}
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto no-scrollbar bg-transparent border-b border-border rounded-none h-auto p-0 gap-0">
            {[
              { value: "overview", label: "Overview", icon: Activity },
              { value: "conversations", label: "Conversations", icon: MessageSquare },
              { value: "checkins", label: "Check-ins", icon: CheckCircle2 },
              { value: "photos", label: "Photos", icon: Image },
              { value: "medicines", label: "Medicines", icon: Pill },
              { value: "appointments", label: "Appointments", icon: Calendar },
              { value: "reports", label: "Reports", icon: FileText },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm"
              >
                <tab.icon className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 lg:grid-cols-5 gap-6"
            >
              {/* Left column */}
              <div className="lg:col-span-3 space-y-6">
                {/* Recovery Progress */}
                <motion.div variants={staggerItem} className="bg-card border border-border rounded-xl p-5 card-glow">
                  <h3 className="text-sm font-semibold mb-4">Recovery Progress</h3>
                  <div className="flex items-center gap-6">
                    <div className="relative w-28 h-28">
                      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/50" />
                        <motion.circle
                          cx="50" cy="50" r="42" fill="none" strokeWidth="8"
                          strokeLinecap="round"
                          className="text-primary"
                          strokeDasharray={`${2 * Math.PI * 42}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - recovery / 100) }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold">{recovery}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Overall recovery score</p>
                      <p className="text-xs text-muted-foreground mt-1">Based on check-in responses, pain levels, and medicine adherence</p>
                    </div>
                  </div>
                </motion.div>

                {/* Pain Trend */}
                {painData.length > 0 && (
                  <motion.div variants={staggerItem} className="bg-card border border-border rounded-xl p-5 card-glow">
                    <h3 className="text-sm font-semibold mb-4">Pain Trend</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={painData}>
                        <defs>
                          <linearGradient id="painGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                        <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                        <RechartsTooltip
                          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                        />
                        <Area type="monotone" dataKey="pain" stroke="#3B82F6" fill="url(#painGrad)" strokeWidth={2} dot={{ r: 4, fill: "#3B82F6" }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}

                {/* Symptom Frequency */}
                {symptomData.length > 0 && (
                  <motion.div variants={staggerItem} className="bg-card border border-border rounded-xl p-5 card-glow">
                    <h3 className="text-sm font-semibold mb-4">Symptom Frequency</h3>
                    <ResponsiveContainer width="100%" height={symptomData.length * 40 + 20}>
                      <BarChart data={symptomData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                        <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}

                {/* Medicine Adherence */}
                {patient.medicines && patient.medicines.length > 0 && (
                  <motion.div variants={staggerItem} className="bg-card border border-border rounded-xl p-5 card-glow">
                    <h3 className="text-sm font-semibold mb-4">Medicine Adherence</h3>
                    <div className="space-y-3">
                      {patient.medicines.map((med, i) => {
                        const adherence = med.total_count > 0 ? Math.round((med.taken_count / med.total_count) * 100) : 0;
                        return (
                          <div key={i} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{med.name} <span className="text-muted-foreground font-normal">({med.dosage})</span></span>
                              <span className={adherence > 80 ? "text-emerald-600" : adherence > 50 ? "text-amber-600" : "text-red-600"}>
                                {adherence}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${adherence}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className={`h-full rounded-full ${
                                  adherence > 80 ? "bg-emerald-500" : adherence > 50 ? "bg-amber-500" : "bg-red-500"
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Right column */}
              <div className="lg:col-span-2 space-y-4">
                {/* AI Assessment */}
                {aiAssessment && (
                  <motion.div variants={staggerItem} className="bg-heal-50/50 dark:bg-heal-900/10 border border-heal-200 dark:border-heal-800/30 rounded-xl p-5 card-glow gradient-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold">AI Assessment</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Risk Level</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          statusConfig[aiAssessment.risk_level]?.bg || statusConfig.green.bg
                        } ${statusConfig[aiAssessment.risk_level]?.color || statusConfig.green.color}`}>
                          {aiAssessment.risk_level?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Risk Score</span>
                          <span className="text-sm font-semibold">{aiAssessment.risk_score}/100</span>
                        </div>
                        <div className="h-2 bg-white dark:bg-card rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${aiAssessment.risk_score}%` }}
                            transition={{ duration: 1 }}
                            className={`h-full rounded-full ${
                              aiAssessment.risk_score > 70 ? "bg-red-500" : aiAssessment.risk_score > 40 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">AI Reasoning</p>
                        <p className="text-sm leading-relaxed">{aiAssessment.reasoning}</p>
                      </div>
                      {aiAssessment.recommended_action && (
                        <div className="bg-white dark:bg-card rounded-lg p-3 border border-border">
                          <p className="text-xs text-muted-foreground mb-1">Recommended Action</p>
                          <p className="text-sm font-medium">{aiAssessment.recommended_action}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Family Contacts */}
                {patient.family_contacts && patient.family_contacts.length > 0 && (
                  <motion.div variants={staggerItem} className="bg-card border border-border rounded-xl p-5 card-glow">
                    <h3 className="text-sm font-semibold mb-3">Family Contacts</h3>
                    <div className="space-y-3">
                      {patient.family_contacts.map((fc, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {fc.name?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{fc.name}</p>
                            <p className="text-xs text-muted-foreground">{fc.relation} · {fc.phone}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Quick Info */}
                <motion.div variants={staggerItem} className="bg-card border border-border rounded-xl p-5 card-glow">
                  <h3 className="text-sm font-semibold mb-3">Quick Info</h3>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Registration</span>
                      <span>{patient.created_at ? format(new Date(patient.created_at), "MMM d, yyyy") : "—"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Check-ins</span>
                      <span>{checkins.length}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Pain Score</span>
                      <span>{painData.length > 0 ? (painData.reduce((sum, d) => sum + (d.pain || 0), 0) / painData.length).toFixed(1) : "—"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Language</span>
                      <span className="capitalize">{patient.language_preference}</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </TabsContent>

          {/* Conversations Tab */}
          <TabsContent value="conversations" className="mt-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-card border border-border rounded-xl overflow-hidden flex flex-col card-glow" style={{ height: "calc(100vh - 320px)", minHeight: 500 }}>
              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <h3 className="text-sm font-semibold">Conversations</h3>
                <Button
                  variant={isDoctorMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleHandoff(isDoctorMode ? "ai" : "doctor")}
                >
                  {isDoctorMode ? <Bot className="w-3.5 h-3.5 mr-1.5" /> : <UserRound className="w-3.5 h-3.5 mr-1.5" />}
                  {isDoctorMode ? "Hand to AI" : "Take Over"}
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-2xl mx-auto">
                  {conversations.length === 0 ? (
                    <div className="text-center py-12 text-sm text-muted-foreground">
                      No conversations yet
                    </div>
                  ) : (
                    conversations.map((msg, i) => (
                      <MessageBubble key={i} message={msg} />
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="px-4 py-3 border-t border-border shrink-0">
                {isDoctorMode ? (
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type a message to patient..."
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                      disabled={isSending}
                    />
                    <Button onClick={handleSendMessage} disabled={isSending || !message.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-sm text-muted-foreground">AI is handling this conversation</p>
                    <Button variant="link" size="sm" onClick={() => handleHandoff("doctor")} className="text-primary">
                      Take over
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </TabsContent>

          {/* Check-ins Tab */}
          <TabsContent value="checkins" className="mt-4">
            <div className="max-w-2xl">
              {checkins.length === 0 ? (
                <EmptyState text="No check-ins yet" />
              ) : (
                <div className="relative pl-6 border-l-2 border-border space-y-6">
                  {checkins.map((checkin, i) => {
                    const cStatus = checkin.ai_assessment?.risk_level || "green";
                    const sConfig = statusConfig[cStatus] || statusConfig.green;
                    const painTrend = i < checkins.length - 1 && checkins[i + 1]?.pain_score !== null && checkin.pain_score !== null
                      ? (checkin.pain_score || 0) > (checkins[i + 1]?.pain_score || 0)
                        ? "up" : (checkin.pain_score || 0) < (checkins[i + 1]?.pain_score || 0) ? "down" : "same"
                      : "same";
                    return (
                      <motion.div
                        key={checkin.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="relative"
                      >
                        <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-background ${
                          cStatus === "green" ? "bg-emerald-500" : cStatus === "yellow" ? "bg-amber-500" : "bg-red-500"
                        }`} />
                        <div className="bg-card border border-border rounded-xl p-4 card-glow">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">Day {checkin.day_number}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(checkin.created_at), "MMM d, yyyy")}
                              </span>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sConfig.bg} ${sConfig.color}`}>
                              {sConfig.label}
                            </span>
                          </div>
                          <div className="space-y-1.5 text-sm">
                            {checkin.pain_score !== null && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Pain:</span>
                                <span className="font-medium">{checkin.pain_score}/10</span>
                                {painTrend === "down" && <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />}
                                {painTrend === "up" && <TrendingUp className="w-3.5 h-3.5 text-red-500" />}
                                {painTrend === "same" && <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Symptoms:</span>
                              <span>{checkin.symptoms_detected?.length ? checkin.symptoms_detected.join(", ") : "None"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Medicines:</span>
                              <span>{checkin.medicine_taken ? "All taken" : "Not taken"}</span>
                              {checkin.medicine_taken ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                            </div>
                            {checkin.ai_assessment?.reasoning && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                AI: &ldquo;{checkin.ai_assessment.reasoning}&rdquo;
                              </p>
                            )}
                            {checkin.wound_photo_url && (
                              <div className="mt-2 flex items-center gap-1.5 text-xs text-primary">
                                <Image className="w-3.5 h-3.5" /> Wound photo attached
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos" className="mt-4">
            {(() => {
              const photos = checkins.filter((c) => c.wound_photo_url);
              return photos.length === 0 ? (
                <EmptyState text="No wound photos uploaded yet" />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ y: -3, boxShadow: "0 8px 25px rgba(0,0,0,0.08)" }}
                      className="bg-card border border-border rounded-xl overflow-hidden card-glow"
                    >
                      <div className="aspect-square bg-muted flex items-center justify-center">
                        <Image className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium">Day {c.day_number}</p>
                        {c.wound_analysis && (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border mt-1 inline-block ${
                            statusConfig[c.wound_analysis.risk_level]?.bg || statusConfig.green.bg
                          }`}>
                            {c.wound_analysis.risk_level}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              );
            })()}
          </TabsContent>

          {/* Medicines Tab */}
          <TabsContent value="medicines" className="mt-4">
            {!patient.medicines || patient.medicines.length === 0 ? (
              <EmptyState text="No medicines prescribed" />
            ) : (
              <div className="space-y-3 max-w-xl">
                {patient.medicines.map((med, i) => {
                  const adherence = med.total_count > 0 ? Math.round((med.taken_count / med.total_count) * 100) : 0;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ y: -2, boxShadow: "0 6px 20px rgba(0,0,0,0.06)" }}
                      className="bg-card border border-border rounded-xl p-4 card-glow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-semibold">{med.name}</p>
                          <p className="text-xs text-muted-foreground">{med.dosage} · {med.frequency}</p>
                        </div>
                        <span className={`text-sm font-bold ${
                          adherence > 80 ? "text-emerald-600" : adherence > 50 ? "text-amber-600" : "text-red-600"
                        }`}>
                          {adherence}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            adherence > 80 ? "bg-emerald-500" : adherence > 50 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${adherence}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {med.taken_count} of {med.total_count} doses taken
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="mt-4">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Manage appointments from the Appointments page</p>
              <Link href="/appointments">
                <Button variant="outline" size="sm" className="mt-3">Go to Appointments</Button>
              </Link>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-5 max-w-2xl card-glow"
            >
              <h3 className="text-sm font-semibold mb-3">Recovery Summary</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {patient.name} has been recovering from {patient.surgery_type} surgery for {patient.days_since_surgery} days.
                Current status is <span className={`font-medium ${status.color}`}>{status.label}</span> with
                a recovery score of {recovery}%.
                {painData.length > 0 && ` Average pain score across ${painData.length} check-ins is ${(painData.reduce((s, d) => s + (d.pain || 0), 0) / painData.length).toFixed(1)}/10.`}
                {checkins.length > 0 && ` Total of ${checkins.length} check-ins completed.`}
              </p>
              {aiAssessment && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Latest AI Assessment</p>
                  <p className="text-sm">{aiAssessment.reasoning}</p>
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isPatient = message.role === "patient";
  const isDoctor = message.role === "doctor";
  const isAI = message.role === "ai";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`flex ${isPatient ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[80%] ${isPatient ? "order-1" : "order-1"}`}>
        <p className={`text-[10px] font-medium mb-1 ${isPatient ? "text-right" : ""} ${
          isDoctor ? "text-emerald-600 dark:text-emerald-400" : isAI ? "text-primary" : "text-muted-foreground"
        }`}>
          {isAI ? "Heal Hub AI" : isDoctor ? "Dr." : "Patient"}
        </p>
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isPatient
            ? "bg-muted rounded-tr-sm"
            : isDoctor
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-l-2 border-emerald-500 rounded-tl-sm"
              : "bg-blue-50 dark:bg-blue-950/30 rounded-tl-sm"
        }`}>
          {message.content_type === "image" ? (
            <div className="w-40 h-40 bg-muted rounded-lg flex items-center justify-center">
              <Image className="w-6 h-6 text-muted-foreground" />
            </div>
          ) : message.content_type === "audio" ? (
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              <div className="flex gap-0.5">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="w-0.5 bg-current opacity-40 rounded-full" style={{ height: Math.random() * 16 + 4 }} />
                ))}
              </div>
            </div>
          ) : (
            <p>{message.content}</p>
          )}
        </div>
        <p className={`text-[10px] text-muted-foreground mt-0.5 ${isPatient ? "text-right" : ""}`}>
          {message.timestamp ? format(new Date(message.timestamp), "h:mm a") : ""}
        </p>
      </div>
    </motion.div>
  );
}

function EmptyState({ text, action }: { text: string; action?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <FileText className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
      {action && (
        <Button variant="outline" size="sm" className="mt-3">{action}</Button>
      )}
    </div>
  );
}
