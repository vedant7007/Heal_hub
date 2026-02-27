"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageWrapper, staggerItem } from "@/components/shared/PageWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Nurse {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedPatients: number;
  status: "active" | "inactive";
}

export default function NursesPage() {
  return (
    <AppShell>
      <NursesContent />
    </AppShell>
  );
}

function NursesContent() {
  const [nurses, setNurses] = useState<Nurse[]>([
    { id: "1", name: "Nurse Anjali", email: "anjali@healhub.com", phone: "+91 98765 43210", assignedPatients: 12, status: "active" },
    { id: "2", name: "Nurse Ravi", email: "ravi@healhub.com", phone: "+91 98765 43211", assignedPatients: 8, status: "active" },
    { id: "3", name: "Nurse Meera", email: "meera@healhub.com", phone: "+91 98765 43212", assignedPatients: 0, status: "inactive" },
  ]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNurse, setEditingNurse] = useState<Nurse | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });

  const handleSave = () => {
    if (!form.name || !form.email) {
      toast.error("Please fill required fields");
      return;
    }
    if (editingNurse) {
      setNurses((prev) => prev.map((n) => n.id === editingNurse.id ? { ...n, name: form.name, email: form.email, phone: form.phone } : n));
      toast.success("Nurse updated");
    } else {
      const newNurse: Nurse = {
        id: String(Date.now()),
        name: form.name,
        email: form.email,
        phone: form.phone,
        assignedPatients: 0,
        status: "active",
      };
      setNurses((prev) => [newNurse, ...prev]);
      toast.success("Nurse added");
    }
    setDialogOpen(false);
    setEditingNurse(null);
    setForm({ name: "", email: "", phone: "", password: "" });
  };

  const handleEdit = (nurse: Nurse) => {
    setEditingNurse(nurse);
    setForm({ name: nurse.name, email: nurse.email, phone: nurse.phone, password: "" });
    setDialogOpen(true);
  };

  const handleRemove = (nurse: Nurse) => {
    setNurses((prev) => prev.filter((n) => n.id !== nurse.id));
    toast.success("Nurse removed");
  };

  return (
    <PageWrapper>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Nurses</h2>
            <p className="text-sm text-muted-foreground">{nurses.length} nurse{nurses.length !== 1 ? "s" : ""}</p>
          </div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button onClick={() => { setEditingNurse(null); setForm({ name: "", email: "", phone: "", password: "" }); setDialogOpen(true); }} className="btn-premium text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Nurse
            </Button>
          </motion.div>
        </div>

        {/* Nurse table (desktop) */}
        <div className="bg-card border border-border rounded-xl overflow-hidden hidden md:block card-glow">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Email</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Phone</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Patients</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {nurses.map((nurse, i) => (
                <motion.tr
                  key={nurse.id}
                  variants={staggerItem}
                  initial="hidden"
                  animate="show"
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-border last:border-0 patient-row"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium avatar-glow">
                        {nurse.name[0]}
                      </div>
                      <span className="text-sm font-medium">{nurse.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{nurse.email}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{nurse.phone}</td>
                  <td className="px-4 py-3 text-sm">{nurse.assignedPatients}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      nurse.status === "active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                    }`}>
                      {nurse.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(nurse)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleRemove(nurse)} className="text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Nurse cards (mobile) */}
        <div className="md:hidden space-y-3">
          {nurses.map((nurse, i) => (
            <motion.div
              key={nurse.id}
              variants={staggerItem}
              initial="hidden"
              animate="show"
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -2, boxShadow: "0 6px 20px rgba(0,0,0,0.06)" }}
              className="bg-card border border-border rounded-xl p-4 card-glow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {nurse.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{nurse.name}</p>
                    <p className="text-xs text-muted-foreground">{nurse.email}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  nurse.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"
                }`}>
                  {nurse.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Add/Edit Nurse Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingNurse ? "Edit Nurse" : "Add Nurse"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nurse name" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nurse@healhub.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
            </div>
            {!editingNurse && (
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Set password" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingNurse ? "Update" : "Add Nurse"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
