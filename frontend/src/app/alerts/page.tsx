"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, Phone, Check, CheckCircle2,
  ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { AppShell } from "@/components/layout/AppShell";
import { PageWrapper, slideInRight } from "@/components/shared/PageWrapper";
import { Button } from "@/components/ui/button";
import { getAlerts, updateAlert, deleteAlert, callPatient } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";
import type { Alert } from "@/types";

const filterTabs = [
  { label: "All", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "Warning", value: "warning" },
  { label: "Resolved", value: "resolved" },
];

export default function AlertsPage() {
  return (
    <AppShell>
      <AlertsContent />
    </AppShell>
  );
}

function AlertsContent() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await getAlerts();
      setAlerts(res.data || []);
    } catch {
      toast.error("Failed to load alerts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  useEffect(() => {
    const socket = getSocket();
    socket.on("new_alert", () => fetchAlerts());
    socket.on("alert_updated", () => fetchAlerts());
    return () => { socket.off("new_alert"); socket.off("alert_updated"); };
  }, [fetchAlerts]);

  const handleAcknowledge = async (alert: Alert) => {
    // Optimistic update
    setAlerts((prev) => prev.map((a) => a.id === alert.id ? { ...a, status: "acknowledged" } : a));
    try {
      await updateAlert(alert.id, { status: "acknowledged" });
      toast.success("Alert acknowledged");
    } catch {
      toast.error("Failed to update alert");
      fetchAlerts(); // Revert on failure
    }
  };

  const handleResolve = async (alert: Alert) => {
    // Optimistic update
    setAlerts((prev) => prev.map((a) => a.id === alert.id ? { ...a, status: "resolved" } : a));
    try {
      await updateAlert(alert.id, { status: "resolved" });
      toast.success("Alert resolved");
    } catch {
      toast.error("Failed to resolve alert");
      fetchAlerts(); // Revert on failure
    }
  };

  const handleCall = async (alert: Alert) => {
    try {
      await callPatient(alert.patient_id);
      toast.success("Calling patient...");
    } catch {
      toast.error("Failed to call");
    }
  };

  const handleDelete = async (alert: Alert) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    try {
      await deleteAlert(alert.id);
      toast.success("Alert deleted");
    } catch {
      toast.error("Failed to delete alert");
      fetchAlerts();
    }
  };

  const filtered = alerts.filter((a) => {
    if (filter === "all") return true;
    if (filter === "critical") return a.level >= 3 && a.status !== "resolved";
    if (filter === "warning") return a.level < 3 && a.status !== "resolved";
    if (filter === "resolved") return a.status === "resolved";
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 skeleton" />)}
      </div>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Alerts</h2>
            <p className="text-sm text-muted-foreground">
              {alerts.filter((a) => a.status !== "resolved").length} active alert{alerts.filter((a) => a.status !== "resolved").length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5">
          {filterTabs.map((tab) => (
            <motion.button
              key={tab.value}
              whileTap={{ scale: 0.93 }}
              onClick={() => setFilter(tab.value)}
              className={`text-sm px-4 py-2 rounded-lg font-medium filter-pill ${
                filter === tab.value
                  ? "bg-primary text-primary-foreground filter-pill-active"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.label}
              {tab.value === "critical" && (
                <span className="ml-1.5">
                  ({alerts.filter((a) => a.level >= 3 && a.status !== "resolved").length})
                </span>
              )}
            </motion.button>
          ))}
        </div>

        {/* Alert cards */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No alerts in this category</p>
              </motion.div>
            ) : (
              filtered.map((alert, i) => {
                const isCritical = alert.level >= 3;
                const isResolved = alert.status === "resolved";
                const isExpanded = expandedId === alert.id;

                return (
                  <motion.div
                    key={alert.id}
                    layout
                    variants={slideInRight}
                    initial="hidden"
                    animate="show"
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ delay: i * 0.06 }}
                    whileHover={!isResolved ? { y: -2, boxShadow: "0 8px 25px rgba(0,0,0,0.08)" } : undefined}
                    className={`bg-card border rounded-xl overflow-hidden transition-colors ${
                      isResolved
                        ? "border-border opacity-60"
                        : isCritical
                          ? "border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10 pulse-critical"
                          : "border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10 card-glow"
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Level indicator */}
                        <div className={`w-1 self-stretch rounded-full shrink-0 ${
                          isResolved ? "bg-muted-foreground/30" : isCritical ? "bg-red-500" : "bg-amber-500"
                        }`} />

                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                isResolved ? "text-muted-foreground" : isCritical ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                              }`}>
                                {isResolved ? "RESOLVED" : isCritical ? "CRITICAL" : "WARNING"}
                              </span>
                              <p className="text-sm font-medium mt-0.5">
                                {alert.patient_name} — {alert.title}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                              {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground mt-1.5">{alert.description}</p>

                          {/* Symptoms */}
                          {alert.symptoms && alert.symptoms.length > 0 && (
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                              {alert.symptoms.map((s, si) => (
                                <span key={si} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Expandable AI reasoning */}
                          {alert.ai_reasoning && (
                            <div className="mt-3">
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                                className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                              >
                                AI Reasoning
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.p
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="text-sm text-muted-foreground mt-2 leading-relaxed overflow-hidden"
                                  >
                                    {alert.ai_reasoning}
                                  </motion.p>
                                )}
                              </AnimatePresence>
                            </div>
                          )}

                          {/* Actions */}
                          {!isResolved ? (
                            <div className="flex gap-2 mt-4 flex-wrap">
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/patients/${alert.patient_id}`}>
                                  <Eye className="w-3.5 h-3.5 mr-1.5" /> View Patient
                                </Link>
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleCall(alert)}>
                                <Phone className="w-3.5 h-3.5 mr-1.5" /> Call
                              </Button>
                              {alert.status !== "acknowledged" && (
                                <Button variant="outline" size="sm" onClick={() => handleAcknowledge(alert)}>
                                  <Check className="w-3.5 h-3.5 mr-1.5" /> Acknowledge
                                </Button>
                              )}
                              <Button size="sm" onClick={() => handleResolve(alert)} className="bg-emerald-600 hover:bg-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Resolve
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete(alert)} className="text-destructive hover:bg-red-50 dark:hover:bg-red-950/20">
                                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2 mt-4">
                              <Button variant="outline" size="sm" onClick={() => handleDelete(alert)} className="text-destructive hover:bg-red-50 dark:hover:bg-red-950/20">
                                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageWrapper>
  );
}
