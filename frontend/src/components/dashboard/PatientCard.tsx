"use client";

import { Patient } from "@/types";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { ChevronRight, Stethoscope, Calendar } from "lucide-react";

const statusColors: Record<string, string> = {
  green: "#22C55E",
  yellow: "#EAB308",
  red: "#EF4444",
  critical: "#EF4444",
};

const statusLabels: Record<string, string> = {
  green: "Recovering",
  yellow: "Needs Attention",
  red: "Alert",
  critical: "Critical",
};

function RecoveryBar({ score, color }: { score: number; color: string }) {
  const clampedScore = Math.min(100, Math.max(0, score));

  return (
    <div className="w-full mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-[#64748B] uppercase tracking-wider">
          Recovery
        </span>
        <span className="text-[10px] font-semibold" style={{ color }}>
          {clampedScore}%
        </span>
      </div>
      <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}90, ${color})`,
            boxShadow: `0 0 8px ${color}40`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${clampedScore}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        />
      </div>
    </div>
  );
}

function StatusDot({ status, color }: { status: string; color: string }) {
  const isCritical = status === "critical" || status === "red";

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer ring animation for critical */}
      {isCritical && (
        <div
          className="absolute w-5 h-5 rounded-full animate-ping"
          style={{ backgroundColor: `${color}20` }}
        />
      )}
      {/* Glow ring */}
      <div
        className="absolute w-4 h-4 rounded-full"
        style={{
          backgroundColor: `${color}15`,
          boxShadow: `0 0 8px ${color}30`,
        }}
      />
      {/* Core dot */}
      <div
        className={`relative w-2.5 h-2.5 rounded-full ${
          status === "critical" ? "animate-pulse-red" : ""
        }`}
        style={{
          backgroundColor: color,
          boxShadow: `0 0 6px ${color}60`,
        }}
      />
    </div>
  );
}

export default function PatientCard({ patient, index }: { patient: Patient; index: number }) {
  const color = statusColors[patient.current_status] || "#22C55E";
  // Derive a recovery score: use risk_score inverted (100 - risk) as a proxy
  const recoveryScore = patient.risk_score != null ? Math.max(0, 100 - patient.risk_score) : 75;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={`/patients/${patient.id}`}>
        <motion.div
          whileHover={{ x: 4, scale: 1.005 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative group"
        >
          {/* Hover glow */}
          <div
            className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-lg"
            style={{ background: `${color}10` }}
          />

          <div
            className="relative bg-white/[0.04] backdrop-blur-xl border border-white/[0.07] rounded-2xl p-4 cursor-pointer transition-all duration-300 group-hover:border-white/[0.15] group-hover:bg-white/[0.06]"
            style={{
              borderLeft: `3px solid ${color}`,
            }}
          >
            <div className="flex items-start gap-4">
              {/* Status indicator */}
              <div className="pt-1">
                <StatusDot status={patient.current_status} color={color} />
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-white text-sm tracking-tight truncate">
                      {patient.name}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      {/* Surgery type badge */}
                      <div className="flex items-center gap-1">
                        <Stethoscope className="w-3 h-3 text-[#64748B]" />
                        <span className="text-[11px] text-[#94A3B8] bg-white/[0.04] px-1.5 py-0.5 rounded-md border border-white/[0.06]">
                          {patient.surgery_type}
                        </span>
                      </div>
                      {/* Days since surgery */}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#64748B]" />
                        <span className="text-[11px] text-[#64748B]">
                          Day {patient.days_since_surgery}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: badge + timestamp */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge
                      className="text-[10px] font-semibold px-2 py-0.5"
                      style={{
                        backgroundColor: `${color}15`,
                        color: color,
                        border: `1px solid ${color}30`,
                        boxShadow: `0 0 8px ${color}10`,
                      }}
                    >
                      {statusLabels[patient.current_status]}
                    </Badge>
                    {patient.updated_at && (
                      <span className="text-[10px] text-[#475569]">
                        {formatDistanceToNow(new Date(patient.updated_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Recovery progress bar */}
                <RecoveryBar score={recoveryScore} color={color} />
              </div>

              {/* Arrow indicator */}
              <div className="pt-3 opacity-0 group-hover:opacity-60 transition-opacity duration-300">
                <ChevronRight className="w-4 h-4 text-[#64748B]" />
              </div>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
