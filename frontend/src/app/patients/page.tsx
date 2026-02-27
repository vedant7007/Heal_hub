"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PatientsPage() {
  const router = useRouter();
  useEffect(() => {
    router.push("/");
  }, []);
  return null;
}
