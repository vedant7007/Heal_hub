"use client";

import { Patient } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

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

export default function PatientCard({ patient, index }: { patient: Patient; index: number }) {
  const color = statusColors[patient.current_status] || "#22C55E";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link href={`/patients/${patient.id}`}>
        <Card className="bg-[#1E293B] border-[#334155] p-4 hover:border-[#3B82F6]/50 transition-all duration-200 cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${patient.current_status === "critical" ? "animate-pulse-red" : ""}`}
                style={{ backgroundColor: color }}
              />
              <div>
                <p className="font-medium text-white">{patient.name}</p>
                <p className="text-xs text-[#94A3B8]">
                  {patient.surgery_type} &middot; Day {patient.days_since_surgery}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge
                className="text-xs"
                style={{
                  backgroundColor: `${color}20`,
                  color: color,
                  border: `1px solid ${color}40`,
                }}
              >
                {statusLabels[patient.current_status]}
              </Badge>
              {patient.updated_at && (
                <p className="text-[10px] text-[#64748B] mt-1">
                  {formatDistanceToNow(new Date(patient.updated_at), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
