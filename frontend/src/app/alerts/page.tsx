"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Eye, Phone } from "lucide-react";
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
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-[#1E293B] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Alerts</h1>
        <Badge className="bg-[#EF4444]/20 text-[#EF4444]">
          {alerts.filter((a) => a.status === "new").length} New
        </Badge>
      </div>

      <div className="flex gap-1">
        {filterTabs.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === t ? "bg-[#3B82F6] text-white" : "bg-[#1E293B] text-[#94A3B8] hover:text-white"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {alerts.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <CheckCircle className="w-12 h-12 text-[#22C55E] mx-auto mb-3" />
              <p className="text-[#94A3B8]">All clear! No alerts to show.</p>
            </motion.div>
          ) : (
            alerts.map((alert, i) => {
              const color = levelColors[alert.level] || "#EAB308";
              const isExpanded = expandedId === alert.id;
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className="bg-[#1E293B] border-[#334155] p-4 cursor-pointer hover:border-[#3B82F6]/30 transition-all"
                    onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color }} />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }} className="text-xs">
                              {levelLabels[alert.level]}
                            </Badge>
                            <Badge variant="outline" className="text-xs border-[#334155] text-[#94A3B8]">
                              {alert.status}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-white">{alert.title}</p>
                          <p className="text-xs text-[#94A3B8] mt-0.5">{alert.patient_name}</p>
                        </div>
                      </div>
                      <span className="text-xs text-[#64748B]">
                        {alert.created_at ? formatDistanceToNow(new Date(alert.created_at), { addSuffix: true }) : ""}
                      </span>
                    </div>

                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 pt-4 border-t border-[#334155]"
                      >
                        <p className="text-sm text-[#CBD5E1] mb-2">{alert.description}</p>
                        {alert.ai_reasoning && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-[#94A3B8] mb-1">AI Reasoning</p>
                            <p className="text-sm text-[#94A3B8]">{alert.ai_reasoning}</p>
                          </div>
                        )}
                        {alert.symptoms?.length > 0 && (
                          <div className="flex gap-1 mb-3 flex-wrap">
                            {alert.symptoms.map((s) => (
                              <Badge key={s} variant="outline" className="text-xs border-[#334155] text-[#94A3B8]">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          {alert.status === "new" && (
                            <Button size="sm" variant="outline" className="border-[#334155] text-[#94A3B8]"
                              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(alert.id, "acknowledged"); }}>
                              <Eye className="w-3 h-3 mr-1" /> Acknowledge
                            </Button>
                          )}
                          {alert.status !== "resolved" && (
                            <Button size="sm" className="bg-[#22C55E] hover:bg-[#16A34A]"
                              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(alert.id, "resolved"); }}>
                              <CheckCircle className="w-3 h-3 mr-1" /> Resolve
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="border-[#334155] text-[#94A3B8]"
                            onClick={(e) => { e.stopPropagation(); callPatient(alert.patient_id).then(() => toast.success("Call initiated")); }}>
                            <Phone className="w-3 h-3 mr-1" /> Call
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </Card>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
