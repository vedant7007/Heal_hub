"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, Plus, CalendarPlus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { AppShell } from "@/components/layout/AppShell";
import { PageWrapper, staggerItem } from "@/components/shared/PageWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getPatients, getAppointments, createAppointment, updateAppointment, deleteAppointment } from "@/lib/api";
import { toast } from "sonner";
import type { Patient, Appointment } from "@/types";

const typeConfig = {
  "follow-up": { label: "Follow-up", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
  emergency: { label: "Emergency", color: "text-red-600 bg-red-50 dark:bg-red-900/20" },
  checkup: { label: "Check-up", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
};

const statusConfig = {
  confirmed: { label: "Confirmed", color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" },
  pending: { label: "Pending", color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" },
  cancelled: { label: "Cancelled", color: "text-muted-foreground bg-muted border-border" },
  completed: { label: "Completed", color: "text-muted-foreground bg-muted border-border" },
};

export default function AppointmentsPage() {
  return (
    <AppShell>
      <AppointmentsContent />
    </AppShell>
  );
}

function AppointmentsContent() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    patientId: "",
    date: "",
    time: "",
    type: "follow-up" as Appointment["type"],
    notes: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const [patientsRes, appointmentsRes] = await Promise.all([
        getPatients(),
        getAppointments(),
      ]);
      setPatients(patientsRes.data || []);
      setAppointments(appointmentsRes.data || []);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!form.patientId || !form.date || !form.time) {
      toast.error("Please fill all required fields");
      return;
    }
    setCreating(true);
    try {
      await createAppointment({
        patient_id: form.patientId,
        date: form.date,
        time: form.time,
        type: form.type,
        notes: form.notes,
      });
      setDialogOpen(false);
      setForm({ patientId: "", date: "", time: "", type: "follow-up", notes: "" });
      toast.success("Appointment scheduled! Patient notified via WhatsApp.");
      fetchData();
    } catch {
      toast.error("Failed to create appointment");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateAppointment(id, { status });
      toast.success(`Appointment ${status}`);
      fetchData();
    } catch {
      toast.error("Failed to update appointment");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAppointment(id);
      toast.success("Appointment deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete appointment");
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const upcoming = appointments.filter((a) => (a.status === "confirmed" || a.status === "pending") && a.date >= today);
  const past = appointments.filter((a) => a.status === "completed" || a.date < today);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 skeleton" />)}
      </div>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Appointments</h2>
            <p className="text-sm text-muted-foreground">{upcoming.length} upcoming</p>
          </div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button onClick={() => setDialogOpen(true)} className="btn-premium text-white">
              <Plus className="w-4 h-4 mr-2" /> New Appointment
            </Button>
          </motion.div>
        </div>

        {/* Upcoming */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">UPCOMING</h3>
          <div className="space-y-2">
            {upcoming.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <CalendarPlus className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming appointments</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setDialogOpen(true)}>
                  Schedule one
                </Button>
              </div>
            ) : (
              upcoming.map((apt, i) => (
                <motion.div
                  key={apt.id}
                  variants={staggerItem}
                  initial="hidden"
                  animate="show"
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -2, boxShadow: "0 6px 20px rgba(0,0,0,0.06)" }}
                  className="bg-card border border-border rounded-xl p-4 card-glow"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs text-primary font-medium">{format(new Date(apt.date + "T00:00"), "MMM")}</span>
                      <span className="text-lg font-bold text-primary leading-tight">{format(new Date(apt.date + "T00:00"), "d")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{apt.patient_name}</p>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeConfig[apt.type]?.color || typeConfig["follow-up"].color}`}>
                          {typeConfig[apt.type]?.label || apt.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {apt.time} · {format(new Date(apt.date + "T00:00"), "EEEE, MMM d, yyyy")}
                      </p>
                      {apt.notes && <p className="text-xs text-muted-foreground mt-1 italic">{apt.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full border ${statusConfig[apt.status]?.color || ""}`}>
                        {statusConfig[apt.status]?.label || apt.status}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => handleStatusChange(apt.id, "completed")} className="text-xs h-7 px-2">
                        Done
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(apt.id)} className="text-xs h-7 px-2 text-red-500 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Past */}
        {past.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">PAST</h3>
            <div className="space-y-2">
              {past.map((apt) => (
                <div key={apt.id} className="bg-card border border-border rounded-xl p-4 opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs text-muted-foreground">{format(new Date(apt.date + "T00:00"), "MMM")}</span>
                      <span className="text-lg font-bold text-muted-foreground leading-tight">{format(new Date(apt.date + "T00:00"), "d")}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{apt.patient_name}</p>
                      <p className="text-xs text-muted-foreground">{apt.time} · {typeConfig[apt.type]?.label || apt.type}</p>
                    </div>
                    <span className="text-[10px] font-medium px-2.5 py-1 rounded-full border bg-muted text-muted-foreground">
                      {apt.status === "completed" ? "Completed" : "Past"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New Appointment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Patient *</Label>
              <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as Appointment["type"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                  <SelectItem value="checkup">Check-up</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Scheduling..." : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
