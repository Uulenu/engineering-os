"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/supabase";
import Auth from "./auth";
export default function AuthEntry({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  useEffect(() => {
    const {
      data: { subscription },
    } = db().auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/app");
    });
    return () => subscription.unsubscribe();
  }, [router]);
  return <Auth initialMode={mode} />;
}
