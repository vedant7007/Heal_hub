"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus, Search, MoreHorizontal, Eye, Pencil, MessageSquare,
  Phone, Trash2, ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageWrapper, staggerItem } from "@/components/shared/PageWrapper";
import { AddPatientDialog } from "@/components/dashboard/AddPatientDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { getPatients, deletePatient, sendMessage, callPatient } from "@/lib/api";
import { useUser } from "@/lib/user-context";
import { toast } from "sonner";
import type { Patient } from "@/types";

const statusConfig: Record<string, { dot: string; label: string; badge: string }> = {
  green: { dot: "bg-emerald-500 glow-green", label: "Recovering", badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800" },
  yellow: { dot: "bg-amber-500 glow-yellow", label: "Attention", badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" },
  red: { dot: "bg-red-500 glow-red", label: "At Risk", badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800" },
  critical: { dot: "bg-red-600 pulse-critical", label: "Critical", badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800" },
};

export default function PatientsPage() {
  return (
    <AppShell>
      <PatientsContent />
    </AppShell>
  );
}

function PatientsContent() {
  const router = useRouter();
  const { role } = useUser();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [surgeryFilter, setSurgeryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; patient: Patient | null }>({ open: false, patient: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const fetchPatients = useCallback(async () => {
    try {
      const res = await getPatients();
      setPatients(res.data || []);
    } catch {
      toast.error("Failed to load patients");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const handleDelete = async () => {
    if (!deleteDialog.patient) return;
    setIsDeleting(true);
    try {
      await deletePatient(deleteDialog.patient.id);
      toast.success("Patient removed");
      setDeleteDialog({ open: false, patient: null });
      fetchPatients();
    } catch {
      toast.error("Failed to remove patient");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCall = async (patient: Patient) => {
    try {
      await callPatient(patient.id);
      toast.success(`Calling ${patient.name}...`);
    } catch {
      toast.error("Failed to initiate call");
    }
  };

  const handleMessage = async (patient: Patient) => {
    try {
      await sendMessage(patient.id, "Hi! This is a follow-up message from your doctor.");
      toast.success(`Message sent to ${patient.name}`);
    } catch {
      toast.error("Failed to send message");
    }
  };

  const surgeryTypes = [...new Set(patients.map((p) => p.surgery_type).filter(Boolean))];

  const filtered = patients
    .filter((p) => statusFilter === "all" || p.current_status === statusFilter)
    .filter((p) => surgeryFilter === "all" || p.surgery_type === surgeryFilter)
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search))
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "status") return (a.current_status || "").localeCompare(b.current_status || "");
      if (sortBy === "days") return (b.days_since_surgery || 0) - (a.days_since_surgery || 0);
      return 0;
    });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 skeleton" />
        ))}
      </div>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">All Patients</h2>
            <p className="text-sm text-muted-foreground">{filtered.length} patient{filtered.length !== 1 ? "s" : ""}</p>
          </div>
          {role === "doctor" && (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button onClick={() => setAddDialogOpen(true)} className="btn-premium text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Patient
              </Button>
            </motion.div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or phone..." className="pl-9" />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="green">Recovering</SelectItem>
                <SelectItem value="yellow">Attention</SelectItem>
                <SelectItem value="red">At Risk</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={surgeryFilter} onValueChange={(v) => { setSurgeryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40 hidden sm:flex"><SelectValue placeholder="Surgery" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Surgeries</SelectItem>
                {surgeryTypes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32 hidden md:flex"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="days">Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table (desktop) */}
        <div className="bg-card border border-border rounded-xl overflow-hidden hidden md:block card-glow">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Age</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Surgery</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Day</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Recovery</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((patient, i) => {
                const status = statusConfig[patient.current_status] || statusConfig.green;
                const recovery = 100 - (patient.risk_score || 0);
                return (
                  <motion.tr
                    key={patient.id}
                    variants={staggerItem}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border last:border-0 patient-row cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => router.push(`/patients/${patient.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${status.dot}`} />
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${status.badge}`}>
                          {status.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/patients/${patient.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                        {patient.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{patient.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {patient.age} · {patient.gender?.[0]?.toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{patient.surgery_type}</td>
                    <td className="px-4 py-3 text-sm font-medium">Day {patient.days_since_surgery}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              recovery > 70 ? "bg-emerald-500" : recovery > 40 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${recovery}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{recovery}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/patients/${patient.id}`}><Eye className="w-4 h-4 mr-2" /> View</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/patients/${patient.id}`}><Pencil className="w-4 h-4 mr-2" /> Edit</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMessage(patient)}>
                            <MessageSquare className="w-4 h-4 mr-2" /> Message
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCall(patient)}>
                            <Phone className="w-4 h-4 mr-2" /> Call
                          </DropdownMenuItem>
                          {role === "doctor" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteDialog({ open: true, patient })} className="text-destructive focus:text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" /> Remove
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Card view (mobile) */}
        <div className="md:hidden space-y-3">
          {paginated.map((patient, i) => {
            const status = statusConfig[patient.current_status] || statusConfig.green;
            const recovery = 100 - (patient.risk_score || 0);
            return (
              <motion.div
                key={patient.id}
                variants={staggerItem}
                initial="initial"
                animate="animate"
                transition={{ delay: i * 0.04 }}
              >
                <Link href={`/patients/${patient.id}`} className="block bg-card border border-border rounded-xl p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">{patient.name}</p>
                      <p className="text-xs text-muted-foreground">{patient.surgery_type} · Day {patient.days_since_surgery}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${status.badge}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${recovery > 70 ? "bg-emerald-500" : recovery > 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${recovery}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{recovery}%</span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(page - 1)} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(page + 1)} disabled={page === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AddPatientDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onSuccess={fetchPatients} />

      {/* Delete confirmation */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, patient: deleteDialog.patient })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Patient</DialogTitle>
            <DialogDescription>
              Remove {deleteDialog.patient?.name}? All check-in data will be preserved but automated follow-ups will stop.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, patient: null })}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
