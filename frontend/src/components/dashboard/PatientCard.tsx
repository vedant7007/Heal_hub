"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Patient } from "@/types";

const statusConfig = {
  green: { dot: "bg-emerald-500 glow-green", label: "Recovering", bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" },
  yellow: { dot: "bg-amber-500 glow-yellow", label: "Attention", bg: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
  red: { dot: "bg-red-500 glow-red", label: "At Risk", bg: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" },
  critical: { dot: "bg-red-600 pulse-critical", label: "Critical", bg: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" },
};

interface PatientCardProps {
  patient: Patient;
  index: number;
}

export function PatientListItem({ patient, index }: PatientCardProps) {
  const status = statusConfig[patient.current_status] || statusConfig.green;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileTap={{ scale: 0.98 }}
    >
      <Link
        href={`/patients/${patient.id}`}
        className="patient-row flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 group"
      >
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${status.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors duration-200">{patient.name}</p>
          <p className="text-xs text-muted-foreground">{patient.surgery_type}</p>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full hidden sm:inline-block ${status.bg}`}>
          {status.label}
        </span>
        <span className="text-xs text-muted-foreground hidden md:block">
          Day {patient.days_since_surgery}
        </span>
        <span className="text-xs text-muted-foreground/60 hidden lg:block group-hover:text-muted-foreground transition-colors duration-200">
          {patient.updated_at ? formatDistanceToNow(new Date(patient.updated_at), { addSuffix: true }) : "—"}
        </span>
        <motion.div
          className="shrink-0"
          animate={{ x: 0 }}
          whileHover={{ x: 3 }}
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors duration-200" />
        </motion.div>
      </Link>
    </motion.div>
  );
}
