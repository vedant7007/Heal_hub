"use client";

import { Alert } from "@/types";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronRight, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function AlertBanner({ alerts }: { alerts: Alert[] }) {
  const critical = alerts.filter((a) => a.level >= 2 && a.status === "new");

  if (critical.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative group">
        {/* Outer glow */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#EF4444]/20 via-[#DC2626]/10 to-[#EF4444]/20 blur-xl opacity-60" />

        {/* Main card */}
        <div className="relative bg-[#EF4444]/[0.06] backdrop-blur-xl border border-[#EF4444]/20 rounded-2xl p-5 overflow-hidden">
          {/* Gradient border glow top */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#EF4444]/40 to-transparent" />
          {/* Gradient border glow bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#EF4444]/20 to-transparent" />

          {/* Background ambient glow */}
          <div className="absolute top-0 left-0 w-60 h-60 bg-[#EF4444]/[0.04] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#DC2626]/[0.03] rounded-full blur-3xl" />

          {/* Header */}
          <div className="relative flex items-center gap-3 mb-4">
            {/* Pulsing alert icon */}
            <div className="relative flex items-center justify-center">
              <motion.div
                className="absolute w-10 h-10 rounded-xl bg-[#EF4444]/10"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <div
                className="relative w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #EF444425, #DC262615)",
                  border: "1px solid #EF444430",
                }}
              >
                <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-bold text-[#FCA5A5] tracking-tight">
                {critical.length} Active Alert{critical.length > 1 ? "s" : ""} Requiring Attention
              </h3>
              <p className="text-[11px] text-[#EF4444]/50 mt-0.5">
                Immediate review recommended
              </p>
            </div>

            <Link href="/alerts">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 hover:bg-[#EF4444]/20 transition-colors duration-200"
              >
                <span className="text-[11px] font-semibold text-[#EF4444]">View All</span>
                <ChevronRight className="w-3 h-3 text-[#EF4444]" />
              </motion.div>
            </Link>
          </div>

          {/* Alert items */}
          <div className="relative space-y-2">
            {critical.slice(0, 3).map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.1 + index * 0.08,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <Link href="/alerts">
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-[#EF4444]/[0.04] hover:border-[#EF4444]/10 transition-all duration-200 group/item">
                    <div className="flex items-center gap-3">
                      {/* Level badge */}
                      <Badge
                        className="text-[10px] font-bold px-2 py-0.5 shrink-0"
                        style={{
                          backgroundColor:
                            alert.level >= 3
                              ? "#EF444420"
                              : "#EAB30815",
                          color:
                            alert.level >= 3
                              ? "#FCA5A5"
                              : "#EAB308",
                          border: `1px solid ${
                            alert.level >= 3
                              ? "#EF444430"
                              : "#EAB30825"
                          }`,
                        }}
                      >
                        Level {alert.level}
                      </Badge>

                      {/* Alert title */}
                      <span className="text-sm text-white/80 group-hover/item:text-white transition-colors duration-200 truncate">
                        {alert.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-xs text-[#64748B]">{alert.patient_name}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#475569] opacity-0 group-hover/item:opacity-100 transition-opacity duration-200" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
