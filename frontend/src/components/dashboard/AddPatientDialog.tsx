"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPatient } from "@/lib/api";
import { toast } from "sonner";
import { UserPlus, Loader2, Phone, User, Heart } from "lucide-react";

const surgeryTypes = [
  "Knee Replacement",
  "Appendectomy",
  "Cardiac Bypass",
  "Hip Replacement",
  "Cataract Surgery",
  "Hernia Repair",
];

const languages = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "te", label: "Telugu" },
];

const genders = ["Male", "Female", "Other"];
const relations = ["Son", "Daughter", "Spouse", "Parent"];

interface AddPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddPatientDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddPatientDialogProps) {
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [language, setLanguage] = useState("en");
  const [surgeryType, setSurgeryType] = useState("");
  const [surgeryDate, setSurgeryDate] = useState("");
  const [hospital, setHospital] = useState("KLH Hospital");
  const [familyName, setFamilyName] = useState("");
  const [familyPhone, setFamilyPhone] = useState("");
  const [familyRelation, setFamilyRelation] = useState("");

  const resetForm = () => {
    setName("");
    setPhone("");
    setAge("");
    setGender("Male");
    setLanguage("en");
    setSurgeryType("");
    setSurgeryDate("");
    setHospital("KLH Hospital");
    setFamilyName("");
    setFamilyPhone("");
    setFamilyRelation("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim() || !age || !surgeryType || !surgeryDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const phoneNumber = phone.startsWith("+91") ? phone : `+91${phone}`;

    const familyContacts =
      familyName && familyPhone
        ? [
            {
              name: familyName,
              phone: familyPhone.startsWith("+91")
                ? familyPhone
                : `+91${familyPhone}`,
              relation: familyRelation || "Spouse",
            },
          ]
        : [];

    const payload = {
      name: name.trim(),
      phone: phoneNumber,
      age: parseInt(age),
      gender: gender.toLowerCase(),
      language_preference: language,
      surgery_type: surgeryType,
      surgery_date: new Date(surgeryDate).toISOString(),
      hospital: hospital.trim(),
      family_contacts: familyContacts,
      checkin_schedule: { days: [1, 3, 5, 7, 14, 21, 30], time: "10:00" },
    };

    setLoading(true);
    try {
      await createPatient(payload);
      toast.success("Patient registered! First WhatsApp message sent.");
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || "Failed to register patient";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto border-white/[0.08] p-0"
        style={{ background: "#0F172A" }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4"
          style={{
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(6,182,212,0.05) 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
                  boxShadow: "0 4px 15px rgba(59,130,246,0.3)",
                }}
              >
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-lg">
                  Add New Patient
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-sm mt-0.5">
                  Register a patient to start automated follow-ups
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          {/* Section: Patient Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <User className="w-3.5 h-3.5" />
              Patient Information
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Name */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-slate-400 text-xs">
                  Full Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  placeholder="e.g. Rajesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 rounded-xl focus:border-blue-500/40 focus:ring-blue-500/15"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">
                  Phone Number <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    +91
                  </span>
                  <Input
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    required
                    maxLength={10}
                    className="pl-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 rounded-xl focus:border-blue-500/40 focus:ring-blue-500/15"
                  />
                </div>
              </div>

              {/* Age */}
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">
                  Age <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="number"
                  placeholder="45"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                  min={1}
                  max={120}
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 rounded-xl focus:border-blue-500/40 focus:ring-blue-500/15"
                />
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl focus:border-blue-500/40 focus:ring-blue-500/15">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E293B] border-white/[0.1]">
                    {genders.map((g) => (
                      <SelectItem
                        key={g}
                        value={g}
                        className="text-slate-300 focus:bg-white/[0.06] focus:text-white"
                      >
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Language */}
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">
                  Language Preference
                </Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl focus:border-blue-500/40 focus:ring-blue-500/15">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E293B] border-white/[0.1]">
                    {languages.map((l) => (
                      <SelectItem
                        key={l.value}
                        value={l.value}
                        className="text-slate-300 focus:bg-white/[0.06] focus:text-white"
                      >
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section: Surgery Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Heart className="w-3.5 h-3.5" />
              Surgery Details
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Surgery Type */}
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">
                  Surgery Type <span className="text-red-400">*</span>
                </Label>
                <Select value={surgeryType} onValueChange={setSurgeryType}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl focus:border-blue-500/40 focus:ring-blue-500/15">
                    <SelectValue placeholder="Select surgery" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E293B] border-white/[0.1]">
                    {surgeryTypes.map((s) => (
                      <SelectItem
                        key={s}
                        value={s}
                        className="text-slate-300 focus:bg-white/[0.06] focus:text-white"
                      >
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Surgery Date */}
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">
                  Surgery Date <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="date"
                  value={surgeryDate}
                  onChange={(e) => setSurgeryDate(e.target.value)}
                  required
                  className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl focus:border-blue-500/40 focus:ring-blue-500/15 [color-scheme:dark]"
                />
              </div>

              {/* Hospital */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-slate-400 text-xs">Hospital Name</Label>
                <Input
                  placeholder="KLH Hospital"
                  value={hospital}
                  onChange={(e) => setHospital(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 rounded-xl focus:border-blue-500/40 focus:ring-blue-500/15"
                />
              </div>
            </div>
          </div>

          {/* Section: Family Contact */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Phone className="w-3.5 h-3.5" />
              Family Contact
              <span className="text-slate-600 normal-case font-normal tracking-normal">
                (optional)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Family Name */}
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Contact Name</Label>
                <Input
                  placeholder="e.g. Priya Kumar"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 rounded-xl focus:border-blue-500/40 focus:ring-blue-500/15"
                />
              </div>

              {/* Family Relation */}
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Relation</Label>
                <Select value={familyRelation} onValueChange={setFamilyRelation}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white rounded-xl focus:border-blue-500/40 focus:ring-blue-500/15">
                    <SelectValue placeholder="Select relation" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E293B] border-white/[0.1]">
                    {relations.map((r) => (
                      <SelectItem
                        key={r}
                        value={r}
                        className="text-slate-300 focus:bg-white/[0.06] focus:text-white"
                      >
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Family Phone */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-slate-400 text-xs">Contact Phone</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    +91
                  </span>
                  <Input
                    placeholder="9876543210"
                    value={familyPhone}
                    onChange={(e) =>
                      setFamilyPhone(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    maxLength={10}
                    className="pl-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 rounded-xl focus:border-blue-500/40 focus:ring-blue-500/15"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-sm font-semibold text-white border-0 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
              style={{
                background: loading
                  ? "rgba(59,130,246,0.3)"
                  : "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Register Patient
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
