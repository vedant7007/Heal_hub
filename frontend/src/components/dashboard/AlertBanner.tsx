"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Alert } from "@/types";

interface AlertBannerProps {
  alerts: Alert[];
}

export function AlertBanner({ alerts }: AlertBannerProps) {
  const criticalAlerts = alerts.filter((a) => a.level >= 3 && a.status !== "resolved");

  return (
    <AnimatePresence>
      {criticalAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-4 animate-pulse-glow"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-destructive animate-pulse-red" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-destructive">
                {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70 truncate">
                {criticalAlerts[0]?.patient_name} — {criticalAlerts[0]?.title}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0 border-red-200 text-destructive hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/30">
              <Link href="/alerts">
                View Details
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
