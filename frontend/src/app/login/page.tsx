"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Heart, Mail, Lock } from "lucide-react";
import { login } from "@/lib/api";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("priya@healhub.com");
  const [password, setPassword] = useState("doctor123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await login(email, password);
      localStorage.setItem("healhub_token", res.data.token);
      localStorage.setItem("healhub_doctor", JSON.stringify(res.data.doctor));
      router.push("/");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden animated-gradient-bg">
      {/* Grid background pattern */}
      <div className="absolute inset-0 bg-grid-fade pointer-events-none" />

      {/* Floating orb decorations */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-blue-500/10 blur-[100px] animate-orb-1 pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-[100px] animate-orb-2 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />

      {/* Small floating particles */}
      <motion.div
        className="absolute w-1.5 h-1.5 rounded-full bg-blue-400/40"
        style={{ top: "20%", left: "25%" }}
        animate={{ y: [0, -20, 0], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-1 h-1 rounded-full bg-cyan-400/30"
        style={{ top: "70%", left: "70%" }}
        animate={{ y: [0, -15, 0], opacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute w-2 h-2 rounded-full bg-blue-300/20"
        style={{ top: "30%", right: "20%" }}
        animate={{ y: [0, -25, 0], x: [0, 10, 0], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute w-1 h-1 rounded-full bg-cyan-300/25"
        style={{ bottom: "25%", left: "15%" }}
        animate={{ y: [0, -18, 0], opacity: [0.15, 0.5, 0.15] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.div
        className="absolute w-1.5 h-1.5 rounded-full bg-blue-400/20"
        style={{ top: "60%", right: "30%" }}
        animate={{ y: [0, -12, 0], x: [0, -8, 0], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Card glow behind */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-cyan-500/10 to-blue-500/20 rounded-2xl blur-xl opacity-60" />

        <div className="relative glass-card-strong rounded-2xl p-8 sm:p-10">
          {/* Logo & Title */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center mb-8"
          >
            {/* Heartbeat icon */}
            <div className="relative mb-4">
              <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 blur-lg opacity-40 animate-heartbeat" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg animate-heartbeat">
                <Heart className="w-8 h-8 text-white" fill="white" fillOpacity={0.3} />
              </div>
            </div>

            <h1 className="text-3xl font-bold gradient-text tracking-tight">
              Heal Hub
            </h1>
            <p className="text-sm text-slate-400 mt-1.5 tracking-wide">
              Your AI Nurse That Never Sleeps
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={handleLogin}
            className="space-y-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <div className="space-y-1.5">
              <label className="text-sm text-slate-400 block font-medium">
                Email
              </label>
              <div className="relative input-glow rounded-lg transition-smooth">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/5 border-white/10 pl-10 h-11 text-slate-200 placeholder:text-slate-600 focus:border-blue-500/50 transition-all duration-300"
                  placeholder="doctor@healhub.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-slate-400 block font-medium">
                Password
              </label>
              <div className="relative input-glow rounded-lg transition-smooth">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10 pl-10 h-11 text-slate-200 placeholder:text-slate-600 focus:border-blue-500/50 transition-all duration-300"
                  placeholder="Enter password"
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-red-400 flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              className="w-full h-11 btn-gradient rounded-lg text-base cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </motion.form>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-8 pt-5 border-t border-white/5"
          >
            <p className="text-xs text-slate-500 text-center">
              Demo credentials: <span className="text-slate-400">priya@healhub.com</span> / <span className="text-slate-400">doctor123</span>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
