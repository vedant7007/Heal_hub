"use client";

import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { slideInFromTop } from "@/components/shared/PageWrapper";

export interface ActivityItem {
  id: string;
  type: "checkin" | "alert" | "doctor" | "ai" | "status_change";
  text: string;
  timestamp: string;
  patientName?: string;
}

const typeStyles = {
  checkin: { dot: "bg-emerald-500 glow-green", border: "border-l-emerald-500" },
  alert: { dot: "bg-red-500 glow-red", border: "border-l-red-500" },
  doctor: { dot: "bg-blue-500", border: "border-l-blue-500" },
  ai: { dot: "bg-violet-500", border: "border-l-violet-500" },
  status_change: { dot: "bg-amber-500 glow-yellow", border: "border-l-amber-500" },
};

interface RecentActivityProps {
  activities: ActivityItem[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="space-y-1">
      {activities.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No recent activity
        </div>
      ) : (
        activities.map((item, i) => {
          const style = typeStyles[item.type];
          return (
            <motion.div
              key={item.id}
              variants={slideInFromTop}
              initial="hidden"
              animate="show"
              transition={{ delay: i * 0.05 }}
              whileHover={{ x: 3, backgroundColor: "rgba(59, 130, 246, 0.03)" }}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border-l-2 ${style.border} transition-colors duration-200 group cursor-default`}
            >
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-snug">{item.text}</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5 group-hover:text-muted-foreground transition-colors duration-200">
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </p>
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
}
