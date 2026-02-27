"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  Phone,
  Brain,
  Bell,
  BellRing,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import { getAlerts, updateAlert, callPatient } from "@/lib/api";
import { Alert } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";

const filterTabs = ["all", "new", "acknowledged", "resolved"];
const levelColors: Record<number, string> = {
  1: "#EAB308",
  2: "#EF4444",
  3: "#EF4444",
  4: "#EF4444",
};
const levelLabels: Record<number, string> = {
  1: "Mild",
  2: "Serious",
  3: "Critical",
  4: "Emergency",
};

const levelGradients: Record<number, string> = {
  1: "from-yellow-500/20 to-yellow-500/5",
  2: "from-red-500/20 to-red-500/5",
  3: "from-red-600/30 to-red-500/5",
  4: "from-red-700/40 to-red-500/5",
};

const symptomColors = [
  "border-blue-400/40 text-blue-300 bg-blue-500/10",
  "border-purple-400/40 text-purple-300 bg-purple-500/10",
  "border-amber-400/40 text-amber-300 bg-amber-500/10",
  "border-pink-400/40 text-pink-300 bg-pink-500/10",
  "border-cyan-400/40 text-cyan-300 bg-cyan-500/10",
  "border-emerald-400/40 text-emerald-300 bg-emerald-500/10",
];

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("healhub_token")) {
      router.push("/login");
      return;
    }
    loadAlerts();

    const socket = getSocket();
    socket.on("new_alert", () => {
      loadAlerts();
      toast.warning("New alert received!");
    });
    return () => { socket.off("new_alert"); };
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  const loadAlerts = async () => {
    try {
      const params: Record<string, string> = {};
      if (filter !== "all") params.status = filter;
      const res = await getAlerts(params);
      setAlerts(res.data);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (alertId: string, status: string) => {
    try {
      await updateAlert(alertId, { status });
      toast.success(`Alert ${status}`);
      loadAlerts();
    } catch {
      toast.error("Failed to update alert");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl animate-pulse"
            style={{
              background: "linear-gradient(135deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.6) 100%)",
            }}
          />
        ))}
      </div>
    );
  }

  const newCount = alerts.filter((a) => a.status === "new").length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
              className="p-3 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20"
            >
              <BellRing className="w-6 h-6 text-red-400" />
            </motion.div>
            {newCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
              >
                <span className="text-[10px] font-bold text-white">{newCount}</span>
              </motion.div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
              Alerts Center
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Monitor and manage patient alerts in real-time
            </p>
          </div>
        </div>
        <Badge
          className="px-4 py-2 text-sm font-semibold border-0"
          style={{
            background: newCount > 0
              ? "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)"
              : "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)",
            color: newCount > 0 ? "#EF4444" : "#22C55E",
            boxShadow: newCount > 0 ? "0 0 20px rgba(239,68,68,0.1)" : "0 0 20px rgba(34,197,94,0.1)",
          }}
        >
          {newCount > 0 ? (
            <>
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              {newCount} Active
            </>
          ) : (
            <>
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              All Clear
            </>
          )}
        </Badge>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-1.5 bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] w-fit">
        {filterTabs.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className="relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300"
          >
            {filter === t && (
              <motion.div
                layoutId="activeFilterTab"
                className="absolute inset-0 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(139,92,246,0.15) 100%)",
                  border: "1px solid rgba(59,130,246,0.25)",
                }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className={`relative z-10 ${filter === t ? "text-white" : "text-slate-500 hover:text-slate-300"}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </span>
          </button>
        ))}
      </div>

      {/* Alert Cards */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {alerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-24"
            >
              <div className="relative mb-6">
                <div
                  className="absolute inset-0 rounded-full blur-2xl"
                  style={{
                    background: "radial-gradient(circle, rgba(34,197,94,0.25) 0%, transparent 70%)",
                    width: "120px",
                    height: "120px",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                />
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="relative p-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20"
                >
                  <CheckCircle className="w-12 h-12 text-emerald-400" />
                </motion.div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">All Clear</h3>
              <p className="text-slate-500 text-sm max-w-xs text-center">
                No alerts to display. All patients are stable and recovering well.
              </p>
            </motion.div>
          ) : (
            alerts.map((alert, i) => {
              const color = levelColors[alert.level] || "#EAB308";
              const isExpanded = expandedId === alert.id;
              const isL3Plus = alert.level >= 3;

              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.06, type: "spring", bounce: 0.15 }}
                  layout
                >
                  <div
                    className="relative group cursor-pointer rounded-2xl transition-all duration-300 hover:translate-y-[-2px]"
                    onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      boxShadow: isExpanded
                        ? `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.08)`
                        : "0 2px 8px rgba(0,0,0,0.15)",
                    }}
                  >
                    {/* Left accent border */}
                    <div
                      className="absolute left-0 top-4 bottom-4 w-1 rounded-full"
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 0 12px ${color}40`,
                        ...(isL3Plus
                          ? {
                              animation: "pulse-glow 2s ease-in-out infinite",
                            }
                          : {}),
                      }}
                    />

                    <div className="p-5 pl-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          {/* Alert Icon */}
                          <div
                            className="p-2.5 rounded-xl flex-shrink-0 mt-0.5"
                            style={{
                              background: `linear-gradient(135deg, ${color}20 0%, ${color}08 100%)`,
                              border: `1px solid ${color}25`,
                            }}
                          >
                            {alert.level >= 3 ? (
                              <ShieldAlert className="w-5 h-5" style={{ color }} />
                            ) : (
                              <AlertTriangle className="w-5 h-5" style={{ color }} />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            {/* Badges */}
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                className="text-xs font-semibold border-0 px-2.5 py-0.5"
                                style={{
                                  background: `linear-gradient(135deg, ${color}25 0%, ${color}10 100%)`,
                                  color,
                                  boxShadow: `0 0 12px ${color}15`,
                                }}
                              >
                                L{alert.level} - {levelLabels[alert.level]}
                              </Badge>
                              <Badge
                                className="text-xs font-medium px-2.5 py-0.5 border-0"
                                style={{
                                  background:
                                    alert.status === "new"
                                      ? "rgba(59,130,246,0.15)"
                                      : alert.status === "acknowledged"
                                      ? "rgba(234,179,8,0.12)"
                                      : "rgba(34,197,94,0.12)",
                                  color:
                                    alert.status === "new"
                                      ? "#60A5FA"
                                      : alert.status === "acknowledged"
                                      ? "#FBBF24"
                                      : "#4ADE80",
                                }}
                              >
                                {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                              </Badge>
                            </div>

                            {/* Title & Patient */}
                            <p className="text-[15px] font-semibold text-white leading-snug">
                              {alert.title}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">{alert.patient_name}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-slate-600 whitespace-nowrap">
                            {alert.created_at
                              ? formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })
                              : ""}
                          </span>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-4 h-4 text-slate-600" />
                          </motion.div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="mt-5 pt-5 border-t border-white/[0.06] space-y-4">
                              {/* Description */}
                              <p className="text-sm text-slate-300 leading-relaxed">
                                {alert.description}
                              </p>

                              {/* AI Reasoning */}
                              {alert.ai_reasoning && (
                                <div
                                  className="rounded-xl p-4"
                                  style={{
                                    background:
                                      "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.06) 100%)",
                                    border: "1px solid rgba(139,92,246,0.15)",
                                  }}
                                >
                                  <div className="flex items-center gap-2 mb-2.5">
                                    <div className="p-1.5 rounded-lg bg-purple-500/15">
                                      <Brain className="w-3.5 h-3.5 text-purple-400" />
                                    </div>
                                    <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                                      AI Analysis
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-300 leading-relaxed">
                                    {alert.ai_reasoning}
                                  </p>
                                </div>
                              )}

                              {/* Symptom Tags */}
                              {alert.symptoms?.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                  {alert.symptoms.map((s, idx) => (
                                    <span
                                      key={s}
                                      className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                                        symptomColors[idx % symptomColors.length]
                                      }`}
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex gap-2.5 pt-1">
                                {alert.status === "new" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 hover:border-white/20 hover:text-white transition-all duration-200"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateStatus(alert.id, "acknowledged");
                                    }}
                                  >
                                    <Eye className="w-3.5 h-3.5 mr-1.5" /> Acknowledge
                                  </Button>
                                )}
                                {alert.status !== "resolved" && (
                                  <Button
                                    size="sm"
                                    className="rounded-xl border-0 text-white font-medium transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/20"
                                    style={{
                                      background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateStatus(alert.id, "resolved");
                                    }}
                                  >
                                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Resolve
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  className="rounded-xl border-0 text-white font-medium transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20"
                                  style={{
                                    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    callPatient(alert.patient_id).then(() =>
                                      toast.success("Call initiated")
                                    );
                                  }}
                                >
                                  <Phone className="w-3.5 h-3.5 mr-1.5" /> Call Patient
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Global styles for pulsing glow animation */}
      <style jsx global>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; box-shadow: 0 0 12px rgba(239,68,68,0.4); }
          50% { opacity: 0.6; box-shadow: 0 0 20px rgba(239,68,68,0.7); }
        }
      `}</style>
    </div>
  );
}
