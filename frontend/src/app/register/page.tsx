"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Stethoscope,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register } from "@/lib/api";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    specialization: "",
    hospital: "",
    role: "doctor" as "doctor" | "nurse",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      const res = await register(form);
      localStorage.setItem("healhub_token", res.data.token);
      toast.success("Account created successfully!");
      router.push("/");
    } catch {
      setError("Registration failed. Email may already be in use.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#E8EDF5] via-[#F0F4F8] to-[#E3EAF4] dark:from-[#0B1120] dark:via-[#0F1729] dark:to-[#0B1120]" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-200/20 dark:bg-heal-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-200/15 dark:bg-blue-900/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-[480px]"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-center mb-6"
        >
          <motion.div
            whileHover={{ scale: 1.08, rotate: 5 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 overflow-hidden"
          >
            <Image src="/logo.jpeg" alt="Heal Hub" width={64} height={64} className="w-full h-full object-cover rounded-2xl" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Join Heal Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create your account
          </p>
        </motion.div>

        {/* Register Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className={`bg-card border border-border rounded-2xl shadow-sm p-8 card-glow gradient-border ${error ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
        >
          {/* Role Selector */}
          <div className="mb-6">
            <Label className="text-sm font-medium mb-3 block">I am a</Label>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => update("role", "doctor")}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                  form.role === "doctor"
                    ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    form.role === "doctor"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Doctor</p>
                  <p className="text-[11px] text-muted-foreground">
                    Full access
                  </p>
                </div>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => update("role", "nurse")}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                  form.role === "nurse"
                    ? "border-emerald-500 bg-emerald-500/5 shadow-sm shadow-emerald-500/10"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    form.role === "nurse"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <UserCog className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Nurse</p>
                  <p className="text-[11px] text-muted-foreground">
                    Care access
                  </p>
                </div>
              </motion.button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Full Name *
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder={
                    form.role === "doctor" ? "Dr. Smith" : "Jane Smith"
                  }
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+91..."
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder={
                  form.role === "doctor"
                    ? "doctor@healhub.com"
                    : "nurse@healhub.com"
                }
                required
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password *
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="specialization" className="text-sm font-medium">
                  {form.role === "doctor" ? "Specialization" : "Department"}
                </Label>
                <Input
                  id="specialization"
                  value={form.specialization}
                  onChange={(e) => update("specialization", e.target.value)}
                  placeholder={
                    form.role === "doctor" ? "Orthopedics" : "Post-op Care"
                  }
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hospital" className="text-sm font-medium">
                  Hospital
                </Label>
                <Input
                  id="hospital"
                  value={form.hospital}
                  onChange={(e) => update("hospital", e.target.value)}
                  placeholder="Hospital name"
                  className="h-10"
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2"
              >
                {error}
              </motion.p>
            )}

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                className="w-full h-11 font-medium btn-premium text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </motion.div>
          </form>

          <div className="mt-5 pt-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>

      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-6px);
          }
          50% {
            transform: translateX(6px);
          }
          75% {
            transform: translateX(-3px);
          }
        }
      `}</style>
    </div>
  );
}
