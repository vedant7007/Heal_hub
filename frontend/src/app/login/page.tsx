"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
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
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="w-full max-w-md bg-[#1E293B] border-[#334155] p-8">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-xl bg-[#3B82F6] flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Heal Hub</h1>
              <p className="text-xs text-[#94A3B8]">Doctor Dashboard</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm text-[#94A3B8] block mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#0F172A] border-[#334155]"
                placeholder="doctor@healhub.com"
              />
            </div>
            <div>
              <label className="text-sm text-[#94A3B8] block mb-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#0F172A] border-[#334155]"
                placeholder="Enter password"
              />
            </div>
            {error && <p className="text-sm text-[#EF4444]">{error}</p>}
            <Button type="submit" className="w-full bg-[#3B82F6] hover:bg-[#2563EB]" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-xs text-[#64748B] text-center mt-6">
            Demo: priya@healhub.com / doctor123
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
