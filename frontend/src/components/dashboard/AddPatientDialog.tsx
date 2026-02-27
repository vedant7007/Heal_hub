"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPatient } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";

interface AddPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const surgeryTypes = [
  "Knee Replacement",
  "Hip Replacement",
  "Cardiac Bypass",
  "Spinal Surgery",
  "ACL Reconstruction",
  "Appendectomy",
  "Cataract Surgery",
  "Hernia Repair",
  "Other",
];

export function AddPatientDialog({ open, onOpenChange, onSuccess }: AddPatientDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "male",
    language_preference: "english",
    surgery_type: "",
    surgery_date: "",
    hospital: "",
    additional_notes: "",
    medicines: [{ name: "", dosage: "", frequency: "twice daily" }],
    family_contacts: [{ name: "", phone: "", relation: "" }],
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addMedicine = () => {
    setForm((prev) => ({
      ...prev,
      medicines: [...prev.medicines, { name: "", dosage: "", frequency: "twice daily" }],
    }));
  };

  const removeMedicine = (index: number) => {
    setForm((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index),
    }));
  };

  const updateMedicine = (index: number, field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      medicines: prev.medicines.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }));
  };

  const updateFamily = (index: number, field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      family_contacts: prev.family_contacts.map((f, i) => (i === index ? { ...f, [field]: value } : f)),
    }));
  };

  const addFamily = () => {
    setForm((prev) => ({
      ...prev,
      family_contacts: [...prev.family_contacts, { name: "", phone: "", relation: "" }],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        ...form,
        age: parseInt(form.age),
        phone: form.phone.startsWith("+91") ? form.phone : `+91${form.phone}`,
        medicines: form.medicines.filter((m) => m.name),
        family_contacts: form.family_contacts.filter((f) => f.name && f.phone),
      };
      await createPatient(payload);
      toast.success("Patient registered successfully");
      onSuccess();
      onOpenChange(false);
      setForm({
        name: "", phone: "", age: "", gender: "male", language_preference: "english",
        surgery_type: "", surgery_date: "", hospital: "", additional_notes: "",
        medicines: [{ name: "", dosage: "", frequency: "twice daily" }],
        family_contacts: [{ name: "", phone: "", relation: "" }],
      });
    } catch {
      toast.error("Failed to register patient");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Register New Patient</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Info */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Patient Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={form.name} onChange={(e) => updateField("name", e.target.value)} required placeholder="Patient name" />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-3 text-sm bg-muted border border-border rounded-md text-muted-foreground">+91</span>
                  <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} required placeholder="9876543210" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Age *</Label>
                <Input type="number" value={form.age} onChange={(e) => updateField("age", e.target.value)} required placeholder="55" />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => updateField("gender", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={form.language_preference} onValueChange={(v) => updateField("language_preference", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="hindi">Hindi</SelectItem>
                    <SelectItem value="telugu">Telugu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Medical Info */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Medical Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Surgery Type *</Label>
                <Select value={form.surgery_type} onValueChange={(v) => updateField("surgery_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select surgery" /></SelectTrigger>
                  <SelectContent>
                    {surgeryTypes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Surgery Date *</Label>
                <Input type="date" value={form.surgery_date} onChange={(e) => updateField("surgery_date", e.target.value)} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Hospital</Label>
                <Input value={form.hospital} onChange={(e) => updateField("hospital", e.target.value)} placeholder="Hospital name" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Additional Notes</Label>
                <Textarea
                  value={form.additional_notes}
                  onChange={(e) => updateField("additional_notes", e.target.value)}
                  placeholder="Pre-existing conditions, allergies, special instructions, patient history, or any other relevant details..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          {/* Medicines */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Medicines</h3>
              <Button type="button" variant="ghost" size="sm" onClick={addMedicine}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-3">
              {form.medicines.map((med, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Input placeholder="Medicine name" value={med.name} onChange={(e) => updateMedicine(i, "name", e.target.value)} className="flex-1" />
                  <Input placeholder="Dosage" value={med.dosage} onChange={(e) => updateMedicine(i, "dosage", e.target.value)} className="w-28" />
                  <Select value={med.frequency} onValueChange={(v) => updateMedicine(i, "frequency", v)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once daily">Once daily</SelectItem>
                      <SelectItem value="twice daily">Twice daily</SelectItem>
                      <SelectItem value="thrice daily">Thrice daily</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.medicines.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeMedicine(i)} className="shrink-0">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Family Contacts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Family Contact</h3>
              <Button type="button" variant="ghost" size="sm" onClick={addFamily}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
            {form.family_contacts.map((fam, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                <Input placeholder="Name" value={fam.name} onChange={(e) => updateFamily(i, "name", e.target.value)} />
                <Input placeholder="Phone" value={fam.phone} onChange={(e) => updateFamily(i, "phone", e.target.value)} />
                <Input placeholder="Relation" value={fam.relation} onChange={(e) => updateFamily(i, "relation", e.target.value)} />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Register Patient
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
