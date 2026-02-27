"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Users, AlertTriangle, Activity, ClipboardCheck } from "lucide-react";
import { motion } from "framer-motion";
import { OverviewStats } from "@/types";

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    const duration = 800;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      ref.current = current;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  return <>{display}</>;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function StatsOverview({ stats }: { stats: OverviewStats | null }) {
  const cards = [
    {
      label: "Total Patients",
      value: stats?.total_patients || 0,
      icon: Users,
      color: "#3B82F6",
    },
    {
      label: "Active Alerts",
      value: stats?.active_alerts || 0,
      icon: AlertTriangle,
      color: "#EF4444",
    },
    {
      label: "Avg Recovery",
      value: stats?.avg_recovery_score || 0,
      suffix: "%",
      icon: Activity,
      color: "#22C55E",
    },
    {
      label: "Check-ins Today",
      value: stats?.checkins_today || 0,
      icon: ClipboardCheck,
      color: "#EAB308",
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {cards.map((card) => (
        <motion.div key={card.label} variants={item}>
          <Card className="bg-[#1E293B] border-[#334155] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#94A3B8]">{card.label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: card.color }}>
                  <AnimatedNumber value={card.value} />
                  {card.suffix || ""}
                </p>
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${card.color}15` }}
              >
                <card.icon className="w-6 h-6" style={{ color: card.color }} />
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
