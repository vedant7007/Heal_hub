"use client";

import { Alert } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function AlertBanner({ alerts }: { alerts: Alert[] }) {
  const critical = alerts.filter((a) => a.level >= 2 && a.status === "new");

  if (critical.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="bg-[#EF4444]/10 border-[#EF4444]/30 p-4">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
          <span className="text-sm font-semibold text-[#EF4444]">
            {critical.length} Active Alert{critical.length > 1 ? "s" : ""} Requiring Attention
          </span>
        </div>
        <div className="space-y-2">
          {critical.slice(0, 3).map((alert) => (
            <Link key={alert.id} href="/alerts">
              <div className="flex items-center justify-between py-1 hover:bg-[#EF4444]/5 rounded px-2 transition-colors">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] border-[#EF4444]/50 text-[#EF4444]"
                  >
                    Level {alert.level}
                  </Badge>
                  <span className="text-sm text-white">{alert.title}</span>
                </div>
                <span className="text-xs text-[#94A3B8]">{alert.patient_name}</span>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
