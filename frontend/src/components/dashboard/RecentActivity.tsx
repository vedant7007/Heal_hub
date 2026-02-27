"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { getSocket } from "@/lib/socket";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  patient_name: string;
  status: string;
  message: string;
  timestamp: string;
}

const statusIcons: Record<string, string> = {
  green: "\u2705",
  yellow: "\u26A0\uFE0F",
  red: "\uD83D\uDD34",
  critical: "\uD83D\uDEA8",
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
    <Card className="bg-[#1E293B] border-[#334155] p-4 h-full">
      <h3 className="text-sm font-semibold text-[#94A3B8] mb-3">Recent Activity</h3>
      <ScrollArea className="h-[400px]">
        <AnimatePresence>
          {activities.length === 0 ? (
            <p className="text-xs text-[#64748B] text-center py-8">
              Listening for real-time updates...
            </p>
          ) : (
            activities.map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 py-2 border-b border-[#334155]/50"
              >
                <span className="text-sm mt-0.5">{statusIcons[a.status] || "\u2705"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    <span className="font-medium">{a.patient_name}</span>{" "}
                    <span className="text-[#94A3B8]">{a.message?.slice(0, 60)}</span>
                  </p>
                  {a.timestamp && (
                    <p className="text-[10px] text-[#64748B]">
                      {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </ScrollArea>
    </Card>
  );
}
