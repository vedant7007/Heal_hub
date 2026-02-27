"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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

// Mini sparkline SVG for visual flair
function Sparkline({ color }: { color: string }) {
  const points = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < 12; i++) {
      pts.push(Math.random() * 28 + 4);
    }
    return pts;
  }, []);

  const pathData = points
    .map((y, i) => {
      const x = (i / (points.length - 1)) * 80;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg
      width="80"
      height="36"
      viewBox="0 0 80 36"
      fill="none"
      className="opacity-40"
    >
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={pathData + " L 80 36 L 0 36 Z"}
        fill={`url(#spark-${color.replace("#", "")})`}
      />
      <path
        d={pathData}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {points.map((y, i) => (
        <circle
          key={i}
          cx={(i / (points.length - 1)) * 80}
          cy={y}
          r="1.5"
          fill={color}
          opacity="0.6"
        />
      ))}
    </svg>
  );
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
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
          <motion.div
            whileHover={{ scale: 1.03, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative group cursor-default"
          >
            {/* Glow effect on hover */}
            <div
              className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
              style={{ background: `${card.color}15` }}
            />

            <div
              className="relative bg-white/[0.05] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 overflow-hidden"
              style={{
                borderLeft: `3px solid ${card.color}`,
              }}
            >
              {/* Subtle radial gradient background glow behind icon area */}
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-[0.07]"
                style={{ background: card.color }}
              />

              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
                    {card.label}
                  </p>
                  <p
                    className="text-3xl font-bold mt-2 tracking-tight"
                    style={{ color: card.color }}
                  >
                    <AnimatedNumber value={card.value} />
                    {card.suffix || ""}
                  </p>

                  {/* Sparkline mini-chart */}
                  <div className="mt-3">
                    <Sparkline color={card.color} />
                  </div>
                </div>

                {/* Icon with radial gradient glow */}
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-xl blur-lg opacity-30"
                    style={{ background: card.color }}
                  />
                  <div
                    className="relative w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: `radial-gradient(circle at center, ${card.color}20, ${card.color}08)`,
                      border: `1px solid ${card.color}25`,
                    }}
                  >
                    <card.icon
                      className="w-5 h-5"
                      style={{ color: card.color }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ))}
    </motion.div>
  );
}
