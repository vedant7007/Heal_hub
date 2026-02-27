"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, MessageSquare, Phone, Calendar, Send } from "lucide-react";
import { getPatient, sendMessage, callPatient } from "@/lib/api";
import { Patient, CheckIn, Message } from "@/types";
import { motion } from "framer-motion";
import { format } from "date-fns";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  green: "#22C55E", yellow: "#EAB308", red: "#EF4444", critical: "#EF4444",
};

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);

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

  if (loading || !patient) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-[#1E293B] rounded-xl animate-pulse" />
        <div className="h-96 bg-[#1E293B] rounded-xl animate-pulse" />
      </div>
    );
  }

  const checkins = (patient.checkins || []) as CheckIn[];
  const conversations = (patient.conversations || []) as Message[];
  const color = statusColors[patient.current_status];

  // Pain chart data
  const painData = checkins
    .filter((c) => c.pain_score !== null)
    .reverse()
    .map((c) => ({
      day: `Day ${c.day_number}`,
      pain: c.pain_score,
      risk: c.ai_assessment?.risk_score || 0,
    }));

  // Latest assessment
  const latestCheckin = checkins[0];
  const assessment = latestCheckin?.ai_assessment;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-[#94A3B8]">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </Link>
      </div>

      <Card className="bg-[#1E293B] border-[#334155] p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-4 h-4 rounded-full ${patient.current_status === "critical" ? "animate-pulse-red" : ""}`}
              style={{ backgroundColor: color }}
            />
            <div>
              <h1 className="text-2xl font-bold text-white">{patient.name}</h1>
              <p className="text-sm text-[#94A3B8]">
                {patient.surgery_type} &middot; {patient.age}y {patient.gender} &middot; Day {patient.days_since_surgery}
              </p>
              <p className="text-xs text-[#64748B]">
                Surgery: {patient.surgery_date ? format(new Date(patient.surgery_date), "dd MMM yyyy") : "N/A"} &middot; {patient.hospital}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              className="text-sm px-4 py-1"
              style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
            >
              {patient.current_status.toUpperCase()}
            </Badge>
            <span className="text-sm text-[#94A3B8]">
              Risk: <span style={{ color }}>{patient.risk_score}/100</span>
            </span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="timeline">
            <TabsList className="bg-[#1E293B] border border-[#334155]">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
              <TabsTrigger value="conversations">Chat</TabsTrigger>
              <TabsTrigger value="medicines">Medicines</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-4 space-y-3">
              {checkins.length === 0 ? (
                <p className="text-[#64748B] text-center py-8">No check-ins yet</p>
              ) : (
                checkins.map((c, i) => {
                  const cColor = statusColors[c.ai_assessment?.risk_level || "green"];
                  return (
                    <motion.div
                      key={c.id || i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="bg-[#1E293B] border-[#334155] p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full mt-1" style={{ backgroundColor: cColor }} />
                            {i < checkins.length - 1 && <div className="w-0.5 h-full bg-[#334155] mt-1" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-white">Day {c.day_number} — {c.type}</p>
                              <span className="text-xs text-[#64748B]">
                                {c.created_at ? format(new Date(c.created_at), "dd MMM, HH:mm") : ""}
                              </span>
                            </div>
                            {c.responses?.map((r, ri) => (
                              <p key={ri} className="text-sm text-[#94A3B8] mt-1">{r.answer}</p>
                            ))}
                            {c.pain_score !== null && (
                              <span className="text-xs text-[#64748B]">Pain: {c.pain_score}/10</span>
                            )}
                            {c.symptoms_detected?.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {c.symptoms_detected.map((s) => (
                                  <Badge key={s} variant="outline" className="text-[10px] border-[#334155] text-[#94A3B8]">
                                    {s}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {c.ai_assessment?.reasoning && (
                              <p className="text-xs text-[#64748B] mt-2 italic">
                                AI: {c.ai_assessment.reasoning}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="symptoms" className="mt-4">
              <Card className="bg-[#1E293B] border-[#334155] p-6">
                <h3 className="text-sm font-semibold text-[#94A3B8] mb-4">Pain Score Over Time</h3>
                {painData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={painData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="day" stroke="#64748B" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#64748B" domain={[0, 10]} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: 8, color: "#F8FAFC" }}
                      />
                      <Line type="monotone" dataKey="pain" stroke="#EF4444" strokeWidth={2} dot={{ fill: "#EF4444" }} name="Pain Score" />
                      <Line type="monotone" dataKey="risk" stroke="#EAB308" strokeWidth={2} dot={{ fill: "#EAB308" }} name="Risk Score" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-[#64748B] text-center py-8">No symptom data yet</p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="conversations" className="mt-4">
              <Card className="bg-[#1E293B] border-[#334155] p-4 max-h-[500px] overflow-y-auto">
                {conversations.length === 0 ? (
                  <p className="text-[#64748B] text-center py-8">No conversations yet</p>
                ) : (
                  <div className="space-y-3">
                    {conversations.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                            msg.role === "ai"
                              ? "bg-[#3B82F6]/20 text-white rounded-bl-sm"
                              : "bg-[#334155] text-[#F8FAFC] rounded-br-sm"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-[10px] text-[#64748B] mt-1">
                            {msg.timestamp ? format(new Date(msg.timestamp), "dd MMM, HH:mm") : ""}
                            {msg.language && msg.language !== "en" ? ` · ${msg.language.toUpperCase()}` : ""}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="medicines" className="mt-4">
              <Card className="bg-[#1E293B] border-[#334155] p-4">
                {patient.medicines?.length === 0 ? (
                  <p className="text-[#64748B] text-center py-8">No medicines listed</p>
                ) : (
                  <div className="space-y-4">
                    {patient.medicines?.map((med, i) => {
                      const pct = med.total_count > 0 ? Math.round((med.taken_count / med.total_count) * 100) : 0;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <p className="text-sm font-medium text-white">{med.name}</p>
                              <p className="text-xs text-[#64748B]">{med.dosage} — {med.frequency}</p>
                            </div>
                            <span className="text-sm text-[#94A3B8]">{pct}%</span>
                          </div>
                          <div className="h-2 bg-[#334155] rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: pct >= 80 ? "#22C55E" : pct >= 50 ? "#EAB308" : "#EF4444" }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, delay: i * 0.1 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Side panel — AI Reasoning */}
        <div className="space-y-4">
          <Card className="bg-[#1E293B] border-[#334155] p-5">
            <h3 className="text-sm font-semibold text-[#94A3B8] mb-3">AI Assessment</h3>
            {assessment ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors[assessment.risk_level] || "#22C55E" }} />
                  <span className="text-sm font-medium text-white">{assessment.risk_level?.toUpperCase()}</span>
                  <span className="text-xs text-[#64748B] ml-auto">Score: {assessment.risk_score}/100</span>
                </div>
                <div className="h-2 bg-[#334155] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${assessment.risk_score}%`,
                      backgroundColor: statusColors[assessment.risk_level] || "#22C55E",
                    }}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#94A3B8] mb-1">Reasoning</p>
                  <p className="text-sm text-[#CBD5E1]">{assessment.reasoning}</p>
                </div>
                {assessment.recommended_action && (
                  <div>
                    <p className="text-xs font-medium text-[#94A3B8] mb-1">Recommended Action</p>
                    <p className="text-sm text-[#CBD5E1]">{assessment.recommended_action}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#64748B]">No assessment available</p>
            )}
          </Card>

          {/* Quick Actions */}
          <Card className="bg-[#1E293B] border-[#334155] p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[#94A3B8] mb-2">Quick Actions</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full bg-[#3B82F6] hover:bg-[#2563EB]" size="sm">
                  <MessageSquare className="w-4 h-4 mr-2" /> Send Message
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1E293B] border-[#334155]">
                <DialogHeader>
                  <DialogTitle className="text-white">Send WhatsApp Message</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input
                    placeholder="Type your message..."
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    className="bg-[#0F172A] border-[#334155]"
                  />
                  <Button onClick={handleSendMessage} disabled={sending} className="w-full bg-[#3B82F6]">
                    <Send className="w-4 h-4 mr-2" /> {sending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={handleCall} variant="outline" className="w-full border-[#334155] text-[#94A3B8] hover:text-white" size="sm">
              <Phone className="w-4 h-4 mr-2" /> Call Patient
            </Button>
            <Button variant="outline" className="w-full border-[#334155] text-[#94A3B8] hover:text-white" size="sm">
              <Calendar className="w-4 h-4 mr-2" /> Schedule Visit
            </Button>
          </Card>

          {/* Patient Info */}
          <Card className="bg-[#1E293B] border-[#334155] p-5">
            <h3 className="text-sm font-semibold text-[#94A3B8] mb-3">Patient Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Phone</span>
                <span className="text-white">{patient.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Language</span>
                <span className="text-white">{patient.language_preference?.toUpperCase()}</span>
              </div>
              {patient.family_contacts?.map((fc, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-[#64748B]">{fc.relation}</span>
                  <span className="text-white">{fc.name}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
