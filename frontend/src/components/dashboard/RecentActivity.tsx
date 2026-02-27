"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { getSocket } from "@/lib/socket";
import { formatDistanceToNow } from "date-fns";
import { Radio, AlertCircle, CheckCircle2, AlertTriangle, Siren } from "lucide-react";

interface ActivityItem {
  id: string;
  patient_name: string;
  status: string;
  message: string;
  timestamp: string;
}

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  green: { color: "#22C55E", icon: CheckCircle2 },
  yellow: { color: "#EAB308", icon: AlertTriangle },
  red: { color: "#EF4444", icon: AlertCircle },
  critical: { color: "#EF4444", icon: Siren },
};

export default function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const socket = getSocket();

    socket.on("new_checkin", (data: ActivityItem) => {
      setActivities((prev) => [
        { ...data, id: Date.now().toString() },
        ...prev.slice(0, 19),
      ]);
    });

    socket.on("new_alert", (data: { patient_name: string; level: number; title: string; timestamp: string }) => {
      setActivities((prev) => [
        {
          id: Date.now().toString(),
          patient_name: data.patient_name,
          status: data.level >= 3 ? "critical" : "red",
          message: data.title,
          timestamp: data.timestamp,
        },
        ...prev.slice(0, 19),
      ]);
    });

    return () => {
      socket.off("new_checkin");
      socket.off("new_alert");
    };
  }, []);

  return (
    <div className="relative bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 h-full overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-[0.03] bg-[#3B82F6]" />

      {/* Header with live indicator */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#CBD5E1] tracking-tight">
          Recent Activity
        </h3>
        <div className="flex items-center gap-2 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06]">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-3 h-3 rounded-full bg-[#22C55E]/20 animate-ping" />
            <div
              className="w-2 h-2 rounded-full bg-[#22C55E]"
              style={{ boxShadow: "0 0 6px #22C55E60" }}
            />
          </div>
          <span className="text-[10px] font-medium text-[#22C55E] uppercase tracking-wider">
            Live Feed
          </span>
        </div>
      </div>

      <ScrollArea className="h-[400px] pr-2">
        <AnimatePresence>
          {activities.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 gap-3"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[#3B82F6]/10 blur-xl" />
                <Radio className="relative w-8 h-8 text-[#3B82F6]/40" />
              </div>
              <p className="text-xs text-[#475569] text-center">
                Listening for real-time updates...
              </p>
              <div className="flex gap-1 mt-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]/30"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {activities.map((a, index) => {
                const config = statusConfig[a.status] || statusConfig.green;
                const IconComponent = config.icon;

                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: 24, scale: 0.97 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -12, scale: 0.97 }}
                    transition={{
                      duration: 0.4,
                      ease: [0.22, 1, 0.36, 1],
                      delay: index === 0 ? 0 : 0,
                    }}
                    className="group relative"
                  >
                    <div
                      className="relative flex items-start gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all duration-300"
                      style={{
                        borderLeft: `2px solid ${config.color}40`,
                      }}
                    >
                      {/* Icon */}
                      <div
                        className="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: `${config.color}12`,
                          border: `1px solid ${config.color}20`,
                        }}
                      >
                        <IconComponent
                          className="w-3 h-3"
                          style={{ color: config.color }}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-white/90 leading-tight">
                          <span className="font-medium text-white">
                            {a.patient_name}
                          </span>{" "}
                          <span className="text-[#94A3B8]">
                            {a.message?.slice(0, 60)}
                          </span>
                        </p>
                        {a.timestamp && (
                          <p className="text-[10px] text-[#475569] mt-0.5">
                            {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}
